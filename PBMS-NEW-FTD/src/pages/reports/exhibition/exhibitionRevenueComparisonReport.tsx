import { useState } from "react";
import { StatTile } from "../../../ui/Page";
import { Bars, money, num, ReportPage, ReportState, ReportTable, Section, Stats, usePdfExport, useReport } from "../kit";
import { ExhibitionMultiFilter } from "./exhibitionSelector";

type Expo = { id: number; name: string; totalRevenue: number; salesCount: number; storeCount: number };
type Data = { exhibitions: Expo[]; summary: { totalRevenue: number; totalSales: number; exhibitionCount: number } };

/** Revenue across exhibitions, side by side. */
const ExhibitionRevenueComparisonReport = () => {
  const [ids, setIds] = useState<string[]>([]);
  const params = { exhibitionIds: ids.join(",") };
  const { data, loading, error, reload } = useReport<Data>("/api/reports/exhibition-revenue-comparison", params);
  const { exporting, exportPdf } = usePdfExport();
  const s = data?.summary;
  const list = data?.exhibitions ?? [];

  return (
    <ReportPage
      title="Exhibition revenue comparison"
      description={ids.length ? `${ids.length} exhibition(s) selected` : "All exhibitions"}
      filters={<ExhibitionMultiFilter value={ids} onChange={setIds} />}
      onRefresh={reload}
      loading={loading}
      onExport={() => exportPdf("/api/reports/exhibition/revenue-comparison/print", params, "exhibition-revenue.pdf")}
      exporting={exporting}
      canExport={!!data && list.length > 0}
    >
      <ReportState loading={loading} error={error} onRetry={reload} hasData={list.length > 0} empty={{ title: "No exhibition sales yet" }}>
        {s && (
          <>
            <Stats>
              <StatTile label="Revenue" value={money(s.totalRevenue)} />
              <StatTile label="Sales" value={s.totalSales} />
              <StatTile label="Exhibitions" value={s.exhibitionCount} />
              <StatTile label="Average per exhibition" value={money(s.exhibitionCount ? s.totalRevenue / s.exhibitionCount : 0)} />
            </Stats>
            <Section title="Revenue by exhibition">
              <Bars items={list.map((e) => ({ label: e.name, value: num(e.totalRevenue), hint: `${e.salesCount} sale(s)` }))} />
            </Section>
            <Section title="Details" flush>
              <ReportTable<Expo>
                rows={list}
                rowKey={(r) => r.id}
                initialSort={{ key: "totalRevenue", dir: "desc" }}
                columns={[
                  { key: "name", header: "Exhibition" },
                  { key: "storeCount", header: "Stands", align: "right" },
                  { key: "salesCount", header: "Sales", align: "right", total: s.totalSales },
                  { key: "avg", header: "Average sale", align: "right", render: (r) => money(r.salesCount ? r.totalRevenue / r.salesCount : 0), sortValue: (r) => (r.salesCount ? r.totalRevenue / r.salesCount : 0) },
                  { key: "totalRevenue", header: "Revenue", align: "right", render: (r) => money(r.totalRevenue), total: money(s.totalRevenue) },
                ]}
              />
            </Section>
          </>
        )}
      </ReportState>
    </ReportPage>
  );
};

export default ExhibitionRevenueComparisonReport;
