import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { ClubMember, ClubPayment, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { forgetMember } from './club-auth';
import { ClubNotifyService } from './club-notify.service';
import { chargeFor, clubFees, fullName, normalisePhone } from './club.constants';

type MarzCallback = {
  event_type?: string;
  transaction?: { reference?: string; status?: string; provider_reference?: string };
  collection?: { amount?: { total?: number | string } };
};

const SUCCESS = ['completed', 'success', 'successful'];
const FAILED = ['failed', 'cancelled', 'canceled', 'rejected', 'expired'];

/**
 * Club payments through MarzPay.
 *
 * The member pays fee + MarzPay % + service charge; only the fee goes into the
 * club wallet. A payment is credited once (the `credited` flag is flipped in
 * the same transaction as the wallet update), so a repeated callback can't pay twice.
 *
 * .env (same MarzPay account as the shop):
 *   MARZ_COLLECTION_BASE_URL, MARZ_AUTH_HEADER       collect mobile money
 *   MARZ_TRANSFER_BASE_URL, MARZ_WALLET_SRC          send money to the bank
 *   MARZ_COLLECTION_STATUS_URL (optional)            e.g. https://…/collect-money/{reference}
 *   CLUB_API_PUBLIC_URL                              e.g. https://pbmsapi.megaerpug.com (for callbacks)
 */
@Injectable()
export class ClubPaymentsService implements OnModuleInit {
  private readonly logger = new Logger(ClubPaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly notifier: ClubNotifyService,
  ) {}

  /**
   * Test mode: CLUB_SIMULATE_PAYMENTS=success (or =fail) in .env makes registration
   * payments complete by themselves a few seconds after the member taps Pay,
   * without contacting MarzPay or charging anyone. Ignored when NODE_ENV=production.
   */
  private simulation(): 'success' | 'failed' | null {
    if (process.env.NODE_ENV === 'production') return null;
    const v = String(this.config.get('CLUB_SIMULATE_PAYMENTS') ?? process.env.CLUB_SIMULATE_PAYMENTS ?? '').trim().toLowerCase();
    return v === 'success' || v === 'true' ? 'success' : v === 'fail' || v === 'failed' ? 'failed' : null;
  }

  /** Says at start-up whether club payments are real or simulated (and why). */
  onModuleInit() {
    const asked = String(this.config.get('CLUB_SIMULATE_PAYMENTS') ?? process.env.CLUB_SIMULATE_PAYMENTS ?? '').trim();
    const mode = this.simulation();
    if (mode) this.logger.warn(`Club payments are SIMULATED (CLUB_SIMULATE_PAYMENTS=${asked}): nothing is charged, payments ${mode === 'success' ? 'succeed' : 'fail'} after ~5 s.`);
    else if (asked) this.logger.warn(`CLUB_SIMULATE_PAYMENTS=${asked} is ignored because NODE_ENV=production. Club payments go to MarzPay.`);
    else this.logger.log(this.marzConfigured() ? 'Club payments use MarzPay.' : 'Club payments are off: MarzPay keys are not set (set CLUB_SIMULATE_PAYMENTS=success to test).');
  }

  private marzConfigured() {
    return !!(this.config.get('MARZ_COLLECTION_BASE_URL') && this.config.get('MARZ_AUTH_HEADER'));
  }

  private callbackUrl(path: 'collection' | 'payout') {
    const base = this.config.get<string>('CLUB_API_PUBLIC_URL') ?? this.config.get<string>('MARZ_CALLBACK_URL')?.replace(/\/api\/.*$/, '');
    if (!base) throw new ServiceUnavailableException('Payments are not set up yet (CLUB_API_PUBLIC_URL is missing).');
    return `${base.replace(/\/$/, '')}/api/club/payments/${path}-callback`;
  }

  private headers() {
    return { Authorization: `Basic ${this.config.get<string>('MARZ_AUTH_HEADER')}`, 'Content-Type': 'application/json' };
  }

  /** The club wallet, created the first time it's needed. */
  async wallet(tx: Prisma.TransactionClient | PrismaService = this.prisma) {
    const found = await tx.wallet.findFirst({ where: { isForClub: true } });
    return found ?? tx.wallet.create({ data: { name: 'Amatugunda Monk Club', purpose: 'Club registration fees and marketplace payments', isForClub: true, canBeDeleted: false } });
  }

  quote() {
    return { status: 200, data: chargeFor(clubFees().registration), message: 'Registration charge' };
  }

  // ---------------------------------------------------------------- member: pay the registration fee

  async startRegistration(m: ClubMember, phoneInput: unknown) {
    if (m.status !== 'AWAITING_PAYMENT') throw new ConflictException(m.status === 'ACTIVE' ? 'Your membership is already active' : 'Your membership cannot be paid for right now');
    return this.startCollection(m, { purpose: 'REGISTRATION', base: clubFees().registration, phoneInput, description: `Amatugunda Monk Club registration ${m.cardNumber ?? ''}`.trim() });
  }

  /**
   * Asks MarzPay to collect `base` + charges from the member's phone (or simulates it).
   * Used for the registration fee and for marketplace orders.
   */
  async startCollection(m: ClubMember, opts: { purpose: 'REGISTRATION' | 'ORDER'; base: number; phoneInput: unknown; description: string; orderId?: number }) {
    const simulate = this.simulation();
    if (!simulate && !this.marzConfigured()) throw new ServiceUnavailableException('Mobile money payments are not available yet. Please try again later.');
    const phone = normalisePhone(opts.phoneInput ?? m.phone1);
    if (!phone || !phone.startsWith('+256')) throw new BadRequestException({ statusCode: 400, message: 'Enter an MTN or Airtel Uganda number', field: 'phone' });

    // One payment at a time: reuse a recent pending one instead of prompting twice.
    const recent = await this.prisma.clubPayment.findFirst({
      where: { memberId: m.id, purpose: opts.purpose, orderId: opts.orderId ?? null, status: 'PENDING', createdAt: { gt: new Date(Date.now() - 2 * 60_000) } },
    });
    if (recent) return { status: 200, data: this.publicPayment(recent), message: 'A payment request is already on your phone. Approve it to continue.' };

    const c = chargeFor(opts.base);
    const reference = randomUUID();
    const payment = await this.prisma.clubPayment.create({
      data: { memberId: m.id, memberName: fullName(m), purpose: opts.purpose, orderId: opts.orderId ?? null, baseAmount: c.base, marzFee: c.marzFee, serviceFee: c.serviceFee, totalCharged: c.total, phone, reference },
    });

    if (simulate) {
      this.logger.warn(`Club payment ${payment.id} is SIMULATED (CLUB_SIMULATE_PAYMENTS=${simulate}). No money is collected.`);
      return { status: 200, data: this.publicPayment(payment), message: 'Test mode: this payment will complete by itself in a few seconds.' };
    }

    try {
      await firstValueFrom(
        this.http.post(
          this.config.getOrThrow<string>('MARZ_COLLECTION_BASE_URL'),
          { amount: c.total, country: 'UG', reference, description: opts.description, phone_number: phone, callback_url: this.callbackUrl('collection') },
          { headers: this.headers(), timeout: 20000 },
        ),
      );
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? (e as Error).message;
      await this.prisma.clubPayment.update({ where: { id: payment.id }, data: { status: 'FAILED', failureNote: String(msg).slice(0, 250) } });
      this.logger.error(`MarzPay collection failed for club payment ${payment.id}: ${msg}`);
      throw new BadRequestException('We couldn\'t send the payment request. Check the number and try again.');
    }
    return { status: 200, data: this.publicPayment(payment), message: 'Check your phone and enter your PIN to approve the payment.' };
  }

  /** What the member's app sees: no MarzPay reference (it's what proves a callback is genuine). */
  private publicPayment(p: ClubPayment) {
    return { id: p.id, purpose: p.purpose, orderId: p.orderId, status: p.status, totalCharged: Number(p.totalCharged), baseAmount: Number(p.baseAmount), marzFee: Number(p.marzFee), serviceFee: Number(p.serviceFee), phone: p.phone, createdAt: p.createdAt, completedAt: p.completedAt, failureNote: p.failureNote };
  }

  async paymentStatus(m: ClubMember, id: number) {
    let p = await this.prisma.clubPayment.findFirst({ where: { id, memberId: m.id } });
    if (!p) throw new NotFoundException('Payment not found');
    // If no callback came yet, ask MarzPay directly (when a status URL is set).
    if (p.status === 'PENDING') {
      // Test mode: settle a few seconds after the request, as if the member approved it.
      const simulate = this.simulation();
      const status = simulate ? (Date.now() - p.createdAt.getTime() > 5000 ? simulate : null) : await this.lookup(p.reference);
      if (status) await this.settle(p.reference, status, simulate ? 'SIMULATED' : null, simulate ? 'simulation' : 'status check');
      p = await this.prisma.clubPayment.findUniqueOrThrow({ where: { id } });
      // Give up after 15 minutes without an answer.
      if (p.status === 'PENDING' && Date.now() - p.createdAt.getTime() > 15 * 60_000) {
        p = await this.prisma.clubPayment.update({ where: { id }, data: { status: 'FAILED', failureNote: 'No confirmation from the mobile money provider' } });
      }
    }
    const member = await this.prisma.clubMember.findUniqueOrThrow({ where: { id: m.id }, select: { status: true } });
    return { status: 200, data: { payment: this.publicPayment(p), memberStatus: member.status }, message: 'Payment status' };
  }

  async myPayments(m: ClubMember) {
    const rows = await this.prisma.clubPayment.findMany({ where: { memberId: m.id }, orderBy: { createdAt: 'desc' }, take: 50 });
    return { status: 200, data: rows.map((r) => this.publicPayment(r)), message: 'Payments' };
  }

  // ---------------------------------------------------------------- MarzPay → us

  /** Returns 'success' | 'failed' | null (unknown / not configured). */
  private async lookup(reference: string): Promise<'success' | 'failed' | null> {
    const template = this.config.get<string>('MARZ_COLLECTION_STATUS_URL');
    if (!template || !this.marzConfigured()) return null;
    try {
      const res = await firstValueFrom(this.http.get(template.replace('{reference}', encodeURIComponent(reference)), { headers: this.headers(), timeout: 15000 }));
      const body = res.data as Record<string, any>;
      const raw = String(body?.data?.transaction?.status ?? body?.transaction?.status ?? body?.data?.status ?? body?.status ?? '').toLowerCase();
      return SUCCESS.includes(raw) ? 'success' : FAILED.includes(raw) ? 'failed' : null;
    } catch (e) {
      this.logger.warn(`MarzPay status check for ${reference} failed: ${(e as Error).message}`);
      return null;
    }
  }

  async collectionCallback(body: MarzCallback) {
    const reference = body?.transaction?.reference;
    const raw = String(body?.transaction?.status ?? '').toLowerCase();
    if (!reference) return { status: 'ignored' };
    const payment = await this.prisma.clubPayment.findUnique({ where: { reference } });
    if (!payment) return { status: 'ignored' }; // not a club payment

    let outcome: 'success' | 'failed' | null = SUCCESS.includes(raw) ? 'success' : FAILED.includes(raw) ? 'failed' : null;
    if (!outcome) return { status: 'pending' };

    // Don't take the callback's word for money: confirm with MarzPay when we can,
    // and check the amount. The reference is never shown to members, so it can't be guessed.
    const confirmed = await this.lookup(reference);
    if (confirmed) outcome = confirmed;
    const paid = Number(body?.collection?.amount?.total);
    if (outcome === 'success' && Number.isFinite(paid) && paid > 0 && paid + 0.5 < Number(payment.totalCharged)) {
      this.logger.error(`Club payment ${payment.id}: MarzPay reported ${paid}, expected ${payment.totalCharged}. Not credited.`);
      outcome = 'failed';
    }
    await this.settle(reference, outcome, body?.transaction?.provider_reference ?? null, 'callback');
    return { status: 'ok' };
  }

  /** Marks the payment and, on success, credits the wallet and activates the member, exactly once. */
  private async settle(reference: string, outcome: 'success' | 'failed', providerRef: string | null, source: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const p = await tx.clubPayment.findUnique({ where: { reference } });
      if (!p || p.credited || p.status !== 'PENDING') return null;
      if (outcome === 'failed') {
        await tx.clubPayment.update({ where: { id: p.id }, data: { status: 'FAILED', providerRef, failureNote: 'The payment was not completed', completedAt: new Date() } });
        return null;
      }
      // Claim the payment first: a second callback racing us finds credited = true and stops.
      const claimed = await tx.clubPayment.updateMany({ where: { id: p.id, credited: false }, data: { status: 'SUCCESSFUL', credited: true, providerRef, completedAt: new Date() } });
      if (claimed.count !== 1) return null;
      const wallet = await this.wallet(tx);
      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: p.baseAmount } } });
      // Marketplace order paid by mobile money: mark it paid and place it.
      if (p.purpose === 'ORDER' && p.orderId) {
        await tx.clubOrder.updateMany({ where: { id: p.orderId }, data: { paid: true } });
        await tx.clubOrder.updateMany({ where: { id: p.orderId, status: 'AWAITING_PAYMENT' }, data: { status: 'PLACED' } });
        return null;
      }
      if (p.memberId && p.purpose === 'REGISTRATION') {
        const m = await tx.clubMember.findUnique({ where: { id: p.memberId } });
        if (m && m.status === 'AWAITING_PAYMENT') {
          return tx.clubMember.update({ where: { id: m.id }, data: { status: 'ACTIVE', activatedAt: new Date() } });
        }
      }
      return null;
    });
    this.logger.log(`Club payment ${reference} settled as ${outcome} (${source})`);
    if (result) {
      forgetMember(result.id);
      await this.notifier.notify(result, {
        subject: 'Welcome to Amatugunda Monk Club',
        lines: ['We received your registration fee. Your membership is now active.'],
        facts: { 'Card number': result.cardNumber ?? '' },
      });
    }
  }

  // ---------------------------------------------------------------- staff: wallet

  async walletSummary(q: { page?: string }) {
    const wallet = await this.wallet();
    const page = Math.max(1, Number(q.page) || 1);
    const take = 30;
    const [payments, totalPayments, sums, payouts, channels] = await Promise.all([
      this.prisma.clubPayment.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * take, take }),
      this.prisma.clubPayment.count(),
      this.prisma.clubPayment.aggregate({ where: { status: 'SUCCESSFUL' }, _sum: { baseAmount: true, marzFee: true, serviceFee: true, totalCharged: true }, _count: { _all: true } }),
      this.prisma.clubPayout.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
      this.prisma.withdrawChannel.findMany({ where: { type: 'BANK_TRANSFER', isVerified: true }, select: { id: true, name: true, bank: true, accountNumber: true } }),
    ]);
    const paidOut = await this.prisma.clubPayout.aggregate({ where: { status: { in: ['PENDING', 'SUCCESSFUL'] } }, _sum: { amount: true } });
    return {
      status: 200,
      data: {
        wallet: { id: wallet.id, name: wallet.name, balance: Number(wallet.balance) },
        totals: {
          received: Number(sums._sum.baseAmount ?? 0),
          marzFees: Number(sums._sum.marzFee ?? 0),
          serviceFees: Number(sums._sum.serviceFee ?? 0),
          charged: Number(sums._sum.totalCharged ?? 0),
          successfulPayments: sums._count._all,
          paidOut: Number(paidOut._sum.amount ?? 0),
        },
        fees: clubFees(),
        payments: { rows: payments.map((p) => ({ ...p, baseAmount: Number(p.baseAmount), marzFee: Number(p.marzFee), serviceFee: Number(p.serviceFee), totalCharged: Number(p.totalCharged), reference: undefined })), total: totalPayments, page, pageSize: take },
        payouts: payouts.map((p) => ({ ...p, reference: undefined, amount: Number(p.amount), channel: channels.find((c) => c.id === p.channelId) ?? null })),
        channels: channels.map((c) => ({ ...c, accountNumber: c.accountNumber ? `•••• ${c.accountNumber.slice(-4)}` : null })),
        transfersConfigured: !!(this.config.get('MARZ_TRANSFER_BASE_URL') && this.config.get('MARZ_WALLET_SRC') && this.config.get('MARZ_AUTH_HEADER')),
      },
      message: 'Club wallet',
    };
  }

  /** Sends money from the club wallet to a verified company bank account via MarzPay. */
  async payout(body: { amount?: unknown; channelId?: unknown; description?: unknown }, staffId: number) {
    const amount = Math.round(Number(body.amount));
    const channelId = Number(body.channelId);
    if (!Number.isFinite(amount) || amount < 1000) throw new BadRequestException({ statusCode: 400, message: 'Enter an amount of at least UGX 1,000', field: 'amount' });
    const channel = await this.prisma.withdrawChannel.findUnique({ where: { id: channelId } });
    if (!channel || channel.type !== 'BANK_TRANSFER' || !channel.isVerified) throw new BadRequestException({ statusCode: 400, message: 'Choose a verified bank account', field: 'channelId' });
    if (!this.config.get('MARZ_TRANSFER_BASE_URL') || !this.config.get('MARZ_WALLET_SRC')) throw new ServiceUnavailableException('Bank transfers are not set up yet.');
    const description = String(body.description ?? '').trim().slice(0, 200) || 'Monk Club wallet transfer';

    // Take the money out first (only if the balance covers it), then ask MarzPay; put it back if that fails.
    const wallet = await this.wallet();
    const taken = await this.prisma.wallet.updateMany({ where: { id: wallet.id, balance: { gte: amount } }, data: { balance: { decrement: amount } } });
    if (taken.count !== 1) throw new ConflictException({ statusCode: 409, message: 'The wallet balance is too low for this amount', field: 'amount' });

    let reference: string;
    try {
      const res = await firstValueFrom(
        this.http.post(
          this.config.getOrThrow<string>('MARZ_TRANSFER_BASE_URL'),
          {
            amount,
            description,
            bank_name: channel.bank,
            bank_account_number: channel.accountNumber,
            bank_account_name: channel.name,
            wallet_source: this.config.getOrThrow<string>('MARZ_WALLET_SRC'),
            callback_url: this.callbackUrl('payout'),
          },
          { headers: this.headers(), timeout: 20000 },
        ),
      );
      reference = res.data?.data?.bank_transfer?.reference ?? res.data?.data?.reference ?? res.data?.reference;
      if (!reference) throw new Error('MarzPay did not return a reference');
    } catch (e) {
      await this.prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount } } });
      this.logger.error(`Club payout failed: ${(e as Error).message}`);
      throw new BadRequestException('The bank transfer could not be started. Nothing was taken from the wallet.');
    }

    const payout = await this.prisma.clubPayout.create({ data: { amount, channelId, description, reference, requestedBy: staffId } });
    return { status: 200, data: { ...payout, amount }, message: `Transfer of UGX ${amount.toLocaleString('en-US')} started` };
  }

  async payoutCallback(body: MarzCallback) {
    const reference = body?.transaction?.reference;
    const raw = String(body?.transaction?.status ?? '').toLowerCase();
    if (!reference) return { status: 'ignored' };
    const outcome = SUCCESS.includes(raw) ? 'SUCCESSFUL' : FAILED.includes(raw) ? 'FAILED' : null;
    if (!outcome) return { status: 'pending' };
    await this.prisma.$transaction(async (tx) => {
      const p = await tx.clubPayout.findUnique({ where: { reference } });
      if (!p || p.status !== 'PENDING') return;
      await tx.clubPayout.update({ where: { id: p.id }, data: { status: outcome, completedAt: new Date() } });
      // A failed transfer goes back into the wallet.
      if (outcome === 'FAILED') {
        const wallet = await this.wallet(tx);
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: p.amount } } });
      }
    });
    return { status: 'ok' };
  }
}
