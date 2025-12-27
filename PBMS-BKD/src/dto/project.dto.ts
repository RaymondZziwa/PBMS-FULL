import {
  IsString,
  IsNumber,
  IsOptional,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
  IsDate,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

export class ProjectPaymentDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  exhibitionId?: string;

  @IsString()
  cashierId: string;
}

export class CreateProjectSaleDto {
  @IsString()
  clientId: string;

  @IsString()
  projectId: string;

  @IsNumber()
  @Min(0)
  saleTotal: number;

  @IsNumber()
  @Min(0)
  downPayment: number;

  exhibitionId: string;

  @IsInt()
  @Min(1)
  numberOfInstallments: number;

  @IsNumber()
  @Min(0)
  installmentAmount: number;

  @IsString()
  cashierId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectPaymentDto)
  @IsOptional()
  initialPayments?: ProjectPaymentDto[];
}

export class AddPaymentDto {
  @IsString()
  saleId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  exhibitionId: string;

  @IsString()
  cashierId: string;

  paymentMethod: PaymentMethodType;
}

export class UpdatePaymentDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsString()
  paymentMethod?: PaymentMethodType;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  cashierId?: string;
}

export enum PaymentMethodType {
  CASH = 'CASH',
  MTN_MOMO = 'MTN_MOMO',
  AIRTEL_MOMO = 'AIRTEL_MOMO',
  CARD = 'CARD',
  PROF_MOMO = 'PROF_MOMO',
}

export class CreatePaymentDto {
  @IsString()
  saleId: string;

  @IsNumber()
  amount: number;

  @IsEnum(PaymentMethodType)
  paymentMethod: PaymentMethodType;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  exhibitionId: string;

  @IsString()
  cashierId: string;
}

export class PaymentResponseDto {
  id: string;
  saleId: string;
  amount: number;
  paymentMethod: PaymentMethodType;
  referenceNumber: string | null;
  notes: string | null;
  paymentDate: Date;
  exhibitionId: string;
  cashierId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  projectSale?: {
    id: string;
    saleTotal: number;
    client?: {
      firstName: string;
      lastName: string;
    };
    project?: {
      name: string;
    };
  };

  employee?: {
    firstName: string;
    lastName: string;
  };
}

export class UpdateProjectSaleDto extends PartialType(CreateProjectSaleDto) {}
