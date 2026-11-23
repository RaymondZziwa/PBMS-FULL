import { useEffect, useState } from "react";
import { apiRequest } from "../../../libs/apiConfig";
import { BILLING_CHANNELS } from "../../../endpoints/expense/expenseEndpoints";
import type { IBillingChannel } from "../../../redux/types/systemSettings";
import { apiErrorMessage, AreaField, btn, Modal, Spinner, UTILITY_INFO, UtilityBadge, VerifiedBadge } from "./billingShared";

interface VerifyMeterModalProps {
  visible: boolean;
  channel: IBillingChannel | null;
  onClose: () => void;
  /** Called after a successful verification so the list refreshes. */
  onSuccess: () => void;
}

type Customer = {
  customerRef: string | null;
  customerName: string | null;
  area: string | null;
  customerType: string | null;
  outstandingBalance: string | null;
  lastPaymentDate: string | null;
  lastPaymentAmount: string | null;
};

const money = (v: string | null) => {
  const n = v === null ? NaN : Number(v);
  return Number.isFinite(n) ? `UGX ${n.toLocaleString("en-UG", { maximumFractionDigits: 0 })}` : "—";
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-4 py-2">
    <dt className="text-sm text-brand-muted">{label}</dt>
    <dd className="m-0 text-right text-sm font-medium text-brand-ink">{value}</dd>
  </div>
);

const VerifyMeterModal = ({ visible, channel, onClose, onSuccess }: VerifyMeterModalProps) => {
  const [area, setArea] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);

  // Fresh state for each channel opened.
  useEffect(() => {
    if (!visible) return;
    setArea(channel?.area ?? "");
    setError(null);
    setCustomer(null);
  }, [visible, channel]);

  if (!visible || !channel) return null;

  const isWater = channel.utility === "NWSC";
  const provider = isWater ? "NWSC" : "UEDCL";

  const verify = async () => {
    if (verifying) return;
    if (isWater && !area.trim()) {
      setError("Choose the NWSC area first.");
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      const res = await apiRequest<{ data: { customer: Customer } }>(
        BILLING_CHANNELS.VERIFY_CHANNEL(channel.id),
        "POST",
        isWater ? { area: area.trim() } : {}
      );
      setCustomer(res.data.customer);
      onSuccess();
    } catch (err) {
      setError(apiErrorMessage(err, `We couldn't verify this ${isWater ? "water account" : "meter"}. Please try again.`));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Modal
      title={customer ? "Meter verified" : "Verify meter"}
      subtitle={customer ? `Confirmed with ${provider}.` : `We'll check this ${isWater ? "water account" : "meter"} with ${provider} through MarzPay.`}
      onClose={onClose}
      busy={verifying}
      footer={
        customer ? (
          <button type="button" className={btn.primary} onClick={onClose}>
            Done
          </button>
        ) : (
          <>
            <button type="button" className={btn.secondary} onClick={onClose} disabled={verifying}>
              Cancel
            </button>
            <button type="button" className={btn.primary} onClick={verify} disabled={verifying}>
              {verifying && <Spinner />}
              {verifying ? `Checking with ${provider}…` : channel.isVerified ? "Verify again" : "Verify meter"}
            </button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-5">
        <dl className="m-0 rounded-xl bg-[#F6F8FC] px-4 py-2 divide-y divide-[#E9ECF3]">
          <div className="flex items-center justify-between gap-4 py-2">
            <dt className="text-sm text-brand-muted">Utility</dt>
            <dd className="m-0">
              <UtilityBadge utility={channel.utility} />
            </dd>
          </div>
          <Row label={isWater ? "Account number" : "Meter number"} value={channel.meterNumber} />
          {!customer && channel.name && <Row label="Label" value={channel.name} />}
          {!customer && (
            <div className="flex items-center justify-between gap-4 py-2">
              <dt className="text-sm text-brand-muted">Status</dt>
              <dd className="m-0">
                <VerifiedBadge verified={channel.isVerified} />
              </dd>
            </div>
          )}
        </dl>

        {!customer && isWater && <AreaField id="verify-area" value={area} onChange={setArea} invalid={!!error && !area.trim()} />}

        {error && (
          <div role="alert" className="rounded-lg border border-[#F3C9C2] bg-[#FDF0EE] px-3.5 py-2.5 text-sm text-[#8A2A1C]">
            {error}
          </div>
        )}

        {customer && (
          <section aria-labelledby="verified-heading" className="rounded-xl border border-[#CFE8DA] bg-[#F1FAF5] px-4 py-3">
            <h3 id="verified-heading" className="m-0 mb-1 flex items-center gap-2 text-sm font-semibold text-[#1F6B44]">
              <span aria-hidden="true">✓</span> Account found
            </h3>
            <dl className="m-0 divide-y divide-[#DCEFE4]">
              <Row label="Account holder" value={customer.customerName || "—"} />
              {customer.customerRef && <Row label="Customer reference" value={customer.customerRef} />}
              {customer.area && <Row label="Area" value={customer.area} />}
              {customer.customerType && <Row label="Account type" value={customer.customerType} />}
              <Row label="Outstanding balance" value={money(customer.outstandingBalance)} />
              {customer.lastPaymentDate && (
                <Row label="Last payment" value={`${customer.lastPaymentDate} · ${money(customer.lastPaymentAmount)}`} />
              )}
            </dl>
            <p className="m-0 mt-2 text-xs text-[#2E5E43]">
              The account holder's name is now saved on this channel, and it can be used for {UTILITY_INFO[channel.utility].short.toLowerCase()} payments.
            </p>
          </section>
        )}
      </div>
    </Modal>
  );
};

export default VerifyMeterModal;
