import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser, RequirePermissions } from 'src/auth/decorators';
import { PERMISSIONS, type AuthenticatedUser } from 'src/auth/permissions';

/** "12" → 12, missing → undefined, anything else → 400. */
const optionalInt = (value: string | undefined, name: string): number | undefined => {
  if (value === undefined || value === '') return undefined;
  if (!/^\d+$/.test(value)) throw new BadRequestException(`${name} must be a whole number`);
  return Number(value);
};

@Controller('api/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /** Management dashboard: revenue, credit, expenses. Reports permission (or admin) only. */
  @Get('metrics')
  @RequirePermissions(PERMISSIONS.REPORTS)
  getMetrics(@Query('days') days?: string) {
    return this.dashboardService.getManagementMetrics(optionalInt(days, 'days'));
  }

  /**
   * Staff dashboard: counts only, no money. Each section appears only if the
   * user's role has that module; data is limited to the user's own branch.
   */
  @Get('employee-metrics')
  getEmployeeMetrics(
    @CurrentUser() user: AuthenticatedUser,
    @Query('storeId') storeId?: string,
    @Query('branchId') branchId?: string,
    @Query('salesDays') salesDays?: string,
    @Query('expenseDays') expenseDays?: string,
  ) {
    return this.dashboardService.getStaffMetrics(user, {
      storeId: optionalInt(storeId, 'storeId'),
      branchId: optionalInt(branchId, 'branchId'),
      salesDays: optionalInt(salesDays, 'salesDays'),
      expenseDays: optionalInt(expenseDays, 'expenseDays'),
    });
  }
}
