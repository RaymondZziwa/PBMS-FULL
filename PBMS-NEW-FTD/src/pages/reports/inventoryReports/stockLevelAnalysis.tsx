import { useEffect, useMemo, useState } from "react";
import { SearchBox } from "../../../ui/Field";
import { StatTile } from "../../../ui/Page";
import { count, ReportPage, ReportState, ReportTable, Section, Stats, StoreFilter, usePdfExport, useReport } from "../kit";

type Row = { item: { id: number; name: string; category?: { name?: string } | null }; unit?: { name?: string } | null; qty: number; store?: { id: number; name: string } };
type Data = { lowStockItems: Row[]; inStockItems: Row[]; overStockedItems: Row[] };
type Level = "low" | "ok" | "over";

const KEY = "report.store";
const LEVEL: Record<Level, { label: string; cls: string; note: string }> = {
  low: { label: "Low", cls: "bg-[#FDECEA] text-[#B42318] dark:bg-[#3A1512] dark:text-[#F29A92]", note: "20 or fewer" },
  ok: { label: "Healthy", cls: "bg-[#E7F6EC] text-[#1B7A3D] dark:bg-[#12301D] dark:text-[#7FD89E]", note: "21 to 100" },
  over: { label: "Overstocked", cls: "bg-[#FFF4E0] text-[#8A5300] dark:bg-[#33240A] dark:text-[#F5C26B]", note: "More than 100" },
};

/** Low, healthy and overstocked items in one store. */
const StockLevelAnalysisReport = () => {
  const [store, setStore] = useState(() => localStorage.getItem(KEY) ?? "");
  const [show, setShow] = useState<Level | "all">("low");
  const [q, setQ] = useState("");
  useEffect(() => { if (store) localStorage.setItem(KEY, store); }, [store]);

  const { data, loading, error, reload } = useReport<Data>(store ? `/api/reports/stock-level-analysis/${store}` : null);
  const { exporting, exportPdf } = usePdfExport();

  const rows = useMemo(() => {
    if (!data) return [] as Array<Row & { level: Level }>;
    const all = [
      ...data.lowStockItems.map((r) => ({ ...r, level: "low" as Level })),
      ...data.inStockItems.map((r) => ({ ...r, level: "ok" as Level })),
      ...data.overStockedItems.map((r) => ({ ...r, level: "over" as Level })),
    ];
    const s = q.trim().toLowerCase();
    return all.filter((r) => (show === "all" || r.level === show) && (!s || `${r.item?.name} ${r.item?.category?.name ?? ""}`.toLowerCase().includes(s)));
  }, [data, show, q]);

  const storeName = data?.lowStockItems[0]?.store?.name ?? data?.inStockItems[0]?.store?.name ?? data?.overStockedItems[0]?.store?.name;
  const n = { low: data?.lowStockItems.length ?? 0, ok: data?.inStockItems.length ?? 0, over: data?.overStockedItems.length ?? 0 };

  return (
    <ReportPage
      title="Stock levels"
      description={storeName ? `${storeName} · as of now` : "Which items are running low or overstocked in a store."}
      filters={<StoreFilter value={store} onChange={setStore} />}
      onRefresh={store ? reload : undefined}
      loading={loading}
      onExport={() => exportPdf(`/api/reports/stock-level-analysis/print/${store}`, {}, "stock-levels.pdf")}
      exporting={exporting}
      canExport={!!store && !!data}
    >
      <ReportState loading={loading} error={error} onRetry={reload} waitingFor={!store ? "Choose a store to see its stock levels" : null} hasData={!!data && n.low + n.ok + n.over > 0} empty={{ title: "This store has no stock records" }}>
        <Stats>
          <StatTile label="Items" value={n.low + n.ok + n.over} />
          <StatTile label="Low stock" value={n.low} hint={LEVEL.low.note} />
          <StatTile label="Healthy" value={n.ok} hint={LEVEL.ok.note} />
          <StatTile label="Overstocked" value={n.over} hint={LEVEL.over.note} />
        </Stats>
        <Section
          title="Items"
          meta={`${rows.length}`}
          flush
          actions={
            <div role="tablist" aria-label="Stock level" className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
              {([["low", `Low (${n.low})`], ["ok", "Healthy"], ["over", "Over"], ["all", "All"]] as const).map(([v, l]) => (
                <button key={v} type="button" role="tab" aria-selected={show === v} onClick={() => setShow(v)} className={`h-9 rounded-md px-3 text-[13px] font-medium ${show === v ? "bg-surface text-brand-ink shadow-card" : "text-brand-muted hover:text-brand-ink"}`}>
                  {l}
                </button>
              ))}
            </div>
          }
        >
          <div className="border-b border-line p-3">
            <SearchBox value={q} onChange={setQ} placeholder="Search items or categories" label="Search items" />
          </div>
          <ReportTable
            rows={rows}
            rowKey={(r, i) => `${r.item?.id}-${r.unit?.name}-${i}`}
            initialSort={{ key: "qty", dir: show === "over" ? "desc" : "asc" }}
            empty="No items at this level."
            columns={[
              { key: "item.name", header: "Item" },
              { key: "item.category.name", header: "Category", render: (r) => r.item?.category?.name ?? "—" },
              { key: "qty", header: "In stock", align: "right", render: (r) => `${count(r.qty)} ${r.unit?.name ?? ""}`.trim(), sortValue: (r) => r.qty },
              { key: "level", header: "Level", render: (r) => <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL[r.level].cls}`}>{LEVEL[r.level].label}</span> },
            ]}
          />
        </Section>
      </ReportState>
    </ReportPage>
  );
};

export default StockLevelAnalysisReport;
