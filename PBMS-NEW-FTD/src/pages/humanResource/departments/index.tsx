import { useMemo, useState } from "react";
import { FiEdit2, FiGrid, FiPlus, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import Button from "../../../ui/Button";
import { SearchBox } from "../../../ui/Field";
import { Card, EmptyState, PageHeader, SkeletonRows } from "../../../ui/Page";
import { useConfirm } from "../../../ui/ConfirmDialog";
import { apiRequest } from "../../../libs/apiConfig";
import { DepartmentEndpoints } from "../../../endpoints/humanResource/department";
import useDepartments from "../../../hooks/humanResource/useDepartments";
import type { IDepartment } from "../../../redux/types/hr";
import DepartmentForm from "./DepartmentForm";

const DepartmentManagement = () => {
  const { data: departments, loading, error, refresh, upsert, remove } = useDepartments();
  const confirm = useConfirm();
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<{ open: boolean; department: IDepartment | null }>({ open: false, department: null });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (departments ?? []).filter((d) => !q || d.name.toLowerCase().includes(q) || (d.branch?.name ?? "").toLowerCase().includes(q));
  }, [departments, query]);

  // Group by branch so it reads like the organisation.
  const byBranch = useMemo(() => {
    const groups = new Map<string, IDepartment[]>();
    for (const d of filtered) {
      const key = d.branch?.name ?? "No branch";
      groups.set(key, [...(groups.get(key) ?? []), d]);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const askDelete = (d: IDepartment) => {
    const people = d._count?.Employee ?? 0;
    const stores = d._count?.Store ?? 0;
    if (people > 0 || stores > 0) {
      return confirm({
        title: `${d.name} can't be deleted yet`,
        message: `It still has ${people} ${people === 1 ? "person" : "people"} and ${stores} ${stores === 1 ? "store" : "stores"}. Move them to another department first, so no one is removed by accident.`,
        confirmLabel: "OK",
        cancelLabel: "Close",
        tone: "primary",
      });
    }
    return confirm({
      title: `Delete ${d.name}?`,
      message: "It has no people or stores, so nothing else is affected. This can't be undone.",
      tone: "danger",
      confirmLabel: "Delete department",
      onConfirm: async () => {
        await apiRequest(DepartmentEndpoints.deleteDepartment(d.id), "DELETE");
        remove(d.id);
      },
    });
  };

  const total = (departments ?? []).length;

  return (
    <div className="mx-auto max-w-6xl font-inter">
      <PageHeader
        title="Departments"
        description="How each branch is organised. People and stores belong to a department."
        actions={
          <>
            <Button variant="secondary" icon={<FiRefreshCw aria-hidden="true" />} onClick={() => refresh()}>
              Refresh
            </Button>
            <Button icon={<FiPlus aria-hidden="true" />} onClick={() => setForm({ open: true, department: null })}>
              Add department
            </Button>
          </>
        }
      />

      <Card>
        <div className="border-b border-line p-3 sm:p-4">
          <SearchBox value={query} onChange={setQuery} placeholder="Search department or branch" label="Search departments" />
        </div>

        {loading && total === 0 ? (
          <SkeletonRows rows={5} />
        ) : error && total === 0 ? (
          <EmptyState icon={<FiGrid className="h-5 w-5" />} title="Couldn't load departments" message={error} action={<Button onClick={() => refresh()}>Try again</Button>} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FiGrid className="h-5 w-5" />}
            title={total === 0 ? "No departments yet" : "Nothing matches"}
            message={total === 0 ? "Add one for each team in a branch." : "Try another name."}
            action={total === 0 ? <Button icon={<FiPlus aria-hidden="true" />} onClick={() => setForm({ open: true, department: null })}>Add department</Button> : undefined}
          />
        ) : (
          <div className="divide-y divide-line">
            {byBranch.map(([branchName, list]) => (
              <section key={branchName} aria-label={branchName} className="px-3 py-4 sm:px-4">
                <h2 className="m-0 mb-3 text-xs font-semibold uppercase tracking-wider text-brand-muted">
                  {branchName} <span className="font-normal normal-case tracking-normal">· {list.length}</span>
                </h2>
                <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-2 xl:grid-cols-3">
                  {list.map((d) => (
                    <li key={d.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 px-3.5 py-3">
                      <span aria-hidden="true" className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-subtle font-display text-sm font-semibold text-brand-text">
                        {d.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="m-0 truncate font-medium text-brand-ink">{d.name}</p>
                        <p className="m-0 text-xs text-brand-muted">
                          {d._count?.Employee ?? 0} {(d._count?.Employee ?? 0) === 1 ? "person" : "people"} · {d._count?.Store ?? 0} {(d._count?.Store ?? 0) === 1 ? "store" : "stores"}
                        </p>
                      </div>
                      <button type="button" onClick={() => setForm({ open: true, department: d })} aria-label={`Edit ${d.name}`} className="flex h-10 w-10 flex-none items-center justify-center rounded-lg text-brand-muted hover:bg-subtle hover:text-brand-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
                        <FiEdit2 aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => askDelete(d)} aria-label={`Delete ${d.name}`} className="flex h-10 w-10 flex-none items-center justify-center rounded-lg text-brand-muted hover:bg-[#FDECEA] hover:text-[#B42318] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand dark:hover:bg-[#381B19]">
                        <FiTrash2 aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Card>

      <DepartmentForm open={form.open} department={form.department} onClose={() => setForm({ open: false, department: null })} onSaved={upsert} />
    </div>
  );
};

export default DepartmentManagement;
