import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../../../libs/apiConfig";
import { SALESENDPOINTS } from "../../../endpoints/sales/salesEndpoints";
import Modal from "../../../ui/Modal";
import Button from "../../../ui/Button";
import { TextField } from "../../../ui/Field";
import { ugx } from "../../../ui/Page";
import { AmountInput } from "../shared/NumberInputs";
import { accountName, type ClientAccount } from "./types";

type Props = { visible: boolean; clientAccount: ClientAccount | null; onCancel: () => void; onSuccess: () => void };

const QUICK = [10000, 20000, 50000, 100000, 200000, 500000];

/** Put money on a customer's prepaid account. */
const DepositModal = ({ visible, clientAccount, onCancel, onSuccess }: Props) => {
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setAmount(0);
      setNotes("");
      setError(null);
    }
  }, [visible]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!clientAccount) return;
    if (!amount || amount <= 0) {
      setError("Enter how much they are depositing");
      return;
    }
    setSaving(true);
    try {
      await apiRequest(SALESENDPOINTS.CLIENT_ACCOUNTS.deposit, "POST", "", { accId: clientAccount.id, amount, notes });
      onSuccess();
    } catch {
      // apiRequest showed the reason
    } finally {
      setSaving(false);
    }
  };

  const balance = Number(clientAccount?.balance ?? 0);

  return (
    <Modal
      open={visible && !!clientAccount}
      onClose={onCancel}
      locked={saving}
      size="md"
      title="Deposit"
      description={clientAccount ? `${accountName(clientAccount)}${clientAccount.accountNumber ? ` · ${clientAccount.accountNumber}` : ""}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button type="submit" form="deposit-form" loading={saving} disabled={amount <= 0}>
            Deposit {amount > 0 ? ugx(amount) : ""}
          </Button>
        </>
      }
    >
      <form id="deposit-form" onSubmit={submit} noValidate className="space-y-4">
        <div>
          <p className="m-0 mb-1.5 text-[13px] font-medium text-ink-soft">Amount</p>
          <AmountInput size="lg" label="Deposit amount" value={amount} onChange={(v) => { setAmount(v); setError(null); }} />
          {error && <p role="alert" className="m-0 mt-1.5 text-xs font-medium text-[#B42318] dark:text-[#F2A29A]">{error}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK.map((q) => (
              <button key={q} type="button" onClick={() => { setAmount(q); setError(null); }} className={`h-8 rounded-full border px-3 text-xs font-medium tabular-nums ${amount === q ? "border-brand bg-subtle text-brand-text" : "border-line bg-surface text-ink-soft hover:border-brand"}`}>
                {q.toLocaleString("en-UG")}
              </button>
            ))}
          </div>
        </div>
        <TextField label="Notes" value={notes} onChange={setNotes} placeholder="Optional, e.g. receipt number" />
        <div className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3 text-sm">
          <span className="text-brand-muted">Balance after deposit</span>
          <span className="font-display text-lg font-semibold tabular-nums text-brand-ink">{ugx(balance + amount)}</span>
        </div>
      </form>
    </Modal>
  );
};

export default DepositModal;
