import { PartialType } from '@nestjs/mapped-types';
import { ArrayUnique, IsArray, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  /** Permission values, e.g. ["record_attendance", "access_sales"]. */
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissions: string[];
}

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
