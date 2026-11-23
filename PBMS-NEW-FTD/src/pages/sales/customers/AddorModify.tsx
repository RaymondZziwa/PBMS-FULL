import { useEffect, useState, type FormEvent } from "react";
import Modal from "../../../ui/Modal";
import Button from "../../../ui/Button";
import { TextField } from "../../../ui/Field";
import { useConfirm } from "../../../ui/ConfirmDialog";
import { apiRequest } from "../../../libs/apiConfig";
import useClients from "../../../hooks/sales/useClients";
import type { IClient } from "../../../redux/types/sales";
import { SALESENDPOINTS } from "../../../endpoints/sales/salesEndpoints";

type Props = {
  visible: boolean;
  client: IClient | null;
  onCancel: () => void;
  /** Called after a save with the phone number, so a till can select the new customer. */
  onSaved?: (phone: string) => void;
};

type Form = { firstName: string; lastName: string; phone: string; address: string };
const EMPTY: Form = { firstName: "", lastName: "", phone: "", address: "" };

/** Add or edit a customer. Editing asks for confirmation and lists what changes. */
const AddOrModifyClient = ({ visible, client, onCancel, onSaved }: Props) => {
  const { refresh } = useClients();
  const confirm = useConfirm();
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Form>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setForm(client ? { firstName: client.firstName ?? "", lastName: client.lastName ?? "", phone: client.phone ?? "", address: client.address ?? "" } : EMPTY);
    setErrors({});
  }, [visible, client]);

  const set = (k: keyof Form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found: Partial<Form> = {};
    if (!form.firstName.trim()) found.firstName = "Enter a first name";
    if (!form.lastName.trim()) found.lastName = "Enter a last name";
    if (!form.phone.trim()) found.phone = "Enter a phone number";
    else if (form.phone.replace(/\D/g, "").length < 9) found.phone = "That phone number looks too short";
    setErrors(found);
    if (Object.keys(found).length) return;

    if (client) {
      const labels: Record<keyof Form, string> = { firstName: "First name", lastName: "Last name", phone: "Phone", address: "Address" };
      const changes = (Object.keys(labels) as (keyof Form)[])
        .filter((k) => (client[k] ?? "").toString().trim() !== form[k].trim())
        .map((k) => `${labels[k]}: ${client[k] || "—"} → ${form[k].trim() || "—"}`);
      if (changes.length === 0) return onCancel();
      const ok = await confirm({
        title: `Save changes to ${client.firstName} ${client.lastName}?`,
        details: (
          <ul className="m-0 list-disc space-y-1 pl-4">
            {changes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        ),
        confirmLabel: "Save changes",
        tone: "primary",
      });
      if (!ok) return;
    }

    setSaving(true);
    try {
      const payload = { firstName: form.firstName.trim(), lastName: form.lastName.trim(), phone: form.phone.trim(), address: form.address.trim() || undefined };
      await apiRequest(client ? SALESENDPOINTS.CLIENT.modify(client.id) : SALESENDPOINTS.CLIENT.create, client ? "PUT" : "POST", "", payload);
      await refresh();
      onSaved?.(payload.phone);
      onCancel();
    } catch {
      // apiRequest showed the reason
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={visible}
      onClose={onCancel}
      locked={saving}
      size="md"
      title={client ? `Edit ${client.firstName} ${client.lastName}` : "New customer"}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="client-form" loading={saving}>
            {client ? "Save changes" : "Add customer"}
          </Button>
        </>
      }
    >
      <form id="client-form" onSubmit={submit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="First name" required value={form.firstName} onChange={(v) => set("firstName", v)} error={errors.firstName} autoComplete="given-name" data-autofocus />
        <TextField label="Last name" required value={form.lastName} onChange={(v) => set("lastName", v)} error={errors.lastName} autoComplete="family-name" />
        <TextField label="Phone" required type="tel" inputMode="tel" value={form.phone} onChange={(v) => set("phone", v)} error={errors.phone} placeholder="07XX XXX XXX" className="sm:col-span-2" />
        <TextField label="Address" value={form.address} onChange={(v) => set("address", v)} placeholder="Optional" className="sm:col-span-2" />
      </form>
    </Modal>
  );
};

export default AddOrModifyClient;
