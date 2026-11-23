import { useEffect, useState, type ReactNode } from "react";
import axios from "axios";
import { apiRequest } from "../../../libs/apiConfig";
import { BILLING_CHANNELS } from "../../../endpoints/expense/expenseEndpoints";
import uedclLogo from "../../../assets/uedcl.png";
import nwscLogo from "../../../assets/mwsc.png";
import type { UtilityType } from "../../../redux/types/systemSettings";

export const UTILITY_INFO: Record<UtilityType, { label: string; short: string; logo: string }> = {
  NWSC: { label: "NWSC (Water)", short: "Water", logo: nwscLogo },
  LIGHT: { label: "UEDCL (Electricity)", short: "Electricity", logo: uedclLogo },
};

/** NWSC service areas from MarzPay (cached by the server for an hour). */
export const useNwscAreas = (enabled: boolean) => {
  const [areas, setAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled || areas.length > 0) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    apiRequest<{ data?: { areas?: string[] } }>(BILLING_CHANNELS.NWSC_AREAS, "GET")
      .then((res) => {
        if (!cancelled) setAreas(res?.data?.areas ?? []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, areas.length]);

  return { areas, loading, failed };
};

/** First readable message from an API error (Nest validation errors come as a list). */
export const apiErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const msg = (error.response?.data as { message?: unknown } | undefined)?.message;
    if (Array.isArray(msg) && msg.length) return String(msg[0]);
    if (typeof msg === "string" && msg) return msg;
    if (!error.response) return "We can't reach the server. Check your connection and try again.";
  }
  return fallback;
};

export const UtilityBadge = ({ utility }: { utility: UtilityType }) => (
  <span className="inline-flex items-center gap-2">
    <img src={UTILITY_INFO[utility].logo} alt="" className="h-6 w-6 flex-none rounded object-contain" />
    <span className="text-sm text-brand-ink">{UTILITY_INFO[utility].label}</span>
  </span>
);

export const VerifiedBadge = ({ verified }: { verified: boolean }) =>
  verified ? (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#E6F3EC] px-2 py-0.5 text-xs font-semibold text-[#1F6B44]">
      <span aria-hidden="true">✓</span> Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#FFF3DC] px-2 py-0.5 text-xs font-semibold text-[#7A4B00]">
      Not verified
    </span>
  );

/** Accessible modal shell: Esc closes, click outside closes, focus moves inside. */
export const Modal = ({
  title,
  subtitle,
  onClose,
  children,
  footer,
  busy,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  busy?: boolean;
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#0B1226]/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bc-modal-title"
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white font-inter shadow-2xl sm:max-w-lg sm:rounded-2xl"
      >
        <div className="border-b border-[#EEF0F5] px-5 py-4 sm:px-6">
          <h2 id="bc-modal-title" className="m-0 font-display text-lg font-semibold text-brand-ink">
            {title}
          </h2>
          {subtitle && <p className="m-0 mt-0.5 text-sm text-brand-muted">{subtitle}</p>}
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        <div className="flex flex-col-reverse gap-2 border-t border-[#EEF0F5] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">{footer}</div>
      </div>
    </div>
  );
};

export const btn = {
  primary:
    "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60",
  secondary:
    "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#DDE1EA] bg-white px-4 text-sm font-medium text-[#2B3240] hover:bg-[#F3F5FA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-60",
  danger:
    "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#C4381F] px-4 text-sm font-semibold text-white hover:bg-[#A82E18] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C4381F] disabled:opacity-60",
};

export const Spinner = () => (
  <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
);

export const fieldClass =
  "h-11 w-full rounded-lg border border-[#CDD2DD] bg-white px-3 text-[15px] text-brand-ink outline-none placeholder:text-[#7A8294] focus:border-brand focus:shadow-[0_0_0_3px_rgba(57,89,165,0.18)] aria-[invalid=true]:border-[#C4381F]";

/** NWSC area picker: a list from MarzPay, or free text if the list can't be loaded. */
export const AreaField = ({
  id,
  value,
  onChange,
  invalid,
  required = true,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  required?: boolean;
}) => {
  const { areas, loading, failed } = useNwscAreas(true);
  const options = value && !areas.includes(value) ? [value, ...areas] : areas;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-[#2B3240]">
        NWSC area {required && <span className="text-[#C4381F]">*</span>}
      </label>
      {failed || (!loading && areas.length === 0) ? (
        <input
          id={id}
          className={fieldClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Kampala"
          aria-invalid={invalid || undefined}
          autoComplete="off"
        />
      ) : (
        <select
          id={id}
          className={fieldClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading}
          aria-invalid={invalid || undefined}
        >
          <option value="">{loading ? "Loading areas…" : "Choose an area"}</option>
          {options.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      )}
      <p className="m-0 text-xs text-brand-muted">
        {failed ? "Couldn't load the area list, so type the area instead." : "Where the water account is registered. NWSC needs this to verify it."}
      </p>
    </div>
  );
};
