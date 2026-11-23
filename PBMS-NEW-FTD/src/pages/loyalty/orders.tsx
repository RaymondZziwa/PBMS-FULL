import { useCallback, useEffect, useState } from "react";
import { FiCheck, FiChevronLeft, FiChevronRight, FiDollarSign, FiPackage, FiTruck, FiX } from "react-icons/fi";
import { apiRequest } from "../../libs/apiConfig";
import Button from "../../ui/Button";
import Modal from "../../ui/Modal";
import { SearchBox, CONTROL, FieldShell } from "../../ui/Field";
import { Card, EmptyState, PageHeader, SkeletonRows, StatTile } from "../../ui/Page";
import { useConfirm } from "../../ui/ConfirmDialog";
import { CLUB, fmtPhone, NEXT_STATUS, ORDER_STATUS, PAY_METHOD, type ClubOrder, type OrderStatus } from "./clubApi";

type List = { rows: ClubOrder[]; total: number; page: number; pageSize: number; counts: Partial<Record<OrderStatus, number>>; salesTotal: number };
const money = (n: number) => `UGX ${Math.round(n).toLocaleString("en-US")}`;
const when = (d: string) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const TABS: Array<[OrderStatus | "", string]> = [["PLACED", "New"], ["PROCESSING", "Preparing"], ["DISPATCHED", "Dispatched"], ["AWAITING_PAYMENT", "Awaiting payment"], ["DELIVERED", "Delivered"], ["CANCELLED", "Cancelled"], ["", "All"]];
const ACTION: Partial<Record<OrderStatus, { label: string; icon: typeof FiCheck }>> = {
  PROCESSING: { label: "Start preparing", icon: FiPackage },
  DISPATCHED: { label: "Mark dispatched", icon: FiTruck },
  DELIVERED: { label: "Mark delivered", icon: FiCheck },
};

const Badge = ({ s }: { s: OrderStatus }) => <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${ORDER_STATUS[s].cls}`}>{ORDER_STATUS[s].label}</span>;

/** Marketplace orders from Amatugunda Monk Club members. */
const ClubOrders = () => {
  const confirm = useConfirm();
  const [status, setStatus] = useState<OrderStatus | "">("PLACED");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<List | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<ClubOrder | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), ...(status ? { status } : {}), ...(q.trim() ? { search: q.trim() } : {}) });
      const r = await apiRequest<{ data: List }>(`${CLUB.orders}?${qs}`);
      setData(r.data);
    } catch {
      // toast shown
    } finally {
      setLoading(false);
    }
  }, [status, q, page]);
  useEffect(() => {
    const t = setTimeout(() => void load(), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);
  useEffect(() => setPage(1), [status, q]);

  const update = async (o: ClubOrder, body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const r = await apiRequest<{ data: ClubOrder }>(CLUB.order(o.id), "PATCH", "", body);
      setOpen(r.data);
      setCancelling(false);
      setReason("");
      void load();
    } catch {
      // toast shown
    } finally {
      setBusy(false);
    }
  };

  const move = async (o: ClubOrder, next: OrderStatus) => {
    const ok = await confirm({ title: `${ACTION[next]?.label ?? "Update"}?`, message: `Order ${o.orderNumber} will show as "${ORDER_STATUS[next].label}". The member is notified.`, confirmLabel: ACTION[next]?.label ?? "Update" });
    if (ok) await update(o, { status: next });
  };
  const markPaid = async (o: ClubOrder) => {
    const ok = await confirm({ title: "Mark as paid?", message: `Confirm you received ${money(o.total)} for order ${o.orderNumber}.`, confirmLabel: "Mark paid" });
    if (ok) await update(o, { paid: true });
  };

  const c = data?.counts ?? {};
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="mx-auto max-w-6xl font-inter">
      <PageHeader title="Club orders" description="Orders placed by members in the Amatugunda Monk Club shop." />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="New" value={c.PLACED ?? 0} />
        <StatTile label="Preparing / dispatched" value={(c.PROCESSING ?? 0) + (c.DISPATCHED ?? 0)} />
        <StatTile label="Awaiting payment" value={c.AWAITING_PAYMENT ?? 0} />
        <StatTile label="Sales (not cancelled)" value={money(data?.salesTotal ?? 0)} />
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-3 sm:p-4 lg:flex-row lg:items-center">
          <div role="tablist" aria-label="Status" className="-mx-1 flex gap-1 overflow-x-auto px-1">
            {TABS.map(([v, l]) => (
              <button key={l} type="button" role="tab" aria-selected={status === v} onClick={() => setStatus(v)} className={`h-9 flex-none rounded-lg px-3 text-[13px] font-medium ${status === v ? "bg-brand text-white" : "text-brand-muted hover:bg-surface-2 hover:text-brand-ink"}`}>
                {l}{v && c[v] ? ` (${c[v]})` : ""}
              </button>
            ))}
          </div>
          <div className="lg:ml-auto lg:w-72"><SearchBox value={q} onChange={setQ} placeholder="Order no., member or card" label="Search orders" /></div>
        </div>

        {loading && !data ? (
          <SkeletonRows rows={6} />
        ) : !data?.rows.length ? (
          <EmptyState icon={<FiPackage className="h-5 w-5" />} title={q ? "No order matches your search" : "No orders here"} />
        ) : (
          <ul className={`m-0 list-none divide-y divide-line p-0 ${loading ? "opacity-60" : ""}`}>
            {data.rows.map((o) => (
              <li key={o.id}>
                <button type="button" onClick={() => setOpen(o)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-surface-2">
                  <span className="min-w-[180px] flex-1">
                    <span className="flex items-center gap-2"><span className="font-mono text-sm font-semibold text-brand-ink">{o.orderNumber}</span><Badge s={o.status} /></span>
                    <span className="block truncate text-xs text-brand-muted">{o.memberName}{o.cardNumber ? ` · ${o.cardNumber}` : ""} · {when(o.createdAt)}</span>
                  </span>
                  <span className="hidden text-sm text-brand-muted sm:block">{o.items.reduce((a, i) => a + i.qty, 0)} item(s)</span>
                  <span className="text-right">
                    <span className="block font-semibold tabular-nums text-brand-ink">{money(o.total)}</span>
                    <span className={`block text-xs ${o.paid ? "text-[#1B7A3D] dark:text-[#7FD89E]" : "text-brand-muted"}`}>{o.paid ? "Paid" : PAY_METHOD[o.paymentMethod]}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-brand-muted">
            <span>Page {page} of {pages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" icon={<FiChevronLeft aria-hidden="true" />} disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page" />
              <Button size="sm" variant="secondary" icon={<FiChevronRight aria-hidden="true" />} disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="Next page" />
            </div>
          </div>
        )}
      </Card>

      <Modal
        open={!!open}
        onClose={() => { if (!busy) { setOpen(null); setCancelling(false); } }}
        size="lg"
        title={open ? `Order ${open.orderNumber}` : ""}
        description={open ? `${when(open.createdAt)} · ${open.memberName}${open.cardNumber ? ` (${open.cardNumber})` : ""}` : undefined}
        footer={
          open && (cancelling ? (
            <>
              <Button variant="secondary" onClick={() => setCancelling(false)} disabled={busy}>Back</Button>
              <Button variant="danger" loading={busy} disabled={!reason.trim()} onClick={() => update(open, { status: "CANCELLED", note: reason })}>Cancel order</Button>
            </>
          ) : (
            <>
              {NEXT_STATUS[open.status].includes("CANCELLED") && <Button variant="secondary" icon={<FiX aria-hidden="true" />} onClick={() => setCancelling(true)} className="mr-auto text-[#C0362C]">Cancel order</Button>}
              {!open.paid && open.paymentMethod !== "MOBILE_MONEY" && open.status !== "CANCELLED" && <Button variant="secondary" icon={<FiDollarSign aria-hidden="true" />} onClick={() => markPaid(open)} loading={busy}>Mark paid</Button>}
              {NEXT_STATUS[open.status].filter((n) => n !== "CANCELLED").slice(0, 1).map((n) => {
                const a = ACTION[n]!;
                return <Button key={n} icon={<a.icon aria-hidden="true" />} onClick={() => move(open, n)} loading={busy}>{a.label}</Button>;
              })}
            </>
          ))
        }
      >
        {open && (
          cancelling ? (
            <FieldShell label="Why is this order cancelled?" id="cancel-reason" required hint="The member sees this.">
              <textarea id="cancel-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className={`${CONTROL} h-auto border-line py-2.5`} data-autofocus />
            </FieldShell>
          ) : (
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_240px]">
              <div>
                <table className="w-full border-collapse text-sm">
                  <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-brand-muted"><th className="py-2 font-semibold">Item</th><th className="py-2 text-right font-semibold">Qty</th><th className="py-2 text-right font-semibold">Price</th><th className="py-2 text-right font-semibold">Amount</th></tr></thead>
                  <tbody>
                    {open.items.map((i) => (
                      <tr key={i.id} className="border-b border-line"><td className="py-2 text-brand-ink">{i.name}</td><td className="py-2 text-right tabular-nums">{i.qty}</td><td className="py-2 text-right tabular-nums">{money(i.unitPrice)}</td><td className="py-2 text-right tabular-nums">{money(i.lineTotal)}</td></tr>
                    ))}
                  </tbody>
                  <tfoot className="text-sm">
                    <tr><td colSpan={3} className="pt-2 text-right text-brand-muted">Subtotal</td><td className="pt-2 text-right tabular-nums">{money(open.subtotal)}</td></tr>
                    {open.discountAmount > 0 && <tr><td colSpan={3} className="text-right text-brand-muted">Club discount ({open.discountPercent}%)</td><td className="text-right tabular-nums">−{money(open.discountAmount)}</td></tr>}
                    <tr className="font-semibold text-brand-ink"><td colSpan={3} className="pt-1 text-right">Total</td><td className="pt-1 text-right tabular-nums">{money(open.total)}</td></tr>
                  </tfoot>
                </table>
                {open.notes && <p className="m-0 mt-4 rounded-lg bg-surface-2 px-3 py-2 text-sm text-ink-soft">Member's note: {open.notes}</p>}
                {open.statusNote && <p className="m-0 mt-2 text-sm text-brand-muted">Status note: {open.statusNote}</p>}
              </div>
              <aside className="space-y-4 text-sm">
                <div><p className="m-0 mb-1 text-xs font-semibold uppercase tracking-wider text-brand-muted">Status</p><Badge s={open.status} /></div>
                <div>
                  <p className="m-0 mb-1 text-xs font-semibold uppercase tracking-wider text-brand-muted">Payment</p>
                  <p className="m-0 text-brand-ink">{PAY_METHOD[open.paymentMethod]}</p>
                  <p className={`m-0 font-semibold ${open.paid ? "text-[#1B7A3D] dark:text-[#7FD89E]" : "text-[#B54708] dark:text-[#F5C26B]"}`}>{open.paid ? "Paid" : "Not paid yet"}</p>
                </div>
                <div>
                  <p className="m-0 mb-1 text-xs font-semibold uppercase tracking-wider text-brand-muted">Deliver to {open.usedDefaultAddress ? "(member's address)" : "(other address)"}</p>
                  <p className="m-0 text-brand-ink">{open.recipientName}</p>
                  <p className="m-0"><a href={`tel:${open.deliveryPhone}`} className="text-brand-text">{fmtPhone(open.deliveryPhone)}</a></p>
                  <p className="m-0 text-ink-soft">{open.deliveryAddress}</p>
                </div>
              </aside>
            </div>
          )
        )}
      </Modal>
    </div>
  );
};

export default ClubOrders;
