import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md";
  loading?: boolean;
  icon?: ReactNode;
};

const VARIANT: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark disabled:bg-brand/50",
  secondary: "border border-line bg-surface text-brand-ink hover:bg-surface-2",
  ghost: "text-brand-text hover:bg-subtle",
  danger: "bg-[#C0362C] text-white hover:bg-[#A42D24] disabled:bg-[#C0362C]/50",
};

const Spinner = () => (
  <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
);

/** The one button style for new screens. `loading` disables it and shows a spinner. */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading = false, icon, children, className = "", disabled, type = "button", ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex flex-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed ${
        size === "sm" ? "h-9 px-3 text-[13px]" : "h-11 px-4 text-sm"
      } ${VARIANT[variant]} ${className}`}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

export default Button;
