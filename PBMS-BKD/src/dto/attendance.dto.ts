// src/dto/attendance.dto.ts
import { IsString, IsDateString, IsOptional } from 'class-validator';

export class CreateAttendanceDto {
  @IsString()
  date: string;

  /** Employee id; the screen may send it as text. */
  employeeId: number | string;

  @IsDateString()
  timeIn: string;

  @IsDateString()
  @IsOptional()
  timeOut?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateAttendanceDto {
  @IsDateString()
  @IsOptional()
  timeOut?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class AttendanceResponseDto {
  id: number;
  date: string;
  employeeId: number;
  timeIn: Date;
  timeOut?: Date;
  createdAt: Date;
  updatedAt: Date;
  employee?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

export interface IPayrollEmployee {
  id: number;
  firstName: string;
  lastName: string;
  branch: string;
  department: string;
  baseSalary: string;
  deductions: { name: string; value: string }[];
  allowances: { name: string; value: string }[];
  grossPay: string;
  netPay: string;
}

export class CreatePayrollDto {
  periodStart: Date;
  periodEnd: Date;
  payrollDetails: IPayrollEmployee[];
  generalDeductions: [];
  generalAllowances: [];
}
