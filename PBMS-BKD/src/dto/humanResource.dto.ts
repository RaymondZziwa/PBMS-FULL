import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateDepartmentDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsUUID()
  branchId: string;
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
  @IsUUID()
  roleId: string;

  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  deptId?: string;
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
