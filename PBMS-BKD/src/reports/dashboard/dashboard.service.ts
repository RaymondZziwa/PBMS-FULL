import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  addDays,
  endOfDay,
  format,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns';
import {
  hasPermission,
  isFullAccess,
  PERMISSIONS,
  type AuthenticatedUser,
} from 'src/auth/permissions';

/** Stock at or below this (but above zero) counts as low. */
const LOW_STOCK_LEVEL = 20;

/** Only completed sales count as revenue: pending or failed mobile-money payments do not. */
const COMPLETED: Prisma.SaleWhereInput = { saleStatus: 'SUCCESSFUL' };

const clamp = (value: number | undefined, min: number, max: number, fallback: number) =>
  value === undefined || !Number.isFinite(value) ? fallback : Math.min(Math.max(Math.trunc(value), min), max);

/** % change, or null when there is nothing to compare against. */
const percentChange = (current: number, previous: number): number | null =>
  previous === 0 ? (current === 0 ? 0 : null) : +(((current - previous) / previous) * 100).toFixed(1);

const fullName = (p?: { firstName?: string | null; lastName?: string | null } | null) =>
  `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim();

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  private extractSaleItems(items: unknown): Array<{ name: string; quantity: number }> {
    if (!Array.isArray(items)) return [];
    return items
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map((item) => ({
        name: typeof item.name === 'string' ? item.name : 'Unnamed item',
        quantity:
          typeof item.quantity === 'number' || typeof item.quantity === 'string'
            ? Number(item.quantity) || 0
            : 0,
      }));
  }

  private async sumSales(where: Prisma.SaleWhereInput) {
    const res = await this.prisma.sale.aggregate({
      where: { ...COMPLETED, ...where },
      _sum: { total: true },
      _count: { _all: true },
    });
    return { total: Number(res._sum.total ?? 0), count: res._count._all };
  }

  private async sumExpenses(from: Date, to: Date) {
    const res = await this.prisma.branchExpense.aggregate({
      where: { dateIncurred: { gte: from, lt: to } },
      _sum: { amount: true },
    });
    return Number(res._sum.amount ?? 0);
  }

  private async topItems(where: Prisma.SaleWhereInput, take: number) {
    const sales = await this.prisma.sale.findMany({
      where: { ...COMPLETED, ...where },
      select: { items: true },
    });
    const totals = new Map<string, number>();
    let unitsSold = 0;
    for (const sale of sales) {
      for (const { name, quantity } of this.extractSaleItems(sale.items)) {
        unitsSold += quantity;
        totals.set(name, (totals.get(name) ?? 0) + quantity);
      }
    }
    const items = [...totals.entries()]
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, take);
    return { items, unitsSold };
  }

  private async inventoryHealth(storeIds?: number[]) {
    const where: Prisma.ProductInventoryWhereInput = storeIds ? { storeId: { in: storeIds } } : {};
    const [outOfStock, lowStock, totalLines, lowList] = await Promise.all([
      this.prisma.productInventory.count({ where: { ...where, qty: { lte: 0 } } }),
      this.prisma.productInventory.count({ where: { ...where, qty: { gt: 0, lte: LOW_STOCK_LEVEL } } }),
      this.prisma.productInventory.count({ where }),
      this.prisma.productInventory.findMany({
        where: { ...where, qty: { lte: LOW_STOCK_LEVEL } },
        orderBy: { qty: 'asc' },
        take: 8,
        select: {
          qty: true,
          item: { select: { id: true, name: true, category: { select: { name: true } } } },
          unit: { select: { name: true } },
          store: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      lowStockLevel: LOW_STOCK_LEVEL,
      totalLines,
      outOfStockCount: outOfStock,
      lowStockCount: lowStock,
      alerts: lowList.map((i) => ({
        itemId: i.item?.id,
        itemName: i.item?.name ?? 'Unknown item',
        category: i.item?.category?.name ?? null,
        qty: i.qty,
        unit: i.unit?.name ?? '',
        storeId: i.store?.id,
        storeName: i.store?.name ?? '',
      })),
    };
  }

  /* ------------------------------------------------------------------ */
  /* Management dashboard (money figures: reports permission only)       */
  /* ------------------------------------------------------------------ */

  async getManagementMetrics(trendDays?: number) {
    const days = clamp(trendDays, 7, 90, 7);
    const now = new Date();
    const today = startOfDay(now);
    const tomorrow = addDays(today, 1);
    const yesterday = subDays(today, 1);
    const monthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    // Compare month-to-date with the same number of days last month.
    const lastMonthSameDay = addDays(lastMonthStart, Math.max(now.getDate(), 1));
    const trendStart = startOfDay(subDays(now, days - 1));

    const [
      monthRevenue,
      lastMonthRevenue,
      todaySales,
      yesterdaySales,
      outstanding,
      monthExpenses,
      lastMonthExpenses,
      newClients,
      lastMonthClients,
      storeTotals,
      trendSales,
      top,
      inventory,
      recentSales,
    ] = await Promise.all([
      this.sumSales({ createdAt: { gte: monthStart, lt: tomorrow } }),
      this.sumSales({ createdAt: { gte: lastMonthStart, lt: lastMonthSameDay } }),
      this.sumSales({ createdAt: { gte: today, lt: tomorrow } }),
      this.sumSales({ createdAt: { gte: yesterday, lt: today } }),
      this.prisma.sale.aggregate({
        where: { ...COMPLETED, status: { not: 'FULLY_PAID' }, balance: { gt: 0 } },
        _sum: { balance: true },
        _count: { _all: true },
      }),
      this.sumExpenses(monthStart, tomorrow),
      this.sumExpenses(lastMonthStart, lastMonthSameDay),
      this.prisma.client.count({ where: { createdAt: { gte: monthStart, lt: tomorrow } } }),
      this.prisma.client.count({ where: { createdAt: { gte: lastMonthStart, lt: lastMonthSameDay } } }),
      this.prisma.sale.groupBy({
        by: ['storeId'],
        where: { ...COMPLETED, createdAt: { gte: monthStart, lt: tomorrow } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.sale.findMany({
        where: { ...COMPLETED, createdAt: { gte: trendStart, lt: tomorrow } },
        select: { total: true, createdAt: true },
      }),
      this.topItems({ createdAt: { gte: startOfDay(subDays(now, 29)), lt: tomorrow } }, 6),
      this.inventoryHealth(),
      this.prisma.sale.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          total: true,
          balance: true,
          status: true,
          saleStatus: true,
          createdAt: true,
          store: { select: { name: true } },
          employee: { select: { firstName: true, lastName: true } },
          client: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    // Revenue per day, every day present even with no sales.
    const byDay = new Map<string, number>();
    for (const s of trendSales) {
      const key = format(s.createdAt, 'yyyy-MM-dd');
      byDay.set(key, (byDay.get(key) ?? 0) + Number(s.total));
    }
    const revenueTrend = Array.from({ length: days }, (_, i) => {
      const day = addDays(trendStart, i);
      const key = format(day, 'yyyy-MM-dd');
      return { date: key, label: format(day, days <= 7 ? 'EEE' : 'd MMM'), revenue: Math.round(byDay.get(key) ?? 0) };
    });

    const stores = await this.prisma.store.findMany({
      where: { id: { in: storeTotals.map((s) => s.storeId) } },
      select: { id: true, name: true },
    });
    const storeName = new Map(stores.map((s) => [s.id, s.name]));
    const salesByStore = storeTotals
      .map((s) => ({
        storeId: s.storeId,
        name: storeName.get(s.storeId) ?? `Store ${s.storeId}`,
        revenue: Math.round(Number(s._sum.total ?? 0)),
        sales: s._count._all,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      status: 200,
      message: 'Dashboard data fetched successfully',
      data: {
        generatedAt: now.toISOString(),
        kpis: {
          revenueThisMonth: {
            value: monthRevenue.total,
            sales: monthRevenue.count,
            change: percentChange(monthRevenue.total, lastMonthRevenue.total),
          },
          salesToday: {
            value: todaySales.total,
            sales: todaySales.count,
            change: percentChange(todaySales.total, yesterdaySales.total),
          },
          outstandingCredit: {
            value: Number(outstanding._sum.balance ?? 0),
            sales: outstanding._count._all,
          },
          expensesThisMonth: {
            value: monthExpenses,
            change: percentChange(monthExpenses, lastMonthExpenses),
          },
          newClients: {
            value: newClients,
            change: percentChange(newClients, lastMonthClients),
          },
        },
        revenueTrend,
        salesByStore,
        topSellingItems: top.items,
        inventory,
        recentSales: recentSales.map((s) => ({
          id: s.id,
          total: Number(s.total),
          balance: Number(s.balance),
          paymentStatus: s.status,
          saleStatus: s.saleStatus,
          createdAt: s.createdAt,
          storeName: s.store?.name ?? '',
          servedBy: fullName(s.employee),
          clientName: s.client ? fullName(s.client) : null,
        })),
      },
    };
  }

  /* ------------------------------------------------------------------ */
  /* Staff dashboard: counts only, own branch, sections by permission    */
  /* ------------------------------------------------------------------ */

  async getStaffMetrics(
    user: AuthenticatedUser,
    params: { storeId?: number; branchId?: number; salesDays?: number; expenseDays?: number },
  ) {
    const fullAccess = isFullAccess(user);
    const salesDays = clamp(params.salesDays, 1, 90, 7);
    const expenseDays = clamp(params.expenseDays, 1, 365, 30);

    // Staff only ever see their own branch. Full-access roles may look at any branch.
    const branchId = fullAccess ? (params.branchId ?? user.branchId ?? undefined) : (user.branchId ?? undefined);
    if (!fullAccess && !branchId) {
      throw new ForbiddenException('Your account is not linked to a branch. Ask your administrator.');
    }

    const branchStores = await this.prisma.store.findMany({
      where: branchId ? { branchId } : {},
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    let storeIds: number[] | undefined = branchId ? branchStores.map((s) => s.id) : undefined;
    let selectedStore: { id: number; name: string } | null = null;
    if (params.storeId !== undefined) {
      selectedStore = branchStores.find((s) => s.id === params.storeId) ?? null;
      if (!selectedStore) throw new ForbiddenException("That store isn't in your branch.");
      storeIds = [selectedStore.id];
    }

    const canSales = hasPermission(user, PERMISSIONS.SALES);
    const canInventory = hasPermission(user, PERMISSIONS.INVENTORY);
    const canExpenses = hasPermission(user, PERMISSIONS.EXPENSES);
    const now = new Date();
    const tomorrow = startOfDay(addDays(now, 1));
    const storeFilter = storeIds ? { storeId: { in: storeIds } } : {};

    const [sales, inventory, recentActivity, expenses, branch] = await Promise.all([
      canSales ? this.staffSales(storeFilter, salesDays, now, tomorrow) : null,
      canInventory ? this.inventoryHealth(storeIds) : null,
      canInventory
        ? this.prisma.inventoryRecord.findMany({
            where: storeIds ? { OR: [{ storeId: { in: storeIds } }, { toStoreId: { in: storeIds } }] } : {},
            orderBy: { createdAt: 'desc' },
            take: 8,
            select: {
              id: true,
              category: true,
              qty: true,
              transferStatus: true,
              createdAt: true,
              item: { select: { name: true } },
              unit: { select: { name: true } },
              store: { select: { name: true } },
              toStore: { select: { name: true } },
              employee: { select: { firstName: true, lastName: true } },
            },
          })
        : null,
      canExpenses ? this.staffExpenses(branchId, expenseDays, now) : null,
      branchId ? this.prisma.branch.findUnique({ where: { id: branchId }, select: { id: true, name: true } }) : null,
    ]);

    return {
      status: 200,
      message: 'Employee dashboard data fetched successfully',
      data: {
        generatedAt: now.toISOString(),
        scope: {
          branch,
          store: selectedStore,
          stores: branchStores,
        },
        sales,
        inventory: inventory
          ? {
              ...inventory,
              recentActivity: (recentActivity ?? []).map((r) => ({
                id: r.id,
                type: r.category,
                qty: r.qty,
                unit: r.unit?.name ?? '',
                status: r.transferStatus,
                createdAt: r.createdAt,
                itemName: r.item?.name ?? 'Unknown item',
                fromStore: r.store?.name ?? '',
                toStore: r.toStore?.name ?? null,
                recordedBy: fullName(r.employee),
              })),
            }
          : null,
        expenses,
      },
    };
  }

  private async staffSales(storeFilter: Prisma.SaleWhereInput, days: number, now: Date, tomorrow: Date) {
    const start = startOfDay(subDays(now, days - 1));
    const where: Prisma.SaleWhereInput = { ...COMPLETED, ...storeFilter, createdAt: { gte: start, lt: tomorrow } };

    const [count, todayCount, byPayment, top, recent] = await Promise.all([
      this.prisma.sale.count({ where }),
      this.prisma.sale.count({ where: { ...COMPLETED, ...storeFilter, createdAt: { gte: startOfDay(now), lt: tomorrow } } }),
      this.prisma.sale.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.topItems({ ...storeFilter, createdAt: { gte: start, lt: tomorrow } }, 6),
      this.prisma.sale.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          status: true,
          items: true,
          createdAt: true,
          store: { select: { name: true } },
          employee: { select: { firstName: true, lastName: true } },
          client: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    return {
      days,
      salesCount: count,
      salesToday: todayCount,
      unitsSold: top.unitsSold,
      byPaymentStatus: Object.fromEntries(byPayment.map((g) => [g.status, g._count._all])),
      topItems: top.items,
      recentSales: recent.map((s) => ({
        id: s.id,
        paymentStatus: s.status,
        createdAt: s.createdAt,
        storeName: s.store?.name ?? '',
        servedBy: fullName(s.employee),
        clientName: s.client ? fullName(s.client) : null,
        itemsCount: this.extractSaleItems(s.items).reduce((sum, it) => sum + it.quantity, 0),
      })),
    };
  }

  private async staffExpenses(branchId: number | undefined, days: number, now: Date) {
    const where: Prisma.branchExpenseWhereInput = {
      dateIncurred: { gte: startOfDay(subDays(now, days - 1)), lte: endOfDay(now) },
      ...(branchId ? { branchId } : {}),
    };
    const [count, byCategory, recent] = await Promise.all([
      this.prisma.branchExpense.count({ where }),
      this.prisma.branchExpense.groupBy({ by: ['category'], where, _count: { _all: true } }),
      this.prisma.branchExpense.findMany({
        where,
        orderBy: { dateIncurred: 'desc' },
        take: 6,
        select: {
          id: true,
          title: true,
          category: true,
          dateIncurred: true,
          employee: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    return {
      days,
      entries: count,
      byCategory: byCategory
        .map((g) => ({ category: g.category, entries: g._count._all }))
        .sort((a, b) => b.entries - a.entries),
      recent: recent.map((e) => ({
        id: e.id,
        title: e.title,
        category: e.category,
        dateIncurred: e.dateIncurred,
        recordedBy: fullName(e.employee),
      })),
    };
  }
}
