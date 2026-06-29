"use client";

import React, { useEffect, useState } from "react";
import { Alert } from "@/libs/core/components/Alert";
import {
  sendChangeGmailOtp,
  updateChangeGmail,
  verifyChangeGmailOtp,
} from "@/libs/tts/services/api";

interface ChangeEmailDialogProps {
  currentEmail: string;
  initialExpiresInSeconds?: number;
  onSave: (newEmail: string) => void;
  onCancel: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

export const ChangeEmailDialog: React.FC<ChangeEmailDialogProps> = ({
  currentEmail,
  initialExpiresInSeconds = 60,
  onSave,
  onCancel,
  showToast,
}) => {
  const [step, setStep] = useState<"otp" | "newEmail">("otp");
  const [otp, setOtp] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [timeLeft, setTimeLeft] = useState(initialExpiresInSeconds);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (step !== "otp" || timeLeft <= 0) return;

    const interval = window.setInterval(() => {
      setTimeLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [step, timeLeft]);

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleResendOtp = async () => {
    if (timeLeft > 0 || isLoading) return;

    setIsLoading(true);
    setErrorMsg("");
    try {
      const response = await sendChangeGmailOtp();
      setTimeLeft(response.data?.expiresInSeconds || 60);
      setOtp("");
      showToast(String(response.message || "Mã OTP mới đã được gửi"), "success");
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Không thể gửi lại mã OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedOtp = otp.trim();
    if (!/^\d{6}$/.test(normalizedOtp)) {
      setErrorMsg("OTP phải gồm 6 chữ số");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    try {
      const response = await verifyChangeGmailOtp(normalizedOtp);
      setNewEmail("");
      setStep("newEmail");
      showToast(String(response.message || "Xác thực OTP thành công"), "success");
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Mã OTP không hợp lệ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = newEmail.trim();

    if (!trimmedEmail) {
      setErrorMsg("Vui lòng nhập email mới");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMsg("Email không hợp lệ");
      return;
    }

    if (trimmedEmail.toLowerCase() === currentEmail.toLowerCase()) {
      setErrorMsg("Email mới phải khác email hiện tại");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    try {
      const response = await updateChangeGmail(trimmedEmail);
      const savedEmail = response.data?.email || trimmedEmail;
      onSave(savedEmail);
      showToast(String(response.message || "Thay đổi email thành công"), "success");
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Thay đổi email thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={isLoading ? undefined : onCancel}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {step === "otp" && (
        <form
          onSubmit={handleVerifyOtp}
          className="relative flex w-full max-w-[440px] flex-col gap-6 rounded-[32px] border border-zinc-200/60 bg-white p-8 shadow-2xl dark:border-zinc-800/80 dark:bg-zinc-950 select-none"
        >
          <div className="text-center flex flex-col gap-2">
            <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[#2563eb] dark:text-blue-400">
              THAY ĐỔI EMAIL
            </h3>
            <div className="text-sm font-normal leading-relaxed text-zinc-500 dark:text-zinc-400">
              Chúng tôi đã gửi mã xác minh qua số email cũ
              <span className="my-1 block font-extrabold text-zinc-900 dark:text-zinc-100 text-base">
                {currentEmail}
              </span>
              <span>Bạn vui lòng kiểm tra và điền mã xác thực</span>
            </div>
          </div>

          {errorMsg && (
            <Alert variant="login" className="px-3.5 py-2.5" onClose={() => setErrorMsg("")}>
              {errorMsg}
            </Alert>
          )}

          <div className="relative flex w-full flex-col justify-center rounded-2xl border border-zinc-200 bg-white px-4 py-2 transition-all focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 dark:border-zinc-800 dark:bg-zinc-950">
            <label className="absolute -top-2.5 left-4 bg-white px-1 text-[11px] font-bold text-zinc-400 dark:bg-zinc-950 dark:text-zinc-500">
              OTP <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "" || /^\d+$/.test(value)) {
                  setOtp(value);
                  setErrorMsg("");
                }
              }}
              placeholder="- - - - - -"
              className="w-full border-0 bg-transparent py-2 text-center text-lg font-bold tracking-[0.5em] text-zinc-800 outline-none placeholder:font-normal placeholder:tracking-[0.4em] placeholder:text-zinc-400 dark:text-zinc-200"
            />
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-xl font-extrabold text-[#2563eb] dark:text-blue-400">
              {formatTime(timeLeft)}
            </span>
            <div className="text-sm font-medium text-zinc-400 dark:text-zinc-500">
              Chưa nhận được mã?{" "}
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={timeLeft > 0 || isLoading}
                className="font-semibold text-zinc-400 underline hover:text-[#2563eb] disabled:cursor-not-allowed disabled:no-underline dark:hover:text-blue-400"
              >
                Gửi lại
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-2xl bg-[#8eaefc] hover:bg-[#7c9ff7] py-3.5 text-center text-base font-extrabold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-70 active:scale-99 cursor-pointer"
            >
              {isLoading ? "Đang xử lý..." : "Xác nhận"}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={onCancel}
              className="w-full text-center text-base font-extrabold text-zinc-600 transition-colors hover:text-zinc-900 disabled:cursor-not-allowed cursor-pointer py-1"
            >
              Hủy bỏ
            </button>
          </div>
        </form>
      )}

      {step === "newEmail" && (
        <form
          onSubmit={handleSaveEmail}
          className="relative flex w-full max-w-[440px] flex-col gap-6 rounded-[32px] border border-zinc-200/60 bg-white p-8 shadow-2xl dark:border-zinc-800/80 dark:bg-zinc-950 select-none"
        >
          <div className="text-center flex flex-col gap-2">
            <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[#2563eb] dark:text-blue-400">
              THAY ĐỔI EMAIL
            </h3>
            <div className="text-sm font-normal leading-relaxed text-zinc-500 dark:text-zinc-400">
              Vui lòng nhập email mới
            </div>
          </div>

          {errorMsg && (
            <Alert variant="login" className="px-3.5 py-2.5" onClose={() => setErrorMsg("")}>
              {errorMsg}
            </Alert>
          )}

          <div className="relative flex w-full flex-col justify-center rounded-2xl border border-zinc-200 bg-white px-4 py-2 transition-all focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 dark:border-zinc-800 dark:bg-zinc-950">
            <label className="absolute -top-2.5 left-4 bg-white px-1 text-[11px] font-bold text-zinc-400 dark:bg-zinc-950 dark:text-zinc-500">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                setErrorMsg("");
              }}
              placeholder="Nhập email mới"
              className="w-full border-0 bg-transparent py-2 text-base font-bold text-zinc-800 outline-none dark:text-zinc-200"
            />
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-2xl bg-[#8eaefc] hover:bg-[#7c9ff7] py-3.5 text-center text-base font-extrabold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-70 active:scale-99 cursor-pointer"
            >
              {isLoading ? "Đang lưu..." : "Lưu"}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={onCancel}
              className="w-full text-center text-base font-extrabold text-zinc-600 transition-colors hover:text-zinc-900 disabled:cursor-not-allowed cursor-pointer py-1"
            >
              Hủy bỏ
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
