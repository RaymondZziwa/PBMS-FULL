import { useRef, useState, type ReactNode } from "react";
import { FiCamera, FiChevronDown, FiLogOut, FiMoon, FiSun } from "react-icons/fi";
import AppShell from "../components/AppShell";
import { AddressFields, emptyKin, KinEditor, type Address, type Kin } from "../components/ProfileParts";
import { Alert, Badge, Button, Modal, TextInput, cx } from "../components/ui";
import { api, ApiError, fileUrl } from "../lib/api";
import { useAuth } from "../lib/auth";
import { date, initials, phone } from "../lib/format";
import { shrinkImage } from "../lib/images";
import { useTheme } from "../lib/theme";
import type { Member } from "../lib/types";
import { fileOk, isEmail, normalisePhone } from "../lib/validate";
import { PasswordForm } from "./ChangePassword";

const STATUS: Record<Member["status"], { label: string; tone: "good" | "bad" | "warn" | "neutral" }> = {
  ACTIVE: { label: "Active", tone: "good" },
  AWAITING_PAYMENT: { label: "Awaiting payment", tone: "warn" },
  PENDING: { label: "Pending approval", tone: "warn" },
  SUSPENDED: { label: "Suspended", tone: "bad" },
  DEACTIVATED: { label: "Deactivated", tone: "bad" },
  REJECTED: { label: "Rejected", tone: "bad" },
};

/** A collapsible settings section. */
const Section = ({ title, summary, children, open, onToggle }: { title: string; summary?: ReactNode; children: ReactNode; open: boolean; onToggle: () => void }) => (
  <section className="card overflow-hidden">
    <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-4 text-left sm:px-5">
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        {summary && !open && <span className="block truncate text-sm text-ink-muted">{summary}</span>}
      </span>
      <FiChevronDown aria-hidden="true" className={cx("flex-none text-ink-muted transition-transform", open && "rotate-180")} />
    </button>
    {open && <div className="border-t border-line px-4 py-5 sm:px-5">{children}</div>}
  </section>
);

/** The member's account: photo, contacts, address, next of kin, password, theme. */
const Settings = () => {
  const { member, setMember, signOut } = useAuth();
  const { theme, set: setTheme } = useTheme();
  const [open, setOpen] = useState<string | null>(null);
  const [confirmOut, setConfirmOut] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  const [contacts, setContacts] = useState({ phone2: "", email: "", profession: "" });
  const [address, setAddress] = useState<Address>({ country: "", district: "", county: "", subCounty: "", address: "" });
  const [kin, setKin] = useState<Kin[]>([emptyKin()]);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [busy, setBusy] = useState(false);

  if (!member) return null;
  const photo = fileUrl(member.photoUrl);

  const toggle = (key: string) => {
    setErrors({});
    setSaved(null);
    if (open === key) return setOpen(null);
    if (key === "contacts") {
      setContacts({ phone2: member.phone2 ? phone(member.phone2) : "", email: member.email ?? "", profession: member.profession ?? "" });
      setAddress({ country: member.country, district: member.district ?? "", county: member.county ?? "", subCounty: member.subCounty ?? "", address: member.address ?? "" });
    }
    if (key === "kin") {
      setKin(
        member.nextOfKin?.length
          ? member.nextOfKin.map((k) => ({ fullName: k.fullName, relationship: k.relationship, address: k.address ?? "", phone: phone(k.phone), email: k.email ?? "", profession: k.profession ?? "" }))
          : [emptyKin()],
      );
    }
    setOpen(key);
  };

  const save = async (body: Record<string, unknown>, done: string) => {
    setBusy(true);
    try {
      const m = await api<Member>("/api/club/me", { method: "PATCH", body });
      setMember({ ...member, ...m });
      setSaved(done);
      setOpen(null);
    } catch (e) {
      setErrors(e instanceof ApiError && e.field ? { [e.field]: e.message } : { form: e instanceof Error ? e.message : "Couldn't save" });
    } finally {
      setBusy(false);
    }
  };

  const saveContacts = () => {
    const e: Record<string, string> = {};
    if (contacts.phone2.trim() && !normalisePhone(contacts.phone2)) e.phone2 = "Check this number, or leave it empty";
    if (contacts.email.trim() && !isEmail(contacts.email)) e.email = "Check the email, or leave it empty";
    if (!address.country) e.country = "Choose your country";
    else if (address.country === "Uganda" && !address.district) e.district = "Choose your district";
    else if (address.country !== "Uganda" && !address.address.trim()) e.address = "Tell us where you live";
    setErrors(e);
    if (Object.keys(e).length) return;
    void save({ ...contacts, ...address }, "Your details were saved.");
  };

  const saveKin = () => {
    const e: Record<string, string> = {};
    kin.forEach((k, i) => {
      const any = Object.values(k).some((v) => v.trim());
      if (i > 0 && !any) return;
      if (!k.fullName.trim()) e[`nextOfKin.${i}.fullName`] = "Enter the full name";
      if (!k.relationship.trim()) e[`nextOfKin.${i}.relationship`] = "How are you related?";
      if (!normalisePhone(k.phone)) e[`nextOfKin.${i}.phone`] = "Enter a valid phone number";
      if (k.email.trim() && !isEmail(k.email)) e[`nextOfKin.${i}.email`] = "Check the email";
    });
    setErrors(e);
    if (Object.keys(e).length) return;
    void save({ nextOfKin: kin.filter((k, i) => i === 0 || Object.values(k).some((v) => v.trim())) }, "Next of kin saved.");
  };

  const uploadPhoto = async (picked?: File) => {
    if (!picked) return;
    const file = await shrinkImage(picked, 1000);
    const bad = fileOk(file, true);
    if (bad) return setPhotoError(bad);
    setPhotoError(null);
    setPhotoBusy(true);
    const form = new FormData();
    form.append("photo", file);
    try {
      const m = await api<Member>("/api/club/me/photo", { form });
      setMember({ ...member, ...m });
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "Couldn't upload the photo");
    } finally {
      setPhotoBusy(false);
    }
  };

  const place = member.country === "Uganda" ? [member.subCounty, member.county, member.district].filter(Boolean).join(", ") : `${member.address ?? ""}, ${member.country}`;

  return (
    <AppShell title="Settings">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="card flex items-center gap-4 p-4 sm:p-5">
          <button type="button" onClick={() => photoInput.current?.click()} className="relative h-20 w-20 flex-none overflow-hidden rounded-full bg-subtle text-2xl font-semibold text-brand-text" aria-label="Change photo" disabled={photoBusy}>
            {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : initials(member.name)}
            <span className="absolute inset-x-0 bottom-0 flex h-7 items-center justify-center bg-black/45 text-white"><FiCamera className="h-4 w-4" aria-hidden="true" /></span>
          </button>
          <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { void uploadPhoto(e.target.files?.[0]); e.target.value = ""; }} />
          <div className="min-w-0">
            <p className="m-0 truncate text-lg font-semibold">{member.title} {member.name}</p>
            <p className="m-0 font-mono text-sm tracking-wider text-ink-muted">{member.cardNumber ?? "No card number yet"}</p>
            <div className="mt-1.5"><Badge tone={STATUS[member.status].tone}>{STATUS[member.status].label}</Badge></div>
          </div>
        </div>
        {photoBusy && <Alert>Uploading photo…</Alert>}
        {photoError && <Alert tone="error">{photoError}</Alert>}
        {saved && <Alert tone="success">{saved}</Alert>}

        <Section title="Personal details" summary={`${member.idType === "PASSPORT" ? "Passport" : "National ID"} ${member.idNumber}`} open={open === "personal"} onToggle={() => toggle("personal")}>
          <dl className="m-0 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ["Full name", `${member.title} ${member.name}`],
              [member.idType === "PASSPORT" ? "Passport number" : "National ID number", member.idNumber],
              ["Telephone 1", phone(member.phone1)],
              ["Member since", date(member.activatedAt)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs uppercase tracking-wide text-ink-muted">{k}</dt>
                <dd className="m-0 mt-0.5">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="m-0 mt-4 text-sm text-ink-muted">To change your name, ID or main phone number, contact Prof Bioresearch.</p>
        </Section>

        <Section title="Contacts and address" summary={[member.email, place].filter(Boolean).join(" · ")} open={open === "contacts"} onToggle={() => toggle("contacts")}>
          <div className="space-y-4">
            {errors.form && <Alert tone="error">{errors.form}</Alert>}
            <TextInput label="Telephone 2" type="tel" inputMode="tel" value={contacts.phone2} onChange={(v) => setContacts({ ...contacts, phone2: v })} error={errors.phone2} />
            <TextInput label="Email" type="email" inputMode="email" value={contacts.email} onChange={(v) => setContacts({ ...contacts, email: v })} error={errors.email} />
            <TextInput label="Profession / occupation" value={contacts.profession} onChange={(v) => setContacts({ ...contacts, profession: v })} />
            <AddressFields value={address} onChange={setAddress} errors={errors} />
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" onClick={() => setOpen(null)} disabled={busy}>Cancel</Button>
              <Button className="flex-1" onClick={saveContacts} loading={busy}>Save</Button>
            </div>
          </div>
        </Section>

        <Section title="Next of kin" summary={member.nextOfKin?.map((k) => k.fullName).join(", ")} open={open === "kin"} onToggle={() => toggle("kin")}>
          <div className="space-y-4">
            {errors.form && <Alert tone="error">{errors.form}</Alert>}
            <KinEditor value={kin} onChange={setKin} errors={errors} />
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" onClick={() => setOpen(null)} disabled={busy}>Cancel</Button>
              <Button className="flex-1" onClick={saveKin} loading={busy}>Save next of kin</Button>
            </div>
          </div>
        </Section>

        <Section title="Password" summary="Change your password" open={open === "password"} onToggle={() => toggle("password")}>
          <PasswordForm onDone={() => { setOpen(null); setSaved("Password changed. Other devices have been signed out."); }} />
        </Section>

        <section className="card p-4 sm:p-5">
          <p className="m-0 font-semibold">Appearance</p>
          <div role="radiogroup" aria-label="Theme" className="mt-3 grid grid-cols-2 gap-2">
            {(["light", "dark"] as const).map((t) => (
              <button key={t} type="button" role="radio" aria-checked={theme === t} onClick={() => setTheme(t)} className={cx("flex h-12 items-center justify-center gap-2 rounded-xl border font-medium", theme === t ? "border-brand bg-subtle text-brand-text" : "border-line text-ink-muted")}>
                {t === "light" ? <FiSun aria-hidden="true" /> : <FiMoon aria-hidden="true" />} {t === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
        </section>

        <Button variant="secondary" block size="lg" icon={<FiLogOut aria-hidden="true" />} onClick={() => setConfirmOut(true)}>Sign out</Button>
      </div>

      <Modal
        open={confirmOut}
        onClose={() => setConfirmOut(false)}
        title="Sign out?"
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmOut(false)}>Stay</Button>
            <Button className="flex-1" onClick={signOut}>Sign out</Button>
          </>
        }
      >
        <p className="m-0 text-ink-muted">You'll need your phone number or email and password to sign in again.</p>
      </Modal>
    </AppShell>
  );
};

export default Settings;
