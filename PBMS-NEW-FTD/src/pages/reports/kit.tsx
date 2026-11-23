import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { FiArrowDown, FiArrowLeft, FiArrowUp, FiFileText, FiRefreshCw } from "react-icons/fi";
import { apiRequest, baseURL } from "../../libs/apiConfig";
import Button from "../../ui/Button";
import Combobox from "../../ui/Combobox";
import { DatePicker, formatDate } from "../../ui/DateFields";
import { Card, EmptyState, SkeletonRows } from "../../ui/Page";
import useStores from "../../hooks/inventory/useStores";

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
export const money = (v: unknown) => `UGX ${new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(num(v))}`;
export const count = (v: unknown) => new Intl.NumberFormat("en-UG", { maximumFractionDigits: 2 }).format(num(v));
export const pct = (v: unknown) => `${num(v).toFixed(1)}%`;
export const dateTime = (d: string | Date) =>
  new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
export const day = (d: string | Date) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
export const time = (d: string | Date) => new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
export const person = (p?: { firstName?: string | null; lastName?: string | null } | null, fallback = "—") =>
  `${p?.firstName ?? ""} ${p?.lastName ?? ""}`.trim() || fallback;
/** "PARTIALLY_PAID" → "Partially paid" */
export const label = (s?: string | null) => {
  const t = (s ?? "").replace(/_/g, " ").toLowerCase().trim();
  return t ? t[0].toUpperCase() + t.slice(1) : "—";
};
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const monthStartISO = () => todayISO().slice(0, 8) + "01";

const query = (params: Record<string, unknown>) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.append(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
};

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

/**
 * Loads a report. Signed-in requests go through apiRequest (cookies + token
 * refresh); the old screens used bare fetch() and failed once the API
 * required sign-in. Set `enabled` to false until required filters are chosen.
 */
export const useReport = <T,>(endpoint: string | null, params: Record<string, unknown> = {}, opts: { unwrap?: boolean } = {}) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = endpoint ? endpoint + query(params) : null;
  const seq = useRef(0);
  const unwrap = opts.unwrap !== false;

  const load = useCallback(async () => {
    if (!key) {
      setData(null);
      return;
    }
    const mine = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ data?: T } & T>(key, "GET");
      if (mine !== seq.current) return; // a newer request replaced this one
      setData(unwrap && res && typeof res === "object" && "data" in res ? (res.data as T) : (res as T));
    } catch (e) {
      if (mine === seq.current) setError(e instanceof Error ? e.message : "Could not load the report");
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [key, unwrap]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
};

/**
 * Downloads a report PDF and opens it in a new tab (or downloads it when
 * pop-ups are blocked). The API sends a real PDF file now.
 */
export const usePdfExport = () => {
  const [exporting, setExporting] = useState(false);
  const run = useCallback(async (endpoint: string, params: Record<string, unknown> = {}, fallbackName = "report.pdf") => {
    // Open the tab now (inside the click), or browsers treat it as a pop-up.
    const tab = window.open("", "_blank");
    if (tab) tab.document.write("<p style='font:14px system-ui;padding:24px;color:#555'>Preparing your PDF…</p>");
    setExporting(true);
    const get = () =>
      axios.get<Blob>(`${baseURL}${endpoint}${query(params)}`, { responseType: "blob", withCredentials: true });
    try {
      let res;
      try {
        res = await get();
      } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status === 401) {
          await axios.post(`${baseURL}/api/auth/refresh`, {}, { withCredentials: true });
          res = await get();
        } else throw e;
      }
      const type = String(res.headers["content-type"] ?? "");
      if (!type.includes("pdf")) throw new Error("The server didn't return a PDF");
      const name = /filename="?([^"]+)"?/.exec(String(res.headers["content-disposition"] ?? ""))?.[1] ?? fallbackName;
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      if (tab) tab.location.href = url;
      else {
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      tab?.close();
      let message = "Couldn't create the PDF. Try again.";
      if (axios.isAxiosError(e) && e.response?.data instanceof Blob) {
        try {
          message = (JSON.parse(await e.response.data.text()) as { message?: string }).message ?? message;
        } catch {
          /* keep default */
        }
      }
      toast.error(message);
    } finally {
      setExporting(false);
    }
  }, []);
  return { exporting, exportPdf: run };
};

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

type ReportPageProps = {
  title: string;
  description?: ReactNode;
  /** Filter controls, shown in one row above the report. */
  filters?: ReactNode;
  onExport?: () => void;
  exporting?: boolean;
  canExport?: boolean;
  onRefresh?: () => void;
  loading?: boolean;
  children: ReactNode;
};

export const ReportPage = ({ title, description, filters, onExport, exporting, canExport = true, onRefresh, loading, children }: ReportPageProps) => (
  <div className="mx-auto max-w-7xl font-inter">
    <Link to="/reports" className="mb-2 inline-flex min-h-[32px] items-center gap-1.5 text-sm text-brand-muted no-underline hover:text-brand-ink">
      <FiArrowLeft aria-hidden="true" /> All reports
    </Link>
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="m-0 font-display text-2xl font-semibold text-brand-ink">{title}</h1>
        {description && <p className="m-0 mt-1 text-sm text-brand-muted">{description}</p>}
      </div>
      <div className="flex flex-none gap-2">
        {onRefresh && (
          <Button variant="secondary" icon={<FiRefreshCw aria-hidden="true" className={loading ? "animate-spin" : ""} />} onClick={onRefresh} disabled={loading} aria-label="Refresh">
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        )}
        {onExport && (
          <Button icon={<FiFileText aria-hidden="true" />} onClick={onExport} loading={exporting} disabled={!canExport}>
            Export PDF
          </Button>
        )}
      </div>
    </div>
    {filters && (
      <Card className="mb-4 p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">{filters}</div>
      </Card>
    )}
    <div className="space-y-4">{children}</div>
  </div>
);

/** What to show while loading / on error / before filters are chosen. */
export const ReportState = ({ loading, error, onRetry, waitingFor, hasData, empty, children }: {
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** e.g. "Choose a store to see the report." */
  waitingFor?: string | null;
  hasData: boolean;
  empty?: { title: string; message?: string };
  children: ReactNode;
}) => {
  if (waitingFor) return <Card><EmptyState icon={<FiFileText className="h-5 w-5" />} title={waitingFor} /></Card>;
  if (loading && !hasData) return <Card><SkeletonRows rows={6} /></Card>;
  if (error && !hasData)
    return (
      <Card>
        <EmptyState title="The report didn't load" message={error} action={onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>} />
      </Card>
    );
  if (!hasData) return <Card><EmptyState icon={<FiFileText className="h-5 w-5" />} title={empty?.title ?? "Nothing to show"} message={empty?.message ?? "Try a different period or filter."} /></Card>;
  return <div className={`space-y-4 transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>{children}</div>;
};

export const Section = ({ title, meta, actions, children, flush }: { title: string; meta?: ReactNode; actions?: ReactNode; children: ReactNode; flush?: boolean }) => (
  <Card>
    <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
      <h2 className="m-0 text-[15px] font-semibold text-brand-ink">{title}</h2>
      {meta && <span className="text-sm text-brand-muted">{meta}</span>}
      {actions && <div className="ml-auto">{actions}</div>}
    </div>
    <div className={flush ? "" : "p-4"}>{children}</div>
  </Card>
);

export const Stats = ({ children }: { children: ReactNode }) => <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>;

/* ------------------------------------------------------------------ */
/* Table                                                               */
/* ------------------------------------------------------------------ */

export type Col<T> = {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  render?: (row: T) => ReactNode;
  /** Value used for sorting (defaults to row[key]). */
  sortValue?: (row: T) => string | number;
  /** Shown in the totals row. */
  total?: ReactNode;
  className?: string;
};

const getKey = (row: unknown, key: string) =>
  key.split(".").reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), row);

/** Sortable, themed table with a totals row; scrolls sideways on phones. */
export const ReportTable = <T,>({ columns, rows, rowKey, empty = "No records.", pageSize = 50, initialSort }: {
  columns: Col<T>[];
  rows: T[];
  rowKey: (row: T, i: number) => string | number;
  empty?: string;
  pageSize?: number;
  initialSort?: { key: string; dir: "asc" | "desc" };
}) => {
  const [sort, setSort] = useState(initialSort ?? null);
  const [limit, setLimit] = useState(pageSize);
  useEffect(() => setLimit(pageSize), [rows, pageSize]);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    const val = (r: T) => (col?.sortValue ? col.sortValue(r) : (getKey(r, sort.key) as string | number));
    return [...rows].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      const n = typeof x === "number" && typeof y === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""), undefined, { numeric: true });
      return sort.dir === "asc" ? n : -n;
    });
  }, [rows, sort, columns]);

  const hasTotals = columns.some((c) => c.total !== undefined);
  const align = (a?: string) => (a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left");

  if (!rows.length) return <p className="m-0 px-4 py-8 text-center text-sm text-brand-muted">{empty}</p>;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-2">
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th key={c.key} scope="col" aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined} className={`whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-brand-muted ${align(c.align)}`}>
                    <button
                      type="button"
                      onClick={() => setSort(active && sort!.dir === "desc" ? { key: c.key, dir: "asc" } : { key: c.key, dir: "desc" })}
                      className={`inline-flex items-center gap-1 uppercase hover:text-brand-ink ${c.align === "right" ? "flex-row-reverse" : ""}`}
                    >
                      {c.header}
                      {active && (sort!.dir === "asc" ? <FiArrowUp aria-hidden="true" /> : <FiArrowDown aria-hidden="true" />)}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, limit).map((r, i) => (
              <tr key={rowKey(r, i)} className="border-b border-line last:border-0 hover:bg-surface-2/60">
                {columns.map((c) => (
                  <td key={c.key} className={`px-3 py-2.5 text-ink-soft ${align(c.align)} ${c.align === "right" ? "whitespace-nowrap tabular-nums" : ""} ${c.className ?? ""}`}>
                    {c.render ? c.render(r) : String(getKey(r, c.key) ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {hasTotals && (
            <tfoot>
              <tr className="border-t-2 border-line bg-surface-2 font-semibold text-brand-ink">
                {columns.map((c, i) => (
                  <td key={c.key} className={`whitespace-nowrap px-3 py-2.5 tabular-nums ${align(c.align)}`}>
                    {c.total ?? (i === 0 ? "Total" : "")}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {sorted.length > limit && (
        <div className="border-t border-line p-3 text-center">
          <Button variant="secondary" size="sm" onClick={() => setLimit((l) => l + pageSize)}>
            Show more ({sorted.length - limit} left)
          </Button>
        </div>
      )}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Small visuals                                                       */
/* ------------------------------------------------------------------ */

/**
 * Horizontal bars comparing a few values (one colour, values as text).
 * Good for shares: stores, payment methods, categories.
 */
export const Bars = ({ items, format = money }: { items: Array<{ label: string; value: number; hint?: string }>; format?: (v: number) => string }) => {
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((a, i) => a + i.value, 0) || 1;
  return (
    <ul className="m-0 list-none space-y-3 p-0">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-1 flex items-baseline gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate text-brand-ink">{i.label}</span>
            {i.hint && <span className="hidden text-xs text-brand-muted sm:inline">{i.hint}</span>}
            <span className="whitespace-nowrap font-medium tabular-nums text-brand-ink">{format(i.value)}</span>
            <span className="w-12 text-right text-xs tabular-nums text-brand-muted">{((i.value / total) * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
            <div className="h-full rounded-full bg-brand" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
};

const STATUS_TONE: Record<string, string> = {
  FULLY_PAID: "bg-[#E7F6EC] text-[#1B7A3D] dark:bg-[#12301D] dark:text-[#7FD89E]",
  PAID: "bg-[#E7F6EC] text-[#1B7A3D] dark:bg-[#12301D] dark:text-[#7FD89E]",
  PARTIALLY_PAID: "bg-[#FFF4E0] text-[#8A5300] dark:bg-[#33240A] dark:text-[#F5C26B]",
  PENDING: "bg-[#FDECEA] text-[#B42318] dark:bg-[#3A1512] dark:text-[#F29A92]",
  NOT_PAID: "bg-[#FDECEA] text-[#B42318] dark:bg-[#3A1512] dark:text-[#F29A92]",
  UNPAID: "bg-[#FDECEA] text-[#B42318] dark:bg-[#3A1512] dark:text-[#F29A92]",
};
export const Status = ({ value }: { value?: string | null }) => (
  <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[value ?? ""] ?? "bg-subtle text-brand-text"}`}>{label(value)}</span>
);

/* ------------------------------------------------------------------ */
/* Filters                                                             */
/* ------------------------------------------------------------------ */

export const StoreFilter = ({ value, onChange, allowAll = false, label: l = "Store" }: { value: string; onChange: (v: string) => void; allowAll?: boolean; label?: string }) => {
  const { data: stores = [] } = useStores();
  const options = useMemo(
    () => [...(allowAll ? [{ value: "", label: "All stores" }] : []), ...(stores as Array<{ id: number | string; name: string }>).map((s) => ({ value: String(s.id), label: s.name }))],
    [stores, allowAll],
  );
  return <Combobox label={l} value={value} onChange={onChange} options={options} placeholder={allowAll ? "All stores" : "Choose a store"} searchPlaceholder="Search stores" />;
};

export const DateRange = ({ start, end, onChange }: { start: string; end: string; onChange: (r: { start: string; end: string }) => void }) => (
  <>
    <DatePicker label="From" value={start} max={end || undefined} onChange={(v: string) => onChange({ start: v, end })} />
    <DatePicker label="To" value={end} min={start || undefined} max={todayISO()} onChange={(v: string) => onChange({ start, end: v })} />
  </>
);

/** "1 Nov 2026 – 23 Nov 2026" / "All time" */
export const periodText = (start?: string, end?: string) =>
  start && end ? `${formatDate(start)} – ${formatDate(end)}` : start ? `From ${formatDate(start)}` : end ? `Up to ${formatDate(end)}` : "All time";
