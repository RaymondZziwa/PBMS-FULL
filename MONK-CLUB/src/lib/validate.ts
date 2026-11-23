/** Same rules as the API, so mistakes show before sending. */
export const normalisePhone = (input: string): string | null => {
  const raw = input.trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (raw.startsWith("+") && !digits.startsWith("256")) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  let local = digits;
  if (local.startsWith("256")) local = local.slice(3);
  if (local.startsWith("0")) local = local.slice(1);
  return /^[37]\d{8}$/.test(local) ? `+256${local}` : null;
};
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export const MAX_FILE = 5 * 1024 * 1024;
export const fileOk = (f: File, images = false) =>
  f.size > MAX_FILE ? "Files must be smaller than 5 MB" : !(images ? /^image\/(jpeg|png|webp)$/ : /^(image\/(jpeg|png|webp)|application\/pdf)$/).test(f.type) ? (images ? "Choose a JPG, PNG or WebP photo" : "Choose a photo (JPG, PNG) or a PDF") : null;
