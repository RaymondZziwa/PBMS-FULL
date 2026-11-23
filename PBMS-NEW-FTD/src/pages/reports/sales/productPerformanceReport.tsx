import { useMemo, useState } from "react";
import Combobox from "../../../ui/Combobox";
import { StatTile } from "../../../ui/Page";
import useItems from "../../../hooks/inventory/useItems";
import { Bars, count, DateRange, day, money, monthStartISO, num, periodText, ReportPage, ReportState, ReportTable, Section, Stats, StoreFilter, todayISO, usePdfExport, useReport } from "../kit";

type Row = { saleId: number; date: string; store: string; quantity: number; price: number; total: number; discount?: number };
type Data = {
  product: { id: number; name: string; category: string };
  sales: Row[];
  summary: { totalUnitsSold: number; totalRevenue: number; averagePrice: number; salesCount: number; storeCount: number };
};

/** How one product sold over a period, optionally in one store. */
const ProductPerformanceReport = () => {
  const { data: items = [] } = useItems();
  const [itemId, setItemId] = useState("");
  const [store, setStore] = useState("");
  const [range, setRange] = useState({ start: monthStartISO(), end: todayISO() });
  const options = useMemo(() => (items as Array<{ id: number | string; name: string; category?: { name?: string } }>).map((i) => ({ value: String(i.id), label: i.name, hint: i.category?.name })), [items]);

  const params = { itemId, storeId: store, startDate: range.start, endDate: range.end };
  const { data, loading, error, reload } = useReport<Data>(itemId ? "/api/reports/sales/product-performance" : null, params);
  const { exporting, exportPdf } = usePdfExport();
  const s = data?.summary;
  const byStore = useMemo(() => {
    const m = new Map<string, number>();
    (data?.sales ?? []).forEach((r) => m.set(r.store, (m.get(r.store) ?? 0) + num(r.total)));
    return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [data]);
  const name = options.find((o) => o.value === itemId)?.label;

  return (
    <ReportPage
      title="Product performance"
      description={name ? `${name} · ${periodText(range.start, range.end)}` : "Units sold, revenue and price for one product."}
      filters={
        <>
          <Combobox label="Product" value={itemId} onChange={setItemId} options={options} placeholder="Choose a product" searchPlaceholder="Search products" />
          <StoreFilter value={store} onChange={setStore} allowAll />
          <DateRange start={range.start} end={range.end} onChange={setRange} />
        </>
      }
      onRefresh={itemId ? reload : undefined}
      loading={loading}
      onExport={() => exportPdf("/api/reports/export/product-performance", params, "product-performance.pdf")}
      exporting={exporting}
      canExport={!!itemId && !!data}
    >
      <ReportState
        loading={loading}
        error={error}
        onRetry={reload}
        waitingFor={!itemId ? "Choose a product to see how it sold" : null}
        hasData={!!data && (data.sales?.length ?? 0) > 0}
        empty={{ title: "No sales of this product", message: "Try a longer period or all stores." }}
      >
        {s && data && (
          <>
            <Stats>
              <StatTile label="Units sold" value={count(s.totalUnitsSold)} />
              <StatTile label="Revenue" value={money(s.totalRevenue)} />
              <StatTile label="Average price" value={money(s.averagePrice)} hint="Per unit" />
              <StatTile label="Sales" value={s.salesCount} hint={`In ${s.storeCount} store(s)`} />
            </Stats>
            {byStore.length > 1 && (
              <Section title="Revenue by store">
                <Bars items={byStore} />
              </Section>
            )}
            <Section title="Sales" meta={`${data.sales.length}`} flush>
              <ReportTable<Row>
                rows={data.sales}
                rowKey={(r) => r.saleId}
                initialSort={{ key: "date", dir: "desc" }}
                columns={[
                  { key: "date", header: "Date", render: (r) => day(r.date) },
                  { key: "store", header: "Store" },
                  { key: "quantity", header: "Qty", align: "right", render: (r) => count(r.quantity), total: count(s.totalUnitsSold) },
                  { key: "price", header: "Price", align: "right", render: (r) => money(r.price) },
                  { key: "discount", header: "Discount", align: "right", render: (r) => (num(r.discount) ? money(r.discount) : "—") },
                  { key: "total", header: "Total", align: "right", render: (r) => money(r.total), total: money(s.totalRevenue) },
                ]}
              />
            </Section>
          </>
        )}
      </ReportState>
    </ReportPage>
  );
};

export default ProductPerformanceReport;
