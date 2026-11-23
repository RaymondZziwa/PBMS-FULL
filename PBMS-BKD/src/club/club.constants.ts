import { randomInt } from 'crypto';

export const CLUB_TITLES = ['Hon', 'Dr', 'Prof', 'Mr', 'Mrs', 'Ms'] as const;
export const CLUB_ID_TYPES = ['NATIONAL_ID', 'PASSPORT'] as const;
export const MAX_NEXT_OF_KIN = 4;
export const MAX_ATTACHMENTS = 6;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

/**
 * Registration fee and charges. Override in .env if they change:
 *   CLUB_REGISTRATION_FEE=50000   what the club wallet receives
 *   CLUB_MARZ_FEE_PERCENT=3       MarzPay's charge, % of the fee, paid by the member
 *   CLUB_SERVICE_FEE=1000         system service charge, paid by the member
 */
export const clubFees = () => ({
  registration: Number(process.env.CLUB_REGISTRATION_FEE ?? 50000),
  marzPercent: Number(process.env.CLUB_MARZ_FEE_PERCENT ?? 3),
  service: Number(process.env.CLUB_SERVICE_FEE ?? 1000),
});

/** What the member pays for a fee of `base`: base + MarzPay % (rounded up) + service charge. */
export const chargeFor = (base: number, marzPercent = clubFees().marzPercent, service = clubFees().service) => {
  const marzFee = Math.ceil((base * marzPercent) / 100);
  return { base, marzFee, serviceFee: service, total: base + marzFee + service };
};

/** Loyalty card number, e.g. PBMC-26-048213. Uniqueness is enforced by the database. */
export const newCardNumber = (date = new Date()) =>
  `PBMC-${String(date.getFullYear()).slice(-2)}-${String(randomInt(0, 1_000_000)).padStart(6, '0')}`;

/** Temporary password: 10 characters without look-alikes (0/O, 1/l/I). */
export const tempPassword = () => {
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const digits = '23456789';
  const all = lower + upper + digits;
  const pick = (s: string) => s[randomInt(0, s.length)];
  const chars = [pick(lower), pick(upper), pick(digits), ...Array.from({ length: 7 }, () => pick(all))];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
};

/**
 * Phone numbers are stored in international form. Ugandan numbers may be typed
 * as 0772…, 772…, 256772… or +256772…; others must start with + and the country code.
 * Returns null if the number isn't valid.
 */
export const normalisePhone = (input: unknown): string | null => {
  if (typeof input !== 'string') return null;
  const raw = input.trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (raw.startsWith('+') && !digits.startsWith('256')) {
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  let local = digits;
  if (local.startsWith('256')) local = local.slice(3);
  if (local.startsWith('0')) local = local.slice(1);
  return /^[37]\d{8}$/.test(local) ? `+256${local}` : null;
};

export const isEmail = (v: unknown): v is string => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

export const cleanText = (v: unknown, max = 255): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.replace(/\s+/g, ' ').trim();
  return t ? t.slice(0, max) : null;
};

export type TrackerStatus = 'DEFAULT' | 'ACTIVE' | 'DEFECTIVE';

/**
 * A month's status from how many of its lots have a quantity:
 * - nothing recorded and the month isn't over yet → DEFAULT
 * - at least half the lots recorded → ACTIVE
 * - fewer than half recorded (including none, once the month is over) → DEFECTIVE
 */
export const monthStatus = (filledLots: number, lots: number, year: number, month: number, today = new Date()): TrackerStatus => {
  const monthOver = year < today.getFullYear() || (year === today.getFullYear() && month < today.getMonth() + 1);
  if (filledLots === 0 && !monthOver) return 'DEFAULT';
  if (lots > 0 && filledLots >= Math.ceil(lots / 2)) return 'ACTIVE';
  return 'DEFECTIVE';
};

export const fullName = (m: { title?: string | null; firstName: string; surname: string; otherName?: string | null }, withTitle = false) =>
  [withTitle ? m.title : null, m.firstName, m.otherName, m.surname].filter(Boolean).join(' ');
