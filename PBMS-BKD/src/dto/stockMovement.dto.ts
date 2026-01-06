// dto/create-stock-movement.dto.ts
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { InventoryRecordCategory } from '@prisma/client';

export class CreateStockMovementDto {
  @IsNumber()
  @IsNotEmpty()
  itemId: number;

  @IsNumber()
  @IsNotEmpty()
  storeId: number;

  @IsNumber()
  @IsOptional()
  toStoreId: number;

  @IsNumber()
  @IsNotEmpty()
  unitId: number;

  @IsString()
  source: string;

  @IsString()
  qty: string;

  @IsEnum(InventoryRecordCategory)
  category: InventoryRecordCategory;

  @IsNumber()
  @IsNotEmpty()
  employeeId: number; // ✅ who made the transaction

  @IsNumber()
  @IsNotEmpty()
  deliveryNoteId: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class ConfirmStockMovementDto {
  transferId: number;
  confirmedQty: number;
  notes: string;
}

export class RejectStockMovementDto {
  transferId: number;
  reason: string;
}

export class CreateDeliveryNoteDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  deliveryNoteNumber: string;

  @IsOptional()
  @IsNumber()
  registeredBy: number;

  @IsOptional()
  @IsString()
  notes: string;
}
