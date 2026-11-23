import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FiAlertCircle, FiCalendar, FiCreditCard, FiFileText, FiTrendingUp, FiUserPlus } from "react-icons/fi";
import type { RootState } from "../../redux/store";
import { apiRequest } from "../../libs/apiConfig";
import {
  BarList,
  ChangeBadge,
  compact,
  DashboardHeader,
  EmptyState,
  ErrorBanner,
  full,
  greeting,
  Panel,
  PaymentBadge,
  RefreshButton,
  Segmented,
  Skeleton,
  StatTile,
  StockBadge,
  timeAgo,
  todayLabel,
  ugx,
  usePolledData,
} from "./dashboardUi";

type Kpi = { value: number; change?: number | null; sales?: number };

type ManagementData = {
  generatedAt: string;
  kpis: {
    revenueThisMonth: Kpi;
    salesToday: Kpi;
    outstandingCredit: Kpi;
    expensesThisMonth: Kpi;
    newClients: Kpi;
  };
  revenueTrend: { date: string; label: string; revenue: number }[];
  salesByStore: { storeId: number; name: string; revenue: number; sales: number }[];
  topSellingItems: { name: string; quantity: number }[];
  inventory: {
    lowStockLevel: number;
    outOfStockCount: number;
    lowStockCount: number;
    alerts: { itemId?: number; itemName: string; qty: number; unit: string; storeName: string }[];
  };
  recentSales: {
    id: number;
    total: number;
    balance: number;
    paymentStatus: string;
    saleStatus: string;
    createdAt: string;
    storeName: string;
    servedBy: string;
    clientName: string | null;
  }[];
};

const BRAND = "#3959A5";

const TrendTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { date: string; revenue: number } }> }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-[#E2E6EF] bg-white px-3 py-2 text-sm shadow-[0_8px_24px_rgba(20,24,31,0.12)]">
      <p className="m-0 text-xs text-brand-muted">
        {new Date(p.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
      </p>
      <p className="m-0 font-semibold text-brand-ink">{ugx(p.revenue)}</p>
    </div>
  );
};

const SalesDashboard = () => {
  const firstName = useSelector((s: RootState) => s.userAuth?.data?.firstName);
  const [days, setDays] = useState<7 | 30>(7);
  const [showTable, setShowTable] = useState(false);

  const load = useCallback(
    () => apiRequest<{ data: ManagementData }>(`/api/dashboard/metrics?days=${days}`, "GET").then((r) => r.data),
    [days]
  );
  const { data, error, loading, refreshing, updatedAt, refresh } = usePolledData(load, 60_000, String(days));

  const k = data?.kpis;
  const trendTotal = data?.revenueTrend.reduce((s, d) => s + d.revenue, 0) ?? 0;

  return (
    <div className="mx-auto w-full max-w-[1400px] font-inter">
      <DashboardHeader title={`${greeting()}${firstName ? `, ${firstName}` : ""}`} subtitle={`${todayLabel()} · Company overview`}>
        <RefreshButton onClick={refresh} refreshing={refreshing} updatedAt={updatedAt} />
      </DashboardHeader>

      {error && <ErrorBanner message={error} onRetry={refresh} />}

      {/* Headline figures */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-5">
        <StatTile
          label="Revenue this month"
          icon={<FiTrendingUp className="h-[18px] w-[18px]" />}
          loading={loading}
          value={k ? `UGX ${compact(k.revenueThisMonth.value)}` : "—"}
          title={k ? ugx(k.revenueThisMonth.value) : undefined}
          footer={<ChangeBadge change={k?.revenueThisMonth.change} period="same days last month" />}
        />
        <StatTile
          label="Sales today"
          icon={<FiCalendar className="h-[18px] w-[18px]" />}
          loading={loading}
          value={k ? `UGX ${compact(k.salesToday.value)}` : "—"}
          title={k ? ugx(k.salesToday.value) : undefined}
          footer={
            k && (
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <ChangeBadge change={k.salesToday.change} period="yesterday" />
                <span className="text-xs text-brand-muted">· {full(k.salesToday.sales ?? 0)} sales</span>
              </span>
            )
          }
        />
        <StatTile
          label="Outstanding credit"
          icon={<FiCreditCard className="h-[18px] w-[18px]" />}
          loading={loading}
          value={k ? `UGX ${compact(k.outstandingCredit.value)}` : "—"}
          title={k ? ugx(k.outstandingCredit.value) : undefined}
          footer={
            k && (
              <Link to="/sales/credit-sales" className="text-xs font-medium text-brand no-underline hover:underline">
                {full(k.outstandingCredit.sales ?? 0)} unpaid or part-paid sales →
              </Link>
            )
          }
        />
        <StatTile
          label="Expenses this month"
          icon={<FiFileText className="h-[18px] w-[18px]" />}
          loading={loading}
          value={k ? `UGX ${compact(k.expensesThisMonth.value)}` : "—"}
          title={k ? ugx(k.expensesThisMonth.value) : undefined}
          footer={<ChangeBadge change={k?.expensesThisMonth.change} upIsGood={false} period="same days last month" />}
        />
        <StatTile
          label="New clients this month"
          icon={<FiUserPlus className="h-[18px] w-[18px]" />}
          loading={loading}
          value={k ? full(k.newClients.value) : "—"}
          footer={<ChangeBadge change={k?.newClients.change} period="same days last month" />}
        />
      </div>

      {/* Trend + stores */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Revenue"
          subtitle={data ? `${ugx(trendTotal)} over the last ${days} days · completed sales only` : "Completed sales only"}
          action={
            <Segmented
              label="Revenue period"
              value={days}
              onChange={setDays}
              options={[
                { value: 7, label: "7 days" },
                { value: 30, label: "30 days" },
              ]}
            />
          }
        >
          {loading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : data && data.revenueTrend.some((d) => d.revenue > 0) ? (
            <>
              <div className="h-[260px] w-full" role="img" aria-label={`Daily revenue for the last ${days} days. Total ${ugx(trendTotal)}.`}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.revenueTrend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke="#EEF0F5" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#6B7385", fontSize: 12 }}
                      interval="preserveStartEnd"
                      minTickGap={16}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#6B7385", fontSize: 12 }}
                      tickFormatter={(v: number) => compact(v)}
                      width={52}
                    />
                    <Tooltip content={<TrendTooltip />} cursor={{ stroke: "#C9D1E3", strokeWidth: 1 }} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={BRAND}
                      strokeWidth={2}
                      fill={BRAND}
                      fillOpacity={0.1}
                      dot={false}
                      activeDot={{ r: 5, fill: BRAND, stroke: "#FFFFFF", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <button
                type="button"
                onClick={() => setShowTable((v) => !v)}
                aria-expanded={showTable}
                className="mt-2 min-h-9 text-xs font-medium text-brand hover:underline"
              >
                {showTable ? "Hide table" : "Show as table"}
              </button>
              {showTable && (
                <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-[#EEF0F5]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[#F7F8FB] text-left text-xs text-brand-muted">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Day</th>
                        <th className="px-3 py-2 text-right font-semibold">Revenue (UGX)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.revenueTrend.map((d) => (
                        <tr key={d.date} className="border-t border-[#EEF0F5]">
                          <td className="px-3 py-1.5">{new Date(d.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{full(d.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <EmptyState>No completed sales in the last {days} days.</EmptyState>
          )}
        </Panel>

        <Panel title="Sales by store" subtitle="This month">
          {loading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : (
            <BarList
              rows={(data?.salesByStore ?? []).slice(0, 7).map((s) => ({
                key: s.storeId,
                label: s.name,
                value: s.revenue,
                hint: `${full(s.sales)} sales`,
              }))}
              format={(n) => `UGX ${compact(n)}`}
              emptyText="No sales recorded this month yet."
            />
          )}
        </Panel>
      </div>

      {/* Items + stock */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Best-selling items" subtitle="Units sold, last 30 days">
          {loading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : (
            <BarList
              rows={(data?.topSellingItems ?? []).map((i) => ({ key: i.name, label: i.name, value: i.quantity }))}
              format={compact}
              unit="units"
              emptyText="No items sold in the last 30 days."
            />
          )}
        </Panel>

        <Panel
          title="Stock alerts"
          subtitle={
            data
              ? `${full(data.inventory.outOfStockCount)} out of stock · ${full(data.inventory.lowStockCount)} at ${data.inventory.lowStockLevel} or fewer`
              : "Across all stores"
          }
          action={
            <Link to="/inventory/stock-movement" className="flex min-h-9 items-center whitespace-nowrap text-xs font-medium text-brand no-underline hover:underline">
              Restock →
            </Link>
          }
        >
          {loading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : data && data.inventory.alerts.length > 0 ? (
            <ul className="m-0 flex list-none flex-col divide-y divide-[#EEF0F5] p-0">
              {data.inventory.alerts.map((a, i) => (
                <li key={`${a.itemId ?? i}-${a.storeName}`} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="m-0 truncate text-sm font-medium text-brand-ink">{a.itemName}</p>
                    <p className="m-0 truncate text-xs text-brand-muted">{a.storeName}</p>
                  </div>
                  <div className="flex flex-none items-center gap-2.5">
                    <span className="text-sm tabular-nums text-brand-ink">
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
      </div>

      {/* Recent sales */}
      <Panel
        className="mt-4"
        title="Latest sales"
        subtitle="Includes sales still waiting for payment"
        action={
          <Link to="/sales/client-purchases" className="flex min-h-9 items-center whitespace-nowrap text-xs font-medium text-brand no-underline hover:underline">
            All sales →
          </Link>
        }
      >
        {loading ? (
          <Skeleton className="h-[240px] w-full" />
        ) : data && data.recentSales.length > 0 ? (
          <div className="-mx-4 overflow-x-auto sm:-mx-5">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[#EEF0F5] text-left text-xs text-brand-muted">
                  <th className="px-4 pb-2 font-semibold sm:px-5">When</th>
                  <th className="px-2 pb-2 font-semibold">Store</th>
                  <th className="px-2 pb-2 font-semibold">Client</th>
                  <th className="px-2 pb-2 font-semibold">Served by</th>
                  <th className="px-2 pb-2 text-right font-semibold">Total (UGX)</th>
                  <th className="px-4 pb-2 font-semibold sm:px-5">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSales.map((s) => (
                  <tr key={s.id} className="border-b border-[#F2F4F8] last:border-0">
                    <td className="whitespace-nowrap px-4 py-2.5 text-brand-muted sm:px-5" title={new Date(s.createdAt).toLocaleString("en-GB")}>
                      {timeAgo(s.createdAt)}
                    </td>
                    <td className="max-w-[160px] truncate px-2 py-2.5">{s.storeName}</td>
                    <td className="max-w-[160px] truncate px-2 py-2.5">{s.clientName || <span className="text-brand-muted">Walk-in</span>}</td>
                    <td className="max-w-[160px] truncate px-2 py-2.5">{s.servedBy}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-right font-medium tabular-nums">{full(s.total)}</td>
                    <td className="px-4 py-2.5 sm:px-5">
                      <PaymentBadge status={s.paymentStatus} saleStatus={s.saleStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState>No sales yet.</EmptyState>
        )}
      </Panel>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-brand-muted">
        <FiAlertCircle aria-hidden="true" className="h-3.5 w-3.5" />
        Revenue counts completed sales only; pending and failed mobile-money payments are left out.
      </p>
    </div>
  );
};

export default SalesDashboard;
