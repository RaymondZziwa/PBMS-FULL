/**
 * Payroll arithmetic, kept apart from the screens so it can be tested.
 *
 * A payroll covers a period of whole months (e.g. May–July, paid at the end of July).
 * Each person is paid only for the months ticked for them:
 *   base      = monthly salary × months paid
 *   allowance = general allowances (× months when "per month") + their own allowances
 *   deduction = general deductions (× months when "per month") + their own deductions
 *             + missed-hours fine (only for the months paid)
 *   net       = base + allowances − deductions   (never below zero; shortfall is reported)
 */

export type PeriodMonth = { month: string; label: string; days: number };

export type MonthAttendance = PeriodMonth & {
  expectedHours: number;
  workedHours: number;
  missedHours: number;
};

export type GeneralItem = {
  id: string;
  kind: "allowance" | "deduction";
  name: string;
  amount: number;
  /** true: amount × months paid; false: once per payroll */
  perMonth: boolean;
};

export type PersonalItem = { id: string; kind: "allowance" | "deduction"; name: string; amount: number };

export type PersonInput = {
  monthlySalary: number;
  /** Attendance for the months this person is paid for. */
  paidMonths: MonthAttendance[];
  general: GeneralItem[];
  personal: PersonalItem[];
  finePerMissedHour: number;
};

export type LineItem = { name: string; amount: number; unitAmount?: number; perMonth?: boolean };

export type PersonResult = {
  monthsPaid: number;
  base: number;
  missedHours: number;
  workedHours: number;
  expectedHours: number;
  fine: number;
  generalAllowances: LineItem[];
  generalDeductions: LineItem[];
  employeeAllowances: LineItem[];
  employeeDeductions: LineItem[];
  totalAllowances: number;
  /** Includes the fine. */
  totalDeductions: number;
  gross: number;
  net: number;
  /** How much deductions exceed gross pay (net was held at 0). */
  shortfall: number;
};

const money = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export const computePerson = ({ monthlySalary, paidMonths, general, personal, finePerMissedHour }: PersonInput): PersonResult => {
  const monthsPaid = paidMonths.length;
  const base = money(monthlySalary * monthsPaid);
  const missedHours = money(sum(paidMonths.map((m) => m.missedHours)));
  const workedHours = money(sum(paidMonths.map((m) => m.workedHours)));
  const expectedHours = money(sum(paidMonths.map((m) => m.expectedHours)));
  const fine = monthsPaid === 0 ? 0 : money(missedHours * Math.max(0, finePerMissedHour || 0));

  const scaled = (g: GeneralItem): LineItem => ({
    name: g.name.trim() || (g.kind === "allowance" ? "Allowance" : "Deduction"),
    amount: money(g.amount * (g.perMonth ? monthsPaid : 1)),
    unitAmount: money(g.amount),
    perMonth: g.perMonth,
  });
  const usable = (x: { amount: number }) => Number.isFinite(x.amount) && x.amount > 0;

  const generalAllowances = monthsPaid ? general.filter((g) => g.kind === "allowance" && usable(g)).map(scaled) : [];
  const generalDeductions = monthsPaid ? general.filter((g) => g.kind === "deduction" && usable(g)).map(scaled) : [];
  const own = (kind: "allowance" | "deduction") =>
    personal.filter((p) => p.kind === kind && usable(p)).map((p) => ({ name: p.name.trim() || (kind === "allowance" ? "Allowance" : "Deduction"), amount: money(p.amount) }));
  const employeeAllowances = monthsPaid ? own("allowance") : [];
  const employeeDeductions = monthsPaid ? own("deduction") : [];

  const totalAllowances = money(sum([...generalAllowances, ...employeeAllowances].map((x) => x.amount)));
  const totalDeductions = money(fine + sum([...generalDeductions, ...employeeDeductions].map((x) => x.amount)));
  const gross = money(base + totalAllowances);
  const raw = money(gross - totalDeductions);

  return {
    monthsPaid,
    base,
    missedHours,
    workedHours,
    expectedHours,
    fine,
    generalAllowances,
    generalDeductions,
    employeeAllowances,
    employeeDeductions,
    totalAllowances,
    totalDeductions,
    gross,
    net: Math.max(0, raw),
    shortfall: raw < 0 ? -raw : 0,
  };
};

/** "2026-05" → first day; "2026-07" → last day, as YYYY-MM-DD. */
export const monthStart = (ym: string) => `${ym}-01`;
export const monthEnd = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${ym}-${String(last).padStart(2, "0")}`;
};

/** Months from start to end inclusive, as YYYY-MM. */
export const monthsBetween = (startYm: string, endYm: string): string[] => {
  const [sy, sm] = startYm.split("-").map(Number);
  const [ey, em] = endYm.split("-").map(Number);
  const out: string[] = [];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    if (out.length > 60) break;
  }
  return out;
};

const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-09" → "Sep 2026" (or "September 2026"). Fixed names so every browser shows the same. */
export const monthLabel = (ym: string, style: "short" | "long" = "short") => {
  const [y, m] = ym.split("-").map(Number);
  return `${(style === "long" ? LONG : SHORT)[m - 1] ?? ""} ${y}`;
};

/** Is this month only partly inside the period? (e.g. 15 Sep – 14 Nov) */
export const isPartialMonth = (m: PeriodMonth) => {
  const [y, mo] = m.month.split("-").map(Number);
  return m.days < new Date(Date.UTC(y, mo, 0)).getUTCDate();
};
