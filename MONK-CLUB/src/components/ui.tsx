import { forwardRef, useEffect, useId, useMemo, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { FiAlertCircle, FiCheck, FiCheckCircle, FiChevronDown, FiInfo, FiMoon, FiSearch, FiSun, FiX } from "react-icons/fi";
import logo from "../assets/logo.png";
import { useTheme } from "../lib/theme";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

/* ---------------- Button ---------------- */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; loading?: boolean; icon?: ReactNode; block?: boolean; size?: "md" | "lg" | "sm" };
export const Button = forwardRef<HTMLButtonElement, BtnProps>(({ variant = "primary", loading, icon, block, size = "md", className, children, disabled, type = "button", ...rest }, ref) => (
  <button
    ref={ref}
    type={type}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={cx(
      "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55",
      size === "lg" ? "h-[52px] px-6 text-base" : size === "sm" ? "h-9 px-3 text-sm" : "h-11 px-4 text-[15px]",
      variant === "primary" && "bg-brand text-white shadow-sm hover:bg-brand-dark",
      variant === "secondary" && "border border-line bg-surface text-ink hover:bg-surface-2",
      variant === "ghost" && "text-brand-text hover:bg-subtle",
      variant === "danger" && "bg-bad text-white hover:bg-red-700",
      block && "w-full",
      className,
    )}
    {...rest}
  >
    {loading ? <Spinner className="h-4 w-4" /> : icon}
    {children}
  </button>
));
Button.displayName = "Button";

export const Spinner = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={cx("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
    <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

/* ---------------- Fields ---------------- */
export const Field = ({ label, hint, error, required, htmlFor, children, className }: { label: ReactNode; hint?: ReactNode; error?: string | null; required?: boolean; htmlFor?: string; children: ReactNode; className?: string }) => (
  <div className={className}>
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink-soft">
      {label} {required ? <span className="text-bad">*</span> : <span className="font-normal text-ink-muted">(optional)</span>}
    </label>
    {children}
    {error ? (
      <p id={htmlFor ? `${htmlFor}-err` : undefined} role="alert" className="mt-1.5 flex items-start gap-1.5 text-[13px] text-bad">
        <FiAlertCircle aria-hidden="true" className="mt-0.5 flex-none" /> {error}
      </p>
    ) : hint ? (
      <p className="mt-1.5 text-[13px] text-ink-muted">{hint}</p>
    ) : null}
  </div>
);

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & { label: ReactNode; hint?: ReactNode; error?: string | null; onChange?: (v: string) => void; right?: ReactNode; fieldClassName?: string };
export const TextInput = forwardRef<HTMLInputElement, InputProps>(({ label, hint, error, required, onChange, id, right, fieldClassName, className, ...rest }, ref) => {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={fid} className={fieldClassName}>
      <div className="relative">
        <input
          ref={ref}
          id={fid}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${fid}-err` : undefined}
          className={cx("control", !!right && "pr-12", className)}
          onChange={(e) => onChange?.(e.target.value)}
          {...rest}
        />
        {right && <div className="absolute inset-y-0 right-1 flex items-center">{right}</div>}
      </div>
    </Field>
  );
});
TextInput.displayName = "TextInput";

export const TextArea = ({ label, hint, error, required, onChange, id, ...rest }: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> & { label: ReactNode; hint?: ReactNode; error?: string | null; onChange?: (v: string) => void }) => {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={fid}>
      <textarea id={fid} aria-invalid={!!error || undefined} className="control h-auto min-h-[88px] py-3" onChange={(e) => onChange?.(e.target.value)} {...rest} />
    </Field>
  );
};

/* ---------------- Searchable select ---------------- */
type Option = { value: string; label: string; hint?: string };
export const Select = ({ label, value, onChange, options, placeholder = "Choose…", error, required, hint, searchable = true, disabled, allowCustom }: {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: Option[] | string[];
  placeholder?: string;
  error?: string | null;
  required?: boolean;
  hint?: ReactNode;
  searchable?: boolean;
  disabled?: boolean;
  /** Let the person use what they typed when it isn't in the list. */
  allowCustom?: boolean;
}) => {
  const id = useId();
  const opts = useMemo<Option[]>(() => options.map((o) => (typeof o === "string" ? { value: o, label: o } : o)), [options]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const btn = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? opts.filter((o) => o.label.toLowerCase().includes(s)) : opts;
  }, [opts, q]);
  const selected = opts.find((o) => o.value === value);
  const mobile = typeof window !== "undefined" && window.innerWidth < 640;

  const openIt = () => {
    if (disabled) return;
    setRect(btn.current?.getBoundingClientRect() ?? null);
    setQ("");
    setActive(Math.max(0, opts.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    btn.current?.focus();
  };
  const pick = (v: string) => {
    onChange(v);
    close();
  };

  useEffect(() => {
    if (!open) return;
    setTimeout(() => search.current?.focus(), 30);
    const onScroll = () => !mobile && setRect(btn.current?.getBoundingClientRect() ?? null);
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, mobile]);

  const onKey = (e: ReactKeyboardEvent) => {
    if (e.key === "Escape") return close();
    if (e.key === "ArrowDown") (e.preventDefault(), setActive((a) => Math.min(shown.length - 1, a + 1)));
    if (e.key === "ArrowUp") (e.preventDefault(), setActive((a) => Math.max(0, a - 1)));
    if (e.key === "Enter") {
      e.preventDefault();
      if (shown[active]) pick(shown[active].value);
      else if (allowCustom && q.trim()) pick(q.trim());
    }
  };

  const list = (
    <div role="listbox" id={`${id}-list`} className="max-h-[50vh] overflow-y-auto overscroll-contain p-1 sm:max-h-72">
      {shown.map((o, i) => (
        <button
          key={o.value}
          type="button"
          role="option"
          aria-selected={o.value === value}
          onMouseEnter={() => setActive(i)}
          onClick={() => pick(o.value)}
          className={cx("flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-left text-[15px]", i === active ? "bg-subtle" : "", o.value === value ? "font-semibold text-brand-text" : "text-ink")}
        >
          <span className="flex-1">{o.label}{o.hint && <span className="ml-2 text-xs font-normal text-ink-muted">{o.hint}</span>}</span>
          {o.value === value && <FiCheck aria-hidden="true" />}
        </button>
      ))}
      {!shown.length && (
        allowCustom && q.trim() ? (
          <button type="button" onClick={() => pick(q.trim())} className="flex min-h-[44px] w-full items-center rounded-lg px-3 text-left text-[15px] text-brand-text hover:bg-subtle">Use “{q.trim()}”</button>
        ) : (
          <p className="m-0 px-3 py-4 text-center text-sm text-ink-muted">No match</p>
        )
      )}
    </div>
  );

  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={id}>
      <button
        ref={btn}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={!!error || undefined}
        onClick={openIt}
        onKeyDown={(e) => (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") && (e.preventDefault(), openIt())}
        className="control flex items-center justify-between text-left disabled:opacity-60"
      >
        <span className={cx("truncate", !selected && !value && "text-ink-muted/80")}>{selected?.label ?? (value || placeholder)}</span>
        <FiChevronDown aria-hidden="true" className="flex-none text-ink-muted" />
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50" onKeyDown={onKey}>
            <div className={cx("absolute inset-0", mobile ? "bg-black/40" : "")} onClick={close} aria-hidden="true" />
            <div
              className={cx("absolute overflow-hidden border border-line bg-surface shadow-pop", mobile ? "inset-x-0 bottom-0 rounded-t-2xl pb-[env(safe-area-inset-bottom)]" : "rounded-xl")}
              style={!mobile && rect ? { left: rect.left, width: Math.max(rect.width, 240), ...(rect.bottom + 340 > window.innerHeight ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }) } : undefined}
            >
              {mobile && (
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <span className="font-semibold">{label}</span>
                  <button type="button" onClick={close} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-2"><FiX /></button>
                </div>
              )}
              {searchable && opts.length > 6 && (
                <div className="border-b border-line p-2">
                  <div className="relative">
                    <FiSearch aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                    <input ref={search} value={q} onChange={(e) => (setQ(e.target.value), setActive(0))} placeholder="Search" aria-label="Search" aria-controls={`${id}-list`} className="h-11 w-full rounded-lg bg-surface-2 pl-9 pr-3 text-[15px] outline-none" />
                  </div>
                </div>
              )}
              {list}
            </div>
          </div>,
          document.body,
        )}
    </Field>
  );
};

/* ---------------- Choice chips ---------------- */
export const Chips = ({ label, value, onChange, options, error, required }: { label: ReactNode; value: string; onChange: (v: string) => void; options: Option[]; error?: string | null; required?: boolean }) => (
  <fieldset className="m-0 border-0 p-0">
    <legend className="mb-1.5 block text-sm font-medium text-ink-soft">{label} {required && <span className="text-bad">*</span>}</legend>
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx("min-h-[44px] rounded-xl border px-4 text-[15px] font-medium transition", value === o.value ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink hover:border-brand/50")}
        >
          {o.label}
        </button>
      ))}
    </div>
    {error && <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-[13px] text-bad"><FiAlertCircle aria-hidden="true" /> {error}</p>}
  </fieldset>
);

export const Checkbox = ({ checked, onChange, children, error }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; error?: string | null }) => (
  <div>
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-4">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-5 w-5 flex-none accent-[#3959A5]" />
      <span className="text-[15px] leading-relaxed text-ink-soft">{children}</span>
    </label>
    {error && <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-[13px] text-bad"><FiAlertCircle aria-hidden="true" /> {error}</p>}
  </div>
);

/* ---------------- Feedback ---------------- */
export const Alert = ({ tone = "info", title, children }: { tone?: "info" | "error" | "success" | "warning"; title?: ReactNode; children?: ReactNode }) => {
  const s = {
    info: "border-brand/25 bg-subtle text-ink-soft",
    error: "border-bad/30 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200",
    success: "border-good/30 bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-200",
    warning: "border-amber-400/40 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  }[tone];
  const Icon = tone === "success" ? FiCheckCircle : tone === "info" ? FiInfo : FiAlertCircle;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("flex gap-3 rounded-xl border p-3.5 text-sm", s)}>
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none" />
      <div className="min-w-0">
        {title && <p className="m-0 font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5" : ""}>{children}</div>}
      </div>
    </div>
  );
};

export const Badge = ({ tone = "neutral", children }: { tone?: "neutral" | "good" | "bad" | "warn" | "brand"; children: ReactNode }) => (
  <span
    className={cx(
      "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold",
      tone === "good" && "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
      tone === "bad" && "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
      tone === "warn" && "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
      tone === "brand" && "bg-subtle text-brand-text",
      tone === "neutral" && "bg-surface-2 text-ink-muted",
    )}
  >
    {children}
  </span>
);

/* ---------------- Modal ---------------- */
export const Modal = ({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode }) => {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-pop sm:max-w-md sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="m-0 font-display text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full text-ink-muted hover:bg-surface-2"><FiX /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex gap-2 border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
};

/* ---------------- Brand ---------------- */
export const Logo = ({ className = "h-10" }: { className?: string }) => <img src={logo} alt="Prof Bioresearch" className={cx("w-auto object-contain", className)} />;

export const ThemeToggle = ({ className }: { className?: string }) => {
  const { theme, toggle } = useTheme();
  return (
    <button type="button" onClick={toggle} aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"} className={cx("flex h-10 w-10 items-center justify-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink", className)}>
      {theme === "dark" ? <FiSun aria-hidden="true" /> : <FiMoon aria-hidden="true" />}
    </button>
  );
};

export const PasswordToggle = ({ shown, onToggle }: { shown: boolean; onToggle: () => void }) => (
  <button type="button" onClick={onToggle} className="h-10 rounded-lg px-3 text-sm font-medium text-brand-text hover:bg-subtle" aria-pressed={shown}>
    {shown ? "Hide" : "Show"}
  </button>
);

export { cx };
