import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { ExpenseCategory, InventoryRecordCategory } from '@prisma/client';

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export class CreateExhibitionDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() location: string;
  @IsString() @IsOptional() description?: string;
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
}

export class CreateExhibitionStoreDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() exhibitionId: string;
}

export class InventoryOperationDto {
  @IsString() @IsNotEmpty() storeId: string;
  @IsString() @IsNotEmpty() itemId: string;
  @IsNotEmpty() quantity: string; // we keep string to allow Decimal values; Prisma Decimal will accept string
  @IsString() @IsOptional() reason?: string;
  @IsString() @IsNotEmpty() employeeId: string;
  @IsString() @IsOptional() category?: string; // e.g., 'RESTOCK', 'DEPLETION', 'ADJUSTMENT'
}

export class CreateExhibitionSaleDto {
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsString()
  @IsNotEmpty()
  cashierId: string;

  @IsString()
  @IsNotEmpty()
  exhibitionId: string;

  @IsArray()
  @ValidateNested({ each: true })
  items: CartItem[];

  @IsNotEmpty()
  saleTotal: string;

  @IsOptional()
  @IsString()
  storeId?: string;
}

export class FetchExhibitionSalesDto {
  exhibitionId?: string;
}

export class CreateExhibitionExpenseDto {
  @IsNotEmpty()
  category: ExpenseCategory;

  @IsString()
  @IsNotEmpty()
  exhibitionId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsDateString()
  dateIncurred: string;
}

export class UpdateExhibitionExpenseDto {
  @IsOptional()
  category?: ExpenseCategory;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsDateString()
  dateIncurred?: string;
}

export class CreateExpoStockMovementDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsString()
  @IsNotEmpty()
  storeId: string;

  @IsString()
  @IsNotEmpty()
  unitId: string;

  @IsString()
  source: string;

  @IsNumber()
  qty: number;

  @IsEnum(InventoryRecordCategory)
  category: InventoryRecordCategory;

  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateExhibitionDto extends PartialType(CreateExhibitionDto) {}
export class UpdateExhibitionStoreDto extends PartialType(
  CreateExhibitionStoreDto,
) {}
