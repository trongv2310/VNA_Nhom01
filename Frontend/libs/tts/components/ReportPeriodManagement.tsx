"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Pencil,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Save,
  Calendar,
  Loader2,
} from "lucide-react";
import {
  getReportPeriods,
  createReportPeriod,
  updateReportPeriod,
  updateReportPeriodStatus,
} from "../services/api";

interface ReportPeriodManagementProps {
  showToast: (message: string, type: "success" | "error") => void;
}

interface ReportPeriodItem {
  id: number;
  reportName: string;
  year: number;
  periodType: "SIX_MONTHS" | "FULL_YEAR";
  startDate: string;
  endDate: string;
  isActive: boolean;
}

// ==========================================
// FLOATING LABEL UI HELPER COMPONENTS
// ==========================================

interface FloatingSelectProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  error?: string;
}

const FloatingSelect: React.FC<FloatingSelectProps> = ({
  label,
  value,
  onChange,
  options,
  error,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const isFloating = isFocused || value !== "";

  return (
    <div className="flex flex-col gap-1 w-full select-none">
      <div className={`relative border rounded-lg px-3.5 py-2.5 bg-white dark:bg-zinc-950 transition-all flex items-center justify-between
        ${error 
          ? "border-red-500 focus-within:ring-1 focus-within:ring-red-500 focus-within:border-red-500" 
          : "border-zinc-200 dark:border-zinc-800 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
        }`}
      >
        <span className={`absolute left-3 px-1 transition-all duration-150 pointer-events-none select-none bg-white dark:bg-zinc-950 text-zinc-450 dark:text-zinc-500
          ${isFloating 
            ? "top-0 -translate-y-1/2 text-[11px] font-semibold bg-white dark:bg-zinc-950 px-1 text-zinc-400 dark:text-zinc-500" 
            : "top-1/2 -translate-y-1/2 text-sm text-zinc-400 dark:text-zinc-500"
          }`}
        >
          {label}
        </span>

        <select
          value={value}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-sm font-semibold outline-none border-none bg-transparent text-zinc-800 dark:text-zinc-200 appearance-none cursor-pointer"
        >
          <option value="" disabled className="text-zinc-400 font-normal">
            {label}
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="text-zinc-850 dark:text-zinc-150 font-bold">
              {opt.label}
            </option>
          ))}
        </select>

        <ChevronDown className="w-5 h-5 text-zinc-400 dark:text-zinc-650 pointer-events-none ml-2" />
      </div>
      {error && <span className="text-[11px] font-semibold text-red-500 pl-1">{error}</span>}
    </div>
  );
};

interface FloatingDateInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  error?: string;
}

const FloatingDateInput: React.FC<FloatingDateInputProps> = ({
  label,
  value,
  onChange,
  error,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const isFloating = isFocused || !!value;
  const nativeInputRef = useRef<HTMLInputElement>(null);

  // Format YYYY-MM-DD -> DD/MM/YYYY
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const handleContainerClick = () => {
    if (nativeInputRef.current) {
      try {
        nativeInputRef.current.showPicker();
      } catch (e) {
        nativeInputRef.current.focus();
      }
    }
  };

  return (
    <div className="flex flex-col gap-1 w-full select-none">
      <div
        onClick={handleContainerClick}
        className={`relative border rounded-lg px-3.5 py-2.5 bg-white dark:bg-zinc-950 transition-all flex items-center justify-between cursor-pointer
          ${error 
            ? "border-red-500 focus-within:ring-1 focus-within:ring-red-500 focus-within:border-red-500" 
            : "border-zinc-200 dark:border-zinc-800 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
          }`}
      >
        <span className={`absolute left-3 px-1 transition-all duration-150 pointer-events-none select-none bg-white dark:bg-zinc-950 text-zinc-455 dark:text-zinc-500
          ${isFloating 
            ? "top-0 -translate-y-1/2 text-[11px] font-semibold bg-white dark:bg-zinc-950 px-1 text-zinc-400 dark:text-zinc-500" 
            : "top-1/2 -translate-y-1/2 text-sm text-zinc-400 dark:text-zinc-500"
          }`}
        >
          {label}
        </span>

        <span className={`text-sm font-bold select-none ${value ? "text-zinc-855 dark:text-zinc-150" : "text-zinc-400"}`}>
          {value ? formatDisplayDate(value) : (isFocused ? "" : label)}
        </span>

        {/* Hidden Native Input */}
        <input
          ref={nativeInputRef}
          type="date"
          value={value}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        />

        <Calendar className="w-5 h-5 text-zinc-400 dark:text-zinc-650 pointer-events-none ml-2" />
      </div>
      {error && <span className="text-[11px] font-semibold text-red-500 pl-1">{error}</span>}
    </div>
  );
};

interface FloatingYearInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  error?: string;
}

const FloatingYearInput: React.FC<FloatingYearInputProps> = ({
  label,
  value,
  onChange,
  error,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const isFloating = isFocused || !!value;
  const inputRef = useRef<HTMLInputElement>(null);

  const handleContainerClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="flex flex-col gap-1 w-full select-none">
      <div
        onClick={handleContainerClick}
        className={`relative border rounded-lg px-3.5 py-2.5 bg-white dark:bg-zinc-950 transition-all flex items-center justify-between cursor-text
          ${error 
            ? "border-red-500 focus-within:ring-1 focus-within:ring-red-500 focus-within:border-red-500" 
            : "border-zinc-200 dark:border-zinc-800 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
          }`}
      >
        <span className={`absolute left-3 px-1 transition-all duration-150 pointer-events-none select-none bg-white dark:bg-zinc-950 text-zinc-455 dark:text-zinc-500
          ${isFloating 
            ? "top-0 -translate-y-1/2 text-[11px] font-semibold bg-white dark:bg-zinc-950 px-1 text-zinc-400 dark:text-zinc-500" 
            : "top-1/2 -translate-y-1/2 text-sm text-zinc-400 dark:text-zinc-500"
          }`}
        >
          {label}
        </span>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
          placeholder={isFocused ? "" : label}
          className="w-full text-sm font-bold outline-none border-none bg-transparent text-zinc-850 dark:text-zinc-150"
        />

        <Calendar className="w-5 h-5 text-zinc-400 dark:text-zinc-650 pointer-events-none ml-2" />
      </div>
      {error && <span className="text-[11px] font-semibold text-red-500 pl-1">{error}</span>}
    </div>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

export const ReportPeriodManagement: React.FC<ReportPeriodManagementProps> = ({
  showToast,
}) => {
  // Lists & Pagination
  const [periods, setPeriods] = useState<ReportPeriodItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);

  // Search & Filter State
  const [filterYear, setFilterYear] = useState<string>("");
  const [filterReportName, setFilterReportName] = useState<string>("");
  const [filterPeriodType, setFilterPeriodType] = useState<string>("");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  const [filterIsActive, setFilterIsActive] = useState<string>("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPeriod, setEditingPeriod] = useState<ReportPeriodItem | null>(null);

  // Form State
  const [formReportName, setFormReportName] = useState<string>("");
  const [formYear, setFormYear] = useState<string>("");
  const [formPeriodType, setFormPeriodType] = useState<string>("");
  const [formStartDate, setFormStartDate] = useState<string>("");
  const [formEndDate, setFormEndDate] = useState<string>("");
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch report periods from backend
  const fetchPeriods = async () => {
    setIsLoading(true);
    try {
      const response = await getReportPeriods({
        page,
        limit,
        year: filterYear || undefined,
        reportName: filterReportName || undefined,
        periodType: filterPeriodType || undefined,
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined,
        isActive: filterIsActive === "" ? undefined : filterIsActive === "true",
      });

      if (response.success && response.data) {
        setPeriods(response.data.items || []);
        setTotalItems(response.data.meta?.totalItems || (response.data.items?.length || 0));
      } else {
        showToast(response.message || "Không thể tải danh sách kỳ báo cáo", "error");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Lỗi khi kết nối với máy chủ", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchPeriods();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [page, limit, filterYear, filterReportName, filterPeriodType, filterStartDate, filterEndDate, filterIsActive]);

  // Formate Date helper: YYYY-MM-DD -> DD/MM/YYYY
  const formatDateToFE = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Toggle Active Status
  const handleToggleStatus = async (item: ReportPeriodItem) => {
    try {
      const newStatus = !item.isActive;
      const res = await updateReportPeriodStatus(item.id, newStatus);
      if (res.success) {
        showToast(`Cập nhật trạng thái kỳ báo cáo thành công!`, "success");
        // Update local list state
        setPeriods(prev =>
          prev.map(p => (p.id === item.id ? { ...p, isActive: newStatus } : p))
        );
      } else {
        showToast(res.message || "Cập nhật trạng thái thất bại", "error");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Lỗi khi cập nhật trạng thái", "error");
    }
  };

  // Open Modal for Add
  const handleOpenAdd = () => {
    setEditingPeriod(null);
    setFormReportName("");
    setFormYear("");
    setFormPeriodType("");
    setFormStartDate("");
    setFormEndDate("");
    setFormIsActive(true);
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (item: ReportPeriodItem) => {
    setEditingPeriod(item);
    setFormReportName(item.reportName);
    setFormYear(item.year.toString());
    setFormPeriodType(item.periodType);
    setFormStartDate(item.startDate);
    setFormEndDate(item.endDate);
    setFormIsActive(item.isActive);
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Auto-fill dates based on year and period selection
  useEffect(() => {
    const yearNum = Number(formYear);
    if (isModalOpen && /^\d{4}$/.test(formYear.trim()) && yearNum >= 2000 && yearNum <= 2100 && formPeriodType) {
      if (formPeriodType === "SIX_MONTHS") {
        const targetStart = `${yearNum}-07-01`;
        const targetEnd = `${yearNum}-07-05`;
        if (formStartDate !== targetStart || formEndDate !== targetEnd) {
          setFormStartDate(targetStart);
          setFormEndDate(targetEnd);
        }
      } else if (formPeriodType === "FULL_YEAR") {
        const nextY = yearNum + 1;
        const targetStart = `${nextY}-01-01`;
        const targetEnd = `${nextY}-01-10`;
        if (formStartDate !== targetStart || formEndDate !== targetEnd) {
          setFormStartDate(targetStart);
          setFormEndDate(targetEnd);
        }
      }
    }
  }, [formYear, formPeriodType, isModalOpen]);

  // Validate form inputs
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formReportName) {
      errors.reportName = "Bắt buộc chọn tên báo cáo";
    }
    
    // Year validation
    const yearNum = Number(formYear);
    if (!formYear.trim() || isNaN(yearNum) || !/^\d{4}$/.test(formYear.trim()) || yearNum < 2000 || yearNum > 2100) {
      errors.year = "Năm phải là số có 4 chữ số (ví dụ: 2027)";
    }

    if (!formPeriodType) {
      errors.periodType = "Bắt buộc chọn kỳ báo cáo";
    }
    if (!formStartDate) {
      errors.startDate = "Bắt buộc chọn ngày bắt đầu";
    }
    if (!formEndDate) {
      errors.endDate = "Bắt buộc chọn ngày kết thúc";
    }

    // Special validation rules for start date & deadline based on year and period
    if (!errors.year && formPeriodType && formStartDate && formEndDate) {
      const start = new Date(formStartDate);
      const end = new Date(formEndDate);
      if (end <= start) {
        errors.startDate = "Ngày bắt đầu phải trước ngày kết thúc";
        errors.endDate = "Ngày kết thúc phải sau ngày bắt đầu";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Form: Save or Update
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Check duplicate using the API first to show inline error
      const checkRes = await getReportPeriods({
        year: formYear,
        periodType: formPeriodType,
        limit: 100,
      });

      if (checkRes.success && checkRes.data) {
        const existingItems = checkRes.data.items || [];
        const hasDuplicate = existingItems.some(
          (p: any) => !editingPeriod || String(p.id) !== String(editingPeriod.id)
        );
        if (hasDuplicate) {
          setFormErrors(prev => ({
            ...prev,
            periodType: `Kỳ báo cáo ${formPeriodType === "SIX_MONTHS" ? "6 tháng" : "Cả năm"} của năm ${formYear} đã tồn tại!`,
          }));
          setIsLoading(false);
          return;
        }
      }

      const payload = {
        reportName: formReportName,
        year: Number(formYear),
        periodType: formPeriodType,
        startDate: formStartDate,
        endDate: formEndDate,
        isActive: formIsActive,
      };

      let res;
      if (editingPeriod) {
        res = await updateReportPeriod(editingPeriod.id, payload);
      } else {
        res = await createReportPeriod(payload);
      }

      if (res.success) {
        showToast(
          editingPeriod
            ? "Cập nhật kỳ báo cáo thành công!"
            : "Thêm mới kỳ báo cáo thành công!",
          "success"
        );
        setIsModalOpen(false);
        fetchPeriods();
      } else {
        showToast(res.message || "Lưu thất bại", "error");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Lỗi khi lưu thông tin kỳ báo cáo", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Pagination helpers
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const startIdx = totalItems > 0 ? (page - 1) * limit + 1 : 0;
  const endIdx = Math.min(page * limit, totalItems);

  return (
    <div className="flex flex-col gap-6 h-full text-zinc-700 dark:text-zinc-350 relative select-none">
      {/* Top Card Panel - Clean white border, no blue header accent */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-950 rounded-2xl p-4.5 shadow-sm border border-zinc-200/60 dark:border-zinc-800/80">
        <h2 className="text-md font-bold text-zinc-800 dark:text-zinc-100">
          Danh sách cấu hình báo cáo
        </h2>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-md shadow-blue-500/10 active:scale-98 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Thêm mới</span>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="relative flex-1 bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        {/* Table Spinner */}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 dark:bg-zinc-950/60 backdrop-blur-[1px]">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        )}

        <div className="flex-1 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              {/* Columns Header */}
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-zinc-500 dark:text-zinc-400 text-xs font-bold bg-[#f8fafc] dark:bg-zinc-900/10 select-none">
                <th className="p-4 w-24 text-center">Thao tác</th>
                <th className="p-4 w-32">Năm báo cáo</th>
                <th className="p-4 min-w-[280px]">Tên báo cáo</th>
                <th className="p-4 w-44">Kỳ báo cáo</th>
                <th className="p-4 w-48">Thời gian bắt đầu</th>
                <th className="p-4 w-48">Thời gian kết thúc</th>
                <th className="p-4 w-32 text-center">Trạng thái</th>
              </tr>

              {/* Filtering Fields */}
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 select-none">
                {/* Actions spacer */}
                <td className="p-2"></td>
                {/* Filter Year */}
                <td className="p-2">
                  <input
                    type="text"
                    value={filterYear}
                    onChange={(e) => {
                      setFilterYear(e.target.value.replace(/\D/g, ""));
                      setPage(1);
                    }}
                    className="w-full text-xs px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 focus:border-blue-500 transition-colors font-semibold"
                  />
                </td>
                {/* Filter Report Name */}
                <td className="p-2 relative">
                  <select
                    value={filterReportName}
                    onChange={(e) => {
                      setFilterReportName(e.target.value);
                      setPage(1);
                    }}
                    className="w-full text-xs pl-3 pr-8 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 appearance-none cursor-pointer focus:border-blue-500 transition-colors font-semibold"
                  >
                    <option value=""></option>
                    <option value="Báo cáo TNLĐ">Báo cáo tai nạn lao động</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                </td>
                {/* Filter Period Type */}
                <td className="p-2 relative">
                  <select
                    value={filterPeriodType}
                    onChange={(e) => {
                      setFilterPeriodType(e.target.value);
                      setPage(1);
                    }}
                    className="w-full text-xs pl-3 pr-8 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 appearance-none cursor-pointer focus:border-blue-500 transition-colors font-semibold"
                  >
                    <option value=""></option>
                    <option value="SIX_MONTHS">6 tháng</option>
                    <option value="FULL_YEAR">Cả năm</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                </td>
                {/* Filter Start Date */}
                <td className="p-2 relative">
                  <input
                    type={filterStartDate ? "date" : "text"}
                    value={filterStartDate}
                    onFocus={(e) => { e.target.type = "date"; }}
                    onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }}
                    onChange={(e) => {
                      setFilterStartDate(e.target.value);
                      setPage(1);
                    }}
                    placeholder="dd/mm/yyyy"
                    className="w-full text-xs px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-400 dark:text-zinc-555 focus:border-blue-500 transition-colors font-semibold"
                  />
                </td>
                {/* Filter End Date */}
                <td className="p-2 relative">
                  <input
                    type={filterEndDate ? "date" : "text"}
                    value={filterEndDate}
                    onFocus={(e) => { e.target.type = "date"; }}
                    onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }}
                    onChange={(e) => {
                      setFilterEndDate(e.target.value);
                      setPage(1);
                    }}
                    placeholder="dd/mm/yyyy"
                    className="w-full text-xs px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-400 dark:text-zinc-555 focus:border-blue-500 transition-colors font-semibold"
                  />
                </td>
                {/* Filter Active Status */}
                <td className="p-2 relative">
                  <select
                    value={filterIsActive}
                    onChange={(e) => {
                      setFilterIsActive(e.target.value);
                      setPage(1);
                    }}
                    className="w-full text-xs pl-3 pr-8 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 appearance-none cursor-pointer focus:border-blue-500 transition-colors font-semibold"
                  >
                    <option value=""></option>
                    <option value="true">Hoạt động</option>
                    <option value="false">Ngưng hoạt động</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                </td>
              </tr>
            </thead>

            <tbody>
              {periods.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-zinc-400 dark:text-zinc-555 font-semibold text-sm">
                    Không tìm thấy cấu hình kỳ báo cáo nào.
                  </td>
                </tr>
              ) : (
                periods.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-zinc-100 dark:border-zinc-850 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
                  >
                    {/* Actions */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-blue-600 transition-all cursor-pointer"
                        title="Chỉnh sửa cấu hình"
                      >
                        <Pencil className="w-[17px] h-[17px] text-zinc-400 hover:text-blue-600" />
                      </button>
                    </td>
                    {/* Year */}
                    <td className="p-4 text-zinc-850 dark:text-zinc-150">
                      {item.year}
                    </td>
                    {/* Report Name */}
                    <td className="p-4 text-zinc-850 dark:text-zinc-150">
                      {item.reportName === "Báo cáo TNLĐ" ? "Báo cáo tai nạn lao động" : item.reportName}
                    </td>
                    {/* Period Type */}
                    <td className="p-4 text-zinc-550 dark:text-zinc-400">
                      {item.periodType === "FULL_YEAR" ? "Cả năm" : "6 tháng"}
                    </td>
                    {/* Start Date */}
                    <td className="p-4 font-mono text-xs text-zinc-550 dark:text-zinc-400">
                      {formatDateToFE(item.startDate)}
                    </td>
                    {/* End Date */}
                    <td className="p-4 font-mono text-xs text-zinc-550 dark:text-zinc-400">
                      {formatDateToFE(item.endDate)}
                    </td>
                    {/* Status Toggle Switch */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            item.isActive ? "bg-blue-600" : "bg-zinc-200 dark:bg-zinc-800"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              item.isActive ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-semibold text-zinc-500 gap-6 select-none">
          <div className="flex items-center gap-2">
            <select
              className="px-2 py-1 border border-zinc-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-950 outline-none text-zinc-700 dark:text-zinc-300 cursor-pointer font-bold"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          <span className="font-bold">
            {totalItems > 0 ? `${startIdx} - ${endIdx} of ${totalItems}` : "0 - 0 of 0"}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1 || isLoading}
              className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-650 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages || isLoading}
              className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-650 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* ADD / EDIT MODAL CONFIGURATION */}
      {/* ========================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <form
            onSubmit={handleSave}
            className="relative bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-[20px] w-full max-w-[620px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-zinc-100 dark:border-zinc-900 bg-white dark:bg-zinc-950">
              <h3 className="text-md font-bold text-zinc-850 dark:text-zinc-100 select-none">
                {editingPeriod ? "Chỉnh sửa" : "Thêm mới"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-250 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-6.5">
              {/* Tên báo cáo * */}
              <FloatingSelect
                label="Tên báo cáo *"
                value={formReportName}
                onChange={setFormReportName}
                options={[{ value: "Báo cáo TNLĐ", label: "Báo cáo TNLĐ" }]}
                error={formErrors.reportName}
              />

              {/* Row Grid: Năm * & Kỳ báo cáo * */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5.5">
                {/* Năm * */}
                <FloatingYearInput
                  label="Năm *"
                  value={formYear}
                  onChange={setFormYear}
                  error={formErrors.year}
                />

                {/* Kỳ báo cáo * */}
                <FloatingSelect
                  label="Kỳ báo cáo *"
                  value={formPeriodType}
                  onChange={setFormPeriodType}
                  options={[
                    { value: "SIX_MONTHS", label: "6 tháng" },
                    { value: "FULL_YEAR", label: "Cả năm" },
                  ]}
                  error={formErrors.periodType}
                />
              </div>

              {/* Row Grid: Ngày bắt đầu * & Ngày kết thúc * */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5.5">
                {/* Ngày bắt đầu * */}
                <FloatingDateInput
                  label="Ngày bắt đầu *"
                  value={formStartDate}
                  onChange={setFormStartDate}
                  error={formErrors.startDate}
                />

                {/* Ngày kết thúc * */}
                <FloatingDateInput
                  label="Ngày kết thúc *"
                  value={formEndDate}
                  onChange={setFormEndDate}
                  error={formErrors.endDate}
                />
              </div>

              {/* Trạng thái */}
              <FloatingSelect
                label="Trạng thái"
                value={formIsActive ? "true" : "false"}
                onChange={(val) => setFormIsActive(val === "true")}
                options={[
                  { value: "true", label: "Hoạt động" },
                  { value: "false", label: "Ngưng hoạt động" },
                ]}
              />

              {/* Footer Save Button - Embedded inline at bottom right, no extra footer background */}
              <div className="flex items-center justify-end mt-4 select-none">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  <Save className="w-4.5 h-4.5" />
                  <span>Lưu</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
