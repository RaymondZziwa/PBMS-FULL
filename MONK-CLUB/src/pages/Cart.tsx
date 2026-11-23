import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiCheckCircle, FiCreditCard, FiDollarSign, FiMapPin, FiShoppingCart, FiSmartphone, FiTrash2, FiTruck } from "react-icons/fi";
import AppShell from "../components/AppShell";
import Qty from "../components/Qty";
import { Alert, Button, Modal, Spinner, TextArea, TextInput, cx } from "../components/ui";
import { api, ApiError } from "../lib/api";
import { useCart } from "../lib/cart";
import { phone as fmtPhone, ugx } from "../lib/format";
import type { Order, Payment, PaymentMethod, Shop } from "../lib/types";
import { serviceCharge, usePaymentPoll } from "../lib/usePaymentPoll";
import { normalisePhone } from "../lib/validate";

const METHODS: Array<{ value: PaymentMethod; title: string; text: string; icon: typeof FiSmartphone }> = [
  { value: "MOBILE_MONEY", title: "Mobile money", text: "Pay now with MTN or Airtel", icon: FiSmartphone },
  { value: "ON_DELIVERY", title: "Pay on delivery", text: "Pay when your order arrives", icon: FiTruck },
  { value: "CASH", title: "Cash", text: "Pay in cash at collection", icon: FiDollarSign },
];

/** Cart and checkout: delivery address, payment method, place the order. */
const Cart = () => {
  const cart = useCart();
  const nav = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [useDefault, setUseDefault] = useState(true);
  const [addr, setAddr] = useState({ recipientName: "", deliveryPhone: "", deliveryAddress: "" });
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [payPhone, setPayPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState<Order | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const poll = usePaymentPoll();

  useEffect(() => {
    api<Shop>("/api/club/me/shop")
      .then((s) => {
        setShop(s);
        setPayPhone(fmtPhone(s.defaultAddress.phone));
        if (!s.defaultAddress.address) setUseDefault(false);
        // Refresh prices in the cart (they may have changed since it was filled).
        s.items.forEach((i) => cart.qtyOf(i.id) && cart.add(i, 0));
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subtotal = cart.lines.reduce((a, l) => a + l.price * l.qty, 0);
  const total = cart.lines.reduce((a, l) => a + l.clubPrice * l.qty, 0);
  const discount = subtotal - total;
  const charge = method === "MOBILE_MONEY" && shop ? serviceCharge(total, shop.mobileMoneyCharge) : 0;

  const check = () => {
    const e: Record<string, string> = {};
    if (!useDefault) {
      if (!addr.recipientName.trim()) e.recipientName = "Who should receive the order?";
      if (!normalisePhone(addr.deliveryPhone)) e.deliveryPhone = "Enter a valid phone number";
      if (addr.deliveryAddress.trim().length < 5) e.deliveryAddress = "Enter the delivery address";
    }
    if (!method) e.method = "Choose how you will pay";
    if (method === "MOBILE_MONEY" && !normalisePhone(payPhone)?.startsWith("+256")) e.payPhone = "Enter an MTN or Airtel Uganda number";
    setErrors(e);
    if (!Object.keys(e).length) setConfirming(true);
  };

  const place = async () => {
    setBusy(true);
    setPayError(null);
    try {
      const r = await api<{ order: Order; payment: Payment | null; paymentError?: string }>("/api/club/me/orders", {
        body: {
          items: cart.lines.map((l) => ({ itemId: l.id, qty: l.qty })),
          paymentMethod: method,
          useDefaultAddress: useDefault,
          ...(useDefault ? {} : addr),
          notes,
          payPhone: method === "MOBILE_MONEY" ? payPhone : undefined,
        },
      });
      cart.clear();
      setConfirming(false);
      setPlaced(r.order);
      if (r.payment) poll.follow(r.payment);
      if (r.paymentError) setPayError(r.paymentError);
    } catch (err) {
      setConfirming(false);
      if (err instanceof ApiError && err.field) setErrors({ [err.field === "items" ? "form" : err.field]: err.message });
      else setErrors({ form: err instanceof Error ? err.message : "Couldn't place the order" });
    } finally {
      setBusy(false);
    }
  };

  // ---------- after placing
  if (placed) {
    const momo = placed.paymentMethod === "MOBILE_MONEY";
    const paid = poll.payment?.status === "SUCCESSFUL";
    const failed = poll.payment?.status === "FAILED";
    return (
      <AppShell>
        <div className="mx-auto max-w-md">
          {momo && !paid && !failed && !payError ? (
            <div className="card flex flex-col items-center p-6 text-center" role="status" aria-live="polite">
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-subtle text-brand-text">
                <FiSmartphone className="h-7 w-7" aria-hidden="true" />
                <Spinner className="absolute -right-1 -top-1 h-6 w-6 text-brand" />
              </span>
              <h1 className="m-0 mt-4 font-display text-xl font-semibold">Check your phone</h1>
              <p className="m-0 mt-2 text-ink-muted">Approve the payment of <strong className="text-ink">{ugx(poll.payment?.totalCharged ?? placed.total)}</strong> with your mobile money PIN.</p>
              {poll.timedOut && <div className="mt-4 w-full text-left"><Alert tone="warning">No answer yet. If money left your account, the order will update shortly in My orders.</Alert></div>}
            </div>
          ) : (
            <div className="card p-6 text-center">
              <span className={cx("mx-auto flex h-16 w-16 items-center justify-center rounded-full", failed || payError ? "bg-amber-100 text-amber-700 dark:bg-amber-950" : "bg-green-100 text-good dark:bg-green-950")}>
                <FiCheckCircle className="h-8 w-8" aria-hidden="true" />
              </span>
              <h1 className="m-0 mt-4 font-display text-2xl font-semibold">{failed || payError ? "Order saved, not paid yet" : "Order placed"}</h1>
              <p className="m-0 mt-2 text-ink-muted">Order <strong className="font-mono text-ink">{placed.orderNumber}</strong> · {ugx(placed.total)}</p>
              <p className="m-0 mt-2 text-sm text-ink-muted">
                {failed || payError
                  ? payError ?? "The mobile money payment didn't go through. You can try again from My orders."
                  : momo
                    ? "Payment received. We'll let you know when it's on its way."
                    : placed.paymentMethod === "CASH"
                      ? "Pay in cash when you collect or receive it. We'll keep you posted."
                      : "Pay when it's delivered. We'll keep you posted."}
              </p>
              <div className="mt-6 grid gap-2">
                <Button size="lg" block onClick={() => nav("/orders")}>See my orders</Button>
                <Button variant="ghost" block onClick={() => nav("/shop")}>Keep shopping</Button>
              </div>
            </div>
          )}
        </div>
      </AppShell>
    );
  }

  // ---------- empty
  if (!cart.lines.length) {
    return (
      <AppShell title="Cart">
        <div className="card mx-auto flex max-w-md flex-col items-center p-10 text-center">
          <FiShoppingCart className="h-10 w-10 text-ink-muted" aria-hidden="true" />
          <p className="m-0 mt-3 text-lg font-semibold">Your cart is empty</p>
          <Link to="/shop" className="mt-5 inline-flex h-11 items-center rounded-xl bg-brand px-5 font-semibold text-white no-underline">Go to the shop</Link>
        </div>
      </AppShell>
    );
  }

  const def = shop?.defaultAddress;
  return (
    <AppShell title="Checkout">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-5">
          {errors.form && <Alert tone="error">{errors.form}</Alert>}

          <section className="card">
            <h2 className="m-0 border-b border-line px-4 py-3 text-base font-semibold">Items ({cart.count})</h2>
            <ul className="m-0 list-none divide-y divide-line p-0">
              {cart.lines.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="m-0 font-medium">{l.name}</p>
                    <p className="m-0 text-sm text-ink-muted">
                      {ugx(l.clubPrice)} each{l.clubPrice < l.price && <span className="ml-1.5 line-through">{ugx(l.price)}</span>}
                    </p>
                  </div>
                  <Qty value={l.qty} onChange={(n) => cart.setQty(l.id, n)} label={l.name} size="sm" />
                  <span className="w-28 text-right font-semibold tabular-nums">{ugx(l.clubPrice * l.qty)}</span>
                  <button type="button" onClick={() => cart.remove(l.id)} aria-label={`Remove ${l.name}`} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-bad"><FiTrash2 aria-hidden="true" /></button>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-4">
            <h2 className="m-0 mb-3 flex items-center gap-2 text-base font-semibold"><FiMapPin aria-hidden="true" className="text-brand-text" /> Delivery</h2>
            <div role="radiogroup" aria-label="Delivery address" className="space-y-2">
              {def?.address && (
                <button type="button" role="radio" aria-checked={useDefault} onClick={() => setUseDefault(true)} className={cx("flex w-full items-start gap-3 rounded-xl border p-3 text-left", useDefault ? "border-brand bg-subtle" : "border-line")}>
                  <span className={cx("mt-1 h-4 w-4 flex-none rounded-full border-2", useDefault ? "border-brand bg-brand shadow-[inset_0_0_0_2px_white]" : "border-line")} aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block font-semibold">My address <span className="ml-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand-text">Default</span></span>
                    <span className="block text-sm text-ink-muted">{def.recipientName} · {fmtPhone(def.phone)}</span>
                    <span className="block text-sm text-ink-muted">{def.address}</span>
                  </span>
                </button>
              )}
              <button type="button" role="radio" aria-checked={!useDefault} onClick={() => setUseDefault(false)} className={cx("flex w-full items-start gap-3 rounded-xl border p-3 text-left", !useDefault ? "border-brand bg-subtle" : "border-line")}>
                <span className={cx("mt-1 h-4 w-4 flex-none rounded-full border-2", !useDefault ? "border-brand bg-brand shadow-[inset_0_0_0_2px_white]" : "border-line")} aria-hidden="true" />
                <span className="block font-semibold">Deliver somewhere else</span>
              </button>
            </div>
            {!useDefault && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <TextInput label="Receiver's name" required value={addr.recipientName} onChange={(v) => setAddr({ ...addr, recipientName: v })} error={errors.recipientName} />
                <TextInput label="Receiver's phone" required type="tel" inputMode="tel" value={addr.deliveryPhone} onChange={(v) => setAddr({ ...addr, deliveryPhone: v })} error={errors.deliveryPhone} placeholder="0772 123456" />
                <div className="sm:col-span-2">
                  <TextArea label="Delivery address" required value={addr.deliveryAddress} onChange={(v) => setAddr({ ...addr, deliveryAddress: v })} error={errors.deliveryAddress} placeholder="Town, area, street and a landmark" />
                </div>
              </div>
            )}
          </section>

          <section className="card p-4">
            <h2 className="m-0 mb-3 flex items-center gap-2 text-base font-semibold"><FiCreditCard aria-hidden="true" className="text-brand-text" /> Payment</h2>
            <div role="radiogroup" aria-label="Payment method" className="grid gap-2 sm:grid-cols-3">
              {METHODS.map((m) => (
                <button key={m.value} type="button" role="radio" aria-checked={method === m.value} onClick={() => { setMethod(m.value); setErrors((e) => ({ ...e, method: "" })); }} className={cx("flex items-start gap-3 rounded-xl border p-3 text-left sm:flex-col sm:gap-2", method === m.value ? "border-brand bg-subtle" : "border-line hover:border-brand/40")}>
                  <m.icon className="mt-0.5 h-5 w-5 flex-none text-brand-text" aria-hidden="true" />
                  <span>
                    <span className="block font-semibold">{m.title}</span>
                    <span className="block text-sm text-ink-muted">{m.text}</span>
                  </span>
                </button>
              ))}
            </div>
            {errors.method && <p role="alert" className="m-0 mt-2 text-[13px] text-bad">{errors.method}</p>}
            {method === "MOBILE_MONEY" && (
              <div className="mt-4">
                <TextInput label="Mobile money number" required type="tel" inputMode="tel" value={payPhone} onChange={setPayPhone} error={errors.payPhone} hint="You'll get a prompt on this phone to approve the payment." />
              </div>
            )}
            <div className="mt-4">
              <TextArea label="Note for us" value={notes} onChange={setNotes} rows={2} placeholder="e.g. call me when you arrive" />
            </div>
          </section>
        </div>

        <aside className="card p-4 lg:sticky lg:top-20">
          <h2 className="m-0 mb-3 text-base font-semibold">Summary</h2>
          <dl className="m-0 space-y-2 text-[15px]">
            <div className="flex justify-between"><dt className="text-ink-muted">Items</dt><dd className="m-0 tabular-nums">{ugx(subtotal)}</dd></div>
            {discount > 0 && <div className="flex justify-between text-good"><dt>Club discount ({shop?.discountPercent ?? 0}%)</dt><dd className="m-0 tabular-nums">−{ugx(discount)}</dd></div>}
            {charge > 0 && <div className="flex justify-between"><dt className="text-ink-muted">Service charge</dt><dd className="m-0 tabular-nums">{ugx(charge)}</dd></div>}
            <div className="flex justify-between border-t border-line pt-3 text-lg font-semibold"><dt>Total</dt><dd className="m-0 tabular-nums">{ugx(total + charge)}</dd></div>
          </dl>
          <Button size="lg" block className="mt-4" onClick={check}>Place order</Button>
          <Link to="/shop" className="mt-3 block text-center text-sm font-medium text-brand-text no-underline">Add more items</Link>
        </aside>
      </div>

      <Modal
        open={confirming}
        onClose={() => !busy && setConfirming(false)}
        title="Place this order?"
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setConfirming(false)} disabled={busy}>Back</Button>
            <Button className="flex-1" onClick={place} loading={busy}>{method === "MOBILE_MONEY" ? `Pay ${ugx(total + charge)}` : "Place order"}</Button>
          </>
        }
      >
        <dl className="m-0 space-y-2 text-[15px]">
          <div><dt className="text-xs uppercase tracking-wide text-ink-muted">Items</dt><dd className="m-0">{cart.count} item(s) · {ugx(total)}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-ink-muted">Deliver to</dt><dd className="m-0">{useDefault ? `${def?.recipientName}, ${def?.address}` : `${addr.recipientName}, ${addr.deliveryAddress}`}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-ink-muted">Payment</dt><dd className="m-0">{METHODS.find((m) => m.value === method)?.title}{method === "MOBILE_MONEY" ? ` · ${payPhone}` : ""}</dd></div>
        </dl>
      </Modal>
    </AppShell>
  );
};

export default Cart;
