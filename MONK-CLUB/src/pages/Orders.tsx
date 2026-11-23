import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiChevronDown, FiPackage } from "react-icons/fi";
import AppShell from "../components/AppShell";
import { Alert, Badge, Button, Modal, Spinner, TextInput, cx } from "../components/ui";
import { api } from "../lib/api";
import { dateTime, phone as fmtPhone, ugx } from "../lib/format";
import type { Order, OrderStatus, Payment } from "../lib/types";
import { usePaymentPoll } from "../lib/usePaymentPoll";

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: "good" | "bad" | "warn" | "brand" | "neutral" }> = {
  AWAITING_PAYMENT: { label: "Not paid", tone: "warn" },
  PLACED: { label: "Received", tone: "brand" },
  PROCESSING: { label: "Being prepared", tone: "brand" },
  DISPATCHED: { label: "On the way", tone: "brand" },
  DELIVERED: { label: "Delivered", tone: "good" },
  CANCELLED: { label: "Cancelled", tone: "bad" },
};
const PAY: Record<Order["paymentMethod"], string> = { MOBILE_MONEY: "Mobile money", ON_DELIVERY: "Pay on delivery", CASH: "Cash" };
const STEPS: OrderStatus[] = ["PLACED", "PROCESSING", "DISPATCHED", "DELIVERED"];

/** The member's orders, with progress, payment and cancel. */
const Orders = () => {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [cancel, setCancel] = useState<Order | null>(null);
  const [payFor, setPayFor] = useState<Order | null>(null);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => api<Order[]>("/api/club/me/orders").then(setOrders).catch((e) => setError(e.message)), []);
  useEffect(() => void load(), [load]);
  const poll = usePaymentPoll(() => void load());

  const doCancel = async () => {
    if (!cancel) return;
    setBusy(true);
    try {
      await api(`/api/club/me/orders/${cancel.id}/cancel`, { method: "POST", body: {} });
      setCancel(null);
      setMsg(`Order ${cancel.orderNumber} was cancelled.`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Couldn't cancel");
      setCancel(null);
    } finally {
      setBusy(false);
    }
  };

  const doPay = async () => {
    if (!payFor) return;
    setBusy(true);
    try {
      const p = await api<Payment>(`/api/club/me/orders/${payFor.id}/pay`, { body: { phone } });
      poll.follow(p);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Couldn't start the payment");
      setPayFor(null);
    } finally {
      setBusy(false);
    }
  };

  const paying = poll.payment && payFor;

  return (
    <AppShell title="My orders">
      {msg && <div className="mb-4"><Alert>{msg}</Alert></div>}
      {error ? (
        <Alert tone="error">{error}</Alert>
      ) : !orders ? (
        <div className="flex justify-center py-16 text-brand"><Spinner className="h-8 w-8" /></div>
      ) : !orders.length ? (
        <div className="card mx-auto flex max-w-md flex-col items-center p-10 text-center">
          <FiPackage className="h-10 w-10 text-ink-muted" aria-hidden="true" />
          <p className="m-0 mt-3 text-lg font-semibold">No orders yet</p>
          <Link to="/shop" className="mt-5 inline-flex h-11 items-center rounded-xl bg-brand px-5 font-semibold text-white no-underline">Go to the shop</Link>
        </div>
      ) : (
        <ul className="m-0 list-none space-y-3 p-0">
          {orders.map((o) => {
            const st = ORDER_STATUS[o.status];
            const isOpen = open === o.id;
            const step = STEPS.indexOf(o.status);
            return (
              <li key={o.id} className="card overflow-hidden">
                <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : o.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{o.orderNumber}</span>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </span>
                    <span className="mt-0.5 block text-sm text-ink-muted">{dateTime(o.createdAt)} · {o.items.reduce((a, i) => a + i.qty, 0)} item(s)</span>
                  </span>
                  <span className="text-right">
                    <span className="block font-semibold tabular-nums">{ugx(o.total)}</span>
                    <span className="block text-xs text-ink-muted">{o.paid ? "Paid" : PAY[o.paymentMethod]}</span>
                  </span>
                  <FiChevronDown aria-hidden="true" className={cx("flex-none text-ink-muted transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="border-t border-line px-4 py-4">
                    {o.status !== "CANCELLED" && o.status !== "AWAITING_PAYMENT" && (
                      <ol className="m-0 mb-4 flex list-none gap-1 p-0" aria-label="Progress">
                        {STEPS.map((s, i) => (
                          <li key={s} className="flex-1">
                            <div className={cx("h-1.5 rounded-full", i <= step ? "bg-brand" : "bg-line")} />
                            <span className={cx("mt-1 block text-[11px]", i <= step ? "font-semibold text-brand-text" : "text-ink-muted")}>{ORDER_STATUS[s].label}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                    {o.statusNote && <p className="m-0 mb-3 text-sm text-ink-muted">Note: {o.statusNote}</p>}
                    <ul className="m-0 list-none space-y-1.5 p-0 text-sm">
                      {o.items.map((i) => (
                        <li key={i.id} className="flex justify-between gap-3"><span>{i.qty} × {i.name}</span><span className="tabular-nums">{ugx(i.lineTotal)}</span></li>
                      ))}
                      {o.discountAmount > 0 && <li className="flex justify-between text-good"><span>Club discount ({o.discountPercent}%)</span><span className="tabular-nums">−{ugx(o.discountAmount)}</span></li>}
                      <li className="flex justify-between border-t border-line pt-1.5 font-semibold"><span>Total</span><span className="tabular-nums">{ugx(o.total)}</span></li>
                    </ul>
                    <p className="m-0 mt-3 text-sm text-ink-muted">Deliver to {o.recipientName}, {fmtPhone(o.deliveryPhone)} · {o.deliveryAddress}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {o.status === "AWAITING_PAYMENT" && !o.paid && <Button size="sm" onClick={() => { setPayFor(o); setPhone(""); poll.reset(); }}>Pay now</Button>}
                      {["AWAITING_PAYMENT", "PLACED"].includes(o.status) && !o.paid && <Button size="sm" variant="secondary" onClick={() => setCancel(o)}>Cancel order</Button>}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={!!cancel} onClose={() => !busy && setCancel(null)} title="Cancel this order?" footer={<><Button variant="secondary" className="flex-1" onClick={() => setCancel(null)} disabled={busy}>Keep it</Button><Button variant="danger" className="flex-1" onClick={doCancel} loading={busy}>Cancel order</Button></>}>
        <p className="m-0 text-ink-muted">Order {cancel?.orderNumber} for {cancel ? ugx(cancel.total) : ""} will be cancelled.</p>
      </Modal>

      <Modal
        open={!!payFor}
        onClose={() => !busy && (setPayFor(null), poll.reset())}
        title={`Pay order ${payFor?.orderNumber ?? ""}`}
        footer={
          paying ? (
            <Button className="flex-1" onClick={() => { setPayFor(null); poll.reset(); }}>Close</Button>
          ) : (
            <><Button variant="secondary" className="flex-1" onClick={() => setPayFor(null)} disabled={busy}>Cancel</Button><Button className="flex-1" onClick={doPay} loading={busy}>Send payment request</Button></>
          )
        }
      >
        {paying ? (
          poll.payment!.status === "SUCCESSFUL" ? <Alert tone="success" title="Paid">Thank you! Your order is now placed.</Alert>
          : poll.payment!.status === "FAILED" ? <Alert tone="error" title="Payment failed">{poll.payment!.failureNote ?? "It was declined or cancelled. Nothing was charged."}</Alert>
          : <div className="flex items-center gap-3" role="status"><Spinner className="h-5 w-5 text-brand" /><p className="m-0">Approve {ugx(poll.payment!.totalCharged)} on your phone with your PIN…</p></div>
        ) : (
          <TextInput label="Mobile money number" type="tel" inputMode="tel" value={phone} onChange={setPhone} placeholder="0772 123456" hint="Leave empty to use your main number." />
        )}
      </Modal>
    </AppShell>
  );
};

export default Orders;
