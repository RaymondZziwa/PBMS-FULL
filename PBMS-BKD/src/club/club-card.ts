import { createHmac, timingSafeEqual } from 'crypto';
import { requireSecret } from 'src/auth/jwtSecrets';

/**
 * Signed membership-card codes (what the QR code on the card holds).
 *
 *   AMC1.<card number>.<card version>.<signature>
 *   e.g. AMC1.PBMC-26-048213.1.Xq3v…
 *
 * The signature is an HMAC-SHA256 (first 128 bits) of the member's id, card
 * number and card version, made with a key only the server knows. So:
 *  - a code can't be made up or edited (changing any character breaks the signature);
 *  - the code from one card can't be moved to another member (the id is signed);
 *  - "Reissue card" in PBMS bumps the version, so every older copy (screenshots,
 *    photocopies, a lost phone) stops being accepted.
 *
 * Key: CLUB_CARD_SECRET in .env (32+ characters). If it's not set, a key derived
 * from JWT_SECRET is used. Changing the key makes every printed/shown card invalid.
 */
const PREFIX = 'AMC1';

const key = () => {
  const own = process.env.CLUB_CARD_SECRET;
  if (own && own.length >= 32) return own;
  return createHmac('sha256', requireSecret(undefined, 'JWT_SECRET')).update('amatugunda-monk-club-card').digest('hex');
};

const sign = (memberId: number, cardNumber: string, version: number) =>
  createHmac('sha256', key()).update(`${PREFIX}|${memberId}|${cardNumber}|${version}`).digest().subarray(0, 16).toString('base64url');

/** The code to put in the member's QR, or null if they have no card yet. */
export const cardCode = (m: { id: number; cardNumber: string | null; cardVersion: number }) =>
  m.cardNumber ? `${PREFIX}.${m.cardNumber}.${m.cardVersion}.${sign(m.id, m.cardNumber, m.cardVersion)}` : null;

/** Splits a scanned code. Returns null if it isn't one of ours at all. */
export const readCardCode = (raw: string) => {
  const parts = String(raw ?? '').trim().split('.');
  if (parts.length !== 4 || parts[0] !== PREFIX) return null;
  const [, cardNumber, v, signature] = parts;
  const version = Number(v);
  // PBMC-YY-NNNNNN, or an existing card number entered by staff (letters, numbers, dashes).
  if (!/^[A-Z0-9][A-Z0-9-]{3,19}$/.test(cardNumber) || !Number.isInteger(version) || version < 1 || !/^[\w-]{22}$/.test(signature)) return null;
  return { cardNumber, version, signature };
};

/** Constant-time check that the signature was made by this server for this member. */
export const signatureMatches = (memberId: number, cardNumber: string, version: number, signature: string) => {
  const expected = Buffer.from(sign(memberId, cardNumber, version));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
};
