import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { FiAlertOctagon, FiArrowRight, FiFileText, FiMapPin, FiPackage, FiShoppingBag, FiShoppingCart } from "react-icons/fi";
import type { RootState } from "../../redux/store";
import { apiRequest } from "../../libs/apiConfig";
import { visibleNavigation } from "../../layout/navigation";
import {
  BarList,
  compact,
  DashboardHeader,
  EmptyState,
  ErrorBanner,
  full,
  greeting,
  Panel,
  PaymentBadge,
  RefreshButton,
  Skeleton,
  StatTile,
  StockBadge,
  timeAgo,
  titleCase,
  todayLabel,
  usePolledData,
} from "./dashboardUi";

type StaffData = {
  generatedAt: string;
  scope: {
    branch: { id: number; name: string } | null;
    store: { id: number; name: string } | null;
    stores: { id: number; name: string }[];
  };
  sales: {
    days: number;
    salesCount: number;
    salesToday: number;
    unitsSold: number;
    byPaymentStatus: Record<string, number>;
    topItems: { name: string; quantity: number }[];
    recentSales: {
      id: number;
      paymentStatus: string;
      createdAt: string;
      storeName: string;
      servedBy: string;
      clientName: string | null;
      itemsCount: number;
    }[];
  } | null;
  inventory: {
    lowStockLevel: number;
    outOfStockCount: number;
    lowStockCount: number;
    alerts: { itemId?: number; itemName: string; qty: number; unit: string; storeName: string }[];
    recentActivity: {
      id: number;
      type: string;
      qty: number;
      unit: string;
      status: string;
      createdAt: string;
      itemName: string;
      fromStore: string;
      toStore: string | null;
      recordedBy: string;
    }[];
  } | null;
  expenses: {
    days: number;
    entries: number;
    byCategory: { category: string; entries: number }[];
    recent: { id: number; title: string; category: string; dateIncurred: string; recordedBy: string }[];
  } | null;
};

const movementLabel: Record<string, string> = {
  RESTOCK: "Restock",
  DEPLETION: "Taken out",
  TRANSFER: "Transfer",
  ADJUSTMENT: "Adjustment",
  MANUFACTURING: "Manufacturing",
};

const NonAdminDashboard = () => {
  const user = useSelector((s: RootState) => s.userAuth?.data);
  const role = user?.role;
  const [storeId, setStoreId] = useState<string>("");

  const shortcuts = useMemo(() => {
    const links: { label: string; path: string }[] = [];
    for (const section of visibleNavigation(role)) {
      for (const item of section.items) {
        if (item.path && item.path !== "/dashboard") links.push({ label: item.label, path: item.path });
        else if (item.children?.[0]) links.push({ label: item.children[0].label, path: item.children[0].path });
      }
    }
    return links.slice(0, 6);
  }, [role]);

  const load = useCallback(() => {
    const q = new URLSearchParams({ salesDays: "7", expenseDays: "30" });
    if (storeId) q.set("storeId", storeId);
    return apiRequest<{ data: StaffData }>(`/api/dashboard/employee-metrics?${q.toString()}`, "GET").then((r) => r.data);
  }, [storeId]);
  const { data, error, loading, refreshing, updatedAt, refresh } = usePolledData(load, 60_000, storeId || "all");

  const noSections = !!data && !data.sales && !data.inventory && !data.expenses;
  const branchName = data?.scope.branch?.name ?? user?.branch?.name;
  const stores = data?.scope.stores ?? [];

  return (
    <div className="mx-auto w-full max-w-[1400px] font-inter">
      <DashboardHeader
        title={`${greeting()}${user?.firstName ? `, ${user.firstName}` : ""}`}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            {todayLabel()}
            {branchName && (
              <span className="inline-flex items-center gap-1">
                · <FiMapPin aria-hidden="true" className="h-3.5 w-3.5 text-brand" /> {branchName}
              </span>
            )}
          </span>
        }
      >
        {stores.length > 1 && (
          <label className="flex h-10 items-center gap-2 rounded-lg border border-[#DDE1EA] bg-white pl-3 pr-1 text-sm text-brand-muted">
            Store
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="h-8 max-w-[200px] rounded-md border-0 bg-transparent pr-6 font-medium text-brand-ink outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <option value="">All stores</option>
              {stores.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <RefreshButton onClick={refresh} refreshing={refreshing} updatedAt={updatedAt} />
      </DashboardHeader>

      {error && <ErrorBanner message={error} onRetry={refresh} />}

      {/* Shortcuts to what this role can open */}
      {shortcuts.length > 0 && (
        <nav aria-label="Shortcuts" className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {shortcuts.map((s) => (
            <Link
              key={s.path}
              to={s.path}
              className="group flex min-h-12 items-center justify-between gap-2 rounded-xl border border-[#E6E9F0] bg-white px-3.5 py-2.5 text-sm font-medium text-brand-ink no-underline hover:border-brand/40 hover:bg-[#F6F8FD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
            >
              <span className="truncate">{s.label}</span>
              <FiArrowRight aria-hidden="true" className="h-4 w-4 flex-none text-[#9AA3B5] transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
            </Link>
          ))}
        </nav>
      )}

      {loading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[132px]" />
          ))}
        </div>
      )}

      {noSections && (
        <EmptyState>
          Your dashboard fills in once your role is given access to sales, inventory or expenses. Ask your system administrator.
        </EmptyState>
      )}

      {data && !noSections && (
        <>
          {/* Headline counts (no money figures here) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {data.sales && (
              <>
                <StatTile
                  label="Sales today"
                  icon={<FiShoppingCart className="h-[18px] w-[18px]" />}
                  value={full(data.sales.salesToday)}
                  footer={<span className="text-xs text-brand-muted">Completed sales</span>}
                />
                <StatTile
                  label={`Sales, last ${data.sales.days} days`}
                  icon={<FiShoppingBag className="h-[18px] w-[18px]" />}
                  value={full(data.sales.salesCount)}
                  footer={<span className="text-xs text-brand-muted">{compact(data.sales.unitsSold)} units sold</span>}
                />
              </>
            )}
            {data.inventory && (
              <>
                <StatTile
                  label="Out of stock"
                  icon={<FiAlertOctagon className="h-[18px] w-[18px]" />}
                  value={full(data.inventory.outOfStockCount)}
                  footer={<span className="text-xs text-brand-muted">Items at zero</span>}
                />
                <StatTile
                  label="Running low"
                  icon={<FiPackage className="h-[18px] w-[18px]" />}
                  value={full(data.inventory.lowStockCount)}
                  footer={<span className="text-xs text-brand-muted">{data.inventory.lowStockLevel} or fewer left</span>}
                />
              </>
            )}
            {data.expenses && (
              <StatTile
                label={`Expense entries, last ${data.expenses.days} days`}
                icon={<FiFileText className="h-[18px] w-[18px]" />}
                value={full(data.expenses.entries)}
                footer={<span className="text-xs text-brand-muted">Entries recorded</span>}
              />
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {data.inventory && (
              <Panel
                title="Stock alerts"
                subtitle={data.scope.store ? data.scope.store.name : "Your branch's stores"}
                action={
                  <Link to="/inventory/stock-movement" className="flex min-h-9 items-center whitespace-nowrap text-xs font-medium text-brand no-underline hover:underline">
                    Stock movement →
                  </Link>
                }
              >
                {data.inventory.alerts.length > 0 ? (
                  <ul className="m-0 flex list-none flex-col divide-y divide-[#EEF0F5] p-0">
                    {data.inventory.alerts.map((a, i) => (
                      <li key={`${a.itemId ?? i}-${a.storeName}`} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="m-0 truncate text-sm font-medium text-brand-ink">{a.itemName}</p>
                          <p className="m-0 truncate text-xs text-brand-muted">{a.storeName}</p>
                        </div>
                        <div className="flex flex-none items-center gap-2.5">
                          <span className="text-sm tabular-nums">
                            {full(a.qty)} <span className="text-xs text-brand-muted">{a.unit}</span>
                          </span>
                          <StockBadge qty={a.qty} />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState>All stock is above the alert level.</EmptyState>
                )}
              </Panel>
            )}

            {data.sales && (
              <Panel title="Best-selling items" subtitle={`Units sold, last ${data.sales.days} days`}>
                <BarList
                  rows={data.sales.topItems.map((i) => ({ key: i.name, label: i.name, value: i.quantity }))}
                  format={compact}
                  unit="units"
                  emptyText={`No items sold in the last ${data.sales.days} days.`}
                />
              </Panel>
            )}
          </div>

          {data.sales && (
            <Panel className="mt-4" title="Latest sales" subtitle="Completed sales in your branch">
              {data.sales.recentSales.length > 0 ? (
                <div className="-mx-4 overflow-x-auto sm:-mx-5">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b border-[#EEF0F5] text-left text-xs text-brand-muted">
                        <th className="px-4 pb-2 font-semibold sm:px-5">When</th>
                        <th className="px-2 pb-2 font-semibold">Store</th>
                        <th className="px-2 pb-2 font-semibold">Client</th>
                        <th className="px-2 pb-2 font-semibold">Served by</th>
                        <th className="px-2 pb-2 text-right font-semibold">Items</th>
                        <th className="px-4 pb-2 font-semibold sm:px-5">Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.sales.recentSales.map((s) => (
                        <tr key={s.id} className="border-b border-[#F2F4F8] last:border-0">
                          <td className="whitespace-nowrap px-4 py-2.5 text-brand-muted sm:px-5" title={new Date(s.createdAt).toLocaleString("en-GB")}>
                            {timeAgo(s.createdAt)}
                          </td>
                          <td className="max-w-[150px] truncate px-2 py-2.5">{s.storeName}</td>
                          <td className="max-w-[150px] truncate px-2 py-2.5">{s.clientName || <span className="text-brand-muted">Walk-in</span>}</td>
                          <td className="max-w-[150px] truncate px-2 py-2.5">{s.servedBy}</td>
                          <td className="px-2 py-2.5 text-right tabular-nums">{full(s.itemsCount)}</td>
                          <td className="px-4 py-2.5 sm:px-5">
                            <PaymentBadge status={s.paymentStatus} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState>No completed sales in the last {data.sales.days} days.</EmptyState>
              )}
            </Panel>
          )}

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
            {data.inventory && (
              <Panel className={data.expenses ? "lg:col-span-3" : "lg:col-span-5"} title="Recent stock activity" subtitle="Latest movements">
                {data.inventory.recentActivity.length > 0 ? (
                  <ul className="m-0 flex list-none flex-col divide-y divide-[#EEF0F5] p-0">
                    {data.inventory.recentActivity.map((r) => (
                      <li key={r.id} className="flex items-start justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="m-0 truncate text-sm font-medium text-brand-ink">
                            {r.itemName}{" "}
                            <span className="font-normal text-brand-muted">
                              · {full(r.qty)} {r.unit}
                            </span>
                          </p>
                          <p className="m-0 truncate text-xs text-brand-muted">
                            {movementLabel[r.type] ?? titleCase(r.type)} · {r.fromStore}
                            {r.toStore ? ` → ${r.toStore}` : ""} · {r.recordedBy}
                          </p>
                        </div>
                        <div className="flex flex-none flex-col items-end gap-1">
                          <span className="text-xs text-brand-muted" title={new Date(r.createdAt).toLocaleString("en-GB")}>
                            {timeAgo(r.createdAt)}
                          </span>
                          {r.status !== "CONFIRMED" && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                r.status === "PENDING" ? "bg-[#FFF3DC] text-[#7A4B00]" : "bg-[#FDECEA] text-[#A32A1A]"
                              }`}
                            >
                              {titleCase(r.status)}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState>No stock movements yet.</EmptyState>
                )}
              </Panel>
            )}

            {data.expenses && (
              <Panel className={data.inventory ? "lg:col-span-2" : "lg:col-span-5"} title="Expenses" subtitle={`Entries by category, last ${data.expenses.days} days`}>
                <BarList
                  rows={data.expenses.byCategory.slice(0, 5).map((c) => ({ key: c.category, label: titleCase(c.category), value: c.entries }))}
                  format={full}
                  unit="entries"
                  emptyText="No expenses recorded."
                />
                {data.expenses.recent.length > 0 && (
                  <>
                    <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-brand-muted">Latest entries</h3>
                    <ul className="m-0 flex list-none flex-col gap-2 p-0">
                      {data.expenses.recent.map((e) => (
                        <li key={e.id} className="rounded-lg bg-[#F7F8FB] px-3 py-2">
                          <p className="m-0 truncate text-sm font-medium text-brand-ink">{e.title}</p>
                          <p className="m-0 truncate text-xs text-brand-muted">
                            {titleCase(e.category)} · {new Date(e.dateIncurred).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ·{" "}
                            {e.recordedBy}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Panel>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NonAdminDashboard;
