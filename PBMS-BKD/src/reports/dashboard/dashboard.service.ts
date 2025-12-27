import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // --- 1️⃣ SALES POINT DATA ---
  private async getSalesPointData() {
    const sales = await this.prisma.sale.findMany({
      select: {
        total: true,
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const storeSalesMap: Record<string, number> = {};
    for (const sale of sales) {
      const storeName = sale.store?.name || 'Unknown';
      storeSalesMap[storeName] =
        (storeSalesMap[storeName] || 0) + Number(sale.total);
    }

    return Object.entries(storeSalesMap).map(([name, sales]) => ({
      name,
      sales: Math.floor(sales),
    }));
  }

  // --- 2️⃣ WEEKLY REVENUE (BAR CHART) ---
  private async getWeeklyRevenue() {
    const today = new Date();
    const days = Array.from({ length: 7 }).map((_, i) => subDays(today, 6 - i));

    const sales = await this.prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startOfDay(subDays(today, 6)),
          lte: endOfDay(today),
        },
      },
      select: { total: true, createdAt: true },
    });

    const revenueMap: Record<string, number> = {};
    for (const sale of sales) {
      const dayLabel = format(sale.createdAt, 'EEE');
      revenueMap[dayLabel] = (revenueMap[dayLabel] || 0) + Number(sale.total);
    }

    return days.map((day) => ({
      day: format(day, 'EEE'),
      revenue: Math.floor(revenueMap[format(day, 'EEE')] || 0),
    }));
  }

  // --- 3️⃣ TOP 5 SELLING ITEMS ---
  private async getTopSellingItems() {
    const sales = await this.prisma.sale.findMany({
      select: { items: true },
    });

    const itemSalesMap: Record<string, number> = {};
    for (const sale of sales) {
      const saleItems = sale.items as any[];
      if (!Array.isArray(saleItems)) continue;

      for (const item of saleItems) {
        const name = item.name || 'Unnamed Item';
        const quantity = Number(item.quantity) || 0;
        itemSalesMap[name] = (itemSalesMap[name] || 0) + quantity;
      }
    }

    return Object.entries(itemSalesMap)
      .map(([name, sales]) => ({ name, sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  }

  // --- 4️⃣ METRIC CARDS (REVENUE, CLIENTS, DAILY SALES, TOP STORE) ---
  private async getMetricCards() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const yearForLastMonth = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Total revenue comparison
    const [currentMonthSales, lastMonthSales] = await Promise.all([
      this.prisma.sale.findMany({
        where: {
          createdAt: {
            gte: new Date(currentYear, currentMonth, 1),
            lt: new Date(currentYear, currentMonth + 1, 1),
          },
        },
        select: { total: true },
      }),
      this.prisma.sale.findMany({
        where: {
          createdAt: {
            gte: new Date(yearForLastMonth, lastMonth, 1),
            lt: new Date(currentYear, currentMonth, 1),
          },
        },
        select: { total: true },
      }),
    ]);

    const currentRevenue = currentMonthSales.reduce(
      (s, a) => s + Number(a.total),
      0,
    );
    const lastRevenue = lastMonthSales.reduce((s, a) => s + Number(a.total), 0);
    const revenueChange =
      lastRevenue === 0
        ? 0
        : ((currentRevenue - lastRevenue) / lastRevenue) * 100;

    // Clients comparison
    const [currentMonthClients, lastMonthClients] = await Promise.all([
      this.prisma.client.count({
        where: {
          createdAt: {
            gte: new Date(currentYear, currentMonth, 1),
            lt: new Date(currentYear, currentMonth + 1, 1),
          },
        },
      }),
      this.prisma.client.count({
        where: {
          createdAt: {
            gte: new Date(yearForLastMonth, lastMonth, 1),
            lt: new Date(currentYear, currentMonth, 1),
          },
        },
      }),
    ]);

    const clientChange =
      lastMonthClients === 0
        ? 0
        : ((currentMonthClients - lastMonthClients) / lastMonthClients) * 100;

    // Daily sales comparison
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const [todaySales, yesterdaySales] = await Promise.all([
      this.prisma.sale.findMany({
        where: {
          createdAt: {
            gte: new Date(
              today.getFullYear(),
              today.getMonth(),
              today.getDate(),
            ),
            lt: new Date(
              today.getFullYear(),
              today.getMonth(),
              today.getDate() + 1,
            ),
          },
        },
        select: { total: true },
      }),
      this.prisma.sale.findMany({
        where: {
          createdAt: {
            gte: new Date(
              yesterday.getFullYear(),
              yesterday.getMonth(),
              yesterday.getDate(),
            ),
            lt: new Date(
              today.getFullYear(),
              today.getMonth(),
              today.getDate(),
            ),
          },
        },
        select: { total: true },
      }),
    ]);

    const todayTotal = todaySales.reduce((s, a) => s + Number(a.total), 0);
    const yesterdayTotal = yesterdaySales.reduce(
      (s, a) => s + Number(a.total),
      0,
    );
    const dailyChange =
      yesterdayTotal === 0
        ? 0
        : ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;

    // Top store for month
    const monthlySalesByStore = await this.prisma.sale.groupBy({
      by: ['storeId'],
      where: {
        createdAt: {
          gte: new Date(currentYear, currentMonth, 1),
          lt: new Date(currentYear, currentMonth + 1, 1),
        },
      },
      _sum: { total: true },
    });

    let topStore = { storeName: 'N/A', totalSales: 0 };
    if (monthlySalesByStore.length > 0) {
      const best = monthlySalesByStore.reduce((a, b) =>
        (a._sum.total || 0) > (b._sum.total || 0) ? a : b,
      );
      const store = await this.prisma.store.findUnique({
        where: { id: best.storeId },
      });
      topStore = {
        storeName: store?.name || 'N/A',
        totalSales: Number(best._sum?.total) || 0,
      };
    }

    return {
      totalRevenue: {
        value: currentRevenue,
        change: +revenueChange.toFixed(2),
        isPositive: revenueChange >= 0,
      },
      newClients: {
        value: currentMonthClients,
        change: +clientChange.toFixed(2),
        isPositive: clientChange >= 0,
      },
      dailySales: {
        value: todayTotal,
        change: +dailyChange.toFixed(2),
        isPositive: dailyChange >= 0,
      },
      topStore,
    };
  }

  // --- 5️⃣ MAIN WRAPPER FUNCTION ---
  async getDashboardMetrics() {
    const [salesPointData, weeklyRevenue, topSellingItems, metrics] =
      await Promise.all([
        this.getSalesPointData(),
        this.getWeeklyRevenue(),
        this.getTopSellingItems(),
        this.getMetricCards(),
      ]);

    return {
      status: 200,
      message: 'Dashboard data fetched successfully',
      data: {
        salesPointData,
        weeklyRevenue,
        topSellingItems,
        metrics,
      },
    };
  }
}
