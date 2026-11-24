import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { CreateAttendanceDto, UpdateAttendanceDto } from 'src/dto/attendance.dto';
import { JwtAuthGuard } from 'src/guards/authGuard.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';

/**
 * Recording attendance is everyday work, not HR work: any signed-in user may
 * clock people in and out and see the day's sheet. No HR permission needed.
 * Payroll (salaries, period summaries) stays in PayrollController behind HR.
 */
@Controller('api/employees')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AttendanceController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('record-attendance')
  recordAttendance(@Body() dto: CreateAttendanceDto) {
    return this.payrollService.createAttendance(dto);
  }

  @Put('modify-attendance/:id')
  modifyAttendance(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAttendanceDto) {
    return this.payrollService.updateAttendance(id, dto);
  }

  /** Removes a record entered by mistake (the screen asks for confirmation first). */
  @Delete('attendance/:id')
  deleteAttendance(@Param('id', ParseIntPipe) id: number) {
    return this.payrollService.deleteAttendance(id);
  }

  @Get('attendance/daily-sheet')
  getDailyAttendanceSheet(@Query('date') date?: string) {
    return this.payrollService.getDailyAttendanceSheet(date);
  }
}
