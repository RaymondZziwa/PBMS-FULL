import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { FiCalendar, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import Popover from "./Popover";
import { CONTROL, controlBorder, FieldShell } from "./Field";

/* ------------------------------------------------------------------ helpers */
const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const fromISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
};
const todayISO = () => {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export const formatDate = (iso: string) => {
  if (!iso) return "";
  const d = fromISO(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
export const formatMonth = (ym: string) => {
  if (!ym) return "";
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
};

type BaseProps = {
  label: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
};

const NavButton = ({ onClick, label, dir }: { onClick: () => void; label: string; dir: "prev" | "next" }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className="flex h-9 w-9 items-center justify-center rounded-lg text-brand-muted hover:bg-surface-2 hover:text-brand-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
  >
    {dir === "prev" ? <FiChevronLeft aria-hidden="true" /> : <FiChevronRight aria-hidden="true" />}
  </button>
);

/* ------------------------------------------------------------- DatePicker */
type DatePickerProps = BaseProps & { value: string; onChange: (iso: string) => void; min?: string; max?: string };

/** Calendar date picker. Value is "YYYY-MM-DD". Arrow keys move by day/week, Enter picks. */
export const DatePicker = ({ label, value, onChange, min, max, error, hint, required, disabled, className, placeholder = "Pick a date" }: DatePickerProps) => {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(value || todayISO());
  const view = fromISO(focus);
  const year = view.getUTCFullYear();
  const month = view.getUTCMonth();

  const days = useMemo(() => {
    const first = new Date(Date.UTC(year, month, 1));
    const offset = (first.getUTCDay() + 6) % 7; // Monday first
    const start = new Date(Date.UTC(year, month, 1 - offset));
    return Array.from({ length: 42 }, (_, i) => toISO(new Date(start.getTime() + i * 86400000)));
  }, [year, month]);

  const blocked = (iso: string) => (!!min && iso < min) || (!!max && iso > max);

  useEffect(() => {
    if (open) requestAnimationFrame(() => gridRef.current?.querySelector<HTMLElement>('[data-focus="true"]')?.focus());
  }, [open, focus]);

  const show = () => {
    if (disabled) return;
    setFocus(value || todayISO());
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  const move = (daysBy: number) => setFocus(toISO(new Date(fromISO(focus).getTime() + daysBy * 86400000)));
  const moveMonth = (by: number) => {
    const d = fromISO(focus);
    const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + by, 1));
    const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(d.getUTCDate(), last));
    setFocus(toISO(target));
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const map: Record<string, () => void> = {
      ArrowLeft: () => move(-1),
      ArrowRight: () => move(1),
      ArrowUp: () => move(-7),
      ArrowDown: () => move(7),
      PageUp: () => moveMonth(-1),
      PageDown: () => moveMonth(1),
    };
    if (map[e.key]) {
      e.preventDefault();
      map[e.key]();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!blocked(focus)) {
        onChange(focus);
        close();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  };

  const today = todayISO();

  return (
    <FieldShell label={label} required={required} hint={hint} error={error} id={id} className={className}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={!!error || undefined}
        onClick={() => (open ? close() : show())}
        className={`${CONTROL} ${controlBorder(error)} gap-2 ${open ? "border-brand shadow-[0_0_0_3px_rgb(57_89_165/0.18)]" : ""}`}
      >
        <FiCalendar aria-hidden="true" className="h-4 w-4 flex-none text-brand-muted" />
        <span className={`truncate ${value ? "" : "text-brand-muted/80"}`}>{value ? formatDate(value) : placeholder}</span>
      </button>

      <Popover open={open} anchorRef={triggerRef} onClose={() => setOpen(false)} matchWidth={false}>
        <div role="dialog" aria-label={`Choose ${label.toLowerCase()}`} className="w-[296px] p-3">
          <div className="mb-2 flex items-center justify-between">
            <NavButton dir="prev" label="Previous month" onClick={() => moveMonth(-1)} />
            <p aria-live="polite" className="m-0 font-display text-sm font-semibold text-brand-ink">
              {MONTHS_LONG[month]} {year}
            </p>
            <NavButton dir="next" label="Next month" onClick={() => moveMonth(1)} />
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center" role="grid" ref={gridRef} onKeyDown={onKey}>
            {WEEKDAYS.map((w) => (
              <span key={w} role="columnheader" className="pb-1 text-[11px] font-medium uppercase text-brand-muted">
                {w}
              </span>
            ))}
            {days.map((iso) => {
              const inMonth = fromISO(iso).getUTCMonth() === month;
              const sel = iso === value;
              const isFocus = iso === focus;
              const off = blocked(iso);
              return (
                <button
                  key={iso}
                  type="button"
                  role="gridcell"
                  tabIndex={isFocus ? 0 : -1}
                  data-focus={isFocus}
                  disabled={off}
                  aria-selected={sel}
                  aria-label={formatDate(iso)}
                  onClick={() => {
                    onChange(iso);
                    close();
                  }}
                  className={`h-9 rounded-lg text-sm tabular-nums transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-30 ${
                    sel ? "bg-brand font-semibold text-white" : inMonth ? "text-brand-ink hover:bg-subtle" : "text-brand-muted/60 hover:bg-surface-2"
                  } ${iso === today && !sel ? "ring-1 ring-inset ring-brand/50" : ""}`}
                >
                  {fromISO(iso).getUTCDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between border-t border-line pt-2">
            <button
              type="button"
              onClick={() => {
                if (!blocked(today)) {
                  onChange(today);
                  close();
                }
              }}
              className="rounded-md px-2 py-1 text-xs font-medium text-brand-text hover:bg-subtle"
            >
              Today
            </button>
            <button type="button" onClick={close} className="rounded-md px-2 py-1 text-xs font-medium text-brand-muted hover:bg-surface-2">
              Close
            </button>
          </div>
        </div>
      </Popover>
    </FieldShell>
  );
};

/* ------------------------------------------------------------ MonthPicker */
type MonthPickerProps = BaseProps & { value: string; onChange: (ym: string) => void; min?: string; max?: string };

/** Month picker. Value is "YYYY-MM". */
export const MonthPicker = ({ label, value, onChange, min, max, error, hint, required, disabled, className, placeholder = "Pick a month" }: MonthPickerProps) => {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => Number((value || todayISO()).slice(0, 4)));

  useEffect(() => {
    if (open) requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>('[aria-pressed="true"], [data-current="true"]')?.focus());
  }, [open]);

  const show = () => {
    if (disabled) return;
    setYear(Number((value || todayISO()).slice(0, 4)));
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  const current = todayISO().slice(0, 7);

  return (
    <FieldShell label={label} required={required} hint={hint} error={error} id={id} className={className}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={!!error || undefined}
        onClick={() => (open ? close() : show())}
        className={`${CONTROL} ${controlBorder(error)} gap-2 ${open ? "border-brand shadow-[0_0_0_3px_rgb(57_89_165/0.18)]" : ""}`}
      >
        <FiCalendar aria-hidden="true" className="h-4 w-4 flex-none text-brand-muted" />
        <span className={`truncate ${value ? "" : "text-brand-muted/80"}`}>{value ? formatMonth(value) : placeholder}</span>
      </button>

      <Popover open={open} anchorRef={triggerRef} onClose={() => setOpen(false)} matchWidth={false}>
        <div
          ref={panelRef}
          role="dialog"
          aria-label={`Choose ${label.toLowerCase()}`}
          className="w-[264px] p-3"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              close();
            }
          }}
        >
          <div className="mb-2 flex items-center justify-between">
            <NavButton dir="prev" label="Previous year" onClick={() => setYear((y) => y - 1)} />
            <p aria-live="polite" className="m-0 font-display text-sm font-semibold text-brand-ink">
              {year}
            </p>
            <NavButton dir="next" label="Next year" onClick={() => setYear((y) => y + 1)} />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTHS.map((m, i) => {
              const ym = `${year}-${pad(i + 1)}`;
              const sel = ym === value;
              const off = (!!min && ym < min) || (!!max && ym > max);
              return (
                <button
                  key={ym}
                  type="button"
                  disabled={off}
                  aria-pressed={sel}
                  data-current={ym === current}
                  aria-label={`${MONTHS_LONG[i]} ${year}`}
                  onClick={() => {
                    onChange(ym);
                    close();
                  }}
                  className={`h-10 rounded-lg text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-30 ${
                    sel ? "bg-brand text-white" : "text-brand-ink hover:bg-subtle"
                  } ${ym === current && !sel ? "ring-1 ring-inset ring-brand/50" : ""}`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      </Popover>
    </FieldShell>
  );
};
