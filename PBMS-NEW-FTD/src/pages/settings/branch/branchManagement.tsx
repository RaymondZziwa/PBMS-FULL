import { useMemo, useState } from "react";
import { FiEdit2, FiMapPin, FiPlus, FiTrash2 } from "react-icons/fi";
import useBranches from "../../../hooks/settings/useBranches";
import { apiRequest } from "../../../libs/apiConfig";
import { branchEndpoints } from "../../../endpoints/settings/branch/branchEndpoints";
import type { IBranch } from "../../../redux/types/systemSettings";
import Button from "../../../ui/Button";
import { SearchBox } from "../../../ui/Field";
import { Card, EmptyState, PageHeader, SkeletonRows } from "../../../ui/Page";
import { useConfirm } from "../../../ui/ConfirmDialog";
import AddorModifyBranch from "./AddorModify";

/** Branches of the company, with how much is attached to each. */
const BranchesManagement = () => {
  const { data, loading, upsert, remove } = useBranches();
  const branches = (data ?? []) as IBranch[];
  const confirm = useConfirm();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<IBranch | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return branches.filter((b) => !q || `${b.name} ${b.location}`.toLowerCase().includes(q));
  }, [branches, query]);

  const openForm = (b: IBranch | null) => {
    setEditing(b);
    setFormOpen(true);
  };

  const del = async (b: IBranch) => {
    const c = b._count;
    const inUse = c ? c.Employee + c.Store + c.Department : 0;
    if (inUse > 0) {
      await confirm({
        title: `${b.name} can't be deleted yet`,
        message: "Move these to another branch first, then delete it.",
        details: (
          <ul className="m-0 list-disc pl-5">
            <li>{c!.Employee} employee(s)</li>
            <li>{c!.Store} store(s)</li>
            <li>{c!.Department} department(s)</li>
          </ul>
        ),
        confirmLabel: "OK",
      });
      return;
    }
    await confirm({
      title: `Delete ${b.name}?`,
      message: "This can't be undone.",
      tone: "danger",
      onConfirm: async () => {
        await apiRequest(branchEndpoints.deleteBranch(String(b.id)), "DELETE");
        remove(b.id);
      },
    });
  };

  return (
    <div className="mx-auto max-w-5xl font-inter">
      <PageHeader
        title="Branches"
        description="Where the company operates. Employees, stores and departments each belong to a branch."
        actions={<Button icon={<FiPlus aria-hidden="true" />} onClick={() => openForm(null)}>Add branch</Button>}
      />
      <Card>
        <div className="border-b border-line p-3 sm:p-4">
          <SearchBox value={query} onChange={setQuery} placeholder="Search branches" label="Search branches" />
        </div>
        {loading && !branches.length ? (
          <SkeletonRows rows={4} />
        ) : !shown.length ? (
          <EmptyState
            icon={<FiMapPin className="h-5 w-5" />}
            title={branches.length ? "No branch matches your search" : "No branches yet"}
            action={!branches.length && <Button icon={<FiPlus aria-hidden="true" />} onClick={() => openForm(null)}>Add branch</Button>}
          />
        ) : (
          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3">
            {shown.map((b) => (
              <li key={b.id} className="flex flex-col rounded-xl border border-line bg-surface p-4">
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-subtle text-brand-text"><FiMapPin /></span>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate font-semibold text-brand-ink">{b.name}</p>
                    <p className="m-0 truncate text-sm text-brand-muted">{b.location}</p>
                  </div>
                </div>
                {b._count && (
                  <dl className="m-0 mt-4 grid grid-cols-3 gap-2 text-center">
                    {[
                      ["People", b._count.Employee],
                      ["Stores", b._count.Store],
                      ["Depts", b._count.Department],
                    ].map(([label, n]) => (
                      <div key={label as string} className="rounded-lg bg-surface-2 px-2 py-1.5">
                        <dt className="text-[11px] text-brand-muted">{label as string}</dt>
                        <dd className="m-0 text-sm font-semibold tabular-nums text-brand-ink">{n as number}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <div className="mt-4 flex gap-2 border-t border-line pt-3">
                  <Button variant="secondary" size="sm" icon={<FiEdit2 aria-hidden="true" />} onClick={() => openForm(b)} className="flex-1">Edit</Button>
                  <Button variant="secondary" size="sm" icon={<FiTrash2 aria-hidden="true" />} onClick={() => del(b)} aria-label={`Delete ${b.name}`} className="text-[#C0362C]">Delete</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <AddorModifyBranch open={formOpen} branch={editing} onClose={() => setFormOpen(false)} onSaved={upsert} />
    </div>
  );
};

export default BranchesManagement;
