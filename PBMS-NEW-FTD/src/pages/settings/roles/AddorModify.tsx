import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FiAlertTriangle, FiChevronDown } from "react-icons/fi";
import Modal from "../../../ui/Modal";
import Button from "../../../ui/Button";
import { SearchBox, TextField } from "../../../ui/Field";
import { useConfirm } from "../../../ui/ConfirmDialog";
import { apiRequest } from "../../../libs/apiConfig";
import { RoleEndpoints } from "../../../endpoints/settings/role/roleEndpoints";
import usePermissions from "../../../hooks/settings/usePermissions";
import type { IRole } from "../../../redux/types/systemSettings";
import { FULL_ACCESS_VALUES, moduleLabel, permLabel, roleValues } from "./permissionUtils";

type Props = {
  open: boolean;
  role: IRole | null;
  onClose: () => void;
  onSaved: (role: IRole) => void;
};

/** Create a role or change its name and permissions, grouped by module. */
const AddorModifyRole = ({ open, role, onClose, onSaved }: Props) => {
  const confirm = useConfirm();
  const { data: groups, loading } = usePermissions();
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(role?.name ?? "");
    setPicked(new Set(roleValues(role)));
    setQuery("");
    setError(null);
  }, [open, role]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        permissions: q
          ? g.permissions.filter((p) => `${permLabel(p)} ${p.value} ${g.module}`.toLowerCase().includes(q))
          : g.permissions,
      }))
      .filter((g) => g.permissions.length);
  }, [groups, query]);

  const toggle = (value: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(value)) n.delete(value);
      else n.add(value);
      return n;
    });
  const toggleGroup = (values: string[], on: boolean) =>
    setPicked((s) => {
      const n = new Set(s);
      values.forEach((v) => (on ? n.add(v) : n.delete(v)));
      return n;
    });

  const total = groups.reduce((a, g) => a + g.permissions.length, 0);
  const grantsFull = FULL_ACCESS_VALUES.some((v) => picked.has(v));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return setError("Enter a role name.");
    const before = new Set(roleValues(role));
    const added = [...picked].filter((v) => !before.has(v)).length;
    const removed = [...before].filter((v) => !picked.has(v)).length;

    if (role) {
      const lines = [
        n !== role.name && `Name: ${role.name} → ${n}`,
        added && `${added} permission(s) added`,
        removed && `${removed} permission(s) removed`,
      ].filter(Boolean) as string[];
      if (!lines.length) return onClose();
      const people = role.Employee?.length ?? 0;
      const ok = await confirm({
        title: `Save ${role.name}?`,
        message: people ? `${people} ${people === 1 ? "person has" : "people have"} this role. The change applies to them straight away.` : "Nobody has this role yet.",
        details: <ul className="m-0 list-disc pl-5">{lines.map((l) => <li key={l}>{l}</li>)}</ul>,
        confirmLabel: "Save role",
      });
      if (!ok) return;
    }

    setSaving(true);
    try {
      const res = await apiRequest<{ data: IRole }>(
        role ? RoleEndpoints.modify(String(role.id)) : RoleEndpoints.create,
        role ? "PATCH" : "POST",
        { name: n, permissions: [...picked] },
      );
      onSaved(res.data);
      onClose();
    } catch {
      // toast shown
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      locked={saving}
      size="xl"
      title={role ? `Edit ${role.name}` : "New role"}
      description="Choose what people with this role can see and do."
      footer={
        <>
          <span className="mr-auto text-sm text-brand-muted">{picked.size} of {total} selected</span>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="role-form" loading={saving}>{role ? "Save role" : "Create role"}</Button>
        </>
      }
    >
      <form id="role-form" onSubmit={submit} noValidate>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end">
          <TextField label="Role name" required data-autofocus value={name} onChange={(v) => { setName(v); setError(null); }} error={error} placeholder="e.g. Shop attendant" maxLength={80} />
          <SearchBox value={query} onChange={setQuery} placeholder="Find a permission" label="Find a permission" className="w-full" />
        </div>

        {grantsFull && (
          <p role="note" className="m-0 mt-3 flex gap-2 rounded-lg border border-[#F5C26B] bg-[#FFF8EB] px-3 py-2.5 text-sm text-[#7A4B00] dark:border-[#6B4A12] dark:bg-[#2A2010] dark:text-[#F5C26B]">
            <FiAlertTriangle aria-hidden="true" className="mt-0.5 flex-none" />
            Managing roles or assigning permissions gives full access to everything, because people with it can grant themselves any permission.
          </p>
        )}

        <div className="mt-4 space-y-3">
          {loading && !groups.length && <p className="m-0 text-sm text-brand-muted">Loading permissions…</p>}
          {!loading && !shown.length && <p className="m-0 text-sm text-brand-muted">No permission matches “{query}”.</p>}
          {shown.map((g) => {
            const values = g.permissions.map((p) => p.value);
            const on = values.filter((v) => picked.has(v)).length;
            const isCollapsed = collapsed.has(g.module) && !query;
            return (
              <fieldset key={g.module} className="m-0 rounded-xl border border-line p-0">
                <legend className="sr-only">{moduleLabel(g.module)}</legend>
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label={`All ${moduleLabel(g.module)} permissions`}
                    checked={on === values.length}
                    ref={(el) => { if (el) el.indeterminate = on > 0 && on < values.length; }}
                    onChange={(e) => toggleGroup(values, e.target.checked)}
                    className="h-4 w-4 accent-[var(--brand,#3959A5)]"
                  />
                  <button
                    type="button"
                    onClick={() => setCollapsed((s) => { const n = new Set(s); if (n.has(g.module)) n.delete(g.module); else n.add(g.module); return n; })}
                    aria-expanded={!isCollapsed}
                    className="flex min-h-[32px] flex-1 items-center gap-2 text-left text-sm font-semibold text-brand-ink"
                  >
                    {moduleLabel(g.module)}
                    <span className="font-normal text-brand-muted">{on}/{values.length}</span>
                    <FiChevronDown aria-hidden="true" className={`ml-auto transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                  </button>
                </div>
                {!isCollapsed && (
                  <div className="grid grid-cols-1 gap-x-4 border-t border-line px-3 py-2 sm:grid-cols-2">
                    {g.permissions.map((p) => (
                      <label key={p.value} className="flex min-h-[40px] cursor-pointer items-center gap-3 rounded-md px-1 text-sm text-ink-soft hover:bg-surface-2">
                        <input type="checkbox" checked={picked.has(p.value)} onChange={() => toggle(p.value)} className="h-4 w-4 flex-none accent-[var(--brand,#3959A5)]" />
                        <span className="first-letter:uppercase">{permLabel(p)}</span>
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>
            );
          })}
        </div>
      </form>
    </Modal>
  );
};

export default AddorModifyRole;
