import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiCamera, FiCheckCircle, FiFile, FiPaperclip, FiTrash2, FiUser } from "react-icons/fi";
import AuthLayout from "../components/AuthLayout";
import { AddressFields, emptyKin, KinEditor, type Address, type Kin } from "../components/ProfileParts";
import { Alert, Button, Checkbox, Chips, TextInput } from "../components/ui";
import { api, ApiError } from "../lib/api";
import { phone as fmtPhone } from "../lib/format";
import { fileOk, isEmail, normalisePhone } from "../lib/validate";
import { shrinkImage } from "../lib/images";

const TITLES = ["Hon", "Dr", "Prof", "Mr", "Mrs", "Ms"];
const STEPS = ["Photo", "About you", "Where you live", "Contacts", "Next of kin", "Documents", "Confirm"] as const;
const DRAFT = "monk.registration";

type Form = {
  title: string;
  surname: string;
  firstName: string;
  otherName: string;
  idType: "NATIONAL_ID" | "PASSPORT" | "";
  idNumber: string;
  profession: string;
  address: Address;
  phone1: string;
  phone2: string;
  email: string;
  nextOfKin: Kin[];
};
type Doc = { file: File; label: string };
type Errors = Record<string, string | undefined>;

const empty: Form = {
  title: "",
  surname: "",
  firstName: "",
  otherName: "",
  idType: "",
  idNumber: "",
  profession: "",
  address: { country: "Uganda", district: "", county: "", subCounty: "", address: "" },
  phone1: "",
  phone2: "",
  email: "",
  nextOfKin: [emptyKin()],
};

/** Which step a field (from the API) belongs to. */
const stepOf = (field: string) =>
  field === "photo" ? 0
  : ["title", "surname", "firstName", "otherName", "idType", "idNumber", "profession"].includes(field) ? 1
  : ["country", "district", "county", "subCounty", "address"].includes(field) ? 2
  : ["phone1", "phone2", "email"].includes(field) ? 3
  : field.startsWith("nextOfKin") ? 4
  : field === "attachments" ? 5
  : 6;

const validate = (step: number, f: Form, docs: Doc[], agree: boolean): Errors => {
  const e: Errors = {};
  if (step === 1) {
    if (!f.title) e.title = "Choose a title";
    if (!f.surname.trim()) e.surname = "Enter your surname";
    if (!f.firstName.trim()) e.firstName = "Enter your first name";
    if (!f.idType) e.idType = "Choose National ID or Passport";
    const id = f.idNumber.replace(/\s+/g, "").toUpperCase();
    if (id.length < 5) e.idNumber = "Enter the number on your document";
    else if (f.idType === "NATIONAL_ID" && !/^[A-Z0-9]{14}$/.test(id)) e.idNumber = "A National ID number (NIN) has 14 letters and numbers";
  }
  if (step === 2) {
    if (!f.address.country) e.country = "Choose your country";
    else if (f.address.country === "Uganda" && !f.address.district) e.district = "Choose your district";
    else if (f.address.country !== "Uganda" && !f.address.address.trim()) e.address = "Tell us where you live";
  }
  if (step === 3) {
    if (!normalisePhone(f.phone1)) e.phone1 = "Enter a valid number, e.g. 0772 123456 (or +254… outside Uganda)";
    if (f.phone2.trim() && !normalisePhone(f.phone2)) e.phone2 = "Check this number, or leave it empty";
    else if (f.phone2.trim() && normalisePhone(f.phone2) === normalisePhone(f.phone1)) e.phone2 = "This is the same as telephone 1";
    if (f.email.trim() && !isEmail(f.email)) e.email = "Check the email, or leave it empty";
  }
  if (step === 4) {
    f.nextOfKin.forEach((k, i) => {
      const any = Object.values(k).some((v) => v.trim());
      if (i > 0 && !any) return;
      if (!k.fullName.trim()) e[`nextOfKin.${i}.fullName`] = "Enter the full name";
      if (!k.relationship.trim()) e[`nextOfKin.${i}.relationship`] = "How are you related?";
      if (!normalisePhone(k.phone)) e[`nextOfKin.${i}.phone`] = "Enter a valid phone number";
      if (k.email.trim() && !isEmail(k.email)) e[`nextOfKin.${i}.email`] = "Check the email";
    });
  }
  if (step === 5 && !docs.length) e.attachments = "Attach a copy of your National ID or passport";
  if (step === 6 && !agree) e.agree = "Please confirm before sending";
  return e;
};

const loadDraft = (): Form => {
  try {
    const d = JSON.parse(sessionStorage.getItem(DRAFT) ?? "null");
    return d ? { ...empty, ...d, address: { ...empty.address, ...d.address }, nextOfKin: d.nextOfKin?.length ? d.nextOfKin : [emptyKin()] } : empty;
  } catch {
    return empty;
  }
};

/** Apply to join, one short step at a time. */
const Register = () => {
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(loadDraft);
  const [photo, setPhoto] = useState<File | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const top = useRef<HTMLHeadingElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const docInput = useRef<HTMLInputElement>(null);
  const photoUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);

  // Keep typed answers if the page reloads (files can't be kept).
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT, JSON.stringify(f));
    } catch {
      /* ignore */
    }
  }, [f]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const go = (n: number) => {
    setStep(n);
    setFormError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => top.current?.focus(), 50);
  };

  const next = () => {
    const e = validate(step, f, docs, agree);
    setErrors(e);
    if (Object.keys(e).length) {
      setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')?.focus?.(), 30);
      return;
    }
    if (step < STEPS.length - 1) go(step + 1);
    else void submit();
  };

  const pickPhoto = async (picked?: File) => {
    if (!picked) return;
    // Phone photos are large: shrink before checking the 5 MB limit.
    const file = await shrinkImage(picked, 1000);
    const bad = fileOk(file, true);
    if (bad) return setErrors({ photo: bad });
    setErrors({});
    setPhoto(file);
  };

  const addDocs = async (files: FileList | null) => {
    if (!files) return;
    const list = await Promise.all([...files].map((x) => shrinkImage(x)));
    const bad = list.map((x) => fileOk(x)).find(Boolean);
    if (bad) return setErrors({ attachments: bad });
    setErrors({});
    setDocs((d) =>
      [...d, ...list.map((file, i) => ({ file, label: d.length + i === 0 ? (f.idType === "PASSPORT" ? "Passport" : "National ID") : "" }))].slice(0, 6),
    );
  };

  const submit = async () => {
    setBusy(true);
    setFormError(null);
    const body = {
      title: f.title,
      surname: f.surname,
      firstName: f.firstName,
      otherName: f.otherName,
      idType: f.idType,
      idNumber: f.idNumber.replace(/\s+/g, "").toUpperCase(),
      profession: f.profession,
      ...f.address,
      phone1: f.phone1,
      phone2: f.phone2,
      email: f.email,
      nextOfKin: f.nextOfKin.filter((k, i) => i === 0 || Object.values(k).some((v) => v.trim())),
      attachmentLabels: docs.map((d, i) => d.label.trim() || (i === 0 ? "ID / passport" : `Attachment ${i + 1}`)),
      agree: true,
    };
    const form = new FormData();
    form.append("data", JSON.stringify(body));
    if (photo) form.append("photo", photo);
    docs.forEach((d) => form.append("attachments", d.file));
    try {
      const r = await api<{ name: string }>("/api/club/register", { form, auth: false });
      sessionStorage.removeItem(DRAFT);
      setDone(r?.name ?? f.firstName);
    } catch (err) {
      if (err instanceof ApiError && err.field) {
        setErrors({ [err.field]: err.message });
        go(stepOf(err.field));
      } else setFormError(err instanceof Error ? err.message : "Couldn't send your application");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    const contact = f.email.trim() ? `by email at ${f.email.trim()}` : `by SMS on ${fmtPhone(normalisePhone(f.phone1))}`;
    return (
      <AuthLayout>
        <div className="text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-good dark:bg-green-950"><FiCheckCircle className="h-8 w-8" aria-hidden="true" /></span>
          <h1 className="m-0 mt-5 font-display text-3xl font-semibold">Application sent</h1>
          <p className="m-0 mt-3 text-ink-muted">Thank you, {f.firstName}. Your application is <strong className="text-ink">waiting for approval</strong>. We'll let you know {contact}.</p>
          <p className="m-0 mt-3 text-ink-muted">Once approved, you'll receive a temporary password to sign in and pay the registration fee.</p>
          <Link to="/login" className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand font-semibold text-white no-underline">Go to sign in</Link>
        </div>
      </AuthLayout>
    );
  }

  const pct = Math.round(((step + 1) / STEPS.length) * 100);
  const docLabel = f.idType === "PASSPORT" ? "passport" : "National ID";

  return (
    <AuthLayout wide>
      <div className="mb-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-brand-text">Step {step + 1} of {STEPS.length}</span>
          <span className="text-ink-muted">{STEPS[step]}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Application progress">
          <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <h1 ref={top} tabIndex={-1} className="m-0 font-display text-2xl font-semibold outline-none sm:text-3xl">
        {["Add your photo", "Tell us about you", "Where do you live?", "How can we reach you?", "Next of kin", "Your documents", "Check and send"][step]}
      </h1>
      <p className="m-0 mt-1.5 text-ink-muted">
        {[
          "It goes on your membership card. You can skip this and add it later.",
          "As it appears on your ID or passport.",
          "Choose your country first.",
          "You'll sign in with your phone number or email.",
          "At least one person we can contact. You can add up to four.",
          `A clear copy of your ${docLabel}. Photos or PDFs, up to 5 MB each.`,
          "Make sure everything is right before sending.",
        ][step]}
      </p>

      <div className="mt-6 flex-1 space-y-4">
        {formError && <Alert tone="error">{formError}</Alert>}

        {step === 0 && (
          <div className="flex flex-col items-center gap-4 py-4">
            <button type="button" onClick={() => photoInput.current?.click()} className="group relative h-36 w-36 overflow-hidden rounded-full border-2 border-dashed border-line bg-surface hover:border-brand" aria-label={photo ? "Change photo" : "Add photo"}>
              {photoUrl ? <img src={photoUrl} alt="Your photo" className="h-full w-full object-cover" /> : <FiUser className="mx-auto h-14 w-14 text-ink-muted" aria-hidden="true" />}
              <span className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white shadow"><FiCamera aria-hidden="true" /></span>
            </button>
            <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" capture="user" className="sr-only" onChange={(e) => { void pickPhoto(e.target.files?.[0]); e.target.value = ""; }} />
            <div className="flex gap-2">
              <Button variant="secondary" icon={<FiCamera aria-hidden="true" />} onClick={() => photoInput.current?.click()}>{photo ? "Change photo" : "Take or choose a photo"}</Button>
              {photo && <Button variant="ghost" onClick={() => setPhoto(null)}>Remove</Button>}
            </div>
            {errors.photo && <Alert tone="error">{errors.photo}</Alert>}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Chips label="Title" required value={f.title} onChange={(v) => set("title", v)} options={TITLES.map((t) => ({ value: t, label: t }))} error={errors.title} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextInput label="Surname" required value={f.surname} onChange={(v) => set("surname", v)} error={errors.surname} autoComplete="family-name" />
              <TextInput label="First name" required value={f.firstName} onChange={(v) => set("firstName", v)} error={errors.firstName} autoComplete="given-name" />
              <TextInput fieldClassName="sm:col-span-2" label="Other name" value={f.otherName} onChange={(v) => set("otherName", v)} autoComplete="additional-name" />
            </div>
            <Chips label="Identification" required value={f.idType} onChange={(v) => set("idType", v as Form["idType"])} options={[{ value: "NATIONAL_ID", label: "National ID" }, { value: "PASSPORT", label: "Passport" }]} error={errors.idType} />
            {f.idType && (
              <TextInput
                label={f.idType === "PASSPORT" ? "Passport number" : "National ID number (NIN)"}
                required
                value={f.idNumber}
                onChange={(v) => set("idNumber", v.toUpperCase())}
                error={errors.idNumber}
                autoCapitalize="characters"
                maxLength={40}
                placeholder={f.idType === "NATIONAL_ID" ? "e.g. CM90012345ABCD" : ""}
              />
            )}
            <TextInput label="Profession / occupation" value={f.profession} onChange={(v) => set("profession", v)} placeholder="e.g. Farmer, Teacher" />
          </div>
        )}

        {step === 2 && <AddressFields value={f.address} onChange={(a) => (setF((x) => ({ ...x, address: a })), setErrors({}))} errors={errors} />}

        {step === 3 && (
          <div className="space-y-4">
            <TextInput label="Telephone 1" required type="tel" inputMode="tel" autoComplete="tel" value={f.phone1} onChange={(v) => set("phone1", v)} error={errors.phone1} placeholder="0772 123456" hint="You'll use this number to sign in." />
            <TextInput label="Telephone 2" type="tel" inputMode="tel" value={f.phone2} onChange={(v) => set("phone2", v)} error={errors.phone2} />
            <TextInput label="Email address" type="email" inputMode="email" autoComplete="email" value={f.email} onChange={(v) => set("email", v)} error={errors.email} hint="If you have one: we'll send updates there. Otherwise by SMS." />
          </div>
        )}

        {step === 4 && <KinEditor value={f.nextOfKin} onChange={(k) => (setF((x) => ({ ...x, nextOfKin: k })), setErrors({}))} errors={errors} />}

        {step === 5 && (
          <div className="space-y-3">
            {docs.map((d, i) => (
              <div key={i} className="card flex items-center gap-3 p-3">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-subtle text-brand-text"><FiFile aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <input
                    value={d.label}
                    onChange={(e) => setDocs((x) => x.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))}
                    placeholder={i === 0 ? `${docLabel} copy` : "What is this? e.g. Passport photo page"}
                    aria-label={`Name for ${d.file.name}`}
                    className="h-9 w-full rounded-lg bg-transparent px-1 font-medium outline-none focus:bg-surface-2"
                  />
                  <p className="m-0 truncate px-1 text-xs text-ink-muted">{d.file.name} · {(d.file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <button type="button" onClick={() => setDocs((x) => x.filter((_, j) => j !== i))} aria-label={`Remove ${d.file.name}`} className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-bad"><FiTrash2 aria-hidden="true" /></button>
              </div>
            ))}
            {docs.length < 6 && (
              <button type="button" onClick={() => docInput.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line bg-surface p-6 text-center hover:border-brand">
                <FiPaperclip className="h-6 w-6 text-brand-text" aria-hidden="true" />
                <span className="font-semibold">{docs.length ? "Add another file" : `Attach your ${docLabel}`}</span>
                <span className="text-sm text-ink-muted">Take a photo or choose a file</span>
              </button>
            )}
            <input ref={docInput} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => { const fl = e.target.files; void addDocs(fl).then(() => { e.target.value = ""; }); }} />
            {errors.attachments && <Alert tone="error">{errors.attachments}</Alert>}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <div className="card divide-y divide-line">
              {[
                ["Name", `${f.title} ${f.firstName} ${f.otherName} ${f.surname}`.replace(/\s+/g, " "), 1],
                [f.idType === "PASSPORT" ? "Passport" : "National ID", f.idNumber.toUpperCase(), 1],
                ["Profession", f.profession || "—", 1],
                ["Lives in", f.address.country === "Uganda" ? [f.address.address, f.address.subCounty, f.address.county, f.address.district, "Uganda"].filter(Boolean).join(", ") : `${f.address.address}, ${f.address.country}`, 2],
                ["Telephone", [f.phone1, f.phone2].filter(Boolean).join(" / "), 3],
                ["Email", f.email || "—", 3],
                ["Next of kin", f.nextOfKin.filter((k) => k.fullName.trim()).map((k) => `${k.fullName} (${k.relationship})`).join(", "), 4],
                ["Documents", docs.map((d) => d.label || d.file.name).join(", "), 5],
                ["Photo", photo ? "Added" : "Not added (you can add it later)", 0],
              ].map(([k, v, s]) => (
                <div key={k as string} className="flex items-start gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-xs font-medium uppercase tracking-wide text-ink-muted">{k}</p>
                    <p className="m-0 mt-0.5 break-words text-[15px]">{v}</p>
                  </div>
                  <button type="button" onClick={() => go(s as number)} className="h-9 flex-none rounded-lg px-2 text-sm font-medium text-brand-text hover:bg-subtle">Edit</button>
                </div>
              ))}
            </div>
            <Checkbox checked={agree} onChange={(v) => (setAgree(v), setErrors({}))} error={errors.agree}>
              I confirm that the information I have given is correct and true, and I agree to abide by the{" "}
              <Link to="/terms" target="_blank" className="font-semibold text-brand-text">terms and conditions</Link> governing the Amatugunda Monk Club programme.
            </Checkbox>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 -mx-4 mt-8 flex gap-3 border-t border-line bg-canvas/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0">
        {step > 0 ? (
          <Button variant="secondary" size="lg" icon={<FiArrowLeft aria-hidden="true" />} onClick={() => go(step - 1)} disabled={busy} aria-label="Back">
            <span className="hidden sm:inline">Back</span>
          </Button>
        ) : (
          <Link to="/login" className="inline-flex h-[52px] items-center rounded-xl px-4 font-semibold text-brand-text no-underline hover:bg-subtle">Sign in instead</Link>
        )}
        <Button size="lg" className="flex-1" onClick={next} loading={busy}>
          {step === 0 && !photo ? "Skip for now" : step === STEPS.length - 1 ? "Send application" : "Continue"}
        </Button>
      </div>
    </AuthLayout>
  );
};

export default Register;
