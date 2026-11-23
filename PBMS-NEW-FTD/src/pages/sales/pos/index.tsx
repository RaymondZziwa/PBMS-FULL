import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { FiMapPin } from "react-icons/fi";
import useStores from "../../../hooks/inventory/useStores";
import useStoreInventory from "../../../hooks/inventory/useStoreInventory";
import type { ICartItem } from "../../../redux/types/sales";
import type { IStockStore } from "../../../redux/types/inventory";
import type { RootState } from "../../../redux/store";
import Button from "../../../ui/Button";
import PosShell from "../shared/PosShell";
import CatalogGrid, { type CatalogItem } from "../shared/CatalogGrid";
import CartPanel, { type CartLine } from "../shared/CartPanel";
import StorePicker from "../shared/StorePicker";
import CheckoutModal from "./checkoutModal";

const STORE_KEY = "posStore";
const CART_KEY = "posCart";
const DAY = 24 * 60 * 60 * 1000;

type SavedStore = { storeId: number; storeName: string; timestamp: number };

const lineKey = (id: string | number, unitId: string | number) => `${id}-${unitId}`;
const money = (n: number) => Math.max(0, Math.round(n * 100) / 100);

const readStore = (): SavedStore | null => {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null") as SavedStore | null;
    return s && Date.now() - s.timestamp < DAY ? s : null;
  } catch {
    return null;
  }
};
const readCart = (): ICartItem[] => {
  try {
    const c = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
    return Array.isArray(c) ? c : [];
  } catch {
    return [];
  }
};

/** Point of sale for products, sold from one store at a time. */
const PointOfSale = () => {
  const user = useSelector((state: RootState) => state.userAuth.data);
  const { data: stores } = useStores();
  const [store, setStore] = useState<SavedStore | null>(readStore);
  const [pickStore, setPickStore] = useState(() => !readStore());
  const { data: stock, loading, refresh: reloadStock } = useStoreInventory(store ? String(store.storeId) : "");
  const [cart, setCart] = useState<ICartItem[]>(readCart);
  const [checkout, setCheckout] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* storage full: cart still works for this visit */
    }
  }, [cart]);

  const myStores = useMemo(
    () => (stores ?? []).filter((s) => (s.authorizedPersonnel ?? []).map(Number).includes(Number(user?.id))),
    [stores, user?.id],
  );

  const rows: IStockStore[] = useMemo(() => (stock ?? []).filter((r: IStockStore) => r?.item?.showInPos === true), [stock]);
  const byKey = useMemo(() => new Map(rows.map((r) => [lineKey(r.item.id, r.unit.id), r])), [rows]);

  const catalog: CatalogItem[] = useMemo(
    () =>
      rows.map((r) => ({
        key: lineKey(r.item.id, r.unit.id),
        name: r.item.name,
        price: Number(r.item.price),
        category: r.item.category?.name,
        barcode: r.item.barcode ? String(r.item.barcode) : undefined,
        stock: Number(r.qty),
        unitAbr: r.unit?.abr,
      })),
    [rows],
  );

  const pick = (s: { id: number | string; name: string }) => {
    const saved = { storeId: Number(s.id), storeName: s.name, timestamp: Date.now() };
    localStorage.setItem(STORE_KEY, JSON.stringify(saved));
    if (store && store.storeId !== saved.storeId && cart.length) {
      toast.info("Cart kept. Check the items are stocked in the new store.");
    }
    setStore(saved);
    setPickStore(false);
  };

  const add = (key: string) => {
    const r = byKey.get(key);
    if (!r) return;
    setCart((prev) => {
      const existing = prev.find((c) => lineKey(c.id, c.unitId) === key);
      if (existing) {
        return prev.map((c) => (c === existing ? { ...c, quantity: c.quantity + 1, total: money((c.quantity + 1) * Number(c.price) - (c.discount || 0)) } : c));
      }
      return [...prev, { ...r.item, price: Number(r.item.price), quantity: 1, discount: 0, total: Number(r.item.price), unitId: Number(r.unit.id) } as ICartItem];
    });
  };

  const setQty = (key: string, quantity: number) =>
    setCart((prev) =>
      prev.map((c) => {
        if (lineKey(c.id, c.unitId) !== key) return c;
        const discount = Math.min(c.discount || 0, c.price * quantity);
        return { ...c, quantity, discount, total: money(c.price * quantity - discount) };
      }),
    );
  const setDiscount = (key: string, discount: number) =>
    setCart((prev) => prev.map((c) => (lineKey(c.id, c.unitId) === key ? { ...c, discount, total: money(c.price * c.quantity - discount) } : c)));
  const remove = (key: string) => setCart((prev) => prev.filter((c) => lineKey(c.id, c.unitId) !== key));

  const total = cart.reduce((a, c) => a + Number(c.total), 0);
  const lines: CartLine[] = cart.map((c) => {
    const key = lineKey(c.id, c.unitId);
    const r = byKey.get(key);
    return { key, name: c.name, price: Number(c.price), quantity: c.quantity, discount: c.discount || 0, total: Number(c.total), unitAbr: r?.unit?.abr, available: r ? Number(r.qty) : undefined };
  });
  const inCart = Object.fromEntries(lines.map((l) => [l.key, l.quantity]));

  const cartPanel = (close?: () => void) => (
    <CartPanel
      lines={lines}
      total={total}
      decimals
      onQuantity={setQty}
      onDiscount={setDiscount}
      onRemove={remove}
      onClear={() => setCart([])}
      onCheckout={() => {
        close?.();
        setCheckout(true);
      }}
      onClose={close}
    />
  );

  return (
    <>
      <PosShell
        title="Point of sale"
        subtitle={store ? `Selling from ${store.storeName}` : "Choose a store to start"}
        actions={
          <Button size="sm" variant="secondary" icon={<FiMapPin aria-hidden="true" />} onClick={() => setPickStore(true)}>
            {store ? "Change store" : "Choose store"}
          </Button>
        }
        catalog={<CatalogGrid items={catalog} loading={loading} onAdd={add} inCart={inCart} emptyText={store ? "No products are set to show in the POS for this store" : "Choose a store first"} />}
        cart={cartPanel}
        cartCount={lines.length}
        cartTotal={total}
      />

      <StorePicker
        open={pickStore}
        stores={myStores}
        currentId={store?.storeId}
        onPick={pick}
        onClose={store ? () => setPickStore(false) : undefined}
      />

      <CheckoutModal
        visible={checkout}
        cart={cart}
        total={total}
        onClose={() => setCheckout(false)}
        onCompleteSale={() => {
          setCart([]);
          setCheckout(false);
          if (store) reloadStock(String(store.storeId));
        }}
      />
    </>
  );
};

export default PointOfSale;
