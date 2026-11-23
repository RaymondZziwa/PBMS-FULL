import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export const UTILITY_TYPES = ['LIGHT', 'NWSC'] as const;
export type UtilityCode = (typeof UTILITY_TYPES)[number];

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
/** Meter numbers are typed with spaces or dashes; store them as plain characters. */
const cleanMeter = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/[\s-]+/g, '').toUpperCase() : value;

const METER_RULE = /^[A-Z0-9]{4,30}$/;
const METER_MESSAGE = 'Meter number must be 4 to 30 letters or digits';

export class CreateBillingChannelDto {
  @IsIn(UTILITY_TYPES, { message: 'Utility must be LIGHT (electricity) or NWSC (water)' })
  utility!: UtilityCode;

  @Transform(cleanMeter)
  @IsString()
  @Matches(METER_RULE, { message: METER_MESSAGE })
  meterNumber!: string;

  /** Optional label; replaced by the account holder's name once verified. */
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  /** NWSC needs the service area (MarzPay requires it to verify water accounts). */
  @Transform(trim)
  @ValidateIf((o: CreateBillingChannelDto) => o.utility === 'NWSC')
  @IsString()
  @IsNotEmpty({ message: 'Choose the NWSC area for this water meter' })
  @MaxLength(60)
  area?: string;
}

export class UpdateBillingChannelDto {
  @IsOptional()
  @IsIn(UTILITY_TYPES, { message: 'Utility must be LIGHT (electricity) or NWSC (water)' })
  utility?: UtilityCode;

  @Transform(cleanMeter)
  @IsOptional()
  @IsString()
  @Matches(METER_RULE, { message: METER_MESSAGE })
  meterNumber?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(60)
  area?: string;
}

export class VerifyBillingChannelDto {
  /** Only needed for NWSC when the channel has no area saved yet. */
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(60)
  area?: string;
}
