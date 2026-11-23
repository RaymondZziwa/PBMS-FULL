import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../../../libs/apiConfig";
import { BILLING_CHANNELS } from "../../../endpoints/expense/expenseEndpoints";
import type { IBillingChannel, UtilityType } from "../../../redux/types/systemSettings";
import { apiErrorMessage, AreaField, btn, fieldClass, Modal, Spinner, UTILITY_INFO } from "./billingShared";

interface AddOrModifyBillingChannelProps {
  visible: boolean;
  channel: IBillingChannel | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const EMPTY = { utility: "NWSC" as UtilityType, meterNumber: "", name: "", area: "" };
const cleanMeter = (v: string) => v.replace(/[\s-]+/g, "").toUpperCase();

const AddOrModifyBillingChannel = ({ visible, channel, onCancel, onSuccess }: AddOrModifyBillingChannelProps) => {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<"meterNumber" | "area" | null>(null);
  const isEdit = !!channel;

  // Load the channel being edited (or a blank form) each time the dialog opens.
  useEffect(() => {
    if (!visible) return;
    setForm(
      channel
        ? { utility: channel.utility, meterNumber: channel.meterNumber, name: channel.name ?? "", area: channel.area ?? "" }
        : EMPTY
    );
    setError(null);
    setInvalid(null);
  }, [visible, channel]);

  if (!visible) return null;

  const identityChanged =
    isEdit &&
    channel.isVerified &&
    (form.utility !== channel.utility ||
      cleanMeter(form.meterNumber) !== channel.meterNumber ||
      (form.utility === "NWSC" && form.area.trim() !== (channel.area ?? "")));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError(null);
    setInvalid(null);

    const meterNumber = cleanMeter(form.meterNumber);
    if (!/^[A-Z0-9]{4,30}$/.test(meterNumber)) {
      setInvalid("meterNumber");
      setError("Enter the meter or account number: 4 to 30 letters or digits.");
      return;
    }
    if (form.utility === "NWSC" && !form.area.trim()) {
      setInvalid("area");
      setError("Choose the NWSC area for this water account.");
      return;
    }

    const payload: Record<string, string> = { utility: form.utility, meterNumber, name: form.name.trim() };
    if (form.utility === "NWSC") payload.area = form.area.trim();

    setSaving(true);
    try {
      await apiRequest(isEdit ? BILLING_CHANNELS.MODIFY(channel.id) : BILLING_CHANNELS.CREATE, isEdit ? "PUT" : "POST", payload);
      onSuccess(); // the success message is shown by apiRequest
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't save the billing channel. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? "Edit billing channel" : "Add billing channel"}
      subtitle="A water or electricity account the company pays bills for."
      onClose={onCancel}
      busy={saving}
      footer={
        <>
          <button type="button" className={btn.secondary} onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="billing-channel-form" className={btn.primary} disabled={saving}>
            {saving && <Spinner />}
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add channel"}
          </button>
        </>
      }
    >
      <form id="billing-channel-form" onSubmit={submit} noValidate className="flex flex-col gap-5">
        {error && (
          <div role="alert" className="rounded-lg border border-[#F3C9C2] bg-[#FDF0EE] px-3.5 py-2.5 text-sm text-[#8A2A1C]">
            {error}
          </div>
        )}

        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 p-0 text-sm font-semibold text-[#2B3240]">Utility</legend>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(UTILITY_INFO) as UtilityType[]).map((u) => {
              const active = form.utility === u;
              return (
                <button
                  key={u}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setForm((f) => ({ ...f, utility: u, area: u === "NWSC" ? f.area : "" }))}
                  className={`flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border-2 p-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                    active ? "border-brand bg-[#EEF2FA]" : "border-[#E2E6EF] hover:border-[#C9D1E3]"
                  }`}
                >
                  <img src={UTILITY_INFO[u].logo} alt="" className="h-9 w-9 object-contain" />
                  <span className={`text-sm ${active ? "font-semibold text-brand" : "font-medium text-[#2B3240]"}`}>{UTILITY_INFO[u].label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="bc-meter" className="text-sm font-semibold text-[#2B3240]">
            {form.utility === "NWSC" ? "Account / meter number" : "Meter number"} <span className="text-[#C4381F]">*</span>
          </label>
          <input
            id="bc-meter"
            className={`${fieldClass} font-mono tracking-wide`}
            value={form.meterNumber}
            onChange={(e) => setForm((f) => ({ ...f, meterNumber: e.target.value }))}
            placeholder={form.utility === "NWSC" ? "e.g. 2012345678" : "e.g. 04123456789"}
            inputMode="text"
            autoComplete="off"
            aria-invalid={invalid === "meterNumber" || undefined}
            autoFocus
          />
        </div>

        {form.utility === "NWSC" && (
          <AreaField id="bc-area" value={form.area} onChange={(v) => setForm((f) => ({ ...f, area: v }))} invalid={invalid === "area"} />
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="bc-name" className="text-sm font-semibold text-[#2B3240]">
            Label <span className="font-normal text-brand-muted">(optional)</span>
          </label>
          <input
            id="bc-name"
            className={fieldClass}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Head Office water"
            maxLength={120}
            autoComplete="off"
          />
          <p className="m-0 text-xs text-brand-muted">Replaced by the account holder's name once the meter is verified.</p>
        </div>

        {identityChanged && (
          <div className="rounded-lg bg-[#FFF6E5] px-3.5 py-2.5 text-sm text-[#6A4100]">
            Changing the utility, number or area means this channel must be verified again before it can be used for payments.
          </div>
        )}
      </form>
    </Modal>
  );
};

export default AddOrModifyBillingChannel;
