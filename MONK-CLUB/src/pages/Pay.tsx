import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FiCheckCircle, FiSmartphone } from "react-icons/fi";
import AppShell from "../components/AppShell";
import { Alert, Button, Spinner, TextInput } from "../components/ui";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { dateTime, phone as fmtPhone, ugx } from "../lib/format";
import type { Payment } from "../lib/types";
import { normalisePhone } from "../lib/validate";

const POLL_MS = 4000;
const GIVE_UP_MS = 3 * 60_000;

/** Pay the registration fee by mobile money (MarzPay) to activate the account. */
const Pay = () => {
  const { member, refresh } = useAuth();
  const nav = useNavigate();
  const [phoneNo, setPhone] = useState(member ? fmtPhone(member.phone1) : "");
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Payment[]>([]);
  const started = useRef(0);
  const c = member?.registrationCharge;

  // The sign-in response doesn't include the fee breakdown; load the full account once.
  useEffect(() => {
    if (member && !member.registrationCharge) void refresh();
  }, [member, refresh]);

  useEffect(() => {
    api<Payment[]>("/api/club/me/payments").then(setHistory).catch(() => undefined);
  }, [payment?.status]);

  const poll = useCallback(async (id: number) => {
    try {
      // The API answers { payment, memberStatus }.
      const r = await api<{ payment: Payment; memberStatus: string }>(`/api/club/me/payments/${id}`);
      const p = r.payment;
      setPayment(p);
      if (p.status === "SUCCESSFUL") {
        await refresh();
        return;
      }
      if (p.status === "FAILED") return;
    } catch {
      /* keep trying */
    }
    if (Date.now() - started.current < GIVE_UP_MS) setTimeout(() => void poll(id), POLL_MS);
    else setError("We haven't heard back from your mobile money provider yet. If money left your account, it will show here shortly. You can also refresh this page later.");
  }, [refresh]);

  const start = async (e: FormEvent) => {
    e.preventDefault();
    const p = normalisePhone(phoneNo);
    if (!p) return setError("Enter the MTN or Airtel number that will pay, e.g. 0772 123456");
    setBusy(true);
    setError(null);
    try {
      const pay = await api<Payment>("/api/club/me/payments/registration", { body: { phone: p } });
      setPayment(pay);
      started.current = Date.now();
      setTimeout(() => void poll(pay.id), POLL_MS);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start the payment");
    } finally {
      setBusy(false);
    }
  };

  if (!member) return null;
  if (member.status === "ACTIVE" && payment?.status !== "SUCCESSFUL") {
    return (
      <AppShell title="Registration fee">
        <Alert tone="success" title="Your membership is active">The registration fee has been paid.</Alert>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-lg">
        {payment?.status === "SUCCESSFUL" ? (
          <div className="card p-6 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-good dark:bg-green-950"><FiCheckCircle className="h-8 w-8" aria-hidden="true" /></span>
            <h1 className="m-0 mt-4 font-display text-2xl font-semibold">Payment received</h1>
            <p className="m-0 mt-2 text-ink-muted">Welcome to Amatugunda Monk Club! Your membership is now active.</p>
            <Button size="lg" block className="mt-6" onClick={() => nav("/", { replace: true })}>See my membership card</Button>
          </div>
        ) : (
          <>
            <h1 className="m-0 font-display text-2xl font-semibold sm:text-3xl">Activate your membership</h1>
            <p className="m-0 mt-2 text-ink-muted">Your application was approved. Pay the one-time registration fee by mobile money to activate your account.</p>

            {c && (
              <dl className="card mt-6 divide-y divide-line">
                {[
                  ["Registration fee", ugx(c.base)],
                  // Mobile money (3%) and service charges are shown as one line.
                  ["Service charge", ugx(c.marzFee + c.serviceFee)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between px-4 py-3 text-[15px]"><dt className="text-ink-muted">{k}</dt><dd className="m-0 tabular-nums">{v}</dd></div>
                ))}
                <div className="flex justify-between px-4 py-3.5 text-lg font-semibold"><dt>Total to pay</dt><dd className="m-0 tabular-nums">{ugx(c.total)}</dd></div>
              </dl>
            )}

            {payment?.status === "PENDING" ? (
              <div className="card mt-5 flex flex-col items-center p-6 text-center" role="status" aria-live="polite">
                <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-subtle text-brand-text">
                  <FiSmartphone className="h-7 w-7" aria-hidden="true" />
                  <Spinner className="absolute -right-1 -top-1 h-6 w-6 text-brand" />
                </span>
                <h2 className="m-0 mt-4 font-display text-xl font-semibold">Check your phone</h2>
                <p className="m-0 mt-2 text-ink-muted">A payment request for <strong className="text-ink">{ugx(payment.totalCharged)}</strong> was sent to <strong className="text-ink">{fmtPhone(payment.phone)}</strong>. Enter your mobile money PIN to approve it.</p>
                <p className="m-0 mt-3 text-sm text-ink-muted">This page updates by itself.</p>
                {error && <div className="mt-4 w-full text-left"><Alert tone="warning">{error}</Alert></div>}
              </div>
            ) : (
              <form onSubmit={start} noValidate className="mt-5 space-y-4">
                {payment?.status === "FAILED" && <Alert tone="error" title="The payment didn't go through">{payment.failureNote || "It was cancelled or declined. You haven't been charged. Try again."}</Alert>}
                {error && <Alert tone="error">{error}</Alert>}
                <TextInput label="Mobile money number" required type="tel" inputMode="tel" value={phoneNo} onChange={setPhone} hint="MTN or Airtel. It can be a different number from your account." />
                <Button type="submit" size="lg" block loading={busy}>Pay {c ? ugx(c.total) : ""}</Button>
              </form>
            )}

            {history.length > 0 && (
              <section className="mt-8">
                <h2 className="m-0 mb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">Earlier attempts</h2>
                <ul className="card m-0 list-none divide-y divide-line p-0">
                  {history.map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <span>{dateTime(h.createdAt)} · {fmtPhone(h.phone)}</span>
                      <span className={h.status === "SUCCESSFUL" ? "font-semibold text-good" : h.status === "FAILED" ? "text-bad" : "text-ink-muted"}>{h.status === "SUCCESSFUL" ? "Paid" : h.status === "FAILED" ? "Failed" : "Waiting"}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
};

export default Pay;
