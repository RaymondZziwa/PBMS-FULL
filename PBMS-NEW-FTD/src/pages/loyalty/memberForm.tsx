import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FiImage, FiPaperclip, FiPlus, FiTrash2 } from "react-icons/fi";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import Combobox from "../../ui/Combobox";
import { Segmented, TextField, Toggle } from "../../ui/Field";
import { DatePicker } from "../../ui/DateFields";
import { useConfirm } from "../../ui/ConfirmDialog";
import { apiRequest } from "../../libs/apiConfig";
import { COUNTRIES } from "../../data/countries";
import { countiesOf, subCountiesOf, ugandaDistricts } from "../../data/uganda";
import { CLUB, type Kin, type Member } from "./clubApi";

const TITLES = ["Hon", "Dr", "Prof", "Mr", "Mrs", "Ms"] as const;
const EMPTY_KIN: Kin = { fullName: "", relationship: "", address: "", phone: "", email: "", profession: "" };
const LABELS: Record<string, string> = {
  title: "Title", surname: "Surname", firstName: "First name", otherName: "Other name", idType: "ID type", idNumber: "ID number",
  country: "Country", district: "District", county: "County", subCounty: "Sub-county", address: "Address", phone1: "Phone 1",
  phone2: "Phone 2", email: "Email", profession: "Profession",
};

export type CreatedMember = { member: Member; temporaryPassword: string; notified: { channel: string; sent: boolean } };
type Props = {
  open: boolean;
  /** The member to edit; null to add a new (already approved) member. */
  member: Member | null;
  onClose: () => void;
  onSaved: (m: Member) => void;
  onCreated?: (r: CreatedMember) => void;
};
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Kampala" });
const MAX_FILE = 5 * 1024 * 1024;

/** Staff add a member (approved at once) or edit a member's profile and next of kin. */
const MemberForm = ({ open, member, onClose, onSaved, onCreated }: Props) => {
  const creating = !member;
  const confirm = useConfirm();
  const [f, setF] = useState<Record<string, string>>({});
  const [kin, setKin] = useState<Kin[]>([EMPTY_KIN]);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  // Only when adding a member
  const [feePaid, setFeePaid] = useState(true);
  const [memberSince, setMemberSince] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [docs, setDocs] = useState<File[]>([]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (!member) {
      setF({ title: "", surname: "", firstName: "", otherName: "", idType: "NATIONAL_ID", idNumber: "", country: "Uganda", district: "", county: "", subCounty: "", address: "", phone1: "", phone2: "", email: "", profession: "" });
      setKin([EMPTY_KIN]);
      setFeePaid(true);
      setMemberSince("");
      setCardNumber("");
      setPhoto(null);
      setDocs([]);
      return;
    }
    const s = (v?: string | null) => v ?? "";
    setF({
      title: member.title, surname: member.surname, firstName: member.firstName, otherName: s(member.otherName), idType: member.idType, idNumber: member.idNumber,
      country: member.country, district: s(member.district), county: s(member.county), subCounty: s(member.subCounty), address: s(member.address),
      phone1: member.phone1, phone2: s(member.phone2), email: s(member.email), profession: s(member.profession),
    });
    setKin(member.nextOfKin?.length ? member.nextOfKin.map((k) => ({ ...EMPTY_KIN, ...k, address: s(k.address), email: s(k.email), profession: s(k.profession) })) : [EMPTY_KIN]);
    setError(null);
  }, [open, member]);

  const set = (k: string) => (v: string) => {
    setF((x) => ({ ...x, [k]: v, ...(k === "district" ? { county: "", subCounty: "" } : k === "county" ? { subCounty: "" } : {}) }));
    setError(null);
  };
  const uganda = f.country === "Uganda";
  const districts = useMemo(() => ugandaDistricts().map((d) => ({ value: d.name, label: d.name })), []);
  const counties = useMemo(() => countiesOf(f.district ?? "").map((c) => ({ value: c.name, label: c.name })), [f.district]);
  const subs = useMemo(() => subCountiesOf(f.district ?? "", f.county ?? "").map((s) => ({ value: s, label: s })), [f.district, f.county]);
  const countries = useMemo(() => COUNTRIES.map((c) => ({ value: c, label: c })), []);
  const err = (field: string) => (error?.field === field ? error.message : null);

  const pickFiles = (list: FileList | null, image: boolean) => {
    const files = [...(list ?? [])];
    const bad = files.find((x) => x.size > MAX_FILE || !(image ? /^image\/(jpeg|png|webp)$/ : /^(image\/(jpeg|png|webp)|application\/pdf)$/).test(x.type));
    if (bad) return setError({ field: image ? "photo" : "attachments", message: image ? "The photo must be a JPG, PNG or WebP under 5 MB" : "Attach images or PDFs under 5 MB" });
    setError(null);
    if (image) setPhoto(files[0] ?? null);
    else setDocs((d) => [...d, ...files].slice(0, 6));
  };

  const create = async () => {
    const need: Array<[string, string]> = [["title", "Choose a title"], ["surname", "Enter the surname"], ["firstName", "Enter the first name"], ["idNumber", "Enter the ID or passport number"], ["phone1", "Enter a phone number"]];
    const missing = need.find(([k]) => !(f[k] ?? "").trim());
    if (missing) return setError({ field: missing[0], message: missing[1] });
    const ok = await confirm({
      title: `Add ${f.firstName} ${f.surname} to the club?`,
      message: feePaid
        ? "They're approved and active straight away, get a card number, and receive a temporary password to sign in to the club app."
        : "They're approved straight away and get a card number and temporary password. They pay the registration fee in the club app to activate.",
      confirmLabel: "Add member",
    });
    if (!ok) return;
    setSaving(true);
    try {
      const form = new FormData();
      form.append("data", JSON.stringify({ ...f, nextOfKin: kin, feePaid, memberSince: memberSince || undefined, cardNumber: cardNumber.trim() || undefined }));
      if (photo) form.append("photo", photo);
      docs.forEach((d) => form.append("attachments", d));
      const res = await apiRequest<{ data: CreatedMember }>(CLUB.members, "POST", form);
      onCreated?.(res.data);
      onClose();
    } catch (e2) {
      const data = (e2 as { response?: { data?: { field?: string; message?: string } } })?.response?.data;
      if (data?.message) setError({ field: data.field, message: data.message });
    } finally {
      setSaving(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!member) return create();
    const changed = Object.keys(LABELS).filter((k) => (f[k] ?? "") !== String((member as unknown as Record<string, unknown>)[k] ?? "")).map((k) => LABELS[k]);
    const kinChanged = JSON.stringify(kin.map((k) => [k.fullName, k.relationship, k.address, k.phone, k.email, k.profession])) !==
      JSON.stringify((member.nextOfKin ?? []).map((k) => [k.fullName, k.relationship, k.address ?? "", k.phone, k.email ?? "", k.profession ?? ""]));
    if (kinChanged) changed.push("Next of kin");
    if (!changed.length) return onClose();
    const ok = await confirm({ title: `Save changes to ${member.name}?`, message: <>This updates <strong>{changed.join(", ")}</strong>.</>, confirmLabel: "Save changes" });
    if (!ok) return;
    setSaving(true);
    try {
      const res = await apiRequest<{ data: Member }>(CLUB.member(member.id), "PATCH", { ...f, nextOfKin: kin });
      onSaved(res.data);
      onClose();
    } catch (e2) {
      const data = (e2 as { response?: { data?: { field?: string; message?: string } } })?.response?.data;
      if (data?.message) setError({ field: data.field, message: data.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      locked={saving}
      size="xl"
      title={member ? `Edit ${member.name}` : "Add club member"}
      description={creating ? "For people who are already members: they're approved at once, no application needed." : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="club-member-form" loading={saving}>{creating ? "Add member" : "Save"}</Button>
        </>
      }
    >
      <form id="club-member-form" onSubmit={submit} noValidate className="space-y-6">
        {error && !error.field && <p role="alert" className="m-0 rounded-lg bg-[#FDECEA] px-3 py-2 text-sm text-[#B42318] dark:bg-[#3A1512] dark:text-[#F29A92]">{error.message}</p>}
        {creating && (
          <section>
            <h3 className="m-0 mb-3 text-sm font-semibold text-brand-ink">Membership</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-3">
                <Toggle label="Registration fee already paid" description={feePaid ? "The membership is active immediately." : "They'll pay the fee in the club app to activate."} checked={feePaid} onChange={setFeePaid} />
              </div>
              {feePaid && <DatePicker label="Member since" value={memberSince} max={today()} onChange={setMemberSince} hint="Leave empty for today" error={err("memberSince")} />}
              <TextField label="Existing card number" value={cardNumber} onChange={(v) => { setCardNumber(v.toUpperCase()); setError(null); }} hint="Leave empty to give a new PBMC number" error={err("cardNumber")} maxLength={20} />
              <div>
                <span className="mb-1.5 block text-[13px] font-medium text-ink-soft">Photo</span>
                <label className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line px-3 text-sm text-brand-muted hover:border-brand">
                  <FiImage aria-hidden="true" /> <span className="truncate">{photo ? photo.name : "Choose a photo (optional)"}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { pickFiles(e.target.files, true); e.target.value = ""; }} />
                </label>
                {err("photo") && <p className="m-0 mt-1 text-xs text-[#C0362C]">{err("photo")}</p>}
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <span className="mb-1.5 block text-[13px] font-medium text-ink-soft">ID / passport copies <span className="font-normal text-brand-muted">(optional)</span></span>
                <div className="flex flex-wrap gap-2">
                  {docs.map((d, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-subtle px-3 py-1 text-xs text-brand-text">
                      {d.name}
                      <button type="button" aria-label={`Remove ${d.name}`} onClick={() => setDocs((x) => x.filter((_, j) => j !== i))} className="text-brand-muted hover:text-[#C0362C]"><FiTrash2 aria-hidden="true" /></button>
                    </span>
                  ))}
                  {docs.length < 6 && (
                    <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-line px-3 text-xs text-brand-muted hover:border-brand">
                      <FiPaperclip aria-hidden="true" /> Attach
                      <input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => { pickFiles(e.target.files, false); e.target.value = ""; }} />
                    </label>
                  )}
                </div>
                {err("attachments") && <p className="m-0 mt-1 text-xs text-[#C0362C]">{err("attachments")}</p>}
              </div>
            </div>
          </section>
        )}
        <section>
          <h3 className="m-0 mb-3 text-sm font-semibold text-brand-ink">Bio data</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Segmented className="sm:col-span-2 lg:col-span-3" label="Title" required value={(f.title ?? "") as (typeof TITLES)[number]} onChange={set("title")} options={TITLES.map((t) => ({ value: t, label: t }))} error={err("title")} />
            <TextField label="Surname" required value={f.surname ?? ""} onChange={set("surname")} error={err("surname")} />
            <TextField label="First name" required value={f.firstName ?? ""} onChange={set("firstName")} error={err("firstName")} />
            <TextField label="Other name" value={f.otherName ?? ""} onChange={set("otherName")} />
            <Segmented label="ID type" required value={(f.idType ?? "") as "NATIONAL_ID" | "PASSPORT"} onChange={set("idType")} options={[{ value: "NATIONAL_ID", label: "National ID" }, { value: "PASSPORT", label: "Passport" }]} error={err("idType")} />
            <TextField label={f.idType === "PASSPORT" ? "Passport number" : "NIN"} required value={f.idNumber ?? ""} onChange={(v) => set("idNumber")(v.toUpperCase())} error={err("idNumber")} />
            <TextField label="Profession / occupation" value={f.profession ?? ""} onChange={set("profession")} />
          </div>
        </section>

        <section>
          <h3 className="m-0 mb-3 text-sm font-semibold text-brand-ink">Address and contacts</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Combobox label="Country" required value={f.country ?? ""} onChange={set("country")} options={countries} searchPlaceholder="Search countries" error={err("country")} />
            {uganda ? (
              <>
                <Combobox label="District" required value={f.district ?? ""} onChange={set("district")} options={districts} searchPlaceholder="Search districts" error={err("district")} />
                <Combobox label="County / municipality" value={f.county ?? ""} onChange={set("county")} options={counties} disabled={!f.district} searchPlaceholder="Search" />
                <Combobox label="Sub-county / town council" value={f.subCounty ?? ""} onChange={set("subCounty")} options={subs} disabled={!f.county} searchPlaceholder="Search" />
                <TextField className="sm:col-span-2" label="Village / street" value={f.address ?? ""} onChange={set("address")} />
              </>
            ) : (
              <TextField className="sm:col-span-2" label="Location" required value={f.address ?? ""} onChange={set("address")} error={err("address")} placeholder="Town, street…" />
            )}
            <TextField label="Telephone 1" type="tel" required value={f.phone1 ?? ""} onChange={set("phone1")} error={err("phone1")} />
            <TextField label="Telephone 2" type="tel" value={f.phone2 ?? ""} onChange={set("phone2")} error={err("phone2")} />
            <TextField label="Email" type="email" value={f.email ?? ""} onChange={set("email")} error={err("email")} />
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="m-0 text-sm font-semibold text-brand-ink">Next of kin</h3>
            <span className="text-xs text-brand-muted">{creating ? "Optional now; up to four." : "The first is required; up to four."}</span>
            {kin.length < 4 && (
              <Button size="sm" variant="secondary" className="ml-auto" icon={<FiPlus aria-hidden="true" />} onClick={() => setKin((k) => [...k, EMPTY_KIN])}>Add</Button>
            )}
          </div>
          <div className="space-y-3">
            {kin.map((k, i) => {
              const setK = (key: keyof Kin) => (v: string) => {
                setKin((list) => list.map((x, j) => (j === i ? { ...x, [key]: v } : x)));
                setError(null);
              };
              const e = (key: string) => err(`nextOfKin.${i}.${key}`);
              return (
                <fieldset key={i} className="m-0 rounded-xl border border-line p-3">
                  <legend className="px-1 text-xs font-semibold text-brand-muted">Next of kin {i + 1}{i === 0 && !creating ? " (required)" : ""}</legend>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <TextField label="Full name" required={i === 0 && !creating} value={k.fullName} onChange={setK("fullName")} error={e("fullName")} />
                    <TextField label="Relationship" required={i === 0 && !creating} value={k.relationship} onChange={setK("relationship")} error={e("relationship")} placeholder="e.g. Spouse" />
                    <TextField label="Telephone" type="tel" required={i === 0 && !creating} value={k.phone} onChange={setK("phone")} error={e("phone")} />
                    <TextField label="Physical address" value={k.address ?? ""} onChange={setK("address")} />
                    <TextField label="Email" type="email" value={k.email ?? ""} onChange={setK("email")} error={e("email")} />
                    <TextField label="Profession" value={k.profession ?? ""} onChange={setK("profession")} />
                  </div>
                  {i > 0 && (
                    <Button size="sm" variant="ghost" className="mt-2 text-[#C0362C]" icon={<FiTrash2 aria-hidden="true" />} onClick={() => setKin((list) => list.filter((_, j) => j !== i))}>Remove</Button>
                  )}
                </fieldset>
              );
            })}
          </div>
        </section>
      </form>
    </Modal>
  );
};

export default MemberForm;
