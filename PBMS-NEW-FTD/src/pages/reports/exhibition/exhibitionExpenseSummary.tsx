import { useState } from "react";
import { StatTile } from "../../../ui/Page";
import { Bars, day, label, money, num, ReportPage, ReportState, ReportTable, Section, Stats, usePdfExport, useReport } from "../kit";
import { ExhibitionFilter } from "./exhibitionSelector";

type Expense = { id: number; category: string; title: string; description?: string | null; amount: number; dateIncurred: string; exhibition?: { id: number; name: string } };
type Data = {
  expenses: Expense[];
  summary: { totalExpenses: number; totalExpenseCount: number; expensesByCategory: Array<{ category: string; totalAmount: number; count: number }> };
  exhibition: { id: number; name: string } | null;
};

/** What exhibitions cost, by category. */
const ExhibitionExpensesSummaryReport = () => {
  const [expoId, setExpoId] = useState("");
  const params = { expoId };
  const { data, loading, error, reload } = useReport<Data>("/api/reports/exhibition-expenses-summary", params);
  const { exporting, exportPdf } = usePdfExport();
  const s = data?.summary;
  const cats = [...(s?.expensesByCategory ?? [])].sort((a, b) => num(b.totalAmount) - num(a.totalAmount));

  return (
    <ReportPage
      title="Exhibition expenses"
      description={data?.exhibition?.name ?? (expoId ? "" : "All exhibitions")}
      filters={<ExhibitionFilter value={expoId} onChange={setExpoId} />}
      onRefresh={reload}
      loading={loading}
      onExport={() => exportPdf("/api/reports/exhibition/expenses-summary/print", params, "exhibition-expenses.pdf")}
      exporting={exporting}
      canExport={!!data && data.expenses.length > 0}
    >
      <ReportState loading={loading} error={error} onRetry={reload} hasData={!!data && data.expenses.length > 0} empty={{ title: "No expenses recorded" }}>
        {s && data && (
          <>
            <Stats>
              <StatTile label="Total spent" value={money(s.totalExpenses)} />
              <StatTile label="Expenses" value={s.totalExpenseCount} />
              <StatTile label="Categories" value={cats.length} />
              <StatTile label="Biggest category" value={<span className="text-lg">{cats[0] ? label(cats[0].category) : "—"}</span>} hint={cats[0] ? money(cats[0].totalAmount) : undefined} />
            </Stats>
            <Section title="By category">
              <Bars items={cats.map((c) => ({ label: label(c.category), value: num(c.totalAmount), hint: `${c.count} expense(s)` }))} />
            </Section>
            <Section title="Expenses" meta={`${data.expenses.length}`} flush>
              <ReportTable<Expense>
                rows={data.expenses}
                rowKey={(r) => r.id}
                initialSort={{ key: "dateIncurred", dir: "desc" }}
                columns={[
                  { key: "dateIncurred", header: "Date", render: (r) => day(r.dateIncurred) },
                  { key: "title", header: "Expense", render: (r) => (<><span className="block text-brand-ink">{r.title}</span>{r.description && <span className="block text-xs text-brand-muted">{r.description}</span>}</>) },
                  { key: "category", header: "Category", render: (r) => label(r.category) },
                  ...(expoId ? [] : [{ key: "exhibition.name", header: "Exhibition", render: (r: Expense) => r.exhibition?.name ?? "—" }]),
                  { key: "amount", header: "Amount", align: "right" as const, render: (r) => money(r.amount), total: money(s.totalExpenses) },
                ]}
              />
            </Section>
          </>
        )}
      </ReportState>
    </ReportPage>
  );
};

export default ExhibitionExpensesSummaryReport;
