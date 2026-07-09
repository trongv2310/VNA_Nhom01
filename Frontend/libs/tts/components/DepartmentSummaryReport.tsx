"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  FileText,
  Loader2,
  ChevronDown,
  Printer,
} from "lucide-react";
import {
  getDepartmentReportSummary,
  getReportPeriodYears,
} from "../services/api";
import { exportSummaryReportDocx } from "../utils/reportExporter";
import { useAddress } from "../hooks/useAddress";

interface DepartmentSummaryReportProps {
  initialYear: string;
  initialProvinceCity: string;
  onBack: () => void;
  showToast: (message: string, type: "success" | "error") => void;
  canExport?: boolean;
}

interface BusinessTypeMetrics {
  totalBusinesses: number;
  participatingBusinesses: number;
  totalEmployees: number;
  participatingEmployees: number;
  femaleEmployees: number;
  totalVictims: number;
  deathVictims: number;
  severeInjuryVictims: number;
  ktnld: number;
  kchet: number;
}

export const DepartmentSummaryReport: React.FC<DepartmentSummaryReportProps> = ({
  initialYear,
  initialProvinceCity,
  onBack,
  showToast,
  canExport = true,
}) => {
  // Temporary Filters State
  const [tempYear, setTempYear] = useState(initialYear);
  const [tempPeriodType, setTempPeriodType] = useState<string>(""); // Empty means Tất cả
  const [tempProvinceCity, setTempProvinceCity] = useState(initialProvinceCity);

  // Active/Applied Filters State
  const [year, setYear] = useState(initialYear);
  const [periodType, setPeriodType] = useState<string>("");
  const [provinceCity, setProvinceCity] = useState(initialProvinceCity);

  const [availableYears, setAvailableYears] = useState<string[]>(["2022", "2023", "2024", "2025", "2026"]);

  const { provinces } = useAddress(tempProvinceCity);

  const handleApplyFilters = () => {
    setYear(tempYear);
    setPeriodType(tempPeriodType);
    setProvinceCity(tempProvinceCity);
  };

  // Data State
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);

  // Load Years
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const res = await getReportPeriodYears();
        if (res.success && res.data?.years) {
          const years = new Set<string>(["2022", "2023", "2024", "2025", "2026"]);
          res.data.years.forEach((item) => {
            years.add(String(item));
          });
          setAvailableYears(Array.from(years).sort((a, b) => Number(b) - Number(a)));
        }
      } catch (error) {
        console.error("Failed to load report periods for year filter:", error);
      }
    };
    fetchPeriods();
  }, []);

  // Fetch Summary Data
  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const res = await getDepartmentReportSummary({
        year,
        periodType: periodType || undefined,
        provinceCity: provinceCity || undefined,
      });
      if (res.success) {
        setSummaryData(res.data);
      } else {
        showToast("Không thể tải dữ liệu báo cáo tổng hợp", "error");
      }
    } catch (error: any) {
      showToast(error.message || "Lỗi khi tải dữ liệu báo cáo tổng hợp", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [year, periodType, provinceCity]);

  // Document Export Handler
  const handlePrintWord = async () => {
    if (!canExport) {
      showToast("Bạn không có quyền xuất báo cáo", "error");
      return;
    }
    if (!summaryData) {
      showToast("Không có dữ liệu để xuất báo cáo", "error");
      return;
    }
    setIsExporting(true);
    try {
      await exportSummaryReportDocx(summaryData, {
        year,
        periodType: periodType || "",
        provinceCity: provinceCity || "",
      });
      showToast("Tải báo cáo Word thành công!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Không thể xuất báo cáo Word.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  // Helper formatting function
  const formatNum = (val: any) => {
    const num = Number(val);
    if (isNaN(num) || num === 0) return "-";
    return new Intl.NumberFormat("vi-VN").format(num);
  };

  // Helper formatting function for cost values (in currency)
  const formatCost = (val: any) => {
    const num = Number(val);
    if (isNaN(num) || num === 0) return "-";
    return new Intl.NumberFormat("vi-VN").format(num);
  };

  const formatPropertyDamage = (val: any) => {
    const num = Number(val);
    if (isNaN(num) || num === 0) return "-";
    // Thiệt hại tài sản is represented in 1000 VND units as per Table II header
    return new Intl.NumberFormat("vi-VN").format(Math.round(num / 1000));
  };

  const formatRate = (val: any) => {
    const num = Number(val);
    if (isNaN(num) || num === 0) return "-";
    return num.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Standard categories
  const categories = [
    "Doanh nghiệp nhà nước",
    "Công ty trách nhiệm hữu hạn",
    "Công ty cổ phần",
    "Công ty hợp danh",
    "Doanh nghiệp tư nhân",
    "Doanh nghiệp có vốn đầu tư nước ngoài",
    "Đơn vị kinh tế tập thể",
    "Đơn vị kinh tế cá thể",
    "Đơn vị hành chính sự nghiệp, đảng, đoàn thể, hiệp hội",
  ];

  // Table I Category Metrics calculation helper
  const getCategoryRowData = (catName: string) => {
    return (
      summaryData?.byBusinessType?.[catName] || {
        totalBusinesses: 0,
        participatingBusinesses: 0,
        totalEmployees: 0,
        participatingEmployees: 0,
        femaleEmployees: 0,
        totalVictims: 0,
        deathVictims: 0,
        severeInjuryVictims: 0,
        ktnld: 0,
        kchet: 0,
      }
    );
  };

  // Table I Total Row calculation
  const getTableITotals = () => {
    const total = {
      totalBusinesses: 0,
      participatingBusinesses: 0,
      totalEmployees: 0,
      participatingEmployees: 0,
      femaleEmployees: 0,
      totalVictims: 0,
      deathVictims: 0,
      severeInjuryVictims: 0,
      ktnld: 0,
      kchet: 0,
    };

    categories.forEach((cat) => {
      const data = getCategoryRowData(cat);
      total.totalBusinesses += data.totalBusinesses || 0;
      total.participatingBusinesses += data.participatingBusinesses || 0;
      total.totalEmployees += data.totalEmployees || 0;
      total.participatingEmployees += data.participatingEmployees || 0;
      total.femaleEmployees += data.femaleEmployees || 0;
      total.totalVictims += data.totalVictims || 0;
      total.deathVictims += data.deathVictims || 0;
      total.severeInjuryVictims += data.severeInjuryVictims || 0;
    });

    if (total.participatingEmployees > 0) {
      total.ktnld = (total.totalVictims / total.participatingEmployees) * 1000;
      total.kchet = (total.deathVictims / total.participatingEmployees) * 1000;
    }

    return total;
  };

  const tableITotals = getTableITotals();

  return (
    <div className="flex flex-col gap-6 h-full text-zinc-700 dark:text-zinc-300">
      {/* Top Banner Header */}
      <div className="flex items-center justify-between border-t-4 border-blue-600 bg-white dark:bg-zinc-950 rounded-2xl p-4 shadow-sm border border-zinc-200/60 dark:border-zinc-800/80 select-none">
        <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <span>Báo cáo tổng hợp</span>
        </h2>
        <div className="flex items-center gap-3">
          {canExport && (
            <button
              disabled={isExporting}
              onClick={handlePrintWord}
              className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-md shadow-blue-500/10 active:scale-98 transition-all cursor-pointer disabled:opacity-50 select-none"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              <span>{isExporting ? "Đang tạo Word..." : "In báo cáo"}</span>
            </button>
          )}

          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 border border-zinc-250 dark:border-zinc-850 rounded-lg text-zinc-650 dark:text-zinc-350 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 font-bold text-xs select-none transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Huỷ bỏ</span>
          </button>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-zinc-950 rounded-2xl p-4 shadow-sm border border-zinc-200/60 dark:border-zinc-800/80">
        {/* Province City */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            Tỉnh/ thành phố
          </label>
          <div className="relative">
            <select
              value={tempProvinceCity}
              onChange={(e) => setTempProvinceCity(e.target.value)}
              className="w-full text-xs pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 appearance-none cursor-pointer focus:border-blue-500 transition-colors font-medium text-zinc-850 dark:text-zinc-155"
            >
              <option value="">Tất cả</option>
              {tempProvinceCity && !provinces.some((p) => p.name === tempProvinceCity) && (
                <option value={tempProvinceCity}>{tempProvinceCity}</option>
              )}
              {provinces.map((p) => (
                <option key={p.code} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
          </div>
        </div>

        {/* Year */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            Năm báo cáo
          </label>
          <div className="relative">
            <select
              value={tempYear}
              onChange={(e) => setTempYear(e.target.value)}
              className="w-full text-xs pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 appearance-none cursor-pointer focus:border-blue-500 transition-colors font-bold text-zinc-855 dark:text-zinc-155"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
          </div>
        </div>

        {/* Period */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            Kỳ báo cáo
          </label>
          <div className="relative">
            <select
              value={tempPeriodType}
              onChange={(e) => setTempPeriodType(e.target.value)}
              className="w-full text-xs pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 appearance-none cursor-pointer focus:border-blue-500 transition-colors font-medium text-zinc-850 dark:text-zinc-155"
            >
              <option value="">Tất cả</option>
              <option value="SIX_MONTHS">6 tháng</option>
              <option value="FULL_YEAR">Cả năm</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
          </div>
        </div>

        {/* Apply Button */}
        <div className="flex items-end h-full">
          <button
            onClick={handleApplyFilters}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 border border-blue-600 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs select-none transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : null}
            <span>Áp dụng</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-sm">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="text-zinc-450 dark:text-zinc-550 text-xs font-semibold">
            Đang tổng hợp dữ liệu, vui lòng đợi...
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-8 bg-white dark:bg-zinc-950 rounded-3xl p-6 border border-zinc-200/60 dark:border-zinc-800/80 shadow-sm">
          {/* Section I: Thông tin tổng quan */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider border-l-4 border-blue-600 pl-3">
              I. Thông tin tổng quan:
            </h3>

            <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm bg-white dark:bg-zinc-950">
              <table className="w-full border-collapse text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 min-w-[1200px]">
                <thead>
                  {/* Row 1 Headers */}
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/20 text-zinc-550 dark:text-zinc-400 font-bold select-none text-center">
                    <th rowSpan={3} className="p-3 border-r border-zinc-200 dark:border-zinc-800 text-left min-w-[280px]">
                      Loại hình cơ sở
                    </th>
                    <th rowSpan={3} className="p-3 border-r border-zinc-200 dark:border-zinc-800 w-16">
                      Mã số
                    </th>
                    <th colSpan={2} className="p-2 border-r border-zinc-200 dark:border-zinc-800">
                      Cơ sở
                    </th>
                    <th colSpan={3} className="p-2 border-r border-zinc-200 dark:border-zinc-800">
                      Lực lượng lao động
                    </th>
                    <th colSpan={3} className="p-2 border-r border-zinc-200 dark:border-zinc-800">
                      Tổng số tai nạn lao động
                    </th>
                    <th colSpan={2} className="p-2 border-r border-zinc-200 dark:border-zinc-800">
                      Tần suất tai nạn lao động
                    </th>
                    <th rowSpan={3} className="p-3">
                      Ghi chú
                    </th>
                  </tr>
                  {/* Row 2 Headers */}
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/20 text-zinc-550 dark:text-zinc-400 font-bold select-none text-center">
                    <th rowSpan={2} className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-24">
                      Tổng số
                    </th>
                    <th rowSpan={2} className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-24">
                      Số cơ sở tham gia
                    </th>
                    <th rowSpan={2} className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-28">
                      Tổng số lao động
                    </th>
                    <th rowSpan={2} className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-32">
                      Số LD của cơ sở tham gia báo cáo
                    </th>
                    <th rowSpan={2} className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-28">
                      Số lao động nữ
                    </th>
                    <th colSpan={3} className="p-2 border-r border-zinc-200 dark:border-zinc-800">
                      Số người bị TNLĐ
                    </th>
                    <th rowSpan={2} className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-20">
                      KTNLĐ
                    </th>
                    <th rowSpan={2} className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-20">
                      KChết
                    </th>
                  </tr>
                  {/* Row 3 Headers */}
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/20 text-zinc-550 dark:text-zinc-400 font-bold select-none text-center">
                    <th className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-20">Tổng số</th>
                    <th className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-24">Số người chết</th>
                    <th className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-28">Số người bị thương nặng</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Totals Row */}
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/40 dark:bg-zinc-900/30 font-bold text-zinc-900 dark:text-zinc-100">
                    <td className="p-2.5 pl-3 border-r border-zinc-200 dark:border-zinc-800">Tổng số</td>
                    <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-center">-</td>
                    <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right">
                      {formatNum(tableITotals.totalBusinesses)}
                    </td>
                    <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right">
                      {formatNum(tableITotals.participatingBusinesses)}
                    </td>
                    <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right">
                      {formatNum(tableITotals.totalEmployees)}
                    </td>
                    <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right">
                      {formatNum(tableITotals.participatingEmployees)}
                    </td>
                    <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right">
                      {formatNum(tableITotals.femaleEmployees)}
                    </td>
                    <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right">
                      {formatNum(tableITotals.totalVictims)}
                    </td>
                    <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right">
                      {formatNum(tableITotals.deathVictims)}
                    </td>
                    <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right">
                      {formatNum(tableITotals.severeInjuryVictims)}
                    </td>
                    <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right text-blue-600 dark:text-blue-400">
                      {formatRate(tableITotals.ktnld)}
                    </td>
                    <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right text-red-600 dark:text-red-400">
                      {formatRate(tableITotals.kchet)}
                    </td>
                    <td className="p-2.5">-</td>
                  </tr>

                  {/* Categories Rows */}
                  {categories.map((catName, index) => {
                    const row = getCategoryRowData(catName);
                    return (
                      <tr
                        key={index}
                        className="border-b border-zinc-250 dark:border-zinc-850 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors font-medium text-zinc-700 dark:text-zinc-300"
                      >
                        <td className="p-2.5 pl-3 border-r border-zinc-200 dark:border-zinc-800 text-left font-semibold text-zinc-850 dark:text-zinc-150">
                          {catName}
                        </td>
                        <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-center text-zinc-400">
                          {index + 1}
                        </td>
                        <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right">
                          {formatNum(row.totalBusinesses)}
                        </td>
                        <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right">
                          {formatNum(row.participatingBusinesses)}
                        </td>
                        <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right">
                          {formatNum(row.totalEmployees)}
                        </td>
                        <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right">
                          {formatNum(row.participatingEmployees)}
                        </td>
                        <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right">
                          {formatNum(row.femaleEmployees)}
                        </td>
                        <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right">
                          {formatNum(row.totalVictims)}
                        </td>
                        <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right">
                          {formatNum(row.deathVictims)}
                        </td>
                        <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right">
                          {formatNum(row.severeInjuryVictims)}
                        </td>
                        <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right font-semibold">
                          {formatRate(row.ktnld)}
                        </td>
                        <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right font-semibold">
                          {formatRate(row.kchet)}
                        </td>
                        <td className="p-2.5 text-zinc-400 italic"></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section II: Phân loại TNLĐ */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider border-l-4 border-blue-600 pl-3">
              II. Phân loại TNLĐ:
            </h3>

            <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm bg-white dark:bg-zinc-950">
              <table className="w-full border-collapse text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 min-w-[1450px]">
                <thead>
                  {/* Row 1 Headers */}
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/20 text-zinc-550 dark:text-zinc-400 font-bold select-none text-center">
                    <th rowSpan={3} className="p-3 border-r border-zinc-200 dark:border-zinc-800 text-left min-w-[280px]">
                      Tên chỉ tiêu thống kê
                    </th>
                    <th rowSpan={3} className="p-3 border-r border-zinc-200 dark:border-zinc-800 w-16">
                      Mã số
                    </th>
                    <th colSpan={3} className="p-2 border-r border-zinc-200 dark:border-zinc-800">
                      Phân loại TNLĐ theo mức độ thương tật (Số vụ)
                    </th>
                    <th colSpan={4} className="p-2 border-r border-zinc-200 dark:border-zinc-800">
                      Số người bị nạn (Người)
                    </th>
                    <th rowSpan={3} className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-24">
                      Tổng số ngày nghỉ vì TNLĐ
                    </th>
                    <th colSpan={5} className="p-2">
                      Thiệt hại do tai nạn lao động
                    </th>
                  </tr>
                  {/* Row 2 Headers */}
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/20 text-zinc-550 dark:text-zinc-400 font-bold select-none text-center">
                    <th rowSpan={2} className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-20">
                      Tổng số
                    </th>
                    <th rowSpan={2} className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-24">
                      Số vụ có người chết
                    </th>
                    <th rowSpan={2} className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-28">
                      Số vụ có từ 2 người bị nạn trở lên
                    </th>
                    <th rowSpan={2} className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-20">
                      Tổng số
                    </th>
                    <th rowSpan={2} className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-20">
                      Số LĐ nữ
                    </th>
                    <th rowSpan={2} className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-24">
                      Số người bị chết
                    </th>
                    <th rowSpan={2} className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-24">
                      Số người bị thương nặng
                    </th>
                    <th rowSpan={2} className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-28">
                      Tổng số tiền (đồng)
                    </th>
                    <th colSpan={3} className="p-2 border-r border-zinc-200 dark:border-zinc-800">
                      Trong đó chi phí (đồng)
                    </th>
                    <th rowSpan={2} className="p-2 w-28">
                      Thiệt hại tài sản (1.000 đ)
                    </th>
                  </tr>
                  {/* Row 3 Headers */}
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/20 text-zinc-550 dark:text-zinc-400 font-bold select-none text-center">
                    <th className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-28">Y Tế</th>
                    <th className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-28">Trả lương</th>
                    <th className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-28">Bồi thường/Trợ cấp</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Totals Row */}
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/40 dark:bg-zinc-900/30 font-bold text-zinc-900 dark:text-zinc-100">
                    <td className="p-2.5 pl-3 border-r border-zinc-200 dark:border-zinc-800">Tổng số</td>
                    <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-center">-</td>
                    {/* Số vụ */}
                    <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right">
                      {formatNum(summaryData?.totals?.totalAccidents)}
                    </td>
                    <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right">
                      {formatNum(summaryData?.totals?.fatalAccidents)}
                    </td>
                    <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right">
                      {formatNum(summaryData?.totals?.accidentsWithTwoOrMoreVictims)}
                    </td>
                    {/* Số người */}
                    <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right">
                      {formatNum(summaryData?.totals?.totalVictims)}
                    </td>
                    <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right">
                      {formatNum(summaryData?.totals?.femaleVictims)}
                    </td>
                    <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right">
                      {formatNum(summaryData?.totals?.deathVictims)}
                    </td>
                    <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right">
                      {formatNum(summaryData?.totals?.severeInjuryVictims)}
                    </td>
                    {/* Ngày nghỉ */}
                    <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right">
                      {formatNum(summaryData?.totals?.totalDaysOff)}
                    </td>
                    {/* Thiệt hại */}
                    <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right">
                      {formatCost(summaryData?.totals?.totalCost)}
                    </td>
                    <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right">
                      {formatCost(summaryData?.totals?.medicalCost)}
                    </td>
                    <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right">
                      {formatCost(summaryData?.totals?.salaryPaymentCost)}
                    </td>
                    <td className="p-2.5 border-r border-zinc-200 dark:border-zinc-800 text-right">
                      {formatCost(summaryData?.totals?.allowanceCost)}
                    </td>
                    <td className="p-2.5 text-right">
                      {formatPropertyDamage(summaryData?.totals?.propertyDamage)}
                    </td>
                  </tr>

                  {/* Section 1: Phân theo ngành nghề */}
                  <tr className="bg-zinc-100/20 dark:bg-zinc-900/10 border-b border-zinc-200 dark:border-zinc-800 font-bold text-zinc-900 dark:text-zinc-100">
                    <td colSpan={15} className="p-2.5 pl-3 text-left">
                      Phân theo ngành nghề
                    </td>
                  </tr>
                  {summaryData?.byOccupation?.map((row: any, idx: number) => (
                    <tr
                      key={`occ-${idx}`}
                      className="border-b border-zinc-200 dark:border-zinc-800 font-medium hover:bg-zinc-50/30 dark:hover:bg-zinc-900/5 transition-colors"
                    >
                      <td className="p-2 pl-6 border-r border-zinc-200 dark:border-zinc-800 text-left font-semibold">
                        {row?.catalog?.name}
                      </td>
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-center text-zinc-400">
                        {row?.catalog?.code || row?.catalog?.id}
                      </td>
                      {/* Số vụ */}
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatNum(row?.totals?.totalAccidents)}
                      </td>
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatNum(row?.totals?.fatalAccidents)}
                      </td>
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatNum(row?.totals?.accidentsWithTwoOrMoreVictims)}
                      </td>
                      {/* Số người */}
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatNum(row?.totals?.totalVictims)}
                      </td>
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatNum(row?.totals?.femaleVictims)}
                      </td>
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatNum(row?.totals?.deathVictims)}
                      </td>
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatNum(row?.totals?.severeInjuryVictims)}
                      </td>
                      {/* Ngày nghỉ */}
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatNum(row?.totals?.totalDaysOff)}
                      </td>
                      {/* Thiệt hại */}
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatCost(row?.totals?.totalCost)}
                      </td>
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatCost(row?.totals?.medicalCost)}
                      </td>
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatCost(row?.totals?.salaryPaymentCost)}
                      </td>
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatCost(row?.totals?.allowanceCost)}
                      </td>
                      <td className="p-2 text-right">
                        {formatPropertyDamage(row?.totals?.propertyDamage)}
                      </td>
                    </tr>
                  ))}

                  {/* Section 2: Phân theo nguyên nhân */}
                  <tr className="bg-zinc-100/20 dark:bg-zinc-900/10 border-b border-zinc-200 dark:border-zinc-800 font-bold text-zinc-900 dark:text-zinc-100">
                    <td colSpan={15} className="p-2.5 pl-3 text-left">
                      Phân theo nguyên nhân
                    </td>
                  </tr>
                  {summaryData?.byAccidentCause?.map((row: any, idx: number) => (
                    <tr
                      key={`cause-${idx}`}
                      className="border-b border-zinc-200 dark:border-zinc-800 font-medium hover:bg-zinc-50/30 dark:hover:bg-zinc-900/5 transition-colors"
                    >
                      <td className="p-2 pl-6 border-r border-zinc-200 dark:border-zinc-800 text-left font-semibold">
                        {row?.catalog?.name}
                      </td>
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-center text-zinc-400">
                        {row?.catalog?.code || row?.catalog?.id}
                      </td>
                      {/* Số vụ */}
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatNum(row?.totals?.totalAccidents)}
                      </td>
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatNum(row?.totals?.fatalAccidents)}
                      </td>
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatNum(row?.totals?.accidentsWithTwoOrMoreVictims)}
                      </td>
                      {/* Số người */}
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatNum(row?.totals?.totalVictims)}
                      </td>
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatNum(row?.totals?.femaleVictims)}
                      </td>
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatNum(row?.totals?.deathVictims)}
                      </td>
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatNum(row?.totals?.severeInjuryVictims)}
                      </td>
                      {/* Ngày nghỉ */}
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatNum(row?.totals?.totalDaysOff)}
                      </td>
                      {/* Thiệt hại */}
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatCost(row?.totals?.totalCost)}
                      </td>
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatCost(row?.totals?.medicalCost)}
                      </td>
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatCost(row?.totals?.salaryPaymentCost)}
                      </td>
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatCost(row?.totals?.allowanceCost)}
                      </td>
                      <td className="p-2 text-right">
                        {formatPropertyDamage(row?.totals?.propertyDamage)}
                      </td>
                    </tr>
                  ))}

                  {/* Section 3: Phân theo yếu tố gây chấn thương */}
                  <tr className="bg-zinc-100/20 dark:bg-zinc-900/10 border-b border-zinc-200 dark:border-zinc-800 font-bold text-zinc-900 dark:text-zinc-100">
                    <td colSpan={15} className="p-2.5 pl-3 text-left">
                      Phân theo yếu tố gây chấn thương
                    </td>
                  </tr>
                  {summaryData?.byInjuryFactor?.map((row: any, idx: number) => (
                    <tr
                      key={`fact-${idx}`}
                      className="border-b border-zinc-200 dark:border-zinc-800 font-medium hover:bg-zinc-50/30 dark:hover:bg-zinc-900/5 transition-colors"
                    >
                      <td className="p-2 pl-6 border-r border-zinc-200 dark:border-zinc-800 text-left font-semibold">
                        {row?.catalog?.name}
                      </td>
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-center text-zinc-400">
                        {row?.catalog?.code || row?.catalog?.id}
                      </td>
                      {/* Số vụ */}
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatNum(row?.totals?.totalAccidents)}
                      </td>
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatNum(row?.totals?.fatalAccidents)}
                      </td>
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatNum(row?.totals?.accidentsWithTwoOrMoreVictims)}
                      </td>
                      {/* Số người */}
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatNum(row?.totals?.totalVictims)}
                      </td>
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatNum(row?.totals?.femaleVictims)}
                      </td>
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatNum(row?.totals?.deathVictims)}
                      </td>
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatNum(row?.totals?.severeInjuryVictims)}
                      </td>
                      {/* Ngày nghỉ */}
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatNum(row?.totals?.totalDaysOff)}
                      </td>
                      {/* Thiệt hại */}
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatCost(row?.totals?.totalCost)}
                      </td>
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatCost(row?.totals?.medicalCost)}
                      </td>
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatCost(row?.totals?.salaryPaymentCost)}
                      </td>
                      <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">
                        {formatCost(row?.totals?.allowanceCost)}
                      </td>
                      <td className="p-2 text-right">
                        {formatPropertyDamage(row?.totals?.propertyDamage)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
