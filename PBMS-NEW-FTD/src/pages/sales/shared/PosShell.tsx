import { useState, type ReactNode } from "react";
import { FiShoppingCart } from "react-icons/fi";
import { ugx } from "../../../ui/Page";

type PosShellProps = {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  catalog: ReactNode;
  /** Render the cart; `close` is given on phones, where it opens as a sheet. */
  cart: (close?: () => void) => ReactNode;
  cartCount: number;
  cartTotal: number;
};

/**
 * Till layout: products on the left, the sale on the right (fixed 380px).
 * On phones and small tablets the cart is a bar at the bottom that opens as a sheet.
 */
const PosShell = ({ title, subtitle, actions, catalog, cart, cartCount, cartTotal }: PosShellProps) => {
  const [sheet, setSheet] = useState(false);
  return (
    // Fill the space under the top bar (64px) minus the page padding.
    <div className="-m-3 flex h-[calc(100dvh-64px)] flex-col font-inter sm:-m-4 lg:-m-6">
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4 lg:p-5">
          <div className="mb-3 flex flex-none flex-wrap items-center gap-x-3 gap-y-2">
            <div className="min-w-0">
              <h1 className="m-0 font-display text-xl font-semibold tracking-tight text-brand-ink">{title}</h1>
              {subtitle && <p className="m-0 text-xs text-brand-muted">{subtitle}</p>}
            </div>
            {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
          </div>
          <div className="min-h-0 flex-1">{catalog}</div>
        </div>
        <aside className="hidden w-[380px] flex-none border-l border-line lg:flex lg:flex-col">{cart()}</aside>
      </div>

      {/* Phones / tablets: cart bar + sheet */}
      <div className="flex-none border-t border-line bg-surface p-2 lg:hidden">
        <button type="button" onClick={() => setSheet(true)} className="flex h-12 w-full items-center gap-3 rounded-lg bg-brand px-4 text-white">
          <FiShoppingCart aria-hidden="true" />
          <span className="text-sm font-medium">
            {cartCount} {cartCount === 1 ? "item" : "items"}
          </span>
          <span className="ml-auto font-display font-semibold tabular-nums">{ugx(cartTotal)}</span>
        </button>
      </div>
      {sheet && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end lg:hidden">
          <div aria-hidden="true" className="absolute inset-0 bg-[rgb(8_12_22/0.55)]" onClick={() => setSheet(false)} />
          <div role="dialog" aria-modal="true" aria-label="Cart" className="relative flex max-h-[88dvh] min-h-[50dvh] flex-col overflow-hidden rounded-t-2xl shadow-pop">
            {cart(() => setSheet(false))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PosShell;
