import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import { apiRequest } from "../../libs/apiConfig";
import Button from "../../ui/Button";
import Modal from "../../ui/Modal";
import { MoneyField, SearchBox, TextField } from "../../ui/Field";
import { Card, EmptyState, PageHeader, SkeletonRows } from "../../ui/Page";
import { useConfirm } from "../../ui/ConfirmDialog";
import { apiError, Pager, Table, Td, Th, usePaged } from "./shared";

type Row = { id: number | string; name: string };

const field = (row: Row, key: string) => (row as unknown as Record<string, unknown>)[key];

export type CatalogField = {
  key: string;
  label: string;
  required?: boolean;
  kind?: "text" | "money";
  placeholder?: string;
  hint?: string;
  maxLength?: number;
};

type Props<T extends Row> = {
  title: string;
  description: string;
  noun: string;
  icon: ReactNode;
  list: { data: T[]; loading: boolean; upsert: (x: T) => unknown; remove: (id: number | string) => unknown };
  endpoints: { create: string; modify: (id: string | number) => string; delete: (id: string | number) => string };
  fields: CatalogField[];
  columns: Array<{ label: string; render: (row: T) => ReactNode; className?: string }>;
  /** A reason the row can't be deleted, shown instead of the delete prompt. */
  blockedDelete?: (row: T) => string | null;
};

/** List + add/edit/delete for small lists (categories, units, services). */
const SimpleCatalog = <T extends Row>({ title, description, noun, icon, list, endpoints, fields, columns, blockedDelete }: Props<T>) => {
  const confirm = useConfirm();
  const rows = list.data ?? [];
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<T | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => !q || r.name.toLowerCase().includes(q));
  }, [rows, query]);
  const paged = usePaged(filtered);

  useEffect(() => {
    if (!open) return;
    setForm(Object.fromEntries(fields.map((f) => [f.key, editing && field(editing, f.key) != null ? String(f.kind === "money" ? Math.round(Number(field(editing, f.key))) : field(editing, f.key)) : ""])));
    setErrors({});
  }, [open, editing, fields]);

  const start = (row: T | null) => {
    setEditing(row);
    setOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    fields.forEach((f) => {
      if (f.required && !(form[f.key] ?? "").trim()) errs[f.key] = `Enter ${f.label.toLowerCase()}.`;
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const body = Object.fromEntries(fields.map((f) => [f.key, f.kind === "money" ? Number(form[f.key] || 0) : (form[f.key] ?? "").trim()]));

    if (editing) {
      const changes = fields
        .filter((f) => String(body[f.key] ?? "") !== String(f.kind === "money" ? Math.round(Number(field(editing, f.key) ?? 0)) : field(editing, f.key) ?? ""))
        .map((f) => `${f.label}: ${String(field(editing, f.key) ?? "—")} → ${String(body[f.key] || "—")}`);
      if (!changes.length) return setOpen(false);
      const ok = await confirm({ title: `Save ${editing.name}?`, details: <ul className="m-0 list-disc pl-5">{changes.map((c) => <li key={c}>{c}</li>)}</ul>, confirmLabel: "Save" });
      if (!ok) return;
    }

    setSaving(true);
    try {
      const res = await apiRequest<{ data: T }>(editing ? endpoints.modify(editing.id) : endpoints.create, editing ? "PATCH" : "POST", body);
      list.upsert(res.data);
      setOpen(false);
    } catch (err) {
      const { field, message } = apiError(err);
      if (field && message) setErrors({ [field]: message });
    } finally {
      setSaving(false);
    }
  };

  const del = async (row: T) => {
    const blocked = blockedDelete?.(row);
    if (blocked) {
      await confirm({ title: `${row.name} can't be deleted`, message: blocked, confirmLabel: "OK" });
      return;
    }
    await confirm({
      title: `Delete ${row.name}?`,
      message: "This can't be undone.",
      tone: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await apiRequest(endpoints.delete(row.id), "DELETE");
        list.remove(row.id);
      },
    });
  };

  return (
    <div className="mx-auto max-w-5xl font-inter">
      <PageHeader title={title} description={description} actions={<Button icon={<FiPlus aria-hidden="true" />} onClick={() => start(null)}>Add {noun}</Button>} />
      <Card>
        <div className="border-b border-line p-3 sm:p-4">
          <SearchBox value={query} onChange={setQuery} placeholder={`Search ${title.toLowerCase()}`} label={`Search ${title.toLowerCase()}`} />
        </div>
        {list.loading && !rows.length ? (
          <SkeletonRows rows={5} />
        ) : !filtered.length ? (
          <EmptyState icon={icon} title={rows.length ? "Nothing matches your search" : `No ${title.toLowerCase()} yet`} action={!rows.length && <Button icon={<FiPlus aria-hidden="true" />} onClick={() => start(null)}>Add {noun}</Button>} />
        ) : (
          <>
            <Table head={<>{columns.map((c) => <Th key={c.label} className={c.className}>{c.label}</Th>)}<Th className="w-px text-right">Actions</Th></>}>
              {paged.shown.map((r) => (
                <tr key={r.id} className="hover:bg-surface-2/60">
                  {columns.map((c) => <Td key={c.label} className={c.className}>{c.render(r)}</Td>)}
                  <Td className="whitespace-nowrap text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" icon={<FiEdit2 aria-hidden="true" />} onClick={() => start(r)} aria-label={`Edit ${r.name}`}>Edit</Button>
                      <Button size="sm" variant="ghost" icon={<FiTrash2 aria-hidden="true" />} onClick={() => del(r)} aria-label={`Delete ${r.name}`} className="text-[#C0362C]">Delete</Button>
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
        size="sm"
        title={editing ? `Edit ${editing.name}` : `Add ${noun}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="catalog-form" loading={saving}>{editing ? "Save" : `Add ${noun}`}</Button>
          </>
        }
      >
        <form id="catalog-form" onSubmit={submit} noValidate className="space-y-4">
          {fields.map((f, i) => {
            const common = {
              label: f.label,
              required: f.required,
              value: form[f.key] ?? "",
              error: errors[f.key],
              hint: f.hint,
              placeholder: f.placeholder,
              onChange: (v: string) => {
                setForm((x) => ({ ...x, [f.key]: v }));
                setErrors((x) => ({ ...x, [f.key]: undefined }));
              },
              ...(i === 0 ? { "data-autofocus": true } : {}),
            };
            return f.kind === "money" ? <MoneyField key={f.key} {...common} /> : <TextField key={f.key} {...common} maxLength={f.maxLength ?? 120} />;
          })}
        </form>
      </Modal>
    </div>
  );
};

export default SimpleCatalog;
