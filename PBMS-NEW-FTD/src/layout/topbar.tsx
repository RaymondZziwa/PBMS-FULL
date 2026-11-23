import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { FiChevronDown, FiChevronRight, FiLogOut, FiMapPin, FiMenu, FiUser } from "react-icons/fi";
import type { RootState } from "../redux/store";
import { useAuth } from "../hooks/useAuth";
import { findBreadcrumb } from "./navigation";
import ThemeToggle from "../theme/ThemeToggle";

type TopNavBarProps = {
  onOpenMenu: () => void;
  menuOpen: boolean;
};

const initials = (first?: string, last?: string) =>
  `${(first ?? "").trim().charAt(0)}${(last ?? "").trim().charAt(0)}`.toUpperCase() || "U";

const TopNavBar = ({ onOpenMenu, menuOpen }: TopNavBarProps) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { handleLogout } = useAuth();
  const user = useSelector((state: RootState) => state.userAuth?.data);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const crumb = findBreadcrumb(pathname);
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "My account";
  const roleName = user?.role?.name;
  const branchName = user?.branch?.name;

  // Close the user menu on outside click or Esc.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => setOpen(false), [pathname]);

  const signOut = async () => {
    setSigningOut(true);
    await handleLogout(); // clears the session and returns to the sign-in page
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 flex-none items-center gap-3 border-b border-line bg-surface px-3 font-inter sm:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        aria-controls="app-sidebar"
        aria-expanded={menuOpen}
        className="flex h-10 w-10 flex-none items-center justify-center rounded-lg text-brand-ink hover:bg-[#EEF1F8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand lg:hidden"
      >
        <FiMenu aria-hidden="true" className="h-[22px] w-[22px]" />
      </button>

      {/* Where am I */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
        {crumb?.group && (
          <>
            <span className="hidden truncate text-brand-muted sm:inline">{crumb.group}</span>
            <FiChevronRight aria-hidden="true" className="hidden h-4 w-4 flex-none text-[#9AA3B5] sm:inline" />
          </>
        )}
        <p className="m-0 truncate font-display text-base font-semibold text-brand-ink sm:text-[17px]">
          {crumb?.page ?? "PBMS"}
        </p>
      </div>

      {branchName && (
        <span className="hidden flex-none items-center gap-1.5 rounded-full border border-[#E2E6EF] bg-[#F7F8FB] px-3 py-1 text-[13px] text-[#2B3240] md:flex">
          <FiMapPin aria-hidden="true" className="h-3.5 w-3.5 text-brand" />
          {branchName}
        </span>
      )}

      <div className="hidden flex-none sm:block">
        <ThemeToggle compact />
      </div>

      {/* User menu */}
      <div ref={menuRef} className="relative flex-none">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex h-11 items-center gap-2.5 rounded-full py-1 pl-1 pr-2 hover:bg-[#EEF1F8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand sm:pr-3"
        >
          {user?.profileImage ? (
            <img src={user.profileImage} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-[13px] font-semibold text-white">
              {initials(user?.firstName, user?.lastName)}
            </span>
          )}
          <span className="hidden min-w-0 flex-col text-left leading-tight sm:flex">
            <span className="max-w-[160px] truncate text-sm font-semibold text-brand-ink">{fullName}</span>
            {roleName && <span className="max-w-[160px] truncate text-xs text-brand-muted">{roleName}</span>}
          </span>
          <span className="sr-only sm:hidden">{fullName}</span>
          <FiChevronDown aria-hidden="true" className={`h-4 w-4 text-brand-muted transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div
            role="menu"
            aria-label="Account"
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-xl border border-line bg-surface py-1.5 shadow-[0_12px_32px_rgba(20,24,31,0.14)]"
          >
            <div className="border-b border-[#EEF0F5] px-4 pb-3 pt-2">
              <p className="m-0 truncate text-sm font-semibold text-brand-ink">{fullName}</p>
              <p className="m-0 truncate text-xs text-brand-muted">{[roleName, branchName].filter(Boolean).join(" · ")}</p>
            </div>
            <div className="border-b border-line px-4 py-2.5 sm:hidden">
              <p className="m-0 mb-1.5 text-xs font-medium text-brand-muted">Theme</p>
              <ThemeToggle compact />
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => navigate("/account_settings")}
              className="flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm text-[#2B3240] hover:bg-[#F3F5FA] focus-visible:bg-[#F3F5FA] focus-visible:outline-none"
            >
              <FiUser aria-hidden="true" className="h-4 w-4 text-brand-muted" />
              Account settings
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={signOut}
              disabled={signingOut}
              className="flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm text-[#B42318] hover:bg-[#FDF0EE] focus-visible:bg-[#FDF0EE] focus-visible:outline-none disabled:opacity-60"
            >
              <FiLogOut aria-hidden="true" className="h-4 w-4" />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default TopNavBar;
