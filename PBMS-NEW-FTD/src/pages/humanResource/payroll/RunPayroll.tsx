import { Fragment, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { FiAlertTriangle, FiArrowLeft, FiCheck, FiChevronDown, FiChevronLeft, FiChevronRight, FiLock, FiPlus, FiTrash2, FiUsers } from "react-icons/fi";
import Button from "../../../ui/Button";
import { CONTROL, MoneyField, SearchBox } from "../../../ui/Field";
import Combobox from "../../../ui/Combobox";
import { DatePicker, MonthPicker, formatDate } from "../../../ui/DateFields";
import { Badge, Card, EmptyState, ugx } from "../../../ui/Page";
import usePayroll from "../../../hooks/humanResource/usePayroll";
import { useConfirm } from "../../../ui/ConfirmDialog";
import { apiRequest } from "../../../libs/apiConfig";
import { PayrollEndpoints } from "../../../endpoints/humanResource/payroll";
import type { IPayrollPeriod } from "../../../redux/types/hr";
import {
  computePerson,
  isPartialMonth,
  monthEnd,
  monthLabel,
  monthStart,
  monthsBetween,
  type GeneralItem,
  type MonthAttendance,
  type PeriodMonth,
  type PersonalItem,
} from "./payrollMath";

/* ---------------- Types from GET /api/employees/summary ---------------- */
type SummaryPerson = {
  employeeId: number;
  name: string;
  salary: number | string | null;
  branch: string;
  role: string;
  department: string;
  isActive?: boolean;
  months?: MonthAttendance[];
  alreadyPaid?: { month: string; payrollPeriodId: number }[];
};
type SummaryResponse = { months?: PeriodMonth[]; data?: SummaryPerson[] };

type Selection = Record<number, string[]>; // employeeId → months paid (YYYY-MM), empty = not in this payroll


const STEPS = ["Period", "Months per person", "Pay items", "Review"] as const;

const thisMonth = () => new Date().toISOString().slice(0, 7);
/** "2026-07" + -2 → "2026-05" */
const addMonths = (ym: string, n: number) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};
const uid = () => Math.random().toString(36).slice(2, 10);
const digits = (v: string) => v.replace(/[^\d]/g, "");
const fmtDate = formatDate;
const SMALL_INPUT = `${CONTROL} border-line h-10`;

/** A white card with a title for each block of the page. */
const Panel = ({ title, description, actions, children, className = "" }: { title: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) => (
  <Card className={`p-5 sm:p-6 ${className}`}>
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="m-0 font-display text-base font-semibold text-brand-ink sm:text-lg">{title}</h2>
        {description && <p className="m-0 mt-1 max-w-2xl text-sm text-brand-muted">{description}</p>}
      </div>
      {actions}
    </div>
    {children}
  </Card>
);

/**
 * Run payroll, as its own page (/hr/payroll/run):
 * 1 pick the months, 2 tick which months each person is paid for,
 * 3 add allowances/deductions, 4 review and save.
 */
const RunPayroll = () => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { upsert } = usePayroll();
  const [step, setStep] = useState(0);

  // Step 1: period
  const [startMonth, setStartMonth] = useState(thisMonth());
  const [endMonth, setEndMonth] = useState(thisMonth());
  const [payDate, setPayDate] = useState(monthEnd(thisMonth()));
  const [loading, setLoading] = useState(false);

  // Step 2: people × months
  const [months, setMonths] = useState<PeriodMonth[]>([]);
  const [people, setPeople] = useState<SummaryPerson[]>([]);
  const [selection, setSelection] = useState<Selection>({});
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // Step 3: pay items
  const [general, setGeneral] = useState<GeneralItem[]>([]);
  const [personal, setPersonal] = useState<Record<number, PersonalItem[]>>({});
  const [finePerHour, setFinePerHour] = useState("");
  const [openPerson, setOpenPerson] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const leave = () => navigate("/hr/payroll");

  const periodMonths = useMemo(() => (startMonth && endMonth && endMonth >= startMonth ? monthsBetween(startMonth, endMonth) : []), [startMonth, endMonth]);
  const periodError = !startMonth || !endMonth ? "Choose the first and last month" : endMonth < startMonth ? "The last month is before the first" : periodMonths.length > 12 ? "A payroll can cover up to 12 months" : !payDate ? "Choose the pay date" : null;

  const paidElsewhere = (p: SummaryPerson, month: string) => p.alreadyPaid?.find((x) => x.month === month);

  /* ---------- Step 1 → 2: load people and attendance ---------- */
  const loadPeople = async () => {
    if (periodError) return;
    setLoading(true);
    try {
      const res = await apiRequest<SummaryResponse>(PayrollEndpoints.PAYROLL.get_employees(monthStart(startMonth), monthEnd(endMonth)), "GET");
      const ms = res?.months?.length ? res.months : periodMonths.map((m) => ({ month: m, label: monthLabel(m), days: 30 }));
      const list = (res?.data ?? []).filter((p) => p && p.employeeId != null);
      setMonths(ms);
      setPeople(list);
      // Everyone active starts on every month they haven't been paid for yet.
      const sel: Selection = {};
      for (const p of list) {
        sel[p.employeeId] = p.isActive === false ? [] : ms.map((m) => m.month).filter((m) => !paidElsewhere(p, m));
      }
      setSelection(sel);
      setStep(1);
    } catch {
      // error shown by apiRequest
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Selection helpers ---------- */
  const order = (list: string[]) => months.map((m) => m.month).filter((m) => list.includes(m));
  const toggleCell = (p: SummaryPerson, month: string) => {
    if (paidElsewhere(p, month)) return;
    setSelection((s) => {
      const cur = s[p.employeeId] ?? [];
      return { ...s, [p.employeeId]: cur.includes(month) ? cur.filter((m) => m !== month) : order([...cur, month]) };
    });
  };
  const setRow = (p: SummaryPerson, on: boolean) =>
    setSelection((s) => ({ ...s, [p.employeeId]: on ? months.map((m) => m.month).filter((m) => !paidElsewhere(p, m)) : [] }));
  const visiblePeople = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter(
      (p) =>
        (showInactive || p.isActive !== false || (selection[p.employeeId]?.length ?? 0) > 0) &&
        (!department || p.department === department) &&
        (!q || [p.name, p.role, p.department, p.branch].some((v) => (v ?? "").toLowerCase().includes(q))),
    );
  }, [people, query, showInactive, selection, department]);
  const departments = useMemo(
    () => Array.from(new Set(people.map((p) => p.department).filter((d) => d && d !== "N/A"))).sort().map((d) => ({ value: d, label: d })),
    [people],
  );
  /** Tick every open month, or clear, for everyone currently shown. */
  const setAllShown = (on: boolean) =>
    setSelection((s) => {
      const next = { ...s };
      for (const p of visiblePeople) next[p.employeeId] = on ? months.map((m) => m.month).filter((m) => !paidElsewhere(p, m)) : [];
      return next;
    });
  const setColumn = (month: string) => {
    const targets = visiblePeople.filter((p) => !paidElsewhere(p, month));
    const allOn = targets.every((p) => selection[p.employeeId]?.includes(month));
    setSelection((s) => {
      const next = { ...s };
      for (const p of targets) {
        const cur = next[p.employeeId] ?? [];
        next[p.employeeId] = allOn ? cur.filter((m) => m !== month) : order(Array.from(new Set([...cur, month])));
      }
      return next;
    });
  };

  const included = useMemo(() => people.filter((p) => (selection[p.employeeId]?.length ?? 0) > 0), [people, selection]);
  const inactiveCount = people.filter((p) => p.isActive === false).length;

  /* ---------- Results ---------- */
  const fine = Number(finePerHour || 0);
  const results = useMemo(
    () =>
      included.map((p) => {
        const paid = selection[p.employeeId] ?? [];
        const attendance = (p.months ?? []).filter((m) => paid.includes(m.month));
        // Older API without per-month attendance: count the months with no missed hours.
        const paidMonths: MonthAttendance[] = paid.map(
          (m) => attendance.find((a) => a.month === m) ?? { month: m, label: monthLabel(m), days: months.find((x) => x.month === m)?.days ?? 0, expectedHours: 0, workedHours: 0, missedHours: 0 },
        );
        const r = computePerson({ monthlySalary: Number(p.salary ?? 0), paidMonths, general, personal: personal[p.employeeId] ?? [], finePerMissedHour: fine });
        return { person: p, paidMonths, r };
      }),
    [included, selection, personal, general, fine, months],
  );
  const total = results.reduce((a, x) => a + x.r.net, 0);
  const personMonths = results.reduce((a, x) => a + x.r.monthsPaid, 0);
  const noSalary = included.filter((p) => !(Number(p.salary) > 0));

  /* ---------- Save ---------- */
  const buildPayload = () => ({
    periodStart: monthStart(startMonth),
    periodEnd: monthEnd(endMonth),
    payDate,
    totalSpent: Math.round(total * 100) / 100,
    fineSettings: { finePerMissedHour: fine, totalFinesAmount: results.reduce((a, x) => a + x.r.fine, 0) },
    dateRange: { startDate: monthStart(startMonth), endDate: monthEnd(endMonth) },
    paymentStructure: results.map(({ person: p, paidMonths, r }) => ({
      employeeId: p.employeeId,
      name: p.name,
      branch: p.branch,
      department: p.department,
      role: p.role,
      monthlySalary: Number(p.salary ?? 0),
      monthsPaid: r.monthsPaid,
      periodMonths: months.length,
      paidMonths: paidMonths.map((m) => ({ month: m.month, label: m.label })),
      baseSalary: r.base,
      grossPay: r.gross,
      netPay: r.net,
      attendance: {
        totalDays: paidMonths.reduce((a, m) => a + m.days, 0),
        totalExpectedHours: r.expectedHours,
        totalWorkedHours: r.workedHours,
        totalMissedHours: r.missedHours,
        attendanceRate: r.expectedHours > 0 ? `${((r.workedHours / r.expectedHours) * 100).toFixed(2)}%` : "—",
        months: paidMonths,
      },
      deductions: { missedHoursFine: r.fine, generalDeductions: r.generalDeductions, employeeDeductions: r.employeeDeductions },
      allowances: { generalAllowances: r.generalAllowances, employeeAllowances: r.employeeAllowances },
      summary: { totalDeductions: r.totalDeductions, totalAllowances: r.totalAllowances, shortfall: r.shortfall },
    })),
    metadata: {
      totalEmployees: results.length,
      periodMonths: months.length,
      generatedAt: new Date().toISOString(),
      generalAllowances: general.filter((g) => g.kind === "allowance").map((g) => ({ name: g.name, value: String(g.amount), perMonth: g.perMonth })),
      generalDeductions: general.filter((g) => g.kind === "deduction").map((g) => ({ name: g.name, value: String(g.amount), perMonth: g.perMonth })),
    },
  });

  const save = async () => {
    const range = startMonth === endMonth ? monthLabel(startMonth, "long") : `${monthLabel(startMonth)} – ${monthLabel(endMonth)}`;
    const ok = await confirm({
      title: `Save payroll for ${range}?`,
      message: `${results.length} ${results.length === 1 ? "person" : "people"}, ${personMonths} paid ${personMonths === 1 ? "month" : "months"} in total, paid on ${fmtDate(payDate)}.`,
      details: (
        <div className="flex items-baseline justify-between gap-3">
          <span>Total to pay</span>
          <span className="font-display text-lg font-semibold tabular-nums text-brand-ink">{ugx(total)}</span>
        </div>
      ),
      confirmLabel: "Save payroll",
      tone: "primary",
    });
    if (!ok) return;
    setSaving(true);
    try {
      const res = await apiRequest<{ data?: IPayrollPeriod }>(PayrollEndpoints.PAYROLL.create, "POST", buildPayload());
      if (res?.data) {
        upsert(res.data);
        navigate(`/hr/payroll?view=${res.data.id}`);
      } else {
        leave();
      }
    } catch {
      // e.g. "Already paid in another payroll" is shown by apiRequest
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Item editors ---------- */
  const addGeneral = (kind: GeneralItem["kind"]) => {
    const id = uid();
    setGeneral((g) => [...g, { id, kind, name: "", amount: 0, perMonth: true }]);
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`[data-item="${id}"]`)?.focus());
  };
  const updateGeneral = (id: string, patch: Partial<GeneralItem>) => setGeneral((g) => g.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const addPersonal = (employeeId: number, kind: PersonalItem["kind"]) =>
    setPersonal((p) => ({ ...p, [employeeId]: [...(p[employeeId] ?? []), { id: uid(), kind, name: "", amount: 0 }] }));
  const updatePersonal = (employeeId: number, id: string, patch: Partial<PersonalItem>) =>
    setPersonal((p) => ({ ...p, [employeeId]: (p[employeeId] ?? []).map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const removePersonal = (employeeId: number, id: string) => setPersonal((p) => ({ ...p, [employeeId]: (p[employeeId] ?? []).filter((x) => x.id !== id) }));

  const canNext = step === 0 ? !periodError : step === 1 ? included.length > 0 : true;

  const range = startMonth === endMonth ? monthLabel(startMonth, "long") : `${monthLabel(startMonth)} – ${monthLabel(endMonth)}`;

  return (
    <div className="mx-auto max-w-6xl font-inter">
      {/* Header */}
      <button type="button" onClick={leave} className="mb-3 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-brand-muted hover:text-brand-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
        <FiArrowLeft aria-hidden="true" /> Payroll
      </button>
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="m-0 font-display text-2xl font-semibold tracking-tight text-brand-ink">Run payroll</h1>
          <p className="m-0 mt-1 text-sm text-brand-muted">{step === 0 ? "Pay each person for exactly the months they're owed." : `${range} · paid ${fmtDate(payDate)}`}</p>
        </div>
      </div>

      {/* Steps */}
      <nav aria-label="Steps" className="mb-5">
        <ol className="m-0 grid list-none grid-cols-4 gap-2 p-0">
          {STEPS.map((label, i) => {
            const done = i < step;
            const current = i === step;
            return (
              <li key={label}>
                <button
                  type="button"
                  disabled={!done}
                  onClick={() => done && setStep(i)}
                  aria-current={current ? "step" : undefined}
                  className="group flex w-full flex-col gap-2 text-left disabled:cursor-default"
                >
                  <span className={`h-1 w-full rounded-full ${done || current ? "bg-brand" : "bg-line"}`} />
                  <span className="flex items-center gap-2">
                    <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11px] font-semibold ${done ? "bg-brand text-white" : current ? "bg-subtle text-brand-text ring-1 ring-brand" : "bg-surface-2 text-brand-muted"}`}>
                      {done ? <FiCheck aria-hidden="true" /> : i + 1}
                    </span>
                    <span className={`hidden truncate text-sm sm:inline ${current ? "font-semibold text-brand-ink" : done ? "text-ink-soft group-hover:text-brand-text" : "text-brand-muted"}`}>{label}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="m-0 mt-2 text-sm font-medium text-brand-ink sm:hidden">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
      </nav>

      {/* ---------------- Step 1: period ---------------- */}
      {step === 0 && (
        <Panel title="Which months does this payroll cover?" description="For example May to July, paid at the end of July. Next you choose which of those months each person is paid for.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MonthPicker
              label="First month"
              required
              value={startMonth}
              onChange={(v) => {
                setStartMonth(v);
                if (endMonth < v) {
                  setEndMonth(v);
                  setPayDate(monthEnd(v));
                }
              }}
            />
            <MonthPicker
              label="Last month"
              required
              value={endMonth}
              min={startMonth}
              onChange={(v) => {
                setEndMonth(v);
                setPayDate(monthEnd(v));
              }}
            />
            <DatePicker label="Pay date" required value={payDate} onChange={setPayDate} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-brand-muted">Quick pick:</span>
            {[1, 2, 3, 6].map((n) => {
              const end = thisMonth();
              const start = addMonths(end, -(n - 1));
              const on = startMonth === start && endMonth === end;
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setStartMonth(start);
                    setEndMonth(end);
                    setPayDate(monthEnd(end));
                  }}
                  className={`h-8 rounded-full border px-3 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
                    on ? "border-brand bg-subtle text-brand-text" : "border-line bg-surface text-ink-soft hover:border-brand hover:text-brand-text"
                  }`}
                >
                  {n === 1 ? "This month" : `Last ${n} months`}
                </button>
              );
            })}
          </div>
          {periodError ? (
            <p role="alert" className="m-0 mt-5 text-sm font-medium text-[#B42318] dark:text-[#F2A29A]">{periodError}</p>
          ) : (
            <div className="mt-5 flex flex-wrap gap-1.5 rounded-xl border border-line bg-surface-2 px-4 py-3">
              <span className="mr-1 text-sm font-medium text-brand-ink">
                {periodMonths.length} {periodMonths.length === 1 ? "month" : "months"}:
              </span>
              {periodMonths.map((m) => (
                <Badge key={m} tone="brand">{monthLabel(m, "long")}</Badge>
              ))}
            </div>
          )}
        </Panel>
      )}

      {/* ---------------- Step 2: people × months ---------------- */}
      {step === 1 && (
        <Panel
          title="Who is paid for which months?"
          description="Each blue box is a month that person is paid for. Click a box to switch it; click a month's name to switch it for everyone shown. Months already paid in another payroll are locked."
        >
          <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
            <SearchBox value={query} onChange={setQuery} placeholder="Find a person" label="Find a person" className="lg:max-w-xs" />
            {departments.length > 1 && (
              <Combobox label="Department" hideLabel clearable value={department} onChange={setDepartment} options={departments} placeholder="All departments" searchPlaceholder="Search departments" className="w-full lg:w-56" />
            )}
            <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
              {inactiveCount > 0 && (
                <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm text-ink-soft hover:bg-surface-2">
                  <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="h-4 w-4 accent-[#3959A5]" />
                  Show inactive ({inactiveCount})
                </label>
              )}
              <Button size="sm" variant="secondary" onClick={() => setAllShown(true)}>
                All months
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setAllShown(false)}>
                Clear
              </Button>
            </div>
          </div>

          {months.some(isPartialMonth) && (
            <p className="m-0 mb-3 flex items-start gap-2 rounded-lg border border-[#F8E1B4] bg-[#FEF4E2] px-3 py-2.5 text-sm text-[#7A4F06] dark:border-[#4A3A17] dark:bg-[#33280F] dark:text-[#F0CF85]">
              <FiAlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none" />
              Some months are only partly in this period. Each ticked month still pays a full month's salary.
            </p>
          )}

          {visiblePeople.length === 0 ? (
            <EmptyState icon={<FiUsers className="h-5 w-5" />} title={people.length === 0 ? "No employees found" : "No one matches"} message={people.length === 0 ? "Add employees in HR first." : "Try another name or department, or show inactive people."} />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full border-collapse text-sm" style={{ minWidth: 300 + months.length * 96 }}>
                <thead className="bg-surface-2">
                  <tr className="border-b border-line">
                    <th scope="col" className="sticky left-0 z-10 bg-surface-2 px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-brand-muted">
                      Person
                    </th>
                    {months.map((m) => (
                      <th key={m.month} scope="col" className="w-24 px-1 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => setColumn(m.month)}
                          title={`Switch ${m.label} for everyone shown`}
                          className="w-full rounded-md px-1 py-1 text-xs font-semibold text-brand-ink hover:bg-subtle hover:text-brand-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                        >
                          {m.label}
                          {isPartialMonth(m) && <span className="block text-[10px] font-normal text-brand-muted">{m.days} days</span>}
                        </button>
                      </th>
                    ))}
                    <th scope="col" className="w-40 px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-brand-muted">Base pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {visiblePeople.map((p) => {
                    const sel = selection[p.employeeId] ?? [];
                    const on = sel.length > 0;
                    const open = months.filter((m) => !paidElsewhere(p, m.month)).length;
                    return (
                      <tr key={p.employeeId} className="bg-surface">
                        <th scope="row" className="sticky left-0 z-10 bg-surface px-3 py-2.5 text-left font-normal">
                          <label className={`flex items-center gap-3 ${open ? "cursor-pointer" : ""}`}>
                            <input type="checkbox" checked={on} disabled={open === 0} onChange={(e) => setRow(p, e.target.checked)} aria-label={`Include ${p.name}`} className="h-4 w-4 flex-none accent-[#3959A5]" />
                            <span className="min-w-0">
                              <span className={`flex items-center gap-1.5 truncate font-medium ${on ? "text-brand-ink" : "text-brand-muted"}`}>
                                {p.name}
                                {p.isActive === false && <Badge>Inactive</Badge>}
                              </span>
                              <span className="block truncate text-xs text-brand-muted">
                                {[p.department, Number(p.salary) > 0 ? `${ugx(p.salary)}/mo` : "no salary set"].filter((x) => x && x !== "N/A").join(" · ")}
                              </span>
                            </span>
                          </label>
                        </th>
                        {months.map((m) => {
                          const paid = paidElsewhere(p, m.month);
                          const active = sel.includes(m.month);
                          const att = p.months?.find((x) => x.month === m.month);
                          return (
                            <td key={m.month} className="px-1 py-2 text-center">
                              {paid ? (
                                <span title={`Already paid in payroll #${paid.payrollPeriodId}`} className="mx-auto flex h-10 w-[84px] items-center justify-center gap-1 rounded-lg border border-dashed border-line text-xs text-brand-muted">
                                  <FiLock aria-hidden="true" className="h-3 w-3" /> Paid
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  aria-pressed={active}
                                  aria-label={`${p.name}, ${m.label}: ${active ? "paid" : "not paid"}`}
                                  onClick={() => toggleCell(p, m.month)}
                                  className={`mx-auto flex h-10 w-[84px] flex-col items-center justify-center rounded-lg border text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand ${
                                    active ? "border-brand bg-brand text-white hover:bg-brand-dark" : "border-line bg-surface-2 text-brand-muted hover:border-brand hover:text-brand-text"
                                  }`}
                                >
                                  {active ? <FiCheck aria-hidden="true" className="h-4 w-4" /> : <span aria-hidden="true">Not paid</span>}
                                  {att && att.missedHours > 0 && active && <span className="text-[10px] font-normal opacity-90">{att.missedHours}h missed</span>}
                                </button>
                              )}
                            </td>
                          );
                        })}
                        <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                          {on ? (
                            <>
                              <span className="block font-medium text-brand-ink">{ugx(Number(p.salary ?? 0) * sel.length)}</span>
                              <span className="block text-xs text-brand-muted">
                                {sel.length} of {months.length} {months.length === 1 ? "month" : "months"}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-brand-muted">Not in this payroll</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {noSalary.length > 0 && (
            <p className="m-0 mt-3 flex items-start gap-2 text-sm text-[#93600A] dark:text-[#F0CF85]">
              <FiAlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none" />
              {noSalary.map((p) => p.name).join(", ")} {noSalary.length === 1 ? "has" : "have"} no salary set, so base pay is 0. Set it in Employees.
            </p>
          )}
        </Panel>
      )}

      {/* ---------------- Step 3: pay items ---------------- */}
      {step === 2 && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {(["allowance", "deduction"] as const).map((kind) => {
            const list = general.filter((g) => g.kind === kind);
            return (
              <Panel
                key={kind}
                title={kind === "allowance" ? "Allowances for everyone" : "Deductions for everyone"}
                description={<>“Per month” multiplies by each person's months; “Once” is added a single time.</>}
                actions={
                  <Button size="sm" variant="secondary" icon={<FiPlus aria-hidden="true" />} onClick={() => addGeneral(kind)}>
                    Add
                  </Button>
                }
              >
                {list.length === 0 ? (
                  <p className="m-0 rounded-lg border border-dashed border-line px-4 py-4 text-center text-sm text-brand-muted">
                    None yet. {kind === "allowance" ? "e.g. Transport, Lunch" : "e.g. NSSF, Welfare"}
                  </p>
                ) : (
                  <ul className="m-0 list-none space-y-2 p-0">
                    {list.map((g) => (
                      <li key={g.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface-2 p-2">
                        <input data-item={g.id} aria-label="Name" placeholder={kind === "allowance" ? "e.g. Transport" : "e.g. NSSF"} value={g.name} onChange={(e) => updateGeneral(g.id, { name: e.target.value })} className={`${SMALL_INPUT} min-w-[140px] flex-1 basis-40`} />
                        <div className="relative w-[150px] flex-none">
                          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[11px] font-semibold text-brand-muted">UGX</span>
                          <input aria-label="Amount in shillings" inputMode="numeric" placeholder="0" value={g.amount ? g.amount.toLocaleString("en-UG") : ""} onChange={(e) => updateGeneral(g.id, { amount: Number(digits(e.target.value).slice(0, 12)) })} className={`${SMALL_INPUT} pl-11 text-right tabular-nums`} />
                        </div>
                        <div role="radiogroup" aria-label="How often" className="inline-flex h-10 flex-none rounded-lg border border-line bg-surface p-0.5">
                          {[
                            [true, "Per month"],
                            [false, "Once"],
                          ].map(([v, l]) => (
                            <button key={String(v)} type="button" role="radio" aria-checked={g.perMonth === v} onClick={() => updateGeneral(g.id, { perMonth: v as boolean })} className={`rounded-md px-2.5 text-xs font-medium ${g.perMonth === v ? "bg-subtle text-brand-text" : "text-brand-muted hover:text-brand-ink"}`}>
                              {l as string}
                            </button>
                          ))}
                        </div>
                        <button type="button" aria-label={`Remove ${g.name || kind}`} onClick={() => setGeneral((x) => x.filter((y) => y.id !== g.id))} className="flex h-10 w-10 flex-none items-center justify-center rounded-md text-brand-muted hover:bg-[#FDECEA] hover:text-[#B42318] dark:hover:bg-[#381B19]">
                          <FiTrash2 aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            );
          })}

          <Panel title="Missed-hours fine" description="Taken from attendance, only for the months each person is paid for. Leave empty for no fine.">
            <MoneyField label="Fine per missed hour" value={finePerHour} onChange={setFinePerHour} placeholder="0" className="sm:max-w-xs" />
          </Panel>

          <Panel title="Extras for one person" description="A bonus, an advance to recover, a loan repayment… added once to that person.">
            <ul className="m-0 max-h-[420px] list-none divide-y divide-line overflow-y-auto rounded-xl border border-line p-0">
              {results.map(({ person: p, r }) => {
                const items = personal[p.employeeId] ?? [];
                const expanded = openPerson === p.employeeId;
                return (
                  <li key={p.employeeId} className="bg-surface">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setOpenPerson(expanded ? null : p.employeeId)}
                      className="flex min-h-[52px] w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                    >
                      <FiChevronDown aria-hidden="true" className={`h-4 w-4 flex-none text-brand-muted transition-transform ${expanded ? "rotate-180" : ""}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-brand-ink">{p.name}</span>
                        <span className="block text-xs text-brand-muted">
                          {r.monthsPaid} {r.monthsPaid === 1 ? "month" : "months"}
                          {items.length > 0 && ` · ${items.length} extra ${items.length === 1 ? "item" : "items"}`}
                        </span>
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-brand-ink">{ugx(r.net)}</span>
                    </button>
                    {expanded && (
                      <div className="space-y-2 border-t border-line bg-surface-2 px-3.5 py-3">
                        {items.map((it) => (
                          <div key={it.id} className="flex flex-wrap items-center gap-2">
                            <div role="radiogroup" aria-label="Add or deduct" className="inline-flex h-10 flex-none rounded-lg border border-line bg-surface p-0.5">
                              {(["allowance", "deduction"] as const).map((k) => (
                                <button key={k} type="button" role="radio" aria-checked={it.kind === k} onClick={() => updatePersonal(p.employeeId, it.id, { kind: k })} className={`rounded-md px-2 text-xs font-medium ${it.kind === k ? (k === "allowance" ? "bg-[#E7F6EC] text-[#1E7B43] dark:bg-[#15301F] dark:text-[#8FD6A8]" : "bg-[#FDECEA] text-[#B42318] dark:bg-[#381B19] dark:text-[#F2A29A]") : "text-brand-muted"}`}>
                                  {k === "allowance" ? "+ Add" : "− Deduct"}
                                </button>
                              ))}
                            </div>
                            <input aria-label="What for" placeholder="What for" value={it.name} onChange={(e) => updatePersonal(p.employeeId, it.id, { name: e.target.value })} className={`${SMALL_INPUT} min-w-[120px] flex-1 basis-32`} />
                            <input aria-label="Amount in shillings" inputMode="numeric" placeholder="UGX" value={it.amount ? it.amount.toLocaleString("en-UG") : ""} onChange={(e) => updatePersonal(p.employeeId, it.id, { amount: Number(digits(e.target.value).slice(0, 12)) })} className={`${SMALL_INPUT} w-32 flex-none text-right tabular-nums`} />
                            <button type="button" aria-label="Remove" onClick={() => removePersonal(p.employeeId, it.id)} className="flex h-10 w-10 flex-none items-center justify-center rounded-md text-brand-muted hover:bg-[#FDECEA] hover:text-[#B42318] dark:hover:bg-[#381B19]">
                              <FiTrash2 aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="ghost" icon={<FiPlus aria-hidden="true" />} onClick={() => addPersonal(p.employeeId, "allowance")}>
                            Add to pay
                          </Button>
                          <Button size="sm" variant="ghost" icon={<FiPlus aria-hidden="true" />} onClick={() => addPersonal(p.employeeId, "deduction")}>
                            Deduct from pay
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      )}

      {/* ---------------- Step 4: review ---------------- */}
      {step === 3 && (
        <Panel title="Check before saving" description="Nothing is saved until you press Save payroll.">
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["People", String(results.length)],
              ["Paid months", String(personMonths)],
              ["Pay date", fmtDate(payDate)],
              ["Total to pay", ugx(total)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-line bg-surface-2 px-4 py-3">
                <p className="m-0 text-xs font-medium uppercase tracking-wide text-brand-muted">{label}</p>
                <p className="m-0 mt-1 font-display text-lg font-semibold tabular-nums text-brand-ink sm:text-xl">{value}</p>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead className="bg-surface-2">
                <tr className="border-b border-line text-xs uppercase tracking-wide text-brand-muted">
                  <th scope="col" className="px-3 py-2.5 text-left font-medium">Person</th>
                  <th scope="col" className="px-3 py-2.5 text-left font-medium">Months</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Base</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Allowances</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Deductions</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Net pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {results.map(({ person: p, paidMonths, r }) => (
                  <Fragment key={p.employeeId}>
                    <tr className="bg-surface">
                      <td className="px-3 py-2.5">
                        <span className="block font-medium text-brand-ink">{p.name}</span>
                        <span className="block text-xs text-brand-muted">{ugx(p.salary)}/month</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {paidMonths.map((m) => (
                            <Badge key={m.month} tone="brand">{m.label}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">{ugx(r.base)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">{r.totalAllowances ? `+ ${ugx(r.totalAllowances)}` : "—"}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">
                        {r.totalDeductions ? `− ${ugx(r.totalDeductions)}` : "—"}
                        {r.fine > 0 && <span className="block text-xs text-brand-muted">incl. fine {ugx(r.fine)} ({r.missedHours}h)</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-brand-ink">
                        {ugx(r.net)}
                        {r.shortfall > 0 && <span className="block text-xs font-medium text-[#B42318] dark:text-[#F2A29A]">deductions exceed pay by {ugx(r.shortfall)}</span>}
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-line bg-surface-2">
                  <th scope="row" colSpan={5} className="px-3 py-3 text-right text-sm font-semibold text-brand-ink">Total</th>
                  <td className="px-3 py-3 text-right font-display text-base font-semibold tabular-nums text-brand-ink">{ugx(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Panel>
      )}

      {/* Sticky action bar */}
      <div className="sticky bottom-3 z-20 mt-6 rounded-xl border border-line bg-surface/95 shadow-pop backdrop-blur">
        <div className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
          <div className="min-w-0 flex-1 text-sm text-brand-muted">
            {step >= 1 ? (
              <span className="block truncate">
                <strong className="font-semibold text-brand-ink">{included.length}</strong> {included.length === 1 ? "person" : "people"}
                <span className="hidden sm:inline"> · <strong className="font-semibold text-brand-ink">{personMonths}</strong> paid months</span> ·{" "}
                <strong className="font-semibold tabular-nums text-brand-ink">{ugx(total)}</strong>
              </span>
            ) : (
              <span className="hidden sm:inline">{periodError ?? `${periodMonths.length} ${periodMonths.length === 1 ? "month" : "months"}, paid ${fmtDate(payDate)}`}</span>
            )}
          </div>
          {step === 0 ? (
            <Button variant="secondary" onClick={leave}>
              Cancel
            </Button>
          ) : (
            <Button variant="secondary" icon={<FiChevronLeft aria-hidden="true" />} onClick={() => setStep(step - 1)} disabled={saving}>
              Back
            </Button>
          )}
          {step === 0 && (
            <Button onClick={loadPeople} loading={loading} disabled={!!periodError}>
              Next <FiChevronRight aria-hidden="true" />
            </Button>
          )}
          {(step === 1 || step === 2) && (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext}>
              Next <FiChevronRight aria-hidden="true" />
            </Button>
          )}
          {step === 3 && (
            <Button onClick={save} loading={saving} disabled={results.length === 0} icon={<FiCheck aria-hidden="true" />}>
              Save payroll
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RunPayroll;
