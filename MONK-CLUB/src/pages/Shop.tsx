import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiPackage, FiSearch, FiShoppingBag, FiShoppingCart } from "react-icons/fi";
import AppShell from "../components/AppShell";
import Qty from "../components/Qty";
import { Alert, Badge, Button, Spinner, cx } from "../components/ui";
import { api } from "../lib/api";
import { useCart } from "../lib/cart";
import { ugx } from "../lib/format";
import type { Shop as ShopData, ShopItem } from "../lib/types";

// A calm tint per product (no photos yet): same name, same colour.
const TINTS = ["from-[#E8EEFB] to-[#D5E0F7]", "from-[#E6F4EC] to-[#CDEBD9]", "from-[#FDF1E3] to-[#F8E0C2]", "from-[#F3E9FA] to-[#E4D3F3]", "from-[#E5F3F6] to-[#CAE7EE]"];
const tint = (s: string) => TINTS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];

/** Prof Bioresearch products at the club price. */
const Shop = () => {
  const cart = useCart();
  const [data, setData] = useState<ShopData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<number | null>(null);

  useEffect(() => {
    api<ShopData>("/api/club/me/shop").then(setData).catch((e) => setError(e.message));
  }, []);

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data?.items ?? []).filter((i) => (cat === null || i.category?.id === cat) && (!s || `${i.name} ${i.category?.name ?? ""}`.toLowerCase().includes(s)));
  }, [data, q, cat]);

  const cartTotal = cart.lines.reduce((a, l) => a + l.clubPrice * l.qty, 0);

  return (
    <AppShell>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="m-0 font-display text-2xl font-semibold sm:text-3xl">Shop</h1>
          <p className="m-0 mt-1 text-ink-muted">Prof Bioresearch products, delivered to you.</p>
        </div>
        <Link to="/orders" className="text-sm font-semibold text-brand-text no-underline hover:underline">My orders</Link>
      </div>

      {data && data.discountPercent > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-brand-navy to-brand p-4 text-white">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-white/15 font-display text-lg font-bold">{data.discountPercent}%</span>
          <p className="m-0 text-sm"><strong>Club discount.</strong> Every price here already includes your {data.discountPercent}% member discount.</p>
        </div>
      )}

      <div className="sticky top-16 z-20 -mx-4 mb-4 space-y-3 bg-canvas/95 px-4 py-2 backdrop-blur">
        <div className="relative">
          <FiSearch aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" aria-label="Search products" className="control pl-10" />
        </div>
        {!!data?.categories.length && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Categories">
            {[{ id: null as number | null, name: "All" }, ...data.categories].map((c) => (
              <button key={c.id ?? "all"} type="button" role="tab" aria-selected={cat === c.id} onClick={() => setCat(c.id)} className={cx("h-9 flex-none rounded-full px-4 text-sm font-medium", cat === c.id ? "bg-brand text-white" : "border border-line bg-surface text-ink-muted")}>
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {error ? (
        <Alert tone="error">{error}</Alert>
      ) : !data ? (
        <div className="flex justify-center py-16 text-brand"><Spinner className="h-8 w-8" /></div>
      ) : !items.length ? (
        <div className="card flex flex-col items-center p-10 text-center">
          <FiPackage className="h-8 w-8 text-ink-muted" aria-hidden="true" />
          <p className="m-0 mt-3 font-semibold">{data.items.length ? "Nothing matches your search" : "No products yet"}</p>
        </div>
      ) : (
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((i) => <ProductCard key={i.id} item={i} discount={data.discountPercent} />)}
        </ul>
      )}

      {cart.count > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 px-4 pb-3 md:bottom-4">
          <Link to="/cart" className="mx-auto flex h-14 max-w-md items-center gap-3 rounded-2xl bg-brand-navy px-4 text-white no-underline shadow-pop">
            <span className="relative">
              <FiShoppingCart className="h-5 w-5" aria-hidden="true" />
              <span className="absolute -right-2.5 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-brand-navy">{cart.count}</span>
            </span>
            <span className="flex-1 font-semibold">View cart</span>
            <span className="font-semibold tabular-nums">{ugx(cartTotal)}</span>
          </Link>
        </div>
      )}
    </AppShell>
  );
};

const ProductCard = ({ item, discount }: { item: ShopItem; discount: number }) => {
  const cart = useCart();
  const inCart = cart.qtyOf(item.id);
  return (
    <li className="card flex flex-col overflow-hidden">
      <div className={`relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br ${tint(item.name)}`}>
        <span className="font-display text-3xl font-semibold text-brand-navy/70">{item.name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")}</span>
        {!item.inStock && <span className="absolute inset-0 flex items-center justify-center bg-white/60 text-sm font-semibold text-ink dark:bg-black/50">Out of stock</span>}
        {discount > 0 && item.inStock && <span className="absolute left-2 top-2"><Badge tone="brand">−{discount}%</Badge></span>}
      </div>
      <div className="flex flex-1 flex-col p-3">
        {item.category && <p className="m-0 truncate text-[11px] font-medium uppercase tracking-wide text-ink-muted">{item.category.name}</p>}
        <p className="m-0 mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug">{item.name}</p>
        <div className="mt-auto pt-2">
          <p className="m-0 font-display text-lg font-semibold text-brand-text">{ugx(item.clubPrice)}</p>
          {discount > 0 && <p className="m-0 text-xs text-ink-muted line-through">{ugx(item.price)}</p>}
        </div>
        <div className="mt-3">
          {inCart > 0 ? (
            <Qty value={inCart} onChange={(n) => cart.setQty(item.id, n)} label={item.name} size="sm" />
          ) : (
            <Button size="sm" block disabled={!item.inStock} icon={<FiShoppingBag aria-hidden="true" />} onClick={() => cart.add(item)}>Add</Button>
          )}
        </div>
      </div>
    </li>
  );
};

export default Shop;
