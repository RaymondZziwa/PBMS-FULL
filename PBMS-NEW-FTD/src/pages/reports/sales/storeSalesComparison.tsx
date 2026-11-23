import { useState } from "react";
import { StatTile } from "../../../ui/Page";
import { Bars, DateRange, money, monthStartISO, num, pct, periodText, ReportPage, ReportState, ReportTable, Section, Stats, todayISO, usePdfExport, useReport } from "../kit";

type StoreRow = { id: number; name: string; totalRevenue: number; salesCount: number; totalPaid: number; totalBalance: number; revenueShare: number };
type Data = { stores: StoreRow[]; summary: { totalRevenue: number; totalSales: number; storeCount: number } };

/** Every store over the same period. */
const StoreSalesComparisonReport = () => {
  const [range, setRange] = useState({ start: monthStartISO(), end: todayISO() });
  const params = { startDate: range.start, endDate: range.end };
  const { data, loading, error, reload } = useReport<Data>("/api/reports/sales/store-comparison", params);
  const { exporting, exportPdf } = usePdfExport();
  const s = data?.summary;
  const stores = data?.stores ?? [];
  const top = stores[0];

  return (
    <ReportPage
      title="Store sales comparison"
      description={periodText(range.start, range.end)}
      filters={<DateRange start={range.start} end={range.end} onChange={setRange} />}
      onRefresh={reload}
      loading={loading}
      onExport={() => exportPdf("/api/reports/export/store-comparison", params, "store-comparison.pdf")}
      exporting={exporting}
      canExport={!!data}
    >
      <ReportState loading={loading} error={error} onRetry={reload} hasData={!!data && stores.length > 0} empty={{ title: "No sales in this period" }}>
        {s && (
          <>
            <Stats>
              <StatTile label="Revenue" value={money(s.totalRevenue)} />
              <StatTile label="Sales" value={s.totalSales} />
              <StatTile label="Stores with sales" value={s.storeCount} />
              <StatTile label="Top store" value={<span className="text-lg">{top?.name ?? "—"}</span>} hint={top ? `${pct(top.revenueShare)} of revenue` : undefined} />
            </Stats>
            <Section title="Revenue by store">
              <Bars items={stores.map((x) => ({ label: x.name, value: num(x.totalRevenue), hint: `${x.salesCount} sale(s)` }))} />
            </Section>
            <Section title="Details" flush>
              <ReportTable<StoreRow>
                rows={stores}
                rowKey={(r) => r.id}
                initialSort={{ key: "totalRevenue", dir: "desc" }}
                columns={[
                  { key: "name", header: "Store" },
                  { key: "salesCount", header: "Sales", align: "right", total: s.totalSales },
                  { key: "totalRevenue", header: "Revenue", align: "right", render: (r) => money(r.totalRevenue), total: money(s.totalRevenue) },
                  { key: "totalPaid", header: "Collected", align: "right", render: (r) => money(r.totalPaid), total: money(stores.reduce((a, r) => a + num(r.totalPaid), 0)) },
                  { key: "totalBalance", header: "Balance", align: "right", render: (r) => money(r.totalBalance), total: money(stores.reduce((a, r) => a + num(r.totalBalance), 0)) },
                  { key: "revenueShare", header: "Share", align: "right", render: (r) => pct(r.revenueShare) },
                ]}
              />
            </Section>
          </>
        )}
      </ReportState>
    </ReportPage>
  );
};

export default StoreSalesComparisonReport;
