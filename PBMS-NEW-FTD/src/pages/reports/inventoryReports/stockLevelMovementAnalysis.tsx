import { useEffect, useMemo, useState } from "react";
import Combobox from "../../../ui/Combobox";
import { StatTile } from "../../../ui/Page";
import useItems from "../../../hooks/inventory/useItems";
import useItemCategories from "../../../hooks/inventory/useItemCategories";
import { count, dateTime, DateRange, label, monthStartISO, periodText, person, ReportPage, ReportState, ReportTable, Section, Stats, StoreFilter, todayISO, usePdfExport, useReport } from "../kit";

type Movement = {
  id: number;
  category: string;
  qty: number;
  source?: string;
  description?: string | null;
  createdAt: string;
  item: { id: number; name: string; category?: { name?: string } | null };
  unit?: { name?: string; abr?: string } | null;
  employee?: { firstName: string; lastName: string } | null;
};
type Data = {
  movements: Movement[];
  summary: { totalMovements: number; totalIn: number; totalOut: number; netMovement: number; quantityBreakdown: Record<string, number> };
};

const KEY = "report.store";
const TYPES = [
  { value: "", label: "All movements" },
  { value: "RESTOCK", label: "Stock in" },
  { value: "DEPLETION", label: "Stock out" },
  { value: "TRANSFER", label: "Transfer out" },
  { value: "ADJUSTMENT", label: "Adjustment" },
  { value: "MANUFACTURING", label: "Manufacturing" },
];
const TONE: Record<string, string> = {
  RESTOCK: "text-[#1B7A3D] dark:text-[#7FD89E]",
  MANUFACTURING: "text-[#1B7A3D] dark:text-[#7FD89E]",
  DEPLETION: "text-[#B42318] dark:text-[#F29A92]",
  TRANSFER: "text-[#B42318] dark:text-[#F29A92]",
};
const SIGN: Record<string, string> = { RESTOCK: "+", MANUFACTURING: "+", DEPLETION: "−", TRANSFER: "−" };

/** Stock in, out, transfers and adjustments for a store. */
const StockMovementAnalysisReport = () => {
  const [store, setStore] = useState(() => localStorage.getItem(KEY) ?? "");
  const [range, setRange] = useState({ start: monthStartISO(), end: todayISO() });
  const [itemId, setItemId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [movementType, setType] = useState("");
  useEffect(() => { if (store) localStorage.setItem(KEY, store); }, [store]);

  const { data: items = [] } = useItems();
  const { data: categories = [] } = useItemCategories();
  const itemOptions = useMemo(() => [{ value: "", label: "All items" }, ...(items as Array<{ id: number | string; name: string }>).map((i) => ({ value: String(i.id), label: i.name }))], [items]);
  const catOptions = useMemo(() => [{ value: "", label: "All categories" }, ...(categories as Array<{ id: number | string; name: string }>).map((c) => ({ value: String(c.id), label: c.name }))], [categories]);

  const params = { startDate: range.start, endDate: range.end, itemId, categoryId, movementType };
  const { data, loading, error, reload } = useReport<Data>(store ? `/api/reports/stock-level-movement/${store}` : null, params);
  const { exporting, exportPdf } = usePdfExport();
  const s = data?.summary;

  return (
    <ReportPage
      title="Stock movement"
      description={periodText(range.start, range.end)}
      filters={
        <>
          <StoreFilter value={store} onChange={setStore} />
          <DateRange start={range.start} end={range.end} onChange={setRange} />
          <Combobox label="Movement" value={movementType} onChange={setType} options={TYPES} placeholder="All movements" />
          <Combobox label="Item" value={itemId} onChange={setItemId} options={itemOptions} placeholder="All items" searchPlaceholder="Search items" />
          <Combobox label="Category" value={categoryId} onChange={setCategoryId} options={catOptions} placeholder="All categories" searchPlaceholder="Search categories" />
        </>
      }
      onRefresh={store ? reload : undefined}
      loading={loading}
      onExport={() => exportPdf(`/api/reports/stock-level-movement/print/${store}`, params, "stock-movement.pdf")}
      exporting={exporting}
      canExport={!!store && !!data}
    >
      <ReportState loading={loading} error={error} onRetry={reload} waitingFor={!store ? "Choose a store to see its stock movement" : null} hasData={!!data && data.movements.length > 0} empty={{ title: "No stock movement in this period" }}>
        {s && data && (
          <>
            <Stats>
              <StatTile label="Movements" value={s.totalMovements} />
              <StatTile label="Stock in" value={count(s.totalIn)} hint="Restocks and manufacturing" />
              <StatTile label="Stock out" value={count(s.totalOut)} hint="Sales use, damage, transfers" />
              <StatTile label="Net change" value={`${s.netMovement > 0 ? "+" : ""}${count(s.netMovement)}`} hint="Mixed units added together" />
            </Stats>
            <Section title="Movements" meta={`${data.movements.length}`} flush>
              <ReportTable<Movement>
                rows={data.movements}
                rowKey={(r) => r.id}
                columns={[
                  { key: "createdAt", header: "Date", render: (r) => dateTime(r.createdAt) },
                  { key: "item.name", header: "Item" },
                  { key: "category", header: "Movement", render: (r) => <span className={`font-medium ${TONE[r.category] ?? "text-brand-ink"}`}>{TYPES.find((t) => t.value === r.category)?.label ?? label(r.category)}</span> },
                  { key: "qty", header: "Qty", align: "right", render: (r) => <span className={TONE[r.category]}>{SIGN[r.category] ?? ""}{count(r.qty)} {r.unit?.abr ?? r.unit?.name ?? ""}</span>, sortValue: (r) => r.qty },
                  { key: "source", header: "Reason", render: (r) => r.description || r.source || "—" },
                  { key: "employee", header: "By", render: (r) => person(r.employee), sortValue: (r) => person(r.employee) },
                ]}
              />
            </Section>
          </>
        )}
      </ReportState>
    </ReportPage>
  );
};

export default StockMovementAnalysisReport;
