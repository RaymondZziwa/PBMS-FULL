import { useRef, useState, type ClipboardEvent, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { FiAlertCircle, FiCheck, FiCircle, FiEye, FiEyeOff, FiInfo, FiLock, FiMail, FiPhone, FiShield } from "react-icons/fi";
import logo from "../../assets/logo.png";
import type { LoginMethod } from "./authHelpers";

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

const BrandArcs = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 760 760"
    className="pointer-events-none absolute -right-[300px] -bottom-[280px] h-[760px] w-[760px]"
  >
    <circle cx="380" cy="380" r="340" fill="none" stroke="#3959A5" strokeWidth="56" strokeDasharray="1100 1200" transform="rotate(-20 380 380)" />
    <circle cx="380" cy="380" r="250" fill="none" stroke="#FFFFFF" strokeOpacity="0.07" strokeWidth="2" />
  </svg>
);

export const BrandMark = ({ size = "lg" }: { size?: "sm" | "lg" }) => (
  <div className="relative flex items-center gap-4">
    <div
      className={`flex flex-none items-center justify-center overflow-hidden rounded-full bg-white ${
        size === "lg" ? "h-16 w-16" : "h-12 w-12"
      }`}
    >
      <img src={logo} alt="Prof Bioresearch logo" className="h-[94%] w-[94%] object-contain" />
    </div>
    <div className="flex flex-col gap-0.5">
      <span className={`font-display font-bold tracking-wide ${size === "lg" ? "text-lg" : "text-[15px]"}`}>
        PROF BIORESEARCH
      </span>
      <span className="text-sm italic text-[#C3CDE8]">Ignite Wisdom</span>
    </div>
  </div>
);

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  /** Extra content under the subtitle on wide screens (e.g. module chips). */
  asideExtra?: ReactNode;
  children: ReactNode;
};

/** Navy brand panel + form column. Stacks on phones. */
export const AuthLayout = ({ title, subtitle, asideExtra, children }: AuthLayoutProps) => (
  <div className="flex min-h-screen flex-col bg-[#F5F6FA] font-inter text-brand-ink lg:flex-row">
    <aside className="relative flex flex-col justify-between gap-6 overflow-hidden bg-brand-navy px-6 pb-14 pt-10 text-white sm:px-10 lg:w-[44%] lg:max-w-[640px] lg:gap-12 lg:p-14">
      <BrandArcs />
      <BrandMark />
      <div className="relative flex max-w-[460px] flex-col gap-5">
        <h1 className="m-0 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.01em] lg:text-[44px]">
          {title}
        </h1>
        <p className="m-0 hidden text-[17px] leading-relaxed text-[#D3DAEE] sm:block">{subtitle}</p>
        {asideExtra && <div className="hidden lg:block">{asideExtra}</div>}
      </div>
      <div className="relative hidden flex-wrap justify-between gap-3 text-[13px] text-[#C3CDE8] lg:flex">
        <span>© {new Date().getFullYear()} Prof Bioresearch</span>
        <span className="flex items-center gap-1.5">
          <FiShield aria-hidden="true" className="h-3.5 w-3.5" />
          Authorised staff only
        </span>
      </div>
    </aside>

    <main className="-mt-8 flex flex-1 items-start justify-center px-4 pb-12 sm:px-6 lg:mt-0 lg:items-center lg:py-12">
      <div className="relative flex w-full max-w-[440px] flex-col gap-5">{children}</div>
    </main>
  </div>
);

export const AuthCard = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div
    className={`flex flex-col gap-6 rounded-2xl border border-[#E2E6EF] bg-white p-6 shadow-[0_1px_2px_rgba(20,24,31,0.04),0_8px_24px_rgba(20,24,31,0.06)] sm:p-10 ${className}`}
  >
    {children}
  </div>
);

export const CardHeading = ({ title, children }: { title: string; children?: ReactNode }) => (
  <div className="flex flex-col gap-2">
    <h2 className="m-0 font-display text-[26px] font-semibold text-brand-ink sm:text-[30px]">{title}</h2>
    {children && <p className="m-0 text-[15px] leading-relaxed text-brand-muted">{children}</p>}
  </div>
);

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

type MethodToggleProps = {
  value: LoginMethod;
  onChange: (method: LoginMethod) => void;
  label: string;
  phoneLabel?: string;
};

export const MethodToggle = ({ value, onChange, label, phoneLabel = "Phone" }: MethodToggleProps) => {
  const options: { id: LoginMethod; text: string; icon: ReactNode }[] = [
    { id: "email", text: "Email", icon: <FiMail aria-hidden="true" className="h-4 w-4" /> },
    { id: "phone", text: phoneLabel, icon: <FiPhone aria-hidden="true" className="h-4 w-4" /> },
  ];
  return (
    <div role="group" aria-label={label} className="grid grid-cols-2 gap-1 rounded-[10px] bg-[#EEF0F5] p-1">
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.id)}
            className={`flex h-10 items-center justify-center gap-2 rounded-lg text-sm transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-brand/45 ${
              active ? "bg-white font-semibold text-brand-ink shadow-[0_1px_3px_rgba(20,24,31,0.12)]" : "font-medium text-brand-muted hover:text-brand-ink"
            }`}
          >
            {o.icon}
            {o.text}
          </button>
        );
      })}
    </div>
  );
};

const fieldShell =
  "flex h-12 items-center gap-2.5 rounded-[10px] border bg-white px-3.5 text-[15px] transition-shadow focus-within:border-brand focus-within:shadow-[0_0_0_3px_rgba(57,89,165,0.18)]";
const fieldInput =
  "h-full min-w-0 flex-1 border-0 bg-transparent text-brand-ink outline-none placeholder:text-[#7A8294]";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  id: string;
  label: string;
  icon?: "mail" | "phone" | "lock";
  prefix?: string;
  labelAside?: ReactNode;
  invalid?: boolean;
};

const icons = {
  mail: <FiMail aria-hidden="true" className="h-[18px] w-[18px] flex-none text-[#7A8294]" />,
  phone: <FiPhone aria-hidden="true" className="h-[18px] w-[18px] flex-none text-[#7A8294]" />,
  lock: <FiLock aria-hidden="true" className="h-[18px] w-[18px] flex-none text-[#7A8294]" />,
};

export const TextField = ({ id, label, icon, prefix, labelAside, invalid, ...input }: TextFieldProps) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-baseline justify-between gap-3">
      <label htmlFor={id} className="text-sm font-semibold text-[#2B3240]">
        {label}
      </label>
      {labelAside}
    </div>
    <div className={`${fieldShell} ${invalid ? "border-[#C4381F]" : "border-[#CDD2DD]"}`}>
      {icon && icons[icon]}
      {prefix && <span className="border-r border-[#E2E6EF] pr-2.5 font-semibold text-[#2B3240]">{prefix}</span>}
      <input id={id} aria-invalid={invalid || undefined} className={fieldInput} {...input} />
    </div>
  </div>
);

type PasswordFieldProps = Omit<TextFieldProps, "type" | "icon" | "prefix"> & { showIcon?: boolean };

export const PasswordField = ({ id, label, labelAside, invalid, showIcon = true, ...input }: PasswordFieldProps) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-[#2B3240]">
          {label}
        </label>
        {labelAside}
      </div>
      <div className={`${fieldShell} pr-1.5 ${invalid ? "border-[#C4381F]" : "border-[#CDD2DD]"}`}>
        {showIcon && icons.lock}
        <input id={id} type={visible ? "text" : "password"} aria-invalid={invalid || undefined} className={fieldInput} {...input} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-controls={id}
          className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-brand-muted hover:bg-[#EEF1F8] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-brand/45"
        >
          {visible ? <FiEyeOff aria-hidden="true" className="h-[18px] w-[18px]" /> : <FiEye aria-hidden="true" className="h-[18px] w-[18px]" />}
        </button>
      </div>
    </div>
  );
};

type PrimaryButtonProps = {
  children: ReactNode;
  loading?: boolean;
  loadingText?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
};

export const PrimaryButton = ({ children, loading, loadingText, type = "submit", onClick, disabled }: PrimaryButtonProps) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[10px] bg-brand text-base font-semibold text-white transition-colors hover:bg-brand-dark focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-brand/45 disabled:cursor-not-allowed disabled:opacity-60"
  >
    {loading ? (
      <>
        <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        {loadingText ?? "Please wait…"}
      </>
    ) : (
      children
    )}
  </button>
);

type BannerTone = "error" | "warning" | "info";

const bannerStyles: Record<BannerTone, string> = {
  error: "border-[#F3C9C2] bg-[#FDF0EE] text-[#8A2A1C]",
  warning: "border-[#F1D69C] bg-[#FFF6E5] text-[#6A4100]",
  info: "border-transparent bg-[#F1F4FB] text-[#2B3240]",
};

export const Banner = ({ tone, children }: { tone: BannerTone; children: ReactNode }) => {
  const Icon = tone === "info" ? FiShield : tone === "warning" ? FiInfo : FiAlertCircle;
  return (
    <div
      role={tone === "info" ? undefined : "alert"}
      className={`flex gap-3 rounded-[10px] border px-3.5 py-3 text-sm leading-normal ${bannerStyles[tone]}`}
    >
      <Icon aria-hidden="true" className={`mt-0.5 h-[18px] w-[18px] flex-none ${tone === "info" ? "text-brand" : ""}`} />
      <span>{children}</span>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Reset-flow pieces                                                   */
/* ------------------------------------------------------------------ */

const STEPS = ["Request", "Verify", "New password"];

export const StepIndicator = ({ current }: { current: 1 | 2 | 3 }) => (
  <ol aria-label="Progress" className="m-0 flex list-none items-center gap-2 p-0 text-[13px] text-brand-muted">
    {STEPS.map((step, i) => {
      const n = i + 1;
      const done = n < current;
      const active = n === current;
      return (
        <li key={step} className={`flex items-center gap-2 ${i < STEPS.length - 1 ? "flex-1" : ""}`}>
          <span
            aria-current={active ? "step" : undefined}
            className={`flex items-center gap-2 whitespace-nowrap ${active ? "font-semibold text-brand" : done ? "text-[#2B3240]" : ""}`}
          >
            <span
              className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs ${
                active ? "bg-brand text-white" : done ? "bg-[#E3E9F6] text-brand" : "border border-[#CDD2DD]"
              }`}
            >
              {done ? <FiCheck aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} /> : n}
            </span>
            <span className={active ? "" : "hidden sm:inline"}>{step}</span>
            {done && <span className="sr-only">(done)</span>}
          </span>
          {i < STEPS.length - 1 && <span aria-hidden="true" className={`h-px flex-1 ${done ? "bg-brand" : "bg-[#E2E6EF]"}`} />}
        </li>
      );
    })}
  </ol>
);

type OtpInputProps = {
  value: string[];
  onChange: (digits: string[]) => void;
  disabled?: boolean;
  invalid?: boolean;
};

/** Six one-digit boxes: auto-advance, backspace to previous, paste a whole code. */
export const OtpInput = ({ value, onChange, disabled, invalid }: OtpInputProps) => {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const setDigit = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[index] = digit;
    onChange(next);
    if (digit && index < value.length - 1) refs.current[index + 1]?.focus();
  };

  const onKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[index] && index > 0) refs.current[index - 1]?.focus();
    if (e.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < value.length - 1) refs.current[index + 1]?.focus();
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, value.length);
    if (!digits) return;
    e.preventDefault();
    const next = value.map((_, i) => digits[i] ?? "");
    onChange(next);
    refs.current[Math.min(digits.length, value.length - 1)]?.focus();
  };

  return (
    <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
      {value.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          aria-label={`Digit ${i + 1} of ${value.length}`}
          aria-invalid={invalid || undefined}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          onFocus={(e) => e.target.select()}
          className={`h-[60px] w-full rounded-[10px] border bg-white text-center font-display text-2xl font-semibold text-brand-ink outline-none focus:border-brand focus:shadow-[0_0_0_3px_rgba(57,89,165,0.18)] disabled:opacity-60 ${
            invalid ? "border-[#C4381F]" : "border-[#CDD2DD]"
          }`}
        />
      ))}
    </div>
  );
};

export const CheckList = ({ items }: { items: { label: string; ok: boolean }[] }) => (
  <ul
    aria-label="Password rules"
    className="m-0 grid list-none grid-cols-1 gap-x-4 gap-y-2.5 rounded-[10px] bg-[#F6F7FA] px-4 py-3.5 text-[13px] sm:grid-cols-2"
  >
    {items.map((item) => (
      <li key={item.label} className={`flex items-center gap-2 ${item.ok ? "font-semibold text-[#1F7A4D]" : "text-brand-muted"}`}>
        {item.ok ? (
          <FiCheck aria-hidden="true" className="h-[15px] w-[15px]" strokeWidth={3} />
        ) : (
          <FiCircle aria-hidden="true" className="h-[15px] w-[15px]" />
        )}
        <span>{item.label}</span>
        <span className="sr-only">{item.ok ? "(met)" : "(not met yet)"}</span>
      </li>
    ))}
  </ul>
);
