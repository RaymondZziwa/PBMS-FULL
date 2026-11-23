/**
 * Every request used to load the signed-in user (with role and permissions)
 * from the database. Keep it for a few seconds so a page that fires ten requests
 * does one lookup. Changes to an employee or role clear it straight away.
 */
const TTL_MS = 15_000;
const cache = new Map<number, { user: unknown; expires: number }>();

export const userCache = {
  get<T>(id: number): T | undefined {
    const hit = cache.get(id);
    if (!hit) return undefined;
    if (hit.expires < Date.now()) {
      cache.delete(id);
      return undefined;
    }
    return hit.user as T;
  },
  set(id: number, user: unknown) {
    cache.set(id, { user, expires: Date.now() + TTL_MS });
  },
  invalidate(id?: number) {
    if (id === undefined) cache.clear();
    else cache.delete(id);
  },
};
