import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { FiArchive, FiBarChart2, FiEdit2, FiPlus, FiSearch, FiTrash2, FiUsers } from "react-icons/fi";
import useStores from "../../../hooks/inventory/useStores";
import useBranches from "../../../hooks/settings/useBranches";
import useDepartments from "../../../hooks/humanResource/useDepartments";
import useEmployees from "../../../hooks/humanResource/useEmployees";
import { apiRequest } from "../../../libs/apiConfig";
import { InventoryEndpoints } from "../../../endpoints/inventory/inventory";
import type { IStore } from "../../../redux/types/inventory";
import type { IEmployee } from "../../../redux/types/hr";
import Button from "../../../ui/Button";
import Modal from "../../../ui/Modal";
import Combobox from "../../../ui/Combobox";
import { FieldShell, SearchBox, TextField } from "../../../ui/Field";
import { Card, EmptyState, PageHeader, SkeletonRows } from "../../../ui/Page";
import { useConfirm } from "../../../ui/ConfirmDialog";
import { apiError, personName } from "../shared";

type Form = { name: string; branchId: string; deptId: string; people: string[] };

const ids = (s: IStore) => (s.authorizedPersonnel ?? []).map(String);
const used = (s: IStore) => (s._count ? Object.values(s._count).reduce((a, b) => a + b, 0) : 0);

/** Pick people with a search box; ticks show who is in. */
const PeoplePicker = ({ employees, value, onChange, error }: { employees: IEmployee[]; value: string[]; onChange: (v: string[]) => void; error?: string }) => {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return employees.filter((e) => !s || `${e.firstName} ${e.lastName} ${e.branch?.name ?? ""}`.toLowerCase().includes(s));
  }, [employees, q]);
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <FieldShell label={`People who can move stock (${value.length})`} id="store-people" error={error} hint="Administrators and store managers can always work in every store.">
      <div className="rounded-lg border border-line">
        <div className="relative border-b border-line">
          <FiSearch aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input id="store-people" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people" className="h-10 w-full rounded-t-lg bg-transparent pl-9 pr-3 text-sm text-brand-ink outline-none placeholder:text-brand-muted/70" />
        </div>
        <ul className="m-0 max-h-56 list-none overflow-y-auto p-1">
          {list.map((e) => {
            const id = String(e.id);
            const on = value.includes(id);
            return (
              <li key={id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-surface-2">
                  <input type="checkbox" checked={on} onChange={() => toggle(id)} className="h-4 w-4 accent-[rgb(57_89_165)]" />
                  <span className="min-w-0 flex-1 truncate text-brand-ink">{personName(e)}</span>
                  <span className="truncate text-xs text-brand-muted">{e.branch?.name}</span>
                </label>
              </li>
            );
          })}
          {!list.length && <li className="px-2 py-3 text-sm text-brand-muted">Nobody matches</li>}
        </ul>
      </div>
    </FieldShell>
  );
};

/** Where stock is kept, and who may move it. */
const StoresManagement = () => {
  const confirm = useConfirm();
  const { data, loading, upsert, remove } = useStores();
  const { data: branches } = useBranches();
  const { data: departments } = useDepartments();
  const { data: employees } = useEmployees();
  const stores = (data ?? []) as IStore[];
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<IStore | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>({ name: "", branchId: "", deptId: "", people: [] });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [saving, setSaving] = useState(false);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stores.filter((s) => !q || `${s.name} ${s.branch?.name ?? ""} ${s.dept?.name ?? ""}`.toLowerCase().includes(q));
  }, [stores, query]);

  const people = useMemo(() => (employees as IEmployee[]).filter((e) => e.isActive !== false), [employees]);
  const nameOf = useMemo(() => new Map((employees as IEmployee[]).map((e) => [String(e.id), personName(e)])), [employees]);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? { name: editing.name, branchId: String(editing.branch?.id ?? editing.branchId ?? ""), deptId: String(editing.dept?.id ?? editing.deptId ?? ""), people: ids(editing) } : { name: "", branchId: "", deptId: "", people: [] });
    setErrors({});
  }, [open, editing]);

  const deptOptions = useMemo(
    () => departments.filter((d) => !form.branchId || String(d.branchId ?? d.branch?.id) === form.branchId).map((d) => ({ value: String(d.id), label: d.name, hint: d.branch?.name })),
    [departments, form.branchId],
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Enter the store name.";
    if (!form.branchId) errs.branchId = "Choose the branch.";
    if (!form.deptId) errs.deptId = "Choose the department.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const body = { name: form.name.trim(), branchId: Number(form.branchId), deptId: Number(form.deptId), authorizedPersonnel: form.people.map(Number) };

    if (editing) {
      const before = new Set(ids(editing));
      const added = form.people.filter((p) => !before.has(p)).map((p) => nameOf.get(p) ?? p);
      const removed = [...before].filter((p) => !form.people.includes(p)).map((p) => nameOf.get(p) ?? p);
      const changes = [
        body.name !== editing.name && `Name: ${editing.name} → ${body.name}`,
        form.branchId !== String(editing.branch?.id ?? "") && "Branch changed",
        form.deptId !== String(editing.dept?.id ?? "") && "Department changed",
        added.length && `Can now move stock: ${added.join(", ")}`,
        removed.length && `No longer allowed: ${removed.join(", ")}`,
      ].filter(Boolean) as string[];
      if (!changes.length) return setOpen(false);
      const ok = await confirm({ title: `Save ${editing.name}?`, details: <ul className="m-0 list-disc pl-5">{changes.map((c) => <li key={c}>{c}</li>)}</ul>, confirmLabel: "Save" });
      if (!ok) return;
    }

    setSaving(true);
    try {
      const res = await apiRequest<{ data: IStore }>(editing ? InventoryEndpoints.STORE.modify(editing.id) : InventoryEndpoints.STORE.create, editing ? "PATCH" : "POST", body);
      upsert(res.data);
      setOpen(false);
    } catch (err) {
      const { field, message } = apiError(err);
      if (field && message) setErrors({ [field]: message });
    } finally {
      setSaving(false);
    }
  };

  const del = async (s: IStore) => {
    if (used(s)) {
      await confirm({ title: `${s.name} can't be deleted`, message: "It has stock, sales or stock history. Deleting it would erase them.", confirmLabel: "OK" });
      return;
    }
    await confirm({
      title: `Delete ${s.name}?`,
      message: "This can't be undone.",
      tone: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await apiRequest(InventoryEndpoints.STORE.delete(s.id), "DELETE");
        remove(s.id);
      },
    });
  };

  const start = (s: IStore | null) => {
    setEditing(s);
    setOpen(true);
  };

  return (
    <div className="mx-auto max-w-6xl font-inter">
      <PageHeader title="Stores" description="Where stock is kept, and who may restock, deplete or transfer from each." actions={<Button icon={<FiPlus aria-hidden="true" />} onClick={() => start(null)}>Add store</Button>} />
      <Card>
        <div className="border-b border-line p-3 sm:p-4">
          <SearchBox value={query} onChange={setQuery} placeholder="Store, branch or department" label="Search stores" />
        </div>
        {loading && !stores.length ? (
          <SkeletonRows rows={4} />
        ) : !shown.length ? (
          <EmptyState icon={<FiArchive className="h-5 w-5" />} title={stores.length ? "No store matches" : "No stores yet"} action={!stores.length && <Button icon={<FiPlus aria-hidden="true" />} onClick={() => start(null)}>Add store</Button>} />
        ) : (
          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3">
            {shown.map((s) => {
              const team = ids(s);
              return (
                <li key={s.id} className="flex flex-col rounded-xl border border-line bg-surface p-4">
                  <div className="flex items-start gap-3">
                    <span aria-hidden="true" className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-subtle text-brand-text"><FiArchive /></span>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate font-semibold text-brand-ink">{s.name}</p>
                      <p className="m-0 truncate text-sm text-brand-muted">{[s.branch?.name, s.dept?.name].filter(Boolean).join(" · ")}</p>
                    </div>
                  </div>
                  <p className="m-0 mt-3 flex items-start gap-2 text-sm text-ink-soft">
                    <FiUsers aria-hidden="true" className="mt-0.5 flex-none text-brand-muted" />
                    <span className="line-clamp-2">{team.length ? team.map((id) => nameOf.get(id) ?? `#${id}`).join(", ") : "Only administrators and store managers"}</span>
                  </p>
                  <div className="mt-4 flex gap-2 border-t border-line pt-3">
                    <Link to={`/inventory/stock-levels?store=${s.id}`} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-line text-[13px] font-medium text-brand-ink hover:bg-surface-2"><FiBarChart2 aria-hidden="true" /> Stock</Link>
                    <Button variant="secondary" size="sm" icon={<FiEdit2 aria-hidden="true" />} onClick={() => start(s)} className="flex-1">Edit</Button>
                    <Button variant="secondary" size="sm" icon={<FiTrash2 aria-hidden="true" />} onClick={() => del(s)} aria-label={`Delete ${s.name}`} className="text-[#C0362C]" />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        locked={saving}
        size="lg"
        title={editing ? `Edit ${editing.name}` : "Add store"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="store-form" loading={saving}>{editing ? "Save" : "Add store"}</Button>
          </>
        }
      >
        <form id="store-form" onSubmit={submit} noValidate className="space-y-4">
          <TextField label="Store name" required data-autofocus value={form.name} onChange={(v) => { setForm((f) => ({ ...f, name: v })); setErrors((x) => ({ ...x, name: undefined })); }} error={errors.name} maxLength={120} placeholder="e.g. Main store" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Combobox label="Branch" required value={form.branchId} onChange={(v) => { setForm((f) => ({ ...f, branchId: v, deptId: "" })); setErrors((x) => ({ ...x, branchId: undefined })); }} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} searchPlaceholder="Search branches" error={errors.branchId} />
            <Combobox label="Department" required value={form.deptId} onChange={(v) => { setForm((f) => ({ ...f, deptId: v })); setErrors((x) => ({ ...x, deptId: undefined })); }} options={deptOptions} searchPlaceholder="Search departments" error={errors.deptId} emptyText={form.branchId ? "This branch has no departments" : "Choose a branch first"} />
          </div>
          <PeoplePicker employees={people} value={form.people} onChange={(v) => setForm((f) => ({ ...f, people: v }))} error={errors.authorizedPersonnel} />
        </form>
      </Modal>
    </div>
  );
};

export default StoresManagement;
