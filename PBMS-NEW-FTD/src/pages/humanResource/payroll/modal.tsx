import { Fragment, useEffect, useMemo, useState } from "react";
import { FiChevronDown, FiChevronRight, FiSearch, FiX } from "react-icons/fi";
import type { IPayrollPeriod } from "../../../redux/types/hr";

interface PayrollDetailsModalProps {
  visible: boolean;
  payrollPeriod: IPayrollPeriod | null;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/* The saved payment structure (built by the Generate Payroll form)    */
/* ------------------------------------------------------------------ */

type Item = { name: string; amount: number; detail?: string };

type Entry = {
  key: string;
  name: string;
  role: string;
  department: string;
  branch: string;
  baseSalary: number;
  /** Set on payrolls generated with months paid (older records don't have these). */
  monthlySalary: number | null;
  monthsPaid: number | null;
  periodMonths: number | null;
  paidMonthLabels: string[];
  netPay: number;
  attendance: {
    totalDays?: number;
    totalExpectedHours?: number;
    totalWorkedHours?: number;
    totalMissedHours?: number;
    attendanceRate?: number;
  } | null;
  missedHoursFine: number;
  generalDeductions: Item[];
  employeeDeductions: Item[];
  generalAllowances: Item[];
  employeeAllowances: Item[];
  totalAllowances: number;
  totalDeductions: number;
  /** False for older records saved without an item list. */
  hasBreakdown: boolean;
};

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

const text = (v: unknown, fallback = "—"): string => {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (v && typeof v === "object" && "name" in v && typeof (v as { name: unknown }).name === "string") return (v as { name: string }).name;
  return fallback;
};

const items = (v: unknown, monthsPaid: number | null = null): Item[] =>
  Array.isArray(v)
    ? v
        .map((raw) => {
          const i = (raw ?? {}) as { name?: unknown; amount?: unknown; value?: unknown; unitAmount?: unknown; perMonth?: unknown };
          const item: Item = { name: text(i.name, "Unnamed"), amount: num(i.amount ?? i.value) };
          if (i.perMonth === true && monthsPaid && monthsPaid > 1) {
            item.detail = `UGX ${new Intl.NumberFormat("en-UG", { maximumFractionDigits: 2 }).format(num(i.unitAmount))} × ${monthsPaid} months`;
          }
          return item;
        })
        .filter((i) => i.amount !== 0 || i.name !== "Unnamed")
    : [];

const sum = (list: Item[]) => list.reduce((s, i) => s + i.amount, 0);

const toEntry = (raw: unknown, index: number): Entry => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- saved JSON, shape varies by record age
  const p = (raw ?? {}) as Record<string, any>;
  const d = (p.deductions ?? {}) as Record<string, unknown>;
  const a = (p.allowances ?? {}) as Record<string, unknown>;
  const monthsPaid = typeof p.monthsPaid === "number" && p.monthsPaid > 0 ? p.monthsPaid : null;
  const generalDeductions = items(d.generalDeductions, monthsPaid);
  const employeeDeductions = items(d.employeeDeductions);
  const generalAllowances = items(a.generalAllowances, monthsPaid);
  const employeeAllowances = items(a.employeeAllowances);
  const missedHoursFine = num(d.missedHoursFine);
  const hasBreakdown = typeof p.deductions === "object" || typeof p.allowances === "object";

  const itemisedAllowances = sum(generalAllowances) + sum(employeeAllowances);
  const itemisedDeductions = missedHoursFine + sum(generalDeductions) + sum(employeeDeductions);

  return {
    key: String(p.employeeId ?? index),
    name: text(p.name, "Unknown employee"),
    role: text(p.role, ""),
    department: text(p.department),
    branch: text(p.branch),
    baseSalary: num(p.baseSalary),
    monthlySalary: monthsPaid ? num(p.monthlySalary) : null,
    monthsPaid,
    periodMonths: typeof p.periodMonths === "number" ? p.periodMonths : null,
    paidMonthLabels: Array.isArray(p.paidMonths) ? p.paidMonths.map((m: unknown) => text((m as { label?: unknown })?.label ?? m, "")).filter(Boolean) : [],
    netPay: num(p.netPay),
    attendance: p.attendance && typeof p.attendance === "object" ? p.attendance : null,
    missedHoursFine,
    generalDeductions,
    employeeDeductions,
    generalAllowances,
    employeeAllowances,
    totalAllowances: hasBreakdown ? itemisedAllowances : num(p.summary?.totalAllowances),
    totalDeductions: hasBreakdown ? itemisedDeductions : num(p.summary?.totalDeductions),
    hasBreakdown,
  };
};

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

const ugxFmt = new Intl.NumberFormat("en-UG", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const ugx = (n: number) => `UGX ${ugxFmt.format(n)}`;
const hours = (n?: number) => `${num(n).toFixed(1)} h`;
const longDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—";

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

const LineItems = ({
  title,
  tone,
  groups,
  total,
  emptyText,
}: {
  title: string;
  tone: "plus" | "minus";
  groups: { label: string; items: Item[]; note?: string }[];
  total: number;
  emptyText: string;
}) => {
  const anything = groups.some((g) => g.items.length > 0);
  const sign = tone === "plus" ? "+" : "−";
  const amountClass = tone === "plus" ? "text-[#1F6B44]" : "text-[#A32A1A]";
  return (
    <section className="min-w-0 rounded-xl border border-[#E6E9F0] bg-white p-4">
      <h4 className="m-0 mb-3 flex items-center justify-between text-sm font-semibold text-brand-ink">
        {title}
        <span className={`tabular-nums ${amountClass}`}>
          {sign} {ugx(total)}
        </span>
      </h4>
      {!anything ? (
        <p className="m-0 text-sm text-brand-muted">{emptyText}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {groups
            .filter((g) => g.items.length > 0)
            .map((g) => (
              <div key={g.label}>
                <p className="m-0 mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8A93A6]">{g.label}</p>
                <ul className="m-0 flex list-none flex-col p-0">
                  {g.items.map((i, idx) => (
                    <li key={`${i.name}-${idx}`} className="flex items-baseline justify-between gap-3 border-b border-dashed border-[#EEF0F5] py-1.5 text-sm last:border-0">
                      <span className="min-w-0 text-[#2B3240]">
                        {i.name}
                        {(i.detail || g.note) && <span className="block text-xs text-brand-muted">{i.detail ?? g.note}</span>}
                      </span>
                      <span className="flex-none tabular-nums text-brand-ink">{ugx(i.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      )}
    </section>
  );
};

const Breakdown = ({ e }: { e: Entry }) => {
  const att = e.attendance;
  return (
    <div className="flex flex-col gap-4">
      {!e.hasBreakdown && (
        <p className="m-0 rounded-lg bg-[#FFF6E5] px-3 py-2 text-sm text-[#6A4100]">
          This record was saved without an itemised list, so only the totals are available.
        </p>
      )}

      {e.monthsPaid !== null && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-brand-muted">Paid for</span>
          <span className="font-semibold text-brand-ink">
            {e.monthsPaid} {e.monthsPaid === 1 ? "month" : "months"}
            {e.periodMonths && e.periodMonths > 1 ? ` of ${e.periodMonths}` : ""}
          </span>
          {e.paidMonthLabels.map((m) => (
            <span key={m} className="rounded-full bg-[#E9EEF9] px-2 py-0.5 text-xs font-medium text-brand">
              {m}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <LineItems
          title="Allowances"
          tone="plus"
          total={e.totalAllowances}
          emptyText="No allowances this period."
          groups={[
            { label: "Applied to all staff", items: e.generalAllowances },
            { label: "Individual", items: e.employeeAllowances },
          ]}
        />
        <LineItems
          title="Deductions"
          tone="minus"
          total={e.totalDeductions}
          emptyText="No deductions this period."
          groups={[
            {
              label: "Attendance",
              items: e.missedHoursFine > 0 ? [{ name: "Missed hours fine", amount: e.missedHoursFine }] : [],
              note: att?.totalMissedHours ? `${hours(att.totalMissedHours)} missed` : undefined,
            },
            { label: "Applied to all staff", items: e.generalDeductions },
            { label: "Individual", items: e.employeeDeductions },
          ]}
        />
      </div>

      {/* How net pay was reached */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-[#F3F6FC] px-4 py-3 text-sm">
        <span className="text-brand-muted">Base salary</span>
        <span className="font-medium tabular-nums text-brand-ink">
          {ugx(e.baseSalary)}
          {e.monthsPaid !== null && e.monthlySalary !== null && (
            <span className="ml-1 font-normal text-brand-muted">
              ({ugx(e.monthlySalary)} × {e.monthsPaid})
            </span>
          )}
        </span>
        <span aria-hidden="true" className="text-brand-muted">+</span>
        <span className="sr-only">plus</span>
        <span className="text-brand-muted">allowances</span>
        <span className="font-medium tabular-nums text-[#1F6B44]">{ugx(e.totalAllowances)}</span>
        <span aria-hidden="true" className="text-brand-muted">−</span>
        <span className="sr-only">minus</span>
        <span className="text-brand-muted">deductions</span>
        <span className="font-medium tabular-nums text-[#A32A1A]">{ugx(e.totalDeductions)}</span>
        <span aria-hidden="true" className="text-brand-muted">=</span>
        <span className="sr-only">equals</span>
        <span className="text-brand-muted">net pay</span>
        <span className="font-semibold tabular-nums text-brand-ink">{ugx(e.netPay)}</span>
      </div>

      {att && (
        <dl className="m-0 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Days in period", String(num(att.totalDays))],
            ["Hours worked", hours(att.totalWorkedHours)],
            ["Hours missed", hours(att.totalMissedHours)],
            ["Attendance", `${num(att.attendanceRate).toFixed(1)}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-[#EEF0F5] px-3 py-2">
              <dt className="text-xs text-brand-muted">{label}</dt>
              <dd className="m-0 text-sm font-semibold tabular-nums text-brand-ink">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

const PayrollDetailsModal = ({ visible, payrollPeriod, onClose }: PayrollDetailsModalProps) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());

  // The API sends `payrolls` and `periodStart/periodEnd`; the shared type is out of date.
  const period = payrollPeriod as unknown as {
    periodStart?: string;
    periodEnd?: string;
    payDate?: string;
    totalSpent?: string | number;
    payrolls?: { paymentStructure: unknown }[];
  } | null;

  const entries = useMemo(() => (period?.payrolls ?? []).map((p, i) => toEntry(p.paymentStructure, i)), [period]);

  // Fresh view for each period opened.
  useEffect(() => {
    setQuery("");
    setOpen(new Set());
  }, [payrollPeriod]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, onClose]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => [e.name, e.role, e.department, e.branch].join(" ").toLowerCase().includes(q));
  }, [entries, query]);

  if (!visible || !period) return null;

  const totals = entries.reduce(
    (t, e) => ({
      base: t.base + e.baseSalary,
      allowances: t.allowances + e.totalAllowances,
      deductions: t.deductions + e.totalDeductions,
      net: t.net + e.netPay,
      fines: t.fines + e.missedHoursFine,
    }),
    { base: 0, allowances: 0, deductions: 0, net: 0, fines: 0 }
  );

  const allOpen = shown.length > 0 && shown.every((e) => open.has(e.key));
  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const toggleAll = () => setOpen(allOpen ? new Set() : new Set(shown.map((e) => e.key)));

  const kpis = [
    { label: "Employees", value: String(entries.length) },
    { label: "Base salaries", value: ugx(totals.base) },
    { label: "Allowances", value: `+ ${ugx(totals.allowances)}`, tone: "text-[#1F6B44]" },
    { label: "Deductions", value: `− ${ugx(totals.deductions)}`, tone: "text-[#A32A1A]", hint: totals.fines > 0 ? `incl. ${ugx(totals.fines)} missed-hours fines` : undefined },
    { label: "Net pay", value: ugx(totals.net), strong: true },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-[#0B1226]/50 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payroll-details-title"
        className="flex h-full w-full max-w-7xl flex-col overflow-hidden bg-[#F5F6FA] font-inter shadow-2xl sm:h-[94vh] sm:rounded-2xl"
      >
        {/* Header */}
        <header className="flex flex-none items-start justify-between gap-4 border-b border-[#E6E9F0] bg-white px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id="payroll-details-title" className="m-0 font-display text-lg font-semibold text-brand-ink sm:text-xl">
              Payroll details
            </h2>
            <p className="m-0 mt-0.5 text-sm text-brand-muted">
              {longDate(period.periodStart)} – {longDate(period.periodEnd)} · Paid {longDate(period.payDate)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close payroll details"
            className="flex h-10 w-10 flex-none items-center justify-center rounded-lg text-brand-muted hover:bg-[#EEF1F8] hover:text-brand-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
          >
            <FiX aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {entries.length === 0 ? (
            <div className="rounded-2xl border border-[#E6E9F0] bg-white px-4 py-14 text-center text-sm text-brand-muted">
              No employees were paid in this payroll period.
            </div>
          ) : (
            <>
              {/* Period totals */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                {kpis.map((k) => (
                  <div key={k.label} className="rounded-2xl border border-[#E6E9F0] bg-white p-4">
                    <p className="m-0 text-xs font-medium text-brand-muted">{k.label}</p>
                    <p className={`m-0 mt-1 font-display tabular-nums ${k.strong ? "text-xl font-semibold text-brand-ink" : `text-lg font-semibold ${k.tone ?? "text-brand-ink"}`}`}>
                      {k.value}
                    </p>
                    {k.hint && <p className="m-0 mt-1 text-xs text-brand-muted">{k.hint}</p>}
                  </div>
                ))}
              </div>

              {/* Toolbar */}
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-[#DDE1EA] bg-white px-3 focus-within:border-brand sm:w-80">
                  <FiSearch aria-hidden="true" className="h-4 w-4 text-brand-muted" />
                  <span className="sr-only">Search employees</span>
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name, role, department, branch"
                    className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={toggleAll}
                  disabled={shown.length === 0}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-[#DDE1EA] bg-white px-3.5 text-sm font-medium text-[#2B3240] hover:bg-[#F3F5FA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50"
                >
                  {allOpen ? "Collapse all" : "Expand all"}
                </button>
              </div>

              <div className="mt-3 overflow-hidden rounded-2xl border border-[#E6E9F0] bg-white">
                {shown.length === 0 ? (
                  <p className="m-0 px-4 py-10 text-center text-sm text-brand-muted">No employee matches “{query}”.</p>
                ) : (
                  <>
                    {/* Desktop table */}
                    <table className="hidden w-full text-sm lg:table">
                      <thead className="bg-[#F7F8FB] text-left text-xs text-brand-muted">
                        <tr>
                          <th className="w-12 px-3 py-3">
                            <span className="sr-only">Show breakdown</span>
                          </th>
                          <th className="px-2 py-3 font-semibold">Employee</th>
                          <th className="px-2 py-3 font-semibold">Department · Branch</th>
                          <th className="px-2 py-3 text-right font-semibold">Base salary</th>
                          <th className="px-2 py-3 text-right font-semibold">Allowances</th>
                          <th className="px-2 py-3 text-right font-semibold">Deductions</th>
                          <th className="px-5 py-3 text-right font-semibold">Net pay</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shown.map((e) => {
                          const isOpen = open.has(e.key);
                          const panelId = `payroll-breakdown-${e.key}`;
                          return (
                            <Fragment key={e.key}>
                              <tr
                                className={`cursor-pointer border-t border-[#EEF0F5] ${isOpen ? "bg-[#F6F8FD]" : "hover:bg-[#FAFBFD]"}`}
                                onClick={() => toggle(e.key)}
                              >
                                <td className="px-3 py-2.5">
                                  <button
                                    type="button"
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      toggle(e.key);
                                    }}
                                    aria-expanded={isOpen}
                                    aria-controls={panelId}
                                    aria-label={`${isOpen ? "Hide" : "Show"} allowances and deductions for ${e.name}`}
                                    className="flex h-8 w-8 items-center justify-center rounded-md text-brand-muted hover:bg-[#E9EDF6] hover:text-brand-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                                  >
                                    {isOpen ? <FiChevronDown aria-hidden="true" className="h-4 w-4" /> : <FiChevronRight aria-hidden="true" className="h-4 w-4" />}
                                  </button>
                                </td>
                                <td className="px-2 py-2.5">
                                  <p className="m-0 font-medium text-brand-ink">{e.name}</p>
                                  <p className="m-0 text-xs text-brand-muted">
                                    {[e.role, e.monthsPaid !== null && e.periodMonths && e.periodMonths > 1 ? `${e.monthsPaid} of ${e.periodMonths} months` : ""]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </p>
                                </td>
                                <td className="px-2 py-2.5 text-[#2B3240]">
                                  {e.department} <span className="text-brand-muted">· {e.branch}</span>
                                </td>
                                <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums">{ugx(e.baseSalary)}</td>
                                <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-[#1F6B44]">+ {ugx(e.totalAllowances)}</td>
                                <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-[#A32A1A]">− {ugx(e.totalDeductions)}</td>
                                <td className="whitespace-nowrap px-5 py-2.5 text-right font-semibold tabular-nums text-brand-ink">{ugx(e.netPay)}</td>
                              </tr>
                              {isOpen && (
                                <tr id={panelId} className="bg-[#F6F8FD]">
                                  <td />
                                  <td colSpan={6} className="px-2 pb-5 pr-5 pt-1">
                                    <Breakdown e={e} />
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-[#E2E6EF] bg-[#F7F8FB] text-sm font-semibold">
                          <td />
                          <td className="px-2 py-3" colSpan={2}>
                            {query ? `${shown.length} of ${entries.length} employees` : `Total · ${entries.length} employees`}
                          </td>
                          <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums">{ugx(shown.reduce((s, e) => s + e.baseSalary, 0))}</td>
                          <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums text-[#1F6B44]">+ {ugx(shown.reduce((s, e) => s + e.totalAllowances, 0))}</td>
                          <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums text-[#A32A1A]">− {ugx(shown.reduce((s, e) => s + e.totalDeductions, 0))}</td>
                          <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">{ugx(shown.reduce((s, e) => s + e.netPay, 0))}</td>
                        </tr>
                      </tfoot>
                    </table>

                    {/* Phone & tablet cards */}
                    <ul className="m-0 list-none divide-y divide-[#EEF0F5] p-0 lg:hidden">
                      {shown.map((e) => {
                        const isOpen = open.has(e.key);
                        const panelId = `payroll-card-${e.key}`;
                        return (
                          <li key={e.key} className={isOpen ? "bg-[#F6F8FD]" : ""}>
                            <button
                              type="button"
                              onClick={() => toggle(e.key)}
                              aria-expanded={isOpen}
                              aria-controls={panelId}
                              className="flex w-full items-start gap-3 px-4 py-3.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"
                            >
                              <span aria-hidden="true" className="mt-0.5 text-brand-muted">
                                {isOpen ? <FiChevronDown className="h-4 w-4" /> : <FiChevronRight className="h-4 w-4" />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium text-brand-ink">{e.name}</span>
                                <span className="block truncate text-xs text-brand-muted">
                                  {[e.role, e.department, e.branch].filter((x) => x && x !== "—").join(" · ")}
                                </span>
                                {e.monthsPaid !== null && e.periodMonths && e.periodMonths > 1 && (
                                  <span className="block text-xs font-medium text-brand">
                                    {e.monthsPaid} of {e.periodMonths} months
                                  </span>
                                )}
                                <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs tabular-nums">
                                  <span className="text-[#1F6B44]">+ {ugx(e.totalAllowances)}</span>
                                  <span className="text-[#A32A1A]">− {ugx(e.totalDeductions)}</span>
                                </span>
                              </span>
                              <span className="flex-none text-right">
                                <span className="block text-xs text-brand-muted">Net pay</span>
                                <span className="block font-semibold tabular-nums text-brand-ink">{ugx(e.netPay)}</span>
                              </span>
                            </button>
                            {isOpen && (
                              <div id={panelId} className="px-4 pb-4">
                                <Breakdown e={e} />
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>

              {num(period.totalSpent) > 0 && Math.abs(num(period.totalSpent) - totals.net) > 1 && (
                <p className="m-0 mt-3 text-xs text-brand-muted">
                  The period total saved when payroll was generated is {ugx(num(period.totalSpent))}.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayrollDetailsModal;
