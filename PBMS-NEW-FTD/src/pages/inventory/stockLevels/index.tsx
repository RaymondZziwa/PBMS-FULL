import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FiBarChart2, FiRefreshCw } from "react-icons/fi";
import useStores from "../../../hooks/inventory/useStores";
import { apiRequest } from "../../../libs/apiConfig";
import { InventoryEndpoints } from "../../../endpoints/inventory/inventory";
import type { IStockStore } from "../../../redux/types/inventory";
import Button from "../../../ui/Button";
import Combobox from "../../../ui/Combobox";
import { SearchBox } from "../../../ui/Field";
import { Badge, Card, EmptyState, PageHeader, SkeletonRows, StatTile } from "../../../ui/Page";
import { num, Pager, qty, Table, Tabs, Td, Th, usePaged, when } from "../shared";

const LOW = 5;

/** What is in a store right now, item by item. */
const StockLevels = () => {
  const { data: stores } = useStores();
  const [params, setParams] = useSearchParams();
  const storeId = params.get("store") ?? "";
  const [rows, setRows] = useState<IStockStore[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");

  useEffect(() => {
    if (!storeId && stores.length) setParams({ store: String(stores[0].id) }, { replace: true });
  }, [storeId, stores, setParams]);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const res = await apiRequest<{ data: IStockStore[] }>(InventoryEndpoints.ITEM.fetch_store_inventory(storeId), "GET");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => !q || `${r.item?.name ?? ""} ${r.item?.category?.name ?? ""} ${r.item?.barcode ?? ""}`.toLowerCase().includes(q))
      .filter((r) => (filter === "out" ? num(r.qty) <= 0 : filter === "low" ? num(r.qty) > 0 && num(r.qty) <= LOW : true));
  }, [rows, query, filter]);
  const paged = usePaged(filtered, 50);

  const out = rows.filter((r) => num(r.qty) <= 0).length;
  const low = rows.filter((r) => num(r.qty) > 0 && num(r.qty) <= LOW).length;

  return (
    <div className="mx-auto max-w-6xl font-inter">
      <PageHeader
        title="Stock levels"
        description="How much of each item a store has now. Changes come from restocks, sales, transfers and supplies."
        actions={<Button variant="secondary" icon={<FiRefreshCw aria-hidden="true" />} onClick={() => void load()} loading={loading}>Refresh</Button>}
      />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Items in store" value={rows.length} />
        <StatTile label={`Low (≤ ${LOW})`} value={low} />
        <StatTile label="Out of stock" value={out} />
      </div>
      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-3 sm:p-4 lg:flex-row lg:items-end">
          <Combobox label="Store" hideLabel value={storeId} onChange={(v) => setParams(v ? { store: v } : {})} options={stores.map((s) => ({ value: String(s.id), label: s.name, hint: s.branch?.name }))} placeholder="Choose a store" searchPlaceholder="Search stores" className="lg:w-64" />
          <SearchBox value={query} onChange={setQuery} placeholder="Item, category or barcode" label="Search stock" className="lg:max-w-xs" />
          <div className="lg:ml-auto">
            <Tabs label="Stock filter" value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }, { value: "low", label: "Low", count: low }, { value: "out", label: "Out", count: out }]} />
          </div>
        </div>
        {loading && !rows.length ? (
          <SkeletonRows rows={6} />
        ) : !filtered.length ? (
          <EmptyState icon={<FiBarChart2 className="h-5 w-5" />} title={!storeId ? "Choose a store" : rows.length ? "Nothing matches" : "This store has no stock yet"} message={storeId && !rows.length ? "Record a restock in Stock Movement to add stock." : undefined} />
        ) : (
          <>
            <Table head={<><Th>Item</Th><Th>Category</Th><Th>Unit</Th><Th className="text-right">In stock</Th><Th>Last change</Th></>}>
              {paged.shown.map((r) => {
                const n = num(r.qty);
                return (
                  <tr key={r.id} className="hover:bg-surface-2/60">
                    <Td className="font-medium">{r.item?.name ?? "—"}</Td>
                    <Td>{r.item?.category?.name ?? <span className="text-brand-muted">—</span>}</Td>
                    <Td>{r.unit?.name ?? "—"}</Td>
                    <Td className="whitespace-nowrap text-right">
                      <span className="mr-2 font-semibold tabular-nums">{qty(n)}</span>
                      {n <= 0 ? <Badge tone="bad">Out</Badge> : n <= LOW ? <Badge tone="warn">Low</Badge> : null}
                    </Td>
                    <Td className="whitespace-nowrap text-brand-muted">{when(r.updatedAt)}</Td>
                  </tr>
                );
              })}
            </Table>
            <Pager {...paged} />
          </>
        )}
      </Card>
    </div>
  );
};

export default StockLevels;
