import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class VerifyCodeDto {
  @IsEmail()
  email: string;

  @IsString()
  code: string;
}

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  newPassword: string;
}

/* ---------- Password reset flow (email or phone) ---------- */

export class RequestResetCodeDto {
  @IsIn(['email', 'phone'])
  method!: 'email' | 'phone';

  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  identifier!: string;
}

export class VerifyResetCodeDto extends RequestResetCodeDto {
  @Matches(/^\d{6}$/, { message: 'The code is 6 digits' })
  code!: string;
}

export class CompleteResetDto {
  @IsString()
  @IsNotEmpty()
  resetToken!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(128)
  newPassword!: string;
}
