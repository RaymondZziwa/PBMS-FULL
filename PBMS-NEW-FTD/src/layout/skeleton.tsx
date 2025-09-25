import React, { useState } from "react";
import SidebarNavigation from "./sidebar";
import TopNavBar from "./topbar";
import { Toaster } from "sonner";

const LayoutSkeleton: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
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
      <div
        className={`
          fixed top-16 inset-y-0 left-0 z-30 w-64 bg-white shadow-md transform
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          transition-transform duration-300 ease-in-out
          md:translate-x-0 md:static md:inset-auto md:mt-16
        `}
      >
        <SidebarNavigation />
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black opacity-25 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="fixed top-0 left-0 w-full h-16 bg-white flex items-center p-2 justify-between z-40">
          <TopNavBar />
        </header>

        {/* Main content */}
              <main className="flex-1 p-4 overflow-auto mt-16">{children}</main>       
      </div>
    </div>
  );
};

export default LayoutSkeleton;
