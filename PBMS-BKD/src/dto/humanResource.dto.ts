import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsUUID,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateDepartmentDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  branchId: number;
}

export class CreateEmployeeDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsNotEmpty()
  @IsString()
  gender: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  tel: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  salary: number;

  @IsOptional()
  @IsBoolean()
  hasAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  hasPrescriptionAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  profileImage?: string;

  @IsNotEmpty()
  @IsNumber()
  roleId: number;

  @IsNumber()  branchId?: number;

  @IsOptional()
  @IsNumber()  deptId?: number;
}

export class employeeProfileUpdateDto {
  @IsEmail()
  email: string;

  @IsString()
  tel: string;

  @IsString()
  password: string;
}

export class saveEmployeeSystemSettingsDto {
  @IsBoolean()
  twoFactorAuth: boolean;

  @IsString()
  systemEmails: string;
}

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {}
export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}
