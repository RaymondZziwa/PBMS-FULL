import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FiEdit2, FiPackage, FiPlus, FiTrash2 } from "react-icons/fi";
import useItems from "../../../hooks/inventory/useItems";
import useItemCategories from "../../../hooks/inventory/useItemCategories";
import { apiRequest } from "../../../libs/apiConfig";
import { InventoryEndpoints } from "../../../endpoints/inventory/inventory";
import type { IItem } from "../../../redux/types/inventory";
import Button from "../../../ui/Button";
import Modal from "../../../ui/Modal";
import Combobox from "../../../ui/Combobox";
import { MoneyField, SearchBox, TextField, Toggle } from "../../../ui/Field";
import { Badge, Card, EmptyState, PageHeader, SkeletonRows, ugx } from "../../../ui/Page";
import { useConfirm } from "../../../ui/ConfirmDialog";
import { apiError, Pager, Table, Td, Th, Tabs, usePaged } from "../shared";

type Form = { name: string; price: string; categoryId: string; showInPos: boolean };
const EMPTY: Form = { name: "", price: "", categoryId: "", showInPos: true };

const inUse = (i: IItem) => {
  const c = i._count;
  return c ? c.ProductInventory + c.InventoryRecord + c.Supply + c.ExhibitionInventory + c.ExhibitionInventoryRecords : 0;
};

/** Products the company stocks and sells. */
const ItemsManagement = () => {
  const confirm = useConfirm();
  const { data, loading, upsert, remove } = useItems();
  const { data: categories } = useItemCategories();
  const items = (data ?? []) as IItem[];
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [pos, setPos] = useState<"all" | "pos" | "hidden">("all");
  const [editing, setEditing] = useState<IItem | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [saving, setSaving] = useState(false);

  const categoryOptions = useMemo(() => categories.map((c) => ({ value: String(c.id), label: c.name })), [categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        (!q || `${i.name} ${i.barcode ?? ""} ${i.category?.name ?? ""}`.toLowerCase().includes(q)) &&
        (!category || String(i.category?.id ?? i.categoryId ?? "") === category) &&
        (pos === "all" || (pos === "pos" ? i.showInPos : !i.showInPos)),
    );
  }, [items, query, category, pos]);
  const paged = usePaged(filtered);

  useEffect(() => {
    if (!open) return;
    setForm(
      editing
        ? { name: editing.name, price: String(Math.round(Number(editing.price) || 0)), categoryId: editing.category?.id ? String(editing.category.id) : "", showInPos: !!editing.showInPos }
        : EMPTY,
    );
    setErrors({});
  }, [open, editing]);

  const set = <K extends keyof Form>(k: K) => (v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!form.name.trim()) errs.name = "Enter the item name.";
    if (form.price === "") errs.price = "Enter the selling price.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const body = { name: form.name.trim(), price: Number(form.price), categoryId: form.categoryId || null, showInPos: form.showInPos };

    if (editing) {
      const catName = (id: string) => categoryOptions.find((c) => c.value === id)?.label ?? "None";
      const changes = [
        body.name !== editing.name && `Name: ${editing.name} → ${body.name}`,
        body.price !== Math.round(Number(editing.price)) && `Price: ${ugx(editing.price)} → ${ugx(body.price)}`,
        form.categoryId !== (editing.category?.id ? String(editing.category.id) : "") && `Category: ${editing.category?.name ?? "None"} → ${catName(form.categoryId)}`,
        form.showInPos !== !!editing.showInPos && (form.showInPos ? "Shown in the POS" : "Hidden from the POS"),
      ].filter(Boolean) as string[];
      if (!changes.length) return setOpen(false);
      const ok = await confirm({
        title: `Save ${editing.name}?`,
        message: body.price !== Math.round(Number(editing.price)) ? "New sales use the new price; past sales keep theirs." : undefined,
        details: <ul className="m-0 list-disc pl-5">{changes.map((c) => <li key={c}>{c}</li>)}</ul>,
        confirmLabel: "Save",
      });
      if (!ok) return;
    }

    setSaving(true);
    try {
      const res = await apiRequest<{ data: IItem }>(editing ? InventoryEndpoints.ITEM.modify(editing.id) : InventoryEndpoints.ITEM.create, editing ? "PATCH" : "POST", body);
      upsert(res.data);
      setOpen(false);
    } catch (err) {
      const { field, message } = apiError(err);
      if (field && message) setErrors({ [field]: message });
    } finally {
      setSaving(false);
    }
  };

  const del = async (i: IItem) => {
    if (inUse(i)) {
      await confirm({ title: `${i.name} can't be deleted`, message: "It has stock or stock history. Hide it from the POS instead so it isn't sold.", confirmLabel: "OK" });
      return;
    }
    await confirm({
      title: `Delete ${i.name}?`,
      message: "This can't be undone.",
      tone: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await apiRequest(InventoryEndpoints.ITEM.delete(i.id), "DELETE");
        remove(i.id);
      },
    });
  };

  const start = (i: IItem | null) => {
    setEditing(i);
    setOpen(true);
  };

  return (
    <div className="mx-auto max-w-6xl font-inter">
      <PageHeader title="Items" description="Products you stock and sell. Stock is added through Stock Movement or a supplier supply." actions={<Button icon={<FiPlus aria-hidden="true" />} onClick={() => start(null)}>Add item</Button>} />
      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-3 sm:p-4 lg:flex-row lg:items-end">
          <SearchBox value={query} onChange={setQuery} placeholder="Name, barcode or category" label="Search items" className="lg:max-w-xs" />
          <Combobox label="Category" hideLabel clearable value={category} onChange={setCategory} options={categoryOptions} placeholder="All categories" searchPlaceholder="Search categories" className="lg:w-56" />
          <div className="lg:ml-auto">
            <Tabs label="POS visibility" value={pos} onChange={setPos} options={[{ value: "all", label: "All" }, { value: "pos", label: "In POS" }, { value: "hidden", label: "Hidden" }]} />
          </div>
        </div>
        {loading && !items.length ? (
          <SkeletonRows rows={6} />
        ) : !filtered.length ? (
          <EmptyState icon={<FiPackage className="h-5 w-5" />} title={items.length ? "No item matches" : "No items yet"} action={!items.length && <Button icon={<FiPlus aria-hidden="true" />} onClick={() => start(null)}>Add item</Button>} />
        ) : (
          <>
            <Table head={<><Th>Item</Th><Th>Category</Th><Th className="text-right">Price</Th><Th>POS</Th><Th className="w-px text-right">Actions</Th></>}>
              {paged.shown.map((i) => (
                <tr key={i.id} className="hover:bg-surface-2/60">
                  <Td>
                    <p className="m-0 font-medium">{i.name}</p>
                    {i.barcode && <p className="m-0 font-mono text-xs text-brand-muted">{i.barcode}</p>}
                  </Td>
                  <Td>{i.category?.name ?? <span className="text-brand-muted">—</span>}</Td>
                  <Td className="whitespace-nowrap text-right tabular-nums">{ugx(i.price)}</Td>
                  <Td>{i.showInPos ? <Badge tone="good">Shown</Badge> : <Badge>Hidden</Badge>}</Td>
                  <Td className="whitespace-nowrap text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" icon={<FiEdit2 aria-hidden="true" />} onClick={() => start(i)} aria-label={`Edit ${i.name}`}>Edit</Button>
                      <Button size="sm" variant="ghost" icon={<FiTrash2 aria-hidden="true" />} onClick={() => del(i)} aria-label={`Delete ${i.name}`} className="text-[#C0362C]">Delete</Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>
            <Pager {...paged} />
          </>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        locked={saving}
        size="md"
        title={editing ? `Edit ${editing.name}` : "Add item"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="item-form" loading={saving}>{editing ? "Save" : "Add item"}</Button>
          </>
        }
      >
        <form id="item-form" onSubmit={submit} noValidate className="space-y-4">
          <TextField label="Item name" required data-autofocus value={form.name} onChange={set("name")} error={errors.name} maxLength={120} placeholder="e.g. Moringa powder 250g" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MoneyField label="Selling price" required value={form.price} onChange={set("price")} error={errors.price} />
            <Combobox label="Category" clearable value={form.categoryId} onChange={set("categoryId")} options={categoryOptions} placeholder="No category" searchPlaceholder="Search categories" error={errors.categoryId} />
          </div>
          <Toggle label="Show in the POS" description={form.showInPos ? "Cashiers can sell it." : "Hidden from the POS, still kept in stock records."} checked={form.showInPos} onChange={set("showInPos")} />
        </form>
      </Modal>
    </div>
  );
};

export default ItemsManagement;
