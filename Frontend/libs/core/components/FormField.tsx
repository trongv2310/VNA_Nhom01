"use client";

import React, { InputHTMLAttributes, useState } from "react";

export interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  leftIcon?: React.ReactNode;
  isPassword?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  leftIcon,
  isPassword = false,
  type = "text",
  id,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);
  
  const inputId = id || `form-field-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="flex flex-col gap-1 w-full relative">
      <div
        className={`relative flex items-center w-full rounded-xl border transition-all duration-200 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-sm shadow-sm
          ${error 
            ? "border-red-500 ring-1 ring-red-500 focus-within:border-red-500" 
            : focused 
              ? "border-blue-600 ring-1 ring-blue-600 shadow-blue-500/5 focus-within:border-blue-600" 
              : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
          }
        `}
      >
        {leftIcon && (
          <div className="pl-4 pr-1 text-zinc-400 dark:text-zinc-500 flex items-center justify-center">
            {leftIcon}
          </div>
        )}

        <div className="relative flex-1">
          <input
            id={inputId}
            type={isPassword ? (showPassword ? "text" : "password") : type}
            onFocus={(e) => {
              setFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              props.onBlur?.(e);
            }}
            placeholder=" "
            className={`w-full px-4 pt-6 pb-2 text-base font-normal text-zinc-900 dark:text-zinc-50 outline-none bg-transparent transition-all duration-200 placeholder-transparent 
              ${leftIcon ? "pl-2" : "pl-4"}
            `}
            {...props}
          />
          
          <label
            htmlFor={inputId}
            className={`absolute left-0 top-4 text-zinc-500 transition-all duration-200 pointer-events-none origin-[0] transform -translate-y-3.5 scale-75 select-none
              peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0
              ${leftIcon ? "left-2" : "left-4"}
              input-label-float
            `}
          >
            {label}
          </label>
        </div>

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="pr-4 pl-2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors focus:outline-none cursor-pointer"
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        )}
      </div>

      {error && (
        <span className="text-sm text-red-500 font-medium pl-1 animate-slide-up select-none">
          {error}
        </span>
      )}

      {/* Styled JSX for the custom float behavior which works beautifully with placeholder-shown */}
      <style jsx global>{`
        input:placeholder-shown + label {
          transform: translateY(0) scale(1);
          color: #71717a; /* text-zinc-500 */
        }
        input:focus + label,
        input:not(:placeholder-shown) + label {
          transform: translateY(-0.85rem) scale(0.75);
          color: #2563eb; /* text-blue-600 */
        }
        .dark input:focus + label,
        .dark input:not(:placeholder-shown) + label {
          color: #3b82f6; /* text-blue-500 */
        }
      `}</style>
    </div>
  );
};
