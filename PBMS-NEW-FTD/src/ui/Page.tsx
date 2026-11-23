import type { ReactNode } from "react";

/** Title row at the top of a page, with actions on the right (they wrap under on phones). */
export const PageHeader = ({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) => (
  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <h1 className="m-0 font-display text-2xl font-semibold tracking-tight text-brand-ink">{title}</h1>
      {description && <p className="m-0 mt-1 max-w-2xl text-sm text-brand-muted">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <section className={`rounded-xl border border-line bg-surface shadow-card ${className}`}>{children}</section>
);

/** Small number tile for the top of list pages. */
export const StatTile = ({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) => (
  <div className="rounded-xl border border-line bg-surface px-4 py-3.5 shadow-card">
    <p className="m-0 text-xs font-medium uppercase tracking-wide text-brand-muted">{label}</p>
    <p className="m-0 mt-1 font-display text-2xl font-semibold tabular-nums text-brand-ink">{value}</p>
    {hint && <p className="m-0 mt-0.5 text-xs text-brand-muted">{hint}</p>}
  </div>
);

export const EmptyState = ({ icon, title, message, action }: { icon?: ReactNode; title: string; message?: ReactNode; action?: ReactNode }) => (
  <div className="flex flex-col items-center px-6 py-14 text-center">
    {icon && (
      <span aria-hidden="true" className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-subtle text-brand-text">
        {icon}
      </span>
    )}
    <p className="m-0 font-display text-base font-semibold text-brand-ink">{title}</p>
    {message && <p className="m-0 mt-1 max-w-sm text-sm text-brand-muted">{message}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

type BadgeTone = "neutral" | "good" | "warn" | "bad" | "brand";
const BADGE: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-ink-soft border-line",
  good: "bg-[#E7F6EC] text-[#1E7B43] border-[#C8EBD4] dark:bg-[#15301F] dark:text-[#8FD6A8] dark:border-[#24482F]",
  warn: "bg-[#FEF4E2] text-[#93600A] border-[#F8E1B4] dark:bg-[#33280F] dark:text-[#F0CF85] dark:border-[#4A3A17]",
  bad: "bg-[#FDECEA] text-[#B42318] border-[#F8D3CF] dark:bg-[#381B19] dark:text-[#F2A29A] dark:border-[#55282A]",
  brand: "bg-subtle text-brand-text border-transparent",
};

export const Badge = ({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) => (
  <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${BADGE[tone]}`}>{children}</span>
);

/** Grey placeholder rows while a list loads. */
export const SkeletonRows = ({ rows = 6 }: { rows?: number }) => (
  <div aria-hidden="true" className="divide-y divide-line">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-4 py-3.5">
        <span className="h-9 w-9 animate-pulse rounded-full bg-surface-2" />
        <span className="h-3 flex-1 animate-pulse rounded bg-surface-2" />
        <span className="hidden h-3 w-24 animate-pulse rounded bg-surface-2 sm:block" />
      </div>
    ))}
  </div>
);

export const ugx = (n: number | string | null | undefined, opts: { compact?: boolean } = {}) => {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "UGX 0";
  return `UGX ${new Intl.NumberFormat("en-UG", {
    maximumFractionDigits: opts.compact ? 1 : 0,
    notation: opts.compact ? "compact" : "standard",
  }).format(v)}`;
};

export const initials = (first?: string, last?: string) =>
  `${(first ?? "").trim().charAt(0)}${(last ?? "").trim().charAt(0)}`.toUpperCase() || "?";
