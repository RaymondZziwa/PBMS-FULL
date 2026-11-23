import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ClubMember, ClubOrderStatus, ClubPaymentMethod, Prisma } from '@prisma/client';
import { randomInt } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { clubPhotoUrl } from './club-files';
import { readCardCode, signatureMatches } from './club-card';
import { ClubNotifyService } from './club-notify.service';
import { ClubPaymentsService } from './club-payments.service';
import { cleanText, clubFees, fullName, normalisePhone } from './club.constants';

const PAYMENT_METHODS: ClubPaymentMethod[] = ['CASH', 'ON_DELIVERY', 'MOBILE_MONEY'];
const MAX_LINES = 50;
const MAX_QTY = 999;

/** What staff may move an order to, from each status. */
const NEXT: Record<ClubOrderStatus, ClubOrderStatus[]> = {
  AWAITING_PAYMENT: ['CANCELLED'],
  PLACED: ['PROCESSING', 'DISPATCHED', 'DELIVERED', 'CANCELLED'],
  PROCESSING: ['DISPATCHED', 'DELIVERED', 'CANCELLED'],
  DISPATCHED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

const STATUS_WORDS: Record<ClubOrderStatus, string> = {
  AWAITING_PAYMENT: 'is waiting for payment',
  PLACED: 'has been received',
  PROCESSING: 'is being prepared',
  DISPATCHED: 'is on its way',
  DELIVERED: 'has been delivered',
  CANCELLED: 'was cancelled',
};

const money = (n: number) => `UGX ${Math.round(n).toLocaleString('en-US')}`;
const round = (n: number) => Math.round(n * 100) / 100;

/** The member's saved address as one line. */
export const defaultAddress = (m: Pick<ClubMember, 'address' | 'subCounty' | 'county' | 'district' | 'country'>) =>
  [m.address, m.subCounty, m.county, m.district, m.country].filter(Boolean).join(', ');

/**
 * Amatugunda Monk Club marketplace (orders), club settings (discount, store),
 * the leaderboard and card verification.
 */
@Injectable()
export class ClubShopService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: ClubPaymentsService,
    private readonly notifier: ClubNotifyService,
  ) {}

  // ---------------------------------------------------------------- settings

  async settings() {
    const s = await this.prisma.clubSetting.findUnique({ where: { id: 1 } });
    return { discountPercent: s?.discountPercent ?? 0, storeId: s?.storeId ?? null, updatedAt: s?.updatedAt ?? null };
  }

  async getSettings() {
    const [s, stores] = await Promise.all([this.settings(), this.prisma.store.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })]);
    return { status: 200, data: { ...s, stores, mobileMoneyCharge: { percent: clubFees().marzPercent, fixed: clubFees().service } }, message: 'Club settings' };
  }

  async saveSettings(body: { discountPercent?: unknown; storeId?: unknown }, staffId: number) {
    const data: Prisma.ClubSettingUncheckedUpdateInput = { updatedById: staffId };
    if (body.discountPercent !== undefined) {
      const d = Number(body.discountPercent);
      if (!Number.isInteger(d) || d < 0 || d > 90) throw new BadRequestException({ statusCode: 400, message: 'The discount must be a whole number from 0 to 90', field: 'discountPercent' });
      data.discountPercent = d;
    }
    if (body.storeId !== undefined) {
      if (body.storeId === null || body.storeId === '') data.storeId = null;
      else {
        const id = Number(body.storeId);
        if (!(await this.prisma.store.findUnique({ where: { id }, select: { id: true } }))) throw new BadRequestException({ statusCode: 400, message: 'Choose a store', field: 'storeId' });
        data.storeId = id;
      }
    }
    await this.prisma.clubSetting.upsert({
      where: { id: 1 },
      create: { id: 1, discountPercent: (data.discountPercent as number) ?? 0, storeId: (data.storeId as number | null) ?? null, updatedById: staffId },
      update: data,
    });
    return { ...(await this.getSettings()), message: 'Club settings saved' };
  }

  // ---------------------------------------------------------------- catalog

  private assertActive(m: ClubMember) {
    if (m.status !== 'ACTIVE') throw new ForbiddenException('Activate your membership to use the marketplace');
  }

  /** Items shown in the POS, with the club price and stock in the club's store. */
  async catalog(m: ClubMember) {
    this.assertActive(m);
    const s = await this.settings();
    const items = await this.prisma.item.findMany({
      where: { showInPos: true },
      select: { id: true, name: true, price: true, category: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
    let stock = new Map<number, number>();
    if (s.storeId) {
      const rows = await this.prisma.productInventory.groupBy({ by: ['itemId'], where: { storeId: s.storeId, itemId: { in: items.map((i) => i.id) } }, _sum: { qty: true } });
      stock = new Map(rows.map((r) => [r.itemId, Number(r._sum.qty ?? 0)]));
    }
    const categories = new Map<number, string>();
    const data = items.map((i) => {
      if (i.category) categories.set(i.category.id, i.category.name);
      const price = Number(i.price);
      return {
        id: i.id,
        name: i.name,
        category: i.category,
        price,
        clubPrice: round(price * (1 - s.discountPercent / 100)),
        inStock: s.storeId ? (stock.get(i.id) ?? 0) > 0 : true,
      };
    });
    return {
      status: 200,
      data: {
        discountPercent: s.discountPercent,
        items: data,
        categories: [...categories].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
        defaultAddress: { recipientName: fullName(m), phone: m.phone1, address: defaultAddress(m) },
        // Mobile money adds a service charge: percent of the total (rounded up) + a fixed amount.
        mobileMoneyCharge: { percent: clubFees().marzPercent, fixed: clubFees().service },
      },
      message: 'Marketplace',
    };
  }

  // ---------------------------------------------------------------- member orders

  private orderNumber() {
    const d = new Date();
    return `AMC-${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(randomInt(0, 100000)).padStart(5, '0')}`;
  }

  private shapeOrder(o: Prisma.ClubOrderGetPayload<{ include: { items: true } }>) {
    return {
      ...o,
      subtotal: Number(o.subtotal),
      discountAmount: Number(o.discountAmount),
      total: Number(o.total),
      items: o.items.map((i) => ({ ...i, unitPrice: Number(i.unitPrice), lineTotal: Number(i.lineTotal) })),
    };
  }

  async placeOrder(
    m: ClubMember,
    body: {
      items?: unknown;
      paymentMethod?: unknown;
      useDefaultAddress?: unknown;
      recipientName?: unknown;
      deliveryPhone?: unknown;
      deliveryAddress?: unknown;
      notes?: unknown;
      payPhone?: unknown;
    },
  ) {
    this.assertActive(m);
    const method = PAYMENT_METHODS.find((p) => p === body.paymentMethod);
    if (!method) throw new BadRequestException({ statusCode: 400, message: 'Choose how you will pay', field: 'paymentMethod' });

    // Lines: merge repeats, check quantities.
    const raw = Array.isArray(body.items) ? (body.items as Array<{ itemId?: unknown; qty?: unknown }>).slice(0, MAX_LINES) : [];
    const want = new Map<number, number>();
    for (const l of raw) {
      const id = Number(l?.itemId);
      const qty = Number(l?.qty);
      if (!Number.isInteger(id) || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) continue;
      want.set(id, Math.min(MAX_QTY, (want.get(id) ?? 0) + qty));
    }
    if (!want.size) throw new BadRequestException({ statusCode: 400, message: 'Your cart is empty', field: 'items' });

    const s = await this.settings();
    const items = await this.prisma.item.findMany({ where: { id: { in: [...want.keys()] }, showInPos: true }, select: { id: true, name: true, price: true } });
    if (items.length !== want.size) throw new BadRequestException({ statusCode: 400, message: 'Some items are no longer available. Refresh the shop and try again.', field: 'items' });
    if (s.storeId) {
      const rows = await this.prisma.productInventory.groupBy({ by: ['itemId'], where: { storeId: s.storeId, itemId: { in: items.map((i) => i.id) } }, _sum: { qty: true } });
      const stock = new Map(rows.map((r) => [r.itemId, Number(r._sum.qty ?? 0)]));
      const out = items.filter((i) => (stock.get(i.id) ?? 0) <= 0);
      if (out.length) throw new BadRequestException({ statusCode: 400, message: `Out of stock: ${out.map((i) => i.name).join(', ')}`, field: 'items' });
    }

    // Delivery: the saved address by default, or a new one.
    const useDefault = body.useDefaultAddress !== false;
    let recipientName = fullName(m);
    let deliveryPhone = m.phone1;
    let deliveryAddress = defaultAddress(m);
    if (!useDefault) {
      recipientName = cleanText(body.recipientName, 160) ?? '';
      deliveryPhone = normalisePhone(body.deliveryPhone) ?? '';
      deliveryAddress = cleanText(body.deliveryAddress, 500) ?? '';
      if (!recipientName) throw new BadRequestException({ statusCode: 400, message: 'Who should receive the order?', field: 'recipientName' });
      if (!deliveryPhone) throw new BadRequestException({ statusCode: 400, message: 'Enter a valid phone number for delivery', field: 'deliveryPhone' });
      if (deliveryAddress.length < 5) throw new BadRequestException({ statusCode: 400, message: 'Enter the delivery address', field: 'deliveryAddress' });
    } else if (!deliveryAddress) {
      throw new BadRequestException({ statusCode: 400, message: 'Your saved address is empty. Enter a delivery address.', field: 'deliveryAddress' });
    }

    const lines = items.map((i) => {
      const qty = want.get(i.id)!;
      const unitPrice = Number(i.price);
      return { itemId: i.id, name: i.name, unitPrice, qty, lineTotal: round(unitPrice * qty) };
    });
    const subtotal = round(lines.reduce((a, l) => a + l.lineTotal, 0));
    const discountAmount = round((subtotal * s.discountPercent) / 100);
    const total = round(subtotal - discountAmount);

    let order = await this.prisma.clubOrder.create({
      data: {
        orderNumber: this.orderNumber(),
        memberId: m.id,
        memberName: fullName(m),
        cardNumber: m.cardNumber,
        recipientName,
        deliveryPhone,
        deliveryAddress,
        usedDefaultAddress: useDefault,
        paymentMethod: method,
        status: method === 'MOBILE_MONEY' ? 'AWAITING_PAYMENT' : 'PLACED',
        subtotal,
        discountPercent: s.discountPercent,
        discountAmount,
        total,
        notes: cleanText(body.notes, 500),
        items: { create: lines },
      },
      include: { items: true },
    });

    let payment: unknown = null;
    if (method === 'MOBILE_MONEY') {
      try {
        const r = await this.payments.startCollection(m, { purpose: 'ORDER', base: total, phoneInput: body.payPhone ?? m.phone1, description: `Amatugunda Monk Club order ${order.orderNumber}`, orderId: order.id });
        payment = r.data;
      } catch (e) {
        // The order stays, waiting for payment: the member can try paying again from "My orders".
        order = await this.prisma.clubOrder.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
        return { status: 200, data: { order: this.shapeOrder(order), payment: null, paymentError: (e as Error).message }, message: 'Order saved, but the payment could not start' };
      }
    } else {
      void this.notifier.notify(m, {
        subject: `Order ${order.orderNumber} received`,
        lines: [`Thank you for your order of ${money(total)}.`, method === 'CASH' ? 'Please pay in cash when you collect or receive it.' : 'Please pay when it is delivered.'],
        facts: { 'Order number': order.orderNumber, 'Deliver to': deliveryAddress },
      });
    }
    return { status: 201, data: { order: this.shapeOrder(order), payment }, message: 'Order placed' };
  }

  /** Try paying a mobile money order again (after a failed or abandoned attempt). */
  async payOrder(m: ClubMember, orderId: number, phone: unknown) {
    const order = await this.prisma.clubOrder.findFirst({ where: { id: orderId, memberId: m.id } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.paid || order.status !== 'AWAITING_PAYMENT') throw new ConflictException('This order does not need paying');
    return this.payments.startCollection(m, { purpose: 'ORDER', base: Number(order.total), phoneInput: phone ?? m.phone1, description: `Amatugunda Monk Club order ${order.orderNumber}`, orderId: order.id });
  }

  async myOrders(m: ClubMember) {
    const rows = await this.prisma.clubOrder.findMany({ where: { memberId: m.id }, include: { items: true }, orderBy: { createdAt: 'desc' }, take: 50 });
    return { status: 200, data: rows.map((o) => this.shapeOrder(o)), message: 'Orders' };
  }

  async cancelMine(m: ClubMember, orderId: number) {
    const order = await this.prisma.clubOrder.findFirst({ where: { id: orderId, memberId: m.id } });
    if (!order) throw new NotFoundException('Order not found');
    if (!['AWAITING_PAYMENT', 'PLACED'].includes(order.status)) throw new ConflictException('This order is already being prepared. Call us to change it.');
    if (order.paid) throw new ConflictException('This order is paid. Call us to cancel it and arrange a refund.');
    const pending = await this.prisma.clubPayment.count({ where: { orderId, status: 'PENDING', createdAt: { gt: new Date(Date.now() - 15 * 60_000) } } });
    if (pending) throw new ConflictException('A payment for this order is still in progress. Try again in a few minutes.');
    const updated = await this.prisma.clubOrder.update({ where: { id: orderId }, data: { status: 'CANCELLED', statusNote: 'Cancelled by the member' }, include: { items: true } });
    return { status: 200, data: this.shapeOrder(updated), message: 'Order cancelled' };
  }

  // ---------------------------------------------------------------- staff orders

  async adminOrders(q: { status?: string; search?: string; page?: string }) {
    const status = Object.values(ClubOrderStatus).includes(q.status as ClubOrderStatus) ? (q.status as ClubOrderStatus) : undefined;
    const s = cleanText(q.search, 80);
    const where: Prisma.ClubOrderWhereInput = {
      ...(status ? { status } : {}),
      ...(s ? { OR: [{ orderNumber: { contains: s.toUpperCase() } }, { memberName: { contains: s } }, { cardNumber: { contains: s.toUpperCase() } }, { recipientName: { contains: s } }] } : {}),
    };
    const page = Math.max(1, Number(q.page) || 1);
    const take = 25;
    const [rows, total, counts, sums] = await Promise.all([
      this.prisma.clubOrder.findMany({ where, include: { items: true }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * take, take }),
      this.prisma.clubOrder.count({ where }),
      this.prisma.clubOrder.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.clubOrder.aggregate({ where: { status: { not: 'CANCELLED' } }, _sum: { total: true } }),
    ]);
    return {
      status: 200,
      data: {
        rows: rows.map((o) => this.shapeOrder(o)),
        total,
        page,
        pageSize: take,
        counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
        salesTotal: Number(sums._sum.total ?? 0),
      },
      message: 'Orders',
    };
  }

  async setOrderStatus(id: number, body: { status?: unknown; note?: unknown; paid?: unknown }, staffId: number) {
    const order = await this.prisma.clubOrder.findUnique({ where: { id }, include: { member: true } });
    if (!order) throw new NotFoundException('Order not found');
    const data: Prisma.ClubOrderUpdateInput = { updatedById: staffId };
    let next: ClubOrderStatus | null = null;
    if (body.status !== undefined) {
      next = Object.values(ClubOrderStatus).find((x) => x === body.status) ?? null;
      if (!next || !NEXT[order.status].includes(next)) throw new BadRequestException(`An order that ${STATUS_WORDS[order.status]} can't be moved to that status`);
      if (next === 'CANCELLED' && !cleanText(body.note, 500)) throw new BadRequestException({ statusCode: 400, message: 'Give a reason for cancelling', field: 'note' });
      data.status = next;
      data.statusNote = cleanText(body.note, 500);
    }
    // Cash and pay-on-delivery orders are marked paid by staff when the money is received.
    if (body.paid === true && order.paymentMethod !== 'MOBILE_MONEY') data.paid = true;
    const updated = await this.prisma.clubOrder.update({ where: { id }, data, include: { items: true } });
    if (next && order.member && ['DISPATCHED', 'DELIVERED', 'CANCELLED', 'PROCESSING'].includes(next)) {
      void this.notifier.notify(order.member, {
        subject: `Order ${order.orderNumber} ${STATUS_WORDS[next]}`,
        lines: [`Your Amatugunda Monk Club order ${order.orderNumber} ${STATUS_WORDS[next]}.`, ...(data.statusNote ? [`Note: ${data.statusNote as string}`] : [])],
      });
    }
    return { status: 200, data: this.shapeOrder(updated), message: next ? 'Order updated' : 'Saved' };
  }

  // ---------------------------------------------------------------- leaderboard

  /**
   * Members ranked by quantity recorded in the performance tracker:
   * all time, or for one month. Only active members are listed.
   */
  async leaderboard(me: ClubMember | null, q: { period?: string; year?: string; month?: string }) {
    const monthly = q.period === 'month';
    const now = new Date();
    const year = Number(q.year) || now.getFullYear();
    const month = Number(q.month) || now.getMonth() + 1;
    if (monthly && (month < 1 || month > 12)) throw new BadRequestException('Choose a valid month');

    const grouped = await this.prisma.clubTrackerEntry.groupBy({
      by: ['memberId'],
      where: { quantity: { gt: 0 }, member: { status: 'ACTIVE' }, ...(monthly ? { year, month } : {}) },
      _sum: { quantity: true },
      _count: { _all: true },
    });
    const ranked = grouped
      .map((g) => ({ memberId: g.memberId, total: Number(g._sum.quantity ?? 0), lots: g._count._all }))
      .sort((a, b) => b.total - a.total);
    const top = ranked.slice(0, 50);
    const people = await this.prisma.clubMember.findMany({
      where: { id: { in: top.map((r) => r.memberId).concat(me ? [me.id] : []) } },
      select: { id: true, title: true, firstName: true, surname: true, otherName: true, district: true, country: true, photo: true },
    });
    const byId = new Map(people.map((p) => [p.id, p]));
    // Shared rank for equal totals (1, 2, 2, 4…).
    let rank = 0;
    let last = -1;
    const withRank = ranked.map((r, i) => {
      if (r.total !== last) {
        rank = i + 1;
        last = r.total;
      }
      return { ...r, rank };
    });
    const row = (r: (typeof withRank)[number]) => {
      const p = byId.get(r.memberId);
      return {
        rank: r.rank,
        memberId: r.memberId,
        // First name and surname initial only: the board is visible to all members.
        name: p ? `${p.firstName} ${p.surname.charAt(0)}.` : 'Member',
        place: p?.district ?? p?.country ?? null,
        photoUrl: clubPhotoUrl(p?.photo),
        total: r.total,
        deliveries: r.lots,
        isMe: !!me && r.memberId === me.id,
      };
    };
    const mine = me ? withRank.find((r) => r.memberId === me.id) : undefined;
    return {
      status: 200,
      data: {
        period: monthly ? 'month' : 'all',
        year,
        month,
        rows: withRank.slice(0, 50).map(row),
        me: mine ? row(mine) : null,
        participants: ranked.length,
      },
      message: 'Leaderboard',
    };
  }

  // ---------------------------------------------------------------- card check (QR code)

  /**
   * Checks a scanned card code: signature made by this server, for this
   * member, and the card's current version. Anything else is refused.
   */
  async verifyCard(code: string) {
    const parsed = readCardCode(code);
    const forged = { status: 200, data: { authentic: false, reason: 'This code was not issued by Amatugunda Monk Club. The card may be forged.' }, message: 'Card checked' };
    if (!parsed) return forged;
    const m = await this.prisma.clubMember.findUnique({
      where: { cardNumber: parsed.cardNumber },
      select: { id: true, title: true, firstName: true, surname: true, otherName: true, status: true, activatedAt: true, photo: true, district: true, country: true, cardVersion: true, cardChecks: true, cardCheckedAt: true },
    });
    if (!m || !signatureMatches(m.id, parsed.cardNumber, parsed.version, parsed.signature)) return forged;
    if (parsed.version !== m.cardVersion) {
      return { status: 200, data: { authentic: false, reason: 'This is an old copy of the card. A newer card was issued, so this one is no longer valid.' }, message: 'Card checked' };
    }
    const updated = await this.prisma.clubMember.update({ where: { id: m.id }, data: { cardChecks: { increment: 1 }, cardCheckedAt: new Date() }, select: { cardChecks: true } });
    return {
      status: 200,
      data: {
        authentic: true,
        cardNumber: parsed.cardNumber,
        name: `${m.title} ${fullName(m)}`,
        valid: m.status === 'ACTIVE',
        status: m.status,
        memberSince: m.activatedAt,
        place: m.district ?? m.country,
        photoUrl: clubPhotoUrl(m.photo),
        // Shown so staff can compare the person with the photo, and notice unusual use.
        lastCheckedAt: m.cardCheckedAt,
        checks: updated.cardChecks,
      },
      message: 'Card checked',
    };
  }
}
