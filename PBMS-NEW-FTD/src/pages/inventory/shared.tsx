import { useEffect, useId, useMemo, useState, type ReactNode, type TextareaHTMLAttributes } from "react";
import { FiCamera, FiExternalLink, FiX } from "react-icons/fi";
import { baseURL } from "../../libs/apiConfig";
import { FieldShell, controlBorder } from "../../ui/Field";
import { Badge } from "../../ui/Page";

/** The message and form field from a failed API call (the API names the field when it can). */
export const apiError = (e: unknown): { field?: string; message?: string } => {
  const data = (e as { response?: { data?: { field?: string; message?: string | string[] } } })?.response?.data;
  const message = Array.isArray(data?.message) ? data?.message[0] : data?.message;
  return { field: data?.field, message };
};

export const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** 1250 → "1,250"; 2.5 → "2.5". */
export const qty = (v: unknown) => num(v).toLocaleString("en-UG", { maximumFractionDigits: 3 });

export const when = (iso?: string | Date | null) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Kampala" })
    : "—";

export const day = (iso?: string | Date | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Kampala" }) : "—";

export const personName = (p?: { firstName?: string; lastName?: string } | null) => (p ? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "—" : "—");

export const fileUrl = (path: string) => (/^https?:/.test(path) ? path : `${baseURL}${path.startsWith("/") ? "" : "/"}${path}`);

/** Only real paths (older records can hold nulls). */
export const imagesOf = (...lists: Array<unknown>) =>
  lists.flatMap((l) => (Array.isArray(l) ? l : l ? [l] : [])).filter((p): p is string => typeof p === "string" && p.length > 0);

export const MOVEMENT: Record<string, { label: string; tone: "good" | "warn" | "bad" | "brand" | "neutral" }> = {
  RESTOCK: { label: "Restock", tone: "good" },
  DEPLETION: { label: "Depletion", tone: "bad" },
  TRANSFER: { label: "Transfer", tone: "brand" },
  ADJUSTMENT: { label: "Stock count", tone: "neutral" },
  MANUFACTURING: { label: "Manufacturing", tone: "neutral" },
};

export const MovementBadge = ({ category }: { category: string }) => {
  const m = MOVEMENT[category] ?? { label: category, tone: "neutral" as const };
  return <Badge tone={m.tone}>{m.label}</Badge>;
};

export const TextArea = ({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  className,
  ...rest
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> & {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  hint?: ReactNode;
}) => {
  const id = useId();
  return (
    <FieldShell label={label} required={required} error={error} hint={hint} id={id} className={className}>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error || undefined}
        rows={3}
        className={`themed block w-full resize-y rounded-lg border bg-surface px-3 py-2.5 text-[14px] text-brand-ink outline-none placeholder:text-brand-muted/70 focus:border-brand focus:shadow-[0_0_0_3px_rgb(57_89_165/0.18)] ${controlBorder(error)}`}
        {...rest}
      />
    </FieldShell>
  );
};

const IMAGE_TYPES = /^image\/(jpeg|png|webp|gif)$/;

/** Choose up to `max` photos (5 MB each), with thumbnails and remove buttons. */
export const PhotoPicker = ({
  label,
  files,
  onChange,
  max = 6,
  error,
  hint,
  required,
}: {
  label: string;
  files: File[];
  onChange: (files: File[]) => void;
  max?: number;
  error?: string | null;
  hint?: ReactNode;
  required?: boolean;
}) => {
  const id = useId();
  const [problem, setProblem] = useState<string | null>(null);
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  const add = (list: FileList | null) => {
    const picked = [...(list ?? [])];
    const bad = picked.find((f) => !IMAGE_TYPES.test(f.type) || f.size > 5 * 1024 * 1024);
    if (bad) return setProblem(`${bad.name}: use a JPG, PNG or WebP photo under 5 MB`);
    setProblem(null);
    onChange([...files, ...picked].slice(0, max));
  };

  return (
    <FieldShell label={label} required={required} error={error ?? problem} hint={hint} id={id}>
      <div className="flex flex-wrap gap-2">
        {files.map((f, i) => (
          <figure key={`${f.name}-${i}`} className="relative m-0 h-20 w-20 overflow-hidden rounded-lg border border-line bg-surface-2">
            <img src={urls[i]} alt={f.name} className="h-full w-full object-cover" />
            <button
              type="button"
              aria-label={`Remove ${f.name}`}
              onClick={() => onChange(files.filter((_, j) => j !== i))}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <FiX aria-hidden="true" />
            </button>
          </figure>
        ))}
        {files.length < max && (
          <label htmlFor={id} className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-xs text-brand-muted hover:border-brand hover:text-brand-text">
            <FiCamera aria-hidden="true" className="h-5 w-5" />
            Add photo
            <input id={id} type="file" accept="image/jpeg,image/png,image/webp" multiple={max > 1} className="sr-only" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
          </label>
        )}
      </div>
    </FieldShell>
  );
};

/** Thumbnails that open the full photo in a new tab. */
export const Photos = ({ paths, size = "md" }: { paths: string[]; size?: "sm" | "md" }) =>
  paths.length ? (
    <div className="flex flex-wrap gap-2">
      {paths.map((p) => (
        <a key={p} href={fileUrl(p)} target="_blank" rel="noreferrer" className={`group relative block overflow-hidden rounded-lg border border-line bg-surface-2 ${size === "sm" ? "h-12 w-12" : "h-20 w-20"}`}>
          <img src={fileUrl(p)} alt="Evidence" loading="lazy" className="h-full w-full object-cover" />
          <span className="absolute inset-0 hidden items-center justify-center bg-black/40 text-white group-hover:flex"><FiExternalLink aria-hidden="true" /></span>
        </a>
      ))}
    </div>
  ) : (
    <span className="text-sm text-brand-muted">No photos</span>
  );

/** Simple "label: value" rows for detail dialogs. */
export const Facts = ({ rows }: { rows: Array<[string, ReactNode]> }) => (
  <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
    {rows.map(([k, v]) => (
      <div key={k} className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-brand-muted">{k}</dt>
        <dd className="m-0 mt-0.5 break-words text-sm text-brand-ink">{v ?? "—"}</dd>
      </div>
    ))}
  </dl>
);

/** Table shell with the theme's borders; rows scroll sideways on phones. */
export const Table = ({ head, children }: { head: ReactNode; children: ReactNode }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[640px] border-collapse text-sm">
      <thead>
        <tr className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-brand-muted">{head}</tr>
      </thead>
      <tbody className="divide-y divide-line">{children}</tbody>
    </table>
  </div>
);

export const Th = ({ children, className = "" }: { children?: ReactNode; className?: string }) => <th className={`px-4 py-3 font-semibold ${className}`}>{children}</th>;
export const Td = ({ children, className = "" }: { children?: ReactNode; className?: string }) => <td className={`px-4 py-3 align-middle text-brand-ink ${className}`}>{children}</td>;

/** Simple pager for long lists. */
export const usePaged = <T,>(rows: T[], size = 25) => {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);
  const shown = rows.slice((page - 1) * size, page * size);
  return { shown, page, pages, setPage, total: rows.length, from: rows.length ? (page - 1) * size + 1 : 0, to: Math.min(page * size, rows.length) };
};

export const Pager = ({ page, pages, setPage, from, to, total }: { page: number; pages: number; setPage: (p: number) => void; from: number; to: number; total: number }) =>
  total > 0 && pages > 1 ? (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-brand-muted">
      <span className="tabular-nums">{from}–{to} of {total}</span>
      <div className="flex gap-1">
        <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="h-9 rounded-lg border border-line px-3 text-brand-ink hover:bg-surface-2 disabled:opacity-40">Previous</button>
        <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="h-9 rounded-lg border border-line px-3 text-brand-ink hover:bg-surface-2 disabled:opacity-40">Next</button>
      </div>
    </div>
  ) : null;

/** Row of filter chips (tabs). */
export const Tabs = <T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string; count?: number }>; label: string }) => (
  <div role="tablist" aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto px-1">
    {options.map((t) => {
      const on = value === t.value;
      return (
        <button key={t.value} type="button" role="tab" aria-selected={on} onClick={() => onChange(t.value)} className={`flex h-9 flex-none items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium ${on ? "bg-brand text-white" : "text-brand-muted hover:bg-surface-2 hover:text-brand-ink"}`}>
          {t.label}
          {t.count ? <span className={`rounded-full px-1.5 text-[11px] ${on ? "bg-white/20" : "bg-subtle text-brand-text"}`}>{t.count}</span> : null}
        </button>
      );
    })}
  </div>
);
