import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { FiEdit2, FiEye, FiPlus, FiShield, FiTrash2, FiUsers } from "react-icons/fi";
import useRoles from "../../../hooks/settings/useRoles";
import { apiRequest } from "../../../libs/apiConfig";
import { RoleEndpoints } from "../../../endpoints/settings/role/roleEndpoints";
import type { RootState } from "../../../redux/store";
import type { IRole } from "../../../redux/types/systemSettings";
import { isFullAccessRole } from "../../../layout/navigation";
import Button from "../../../ui/Button";
import { SearchBox } from "../../../ui/Field";
import { Badge, Card, EmptyState, PageHeader, SkeletonRows } from "../../../ui/Page";
import { useConfirm } from "../../../ui/ConfirmDialog";
import AddorModifyRole from "./AddorModify";
import RoleUsersModal from "./viewUsers";
import RolePermissionsModal from "./viewPermissions";

type Panel = { kind: "edit" | "people" | "perms"; role: IRole | null } | null;

/** Roles decide what each person can see and do. */
const RoleManagement = () => {
  const { data, loading, upsert, remove } = useRoles();
  const roles = (data ?? []) as IRole[];
  const myRoleId = useSelector((s: RootState) => (s.userAuth?.data as { roleId?: number; role?: { id?: number } } | null)?.role?.id ?? (s.userAuth?.data as { roleId?: number } | null)?.roleId);
  const confirm = useConfirm();
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState<Panel>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roles.filter((r) => !q || r.name.toLowerCase().includes(q));
  }, [roles, query]);

  const del = async (r: IRole) => {
    const people = r.Employee?.length ?? 0;
    if (String(r.id) === String(myRoleId)) {
      await confirm({ title: "This is your own role", message: "You can't delete the role you're signed in with.", confirmLabel: "OK" });
      return;
    }
    if (people) {
      await confirm({ title: `${r.name} is still in use`, message: `${people} ${people === 1 ? "person has" : "people have"} this role. Give them another role first, then delete it.`, confirmLabel: "OK" });
      return;
    }
    await confirm({
      title: `Delete ${r.name}?`,
      message: "This can't be undone.",
      tone: "danger",
      onConfirm: async () => {
        await apiRequest(RoleEndpoints.delete(String(r.id)), "DELETE");
        remove(r.id);
      },
    });
  };

  return (
    <div className="mx-auto max-w-6xl font-inter">
      <PageHeader
        title="Roles & permissions"
        description="Each employee has one role. A role's permissions decide which modules and actions they can use."
        actions={<Button icon={<FiPlus aria-hidden="true" />} onClick={() => setPanel({ kind: "edit", role: null })}>New role</Button>}
      />
      <Card>
        <div className="border-b border-line p-3 sm:p-4">
          <SearchBox value={query} onChange={setQuery} placeholder="Search roles" label="Search roles" />
        </div>
        {loading && !roles.length ? (
          <SkeletonRows rows={5} />
        ) : !shown.length ? (
          <EmptyState icon={<FiShield className="h-5 w-5" />} title={roles.length ? "No role matches your search" : "No roles yet"} />
        ) : (
          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
            {shown.map((r) => {
              const people = r.Employee?.length ?? 0;
              const full = isFullAccessRole(r);
              const mine = String(r.id) === String(myRoleId);
              return (
                <li key={r.id} className="flex flex-col rounded-xl border border-line bg-surface p-4">
                  <div className="flex items-start gap-3">
                    <span aria-hidden="true" className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-subtle text-brand-text"><FiShield /></span>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate font-semibold text-brand-ink">{r.name}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {full ? <Badge tone="brand">Full access</Badge> : <Badge tone="neutral">{r.permissions.length} permission(s)</Badge>}
                        {mine && <Badge tone="good">Your role</Badge>}
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => setPanel({ kind: "people", role: r })} className="mt-3 flex items-center gap-2 self-start rounded-md text-sm text-brand-muted hover:text-brand-ink">
                    <FiUsers aria-hidden="true" /> {people} {people === 1 ? "person" : "people"}
                  </button>
                  <div className="mt-4 flex gap-2 border-t border-line pt-3">
                    <Button variant="secondary" size="sm" icon={<FiEye aria-hidden="true" />} onClick={() => setPanel({ kind: "perms", role: r })} aria-label={`View ${r.name} permissions`}>View</Button>
                    <Button variant="secondary" size="sm" icon={<FiEdit2 aria-hidden="true" />} onClick={() => setPanel({ kind: "edit", role: r })} className="flex-1">Edit</Button>
                    <Button variant="secondary" size="sm" icon={<FiTrash2 aria-hidden="true" />} onClick={() => del(r)} aria-label={`Delete ${r.name}`} className="text-[#C0362C]" />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <AddorModifyRole open={panel?.kind === "edit"} role={panel?.kind === "edit" ? panel.role : null} onClose={() => setPanel(null)} onSaved={upsert} />
      <RoleUsersModal visible={panel?.kind === "people"} role={panel?.role ?? null} onClose={() => setPanel(null)} />
      <RolePermissionsModal visible={panel?.kind === "perms"} role={panel?.role ?? null} onClose={() => setPanel(null)} onEdit={() => setPanel((p) => (p ? { kind: "edit", role: p.role } : p))} />
    </div>
  );
};

export default RoleManagement;
