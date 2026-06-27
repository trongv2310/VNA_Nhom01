"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/libs/core/components/Button";
import { Card, CardBody } from "@/libs/core/components/Card";
import { Alert } from "@/libs/core/components/Alert";
import { LoginAlert } from "@/components/auth/LoginAlert";
import { Columns, Image as ImageIcon, AlertCircle, CheckCircle2, X } from "lucide-react";
import { login } from "../../services/api";
import { CreateEnterprise } from "../../components/CreateEnterprise";

export const DepartmentLoginScreen: React.FC = () => {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [layout, setLayout] = useState<"unsplash" | "split">("unsplash");
  
  const [showRegister, setShowRegister] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
  };

  // Load layout preference on mount to avoid Next.js hydration mismatch
  useEffect(() => {
    const savedLayout = localStorage.getItem("login-layout") as "unsplash" | "split" | null;
    if (savedLayout === "unsplash" || savedLayout === "split") {
      const timer = window.setTimeout(() => setLayout(savedLayout), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  const toggleLayout = () => {
    const nextLayout = layout === "unsplash" ? "split" : "unsplash";
    setLayout(nextLayout);
    localStorage.setItem("login-layout", nextLayout);
  };

  const showAlert = (msg: string) => {
    setAlertMsg(null);
    setAlertMessage(msg);
    setAlertOpen(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertMsg(null);
    setAlertOpen(false);

    if (!username.trim() || !password) {
      showAlert("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    setIsLoading(true);
    try {
      const response = await login(username.trim(), password, rememberMe);
      setAlertOpen(false);
      setAlertMsg({
        type: "success",
        text: response.message || "Đăng nhập thành công. Đang chuyển hướng...",
      });
      window.setTimeout(() => {
        router.push("/department/dashboard");
      }, 700);
    } catch (error) {
      showAlert(error instanceof Error ? error.message : "Đăng nhập thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  const isUnsplash = layout === "unsplash";

  return (
    <div className="min-h-screen w-full font-sans relative flex flex-col md:flex-row bg-white overflow-hidden">
      {/* Unsplash Background Image Layer */}
      <div
        className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500 ease-in-out z-0 ${isUnsplash ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        style={{
          backgroundImage: "url('/images/marina-lobato-kG7pOXbBfNs-unsplash.jpg')",
        }}
      />

      {/* Dark overlay for Unsplash background */}
      <div
        className={`absolute inset-0 bg-slate-900/10 pointer-events-none transition-opacity duration-500 ease-in-out z-0 ${isUnsplash ? "opacity-100" : "opacity-0"
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
        className={`hidden md:flex items-center justify-center bg-white transition-all duration-500 ease-in-out overflow-hidden z-10 ${isUnsplash ? "w-0 opacity-0 pointer-events-none" : "w-1/2 lg:w-7/12 opacity-100"
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

      {/* Right/Centered side containing the login card */}
      <div
        className={`flex items-center justify-center p-6 sm:p-12 z-10 transition-all duration-500 ease-in-out ${isUnsplash
          ? "w-full"
          : "w-full md:w-1/2 lg:w-5/12 bg-white"
          }`}
      >
        <Card
          glassmorphism={false}
          className="!rounded-3xl border border-zinc-200/80 dark:border-zinc-200/80 shadow-2xl !bg-white !text-zinc-900 w-full max-w-[500px] animate-slide-up-fade"
        >
          <CardBody className="p-8 md:p-10 flex flex-col gap-6 items-center">

            {/* Vietnamese National Emblem Image from public/icons */}
            <div className="w-24 h-24 flex items-center justify-center select-none animate-pulse-subtle">
              <img
                src="/icons/Emblem_of_Vietnam.svg"
                alt="Emblem of Vietnam"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Software Description Title */}
            <h1 className="text-lg md:text-xl font-bold text-center !text-zinc-900 leading-snug px-2 uppercase select-none tracking-tight">
              Phần Mềm Quản Lý - Tạo Lập Cơ Sở Dữ Liệu An Toàn Vệ Sinh Lao Động
            </h1>

            {/* Alert Message Box */}
            {alertMsg && (
              <Alert variant={alertMsg.type} className="w-full" onClose={() => setAlertMsg(null)}>
                {alertMsg.text}
              </Alert>
            )}

            <LoginAlert
              open={alertOpen}
              message={alertMessage}
              onClose={() => setAlertOpen(false)}
            />

            <form onSubmit={handleLogin} className="w-full flex flex-col gap-5 mt-2">

              {/* Form Section Header */}
              <div className="flex flex-col border-b border-zinc-100 pb-2">
                <h2 className="text-[#3b82f6] font-bold text-sm uppercase tracking-wider select-none">
                  Đăng nhập
                </h2>
              </div>

              {/* Username Input Field */}
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-semibold !text-zinc-500 select-none">
                  Tên tài khoản <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center w-full rounded-md border border-zinc-300 focus-within:border-[#3b82f6] focus-within:ring-1 focus-within:ring-[#3b82f6] !bg-white transition-all duration-200 shadow-sm">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm !text-zinc-950 outline-none bg-transparent placeholder-zinc-400 font-medium"
                    placeholder="Nhập tên tài khoản"
                  />
                </div>
              </div>

              {/* Password Input Field */}
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-semibold !text-zinc-500 select-none">
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center w-full rounded-md border border-zinc-300 focus-within:border-[#3b82f6] focus-within:ring-1 focus-within:ring-[#3b82f6] !bg-white transition-all duration-200 shadow-sm">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm !text-zinc-950 outline-none bg-transparent placeholder-zinc-400 font-medium tracking-wide"
                    placeholder="Nhập mật khẩu"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-zinc-400 hover:text-zinc-600 transition-colors focus:outline-none cursor-pointer"
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
                </div>
              </div>

              {/* Remember Login & Forgot Password */}
              <div className="flex items-center justify-between text-xs select-none">
                <label className="flex items-center gap-2 cursor-pointer !text-zinc-600 hover:!text-zinc-900 font-semibold">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 text-[#3b82f6] focus:ring-[#3b82f6] accent-[#3b82f6] cursor-pointer"
                  />
                  <span>Nhớ đăng nhập</span>
                </label>

                <Link
                  href="/department/forgot-password"
                  className="font-bold text-[#3b82f6] hover:text-blue-700 transition-colors"
                >
                  Quên mật khẩu
                </Link>
              </div>

              {/* Login Buttons */}
              <div className="flex flex-col gap-3 mt-2">
                <Button
                  type="submit"
                  isLoading={isLoading}
                  className="w-full !rounded-md bg-[#2563eb] hover:bg-[#1d4ed8] text-white py-2.5 font-bold shadow-md shadow-blue-500/10 active:scale-99 transition-all text-sm cursor-pointer"
                >
                  Đăng nhập
                </Button>

                <button
                  type="button"
                  onClick={() => setShowRegister(true)}
                  className="w-full py-2.5 rounded-md border border-[#2563eb] text-[#2563eb] hover:bg-blue-50/50 active:scale-99 transition-all text-sm font-bold bg-transparent cursor-pointer"
                >
                  Đăng ký tài khoản doanh nghiệp
                </button>
              </div>
            </form>

          </CardBody>
        </Card>
      </div>
      
      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm overflow-y-auto">
          <div onClick={() => setShowRegister(false)} className="absolute inset-0" />
          <div className="relative bg-slate-50 dark:bg-zinc-900 w-full max-w-5xl rounded-[24px] shadow-2xl p-6 md:p-8 overflow-y-auto max-h-[92vh] border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
            <CreateEnterprise
              businessTypes={[]}
              isRegistration={true}
              onSave={() => {
                setShowRegister(false);
                showToast("Đăng ký tài khoản doanh nghiệp thành công!", "success");
              }}
              onCancel={() => setShowRegister(false)}
              showToast={showToast}
            />
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed top-6 left-1/2 z-[9999] flex items-center gap-4 rounded-xl px-5 py-3.5 text-sm font-semibold shadow-lg border select-none transition-all animate-in fade-in slide-in-from-top-5 duration-300 w-[min(480px,calc(100vw-32px))] -translate-x-1/2 ${
            toast.type === "success"
              ? "bg-[#e9ffd7] text-[#147a22] border-[#c2f0a5]"
              : "bg-red-50 text-red-800 border-red-100"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 rounded-full bg-[#52d934] text-white" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500 fill-white" />
          )}
          <span className="flex-1 pr-2">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className={`rounded-lg p-1 transition-colors ${
              toast.type === "success"
                ? "text-[#0f5132] hover:bg-black/5"
                : "text-red-800 hover:bg-black/5"
            }`}
          >
            <X className="h-4.5 w-4.5 stroke-[2.5]" />
          </button>
        </div>
      )}
    </div>
  );
};
