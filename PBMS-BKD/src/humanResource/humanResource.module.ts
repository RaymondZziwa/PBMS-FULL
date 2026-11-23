import { Module } from '@nestjs/common';
import { DepartmentController } from './departments/department.controller';
import { DepartmentService } from './departments/department.service';
import { EmployeeController } from './employees/employee.controller';
import { EmployeeService } from './employees/employee.service';
import { PayrollController } from './payroll/payroll.controller';
import { AttendanceController } from './payroll/attendance.controller';
import { PayrollService } from './payroll/payroll.service';

@Module({
  controllers: [DepartmentController, EmployeeController, PayrollController, AttendanceController],
  providers: [
    DepartmentService,
    EmployeeService,
    PayrollService,
  ],
})
export class HumanResourceModule {}
