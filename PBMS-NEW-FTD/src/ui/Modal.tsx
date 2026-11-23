import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** sm 420px, md 520px, lg 640px, xl 880px, full 1100px (always a sheet on phones) */
  size?: "sm" | "md" | "lg" | "xl" | "full";
  /** Block closing by Esc / backdrop (for example while saving). */
  locked?: boolean;
  role?: "dialog" | "alertdialog";
};

const WIDTH = { sm: "sm:max-w-[420px]", md: "sm:max-w-[520px]", lg: "sm:max-w-[640px]", xl: "sm:max-w-[880px]", full: "sm:max-w-[1100px]" };

/** Open dialogs, newest last: only the top one answers Esc and Tab. */
const openStack: string[] = [];

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Themed dialog. Esc and the backdrop close it (unless locked), focus moves in
 * on open, stays inside while open, and goes back to where it was on close.
 * On phones it opens as a bottom sheet.
 */
const Modal = ({ open, onClose, title, description, children, footer, size = "md", locked = false, role = "dialog" }: ModalProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    openStack.push(titleId);
    const isTop = () => openStack[openStack.length - 1] === titleId;
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (!isTop()) return;
      // A dropdown or calendar inside the dialog handles its own Esc.
      if (e.key === "Escape" && !locked && !e.defaultPrevented) {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab" && panel) {
        const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
        if (items.length === 0) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      const at = openStack.lastIndexOf(titleId);
      if (at >= 0) openStack.splice(at, 1);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, locked, onClose, titleId]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center font-inter sm:items-center sm:p-4">
      <div aria-hidden="true" className="absolute inset-0 bg-[rgb(8_12_22/0.55)] backdrop-blur-[2px]" onClick={() => !locked && onClose()} />
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-surface text-brand-ink shadow-pop outline-none sm:rounded-2xl ${WIDTH[size]} ${
          size === "full" ? "sm:h-[90vh]" : ""
        }`}
      >
        <div className="flex flex-none items-start gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="m-0 font-display text-lg font-semibold leading-snug text-brand-ink">
              {title}
            </h2>
            {description && (
              <p id={descId} className="m-0 mt-1 text-sm text-brand-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={locked}
            aria-label="Close"
            className="-mr-2 flex h-10 w-10 flex-none items-center justify-center rounded-lg text-brand-muted hover:bg-surface-2 hover:text-brand-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-40"
          >
            <FiX aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <div className="flex flex-none flex-col-reverse gap-2 border-t border-line bg-surface-2 px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
