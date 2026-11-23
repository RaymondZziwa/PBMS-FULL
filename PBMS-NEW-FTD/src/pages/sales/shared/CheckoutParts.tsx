import type { ReactNode } from "react";
import { FiUserPlus } from "react-icons/fi";
import Combobox from "../../../ui/Combobox";
import { Badge, ugx } from "../../../ui/Page";
import type { ICartItem, IClient } from "../../../redux/types/sales";

export type PaymentStatus = "FULLY_PAID" | "PARTIALLY_PAID" | "UNPAID";

/** Searchable customer list with a "New" button beside it. */
export const CustomerPicker = ({ clients, value, onChange, onNew, error }: { clients: IClient[]; value: string; onChange: (id: string) => void; onNew: () => void; error?: string | null }) => (
  <div className="flex items-end gap-2">
    <Combobox
      label="Customer"
      required
      className="min-w-0 flex-1"
      value={value}
      onChange={onChange}
      error={error}
      options={(clients ?? []).map((c) => ({ value: String(c.id), label: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Unnamed", hint: c.phone || undefined }))}
      placeholder="Search name or phone"
      searchPlaceholder="Name or phone number"
      emptyText="No customer found. Add them with New."
    />
    <button
      type="button"
      onClick={onNew}
      className={`flex h-11 flex-none items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-brand-text hover:bg-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${error ? "mb-[22px]" : ""}`}
    >
      <FiUserPlus aria-hidden="true" /> New
    </button>
  </div>
);

const STATUSES: { value: PaymentStatus; label: string; hint: string }[] = [
  { value: "FULLY_PAID", label: "Paid in full", hint: "Customer pays everything now" },
  { value: "PARTIALLY_PAID", label: "Part payment", hint: "Pays some now, owes the rest" },
  { value: "UNPAID", label: "On credit", hint: "Pays later" },
];

export const PaymentStatusPicker = ({ value, onChange }: { value: PaymentStatus; onChange: (v: PaymentStatus) => void }) => (
  <fieldset className="m-0 border-0 p-0">
    <legend className="mb-1.5 text-[13px] font-medium text-ink-soft">Payment</legend>
    <div role="radiogroup" className="grid grid-cols-3 gap-2">
      {STATUSES.map((s) => {
        const on = value === s.value;
        return (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(s.value)}
            className={`flex flex-col items-start rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
              on ? "border-brand bg-subtle" : "border-line bg-surface hover:bg-surface-2"
            }`}
          >
            <span className={`text-sm font-semibold ${on ? "text-brand-text" : "text-brand-ink"}`}>{s.label}</span>
            <span className="mt-0.5 hidden text-[11px] leading-tight text-brand-muted sm:block">{s.hint}</span>
          </button>
        );
      })}
    </div>
  </fieldset>
);

/** Right-hand summary: lines, then totals rows passed in. */
export const OrderSummary = ({ cart, children }: { cart: ICartItem[]; children: ReactNode }) => (
  <section aria-label="Order summary" className="flex h-full flex-col rounded-xl border border-line bg-surface-2">
    <h3 className="m-0 border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-wider text-brand-muted">
      Order · {cart.length} {cart.length === 1 ? "line" : "lines"}
    </h3>
    <ul className="m-0 max-h-[280px] list-none divide-y divide-line overflow-y-auto p-0">
      {cart.map((item) => (
        <li key={`${item.id}-${item.unitId ?? ""}`} className="flex items-start gap-3 px-4 py-2.5 text-sm">
          <span className="min-w-[2.5rem] rounded-md bg-surface px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums text-ink-soft">{Number(item.quantity).toLocaleString("en-UG")}×</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-brand-ink">{item.name}</span>
            <span className="block text-xs text-brand-muted">
              {ugx(item.price)} each{item.discount > 0 && <span className="text-[#B42318] dark:text-[#F2A29A]"> · −{ugx(item.discount)}</span>}
            </span>
          </span>
          <span className="font-medium tabular-nums text-brand-ink">{ugx(item.total)}</span>
        </li>
      ))}
    </ul>
    <dl className="m-0 mt-auto space-y-1.5 border-t border-line px-4 py-3 text-sm">{children}</dl>
  </section>
);

export const SummaryRow = ({ label, value, strong, tone }: { label: ReactNode; value: ReactNode; strong?: boolean; tone?: "good" | "warn" }) => (
  <div className={`flex items-baseline justify-between gap-3 ${strong ? "pt-1" : ""}`}>
    <dt className={strong ? "font-medium text-brand-ink" : "text-brand-muted"}>{label}</dt>
    <dd
      className={`m-0 tabular-nums ${strong ? "font-display text-xl font-semibold" : "font-medium"} ${
        tone === "good" ? "text-[#1E7B43] dark:text-[#8FD6A8]" : tone === "warn" ? "text-[#B54708] dark:text-[#F0CF85]" : "text-brand-ink"
      }`}
    >
      {value}
    </dd>
  </div>
);

/** Paid / Part paid / Unpaid pill for a sale. */
export const StatusBadge = ({ status }: { status: string }) =>
  status === "FULLY_PAID" ? <Badge tone="good">Paid</Badge> : status === "PARTIALLY_PAID" ? <Badge tone="warn">Part paid</Badge> : <Badge tone="bad">Unpaid</Badge>;
