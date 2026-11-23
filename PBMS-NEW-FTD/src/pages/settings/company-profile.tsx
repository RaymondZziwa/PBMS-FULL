import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { FiImage, FiRotateCcw, FiSave, FiUpload } from "react-icons/fi";
import { apiRequest, baseURL } from "../../libs/apiConfig";
import { CompanyProfileEndpoints } from "../../endpoints/settings/company_profile/companyProfileEndpoints";
import Button from "../../ui/Button";
import { FieldShell, TextField, CONTROL } from "../../ui/Field";
import { Card, PageHeader, SkeletonRows } from "../../ui/Page";
import { useConfirm } from "../../ui/ConfirmDialog";

type Profile = {
  id?: number;
  name: string;
  email: string;
  tel1: string;
  tel2: string;
  address: string;
  website: string;
  tinNumber: string;
  description: string;
  foundedYear: string;
  industry: string;
  employees: string;
  workHours: string;
  logo?: string | null;
};
const EMPTY: Profile = { name: "", email: "", tel1: "", tel2: "", address: "", website: "", tinNumber: "", description: "", foundedYear: "", industry: "", employees: "", workHours: "8" };
const LABELS: Record<keyof Omit<Profile, "id" | "logo">, string> = {
  name: "Company name", email: "Email", tel1: "Main phone", tel2: "Other phone", address: "Address", website: "Website",
  tinNumber: "TIN", description: "About the company", foundedYear: "Founded", industry: "Industry", employees: "Team size", workHours: "Working hours a day",
};
const fromApi = (d: Record<string, unknown> | null): Profile => {
  if (!d) return EMPTY;
  const s = (k: string) => (d[k] === null || d[k] === undefined ? "" : String(d[k]));
  return { id: Number(d.id) || undefined, name: s("name"), email: s("email"), tel1: s("tel1"), tel2: s("tel2"), address: s("address"), website: s("website"), tinNumber: s("tinNumber"), description: s("description"), foundedYear: s("foundedYear"), industry: s("industry"), employees: s("employees"), workHours: s("workHours") || "8", logo: (d.logo as string) ?? null };
};
const logoUrl = (p?: string | null) => (!p ? "" : p.startsWith("http") || p.startsWith("blob:") ? p : `${baseURL}${p}`);

/** Company details used on receipts, payslips, reports and exported PDFs. */
const CompanyProfile = () => {
  const confirm = useConfirm();
  const [saved, setSaved] = useState<Profile | null>(null);
  const [form, setForm] = useState<Profile>(EMPTY);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof Profile, string>>>({});
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiRequest<Record<string, unknown> | null>("/api/company/profile")
      .then((d) => {
        const p = fromApi(d);
        setSaved(p);
        setForm(p);
      })
      .catch(() => setSaved(EMPTY));
  }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const set = (k: keyof Profile) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const changes = useMemo(() => {
    if (!saved) return [] as string[];
    const list = (Object.keys(LABELS) as (keyof typeof LABELS)[]).filter((k) => form[k].trim() !== saved[k].trim()).map((k) => LABELS[k]);
    if (logoFile) list.push("Logo");
    return list;
  }, [form, saved, logoFile]);

  const pickLogo = (f?: File) => {
    if (!f) return;
    if (!/^image\//.test(f.type)) return setErrors((e) => ({ ...e, logo: "Choose an image file (PNG, JPG, SVG or WebP)." }));
    if (f.size > 3 * 1024 * 1024) return setErrors((e) => ({ ...e, logo: "The logo must be smaller than 3 MB." }));
    setErrors((e) => ({ ...e, logo: undefined }));
    setLogoFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "Enter the company name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter a valid email address.";
    if (form.tel1.replace(/\D/g, "").length < 9) e.tel1 = "Enter a phone number.";
    if (form.tel2 && form.tel2.replace(/\D/g, "").length < 9) e.tel2 = "Check this number, or leave it empty.";
    if (!form.address.trim()) e.address = "Enter the address.";
    const y = Number(form.foundedYear);
    if (form.foundedYear && (!Number.isInteger(y) || y < 1800 || y > new Date().getFullYear())) e.foundedYear = "Enter a year like 2010.";
    const h = Number(form.workHours);
    if (!form.workHours || !(h > 0 && h <= 24)) e.workHours = "Between 1 and 24.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate() || changes.length === 0) return;
    if (saved?.id) {
      const ok = await confirm({
        title: "Save company profile?",
        message: <>This updates <strong>{changes.join(", ")}</strong>. Receipts, payslips and reports use these details from now on.</>,
        confirmLabel: "Save changes",
      });
      if (!ok) return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      (Object.keys(LABELS) as (keyof typeof LABELS)[]).forEach((k) => fd.append(k, form[k].trim()));
      if (logoFile) fd.append("logo", logoFile);
      const res = await apiRequest<{ data: Record<string, unknown> }>(CompanyProfileEndpoints.modify(String(saved?.id ?? 0)), "PATCH", fd);
      const p = fromApi(res.data);
      setSaved(p);
      setForm(p);
      setLogoFile(null);
      setPreview("");
      window.dispatchEvent(new Event("pbms:company-updated")); // let the header/logo refresh
    } catch {
      // error toast shown
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    if (saved) setForm(saved);
    setLogoFile(null);
    setPreview("");
    setErrors({});
  };

  if (!saved) return <div className="mx-auto max-w-4xl"><PageHeader title="Company profile" /><Card><SkeletonRows rows={8} /></Card></div>;
  const shownLogo = preview || logoUrl(form.logo);

  return (
    <form onSubmit={save} noValidate className="mx-auto max-w-4xl font-inter">
      <PageHeader title="Company profile" description="These details appear on receipts, payslips, reports and exported PDFs." />

      <Card className="mb-4 p-4 sm:p-5">
        <h2 className="m-0 mb-4 text-base font-semibold text-brand-ink">Brand</h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-24 w-40 flex-none items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-surface-2 p-2">
            {shownLogo ? <img src={shownLogo} alt="Company logo" className="max-h-full max-w-full object-contain" /> : <FiImage className="h-7 w-7 text-brand-muted" aria-hidden="true" />}
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif" className="sr-only" onChange={(e) => { pickLogo(e.target.files?.[0]); e.target.value = ""; }} />
            <Button variant="secondary" icon={<FiUpload aria-hidden="true" />} onClick={() => fileRef.current?.click()}>
              {shownLogo ? "Change logo" : "Upload logo"}
            </Button>
            <p className="m-0 mt-2 text-xs text-brand-muted">PNG with a transparent background works best on PDFs. Up to 3 MB.</p>
            {errors.logo && <p role="alert" className="m-0 mt-1 text-xs text-[#C0362C]">{errors.logo}</p>}
          </div>
        </div>
      </Card>

      <Card className="mb-4 p-4 sm:p-5">
        <h2 className="m-0 mb-4 text-base font-semibold text-brand-ink">Contact details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField className="sm:col-span-2" label="Company name" required value={form.name} onChange={set("name")} error={errors.name} />
          <TextField label="Email" type="email" required value={form.email} onChange={set("email")} error={errors.email} autoComplete="off" />
          <TextField label="Website" value={form.website} onChange={set("website")} placeholder="www.example.com" />
          <TextField label="Main phone" type="tel" required value={form.tel1} onChange={set("tel1")} error={errors.tel1} placeholder="+256 7…" />
          <TextField label="Other phone" type="tel" value={form.tel2} onChange={set("tel2")} error={errors.tel2} hint="Optional" />
          <TextField className="sm:col-span-2" label="Address" required value={form.address} onChange={set("address")} error={errors.address} placeholder="Plot, street, town" />
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <h2 className="m-0 mb-4 text-base font-semibold text-brand-ink">Business details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="TIN" value={form.tinNumber} onChange={set("tinNumber")} hint="Printed on receipts and invoices" />
          <TextField label="Industry" value={form.industry} onChange={set("industry")} placeholder="e.g. Herbal medicine" />
          <TextField label="Founded" inputMode="numeric" maxLength={4} value={form.foundedYear} onChange={(v) => set("foundedYear")(v.replace(/\D/g, ""))} error={errors.foundedYear} placeholder="2010" />
          <TextField label="Team size" value={form.employees} onChange={set("employees")} placeholder="e.g. 50–100" />
          <TextField label="Working hours a day" inputMode="decimal" value={form.workHours} onChange={(v) => set("workHours")(v.replace(/[^\d.]/g, ""))} error={errors.workHours} hint="Used to work out attendance and overtime" required />
          <FieldShell label="About the company" id="company-about" className="sm:col-span-2">
            <textarea id="company-about" rows={4} value={form.description} onChange={(e) => set("description")(e.target.value)} className={`${CONTROL} h-auto border-line py-2.5`} />
          </FieldShell>
        </div>
      </Card>

      <div className="sticky bottom-0 z-20 -mx-3 mt-4 border-t border-line bg-surface/95 backdrop-blur sm:-mx-4 lg:-mx-6">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <p className="m-0 min-w-0 flex-1 truncate text-sm text-brand-muted" aria-live="polite">
            {changes.length ? `Unsaved: ${changes.join(", ")}` : "All changes saved"}
          </p>
          <Button variant="secondary" icon={<FiRotateCcw aria-hidden="true" />} onClick={reset} disabled={!changes.length || saving}>Discard</Button>
          <Button type="submit" icon={<FiSave aria-hidden="true" />} loading={saving} disabled={!changes.length}>Save</Button>
        </div>
      </div>
    </form>
  );
};

export default CompanyProfile;
