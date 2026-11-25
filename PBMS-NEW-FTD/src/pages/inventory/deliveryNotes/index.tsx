import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FiFileText, FiPlus, FiTrash2 } from "react-icons/fi";
import useDeliveryNotes from "../../../hooks/inventory/useDeliveryNotes";
import { apiRequest } from "../../../libs/apiConfig";
import { InventoryEndpoints } from "../../../endpoints/inventory/inventory";
import type { IDeliveryNote } from "../../../redux/types/inventory";
import Button from "../../../ui/Button";
import Modal from "../../../ui/Modal";
import { SearchBox, TextField } from "../../../ui/Field";
import { Badge, Card, EmptyState, PageHeader, SkeletonRows } from "../../../ui/Page";
import { useConfirm } from "../../../ui/ConfirmDialog";
import { apiError, day, imagesOf, Pager, personName, PhotoPicker, Photos, Table, Td, TextArea, Th, usePaged } from "../shared";

/** Delivery notes received with goods; link them to restocks as evidence. */
const DeliveryNotes = () => {
  const confirm = useConfirm();
  const { data, loading, upsert, remove } = useDeliveryNotes();
  const notes = (data ?? []) as IDeliveryNote[];
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", deliveryNoteNumber: "", notes: "" });
  const [photos, setPhotos] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => !q || `${n.deliveryNoteNumber} ${n.name} ${personName(n.employee)}`.toLowerCase().includes(q));
  }, [notes, query]);
  const paged = usePaged(filtered);

  useEffect(() => {
    if (!open) return;
    setForm({ name: "", deliveryNoteNumber: "", notes: "" });
    setPhotos([]);
    setErrors({});
  }, [open]);

  const set = (k: keyof typeof form) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Enter who delivered it.";
    if (!form.deliveryNoteNumber.trim()) errs.deliveryNoteNumber = "Enter the number on the note.";
    if (!photos.length) errs.files = "Add a photo of the delivery note.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      const body = new FormData();
      body.append("name", form.name.trim());
      body.append("deliveryNoteNumber", form.deliveryNoteNumber.trim());
      if (form.notes.trim()) body.append("notes", form.notes.trim());
      photos.forEach((p) => body.append("files", p));
      const res = await apiRequest<{ data: IDeliveryNote }>(InventoryEndpoints.STOCK_MVT.CREATE_DNS, "POST", body);
      upsert(res.data);
      setOpen(false);
    } catch (err) {
      const { field, message } = apiError(err);
      if (field && message) setErrors({ [field]: message });
    } finally {
      setSaving(false);
    }
  };

  const del = async (n: IDeliveryNote) => {
    if (n._count?.InventoryRecord) {
      await confirm({ title: `Delivery note ${n.deliveryNoteNumber} can't be deleted`, message: `It is evidence for ${n._count.InventoryRecord} stock movement(s).`, confirmLabel: "OK" });
      return;
    }
    await confirm({
      title: `Delete delivery note ${n.deliveryNoteNumber}?`,
      message: "The note and its photos are removed. This can't be undone.",
      tone: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await apiRequest(InventoryEndpoints.STOCK_MVT.delete_DN(n.id), "DELETE");
        remove(n.id);
      },
    });
  };

  return (
    <div className="mx-auto max-w-6xl font-inter">
      <PageHeader title="Delivery notes" description="Notes that came with deliveries. Link one to a restock as evidence." actions={<Button icon={<FiPlus aria-hidden="true" />} onClick={() => setOpen(true)}>Add delivery note</Button>} />
      <Card>
        <div className="border-b border-line p-3 sm:p-4">
          <SearchBox value={query} onChange={setQuery} placeholder="Number, supplier or person" label="Search delivery notes" />
        </div>
        {loading && !notes.length ? (
          <SkeletonRows rows={5} />
        ) : !filtered.length ? (
          <EmptyState icon={<FiFileText className="h-5 w-5" />} title={notes.length ? "Nothing matches" : "No delivery notes yet"} action={!notes.length && <Button icon={<FiPlus aria-hidden="true" />} onClick={() => setOpen(true)}>Add delivery note</Button>} />
        ) : (
          <>
            <Table head={<><Th>Number</Th><Th>From</Th><Th>Photos</Th><Th>Used in</Th><Th>Saved</Th><Th className="w-px text-right">Actions</Th></>}>
              {paged.shown.map((n) => (
                <tr key={n.id} className="hover:bg-surface-2/60">
                  <Td>
                    <p className="m-0 font-medium">{n.deliveryNoteNumber}</p>
                    {n.notes && <p className="m-0 line-clamp-1 text-xs text-brand-muted">{n.notes}</p>}
                  </Td>
                  <Td>{n.name}</Td>
                  <Td><Photos paths={imagesOf(n.images)} size="sm" /></Td>
                  <Td>{n._count?.InventoryRecord ? <Badge tone="brand">{n._count.InventoryRecord} movement(s)</Badge> : <span className="text-brand-muted">Not used yet</span>}</Td>
                  <Td className="whitespace-nowrap">
                    <p className="m-0">{day(n.createdAt)}</p>
                    <p className="m-0 text-xs text-brand-muted">{personName(n.employee)}</p>
                  </Td>
                  <Td className="text-right">
                    <Button size="sm" variant="ghost" icon={<FiTrash2 aria-hidden="true" />} onClick={() => del(n)} aria-label={`Delete delivery note ${n.deliveryNoteNumber}`} className="text-[#C0362C]">Delete</Button>
                  </Td>
                </tr>
              ))}
            </Table>
            <Pager {...paged} />
          </>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        locked={saving}
        size="md"
        title="Add delivery note"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="dn-form" loading={saving}>Save</Button>
          </>
        }
      >
        <form id="dn-form" onSubmit={submit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="Delivered by" required data-autofocus value={form.name} onChange={set("name")} error={errors.name} maxLength={120} placeholder="Supplier or company" />
            <TextField label="Delivery note number" required value={form.deliveryNoteNumber} onChange={set("deliveryNoteNumber")} error={errors.deliveryNoteNumber} maxLength={60} />
          </div>
          <TextArea label="Notes" value={form.notes} onChange={set("notes")} maxLength={1000} />
          <PhotoPicker label="Photos of the note" required files={photos} onChange={(f) => { setPhotos(f); setErrors((e) => ({ ...e, files: undefined })); }} max={10} error={errors.files} />
        </form>
      </Modal>
    </div>
  );
};

export default DeliveryNotes;
