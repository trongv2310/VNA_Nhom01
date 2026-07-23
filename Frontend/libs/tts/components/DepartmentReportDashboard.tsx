"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileClock,
  FileText,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

import {
  getDepartmentReportDashboard,
  getReportPeriodYears,
  type DepartmentReportDashboardData,
  type DepartmentReportDashboardPeriod,
  type DepartmentReportDashboardProgress,
  type DepartmentReportDashboardStatusRow,
  type DepartmentReportDashboardUrgentBusiness,
  type DepartmentReportDashboardWarningCard,
} from "../services/api";
import { useAddress } from "../hooks/useAddress";

interface DepartmentReportDashboardProps {
  showToast: (message: string, type: "success" | "error") => void;
}

const PERIOD_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "SIX_MONTHS", label: "6 tháng" },
  { value: "FULL_YEAR", label: "Cả năm" },
];

const EMPTY_PROGRESS: DepartmentReportDashboardProgress = {
  totalEligibleReportObligations: 0,
  totalExistingReports: 0,
  notStartedCount: 0,
  draftCount: 0,
  submittedCount: 0,
  receivedCount: 0,
  rejectedCount: 0,
  submittedOrReceivedCount: 0,
  submittedRate: 0,
  receivedRate: 0,
  completionRate: 0,
};

const STATUS_STYLES: Record<string, { dot: string; bar: string; text: string }> =
  {
    NOT_STARTED: {
      dot: "bg-zinc-400",
      bar: "bg-zinc-400",
      text: "text-zinc-500 dark:text-zinc-400",
    },
    DRAFT: {
      dot: "bg-sky-500",
      bar: "bg-sky-500",
      text: "text-sky-600 dark:text-sky-400",
    },
    SUBMITTED: {
      dot: "bg-amber-500",
      bar: "bg-amber-500",
      text: "text-amber-600 dark:text-amber-400",
    },
    RECEIVED: {
      dot: "bg-emerald-500",
      bar: "bg-emerald-500",
      text: "text-emerald-600 dark:text-emerald-400",
    },
    REJECTED: {
      dot: "bg-red-500",
      bar: "bg-red-500",
      text: "text-red-600 dark:text-red-400",
    },
  };

const STATUS_CHART_COLORS: Record<string, string> = {
  NOT_STARTED: "#a1a1aa",
  DRAFT: "#0ea5e9",
  SUBMITTED: "#f59e0b",
  RECEIVED: "#10b981",
  REJECTED: "#ef4444",
};

const WARNING_STYLES: Record<
  string,
  { card: string; icon: string; dot: string; text: string }
> = {
  danger: {
    card: "border-red-100 bg-red-50/80 dark:border-red-900/40 dark:bg-red-950/20",
    icon: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300",
    dot: "bg-red-500",
    text: "text-red-700 dark:text-red-300",
  },
  warning: {
    card: "border-amber-100 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/20",
    icon: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300",
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
  },
  info: {
    card: "border-blue-100 bg-blue-50/80 dark:border-blue-900/40 dark:bg-blue-950/20",
    icon: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300",
    dot: "bg-blue-500",
    text: "text-blue-700 dark:text-blue-300",
  },
};

function getCurrentYear() {
  return String(new Date().getFullYear());
}

function formatNumber(value: number | undefined | null) {
  return new Intl.NumberFormat("vi-VN").format(Number(value) || 0);
}

function formatPercent(value: number | undefined | null) {
  return `${(Number(value) || 0).toLocaleString("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

function formatDate(value: string | undefined | null) {
  if (!value) return "-";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatDateTime(value: string | undefined | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDate(value);

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getWindowStatusLabel(status: string) {
  if (status === "OPEN") return "Đang mở";
  if (status === "UPCOMING") return "Chưa mở";
  if (status === "CLOSED") return "Đã hết hạn";
  return "Không hoạt động";
}

function getWindowStatusStyle(status: string) {
  if (status === "OPEN") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (status === "UPCOMING") return "bg-blue-50 text-blue-700 border-blue-100";
  if (status === "CLOSED") return "bg-red-50 text-red-700 border-red-100";
  return "bg-zinc-50 text-zinc-600 border-zinc-200";
}

function getDeadlineText(item: DepartmentReportDashboardUrgentBusiness) {
  if (item.windowStatus === "CLOSED") {
    return `Quá hạn ${Math.abs(item.daysToDeadline)} ngày`;
  }

  if (item.daysToDeadline === 0) {
    return "Hết hạn hôm nay";
  }

  if (item.daysToDeadline > 0) {
    return `Còn ${item.daysToDeadline} ngày`;
  }

  return "-";
}

function safeProgress(data: DepartmentReportDashboardData | null) {
  return data?.progress ?? EMPTY_PROGRESS;
}

export const DepartmentReportDashboard: React.FC<
  DepartmentReportDashboardProps
> = ({ showToast }) => {
  const showToastRef = useRef(showToast);
  const [tempYear, setTempYear] = useState(getCurrentYear());
  const [tempPeriodType, setTempPeriodType] = useState("");
  const [tempProvinceCity, setTempProvinceCity] = useState("");
  const [tempWardCommune, setTempWardCommune] = useState("");

  const [year, setYear] = useState(getCurrentYear());
  const [periodType, setPeriodType] = useState("");
  const [provinceCity, setProvinceCity] = useState("");
  const [wardCommune, setWardCommune] = useState("");

  const [availableYears, setAvailableYears] = useState<string[]>([
    getCurrentYear(),
  ]);
  const [dashboardData, setDashboardData] =
    useState<DepartmentReportDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { provinces, wards, isLoadingWards } = useAddress(tempProvinceCity);

  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  useEffect(() => {
    let active = true;
    const fetchYears = async () => {
      try {
        const response = await getReportPeriodYears();
        if (active && response.success && response.data?.years) {
          const years = new Set<string>([getCurrentYear()]);
          response.data.years.forEach((item) => years.add(String(item)));
          setAvailableYears(
            Array.from(years).sort((first, second) => Number(second) - Number(first)),
          );
        }
      } catch (error) {
        console.error("Failed to load report period years:", error);
      }
    };

    fetchYears();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const fetchDashboard = async () => {
      setIsLoading(true);
      try {
        const response = await getDepartmentReportDashboard({
          year,
          periodType: periodType || undefined,
          provinceCity: provinceCity || undefined,
          wardCommune: wardCommune || undefined,
        });

        if (active && response.success) {
          setDashboardData(response.data);
        }
      } catch (error) {
        if (active) {
          setDashboardData(null);
          showToastRef.current(
            error instanceof Error
              ? error.message
              : "Không thể tải dashboard điều hành báo cáo",
            "error",
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchDashboard();

    return () => {
      active = false;
    };
  }, [year, periodType, provinceCity, wardCommune, refreshKey]);

  const progress = safeProgress(dashboardData);
  const warningTotal = useMemo(
    () =>
      dashboardData?.warnings?.reduce((total, item) => total + item.count, 0) ??
      0,
    [dashboardData],
  );
  const pendingReviewRate =
    progress.totalEligibleReportObligations > 0
      ? (progress.submittedCount / progress.totalEligibleReportObligations) * 100
      : 0;

  const handleApplyFilters = () => {
    setYear(tempYear);
    setPeriodType(tempPeriodType);
    setProvinceCity(tempProvinceCity);
    setWardCommune(tempWardCommune);
  };

  const handleRefresh = () => {
    setRefreshKey((value) => value + 1);
  };

  const renderSelectIcon = () => (
    <ChevronDown className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 pointer-events-none" />
  );

  return (
    <div className="flex h-full flex-col gap-6 text-zinc-700 dark:text-zinc-300">
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200/60 bg-white p-4 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Dashboard điều hành báo cáo TNLĐ
            </h2>
            <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
              Theo dõi tiến độ, trạng thái và cảnh báo báo cáo của doanh nghiệp
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-600 px-4 py-2 text-xs font-bold text-blue-600 transition-all hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-blue-400 dark:hover:bg-blue-950/20"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Làm mới
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-zinc-200/60 bg-white p-4 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950 md:grid-cols-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Năm báo cáo
          </label>
          <div className="relative">
            <select
              value={tempYear}
              onChange={(event) => setTempYear(event.target.value)}
              className="w-full appearance-none rounded-lg border border-zinc-200 bg-white py-2 pl-3 pr-8 text-xs font-bold text-zinc-800 outline-none transition-colors focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
            >
              {availableYears.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            {renderSelectIcon()}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Kỳ báo cáo
          </label>
          <div className="relative">
            <select
              value={tempPeriodType}
              onChange={(event) => setTempPeriodType(event.target.value)}
              className="w-full appearance-none rounded-lg border border-zinc-200 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-zinc-800 outline-none transition-colors focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
            >
              {PERIOD_OPTIONS.map((item) => (
                <option key={item.value || "all"} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            {renderSelectIcon()}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Tỉnh/ thành phố
          </label>
          <div className="relative">
            <select
              value={tempProvinceCity}
              onChange={(event) => {
                setTempProvinceCity(event.target.value);
                setTempWardCommune("");
              }}
              className="w-full appearance-none rounded-lg border border-zinc-200 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-zinc-800 outline-none transition-colors focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
            >
              <option value="">Tất cả</option>
              {tempProvinceCity &&
                !provinces.some((item) => item.name === tempProvinceCity) && (
                  <option value={tempProvinceCity}>{tempProvinceCity}</option>
                )}
              {provinces.map((item) => (
                <option key={item.code} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
            {renderSelectIcon()}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Phường/ xã
          </label>
          <div className="relative">
            <select
              value={tempWardCommune}
              onChange={(event) => setTempWardCommune(event.target.value)}
              disabled={!tempProvinceCity || isLoadingWards || wards.length === 0}
              className="w-full appearance-none rounded-lg border border-zinc-200 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-zinc-800 outline-none transition-colors focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:disabled:bg-zinc-900"
            >
              <option value="">{isLoadingWards ? "Đang tải..." : "Tất cả"}</option>
              {wards.map((item) => (
                <option key={item.code} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
            {renderSelectIcon()}
          </div>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleApplyFilters}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/10 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Áp dụng
          </button>
        </div>
      </div>

      <div className="relative flex min-h-[520px] flex-col gap-5">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-white/70 backdrop-blur-[1px] dark:bg-zinc-950/70">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-6 py-5 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="text-xs font-semibold text-zinc-500">
                Đang tổng hợp dữ liệu dashboard...
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
          <StatusDistributionChart
            rows={dashboardData?.byStatus ?? []}
            total={progress.totalEligibleReportObligations}
          />
          <PeriodProgressChart periods={dashboardData?.reportPeriods ?? []} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<Building2 className="h-5 w-5" />}
            title="Doanh nghiệp đang quản lý"
            value={formatNumber(dashboardData?.totalActiveBusinesses ?? 0)}
            hint="Theo bộ lọc địa bàn hiện tại"
            tone="blue"
          />
          <MetricCard
            icon={<FileText className="h-5 w-5" />}
            title="Nghĩa vụ báo cáo"
            value={formatNumber(progress.totalEligibleReportObligations)}
            hint="Doanh nghiệp đủ điều kiện × kỳ báo cáo"
            tone="indigo"
          />
          <MetricCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="Đã tiếp nhận"
            value={formatNumber(progress.receivedCount)}
            hint={`Hoàn thành ${formatPercent(progress.completionRate)}`}
            tone="emerald"
          />
          <MetricCard
            icon={<ShieldAlert className="h-5 w-5" />}
            title="Cảnh báo cần xử lý"
            value={formatNumber(warningTotal)}
            hint="Ưu tiên doanh nghiệp trễ hạn/chờ xử lý"
            tone="red"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950 xl:col-span-2">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Tiến độ báo cáo tổng thể
                </h3>
                <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                  Theo dõi số báo cáo đang chờ xử lý và số đã hoàn tất tiếp nhận
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                Cập nhật: {formatDateTime(dashboardData?.generatedAt)}
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <ProgressLine
                label="Đang chờ Sở xử lý"
                value={progress.submittedCount}
                total={progress.totalEligibleReportObligations}
                percentage={pendingReviewRate}
                color="bg-amber-500"
              />
              <ProgressLine
                label="Hoàn tất tiếp nhận"
                value={progress.receivedCount}
                total={progress.totalEligibleReportObligations}
                percentage={progress.receivedRate}
                color="bg-emerald-500"
              />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-5">
              {(dashboardData?.byStatus ?? []).map((item) => (
                <StatusMiniCard key={item.status} item={item} />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Cảnh báo tiến độ
                </h3>
                <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                  Các nhóm việc cần theo dõi nhanh
                </p>
              </div>
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>

            <div className="mt-4 space-y-3">
              {(dashboardData?.warnings ?? []).map((item) => (
                <WarningCard key={item.type} item={item} />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Kỳ báo cáo đang theo dõi
              </h3>
            </div>
            <div className="mt-4 space-y-3">
              {dashboardData?.reportPeriods?.length ? (
                dashboardData.reportPeriods.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {item.periodTypeLabel} năm {item.year}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-zinc-400">
                          {formatDate(item.startDate)} - {formatDate(item.endDate)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${getWindowStatusStyle(
                          item.windowStatus,
                        )}`}
                      >
                        {getWindowStatusLabel(item.windowStatus)}
                      </span>
                    </div>
                    <div className="mt-3">
                      <ProgressLine
                        label="Đã tiếp nhận"
                        value={item.progress.receivedCount}
                        total={item.progress.totalEligibleReportObligations}
                        percentage={item.progress.completionRate}
                        color="bg-emerald-500"
                        compact
                      />
                    </div>
                  </div>
                ))
              ) : (
                <EmptyNote message="Chưa có kỳ báo cáo phù hợp với bộ lọc." />
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950 xl:col-span-2">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <FileClock className="h-4 w-4 text-red-500" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Doanh nghiệp cần chú ý
                </h3>
              </div>
              <span className="text-xs font-semibold text-zinc-400">
                Hiển thị tối đa 20 doanh nghiệp ưu tiên
              </span>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="max-h-[360px] overflow-auto">
                <table className="w-full min-w-[860px] border-collapse text-xs">
                  <thead className="sticky top-0 z-10 bg-zinc-50 text-left font-bold text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="p-3">Cảnh báo</th>
                      <th className="p-3">Tên doanh nghiệp</th>
                      <th className="p-3">Mã số thuế</th>
                      <th className="p-3">Địa bàn</th>
                      <th className="p-3">Kỳ báo cáo</th>
                      <th className="p-3">Trạng thái</th>
                      <th className="p-3">Hạn xử lý</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData?.urgentBusinesses?.length ? (
                      dashboardData.urgentBusinesses.map((item) => (
                        <UrgentBusinessRow
                          key={`${item.businessId}-${item.reportPeriodId}-${item.type}`}
                          item={item}
                        />
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={7}
                          className="p-8 text-center text-sm font-semibold text-zinc-400"
                        >
                          Chưa có cảnh báo cần xử lý trong bộ lọc hiện tại.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function StatusDistributionChart({
  rows,
  total,
}: {
  rows: DepartmentReportDashboardStatusRow[];
  total: number;
}) {
  const meaningfulRows = rows.filter((item) => item.count > 0);
  const hasData = total > 0 && meaningfulRows.length > 0;
  let cursor = 0;
  const gradient = hasData
    ? meaningfulRows
        .map((item, index) => {
          const start = cursor;
          const width = (item.count / total) * 100;
          cursor = index === meaningfulRows.length - 1 ? 100 : cursor + width;
          const color = STATUS_CHART_COLORS[item.status] ?? "#64748b";
          return `${color} ${start}% ${cursor}%`;
        })
        .join(", ")
    : "#e4e4e7 0% 100%";

  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950 xl:col-span-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Biểu đồ phân bổ trạng thái
          </h3>
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
            Tỷ trọng báo cáo theo từng trạng thái xử lý
          </p>
        </div>
        <span className="rounded-full bg-zinc-50 px-3 py-1 text-xs font-bold text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          Tổng {formatNumber(total)}
        </span>
      </div>

      {hasData ? (
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-[180px_1fr] md:items-center">
          <div className="flex justify-center">
            <div
              className="relative h-40 w-40 rounded-full shadow-inner"
              style={{ background: `conic-gradient(${gradient})` }}
              aria-label="Biểu đồ tròn phân bổ trạng thái báo cáo"
            >
              <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-white text-center shadow-sm dark:bg-zinc-950">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Hoàn thành
                </span>
                <span className="mt-1 text-2xl font-extrabold text-emerald-600">
                  {formatPercent(
                    rows.find((item) => item.status === "RECEIVED")
                      ?.percentage ?? 0,
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {rows.map((item) => {
              const style = STATUS_STYLES[item.status] ?? STATUS_STYLES.NOT_STARTED;
              const color = STATUS_CHART_COLORS[item.status] ?? "#64748b";

              return (
                <div
                  key={item.status}
                  className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/30"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className={`text-xs font-bold ${style.text}`}>
                        {item.label}
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                      {formatNumber(item.count)} · {formatPercent(item.percentage)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <EmptyNote message="Chưa có dữ liệu trạng thái để hiển thị biểu đồ." />
        </div>
      )}
    </div>
  );
}

function PeriodProgressChart({
  periods,
}: {
  periods: DepartmentReportDashboardPeriod[];
}) {
  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950 xl:col-span-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Biểu đồ tiến độ theo kỳ báo cáo
          </h3>
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
            So sánh số đã tiếp nhận, đang chờ duyệt và chưa gửi theo từng kỳ
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-zinc-500">
          <ChartLegendDot color="bg-emerald-500" label="Đã tiếp nhận" />
          <ChartLegendDot color="bg-amber-500" label="Chờ duyệt" />
          <ChartLegendDot color="bg-zinc-300" label="Chưa gửi" />
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {periods.length ? (
          periods.map((period) => {
            const total = period.progress.totalEligibleReportObligations;
            const received = Math.min(period.progress.receivedCount, total);
            const waiting = Math.max(
              Math.min(period.progress.submittedOrReceivedCount, total) -
                received,
              0,
            );
            const missing = Math.max(total - received - waiting, 0);
            const receivedPercent = total > 0 ? (received / total) * 100 : 0;
            const waitingPercent = total > 0 ? (waiting / total) * 100 : 0;
            const missingPercent = total > 0 ? (missing / total) * 100 : 0;

            return (
              <div
                key={period.id}
                className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/30"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                      {period.periodTypeLabel} năm {period.year}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-zinc-400">
                      {formatDate(period.startDate)} - {formatDate(period.endDate)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${getWindowStatusStyle(
                        period.windowStatus,
                      )}`}
                    >
                      {getWindowStatusLabel(period.windowStatus)}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                      {formatNumber(period.progress.submittedOrReceivedCount)}/
                      {formatNumber(total)} đã gửi
                    </span>
                  </div>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white dark:bg-zinc-800">
                  <div className="flex h-full w-full">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${receivedPercent}%` }}
                      title={`Đã tiếp nhận: ${formatNumber(received)}`}
                    />
                    <div
                      className="h-full bg-amber-500"
                      style={{ width: `${waitingPercent}%` }}
                      title={`Chờ duyệt: ${formatNumber(waiting)}`}
                    />
                    <div
                      className="h-full bg-zinc-300 dark:bg-zinc-700"
                      style={{ width: `${missingPercent}%` }}
                      title={`Chưa gửi: ${formatNumber(missing)}`}
                    />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] font-bold sm:grid-cols-3">
                  <div className="rounded-lg bg-emerald-50 px-2.5 py-2 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300">
                    {formatNumber(received)} đã tiếp nhận
                  </div>
                  <div className="rounded-lg bg-amber-50 px-2.5 py-2 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">
                    {formatNumber(waiting)} chờ duyệt
                  </div>
                  <div className="rounded-lg bg-white px-2.5 py-2 text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                    {formatNumber(missing)} chưa gửi
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <EmptyNote message="Chưa có kỳ báo cáo phù hợp để hiển thị biểu đồ." />
        )}
      </div>
    </div>
  );
}

function ChartLegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function MetricCard({
  icon,
  title,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  hint: string;
  tone: "blue" | "indigo" | "emerald" | "red";
}) {
  const toneClasses = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300",
    indigo:
      "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-300",
    emerald:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300",
    red: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300",
  };

  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {title}
          </p>
          <p className="mt-2 text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
            {value}
          </p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClasses[tone]}`}>
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold text-zinc-400 dark:text-zinc-500">
        {hint}
      </p>
    </div>
  );
}

function ProgressLine({
  label,
  value,
  total,
  percentage,
  color,
  compact = false,
}: {
  label: string;
  value: number;
  total: number;
  percentage: number;
  color: string;
  compact?: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
          {label}
        </span>
        <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
          {formatNumber(value)}/{formatNumber(total)} · {formatPercent(percentage)}
        </span>
      </div>
      <div className={`overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 ${compact ? "h-2" : "h-3"}`}>
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}

function StatusMiniCard({ item }: { item: DepartmentReportDashboardStatusRow }) {
  const style = STATUS_STYLES[item.status] ?? STATUS_STYLES.NOT_STARTED;

  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/30">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${style.dot}`} />
        <span className={`text-[11px] font-bold ${style.text}`}>
          {item.label}
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <span className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
          {formatNumber(item.count)}
        </span>
        <span className="text-[11px] font-bold text-zinc-400">
          {formatPercent(item.percentage)}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white dark:bg-zinc-800">
        <div
          className={`h-full rounded-full ${style.bar}`}
          style={{ width: `${Math.min(Math.max(item.percentage, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}

function WarningCard({
  item,
}: {
  item: DepartmentReportDashboardWarningCard;
}) {
  const style = WARNING_STYLES[item.severity] ?? WARNING_STYLES.info;

  return (
    <div className={`rounded-xl border p-3 ${style.card}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${style.icon}`}>
            {item.severity === "info" ? (
              <Clock3 className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
          </div>
          <div>
            <p className={`text-xs font-bold ${style.text}`}>{item.label}</p>
            <p className="text-[11px] font-semibold text-zinc-400">
              {item.count > 0 ? "Có dữ liệu cần theo dõi" : "Chưa phát sinh"}
            </p>
          </div>
        </div>
        <span className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
          {formatNumber(item.count)}
        </span>
      </div>
    </div>
  );
}

function UrgentBusinessRow({
  item,
}: {
  item: DepartmentReportDashboardUrgentBusiness;
}) {
  const warningStyle = WARNING_STYLES[item.severity] ?? WARNING_STYLES.info;
  const statusStyle = STATUS_STYLES[item.status] ?? STATUS_STYLES.NOT_STARTED;

  return (
    <tr className="border-b border-zinc-100 text-zinc-700 transition-colors last:border-0 hover:bg-zinc-50/70 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900/30">
      <td className="p-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${warningStyle.text}`}>
          <span className={`h-2 w-2 rounded-full ${warningStyle.dot}`} />
          {item.label}
        </span>
      </td>
      <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">
        {item.businessName}
      </td>
      <td className="p-3 font-mono text-[11px]">{item.taxCode}</td>
      <td className="p-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
          <MapPin className="h-3.5 w-3.5" />
          <span>
            {[item.provinceCity, item.wardCommune].filter(Boolean).join(" - ") ||
              "-"}
          </span>
        </div>
      </td>
      <td className="p-3 font-semibold">
        {item.periodTypeLabel} {item.year}
      </td>
      <td className="p-3">
        <span className={`inline-flex items-center gap-1.5 font-bold ${statusStyle.text}`}>
          <span className={`h-2 w-2 rounded-full ${statusStyle.dot}`} />
          {item.statusLabel}
        </span>
      </td>
      <td className="p-3">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-50 px-2.5 py-1 text-[11px] font-bold text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
          <TrendingUp className="h-3.5 w-3.5" />
          {getDeadlineText(item)}
        </span>
      </td>
    </tr>
  );
}

function EmptyNote({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-200 p-5 text-center text-xs font-semibold text-zinc-400 dark:border-zinc-800">
      {message}
    </div>
  );
}
