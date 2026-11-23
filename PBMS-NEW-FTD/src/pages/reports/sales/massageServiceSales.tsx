import { useMemo, useState } from "react";
import Combobox from "../../../ui/Combobox";
import { StatTile } from "../../../ui/Page";
import { Bars, count, dateTime, DateRange, money, monthStartISO, num, periodText, person, ReportPage, ReportState, ReportTable, Section, Stats, Status, todayISO, usePdfExport, useReport } from "../kit";

type Item = { name?: string; serviceName?: string; quantity?: number };
type Sale = { id: number; createdAt: string; client?: { firstName: string; lastName: string } | null; employee?: { firstName: string; lastName: string } | null; items: Item[]; total: number; balance: number; paid: number; status: string };
type Service = { id: number | string; name: string; price: number; totalRevenue: number; salesCount: number; totalQuantity: number };
type Data = { sales: Sale[]; summary: { totalRevenue: number; totalPaid: number; totalBalance: number; totalSales: number; averageSale: number }; servicePerformance: Service[] };

/** Massage service sales and the best-performing services. */
const MassageServiceSalesReport = () => {
  const [serviceId, setServiceId] = useState("");
  const [range, setRange] = useState({ start: monthStartISO(), end: todayISO() });
  const { data: services } = useReport<Array<{ id: number; name: string; price: number }>>("/api/reports/massage-services/list");
  const options = useMemo(() => [{ value: "", label: "All services" }, ...(services ?? []).map((x) => ({ value: String(x.id), label: x.name, hint: money(x.price) }))], [services]);

  const params = { serviceId, startDate: range.start, endDate: range.end };
  const { data, loading, error, reload } = useReport<Data>("/api/reports/massage-services", params);
  const { exporting, exportPdf } = usePdfExport();
  const s = data?.summary;

  return (
    <ReportPage
      title="Massage services"
      description={periodText(range.start, range.end)}
      filters={
        <>
          <Combobox label="Service" value={serviceId} onChange={setServiceId} options={options} placeholder="All services" searchPlaceholder="Search services" />
          <DateRange start={range.start} end={range.end} onChange={setRange} />
        </>
      }
      onRefresh={reload}
      loading={loading}
      onExport={() => exportPdf("/api/reports/export/massage-services", params, "massage-services.pdf")}
      exporting={exporting}
      canExport={!!data}
    >
      <ReportState loading={loading} error={error} onRetry={reload} hasData={!!data && data.sales.length > 0} empty={{ title: "No service sales in this period" }}>
        {s && data && (
          <>
            <Stats>
              <StatTile label="Revenue" value={money(s.totalRevenue)} hint={`${s.totalSales} sale(s)`} />
              <StatTile label="Average sale" value={money(s.averageSale)} />
              <StatTile label="Collected" value={money(s.totalPaid)} />
              <StatTile label="Balance due" value={money(s.totalBalance)} />
            </Stats>
            {data.servicePerformance.length > 0 && (
              <Section title="Revenue by service">
                <Bars items={data.servicePerformance.slice(0, 10).map((x) => ({ label: x.name, value: num(x.totalRevenue), hint: `${count(x.totalQuantity)} session(s)` }))} />
              </Section>
            )}
            <Section title="Sales" meta={`${data.sales.length}`} flush>
              <ReportTable<Sale>
                rows={data.sales}
                rowKey={(r) => r.id}
                columns={[
                  { key: "createdAt", header: "Date", render: (r) => dateTime(r.createdAt) },
                  { key: "client", header: "Client", render: (r) => person(r.client, "Walk-in"), sortValue: (r) => person(r.client, "Walk-in") },
                  { key: "items", header: "Services", render: (r) => (r.items ?? []).map((i) => `${i.serviceName ?? i.name ?? "Service"}${num(i.quantity) > 1 ? ` ×${i.quantity}` : ""}`).join(", ") || "—", sortValue: (r) => r.items?.length ?? 0 },
                  { key: "employee", header: "Therapist", render: (r) => person(r.employee), sortValue: (r) => person(r.employee) },
                  { key: "status", header: "Status", render: (r) => <Status value={r.status} /> },
                  { key: "total", header: "Amount", align: "right", render: (r) => money(r.total), total: money(s.totalRevenue) },
                  { key: "balance", header: "Balance", align: "right", render: (r) => money(r.balance), total: money(s.totalBalance) },
                ]}
              />
            </Section>
          </>
        )}
      </ReportState>
    </ReportPage>
  );
};

export default MassageServiceSalesReport;
