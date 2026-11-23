import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import axios from "axios";
import { FiAlertTriangle, FiArrowDownRight, FiArrowUpRight, FiMinus, FiRefreshCw } from "react-icons/fi";

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

const compactFmt = new Intl.NumberFormat("en-UG", { notation: "compact", maximumFractionDigits: 1 });
const fullFmt = new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 });

/** 1,284 · 12.9K · 4.2M — full figure under 10,000. */
export const compact = (n: number) => (Math.abs(n) < 10000 ? fullFmt.format(n) : compactFmt.format(n));
export const full = (n: number) => fullFmt.format(n);
export const ugx = (n: number) => `UGX ${full(n)}`;

export const timeAgo = (iso: string | Date) => {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

export const todayLabel = () =>
  new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/* ------------------------------------------------------------------ */
/* Data loading                                                        */
/* ------------------------------------------------------------------ */

const errorText = (e: unknown) => {
  if (axios.isAxiosError(e)) {
    const status = e.response?.status;
    const msg = (e.response?.data as { message?: unknown } | undefined)?.message;
    if (status === 403) return typeof msg === "string" ? msg : "You don't have access to this dashboard.";
    if (typeof msg === "string") return msg;
    if (!e.response) return "We can't reach the server. Check your connection.";
  }
  return "Something went wrong while loading the dashboard.";
};

/**
 * Loads data, then refreshes every `intervalMs` while the tab is visible.
 * Never runs two requests at once, and stops auto-refreshing after an error
 * (so a server problem doesn't repeat error pop-ups every minute).
 */
export function usePolledData<T>(load: () => Promise<T>, intervalMs: number, key: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const inFlight = useRef(false);
  const failed = useRef(false);
  const loadRef = useRef(load);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  const run = useCallback(async (manual: boolean) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (manual) setRefreshing(true);
    try {
      const result = await loadRef.current();
      setData(result);
      setError(null);
      setUpdatedAt(new Date());
      failed.current = false;
    } catch (e) {
      setError(errorText(e));
      failed.current = true;
    } finally {
      inFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // First load, and again whenever the key (e.g. date range, store) changes.
  useEffect(() => {
    setRefreshing(true);
    void run(true);
  }, [key, run]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible" && !failed.current) void run(false);
    };
    const timer = window.setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [intervalMs, run]);

  return { data, error, loading, refreshing, updatedAt, refresh: () => run(true) };
}

/* ------------------------------------------------------------------ */
/* Layout pieces                                                       */
/* ------------------------------------------------------------------ */

export const DashboardHeader = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: ReactNode;
  children?: ReactNode;
}) => (
  <div className="mb-5 flex flex-col gap-4 sm:mb-6 md:flex-row md:items-end md:justify-between">
    <div className="min-w-0">
      <h1 className="m-0 font-display text-2xl font-semibold text-brand-ink sm:text-[28px]">{title}</h1>
      <p className="m-0 mt-1 text-sm text-brand-muted">{subtitle}</p>
    </div>
    {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
  </div>
);

export const RefreshButton = ({
  onClick,
  refreshing,
  updatedAt,
}: {
  onClick: () => void;
  refreshing: boolean;
  updatedAt: Date | null;
}) => (
  <div className="flex items-center gap-2">
    {updatedAt && (
      <span className="hidden text-xs text-brand-muted sm:inline" aria-live="polite">
        Updated {updatedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
      </span>
    )}
    <button
      type="button"
      onClick={onClick}
      disabled={refreshing}
      className="flex h-10 items-center gap-2 rounded-lg border border-[#DDE1EA] bg-white px-3.5 text-sm font-medium text-[#2B3240] hover:bg-[#F3F5FA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-60"
    >
      <FiRefreshCw aria-hidden="true" className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
      {refreshing ? "Refreshing…" : "Refresh"}
    </button>
  </div>
);

export const Segmented = <V extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: V;
  options: { value: V; label: string }[];
  onChange: (v: V) => void;
}) => (
  <div role="group" aria-label={label} className="flex h-10 items-center rounded-lg border border-[#DDE1EA] bg-white p-1">
    {options.map((o) => {
      const active = o.value === value;
      return (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={active}
          onClick={() => onChange(o.value)}
          className={`h-8 rounded-md px-3 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
            active ? "bg-brand font-semibold text-white" : "font-medium text-brand-muted hover:text-brand-ink"
          }`}
        >
          {o.label}
        </button>
      );
    })}
  </div>
);

export const Panel = ({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <section className={`flex min-w-0 flex-col rounded-2xl border border-[#E6E9F0] bg-white p-4 sm:p-5 ${className}`}>
    <header className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="m-0 text-[15px] font-semibold text-brand-ink">{title}</h2>
        {subtitle && <p className="m-0 mt-0.5 text-xs text-brand-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
    <div className="min-w-0 flex-1">{children}</div>
  </section>
);

export const EmptyState = ({ children }: { children: ReactNode }) => (
  <div className="flex h-full min-h-[120px] items-center justify-center rounded-xl bg-[#F7F8FB] px-4 py-6 text-center text-sm text-brand-muted">
    {children}
  </div>
);

export const ErrorBanner = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div role="alert" className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-[#F3C9C2] bg-[#FDF0EE] px-4 py-3 text-sm text-[#8A2A1C]">
    <FiAlertTriangle aria-hidden="true" className="h-[18px] w-[18px] flex-none" />
    <span className="min-w-0 flex-1">{message}</span>
    <button type="button" onClick={onRetry} className="min-h-9 rounded-md px-2 font-semibold underline hover:no-underline">
      Try again
    </button>
  </div>
);

export const Skeleton = ({ className = "" }: { className?: string }) => (
  <div aria-hidden="true" className={`animate-pulse rounded-lg bg-[#EDEFF4] ${className}`} />
);

/* ------------------------------------------------------------------ */
/* Figures                                                             */
/* ------------------------------------------------------------------ */

/** Signed change vs a named period. Colour = direction × whether up is good. */
export const ChangeBadge = ({ change, upIsGood = true, period }: { change: number | null | undefined; upIsGood?: boolean; period: string }) => {
  if (change === undefined) return null;
  if (change === null) return <span className="text-xs text-brand-muted">No data for {period} to compare</span>;
  const flat = Math.abs(change) < 0.05;
  const good = flat ? null : change > 0 === upIsGood;
  const Icon = flat ? FiMinus : change > 0 ? FiArrowUpRight : FiArrowDownRight;
  const tone = good === null ? "bg-[#EEF0F5] text-[#4A5263]" : good ? "bg-[#E6F3EC] text-[#1F6B44]" : "bg-[#FDECEA] text-[#A32A1A]";
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-xs text-brand-muted">
      <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold ${tone}`}>
        <Icon aria-hidden="true" className="h-3.5 w-3.5" />
        {flat ? "0%" : `${change > 0 ? "+" : ""}${change}%`}
      </span>
      vs {period}
    </span>
  );
};

export const StatTile = ({
  label,
  value,
  title,
  icon,
  footer,
  loading,
}: {
  label: string;
  value: string;
  title?: string;
  icon: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
}) => (
  <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-[#E6E9F0] bg-white p-4 sm:p-5">
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] font-medium text-brand-muted">{label}</span>
      <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-[#EEF2FA] text-brand">
        {icon}
      </span>
    </div>
    {loading ? (
      <Skeleton className="h-8 w-32" />
    ) : (
      <span title={title} className="truncate font-display text-[26px] font-semibold leading-none tracking-[-0.01em] text-brand-ink">
        {value}
      </span>
    )}
    <div className="min-h-5">{loading ? <Skeleton className="h-4 w-24" /> : footer}</div>
  </div>
);

/** Ranked horizontal bars with the value at the tip (one series, one hue). */
export const BarList = ({
  rows,
  format,
  unit,
  emptyText,
}: {
  rows: { key: string | number; label: string; value: number; hint?: string }[];
  format: (n: number) => string;
  unit?: string;
  emptyText: string;
}) => {
  if (rows.length === 0) return <EmptyState>{emptyText}</EmptyState>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ol className="m-0 flex list-none flex-col gap-3.5 p-0">
      {rows.map((r, i) => (
        <li key={r.key} className="min-w-0" title={`${r.label}: ${full(r.value)}${unit ? ` ${unit}` : ""}`}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="w-4 flex-none text-xs font-semibold tabular-nums text-[#8A93A6]">{i + 1}</span>
              <span className="truncate text-brand-ink">{r.label}</span>
            </span>
            <span className="flex-none font-semibold tabular-nums text-brand-ink">
              {format(r.value)}
              {unit && <span className="ml-1 text-xs font-normal text-brand-muted">{unit}</span>}
            </span>
          </div>
          <div className="ml-6 h-2 rounded-full bg-[#EEF1F7]">
            <div className="h-2 rounded-full bg-brand" style={{ width: `${Math.max((r.value / max) * 100, 2)}%` }} />
          </div>
          {r.hint && <p className="m-0 ml-6 mt-1 text-xs text-brand-muted">{r.hint}</p>}
        </li>
      ))}
    </ol>
  );
};

/* ------------------------------------------------------------------ */
/* Status badges (always text + colour, never colour alone)            */
/* ------------------------------------------------------------------ */

const badge = "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold";

export const PaymentBadge = ({ status, saleStatus }: { status: string; saleStatus?: string }) => {
  if (saleStatus === "PENDING") return <span className={`${badge} bg-[#EEF0F5] text-[#4A5263]`}>Awaiting payment</span>;
  if (saleStatus === "FAILED") return <span className={`${badge} bg-[#FDECEA] text-[#A32A1A]`}>Payment failed</span>;
  if (status === "FULLY_PAID") return <span className={`${badge} bg-[#E6F3EC] text-[#1F6B44]`}>Paid</span>;
  if (status === "PARTIALLY_PAID") return <span className={`${badge} bg-[#FFF3DC] text-[#7A4B00]`}>Part paid</span>;
  return <span className={`${badge} bg-[#FDECEA] text-[#A32A1A]`}>Unpaid</span>;
};

export const StockBadge = ({ qty }: { qty: number }) =>
  qty <= 0 ? (
    <span className={`${badge} bg-[#FDECEA] text-[#A32A1A]`}>Out of stock</span>
  ) : (
    <span className={`${badge} bg-[#FFF3DC] text-[#7A4B00]`}>Low</span>
  );

export const titleCase = (s: string) =>
  s
    .toLowerCase()
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
