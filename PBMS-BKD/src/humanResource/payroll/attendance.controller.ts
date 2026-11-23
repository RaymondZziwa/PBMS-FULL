import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { CreateAttendanceDto, UpdateAttendanceDto } from 'src/dto/attendance.dto';
import { RequirePermissions } from 'src/auth/decorators';
import { PERMISSIONS } from 'src/auth/permissions';

/**
 * Recording attendance has its own permission ("Record Attendance"), separate
 * from HR, so a supervisor can clock people in and out without seeing salaries.
 * HR users can do it too. Payroll stays in PayrollController.
 */
@Controller('api/employees')
@RequirePermissions(PERMISSIONS.ATTENDANCE, PERMISSIONS.HR)
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

  @Get('attendance/daily-sheet')
  getDailyAttendanceSheet(@Query('date') date?: string) {
    return this.payrollService.getDailyAttendanceSheet(date);
  }
}
