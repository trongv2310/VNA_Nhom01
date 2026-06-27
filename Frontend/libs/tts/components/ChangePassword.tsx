"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface ChangePasswordProps {
  onSave: (
    currentPw: string,
    newPw: string,
    confirmPw: string,
  ) => void | Promise<void>;
  onCancel: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

export const ChangePassword: React.FC<ChangePasswordProps> = ({
  onSave,
  onCancel,
  showToast,
}) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!currentPassword) {
      newErrors.currentPassword = "Vui lòng nhập mật khẩu cũ.";
    }

    if (!newPassword) {
      newErrors.newPassword = "Vui lòng nhập mật khẩu mới.";
    } else {
      const pw = newPassword.trim();
      const hasUpper = /[A-Z]/.test(pw);
      const hasLower = /[a-z]/.test(pw);
      const hasDigit = /[0-9]/.test(pw);
      const hasSpecial = /[^A-Za-z0-9]/.test(pw);
      const matchedFactors = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;

      if (pw.length < 8) {
        newErrors.newPassword = "Mật khẩu phải có ít nhất 8 ký tự.";
      } else if (matchedFactors < 3) {
        newErrors.newPassword = "Mật khẩu phải chứa ít nhất 3 trong 4 yếu tố: chữ viết hoa, chữ viết thường, chữ số, ký tự đặc biệt.";
      }
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Vui lòng xác nhận mật khẩu mới.";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không khớp.";
    }

    setErrors(newErrors);
    return newErrors;
  };

  const handleSaveClick = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      const firstError =
        validationErrors.currentPassword ||
        validationErrors.newPassword ||
        validationErrors.confirmPassword ||
        "Vui lòng điền đầy đủ thông tin.";
      showToast(firstError, "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(currentPassword, newPassword, confirmPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div
        onClick={isSubmitting ? undefined : onCancel}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Dialog Panel */}
      <form
        onSubmit={handleSaveClick}
        className="relative bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-[20px] w-full max-w-[420px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
      >
        {/* Blue Header */}
        <div className="bg-blue-600 dark:bg-blue-700 text-white py-4.5 text-center font-bold text-lg select-none relative tracking-wide">
          Đổi mật khẩu
        </div>

        {/* Form Inputs Container */}
        <div className="p-6 flex flex-col gap-6">
          {/* Current Password Field */}
          <div
            className={`relative border rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950 transition-all
              ${errors.currentPassword ? "border-red-500 ring-1 ring-red-500" : "border-zinc-200 dark:border-zinc-800"}
            `}
          >
            <label
              className={`absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold transition-colors
                ${errors.currentPassword ? "text-red-500" : "text-zinc-400 dark:text-zinc-500"}
              `}
            >
              Mật khẩu cũ <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center justify-between gap-3 pt-2 pb-0.5">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (errors.currentPassword) setErrors((prev) => ({ ...prev, currentPassword: "" }));
                }}
                className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold"
                placeholder=""
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors focus:outline-none cursor-pointer flex items-center"
              >
                {showCurrent ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* New Password Field */}
          <div
            className={`relative border rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950 transition-all
              ${errors.newPassword ? "border-red-500 ring-1 ring-red-500" : "border-zinc-200 dark:border-zinc-800"}
            `}
          >
            <label
              className={`absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold transition-colors
                ${errors.newPassword ? "text-red-500" : "text-zinc-400 dark:text-zinc-500"}
              `}
            >
              Mật khẩu mới <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center justify-between gap-3 pt-2 pb-0.5">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: "" }));
                }}
                className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold"
                placeholder=""
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors focus:outline-none cursor-pointer flex items-center"
              >
                {showNew ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div
            className={`relative border rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950 transition-all
              ${errors.confirmPassword ? "border-red-500 ring-1 ring-red-500" : "border-zinc-200 dark:border-zinc-800"}
            `}
          >
            <label
              className={`absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold transition-colors
                ${errors.confirmPassword ? "text-red-500" : "text-zinc-400 dark:text-zinc-500"}
              `}
            >
              Nhập lại mật khẩu mới <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center justify-between gap-3 pt-2 pb-0.5">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }}
                className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold"
                placeholder=""
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors focus:outline-none cursor-pointer flex items-center"
              >
                {showConfirm ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom buttons */}
        <div className="flex items-center justify-end gap-6 px-6 pb-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 font-bold text-base transition-colors cursor-pointer focus:outline-none select-none"
          >
            Huỷ bỏ
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-500/10 active:scale-98 transition-all cursor-pointer focus:outline-none select-none disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </form>
    </div>
  );
};
