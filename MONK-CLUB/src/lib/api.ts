/** Talks to the PBMS API (club routes). The member token is kept in this browser. */
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ?? "http://localhost:3500";
const TOKEN_KEY = "monk.token";

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
export const setToken = (t: string | null) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode */
  }
};

/** An error from the API, with the form field it's about (when there is one). */
export class ApiError extends Error {
  constructor(message: string, public status: number, public field?: string) {
    super(message);
  }
}

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

export async function api<T>(path: string, opts: { method?: string; body?: unknown; form?: FormData; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = opts.auth === false ? null : getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.method ?? (opts.body !== undefined || opts.form ? "POST" : "GET"),
      headers,
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    });
  } catch {
    throw new ApiError("Can't reach Monk Club right now. Check your internet connection and try again.", 0);
  }

  const json = (await res.json().catch(() => ({}))) as { data?: T; message?: string | string[]; field?: string };
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
    const msg = Array.isArray(json.message) ? json.message[0] : json.message;
    throw new ApiError(msg || "Something went wrong. Please try again.", res.status, json.field);
  }
  return (json.data ?? (json as T)) as T;
}

/** Absolute URL for a file the API serves (e.g. a profile photo). */
export const fileUrl = (p?: string | null) => (!p ? null : p.startsWith("http") ? p : `${API_URL}${p}`);
