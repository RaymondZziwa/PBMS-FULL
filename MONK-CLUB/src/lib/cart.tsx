import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ShopItem } from "./types";

export type CartLine = { id: number; name: string; price: number; clubPrice: number; qty: number };
type Cart = {
  lines: CartLine[];
  count: number;
  add: (item: ShopItem, qty?: number) => void;
  setQty: (id: number, qty: number) => void;
  remove: (id: number) => void;
  clear: () => void;
  qtyOf: (id: number) => number;
};

const KEY = "monk.cart";
const Ctx = createContext<Cart | null>(null);
const load = (): CartLine[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((l) => l && Number.isInteger(l.id) && l.qty > 0) : [];
  } catch {
    return [];
  }
};

/** The shopping cart, kept in this browser until the order is placed. */
export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [lines, setLines] = useState<CartLine[]>(load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines]);

  const add = useCallback((item: ShopItem, qty = 1) => {
    setLines((ls) => {
      const found = ls.find((l) => l.id === item.id);
      if (found) return ls.map((l) => (l.id === item.id ? { ...l, qty: Math.min(999, l.qty + qty), price: item.price, clubPrice: item.clubPrice } : l));
      return [...ls, { id: item.id, name: item.name, price: item.price, clubPrice: item.clubPrice, qty }];
    });
  }, []);
  const setQty = useCallback((id: number, qty: number) => setLines((ls) => (qty <= 0 ? ls.filter((l) => l.id !== id) : ls.map((l) => (l.id === id ? { ...l, qty: Math.min(999, qty) } : l)))), []);
  const remove = useCallback((id: number) => setLines((ls) => ls.filter((l) => l.id !== id)), []);
  const clear = useCallback(() => setLines([]), []);
  const value = useMemo(
    () => ({ lines, count: lines.reduce((a, l) => a + l.qty, 0), add, setQty, remove, clear, qtyOf: (id: number) => lines.find((l) => l.id === id)?.qty ?? 0 }),
    [lines, add, setQty, remove, clear],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
};
