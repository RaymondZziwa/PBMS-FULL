import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { FiMinus, FiPlus } from "react-icons/fi";

const clean = (v: string, decimals: boolean) => {
  let s = v.replace(decimals ? /[^\d.]/g : /[^\d]/g, "");
  if (decimals) {
    const [a, ...rest] = s.split(".");
    s = rest.length ? `${a}.${rest.join("").slice(0, 3)}` : a;
  }
  return s;
};

type QuantityInputProps = {
  value: number;
  onChange: (value: number) => void;
  /** Called when − is pressed at the minimum (e.g. remove from cart). */
  onBelowMin?: () => void;
  min?: number;
  /** Stock on hand: typing more shows a warning but is allowed to submit (the server decides). */
  max?: number;
  /** Allow 1.5 (kg, litres...). */
  decimals?: boolean;
  label: string;
  size?: "sm" | "md";
};

/**
 * Quantity you can type into (for big numbers) or step with − / +.
 * The box can be emptied while typing; the value is saved on every valid
 * keystroke and tidied up when you leave the box or press Enter.
 */
export const QuantityInput = ({ value, onChange, onBelowMin, min = 1, max, decimals = false, label, size = "md" }: QuantityInputProps) => {
  const [draft, setDraft] = useState(String(value));
  const focused = useRef(false);

  // Follow outside changes (−/+ buttons, a scan adding one more) unless the person is typing.
  useEffect(() => {
    if (!focused.current) setDraft(String(value));
  }, [value]);

  const commit = () => {
    const n = Number(draft);
    if (!draft || !Number.isFinite(n) || n < min) {
      setDraft(String(value));
      return;
    }
    if (n !== value) onChange(n);
    setDraft(String(n));
  };

  const step = (by: number) => {
    const next = Math.round((value + by) * 1000) / 1000;
    if (next < min) {
      onBelowMin?.();
      return;
    }
    onChange(next);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      step(-1);
    } else if (e.key === "Escape") {
      setDraft(String(value));
      (e.target as HTMLInputElement).blur();
    }
  };

  const over = max !== undefined && value > max;
  const h = size === "sm" ? "h-9" : "h-10";
  const btn = `flex ${h} w-9 flex-none items-center justify-center text-brand-muted transition-colors hover:bg-subtle hover:text-brand-text focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand disabled:opacity-40`;

  return (
    <div className={`inline-flex items-stretch overflow-hidden rounded-lg border bg-surface ${over ? "border-[#E8A33D]" : "border-line"}`}>
      <button type="button" aria-label={`Less ${label}`} onClick={() => step(-1)} className={btn}>
        <FiMinus aria-hidden="true" className="h-4 w-4" />
      </button>
      <input
        aria-label={label}
        inputMode={decimals ? "decimal" : "numeric"}
        value={draft}
        onFocus={(e) => {
          focused.current = true;
          e.target.select();
        }}
        onBlur={() => {
          focused.current = false;
          commit();
        }}
        onChange={(e) => {
          const v = clean(e.target.value, decimals);
          setDraft(v);
          const n = Number(v);
          if (v && Number.isFinite(n) && n >= min && !v.endsWith(".")) onChange(n);
        }}
        onKeyDown={onKey}
        className={`themed ${h} w-16 min-w-0 border-x border-line bg-transparent px-1 text-center text-[15px] font-semibold tabular-nums text-brand-ink outline-none focus:bg-subtle`}
      />
      <button type="button" aria-label={`More ${label}`} onClick={() => step(1)} className={btn}>
        <FiPlus aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
};

type AmountInputProps = {
  value: number;
  onChange: (value: number) => void;
  label: string;
  max?: number;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  placeholder?: string;
};

/** Shilling amount with commas while typing ("1,250,000"). Empty counts as 0. */
export const AmountInput = ({ value, onChange, label, max, disabled, className = "", size = "md", placeholder = "0" }: AmountInputProps) => {
  const h = size === "sm" ? "h-9 text-sm" : size === "lg" ? "h-12 text-lg font-semibold" : "h-10 text-[15px]";
  return (
    <div className={`relative ${className}`}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[11px] font-semibold text-brand-muted">
        UGX
      </span>
      <input
        aria-label={label}
        inputMode="numeric"
        disabled={disabled}
        placeholder={placeholder}
        value={value ? value.toLocaleString("en-UG") : ""}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          let n = Number(e.target.value.replace(/[^\d]/g, "").slice(0, 13) || 0);
          if (max !== undefined && n > max) n = max;
          onChange(n);
        }}
        className={`themed ${h} w-full rounded-lg border border-line bg-surface pl-11 pr-3 text-right tabular-nums text-brand-ink outline-none transition-[border-color,box-shadow] placeholder:text-brand-muted/60 focus:border-brand focus:shadow-[0_0_0_3px_rgb(57_89_165/0.18)] disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-soft`}
      />
    </div>
  );
};
