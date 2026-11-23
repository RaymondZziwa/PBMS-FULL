import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { cleanText, monthStatus } from './club.constants';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MIN_LOTS = 1;
const MAX_LOTS = 20;
const DEFAULT_LOTS = 4;

type CellInput = { month?: unknown; lot?: unknown; quantity?: unknown; receiptNo?: unknown };

/**
 * The yearly performance tracker: 12 months × n lots. Each cell holds a
 * quantity and a receipt number; each month's status is worked out from how
 * many lots were recorded (see monthStatus). Only staff fill it in.
 */
@Injectable()
export class ClubTrackerService {
  constructor(private readonly prisma: PrismaService) {}

  async get(memberId: number, year: number) {
    if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new BadRequestException('Choose a valid year');
    const member = await this.prisma.clubMember.findUnique({ where: { id: memberId }, select: { id: true } });
    if (!member) throw new NotFoundException('Member not found');

    const [setting, cells, years] = await Promise.all([
      this.prisma.clubTrackerYear.findUnique({ where: { memberId_year: { memberId, year } } }),
      this.prisma.clubTrackerEntry.findMany({ where: { memberId, year }, orderBy: [{ month: 'asc' }, { lot: 'asc' }] }),
      this.prisma.clubTrackerYear.findMany({ where: { memberId }, select: { year: true }, orderBy: { year: 'desc' } }),
    ]);
    const usedLots = cells.reduce((m, c) => Math.max(m, c.lot), 0);
    const lots = Math.max(setting?.lots ?? DEFAULT_LOTS, usedLots);

    const months = MONTHS.map((name, i) => {
      const month = i + 1;
      const row = Array.from({ length: lots }, (_, j) => {
        const c = cells.find((x) => x.month === month && x.lot === j + 1);
        return { lot: j + 1, quantity: c?.quantity != null ? Number(c.quantity) : null, receiptNo: c?.receiptNo ?? null };
      });
      const filled = row.filter((c) => (c.quantity ?? 0) > 0).length;
      return { month, name, cells: row, filled, status: monthStatus(filled, lots, year, month) };
    });

    const totals = Array.from({ length: lots }, (_, j) => months.reduce((a, m) => a + (m.cells[j].quantity ?? 0), 0));
    const yearsWithData = Array.from(new Set([...years.map((y) => y.year), year])).sort((a, b) => b - a);

    return {
      status: 200,
      data: {
        year,
        lots,
        months,
        totals,
        summary: {
          active: months.filter((m) => m.status === 'ACTIVE').length,
          defective: months.filter((m) => m.status === 'DEFECTIVE').length,
          pending: months.filter((m) => m.status === 'DEFAULT').length,
          totalQuantity: totals.reduce((a, b) => a + b, 0),
        },
        years: yearsWithData,
      },
      message: 'Tracker fetched',
    };
  }

  /** Saves the whole year at once: lot count plus every cell sent. Empty cells are removed. */
  async save(memberId: number, body: { year?: unknown; lots?: unknown; cells?: unknown }, staffId: number) {
    const year = Number(body.year);
    const lots = Number(body.lots);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new BadRequestException('Choose a valid year');
    if (!Number.isInteger(lots) || lots < MIN_LOTS || lots > MAX_LOTS) throw new BadRequestException(`Lots must be between ${MIN_LOTS} and ${MAX_LOTS}`);
    if (!Array.isArray(body.cells)) throw new BadRequestException('Nothing to save');
    const member = await this.prisma.clubMember.findUnique({ where: { id: memberId }, select: { id: true, status: true } });
    if (!member) throw new NotFoundException('Member not found');

    const keep: Array<{ month: number; lot: number; quantity: number | null; receiptNo: string | null }> = [];
    const seen = new Set<string>();
    for (const raw of body.cells as CellInput[]) {
      const month = Number(raw?.month);
      const lot = Number(raw?.lot);
      if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(lot) || lot < 1 || lot > lots) continue;
      const key = `${month}-${lot}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const qRaw = raw.quantity === '' || raw.quantity == null ? null : Number(raw.quantity);
      if (qRaw !== null && (!Number.isFinite(qRaw) || qRaw < 0 || qRaw > 1e9)) {
        throw new BadRequestException(`Check the quantity for ${MONTHS[month - 1]}, lot ${lot}`);
      }
      const receiptNo = cleanText(raw.receiptNo, 60);
      if (qRaw && qRaw > 0 && !receiptNo) throw new BadRequestException(`Add the receipt number for ${MONTHS[month - 1]}, lot ${lot}`);
      if (qRaw === null && !receiptNo) continue;
      keep.push({ month, lot, quantity: qRaw, receiptNo });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.clubTrackerYear.upsert({ where: { memberId_year: { memberId, year } }, create: { memberId, year, lots }, update: { lots } });
      await tx.clubTrackerEntry.deleteMany({ where: { memberId, year } });
      if (keep.length) {
        await tx.clubTrackerEntry.createMany({ data: keep.map((c) => ({ ...c, memberId, year, updatedById: staffId })) });
      }
    });
    const fresh = await this.get(memberId, year);
    return { ...fresh, message: 'Tracker saved' };
  }
}
