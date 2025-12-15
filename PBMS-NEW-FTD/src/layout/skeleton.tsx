import React, { useState } from "react";
import SidebarNavigation from "./sidebar";
import TopNavBar from "./topbar";
import { Toaster } from "sonner";
import { useAutoLogout } from "../hooks/useAutoLogout";
import { AutoLogoutWarning } from "../custom/modals/autoLogoutModal";
import { useAuth } from "../hooks/useAuth";
import { Icon } from "@iconify/react";

const LayoutSkeleton: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { handleLogout } = useAuth();

  const { showWarning, timeLeft, handleStayLoggedIn } = useAutoLogout();

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <AutoLogoutWarning
        isOpen={showWarning}
        timeLeft={timeLeft}
        onStayLoggedIn={handleStayLoggedIn}
        onLogout={handleLogout}
      />

      <Toaster
        position="top-right"
        richColors
        expand={false}
        toastOptions={{
          style: {
            fontSize: "14px",
            borderRadius: "8px",
          },
        }}
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] bg-white shadow-md transition-all duration-300 ease-in-out
          ${isCollapsed ? "w-20" : "w-64"}
        `}
      >
        <div className="h-full flex flex-col">
          {/* Collapse toggle button */}
          <div className="flex justify-end p-2 border-b">
            <button
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="p-2 rounded hover:bg-gray-100 transition"
            >
              <Icon
                icon={isCollapsed ? "solar:arrow-right-bold" : "solar:arrow-left-bold"}
                fontSize={20}
              />
            </button>
          </div>

          {/* Sidebar navigation */}
          <div className="flex-1 overflow-y-auto">
            <SidebarNavigation collapsed={isCollapsed} />
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? "ml-20" : "ml-64"
        }`}
      >
        {/* Top bar */}
        <header className="fixed top-0 left-0 w-full h-16 bg-white flex items-center p-2 justify-between z-40 shadow-sm">
          <TopNavBar />
        </header>

        {/* Main content */}
        <main className="flex-1 mt-16 overflow-auto">
          <div className="min-w-full min-h-full p-4">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default LayoutSkeleton;
