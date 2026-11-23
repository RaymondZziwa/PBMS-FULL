import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import type { Payment } from "./types";

/** Follows a mobile money payment until it succeeds, fails or we stop waiting (3 min). */
export const usePaymentPoll = (onSuccess?: () => void) => {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const started = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const done = useRef(onSuccess);
  done.current = onSuccess;

  const poll = useCallback(async (id: number) => {
    try {
      const r = await api<{ payment: Payment }>(`/api/club/me/payments/${id}`);
      setPayment(r.payment);
      if (r.payment.status === "SUCCESSFUL") return done.current?.();
      if (r.payment.status === "FAILED") return;
    } catch {
      /* keep trying */
    }
    if (Date.now() - started.current < 180_000) timer.current = window.setTimeout(() => void poll(id), 4000);
    else setTimedOut(true);
  }, []);

  const follow = useCallback((p: Payment) => {
    setPayment(p);
    setTimedOut(false);
    started.current = Date.now();
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void poll(p.id), 4000);
  }, [poll]);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { payment, follow, timedOut, reset: () => setPayment(null) };
};

/** Mobile money adds a service charge: percent of the amount (rounded up) plus a fixed fee. */
export const serviceCharge = (amount: number, c: { percent: number; fixed: number }) => Math.ceil((amount * c.percent) / 100) + c.fixed;
