import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  IsOptional,
  IsEnum,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { PaymentMethodType } from '@prisma/client';

export enum PaymentStatus {
  FULLY_PAID = 'FULLY_PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  UNPAID = 'UNPAID',
}

export class PaymentMethodDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsNumber()
  @Min(0)
  amount: number;
}

export class ItemCategoryDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsString()
  name: string;
}

export class SaleItemDto {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsNumber()
  @IsNotEmpty()
  categoryId: number;

  @IsString()
  name: string;

  @IsString()
  price: string; // if numeric in DB, change to @IsNumber()

  @IsString()
  barcode: string;

  @ValidateNested()
  @Type(() => ItemCategoryDto)
  category: ItemCategoryDto;

  @IsNumber()
  quantity: number;

  @IsNumber()
  discount: number;

  @IsNumber()
  total: number;
}

export class CreateSaleDto {
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @IsArray()
  @ValidateNested({ each: true })
  paymentMethods: { type: PaymentMethodType; amount: number }[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsNumber()
  total: number;

  @IsNumber()
  balance: number;

  @IsOptional()
  @IsNumber()
  totalWithCharges?: number;

  @IsArray()
  @ValidateNested({ each: true })
  items: {
    id: number;
    categoryId: number;
    name: string;
    price: string;
    barcode: string;
    category: any;
    quantity: number;
    discount: number;
    total: number;
    unitId: number;
  }[];

  @IsNumber()
  @IsNotEmpty()
  storeId: number;

  @IsNumber()
  @IsNotEmpty()
  customerId: number;

  @IsNumber()
  @IsNotEmpty()
  servedBy: number;

  @IsString()
  @IsOptional()
  phoneNumber: string;
}

export class ExhibitionCreateSaleDto {
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @IsArray()
  @ValidateNested({ each: true })
  paymentMethods: [];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsNumber()
  total: number;

  @IsNumber()
  balance: number;

  @IsArray()
  @ValidateNested({ each: true })
  items: any[];

  @IsString()
  @IsNotEmpty()
  storeId: number;

  @IsString()
  exhibitionId: number;

  @IsString()
  @IsNotEmpty()
  customerId: number;

  @IsNumber()
  @IsNotEmpty()
  servedBy: number;
}

export class CollectCreditPaymentDto {
  @IsNumber()
  @IsNotEmpty()
  saleId: number;

  @IsArray()
  @ValidateNested({ each: true })
  paymentMethods: { type: PaymentMethodType; amount: number }[];

  @IsNumber()
  @IsNotEmpty()
  servedBy: number;
  referenceId?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsNumber()
  amountPaid: number;

  @IsNumber()
  newBalance: number;
}
export class UpdateExhibitionSaleDto extends PartialType(CreateSaleDto) {}

export class UpdateSaleDto extends PartialType(CreateSaleDto) {}
