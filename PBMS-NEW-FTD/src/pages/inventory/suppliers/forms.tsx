import { useEffect, useState, type FormEvent } from "react";
import { useSelector } from "react-redux";
import useItems from "../../../hooks/inventory/useItems";
import useUnits from "../../../hooks/inventory/useUnits";
import useStores from "../../../hooks/inventory/useStores";
import useEmployees from "../../../hooks/humanResource/useEmployees";
import { apiRequest } from "../../../libs/apiConfig";
import { InventoryEndpoints } from "../../../endpoints/inventory/inventory";
import type { ISupplier, ISupply, PaymentKind } from "../../../redux/types/supplyMgt";
import type { IStore } from "../../../redux/types/inventory";
import type { RootState } from "../../../redux/store";
import { roleHasPermission } from "../../../layout/navigation";
import Button from "../../../ui/Button";
import Modal from "../../../ui/Modal";
import Combobox from "../../../ui/Combobox";
import { MoneyField, Segmented, TextField } from "../../../ui/Field";
import { DatePicker } from "../../../ui/DateFields";
import { useConfirm } from "../../../ui/ConfirmDialog";
import { ugx } from "../../../ui/Page";
import { apiError, num, personName, PhotoPicker, qty, TextArea } from "../shared";

type Errors = Record<string, string | undefined>;

/** Received, paid and owed across a supplier's supplies. */
export const supplierTotals = (s: ISupplier) => {
  const supplied = (s.Supply ?? []).reduce((a, x) => a + num(x.value), 0);
  const balance = (s.Supply ?? []).reduce((a, x) => a + num(x.balance), 0);
  return { supplied, balance, paid: supplied - balance, count: s.Supply?.length ?? 0 };
};

const showFieldError = (err: unknown, setErrors: (e: Errors) => void) => {
  const { field, message } = apiError(err);
  if (field && message) setErrors({ [field]: message });
};

// ── Supplier ──────────────────────────────────────────────

export const SupplierForm = ({ open, supplier, onClose, onSaved }: { open: boolean; supplier: ISupplier | null; onClose: () => void; onSaved: (s: ISupplier) => void }) => {
  const confirm = useConfirm();
  const [f, setF] = useState({ firstName: "", lastName: "", contact: "", address: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF({ firstName: supplier?.firstName ?? "", lastName: supplier?.lastName ?? "", contact: supplier?.contact ?? "", address: supplier?.address ?? "" });
    setErrors({});
  }, [open, supplier]);

  const set = (k: keyof typeof f) => (v: string) => {
    setF((x) => ({ ...x, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Errors = {};
    if (!f.firstName.trim()) errs.firstName = "Enter the first name.";
    if (!f.lastName.trim()) errs.lastName = "Enter the last name or company.";
    if (!f.contact.trim()) errs.contact = "Enter a phone number.";
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    const body = { firstName: f.firstName.trim(), lastName: f.lastName.trim(), contact: f.contact.trim(), address: f.address.trim() };
    if (supplier) {
      const changes = (Object.keys(body) as Array<keyof typeof body>).filter((k) => body[k] !== (supplier[k] ?? "")).map((k) => `${({ firstName: "First name", lastName: "Last name", contact: "Phone", address: "Address" })[k]}: ${supplier[k] || "—"} → ${body[k] || "—"}`);
      if (!changes.length) return onClose();
      if (!(await confirm({ title: `Save ${supplier.firstName} ${supplier.lastName}?`, details: <ul className="m-0 list-disc pl-5">{changes.map((c) => <li key={c}>{c}</li>)}</ul>, confirmLabel: "Save" }))) return;
    }
    setSaving(true);
    try {
      const res = await apiRequest<{ data: ISupplier }>(supplier ? InventoryEndpoints.SUPPLY.SUPPLIER.modify(supplier.id) : InventoryEndpoints.SUPPLY.SUPPLIER.Create_supplier, supplier ? "PUT" : "POST", body);
      onSaved(res.data);
      onClose();
    } catch (err) {
      showFieldError(err, setErrors);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} locked={saving} size="md" title={supplier ? "Edit supplier" : "Add supplier"} footer={<><Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button><Button type="submit" form="supplier-form" loading={saving}>{supplier ? "Save" : "Add supplier"}</Button></>}>
      <form id="supplier-form" onSubmit={submit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="First name" required data-autofocus value={f.firstName} onChange={set("firstName")} error={errors.firstName} maxLength={80} />
        <TextField label="Last name or company" required value={f.lastName} onChange={set("lastName")} error={errors.lastName} maxLength={80} />
        <TextField label="Phone" type="tel" required value={f.contact} onChange={set("contact")} error={errors.contact} maxLength={30} placeholder="07XX XXX XXX" />
        <TextField label="Address" value={f.address} onChange={set("address")} maxLength={191} />
      </form>
    </Modal>
  );
};

// ── Supply (goods received) ───────────────────────────────

export const SupplyForm = ({ open, supplier, supply, onClose, onSaved }: { open: boolean; supplier: ISupplier; supply: ISupply | null; onClose: () => void; onSaved: () => void }) => {
  const confirm = useConfirm();
  const me = useSelector((s: RootState) => s.userAuth.data) as { id?: string | number; role?: { name?: string; permissions?: unknown } } | null;
  const managesStores = roleHasPermission(me?.role, "create_and_modify_stores");
  const { data: items } = useItems();
  const { data: units } = useUnits();
  const { data: stores } = useStores();
  const { data: employees } = useEmployees();
  const [f, setF] = useState({ itemId: "", unitId: "", qty: "", value: "", storeId: "", receivedBy: "" });
  const [photos, setPhotos] = useState<File[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const myStores = (stores as IStore[]).filter((s) => managesStores || (s.authorizedPersonnel ?? []).map(String).includes(String(me?.id)));
  const paid = supply ? num(supply.value) - num(supply.balance) : 0;

  useEffect(() => {
    if (!open) return;
    setF({
      itemId: supply?.item?.id ? String(supply.item.id) : "",
      unitId: supply?.uom?.id ? String(supply.uom.id) : "",
      qty: supply ? String(supply.qty) : "",
      value: supply ? String(Math.round(num(supply.value))) : "",
      storeId: supply?.destinationStore?.id ? String(supply.destinationStore.id) : myStores.length === 1 ? String(myStores[0].id) : "",
      receivedBy: supply?.employee?.id ? String(supply.employee.id) : me?.id ? String(me.id) : "",
    });
    setPhotos([]);
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, supply]);

  const set = (k: keyof typeof f) => (v: string) => {
    setF((x) => ({ ...x, [k]: v }));
    setErrors((e) => ({ ...e, [k === "storeId" ? "destinationStoreId" : k === "receivedBy" ? "recievedBy" : k]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Errors = {};
    if (!supply) {
      if (!f.itemId) errs.itemId = "Choose the item.";
      if (!f.unitId) errs.unitId = "Choose the unit.";
      if (!(Number(f.qty) > 0)) errs.qty = "Enter the quantity received.";
      if (!f.storeId) errs.destinationStoreId = "Choose the store receiving it.";
    }
    if (f.value === "") errs.value = "Enter the value of the goods.";
    else if (supply && Number(f.value) < paid) errs.value = `Already paid ${ugx(paid)}; the value can't be lower.`;
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    const itemName = items.find((i) => String(i.id) === f.itemId)?.name ?? supply?.item?.name ?? "";
    const storeName = (stores as IStore[]).find((s) => String(s.id) === f.storeId)?.name ?? "";
    const unitName = units.find((u) => String(u.id) === f.unitId)?.name ?? "";
    const ok = await confirm(
      supply
        ? { title: "Save this supply?", details: <ul className="m-0 list-disc pl-5"><li>Value: {ugx(supply.value)} → {ugx(f.value)}</li><li>Balance becomes {ugx(Number(f.value) - paid)}</li></ul>, confirmLabel: "Save" }
        : { title: `Receive ${qty(f.qty)} ${unitName} ${itemName}?`, message: `It's added to ${storeName} now, and ${ugx(f.value)} is owed to ${supplier.firstName} ${supplier.lastName}.`, confirmLabel: "Receive" },
    );
    if (!ok) return;

    setSaving(true);
    try {
      const body = new FormData();
      body.append("value", f.value);
      if (f.receivedBy) body.append("recievedBy", f.receivedBy);
      if (!supply) {
        body.append("itemId", f.itemId);
        body.append("unitId", f.unitId);
        body.append("qty", f.qty);
        body.append("destinationStoreId", f.storeId);
      }
      if (photos[0]) body.append("proofImage", photos[0]);
      await apiRequest(supply ? InventoryEndpoints.SUPPLY.SUPPLIES.modify(supply.id) : InventoryEndpoints.SUPPLY.SUPPLIES.create(supplier.id), supply ? "PUT" : "POST", body);
      onSaved();
      onClose();
    } catch (err) {
      showFieldError(err, setErrors);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      locked={saving}
      size="lg"
      title={supply ? "Edit supply" : `Receive goods from ${supplier.firstName} ${supplier.lastName}`}
      description={supply ? "The quantity can't change here because the stock has already moved. Use Stock Movement for corrections." : "The goods go into the store straight away; the value is owed to the supplier until paid."}
      footer={<><Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button><Button type="submit" form="supply-form" loading={saving}>{supply ? "Save" : "Receive goods"}</Button></>}
    >
      <form id="supply-form" onSubmit={submit} noValidate className="space-y-4">
        {supply ? (
          <p className="m-0 rounded-lg bg-surface-2 px-3 py-2 text-sm text-ink-soft">{qty(supply.qty)} {supply.uom?.name} {supply.item?.name} into {supply.destinationStore?.name}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Combobox label="Item" required value={f.itemId} onChange={set("itemId")} options={items.map((i) => ({ value: String(i.id), label: i.name, hint: i.category?.name }))} searchPlaceholder="Search items" error={errors.itemId} />
            <Combobox label="Into store" required value={f.storeId} onChange={set("storeId")} options={myStores.map((s) => ({ value: String(s.id), label: s.name, hint: s.branch?.name }))} searchPlaceholder="Search stores" error={errors.destinationStoreId} emptyText="You aren't allowed in any store yet" />
            <Combobox label="Unit" required value={f.unitId} onChange={set("unitId")} options={units.map((u) => ({ value: String(u.id), label: u.name }))} searchPlaceholder="Search units" error={errors.unitId} />
            <TextField label="Quantity" required inputMode="decimal" value={f.qty} onChange={(v) => set("qty")(v.replace(/[^\d.]/g, ""))} error={errors.qty} />
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MoneyField label="Value of the goods" required value={f.value} onChange={set("value")} error={errors.value} hint={supply ? `Paid so far: ${ugx(paid)}` : "What you owe the supplier for them."} />
          <Combobox label="Received by" value={f.receivedBy} onChange={set("receivedBy")} options={employees.map((x) => ({ value: String(x.id), label: personName(x) }))} searchPlaceholder="Search people" error={errors.recievedBy} />
        </div>
        <PhotoPicker label={supply ? "Replace proof photo" : "Proof photo"} files={photos} onChange={setPhotos} max={1} error={errors.files} hint="Optional: invoice or delivery photo." />
      </form>
    </Modal>
  );
};

// ── Payment ───────────────────────────────────────────────

const KINDS: Array<{ value: PaymentKind; label: string }> = [
  { value: "CASH", label: "Cash" },
  { value: "MOBILE_MONEY", label: "Mobile money" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "BARTER_PAYMENT", label: "Barter" },
];

export const PaymentForm = ({ open, supply, onClose, onSaved }: { open: boolean; supply: ISupply | null; onClose: () => void; onSaved: () => void }) => {
  const confirm = useConfirm();
  const [kind, setKind] = useState<PaymentKind>("CASH");
  const [amount, setAmount] = useState("");
  const [bank, setBank] = useState("");
  const [cheque, setCheque] = useState("");
  const [date, setDate] = useState("");
  const [barter, setBarter] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const balance = supply ? num(supply.balance) : 0;

  useEffect(() => {
    if (!open) return;
    setKind("CASH");
    setAmount(supply ? String(Math.round(num(supply.balance))) : "");
    setBank("");
    setCheque("");
    setDate("");
    setBarter("");
    setPhotos([]);
    setErrors({});
  }, [open, supply]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supply) return;
    const n = Number(amount);
    const errs: Errors = {};
    if (!(n > 0)) errs.amount = "Enter the amount paid.";
    else if (n > balance) errs.amount = `The balance is only ${ugx(balance)}.`;
    if (kind === "CHEQUE") {
      if (!bank.trim()) errs.bankName = "Enter the bank.";
      if (!cheque.trim()) errs.chequeNumber = "Enter the cheque number.";
      if (!date) errs.chequeBankingDate = "Choose the banking date.";
    }
    if (kind === "BARTER_PAYMENT" && !barter.trim()) errs.barterItemName = "Say what was given in exchange.";
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    if (!(await confirm({ title: `Record a payment of ${ugx(n)}?`, message: `For ${qty(supply.qty)} ${supply.item?.name ?? ""}. The balance becomes ${ugx(balance - n)}.`, confirmLabel: "Record payment" }))) return;

    setSaving(true);
    try {
      const body = new FormData();
      body.append("supplyId", String(supply.id));
      body.append("paymentType", kind);
      body.append("amount", String(n));
      if (kind === "CHEQUE") {
        body.append("bankName", bank.trim());
        body.append("chequeNumber", cheque.trim());
        body.append("chequeBankingDate", date);
      }
      if (kind === "BARTER_PAYMENT") body.append("barterItemName", barter.trim());
      if (photos[0]) body.append("proofImage", photos[0]);
      await apiRequest(InventoryEndpoints.SUPPLY.SUPPLY_PAYMENTS.PAY, "POST", body);
      onSaved();
      onClose();
    } catch (err) {
      showFieldError(err, setErrors);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} locked={saving} size="md" title="Pay supplier" description={supply ? `Balance: ${ugx(balance)}` : undefined} footer={<><Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button><Button type="submit" form="payment-form" loading={saving}>Record payment</Button></>}>
      <form id="payment-form" onSubmit={submit} noValidate className="space-y-4">
        <Segmented label="Paid by" required value={kind} onChange={(v) => { setKind(v); setErrors({}); }} options={KINDS} />
        <MoneyField label={kind === "BARTER_PAYMENT" ? "Value given" : "Amount"} required value={amount} onChange={(v) => { setAmount(v); setErrors((x) => ({ ...x, amount: undefined })); }} error={errors.amount} />
        {kind === "CHEQUE" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Bank" required value={bank} onChange={setBank} error={errors.bankName} maxLength={80} />
            <TextField label="Cheque number" required value={cheque} onChange={setCheque} error={errors.chequeNumber} maxLength={40} />
            <DatePicker label="Banking date" required value={date} onChange={setDate} error={errors.chequeBankingDate} />
          </div>
        )}
        {kind === "BARTER_PAYMENT" && <TextArea label="Given in exchange" required value={barter} onChange={setBarter} error={errors.barterItemName} maxLength={120} rows={2} />}
        <PhotoPicker label="Proof of payment" files={photos} onChange={setPhotos} max={1} hint="Optional: receipt, transaction message or cheque photo." />
      </form>
    </Modal>
  );
};
