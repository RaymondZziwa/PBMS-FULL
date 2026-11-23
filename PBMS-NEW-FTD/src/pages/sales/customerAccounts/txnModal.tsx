import { useMemo, useState } from "react";
import { FiArrowDownLeft, FiArrowUpRight, FiList } from "react-icons/fi";
import Modal from "../../../ui/Modal";
import Button from "../../../ui/Button";
import { Badge, EmptyState, ugx } from "../../../ui/Page";
import { accountName, type ClientAccount } from "./types";

type Props = { visible: boolean; clientAccount: ClientAccount | null; onClose: () => void };

const fmt = (d: string) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const LABEL: Record<string, string> = { DEPOSIT: "Deposit", WITHDRAWAL: "Withdrawal", PURCHASE: "Purchase", REFUND: "Refund" };
const IN = new Set(["DEPOSIT", "REFUND"]);

/** Every deposit and purchase on a prepaid account, newest first. */
const TransactionsModal = ({ visible, clientAccount, onClose }: Props) => {
  const [type, setType] = useState("all");
  const txns = useMemo(
    () => [...(clientAccount?.PatientAccountTransaction ?? [])].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
    [clientAccount],
  );
  const shown = txns.filter((t) => type === "all" || t.type === type);
  const sum = (k: string) => txns.filter((t) => t.type === k).reduce((a, t) => a + Number(t.amount || 0), 0);

  return (
    <Modal
      open={visible && !!clientAccount}
      onClose={onClose}
      size="lg"
      title="Account history"
      description={clientAccount ? `${accountName(clientAccount)} · balance ${ugx(clientAccount.balance)}` : undefined}
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      <div className="mb-4 grid grid-cols-3 gap-2">
        {[
          ["Deposited", sum("DEPOSIT")],
          ["Spent", sum("PURCHASE") + sum("WITHDRAWAL")],
          ["Transactions", txns.length],
        ].map(([l, v]) => (
          <div key={l as string} className="rounded-xl border border-line bg-surface-2 px-3 py-2.5">
            <p className="m-0 text-xs text-brand-muted">{l}</p>
            <p className="m-0 font-display font-semibold tabular-nums text-brand-ink">{l === "Transactions" ? v : ugx(v as number)}</p>
          </div>
        ))}
      </div>
      <div role="tablist" aria-label="Type" className="mb-3 inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
        {["all", "DEPOSIT", "PURCHASE"].map((t) => (
          <button key={t} type="button" role="tab" aria-selected={type === t} onClick={() => setType(t)} className={`h-9 rounded-md px-3 text-[13px] font-medium ${type === t ? "bg-surface text-brand-ink shadow-card" : "text-brand-muted"}`}>
            {t === "all" ? "All" : `${LABEL[t]}s`}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <EmptyState icon={<FiList className="h-5 w-5" />} title="Nothing here yet" />
      ) : (
        <ul className="m-0 list-none divide-y divide-line rounded-lg border border-line p-0">
          {shown.map((t) => {
            const incoming = IN.has(t.type);
            return (
              <li key={t.id} className="flex items-center gap-3 px-3 py-3 text-sm">
                <span aria-hidden="true" className={`flex h-9 w-9 flex-none items-center justify-center rounded-full ${incoming ? "bg-[#E7F6EC] text-[#1E7B43] dark:bg-[#15301F] dark:text-[#8FD6A8]" : "bg-subtle text-brand-text"}`}>
                  {incoming ? <FiArrowDownLeft /> : <FiArrowUpRight />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="m-0 flex items-center gap-2 text-brand-ink">
                    <Badge tone={incoming ? "good" : "brand"}>{LABEL[t.type] ?? t.type}</Badge>
                    <span className="truncate text-ink-soft">{t.notes || ""}</span>
                  </p>
                  <p className="m-0 mt-0.5 text-xs text-brand-muted">{fmt(t.createdAt)}</p>
                </div>
                <span className={`font-semibold tabular-nums ${incoming ? "text-[#1E7B43] dark:text-[#8FD6A8]" : "text-brand-ink"}`}>
                  {incoming ? "+" : "−"}
                  {ugx(t.amount)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
};

export default TransactionsModal;
