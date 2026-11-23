import { useEffect, useMemo, useState } from "react";
import { FiPercent, FiSave } from "react-icons/fi";
import { apiRequest } from "../../libs/apiConfig";
import Button from "../../ui/Button";
import Combobox from "../../ui/Combobox";
import { TextField } from "../../ui/Field";
import { Card, PageHeader, SkeletonRows } from "../../ui/Page";
import { useConfirm } from "../../ui/ConfirmDialog";
import { CLUB } from "./clubApi";

type Settings = { discountPercent: number; storeId: number | null; updatedAt: string | null; stores: Array<{ id: number; name: string }>; mobileMoneyCharge: { percent: number; fixed: number } };
const PRESETS = [0, 10, 20, 30, 40, 50];
const money = (n: number) => `UGX ${Math.round(n).toLocaleString("en-US")}`;

/** Amatugunda Monk Club settings: member discount and the store the marketplace sells from. */
const ClubSettings = () => {
  const confirm = useConfirm();
  const [saved, setSaved] = useState<Settings | null>(null);
  const [discount, setDiscount] = useState("0");
  const [storeId, setStoreId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const apply = (s: Settings) => {
    setSaved(s);
    setDiscount(String(s.discountPercent));
    setStoreId(s.storeId ? String(s.storeId) : "");
  };
  useEffect(() => {
    apiRequest<{ data: Settings }>(CLUB.settings).then((r) => apply(r.data)).catch(() => undefined);
  }, []);

  const d = Number(discount);
  const valid = discount !== "" && Number.isInteger(d) && d >= 0 && d <= 90;
  const dirty = !!saved && (d !== saved.discountPercent || (storeId || null) !== (saved.storeId ? String(saved.storeId) : null));
  const storeOptions = useMemo(() => [{ value: "", label: "Don't check stock (sell every POS item)" }, ...(saved?.stores ?? []).map((s) => ({ value: String(s.id), label: s.name }))], [saved]);

  const save = async () => {
    if (!valid) return setError("Enter a whole number from 0 to 90.");
    if (!saved) return;
    const lines: string[] = [];
    if (d !== saved.discountPercent) lines.push(`Club discount: ${saved.discountPercent}% → ${d}%`);
    if ((storeId || null) !== (saved.storeId ? String(saved.storeId) : null)) lines.push(`Marketplace store: ${storeOptions.find((o) => o.value === (saved.storeId ? String(saved.storeId) : ""))?.label} → ${storeOptions.find((o) => o.value === storeId)?.label}`);
    const ok = await confirm({
      title: "Save club settings?",
      message: "Prices in the members' shop change straight away. Orders already placed keep their discount.",
      details: <ul className="m-0 list-disc pl-5">{lines.map((l) => <li key={l}>{l}</li>)}</ul>,
      confirmLabel: "Save",
    });
    if (!ok) return;
    setSaving(true);
    try {
      const r = await apiRequest<{ data: Settings }>(CLUB.settings, "PUT", "", { discountPercent: d, storeId: storeId ? Number(storeId) : null });
      apply(r.data);
    } catch {
      // toast shown
    } finally {
      setSaving(false);
    }
  };

  const example = 100000;
  return (
    <div className="mx-auto max-w-3xl font-inter">
      <PageHeader title="Club settings" description="Amatugunda Monk Club marketplace: the member discount and where stock comes from." />
      {!saved ? (
        <Card><SkeletonRows rows={5} /></Card>
      ) : (
        <div className="space-y-4">
          <Card className="p-4 sm:p-5">
            <h2 className="m-0 flex items-center gap-2 text-base font-semibold text-brand-ink"><FiPercent aria-hidden="true" className="text-brand-text" /> Club discount</h2>
            <p className="m-0 mt-1 text-sm text-brand-muted">Members get this much off every product in the shop.</p>
            <div role="radiogroup" aria-label="Discount" className="mt-4 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button key={p} type="button" role="radio" aria-checked={d === p} onClick={() => { setDiscount(String(p)); setError(null); }} className={`h-10 min-w-[64px] rounded-lg border px-3 text-sm font-semibold ${d === p ? "border-brand bg-brand text-white" : "border-line bg-surface text-brand-ink hover:border-brand/50"}`}>
                  {p === 0 ? "None" : `${p}%`}
                </button>
              ))}
            </div>
            <div className="mt-4 max-w-[220px]">
              <TextField label="Or any other percentage" inputMode="numeric" value={discount} onChange={(v) => { setDiscount(v.replace(/\D/g, "").slice(0, 2)); setError(null); }} trailing={<span className="pr-3 text-sm text-brand-muted">%</span>} error={error} hint="0 to 90" />
            </div>
            {valid && (
              <p className="m-0 mt-4 rounded-lg bg-surface-2 px-3 py-2.5 text-sm text-ink-soft">
                Example: a product priced {money(example)} costs members <strong className="text-brand-ink">{money(example * (1 - d / 100))}</strong>.
              </p>
            )}
          </Card>

          <Card className="p-4 sm:p-5">
            <h2 className="m-0 text-base font-semibold text-brand-ink">Marketplace store</h2>
            <p className="m-0 mt-1 text-sm text-brand-muted">Products marked "show in POS" are sold in the shop. Choose the store whose stock decides what's available.</p>
            <div className="mt-4 max-w-md">
              <Combobox label="Store" value={storeId} onChange={setStoreId} options={storeOptions} searchPlaceholder="Search stores" />
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <h2 className="m-0 text-base font-semibold text-brand-ink">Mobile money service charge</h2>
            <p className="m-0 mt-1 text-sm text-brand-muted">
              Members paying by mobile money pay {saved.mobileMoneyCharge.percent}% + {money(saved.mobileMoneyCharge.fixed)} on top, shown to them as one "service charge". This is set on the server (CLUB_MARZ_FEE_PERCENT and CLUB_SERVICE_FEE).
            </p>
          </Card>

          <div className="sticky bottom-0 z-20 -mx-3 flex items-center gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-4 lg:-mx-6">
            <p className="m-0 flex-1 text-sm text-brand-muted">{dirty ? "You have unsaved changes." : saved.updatedAt ? `Last saved ${new Date(saved.updatedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "Not saved yet"}</p>
            <Button variant="secondary" onClick={() => apply(saved)} disabled={!dirty || saving}>Discard</Button>
            <Button icon={<FiSave aria-hidden="true" />} onClick={save} loading={saving} disabled={!dirty}>Save</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubSettings;
