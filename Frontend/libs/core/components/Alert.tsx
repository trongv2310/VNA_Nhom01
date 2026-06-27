"use client";

import React from "react";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "success" | "error" | "info" | "warning" | "login";
  title?: string;
  onClose?: () => void;
  icon?: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({
  variant = "info",
  title,
  children,
  onClose,
  icon,
  className = "",
  ...props
}) => {
  const styles = {
    success: {
      bg: "bg-emerald-50/90 dark:bg-emerald-950/20",
      border: "border-emerald-200 dark:border-emerald-900/50",
      text: "text-emerald-800 dark:text-emerald-200",
      icon: (
        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    error: {
      bg: "bg-red-50/90 dark:bg-red-950/20",
      border: "border-red-200 dark:border-red-900/50",
      text: "text-red-800 dark:text-red-200",
      icon: (
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    info: {
      bg: "bg-blue-50/90 dark:bg-blue-950/20",
      border: "border-blue-200 dark:border-blue-900/50",
      text: "text-blue-800 dark:text-blue-200",
      icon: (
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    warning: {
      bg: "bg-amber-50/90 dark:bg-amber-950/20",
      border: "border-amber-200 dark:border-amber-900/50",
      text: "text-amber-800 dark:text-amber-200",
      icon: (
        <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    login: {
      bg: "bg-[#fdf0ec] dark:bg-red-950/20",
      border: "border-[#f9d8cf] dark:border-red-900/30",
      text: "text-[#932c1e] dark:text-red-300",
      icon: (
        <div className="w-5 h-5 rounded-full bg-[#ff5640] flex items-center justify-center text-white flex-shrink-0">
          <span className="text-xs font-bold select-none leading-none">!</span>
        </div>
      ),
    },
  };

  const current = styles[variant];
  const isLogin = variant === "login";

  return (
    <div
      className={`flex ${
        isLogin ? "items-center py-2.5 px-4 rounded-2xl" : "items-start p-4 rounded-xl"
      } gap-3 border backdrop-blur-md animate-fade-in ${current.bg} ${current.border} ${current.text} ${className}`}
      {...props}
    >
      <div className="flex-shrink-0 mt-0.5">{icon !== undefined ? icon : current.icon}</div>
      <div className={`flex-1 ${isLogin ? "text-xs font-semibold" : "text-sm font-medium"}`}>
        {title && <div className="font-semibold mb-1">{title}</div>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 hover:opacity-75 transition-opacity focus:outline-none cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};
