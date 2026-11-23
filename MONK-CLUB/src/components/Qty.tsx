import { FiMinus, FiPlus } from "react-icons/fi";

/** − 2 + stepper; typing a number works too. */
const Qty = ({ value, onChange, label, size = "md" }: { value: number; onChange: (n: number) => void; label: string; size?: "sm" | "md" }) => {
  const h = size === "sm" ? "h-9" : "h-11";
  return (
    <div className={`inline-flex ${h} items-center overflow-hidden rounded-xl border border-line bg-surface`}>
      <button type="button" aria-label={`One less ${label}`} onClick={() => onChange(value - 1)} className={`flex ${h} w-10 items-center justify-center text-ink-muted hover:bg-surface-2 hover:text-ink`}>
        <FiMinus aria-hidden="true" />
      </button>
      <input
        aria-label={`Quantity of ${label}`}
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className="w-10 bg-transparent text-center font-semibold tabular-nums outline-none"
      />
      <button type="button" aria-label={`One more ${label}`} onClick={() => onChange(value + 1)} className={`flex ${h} w-10 items-center justify-center text-ink-muted hover:bg-surface-2 hover:text-ink`}>
        <FiPlus aria-hidden="true" />
      </button>
    </div>
  );
};

export default Qty;
