import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { MAX_ATTACHMENTS, MAX_FILE_BYTES } from './club.constants';

/** Profile photos are public (random names). ID copies are kept outside the public uploads folder. */
export const CLUB_PHOTO_DIR = join(process.cwd(), 'uploads', 'club', 'photos');
export const CLUB_PRIVATE_DIR = join(process.cwd(), 'private', 'club');
mkdirSync(CLUB_PHOTO_DIR, { recursive: true });
mkdirSync(CLUB_PRIVATE_DIR, { recursive: true });

const IMAGE = /^image\/(jpeg|png|webp)$/;
const DOC = /^(image\/(jpeg|png|webp)|application\/pdf)$/;
const EXT: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' };

export const clubUpload = {
  storage: diskStorage({
    destination: (_req, file, cb) => cb(null, file.fieldname === 'photo' ? CLUB_PHOTO_DIR : CLUB_PRIVATE_DIR),
    // Never trust the uploaded name: random name + extension from the checked type.
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${EXT[file.mimetype] ?? extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_ATTACHMENTS + 1 },
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (e: Error | null, ok: boolean) => void) => {
    const ok = file.fieldname === 'photo' ? IMAGE.test(file.mimetype) : DOC.test(file.mimetype);
    cb(ok ? null : new BadRequestException(file.fieldname === 'photo' ? 'The photo must be a JPG, PNG or WebP image' : 'Attachments must be images or PDFs'), ok);
  },
};

export const clubPhotoUrl = (fileName?: string | null) => (fileName ? `/uploads/club/photos/${fileName}` : null);
