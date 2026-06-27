"use client";

import React, { useState, useRef, useEffect } from "react";
import { Camera, Save, Calendar, ChevronDown } from "lucide-react";
import { ChangeEmailDialog } from "@/components/profile/ChangeEmailDialog";
import { sendChangeGmailOtp } from "@/libs/tts/services/api";
import { SearchSelect } from "./SearchSelect";
import { useAddress } from "../hooks/useAddress";

export interface UserData {
  avatarUrl: string;
  username: string;
  fullName: string;
  dob: string;
  gender: string;
  title: string;
  role: string;
  email: string;
  province: string;
  ward: string;
  address: string;
  isActive: boolean;
}

interface UserProfileProps {
  initialData: UserData;
  onSave: (data: UserData, successMessage?: string) => void;
  onCancel: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  initialData,
  onSave,
  onCancel,
  showToast,
}) => {
  const [formData, setFormData] = useState<UserData>({ ...initialData });

  const {
    provinces,
    wards,
    isLoadingProvinces,
    isLoadingWards,
    provincesError,
    wardsError,
  } = useAddress(formData.province);

  useEffect(() => {
    const err = provincesError || wardsError;
    if (err) {
      showToast(err, "error");
    }
  }, [provincesError, wardsError, showToast]);
  const [isChangeEmailOpen, setIsChangeEmailOpen] = useState(false);
  const [changeEmailExpiresInSeconds, setChangeEmailExpiresInSeconds] = useState(60);
  const [isSendingChangeEmailOtp, setIsSendingChangeEmailOtp] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dobInputRef = useRef<HTMLInputElement>(null);

  const handleCalendarClick = () => {
    try {
      dobInputRef.current?.showPicker();
    } catch {
      dobInputRef.current?.focus();
    }
  };

  // Handle Input Changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // Handle Select Changes
  const handleSelectChange = (name: keyof UserData, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // If province changes, reset ward
      if (name === "province") {
        updated.ward = "";
      }
      return updated;
    });

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // Handle Avatar Image Upload
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    // Check type
    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      showToast("Vui lòng chọn ảnh định dạng PNG, JPG hoặc JPEG.", "error");
      return;
    }

    // Check size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast("Kích thước ảnh đại diện vượt quá giới hạn 5 MB.", "error");
      return;
    }

    // Convert file to local preview URL
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormData((prev) => ({ ...prev, avatarUrl: event.target?.result as string }));
        showToast("Đã tải ảnh đại diện lên thành công!", "success");
      }
    };
    reader.readAsDataURL(file);
  };

  // Switch Toggle Active State
  const toggleActiveState = () => {
    setFormData((prev) => ({ ...prev, isActive: !prev.isActive }));
  };

  // Validate form
  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Họ và tên không được để trống.";
    }

    if (formData.dob) {
      const selectedDate = new Date(formData.dob);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);
      if (selectedDate >= today) {
        newErrors.dob = "Ngày sinh phải là một ngày trong quá khứ (trước ngày hôm nay).";
      }
    }

    if (!formData.role) {
      newErrors.role = "Vui lòng chọn vai trò.";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email không được để trống.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = "Định dạng email không hợp lệ.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save changes
  const handleSaveClick = () => {
    if (!validate()) {
      // Find the first error and show a toast
      const firstError = Object.values(errors)[0] || "Vui lòng kiểm tra lại thông tin nhập liệu.";
      showToast(firstError, "error");
      return;
    }

    onSave(formData);
    setIsChangeEmailOpen(false);
  };

  const handleOpenChangeEmail = () => {
    setIsChangeEmailOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-50 select-none">
            Chi tiết người dùng
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-sm transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSaveClick}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-md shadow-blue-500/10 active:scale-98 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Lưu</span>
          </button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        {/* Left Card: Avatar & Status */}
        <div className="xl:col-span-1 bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col items-center gap-6">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".png,.jpg,.jpeg"
            className="hidden"
          />

          {/* Avatar circle */}
          <div
            onClick={handleAvatarClick}
            className="group relative w-36 h-36 rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-blue-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 overflow-hidden"
          >
            {formData.avatarUrl ? (
              <>
                <img
                  src={formData.avatarUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Camera className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-bold">Thay ảnh</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <Camera className="w-6 h-6 text-zinc-400 dark:text-zinc-500 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">Tải ảnh đại diện</span>
              </div>
            )}
          </div>

          {/* Guidelines */}
          <div className="text-center">
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium leading-relaxed">
              *.jpeg, *.jpg, *.png.
            </p>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium leading-relaxed">
              Kích thước tối đa 5 MB
            </p>
          </div>

          <div className="h-px w-full bg-zinc-100 dark:bg-zinc-800" />

          {/* Status Switch Toggle */}
          <div className="w-full flex items-center justify-between">
            <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Kích hoạt</span>
            <button
              onClick={toggleActiveState}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer
                ${formData.isActive ? "bg-blue-600" : "bg-zinc-200 dark:bg-zinc-800"}
              `}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm
                  ${formData.isActive ? "translate-x-6" : "translate-x-1"}
                `}
              />
            </button>
          </div>
        </div>

        {/* Right Card: Personal Info & Contact Info */}
        <div className="xl:col-span-3 flex flex-col gap-6">
          {/* Card: Personal Details */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
            <h3 className="text-sm font-bold text-[#1e3a8a] dark:text-[#93c5fd] uppercase tracking-wider select-none border-b border-zinc-50 dark:border-zinc-900 pb-2">
              Thông tin cá nhân
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Username Field - Readonly */}
              <div className="relative border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl px-4 py-2 flex flex-col justify-center select-none">
                <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 font-bold">
                  Tên đăng nhập <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  readOnly
                  className="w-full bg-transparent border-0 outline-none text-zinc-500 dark:text-zinc-500 text-sm font-medium pt-2 pb-0.5 cursor-not-allowed"
                />
              </div>

              {/* Full Name Field */}
              <div className={`relative border rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 transition-all bg-white dark:bg-zinc-950
                ${errors.fullName ? "border-red-500 ring-1 ring-red-500" : "border-zinc-200 dark:border-zinc-800"}
              `}>
                <label className={`absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold transition-colors
                  ${errors.fullName ? "text-red-500" : "text-zinc-400 dark:text-zinc-500 focus-within:text-blue-500"}
                `}>
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-bold pt-2 pb-0.5"
                  placeholder="Nhập họ và tên"
                />
              </div>

              {/* DoB Datepicker */}
              <div
                onClick={handleCalendarClick}
                className="relative border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950 cursor-pointer"
              >
                <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 font-bold pointer-events-none">
                  Ngày tháng năm sinh
                </label>
                <div className="relative flex items-center justify-between w-full pt-2 pb-0.5">
                  <input
                    ref={dobInputRef}
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleInputChange}
                    className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold focus:ring-0 cursor-pointer"
                  />
                  <Calendar className="absolute right-0 w-4 h-4 text-zinc-400 pointer-events-none" />
                </div>
              </div>

              {/* Gender Dropdown Select */}
              <SearchSelect
                label="Giới tính"
                value={formData.gender}
                options={[
                  { value: "Nam", label: "Nam" },
                  { value: "Nữ", label: "Nữ" },
                  { value: "Khác", label: "Khác" },
                ]}
                placeholder="Chọn giới tính"
                onChange={(val) => handleSelectChange("gender", val)}
              />

              {/* Title Field */}
              <div className="relative border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950">
                <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 font-bold">
                  Chức danh
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold pt-2 pb-0.5"
                  placeholder="Nhập chức danh (ví dụ: Chuyên viên)"
                />
              </div>

              {/* Role Dropdown Select */}
              <SearchSelect
                label="Vai trò"
                value={formData.role}
                options={[
                  {
                    value: formData.role,
                    label: formData.role === "ADMIN" || formData.role === "Quản trị viên"
                      ? "Quản trị viên"
                      : formData.role === "MANAGER" || formData.role === "Quản lý"
                      ? "Quản lý"
                      : formData.role === "USER" || formData.role === "Nhân viên" || formData.role === "Người dùng"
                      ? "Người dùng"
                      : formData.role || "Chọn vai trò"
                  }
                ]}
                placeholder="Chọn vai trò"
                onChange={(val) => handleSelectChange("role", val)}
                error={!!errors.role}
                required
                disabled
              />

              {/* Email Field with outside "Thay đổi" Toggle */}
              <div className="md:col-span-1 flex items-end gap-3.5">
                <div className="flex-1 relative border rounded-xl px-4 py-2 flex flex-col justify-center border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/10">
                  <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold text-zinc-400 dark:text-zinc-500">
                    Email
                  </label>
                  <div className="flex items-center justify-between gap-3 pt-2 pb-0.5">
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      readOnly
                      className="w-full bg-transparent border-0 outline-none text-sm font-semibold text-zinc-500 dark:text-zinc-500 cursor-not-allowed"
                      placeholder="example@gmail.com"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenChangeEmail}
                  disabled={isSendingChangeEmailOtp}
                  className="flex-shrink-0 mb-3 text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors focus:outline-none cursor-pointer select-none disabled:cursor-not-allowed disabled:text-zinc-400"
                >
                  Thay đổi
                </button>
              </div>
            </div>
          </div>

          {/* Card: Contact Details */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
            <h3 className="text-sm font-bold text-[#1e3a8a] dark:text-[#93c5fd] uppercase tracking-wider select-none border-b border-zinc-50 dark:border-zinc-900 pb-2">
              Thông tin liên hệ
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Province Dropdown Select */}
              <SearchSelect
                label="Tỉnh/ thành phố"
                value={formData.province}
                options={provinces.map((p) => ({ value: p.name, label: p.name }))}
                placeholder={
                  isLoadingProvinces
                    ? "Đang tải danh sách..."
                    : provincesError
                    ? "Không thể tải danh sách Tỉnh/Thành phố"
                    : "Chọn tỉnh/ thành phố"
                }
                onChange={(val) => handleSelectChange("province", val)}
                disabled={isLoadingProvinces || !!provincesError}
              />

              {/* Ward Dropdown Select */}
              <SearchSelect
                label="Phường xã"
                value={formData.ward}
                options={wards.map((w) => ({ value: w.name, label: w.name }))}
                placeholder={
                  isLoadingWards
                    ? "Đang tải phường/ xã..."
                    : wardsError
                    ? "Không thể tải danh sách Phường/Xã"
                    : !formData.province
                    ? "Vui lòng chọn Tỉnh/Thành phố trước"
                    : wards.length === 0
                    ? "Không có dữ liệu Phường/Xã"
                    : "Chọn phường/ xã"
                }
                onChange={(val) => handleSelectChange("ward", val)}
                disabled={!formData.province || isLoadingWards || !!wardsError || wards.length === 0}
              />

              {/* Address Field */}
              <div className="md:col-span-2 relative border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950">
                <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 font-bold">
                  Địa chỉ
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold pt-2 pb-0.5"
                  placeholder="Số nhà, tên đường, tên khu vực"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {isChangeEmailOpen && (
        <ChangeEmailDialog
          currentEmail={formData.email}
          initialExpiresInSeconds={changeEmailExpiresInSeconds}
          onSave={(newEmail) => {
            const updatedData = { ...formData, email: newEmail };
            setFormData(updatedData);
            onSave(updatedData, "Thay đổi email thành công");
            setIsChangeEmailOpen(false);
          }}
          onCancel={() => setIsChangeEmailOpen(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
};
