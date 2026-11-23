import { useMemo } from "react";
import Combobox from "../../../ui/Combobox";
import useExhibition from "../../../hooks/exhibitions/useExhibition";

type Expo = { id: number | string; name: string; startDate?: string; location?: string };

const useExpoOptions = () => {
  const { data = [] } = useExhibition();
  return useMemo(() => (data as Expo[]).map((e) => ({ value: String(e.id), label: e.name, hint: e.location })), [data]);
};

/** Pick one exhibition (searchable). */
export const ExhibitionFilter = ({ value, onChange, allowAll = true }: { value: string; onChange: (v: string) => void; allowAll?: boolean }) => {
  const options = useExpoOptions();
  return (
    <Combobox
      label="Exhibition"
      value={value}
      onChange={onChange}
      options={allowAll ? [{ value: "", label: "All exhibitions" }, ...options] : options}
      placeholder={allowAll ? "All exhibitions" : "Choose an exhibition"}
      searchPlaceholder="Search exhibitions"
    />
  );
};

/** Pick several exhibitions to compare (none = all). */
export const ExhibitionMultiFilter = ({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) => {
  const options = useExpoOptions();
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <fieldset className="m-0 border-0 p-0 sm:col-span-2 lg:col-span-4">
      <legend className="mb-1.5 text-[13px] font-medium text-ink-soft">Exhibitions to compare <span className="font-normal text-brand-muted">(none chosen = all)</span></legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <button key={o.value} type="button" aria-pressed={on} onClick={() => toggle(o.value)} className={`min-h-[36px] rounded-full border px-3 text-sm ${on ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink-soft hover:border-brand/50"}`}>
              {o.label}
            </button>
          );
        })}
        {value.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="min-h-[36px] px-2 text-sm text-brand-text underline-offset-2 hover:underline">Clear</button>
        )}
        {!options.length && <span className="text-sm text-brand-muted">No exhibitions yet.</span>}
      </div>
    </fieldset>
  );
};

export default ExhibitionFilter;
