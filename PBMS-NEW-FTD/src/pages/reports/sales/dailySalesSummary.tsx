import { useEffect, useState } from "react";
import { DatePicker, formatDate } from "../../../ui/DateFields";
import { StatTile } from "../../../ui/Page";
import { Bars, label, money, person, ReportPage, ReportState, ReportTable, Section, Stats, Status, StoreFilter, time, todayISO, usePdfExport, useReport, num } from "../kit";

type Sale = {
  id: number;
  total: string | number;
  balance: string | number;
  status: string;
  createdAt: string;
  client?: { firstName: string; lastName: string } | null;
  employee?: { firstName: string; lastName: string } | null;
};
type Data = {
  sales: Sale[];
  summary: { totalRevenue: number; totalPaid: number; totalBalance: number; totalSales: number; salesByStatus: Record<string, number>; paymentMethods: Array<{ type: string; amount: number; count: number }> };
  store: { id: number; name: string } | null;
};

const KEY = "report.store";

/** One store, one day. */
const DailySalesSummaryReport = () => {
  const [store, setStore] = useState(() => localStorage.getItem(KEY) ?? "");
  const [date, setDate] = useState(todayISO());
  useEffect(() => { if (store) localStorage.setItem(KEY, store); }, [store]);

  const params = { storeId: store, date };
  const { data, loading, error, reload } = useReport<Data>(store ? "/api/reports/sales/daily-summary" : null, params);
  const { exporting, exportPdf } = usePdfExport();
  const s = data?.summary;

  return (
    <ReportPage
      title="Daily sales summary"
      description={data?.store ? `${data.store.name} · ${formatDate(date)}` : "Takings, payment methods and every sale for one store on one day."}
      filters={
        <>
          <StoreFilter value={store} onChange={setStore} />
          <DatePicker label="Date" value={date} max={todayISO()} onChange={setDate} />
        </>
      }
      onRefresh={store ? reload : undefined}
      loading={loading}
      onExport={() => exportPdf("/api/reports/export/daily-summary", params, `daily-sales-${date}.pdf`)}
      exporting={exporting}
      canExport={!!store && !!data}
    >
      <ReportState loading={loading} error={error} onRetry={reload} waitingFor={!store ? "Choose a store to see its sales" : null} hasData={!!data}>
        {s && data && (
          <>
            <Stats>
              <StatTile label="Revenue" value={money(s.totalRevenue)} hint="Gross sales" />
              <StatTile label="Sales" value={s.totalSales} hint="Transactions" />
              <StatTile label="Collected" value={money(s.totalPaid)} />
              <StatTile label="Balance due" value={money(s.totalBalance)} hint="Owed by clients" />
            </Stats>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Section title="Payment methods">
                {s.paymentMethods.length ? (
                  <Bars items={s.paymentMethods.map((m) => ({ label: label(m.type), value: num(m.amount), hint: `${m.count} payment(s)` }))} />
                ) : (
                  <p className="m-0 text-sm text-brand-muted">No payments recorded.</p>
                )}
              </Section>
              <Section title="Payment status">
                {Object.keys(s.salesByStatus).length ? (
                  <Bars format={(v) => `${v} sale(s)`} items={Object.entries(s.salesByStatus).map(([k, v]) => ({ label: label(k), value: v }))} />
                ) : (
                  <p className="m-0 text-sm text-brand-muted">No sales.</p>
                )}
              </Section>
            </div>
            <Section title="Sales" meta={`${data.sales.length}`} flush>
              <ReportTable<Sale>
                rows={data.sales}
                rowKey={(r) => r.id}
                empty="No sales on this day."
                columns={[
                  { key: "createdAt", header: "Time", render: (r) => time(r.createdAt) },
                  { key: "client", header: "Client", render: (r) => person(r.client, "Walk-in"), sortValue: (r) => person(r.client, "Walk-in") },
                  { key: "employee", header: "Served by", render: (r) => person(r.employee), sortValue: (r) => person(r.employee) },
                  { key: "status", header: "Status", render: (r) => <Status value={r.status} /> },
                  { key: "total", header: "Amount", align: "right", render: (r) => money(r.total), sortValue: (r) => num(r.total), total: money(s.totalRevenue) },
                  { key: "balance", header: "Balance", align: "right", render: (r) => money(r.balance), sortValue: (r) => num(r.balance), total: money(s.totalBalance) },
                ]}
              />
            </Section>
          </>
        )}
      </ReportState>
    </ReportPage>
  );
};

export default DailySalesSummaryReport;
