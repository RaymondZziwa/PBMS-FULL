import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSelector } from "react-redux";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import useItems from "../../../hooks/inventory/useItems";
import useStores from "../../../hooks/inventory/useStores";
import useUnits from "../../../hooks/inventory/useUnits";
import useDeliveryNotes from "../../../hooks/inventory/useDeliveryNotes";
import { apiRequest } from "../../../libs/apiConfig";
import { InventoryEndpoints } from "../../../endpoints/inventory/inventory";
import type { IStockMovement, IStockStore, IStore } from "../../../redux/types/inventory";
import type { RootState } from "../../../redux/store";
import { roleHasPermission } from "../../../layout/navigation";
import Button from "../../../ui/Button";
import Modal from "../../../ui/Modal";
import Combobox from "../../../ui/Combobox";
import { Segmented, TextField } from "../../../ui/Field";
import { useConfirm } from "../../../ui/ConfirmDialog";
import { apiError, num, PhotoPicker, qty, TextArea } from "../shared";

type Kind = "RESTOCK" | "DEPLETION" | "TRANSFER" | "ADJUSTMENT";
type Line = { key: number; itemId: string; unitId: string; qty: string };

const KIND_HELP: Record<Kind, string> = {
  RESTOCK: "Stock coming in: the quantities are added to the store.",
  DEPLETION: "Stock going out (damaged, expired, used): the quantities are taken from the store.",
  TRANSFER: "Send stock to another store. It leaves this store now and arrives when the other store confirms it.",
  ADJUSTMENT: "Stock count: sets the store's quantity to exactly what you counted.",
};

let nextKey = 1;
const blank = (): Line => ({ key: nextKey++, itemId: "", unitId: "", qty: "" });

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (records: IStockMovement[]) => void;
  /** Start as this kind (e.g. "TRANSFER"). */
  initialKind?: Kind;
};

/** Record a restock, depletion, transfer or stock count for one or more items at once. */
const StockMovementForm = ({ open, onClose, onSaved, initialKind = "RESTOCK" }: Props) => {
  const confirm = useConfirm();
  const user = useSelector((s: RootState) => s.userAuth.data) as { id?: string | number; role?: { name?: string; permissions?: unknown } } | null;
  const managesStores = roleHasPermission(user?.role, "create_and_modify_stores");
  const { data: items } = useItems();
  const { data: stores } = useStores();
  const { data: units } = useUnits();
  const { data: notes, refresh: refreshNotes } = useDeliveryNotes();

  const [kind, setKind] = useState<Kind>(initialKind);
  const [storeId, setStoreId] = useState("");
  const [toStoreId, setToStoreId] = useState("");
  const [lines, setLines] = useState<Line[]>([blank()]);
  const [source, setSource] = useState("");
  const [description, setDescription] = useState("");
  const [noteId, setNoteId] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [stock, setStock] = useState<IStockStore[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind(initialKind);
    setToStoreId("");
    setLines([blank()]);
    setSource("");
    setDescription("");
    setNoteId("");
    setPhotos([]);
    setErrors({});
    void refreshNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialKind]);

  /** Stores this person may work in. */
  const myStores = useMemo(
    () => (stores as IStore[]).filter((s) => managesStores || (s.authorizedPersonnel ?? []).map(String).includes(String(user?.id))),
    [stores, managesStores, user?.id],
  );

  useEffect(() => {
    if (open && !storeId && myStores.length === 1) setStoreId(String(myStores[0].id));
  }, [open, storeId, myStores]);

  // Current stock in the chosen store, to show what's available.
  useEffect(() => {
    if (!open || !storeId) return setStock([]);
    let live = true;
    apiRequest<{ data: IStockStore[] }>(InventoryEndpoints.ITEM.fetch_store_inventory(storeId), "GET")
      .then((r) => live && setStock(Array.isArray(r.data) ? r.data : []))
      .catch(() => live && setStock([]));
    return () => {
      live = false;
    };
  }, [open, storeId]);

  const have = (itemId: string, unitId: string) => {
    const row = stock.find((s) => String(s.item?.id ?? s.itemId) === itemId && String(s.unit?.id ?? s.unitId) === unitId);
    return row ? num(row.qty) : null;
  };

  const takesOut = kind === "DEPLETION" || kind === "TRANSFER";
  const itemOptions = useMemo(() => {
    if (takesOut) {
      // Only what the store actually has.
      const seen = new Map<string, string>();
      stock.filter((s) => num(s.qty) > 0).forEach((s) => seen.set(String(s.item?.id ?? s.itemId), s.item?.name ?? "Item"));
      return [...seen].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
    }
    return items.map((i) => ({ value: String(i.id), label: i.name, hint: i.category?.name }));
  }, [takesOut, stock, items]);

  const unitOptionsFor = (itemId: string) => {
    if (takesOut) {
      return stock
        .filter((s) => String(s.item?.id ?? s.itemId) === itemId && num(s.qty) > 0)
        .map((s) => ({ value: String(s.unit?.id ?? s.unitId), label: s.unit?.name ?? "Unit", hint: `${qty(s.qty)} available` }));
    }
    return units.map((u) => ({ value: String(u.id), label: u.name, hint: (() => { const h = have(itemId, String(u.id)); return h !== null ? `${qty(h)} in store` : undefined; })() }));
  };

  const setLine = (key: number, patch: Partial<Line>) => {
    setLines((ls) =>
      ls.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, ...patch };
        // Picking an item that the store holds in a single unit fills the unit in.
        if (patch.itemId !== undefined) {
          const opts = unitOptionsFor(patch.itemId);
          next.unitId = opts.length === 1 ? opts[0].value : opts.some((o) => o.value === l.unitId) ? l.unitId : "";
        }
        return next;
      }),
    );
    setErrors({});
  };

  const changeKind = (k: Kind) => {
    setKind(k);
    if (k === "DEPLETION" || k === "TRANSFER") setLines([blank()]);
    setErrors({});
  };

  const itemName = (id: string) => items.find((i) => String(i.id) === id)?.name ?? stock.find((s) => String(s.item?.id ?? s.itemId) === id)?.item?.name ?? "Item";
  const unitName = (id: string) => units.find((u) => String(u.id) === id)?.name ?? "";
  const storeName = (id: string) => (stores as IStore[]).find((s) => String(s.id) === id)?.name ?? "";

  const validate = () => {
    const e: Record<string, string> = {};
    if (!storeId) e.storeId = "Choose the store.";
    if (kind === "TRANSFER" && !toStoreId) e.toStoreId = "Choose where the stock is going.";
    if (kind === "TRANSFER" && toStoreId && toStoreId === storeId) e.toStoreId = "Choose a different store.";
    const used = new Set<string>();
    lines.forEach((l, i) => {
      if (!l.itemId) e[`items.${i}.itemId`] = "Choose an item.";
      if (!l.unitId) e[`items.${i}.unitId`] = "Choose a unit.";
      const n = Number(l.qty);
      if (l.qty === "" || !Number.isFinite(n) || (kind === "ADJUSTMENT" ? n < 0 : n <= 0)) e[`items.${i}.qty`] = kind === "ADJUSTMENT" ? "Enter the count (0 or more)." : "Enter a quantity above 0.";
      if (takesOut && l.itemId && l.unitId && Number.isFinite(n)) {
        const h = have(l.itemId, l.unitId) ?? 0;
        if (n > h) e[`items.${i}.qty`] = `Only ${qty(h)} available.`;
      }
      const k = `${l.itemId}:${l.unitId}`;
      if (l.itemId && l.unitId && used.has(k)) e[`items.${i}.itemId`] = "Already on another line.";
      used.add(k);
    });
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    const verb = { RESTOCK: "Add to", DEPLETION: "Take from", TRANSFER: "Send from", ADJUSTMENT: "Set counts in" }[kind];
    const ok = await confirm({
      title: `${verb} ${storeName(storeId)}${kind === "TRANSFER" ? ` to ${storeName(toStoreId)}` : ""}?`,
      message: KIND_HELP[kind],
      details: (
        <ul className="m-0 list-disc pl-5">
          {lines.map((l) => {
            const h = have(l.itemId, l.unitId);
            const after = kind === "RESTOCK" ? (h ?? 0) + Number(l.qty) : kind === "ADJUSTMENT" ? Number(l.qty) : (h ?? 0) - Number(l.qty);
            return (
              <li key={l.key}>
                {qty(l.qty)} {unitName(l.unitId)} {itemName(l.itemId)} <span className="text-brand-muted">({qty(h ?? 0)} → {qty(after)})</span>
              </li>
            );
          })}
        </ul>
      ),
      confirmLabel: kind === "TRANSFER" ? "Send" : "Record",
    });
    if (!ok) return;

    setSaving(true);
    try {
      const form = new FormData();
      form.append("category", kind);
      form.append("storeId", storeId);
      if (kind === "TRANSFER") form.append("toStoreId", toStoreId);
      if (source.trim()) form.append("source", source.trim());
      if (description.trim()) form.append("description", description.trim());
      if (noteId) form.append("deliveryNoteId", noteId);
      form.append("items", JSON.stringify(lines.map((l) => ({ itemId: Number(l.itemId), unitId: Number(l.unitId), qty: Number(l.qty) }))));
      photos.forEach((p) => form.append("files", p));
      const res = await apiRequest<{ data: IStockMovement[] }>(InventoryEndpoints.STOCK_MVT.create, "POST", form);
      onSaved(Array.isArray(res.data) ? res.data : []);
      onClose();
    } catch (err) {
      const { field, message } = apiError(err);
      if (field && message) setErrors({ [field]: message });
    } finally {
      setSaving(false);
    }
  };

  const kinds: Array<{ value: Kind; label: string }> = [
    { value: "RESTOCK", label: "Restock" },
    { value: "DEPLETION", label: "Depletion" },
    { value: "TRANSFER", label: "Transfer" },
    ...(managesStores ? [{ value: "ADJUSTMENT" as Kind, label: "Stock count" }] : []),
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      locked={saving}
      size="xl"
      title="Record stock movement"
      description={KIND_HELP[kind]}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="movement-form" loading={saving}>{kind === "TRANSFER" ? "Send stock" : "Record"}</Button>
        </>
      }
    >
      <form id="movement-form" onSubmit={submit} noValidate className="space-y-5">
        {errors.items && <p role="alert" className="m-0 rounded-lg bg-[#FDECEA] px-3 py-2 text-sm text-[#B42318] dark:bg-[#381B19] dark:text-[#F2A29A]">{errors.items}</p>}
        <Segmented label="Type" required value={kind} onChange={changeKind} options={kinds} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Combobox
            label={kind === "TRANSFER" ? "From store" : "Store"}
            required
            value={storeId}
            onChange={(v) => { setStoreId(v); setLines([blank()]); setErrors({}); }}
            options={myStores.map((s) => ({ value: String(s.id), label: s.name, hint: s.branch?.name }))}
            searchPlaceholder="Search stores"
            error={errors.storeId}
            emptyText="You aren't allowed in any store yet. Ask an administrator to add you to one."
          />
          {kind === "TRANSFER" ? (
            <Combobox label="To store" required value={toStoreId} onChange={(v) => { setToStoreId(v); setErrors({}); }} options={(stores as IStore[]).filter((s) => String(s.id) !== storeId).map((s) => ({ value: String(s.id), label: s.name, hint: s.branch?.name }))} searchPlaceholder="Search stores" error={errors.toStoreId} />
          ) : (
            <TextField label="Source / reason" value={source} onChange={setSource} maxLength={120} placeholder={kind === "RESTOCK" ? "e.g. Factory batch 24" : kind === "DEPLETION" ? "e.g. Expired" : "e.g. Monthly count"} />
          )}
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="m-0 text-sm font-semibold text-brand-ink">Items ({lines.length})</h3>
            <Button size="sm" variant="secondary" icon={<FiPlus aria-hidden="true" />} onClick={() => setLines((ls) => [...ls, blank()])} disabled={lines.length >= 200 || (takesOut && !storeId)}>Add item</Button>
          </div>
          {takesOut && !storeId && <p className="m-0 mb-2 text-sm text-brand-muted">Choose the store first to see what it has.</p>}
          {takesOut && storeId && !itemOptions.length && <p className="m-0 mb-2 text-sm text-brand-muted">This store has no stock to take out.</p>}
          <div className="space-y-3">
            {lines.map((l, i) => {
              const h = l.itemId && l.unitId ? have(l.itemId, l.unitId) : null;
              return (
                <div key={l.key} className="grid grid-cols-1 gap-3 rounded-xl border border-line p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1fr)_auto] sm:items-start">
                  <Combobox label="Item" required value={l.itemId} onChange={(v) => setLine(l.key, { itemId: v })} options={itemOptions} searchPlaceholder="Search items" error={errors[`items.${i}.itemId`]} disabled={takesOut && !storeId} />
                  <Combobox label="Unit" required value={l.unitId} onChange={(v) => setLine(l.key, { unitId: v })} options={l.itemId || !takesOut ? unitOptionsFor(l.itemId) : []} searchPlaceholder="Search units" error={errors[`items.${i}.unitId`]} disabled={!l.itemId} />
                  <TextField
                    label={kind === "ADJUSTMENT" ? "Counted" : "Quantity"}
                    required
                    inputMode="decimal"
                    value={l.qty}
                    onChange={(v) => setLine(l.key, { qty: v.replace(/[^\d.]/g, "") })}
                    error={errors[`items.${i}.qty`]}
                    hint={h !== null ? `${qty(h)} in store now` : undefined}
                  />
                  <Button size="sm" variant="ghost" icon={<FiTrash2 aria-hidden="true" />} onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : [blank()]))} aria-label="Remove this item" className="text-[#C0362C] sm:mt-[22px]" />
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Combobox label="Delivery note" clearable value={noteId} onChange={setNoteId} options={notes.map((n) => ({ value: String(n.id), label: `${n.deliveryNoteNumber} · ${n.name}` }))} placeholder="None" searchPlaceholder="Search delivery notes" hint="Optional: link a delivery note saved under Delivery Notes." error={errors.deliveryNoteId} />
          <TextArea label="Notes" value={description} onChange={setDescription} maxLength={1000} placeholder="Anything worth knowing later" />
        </div>
        <PhotoPicker label="Evidence photos" files={photos} onChange={setPhotos} max={10} error={errors.files} hint="Optional: photos of the goods, invoice or damage." />
      </form>
    </Modal>
  );
};

export default StockMovementForm;
