import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FiPackage, FiSearch } from "react-icons/fi";
import { ugx } from "../../../ui/Page";

export type CatalogItem = {
  key: string;
  name: string;
  price: number;
  category?: string;
  barcode?: string;
  /** Stock on hand; undefined for services. */
  stock?: number;
  unitAbr?: string;
};

type CatalogGridProps = {
  items: CatalogItem[];
  onAdd: (key: string) => void;
  /** How many of each item are already in the cart (shows a badge). */
  inCart?: Record<string, number>;
  loading?: boolean;
  toolbar?: ReactNode;
  searchPlaceholder?: string;
  emptyText?: string;
};

const PAGE = 48;

/**
 * Products/services to tap. Search by name or barcode; pressing Enter adds an
 * exact barcode match (works with barcode scanners) or the only result.
 */
const CatalogGrid = ({ items, onAdd, inCart = {}, loading, toolbar, searchPlaceholder = "Search by name or scan a barcode", emptyText = "Nothing to sell here yet" }: CatalogGridProps) => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [limit, setLimit] = useState(PAGE);
  const searchRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(() => Array.from(new Set(items.map((i) => i.category).filter(Boolean) as string[])).sort(), [items]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => (category === "all" || i.category === category) && (!q || i.name.toLowerCase().includes(q) || (i.barcode ?? "").includes(q)));
  }, [items, query, category]);
  useEffect(() => setLimit(PAGE), [query, category]);

  // "/" jumps to search, like most tills.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const add = (key: string) => {
    onAdd(key);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-none flex-col gap-2 pb-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <FiSearch aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
          <input
            ref={searchRef}
            type="search"
            aria-label="Search products"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const q = query.trim();
              if (!q) return;
              const byCode = items.find((i) => i.barcode && i.barcode === q);
              const pick = byCode ?? (filtered.length === 1 ? filtered[0] : undefined);
              if (pick) {
                add(pick.key);
                setQuery("");
              }
            }}
            placeholder={searchPlaceholder}
            className="themed h-11 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-[15px] text-brand-ink outline-none placeholder:text-brand-muted/70 focus:border-brand focus:shadow-[0_0_0_3px_rgb(57_89_165/0.18)]"
          />
        </div>
        {toolbar}
      </div>

      {categories.length > 0 && (
        <div role="tablist" aria-label="Categories" className="-mx-1 mb-3 flex flex-none gap-1.5 overflow-x-auto px-1 pb-1">
          {["all", ...categories].map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={category === c}
              onClick={() => setCategory(c)}
              className={`h-8 flex-none whitespace-nowrap rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
                category === c ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink-soft hover:border-brand hover:text-brand-text"
              }`}
            >
              {c === "all" ? "All" : c}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {loading && items.length === 0 ? (
          <div aria-hidden="true" className="grid grid-cols-2 gap-2.5 md:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-[104px] animate-pulse rounded-xl bg-surface" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span aria-hidden="true" className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-subtle text-brand-text">
              <FiPackage className="h-5 w-5" />
            </span>
            <p className="m-0 font-medium text-brand-ink">{items.length === 0 ? emptyText : "No matches"}</p>
            {items.length > 0 && <p className="m-0 mt-1 text-sm text-brand-muted">Try another name, barcode or category.</p>}
          </div>
        ) : (
          <>
            <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 md:grid-cols-3 2xl:grid-cols-4">
              {filtered.slice(0, limit).map((i) => {
                const out = i.stock !== undefined && i.stock <= 0;
                const low = i.stock !== undefined && i.stock > 0 && i.stock <= 5;
                const n = inCart[i.key];
                return (
                  <li key={i.key}>
                    <button
                      type="button"
                      onClick={() => add(i.key)}
                      className={`group relative flex h-full min-h-[104px] w-full flex-col rounded-xl border bg-surface p-3 text-left shadow-card transition-[border-color,transform] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand active:scale-[0.98] ${
                        n ? "border-brand" : "border-line hover:border-brand/60"
                      }`}
                    >
                      {n ? (
                        <span className="absolute right-2 top-2 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-brand px-1.5 text-xs font-semibold text-white">{n}</span>
                      ) : null}
                      <span className="line-clamp-2 pr-7 text-sm font-medium leading-snug text-brand-ink">{i.name}</span>
                      {i.category && <span className="mt-0.5 truncate text-[11px] text-brand-muted">{i.category}</span>}
                      <span className="mt-auto flex items-end justify-between gap-2 pt-2">
                        <span className="font-display text-[15px] font-semibold tabular-nums text-brand-ink">{ugx(i.price)}</span>
                        {i.stock !== undefined && (
                          <span className={`whitespace-nowrap text-[11px] font-medium ${out ? "text-[#B42318] dark:text-[#F2A29A]" : low ? "text-[#93600A] dark:text-[#F0CF85]" : "text-[#1E7B43] dark:text-[#8FD6A8]"}`}>
                            {out ? "Out of stock" : `${i.stock.toLocaleString("en-UG")} ${i.unitAbr ?? ""}`}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {filtered.length > limit && (
              <div className="py-4 text-center">
                <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="h-10 rounded-lg border border-line bg-surface px-4 text-sm font-medium text-ink-soft hover:bg-surface-2">
                  Show more ({filtered.length - limit} left)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CatalogGrid;
