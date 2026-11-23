import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { FiAlertTriangle, FiHelpCircle } from "react-icons/fi";
import Modal from "./Modal";
import Button from "./Button";

export type ConfirmOptions = {
  title: string;
  message?: ReactNode;
  /** Extra lines such as "what changes" — shown in a box under the message. */
  details?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger = red button (deletes, irreversible). */
  tone?: "danger" | "primary";
  /**
   * Run the action from inside the dialog: it stays open with a spinner until
   * this resolves, and closes only on success (errors keep it open).
   */
  onConfirm?: () => Promise<unknown> | unknown;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Replaces window.confirm / alert. Usage:
 *   const confirm = useConfirm();
 *   if (await confirm({ title: "Delete payroll?", tone: "danger", onConfirm: () => api.delete(id) })) ...
 */
export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [busy, setBusy] = useState(false);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((next) => {
    resolver.current?.(false);
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const finish = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
    setBusy(false);
  };

  const accept = async () => {
    if (!options?.onConfirm) return finish(true);
    setBusy(true);
    try {
      await options.onConfirm();
      finish(true);
    } catch {
      // the request already showed its error; let the person retry or cancel
      setBusy(false);
    }
  };

  const danger = options?.tone === "danger";
  const Icon = danger ? FiAlertTriangle : FiHelpCircle;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!options}
        onClose={() => finish(false)}
        locked={busy}
        size="sm"
        role="alertdialog"
        title={
          <span className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={`flex h-9 w-9 flex-none items-center justify-center rounded-full ${
                danger ? "bg-[#FDECEA] text-[#B42318]" : "bg-subtle text-brand-text"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
            </span>
            {options?.title}
          </span>
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => finish(false)} disabled={busy}>
              {options?.cancelLabel ?? "Cancel"}
            </Button>
            <Button variant={danger ? "danger" : "primary"} onClick={accept} loading={busy} data-autofocus>
              {options?.confirmLabel ?? (danger ? "Delete" : "Confirm")}
            </Button>
          </>
        }
      >
        {options?.message && <div className="text-sm leading-relaxed text-ink-soft">{options.message}</div>}
        {options?.details && (
          <div className="mt-3 rounded-lg border border-line bg-surface-2 px-3.5 py-3 text-sm text-ink-soft">{options.details}</div>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = (): ConfirmFn => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx;
};
