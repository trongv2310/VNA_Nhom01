"use client";

import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  Eye,
  FileText,
  X,
} from "lucide-react";
import {
  getDepartmentReports,
  receiveDepartmentReport,
  getReportPeriodYears,
  getStoredBackendUser,
  bulkReceiveDepartmentReports,
  bulkRejectDepartmentReports
} from "../services/api";
import { DepartmentReportDetail } from "./DepartmentReportDetail";
import { DepartmentSummaryReport } from "./DepartmentSummaryReport";
import { useAddress } from "../hooks/useAddress";

interface DepartmentReportsProps {
  showToast: (message: string, type: "success" | "error") => void;
  permissions?: string[];
  isAdmin?: boolean;
}

interface ReportItem {
  id: number;
  businessName: string;
  taxCode: string;
  periodType: "SIX_MONTHS" | "FULL_YEAR";
  periodLabel: string;
  status: "DRAFT" | "SUBMITTED" | "RECEIVED" | "REJECTED";
  statusLabel: string;
  submittedAt?: string | null;
}

export const DepartmentReports: React.FC<DepartmentReportsProps> = ({
  showToast,
  permissions = [],
  isAdmin = false,
}) => {
  const hasPermission = (permission: string) =>
    isAdmin || permissions.includes(permission);
  const canReceive = hasPermission("LABOR_C_REPORT_RECEIVE");
  const canExport = hasPermission("LABOR_C_REPORT_EXPORT");

  // Filters & State
  const [year, setYear] = useState("2026");
  const [availableYears, setAvailableYears] = useState<string[]>(["2022", "2023", "2024", "2025", "2026"]);

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
  // Default to "Tất cả" (empty string)
  const [provinceCity, setProvinceCity] = useState("");
  const [wardCommune, setWardCommune] = useState("");

  const {
    provinces,
    wards,
    isLoadingWards,
  } = useAddress(provinceCity);
  const [businessNameQuery, setBusinessNameQuery] = useState("");
  const [taxCodeQuery, setTaxCodeQuery] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [isShowingSummary, setIsShowingSummary] = useState(false);

  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectReasonModal, setShowRejectReasonModal] = useState(false);
  const [showRejectConfirmModal, setShowRejectConfirmModal] = useState(false);
  const [rejectReasons, setRejectReasons] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync API reports if available
  useEffect(() => {
    let active = true;
    const fetchReports = async () => {
      setIsLoading(true);
      try {
        // Query param maps
        const response = await getDepartmentReports({
          page,
          limit,
          year,
          periodType: periodFilter || undefined,
          status: statusFilter || undefined,
          businessName: businessNameQuery || undefined,
          taxCode: taxCodeQuery || undefined,
          provinceCity: (provinceCity === "Tất cả" || !provinceCity) ? undefined : provinceCity,
          wardCommune: (wardCommune === "Tất cả" || !wardCommune) ? undefined : wardCommune,
        });

        if (active && response.success && response.data && response.data.items) {
          const items = response.data.items.map((item: any) => ({
            id: item.id,
            businessName: item.business?.businessName || item.businessName || "-",
            taxCode: item.business?.taxCode || item.taxCode || "-",
            periodType: item.reportPeriod?.periodType || item.periodType,
            periodLabel: item.reportPeriod?.periodTypeLabel || (item.reportPeriod?.periodType === "SIX_MONTHS" ? "6 tháng" : "Cả năm"),
            status: item.status,
            statusLabel: item.statusLabel || (
              item.status === "RECEIVED" ? "Đã tiếp nhận" :
              item.status === "SUBMITTED" ? "Đang chờ duyệt" :
              item.status === "REJECTED" ? "Từ chối phê duyệt" : "Đang báo cáo"
            ),
            submittedAt: item.submittedAt || null,
          }));
          setReports(items);
          setTotalItems(response.data.meta?.totalItems || items.length);
        } else {
          if (active) {
            setReports([]);
            setTotalItems(0);
          }
        }
      } catch (error) {
        console.error("Failed to load reports from API:", error);
        if (active) {
          setReports([]);
          setTotalItems(0);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchReports();
    }, 300);

    return () => {
      active = false;
      clearTimeout(delayDebounceFn);
    };
  }, [page, limit, year, provinceCity, wardCommune, businessNameQuery, taxCodeQuery, periodFilter, statusFilter, reloadTrigger]);

  const isReportSelectable = (report: ReportItem) => report.status === "SUBMITTED";

  useEffect(() => {
    setSelectedIds((prev) =>
      prev.filter((id) =>
        reports.some((report) => report.id === id && isReportSelectable(report)),
      ),
    );
  }, [reports]);

  // Selections
  const handleSelectAll = () => {
    if (!canReceive) return;

    const selectableReports = reports.filter(isReportSelectable);
    const selectableIds = selectableReports.map((r) => r.id);
    
    const allSelected = selectableIds.length > 0 && selectableIds.every(id => selectedIds.includes(id));
    
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !selectableIds.includes(id)));
    } else {
      setSelectedIds(prev => {
        const newIds = [...prev];
        selectableIds.forEach(id => {
          if (!newIds.includes(id)) newIds.push(id);
        });
        return newIds;
      });
    }
  };

  const handleSelectRow = (id: number) => {
    if (!canReceive) return;

    const report = reports.find(r => r.id === id);
    if (!report || !isReportSelectable(report)) return;

    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Actions
  const handleViewReport = (report: ReportItem) => {
    try {
      const viewedStr = sessionStorage.getItem("viewed_department_reports") || "[]";
      const viewed = JSON.parse(viewedStr) as Array<number | { id: number; submittedAt: string | null }>;
      
      const filtered = viewed.filter((item) => {
        if (typeof item === "object" && item !== null) {
          return item.id !== report.id;
        }
        return item !== report.id;
      });

      filtered.push({ id: report.id, submittedAt: report.submittedAt || null });
      sessionStorage.setItem("viewed_department_reports", JSON.stringify(filtered));
    } catch (e) {
      console.error("Error storing viewed report status:", e);
    }
    setSelectedReport(report);
  };

  const checkAllSelectedReportsAreViewed = (): boolean => {
    try {
      const viewedStr = sessionStorage.getItem("viewed_department_reports") || "[]";
      const viewed = JSON.parse(viewedStr) as Array<number | { id: number; submittedAt: string | null }>;

      for (const id of selectedIds) {
        const report = reports.find((r) => r.id === id);
        if (!report) continue;

        const hasViewed = viewed.some((item) => {
          if (typeof item === "object" && item !== null) {
            return item.id === id && item.submittedAt === (report.submittedAt || null);
          }
          return item === id;
        });

        if (!hasViewed) {
          const bizName = report.businessName;
          showToast(`Bạn chưa xem chi tiết báo cáo của "${bizName}". Vui lòng click xem chi tiết trước khi duyệt/từ chối!`, "error");
          return false;
        }
      }
    } catch (e) {
      console.error("Error checking viewed status:", e);
    }
    return true;
  };

  const handleBulkApproveClick = () => {
    if (!canReceive) return;

    if (selectedIds.length === 0) return;

    const hasAlreadyReceived = reports.some(r => selectedIds.includes(r.id) && !isReportSelectable(r));
    if (hasAlreadyReceived) {
      showToast("Một hoặc nhiều báo cáo đã được duyệt. Không thể duyệt lại!", "error");
      return;
    }

    if (!checkAllSelectedReportsAreViewed()) return;
    setShowApproveModal(true);
  };

  const handleConfirmApprove = async () => {
    if (!canReceive) return;

    const hasAlreadyReceived = reports.some(r => selectedIds.includes(r.id) && !isReportSelectable(r));
    if (hasAlreadyReceived) {
      showToast("Một hoặc nhiều báo cáo đã được duyệt. Không thể duyệt lại!", "error");
      setShowApproveModal(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await bulkReceiveDepartmentReports(selectedIds);
      if (res.success) {
        showToast(res.message || "Duyệt báo cáo thành công", "success");
        setSelectedIds([]);
        setReloadTrigger(prev => prev + 1);
      } else {
        showToast("Duyệt báo cáo thất bại", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Lỗi khi duyệt báo cáo", "error");
    } finally {
      setIsSubmitting(false);
      setShowApproveModal(false);
    }
  };

  const handleBulkRejectClick = () => {
    if (!canReceive) return;

    if (selectedIds.length === 0) return;

    const hasAlreadyReceived = reports.some(r => selectedIds.includes(r.id) && !isReportSelectable(r));
    if (hasAlreadyReceived) {
      showToast("Một hoặc nhiều báo cáo đã được duyệt. Không thể từ chối!", "error");
      return;
    }

    if (!checkAllSelectedReportsAreViewed()) return;

    const initialReasons: Record<number, string> = {};
    selectedIds.forEach((id) => {
      initialReasons[id] = "";
    });
    setRejectReasons(initialReasons);
    setShowRejectReasonModal(true);
  };

  const handleRejectReasonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canReceive) return;

    const hasEmpty = selectedIds.some((id) => !rejectReasons[id]?.trim());
    if (hasEmpty) {
      showToast("Vui lòng nhập lý do từ chối cho tất cả báo cáo đã chọn", "error");
      return;
    }
    setShowRejectReasonModal(false);
    setShowRejectConfirmModal(true);
  };

  const handleConfirmReject = async () => {
    if (!canReceive) return;

    const hasAlreadyReceived = reports.some(r => selectedIds.includes(r.id) && !isReportSelectable(r));
    if (hasAlreadyReceived) {
      showToast("Một hoặc nhiều báo cáo đã được duyệt. Không thể từ chối!", "error");
      setShowRejectConfirmModal(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const reportsToReject = selectedIds.map((id) => ({
        id,
        rejectReason: rejectReasons[id]?.trim() || "",
      }));
      const res = await bulkRejectDepartmentReports(reportsToReject);
      if (res.success) {
        showToast(res.message || "Từ chối báo cáo thành công", "success");
        setSelectedIds([]);
        setReloadTrigger(prev => prev + 1);
      } else {
        showToast("Từ chối báo cáo thất bại", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Lỗi khi từ chối báo cáo", "error");
    } finally {
      setIsSubmitting(false);
      setShowRejectConfirmModal(false);
    }
  };

  const handleAggregateReport = () => {
    setIsShowingSummary(true);
  };

  // Pagination bounds
  const startIdx = totalItems > 0 ? (page - 1) * limit + 1 : 0;
  const endIdx = Math.min(page * limit, totalItems);
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  if (isShowingSummary) {
    return (
      <DepartmentSummaryReport
        initialYear={year}
        initialProvinceCity={provinceCity}
        onBack={() => setIsShowingSummary(false)}
        showToast={showToast}
        canExport={canExport}
      />
    );
  }

  if (selectedReport) {
    return (
      <DepartmentReportDetail
        report={selectedReport}
        year={year}
        onBack={() => setSelectedReport(null)}
        showToast={showToast}
        canExport={canExport}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full text-zinc-700 dark:text-zinc-300">
      {/* Top Banner Header */}
      <div className="flex items-center justify-between border-t-4 border-blue-600 bg-white dark:bg-zinc-950 rounded-2xl p-4 shadow-sm border border-zinc-200/60 dark:border-zinc-800/80 select-none">
        <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">
          Báo cáo định kỳ Tai nạn lao động
        </h2>
        <div className="flex items-center gap-3">
          {/* Year selector */}
          <div className="relative min-w-[100px]">
            <select
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 font-bold appearance-none cursor-pointer focus:border-blue-500 transition-colors"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
          </div>

          <button
            onClick={handleAggregateReport}
            className="flex items-center gap-2 px-4 py-2 border border-blue-600 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 font-bold text-xs select-none transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Báo cáo tổng hợp</span>
          </button>
        </div>
      </div>

      {/* Region filter selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-zinc-950 rounded-2xl p-4 shadow-sm border border-zinc-200/60 dark:border-zinc-800/80">
        {/* Province City */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Tỉnh/ thành phố</label>
          <div className="relative">
            <select
              value={provinceCity}
              onChange={(e) => {
                setProvinceCity(e.target.value);
                setWardCommune("");
                setPage(1);
              }}
              className="w-full text-xs pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 appearance-none cursor-pointer focus:border-blue-500 transition-colors font-medium"
            >
              <option value="">Tất cả</option>
              {provinceCity && !provinces.some(p => p.name === provinceCity) && (
                <option value={provinceCity}>{provinceCity}</option>
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

        {/* Ward Commune */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Phường/ Xã</label>
          <div className="relative">
            <select
              value={wardCommune}
              onChange={(e) => {
                setWardCommune(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 appearance-none cursor-pointer focus:border-blue-500 transition-colors font-medium"
              disabled={!provinceCity || isLoadingWards || wards.length === 0}
            >
              <option value="">{isLoadingWards ? "Đang tải..." : "Tất cả"}</option>
              {wards.map((w) => (
                <option key={w.code} value={w.name}>
                  {w.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="relative flex-1 bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[300px]">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 dark:bg-zinc-950/60 backdrop-blur-[1px] transition-all">
            <div className="flex flex-col items-center gap-2.5">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 select-none">Đang tải báo cáo...</span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              {/* Row 1: Header Columns */}
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-zinc-500 dark:text-zinc-400 text-xs font-bold select-none bg-zinc-50/50 dark:bg-zinc-900/10">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={
                      (() => {
                        const selectable = reports.filter(isReportSelectable);
                        return selectable.length > 0 && selectable.every(r => selectedIds.includes(r.id));
                      })()
                    }
                    onChange={handleSelectAll}
                    disabled={!canReceive || !reports.some(isReportSelectable)}
                    className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                  />
                </th>
                <th className="p-4 w-24 text-center">Thao tác</th>
                <th className="p-4 min-w-[300px]">Tên doanh nghiệp</th>
                <th className="p-4 min-w-[150px]">Mã số thuế</th>
                <th className="p-4 min-w-[150px]">Kỳ báo cáo</th>
                <th className="p-4 min-w-[150px]">Trạng thái</th>
              </tr>

              {/* Row 2: Search and filtering fields */}
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                <td className="p-2"></td>
                <td className="p-2"></td>
                <td className="p-2">
                  <input
                    type="text"
                    value={businessNameQuery}
                    onChange={(e) => {
                      setBusinessNameQuery(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Tìm tên doanh nghiệp..."
                    className="w-full text-xs px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 focus:border-blue-500 transition-colors"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    value={taxCodeQuery}
                    onChange={(e) => {
                      setTaxCodeQuery(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Tìm mã số thuế..."
                    className="w-full text-xs px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 focus:border-blue-500 transition-colors font-mono"
                  />
                </td>
                <td className="p-2 relative">
                  <select
                    value={periodFilter}
                    onChange={(e) => {
                      setPeriodFilter(e.target.value);
                      setPage(1);
                    }}
                    className="w-full text-xs pl-3 pr-8 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 appearance-none cursor-pointer focus:border-blue-500 transition-colors"
                  >
                    <option value="">Tất cả</option>
                    <option value="SIX_MONTHS">6 tháng</option>
                    <option value="FULL_YEAR">Cả năm</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                </td>
                <td className="p-2 relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className="w-full text-xs pl-3 pr-8 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 appearance-none cursor-pointer focus:border-blue-500 transition-colors"
                  >
                    <option value="">Tất cả</option>
                    <option value="DRAFT">Đang báo cáo</option>
                    <option value="SUBMITTED">Đang chờ duyệt</option>
                    <option value="RECEIVED">Đã tiếp nhận</option>
                    <option value="REJECTED">Từ chối phê duyệt</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                </td>
              </tr>
            </thead>

            <tbody>
              {reports.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-zinc-400 dark:text-zinc-500 font-semibold select-none text-sm">
                    Không tìm thấy dữ liệu báo cáo nào phù hợp.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr
                    key={report.id}
                    className="border-b border-zinc-100 dark:border-zinc-800/80 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
                  >
                    <td className="p-4 text-center">
                      {isReportSelectable(report) ? (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(report.id)}
                          onChange={() => handleSelectRow(report.id)}
                          disabled={!canReceive}
                          className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      ) : (
                        <span className="inline-block w-4 h-4" />
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => handleViewReport(report)}
                          title="Xem chi tiết báo cáo"
                          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-blue-600 transition-all cursor-pointer"
                        >
                          <Eye className="w-[18px] h-[18px]" />
                        </button>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-zinc-900 dark:text-zinc-100 break-words max-w-[450px]">
                      {report.businessName}
                    </td>
                    <td className="p-4 font-mono text-xs">{report.taxCode}</td>
                    <td className="p-4 text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
                      {report.periodLabel}
                    </td>
                    <td className="p-4 text-xs font-bold">
                      <span className="inline-flex items-center gap-1.5 select-none">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            report.status === "RECEIVED" ? "bg-blue-500" :
                            report.status === "SUBMITTED" ? "bg-amber-500 animate-pulse" :
                            report.status === "REJECTED" ? "bg-red-500 animate-pulse" : "bg-zinc-400"
                          }`}
                        />
                        <span
                          className={
                            report.status === "RECEIVED" ? "text-blue-600 dark:text-blue-400" :
                            report.status === "SUBMITTED" ? "text-amber-600 dark:text-amber-400" :
                            report.status === "REJECTED" ? "text-red-500 dark:text-red-400" :
                            "text-zinc-500 dark:text-zinc-400"
                          }
                        >
                          {report.statusLabel}
                        </span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination controls */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-semibold text-zinc-500 select-none gap-6">
          <div className="flex items-center gap-2">
            <select
              className="px-2 py-1 border border-zinc-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-950 outline-none text-zinc-700 dark:text-zinc-300 cursor-pointer"
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
          <span>
            {totalItems > 0 ? `${startIdx} - ${endIdx} of ${totalItems}` : "0 - 0 of 0"}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1 || isLoading}
              className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-50 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages || isLoading}
              className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-50 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Selection Action Bar */}
      {canReceive && selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex items-center justify-between overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300 dark:border-zinc-800 dark:bg-zinc-900 -translate-x-1/2">
          <div className="flex items-center">
            <div className="flex min-w-[40px] h-10 items-center justify-center bg-blue-600 px-3 text-sm font-bold text-white">
              {selectedIds.length}
            </div>
            <span className="px-3.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 select-none">
              báo cáo được chọn
            </span>
          </div>
          <div className="flex items-center gap-3 pr-3">
            <button
              onClick={handleBulkApproveClick}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs px-3.5 py-1.5 flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3.5 h-3.5"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span>Duyệt</span>
            </button>
            <button
              onClick={handleBulkRejectClick}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs px-3.5 py-1.5 flex items-center gap-1.5 transition-all shadow-md shadow-red-500/10 cursor-pointer"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3.5 h-3.5"
              >
                <path d="m15 9-6 6M9 9l6 6" />
                <circle cx="12" cy="12" r="10" />
              </svg>
              <span>Từ chối</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              title="Bỏ chọn"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      )}

      {/* 1. Modal Xác nhận duyệt */}
      {canReceive && showApproveModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowApproveModal(false)} />
          <div className="relative bg-white dark:bg-zinc-950 border border-zinc-200/80 shadow-2xl rounded-[20px] w-full max-w-[420px] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col dark:border-zinc-800">
            <div className="bg-emerald-600 dark:bg-emerald-700 text-white py-4 text-center font-bold text-base tracking-wide">
              Xác nhận duyệt báo cáo
            </div>
            <div className="p-6 flex flex-col gap-4 bg-white dark:bg-zinc-950">
              <div className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-semibold">
                Bạn có chắc chắn muốn duyệt {selectedIds.length} báo cáo đã chọn? Sau khi duyệt, doanh nghiệp sẽ không thể chỉnh sửa các báo cáo này.
              </div>
              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  disabled={isSubmitting}
                  className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 font-bold text-xs cursor-pointer transition-colors disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApprove}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Xác nhận</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal Lý do từ chối */}
      {canReceive && showRejectReasonModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRejectReasonModal(false)} />
          <div className="relative bg-white dark:bg-zinc-950 border border-zinc-200/80 shadow-2xl rounded-[20px] w-full max-w-[540px] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col dark:border-zinc-800">
            <div className="bg-red-600 dark:bg-red-700 text-white py-4 text-center font-bold text-base tracking-wide">
              Từ chối báo cáo
            </div>
            <form onSubmit={handleRejectReasonSubmit} className="p-6 flex flex-col gap-4 bg-white dark:bg-zinc-950">
              <div className="max-h-[50vh] overflow-y-auto pr-1 flex flex-col gap-4">
                {(() => {
                  const selectedReports = reports.filter((r) => selectedIds.includes(r.id));
                  return selectedReports.map((report) => (
                    <div key={report.id} className="flex flex-col gap-1.5 border-b border-zinc-100 dark:border-zinc-850 pb-3.5 last:border-0 last:pb-0">
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-tight">
                        {report.businessName} <span className="text-zinc-400 font-medium">({report.periodLabel})</span>
                      </span>
                      <textarea
                        required
                        value={rejectReasons[report.id] || ""}
                        onChange={(e) => {
                          setRejectReasons((prev) => ({
                            ...prev,
                            [report.id]: e.target.value,
                          }));
                        }}
                        placeholder="Nêu rõ lý do từ chối để doanh nghiệp có thể chỉnh sửa chính xác..."
                        rows={3}
                        className="w-full text-xs px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:border-red-500 transition-colors font-medium resize-none"
                      />
                    </div>
                  ));
                })()}
              </div>
              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectReasonModal(false)}
                  className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 font-bold text-xs cursor-pointer transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-md transition-all cursor-pointer"
                >
                  Gửi yêu cầu từ chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Xác nhận từ chối */}
      {canReceive && showRejectConfirmModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRejectConfirmModal(false)} />
          <div className="relative bg-white dark:bg-zinc-950 border border-zinc-200/80 shadow-2xl rounded-[20px] w-full max-w-[420px] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col dark:border-zinc-800">
            <div className="bg-red-600 dark:bg-red-700 text-white py-4 text-center font-bold text-base tracking-wide">
              Xác nhận từ chối báo cáo
            </div>
            <div className="p-6 flex flex-col gap-4 bg-white dark:bg-zinc-950">
              <div className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-semibold">
                Bạn có chắc chắn muốn từ chối {selectedIds.length} báo cáo đã chọn với lý do đã nhập?
              </div>
              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowRejectConfirmModal(false)}
                  disabled={isSubmitting}
                  className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 font-bold text-xs cursor-pointer transition-colors disabled:opacity-50"
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Xác nhận từ chối</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
