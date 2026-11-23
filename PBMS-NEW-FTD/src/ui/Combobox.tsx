import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { FiCheck, FiChevronDown, FiSearch, FiX } from "react-icons/fi";
import Popover from "./Popover";
import { CONTROL, controlBorder, FieldShell } from "./Field";

export type ComboOption = { value: string; label: string; hint?: string };

type ComboboxProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  /** Show an × to clear the choice (for filters). */
  clearable?: boolean;
  className?: string;
  /** Hide the label visually (filters in a toolbar). */
  hideLabel?: boolean;
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Dropdown with a search box. Type to filter, ↑/↓ to move, Enter to pick, Esc to close.
 */
const Combobox = ({
  label,
  value,
  onChange,
  options,
  placeholder = "Choose…",
  searchPlaceholder = "Search…",
  emptyText = "Nothing matches",
  error,
  hint,
  required,
  disabled,
  clearable,
  className,
  hideLabel,
}: ComboboxProps) => {
  const id = useId();
  const listId = `${id}-list`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const q = norm(query.trim());
    return q ? options.filter((o) => norm(`${o.label} ${o.hint ?? ""}`).includes(q)) : options;
  }, [options, query]);

  const show = () => {
    if (disabled) return;
    setQuery("");
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };
  const pick = (o: ComboOption) => {
    onChange(o.value);
    close();
  };

  useEffect(() => {
    if (open) requestAnimationFrame(() => searchRef.current?.focus());
  }, [open]);
  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[active]) pick(filtered[active]);
    } else if (e.key === "Escape") {
      // keep the surrounding dialog open
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "Tab") {
      close(false);
    }
  };

  const onTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      show();
    }
  };

  return (
    <FieldShell label={label} required={required} hint={hint} error={error} id={id} className={`${className ?? ""} ${hideLabel ? "[&>label]:sr-only" : ""}`}>
      <div className="relative">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-invalid={!!error || undefined}
          aria-describedby={error || hint ? `${id}-msg` : undefined}
          onClick={() => (open ? close() : show())}
          onKeyDown={onTriggerKey}
          className={`${CONTROL} ${controlBorder(error)} gap-2 pr-9 ${open ? "border-brand shadow-[0_0_0_3px_rgb(57_89_165/0.18)]" : ""}`}
        >
          <span className={`min-w-0 flex-1 truncate ${selected ? "" : "text-brand-muted/80"}`}>{selected ? selected.label : placeholder}</span>
        </button>
        {clearable && selected ? (
          <button
            type="button"
            aria-label={`Clear ${label}`}
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-brand-muted hover:bg-surface-2 hover:text-brand-ink"
          >
            <FiX aria-hidden="true" className="h-4 w-4" />
          </button>
        ) : (
          <FiChevronDown aria-hidden="true" className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </div>

      <Popover open={open} anchorRef={triggerRef} onClose={() => close(false)}>
        <div className="flex flex-none items-center gap-2 border-b border-line px-3">
          <FiSearch aria-hidden="true" className="h-4 w-4 flex-none text-brand-muted" />
          <input
            ref={searchRef}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={filtered[active] ? `${id}-opt-${active}` : undefined}
            aria-label={`Search ${label}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
            placeholder={searchPlaceholder}
            className="themed h-11 min-w-0 flex-1 border-0 bg-transparent text-sm text-brand-ink outline-none placeholder:text-brand-muted/70"
          />
        </div>
        <ul ref={listRef} id={listId} role="listbox" aria-label={label} className="m-0 min-h-0 flex-1 list-none overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-brand-muted">{emptyText}</li>
          ) : (
            filtered.map((o, i) => {
              const isSel = o.value === value;
              return (
                <li
                  key={o.value}
                  id={`${id}-opt-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={isSel}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(o)}
                  className={`flex min-h-[40px] cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm ${i === active ? "bg-subtle" : ""}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate ${isSel ? "font-semibold text-brand-text" : "text-brand-ink"}`}>{o.label}</span>
                    {o.hint && <span className="block truncate text-xs text-brand-muted">{o.hint}</span>}
                  </span>
                  {isSel && <FiCheck aria-hidden="true" className="h-4 w-4 flex-none text-brand-text" />}
                </li>
              );
            })
          )}
        </ul>
      </Popover>
    </FieldShell>
  );
};

export default Combobox;
