import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { FiAward, FiBarChart2, FiHome, FiSettings, FiShoppingBag, FiShoppingCart } from "react-icons/fi";
import { useAuth } from "../lib/auth";
import { useCart } from "../lib/cart";
import { fileUrl } from "../lib/api";
import { initials } from "../lib/format";
import { Logo, ThemeToggle, cx } from "./ui";

const NAV = [
  { to: "/", label: "Home", icon: FiHome, end: true },
  { to: "/shop", label: "Shop", icon: FiShoppingBag },
  { to: "/leaderboard", label: "Ranks", icon: FiAward },
  { to: "/tracker", label: "Tracker", icon: FiBarChart2 },
  { to: "/settings", label: "Settings", icon: FiSettings },
];

/** Signed-in frame: top bar, bottom tabs on phones, links in the bar on wide screens. */
const AppShell = ({ children, title }: { children: ReactNode; title?: string }) => {
  const { member } = useAuth();
  const cart = useCart();
  const photo = fileUrl(member?.photoUrl);
  return (
    <div className="min-h-dvh pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-0">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
          <Logo className="h-8" />
          <span className="leading-tight">
            <span className="block font-display text-base font-semibold">Amatugunda</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Monk Club</span>
          </span>
          <nav className="ml-4 hidden gap-1 md:flex" aria-label="Main">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx("flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium no-underline", isActive ? "bg-subtle text-brand-text" : "text-ink-muted hover:text-ink")}>
                <n.icon aria-hidden="true" /> {n.label === "Ranks" ? "Leaderboard" : n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            {member?.status === "ACTIVE" && (
              <NavLink to="/cart" aria-label={`Cart, ${cart.count} item(s)`} className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-muted no-underline hover:bg-surface-2 hover:text-ink">
                <FiShoppingCart aria-hidden="true" />
                {cart.count > 0 && <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">{cart.count}</span>}
              </NavLink>
            )}
            <ThemeToggle />
            <NavLink to="/settings" aria-label="Your account" className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-subtle text-sm font-semibold text-brand-text no-underline">
              {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : initials(member?.name)}
            </NavLink>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-5 sm:py-8">
        {title && <h1 className="m-0 mb-5 font-display text-2xl font-semibold sm:text-3xl">{title}</h1>}
        {children}
      </main>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx("flex h-[64px] flex-col items-center justify-center gap-1 text-[11px] font-medium no-underline", isActive ? "text-brand-text" : "text-ink-muted")}>
              <n.icon className="h-5 w-5" aria-hidden="true" /> {n.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default AppShell;
