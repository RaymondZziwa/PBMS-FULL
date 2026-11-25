import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { hasPermission, isFullAccess, PERMISSIONS, type AuthenticatedUser } from 'src/auth/permissions';

/** A 400 that names the form field, so the screen can show it under that input. */
export const invalid = (field: string, message: string) =>
  new BadRequestException({ statusCode: 400, message, field });

/** Positive whole-number id from JSON or a multipart form (where everything is text). */
export const toId = (value: unknown, field: string, label = field): number => {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw invalid(field, `Choose ${label}`);
  return n;
};

export const optionalId = (value: unknown, field: string, label = field): number | null =>
  value === undefined || value === null || value === '' || value === 'null' || value === 'undefined'
    ? null
    : toId(value, field, label);

/** A quantity or amount. `allowZero` for stock counts (adjustments) and prices. */
export const toNumber = (value: unknown, field: string, label: string, allowZero = false): number => {
  const n = typeof value === 'string' ? Number(value.replace(/,/g, '').trim()) : Number(value);
  if (value === '' || value === null || value === undefined || !Number.isFinite(n)) throw invalid(field, `Enter ${label}`);
  if (allowZero ? n < 0 : n <= 0) throw invalid(field, `${label[0].toUpperCase()}${label.slice(1)} must be ${allowZero ? '0 or more' : 'more than 0'}`);
  if (n > 1e12) throw invalid(field, `${label[0].toUpperCase()}${label.slice(1)} is too large`);
  return n;
};

export const cleanText = (value: unknown, max = 191): string | null => {
  if (value === undefined || value === null) return null;
  const s = String(value).replace(/\s+/g, ' ').trim();
  return s ? s.slice(0, max) : null;
};

export const requireText = (value: unknown, field: string, label: string, max = 191): string => {
  const s = cleanText(value, max);
  if (!s) throw invalid(field, `Enter ${label}`);
  return s;
};

export const toBool = (value: unknown) => value === true || value === 'true' || value === 1 || value === '1';

/** Money to 2 decimal places, so 0.1 + 0.2 style errors never leave a "balance" of 0.0000001. */
export const cents = (n: number) => Math.round(n * 100) / 100;

/**
 * May this person move stock in this store? Administrators and people who
 * manage stores may; everyone else must be on the store's authorised list.
 */
export const canUseStore = (
  user: AuthenticatedUser,
  store: { authorizedPersonnel: Prisma.JsonValue | null },
) => {
  if (isFullAccess(user) || hasPermission(user, PERMISSIONS.STORES)) return true;
  const people = Array.isArray(store.authorizedPersonnel) ? store.authorizedPersonnel : [];
  return people.map((id) => Number(id)).includes(Number(user.id));
};

export const assertStoreAccess = (
  user: AuthenticatedUser,
  store: { name: string; authorizedPersonnel: Prisma.JsonValue | null },
) => {
  if (!canUseStore(user, store)) {
    throw new ForbiddenException(`You're not on the list of people allowed to work in ${store.name}. Ask an administrator to add you to the store.`);
  }
};

/** Turn database errors into messages people can act on, instead of "Internal server error". */
export const friendlyDbError = (e: unknown, what = 'record'): never => {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002') throw new ConflictException(`A ${what} with these details already exists`);
    if (e.code === 'P2003') throw new ConflictException(`This ${what} is still in use, so it can't be changed this way`);
    if (e.code === 'P2025') throw new NotFoundException(`This ${what} no longer exists. Refresh the page.`);
  }
  throw e;
};

const IMAGE = /^image\/(jpeg|png|webp|gif)$/;

/** Multer settings for evidence photos: images only, 5 MB each, random file names. */
export const imageUpload = (folder: string, prefix: string) => ({
  storage: diskStorage({
    destination: join(process.cwd(), 'uploads', folder),
    filename: (_req, file, cb) => cb(null, `${prefix}-${randomUUID()}${extname(file.originalname).toLowerCase().slice(0, 8)}`),
  }),
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (e: Error | null, ok: boolean) => void) => {
    if (!IMAGE.test(file.mimetype)) return cb(invalid('files', 'Photos must be JPG, PNG, WebP or GIF images'), false);
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});
