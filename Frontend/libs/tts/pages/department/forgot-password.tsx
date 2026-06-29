"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/libs/core/components/Button";
import { Card, CardBody } from "@/libs/core/components/Card";
import { Alert } from "@/libs/core/components/Alert";
import { Columns, Image as ImageIcon } from "lucide-react";
import {
  requestForgotPassword,
  resetPassword,
  verifyForgotPasswordOtp,
} from "../../services/api";

type Step = "REQUEST" | "VERIFY_OTP" | "SUCCESS";

const EyeIcon: React.FC = () => (
  <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const EyeOffIcon: React.FC = () => (
  <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);

export const DepartmentForgotPasswordScreen: React.FC = () => {
  const router = useRouter();
  const [step, setStep] = useState<Step>("REQUEST");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // OTP State
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [timer, setTimer] = useState(60);

  // Password State
  const [passwordNew, setPasswordNew] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [pwdErrors, setPwdErrors] = useState<{ new?: string; confirm?: string }>({});
  const [showPasswordNew, setShowPasswordNew] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // Redirect Count
  const [redirectCount, setRedirectCount] = useState(5);

  const [layout, setLayout] = useState<"unsplash" | "split">("unsplash");

  // Load layout preference on mount to avoid Next.js hydration mismatch
  useEffect(() => {
    const savedLayout = localStorage.getItem("forgot-password-layout") as "unsplash" | "split" | null;
    if (savedLayout === "unsplash" || savedLayout === "split") {
      const timer = window.setTimeout(() => setLayout(savedLayout), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  const toggleLayout = () => {
    const nextLayout = layout === "unsplash" ? "split" : "unsplash";
    setLayout(nextLayout);
    localStorage.setItem("forgot-password-layout", nextLayout);
  };

  // OTP Countdown Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "VERIFY_OTP" && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // Password Strength Meter
  const pwdStrength = useMemo(() => {
    if (!passwordNew) {
      return { score: 0, label: "Rất yếu", color: "bg-red-500" };
    }

    let score = 0;
    if (passwordNew.length >= 8) score += 1;
    if (passwordNew.length >= 12) score += 1;
    if (/[A-Z]/.test(passwordNew)) score += 1;
    if (/[0-9]/.test(passwordNew)) score += 1;
    if (/[^A-Za-z0-9]/.test(passwordNew)) score += 1;

    const map = [
      { score: 1, label: "Rất yếu", color: "bg-red-500 w-1/5" },
      { score: 2, label: "Yếu", color: "bg-orange-500 w-2/5" },
      { score: 3, label: "Trung bình", color: "bg-yellow-500 w-3/5" },
      { score: 4, label: "Mạnh", color: "bg-emerald-500 w-4/5" },
      { score: 5, label: "Rất mạnh", color: "bg-blue-500 w-full" },
    ];

    return map.find((m) => m.score === score) || map[0];
  }, [passwordNew]);

  // Success Auto-Redirect Count
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "SUCCESS" && redirectCount > 0) {
      interval = setInterval(() => {
        setRedirectCount((prev) => {
          if (prev <= 1) {
            router.push("/department/login");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, redirectCount, router]);

  // Format Timer to mm:ss
  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Handle Step 1: Send Request
  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    setAlertMsg(null);

    const val = email.trim();
    if (!val) {
      setEmailError("Vui lòng nhập tên đăng nhập hoặc email.");
      return;
    }
    if (/\s/.test(val)) {
      setEmailError("Thông tin nhập vào không được chứa khoảng trắng.");
      return;
    }

    if (val.includes("@")) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val)) {
        setEmailError("Định dạng email không hợp lệ.");
        return;
      }
    } else {
      if (!/^[a-zA-Z0-9._-]+$/.test(val)) {
        setEmailError("Tên đăng nhập không được chứa dấu tiếng Việt hoặc ký tự đặc biệt.");
        return;
      }
    }

    setIsLoading(true);
    try {
      const response = await requestForgotPassword(val);
      setStep("VERIFY_OTP");
      setTimer(response.data.expiresInSeconds || 60);
      setOtpCode("");
      setPasswordNew("");
      setPasswordConfirm("");
      setPwdErrors({});
      setOtpError("");
      setAlertMsg({
        type: "success",
        text: String(response.message || "Mã OTP đã được gửi về email liên kết tài khoản."),
      });
    } catch (error) {
      setAlertMsg({
        type: "error",
        text: error instanceof Error ? error.message : "Không thể tạo mã OTP.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Step 2: Combined OTP & Reset Password Form
  const handleResetPasswordCombined = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    setPwdErrors({});
    setAlertMsg(null);

    let hasError = false;
    const errors: typeof pwdErrors = {};

    // Validate Password
    if (!passwordNew) {
      errors.new = "Vui lòng nhập mật khẩu mới.";
      hasError = true;
    } else {
      const pw = passwordNew.trim();
      const hasUpper = /[A-Z]/.test(pw);
      const hasLower = /[a-z]/.test(pw);
      const hasDigit = /[0-9]/.test(pw);
      const hasSpecial = /[^A-Za-z0-9]/.test(pw);
      const matchedFactors = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;

      if (pw.length < 8) {
        errors.new = "Mật khẩu phải chứa ít nhất 8 ký tự.";
        hasError = true;
      } else if (matchedFactors < 3) {
        errors.new = "Mật khẩu phải chứa ít nhất 3 trong 4 yếu tố: chữ viết hoa, chữ viết thường, chữ số, ký tự đặc biệt.";
        hasError = true;
      }
    }

    if (!passwordConfirm) {
      errors.confirm = "Vui lòng xác nhận mật khẩu mới.";
      hasError = true;
    } else if (passwordNew !== passwordConfirm) {
      errors.confirm = "Mật khẩu xác nhận không khớp.";
      hasError = true;
    }

    // Validate OTP
    if (!otpCode) {
      setOtpError("Vui lòng nhập mã OTP.");
      hasError = true;
    } else if (otpCode.length < 6) {
      setOtpError("Vui lòng nhập đầy đủ mã OTP gồm 6 chữ số.");
      hasError = true;
    }

    if (hasError) {
      if (Object.keys(errors).length > 0) {
        setPwdErrors(errors);
      }
      return;
    }

    setIsLoading(true);
    try {
      await verifyForgotPasswordOtp(email.trim(), otpCode.trim());
      await resetPassword(email.trim(), otpCode.trim(), passwordNew, passwordConfirm);
      setStep("SUCCESS");
    } catch (error) {
      setAlertMsg({
        type: "error",
        text: error instanceof Error ? error.message : "Không thể đặt lại mật khẩu.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (timer > 0) return;
    setIsLoading(true);
    try {
      const response = await requestForgotPassword(email.trim());
      setTimer(response.data.expiresInSeconds || 60);
      setOtpCode("");
      setAlertMsg({
        type: "success",
        text: String(response.message || "Mã OTP mới đã được gửi lại."),
      });
    } catch (error) {
      setAlertMsg({
        type: "error",
        text: error instanceof Error ? error.message : "Không thể gửi lại mã OTP.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isUnsplash = layout === "unsplash";

  return (
    <div className="min-h-screen w-full font-sans relative flex flex-col md:flex-row bg-white overflow-hidden">
      {/* Unsplash Background Image Layer */}
      <div
        className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500 ease-in-out z-0 ${
          isUnsplash ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{
          backgroundImage: "url('/images/marina-lobato-kG7pOXbBfNs-unsplash.jpg')",
        }}
      />

      {/* Dark overlay for Unsplash background */}
      <div
        className={`absolute inset-0 bg-slate-900/10 pointer-events-none transition-opacity duration-500 ease-in-out z-0 ${
          isUnsplash ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Floating Toggle Button */}
      <div className="absolute top-4 right-4 z-50">
        <button
          type="button"
          onClick={toggleLayout}
          className="flex items-center gap-2 px-3 py-2 rounded-full border shadow-md transition-all duration-300 cursor-pointer text-xs font-semibold bg-white border-zinc-200 text-zinc-700 hover:bg-white hover:text-zinc-950 hover:shadow-lg active:scale-95 select-none"
        >
          {isUnsplash ? (
            <>
              <Columns className="w-4 h-4 text-[#2563eb]" />
              <span>Giao diện chia đôi</span>
            </>
          ) : (
            <>
              <ImageIcon className="w-4 h-4 text-[#2563eb]" />
              <span>Giao diện ảnh nền</span>
            </>
          )}
        </button>
      </div>

      {/* Left side illustration for split layout */}
      <div
        className={`hidden md:flex items-center justify-center bg-white transition-all duration-500 ease-in-out overflow-hidden z-10 ${
          isUnsplash ? "w-0 opacity-0 pointer-events-none" : "w-1/2 lg:w-7/12 opacity-100"
        }`}
      >
        <div className="max-w-[620px] w-[90%] flex flex-col items-center justify-center transition-all duration-500">
          <img
            src="/icons/login.png"
            alt="Login Illustration"
            className="w-full h-auto max-h-[75vh] object-contain select-none"
          />
        </div>
      </div>

      {/* Right/Centered side containing the forgot-password card */}
      <div
        className={`flex items-center justify-center p-6 sm:p-12 z-10 transition-all duration-500 ease-in-out ${
          isUnsplash ? "w-full" : "w-full md:w-1/2 lg:w-5/12 bg-white"
        }`}
      >
        <Card
          glassmorphism={false}
          className="!rounded-3xl border border-zinc-200/80 dark:border-zinc-200/80 shadow-2xl !bg-white !text-zinc-900 w-full max-w-[500px] animate-slide-up-fade"
        >
          <CardBody className="p-8 md:p-10 flex flex-col gap-6 items-center">

            {/* Emblem image */}
            <div className="w-24 h-24 flex items-center justify-center select-none animate-pulse-subtle">
              <img
                src="/icons/Emblem_of_Vietnam.svg"
                alt="Emblem of Vietnam"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-center text-[#2563eb] uppercase select-none tracking-tight">
              {step === "SUCCESS" ? "KHÔI PHỤC THÀNH CÔNG" : "QUÊN MẬT KHẨU"}
            </h1>

            {/* Alert Message Box */}
            {alertMsg && (
              <Alert variant={alertMsg.type} className="w-full" onClose={() => setAlertMsg(null)}>
                {alertMsg.text}
              </Alert>
            )}

            {/* STEP 1: REQUEST EMAIL / USERNAME */}
            {step === "REQUEST" && (
              <form onSubmit={handleSendRequest} noValidate className="w-full flex flex-col gap-6">

                {/* Subtitle */}
                <div className="flex flex-col items-center pb-1">
                  <p className="text-sm font-semibold text-zinc-500 text-center select-none">
                    Vui lòng nhập tên đăng nhập hoặc email đã đăng ký
                  </p>
                </div>

                {/* Email / Username Input Field */}
                <div className="relative w-full">
                  <span className={`absolute -top-2 left-3 px-1 text-xs font-medium select-none z-10 bg-white ${emailError ? "text-red-500 font-bold" : "text-zinc-400"}`}>
                    Tên đăng nhập / Email <span className="text-red-500">*</span>
                  </span>
                  <div className={`relative flex items-center w-full rounded-lg border transition-all duration-200 shadow-sm
                    ${emailError ? "border-red-500 ring-2 ring-red-500/20 focus-within:ring-2 focus-within:ring-red-500" : "border-zinc-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"}
                  `}>
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError("");
                      }}
                      className="w-full px-3.5 py-3 text-base text-zinc-900 bg-transparent outline-none font-medium"
                      placeholder="Nhập tên đăng nhập hoặc email"
                    />
                  </div>
                  {emailError && (
                    <span className="text-xs text-red-500 font-semibold pl-1 mt-1 block animate-fade-in">{emailError}</span>
                  )}
                </div>

                {/* Submit button */}
                <Button
                  type="submit"
                  isLoading={isLoading}
                  className="w-full !rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white py-3 font-bold shadow-md shadow-blue-500/20 active:scale-99 transition-all text-base cursor-pointer"
                >
                  Gửi xác thực
                </Button>

                {/* Footer linking back to login */}
                <div className="flex justify-center text-sm font-medium text-zinc-500 select-none mt-2">
                  <span>
                    Bạn đã có tài khoản{" "}
                    <Link
                      href="/department/login"
                      className="text-[#2563eb] hover:underline font-bold transition-colors ml-1"
                    >
                      Đăng nhập
                    </Link>
                  </span>
                </div>
              </form>
            )}

            {/* STEP 2: VERIFY OTP AND RESET PASSWORD */}
            {step === "VERIFY_OTP" && (
              <form onSubmit={handleResetPasswordCombined} noValidate className="w-full flex flex-col gap-6">

                {/* Subtitle matching image */}
                <div className="flex flex-col items-center pb-1">
                  <p className="text-sm text-zinc-500 text-center select-none leading-relaxed">
                    Mã xác minh đã được gửi cho tài khoản / email <br />
                    <strong className="text-zinc-900 font-bold text-base">{email}</strong> <br />
                    Bạn vui lòng kiểm tra email và điền mã xác thực
                  </p>
                </div>

                {/* New Password input field */}
                <div className="relative w-full">
                  <span className={`absolute -top-2 left-3 px-1 text-xs font-medium select-none z-10 bg-white ${pwdErrors.new ? "text-red-500 font-bold" : "text-zinc-400"}`}>
                    Nhập mật khẩu mới <span className="text-red-500">*</span>
                  </span>
                  <div className={`relative flex items-center w-full rounded-lg border transition-all duration-200 shadow-sm
                    ${pwdErrors.new ? "border-red-500 ring-2 ring-red-500/20 focus-within:ring-2 focus-within:ring-red-500" : "border-zinc-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"}
                  `}>
                    <input
                      type={showPasswordNew ? "text" : "password"}
                      value={passwordNew}
                      onChange={(e) => {
                        setPasswordNew(e.target.value);
                        if (pwdErrors.new) setPwdErrors((prev) => ({ ...prev, new: undefined }));
                      }}
                      className="w-full pl-3.5 pr-10 py-3 text-base text-zinc-900 bg-transparent outline-none font-medium"
                      placeholder="Nhập mật khẩu mới"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordNew(!showPasswordNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center p-1 text-zinc-400 hover:text-zinc-600 focus:outline-none bg-transparent border-0 cursor-pointer"
                    >
                      {showPasswordNew ? <EyeIcon /> : <EyeOffIcon />}
                    </button>
                  </div>

                  {/* Password strength meter bar */}
                  {passwordNew && (
                    <div className="flex flex-col gap-1 px-1 mt-1.5 animate-fade-in">
                      <div className="flex items-center justify-between text-[10px] font-semibold">
                        <span className="text-zinc-500">Độ mạnh mật khẩu:</span>
                        <span className={`
                          ${pwdStrength.score <= 2 ? "text-red-500" : pwdStrength.score === 3 ? "text-yellow-500" : "text-emerald-500"}
                        `}>
                          {pwdStrength.label}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-zinc-200 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-300 ${pwdStrength.color}`}></div>
                      </div>
                    </div>
                  )}

                  {pwdErrors.new && (
                    <span className="text-xs text-red-500 font-semibold pl-1 mt-1 block animate-fade-in">{pwdErrors.new}</span>
                  )}
                </div>

                {/* Confirm Password input field */}
                <div className="relative w-full">
                  <span className={`absolute -top-2 left-3 px-1 text-xs font-medium select-none z-10 bg-white ${pwdErrors.confirm ? "text-red-500 font-bold" : "text-zinc-400"}`}>
                    Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                  </span>
                  <div className={`relative flex items-center w-full rounded-lg border transition-all duration-200 shadow-sm
                    ${pwdErrors.confirm ? "border-red-500 ring-2 ring-red-500/20 focus-within:ring-2 focus-within:ring-red-500" : "border-zinc-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"}
                  `}>
                    <input
                      type={showPasswordConfirm ? "text" : "password"}
                      value={passwordConfirm}
                      onChange={(e) => {
                        setPasswordConfirm(e.target.value);
                        if (pwdErrors.confirm) setPwdErrors((prev) => ({ ...prev, confirm: undefined }));
                      }}
                      className="w-full pl-3.5 pr-10 py-3 text-base text-zinc-900 bg-transparent outline-none font-medium"
                      placeholder="Nhập lại mật khẩu mới"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center p-1 text-zinc-400 hover:text-zinc-600 focus:outline-none bg-transparent border-0 cursor-pointer"
                    >
                      {showPasswordConfirm ? <EyeIcon /> : <EyeOffIcon />}
                    </button>
                  </div>
                  {pwdErrors.confirm && (
                    <span className="text-xs text-red-500 font-semibold pl-1 mt-1 block animate-fade-in">{pwdErrors.confirm}</span>
                  )}
                </div>

                {/* OTP Input Field */}
                <div className="relative w-full">
                  <span className={`absolute -top-2 left-3 px-1 text-xs font-medium select-none z-10 bg-white ${otpError ? "text-red-500 font-bold" : "text-zinc-400"}`}>
                    Mã OTP <span className="text-red-500">*</span>
                  </span>
                  <div className={`relative flex items-center w-full rounded-lg border transition-all duration-200 shadow-sm
                    ${otpError ? "border-red-500 ring-2 ring-red-500/20 focus-within:ring-2 focus-within:ring-red-500" : "border-zinc-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"}
                  `}>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || /^\d+$/.test(val)) {
                          setOtpCode(val);
                          if (otpError) setOtpError("");
                        }
                      }}
                      className="w-full px-3.5 py-3 text-base text-zinc-900 bg-transparent outline-none font-medium"
                      placeholder="Nhập 6 chữ số OTP"
                    />
                  </div>
                  {otpError && (
                    <span className="text-xs text-red-500 font-semibold pl-1 mt-1 block animate-fade-in">{otpError}</span>
                  )}
                </div>

                {/* Timer and Resend links */}
                <div className="flex flex-col items-center gap-1 mt-1 text-sm select-none">
                  <span className="text-[#2563eb] font-bold text-base">
                    {formatTimer(timer)}
                  </span>
                  <span className="text-zinc-500">
                    Chưa nhận được mã?{" "}
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={timer > 0 || isLoading}
                      className={`font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer transition-colors
                        ${timer > 0 ? "text-zinc-400 cursor-not-allowed" : "text-[#2563eb]"}
                      `}
                    >
                      Gửi lại
                    </button>
                  </span>
                </div>

                {/* Submit button */}
                <div className="flex flex-col gap-3 mt-2">
                  <Button
                    type="submit"
                    isLoading={isLoading}
                    className="w-full !rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white py-3 font-bold shadow-md shadow-blue-500/20 active:scale-99 transition-all text-base cursor-pointer"
                  >
                    Khôi phục mật khẩu
                  </Button>
                </div>

                {/* Footer linking back to login */}
                <div className="flex justify-center text-sm font-medium text-zinc-500 select-none mt-2">
                  <span>
                    Bạn đã có tài khoản{" "}
                    <Link
                      href="/department/login"
                      className="text-[#2563eb] hover:underline font-bold transition-colors ml-1"
                    >
                      Đăng nhập
                    </Link>
                  </span>
                </div>
              </form>
            )}

            {/* STEP 3: SUCCESS LANDING */}
            {step === "SUCCESS" && (
              <div className="flex flex-col items-center text-center gap-5 py-4 w-full animate-fade-in">

                {/* Checkmark Icon */}
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-75"></div>
                  <div className="relative w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <h3 className="text-base font-bold text-zinc-900">
                    KHÔI PHỤC MẬT KHẨU THÀNH CÔNG!
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium leading-relaxed px-4">
                    Mật khẩu của bạn đã được cập nhật thành công. Vui lòng quay lại màn hình đăng nhập.
                  </p>
                </div>

                <div className="w-full flex flex-col gap-3 mt-2 select-none">
                  <Link href="/department/login" className="w-full">
                    <Button className="w-full !rounded-lg bg-[#2563eb] text-sm py-2.5 font-bold shadow-md shadow-blue-500/10">Đăng nhập ngay</Button>
                  </Link>

                  <span className="text-[10px] text-zinc-400 font-semibold">
                    Tự động chuyển hướng sau: <strong className="text-blue-600 font-bold">{redirectCount}s</strong>
                  </span>
                </div>

              </div>
            )}

          </CardBody>
        </Card>
      </div>
    </div>
  );
};
