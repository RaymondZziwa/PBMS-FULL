import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { Alert, Badge, Spinner } from "../components/ui";
import { api } from "../lib/api";
import { qty } from "../lib/format";
import type { Tracker as T, TrackerStatus } from "../lib/types";

export const STATUS: Record<TrackerStatus, { label: string; tone: "good" | "bad" | "neutral" }> = {
  ACTIVE: { label: "Active", tone: "good" },
  DEFECTIVE: { label: "Defective", tone: "bad" },
  DEFAULT: { label: "Default", tone: "neutral" },
};

/** Read-only view of the member's yearly performance tracker (filled in by Prof Bioresearch). */
const Tracker = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api<T>(`/api/club/me/tracker?year=${year}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [year]);

  const years = data?.years?.length ? data.years : [year];

  return (
    <AppShell title="Performance tracker">
      <p className="-mt-3 mb-5 text-ink-muted">What you supplied each month, lot by lot. Prof Bioresearch records it; a month is <strong className="text-good">active</strong> when most lots have deliveries and <strong className="text-bad">defective</strong> when many are missing.</p>

      <div role="tablist" aria-label="Year" className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {years.map((y) => (
          <button key={y} role="tab" aria-selected={y === year} type="button" onClick={() => setYear(y)} className={`h-10 flex-none rounded-full px-4 text-sm font-semibold ${y === year ? "bg-brand text-white" : "border border-line bg-surface text-ink-muted"}`}>
            {y}
          </button>
        ))}
      </div>

      {error ? (
        <Alert tone="error">{error}</Alert>
      ) : loading && !data ? (
        <div className="flex justify-center py-16 text-brand"><Spinner className="h-8 w-8" /></div>
      ) : data ? (
        <div className={loading ? "opacity-60" : ""}>
          <div className="mb-5 grid grid-cols-3 gap-3">
            {[
              ["Active months", data.summary.active, "text-good"],
              ["Defective", data.summary.defective, "text-bad"],
              ["Total quantity", qty(data.summary.totalQuantity), "text-ink"],
            ].map(([k, v, c]) => (
              <div key={k as string} className="card p-3 sm:p-4">
                <p className="m-0 text-xs text-ink-muted sm:text-sm">{k}</p>
                <p className={`m-0 mt-1 font-display text-xl font-semibold tabular-nums sm:text-2xl ${c}`}>{v}</p>
              </div>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">Tracker for {data.year}</caption>
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-left text-xs uppercase tracking-wide text-ink-muted">
                    <th scope="col" className="sticky left-0 z-10 bg-surface-2 px-3 py-3 font-semibold">Month</th>
                    {Array.from({ length: data.lots }, (_, i) => (
                      <th key={i} scope="col" className="min-w-[92px] px-3 py-3 text-right font-semibold">Lot {i + 1}</th>
                    ))}
                    <th scope="col" className="px-3 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.months.map((m) => (
                    <tr key={m.month} className="border-b border-line last:border-0">
                      <th scope="row" className="sticky left-0 z-10 bg-surface px-3 py-2.5 text-left font-medium">{m.name.slice(0, 3)}<span className="hidden sm:inline">{m.name.slice(3)}</span></th>
                      {m.cells.map((c) => (
                        <td key={c.lot} className="px-3 py-2.5 text-right align-top">
                          {c.quantity != null ? (
                            <>
                              <span className="block font-medium tabular-nums">{qty(c.quantity)}</span>
                              {c.receiptNo && <span className="block text-[11px] text-ink-muted">#{c.receiptNo}</span>}
                            </>
                          ) : (
                            <span className="text-ink-muted/60">—</span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2.5"><Badge tone={STATUS[m.status].tone}>{STATUS[m.status].label}</Badge></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-line bg-surface-2 font-semibold">
                    <th scope="row" className="sticky left-0 bg-surface-2 px-3 py-2.5 text-left">Total</th>
                    {data.totals.map((t, i) => <td key={i} className="px-3 py-2.5 text-right tabular-nums">{qty(t) || "0"}</td>)}
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
};

export default Tracker;
