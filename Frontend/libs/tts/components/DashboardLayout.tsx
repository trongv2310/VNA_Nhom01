"use client";

import React from "react";
import { Menu } from "lucide-react";

interface DashboardLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  sidebar,
  children,
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  return (
    <div className="h-screen w-full flex bg-white dark:bg-zinc-950 font-sans transition-colors duration-300 overflow-hidden">

      {/* 1. Desktop Sidebar (always visible on screens lg and above) */}
      <aside className="hidden lg:flex flex-shrink-0 h-screen sticky top-0">
        {sidebar}
      </aside>

      {/* 2. Mobile Sidebar Drawer Overlay (drawer slides in from the left) */}
      <div
        className={`fixed inset-0 z-50 lg:hidden flex transition-opacity duration-300
          ${mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
      >
        {/* Backdrop overlay */}
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        />

        {/* Drawer panel */}
        <aside
          className={`relative flex flex-col h-full w-72 bg-[#0b2868] shadow-2xl transition-transform duration-300 ease-in-out transform
            ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          {sidebar}
        </aside>
      </div>

      {/* 3. Main Workspace Area (takes remaining space) */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">

        {/* Mobile Top Header (only visible on mobile/tablet screens < lg) */}
        <header className="lg:hidden w-full flex items-center justify-between px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200/50 dark:border-zinc-800/80 shadow-sm z-30 select-none">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-600 border border-amber-400 flex items-center justify-center shadow-md">
              <span className="text-[8px] font-extrabold text-amber-300">VNA</span>
            </div>
            <h1 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
              UBND Tỉnh ABC
            </h1>
          </div>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none transition-all cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {/* Dashboard Content Panel */}
        <main className="flex-1 px-6 py-4 overflow-y-auto w-full">
          <div className="w-full bg-white dark:bg-zinc-900/40 rounded-3xl p-6 md:p-8 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
