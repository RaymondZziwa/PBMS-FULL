import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateBillingChannelDto,
  UpdateBillingChannelDto,
  type UtilityCode,
} from 'src/dto/billingChannel.dto';

/** MarzPay bill-payment verify response (docs: wallet.wearemarz.com/documentation/bill-payments). */
interface MarzVerifyResponse {
  status: 'success' | 'error' | 'failed';
  message?: string;
  error_code?: string;
  data?: {
    customer_details?: {
      customer_ref?: string;
      customer_name?: string;
      outstanding_balance?: string;
      area?: string;
      customer_type?: string;
      last_payment_date?: string;
      last_payment_amount?: string;
    };
    utility_code?: string;
    meter_number?: string;
    status_description?: string;
  };
}

interface MarzAreasResponse {
  status: string;
  data?: { areas?: string[] };
}

const AREAS_CACHE_MS = 60 * 60 * 1000; // NWSC areas rarely change
const MARZ_TIMEOUT_MS = 20_000;

@Injectable()
export class BillingChannelsService {
  private readonly logger = new Logger(BillingChannelsService.name);
  private areasCache: { areas: string[]; at: number } | null = null;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  /* ---------------- CRUD ---------------- */

  async create(dto: CreateBillingChannelDto) {
    await this.assertUnique(dto.utility, dto.meterNumber);

    const channel = await this.prismaService.billingChannel.create({
      data: {
        utility: dto.utility,
        meterNumber: dto.meterNumber,
        name: dto.name || null,
        area: dto.utility === 'NWSC' ? dto.area || null : null,
        isVerified: false,
      },
    });

    return {
      status: 201,
      data: channel,
      message: 'Billing channel added. Verify it before using it for payments.',
    };
  }

  async findAll() {
    const channels = await this.prismaService.billingChannel.findMany({
      orderBy: [{ isVerified: 'asc' }, { createdAt: 'desc' }],
    });
    return {
      status: 200,
      data: channels,
      message: 'Billing channels fetched successfully',
    };
  }

  async update(id: number, dto: UpdateBillingChannelDto) {
    const current = await this.findOneOrFail(id);

    const utility = dto.utility ?? current.utility;
    const meterNumber = dto.meterNumber ?? current.meterNumber;
    const area = utility === 'NWSC' ? (dto.area ?? current.area) || null : null;

    if (utility === 'NWSC' && !area) {
      throw new BadRequestException('Choose the NWSC area for this water meter');
    }

    // Changing what identifies the account means it must be verified again.
    const identityChanged =
      utility !== current.utility ||
      meterNumber !== current.meterNumber ||
      (area ?? null) !== (current.area ?? null);

    if (utility !== current.utility || meterNumber !== current.meterNumber) {
      await this.assertUnique(utility, meterNumber, id);
    }

    const channel = await this.prismaService.billingChannel.update({
      where: { id },
      data: {
        utility,
        meterNumber,
        area,
        ...(dto.name !== undefined ? { name: dto.name || null } : {}),
        ...(identityChanged ? { isVerified: false } : {}),
      },
    });

    return {
      status: 200,
      data: channel,
      message: identityChanged
        ? 'Billing channel updated. Verify it again before using it for payments.'
        : 'Billing channel updated',
    };
  }

  async remove(id: number) {
    await this.findOneOrFail(id);
    const channel = await this.prismaService.billingChannel.delete({
      where: { id },
    });
    return {
      status: 200,
      data: channel,
      message: 'Billing channel deleted',
    };
  }

  /* ---------------- MarzPay ---------------- */

  async getNwscAreas() {
    if (this.areasCache && Date.now() - this.areasCache.at < AREAS_CACHE_MS) {
      return { status: 200, data: { areas: this.areasCache.areas }, message: 'NWSC areas' };
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get<MarzAreasResponse>(
          this.configService.getOrThrow<string>('MARZ_NWSC_AREAS_URL'),
          { headers: this.marzHeaders(), timeout: MARZ_TIMEOUT_MS },
        ),
      );
      const areas = response.data?.data?.areas ?? [];
      if (areas.length > 0) this.areasCache = { areas, at: Date.now() };
      return { status: 200, data: { areas }, message: 'NWSC areas' };
    } catch (error) {
      this.logMarzError('NWSC areas', error);
      throw new BadGatewayException(
        "Couldn't load NWSC areas from the payment provider. Try again shortly.",
      );
    }
  }

  /**
   * Checks the saved meter with MarzPay. Uses the channel's own utility and
   * meter number (never values from the browser), then stores the account
   * holder's name and area and marks the channel verified.
   */
  async verifyChannel(id: number, areaFromRequest?: string) {
    const channel = await this.findOneOrFail(id);

    const area =
      channel.utility === 'NWSC' ? areaFromRequest || channel.area || undefined : undefined;
    if (channel.utility === 'NWSC' && !area) {
      throw new BadRequestException('Choose the NWSC area before verifying this water meter');
    }

    const result = await this.lookupMeter(channel.utility, channel.meterNumber, area);
    const details = result.data?.customer_details ?? {};

    const updated = await this.prismaService.billingChannel.update({
      where: { id },
      data: {
        isVerified: true,
        name: details.customer_name?.trim() || channel.name,
        area: channel.utility === 'NWSC' ? details.area?.trim() || area || null : null,
      },
    });

    return {
      status: 200,
      message: 'Meter verified successfully',
      data: {
        channel: updated,
        customer: {
          customerRef: details.customer_ref ?? null,
          customerName: details.customer_name ?? null,
          area: details.area ?? null,
          customerType: details.customer_type ?? null,
          outstandingBalance: details.outstanding_balance ?? null,
          lastPaymentDate: details.last_payment_date ?? null,
          lastPaymentAmount: details.last_payment_amount ?? null,
        },
      },
    };
  }

  /* ---------------- helpers ---------------- */

  private async lookupMeter(utility: UtilityCode, meterNumber: string, area?: string) {
    const payload: Record<string, string> = {
      utility_code: utility, // MarzPay codes: LIGHT (electricity), NWSC (water)
      meter_number: meterNumber,
    };
    if (utility === 'NWSC' && area) payload.area = area;

    let body: MarzVerifyResponse | undefined;
    try {
      const response = await firstValueFrom(
        this.httpService.post<MarzVerifyResponse>(
          this.configService.getOrThrow<string>('MARZ_UTITLITY_METER_VERIFICATION_URL'),
          payload,
          { headers: this.marzHeaders(), timeout: MARZ_TIMEOUT_MS },
        ),
      );
      body = response.data;
    } catch (error) {
      // MarzPay answers a failed lookup with 4xx + { status: "error", message }.
      if (isAxiosError(error) && error.response && error.response.status < 500) {
        const data = error.response.data as MarzVerifyResponse | undefined;
        throw new BadRequestException(this.verificationFailedMessage(utility, data));
      }
      this.logMarzError('meter verification', error);
      throw new BadGatewayException(
        "Couldn't reach the verification service. Check the connection and try again.",
      );
    }

    if (body?.status?.toLowerCase() !== 'success') {
      throw new BadRequestException(this.verificationFailedMessage(utility, body));
    }
    return body;
  }

  private verificationFailedMessage(utility: UtilityCode, data?: MarzVerifyResponse) {
    const what = utility === 'NWSC' ? 'water account' : 'electricity meter';
    const reason = data?.message || data?.data?.status_description;
    return `We couldn't verify this ${what}. Check the number${
      utility === 'NWSC' ? ' and area' : ''
    } and try again.${reason ? ` (${reason})` : ''}`;
  }

  private marzHeaders() {
    return {
      Authorization: `Basic ${this.configService.getOrThrow<string>('MARZ_AUTH_HEADER')}`,
      'Content-Type': 'application/json',
    };
  }

  private logMarzError(what: string, error: unknown) {
    const detail = isAxiosError(error)
      ? `${error.response?.status ?? error.code ?? 'no response'} ${JSON.stringify(error.response?.data ?? error.message)}`
      : String(error);
    this.logger.error(`MarzPay ${what} failed: ${detail}`);
  }

  private async findOneOrFail(id: number) {
    const channel = await this.prismaService.billingChannel.findUnique({ where: { id } });
    if (!channel) throw new NotFoundException('Billing channel not found');
    return channel;
  }

  private async assertUnique(utility: UtilityCode, meterNumber: string, exceptId?: number) {
    const existing = await this.prismaService.billingChannel.findFirst({
      where: { utility, meterNumber, ...(exceptId ? { id: { not: exceptId } } : {}) },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        `This ${utility === 'NWSC' ? 'water account' : 'electricity meter'} is already registered`,
      );
    }
  }
}
