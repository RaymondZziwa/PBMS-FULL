import { useEffect, useMemo, useState } from "react";
import useServices from "../../../hooks/inventory/useServices";
import type { ICartItem } from "../../../redux/types/sales";
import type { IService } from "../../../redux/types/inventory";
import PosShell from "../shared/PosShell";
import CatalogGrid, { type CatalogItem } from "../shared/CatalogGrid";
import CartPanel, { type CartLine } from "../shared/CartPanel";
import CheckoutModal from "./checkoutModal";

// Its own key: it used to share "posCart" with the product till, so carts mixed.
const CART_KEY = "servicePosCart";
const money = (n: number) => Math.max(0, Math.round(n * 100) / 100);

const readCart = (): ICartItem[] => {
  try {
    const c = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
    return Array.isArray(c) ? c : [];
  } catch {
    return [];
  }
};

/** Till for massage and other services (no stock to track). */
const ServicePointOfSale = () => {
  const { data: services, loading } = useServices();
  const [cart, setCart] = useState<ICartItem[]>(readCart);
  const [checkout, setCheckout] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* ignore */
    }
  }, [cart]);

  const byId = useMemo(() => new Map((services ?? []).map((s: IService) => [String(s.id), s])), [services]);
  const catalog: CatalogItem[] = useMemo(() => (services ?? []).map((s: IService) => ({ key: String(s.id), name: s.name, price: Number(s.price) })), [services]);

  const add = (key: string) => {
    const s = byId.get(key);
    if (!s) return;
    setCart((prev) => {
      const existing = prev.find((c) => String(c.id) === key);
      if (existing) return prev.map((c) => (c === existing ? { ...c, quantity: c.quantity + 1, total: money((c.quantity + 1) * Number(c.price) - (c.discount || 0)) } : c));
      return [...prev, { ...s, id: String(s.id), price: Number(s.price), quantity: 1, discount: 0, total: Number(s.price) } as unknown as ICartItem];
    });
  };
  const setQty = (key: string, quantity: number) =>
    setCart((prev) =>
      prev.map((c) => {
        if (String(c.id) !== key) return c;
        const discount = Math.min(c.discount || 0, c.price * quantity);
        return { ...c, quantity, discount, total: money(c.price * quantity - discount) };
      }),
    );
  const setDiscount = (key: string, discount: number) => setCart((prev) => prev.map((c) => (String(c.id) === key ? { ...c, discount, total: money(c.price * c.quantity - discount) } : c)));
  const remove = (key: string) => setCart((prev) => prev.filter((c) => String(c.id) !== key));

  const total = cart.reduce((a, c) => a + Number(c.total), 0);
  const lines: CartLine[] = cart.map((c) => ({ key: String(c.id), name: c.name, price: Number(c.price), quantity: c.quantity, discount: c.discount || 0, total: Number(c.total) }));
  const inCart = Object.fromEntries(lines.map((l) => [l.key, l.quantity]));

  return (
    <>
      <PosShell
        title="Massage & services"
        subtitle="Tap a service to add it. Type the quantity for sessions."
        catalog={<CatalogGrid items={catalog} loading={loading} onAdd={add} inCart={inCart} searchPlaceholder="Search services" emptyText="No services set up yet. Add them under Inventory → Services." />}
        cart={(close) => (
          <CartPanel
            title="Current sale"
            lines={lines}
            total={total}
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
        )}
        cartCount={lines.length}
        cartTotal={total}
      />
      <CheckoutModal
        visible={checkout}
        cart={cart}
        total={total}
        onClose={() => setCheckout(false)}
        onCompleteSale={() => {
          setCart([]);
          setCheckout(false);
        }}
      />
    </>
  );
};

export default ServicePointOfSale;
