import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Put,
  Delete,
  ParseIntPipe,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PayrollService } from './payroll.service';
import {
  CreatePayrollPeriodDto,
  PaymentStructureDto,
} from 'src/dto/payroll.dto';
import { RequirePermissions } from 'src/auth/decorators';
import { PERMISSIONS } from 'src/auth/permissions';

/**
 * Payroll: salaries are sensitive. HR or "Assess Payroll" (or admin) only.
 * Recording attendance lives in AttendanceController with its own permission.
 */
@Controller('api/employees')
@RequirePermissions(PERMISSIONS.HR, PERMISSIONS.PAYROLL)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get('summary')
  async getAttendanceSummaryByPeriod(
    @Query('companyId') companyId: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    // Basic validation
    if (!startDate || !endDate) {
      throw new BadRequestException(
        'companyId, startDate, and endDate are required query parameters.',
      );
    }

    // Validate date format
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format.');
    }

    return await this.payrollService.getAttendanceSummaryByPeriod(
      startDate,
      endDate,
    );
  }

  @Post('save-payroll')
  async createPayrollPeriod(@Body() dto: CreatePayrollPeriodDto) {
    return this.payrollService.createPayrollPeriod(dto);
  }

  /** GET all payroll periods (history) */
  @Get('payroll-history')
  async getPayrollHistory() {
    return this.payrollService.listPayrollPeriods();
  }

  /** GET a single payroll period by ID */
  @Get('period/:id')
  async getPayrollPeriod(@Param('id', ParseIntPipe) id: number) {
    const payrollPeriod = await this.payrollService.getPayrollPeriod(id);
    if (!payrollPeriod) throw new NotFoundException('Payroll period not found');
    return payrollPeriod;
  }

  /** UPDATE payroll period */
  @Put('period/:id')
  async updatePayrollPeriod(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePayrollPeriodDto,
  ) {
    return this.payrollService.updatePayrollPeriod(id, dto);
  }

  /** UPSERT payrolls for a payroll period */
  @Put('period/:id/payrolls')
  async upsertPayrolls(
    @Param('id', ParseIntPipe) payrollPeriodId: number,
    @Body() payrolls: PaymentStructureDto[],
  ) {
    return this.payrollService.upsertPayrolls(payrollPeriodId, payrolls);
  }

  /** DELETE payroll period (the screen sends DELETE; this used to be POST, so deleting always failed) */
  @Delete('delete-payroll/:id')
  async deletePayrollPeriod(@Param('id', ParseIntPipe) id: number) {
    return this.payrollService.deletePayrollPeriod(id);
  }
}
