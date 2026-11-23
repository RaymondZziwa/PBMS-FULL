import axios from "axios";

export type LoginMethod = "email" | "phone";

/** Local Ugandan digits (e.g. "772123456") from whatever the user typed. */
export const localPhoneDigits = (input: string): string => {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("256")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits;
};

/** "+256772123456" — the backend also matches 0772…, 772… and 256… shapes. */
export const toInternationalPhone = (input: string): string =>
  `+256${localPhoneDigits(input)}`;

export const isValidPhone = (input: string): boolean =>
  /^7\d{8}$/.test(localPhoneDigits(input));

export const isValidEmail = (input: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());

/** What the user typed, partly hidden: j•••••@profbioresearch.com, +256 7•• ••• 123 */
export const maskIdentifier = (method: LoginMethod, value: string): string => {
  if (method === "email") {
    const [name, domain] = value.trim().split("@");
    if (!name || !domain) return value;
    return `${name[0]}•••••@${domain}`;
  }
  const d = localPhoneDigits(value);
  if (d.length < 4) return value;
  return `+256 ${d[0]}•• ••• ${d.slice(-3)}`;
};

export type PasswordCheck = { label: string; ok: boolean };

export const passwordChecks = (password: string, confirm: string): PasswordCheck[] => [
  { label: "At least 10 characters", ok: password.length >= 10 },
  { label: "Upper and lower case", ok: /[a-z]/.test(password) && /[A-Z]/.test(password) },
  { label: "At least one number", ok: /\d/.test(password) },
  { label: "Both passwords match", ok: password.length > 0 && password === confirm },
];

/** 0 = empty, 1 too weak … 4 strong */
export const passwordStrength = (password: string): number => {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 10) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password) && password.length >= 12) score++;
  return Math.max(score, 1);
};

export const STRENGTH = [
  { label: "—", color: "#E2E6EF" },
  { label: "Too weak", color: "#C4381F" },
  { label: "Weak", color: "#C77700" },
  { label: "Good", color: "#3959A5" },
  { label: "Strong", color: "#1F7A4D" },
];

/** Pull a readable message and status out of an axios error. */
export const readApiError = (
  error: unknown
): { status?: number; message?: string; offline: boolean } => {
  if (axios.isAxiosError(error)) {
    if (!error.response) return { offline: true };
    const data = error.response.data as { message?: unknown } | undefined;
    const raw = data?.message;
    const message = Array.isArray(raw) ? String(raw[0]) : typeof raw === "string" ? raw : undefined;
    return { status: error.response.status, message, offline: false };
  }
  return { offline: false };
};
