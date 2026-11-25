import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiArrowLeft, FiCreditCard, FiEdit2, FiEye, FiPackage, FiPlus, FiTrash2 } from "react-icons/fi";
import useSupplier from "../../../hooks/inventory/useSupplier";
import useStockMovement from "../../../hooks/inventory/useStockMovement";
import { apiRequest } from "../../../libs/apiConfig";
import { InventoryEndpoints } from "../../../endpoints/inventory/inventory";
import type { ISupplier, ISupply, ISupplyPayments } from "../../../redux/types/supplyMgt";
import Button from "../../../ui/Button";
import Modal from "../../../ui/Modal";
import { Badge, Card, EmptyState, PageHeader, SkeletonRows, StatTile, ugx } from "../../../ui/Page";
import { useConfirm } from "../../../ui/ConfirmDialog";
import { day, Facts, imagesOf, num, personName, Photos, qty, Table, Td, Th } from "../shared";
import { PaymentForm, SupplierForm, SupplyForm, supplierTotals } from "./forms";

const STATUS: Record<string, { label: string; tone: "good" | "warn" | "bad" }> = {
  PAID: { label: "Paid", tone: "good" },
  PARTIALLY_PAID: { label: "Part paid", tone: "warn" },
  UNPAID: { label: "Unpaid", tone: "bad" },
};

const PAY_LABEL: Record<string, string> = { CASH: "Cash", MOBILE_MONEY: "Mobile money", CHEQUE: "Cheque", BARTER_PAYMENT: "Barter" };

/** One supplier: their supplies, payments and balance. */
const SupplierDetails = () => {
  const { id } = useParams();
  const confirm = useConfirm();
  const { data: list, upsert } = useSupplier();
  const { refresh: refreshMovements } = useStockMovement();
  const cached = (list as ISupplier[]).find((s) => String(s.id) === id) ?? null;
  const [supplier, setSupplier] = useState<ISupplier | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [missing, setMissing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [supplyOpen, setSupplyOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<ISupply | null>(null);
  const [paying, setPaying] = useState<ISupply | null>(null);
  const [viewing, setViewing] = useState<ISupply | null>(null);

  const reload = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiRequest<{ data: ISupplier }>(InventoryEndpoints.SUPPLY.SUPPLIER.fetch_one(id), "GET");
      setSupplier(res.data);
      upsert(res.data);
      setViewing((v) => (v ? res.data.Supply.find((s) => s.id === v.id) ?? null : v));
    } catch {
      setMissing(true);
    } finally {
      setLoading(false);
    }
  }, [id, upsert]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const afterStockChange = () => {
    void reload();
    void refreshMovements();
  };

  const delSupply = async (s: ISupply) => {
    if (s.SupplyPayments?.length) {
      await confirm({ title: "This supply can't be deleted", message: "It has payments. Delete the payments first.", confirmLabel: "OK" });
      return;
    }
    await confirm({
      title: "Delete this supply?",
      message: `${qty(s.qty)} ${s.uom?.name ?? ""} ${s.item?.name ?? ""} are taken back out of ${s.destinationStore?.name ?? "the store"}, and ${ugx(s.value)} is no longer owed.`,
      tone: "danger",
      confirmLabel: "Delete supply",
      onConfirm: async () => {
        await apiRequest(InventoryEndpoints.SUPPLY.SUPPLIES.delete(s.id), "DELETE");
        afterStockChange();
      },
    });
  };

  const delPayment = async (p: ISupplyPayments) => {
    await confirm({
      title: `Delete this ${ugx(p.amount)} payment?`,
      message: "The amount goes back onto the balance owed.",
      tone: "danger",
      confirmLabel: "Delete payment",
      onConfirm: async () => {
        await apiRequest(InventoryEndpoints.SUPPLY.SUPPLY_PAYMENTS.DELETE(p.id), "DELETE");
        await reload();
      },
    });
  };

  if (loading && !supplier) return <div className="mx-auto max-w-6xl"><Card><SkeletonRows rows={6} /></Card></div>;
  if (!supplier || missing) {
    return (
      <div className="mx-auto max-w-6xl">
        <Card><EmptyState title="Supplier not found" action={<Link to="/inventory/suppliers" className="text-sm font-medium text-brand-text">Back to suppliers</Link>} /></Card>
      </div>
    );
  }

  const t = supplierTotals(supplier);
  const supplies = supplier.Supply ?? [];

  return (
    <div className="mx-auto max-w-6xl font-inter">
      <Link to="/inventory/suppliers" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-text hover:underline"><FiArrowLeft aria-hidden="true" /> Suppliers</Link>
      <PageHeader
        title={`${supplier.firstName} ${supplier.lastName}`}
        description={[supplier.contact, supplier.address].filter(Boolean).join(" · ")}
        actions={
          <>
            <Button variant="secondary" icon={<FiEdit2 aria-hidden="true" />} onClick={() => setEditOpen(true)}>Edit</Button>
            <Button icon={<FiPlus aria-hidden="true" />} onClick={() => { setEditingSupply(null); setSupplyOpen(true); }}>Receive goods</Button>
          </>
        }
      />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Goods received" value={ugx(t.supplied)} hint={`${t.count} supply record(s)`} />
        <StatTile label="Paid" value={ugx(t.paid)} />
        <StatTile label="Still owed" value={ugx(t.balance)} />
      </div>

      <Card>
        <div className="border-b border-line px-4 py-3">
          <h2 className="m-0 text-sm font-semibold text-brand-ink">Supplies</h2>
        </div>
        {!supplies.length ? (
          <EmptyState icon={<FiPackage className="h-5 w-5" />} title="Nothing received yet" message="Record goods from this supplier to add them to a store." action={<Button icon={<FiPlus aria-hidden="true" />} onClick={() => { setEditingSupply(null); setSupplyOpen(true); }}>Receive goods</Button>} />
        ) : (
          <Table head={<><Th>Date</Th><Th>Item</Th><Th>Store</Th><Th className="text-right">Value</Th><Th className="text-right">Balance</Th><Th>Status</Th><Th className="w-px text-right">Actions</Th></>}>
            {supplies.map((s) => {
              const st = STATUS[s.paymentStatus] ?? STATUS.UNPAID;
              return (
                <tr key={s.id} className="hover:bg-surface-2/60">
                  <Td className="whitespace-nowrap text-brand-muted">{day(s.createdAt)}</Td>
                  <Td>
                    <p className="m-0 font-medium">{s.item?.name ?? "—"}</p>
                    <p className="m-0 text-xs text-brand-muted">{qty(s.qty)} {s.uom?.name}</p>
                  </Td>
                  <Td>{s.destinationStore?.name ?? "—"}</Td>
                  <Td className="whitespace-nowrap text-right tabular-nums">{ugx(s.value)}</Td>
                  <Td className="whitespace-nowrap text-right font-semibold tabular-nums">{ugx(s.balance)}</Td>
                  <Td><Badge tone={st.tone}>{st.label}</Badge></Td>
                  <Td className="whitespace-nowrap text-right">
                    <div className="flex justify-end gap-1">
                      {num(s.balance) > 0 && <Button size="sm" icon={<FiCreditCard aria-hidden="true" />} onClick={() => setPaying(s)}>Pay</Button>}
                      <Button size="sm" variant="ghost" icon={<FiEye aria-hidden="true" />} onClick={() => setViewing(s)}>View</Button>
                      <Button size="sm" variant="ghost" icon={<FiEdit2 aria-hidden="true" />} onClick={() => { setEditingSupply(s); setSupplyOpen(true); }} aria-label="Edit supply" />
                      <Button size="sm" variant="ghost" icon={<FiTrash2 aria-hidden="true" />} onClick={() => delSupply(s)} aria-label="Delete supply" className="text-[#C0362C]" />
                    </div>
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      <SupplierForm open={editOpen} supplier={supplier} onClose={() => setEditOpen(false)} onSaved={(s) => { setSupplier((cur) => (cur ? { ...cur, ...s, Supply: s.Supply ?? cur.Supply } : s)); upsert(s); }} />
      <SupplyForm open={supplyOpen} supplier={supplier} supply={editingSupply} onClose={() => setSupplyOpen(false)} onSaved={afterStockChange} />
      <PaymentForm open={!!paying} supply={paying} onClose={() => setPaying(null)} onSaved={() => void reload()} />

      <Modal open={!!viewing} onClose={() => setViewing(null)} size="lg" title={viewing ? `${qty(viewing.qty)} ${viewing.uom?.name ?? ""} ${viewing.item?.name ?? ""}` : ""} description={viewing ? `Received ${day(viewing.createdAt)}` : undefined} footer={<Button variant="secondary" onClick={() => setViewing(null)}>Close</Button>}>
        {viewing && (
          <div className="space-y-5">
            <Facts rows={[["Store", viewing.destinationStore?.name], ["Received by", personName(viewing.employee)], ["Value", ugx(viewing.value)], ["Balance", ugx(viewing.balance)]]} />
            <div>
              <p className="m-0 mb-2 text-xs font-medium uppercase tracking-wide text-brand-muted">Proof</p>
              <Photos paths={imagesOf(viewing.proofImage)} />
            </div>
            <div>
              <p className="m-0 mb-2 text-xs font-medium uppercase tracking-wide text-brand-muted">Payments ({viewing.SupplyPayments?.length ?? 0})</p>
              {!viewing.SupplyPayments?.length ? (
                <p className="m-0 text-sm text-brand-muted">No payments yet.</p>
              ) : (
                <ul className="m-0 list-none divide-y divide-line rounded-lg border border-line p-0">
                  {viewing.SupplyPayments.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="m-0 font-medium text-brand-ink">{ugx(p.amount)} <span className="font-normal text-brand-muted">· {PAY_LABEL[p.paymentType] ?? p.paymentType}</span></p>
                        <p className="m-0 text-xs text-brand-muted">
                          {day(p.createdAt)} · {personName(p.employee)}
                          {p.chequeNumber ? ` · Cheque ${p.chequeNumber}${p.bank ? `, ${p.bank}` : ""}` : ""}
                          {p.barterItemName ? ` · ${p.barterItemName}` : ""}
                        </p>
                      </div>
                      {p.proofImage && <Photos paths={[p.proofImage]} size="sm" />}
                      <Button size="sm" variant="ghost" icon={<FiTrash2 aria-hidden="true" />} onClick={() => delPayment(p)} aria-label="Delete payment" className="text-[#C0362C]" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SupplierDetails;
