import { useEffect, useRef, useState } from "react";
import { FiShoppingCart, FiTag, FiTrash2, FiX } from "react-icons/fi";
import Button from "../../../ui/Button";
import { useConfirm } from "../../../ui/ConfirmDialog";
import { ugx } from "../../../ui/Page";
import { AmountInput, QuantityInput } from "./NumberInputs";

export type CartLine = {
  key: string;
  name: string;
  price: number;
  quantity: number;
  discount: number;
  total: number;
  unitAbr?: string;
  /** Stock on hand in this store, if known. */
  available?: number;
};

type CartPanelProps = {
  title?: string;
  lines: CartLine[];
  total: number;
  onQuantity: (key: string, quantity: number) => void;
  onDiscount: (key: string, discount: number) => void;
  onRemove: (key: string) => void;
  onClear: () => void;
  onCheckout: () => void;
  decimals?: boolean;
  /** Close button for the phone sheet. */
  onClose?: () => void;
};

/** The till: lines with typeable quantity, optional discount, totals and Checkout. */
const CartPanel = ({ title = "Current sale", lines, total, onQuantity, onDiscount, onRemove, onClear, onCheckout, decimals, onClose }: CartPanelProps) => {
  const confirm = useConfirm();
  const listRef = useRef<HTMLUListElement>(null);
  const [discountOpen, setDiscountOpen] = useState<string | null>(null);
  const count = lines.reduce((a, l) => a + l.quantity, 0);
  const discounts = lines.reduce((a, l) => a + (l.discount || 0), 0);
  const prevLen = useRef(lines.length);

  // Scroll to a newly added line.
  useEffect(() => {
    if (lines.length > prevLen.current) listRef.current?.lastElementChild?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    prevLen.current = lines.length;
  }, [lines.length]);

  const clear = async () => {
    if (await confirm({ title: "Clear this sale?", message: `All ${lines.length} ${lines.length === 1 ? "item" : "items"} will be removed from the cart.`, tone: "danger", confirmLabel: "Clear cart" })) onClear();
  };

  return (
    <section aria-label={title} className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex flex-none items-center gap-2 border-b border-line px-4 py-3">
        <FiShoppingCart aria-hidden="true" className="h-5 w-5 text-brand-text" />
        <h2 className="m-0 font-display text-base font-semibold text-brand-ink">{title}</h2>
        {lines.length > 0 && <span className="rounded-full bg-subtle px-2 py-0.5 text-xs font-semibold text-brand-text">{lines.length}</span>}
        <div className="ml-auto flex items-center gap-1">
          {lines.length > 0 && (
            <button type="button" onClick={clear} className="rounded-md px-2 py-1 text-xs font-medium text-[#B42318] hover:bg-[#FDECEA] dark:text-[#F2A29A] dark:hover:bg-[#381B19]">
              Clear
            </button>
          )}
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Close cart" className="flex h-9 w-9 items-center justify-center rounded-md text-brand-muted hover:bg-surface-2">
              <FiX aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {lines.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
          <span aria-hidden="true" className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-subtle text-brand-text">
            <FiShoppingCart className="h-5 w-5" />
          </span>
          <p className="m-0 font-medium text-brand-ink">No items yet</p>
          <p className="m-0 mt-1 text-sm text-brand-muted">Tap a product, or scan a barcode, to add it.</p>
        </div>
      ) : (
        <ul ref={listRef} className="m-0 min-h-0 flex-1 list-none divide-y divide-line overflow-y-auto p-0">
          {lines.map((l) => {
            const over = l.available !== undefined && l.quantity > l.available;
            return (
              <li key={l.key} className="px-4 py-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="m-0 font-medium leading-snug text-brand-ink">{l.name}</p>
                    <p className="m-0 text-xs text-brand-muted">
                      {ugx(l.price)}
                      {l.unitAbr ? ` / ${l.unitAbr}` : " each"}
                    </p>
                  </div>
                  <button type="button" onClick={() => onRemove(l.key)} aria-label={`Remove ${l.name}`} className="-mr-1 -mt-1 flex h-9 w-9 flex-none items-center justify-center rounded-md text-brand-muted hover:bg-[#FDECEA] hover:text-[#B42318] dark:hover:bg-[#381B19]">
                    <FiTrash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <QuantityInput
                    label={`Quantity of ${l.name}`}
                    value={l.quantity}
                    max={l.available}
                    decimals={decimals}
                    onChange={(q) => onQuantity(l.key, q)}
                    onBelowMin={() => onRemove(l.key)}
                  />
                  <button
                    type="button"
                    aria-expanded={discountOpen === l.key || l.discount > 0}
                    onClick={() => setDiscountOpen(discountOpen === l.key ? null : l.key)}
                    className={`flex h-10 items-center gap-1 rounded-lg px-2 text-xs font-medium ${l.discount > 0 ? "text-[#B42318] dark:text-[#F2A29A]" : "text-brand-muted hover:bg-surface-2 hover:text-brand-ink"}`}
                  >
                    <FiTag aria-hidden="true" className="h-3.5 w-3.5" />
                    {l.discount > 0 ? `−${l.discount.toLocaleString("en-UG")}` : "Discount"}
                  </button>
                  <span className="ml-auto whitespace-nowrap text-right font-semibold tabular-nums text-brand-ink">{ugx(l.total)}</span>
                </div>
                {over && (
                  <p className="m-0 mt-1.5 text-xs font-medium text-[#93600A] dark:text-[#F0CF85]">
                    Only {l.available} {l.unitAbr ?? ""} in stock here.
                  </p>
                )}
                {(discountOpen === l.key || l.discount > 0) && (
                  <div className="mt-2">
                    <AmountInput size="sm" label={`Discount on ${l.name}`} value={l.discount} max={l.price * l.quantity} onChange={(d) => onDiscount(l.key, d)} placeholder="Discount" />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex-none space-y-3 border-t border-line bg-surface-2 px-4 py-4">
        <dl className="m-0 space-y-1 text-sm">
          <div className="flex justify-between text-brand-muted">
            <dt>Items</dt>
            <dd className="m-0 tabular-nums">{count.toLocaleString("en-UG")}</dd>
          </div>
          {discounts > 0 && (
            <div className="flex justify-between text-brand-muted">
              <dt>Discounts</dt>
              <dd className="m-0 tabular-nums">−{ugx(discounts)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between pt-1">
            <dt className="font-medium text-brand-ink">Total</dt>
            <dd className="m-0 font-display text-2xl font-semibold tabular-nums text-brand-ink">{ugx(total)}</dd>
          </div>
        </dl>
        <Button className="w-full" onClick={onCheckout} disabled={lines.length === 0}>
          Checkout
        </Button>
      </div>
    </section>
  );
};

export default CartPanel;
