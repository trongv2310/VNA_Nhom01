"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
  ChevronDown,
  ArrowRight,
  Save,
  Printer,
  Send,
  Loader2,
} from "lucide-react";
import {
  getMyLaborAccidentReports,
  getMyLaborAccidentReportDetail,
  saveLaborAccidentReportDraft,
  submitLaborAccidentReport,
  getCatalogOptions,
  getMyLaborAccidentReportPeriods,
  getMyBusinessProfile,
} from "../services/api";
import { exportReportDocx } from "../utils/reportExporter";

interface TnldTheoHdldProps {
  showToast: (message: string, type: "success" | "error") => void;
}

interface AccidentDetailBlock {
  id: number;
  causeCategory: string;
  factorCategory: string;
  jobCategory: string;

  // Nhóm 1: Thống kê số vụ & nạn nhân
  tongSoVu: string;
  soVuCoNguoiChet: string;
  soVuHaiNguoiTroLen: string;
  tongSoNguoiBiNan: string;
  soLaoDongNuBiNan: string;
  soNguoiChet: string;
  soNguoiThuongNang: string;
  soNguoiBiNanKhongQL: string;
  laoDongNuBiNanKhongQL: string;
  soNguoiChetKhongQL: string;
  soNguoiThuongNangKhongQL: string;

  // Nhóm 2: Thiệt hại chi phí
  chiPhiYTe: string;
  chiPhiLuong: string;
  chiPhiBoiThuong: string;
  tongChiPhi: string;
  soNgayNghi: string;
  thietHaiTaiSan: string;
}

interface ReportData {
  id: number;
  reportPeriodId?: number;
  year: number;
  period: string; // "6 tháng" | "Cả năm"
  status:
    "Đang báo cáo" | "Đang chờ duyệt" | "Đã tiếp nhận" | "Từ chối phê duyệt";
  rejectReason?: string;
  windowStatus?: "INACTIVE" | "UPCOMING" | "OPEN" | "CLOSED";
  canEdit?: boolean;
  canSubmit?: boolean;
  unavailableReason?: string | null;
  enterpriseName: string;
  taxCode: string;
  businessType: string;
  industry: string;

  // Section 1: Thông tin doanh nghiệp
  laoDongCoSo: string;
  laoDongNu: string;
  quyLuong: string; // đơn vị: 1.000đ

  // Section 2: 1. Tai nạn lao động
  // Nhóm 1: Tổng số vụ & số nạn nhân
  tongSoVu: string;
  soVuCoNguoiChet: string;
  soVuHaiNguoiTroLen: string;
  tongSoNguoiBiNan: string;
  soLaoDongNuBiNan: string;
  soNguoiChet: string;
  soNguoiThuongNang: string;
  soNguoiBiNanKhongQL: string;
  laoDongNuBiNanKhongQL: string;
  soNguoiChetKhongQL: string;
  soNguoiThuongNangKhongQL: string;

  // Nhóm 2: Thiệt hại do tai nạn lao động
  chiPhiYTe: string;
  chiPhiLuong: string;
  chiPhiBoiThuong: string;
  tongChiPhi: string;
  soNgayNghi: string;
  thietHaiTaiSan: string;

  // Tab 2: Khối chi tiết động
  details: AccidentDetailBlock[];

  // Section 3: 2. Tai nạn lao động được hưởng trợ cấp (Chứa 17 trường giống Section 1)
  tc_tongSoVu: string;
  tc_soVuCoNguoiChet: string;
  tc_soVuHaiNguoiTroLen: string;
  tc_tongSoNguoiBiNan: string;
  tc_soLaoDongNuBiNan: string;
  tc_soNguoiChet: string;
  tc_soNguoiThuongNang: string;
  tc_soNguoiBiNanKhongQL: string;
  tc_laoDongNuBiNanKhongQL: string;
  tc_soNguoiChetKhongQL: string;
  tc_soNguoiThuongNangKhongQL: string;

  tc_chiPhiYTe: string;
  tc_chiPhiLuong: string;
  tc_chiPhiBoiThuong: string;
  tc_tongChiPhi: string;
  tc_soNgayNghi: string;
  tc_thietHaiTaiSan: string;
}

const DEFAULT_REPORT_LIST: ReportData[] = [
  {
    id: 1,
    year: 2022,
    period: "6 tháng",
    status: "Đang báo cáo",
    enterpriseName: "CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ VẬN TẢI PHẠM THIÊN ÂN",
    taxCode: "0317118106",
    businessType: "Công ty trách nhiệm hữu hạn tư nhân",
    industry: "Sản xuất cơ khí hàng tiêu dùng",
    laoDongCoSo: "10",
    laoDongNu: "5",
    quyLuong: "10.2",
    tongSoVu: "1",
    soVuCoNguoiChet: "1",
    soVuHaiNguoiTroLen: "1",
    tongSoNguoiBiNan: "10",
    soLaoDongNuBiNan: "5",
    soNguoiChet: "5",
    soNguoiThuongNang: "10",
    soNguoiBiNanKhongQL: "0",
    laoDongNuBiNanKhongQL: "0",
    soNguoiChetKhongQL: "0",
    soNguoiThuongNangKhongQL: "0",
    chiPhiYTe: "10.000.000",
    chiPhiLuong: "10.000.000",
    chiPhiBoiThuong: "10.000.000",
    tongChiPhi: "30.000.000",
    soNgayNghi: "20",
    thietHaiTaiSan: "10.000.000",
    details: [
      {
        id: 1,
        causeCategory:
          "Không có thiết bị an toàn hoặc thiết bị không đảm bảo an toàn",
        factorCategory: "Thiết bị nâng",
        jobCategory:
          "Nhà lãnh đạo cơ quan Đảng Cộng sản Việt nam cấp Trung ương",
        tongSoVu: "1",
        soVuCoNguoiChet: "1",
        soVuHaiNguoiTroLen: "1",
        tongSoNguoiBiNan: "10",
        soLaoDongNuBiNan: "5",
        soNguoiChet: "5",
        soNguoiThuongNang: "10",
        soNguoiBiNanKhongQL: "0",
        laoDongNuBiNanKhongQL: "0",
        soNguoiChetKhongQL: "0",
        soNguoiThuongNangKhongQL: "0",
        chiPhiYTe: "10.000.000",
        chiPhiLuong: "10.000.000",
        chiPhiBoiThuong: "10.000.000",
        tongChiPhi: "30.000.000",
        soNgayNghi: "20",
        thietHaiTaiSan: "10.000.000",
      },
    ],
    tc_tongSoVu: "0",
    tc_soVuCoNguoiChet: "0",
    tc_soVuHaiNguoiTroLen: "0",
    tc_tongSoNguoiBiNan: "0",
    tc_soLaoDongNuBiNan: "0",
    tc_soNguoiChet: "0",
    tc_soNguoiThuongNang: "0",
    tc_soNguoiBiNanKhongQL: "0",
    tc_laoDongNuBiNanKhongQL: "0",
    tc_soNguoiChetKhongQL: "0",
    tc_soNguoiThuongNangKhongQL: "0",
    tc_chiPhiYTe: "0",
    tc_chiPhiLuong: "0",
    tc_chiPhiBoiThuong: "0",
    tc_tongChiPhi: "0",
    tc_soNgayNghi: "0",
    tc_thietHaiTaiSan: "0",
  },
  {
    id: 2,
    year: 2022,
    period: "Cả năm",
    status: "Đã tiếp nhận",
    enterpriseName: "CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ VẬN TẢI PHẠM THIÊN ÂN",
    taxCode: "0317118106",
    businessType: "Công ty trách nhiệm hữu hạn tư nhân",
    industry: "Sản xuất cơ khí hàng tiêu dùng",
    laoDongCoSo: "12",
    laoDongNu: "6",
    quyLuong: "24.5",
    tongSoVu: "0",
    soVuCoNguoiChet: "0",
    soVuHaiNguoiTroLen: "0",
    tongSoNguoiBiNan: "0",
    soLaoDongNuBiNan: "0",
    soNguoiChet: "0",
    soNguoiThuongNang: "0",
    soNguoiBiNanKhongQL: "0",
    laoDongNuBiNanKhongQL: "0",
    soNguoiChetKhongQL: "0",
    soNguoiThuongNangKhongQL: "0",
    chiPhiYTe: "0",
    chiPhiLuong: "0",
    chiPhiBoiThuong: "0",
    tongChiPhi: "0",
    soNgayNghi: "0",
    thietHaiTaiSan: "0",
    details: [],
    tc_tongSoVu: "0",
    tc_soVuCoNguoiChet: "0",
    tc_soVuHaiNguoiTroLen: "0",
    tc_tongSoNguoiBiNan: "0",
    tc_soLaoDongNuBiNan: "0",
    tc_soNguoiChet: "0",
    tc_soNguoiThuongNang: "0",
    tc_soNguoiBiNanKhongQL: "0",
    tc_laoDongNuBiNanKhongQL: "0",
    tc_soNguoiChetKhongQL: "0",
    tc_soNguoiThuongNangKhongQL: "0",
    tc_chiPhiYTe: "0",
    tc_chiPhiLuong: "0",
    tc_chiPhiBoiThuong: "0",
    tc_tongChiPhi: "0",
    tc_soNgayNghi: "0",
    tc_thietHaiTaiSan: "0",
  },
];

const CAUSE_CATEGORIES = [
  "Không có thiết bị an toàn hoặc thiết bị không đảm bảo an toàn",
  "Không có phương tiện bảo vệ cá nhân hoặc phương tiện bảo vệ cá nhân không tốt",
  "Tổ chức lao động không hợp lý",
  "Chưa huấn luyện hoặc huấn luyện an toàn vệ sinh lao động chưa đầy đủ",
  "Không có quy trình an toàn hoặc biện pháp làm việc an toàn",
  "Điều kiện làm việc không tốt",
  "Vi phạm nội quy, quy trình, biện pháp làm việc an toàn",
  "Không sử dụng phương tiện bảo vệ cá nhân",
  "Khách quan khó tránh/ Nguyên nhân chưa kể đến",
];

const FACTOR_CATEGORIES = [
  "Thiết bị nâng",
  "Máy gia công cắt gọt kim loại, gỗ",
  "Điện giật",
  "Ngã từ trên cao",
  "Vật rơi, vật văng bắn",
  "Nhiệt độ cao, bỏng lửa",
  "Khác",
];

const JOB_CATEGORIES = [
  "Nhà lãnh đạo cơ quan Đảng Cộng sản Việt nam cấp Trung ương",
  "Công nhân",
  "Nhà quản lý, điều hành doanh nghiệp",
  "Kỹ sư, kỹ thuật viên chuyên nghiệp",
  "Thợ vận hành máy và thiết bị",
  "Lao động thủ công giản đơn",
  "Khác",
];

export const TnldTheoHdld: React.FC<TnldTheoHdldProps> = ({ showToast }) => {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "declaration">("list");
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isGeneratingWord, setIsGeneratingWord] = useState(false);

  // Year Filter in List
  const [selectedYearFilter, setSelectedYearFilter] = useState<number>(
    new Date().getFullYear(),
  );
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  // Sections navigation state
  type ReportSection =
    "enterprise-info" | "accident-stats" | "accident-benefits" | "general-view";
  const [currentSection, setCurrentSection] =
    useState<ReportSection>("enterprise-info");
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);

  // Tab state in Section 1
  const [activeTab, setActiveTab] = useState<"totals" | "details">("totals");

  // Main editable form data
  const [formData, setFormData] = useState<ReportData | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Collapsible state for dynamic blocks in Tab 2
  const [expandedBlocks, setExpandedBlocks] = useState<Record<number, boolean>>(
    {},
  );
  // Block errors
  const [blockErrors, setBlockErrors] = useState<
    Record<number, Record<string, string>>
  >({});

  // Modals state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [validationErrorsPopup, setValidationErrorsPopup] = useState<
    string[] | null
  >(null);

  // File upload state for PDF report
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const submitInFlightRef = useRef(false);

  // Catalog cache states
  const [causeCatalog, setCauseCatalog] = useState<any[]>([]);
  const [factorCatalog, setFactorCatalog] = useState<any[]>([]);
  const [jobCatalog, setJobCatalog] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [activePeriods, setActivePeriods] = useState<any[]>([]);
  const causeCategories = React.useMemo(() => {
    const parentIds = new Set(
      causeCatalog
        .map((item) => Number(item.parentId))
        .filter((id) => Number.isInteger(id) && id > 0),
    );
    const leaves = causeCatalog.filter(
      (item) => !parentIds.has(Number(item.id)),
    );
    return leaves.length > 0
      ? leaves.map((item) => String(item.name))
      : CAUSE_CATEGORIES;
  }, [causeCatalog]);
  const factorCategories = React.useMemo(
    () =>
      factorCatalog.length > 0
        ? factorCatalog.map((item) => String(item.name))
        : FACTOR_CATEGORIES,
    [factorCatalog],
  );
  const jobCategories = React.useMemo(() => {
    const parentIds = new Set(
      jobCatalog
        .map((item) => Number(item.parentId))
        .filter((id) => Number.isInteger(id) && id > 0),
    );
    const leaves = jobCatalog.filter((item) => !parentIds.has(Number(item.id)));
    return leaves.length > 0
      ? leaves.map((item) => String(item.name))
      : JOB_CATEGORIES;
  }, [jobCatalog]);

  const availableYears = React.useMemo(() => {
    const years = new Set<number>();

    activePeriods.forEach((p) => {
      if (p.year) years.add(Number(p.year));
    });

    reports.forEach((r) => {
      if (r.year) years.add(Number(r.year));
    });

    return Array.from(years).sort((a, b) => b - a);
  }, [activePeriods, reports]);

  useEffect(() => {
    if (
      availableYears.length > 0 &&
      !availableYears.includes(selectedYearFilter)
    ) {
      setSelectedYearFilter(availableYears[0]);
    }
  }, [availableYears, selectedYearFilter]);

  // Format Helper with dots
  const formatNumberWithDots = (val: string | number) => {
    if (val === undefined || val === null || val === "") return "";
    const clean = String(val).replace(/\D/g, "");
    if (!clean) return "";
    return Number(clean).toLocaleString("vi-VN");
  };

  const parseDotsToNumber = (formattedStr: string) => {
    if (!formattedStr) return 0;
    const cleanStr = String(formattedStr).replace(/\./g, "");
    return cleanStr ? Number(cleanStr) : 0;
  };

  // Mappings helper functions
  const getCauseId = (name: string) => {
    const found = causeCatalog.find(
      (c) => c.name.toLowerCase().trim() === name.toLowerCase().trim(),
    );
    return found?.id ?? null;
  };

  const getFactorId = (name: string) => {
    const found = factorCatalog.find(
      (c) => c.name.toLowerCase().trim() === name.toLowerCase().trim(),
    );
    return found?.id ?? null;
  };

  const getJobId = (name: string) => {
    const found = jobCatalog.find(
      (c) => c.name.toLowerCase().trim() === name.toLowerCase().trim(),
    );
    return found?.id ?? null;
  };

  const mapCauseToFrontend = (catalog: any) => {
    return catalog?.name || "";
  };

  const mapFactorToFrontend = (catalog: any) => {
    return catalog?.name || "";
  };

  const mapJobToFrontend = (catalog: any) => {
    return catalog?.name || "";
  };

  const mapApiReportToFrontend = (r: any): ReportData => {
    const allowanceDetail = r.details?.find(
      (d: any) => d.section === "ARTICLE_39_ALLOWANCE",
    );

    return {
      id: r.id,
      reportPeriodId: r.reportPeriod?.id,
      year: r.reportPeriod?.year || new Date().getFullYear(),
      period:
        r.reportPeriod?.periodTypeLabel ||
        (r.reportPeriod?.periodType === "SIX_MONTHS" ? "6 tháng" : "Cả năm"),
      status:
        r.status === "RECEIVED"
          ? "Đã tiếp nhận"
          : r.status === "SUBMITTED"
            ? "Đang chờ duyệt"
            : r.status === "REJECTED"
              ? "Từ chối phê duyệt"
              : "Đang báo cáo",
      rejectReason: r.rejectReason || "",
      windowStatus: r.windowStatus,
      canEdit: Boolean(r.canEdit),
      canSubmit: Boolean(r.canSubmit),
      unavailableReason: r.unavailableReason || null,
      enterpriseName: r.businessName || profile?.businessName || "",
      taxCode: r.taxCode || profile?.taxCode || "",
      businessType: r.businessType || profile?.businessType || "",
      industry: r.industryName || profile?.industryName || "",
      laoDongCoSo: String(r.totalEmployees || 0),
      laoDongNu: String(r.femaleEmployees || 0),
      quyLuong: formatNumberWithDots(r.totalPayroll || 0),
      tongSoVu: String(r.totalAccidents || 0),
      soVuCoNguoiChet: String(r.fatalAccidents || 0),
      soVuHaiNguoiTroLen: String(r.accidentsWithTwoOrMoreVictims || 0),
      tongSoNguoiBiNan: String(r.totalVictims || 0),
      soLaoDongNuBiNan: String(r.femaleVictims || 0),
      soNguoiChet: String(r.deathVictims || 0),
      soNguoiThuongNang: String(r.severeInjuryVictims || 0),
      soNguoiBiNanKhongQL: String(r.victimsNotUnderManagement || 0),
      laoDongNuBiNanKhongQL: String(r.femaleVictimsNotUnderManagement || 0),
      soNguoiChetKhongQL: String(r.deathVictimsNotUnderManagement || 0),
      soNguoiThuongNangKhongQL: String(
        r.severeInjuryVictimsNotUnderManagement || 0,
      ),
      chiPhiYTe: formatNumberWithDots(r.medicalCost || 0),
      chiPhiLuong: formatNumberWithDots(r.salaryPaymentCost || 0),
      chiPhiBoiThuong: formatNumberWithDots(r.allowanceCost || 0),
      tongChiPhi: formatNumberWithDots(r.totalCost || 0),
      soNgayNghi: String(r.totalDaysOff || 0),
      thietHaiTaiSan: formatNumberWithDots(r.propertyDamage || 0),
      details: (r.details || [])
        .filter((d: any) => d.section === "ACCIDENT")
        .map((d: any) => ({
          id: d.id,
          causeCategory: mapCauseToFrontend(d.accidentCauseCatalog),
          factorCategory: mapFactorToFrontend(d.injuryFactorCatalog),
          jobCategory: mapJobToFrontend(d.occupationCatalog),
          tongSoVu: String(d.totalAccidents || 0),
          soVuCoNguoiChet: String(d.fatalAccidents || 0),
          soVuHaiNguoiTroLen: String(d.accidentsWithTwoOrMoreVictims || 0),
          tongSoNguoiBiNan: String(d.totalVictims || 0),
          soLaoDongNuBiNan: String(d.femaleVictims || 0),
          soNguoiChet: String(d.deathVictims || 0),
          soNguoiThuongNang: String(d.severeInjuryVictims || 0),
          soNguoiBiNanKhongQL: String(d.victimsNotUnderManagement || 0),
          laoDongNuBiNanKhongQL: String(d.femaleVictimsNotUnderManagement || 0),
          soNguoiChetKhongQL: String(d.deathVictimsNotUnderManagement || 0),
          soNguoiThuongNangKhongQL: String(
            d.severeInjuryVictimsNotUnderManagement || 0,
          ),
          chiPhiYTe: formatNumberWithDots(d.medicalCost || 0),
          chiPhiLuong: formatNumberWithDots(d.salaryPaymentCost || 0),
          chiPhiBoiThuong: formatNumberWithDots(d.allowanceCost || 0),
          tongChiPhi: formatNumberWithDots(d.totalCost || 0),
          soNgayNghi: String(d.daysOff || 0),
          thietHaiTaiSan: formatNumberWithDots(d.propertyDamage || 0),
        })),
      tc_tongSoVu: String(allowanceDetail?.totalAccidents || 0),
      tc_soVuCoNguoiChet: String(allowanceDetail?.fatalAccidents || 0),
      tc_soVuHaiNguoiTroLen: String(
        allowanceDetail?.accidentsWithTwoOrMoreVictims || 0,
      ),
      tc_tongSoNguoiBiNan: String(allowanceDetail?.totalVictims || 0),
      tc_soLaoDongNuBiNan: String(allowanceDetail?.femaleVictims || 0),
      tc_soNguoiChet: String(allowanceDetail?.deathVictims || 0),
      tc_soNguoiThuongNang: String(allowanceDetail?.severeInjuryVictims || 0),
      tc_soNguoiBiNanKhongQL: String(
        allowanceDetail?.victimsNotUnderManagement || 0,
      ),
      tc_laoDongNuBiNanKhongQL: String(
        allowanceDetail?.femaleVictimsNotUnderManagement || 0,
      ),
      tc_soNguoiChetKhongQL: String(
        allowanceDetail?.deathVictimsNotUnderManagement || 0,
      ),
      tc_soNguoiThuongNangKhongQL: String(
        allowanceDetail?.severeInjuryVictimsNotUnderManagement || 0,
      ),
      tc_chiPhiYTe: formatNumberWithDots(allowanceDetail?.medicalCost || 0),
      tc_chiPhiLuong: formatNumberWithDots(
        allowanceDetail?.salaryPaymentCost || 0,
      ),
      tc_chiPhiBoiThuong: formatNumberWithDots(
        allowanceDetail?.allowanceCost || 0,
      ),
      tc_tongChiPhi: formatNumberWithDots(allowanceDetail?.totalCost || 0),
      tc_soNgayNghi: String(allowanceDetail?.daysOff || 0),
      tc_thietHaiTaiSan: formatNumberWithDots(
        allowanceDetail?.propertyDamage || 0,
      ),
    };
  };

  // Fetch catalogs and profile on mount
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        const [causes, factors, jobs, profileRes] = await Promise.all([
          getCatalogOptions("ACCIDENT_CAUSE"),
          getCatalogOptions("INJURY_FACTOR"),
          getCatalogOptions("OCCUPATION"),
          getMyBusinessProfile(),
        ]);
        if (causes.success) setCauseCatalog(causes.data || []);
        if (factors.success) setFactorCatalog(factors.data || []);
        if (jobs.success) setJobCatalog(jobs.data || []);
        if (profileRes.success) setProfile(profileRes.data);
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu cấu hình ban đầu:", err);
        showToast("Không thể kết nối API cấu hình", "error");
      } finally {
        setIsLoading(false);
      }
    };
    initData();
  }, []);

  const loadReportsAndPeriods = async () => {
    setIsLoading(true);
    try {
      const [reportsRes, periodsRes] = await Promise.all([
        getMyLaborAccidentReports({ limit: 100 }),
        getMyLaborAccidentReportPeriods(),
      ]);

      let backendReports: any[] = [];
      if (reportsRes.success && reportsRes.data && reportsRes.data.items) {
        backendReports = reportsRes.data.items;
      }

      let periods: any[] = [];
      if (periodsRes.success && periodsRes.data && periodsRes.data.items) {
        periods = periodsRes.data.items;
      }
      setActivePeriods(periods);

      // Now map backend reports
      const mappedReports: ReportData[] = backendReports.map((r: any) => {
        const allowanceDetail = r.details?.find(
          (d: any) => d.section === "ARTICLE_39_ALLOWANCE",
        );

        return {
          id: r.id,
          reportPeriodId: r.reportPeriod?.id,
          year: r.reportPeriod?.year || new Date().getFullYear(),
          period:
            r.reportPeriod?.periodTypeLabel ||
            (r.reportPeriod?.periodType === "SIX_MONTHS"
              ? "6 tháng"
              : "Cả năm"),
          status:
            r.status === "RECEIVED"
              ? "Đã tiếp nhận"
              : r.status === "SUBMITTED"
                ? "Đang chờ duyệt"
                : r.status === "REJECTED"
                  ? "Từ chối phê duyệt"
                  : "Đang báo cáo",
          rejectReason: r.rejectReason || "",
          windowStatus: r.windowStatus,
          canEdit: Boolean(r.canEdit),
          canSubmit: Boolean(r.canSubmit),
          unavailableReason: r.unavailableReason || null,
          enterpriseName: r.businessName || profile?.businessName || "",
          taxCode: r.taxCode || profile?.taxCode || "",
          businessType: r.businessType || profile?.businessType || "",
          industry: r.industryName || profile?.industryName || "",
          laoDongCoSo: String(r.totalEmployees || 0),
          laoDongNu: String(r.femaleEmployees || 0),
          quyLuong: formatNumberWithDots(r.totalPayroll || 0),
          tongSoVu: String(r.totalAccidents || 0),
          soVuCoNguoiChet: String(r.fatalAccidents || 0),
          soVuHaiNguoiTroLen: String(r.accidentsWithTwoOrMoreVictims || 0),
          tongSoNguoiBiNan: String(r.totalVictims || 0),
          soLaoDongNuBiNan: String(r.femaleVictims || 0),
          soNguoiChet: String(r.deathVictims || 0),
          soNguoiThuongNang: String(r.severeInjuryVictims || 0),
          soNguoiBiNanKhongQL: String(r.victimsNotUnderManagement || 0),
          laoDongNuBiNanKhongQL: String(r.femaleVictimsNotUnderManagement || 0),
          soNguoiChetKhongQL: String(r.deathVictimsNotUnderManagement || 0),
          soNguoiThuongNangKhongQL: String(
            r.severeInjuryVictimsNotUnderManagement || 0,
          ),
          chiPhiYTe: formatNumberWithDots(r.medicalCost || 0),
          chiPhiLuong: formatNumberWithDots(r.salaryPaymentCost || 0),
          chiPhiBoiThuong: formatNumberWithDots(r.allowanceCost || 0),
          tongChiPhi: formatNumberWithDots(r.totalCost || 0),
          soNgayNghi: String(r.totalDaysOff || 0),
          thietHaiTaiSan: formatNumberWithDots(r.propertyDamage || 0),
          details: (r.details || [])
            .filter((d: any) => d.section === "ACCIDENT")
            .map((d: any) => ({
              id: d.id,
              causeCategory: mapCauseToFrontend(d.accidentCauseCatalog),
              factorCategory: mapFactorToFrontend(d.injuryFactorCatalog),
              jobCategory: mapJobToFrontend(d.occupationCatalog),
              tongSoVu: String(d.totalAccidents || 0),
              soVuCoNguoiChet: String(d.fatalAccidents || 0),
              soVuHaiNguoiTroLen: String(d.accidentsWithTwoOrMoreVictims || 0),
              tongSoNguoiBiNan: String(d.totalVictims || 0),
              soLaoDongNuBiNan: String(d.femaleVictims || 0),
              soNguoiChet: String(d.deathVictims || 0),
              soNguoiThuongNang: String(d.severeInjuryVictims || 0),
              soNguoiBiNanKhongQL: String(d.victimsNotUnderManagement || 0),
              laoDongNuBiNanKhongQL: String(
                d.femaleVictimsNotUnderManagement || 0,
              ),
              soNguoiChetKhongQL: String(d.deathVictimsNotUnderManagement || 0),
              soNguoiThuongNangKhongQL: String(
                d.severeInjuryVictimsNotUnderManagement || 0,
              ),
              chiPhiYTe: formatNumberWithDots(d.medicalCost || 0),
              chiPhiLuong: formatNumberWithDots(d.salaryPaymentCost || 0),
              chiPhiBoiThuong: formatNumberWithDots(d.allowanceCost || 0),
              tongChiPhi: formatNumberWithDots(d.totalCost || 0),
              soNgayNghi: String(d.daysOff || 0),
              thietHaiTaiSan: formatNumberWithDots(d.propertyDamage || 0),
            })),
          tc_tongSoVu: String(allowanceDetail?.totalAccidents || 0),
          tc_soVuCoNguoiChet: String(allowanceDetail?.fatalAccidents || 0),
          tc_soVuHaiNguoiTroLen: String(
            allowanceDetail?.accidentsWithTwoOrMoreVictims || 0,
          ),
          tc_tongSoNguoiBiNan: String(allowanceDetail?.totalVictims || 0),
          tc_soLaoDongNuBiNan: String(allowanceDetail?.femaleVictims || 0),
          tc_soNguoiChet: String(allowanceDetail?.deathVictims || 0),
          tc_soNguoiThuongNang: String(
            allowanceDetail?.severeInjuryVictims || 0,
          ),
          tc_soNguoiBiNanKhongQL: String(
            allowanceDetail?.victimsNotUnderManagement || 0,
          ),
          tc_laoDongNuBiNanKhongQL: String(
            allowanceDetail?.femaleVictimsNotUnderManagement || 0,
          ),
          tc_soNguoiChetKhongQL: String(
            allowanceDetail?.deathVictimsNotUnderManagement || 0,
          ),
          tc_soNguoiThuongNangKhongQL: String(
            allowanceDetail?.severeInjuryVictimsNotUnderManagement || 0,
          ),
          tc_chiPhiYTe: formatNumberWithDots(allowanceDetail?.medicalCost || 0),
          tc_chiPhiLuong: formatNumberWithDots(
            allowanceDetail?.salaryPaymentCost || 0,
          ),
          tc_chiPhiBoiThuong: formatNumberWithDots(
            allowanceDetail?.allowanceCost || 0,
          ),
          tc_tongChiPhi: formatNumberWithDots(allowanceDetail?.totalCost || 0),
          tc_soNgayNghi: String(allowanceDetail?.daysOff || 0),
          tc_thietHaiTaiSan: formatNumberWithDots(
            allowanceDetail?.propertyDamage || 0,
          ),
        };
      });

      // Merge active periods that don't have reports yet
      const finalReports = [...mappedReports];
      periods.forEach((p: any) => {
        const exists = mappedReports.some(
          (r: any) => r.reportPeriodId === p.id,
        );
        if (!exists) {
          finalReports.push({
            id: -p.id,
            reportPeriodId: p.id,
            year: p.year,
            period:
              p.periodTypeLabel ||
              (p.periodType === "SIX_MONTHS" ? "6 tháng" : "Cả năm"),
            status: "Đang báo cáo",
            windowStatus: p.windowStatus,
            canEdit: Boolean(p.canEdit),
            canSubmit: Boolean(p.canSubmit),
            unavailableReason: p.unavailableReason || null,
            enterpriseName: profile?.businessName || "",
            taxCode: profile?.taxCode || "",
            businessType: profile?.businessType || "",
            industry: profile?.industryName || "",
            laoDongCoSo: "",
            laoDongNu: "",
            quyLuong: "",
            tongSoVu: "0",
            soVuCoNguoiChet: "0",
            soVuHaiNguoiTroLen: "0",
            tongSoNguoiBiNan: "0",
            soLaoDongNuBiNan: "0",
            soNguoiChet: "0",
            soNguoiThuongNang: "0",
            soNguoiBiNanKhongQL: "0",
            laoDongNuBiNanKhongQL: "0",
            soNguoiChetKhongQL: "0",
            soNguoiThuongNangKhongQL: "0",
            chiPhiYTe: "0",
            chiPhiLuong: "0",
            chiPhiBoiThuong: "0",
            tongChiPhi: "0",
            soNgayNghi: "0",
            thietHaiTaiSan: "0",
            details: [],
            tc_tongSoVu: "0",
            tc_soVuCoNguoiChet: "0",
            tc_soVuHaiNguoiTroLen: "0",
            tc_tongSoNguoiBiNan: "0",
            tc_soLaoDongNuBiNan: "0",
            tc_soNguoiChet: "0",
            tc_soNguoiThuongNang: "0",
            tc_soNguoiBiNanKhongQL: "0",
            tc_laoDongNuBiNanKhongQL: "0",
            tc_soNguoiChetKhongQL: "0",
            tc_soNguoiThuongNangKhongQL: "0",
            tc_chiPhiYTe: "0",
            tc_chiPhiLuong: "0",
            tc_chiPhiBoiThuong: "0",
            tc_tongChiPhi: "0",
            tc_soNgayNghi: "0",
            tc_thietHaiTaiSan: "0",
          });
        }
      });

      setReports(finalReports);
    } catch (err) {
      console.error("Lỗi khi tải danh sách báo cáo:", err);
      showToast("Không thể tải danh sách báo cáo từ máy chủ", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      loadReportsAndPeriods();
    }
  }, [profile]);

  // Load details if editing/viewing from API
  const handleEditClick = async (
    report: ReportData,
    readOnly: boolean = false,
  ) => {
    if (!readOnly && !report.canEdit) {
      showToast(
        report.unavailableReason || "Kỳ báo cáo hiện không cho phép chỉnh sửa",
        "error",
      );
      return;
    }

    setSelectedReport(report);
    setIsReadOnly(readOnly);
    setCurrentSection(readOnly ? "general-view" : "enterprise-info");
    setActiveTab("totals");
    setErrors({});
    setBlockErrors({});
    setUploadedFileName("");
    setUploadedFile(null);
    setUploadedFileUrl("");

    if (report.id < 0) {
      setFormData({ ...report });
      setViewMode("declaration");
      return;
    }

    setIsLoading(true);
    try {
      const res = await getMyLaborAccidentReportDetail(report.id);
      if (res.success && res.data) {
        const r = res.data;

        const currentAttachment =
          r.currentAttachment ||
          r.attachments?.find((attachment: any) => attachment.isCurrent) ||
          r.attachments?.[0];

        if (currentAttachment) {
          setUploadedFileName(
            currentAttachment.displayName ||
              currentAttachment.originalName ||
              "",
          );
          setUploadedFileUrl(currentAttachment.fileUrl || "");
        } else {
          setUploadedFileName("");
          setUploadedFileUrl("");
        }

        const fullReport = mapApiReportToFrontend(r);
        setFormData(fullReport);
        if (fullReport.details && fullReport.details.length > 0) {
          setExpandedBlocks({ 1: true });
        }
        setViewMode("declaration");
      } else {
        showToast("Không thể tải chi tiết báo cáo", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi tải chi tiết báo cáo", "error");
    } finally {
      setIsLoading(false);
    }

    setViewMode("declaration");
  };

  // Keep state saved temporarily in sessionStorage on every formData change
  useEffect(() => {
    if (formData) {
      sessionStorage.setItem(
        `vna_report_form_${formData.id}`,
        JSON.stringify(formData),
      );
    }
  }, [formData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        showToast("Vui lòng chỉ tải lên tệp tin PDF", "error");
        return;
      }
      setUploadedFile(file);
      setUploadedFileName(file.name);
      try {
        setUploadedFileUrl(URL.createObjectURL(file));
      } catch {
        setUploadedFileUrl("");
      }
      showToast(`Đã chọn tệp ${file.name}`, "success");
    }
  };

  // Handle Text inputs
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!formData || isReadOnly) return;
    const { name, value } = e.target;

    let nextValue = value;
    if (name === "quyLuong") {
      nextValue = formatNumberWithDots(value);
    }

    setFormData((prev) => (prev ? { ...prev, [name]: nextValue } : null));

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // Handle count fields (statistical integers)
  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!formData || isReadOnly) return;
    const { name, value } = e.target;

    const digitsOnly = value.replace(/\D/g, "");

    setFormData((prev) => {
      if (!prev) return null;
      let updated = { ...prev, [name]: digitsOnly };

      // DYNAMIC ACCIDENT BLOCKS SYNCHRONIZATION
      if (name === "tongSoVu") {
        const count = Number(digitsOnly || 0);

        if (count === 0) {
          updated.soVuCoNguoiChet = "0";
          updated.soVuHaiNguoiTroLen = "0";
          updated.tongSoNguoiBiNan = "0";
          updated.soLaoDongNuBiNan = "0";
          updated.soNguoiChet = "0";
          updated.soNguoiThuongNang = "0";
          updated.soNguoiBiNanKhongQL = "0";
          updated.laoDongNuBiNanKhongQL = "0";
          updated.soNguoiChetKhongQL = "0";
          updated.soNguoiThuongNangKhongQL = "0";
          updated.chiPhiYTe = "0";
          updated.chiPhiLuong = "0";
          updated.chiPhiBoiThuong = "0";
          updated.tongChiPhi = "0";
          updated.soNgayNghi = "0";
          updated.thietHaiTaiSan = "0";
          updated.details = [];
        } else {
          const nextDetails = [...(prev.details || [])];
          if (nextDetails.length < count) {
            // Add missing blocks
            for (let i = nextDetails.length; i < count; i++) {
              nextDetails.push({
                id: i + 1,
                causeCategory: "",
                factorCategory: "",
                jobCategory: "",
                tongSoVu: "1",
                soVuCoNguoiChet: "0",
                soVuHaiNguoiTroLen: "0",
                tongSoNguoiBiNan: "0",
                soLaoDongNuBiNan: "0",
                soNguoiChet: "0",
                soNguoiThuongNang: "0",
                soNguoiBiNanKhongQL: "0",
                laoDongNuBiNanKhongQL: "0",
                soNguoiChetKhongQL: "0",
                soNguoiThuongNangKhongQL: "0",
                chiPhiYTe: "0",
                chiPhiLuong: "0",
                chiPhiBoiThuong: "0",
                tongChiPhi: "0",
                soNgayNghi: "0",
                thietHaiTaiSan: "0",
              });
              setExpandedBlocks((ex) => ({ ...ex, [i + 1]: true }));
            }
          } else if (nextDetails.length > count) {
            // Remove excess blocks
            nextDetails.splice(count);
          }
          updated.details = nextDetails;
        }
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

  // Handle Money changes
  const handleMoneyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!formData || isReadOnly) return;
    const { name, value } = e.target;

    const formatted = formatNumberWithDots(value);

    setFormData((prev) => {
      if (!prev) return null;
      const updated = { ...prev, [name]: formatted };

      // Autocalculate total costs inside Nhóm 2 Section 1
      if (
        name === "chiPhiYTe" ||
        name === "chiPhiLuong" ||
        name === "chiPhiBoiThuong"
      ) {
        const yte = parseDotsToNumber(
          name === "chiPhiYTe" ? formatted : prev.chiPhiYTe,
        );
        const luong = parseDotsToNumber(
          name === "chiPhiLuong" ? formatted : prev.chiPhiLuong,
        );
        const boithuong = parseDotsToNumber(
          name === "chiPhiBoiThuong" ? formatted : prev.chiPhiBoiThuong,
        );
        updated.tongChiPhi = formatNumberWithDots(yte + luong + boithuong);
      }

      // Autocalculate total costs inside Section 2 (Trợ cấp)
      if (
        name === "tc_chiPhiYTe" ||
        name === "tc_chiPhiLuong" ||
        name === "tc_chiPhiBoiThuong"
      ) {
        const yte = parseDotsToNumber(
          name === "tc_chiPhiYTe" ? formatted : prev.tc_chiPhiYTe,
        );
        const luong = parseDotsToNumber(
          name === "tc_chiPhiLuong" ? formatted : prev.tc_chiPhiLuong,
        );
        const boithuong = parseDotsToNumber(
          name === "tc_chiPhiBoiThuong" ? formatted : prev.tc_chiPhiBoiThuong,
        );
        updated.tc_tongChiPhi = formatNumberWithDots(yte + luong + boithuong);
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

  // DYNAMIC BLOCK INPUT CHANGES
  const handleBlockTextChange = (
    blockIdx: number,
    field: keyof AccidentDetailBlock,
    val: string,
  ) => {
    if (!formData || isReadOnly) return;

    if (blockErrors[blockIdx]?.[field]) {
      setBlockErrors((prev) => {
        const next = { ...prev };
        if (next[blockIdx]) {
          const updatedBlock = { ...next[blockIdx] };
          delete updatedBlock[field];
          if (Object.keys(updatedBlock).length === 0) {
            delete next[blockIdx];
          } else {
            next[blockIdx] = updatedBlock;
          }
        }
        return next;
      });
    }

    setFormData((prev) => {
      if (!prev) return null;
      const nextDetails = (prev.details || []).map((b, idx) => {
        if (idx === blockIdx) {
          const updated = { ...b, [field]: val };

          // Auto-calculate accident stats
          const totalVictims = parseDotsToNumber(
            updated.tongSoNguoiBiNan || "0",
          );
          const deaths =
            parseDotsToNumber(updated.soNguoiChet || "0") +
            parseDotsToNumber(updated.soNguoiChetKhongQL || "0");

          updated.tongSoVu = "1";
          updated.soVuCoNguoiChet = deaths > 0 ? "1" : "0";
          updated.soVuHaiNguoiTroLen = totalVictims >= 2 ? "1" : "0";

          if (
            field === "chiPhiYTe" ||
            field === "chiPhiLuong" ||
            field === "chiPhiBoiThuong"
          ) {
            const yte = parseDotsToNumber(
              field === "chiPhiYTe" ? val : b.chiPhiYTe,
            );
            const luong = parseDotsToNumber(
              field === "chiPhiLuong" ? val : b.chiPhiLuong,
            );
            const boithuong = parseDotsToNumber(
              field === "chiPhiBoiThuong" ? val : b.chiPhiBoiThuong,
            );
            updated.tongChiPhi = formatNumberWithDots(yte + luong + boithuong);
          }
          return updated;
        }
        return b;
      });
      return { ...prev, details: nextDetails };
    });

    // Clear specific block field error
    if (blockErrors[blockIdx] && blockErrors[blockIdx][field]) {
      setBlockErrors((prev) => {
        const next = { ...prev };
        const blockErrs = { ...next[blockIdx] };
        delete blockErrs[field];
        if (Object.keys(blockErrs).length === 0) {
          delete next[blockIdx];
        } else {
          next[blockIdx] = blockErrs;
        }
        return next;
      });
    }
  };

  const handleBlockCountChange = (
    blockIdx: number,
    field: keyof AccidentDetailBlock,
    val: string,
  ) => {
    const digitsOnly = val.replace(/\D/g, "");
    handleBlockTextChange(blockIdx, field, digitsOnly);
  };

  const handleBlockMoneyChange = (
    blockIdx: number,
    field: keyof AccidentDetailBlock,
    val: string,
  ) => {
    const formatted = formatNumberWithDots(val);
    handleBlockTextChange(blockIdx, field, formatted);
  };

  // Section 2 specific fields change
  const handleTcCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!formData || isReadOnly) return;
    const { name, value } = e.target;
    const digitsOnly = value.replace(/\D/g, "");

    setFormData((prev) => {
      if (!prev) return null;
      let updated = { ...prev, [name]: digitsOnly };

      if (name === "tc_tongSoVu") {
        const count = Number(digitsOnly || 0);
        if (count === 0) {
          updated.tc_soVuCoNguoiChet = "0";
          updated.tc_soVuHaiNguoiTroLen = "0";
          updated.tc_tongSoNguoiBiNan = "0";
          updated.tc_soLaoDongNuBiNan = "0";
          updated.tc_soNguoiChet = "0";
          updated.tc_soNguoiThuongNang = "0";
          updated.tc_soNguoiBiNanKhongQL = "0";
          updated.tc_laoDongNuBiNanKhongQL = "0";
          updated.tc_soNguoiChetKhongQL = "0";
          updated.tc_soNguoiThuongNangKhongQL = "0";
          updated.tc_chiPhiYTe = "0";
          updated.tc_chiPhiLuong = "0";
          updated.tc_chiPhiBoiThuong = "0";
          updated.tc_tongChiPhi = "0";
          updated.tc_soNgayNghi = "0";
          updated.tc_thietHaiTaiSan = "0";
        }
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

  // Block expansion toggler
  const toggleBlock = (blockId: number) => {
    setExpandedBlocks((prev) => ({ ...prev, [blockId]: !prev[blockId] }));
  };

  // Validation function for current step
  const validateSection = (
    sec: ReportSection,
    onlyTotals: boolean = false,
  ): boolean => {
    if (!formData) return false;
    const newErrors: Record<string, string> = {};
    const popupMsgs: string[] = [];

    const getInt = (val: any) => {
      if (typeof val === "number") return val;
      if (!val) return 0;
      return Number(String(val).replace(/\D/g, "")) || 0;
    };

    const getMoney = (val: any) => {
      if (typeof val === "number") return val;
      if (!val) return 0;
      return Number(String(val).replace(/\./g, "")) || 0;
    };

    const checkCounts = (
      prefix: string,
      dataObj: any,
      errorsObj: Record<string, string>,
      msgs: string[],
      sectionName: string,
    ) => {
      const getVal = (f: string) => getInt(dataObj[prefix + f]);

      const tongSoVu = getVal("tongSoVu");
      const soVuCoNguoiChet = getVal("soVuCoNguoiChet");
      const soVuHaiNguoiTroLen = getVal("soVuHaiNguoiTroLen");
      const tongSoNguoiBiNan = getVal("tongSoNguoiBiNan");
      const soLaoDongNuBiNan = getVal("soLaoDongNuBiNan");
      const soNguoiChet = getVal("soNguoiChet");
      const soNguoiThuongNang = getVal("soNguoiThuongNang");
      const soNguoiBiNanKhongQL = getVal("soNguoiBiNanKhongQL");
      const laoDongNuBiNanKhongQL = getVal("laoDongNuBiNanKhongQL");
      const soNguoiChetKhongQL = getVal("soNguoiChetKhongQL");
      const soNguoiThuongNangKhongQL = getVal("soNguoiThuongNangKhongQL");

      const baseTotalWorkers = getInt(formData.laoDongCoSo);
      const baseFemaleWorkers = getInt(formData.laoDongNu);

      if (tongSoNguoiBiNan > baseTotalWorkers) {
        errorsObj[prefix + "tongSoNguoiBiNan"] = "Vượt quá tổng số lao động";
        msgs.push(
          `${sectionName}: Tổng số người bị nạn (${tongSoNguoiBiNan}) không được lớn hơn tổng số lao động của cơ sở (${baseTotalWorkers})`,
        );
      }
      if (soLaoDongNuBiNan > baseFemaleWorkers) {
        errorsObj[prefix + "soLaoDongNuBiNan"] = "Vượt quá số lao động nữ";
        msgs.push(
          `${sectionName}: Số lao động nữ bị nạn (${soLaoDongNuBiNan}) không được lớn hơn tổng số lao động nữ của cơ sở (${baseFemaleWorkers})`,
        );
      }

      if (soVuCoNguoiChet > tongSoVu) {
        errorsObj[prefix + "soVuCoNguoiChet"] = "Lớn hơn tổng số vụ";
        msgs.push(
          `${sectionName}: Số vụ có người chết (${soVuCoNguoiChet}) không được lớn hơn tổng số vụ (${tongSoVu})`,
        );
      }
      if (soVuHaiNguoiTroLen > tongSoVu) {
        errorsObj[prefix + "soVuHaiNguoiTroLen"] = "Lớn hơn tổng số vụ";
        msgs.push(
          `${sectionName}: Số vụ có từ 2 người bị nạn trở lên (${soVuHaiNguoiTroLen}) không được lớn hơn tổng số vụ (${tongSoVu})`,
        );
      }
      if (soLaoDongNuBiNan > tongSoNguoiBiNan) {
        errorsObj[prefix + "soLaoDongNuBiNan"] = "Lớn hơn tổng số người bị nạn";
        msgs.push(
          `${sectionName}: Số lao động nữ bị nạn (${soLaoDongNuBiNan}) không được lớn hơn tổng số người bị nạn (${tongSoNguoiBiNan})`,
        );
      }
      if (soNguoiChet > tongSoNguoiBiNan) {
        errorsObj[prefix + "soNguoiChet"] = "Lớn hơn tổng số người bị nạn";
        msgs.push(
          `${sectionName}: Số người bị chết (${soNguoiChet}) không được lớn hơn tổng số người bị nạn (${tongSoNguoiBiNan})`,
        );
      }
      if (soNguoiThuongNang > tongSoNguoiBiNan) {
        errorsObj[prefix + "soNguoiThuongNang"] =
          "Lớn hơn tổng số người bị nạn";
        msgs.push(
          `${sectionName}: Số người bị thương nặng (${soNguoiThuongNang}) không được lớn hơn tổng số người bị nạn (${tongSoNguoiBiNan})`,
        );
      }
      if (soNguoiChet + soNguoiThuongNang > tongSoNguoiBiNan) {
        errorsObj[prefix + "soNguoiChet"] =
          "Tổng chết + thương nặng vượt quá số người bị nạn";
        errorsObj[prefix + "soNguoiThuongNang"] =
          "Tổng chết + thương nặng vượt quá số người bị nạn";
        msgs.push(
          `${sectionName}: Tổng số người chết và thương nặng (${soNguoiChet + soNguoiThuongNang}) không được lớn hơn tổng số người bị nạn (${tongSoNguoiBiNan})`,
        );
      }
      if (soNguoiBiNanKhongQL > tongSoNguoiBiNan) {
        errorsObj[prefix + "soNguoiBiNanKhongQL"] =
          "Lớn hơn tổng số người bị nạn";
        msgs.push(
          `${sectionName}: Số người bị nạn không thuộc quyền quản lý (${soNguoiBiNanKhongQL}) không được lớn hơn tổng số người bị nạn (${tongSoNguoiBiNan})`,
        );
      }
      if (laoDongNuBiNanKhongQL > soNguoiBiNanKhongQL) {
        errorsObj[prefix + "laoDongNuBiNanKhongQL"] =
          "Vượt quá số người bị nạn không QL";
        msgs.push(
          `${sectionName}: Lao động nữ bị nạn không thuộc quyền quản lý (${laoDongNuBiNanKhongQL}) không được lớn hơn số người bị nạn không thuộc quyền quản lý (${soNguoiBiNanKhongQL})`,
        );
      }
      if (laoDongNuBiNanKhongQL > soLaoDongNuBiNan) {
        errorsObj[prefix + "laoDongNuBiNanKhongQL"] =
          "Vượt quá tổng số lao động nữ bị nạn";
        msgs.push(
          `${sectionName}: Lao động nữ bị nạn không thuộc quyền quản lý (${laoDongNuBiNanKhongQL}) không được lớn hơn tổng số lao động nữ bị nạn (${soLaoDongNuBiNan})`,
        );
      }
      if (soNguoiChetKhongQL > soNguoiChet) {
        errorsObj[prefix + "soNguoiChetKhongQL"] =
          "Vượt quá tổng số người chết";
        msgs.push(
          `${sectionName}: Số người chết không thuộc quyền quản lý (${soNguoiChetKhongQL}) không được lớn hơn tổng số người chết (${soNguoiChet})`,
        );
      }
      if (soNguoiChetKhongQL > soNguoiBiNanKhongQL) {
        errorsObj[prefix + "soNguoiChetKhongQL"] =
          "Vượt quá số người bị nạn không QL";
        msgs.push(
          `${sectionName}: Số người chết không thuộc quyền quản lý (${soNguoiChetKhongQL}) không được lớn hơn số người bị nạn không thuộc quyền quản lý (${soNguoiBiNanKhongQL})`,
        );
      }
      if (soNguoiThuongNangKhongQL > soNguoiThuongNang) {
        errorsObj[prefix + "soNguoiThuongNangKhongQL"] =
          "Vượt quá tổng số người thương nặng";
        msgs.push(
          `${sectionName}: Số người thương nặng không thuộc quyền quản lý (${soNguoiThuongNangKhongQL}) không được lớn hơn tổng số người thương nặng (${soNguoiThuongNang})`,
        );
      }
      if (soNguoiThuongNangKhongQL > soNguoiBiNanKhongQL) {
        errorsObj[prefix + "soNguoiThuongNangKhongQL"] =
          "Vượt quá số người bị nạn không QL";
        msgs.push(
          `${sectionName}: Số người thương nặng không thuộc quyền quản lý (${soNguoiThuongNangKhongQL}) không được lớn hơn số người bị nạn không thuộc quyền quản lý (${soNguoiBiNanKhongQL})`,
        );
      }
      if (soNguoiChetKhongQL + soNguoiThuongNangKhongQL > soNguoiBiNanKhongQL) {
        errorsObj[prefix + "soNguoiChetKhongQL"] =
          "Tổng vượt quá số người bị nạn không QL";
        errorsObj[prefix + "soNguoiThuongNangKhongQL"] =
          "Tổng vượt quá số người bị nạn không QL";
        msgs.push(
          `${sectionName}: Tổng số người chết và thương nặng không thuộc quyền quản lý (${soNguoiChetKhongQL + soNguoiThuongNangKhongQL}) không được lớn hơn số người bị nạn không thuộc quyền quản lý (${soNguoiBiNanKhongQL})`,
        );
      }
    };

    if (sec === "enterprise-info") {
      if (!formData.laoDongCoSo) {
        newErrors.laoDongCoSo = "Bắt buộc";
        popupMsgs.push("Thông tin công ty: Vui lòng nhập tổng số lao động");
      }
      if (!formData.laoDongNu) {
        newErrors.laoDongNu = "Bắt buộc";
        popupMsgs.push("Thông tin công ty: Vui lòng nhập tổng số lao động nữ");
      }
      if (!formData.quyLuong) {
        newErrors.quyLuong = "Bắt buộc";
        popupMsgs.push("Thông tin công ty: Vui lòng nhập tổng quỹ lương");
      }

      const total = getInt(formData.laoDongCoSo);
      const nu = getInt(formData.laoDongNu);
      if (nu > total) {
        newErrors.laoDongNu =
          "Số lao động nữ không được vượt quá tổng số lao động";
        popupMsgs.push(
          `Thông tin công ty: Số lao động nữ (${nu}) không được lớn hơn tổng số lao động (${total})`,
        );
      }
    } else if (sec === "accident-stats") {
      // 1. Validate general statistics (Tab 1 fields)
      const countFields = [
        "tongSoVu",
        "soVuCoNguoiChet",
        "soVuHaiNguoiTroLen",
        "tongSoNguoiBiNan",
        "soLaoDongNuBiNan",
        "soNguoiChet",
        "soNguoiThuongNang",
        "soNguoiBiNanKhongQL",
        "laoDongNuBiNanKhongQL",
        "soNguoiChetKhongQL",
        "soNguoiThuongNangKhongQL",
      ];
      countFields.forEach((f) => {
        if (
          formData[f as keyof ReportData] === undefined ||
          formData[f as keyof ReportData] === null ||
          String(formData[f as keyof ReportData]).trim() === ""
        ) {
          newErrors[f] = "Bắt buộc";
          popupMsgs.push(
            `1. Tai nạn lao động (Tổng số): Trường số liệu "${f}" bắt buộc phải nhập`,
          );
        }
      });

      const costFields = [
        "chiPhiYTe",
        "chiPhiLuong",
        "chiPhiBoiThuong",
        "soNgayNghi",
      ];
      costFields.forEach((f) => {
        if (
          formData[f as keyof ReportData] === undefined ||
          formData[f as keyof ReportData] === null ||
          String(formData[f as keyof ReportData]).trim() === ""
        ) {
          newErrors[f] = "Bắt buộc";
          popupMsgs.push(
            `1. Tai nạn lao động (Thiệt hại): Trường số liệu "${f}" bắt buộc phải nhập`,
          );
        }
      });

      // Apply inner counts logic rules on Section 2 totals
      checkCounts(
        "",
        formData,
        newErrors,
        popupMsgs,
        "1. Tai nạn lao động (Tổng số)",
      );

      const tongVu = getInt(formData.tongSoVu);

      // Auto-inherit if tongSoVu === 1
      if (
        tongVu === 1 &&
        formData.details &&
        formData.details.length === 1 &&
        !onlyTotals
      ) {
        const firstBlock = formData.details[0];
        const isDifferent =
          firstBlock.soVuCoNguoiChet !== formData.soVuCoNguoiChet ||
          firstBlock.soVuHaiNguoiTroLen !== formData.soVuHaiNguoiTroLen ||
          firstBlock.tongSoNguoiBiNan !== formData.tongSoNguoiBiNan ||
          firstBlock.soLaoDongNuBiNan !== formData.soLaoDongNuBiNan ||
          firstBlock.soNguoiChet !== formData.soNguoiChet ||
          firstBlock.soNguoiThuongNang !== formData.soNguoiThuongNang ||
          firstBlock.soNguoiBiNanKhongQL !== formData.soNguoiBiNanKhongQL ||
          firstBlock.laoDongNuBiNanKhongQL !== formData.laoDongNuBiNanKhongQL ||
          firstBlock.soNguoiChetKhongQL !== formData.soNguoiChetKhongQL ||
          firstBlock.soNguoiThuongNangKhongQL !==
            formData.soNguoiThuongNangKhongQL ||
          firstBlock.chiPhiYTe !== formData.chiPhiYTe ||
          firstBlock.chiPhiLuong !== formData.chiPhiLuong ||
          firstBlock.chiPhiBoiThuong !== formData.chiPhiBoiThuong ||
          firstBlock.tongChiPhi !== formData.tongChiPhi ||
          firstBlock.soNgayNghi !== formData.soNgayNghi ||
          firstBlock.thietHaiTaiSan !== formData.thietHaiTaiSan;

        if (isDifferent) {
          const updatedDetails = [
            {
              ...firstBlock,
              tongSoVu: "1",
              soVuCoNguoiChet: formData.soVuCoNguoiChet,
              soVuHaiNguoiTroLen: formData.soVuHaiNguoiTroLen,
              tongSoNguoiBiNan: formData.tongSoNguoiBiNan,
              soLaoDongNuBiNan: formData.soLaoDongNuBiNan,
              soNguoiChet: formData.soNguoiChet,
              soNguoiThuongNang: formData.soNguoiThuongNang,
              soNguoiBiNanKhongQL: formData.soNguoiBiNanKhongQL,
              laoDongNuBiNanKhongQL: formData.laoDongNuBiNanKhongQL,
              soNguoiChetKhongQL: formData.soNguoiChetKhongQL,
              soNguoiThuongNangKhongQL: formData.soNguoiThuongNangKhongQL,
              chiPhiYTe: formData.chiPhiYTe,
              chiPhiLuong: formData.chiPhiLuong,
              chiPhiBoiThuong: formData.chiPhiBoiThuong,
              tongChiPhi: formData.tongChiPhi,
              soNgayNghi: formData.soNgayNghi,
              thietHaiTaiSan: formData.thietHaiTaiSan,
            },
          ];
          formData.details = updatedDetails;
          setFormData({ ...formData });
        }
      }

      // 2. Validate dynamic accident detail blocks if tongSoVu > 0
      if (tongVu > 0 && !onlyTotals) {
        let blockHasError = false;
        const localBlockErrors: Record<number, Record<string, string>> = {};

        (formData.details || []).forEach((block, idx) => {
          const blockErrs: Record<string, string> = {};
          const blockMsgs: string[] = [];

          if (!block.causeCategory) {
            blockErrs.causeCategory = "Bắt buộc";
            blockHasError = true;
            blockMsgs.push(`Vụ tai nạn số ${idx + 1}: Vui lòng chọn nguyên nhân xảy ra TNLĐ`);
          }
          if (!block.factorCategory) {
            blockErrs.factorCategory = "Bắt buộc";
            blockHasError = true;
            blockMsgs.push(`Vụ tai nạn số ${idx + 1}: Vui lòng chọn yếu tố gây chấn thương`);
          }
          if (!block.jobCategory) {
            blockErrs.jobCategory = "Bắt buộc";
            blockHasError = true;
            blockMsgs.push(`Vụ tai nạn số ${idx + 1}: Vui lòng chọn nghề nghiệp`);
          }

          countFields.forEach((f) => {
            if (
              f === "tongSoVu" ||
              f === "soVuCoNguoiChet" ||
              f === "soVuHaiNguoiTroLen"
            )
              return;
            if (
              block[f as keyof AccidentDetailBlock] === undefined ||
              block[f as keyof AccidentDetailBlock] === null ||
              String(block[f as keyof AccidentDetailBlock]).trim() === ""
            ) {
              blockErrs[f] = "Bắt buộc";
              blockHasError = true;
            }
          });

          costFields.forEach((f) => {
            if (
              block[f as keyof AccidentDetailBlock] === undefined ||
              block[f as keyof AccidentDetailBlock] === null ||
              String(block[f as keyof AccidentDetailBlock]).trim() === ""
            ) {
              blockErrs[f] = "Bắt buộc";
              blockHasError = true;
            }
          });

          if (Object.keys(blockErrs).length > 0) {
            blockMsgs.push(`Vui lòng điền đầy đủ tất cả các trường bắt buộc.`);
          }

          // Apply inner counts logic rules on the block
          checkCounts(
            "",
            block,
            blockErrs,
            blockMsgs,
            `Vụ tai nạn số ${idx + 1}`,
          );

          if (Object.keys(blockErrs).length > 0 || blockMsgs.length > 0) {
            localBlockErrors[idx] = blockErrs;
            popupMsgs.push(...blockMsgs);
            blockHasError = true;
          }
        });

        if (blockHasError) {
          setBlockErrors(localBlockErrors);
          setErrors(newErrors);
          setValidationErrorsPopup(popupMsgs);
          setActiveTab("details");
          // Expand the first block with error
          const firstErrIdx = Object.keys(localBlockErrors)
            .map(Number)
            .sort((a, b) => a - b)[0];
          if (firstErrIdx !== undefined) {
            setExpandedBlocks((prev) => ({ ...prev, [firstErrIdx + 1]: true }));
          }
          return false;
        }

        // Compare sum of details with totals in Tab 1
        let hasComparisonError = false;
        const compareFields = [
          { name: "soVuCoNguoiChet", label: "Số vụ có người chết" },
          {
            name: "soVuHaiNguoiTroLen",
            label: "Số vụ có từ 2 người bị nạn trở lên",
          },
          { name: "tongSoNguoiBiNan", label: "Tổng số người bị nạn" },
          { name: "soLaoDongNuBiNan", label: "Tổng số lao động nữ bị nạn" },
          { name: "soNguoiChet", label: "Tổng số người bị chết" },
          { name: "soNguoiThuongNang", label: "Tổng số người bị thương nặng" },
          { name: "soNguoiBiNanKhongQL", label: "Số người bị nạn không QL" },
          {
            name: "laoDongNuBiNanKhongQL",
            label: "Lao động nữ bị nạn không QL",
          },
          { name: "soNguoiChetKhongQL", label: "Số người chết không QL" },
          {
            name: "soNguoiThuongNangKhongQL",
            label: "Người bị thương nặng không QL",
          },
          { name: "soNgayNghi", label: "Tổng số ngày nghỉ vì TNLĐ" },
        ];

        compareFields.forEach((f) => {
          const totalInTab1 = getInt(formData[f.name as keyof ReportData]);
          const sumInDetails = sumBlocks(f.name as keyof AccidentDetailBlock);
          if (totalInTab1 !== sumInDetails) {
            hasComparisonError = true;
            (formData.details || []).forEach((_, idx) => {
              if (!localBlockErrors[idx]) {
                localBlockErrors[idx] = {};
              }
              localBlockErrors[idx][f.name] =
                `Khác tổng Tab 1 (${totalInTab1})`;
            });
            popupMsgs.push(
              `1. Tai nạn lao động: ${f.label} đã khai báo ở Tab 1 (${totalInTab1}) không khớp với tổng số liệu chi tiết trong Tab 2 (${sumInDetails})`,
            );
          }
        });

        // Compare money fields
        const compareMoneyFields = [
          { name: "chiPhiYTe", label: "Chi phí y tế" },
          {
            name: "chiPhiLuong",
            label: "Chi phí trả lương trong thời gian điều trị",
          },
          { name: "chiPhiBoiThuong", label: "Chi phí bồi thường trợ cấp" },
          { name: "thietHaiTaiSan", label: "Thiệt hại tài sản" },
        ];
        compareMoneyFields.forEach((f) => {
          const totalInTab1 = getMoney(formData[f.name as keyof ReportData]);
          const sumInDetails = sumBlocks(f.name as keyof AccidentDetailBlock);
          if (totalInTab1 !== sumInDetails) {
            hasComparisonError = true;
            (formData.details || []).forEach((_, idx) => {
              if (!localBlockErrors[idx]) {
                localBlockErrors[idx] = {};
              }
              localBlockErrors[idx][f.name] =
                `Khác tổng Tab 1 (${formatNumberWithDots(totalInTab1)})`;
            });
            popupMsgs.push(
              `1. Tai nạn lao động: ${f.label} đã khai báo ở Tab 1 (${formatNumberWithDots(totalInTab1)}) không khớp với tổng số liệu chi tiết trong Tab 2 (${formatNumberWithDots(sumInDetails)})`,
            );
          }
        });

        if (hasComparisonError) {
          setBlockErrors(localBlockErrors);
          setErrors(newErrors);
          setValidationErrorsPopup(popupMsgs);
          setActiveTab("details");
          setExpandedBlocks((prev) => ({ ...prev, 1: true }));
          return false;
        }
      }
    } else if (sec === "accident-benefits") {
      const tcFields = [
        "tc_tongSoVu",
        "tc_soVuCoNguoiChet",
        "tc_soVuHaiNguoiTroLen",
        "tc_tongSoNguoiBiNan",
        "tc_soLaoDongNuBiNan",
        "tc_soNguoiChet",
        "tc_soNguoiThuongNang",
        "tc_soNguoiBiNanKhongQL",
        "tc_laoDongNuBiNanKhongQL",
        "tc_soNguoiChetKhongQL",
        "tc_soNguoiThuongNangKhongQL",
        "tc_chiPhiYTe",
        "tc_chiPhiLuong",
        "tc_chiPhiBoiThuong",
        "tc_soNgayNghi",
      ];
      tcFields.forEach((f) => {
        if (
          formData[f as keyof ReportData] === undefined ||
          formData[f as keyof ReportData] === null ||
          String(formData[f as keyof ReportData]).trim() === ""
        ) {
          newErrors[f] = "Bắt buộc";
          popupMsgs.push(
            `2. Trợ cấp (Quy định khoản 2): Trường số liệu "${f}" bắt buộc phải nhập`,
          );
        }
      });

      // Apply inner counts logic rules on Section 3 totals (tc_ prefix)
      checkCounts(
        "tc_",
        formData,
        newErrors,
        popupMsgs,
        "2. Trợ cấp (Quy định khoản 2)",
      );

      // Compare Section 3 fields with corresponding Section 2 fields (must be <=)
      const compareSubsets = [
        { tc: "tc_tongSoVu", nonTc: "tongSoVu", label: "Tổng số vụ" },
        {
          tc: "tc_soVuCoNguoiChet",
          nonTc: "soVuCoNguoiChet",
          label: "Số vụ có người chết",
        },
        {
          tc: "tc_soVuHaiNguoiTroLen",
          nonTc: "soVuHaiNguoiTroLen",
          label: "Số vụ từ 2 người bị nạn trở lên",
        },
        {
          tc: "tc_tongSoNguoiBiNan",
          nonTc: "tongSoNguoiBiNan",
          label: "Tổng số người bị nạn",
        },
        {
          tc: "tc_soLaoDongNuBiNan",
          nonTc: "soLaoDongNuBiNan",
          label: "Tổng số lao động nữ bị nạn",
        },
        {
          tc: "tc_soNguoiChet",
          nonTc: "soNguoiChet",
          label: "Tổng số người bị chết",
        },
        {
          tc: "tc_soNguoiThuongNang",
          nonTc: "soNguoiThuongNang",
          label: "Tổng số người bị thương nặng",
        },
        {
          tc: "tc_soNguoiBiNanKhongQL",
          nonTc: "soNguoiBiNanKhongQL",
          label: "Số người bị nạn không QL",
        },
        {
          tc: "tc_laoDongNuBiNanKhongQL",
          nonTc: "laoDongNuBiNanKhongQL",
          label: "Lao động nữ bị nạn không QL",
        },
        {
          tc: "tc_soNguoiChetKhongQL",
          nonTc: "soNguoiChetKhongQL",
          label: "Số người chết không QL",
        },
        {
          tc: "tc_soNguoiThuongNangKhongQL",
          nonTc: "soNguoiThuongNangKhongQL",
          label: "Người bị thương nặng không QL",
        },
        {
          tc: "tc_soNgayNghi",
          nonTc: "soNgayNghi",
          label: "Tổng số ngày nghỉ vì TNLĐ",
        },
      ];

      compareSubsets.forEach((item) => {
        const tcVal = getInt(formData[item.tc as keyof ReportData]);
        const nonTcVal = getInt(formData[item.nonTc as keyof ReportData]);
        if (tcVal > nonTcVal) {
          newErrors[item.tc] = "Lớn hơn số liệu tổng";
          popupMsgs.push(
            `2. Trợ cấp (Quy định khoản 2): ${item.label} được hưởng trợ cấp (${tcVal}) không được lớn hơn tổng số liệu tai nạn đã khai báo (${nonTcVal})`,
          );
        }
      });

      const compareMoneySubsets = [
        { tc: "tc_chiPhiYTe", nonTc: "chiPhiYTe", label: "Chi phí y tế" },
        {
          tc: "tc_chiPhiLuong",
          nonTc: "chiPhiLuong",
          label: "Chi phí trả lương trong thời gian điều trị",
        },
        {
          tc: "tc_chiPhiBoiThuong",
          nonTc: "chiPhiBoiThuong",
          label: "Chi phí bồi thường trợ cấp",
        },
        {
          tc: "tc_thietHaiTaiSan",
          nonTc: "thietHaiTaiSan",
          label: "Thiệt hại tài sản",
        },
      ];

      compareMoneySubsets.forEach((item) => {
        const tcVal = getMoney(formData[item.tc as keyof ReportData]);
        const nonTcVal = getMoney(formData[item.nonTc as keyof ReportData]);
        if (tcVal > nonTcVal) {
          newErrors[item.tc] = "Lớn hơn số liệu tổng";
          popupMsgs.push(
            `2. Trợ cấp (Quy định khoản 2): ${item.label} được hưởng trợ cấp (${formatNumberWithDots(tcVal)}) không được lớn hơn tổng số liệu tai nạn đã khai báo (${formatNumberWithDots(nonTcVal)})`,
          );
        }
      });
    }

    setErrors(newErrors);
    if (popupMsgs.length > 0) {
      setValidationErrorsPopup(popupMsgs);
      return false;
    }
    return true;
  };

  const handleContinue = () => {
    if (isReadOnly) {
      if (currentSection === "enterprise-info") {
        setCurrentSection("accident-stats");
      } else if (currentSection === "accident-stats") {
        if (activeTab === "totals") {
          setActiveTab("details");
        } else {
          setCurrentSection("accident-benefits");
        }
      } else if (currentSection === "accident-benefits") {
        setCurrentSection("general-view");
      }
      return;
    }

    if (currentSection === "accident-stats" && activeTab === "totals") {
      switchToDetailsTab();
      return;
    }

    if (validateSection(currentSection)) {
      if (currentSection === "enterprise-info") {
        setCurrentSection("accident-stats");
        setActiveTab("totals");
      } else if (currentSection === "accident-stats") {
        setCurrentSection("accident-benefits");
      } else if (currentSection === "accident-benefits") {
        setCurrentSection("general-view");
      }
    }
  };

  const handleBack = () => {
    if (currentSection === "general-view") {
      setCurrentSection("accident-benefits");
    } else if (currentSection === "accident-benefits") {
      setCurrentSection("accident-stats");
      setActiveTab("details");
    } else if (currentSection === "accident-stats") {
      if (activeTab === "details") {
        setActiveTab("totals");
      } else {
        setCurrentSection("enterprise-info");
      }
    } else if (currentSection === "enterprise-info") {
      setViewMode("list");
    }
  };

  const switchToDetailsTab = () => {
    if (!formData) return;
    if (validateSection("accident-stats", true)) {
      const tongVu = Number(formData.tongSoVu || 0);
      if (tongVu === 1 && formData.details && formData.details.length === 1) {
        setFormData((prev) => {
          if (!prev) return null;
          const updatedDetails = [
            {
              ...prev.details[0],
              tongSoVu: "1",
              soVuCoNguoiChet: prev.soVuCoNguoiChet,
              soVuHaiNguoiTroLen: prev.soVuHaiNguoiTroLen,
              tongSoNguoiBiNan: prev.tongSoNguoiBiNan,
              soLaoDongNuBiNan: prev.soLaoDongNuBiNan,
              soNguoiChet: prev.soNguoiChet,
              soNguoiThuongNang: prev.soNguoiThuongNang,
              soNguoiBiNanKhongQL: prev.soNguoiBiNanKhongQL,
              laoDongNuBiNanKhongQL: prev.laoDongNuBiNanKhongQL,
              soNguoiChetKhongQL: prev.soNguoiChetKhongQL,
              soNguoiThuongNangKhongQL: prev.soNguoiThuongNangKhongQL,
              chiPhiYTe: prev.chiPhiYTe,
              chiPhiLuong: prev.chiPhiLuong,
              chiPhiBoiThuong: prev.chiPhiBoiThuong,
              tongChiPhi: prev.tongChiPhi,
              soNgayNghi: prev.soNgayNghi,
              thietHaiTaiSan: prev.thietHaiTaiSan,
            },
          ];
          return { ...prev, details: updatedDetails };
        });
      }
      setActiveTab("details");
    }
  };

  const handleSectionSelect = (sec: ReportSection) => {
    setShowSectionDropdown(false);

    if (isReadOnly) {
      setCurrentSection(sec);
      return;
    }

    const order: ReportSection[] = [
      "enterprise-info",
      "accident-stats",
      "accident-benefits",
      "general-view",
    ];
    const currIdx = order.indexOf(currentSection);
    const targetIdx = order.indexOf(sec);

    if (targetIdx > currIdx) {
      for (let i = currIdx; i < targetIdx; i++) {
        if (!validateSection(order[i])) {
          setCurrentSection(order[i]);
          return;
        }
      }
    }

    setCurrentSection(sec);
  };

  // Helper to construct FormData payload for saving/submitting report
  const buildFormData = () => {
    if (!formData) return null;
    const data = new FormData();
    data.append("reportPeriodId", String(formData.reportPeriodId));
    data.append(
      "totalEmployees",
      String(parseDotsToNumber(formData.laoDongCoSo)),
    );
    data.append(
      "femaleEmployees",
      String(parseDotsToNumber(formData.laoDongNu)),
    );
    data.append("totalPayroll", String(parseDotsToNumber(formData.quyLuong)));

    data.append("totalAccidents", String(parseDotsToNumber(formData.tongSoVu)));
    data.append(
      "fatalAccidents",
      String(parseDotsToNumber(formData.soVuCoNguoiChet)),
    );
    data.append(
      "accidentsWithTwoOrMoreVictims",
      String(parseDotsToNumber(formData.soVuHaiNguoiTroLen)),
    );
    data.append(
      "totalVictims",
      String(parseDotsToNumber(formData.tongSoNguoiBiNan)),
    );
    data.append(
      "femaleVictims",
      String(parseDotsToNumber(formData.soLaoDongNuBiNan)),
    );
    data.append(
      "deathVictims",
      String(parseDotsToNumber(formData.soNguoiChet)),
    );
    data.append(
      "severeInjuryVictims",
      String(parseDotsToNumber(formData.soNguoiThuongNang)),
    );
    data.append(
      "victimsNotUnderManagement",
      String(parseDotsToNumber(formData.soNguoiBiNanKhongQL)),
    );
    data.append(
      "femaleVictimsNotUnderManagement",
      String(parseDotsToNumber(formData.laoDongNuBiNanKhongQL)),
    );
    data.append(
      "deathVictimsNotUnderManagement",
      String(parseDotsToNumber(formData.soNguoiChetKhongQL)),
    );
    data.append(
      "severeInjuryVictimsNotUnderManagement",
      String(parseDotsToNumber(formData.soNguoiThuongNangKhongQL)),
    );

    data.append("medicalCost", String(parseDotsToNumber(formData.chiPhiYTe)));
    data.append(
      "salaryPaymentCost",
      String(parseDotsToNumber(formData.chiPhiLuong)),
    );
    data.append(
      "allowanceCost",
      String(parseDotsToNumber(formData.chiPhiBoiThuong)),
    );
    data.append("totalCost", String(parseDotsToNumber(formData.tongChiPhi)));
    data.append("totalDaysOff", String(parseDotsToNumber(formData.soNgayNghi)));
    data.append(
      "propertyDamage",
      String(parseDotsToNumber(formData.thietHaiTaiSan)),
    );

    const detailsPayload: any[] = [];

    // Dynamic blocks (Tab 2)
    if (formData.details && formData.details.length > 0) {
      formData.details.forEach((block, idx) => {
        detailsPayload.push({
          section: "ACCIDENT",
          orderNo: idx + 1,
          accidentCauseCatalogId: getCauseId(block.causeCategory),
          injuryFactorCatalogId: getFactorId(block.factorCategory),
          occupationCatalogId: getJobId(block.jobCategory),
          totalAccidents: parseDotsToNumber(block.tongSoVu),
          fatalAccidents: parseDotsToNumber(block.soVuCoNguoiChet),
          accidentsWithTwoOrMoreVictims: parseDotsToNumber(
            block.soVuHaiNguoiTroLen,
          ),
          totalVictims: parseDotsToNumber(block.tongSoNguoiBiNan),
          femaleVictims: parseDotsToNumber(block.soLaoDongNuBiNan),
          deathVictims: parseDotsToNumber(block.soNguoiChet),
          severeInjuryVictims: parseDotsToNumber(block.soNguoiThuongNang),
          victimsNotUnderManagement: parseDotsToNumber(
            block.soNguoiBiNanKhongQL,
          ),
          femaleVictimsNotUnderManagement: parseDotsToNumber(
            block.laoDongNuBiNanKhongQL,
          ),
          deathVictimsNotUnderManagement: parseDotsToNumber(
            block.soNguoiChetKhongQL,
          ),
          severeInjuryVictimsNotUnderManagement: parseDotsToNumber(
            block.soNguoiThuongNangKhongQL,
          ),
          medicalCost: parseDotsToNumber(block.chiPhiYTe),
          salaryPaymentCost: parseDotsToNumber(block.chiPhiLuong),
          allowanceCost: parseDotsToNumber(block.chiPhiBoiThuong),
          totalCost: parseDotsToNumber(block.tongChiPhi),
          daysOff: parseDotsToNumber(block.soNgayNghi),
          propertyDamage: parseDotsToNumber(block.thietHaiTaiSan),
        });
      });
    }

    // Section 3 totals (allowance)
    detailsPayload.push({
      section: "ARTICLE_39_ALLOWANCE",
      orderNo: 1,
      totalAccidents: parseDotsToNumber(formData.tc_tongSoVu),
      fatalAccidents: parseDotsToNumber(formData.tc_soVuCoNguoiChet),
      accidentsWithTwoOrMoreVictims: parseDotsToNumber(
        formData.tc_soVuHaiNguoiTroLen,
      ),
      totalVictims: parseDotsToNumber(formData.tc_tongSoNguoiBiNan),
      femaleVictims: parseDotsToNumber(formData.tc_soLaoDongNuBiNan),
      deathVictims: parseDotsToNumber(formData.tc_soNguoiChet),
      severeInjuryVictims: parseDotsToNumber(formData.tc_soNguoiThuongNang),
      victimsNotUnderManagement: parseDotsToNumber(
        formData.tc_soNguoiBiNanKhongQL,
      ),
      femaleVictimsNotUnderManagement: parseDotsToNumber(
        formData.tc_laoDongNuBiNanKhongQL,
      ),
      deathVictimsNotUnderManagement: parseDotsToNumber(
        formData.tc_soNguoiChetKhongQL,
      ),
      severeInjuryVictimsNotUnderManagement: parseDotsToNumber(
        formData.tc_soNguoiThuongNangKhongQL,
      ),
      medicalCost: parseDotsToNumber(formData.tc_chiPhiYTe),
      salaryPaymentCost: parseDotsToNumber(formData.tc_chiPhiLuong),
      allowanceCost: parseDotsToNumber(formData.tc_chiPhiBoiThuong),
      totalCost: parseDotsToNumber(formData.tc_tongChiPhi),
      daysOff: parseDotsToNumber(formData.tc_soNgayNghi),
      propertyDamage: parseDotsToNumber(formData.tc_thietHaiTaiSan),
    });

    data.append("details", JSON.stringify(detailsPayload));

    if (uploadedFile) {
      data.append("attachments", uploadedFile);
    }
    if (uploadedFileName) {
      data.append("attachmentNames", JSON.stringify([uploadedFileName]));
    }

    return data;
  };

  // Submit and update the state in backend
  const handleSave = async () => {
    if (!formData || isReadOnly) return;

    if (!formData.canEdit) {
      showToast(
        formData.unavailableReason ||
          "Kỳ báo cáo hiện không cho phép chỉnh sửa",
        "error",
      );
      return;
    }

    if (!validateSection("enterprise-info")) {
      setCurrentSection("enterprise-info");
      return;
    }
    if (!validateSection("accident-stats")) {
      setCurrentSection("accident-stats");
      return;
    }
    if (!validateSection("accident-benefits")) {
      setCurrentSection("accident-benefits");
      return;
    }

    setIsLoading(true);
    try {
      const data = buildFormData();
      if (!data) return;
      const res = await saveLaborAccidentReportDraft(data);
      if (res.success) {
        // Clear session cache
        sessionStorage.removeItem(`vna_report_form_${formData.id}`);
        showToast("Lưu nháp báo cáo tai nạn lao động thành công!", "success");
        setViewMode("list");
        await loadReportsAndPeriods();
      } else {
        showToast(res.message || "Lưu nháp thất bại", "error");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Lỗi khi lưu nháp báo cáo", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelConfirm = () => {
    setShowCancelConfirm(false);
    if (formData) {
      sessionStorage.removeItem(`vna_report_form_${formData.id}`);
    }
    setViewMode("list");
    showToast("Đã hủy bỏ khai báo báo cáo.", "success");
  };

  const saveAndGetPrintData = async (): Promise<any | null> => {
    if (!profile) {
      showToast(
        "Không tìm thấy thông tin doanh nghiệp. Vui lòng thử lại sau.",
        "error",
      );
      return null;
    }

    if (!formData || !formData.reportPeriodId) {
      showToast(
        "Vui lòng hoàn thiện và lưu thông tin kỳ báo cáo trước khi in.",
        "error",
      );
      return null;
    }

    if (isReadOnly) {
      return formData;
    }

    // Auto-save in edit/creation mode
    if (!validateSection("enterprise-info")) {
      setCurrentSection("enterprise-info");
      showToast(
        "Vui lòng hoàn thiện thông tin doanh nghiệp trước khi in báo cáo.",
        "error",
      );
      return null;
    }
    if (!validateSection("accident-stats")) {
      setCurrentSection("accident-stats");
      showToast(
        "Vui lòng hoàn thiện thông tin tai nạn lao động trước khi in báo cáo.",
        "error",
      );
      return null;
    }
    if (!validateSection("accident-benefits")) {
      setCurrentSection("accident-benefits");
      showToast(
        "Vui lòng hoàn thiện thông tin tai nạn lao động được trợ cấp trước khi in báo cáo.",
        "error",
      );
      return null;
    }

    setIsLoading(true);
    try {
      const data = buildFormData();
      if (!data) {
        showToast("Không thể tổng hợp dữ liệu báo cáo.", "error");
        return null;
      }
      const res = await saveLaborAccidentReportDraft(data);
      if (res.success && res.data) {
        const fullReport = mapApiReportToFrontend(res.data);
        setFormData(fullReport);
        sessionStorage.removeItem(`vna_report_form_${res.data.id}`);
        await loadReportsAndPeriods();
        return fullReport;
      } else {
        showToast(res.message || "Tự động lưu báo cáo thất bại.", "error");
        return null;
      }
    } catch (err) {
      console.error(err);
      showToast("Có lỗi xảy ra khi tự động lưu báo cáo.", "error");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintWord = async () => {
    const data = await saveAndGetPrintData();
    if (!data) return;

    setIsGeneratingWord(true);
    try {
      await exportReportDocx(data, profile);
      showToast("Tải báo cáo Word thành công!", "success");
    } catch (err) {
      console.error(err);
      showToast("Không thể xuất báo cáo Word.", "error");
    } finally {
      setIsGeneratingWord(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!formData || isReadOnly || submitInFlightRef.current) return;

    if (!formData.canSubmit) {
      showToast(
        formData.unavailableReason ||
          "Kỳ báo cáo hiện không cho phép gửi báo cáo",
        "error",
      );
      return;
    }

    submitInFlightRef.current = true;
    setIsLoading(true);
    try {
      const data = buildFormData();
      if (!data) return;

      let reportId = formData.id;
      if (reportId < 0) {
        const draftRes = await saveLaborAccidentReportDraft(data);
        if (draftRes.success && draftRes.data) {
          reportId = draftRes.data.id;
          data.delete("attachments");
        } else {
          showToast("Không thể khởi tạo báo cáo trước khi gửi", "error");
          setIsLoading(false);
          return;
        }
      }

      const res = await submitLaborAccidentReport(reportId, data);
      if (res.success) {
        sessionStorage.removeItem(`vna_report_form_${formData.id}`);
        showToast(
          "Báo cáo tình hình tai nạn lao động đã được gửi thành công!",
          "success",
        );
        setViewMode("list");
        await loadReportsAndPeriods();
      } else {
        showToast(res.message || "Gửi báo cáo thất bại", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Lỗi khi gửi báo cáo", "error");
    } finally {
      submitInFlightRef.current = false;
      setIsLoading(false);
    }
  };

  // Dynamic Aggregation sums for General View Table
  const sumBlocks = (field: keyof AccidentDetailBlock) => {
    if (!formData || !formData.details) return 0;
    return formData.details.reduce((sum, block) => {
      const val = block[field];
      return (
        sum +
        (field === "chiPhiYTe" ||
        field === "chiPhiLuong" ||
        field === "chiPhiBoiThuong" ||
        field === "thietHaiTaiSan"
          ? parseDotsToNumber(String(val))
          : Number(val || 0))
      );
    }, 0);
  };

  const sumBlocksByCause = (
    cause: string,
    field: keyof AccidentDetailBlock,
  ) => {
    if (!formData || !formData.details) return 0;
    return formData.details
      .filter((block) => block.causeCategory === cause)
      .reduce((sum, block) => {
        const val = block[field];
        return (
          sum +
          (field === "chiPhiYTe" ||
          field === "chiPhiLuong" ||
          field === "chiPhiBoiThuong" ||
          field === "thietHaiTaiSan"
            ? parseDotsToNumber(String(val))
            : Number(val || 0))
        );
      }, 0);
  };

  const sumBlocksByFactor = (
    factor: string,
    field: keyof AccidentDetailBlock,
  ) => {
    if (!formData || !formData.details) return 0;
    return formData.details
      .filter((block) => block.factorCategory === factor)
      .reduce((sum, block) => {
        const val = block[field];
        return (
          sum +
          (field === "chiPhiYTe" ||
          field === "chiPhiLuong" ||
          field === "chiPhiBoiThuong" ||
          field === "thietHaiTaiSan"
            ? parseDotsToNumber(String(val))
            : Number(val || 0))
        );
      }, 0);
  };

  const sumBlocksByJob = (job: string, field: keyof AccidentDetailBlock) => {
    if (!formData || !formData.details) return 0;
    return formData.details
      .filter((block) => block.jobCategory === job)
      .reduce((sum, block) => {
        const val = block[field];
        return (
          sum +
          (field === "chiPhiYTe" ||
          field === "chiPhiLuong" ||
          field === "chiPhiBoiThuong" ||
          field === "thietHaiTaiSan"
            ? parseDotsToNumber(String(val))
            : Number(val || 0))
        );
      }, 0);
  };

  const sumCol = (
    field1: keyof AccidentDetailBlock,
    field2: keyof ReportData,
  ) => {
    if (!formData) return 0;
    const val1 = sumBlocks(field1);
    const rawVal2 = formData[field2];
    const val2 =
      typeof rawVal2 === "string" || typeof rawVal2 === "number"
        ? parseDotsToNumber(String(rawVal2))
        : 0;
    return val1 + val2;
  };

  const isCauseRowEmpty = (title: string) => {
    const fields: (keyof AccidentDetailBlock)[] = [
      "tongSoVu",
      "soVuCoNguoiChet",
      "soVuHaiNguoiTroLen",
      "tongSoNguoiBiNan",
      "soNguoiBiNanKhongQL",
      "soLaoDongNuBiNan",
      "laoDongNuBiNanKhongQL",
      "soNguoiChet",
      "soNguoiChetKhongQL",
      "soNguoiThuongNang",
      "soNguoiThuongNangKhongQL",
    ];
    return fields.every((field) => sumBlocksByCause(title, field) === 0);
  };

  const isFactorRowEmpty = (factor: string) => {
    const fields: (keyof AccidentDetailBlock)[] = [
      "tongSoVu",
      "soVuCoNguoiChet",
      "soVuHaiNguoiTroLen",
      "tongSoNguoiBiNan",
      "soNguoiBiNanKhongQL",
      "soLaoDongNuBiNan",
      "laoDongNuBiNanKhongQL",
      "soNguoiChet",
      "soNguoiChetKhongQL",
      "soNguoiThuongNang",
      "soNguoiThuongNangKhongQL",
    ];
    return fields.every((field) => sumBlocksByFactor(factor, field) === 0);
  };

  const isJobRowEmpty = (job: string) => {
    const fields: (keyof AccidentDetailBlock)[] = [
      "tongSoVu",
      "soVuCoNguoiChet",
      "soVuHaiNguoiTroLen",
      "tongSoNguoiBiNan",
      "soNguoiBiNanKhongQL",
      "soLaoDongNuBiNan",
      "laoDongNuBiNanKhongQL",
      "soNguoiChet",
      "soNguoiChetKhongQL",
      "soNguoiThuongNang",
      "soNguoiThuongNangKhongQL",
    ];
    return fields.every((field) => sumBlocksByJob(job, field) === 0);
  };

  // Helper row renderer for general cause view
  const renderCauseRow = (title: string, code: string) => {
    if (isCauseRowEmpty(title)) return null;

    return (
      <tr
        key={code}
        className="border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300"
      >
        <td className="p-3 text-left pl-8 border-r border-zinc-200 dark:border-zinc-800">
          {title}
        </td>
        <td className="p-3 text-center bg-zinc-50/50 dark:bg-zinc-900/10 font-bold border-r border-zinc-200 dark:border-zinc-800">
          {code}
        </td>
        <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
          {sumBlocksByCause(title, "tongSoVu")}
        </td>
        <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
          {sumBlocksByCause(title, "soVuCoNguoiChet")}
        </td>
        <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
          {sumBlocksByCause(title, "soVuHaiNguoiTroLen")}
        </td>
        <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
          {sumBlocksByCause(title, "tongSoNguoiBiNan")}
        </td>
        <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
          {sumBlocksByCause(title, "soNguoiBiNanKhongQL")}
        </td>
        <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
          {sumBlocksByCause(title, "soLaoDongNuBiNan")}
        </td>
        <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
          {sumBlocksByCause(title, "laoDongNuBiNanKhongQL")}
        </td>
        <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
          {sumBlocksByCause(title, "soNguoiChet")}
        </td>
        <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
          {sumBlocksByCause(title, "soNguoiChetKhongQL")}
        </td>
        <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
          {sumBlocksByCause(title, "soNguoiThuongNang")}
        </td>
        <td className="p-3 text-center">
          {sumBlocksByCause(title, "soNguoiThuongNangKhongQL")}
        </td>
      </tr>
    );
  };

  // Render Job codes
  const getJobCode = (job: string) => {
    return String(
      jobCatalog.find((item) => item.name === job)?.code ??
        jobCategories.indexOf(job) + 1,
    );
  };

  // Render Factor codes
  const getFactorCode = (factor: string) => {
    return String(
      factorCatalog.find((item) => item.name === factor)?.code ??
        factorCategories.indexOf(factor) + 1,
    );
  };

  const getCauseCode = (cause: string) => {
    return String(
      causeCatalog.find((item) => item.name === cause)?.code ??
        causeCategories.indexOf(cause) + 1,
    );
  };

  // Dropdown list label mapping
  const getSectionLabel = (sec: ReportSection) => {
    switch (sec) {
      case "enterprise-info":
        return "Thông tin doanh nghiệp";
      case "accident-stats":
        return "1. Tai nạn lao động";
      case "accident-benefits":
        return "2. Tai nạn lao động được hưởng trợ cấp theo quy định tại Khoản 2 Điều 39 Luật ATVSLĐ";
      case "general-view":
        return "Xem tổng quan báo cáo tai nạn lao động";
    }
  };

  const hasVisibleCauseA = formData
    ? causeCategories.slice(0, 6).some((title) => !isCauseRowEmpty(title))
    : false;
  const hasVisibleCauseB = formData
    ? causeCategories.slice(6).some((title) => !isCauseRowEmpty(title))
    : false;
  const hasVisibleFactors = formData
    ? factorCategories.some((factor) => !isFactorRowEmpty(factor))
    : false;
  const hasVisibleJobs = formData
    ? jobCategories.some((job) => !isJobRowEmpty(job))
    : false;

  const isSection2Empty = formData
    ? [
        Number(formData.tc_tongSoVu || 0),
        Number(formData.tc_soVuCoNguoiChet || 0),
        Number(formData.tc_soVuHaiNguoiTroLen || 0),
        Number(formData.tc_tongSoNguoiBiNan || 0),
        Number(formData.tc_soNguoiBiNanKhongQL || 0),
        Number(formData.tc_soLaoDongNuBiNan || 0),
        Number(formData.tc_laoDongNuBiNanKhongQL || 0),
        Number(formData.tc_soNguoiChet || 0),
        Number(formData.tc_soNguoiChetKhongQL || 0),
        Number(formData.tc_soNguoiThuongNang || 0),
        Number(formData.tc_soNguoiThuongNangKhongQL || 0),
      ].every((val) => val === 0)
    : true;

  if (viewMode === "list") {
    const filteredReports = reports.filter(
      (r) => r.year === selectedYearFilter,
    );

    return (
      <div className="flex flex-col gap-6 h-full select-none">
        {/* Banner with year dropdown */}
        <div className="flex items-center justify-between border-t-4 border-[#0b2868] bg-white dark:bg-zinc-950 rounded-2xl p-4 shadow-sm border border-zinc-200/60 dark:border-zinc-800/80">
          <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">
            Báo cáo định kỳ Tai nạn lao động
          </h2>
          <div className="relative">
            <button
              onClick={() => setShowYearDropdown(!showYearDropdown)}
              className="flex items-center gap-2 px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 font-bold text-sm transition-colors cursor-pointer"
            >
              <span>{selectedYearFilter}</span>
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            </button>
            {showYearDropdown && (
              <div className="absolute right-0 mt-1.5 w-28 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                {availableYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => {
                      setSelectedYearFilter(year);
                      setShowYearDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-all hover:bg-zinc-55 dark:hover:bg-zinc-900 font-semibold ${
                      selectedYearFilter === year
                        ? "text-[#0b2868] bg-blue-50/40 dark:bg-blue-950/20 dark:text-blue-400"
                        : "text-zinc-650 dark:text-zinc-400"
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[300px]">
          <div className="flex-1 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-zinc-500 dark:text-zinc-400 text-xs font-bold bg-zinc-50/50 dark:bg-zinc-900/10">
                  <th className="p-4 w-28 text-center">Thao tác</th>
                  <th className="p-4">Tên doanh nghiệp</th>
                  <th className="p-4 w-44">Mã số thuế</th>
                  <th className="p-4 w-44">Kỳ báo cáo</th>
                  <th className="p-4 w-40 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-12 text-center text-zinc-400 dark:text-zinc-500 font-semibold text-sm"
                    >
                      Không tìm thấy báo cáo nào cho năm {selectedYearFilter}.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((rep) => (
                    <tr
                      key={rep.id}
                      className="border-b border-zinc-200/50 dark:border-zinc-800/80 hover:bg-zinc-50/40 dark:hover:bg-zinc-900/30 text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
                    >
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-3.5">
                          <button
                            onClick={() => handleEditClick(rep, true)}
                            title="Xem chi tiết"
                            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer group"
                          >
                            <Eye className="h-[18px] w-[18px] text-zinc-400 group-hover:text-green-600 transition-colors" />
                          </button>
                          {rep.canEdit && (
                            <button
                              onClick={() => handleEditClick(rep, false)}
                              title={
                                rep.status === "Từ chối phê duyệt"
                                  ? "Cập nhật / Nộp lại"
                                  : "Chỉnh sửa khai báo"
                              }
                              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer group"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] text-zinc-400 group-hover:text-blue-600 transition-colors">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-zinc-900 dark:text-zinc-100">
                        {rep.enterpriseName}
                      </td>
                      <td className="p-4 font-mono text-xs text-zinc-655 dark:text-zinc-345">
                        {rep.taxCode}
                      </td>
                      <td className="p-4 text-zinc-800 dark:text-zinc-200">
                        {rep.period}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          title={rep.unavailableReason || undefined}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-50 dark:bg-zinc-900 select-none whitespace-nowrap"
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              rep.status === "Đang báo cáo"
                                ? "bg-zinc-400"
                                : rep.status === "Đang chờ duyệt"
                                  ? "bg-amber-500 animate-pulse"
                                  : rep.status === "Đã tiếp nhận"
                                    ? "bg-blue-600"
                                    : rep.status === "Từ chối phê duyệt"
                                      ? "bg-red-500 animate-pulse"
                                      : "bg-zinc-400"
                            }`}
                          />
                          <span
                            className={
                              rep.status === "Đang báo cáo"
                                ? "text-zinc-550"
                                : rep.status === "Đang chờ duyệt"
                                  ? "text-amber-600 dark:text-amber-400"
                                  : rep.status === "Đã tiếp nhận"
                                    ? "text-blue-600 dark:text-blue-400"
                                    : rep.status === "Từ chối phê duyệt"
                                      ? "text-red-500 dark:text-red-400"
                                      : "text-zinc-550"
                            }
                          >
                            {rep.status === "Đang báo cáo" &&
                            rep.windowStatus === "UPCOMING"
                              ? "Chưa mở"
                              : rep.status === "Đang báo cáo" &&
                                  rep.windowStatus === "CLOSED"
                                ? "Đã đóng"
                                : rep.status === "Đang báo cáo" &&
                                    rep.windowStatus === "INACTIVE"
                                  ? "Tạm ngừng"
                                  : rep.status}
                          </span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-semibold text-zinc-500">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span>Hiển thị</span>
                <select className="px-1.5 py-1 border border-zinc-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300">
                  <option value={10}>10</option>
                </select>
              </div>
              <span>
                1 - {filteredReports.length} of {filteredReports.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  className="p-1 text-zinc-300 cursor-not-allowed"
                  disabled
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  className="p-1 text-zinc-300 cursor-not-allowed"
                  disabled
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
        {isLoading && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 backdrop-blur-[2px]">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Đang tải dữ liệu, vui lòng đợi...
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Declaration View Screen
  return (
    <div className="flex flex-col gap-6 h-full pb-8 select-none">
      {/* Top Banner Control Panel */}
      <div className="flex items-center justify-between border-t-4 border-[#0b2868] bg-white dark:bg-zinc-950 rounded-2xl p-4 shadow-sm border border-zinc-200/60 dark:border-zinc-800/80">
        <h2 className="text-md font-bold text-zinc-850 dark:text-zinc-100 flex items-center gap-2">
          <span>Báo cáo định kỳ Tai nạn lao động</span>
        </h2>
        <div className="flex items-center gap-3.5">
          {isReadOnly ? (
            <>
              <button
                disabled={isGeneratingWord}
                onClick={handlePrintWord}
                className="flex items-center gap-1.5 px-4 py-2 border border-blue-600 text-blue-600 bg-white hover:bg-blue-50/60 rounded-xl font-bold text-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isGeneratingWord ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
                <span>
                  {isGeneratingWord ? "Đang tạo Word..." : "In báo cáo"}
                </span>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className="flex items-center gap-1.5 px-6 py-2 bg-blue-600 hover:bg-blue-750 text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                <span>Đóng</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-zinc-550 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-bold text-sm transition-all cursor-pointer"
              >
                Huỷ bỏ
              </button>

              {/* Action buttons inside General View */}
              {currentSection === "general-view" ? (
                <>
                  <button
                    disabled={isGeneratingWord}
                    onClick={handlePrintWord}
                    className="flex items-center gap-1.5 px-4 py-2 border border-blue-600 text-blue-600 bg-white hover:bg-blue-50/60 rounded-xl font-bold text-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isGeneratingWord ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Printer className="w-4 h-4" />
                    )}
                    <span>
                      {isGeneratingWord ? "Đang tạo Word..." : "In báo cáo"}
                    </span>
                  </button>
                  <button
                    disabled={
                      isLoading || !uploadedFileName || !formData?.canSubmit
                    }
                    onClick={handleSubmitReport}
                    title={
                      !formData?.canSubmit
                        ? formData?.unavailableReason || undefined
                        : undefined
                    }
                    className={`flex items-center gap-1.5 px-6 py-2 rounded-xl font-bold text-sm transition-all ${
                      !isLoading && uploadedFileName && formData?.canSubmit
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md active:scale-98 cursor-pointer"
                        : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-60"
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>{isLoading ? "Đang gửi..." : "Gửi báo cáo"}</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleContinue}
                  className="flex items-center gap-1.5 px-5 py-2 border border-[#0b2868] bg-white hover:bg-blue-50/20 text-[#0b2868] rounded-xl font-bold text-sm transition-all cursor-pointer"
                >
                  <span>Tiếp tục</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              {currentSection !== "general-view" && (
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-6 py-2 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-500/10 active:scale-98 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Select Report Section Dropdown (Hover Color: System Blue) */}
      {!isReadOnly && (
        <div className="relative w-full">
          <div className="relative w-full border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950 transition-all">
            <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold text-zinc-400 dark:text-zinc-500">
              Chọn mục báo cáo
            </label>
            <button
              onClick={() => setShowSectionDropdown(!showSectionDropdown)}
              className="w-full flex items-center justify-between bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-bold pt-2.5 pb-0.5 text-left cursor-pointer"
            >
              <span>{getSectionLabel(currentSection)}</span>
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            </button>
          </div>

          {showSectionDropdown && (
            <div className="absolute left-0 mt-2 w-full bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-xl z-50 p-1.5 flex flex-col gap-1 animate-in fade-in slide-in-from-top-1.5 duration-150">
              {(
                [
                  "enterprise-info",
                  "accident-stats",
                  "accident-benefits",
                  "general-view",
                ] as ReportSection[]
              ).map((sec) => (
                <button
                  key={sec}
                  onClick={() => handleSectionSelect(sec)}
                  className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-all rounded-xl cursor-pointer ${
                    currentSection === sec
                      ? "text-blue-600 bg-blue-50/60 dark:bg-blue-950/40 dark:text-blue-400"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-700 dark:hover:text-white"
                  }`}
                >
                  {getSectionLabel(sec)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {formData &&
        formData.status === "Từ chối phê duyệt" &&
        formData.rejectReason && (
          <div className="bg-red-50 dark:bg-red-955/10 border border-red-200 dark:border-red-900 rounded-2xl p-4 flex flex-col gap-1.5 select-text animate-in fade-in slide-in-from-top-1 duration-200 no-print">
            <span className="text-xs font-bold text-red-650 dark:text-red-400 uppercase tracking-wider">
              Báo cáo bị Sở Lao động - Thương binh và Xã hội từ chối
            </span>
            <span className="text-sm font-bold text-red-900 dark:text-red-300 leading-normal">
              Lý do từ chối: {formData.rejectReason}
            </span>
          </div>
        )}

      {/* RENDER DECLARATION PAGE PANELS */}
      {formData && (
        <div
          className={`flex-1 bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl shadow-sm ${
            isReadOnly
              ? "p-6"
              : `flex min-h-0 max-h-[60vh] flex-col overflow-hidden ${
                  formData.status === "Từ chối phê duyệt" &&
                  formData.rejectReason
                    ? "lg:max-h-[calc(100vh-400px)]"
                    : "lg:max-h-[calc(100vh-300px)]"
                }`
          }`}
        >
          <div
            className={
              isReadOnly ? "" : "flex-1 min-h-0 overflow-y-auto p-6 pb-4"
            }
          >
            {/* ========================================== */}
            {/* SECTION 1: THÔNG TIN DOANH NGHIỆP */}
            {/* ========================================== */}
            {currentSection === "enterprise-info" && (
              <div className="flex flex-col gap-6">
                <div className="border-b border-zinc-150/70 dark:border-zinc-800 pb-3 flex flex-col gap-1.5">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    1. Thông tin công ty
                  </h3>
                  <p className="text-xs font-bold text-red-500 leading-normal">
                    *** Lưu ý: nhập tổng quỹ lương 6 tháng khi khai báo TNLĐ 6
                    tháng hoặc tổng quỹ lương 12 tháng khi khai báo TNLĐ cả năm
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
                  {/* Tên công ty (disabled) */}
                  <div className="relative border border-zinc-250 dark:border-zinc-800 rounded-xl px-4 py-2 flex flex-col justify-center bg-zinc-50 dark:bg-zinc-900/40 opacity-70">
                    <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold text-zinc-400 dark:text-zinc-500">
                      Tên công ty
                    </label>
                    <input
                      type="text"
                      readOnly
                      className="w-full bg-transparent border-0 outline-none text-zinc-650 dark:text-zinc-355 text-sm font-semibold pt-2 pb-0.5 cursor-not-allowed"
                      value={formData.enterpriseName}
                    />
                  </div>

                  {/* Loại hình công ty (disabled) */}
                  <div className="relative border border-zinc-250 dark:border-zinc-800 rounded-xl px-4 py-2 flex flex-col justify-center bg-zinc-50 dark:bg-zinc-900/40 opacity-70">
                    <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold text-zinc-400 dark:text-zinc-500">
                      Loại hình công ty
                    </label>
                    <input
                      type="text"
                      readOnly
                      className="w-full bg-transparent border-0 outline-none text-zinc-650 dark:text-zinc-355 text-sm font-semibold pt-2 pb-0.5 cursor-not-allowed"
                      value={formData.businessType}
                    />
                  </div>

                  {/* Ngành nghề kinh doanh (disabled) */}
                  <div className="relative border border-zinc-250 dark:border-zinc-800 rounded-xl px-4 py-2 flex flex-col justify-center bg-zinc-50 dark:bg-zinc-900/40 opacity-70">
                    <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold text-zinc-400 dark:text-zinc-500">
                      Ngành nghề kinh doanh
                    </label>
                    <input
                      type="text"
                      readOnly
                      className="w-full bg-transparent border-0 outline-none text-zinc-655 dark:text-zinc-355 text-sm font-semibold pt-2 pb-0.5 cursor-not-allowed"
                      value={formData.industry}
                    />
                  </div>

                  {/* Tổng số lao động của cơ sở */}
                  <div
                    className={`relative border rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-955 transition-all ${
                      errors.laoDongCoSo
                        ? "border-red-500 ring-1 ring-red-500"
                        : "border-zinc-200 dark:border-zinc-850"
                    } ${isReadOnly ? "opacity-70 bg-zinc-50 dark:bg-zinc-900/40" : ""}`}
                  >
                    <label
                      className={`absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold ${
                        errors.laoDongCoSo
                          ? "text-red-500"
                          : "text-zinc-400 dark:text-zinc-500"
                      }`}
                    >
                      Tổng số lao động của cơ sở{" "}
                      {!isReadOnly && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      name="laoDongCoSo"
                      value={formData.laoDongCoSo}
                      onChange={handleCountChange}
                      disabled={isReadOnly}
                      className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold pt-2 pb-0.5 disabled:cursor-not-allowed"
                      placeholder="0"
                    />
                    {errors.laoDongCoSo && (
                      <span className="text-[10px] text-red-500 mt-1 font-semibold">
                        {errors.laoDongCoSo}
                      </span>
                    )}
                  </div>

                  {/* Tổng số lao động nữ */}
                  <div
                    className={`relative border rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-955 transition-all ${
                      errors.laoDongNu
                        ? "border-red-500 ring-1 ring-red-500"
                        : "border-zinc-200 dark:border-zinc-850"
                    } ${isReadOnly ? "opacity-70 bg-zinc-50 dark:bg-zinc-900/40" : ""}`}
                  >
                    <label
                      className={`absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold ${
                        errors.laoDongNu
                          ? "text-red-500"
                          : "text-zinc-400 dark:text-zinc-500"
                      }`}
                    >
                      Tổng số lao động nữ{" "}
                      {!isReadOnly && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      name="laoDongNu"
                      value={formData.laoDongNu}
                      onChange={handleCountChange}
                      disabled={isReadOnly}
                      className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold pt-2 pb-0.5 disabled:cursor-not-allowed"
                      placeholder="0"
                    />
                    {errors.laoDongNu && (
                      <span className="text-[10px] text-red-500 mt-1 font-semibold">
                        {errors.laoDongNu}
                      </span>
                    )}
                  </div>

                  {/* Tổng quỹ lương */}
                  <div
                    className={`relative border rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-955 transition-all ${
                      errors.quyLuong
                        ? "border-red-500 ring-1 ring-red-500"
                        : "border-zinc-200 dark:border-zinc-850"
                    } ${isReadOnly ? "opacity-70 bg-zinc-50 dark:bg-zinc-900/40" : ""}`}
                  >
                    <label
                      className={`absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold ${
                        errors.quyLuong
                          ? "text-red-500"
                          : "text-zinc-400 dark:text-zinc-500"
                      }`}
                    >
                      Tổng quỹ lương{" "}
                      {!isReadOnly && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative flex items-center justify-between w-full pt-2 pb-0.5">
                      <input
                        type="text"
                        name="quyLuong"
                        value={formData.quyLuong}
                        onChange={handleTextChange}
                        disabled={isReadOnly}
                        className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold disabled:cursor-not-allowed pr-14"
                        placeholder="0.0"
                      />
                      <span className="text-xs text-zinc-400 dark:text-zinc-500 select-none pr-1 pointer-events-none">
                        (1.000đ)
                      </span>
                    </div>
                    {errors.quyLuong && (
                      <span className="text-[10px] text-red-500 mt-1 font-semibold">
                        {errors.quyLuong}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* SECTION 2: 1. TAI NẠN LAO ĐỘNG (TAB INDICATORS) */}
            {/* ========================================== */}
            {currentSection === "accident-stats" && (
              <div className="flex flex-col gap-5">
                <div className="border-b border-zinc-200 dark:border-zinc-850 pb-0 flex flex-col gap-1.5">
                  <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 select-none leading-normal">
                    **** Doanh nghiệp xảy ra tai nạn lao động vui lòng nhập theo
                    từng bước
                  </p>

                  {/* Active Tab Indicators: Standard blue/gray highlights with borders */}
                  <div className="flex items-center gap-2 mt-3 -mb-px">
                    <button
                      type="button"
                      onClick={() => setActiveTab("totals")}
                      className={`px-5 py-3 text-xs font-bold relative transition-all cursor-pointer rounded-t-xl border-t border-x ${
                        activeTab === "totals"
                          ? "text-white bg-blue-600 border-blue-600 dark:bg-blue-700 dark:border-blue-700"
                          : "text-zinc-500 bg-zinc-50 hover:bg-zinc-100 hover:text-zinc-800 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-850"
                      }`}
                    >
                      (1) Tổng số vụ tai nạn lao động
                    </button>
                    <button
                      type="button"
                      onClick={switchToDetailsTab}
                      className={`px-5 py-3 text-xs font-bold relative transition-all cursor-pointer rounded-t-xl border-t border-x ${
                        activeTab === "details"
                          ? "text-white bg-blue-600 border-blue-600 dark:bg-blue-700 dark:border-blue-700"
                          : "text-zinc-500 bg-zinc-50 hover:bg-zinc-100 hover:text-zinc-800 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-850"
                      }`}
                    >
                      (2) Chi tiết các vụ tai nạn lao động
                    </button>
                  </div>
                </div>

                {/* Info banner showing the current active sub-section */}
                <div className="flex items-center gap-2 px-4 py-3 bg-blue-50/30 dark:bg-blue-950/15 border border-blue-100 dark:border-blue-900/50 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-400 select-none animate-in fade-in duration-200">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                  </span>
                  <span>
                    Bạn đang ở mục:{" "}
                    {activeTab === "totals"
                      ? "(1) Tổng số vụ tai nạn lao động"
                      : "(2) Chi tiết các vụ tai nạn lao động"}
                  </span>
                </div>

                {/* TAB 1: TOTAL COUNTS & DAMAGES */}
                {activeTab === "totals" && (
                  <div className="flex flex-col gap-6 mt-1">
                    {/* Nhóm 1: Tổng số vụ & số nạn nhân */}
                    <div className="flex flex-col gap-4">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        1. Tổng số vụ tai nạn lao động & số nạn nhân tai nạn lao
                        động
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[
                          { label: "Tổng số vụ", name: "tongSoVu" },
                          {
                            label: "Tổng số vụ có người chết",
                            name: "soVuCoNguoiChet",
                          },
                          {
                            label: "Tổng số vụ có từ 2 người bị nạn trở lên",
                            name: "soVuHaiNguoiTroLen",
                          },
                          {
                            label: "Tổng số người bị nạn",
                            name: "tongSoNguoiBiNan",
                          },
                          {
                            label: "Tổng số lao động nữ bị nạn",
                            name: "soLaoDongNuBiNan",
                          },
                          {
                            label: "Tổng số người bị chết",
                            name: "soNguoiChet",
                          },
                          {
                            label: "Tổng số người bị thương nặng",
                            name: "soNguoiThuongNang",
                          },
                          {
                            label: "Số người bị nạn không QL",
                            name: "soNguoiBiNanKhongQL",
                          },
                          {
                            label: "Lao động nữ bị nạn không QL",
                            name: "laoDongNuBiNanKhongQL",
                          },
                          {
                            label: "Số người chết không QL",
                            name: "soNguoiChetKhongQL",
                          },
                          {
                            label: "Người bị thương nặng không QL",
                            name: "soNguoiThuongNangKhongQL",
                          },
                        ].map((field) => (
                          <div
                            key={field.name}
                            className={`relative border rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950 transition-all ${
                              errors[field.name]
                                ? "border-red-500 ring-1 ring-red-500"
                                : "border-zinc-200 dark:border-zinc-850"
                            } ${isReadOnly ? "opacity-70 bg-zinc-50 dark:bg-zinc-900/40" : ""}`}
                          >
                            <label
                              className={`absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold ${
                                errors[field.name]
                                  ? "text-red-500"
                                  : "text-zinc-400 dark:text-zinc-500"
                              }`}
                            >
                              {field.label}{" "}
                              {!isReadOnly && (
                                <span className="text-red-500">*</span>
                              )}
                            </label>
                            <input
                              type="text"
                              name={field.name}
                              value={
                                formData[
                                  field.name as keyof ReportData
                                ] as string
                              }
                              onChange={handleCountChange}
                              disabled={isReadOnly}
                              className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold pt-2 pb-0.5 disabled:cursor-not-allowed"
                              placeholder="0"
                            />
                            {errors[field.name] && (
                              <span className="text-[10px] text-red-500 mt-1 font-semibold">
                                {errors[field.name]}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Nhóm 2: Thiệt hại */}
                    <div className="flex flex-col gap-4 mt-2">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        2. Thiệt hại do tai nạn lao động
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[
                          {
                            label: "Chi phí y tế",
                            name: "chiPhiYTe",
                            isMoney: true,
                          },
                          {
                            label: "Chi phí trả lương trong thời gian điều trị",
                            name: "chiPhiLuong",
                            isMoney: true,
                          },
                          {
                            label: "Chi phí bồi thường trợ cấp",
                            name: "chiPhiBoiThuong",
                            isMoney: true,
                          },
                          {
                            label: "Tổng số tiền chi phí",
                            name: "tongChiPhi",
                            isMoney: true,
                            isReadOnlyOverride: true,
                          },
                          {
                            label: "Tổng số ngày nghỉ vì TNLĐ",
                            name: "soNgayNghi",
                          },
                          {
                            label: "Thiệt hại tài sản",
                            name: "thietHaiTaiSan",
                            isMoney: true,
                            isOptional: true,
                          },
                        ].map((field) => {
                          const showAsterisk = !isReadOnly && !field.isOptional;
                          const inputReadOnly =
                            isReadOnly || field.isReadOnlyOverride;

                          return (
                            <div
                              key={field.name}
                              className={`relative border rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950 transition-all ${
                                errors[field.name]
                                  ? "border-red-500 ring-1 ring-red-500"
                                  : "border-zinc-200 dark:border-zinc-850"
                              } ${inputReadOnly ? "opacity-70 bg-zinc-50 dark:bg-zinc-900/40" : ""}`}
                            >
                              <label
                                className={`absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold ${
                                  errors[field.name]
                                    ? "text-red-500"
                                    : "text-zinc-400 dark:text-zinc-500"
                                }`}
                              >
                                {field.label}{" "}
                                {showAsterisk && (
                                  <span className="text-red-500">*</span>
                                )}
                              </label>
                              <div className="relative flex items-center justify-between w-full pt-2 pb-0.5">
                                <input
                                  type="text"
                                  name={field.name}
                                  value={
                                    formData[
                                      field.name as keyof ReportData
                                    ] as string
                                  }
                                  onChange={
                                    field.isMoney
                                      ? handleMoneyChange
                                      : handleCountChange
                                  }
                                  disabled={inputReadOnly}
                                  className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold disabled:cursor-not-allowed pr-14"
                                  placeholder="0"
                                />
                                {field.isMoney && (
                                  <span className="text-xs text-zinc-400 dark:text-zinc-500 select-none pr-1 pointer-events-none">
                                    (1.000đ)
                                  </span>
                                )}
                              </div>
                              {errors[field.name] && (
                                <span className="text-[10px] text-red-500 mt-1 font-semibold">
                                  {errors[field.name]}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: DYNAMIC ACCIDENT BLOCKS */}
                {activeTab === "details" && (
                  <div className="flex flex-col gap-6 mt-1 select-none animate-in fade-in duration-200">
                    {Number(formData.tongSoVu || 0) === 0 ? (
                      <div className="border border-zinc-200 dark:border-zinc-850 rounded-2xl p-12 text-center bg-zinc-50/30 dark:bg-zinc-900/10">
                        <p className="text-zinc-450 dark:text-zinc-550 font-bold text-sm">
                          Không có dữ liệu chi tiết tai nạn lao động do Tổng số
                          vụ = 0
                        </p>
                      </div>
                    ) : (
                      (formData.details || []).map((block, idx) => {
                        const blockId = block.id;
                        const isExpanded = expandedBlocks[blockId] ?? true;
                        const hasBlockErrors = !!blockErrors[idx];

                        return (
                          <div
                            key={blockId}
                            className={`border rounded-2xl bg-white dark:bg-zinc-950 shadow-sm overflow-hidden transition-all ${
                              hasBlockErrors
                                ? "border-red-400"
                                : "border-zinc-200 dark:border-zinc-800"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => toggleBlock(blockId)}
                              className="w-full flex items-center justify-between px-5 py-4 bg-zinc-50/50 dark:bg-zinc-900/30 text-left border-b border-zinc-150 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900"
                            >
                              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                <ChevronDown
                                  className={`w-4 h-4 text-zinc-450 transition-transform ${isExpanded ? "" : "-rotate-90"}`}
                                />
                                <span>Chi tiết vụ tai nạn số {blockId}</span>
                              </span>
                              {hasBlockErrors && (
                                <span className="text-xs font-bold text-red-500 flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>Chưa hoàn thành</span>
                                </span>
                              )}
                            </button>

                            {isExpanded && (
                              <div className="p-6 flex flex-col gap-6">
                                {/* 3 Classification Dropdowns */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {/* Dropdown 1: Nguyên nhân */}
                                  <div className={`relative border rounded-xl px-4 py-2 flex flex-col justify-center bg-white dark:bg-zinc-950 transition-all ${
                                    blockErrors[idx]?.causeCategory
                                      ? "border-red-500 ring-1 ring-red-500"
                                      : "border-zinc-200 dark:border-zinc-800"
                                  }`}>
                                    <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-955 px-1.5 text-[11px] font-bold text-zinc-455 dark:text-zinc-550">
                                      1. Phân theo nguyên nhân xảy ra TNLĐ <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                      disabled={isReadOnly}
                                      value={block.causeCategory}
                                      onChange={(e) =>
                                        handleBlockTextChange(
                                          idx,
                                          "causeCategory",
                                          e.target.value,
                                        )
                                      }
                                      className="w-full bg-transparent border-0 outline-none text-zinc-850 dark:text-zinc-150 text-sm font-bold pt-2.5 pb-0.5 cursor-pointer appearance-none disabled:cursor-not-allowed"
                                    >
                                      <option value="">-- Chọn nguyên nhân xảy ra TNLĐ --</option>
                                      {block.causeCategory &&
                                        !causeCategories.includes(
                                          block.causeCategory,
                                        ) && (
                                          <option
                                            value={block.causeCategory}
                                            disabled
                                          >
                                            {block.causeCategory} (không còn sử
                                            dụng)
                                          </option>
                                        )}
                                      {causeCategories.map((cat) => (
                                        <option key={cat} value={cat}>
                                          {cat}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none mt-1" />
                                    {blockErrors[idx]?.causeCategory && (
                                      <span className="text-[10px] text-red-500 mt-0.5 font-semibold">
                                        {blockErrors[idx].causeCategory}
                                      </span>
                                    )}
                                  </div>

                                  {/* Dropdown 2: Yếu tố gây chấn thương */}
                                  <div className={`relative border rounded-xl px-4 py-2 flex flex-col justify-center bg-white dark:bg-zinc-950 transition-all ${
                                    blockErrors[idx]?.factorCategory
                                      ? "border-red-500 ring-1 ring-red-500"
                                      : "border-zinc-200 dark:border-zinc-800"
                                  }`}>
                                    <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-955 px-1.5 text-[11px] font-bold text-zinc-455 dark:text-zinc-550">
                                      2. Phân theo yếu tố gây chấn thương <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                      disabled={isReadOnly}
                                      value={block.factorCategory}
                                      onChange={(e) =>
                                        handleBlockTextChange(
                                          idx,
                                          "factorCategory",
                                          e.target.value,
                                        )
                                      }
                                      className="w-full bg-transparent border-0 outline-none text-zinc-855 dark:text-zinc-150 text-sm font-bold pt-2.5 pb-0.5 cursor-pointer appearance-none disabled:cursor-not-allowed"
                                    >
                                      <option value="">-- Chọn yếu tố gây chấn thương --</option>
                                      {block.factorCategory &&
                                        !factorCategories.includes(
                                          block.factorCategory,
                                        ) && (
                                          <option
                                            value={block.factorCategory}
                                            disabled
                                          >
                                            {block.factorCategory} (không còn sử
                                            dụng)
                                          </option>
                                        )}
                                      {factorCategories.map((cat) => (
                                        <option key={cat} value={cat}>
                                          {cat}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none mt-1" />
                                    {blockErrors[idx]?.factorCategory && (
                                      <span className="text-[10px] text-red-500 mt-0.5 font-semibold">
                                        {blockErrors[idx].factorCategory}
                                      </span>
                                    )}
                                  </div>

                                  {/* Dropdown 3: Nghề nghiệp */}
                                  <div className={`relative border rounded-xl px-4 py-2 flex flex-col justify-center bg-white dark:bg-zinc-950 md:col-span-2 transition-all ${
                                    blockErrors[idx]?.jobCategory
                                      ? "border-red-500 ring-1 ring-red-500"
                                      : "border-zinc-200 dark:border-zinc-800"
                                  }`}>
                                    <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-955 px-1.5 text-[11px] font-bold text-zinc-455 dark:text-zinc-550">
                                      3. Phân theo nghề nghiệp <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                      disabled={isReadOnly}
                                      value={block.jobCategory}
                                      onChange={(e) =>
                                        handleBlockTextChange(
                                          idx,
                                          "jobCategory",
                                          e.target.value,
                                        )
                                      }
                                      className="w-full bg-transparent border-0 outline-none text-zinc-855 dark:text-zinc-150 text-sm font-bold pt-2.5 pb-0.5 cursor-pointer appearance-none disabled:cursor-not-allowed"
                                    >
                                      <option value="">-- Chọn nghề nghiệp --</option>
                                      {block.jobCategory &&
                                        !jobCategories.includes(
                                          block.jobCategory,
                                        ) && (
                                          <option
                                            value={block.jobCategory}
                                            disabled
                                          >
                                            {block.jobCategory} (không còn sử
                                            dụng)
                                          </option>
                                        )}
                                      {jobCategories.map((cat) => (
                                        <option key={cat} value={cat}>
                                          {cat}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none mt-1" />
                                    {blockErrors[idx]?.jobCategory && (
                                      <span className="text-[10px] text-red-500 mt-0.5 font-semibold">
                                        {blockErrors[idx].jobCategory}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Group 4: Chi tiết */}
                                <div className="flex flex-col gap-4 border-t border-zinc-150 dark:border-zinc-800 pt-5">
                                  <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-150">
                                    4. Chi tiết vụ tai nạn số {blockId}
                                  </h5>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {[
                                      {
                                        label: "Tổng số người bị nạn",
                                        name: "tongSoNguoiBiNan",
                                      },
                                      {
                                        label: "Tổng số lao động nữ bị nạn",
                                        name: "soLaoDongNuBiNan",
                                      },
                                      {
                                        label: "Tổng số người bị chết",
                                        name: "soNguoiChet",
                                      },
                                      {
                                        label: "Tổng số người bị thương nặng",
                                        name: "soNguoiThuongNang",
                                      },
                                      {
                                        label: "Số người bị nạn không QL",
                                        name: "soNguoiBiNanKhongQL",
                                      },
                                      {
                                        label: "Lao động nữ bị nạn không QL",
                                        name: "laoDongNuBiNanKhongQL",
                                      },
                                      {
                                        label: "Số người chết không QL",
                                        name: "soNguoiChetKhongQL",
                                      },
                                      {
                                        label: "Người bị thương nặng không QL",
                                        name: "soNguoiThuongNangKhongQL",
                                      },
                                    ].map((f) => {
                                      const fieldErr =
                                        blockErrors[idx] &&
                                        blockErrors[idx][f.name];
                                      return (
                                        <div
                                          key={f.name}
                                          className={`relative border rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950 transition-all ${
                                            fieldErr
                                              ? "border-red-500 ring-1 ring-red-500"
                                              : "border-zinc-200 dark:border-zinc-850"
                                          } ${isReadOnly ? "opacity-70 bg-zinc-50 dark:bg-zinc-900/40" : ""}`}
                                        >
                                          <label
                                            className={`absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold ${
                                              fieldErr
                                                ? "text-red-500"
                                                : "text-zinc-400 dark:text-zinc-500"
                                            }`}
                                          >
                                            {f.label}{" "}
                                            {!isReadOnly && (
                                              <span className="text-red-500">
                                                *
                                              </span>
                                            )}
                                          </label>
                                          <input
                                            type="text"
                                            value={
                                              block[
                                                f.name as keyof AccidentDetailBlock
                                              ] as string
                                            }
                                            onChange={(e) =>
                                              handleBlockCountChange(
                                                idx,
                                                f.name as keyof AccidentDetailBlock,
                                                e.target.value,
                                              )
                                            }
                                            disabled={isReadOnly}
                                            className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold pt-2 pb-0.5 disabled:cursor-not-allowed"
                                            placeholder="0"
                                          />
                                          {fieldErr && (
                                            <span className="text-[10px] text-red-500 mt-1 font-semibold">
                                              {fieldErr}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Group 5: Thiệt hại */}
                                <div className="flex flex-col gap-4 border-t border-zinc-150 dark:border-zinc-800 pt-5">
                                  <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-150">
                                    5. Thiệt hại do tai nạn lao động số{" "}
                                    {blockId}
                                  </h5>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {[
                                      {
                                        label: "Chi phí y tế",
                                        name: "chiPhiYTe",
                                        isMoney: true,
                                      },
                                      {
                                        label:
                                          "Chi phí trả lương trong thời gian điều trị",
                                        name: "chiPhiLuong",
                                        isMoney: true,
                                      },
                                      {
                                        label: "Chi phí bồi thường trợ cấp",
                                        name: "chiPhiBoiThuong",
                                        isMoney: true,
                                      },
                                      {
                                        label: "Tổng số tiền chi phí",
                                        name: "tongChiPhi",
                                        isMoney: true,
                                        isReadOnlyOverride: true,
                                      },
                                      {
                                        label: "Tổng số ngày nghỉ vì TNLĐ",
                                        name: "soNgayNghi",
                                      },
                                      {
                                        label: "Thiệt hại tài sản",
                                        name: "thietHaiTaiSan",
                                        isMoney: true,
                                        isOptional: true,
                                      },
                                    ].map((f) => {
                                      const fieldErr =
                                        blockErrors[idx] &&
                                        blockErrors[idx][f.name];
                                      const inputReadOnly =
                                        isReadOnly || f.isReadOnlyOverride;
                                      const showAsterisk =
                                        !isReadOnly && !f.isOptional;

                                      return (
                                        <div
                                          key={f.name}
                                          className={`relative border rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-955 transition-all ${
                                            fieldErr
                                              ? "border-red-500 ring-1 ring-red-500"
                                              : "border-zinc-200 dark:border-zinc-850"
                                          } ${inputReadOnly ? "opacity-70 bg-zinc-50 dark:bg-zinc-900/40" : ""}`}
                                        >
                                          <label
                                            className={`absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold ${
                                              fieldErr
                                                ? "text-red-500"
                                                : "text-zinc-400 dark:text-zinc-500"
                                            }`}
                                          >
                                            {f.label}{" "}
                                            {showAsterisk && (
                                              <span className="text-red-500">
                                                *
                                              </span>
                                            )}
                                          </label>
                                          <div className="relative flex items-center justify-between w-full pt-2 pb-0.5">
                                            <input
                                              type="text"
                                              value={
                                                block[
                                                  f.name as keyof AccidentDetailBlock
                                                ] as string
                                              }
                                              onChange={(e) =>
                                                f.isMoney
                                                  ? handleBlockMoneyChange(
                                                      idx,
                                                      f.name as keyof AccidentDetailBlock,
                                                      e.target.value,
                                                    )
                                                  : handleBlockCountChange(
                                                      idx,
                                                      f.name as keyof AccidentDetailBlock,
                                                      e.target.value,
                                                    )
                                              }
                                              disabled={inputReadOnly}
                                              className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold disabled:cursor-not-allowed pr-14"
                                              placeholder="0"
                                            />
                                            {f.isMoney && (
                                              <span className="text-xs text-zinc-400 dark:text-zinc-500 select-none pr-1 pointer-events-none">
                                                (1.000đ)
                                              </span>
                                            )}
                                          </div>
                                          {fieldErr && (
                                            <span className="text-[10px] text-red-500 mt-1 font-semibold">
                                              {fieldErr}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ========================================== */}
            {/* SECTION 3: 2. TAI NẠN ĐƯỢC TRỢ CẤP (MIRROR SECTION 1) */}
            {/* ========================================== */}
            {currentSection === "accident-benefits" && (
              <div className="flex flex-col gap-6">
                <div className="border-b border-zinc-150/70 dark:border-zinc-800 pb-3 flex flex-col gap-1.5">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    2. Tai nạn lao động được hưởng trợ cấp theo quy định tại
                    Khoản 2 Điều 39 Luật ATVSLĐ
                  </h3>
                </div>

                {/* Nhóm 1: Tổng số vụ & số nạn nhân trợ cấp */}
                <div className="flex flex-col gap-4 mt-2">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    1. Tổng số vụ tai nạn lao động & số nạn nhân tai nạn lao
                    động
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[
                      { label: "Tổng số vụ", name: "tc_tongSoVu" },
                      {
                        label: "Tổng số vụ có người chết",
                        name: "tc_soVuCoNguoiChet",
                      },
                      {
                        label: "Tổng số vụ có từ 2 người bị nạn trở lên",
                        name: "tc_soVuHaiNguoiTroLen",
                      },
                      {
                        label: "Tổng số người bị nạn",
                        name: "tc_tongSoNguoiBiNan",
                      },
                      {
                        label: "Tổng số lao động nữ bị nạn",
                        name: "tc_soLaoDongNuBiNan",
                      },
                      {
                        label: "Tổng số người bị chết",
                        name: "tc_soNguoiChet",
                      },
                      {
                        label: "Tổng số người bị thương nặng",
                        name: "tc_soNguoiThuongNang",
                      },
                      {
                        label: "Số người bị nạn không QL",
                        name: "tc_soNguoiBiNanKhongQL",
                      },
                      {
                        label: "Lao động nữ bị nạn không QL",
                        name: "tc_laoDongNuBiNanKhongQL",
                      },
                      {
                        label: "Số người chết không QL",
                        name: "tc_soNguoiChetKhongQL",
                      },
                      {
                        label: "Người bị thương nặng không QL",
                        name: "tc_soNguoiThuongNangKhongQL",
                      },
                    ].map((f) => (
                      <div
                        key={f.name}
                        className={`relative border rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950 transition-all ${
                          errors[f.name]
                            ? "border-red-500 ring-1 ring-red-500"
                            : "border-zinc-200 dark:border-zinc-850"
                        } ${isReadOnly ? "opacity-70 bg-zinc-50 dark:bg-zinc-900/40" : ""}`}
                      >
                        <label
                          className={`absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold ${
                            errors[f.name]
                              ? "text-red-500"
                              : "text-zinc-400 dark:text-zinc-500"
                          }`}
                        >
                          {f.label}{" "}
                          {!isReadOnly && (
                            <span className="text-red-500">*</span>
                          )}
                        </label>
                        <input
                          type="text"
                          name={f.name}
                          value={formData[f.name as keyof ReportData] as string}
                          onChange={handleTcCountChange}
                          disabled={isReadOnly}
                          className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold pt-2 pb-0.5 disabled:cursor-not-allowed"
                          placeholder="0"
                        />
                        {errors[f.name] && (
                          <span className="text-[10px] text-red-500 mt-1 font-semibold">
                            {errors[f.name]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Nhóm 2: Thiệt hại chi phí trợ cấp */}
                <div className="flex flex-col gap-4 border-t border-zinc-150 dark:border-zinc-800 pt-5 mt-2">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    2. Thiệt hại do tai nạn lao động
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[
                      {
                        label: "Chi phí y tế",
                        name: "tc_chiPhiYTe",
                        isMoney: true,
                      },
                      {
                        label: "Chi phí trả lương trong thời gian điều trị",
                        name: "tc_chiPhiLuong",
                        isMoney: true,
                      },
                      {
                        label: "Chi phí bồi thường trợ cấp",
                        name: "tc_chiPhiBoiThuong",
                        isMoney: true,
                      },
                      {
                        label: "Tổng số tiền chi phí",
                        name: "tc_tongChiPhi",
                        isMoney: true,
                        isReadOnlyOverride: true,
                      },
                      {
                        label: "Tổng số ngày nghỉ vì TNLĐ",
                        name: "tc_soNgayNghi",
                      },
                      {
                        label: "Thiệt hại tài sản",
                        name: "tc_thietHaiTaiSan",
                        isMoney: true,
                        isOptional: true,
                      },
                    ].map((f) => {
                      const showAsterisk = !isReadOnly && !f.isOptional;
                      const inputReadOnly = isReadOnly || f.isReadOnlyOverride;

                      return (
                        <div
                          key={f.name}
                          className={`relative border rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950 transition-all ${
                            errors[f.name]
                              ? "border-red-500 ring-1 ring-red-500"
                              : "border-zinc-200 dark:border-zinc-850"
                          } ${inputReadOnly ? "opacity-70 bg-zinc-50 dark:bg-zinc-900/40" : ""}`}
                        >
                          <label
                            className={`absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold ${
                              errors[f.name]
                                ? "text-red-500"
                                : "text-zinc-400 dark:text-zinc-500"
                            }`}
                          >
                            {f.label}{" "}
                            {showAsterisk && (
                              <span className="text-red-500">*</span>
                            )}
                          </label>
                          <div className="relative flex items-center justify-between w-full pt-2 pb-0.5">
                            <input
                              type="text"
                              name={f.name}
                              value={
                                formData[f.name as keyof ReportData] as string
                              }
                              onChange={
                                f.isMoney
                                  ? handleMoneyChange
                                  : handleTcCountChange
                              }
                              disabled={inputReadOnly}
                              className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold disabled:cursor-not-allowed pr-14"
                              placeholder="0"
                            />
                            {f.isMoney && (
                              <span className="text-xs text-zinc-400 dark:text-zinc-500 select-none pr-1 pointer-events-none">
                                (1.000đ)
                              </span>
                            )}
                          </div>
                          {errors[f.name] && (
                            <span className="text-[10px] text-red-500 mt-1 font-semibold">
                              {errors[f.name]}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* SECTION 4: REDESIGNED GENERAL VIEW TABLES */}
            {/* ========================================== */}
            {currentSection === "general-view" && (
              <div className="printable-report-wrapper flex flex-col gap-6 select-none animate-in fade-in duration-200">
                <style
                  dangerouslySetInnerHTML={{
                    __html: `
                @media print {
                  /* Reset parent heights and overflows to enable full page printing */
                  html, body, #__next, .h-screen, .overflow-hidden, main, .overflow-y-auto, [class*="h-screen"], [class*="overflow-hidden"], [class*="overflow-y-auto"] {
                    height: auto !important;
                    overflow: visible !important;
                    position: static !important;
                  }
                  body * {
                    visibility: hidden;
                  }
                  .printable-report-wrapper,
                  .printable-report-wrapper * {
                    visibility: visible;
                  }
                  .printable-report-wrapper {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    background: white !important;
                    color: black !important;
                    padding: 0px !important;
                    margin: 0px !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                  table {
                    border-collapse: collapse !important;
                    width: 100% !important;
                  }
                  th, td {
                    border: 1px solid #000 !important;
                    font-size: 10px !important;
                    padding: 4px !important;
                  }
                }
              `,
                  }}
                />
                {/* Header Title */}
                <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-150">
                    Báo cáo tổng hợp tình hình tai nạn lao động - Kỳ báo cáo:{" "}
                    {formData.period} năm {formData.year}
                  </h3>
                </div>

                {/* Red file attachment note */}
                <div className="no-print text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 flex-wrap">
                  {isReadOnly ? (
                    <>
                      <span className="text-zinc-500 dark:text-zinc-400">
                        Báo cáo TNLĐ có dấu mộc công ty:
                      </span>
                      {uploadedFileName ? (
                        <a
                          href={`/department/dashboard/view-document?url=${encodeURIComponent(
                            uploadedFileUrl && uploadedFileUrl !== "#"
                              ? uploadedFileUrl
                              : "/template.pdf",
                          )}&name=${encodeURIComponent(uploadedFileName)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 font-semibold ml-1.5 hover:underline cursor-pointer select-text"
                        >
                          {uploadedFileName}
                        </a>
                      ) : (
                        <span className="text-zinc-400 dark:text-zinc-500 font-medium italic ml-1.5">
                          Không có tệp đính kèm
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-red-500 font-extrabold text-sm">
                        **
                      </span>
                      <span className="text-red-500">
                        Vui lòng đính kèm báo cáo TNLĐ có dấu mộc công ty:
                      </span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-600 hover:text-blue-700 underline font-bold cursor-pointer transition-colors"
                      >
                        Tại đây
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".pdf"
                        className="hidden"
                      />
                      {uploadedFileName && (
                        <a
                          href={`/department/dashboard/view-document?url=${encodeURIComponent(
                            uploadedFileUrl && uploadedFileUrl !== "#"
                              ? uploadedFileUrl
                              : "/template.pdf",
                          )}&name=${encodeURIComponent(uploadedFileName)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 font-semibold ml-4 hover:underline cursor-pointer select-text"
                        >
                          {uploadedFileName}
                        </a>
                      )}
                    </>
                  )}
                </div>

                {/* TABLE I: 13-COLUMN COMPLEX ACCIDENT STATISTICS */}
                <div className="flex flex-col gap-2 mt-2">
                  <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm bg-white dark:bg-zinc-950">
                    <table className="w-full border-collapse text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                      <thead>
                        {/* Row 1 headers */}
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/20 text-zinc-550 dark:text-zinc-400 font-bold select-none text-center">
                          <th
                            rowSpan={3}
                            className="p-3 border-r border-zinc-200 dark:border-zinc-800 text-left min-w-[280px]"
                          >
                            Tên chỉ tiêu thống kê
                          </th>
                          <th
                            rowSpan={3}
                            className="p-3 border-r border-zinc-200 dark:border-zinc-800 w-16"
                          >
                            Mã số
                          </th>
                          <th colSpan={11} className="p-2.5">
                            Phân loại TNLĐ theo mức độ thương tật
                          </th>
                        </tr>
                        {/* Row 2 headers */}
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/20 text-zinc-550 dark:text-zinc-400 font-bold select-none text-center">
                          <th
                            colSpan={3}
                            className="p-2 border-r border-zinc-200 dark:border-zinc-800"
                          >
                            Số vụ (Vụ)
                          </th>
                          <th colSpan={8} className="p-2">
                            Số người bị nạn (Người)
                          </th>
                        </tr>
                        {/* Row 3 headers */}
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/20 text-zinc-550 dark:text-zinc-400 font-bold select-none text-center">
                          <th className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-16">
                            Tổng số
                          </th>
                          <th className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-20">
                            Số vụ có người chết
                          </th>
                          <th className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-24">
                            Số vụ có từ 2 người bị nạn trở lên
                          </th>

                          <th className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-16">
                            Tổng số
                          </th>
                          <th className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-24">
                            NN không thuộc quyền quản lý
                          </th>

                          <th className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-16">
                            Tổng số
                          </th>
                          <th className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-24">
                            NN không thuộc quyền quản lý
                          </th>

                          <th className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-16">
                            Tổng số
                          </th>
                          <th className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-24">
                            NN không thuộc quyền quản lý
                          </th>

                          <th className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-16">
                            Tổng số
                          </th>
                          <th className="p-2 w-24">
                            NN không thuộc quyền quản lý
                          </th>
                        </tr>
                        {/* Spanned Sub-Header descriptors (Số LD nữ, Số người bị chết, Số người thương nặng) */}
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/40 dark:bg-zinc-900/40 text-[9px] text-zinc-400 font-bold text-center">
                          <th className="p-1 border-r border-zinc-200 dark:border-zinc-800"></th>
                          <th className="p-1 border-r border-zinc-200 dark:border-zinc-800"></th>
                          <th
                            colSpan={3}
                            className="p-1 border-r border-zinc-200 dark:border-zinc-800"
                          ></th>
                          <th
                            colSpan={2}
                            className="p-1 border-r border-zinc-200 dark:border-zinc-800"
                          >
                            Tổng số
                          </th>
                          <th
                            colSpan={2}
                            className="p-1 border-r border-zinc-200 dark:border-zinc-800"
                          >
                            Số LD nữ
                          </th>
                          <th
                            colSpan={2}
                            className="p-1 border-r border-zinc-200 dark:border-zinc-800"
                          >
                            Số người bị chết
                          </th>
                          <th colSpan={2} className="p-1">
                            Số người bị thương nặng
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Row 1: Tai nạn lao động */}
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/5 font-bold text-zinc-900 dark:text-zinc-100">
                          <td
                            colSpan={13}
                            className="p-2.5 text-left text-zinc-800 dark:text-zinc-200"
                          >
                            1. Tai nạn lao động
                          </td>
                        </tr>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 font-semibold text-zinc-700 dark:text-zinc-300">
                          <td className="p-3 text-left pl-8 border-r border-zinc-200 dark:border-zinc-800">
                            Tai nạn lao động
                          </td>
                          <td className="p-3 text-center bg-zinc-50/50 dark:bg-zinc-900/10 font-bold border-r border-zinc-200 dark:border-zinc-800"></td>
                          <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                            {sumBlocks("tongSoVu")}
                          </td>
                          <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                            {sumBlocks("soVuCoNguoiChet")}
                          </td>
                          <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                            {sumBlocks("soVuHaiNguoiTroLen")}
                          </td>
                          <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                            {sumBlocks("tongSoNguoiBiNan")}
                          </td>
                          <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                            {sumBlocks("soNguoiBiNanKhongQL")}
                          </td>
                          <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                            {sumBlocks("soLaoDongNuBiNan")}
                          </td>
                          <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                            {sumBlocks("laoDongNuBiNanKhongQL")}
                          </td>
                          <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                            {sumBlocks("soNguoiChet")}
                          </td>
                          <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                            {sumBlocks("soNguoiChetKhongQL")}
                          </td>
                          <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                            {sumBlocks("soNguoiThuongNang")}
                          </td>
                          <td className="p-3 text-center">
                            {sumBlocks("soNguoiThuongNangKhongQL")}
                          </td>
                        </tr>

                        {/* Row 2: 1.1 Phân theo nguyên nhân xảy ra TNLĐ */}
                        {(hasVisibleCauseA || hasVisibleCauseB) && (
                          <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/5 font-bold">
                            <td
                              colSpan={13}
                              className="p-2.5 text-left text-zinc-800 dark:text-zinc-200"
                            >
                              1.1 Phân theo nguyên nhân xảy ra TNLĐ
                            </td>
                          </tr>
                        )}
                        {hasVisibleCauseA && (
                          <>
                            {/* Sub Category: a. Do người sử dụng lao động */}
                            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/10 dark:bg-zinc-900/2 font-bold text-zinc-500 text-[10px]">
                              <td colSpan={13} className="p-2 text-left pl-6">
                                a. Do người sử dụng lao động
                              </td>
                            </tr>
                            {causeCategories
                              .slice(0, 6)
                              .map((cause) =>
                                renderCauseRow(cause, getCauseCode(cause)),
                              )}
                          </>
                        )}

                        {hasVisibleCauseB && (
                          <>
                            {/* Sub Category: b. Do người lao động */}
                            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/10 dark:bg-zinc-900/2 font-bold text-zinc-500 text-[10px]">
                              <td colSpan={13} className="p-2 text-left pl-6">
                                b. Do người lao động
                              </td>
                            </tr>
                            {causeCategories
                              .slice(6)
                              .map((cause) =>
                                renderCauseRow(cause, getCauseCode(cause)),
                              )}
                          </>
                        )}

                        {/* Row 3: 1.2 Phân theo yếu tố gây chấn thương */}
                        {hasVisibleFactors && (
                          <>
                            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/5 font-bold">
                              <td
                                colSpan={13}
                                className="p-2.5 text-left text-zinc-800 dark:text-zinc-200"
                              >
                                1.2 Phân theo yếu tố gây chấn thương
                              </td>
                            </tr>
                            {factorCategories.map((factor) => {
                              if (isFactorRowEmpty(factor)) return null;
                              const code = getFactorCode(factor);
                              return (
                                <tr
                                  key={code}
                                  className="border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                                >
                                  <td className="p-3 text-left pl-8 border-r border-zinc-200 dark:border-zinc-800">
                                    {factor}
                                  </td>
                                  <td className="p-3 text-center bg-zinc-50/50 dark:bg-zinc-900/10 font-bold border-r border-zinc-200 dark:border-zinc-800">
                                    {code}
                                  </td>
                                  <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                    {sumBlocksByFactor(factor, "tongSoVu")}
                                  </td>
                                  <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                    {sumBlocksByFactor(
                                      factor,
                                      "soVuCoNguoiChet",
                                    )}
                                  </td>
                                  <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                    {sumBlocksByFactor(
                                      factor,
                                      "soVuHaiNguoiTroLen",
                                    )}
                                  </td>
                                  <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                    {sumBlocksByFactor(
                                      factor,
                                      "tongSoNguoiBiNan",
                                    )}
                                  </td>
                                  <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                    {sumBlocksByFactor(
                                      factor,
                                      "soNguoiBiNanKhongQL",
                                    )}
                                  </td>
                                  <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                    {sumBlocksByFactor(
                                      factor,
                                      "soLaoDongNuBiNan",
                                    )}
                                  </td>
                                  <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                    {sumBlocksByFactor(
                                      factor,
                                      "laoDongNuBiNanKhongQL",
                                    )}
                                  </td>
                                  <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                    {sumBlocksByFactor(factor, "soNguoiChet")}
                                  </td>
                                  <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                    {sumBlocksByFactor(
                                      factor,
                                      "soNguoiChetKhongQL",
                                    )}
                                  </td>
                                  <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                    {sumBlocksByFactor(
                                      factor,
                                      "soNguoiThuongNang",
                                    )}
                                  </td>
                                  <td className="p-3 text-center">
                                    {sumBlocksByFactor(
                                      factor,
                                      "soNguoiThuongNangKhongQL",
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </>
                        )}

                        {/* Row 4: 1.3 Phân theo nghề nghiệp */}
                        {hasVisibleJobs && (
                          <>
                            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/5 font-bold">
                              <td
                                colSpan={13}
                                className="p-2.5 text-left text-zinc-800 dark:text-zinc-200"
                              >
                                1.3 Phân theo nghề nghiệp
                              </td>
                            </tr>
                            {jobCategories.map((job) => {
                              if (isJobRowEmpty(job)) return null;
                              const code = getJobCode(job);
                              return (
                                <tr
                                  key={code}
                                  className="border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                                >
                                  <td className="p-3 text-left pl-8 border-r border-zinc-200 dark:border-zinc-800">
                                    {job}
                                  </td>
                                  <td className="p-3 text-center bg-zinc-50/50 dark:bg-zinc-900/10 font-bold border-r border-zinc-200 dark:border-zinc-800">
                                    {code}
                                  </td>
                                  <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                    {sumBlocksByJob(job, "tongSoVu")}
                                  </td>
                                  <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                    {sumBlocksByJob(job, "soVuCoNguoiChet")}
                                  </td>
                                  <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                    {sumBlocksByJob(job, "soVuHaiNguoiTroLen")}
                                  </td>
                                  <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                    {sumBlocksByJob(job, "tongSoNguoiBiNan")}
                                  </td>
                                  <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                    {sumBlocksByJob(job, "soNguoiBiNanKhongQL")}
                                  </td>
                                  <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                    {sumBlocksByJob(job, "soLaoDongNuBiNan")}
                                  </td>
                                  <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                    {sumBlocksByJob(
                                      job,
                                      "laoDongNuBiNanKhongQL",
                                    )}
                                  </td>
                                  <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                    {sumBlocksByJob(job, "soNguoiChet")}
                                  </td>
                                  <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                    {sumBlocksByJob(job, "soNguoiChetKhongQL")}
                                  </td>
                                  <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                    {sumBlocksByJob(job, "soNguoiThuongNang")}
                                  </td>
                                  <td className="p-3 text-center">
                                    {sumBlocksByJob(
                                      job,
                                      "soNguoiThuongNangKhongQL",
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </>
                        )}

                        {/* Row 5: 2. Tai nạn được hưởng trợ cấp theo Luật ATVSLĐ */}
                        {!isSection2Empty && (
                          <>
                            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/5 font-bold text-zinc-900 dark:text-zinc-100">
                              <td
                                colSpan={13}
                                className="p-2.5 text-left text-zinc-800 dark:text-zinc-200"
                              >
                                2. Tai nạn được hưởng trợ cấp theo quy định tại
                                Khoản 2 Điều 39 Luật ATVSLĐ
                              </td>
                            </tr>
                            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                              <td className="p-3 text-left pl-8 border-r border-zinc-200 dark:border-zinc-800"></td>
                              <td className="p-3 text-center bg-zinc-50/50 dark:bg-zinc-900/10 font-bold border-r border-zinc-200 dark:border-zinc-800">
                                10
                              </td>
                              <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                {Number(formData.tc_tongSoVu || 0)}
                              </td>
                              <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                {Number(formData.tc_soVuCoNguoiChet || 0)}
                              </td>
                              <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                {Number(formData.tc_soVuHaiNguoiTroLen || 0)}
                              </td>
                              <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                {Number(formData.tc_tongSoNguoiBiNan || 0)}
                              </td>
                              <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                {Number(formData.tc_soNguoiBiNanKhongQL || 0)}
                              </td>
                              <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                {Number(formData.tc_soLaoDongNuBiNan || 0)}
                              </td>
                              <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                {Number(formData.tc_laoDongNuBiNanKhongQL || 0)}
                              </td>
                              <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                {Number(formData.tc_soNguoiChet || 0)}
                              </td>
                              <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                {Number(formData.tc_soNguoiChetKhongQL || 0)}
                              </td>
                              <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                                {Number(formData.tc_soNguoiThuongNang || 0)}
                              </td>
                              <td className="p-3 text-center">
                                {Number(
                                  formData.tc_soNguoiThuongNangKhongQL || 0,
                                )}
                              </td>
                            </tr>
                          </>
                        )}

                        {/* Row 6: 3. Tổng số */}
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/5 font-bold">
                          <td
                            colSpan={13}
                            className="p-2.5 text-left text-zinc-800 dark:text-zinc-200"
                          >
                            3. Tổng số
                          </td>
                        </tr>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 font-bold text-zinc-950 dark:text-zinc-550">
                          <td className="p-3 text-left border-r border-zinc-200 dark:border-zinc-800">
                            Tổng số (3=1+2)
                          </td>
                          <td className="p-3 text-center bg-zinc-50/50 dark:bg-zinc-900/10 font-bold border-r border-zinc-200 dark:border-zinc-800">
                            -
                          </td>
                          <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                            {sumCol("tongSoVu", "tc_tongSoVu")}
                          </td>
                          <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                            {sumCol("soVuCoNguoiChet", "tc_soVuCoNguoiChet")}
                          </td>
                          <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                            {sumCol(
                              "soVuHaiNguoiTroLen",
                              "tc_soVuHaiNguoiTroLen",
                            )}
                          </td>
                          <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                            {sumCol("tongSoNguoiBiNan", "tc_tongSoNguoiBiNan")}
                          </td>
                          <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                            {sumCol(
                              "soNguoiBiNanKhongQL",
                              "tc_soNguoiBiNanKhongQL",
                            )}
                          </td>
                          <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                            {sumCol("soLaoDongNuBiNan", "tc_soLaoDongNuBiNan")}
                          </td>
                          <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                            {sumCol(
                              "laoDongNuBiNanKhongQL",
                              "tc_laoDongNuBiNanKhongQL",
                            )}
                          </td>
                          <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                            {sumCol("soNguoiChet", "tc_soNguoiChet")}
                          </td>
                          <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                            {sumCol(
                              "soNguoiChetKhongQL",
                              "tc_soNguoiChetKhongQL",
                            )}
                          </td>
                          <td className="p-3 text-center border-r border-zinc-200 dark:border-zinc-800">
                            {sumCol(
                              "soNguoiThuongNang",
                              "tc_soNguoiThuongNang",
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {sumCol(
                              "soNguoiThuongNangKhongQL",
                              "tc_soNguoiThuongNangKhongQL",
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* TABLE II: DAMAGES SUMMARY TABLE */}
                <div className="flex flex-col gap-3 mt-4">
                  <div className="border-b border-zinc-200 dark:border-zinc-800 pb-1">
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase">
                      II. Thiệt hại do tai nạn lao động
                    </h4>
                  </div>
                  <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm bg-white dark:bg-zinc-950">
                    <table className="w-full border-collapse text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/20 text-zinc-550 dark:text-zinc-400 font-bold select-none text-center">
                          <th
                            rowSpan={3}
                            className="p-3 border-r border-zinc-200 dark:border-zinc-800 text-left min-w-[280px]"
                          >
                            Tổng số ngày nghỉ vì tai nạn lao động (kể cả ngày
                            nghỉ chế độ)
                          </th>
                          <th
                            colSpan={4}
                            className="p-2 border-r border-zinc-200 dark:border-zinc-800"
                          >
                            Tổng số ngày nghỉ vì TNLĐ (1.000đ)
                          </th>
                          <th rowSpan={3} className="p-3 w-44">
                            Thiệt hại tài sản (1.000đ)
                          </th>
                        </tr>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/20 text-zinc-550 dark:text-zinc-400 font-bold select-none text-center text-[10px]">
                          <th
                            rowSpan={2}
                            className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-24"
                          >
                            Tổng số
                          </th>
                          <th
                            colSpan={3}
                            className="p-2 border-r border-zinc-200 dark:border-zinc-800"
                          >
                            Khoảng chi cụ thể của cơ sở
                          </th>
                        </tr>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/20 text-zinc-550 dark:text-zinc-400 font-bold select-none text-center text-[10px]">
                          <th className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-24">
                            Y tế
                          </th>
                          <th className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-36">
                            Trả lương trong thời gian điều trị
                          </th>
                          <th className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-28">
                            Bồi thường trợ cấp
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="text-center font-bold text-zinc-800 dark:text-zinc-200">
                          <td className="p-3.5 border-r border-zinc-200 dark:border-zinc-800 text-center">
                            {formData.soNgayNghi || "0"}
                          </td>
                          <td className="p-3.5 border-r border-zinc-200 dark:border-zinc-800 text-blue-600 text-center">
                            {formData.tongChiPhi || "0"}
                          </td>
                          <td className="p-3.5 border-r border-zinc-200 dark:border-zinc-800 text-center">
                            {formData.chiPhiYTe || "0"}
                          </td>
                          <td className="p-3.5 border-r border-zinc-200 dark:border-zinc-800 text-center">
                            {formData.chiPhiLuong || "0"}
                          </td>
                          <td className="p-3.5 border-r border-zinc-200 dark:border-zinc-800 text-center">
                            {formData.chiPhiBoiThuong || "0"}
                          </td>
                          <td className="p-3.5 text-center text-red-600 dark:text-red-400 font-bold">
                            {formData.thietHaiTaiSan || "0"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fixed navigation footer */}
          <div
            className={`border-t border-zinc-150 dark:border-zinc-800 grid grid-cols-[auto_1fr_auto] items-center select-none ${
              isReadOnly
                ? "mt-8 pt-5"
                : "z-30 flex-shrink-0 bg-white px-6 py-4 dark:bg-zinc-950"
            }`}
          >
            {currentSection !== "enterprise-info" ? (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1.5 px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl font-bold text-xs text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer bg-transparent hover:text-zinc-900"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Quay lại</span>
              </button>
            ) : (
              <div className="w-[104px]" />
            )}

            <span className="justify-self-center text-[10px] font-bold text-zinc-400">
              {currentSection === "enterprise-info"
                ? "Bước 1 / 4"
                : currentSection === "accident-stats"
                  ? activeTab === "totals"
                    ? "Bước 2 / 4 (Tổng số)"
                    : "Bước 2 / 4 (Chi tiết)"
                  : currentSection === "accident-benefits"
                    ? "Bước 3 / 4"
                    : "Bước 4 / 4 (Tổng quan)"}
            </span>

            <span className="w-[104px] justify-self-end" aria-hidden="true" />
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* POPUP CANCEL CONFIRM */}
      {/* ========================================== */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setShowCancelConfirm(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[20px] w-full max-w-[400px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="bg-[#2563eb] text-white py-3.5 text-center font-bold text-base select-none tracking-wide flex items-center justify-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Cảnh báo</span>
            </div>

            <div className="p-6 text-center">
              <p className="text-zinc-700 dark:text-zinc-350 font-semibold text-sm leading-relaxed">
                Dữ liệu báo cáo đã nhập sẽ không được lưu lại
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 pb-6 select-none font-bold text-xs">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="px-5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleCancelConfirm}
                className="px-6 py-2 bg-[#2563eb] hover:bg-blue-700 text-white rounded-lg shadow-md transition-all cursor-pointer"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* POPUP VALIDATION ERRORS */}
      {/* ========================================== */}
      {validationErrorsPopup && validationErrorsPopup.length > 0 && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            onClick={() => setValidationErrorsPopup(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[20px] w-full max-w-[520px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col z-[10000]">
            <div className="bg-red-600 text-white py-4 text-center font-bold text-lg select-none tracking-wide flex items-center justify-center gap-2">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
              <span>Cảnh báo dữ liệu không hợp lệ</span>
            </div>

            <div className="p-6 overflow-y-auto max-h-[300px] text-left">
              <p className="text-zinc-800 dark:text-zinc-200 font-bold text-sm mb-3">
                Vui lòng kiểm tra và sửa lại các thông tin chưa chính xác dưới
                đây:
              </p>
              <ul className="list-disc list-inside space-y-2 text-xs font-semibold text-red-650 dark:text-red-400">
                {validationErrorsPopup.map((err, i) => (
                  <li key={i} className="leading-relaxed pl-1">
                    {err}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 pb-6 select-none font-bold text-sm border-t border-zinc-100 dark:border-zinc-900 pt-4">
              <button
                type="button"
                onClick={() => setValidationErrorsPopup(null)}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 backdrop-blur-[2px]">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Đang tải dữ liệu, vui lòng đợi...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
