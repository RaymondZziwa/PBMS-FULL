// src/events/dto/create-event.dto.ts
import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsEnum,
  IsNotEmpty,
  IsPositive,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { EventPaymentStatus } from '@prisma/client';

export class CreateEventDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  startDate: Date;

  @IsDateString()
  endDate: Date;

  @IsNumber()
  ticketPrice: number;

  @IsString()
  @IsOptional()
  location?: string;
}

export class UpdateEventDto extends PartialType(CreateEventDto) {}

export class CreateEventParticipantDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  tel: string;

  @IsString()
  @IsOptional()
  tel2?: string;

  @IsNumber()
  @IsPositive()
  amountPaid: number;

  @IsEnum(EventPaymentStatus)
  @IsOptional()
  paymentStatus?: EventPaymentStatus;

  @IsString()
  @IsNotEmpty()
  eventId: string;
}

export class UpdateParticipantDto extends PartialType(
  CreateEventParticipantDto,
) {}

export class UpdatePaymentStatusDto {
  participantId: string;
  eventId: string;
}
