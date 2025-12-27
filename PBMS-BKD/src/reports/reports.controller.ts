import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ReportService } from './reports.service';

@Controller('api/reports')
export class ReportsController {
  constructor(private readonly reportService: ReportService) {}

  @Get('/stock-level-analysis/:id')
  async getStockLevelAnalysis(@Param('id') id: string) {
    return await this.reportService.stockLevelAnalysis(id);
  }

  @Get('/stock-level-analysis/print/:id')
  async printStockLevelAnalysis(@Param('id') id: string) {
    return await this.reportService.exportStockLevelAnalysisPDF(id);
  }

  @Get('/stock-level-movement/:id')
  async getStockMovementAnalysis(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('itemId') itemId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('movementType') movementType?: string,
  ) {
    return await this.reportService.stockMovementAnalysis(
      id,
      startDate,
      endDate,
      itemId,
      categoryId,
      movementType,
    );
  }

  @Get('/stock-level-movement/print/:id')
  async printStockMovementAnalysis(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('itemId') itemId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('movementType') movementType?: string,
  ) {
    const exportResult =
      await this.reportService.exportStockMovementAnalysisPDF(
        id,
        startDate,
        endDate,
        itemId,
        categoryId,
        movementType,
      );

    return {
      status: 200,
      data: exportResult,
      message: 'Stock movement PDF generated successfully',
    };
  }

  //exhibiton reports
  @Get('/exhibition-revenue-comparison')
  async getExhibitionRevenueComparison(
    @Query('exhibitionIds') exhibitionIds?: string,
  ) {
    const exhibitionIdArray = exhibitionIds?.split(',').filter(Boolean);
    return await this.reportService.exhibitionRevenueComparison(
      exhibitionIdArray,
    );
  }

  @Get('/exhibition-sales-summary')
  async getExhibitionSalesSummary(@Query('expoId') expoId?: string) {
    return await this.reportService.exhibitionSalesSummary(expoId);
  }

  @Get('/exhibition-expenses-summary')
  async getExhibitionExpensesSummary(@Query('expoId') expoId?: string) {
    return await this.reportService.exhibitionExpensesSummary(expoId);
  }

  @Get('/exhibition/print/:reportType')
  async printExhibitionReport(
    @Param('reportType')
    reportType: 'revenue-comparison' | 'sales-summary' | 'expenses-summary',
    @Query('exhibitionIds') exhibitionIds?: string,
    @Query('expoId') expoId?: string,
  ) {
    // Validate report type
    const validReportTypes = [
      'revenue-comparison',
      'sales-summary',
      'expenses-summary',
    ];
    if (!validReportTypes.includes(reportType)) {
      throw new BadRequestException(
        `Invalid report type. Must be one of: ${validReportTypes.join(', ')}`,
      );
    }

    // Build filters object
    const filters: {
      exhibitionIds?: string[];
      expoId?: string;
    } = {};

    if (exhibitionIds) {
      filters.exhibitionIds = exhibitionIds.split(',').filter(Boolean);
    }

    if (expoId) {
      filters.expoId = expoId;
    }

    // Generate PDF
    return await this.reportService.exportExhibitionReportToPDF(
      reportType,
      filters,
    );
  }

  // Alternative endpoint for individual exhibition report types
  @Get('/exhibition/revenue-comparison/print')
  async printExhibitionRevenueComparison(
    @Query('exhibitionIds') exhibitionIds?: string,
  ) {
    const filters: { exhibitionIds?: string[] } = {};
    if (exhibitionIds) {
      filters.exhibitionIds = exhibitionIds.split(',').filter(Boolean);
    }

    return await this.reportService.exportExhibitionReportToPDF(
      'revenue-comparison',
      filters,
    );
  }

  @Get('/exhibition/sales-summary/print')
  async printExhibitionSalesSummary(@Query('expoId') expoId?: string) {
    const filters: { expoId?: string } = {};
    if (expoId) {
      filters.expoId = expoId;
    }

    return await this.reportService.exportExhibitionReportToPDF(
      'sales-summary',
      filters,
    );
  }

  @Get('/exhibition/expenses-summary/print')
  async printExhibitionExpensesSummary(@Query('expoId') expoId?: string) {
    const filters: { expoId?: string } = {};
    if (expoId) {
      filters.expoId = expoId;
    }

    return await this.reportService.exportExhibitionReportToPDF(
      'expenses-summary',
      filters,
    );
  }

  // Daily Sales Summary
  @Get('sales/daily-summary')
  async getDailySalesSummary(
    @Query('storeId') storeId?: string,
    @Query('date') date?: string,
  ) {
    return await this.reportService.dailySalesSummary(storeId, date);
  }

  // Period Sales Summary
  @Get('period-summary')
  async getPeriodSalesSummary(
    @Query('storeId') storeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.reportService.periodSalesSummary(
      storeId,
      startDate,
      endDate,
    );
  }

  @Get('expenses/expenses-report')
  async getExpensesReport(
    @Query('branchId') branchId?: string,
    @Query('category') category?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.reportService.expenseByCategory(
      branchId,
      category,
      startDate,
      endDate,
    );
  }

  @Get('expenses/export-report')
  async exportExpensesReport(
    @Query('branchId') branchId?: string,
    @Query('category') category?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.reportService.exportExpenseReportPDF(
      branchId,
      category,
      startDate,
      endDate,
    );
  }

  // Store Sales Comparison
  @Get('sales/store-comparison')
  async getStoreSalesComparison(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.reportService.storeSalesComparison(startDate, endDate);
  }

  // Massage Service Sales
  @Get('massage-services')
  async getMassageServiceSales(
    @Query('serviceId') serviceId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.reportService.massageServiceSales(
      serviceId,
      startDate,
      endDate,
    );
  }

  // Product Performance
  @Get('sales/product-performance')
  async getProductPerformance(
    @Query('itemId') itemId: string,
    @Query('storeId') storeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.reportService.productPerformance(
      itemId,
      storeId,
      startDate,
      endDate,
    );
  }

  // Export PDF Reports
  // Alternative export endpoints with query parameters

  // Export Daily Sales Summary
  @Get('export/daily-summary')
  async exportDailySalesSummary(
    @Query('storeId') storeId?: string,
    @Query('date') date?: string,
  ) {
    return await this.reportService.exportSalesReportToPDF('daily-sales', {
      storeId,
      date,
    });
  }

  // Export Period Sales Summary
  @Get('export/period-summary')
  async exportPeriodSalesSummary(
    @Query('storeId') storeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.reportService.exportSalesReportToPDF('period-sales', {
      storeId,
      startDate,
      endDate,
    });
  }

  // Export Store Comparison
  @Get('export/store-comparison')
  async exportStoreComparison(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.reportService.exportSalesReportToPDF('store-comparison', {
      startDate,
      endDate,
    });
  }

  // Export Massage Services
  @Get('export/massage-services')
  async exportMassageServices(
    @Query('serviceId') serviceId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.reportService.exportSalesReportToPDF('massage-services', {
      serviceId,
      startDate,
      endDate,
    });
  }

  // Export Product Performance
  @Get('export/product-performance')
  async exportProductPerformance(
    @Query('itemId') itemId: string,
    @Query('storeId') storeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.reportService.exportSalesReportToPDF(
      'product-performance',
      { itemId, storeId, startDate, endDate },
    );
  }

  // Store-specific reports
  @Get('store/:storeId/daily-summary')
  async getStoreDailySalesSummary(
    @Param('storeId') storeId: string,
    @Query('date') date?: string,
  ) {
    return await this.reportService.dailySalesSummary(storeId, date);
  }

  @Get('store/:storeId/period-summary')
  async getStorePeriodSalesSummary(
    @Param('storeId') storeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.reportService.periodSalesSummary(
      storeId,
      startDate,
      endDate,
    );
  }

  @Get('store/:storeId/export/daily-summary')
  async exportStoreDailySalesSummary(
    @Param('storeId') storeId: string,
    @Query('date') date?: string,
  ) {
    return await this.reportService.exportSalesReportToPDF('daily-sales', {
      storeId,
      date,
    });
  }

  @Get('store/:storeId/export/period-summary')
  async exportStorePeriodSalesSummary(
    @Param('storeId') storeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.reportService.exportSalesReportToPDF('period-sales', {
      storeId,
      startDate,
      endDate,
    });
  }

  @Get('massage-service/:serviceId/export/sales')
  async exportMassageServiceSales(
    @Param('serviceId') serviceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.reportService.exportSalesReportToPDF('massage-services', {
      serviceId,
      startDate,
      endDate,
    });
  }
}
