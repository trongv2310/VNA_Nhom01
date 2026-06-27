"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface ResetPasswordModalProps {
  username: string;
  onSave: (password: string) => Promise<void> | void;
  onCancel: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  username,
  onSave,
  onCancel,
  showToast,
}) => {
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pw = newPassword.trim();
    if (!pw) {
      showToast("Vui lòng nhập mật khẩu.", "error");
      return;
    }

    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasDigit = /[0-9]/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
    const matchedFactors = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;

    if (pw.length < 8) {
      showToast("Mật khẩu phải có ít nhất 8 ký tự.", "error");
      return;
    }
    if (matchedFactors < 3) {
      showToast("Mật khẩu phải chứa ít nhất 3 trong 4 yếu tố: chữ viết hoa, chữ viết thường, chữ số, ký tự đặc biệt.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(pw);
    } catch (error) {
      // The parent handles error messaging
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={isSubmitting ? undefined : onCancel} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <form
        onSubmit={handleSubmit}
        className="relative bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-[20px] w-full max-w-[420px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
      >
        <div className="bg-blue-600 dark:bg-blue-700 text-white py-4 text-center font-bold text-lg select-none tracking-wide">
          Đổi mật khẩu
        </div>

        <div className="p-6 flex flex-col gap-5">
          <p className="text-zinc-850 dark:text-zinc-150 text-sm font-semibold select-none">
            Khởi tạo mật khẩu cho tài khoản <strong className="font-extrabold">{username}</strong>
          </p>

          <div className="relative border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950">
            <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 font-bold">
              Mật khẩu mong muốn <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center justify-between w-full pt-2 pb-0.5">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold focus:ring-0"
                placeholder="Nhập mật khẩu mong muốn"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-250 cursor-pointer focus:outline-none ml-2"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-5 px-6 pb-6 select-none text-xs font-bold">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-blue-600 hover:text-blue-700 font-bold transition-colors cursor-pointer focus:outline-none"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
              <path d="M17 21v-8H7v8M7 3v5h8" />
            </svg>
            <span>{isSubmitting ? "Đang lưu..." : "Lưu"}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
