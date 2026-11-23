import type { ReactNode } from "react";
import { Logo, ThemeToggle } from "./ui";

/** Sign-in / registration frame: brand panel on wide screens, compact header on phones. */
const AuthLayout = ({ children, wide }: { children: ReactNode; wide?: boolean }) => (
  <div className="flex min-h-dvh">
    <aside className="relative hidden w-[42%] max-w-[560px] flex-col justify-between overflow-hidden bg-brand-navy p-10 text-white lg:flex">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand/40 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-brand/30 blur-3xl" />
      <div className="relative flex items-center gap-3">
        <span className="rounded-xl bg-white p-2"><Logo className="h-9" /></span>
        <span className="font-display text-lg font-semibold">Prof Bioresearch</span>
      </div>
      <div className="relative">
        <p className="m-0 text-sm font-semibold uppercase tracking-[0.2em] text-white/60">Amatugunda Monk Club</p>
        <h1 className="m-0 mt-3 font-display text-4xl font-semibold leading-tight">The loyalty club for our growers and partners.</h1>
        <p className="m-0 mt-4 max-w-md text-white/75">Track your supplies month by month, keep your membership card with you, and shop Prof Bioresearch products.</p>
      </div>
      <p className="relative m-0 text-xs text-white/50">© {new Date().getFullYear()} Prof Bioresearch</p>
    </aside>
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
        <div className="flex items-center gap-2.5 lg:invisible">
          <Logo className="h-9" />
          <span className="font-display font-semibold">Amatugunda Monk Club</span>
        </div>
        <ThemeToggle />
      </header>
      <div className={`mx-auto flex w-full flex-1 flex-col px-4 pb-10 pt-6 sm:px-8 ${wide ? "max-w-2xl" : "max-w-md justify-center"}`}>{children}</div>
    </main>
  </div>
);

export default AuthLayout;
