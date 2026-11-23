import { useId, type InputHTMLAttributes, type ReactNode } from "react";

/** Shared look for every input-like control (text, dropdown triggers, date triggers). */
export const CONTROL =
  "themed flex h-11 w-full items-center rounded-lg border bg-surface px-3 text-left text-[14px] text-brand-ink outline-none transition-[border-color,box-shadow] placeholder:text-brand-muted/70 hover:border-[#B9C1D1] focus:border-brand focus:shadow-[0_0_0_3px_rgb(57_89_165/0.18)] focus-visible:border-brand focus-visible:shadow-[0_0_0_3px_rgb(57_89_165/0.18)] disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-70 dark:hover:border-[#465069]";

export const controlBorder = (error?: string | null) => (error ? "border-[#D92D20]" : "border-line");

type FieldShellProps = {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string | null;
  id: string;
  children: ReactNode;
  className?: string;
};

/** Label above, control, then an error or a hint below. */
export const FieldShell = ({ label, required, hint, error, id, children, className = "" }: FieldShellProps) => (
  <div className={`min-w-0 ${className}`}>
    <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium leading-none text-ink-soft">
      {label}
      {required && (
        <span aria-hidden="true" className="ml-0.5 text-[#C0362C]">
          *
        </span>
      )}
    </label>
    {children}
    {error ? (
      <p id={`${id}-msg`} role="alert" className="m-0 mt-1.5 text-xs font-medium text-[#B42318] dark:text-[#F2A29A]">
        {error}
      </p>
    ) : hint ? (
      <p id={`${id}-msg`} className="m-0 mt-1.5 text-xs leading-snug text-brand-muted">
        {hint}
      </p>
    ) : null}
  </div>
);

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "prefix"> & {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  onChange: (value: string) => void;
  /** Short text inside the box on the left, e.g. "UGX". */
  prefix?: string;
  /** Something inside the box on the right (e.g. a show-password button). */
  trailing?: ReactNode;
  className?: string;
};

export const TextField = ({ label, hint, error, onChange, prefix, trailing, className, required, id, ...rest }: TextFieldProps) => {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell label={label} required={required} hint={hint} error={error} id={fieldId} className={className}>
      <div className="relative">
        {prefix && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center border-r border-line text-xs font-semibold text-brand-muted">
            {prefix}
          </span>
        )}
        <input
          id={fieldId}
          required={required}
          aria-invalid={!!error || undefined}
          aria-describedby={error || hint ? `${fieldId}-msg` : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={`${CONTROL} ${controlBorder(error)} ${prefix ? "pl-[60px]" : ""} ${trailing ? "pr-11" : ""}`}
          {...rest}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
    </FieldShell>
  );
};

const groupDigits = (v: string) => (v ? Number(v).toLocaleString("en-UG") : "");

/** Whole-shilling amount: shows 1,250,000 while typing, gives back "1250000". */
export const MoneyField = ({ value, onChange, ...rest }: Omit<TextFieldProps, "value" | "prefix" | "inputMode"> & { value: string }) => (
  <TextField
    {...rest}
    prefix="UGX"
    inputMode="numeric"
    value={groupDigits(value)}
    onChange={(v) => onChange(v.replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "").slice(0, 13))}
  />
);

type SegmentedProps<T extends string> = {
  label: string;
  value: T | "";
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  error?: string | null;
  required?: boolean;
  className?: string;
};

/** Two to four choices side by side (e.g. Male / Female). */
export const Segmented = <T extends string>({ label, value, onChange, options, error, required, className }: SegmentedProps<T>) => {
  const id = useId();
  return (
    <FieldShell label={label} required={required} error={error} id={id} className={className}>
      <div id={id} role="radiogroup" aria-label={label} aria-invalid={!!error || undefined} className={`grid h-11 gap-1 rounded-lg border bg-surface-2 p-1 ${controlBorder(error)}`} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => {
          const on = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.value)}
              className={`rounded-md text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
                on ? "bg-surface font-semibold text-brand-text shadow-card ring-1 ring-brand/40" : "text-brand-muted hover:text-brand-ink"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </FieldShell>
  );
};

type ToggleProps = {
  label: string;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

/** On/off switch with a label and a line of help. The whole card is clickable. */
export const Toggle = ({ label, description, checked, onChange, disabled }: ToggleProps) => {
  const id = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={`${id}-l`}
      aria-describedby={description ? `${id}-d` : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-start gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50 ${
        checked ? "border-brand/40 bg-subtle" : "border-line bg-surface hover:bg-surface-2"
      }`}
    >
      <span className="min-w-0 flex-1">
        <span id={`${id}-l`} className="block text-sm font-medium text-brand-ink">
          {label}
        </span>
        {description && (
          <span id={`${id}-d`} className="mt-0.5 block text-xs leading-snug text-brand-muted">
            {description}
          </span>
        )}
      </span>
      <span aria-hidden="true" className={`relative mt-0.5 h-6 w-11 flex-none rounded-full transition-colors ${checked ? "bg-brand" : "bg-[#C4CAD6] dark:bg-[#3A4356]"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`} />
      </span>
    </button>
  );
};

/** Search box for list pages. */
export const SearchBox = ({ value, onChange, placeholder = "Search", label = "Search", className = "sm:max-w-xs" }: { value: string; onChange: (v: string) => void; placeholder?: string; label?: string; className?: string }) => (
  <div className={`relative w-full ${className}`}>
    <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" fill="currentColor">
      <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.45 4.39l3.08 3.08a.75.75 0 11-1.06 1.06l-3.08-3.08A7 7 0 012 9z" clipRule="evenodd" />
    </svg>
    <input
      type="search"
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${CONTROL} border-line pl-9`}
    />
  </div>
);
