import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailService } from 'src/mail/mail.service';
import { phoneCandidates } from 'src/utils/phone';
import {
  CompleteResetDto,
  RequestResetCodeDto,
  VerifyResetCodeDto,
} from 'src/dto/forgotPwd.dto';

const CODE_TTL_MS = 30 * 60 * 1000; // matches the "expires after 30 minutes" email copy
const RESEND_COOLDOWN_MS = 45 * 1000; // matches the resend countdown on the screen
const MAX_WRONG_CODES = 5;
const RESET_TOKEN_TTL = '15m';

// At least 10 characters, one lower-case, one upper-case letter and one digit.
export const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,128}$/;

// Same answer whether or not the account exists, so the form can't be used
// to discover which emails / phone numbers are registered.
const GENERIC_RESPONSE = {
  status: 200,
  message: 'If an account matches, a reset code has been sent.',
};

type ResetTokenPayload = { sub: number; vid: number; purpose: string };

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  // Wrong-code counter per verification record. In-memory, so it resets when
  // the API restarts and is per-instance; move it to the database (an
  // `attempts` column on email_verifications) before running several instances.
  private readonly wrongCodes = new Map<number, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly http: HttpService,
  ) {}

  /** Step 1: send a 6-digit code by email or SMS. */
  async requestCode(dto: RequestResetCodeDto) {
    const user = await this.findAccount(dto.method, dto.identifier);
    if (!user) return GENERIC_RESPONSE;

    const latest = await this.prisma.emailVerification.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    if (
      latest &&
      Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS
    ) {
      return GENERIC_RESPONSE;
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const codeHash = await bcrypt.hash(code, 10);

    await this.prisma.$transaction([
      this.prisma.emailVerification.deleteMany({ where: { userId: user.id } }),
      this.prisma.emailVerification.create({
        data: {
          userId: user.id,
          code: codeHash,
          expiresAt: new Date(Date.now() + CODE_TTL_MS),
        },
      }),
    ]);

    try {
      if (dto.method === 'email') {
        if (!user.email) return GENERIC_RESPONSE;
        await this.mail.sendOnForgotPassword(user.firstName, user.email, code);
      } else {
        await this.sendSms(
          user.tel,
          `Your PBMS password reset code is ${code}. It expires in 30 minutes. Never share this code with anyone.`,
        );
      }
    } catch (error) {
      // Never tell the caller: a delivery error would reveal that the account exists.
      this.logger.error(
        `Reset code delivery (${dto.method}) failed for employee ${user.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return GENERIC_RESPONSE;
  }

  /** Step 2: check the code and hand back a short-lived, single-use reset token. */
  async verifyCode(dto: VerifyResetCodeDto) {
    const invalid = new BadRequestException(
      'That code is wrong or has expired.',
    );

    const user = await this.findAccount(dto.method, dto.identifier);
    if (!user) throw invalid;

    const record = await this.prisma.emailVerification.findFirst({
      where: { userId: user.id, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) throw invalid;

    const matches = await bcrypt.compare(dto.code, record.code);
    if (!matches) {
      const wrong = (this.wrongCodes.get(record.id) ?? 0) + 1;
      if (wrong >= MAX_WRONG_CODES) {
        this.wrongCodes.delete(record.id);
        await this.prisma.emailVerification.deleteMany({
          where: { id: record.id },
        });
        throw new HttpException(
          'Too many wrong codes. Request a new code.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      this.wrongCodes.set(record.id, wrong);
      throw invalid;
    }

    this.wrongCodes.delete(record.id);
    const resetToken = await this.jwt.signAsync(
      { sub: user.id, vid: record.id, purpose: 'password-reset' },
      { secret: this.resetSecret(), expiresIn: RESET_TOKEN_TTL },
    );

    return { status: 200, message: 'Code verified', data: { resetToken } };
  }

  /** Step 3: set the new password. The reset token works once. */
  async completeReset(dto: CompleteResetDto) {
    const expired = new BadRequestException(
      'This reset session has expired. Please start again.',
    );

    let payload: ResetTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<ResetTokenPayload>(
        dto.resetToken,
        { secret: this.resetSecret() },
      );
    } catch {
      throw expired;
    }
    if (payload.purpose !== 'password-reset') throw expired;

    if (!PASSWORD_RULE.test(dto.newPassword)) {
      throw new BadRequestException(
        'Use at least 10 characters with upper and lower case letters and a number.',
      );
    }

    // The verification row is the single-use guard: it is deleted below.
    const record = await this.prisma.emailVerification.findFirst({
      where: { id: payload.vid, userId: payload.sub },
    });
    if (!record) throw expired;

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.employee.update({
        where: { id: payload.sub },
        data: { password: passwordHash },
      }),
      this.prisma.emailVerification.deleteMany({
        where: { userId: payload.sub },
      }),
    ]);

    return {
      status: 200,
      message: 'Password updated. You can now sign in.',
    };
  }

  private findAccount(method: 'email' | 'phone', identifier: string) {
    const where =
      method === 'email'
        ? { email: identifier.trim() }
        : { tel: { in: phoneCandidates(identifier) } };

    return this.prisma.employee.findFirst({
      where: { ...where, isActive: true, hasAccess: true },
      select: { id: true, firstName: true, email: true, tel: true },
    });
  }

  private resetSecret(): string {
    // Derived from the access-token secret but never valid as an access token.
    return `${this.config.getOrThrow<string>('JWT_SECRET')}:password-reset`;
  }

  private async sendSms(to: string, message: string) {
    const smsUrl = this.config.getOrThrow<string>('SMS_URL');
    const smsSecret = this.config.getOrThrow<string>('SMS_SECRET');
    await firstValueFrom(
      this.http.post(
        `${smsUrl}/sms/send`,
        { recipients: to, message },
        {
          headers: { 'api-key': smsSecret, 'Content-Type': 'application/json' },
          timeout: 10000,
        },
      ),
    );
  }
}
