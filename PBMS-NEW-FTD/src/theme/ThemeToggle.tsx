import { FiMonitor, FiMoon, FiSun } from "react-icons/fi";
import { useTheme, type ThemeChoice } from "./ThemeProvider";

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof FiSun }[] = [
  { value: "light", label: "Light", Icon: FiSun },
  { value: "dark", label: "Dark", Icon: FiMoon },
  { value: "system", label: "Match device", Icon: FiMonitor },
];

/** Three-way switch: light, dark, or follow the device. */
const ThemeToggle = ({ compact = false }: { compact?: boolean }) => {
  const { choice, setChoice } = useTheme();
  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = choice === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            title={label}
            onClick={() => setChoice(value)}
            className={`flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
              active ? "bg-surface text-brand-ink shadow-card" : "text-brand-muted hover:text-brand-ink"
            }`}
          >
            <Icon aria-hidden="true" className="h-3.5 w-3.5" />
            {!compact && <span>{label}</span>}
            {compact && <span className="sr-only">{label}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default ThemeToggle;
