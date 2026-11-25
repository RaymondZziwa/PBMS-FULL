import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiChevronRight, FiEdit2, FiPlus, FiTrash2, FiTruck } from "react-icons/fi";
import useSupplier from "../../../hooks/inventory/useSupplier";
import { apiRequest } from "../../../libs/apiConfig";
import { InventoryEndpoints } from "../../../endpoints/inventory/inventory";
import type { ISupplier } from "../../../redux/types/supplyMgt";
import Button from "../../../ui/Button";
import { SearchBox } from "../../../ui/Field";
import { Card, EmptyState, PageHeader, SkeletonRows, StatTile, initials, ugx } from "../../../ui/Page";
import { useConfirm } from "../../../ui/ConfirmDialog";
import { Pager, Table, Td, Th, usePaged } from "../shared";
import { SupplierForm, supplierTotals } from "./forms";

/** People and companies who supply goods, and what is owed to them. */
const SuppliersManagement = () => {
  const confirm = useConfirm();
  const { data, loading, upsert, remove } = useSupplier();
  const suppliers = (data ?? []) as ISupplier[];
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ISupplier | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return suppliers.filter((s) => !q || `${s.firstName} ${s.lastName} ${s.contact} ${s.address ?? ""}`.toLowerCase().includes(q));
  }, [suppliers, query]);
  const paged = usePaged(filtered);

  const totals = useMemo(() => suppliers.map(supplierTotals).reduce((a, t) => ({ supplied: a.supplied + t.supplied, paid: a.paid + t.paid, balance: a.balance + t.balance }), { supplied: 0, paid: 0, balance: 0 }), [suppliers]);

  const del = async (s: ISupplier) => {
    if (s.Supply?.length) {
      await confirm({ title: `${s.firstName} ${s.lastName} can't be deleted`, message: `They have ${s.Supply.length} supply record(s). Deleting them would erase those records and payments.`, confirmLabel: "OK" });
      return;
    }
    await confirm({
      title: `Delete ${s.firstName} ${s.lastName}?`,
      message: "This can't be undone.",
      tone: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await apiRequest(InventoryEndpoints.SUPPLY.SUPPLIER.delete(s.id), "DELETE");
        remove(s.id);
      },
    });
  };

  const start = (s: ISupplier | null) => {
    setEditing(s);
    setOpen(true);
  };

  return (
    <div className="mx-auto max-w-6xl font-inter">
      <PageHeader title="Suppliers" description="Who supplies your goods, what they've delivered and what you still owe them." actions={<Button icon={<FiPlus aria-hidden="true" />} onClick={() => start(null)}>Add supplier</Button>} />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Goods received" value={ugx(totals.supplied, { compact: true })} />
        <StatTile label="Paid" value={ugx(totals.paid, { compact: true })} />
        <StatTile label="Owed to suppliers" value={ugx(totals.balance, { compact: true })} />
      </div>
      <Card>
        <div className="border-b border-line p-3 sm:p-4">
          <SearchBox value={query} onChange={setQuery} placeholder="Name, phone or address" label="Search suppliers" />
        </div>
        {loading && !suppliers.length ? (
          <SkeletonRows rows={5} />
        ) : !filtered.length ? (
          <EmptyState icon={<FiTruck className="h-5 w-5" />} title={suppliers.length ? "No supplier matches" : "No suppliers yet"} action={!suppliers.length && <Button icon={<FiPlus aria-hidden="true" />} onClick={() => start(null)}>Add supplier</Button>} />
        ) : (
          <>
            <Table head={<><Th>Supplier</Th><Th>Phone</Th><Th className="text-right">Supplies</Th><Th className="text-right">Received</Th><Th className="text-right">Owed</Th><Th className="w-px text-right">Actions</Th></>}>
              {paged.shown.map((s) => {
                const t = supplierTotals(s);
                return (
                  <tr key={s.id} className="hover:bg-surface-2/60">
                    <Td>
                      <Link to={`/inventory/supplier/${s.id}`} className="flex items-center gap-3 font-medium text-brand-ink hover:text-brand-text">
                        <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-subtle text-xs font-semibold text-brand-text">{initials(s.firstName, s.lastName)}</span>
                        <span className="min-w-0">
                          <span className="block truncate">{s.firstName} {s.lastName}</span>
                          {s.address && <span className="block truncate text-xs font-normal text-brand-muted">{s.address}</span>}
                        </span>
                      </Link>
                    </Td>
                    <Td className="whitespace-nowrap">{s.contact}</Td>
                    <Td className="text-right tabular-nums">{t.count}</Td>
                    <Td className="whitespace-nowrap text-right tabular-nums">{ugx(t.supplied)}</Td>
                    <Td className={`whitespace-nowrap text-right font-semibold tabular-nums ${t.balance > 0 ? "text-[#B42318] dark:text-[#F2A29A]" : ""}`}>{ugx(t.balance)}</Td>
                    <Td className="whitespace-nowrap text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" icon={<FiEdit2 aria-hidden="true" />} onClick={() => start(s)} aria-label={`Edit ${s.firstName} ${s.lastName}`} />
                        <Button size="sm" variant="ghost" icon={<FiTrash2 aria-hidden="true" />} onClick={() => del(s)} aria-label={`Delete ${s.firstName} ${s.lastName}`} className="text-[#C0362C]" />
                        <Link to={`/inventory/supplier/${s.id}`} className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-[13px] font-medium text-brand-text hover:bg-subtle">Open <FiChevronRight aria-hidden="true" /></Link>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </Table>
            <Pager {...paged} />
          </>
        )}
      </Card>
      <SupplierForm open={open} supplier={editing} onClose={() => setOpen(false)} onSaved={upsert} />
    </div>
  );
};

export default SuppliersManagement;
