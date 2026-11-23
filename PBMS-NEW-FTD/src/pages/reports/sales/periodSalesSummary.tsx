import { useEffect, useState } from "react";
import { StatTile } from "../../../ui/Page";
import { DateRange, day, money, monthStartISO, num, periodText, person, ReportPage, ReportState, ReportTable, Section, Stats, Status, StoreFilter, todayISO, usePdfExport, useReport, dateTime } from "../kit";

type Sale = { id: number; total: string | number; balance: string | number; status: string; createdAt: string; client?: { firstName: string; lastName: string } | null };
type DayRow = { date: string; revenue: number; salesCount: number; paidAmount: number };
type Data = {
  sales: Sale[];
  summary: { totalRevenue: number; totalPaid: number; totalBalance: number; totalSales: number; averageSale: number };
  dailyBreakdown: DayRow[];
  store: { id: number; name: string } | null;
};

const KEY = "report.store";

/** One store over a period, day by day. */
const PeriodSalesSummaryReport = () => {
  const [store, setStore] = useState(() => localStorage.getItem(KEY) ?? "");
  const [range, setRange] = useState({ start: monthStartISO(), end: todayISO() });
  useEffect(() => { if (store) localStorage.setItem(KEY, store); }, [store]);

  const params = { storeId: store, startDate: range.start, endDate: range.end };
  const { data, loading, error, reload } = useReport<Data>(store ? "/api/reports/period-summary" : null, params);
  const { exporting, exportPdf } = usePdfExport();
  const s = data?.summary;
  const days = [...(data?.dailyBreakdown ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  const best = days.reduce<DayRow | null>((b, d) => (!b || d.revenue > b.revenue ? d : b), null);

  return (
    <ReportPage
      title="Period sales summary"
      description={`${data?.store?.name ?? "Choose a store"} · ${periodText(range.start, range.end)}`}
      filters={
        <>
          <StoreFilter value={store} onChange={setStore} />
          <DateRange start={range.start} end={range.end} onChange={setRange} />
        </>
      }
      onRefresh={store ? reload : undefined}
      loading={loading}
      onExport={() => exportPdf("/api/reports/export/period-summary", params, "period-sales.pdf")}
      exporting={exporting}
      canExport={!!store && !!data}
    >
      <ReportState loading={loading} error={error} onRetry={reload} waitingFor={!store ? "Choose a store to see its sales" : null} hasData={!!data}>
        {s && data && (
          <>
            <Stats>
              <StatTile label="Revenue" value={money(s.totalRevenue)} hint={`${s.totalSales} sale(s)`} />
              <StatTile label="Average sale" value={money(s.averageSale)} />
              <StatTile label="Collected" value={money(s.totalPaid)} />
              <StatTile label="Balance due" value={money(s.totalBalance)} hint={best ? `Best day: ${day(best.date)}` : undefined} />
            </Stats>
            <Section title="Day by day" meta={`${days.length} day(s) with sales`} flush>
              <ReportTable<DayRow>
                rows={days}
                rowKey={(r) => r.date}
                columns={[
                  { key: "date", header: "Date", render: (r) => day(r.date) },
                  { key: "salesCount", header: "Sales", align: "right", total: s.totalSales },
                  { key: "revenue", header: "Revenue", align: "right", render: (r) => money(r.revenue), total: money(s.totalRevenue) },
                  { key: "paidAmount", header: "Collected", align: "right", render: (r) => money(r.paidAmount), total: money(s.totalPaid) },
                ]}
              />
            </Section>
            <Section title="Sales" meta={`${data.sales.length}`} flush>
              <ReportTable<Sale>
                rows={data.sales}
                rowKey={(r) => r.id}
                columns={[
                  { key: "createdAt", header: "Date", render: (r) => dateTime(r.createdAt) },
                  { key: "client", header: "Client", render: (r) => person(r.client, "Walk-in"), sortValue: (r) => person(r.client, "Walk-in") },
                  { key: "status", header: "Status", render: (r) => <Status value={r.status} /> },
                  { key: "total", header: "Amount", align: "right", render: (r) => money(r.total), sortValue: (r) => num(r.total) },
                  { key: "balance", header: "Balance", align: "right", render: (r) => money(r.balance), sortValue: (r) => num(r.balance) },
                ]}
              />
            </Section>
          </>
        )}
      </ReportState>
    </ReportPage>
  );
};

export default PeriodSalesSummaryReport;
