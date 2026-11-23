import React, { useCallback, useEffect, useState } from "react";
import SidebarNavigation from "./sidebar";
import TopNavBar from "./topbar";
import { Toaster } from "sonner";
import { useAutoLogout } from "../hooks/useAutoLogout";
import { AutoLogoutWarning } from "../custom/modals/autoLogoutModal";
import { useAuth } from "../hooks/useAuth";
import { useMediaQuery } from "./useMediaQuery";
import { useTheme } from "../theme/ThemeProvider";

const COLLAPSE_KEY = "pbms.sidebarCollapsed";

const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * App shell: side menu + top bar + page.
 * - Desktop (≥1024px): menu always visible, can shrink to an icon rail (remembered).
 * - Phones and tablets: menu hidden behind the top-bar button, slides in over the page.
 */
const LayoutSkeleton: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { handleLogout } = useAuth();
  const { showWarning, timeLeft, handleStayLoggedIn } = useAutoLogout();
  const { resolved } = useTheme();

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* storage unavailable: keep it for this visit only */
      }
      return next;
    });
  }, []);

  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // Rotating a tablet to a desktop width shouldn't leave the drawer open.
  useEffect(() => {
    if (isDesktop) setMobileOpen(false);
  }, [isDesktop]);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <AutoLogoutWarning isOpen={showWarning} timeLeft={timeLeft} onStayLoggedIn={handleStayLoggedIn} onLogout={handleLogout} />

      <Toaster
        position="top-right"
        theme={resolved}
        richColors
        expand={false}
        toastOptions={{
          style: {
            fontSize: "14px",
            borderRadius: "8px",
          },
        }}
      />

      <SidebarNavigation
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={closeMobile}
        isDesktop={isDesktop}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavBar onOpenMenu={openMobile} menuOpen={mobileOpen} />
        <main id="main-content" className="flex-1 overflow-auto">
          <div className="min-h-full w-full p-3 sm:p-4 lg:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default LayoutSkeleton;
