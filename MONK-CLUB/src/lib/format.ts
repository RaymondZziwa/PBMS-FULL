export const ugx = (n: number | string | null | undefined) => `UGX ${new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(Number(n) || 0)}`;
export const qty = (n: number | null | undefined) => (n == null ? "" : new Intl.NumberFormat("en-UG", { maximumFractionDigits: 2 }).format(n));
export const date = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
export const dateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
/** +256772123456 → 0772 123 456 */
export const phone = (p?: string | null) => {
  if (!p) return "";
  const m = /^\+256(\d{3})(\d{3})(\d{3})$/.exec(p);
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : p;
};
export const initials = (name?: string) =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
