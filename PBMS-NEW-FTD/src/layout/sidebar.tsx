import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { FiChevronDown, FiChevronsLeft, FiChevronsRight, FiSearch, FiX } from "react-icons/fi";
import type { RootState } from "../redux/store";
import logo from "../assets/logo.png";
import { findActivePath, visibleNavigation, type NavItem, type NavSection } from "./navigation";

type SidebarProps = {
  /** Desktop only: icon rail instead of the full menu. */
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Phones and tablets: the menu slides in over the page. */
  mobileOpen: boolean;
  onCloseMobile: () => void;
  isDesktop: boolean;
};

const APP_VERSION = "3.0.1";

const filterSections = (sections: NavSection[], query: string): NavSection[] => {
  const q = query.trim().toLowerCase();
  if (!q) return sections;
  return sections
    .map((section) => ({
      ...section,
      items: section.items
        .map((item) => {
          if (item.label.toLowerCase().includes(q)) return item;
          if (!item.children) return null;
          const children = item.children.filter((c) => c.label.toLowerCase().includes(q));
          return children.length ? { ...item, children } : null;
        })
        .filter((item): item is NavItem => item !== null),
    }))
    .filter((section) => section.items.length > 0);
};

const SidebarNavigation = ({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile, isDesktop }: SidebarProps) => {
  const { pathname } = useLocation();
  const role = useSelector((state: RootState) => state.userAuth?.data?.role);
  const sections = useMemo(() => visibleNavigation(role), [role]);
  const activePath = useMemo(() => findActivePath(sections, pathname), [sections, pathname]);
  const activeGroupId = useMemo(() => {
    for (const s of sections) for (const i of s.items) if (i.children?.some((c) => c.path === activePath)) return i.id;
    return null;
  }, [sections, activePath]);

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(activeGroupId ? [activeGroupId] : []));
  const [query, setQuery] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Rail mode only applies on desktop; the phone drawer always shows labels.
  const rail = collapsed && isDesktop;
  const shown = useMemo(() => filterSections(sections, query), [sections, query]);
  const searching = query.trim().length > 0;

  // Keep the current page's group open as the user moves around.
  useEffect(() => {
    if (activeGroupId) setOpenGroups((prev) => (prev.has(activeGroupId) ? prev : new Set(prev).add(activeGroupId)));
  }, [activeGroupId]);

  // Phone drawer: close after navigating.
  useEffect(() => {
    onCloseMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Phone drawer: Esc closes, page behind doesn't scroll, focus moves into the menu.
  useEffect(() => {
    if (!mobileOpen || isDesktop) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseMobile();
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen, isDesktop, onCloseMobile]);

  const toggleGroup = (id: string) => {
    if (rail) {
      // From the icon rail, opening a group expands the menu so its pages can be seen.
      onToggleCollapsed();
      setOpenGroups((prev) => new Set(prev).add(id));
      return;
    }
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const linkBase =
    "group flex min-h-10 items-center gap-3 rounded-lg text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white/70";
  const idle = "text-[#C9D2EA] hover:bg-white/[0.07] hover:text-white";
  const current = "bg-brand text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]";

  return (
    <>
      {/* Dimmed page behind the phone drawer */}
      {!isDesktop && mobileOpen && (
        <div aria-hidden="true" onClick={onCloseMobile} className="fixed inset-0 z-40 bg-[#0B1226]/50 backdrop-blur-[1px] lg:hidden" />
      )}

      <aside
        id="app-sidebar"
        aria-label="Main menu"
        className={`fixed inset-y-0 left-0 z-50 flex w-[284px] max-w-[85vw] flex-col bg-brand-navy font-inter text-white shadow-2xl transition-[transform,width] duration-300 ease-out lg:static lg:z-auto lg:h-full lg:max-w-none lg:translate-x-0 lg:shadow-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${rail ? "lg:w-[76px]" : "lg:w-64"}`}
      >
        {/* Brand */}
        <div className={`flex h-16 flex-none items-center gap-3 border-b border-white/10 ${rail ? "justify-center px-2" : "px-4"}`}>
          <div className="flex h-10 w-10 flex-none items-center justify-center overflow-hidden rounded-full bg-white" style={{ backgroundColor: "#fff" }}>
            <img src={logo} alt="" className="h-[92%] w-[92%] object-contain" />
          </div>
          {!rail && (
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="font-display text-[15px] font-bold tracking-wide">PBMS</span>
              <span className="truncate text-xs text-[#AEBADB]">Prof Bioresearch</span>
            </div>
          )}
          {!isDesktop && (
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onCloseMobile}
              aria-label="Close menu"
              className="flex h-10 w-10 flex-none items-center justify-center rounded-lg text-[#C9D2EA] hover:bg-white/10 hover:text-white"
            >
              <FiX aria-hidden="true" className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Search */}
        {!rail && (
          <div className="flex-none px-3 pb-1 pt-3">
            <label htmlFor="menu-search" className="sr-only">
              Search the menu
            </label>
            <div className="flex h-10 items-center gap-2 rounded-lg bg-white/[0.07] px-3 text-sm focus-within:bg-white/[0.12] focus-within:ring-1 focus-within:ring-white/30">
              <FiSearch aria-hidden="true" className="h-4 w-4 flex-none text-[#AEBADB]" />
              <input
                id="menu-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setQuery("")}
                placeholder="Search menu"
                autoComplete="off"
                className="h-full min-w-0 flex-1 border-0 bg-transparent text-white outline-none placeholder:text-[#8F9CC2]"
              />
            </div>
          </div>
        )}

        {/* Menu */}
        <nav aria-label="Main" className="flex-1 overflow-y-auto overscroll-contain px-3 pb-4 pt-2 [scrollbar-width:thin]">
          {shown.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-[#AEBADB]">
              {searching ? "Nothing in the menu matches." : "No modules are assigned to your role yet. Ask your administrator."}
            </p>
          )}

          {shown.map((section, sIndex) => (
            <div key={section.id} className={sIndex > 0 ? "mt-4" : ""}>
              {rail ? (
                sIndex > 0 && <div aria-hidden="true" className="mx-3 mb-3 h-px bg-white/10" />
              ) : (
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8F9CC2]">{section.label}</p>
              )}

              <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const iconEl = <Icon aria-hidden="true" className="h-[18px] w-[18px] flex-none" />;

                  if (!item.children && item.path) {
                    const isCurrent = activePath === item.path;
                    return (
                      <li key={item.id}>
                        <Link
                          to={item.path}
                          aria-current={isCurrent ? "page" : undefined}
                          title={rail ? item.label : undefined}
                          aria-label={rail ? item.label : undefined}
                          className={`${linkBase} ${rail ? "justify-center px-0" : "px-3"} ${isCurrent ? current : idle}`}
                        >
                          {iconEl}
                          {!rail && <span className="truncate">{item.label}</span>}
                        </Link>
                      </li>
                    );
                  }

                  const isOpen = searching || openGroups.has(item.id);
                  const containsCurrent = item.children?.some((c) => c.path === activePath) ?? false;
                  const panelId = `menu-group-${item.id}`;

                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => toggleGroup(item.id)}
                        aria-expanded={rail ? false : isOpen}
                        aria-controls={rail ? undefined : panelId}
                        title={rail ? item.label : undefined}
                        aria-label={rail ? `${item.label} menu` : undefined}
                        className={`${linkBase} w-full ${rail ? "justify-center px-0" : "px-3"} ${
                          containsCurrent && (rail || !isOpen) ? "bg-white/[0.1] text-white" : idle
                        } ${containsCurrent ? "font-semibold text-white" : ""}`}
                      >
                        {iconEl}
                        {!rail && (
                          <>
                            <span className="flex-1 truncate text-left">{item.label}</span>
                            <FiChevronDown
                              aria-hidden="true"
                              className={`h-4 w-4 flex-none transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                            />
                          </>
                        )}
                      </button>

                      {!rail && isOpen && (
                        <ul id={panelId} className="relative m-0 mt-0.5 flex list-none flex-col gap-0.5 py-0.5 pl-[22px] pr-0">
                          <span aria-hidden="true" className="absolute bottom-1 left-[21px] top-1 w-px bg-white/10" />
                          {item.children?.map((child) => {
                            const isCurrent = activePath === child.path;
                            return (
                              <li key={child.path}>
                                <Link
                                  to={child.path}
                                  aria-current={isCurrent ? "page" : undefined}
                                  className={`${linkBase} relative min-h-9 pl-4 pr-3 text-[13.5px] ${isCurrent ? current : idle}`}
                                >
                                  <span className="truncate">{child.label}</span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer: collapse control (desktop) and version */}
        <div className={`flex flex-none items-center border-t border-white/10 py-2 ${rail ? "justify-center px-2" : "justify-between px-4"}`}>
          {!rail && <span className="text-xs text-[#8F9CC2]">PBMS v{APP_VERSION}</span>}
          {isDesktop && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label={rail ? "Expand menu" : "Collapse menu"}
              title={rail ? "Expand menu" : "Collapse menu"}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-[#C9D2EA] hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70"
            >
              {rail ? <FiChevronsRight aria-hidden="true" className="h-5 w-5" /> : <FiChevronsLeft aria-hidden="true" className="h-5 w-5" />}
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default SidebarNavigation;
