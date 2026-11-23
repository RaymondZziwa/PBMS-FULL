import { useMemo } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { countries } from "../lib/countries";
import { useUganda } from "../lib/useUganda";
import { Button, Select, TextInput } from "./ui";

export type Address = { country: string; district: string; county: string; subCounty: string; address: string };
export type Kin = { fullName: string; relationship: string; address: string; phone: string; email: string; profession: string };
export const emptyKin = (): Kin => ({ fullName: "", relationship: "", address: "", phone: "", email: "", profession: "" });
type Errors = Record<string, string | undefined>;

/** Country, then (for Uganda) district → county → sub-county; elsewhere a typed location. */
export const AddressFields = ({ value, onChange, errors }: { value: Address; onChange: (a: Address) => void; errors: Errors }) => {
  const uganda = value.country === "Uganda";
  const { districts, counties, detailed, loadingCounties } = useUganda(value.district, uganda);
  const countyNames = useMemo(() => counties.map((c) => c.name), [counties]);
  const subCounties = useMemo(() => counties.find((c) => c.name === value.county)?.subCounties ?? [], [counties, value.county]);
  const set = (patch: Partial<Address>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <Select label="Country" required value={value.country} options={countries()} onChange={(country) => set({ country, district: "", county: "", subCounty: "" })} error={errors.country} />
      {uganda ? (
        <>
          <Select label="District" required value={value.district} options={districts} placeholder={districts.length ? "Choose your district" : "Loading…"} onChange={(district) => set({ district, county: "", subCounty: "" })} error={errors.district} allowCustom />
          {detailed && countyNames.length > 0 ? (
            <Select label="County / municipality" value={value.county} options={countyNames} placeholder={loadingCounties ? "Loading…" : "Choose"} onChange={(county) => set({ county, subCounty: "" })} disabled={!value.district} error={errors.county} allowCustom />
          ) : (
            <TextInput label="County / municipality" value={value.county} onChange={(county) => set({ county })} disabled={!value.district} error={errors.county} placeholder="e.g. Kyadondo East" />
          )}
          {detailed && subCounties.length > 0 ? (
            <Select label="Sub-county / town council" value={value.subCounty} options={subCounties} onChange={(subCounty) => set({ subCounty })} disabled={!value.county} error={errors.subCounty} allowCustom />
          ) : (
            <TextInput label="Sub-county / town council" value={value.subCounty} onChange={(subCounty) => set({ subCounty })} disabled={!value.district} error={errors.subCounty} />
          )}
          <TextInput label="Village, street or landmark" value={value.address} onChange={(address) => set({ address })} error={errors.address} maxLength={255} />
        </>
      ) : (
        <TextInput label="Where you live" required value={value.address} onChange={(address) => set({ address })} error={errors.address} placeholder="City, area and street" maxLength={255} disabled={!value.country} />
      )}
    </div>
  );
};

/** Up to four next of kin; the first is required. */
export const KinEditor = ({ value, onChange, errors }: { value: Kin[]; onChange: (k: Kin[]) => void; errors: Errors }) => {
  const set = (i: number, patch: Partial<Kin>) => onChange(value.map((k, j) => (j === i ? { ...k, ...patch } : k)));
  return (
    <div className="space-y-4">
      {value.map((k, i) => {
        const e = (f: keyof Kin) => errors[`nextOfKin.${i}.${f}`];
        const req = i === 0;
        return (
          <section key={i} className="card p-4 sm:p-5" aria-labelledby={`kin-${i}`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 id={`kin-${i}`} className="m-0 font-display text-base font-semibold">
                Next of kin {i + 1} {req ? <span className="text-sm font-normal text-ink-muted">(required)</span> : <span className="text-sm font-normal text-ink-muted">(optional)</span>}
              </h3>
              {i > 0 && (
                <Button variant="ghost" size="sm" icon={<FiTrash2 aria-hidden="true" />} onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Remove next of kin ${i + 1}`}>Remove</Button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextInput fieldClassName="sm:col-span-2" label="Full name" required={req} value={k.fullName} onChange={(v) => set(i, { fullName: v })} error={e("fullName")} autoComplete="off" />
              <TextInput label="Relationship" required={req} value={k.relationship} onChange={(v) => set(i, { relationship: v })} error={e("relationship")} placeholder="e.g. Wife, Brother" />
              <TextInput label="Telephone" required={req} type="tel" inputMode="tel" value={k.phone} onChange={(v) => set(i, { phone: v })} error={e("phone")} placeholder="0772 123456" />
              <TextInput label="Email" type="email" inputMode="email" value={k.email} onChange={(v) => set(i, { email: v })} error={e("email")} />
              <TextInput label="Profession / occupation" value={k.profession} onChange={(v) => set(i, { profession: v })} error={e("profession")} />
              <TextInput fieldClassName="sm:col-span-2" label="Physical address" value={k.address} onChange={(v) => set(i, { address: v })} error={e("address")} />
            </div>
          </section>
        );
      })}
      {value.length < 4 && (
        <Button variant="secondary" block icon={<FiPlus aria-hidden="true" />} onClick={() => onChange([...value, emptyKin()])}>
          Add another next of kin ({value.length}/4)
        </Button>
      )}
    </div>
  );
};
