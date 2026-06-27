"use client";

import React, { useState, useEffect, useRef } from "react";
import { Camera, Save, Calendar, ChevronDown, Loader2 } from "lucide-react";
import { getUserDetail, updateUserAdmin, type UserListItem } from "../services/api";
import { SearchSelect } from "./SearchSelect";
import { useAddress } from "../hooks/useAddress";

interface EditUserProps {
  user: UserListItem;
  onSave: () => void;
  onCancel: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

export const EditUser: React.FC<EditUserProps> = ({ user, onSave, onCancel, showToast }) => {
  const [formData, setFormData] = useState({
    avatarUrl: "",
    username: "",
    fullName: "",
    dob: "",
    gender: "",
    title: "",
    role: "",
    email: "",
    province: "",
    ward: "",
    address: "",
    isActive: true,
  });

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

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialAvatarUrl, setInitialAvatarUrl] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dobInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    const fetchDetail = async () => {
      try {
        const response = await getUserDetail(user.id);
        if (active && response.success && response.data) {
          const detail = response.data;
          const rawDob = detail.dateOfBirth || "";
          const formattedDob = rawDob.includes("T") ? rawDob.split("T")[0] : rawDob;

          const roleCode = (detail.roles || [])
            .map((r) => (typeof r === "string" ? r : r.code || ""))
            .find((code) => code === "ADMIN" || code === "USER") || "USER";

          setFormData({
            avatarUrl: detail.avatar || "",
            username: detail.username || "",
            fullName: detail.fullName || "",
            dob: formattedDob,
            gender: detail.gender || "",
            title: detail.position || "",
            role: roleCode,
            email: detail.email || "",
            province: detail.provinceCity || "",
            ward: detail.wardCommune || "",
            address: detail.address || "",
            isActive: detail.isActive ?? true,
          });
          setInitialAvatarUrl(detail.avatar || "");
        }
      } catch (error) {
        if (active) {
          showToast(error instanceof Error ? error.message : "Không thể tải chi tiết người dùng", "error");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const handleCalendarClick = () => {
    try {
      dobInputRef.current?.showPicker();
    } catch {
      dobInputRef.current?.focus();
    }
  };

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

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
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

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      showToast("Vui lòng chọn ảnh định dạng PNG, JPG hoặc JPEG.", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Kích thước ảnh đại diện vượt quá giới hạn 5 MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormData((prev) => ({ ...prev, avatarUrl: event.target?.result as string }));
        showToast("Đã tải ảnh đại diện lên thành công!", "success");
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleActiveState = () => {
    setFormData((prev) => ({ ...prev, isActive: !prev.isActive }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = "Tên đăng nhập không được để trống.";
    }
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

  const handleSaveClick = async () => {
    if (!validate()) {
      const firstError = Object.values(errors)[0] || "Vui lòng kiểm tra lại thông tin nhập liệu.";
      showToast(firstError, "error");
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
        gender: formData.gender,
        dateOfBirth: formData.dob || undefined,
        position: formData.title,
        roleCode: formData.role,
        isActive: formData.isActive,
        provinceCity: formData.province,
        wardCommune: formData.ward,
        address: formData.address,
      };

      if (formData.avatarUrl.startsWith("data:")) {
        payload.avatar = formData.avatarUrl;
      } else if (!formData.avatarUrl && initialAvatarUrl) {
        payload.avatar = null;
      }

      const response = await updateUserAdmin(user.id, payload);
      if (response.success) {
        showToast("Cập nhật thông tin người dùng thành công", "success");
        onSave();
      } else {
        throw new Error(response.message || "Cập nhật thất bại");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Cập nhật người dùng thất bại";
      showToast(errorMsg, "error");

      const newErrors: Record<string, string> = {};
      if (errorMsg.includes("Tên đăng nhập") || errorMsg.includes("username") || errorMsg.includes("đăng nhập")) {
        newErrors.username = errorMsg;
      } else if (errorMsg.includes("Email") || errorMsg.includes("email")) {
        newErrors.email = errorMsg;
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center text-sm font-semibold text-zinc-500">
        <div className="flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span>Đang tải thông tin chi tiết người dùng...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-50 select-none">
            Chi tiết người dùng
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 font-bold text-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSaveClick}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-md shadow-blue-500/10 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSaving ? "Đang lưu..." : "Lưu"}</span>
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
                  alt="Avatar Preview"
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
          <div className="text-center select-none">
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
              {/* Username Input - Readonly for Admin */}
              <div className="relative border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl px-4 py-2 flex flex-col justify-center select-none">
                <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 font-bold">
                  Tên đăng nhập
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  readOnly
                  className="w-full bg-transparent border-0 outline-none text-zinc-500 dark:text-zinc-500 text-sm font-medium pt-2 pb-0.5 cursor-not-allowed"
                />
              </div>

              {/* Full Name Input */}
              <div className={`relative border rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 transition-all bg-white dark:bg-zinc-950
                ${errors.fullName ? "border-red-500 ring-1 ring-red-500" : "border-zinc-200 dark:border-zinc-800"}
              `}>
                <label className={`absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold transition-colors
                  ${errors.fullName ? "text-red-500" : "text-zinc-400 dark:text-zinc-500"}
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

              {/* Title Input */}
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
                  placeholder="Nhập chức danh"
                />
              </div>

              {/* Role Dropdown Select */}
              <SearchSelect
                label="Vai trò"
                value={formData.role}
                options={[
                  { value: "ADMIN", label: "Quản trị viên" },
                  { value: "USER", label: "Người dùng" },
                ]}
                placeholder="Chọn vai trò"
                onChange={(val) => handleSelectChange("role", val)}
                error={!!errors.role}
                required
              />

              {/* Email Input */}
              <div className={`relative border rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 transition-all bg-white dark:bg-zinc-950
                ${errors.email ? "border-red-500 ring-1 ring-red-500" : "border-zinc-200 dark:border-zinc-800"}
              `}>
                <label className={`absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold transition-colors
                  ${errors.email ? "text-red-500" : "text-zinc-400 dark:text-zinc-500"}
                `}>
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-bold pt-2 pb-0.5"
                  placeholder="Nhập email"
                />
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

              {/* Address Input */}
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
    </div>
  );
};
