import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  IsUUID,
} from 'class-validator';

export enum SaleStatus {
  FULLY_PAID = 'FULLY_PAID',
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
}

export enum PaymentMethodType {
  CASH = 'CASH',
  MTN_MOMO = 'MTN_MOMO',
  AIRTEL_MOMO = 'AIRTEL_MOMO',
  CARD = 'CARD',
  PROF_MOMO = 'PROF_MOMO',
}

export interface PaymentMethod {
  method: PaymentMethodType;
  amount: number;
  referenceId?: string;
}

export class CreateMassageSaleDto {
  @IsUUID()
  clientId: string;

  @IsUUID()
  serviceId: string;

  @IsNumber()
  total: number;

  @IsEnum(SaleStatus)
  status: SaleStatus;

  @IsNumber()
  balance: number;

  @IsArray()
  paymentMethods: PaymentMethod[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsUUID()
  servedBy: string;
}

export class CreateMassagePaymentDto {
  @IsUUID()
  saleId: string;

  @IsNumber()
  amount: number;

  @IsEnum(PaymentMethodType)
  paymentMethod: PaymentMethodType;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsUUID()
  cashierId: string;
}

export class UpdateMassageSaleDto {
  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @IsOptional()
  @IsNumber()
  balance?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class MassageSaleResponseDto {
  id: string;
  clientId: string;
  serviceId: string;
  total: number;
  status: SaleStatus;
  balance: number;
  paymentMethods: PaymentMethod[];
  notes?: string;
  servedBy: string;
  createdAt: Date;
  updatedAt: Date;
  client?: any;
  service?: any;
  employee?: any;
  payments?: any[];
}

export class MassagePaymentResponseDto {
  id: string;
  saleId: string;
  amount: number;
  paymentMethod: PaymentMethodType;
  referenceId?: string;
  notes?: string;
  cashierId: string;
  createdAt: Date;
  updatedAt: Date;
  sale?: any;
  employee?: any;
}
