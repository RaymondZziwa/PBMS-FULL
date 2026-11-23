import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import Combobox from "../../../ui/Combobox";
import { StatTile } from "../../../ui/Page";
import useBranches from "../../../hooks/settings/useBranches";
import type { RootState } from "../../../redux/store";
import { Bars, day, DateRange, label, money, monthStartISO, num, periodText, person, ReportPage, ReportState, ReportTable, Section, Stats, todayISO, usePdfExport, useReport } from "../kit";

type Expense = { id: number; category: string; title: string; description?: string | null; amount: number; dateIncurred: string; employee?: { firstName: string; lastName: string } | null; branch?: { name: string } | null };
type Group = { category: string; totalAmount: number; expenseCount: number; expenses: Expense[] };
type Data = { totalCategories: number; totalAmount: number; data: Group[] };

const CATEGORIES = "RENT UTILITIES SALARIES SUPPLIES MAINTENANCE TRANSPORT INSURANCE MARKETING TRAINING TAXES MEDICAL_SUPPLIES OFFICE_SUPPLIES EQUIPMENT_PURCHASE EQUIPMENT_REPAIR CLEANING SECURITY INTERNET WATER ELECTRICITY COMMUNICATION SOFTWARE_SUBSCRIPTIONS MISCELLANEOUS".split(" ");

/** Branch spending by category. */
const ExpensesReport = () => {
  const myBranch = useSelector((s: RootState) => (s.userAuth?.data as { branch?: { id?: number } } | null)?.branch?.id);
  const { data: branches = [] } = useBranches();
  const [branchId, setBranchId] = useState(myBranch ? String(myBranch) : "");
  const [category, setCategory] = useState("");
  const [range, setRange] = useState({ start: monthStartISO(), end: todayISO() });

  const branchOptions = useMemo(() => [{ value: "", label: "All branches" }, ...branches.map((b) => ({ value: String(b.id), label: b.name }))], [branches]);
  const catOptions = useMemo(() => [{ value: "", label: "All categories" }, ...CATEGORIES.map((c) => ({ value: c, label: label(c) }))], []);

  const params = { branchId, category, startDate: range.start, endDate: range.end };
  // This endpoint returns { totalAmount, data: [...] } at the top level.
  const { data, loading, error, reload } = useReport<Data>("/api/reports/expenses/expenses-report", params, { unwrap: false });
  const { exporting, exportPdf } = usePdfExport();
  const groups = useMemo(() => [...(data?.data ?? [])].sort((a, b) => num(b.totalAmount) - num(a.totalAmount)), [data]);
  const all = useMemo(() => groups.flatMap((g) => g.expenses), [groups]);
  const branchName = branchOptions.find((b) => b.value === branchId)?.label;

  return (
    <ReportPage
      title="Expense report"
      description={`${branchName ?? "All branches"} · ${periodText(range.start, range.end)}`}
      filters={
        <>
          <Combobox label="Branch" value={branchId} onChange={setBranchId} options={branchOptions} placeholder="All branches" />
          <Combobox label="Category" value={category} onChange={setCategory} options={catOptions} placeholder="All categories" searchPlaceholder="Search categories" />
          <DateRange start={range.start} end={range.end} onChange={setRange} />
        </>
      }
      onRefresh={reload}
      loading={loading}
      onExport={() => exportPdf("/api/reports/expenses/export-report", params, "expenses.pdf")}
      exporting={exporting}
      canExport={!!data}
    >
      <ReportState loading={loading} error={error} onRetry={reload} hasData={!!data && all.length > 0} empty={{ title: "No expenses in this period" }}>
        {data && (
          <>
            <Stats>
              <StatTile label="Total spent" value={money(data.totalAmount)} />
              <StatTile label="Expenses" value={all.length} />
              <StatTile label="Categories" value={data.totalCategories} />
              <StatTile label="Biggest category" value={<span className="text-lg">{groups[0] ? label(groups[0].category) : "—"}</span>} hint={groups[0] ? money(groups[0].totalAmount) : undefined} />
            </Stats>
            <Section title="By category">
              <Bars items={groups.map((g) => ({ label: label(g.category), value: num(g.totalAmount), hint: `${g.expenseCount} expense(s)` }))} />
            </Section>
            <Section title="Expenses" meta={`${all.length}`} flush>
              <ReportTable<Expense>
                rows={all}
                rowKey={(r) => r.id}
                initialSort={{ key: "dateIncurred", dir: "desc" }}
                columns={[
                  { key: "dateIncurred", header: "Date", render: (r) => day(r.dateIncurred) },
                  { key: "title", header: "Expense", render: (r) => (<><span className="block text-brand-ink">{r.title}</span>{r.description && <span className="block text-xs text-brand-muted">{r.description}</span>}</>) },
                  { key: "category", header: "Category", render: (r) => label(r.category) },
                  { key: "branch.name", header: "Branch", render: (r) => r.branch?.name ?? "—" },
                  { key: "employee", header: "Recorded by", render: (r) => person(r.employee), sortValue: (r) => person(r.employee) },
                  { key: "amount", header: "Amount", align: "right", render: (r) => money(r.amount), total: money(data.totalAmount) },
                ]}
              />
            </Section>
          </>
        )}
      </ReportState>
    </ReportPage>
  );
};

export default ExpensesReport;
