// dto/create-stock-movement.dto.ts
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { InventoryRecordCategory } from '@prisma/client';

export class CreateStockMovementDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsString()
  @IsNotEmpty()
  storeId: string;

  @IsString()
  @IsOptional()
  toStoreId: string;

  @IsString()
  @IsNotEmpty()
  unitId: string;

  @IsString()
  source: string;

  @IsString()
  qty: string;

  @IsEnum(InventoryRecordCategory)
  category: InventoryRecordCategory;

  @IsString()
  @IsNotEmpty()
  employeeId: string; // ✅ who made the transaction

  @IsString()
  @IsNotEmpty()
  deliveryNoteId: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class ConfirmStockMovementDto {
  transferId: string;
  confirmedQty: number;
  notes: string;
}

export class RejectStockMovementDto {
  transferId: string;
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
  @IsString()
  registeredBy: string;

  @IsOptional()
  @IsString()
  notes: string;
}
