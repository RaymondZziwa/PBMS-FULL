import { useMemo, useState } from "react";
import { StatTile } from "../../../ui/Page";
import { Bars, count, dateTime, label, money, num, person, ReportPage, ReportState, ReportTable, Section, Stats, Status, usePdfExport, useReport } from "../kit";
import { ExhibitionFilter } from "./exhibitionSelector";

type Item = { id: number | string; name: string; quantity: number; total: number; category?: { name?: string } };
type Sale = { id: number; items: Item[]; total: string | number; balance: string | number; status: string; paymentMethods: Array<{ type: string; amount: number }>; createdAt: string; client?: { firstName: string; lastName: string } | null; exhibitionStore?: { name: string } };
type Data = { sales: Sale[]; summary: { totalAmount: number; totalSales: number }; exhibition: { id: number; name: string } | null };
type Product = { id: string; name: string; qty: number; revenue: number };

/** Every sale made at an exhibition, with top products and payments. */
const ExhibitionSalesSummaryReport = () => {
  const [expoId, setExpoId] = useState("");
  const params = { expoId };
  const { data, loading, error, reload } = useReport<Data>("/api/reports/exhibition-sales-summary", params);
  const { exporting, exportPdf } = usePdfExport();
  const sales = data?.sales ?? [];

  const { products, payments, balance } = useMemo(() => {
    const p = new Map<string, Product>();
    const pay = new Map<string, number>();
    let bal = 0;
    for (const s of sales) {
      bal += num(s.balance);
      (Array.isArray(s.items) ? s.items : []).forEach((i) => {
        const k = String(i.id);
        const cur = p.get(k) ?? { id: k, name: i.name, qty: 0, revenue: 0 };
        cur.qty += num(i.quantity);
        cur.revenue += num(i.total);
        p.set(k, cur);
      });
      (Array.isArray(s.paymentMethods) ? s.paymentMethods : []).forEach((m) => pay.set(m.type, (pay.get(m.type) ?? 0) + num(m.amount)));
    }
    return {
      products: [...p.values()].sort((a, b) => b.revenue - a.revenue),
      payments: [...pay.entries()].map(([k, v]) => ({ label: label(k), value: v })).sort((a, b) => b.value - a.value),
      balance: bal,
    };
  }, [sales]);

  return (
    <ReportPage
      title="Exhibition sales"
      description={data?.exhibition?.name ?? (expoId ? "" : "All exhibitions")}
      filters={<ExhibitionFilter value={expoId} onChange={setExpoId} />}
      onRefresh={reload}
      loading={loading}
      onExport={() => exportPdf("/api/reports/exhibition/sales-summary/print", params, "exhibition-sales.pdf")}
      exporting={exporting}
      canExport={sales.length > 0}
    >
      <ReportState loading={loading} error={error} onRetry={reload} hasData={sales.length > 0} empty={{ title: "No sales at this exhibition" }}>
        {data && (
          <>
            <Stats>
              <StatTile label="Revenue" value={money(data.summary.totalAmount)} />
              <StatTile label="Sales" value={data.summary.totalSales} />
              <StatTile label="Average sale" value={money(data.summary.totalSales ? data.summary.totalAmount / data.summary.totalSales : 0)} />
              <StatTile label="Balance due" value={money(balance)} />
            </Stats>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Section title="Top products">
                <Bars items={products.slice(0, 8).map((p) => ({ label: p.name, value: p.revenue, hint: `${count(p.qty)} sold` }))} />
              </Section>
              <Section title="Payment methods">
                {payments.length ? <Bars items={payments} /> : <p className="m-0 text-sm text-brand-muted">No payments recorded.</p>}
              </Section>
            </div>
            <Section title="Sales" meta={`${sales.length}`} flush>
              <ReportTable<Sale>
                rows={sales}
                rowKey={(r) => r.id}
                columns={[
                  { key: "createdAt", header: "Date", render: (r) => dateTime(r.createdAt) },
                  { key: "client", header: "Client", render: (r) => person(r.client, "Walk-in"), sortValue: (r) => person(r.client, "Walk-in") },
                  { key: "exhibitionStore.name", header: "Stand", render: (r) => r.exhibitionStore?.name ?? "—" },
                  { key: "items", header: "Items", align: "right", render: (r) => (Array.isArray(r.items) ? r.items.reduce((a, i) => a + num(i.quantity), 0) : 0), sortValue: (r) => (Array.isArray(r.items) ? r.items.length : 0) },
                  { key: "status", header: "Status", render: (r) => <Status value={r.status} /> },
                  { key: "total", header: "Amount", align: "right", render: (r) => money(r.total), sortValue: (r) => num(r.total), total: money(data.summary.totalAmount) },
                ]}
              />
            </Section>
          </>
        )}
      </ReportState>
    </ReportPage>
  );
};

export default ExhibitionSalesSummaryReport;
