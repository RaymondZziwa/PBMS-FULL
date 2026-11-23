import { useNavigate } from "react-router-dom";
import { FiCheck, FiMapPin } from "react-icons/fi";
import Modal from "../../../ui/Modal";
import { EmptyState } from "../../../ui/Page";

type StoreLike = { id: number | string; name: string; branch?: { name?: string } | null };

type StorePickerProps = {
  open: boolean;
  stores: StoreLike[];
  currentId?: number | string | null;
  onPick: (store: StoreLike) => void;
  /** Close without picking. If nothing is chosen yet, this leaves the till. */
  onClose?: () => void;
};

/** Choose which store this till sells from (only stores the person is assigned to). */
const StorePicker = ({ open, stores, currentId, onPick, onClose }: StorePickerProps) => {
  const navigate = useNavigate();
  const close = onClose ?? (() => navigate("/dashboard"));
  return (
    <Modal open={open} onClose={close} size="sm" title="Which store are you selling from?" description="Stock and sales are recorded against this store.">
      {stores.length === 0 ? (
        <EmptyState icon={<FiMapPin className="h-5 w-5" />} title="No stores assigned to you" message="Ask an administrator to add you to a store's personnel." />
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {stores.map((s) => {
            const on = String(s.id) === String(currentId ?? "");
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onPick(s)}
                  data-autofocus={on || undefined}
                  className={`flex min-h-[56px] w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
                    on ? "border-brand bg-subtle" : "border-line bg-surface hover:border-brand/60 hover:bg-surface-2"
                  }`}
                >
                  <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-subtle text-brand-text">
                    <FiMapPin />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-brand-ink">{s.name}</span>
                    {s.branch?.name && <span className="block truncate text-xs text-brand-muted">{s.branch.name}</span>}
                  </span>
                  {on && <FiCheck aria-hidden="true" className="h-5 w-5 text-brand-text" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
};

export default StorePicker;
