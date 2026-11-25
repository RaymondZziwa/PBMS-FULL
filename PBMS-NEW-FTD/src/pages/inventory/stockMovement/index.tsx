import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FiAlertTriangle, FiCheck, FiEye, FiPlus, FiRepeat, FiX } from "react-icons/fi";
import useStockMovement from "../../../hooks/inventory/useStockMovement";
import useStores from "../../../hooks/inventory/useStores";
import { apiRequest } from "../../../libs/apiConfig";
import { InventoryEndpoints } from "../../../endpoints/inventory/inventory";
import type { IStockMovement } from "../../../redux/types/inventory";
import Button from "../../../ui/Button";
import Modal from "../../../ui/Modal";
import Combobox from "../../../ui/Combobox";
import { SearchBox, TextField } from "../../../ui/Field";
import { Badge, Card, EmptyState, PageHeader, SkeletonRows, StatTile } from "../../../ui/Page";
import { apiError, Facts, imagesOf, MovementBadge, num, Pager, personName, Photos, qty, Table, Tabs, Td, TextArea, Th, usePaged, when } from "../shared";
import StockMovementForm from "./StockMovementForm";

type View = "all" | "RESTOCK" | "DEPLETION" | "TRANSFER" | "ADJUSTMENT" | "pending" | "mismatch";
type Action = { kind: "confirm" | "reject" | "resolve"; rec: IStockMovement } | null;

const sent = (r: IStockMovement) => num(r.initiatedQty ?? r.qty);
const isPending = (r: IStockMovement) => r.category === "TRANSFER" && r.transferStatus === "PENDING";
const isMismatch = (r: IStockMovement) => r.category === "TRANSFER" && r.transferStatus === "CONFIRMED" && r.initiatedQty != null && num(r.qty) !== num(r.initiatedQty);

const Status = ({ r }: { r: IStockMovement }) => {
  if (r.category !== "TRANSFER") return null;
  if (r.transferStatus === "PENDING") return <Badge tone="warn">Awaiting receipt</Badge>;
  if (r.transferStatus === "REJECTED") return <Badge tone="bad">Rejected</Badge>;
  if (isMismatch(r)) return r.isResolved ? <Badge tone="good">Mismatch resolved</Badge> : <Badge tone="bad"><FiAlertTriangle aria-hidden="true" /> Short by {qty(sent(r) - num(r.qty))}</Badge>;
  return <Badge tone="good">Received</Badge>;
};

/** Every change to stock, with transfers to confirm and mismatches to resolve. */
const StockMovementRecords = () => {
  const { data, loading, upsert, refresh } = useStockMovement();
  const { data: stores } = useStores();
  const records = (data ?? []) as IStockMovement[];
  const [view, setView] = useState<View>("all");
  const [query, setQuery] = useState("");
  const [store, setStore] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [viewing, setViewing] = useState<IStockMovement | null>(null);
  const [action, setAction] = useState<Action>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void refresh();
    // always show the latest on opening this page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = records.filter(isPending).length;
  const mismatches = records.filter((r) => isMismatch(r) && !r.isResolved).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      if (view === "pending" && !isPending(r)) return false;
      if (view === "mismatch" && !(isMismatch(r) && !r.isResolved)) return false;
      if (!["all", "pending", "mismatch"].includes(view) && r.category !== view) return false;
      if (store && String(r.store?.id ?? r.storeId) !== store && String(r.toStore?.id ?? r.toStoreId ?? "") !== store) return false;
      if (!q) return true;
      return `${r.item?.name ?? ""} ${r.store?.name ?? ""} ${r.toStore?.name ?? ""} ${personName(r.employee)} ${r.transferId ?? ""} ${r.source ?? ""} ${r.deliveryNote?.deliveryNoteNumber ?? ""}`.toLowerCase().includes(q);
    });
  }, [records, view, store, query]);
  const paged = usePaged(filtered);

  const openAction = (kind: "confirm" | "reject" | "resolve", rec: IStockMovement) => {
    setAction({ kind, rec });
    setAmount(kind === "confirm" ? String(sent(rec)) : "");
    setNote("");
    setErrors({});
  };

  const doAction = async (e: FormEvent) => {
    e.preventDefault();
    if (!action) return;
    const { kind, rec } = action;
    const errs: Record<string, string> = {};
    if (kind === "confirm") {
      const n = Number(amount);
      if (amount === "" || !Number.isFinite(n) || n < 0) errs.confirmedQty = "Enter how much arrived.";
      else if (n > sent(rec)) errs.confirmedQty = `No more than the ${qty(sent(rec))} sent.`;
      else if (n < sent(rec) && !note.trim()) errs.notes = "Less arrived than was sent: explain the difference.";
    } else if (!note.trim()) errs.notes = kind === "reject" ? "Say why you're rejecting it." : "Explain how it was resolved.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      const res =
        kind === "confirm"
          ? await apiRequest<{ data: IStockMovement }>(InventoryEndpoints.STOCK_MVT.CONFIRM_STOCK_TRANSFER, "POST", { transferId: rec.id, confirmedQty: Number(amount), notes: note.trim() })
          : kind === "reject"
            ? await apiRequest<{ data: IStockMovement }>(InventoryEndpoints.STOCK_MVT.REJECT_STOCK_TRANSFER, "POST", { transferId: rec.id, reason: note.trim() })
            : await apiRequest<{ data: IStockMovement }>(InventoryEndpoints.STOCK_MVT.resolve_transfer_conflict(rec.id), "POST", { notes: note.trim() });
      if (res?.data) upsert(res.data);
      setAction(null);
    } catch (err) {
      const { field, message } = apiError(err);
      if (field && message) setErrors({ [field === "reason" ? "notes" : field]: message });
    } finally {
      setBusy(false);
    }
  };

  const tabs: Array<{ value: View; label: string; count?: number }> = [
    { value: "all", label: "All" },
    { value: "RESTOCK", label: "Restocks" },
    { value: "DEPLETION", label: "Depletions" },
    { value: "TRANSFER", label: "Transfers" },
    { value: "ADJUSTMENT", label: "Stock counts" },
    { value: "pending", label: "Awaiting receipt", count: pending },
    { value: "mismatch", label: "Mismatches", count: mismatches },
  ];

  const a = action?.rec;
  return (
    <div className="mx-auto max-w-7xl font-inter">
      <PageHeader title="Stock movement" description="Restocks, depletions, transfers and stock counts. Transfers wait for the receiving store to confirm." actions={<Button icon={<FiPlus aria-hidden="true" />} onClick={() => setFormOpen(true)}>Record movement</Button>} />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Movements" value={records.length} />
        <StatTile label="Transfers awaiting receipt" value={pending} />
        <StatTile label="Unresolved mismatches" value={mismatches} />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <SearchBox value={query} onChange={setQuery} placeholder="Item, store, person, transfer code" label="Search movements" className="lg:max-w-sm" />
            <Combobox label="Store" hideLabel clearable value={store} onChange={setStore} options={stores.map((s) => ({ value: String(s.id), label: s.name }))} placeholder="All stores" searchPlaceholder="Search stores" className="lg:w-56" />
          </div>
          <Tabs label="Movement type" value={view} onChange={setView} options={tabs} />
        </div>

        {loading && !records.length ? (
          <SkeletonRows rows={8} />
        ) : !filtered.length ? (
          <EmptyState icon={<FiRepeat className="h-5 w-5" />} title={records.length ? "Nothing matches" : "No stock movements yet"} action={!records.length && <Button icon={<FiPlus aria-hidden="true" />} onClick={() => setFormOpen(true)}>Record movement</Button>} />
        ) : (
          <>
            <Table head={<><Th>When</Th><Th>Type</Th><Th>Item</Th><Th>Store</Th><Th className="text-right">Qty</Th><Th className="text-right">Left</Th><Th>By</Th><Th className="w-px text-right">Actions</Th></>}>
              {paged.shown.map((r) => {
                const pend = isPending(r);
                const mis = isMismatch(r) && !r.isResolved;
                return (
                  <tr key={r.id} className={`hover:bg-surface-2/60 ${mis ? "bg-[#FDECEA]/50 dark:bg-[#381B19]/40" : pend ? "bg-[#FEF4E2]/50 dark:bg-[#33280F]/40" : ""}`}>
                    <Td className="whitespace-nowrap text-brand-muted">{when(r.createdAt)}</Td>
                    <Td><div className="flex flex-col items-start gap-1"><MovementBadge category={r.category} /><Status r={r} /></div></Td>
                    <Td className="font-medium">{r.item?.name ?? "—"}</Td>
                    <Td className="whitespace-nowrap">{r.store?.name ?? "—"}{r.toStore && <span className="text-brand-muted"> → {r.toStore.name}</span>}</Td>
                    <Td className="whitespace-nowrap text-right tabular-nums">
                      {r.category === "DEPLETION" || r.category === "TRANSFER" ? "−" : r.category === "RESTOCK" ? "+" : "="}
                      {qty(r.category === "TRANSFER" ? sent(r) : r.qty)} <span className="text-brand-muted">{r.unit?.abr || r.unit?.name}</span>
                    </Td>
                    <Td className="text-right tabular-nums text-brand-muted">{r.remainingQuantity != null ? qty(r.remainingQuantity) : "—"}</Td>
                    <Td className="whitespace-nowrap">{personName(r.employee)}</Td>
                    <Td className="whitespace-nowrap text-right">
                      <div className="flex justify-end gap-1">
                        {pend && (
                          <>
                            <Button size="sm" icon={<FiCheck aria-hidden="true" />} onClick={() => openAction("confirm", r)}>Receive</Button>
                            <Button size="sm" variant="ghost" icon={<FiX aria-hidden="true" />} onClick={() => openAction("reject", r)} className="text-[#C0362C]">Reject</Button>
                          </>
                        )}
                        {mis && <Button size="sm" variant="secondary" icon={<FiAlertTriangle aria-hidden="true" />} onClick={() => openAction("resolve", r)}>Resolve</Button>}
                        <Button size="sm" variant="ghost" icon={<FiEye aria-hidden="true" />} onClick={() => setViewing(r)} aria-label={`View ${r.item?.name ?? "movement"}`}>View</Button>
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

      <StockMovementForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={(recs) => recs.forEach((r) => upsert(r))} />

      <Modal open={!!viewing} onClose={() => setViewing(null)} size="lg" title={viewing ? `${viewing.item?.name ?? "Movement"}` : ""} description={viewing ? when(viewing.createdAt) : undefined} footer={<Button variant="secondary" onClick={() => setViewing(null)}>Close</Button>}>
        {viewing && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2"><MovementBadge category={viewing.category} /><Status r={viewing} /></div>
            <Facts
              rows={[
                ["Store", viewing.store?.name],
                ...(viewing.toStore ? ([["Sent to", viewing.toStore.name]] as Array<[string, string]>) : []),
                ["Quantity", `${qty(viewing.category === "TRANSFER" ? sent(viewing) : viewing.qty)} ${viewing.unit?.name ?? ""}`],
                ...(viewing.category === "TRANSFER" && viewing.transferStatus === "CONFIRMED" ? ([["Received", `${qty(viewing.qty)} ${viewing.unit?.name ?? ""}`]] as Array<[string, string]>) : []),
                ["Left in store after", viewing.remainingQuantity != null ? qty(viewing.remainingQuantity) : "—"],
                ["Recorded by", personName(viewing.employee)],
                ["Source / reason", viewing.source || "—"],
                ...(viewing.transferId ? ([["Transfer code", viewing.transferId]] as Array<[string, string]>) : []),
                ...(viewing.deliveryNote ? ([["Delivery note", `${viewing.deliveryNote.deliveryNoteNumber} · ${viewing.deliveryNote.name}`]] as Array<[string, string]>) : []),
              ]}
            />
            {[["Notes", viewing.description], ["Receipt / rejection note", viewing.extraNote], ["How the mismatch was resolved", viewing.resolveNotes]].map(([k, v]) =>
              v ? (
                <div key={k as string}>
                  <p className="m-0 text-xs font-medium uppercase tracking-wide text-brand-muted">{k}</p>
                  <p className="m-0 mt-1 whitespace-pre-wrap text-sm text-brand-ink">{v}</p>
                </div>
              ) : null,
            )}
            <div>
              <p className="m-0 mb-2 text-xs font-medium uppercase tracking-wide text-brand-muted">Evidence</p>
              <Photos paths={imagesOf(viewing.images, viewing.deliveryNote?.images)} />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!action}
        onClose={() => setAction(null)}
        locked={busy}
        size="md"
        title={action?.kind === "confirm" ? "Receive transfer" : action?.kind === "reject" ? "Reject transfer" : "Resolve mismatch"}
        description={a ? `${qty(sent(a))} ${a.unit?.name ?? ""} ${a.item?.name ?? ""} · ${a.store?.name ?? ""} → ${a.toStore?.name ?? ""}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAction(null)} disabled={busy}>Cancel</Button>
            <Button type="submit" form="transfer-action" loading={busy} variant={action?.kind === "reject" ? "danger" : "primary"}>
              {action?.kind === "confirm" ? "Receive" : action?.kind === "reject" ? "Reject and return stock" : "Mark resolved"}
            </Button>
          </>
        }
      >
        <form id="transfer-action" onSubmit={doAction} noValidate className="space-y-4">
          {action?.kind === "confirm" && (
            <TextField label="Quantity that arrived" required data-autofocus inputMode="decimal" value={amount} onChange={(v) => { setAmount(v.replace(/[^\d.]/g, "")); setErrors({}); }} error={errors.confirmedQty} hint={`${qty(sent(action.rec))} were sent. If less arrived, the difference is flagged as a mismatch.`} />
          )}
          {action?.kind === "reject" && <p className="m-0 text-sm text-ink-soft">The stock goes back to {a?.store?.name}.</p>}
          {action?.kind === "resolve" && a && <p className="m-0 text-sm text-ink-soft">{qty(sent(a))} were sent and {qty(a.qty)} arrived. Explain what happened to the difference.</p>}
          <TextArea
            label={action?.kind === "confirm" ? "Notes" : action?.kind === "reject" ? "Reason" : "Explanation"}
            required={action?.kind !== "confirm"}
            value={note}
            onChange={(v) => { setNote(v); setErrors({}); }}
            error={errors.notes}
            maxLength={1000}
          />
        </form>
      </Modal>
    </div>
  );
};

export default StockMovementRecords;
