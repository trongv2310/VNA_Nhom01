"use client";

import React, { useState, useRef, useEffect } from "react";
import { User, Key, LogOut, ChevronRight } from "lucide-react";

interface UserMenuProps {
  fullName: string;
  avatarUrl: string;
  role: string;
  accountType?: "DEPARTMENT" | "BUSINESS";
  onSelectView: (view: "profile" | "change-password") => void;
  onLogout: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  fullName,
  avatarUrl,
  role,
  accountType,
  onSelectView,
  onLogout,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Dropdown Menu - Positioned above the button */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200/50 dark:border-zinc-800/80 py-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <button
            onClick={() => {
              onSelectView("profile");
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors font-medium text-left"
          >
            <User className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
            <span>Thông tin tài khoản</span>
          </button>
          
          <button
            onClick={() => {
              onSelectView("change-password");
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors font-medium text-left"
          >
            <Key className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
            <span>Đổi mật khẩu</span>
          </button>
          
          <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
          
          <button
            onClick={() => {
              onLogout();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-colors font-semibold text-left"
          >
            <LogOut className="w-5 h-5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      )}

      {/* Main Avatar Trigger Card */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-white/10 active:bg-white/15 transition-all text-left text-white group cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full border border-white/20 overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-white/70" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate pr-1 text-white group-hover:text-white/95 transition-colors">
              {fullName}
            </p>
            <p className="text-[10px] text-white/50 group-hover:text-white/60 transition-colors truncate">
              {accountType === "BUSINESS" || role === "BUSINESS" || role === "Doanh nghiệp"
                ? "Doanh nghiệp"
                : role === "ADMIN" || role === "Quản trị viên"
                ? "Tài khoản quản trị"
                : role === "USER" || role === "Người dùng"
                ? "Người dùng"
                : role || "Người dùng"}
            </p>
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 text-white/50 group-hover:text-white/80 transition-transform ${isOpen ? "rotate-90" : ""}`} />
      </button>
    </div>
  );
};
