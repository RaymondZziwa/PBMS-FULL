import { useMemo, useState } from "react";
import { FiEdit2, FiPlus, FiRefreshCw, FiTrash2, FiUsers } from "react-icons/fi";
import { useSelector } from "react-redux";
import Button from "../../../ui/Button";
import { SearchBox } from "../../../ui/Field";
import Combobox from "../../../ui/Combobox";
import { Badge, Card, EmptyState, initials, PageHeader, SkeletonRows, StatTile, ugx } from "../../../ui/Page";
import { useConfirm } from "../../../ui/ConfirmDialog";
import { apiRequest, baseURL } from "../../../libs/apiConfig";
import { EmployeeEndpoints } from "../../../endpoints/humanResource/employee";
import useEmployees from "../../../hooks/humanResource/useEmployees";
import useBranches from "../../../hooks/settings/useBranches";
import type { IEmployee } from "../../../redux/types/hr";
import type { RootState } from "../../../redux/store";
import EmployeeForm from "./EmployeeForm";

const PAGE_SIZE = 25;

type StatusFilter = "all" | "active" | "inactive";

const fullName = (e: IEmployee) => `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim();

const Avatar = ({ e }: { e: IEmployee }) =>
  e.profileImage ? (
    <img src={e.profileImage.startsWith("http") ? e.profileImage : `${baseURL}${e.profileImage}`} alt="" className="h-9 w-9 flex-none rounded-full object-cover" />
  ) : (
    <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-subtle text-[13px] font-semibold text-brand-text">
      {initials(e.firstName, e.lastName)}
    </span>
  );

const EmployeeManagement = () => {
  const { data: employees, loading, error, refresh, upsert, remove } = useEmployees();
  const { data: branches } = useBranches();
  const me = useSelector((s: RootState) => s.userAuth?.data);
  const confirm = useConfirm();

  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<{ open: boolean; employee: IEmployee | null }>({ open: false, employee: null });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (employees ?? []).filter((e) => {
      if (branch && String(e.branchId) !== branch) return false;
      if (status === "active" && !e.isActive) return false;
      if (status === "inactive" && e.isActive) return false;
      if (!q) return true;
      return [fullName(e), e.email, e.tel, e.role?.name, e.dept?.name].some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [employees, query, branch, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const stats = useMemo(() => {
    const list = employees ?? [];
    return {
      total: list.length,
      active: list.filter((e) => e.isActive).length,
      access: list.filter((e) => e.hasAccess).length,
    };
  }, [employees]);

  const showSalary = (employees ?? []).some((e) => e.salary !== null && e.salary !== undefined);

  const askDelete = (e: IEmployee) =>
    confirm({
      title: `Delete ${fullName(e)}?`,
      message: (
        <>
          Their account is removed and they can no longer sign in. If they have sales, stock or payment records, the system
          will refuse; <strong>switch off “Active” and “Can sign in”</strong> instead to keep their history.
        </>
      ),
      tone: "danger",
      confirmLabel: "Delete employee",
      onConfirm: async () => {
        await apiRequest(EmployeeEndpoints.deleteEmployee(e.id), "DELETE");
        remove(e.id);
      },
    });

  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl font-inter">
      <PageHeader
        title="Employees"
        description="Everyone on the team, what they can open in the system, and what they are paid."
        actions={
          <>
            <Button variant="secondary" icon={<FiRefreshCw aria-hidden="true" />} onClick={() => refresh()} loading={loading && (employees ?? []).length > 0}>
              Refresh
            </Button>
            <Button icon={<FiPlus aria-hidden="true" />} onClick={() => setForm({ open: true, employee: null })}>
              Add employee
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Employees" value={stats.total} />
        <StatTile label="Active" value={stats.active} hint={`${stats.total - stats.active} inactive`} />
        <StatTile label="Can sign in" value={stats.access} />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-3 sm:flex-row sm:items-center sm:p-4">
          <SearchBox value={query} onChange={resetPage(setQuery)} placeholder="Search name, email, phone, role" label="Search employees" />
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <Combobox
              label="Branch"
              hideLabel
              clearable
              value={branch}
              onChange={resetPage(setBranch)}
              options={(branches ?? []).map((b) => ({ value: String(b.id), label: b.name }))}
              placeholder="All branches"
              searchPlaceholder="Search branches"
              className="w-full sm:w-52"
            />
            <div role="radiogroup" aria-label="Status" className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
              {(["all", "active", "inactive"] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={status === s}
                  onClick={() => resetPage(setStatus)(s)}
                  className={`h-10 rounded-md px-3 text-[13px] font-medium capitalize focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
                    status === s ? "bg-surface text-brand-ink shadow-card" : "text-brand-muted hover:text-brand-ink"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && (employees ?? []).length === 0 ? (
          <SkeletonRows />
        ) : error && (employees ?? []).length === 0 ? (
          <EmptyState icon={<FiUsers className="h-5 w-5" />} title="Couldn't load employees" message={error} action={<Button onClick={() => refresh()}>Try again</Button>} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FiUsers className="h-5 w-5" />}
            title={(employees ?? []).length === 0 ? "No employees yet" : "No one matches"}
            message={(employees ?? []).length === 0 ? "Add your first team member to get started." : "Try another name, branch or status."}
            action={(employees ?? []).length === 0 ? <Button icon={<FiPlus aria-hidden="true" />} onClick={() => setForm({ open: true, employee: null })}>Add employee</Button> : undefined}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-brand-muted">
                    <th scope="col" className="px-4 py-3 font-medium">Name</th>
                    <th scope="col" className="px-4 py-3 font-medium">Role</th>
                    <th scope="col" className="px-4 py-3 font-medium">Department · Branch</th>
                    <th scope="col" className="px-4 py-3 font-medium">Phone</th>
                    {showSalary && <th scope="col" className="px-4 py-3 text-right font-medium">Monthly salary</th>}
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                    <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((e) => (
                    <tr key={e.id} className="hover:bg-surface-2">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar e={e} />
                          <div className="min-w-0">
                            <p className="m-0 truncate font-medium text-brand-ink">{fullName(e)}</p>
                            <p className="m-0 truncate text-xs text-brand-muted">{e.email || (e.hasAccess ? "No email" : "Doesn't use the system")}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{e.role?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-ink-soft">{[e.dept?.name, e.branch?.name].filter(Boolean).join(" · ") || "—"}</td>
                      <td className="px-4 py-3 tabular-nums text-ink-soft">{e.tel}</td>
                      {showSalary && <td className="px-4 py-3 text-right tabular-nums text-brand-ink">{e.salary == null ? "—" : ugx(e.salary)}</td>}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {e.isActive ? <Badge tone="good">Active</Badge> : <Badge>Inactive</Badge>}
                          {e.hasAccess && <Badge tone="brand">Signs in</Badge>}
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => setForm({ open: true, employee: e })} aria-label={`Edit ${fullName(e)}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-brand-muted hover:bg-subtle hover:text-brand-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
                            <FiEdit2 aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => askDelete(e)}
                            disabled={me?.id === e.id}
                            title={me?.id === e.id ? "You can't delete your own account" : undefined}
                            aria-label={`Delete ${fullName(e)}`}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-brand-muted hover:bg-[#FDECEA] hover:text-[#B42318] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-[#381B19]"
                          >
                            <FiTrash2 aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Phones and tablets */}
            <ul className="m-0 list-none divide-y divide-line p-0 lg:hidden">
              {rows.map((e) => (
                <li key={e.id} className="flex items-start gap-3 px-3 py-3.5 sm:px-4">
                  <Avatar e={e} />
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate font-medium text-brand-ink">{fullName(e)}</p>
                    <p className="m-0 truncate text-xs text-brand-muted">{[e.role?.name, e.dept?.name, e.branch?.name].filter(Boolean).join(" · ")}</p>
                    <p className="m-0 mt-1 text-xs tabular-nums text-ink-soft">
                      {e.tel}
                      {e.salary != null && <> · {ugx(e.salary)}</>}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {e.isActive ? <Badge tone="good">Active</Badge> : <Badge>Inactive</Badge>}
                      {e.hasAccess && <Badge tone="brand">Signs in</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-none gap-1">
                    <button type="button" onClick={() => setForm({ open: true, employee: e })} aria-label={`Edit ${fullName(e)}`} className="flex h-11 w-11 items-center justify-center rounded-lg text-brand-muted hover:bg-subtle hover:text-brand-text">
                      <FiEdit2 aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => askDelete(e)} disabled={me?.id === e.id} aria-label={`Delete ${fullName(e)}`} className="flex h-11 w-11 items-center justify-center rounded-lg text-brand-muted hover:bg-[#FDECEA] hover:text-[#B42318] disabled:opacity-30 dark:hover:bg-[#381B19]">
                      <FiTrash2 aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-brand-muted">
              <span>
                {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              {pages > 1 && (
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" disabled={current === 1} onClick={() => setPage(current - 1)}>
                    Previous
                  </Button>
                  <Button size="sm" variant="secondary" disabled={current === pages} onClick={() => setPage(current + 1)}>
                    Next
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      <EmployeeForm open={form.open} employee={form.employee} onClose={() => setForm({ open: false, employee: null })} onSaved={upsert} />
    </div>
  );
};

export default EmployeeManagement;
