import { jsPDF } from "jspdf";
import "jspdf-autotable";
import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  VerticalAlign,
  PageOrientation
} from "docx";

export const CAUSE_CATEGORIES = [
  "Không có thiết bị an toàn hoặc thiết bị không đảm bảo an toàn",
  "Không có phương tiện bảo vệ cá nhân hoặc phương tiện bảo vệ cá nhân không tốt",
  "Tổ chức lao động không hợp lý",
  "Chưa huấn luyện hoặc huấn luyện an toàn vệ sinh lao động chưa đầy đủ",
  "Không có quy trình an toàn hoặc biện pháp làm việc an toàn",
  "Điều kiện làm việc không tốt",
  "Vi phạm nội quy, quy trình, biện pháp làm việc an toàn",
  "Không sử dụng phương tiện bảo vệ cá nhân",
  "Khách quan khó tránh/ Nguyên nhân chưa kể đến"
];

export const FACTOR_CATEGORIES = [
  "Thiết bị nâng",
  "Máy gia công cắt gọt kim loại, gỗ",
  "Điện giật",
  "Ngã từ trên cao",
  "Vật rơi, vật văng bắn",
  "Nhiệt độ cao, bỏng lửa",
  "Khác"
];

export const JOB_CATEGORIES = [
  "Nhà lãnh đạo cơ quan Đảng Cộng sản Việt nam cấp Trung ương",
  "Công nhân",
  "Nhà quản lý, điều hành doanh nghiệp",
  "Kỹ sư, kỹ thuật viên chuyên nghiệp",
  "Thợ vận hành máy và thiết bị",
  "Lao động thủ công giản đơn",
  "Khác"
];

// Utility functions
const parseDotsToNumber = (val: string | number): number => {
  if (!val) return 0;
  if (typeof val === "number") return val;
  const cleaned = val.replace(/\./g, "").trim();
  return Number(cleaned) || 0;
};

const formatNumberWithDots = (val: number | string): string => {
  if (val === undefined || val === null || val === "") return "0";
  const num = Number(String(val).replace(/\./g, "")) || 0;
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const sumBlocks = (report: any, field: string): number => {
  if (!report || !report.details) return 0;
  return report.details.reduce((sum: number, block: any) => {
    const val = block[field];
    return sum + (field === "chiPhiYTe" || field === "chiPhiLuong" || field === "chiPhiBoiThuong" || field === "thietHaiTaiSan" || field === "tongChiPhi"
      ? parseDotsToNumber(String(val || 0))
      : Number(val || 0));
  }, 0);
};

const sumBlocksByCause = (report: any, cause: string, field: string): number => {
  if (!report || !report.details) return 0;
  return report.details
    .filter((block: any) => block.causeCategory === cause)
    .reduce((sum: number, block: any) => {
      const val = block[field];
      return sum + (field === "chiPhiYTe" || field === "chiPhiLuong" || field === "chiPhiBoiThuong" || field === "thietHaiTaiSan" || field === "tongChiPhi"
        ? parseDotsToNumber(String(val || 0))
        : Number(val || 0));
    }, 0);
};

const sumBlocksByFactor = (report: any, factor: string, field: string): number => {
  if (!report || !report.details) return 0;
  return report.details
    .filter((block: any) => block.factorCategory === factor)
    .reduce((sum: number, block: any) => {
      const val = block[field];
      return sum + (field === "chiPhiYTe" || field === "chiPhiLuong" || field === "chiPhiBoiThuong" || field === "thietHaiTaiSan" || field === "tongChiPhi"
        ? parseDotsToNumber(String(val || 0))
        : Number(val || 0));
    }, 0);
};

const sumBlocksByJob = (report: any, job: string, field: string): number => {
  if (!report || !report.details) return 0;
  return report.details
    .filter((block: any) => block.jobCategory === job)
    .reduce((sum: number, block: any) => {
      const val = block[field];
      return sum + (field === "chiPhiYTe" || field === "chiPhiLuong" || field === "chiPhiBoiThuong" || field === "thietHaiTaiSan" || field === "tongChiPhi"
        ? parseDotsToNumber(String(val || 0))
        : Number(val || 0));
    }, 0);
};

const sumCol = (report: any, field1: string, field2: string): number => {
  const val1 = sumBlocks(report, field1);
  const rawVal2 = report[field2];
  const val2 = typeof rawVal2 === "string" || typeof rawVal2 === "number"
    ? parseDotsToNumber(String(rawVal2))
    : 0;
  return val1 + val2;
};

const mapCauseToFrontend = (catalog: any) => {
  if (!catalog) return CAUSE_CATEGORIES[0];
  const name = typeof catalog === "string" ? catalog : catalog.name || "";
  const found = CAUSE_CATEGORIES.find(c => c.toLowerCase().trim() === name.toLowerCase().trim());
  if (found) return found;
  const partial = CAUSE_CATEGORIES.find(c => c.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(c.toLowerCase()));
  return partial ?? CAUSE_CATEGORIES[0];
};

const mapFactorToFrontend = (catalog: any) => {
  if (!catalog) return FACTOR_CATEGORIES[0];
  const name = typeof catalog === "string" ? catalog : catalog.name || "";
  const found = FACTOR_CATEGORIES.find(c => c.toLowerCase().trim() === name.toLowerCase().trim());
  if (found) return found;
  const partial = FACTOR_CATEGORIES.find(c => c.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(c.toLowerCase()));
  return partial ?? FACTOR_CATEGORIES[0];
};

const mapJobToFrontend = (catalog: any) => {
  if (!catalog) return JOB_CATEGORIES[0];
  const name = typeof catalog === "string" ? catalog : catalog.name || "";
  const found = JOB_CATEGORIES.find(c => c.toLowerCase().trim() === name.toLowerCase().trim());
  if (found) return found;
  const partial = JOB_CATEGORIES.find(c => c.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(c.toLowerCase()));
  return partial ?? JOB_CATEGORIES[0];
};

export const normalizeReportData = (report: any): any => {
  if (!report) return null;

  const allowanceDetail = report.details?.find(
    (d: any) => d.section === "ARTICLE_39_ALLOWANCE"
  );

  const getVal = (val: any) => {
    if (val === undefined || val === null) return 0;
    return val;
  };

  const rawDetails = report.details || [];
  const normalizedDetails = rawDetails
    .filter((d: any) => d.section === "ACCIDENT" || !d.section)
    .map((d: any) => ({
      causeCategory: d.causeCategory ? d.causeCategory : mapCauseToFrontend(d.accidentCauseCatalog),
      factorCategory: d.factorCategory ? d.factorCategory : mapFactorToFrontend(d.injuryFactorCatalog),
      jobCategory: d.jobCategory ? d.jobCategory : mapJobToFrontend(d.occupationCatalog),
      tongSoVu: getVal(d.tongSoVu ?? d.totalAccidents),
      soVuCoNguoiChet: getVal(d.soVuCoNguoiChet ?? d.fatalAccidents),
      soVuHaiNguoiTroLen: getVal(d.soVuHaiNguoiTroLen ?? d.accidentsWithTwoOrMoreVictims),
      tongSoNguoiBiNan: getVal(d.tongSoNguoiBiNan ?? d.totalVictims),
      soLaoDongNuBiNan: getVal(d.soLaoDongNuBiNan ?? d.femaleVictims),
      soNguoiChet: getVal(d.soNguoiChet ?? d.deathVictims),
      soNguoiThuongNang: getVal(d.soNguoiThuongNang ?? d.severeInjuryVictims),
      soNguoiBiNanKhongQL: getVal(d.soNguoiBiNanKhongQL ?? d.victimsNotUnderManagement),
      laoDongNuBiNanKhongQL: getVal(d.laoDongNuBiNanKhongQL ?? d.femaleVictimsNotUnderManagement),
      soNguoiChetKhongQL: getVal(d.soNguoiChetKhongQL ?? d.deathVictimsNotUnderManagement),
      soNguoiThuongNangKhongQL: getVal(d.soNguoiThuongNangKhongQL ?? d.severeInjuryVictimsNotUnderManagement),
      chiPhiYTe: getVal(d.chiPhiYTe ?? d.medicalCost),
      chiPhiLuong: getVal(d.chiPhiLuong ?? d.salaryPaymentCost),
      chiPhiBoiThuong: getVal(d.chiPhiBoiThuong ?? d.allowanceCost),
      tongChiPhi: getVal(d.tongChiPhi ?? d.totalCost),
      soNgayNghi: getVal(d.soNgayNghi ?? d.daysOff ?? d.totalDaysOff),
      thietHaiTaiSan: getVal(d.thietHaiTaiSan ?? d.propertyDamage)
    }));

  const periodLabel = report.period ||
    (report.reportPeriod?.periodTypeLabel ||
      (report.reportPeriod?.periodType === "SIX_MONTHS" ? "6 tháng" : "Cả năm"));

  const yearVal = report.year || report.reportPeriod?.year || new Date().getFullYear();

  return {
    id: report.id,
    year: yearVal,
    period: periodLabel,
    totalEmployees: getVal(report.totalEmployees ?? (report.laoDongCoSo ? parseDotsToNumber(report.laoDongCoSo) : 0)),
    femaleEmployees: getVal(report.femaleEmployees ?? (report.laoDongNu ? parseDotsToNumber(report.laoDongNu) : 0)),
    totalPayroll: getVal(report.totalPayroll ?? (report.quyLuong ? parseDotsToNumber(report.quyLuong) : 0)),
    tongSoVu: getVal(report.tongSoVu ?? report.totalAccidents),
    soVuCoNguoiChet: getVal(report.soVuCoNguoiChet ?? report.fatalAccidents),
    soVuHaiNguoiTroLen: getVal(report.soVuHaiNguoiTroLen ?? report.accidentsWithTwoOrMoreVictims),
    tongSoNguoiBiNan: getVal(report.tongSoNguoiBiNan ?? report.totalVictims),
    soLaoDongNuBiNan: getVal(report.soLaoDongNuBiNan ?? report.femaleVictims),
    soNguoiChet: getVal(report.soNguoiChet ?? report.deathVictims),
    soNguoiThuongNang: getVal(report.soNguoiThuongNang ?? report.severeInjuryVictims),
    soNguoiBiNanKhongQL: getVal(report.soNguoiBiNanKhongQL ?? report.victimsNotUnderManagement),
    laoDongNuBiNanKhongQL: getVal(report.laoDongNuBiNanKhongQL ?? report.femaleVictimsNotUnderManagement),
    soNguoiChetKhongQL: getVal(report.soNguoiChetKhongQL ?? report.deathVictimsNotUnderManagement),
    soNguoiThuongNangKhongQL: getVal(report.soNguoiThuongNangKhongQL ?? report.severeInjuryVictimsNotUnderManagement),
    chiPhiYTe: getVal(report.chiPhiYTe ?? report.medicalCost),
    chiPhiLuong: getVal(report.chiPhiLuong ?? report.salaryPaymentCost),
    chiPhiBoiThuong: getVal(report.chiPhiBoiThuong ?? report.allowanceCost),
    tongChiPhi: getVal(report.tongChiPhi ?? report.totalCost),
    soNgayNghi: getVal(report.soNgayNghi ?? report.totalDaysOff),
    thietHaiTaiSan: getVal(report.thietHaiTaiSan ?? report.propertyDamage),
    details: normalizedDetails,
    tc_tongSoVu: getVal(report.tc_tongSoVu ?? allowanceDetail?.totalAccidents),
    tc_soVuCoNguoiChet: getVal(report.tc_soVuCoNguoiChet ?? allowanceDetail?.fatalAccidents),
    tc_soVuHaiNguoiTroLen: getVal(report.tc_soVuHaiNguoiTroLen ?? allowanceDetail?.accidentsWithTwoOrMoreVictims),
    tc_tongSoNguoiBiNan: getVal(report.tc_tongSoNguoiBiNan ?? allowanceDetail?.totalVictims),
    tc_soLaoDongNuBiNan: getVal(report.tc_soLaoDongNuBiNan ?? allowanceDetail?.femaleVictims),
    tc_soNguoiChet: getVal(report.tc_soNguoiChet ?? allowanceDetail?.deathVictims),
    tc_soNguoiThuongNang: getVal(report.tc_soNguoiThuongNang ?? allowanceDetail?.severeInjuryVictims),
    tc_soNguoiBiNanKhongQL: getVal(report.tc_soNguoiBiNanKhongQL ?? allowanceDetail?.victimsNotUnderManagement),
    tc_laoDongNuBiNanKhongQL: getVal(report.tc_laoDongNuBiNanKhongQL ?? allowanceDetail?.femaleVictimsNotUnderManagement),
    tc_soNguoiChetKhongQL: getVal(report.tc_soNguoiChetKhongQL ?? allowanceDetail?.deathVictimsNotUnderManagement),
    tc_soNguoiThuongNangKhongQL: getVal(report.tc_soNguoiThuongNangKhongQL ?? allowanceDetail?.severeInjuryVictimsNotUnderManagement),
    tc_chiPhiYTe: getVal(report.tc_chiPhiYTe ?? allowanceDetail?.medicalCost),
    tc_chiPhiLuong: getVal(report.tc_chiPhiLuong ?? allowanceDetail?.salaryPaymentCost),
    tc_chiPhiBoiThuong: getVal(report.tc_chiPhiBoiThuong ?? allowanceDetail?.allowanceCost),
    tc_tongChiPhi: getVal(report.tc_tongChiPhi ?? allowanceDetail?.totalCost),
    tc_soNgayNghi: getVal(report.tc_soNgayNghi ?? allowanceDetail?.daysOff ?? allowanceDetail?.totalDaysOff),
    tc_thietHaiTaiSan: getVal(report.tc_thietHaiTaiSan ?? allowanceDetail?.propertyDamage)
  };
};

// Check if rows are empty to match Request 2
const isCauseRowEmpty = (report: any, title: string) => {
  const fields = [
    "tongSoVu", "soVuCoNguoiChet", "soVuHaiNguoiTroLen", "tongSoNguoiBiNan", "soNguoiBiNanKhongQL",
    "soLaoDongNuBiNan", "laoDongNuBiNanKhongQL", "soNguoiChet", "soNguoiChetKhongQL", "soNguoiThuongNang", "soNguoiThuongNangKhongQL"
  ];
  return fields.every(field => sumBlocksByCause(report, title, field) === 0);
};

const isFactorRowEmpty = (report: any, factor: string) => {
  const fields = [
    "tongSoVu", "soVuCoNguoiChet", "soVuHaiNguoiTroLen", "tongSoNguoiBiNan", "soNguoiBiNanKhongQL",
    "soLaoDongNuBiNan", "laoDongNuBiNanKhongQL", "soNguoiChet", "soNguoiChetKhongQL", "soNguoiThuongNang", "soNguoiThuongNangKhongQL"
  ];
  return fields.every(field => sumBlocksByFactor(report, factor, field) === 0);
};

const isJobRowEmpty = (report: any, job: string) => {
  const fields = [
    "tongSoVu", "soVuCoNguoiChet", "soVuHaiNguoiTroLen", "tongSoNguoiBiNan", "soNguoiBiNanKhongQL",
    "soLaoDongNuBiNan", "laoDongNuBiNanKhongQL", "soNguoiChet", "soNguoiChetKhongQL", "soNguoiThuongNang", "soNguoiThuongNangKhongQL"
  ];
  return fields.every(field => sumBlocksByJob(report, job, field) === 0);
};

// Base64 Font fetch - Fixed for jsPDF v4 compatibility
const fetchFontBase64 = async (path: string): Promise<string> => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to fetch font: ${path} (${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// Font size constants for PDF (in pt) - Standardized to 12pt
const PDF_FONT = {
  BODY: 12,         // Body text, metadata, signature - 12pt
  TITLE: 14,        // Main title
  SUBTITLE: 12,     // Subtitle, period info
  HEADER_INFO: 12,  // Company info header
  TABLE_HEAD: 7,    // Table header (constrained by A4 width with 13 cols)
  TABLE_BODY: 7,    // Table body (constrained by A4 width with 13 cols)
  TABLE_II_HEAD: 9, // Table II header (6 cols, more space)
  TABLE_II_BODY: 9, // Table II body
  SECTION_TITLE: 12, // Section titles
  APPENDIX: 12,     // Appendix label
  APPENDIX_SUB: 10, // Appendix subtitle
  SIGN_TITLE: 12,   // Signature block title
  SIGN_SUB: 10,     // Signature sub text
  SIGN_NAME: 12,    // Signer name
  DATE: 12          // Date text
};

export const exportReportPdf = async (rawReport: any, profile: any) => {
  const report = normalizeReportData(rawReport);
  const p = profile || {};

  // Load fonts with error handling
  let regularBase64: string;
  let boldBase64: string;
  try {
    [regularBase64, boldBase64] = await Promise.all([
      fetchFontBase64("/fonts/Roboto-Regular.ttf"),
      fetchFontBase64("/fonts/Roboto-Bold.ttf")
    ]);
  } catch (fontError) {
    console.error("Font loading failed:", fontError);
    throw new Error("Không thể tải font chữ để tạo PDF. Vui lòng thử lại.");
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  // Register fonts to support Vietnamese - jsPDF v4 compatible
  doc.addFileToVFS("Roboto-Regular.ttf", regularBase64);
  doc.addFileToVFS("Roboto-Bold.ttf", boldBase64);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
  doc.setFont("Roboto", "normal");

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 10;
  const contentW = pageW - margin * 2;

  // Header Company Info & Appendix Label
  doc.setFontSize(PDF_FONT.HEADER_INFO);
  doc.setFont("Roboto", "bold");
  doc.text(p.businessName || "-", margin, 14);
  doc.setFont("Roboto", "normal");
  doc.text(`MST: ${p.taxCode || "-"}`, margin, 19);
  doc.text(`Địa chỉ: ${p.address || "-"}`, margin, 24);
  doc.text(`Khu vực: ${[p.wardCommune, p.provinceCity].filter(Boolean).join(", ")}`, margin, 29);
  doc.text(`SĐT: ${p.agencyPhone || p.representativePhone || "-"} | Email: ${p.email || "-"}`, margin, 34);

  doc.setFont("Roboto", "bold");
  doc.setFontSize(PDF_FONT.APPENDIX);
  const appendixText = report.period === "Cả năm" ? "PHỤ LỤC XIII" : "PHỤ LỤC XII";
  doc.text(appendixText, pageW - margin, 14, { align: "right" });
  doc.setFont("Roboto", "normal");
  doc.setFontSize(PDF_FONT.APPENDIX_SUB);
  doc.text("MẪU BÁO CÁO TỔNG HỢP TÌNH HÌNH TAI NẠN LAO ĐỘNG CẤP CƠ SỞ", pageW - margin, 20, { align: "right" });
  doc.text("(Kèm theo Nghị định số 39/2016/NĐ-CP ngày 15/5/2016 của Chính phủ)", pageW - margin, 25, { align: "right" });

  // Main title
  doc.setFontSize(PDF_FONT.TITLE);
  doc.setFont("Roboto", "bold");
  doc.text("BÁO CÁO TỔNG HỢP TÌNH HÌNH TAI NẠN LAO ĐỘNG CẤP CƠ SỞ", pageW / 2, 46, { align: "center" });

  doc.setFontSize(PDF_FONT.SUBTITLE);
  const repPeriodStr = `Kỳ báo cáo: ${report.period || "-"} năm ${report.year || "-"}`;
  doc.text(repPeriodStr, pageW / 2, 53, { align: "center" });

  doc.setFont("Roboto", "normal");
  doc.setFontSize(PDF_FONT.BODY);
  doc.text("Kính gửi: Sở Lao động - Thương binh và Xã hội tỉnh/thành phố", pageW / 2, 60, { align: "center" });

  // Metadata block
  const startY = 70;
  doc.setFontSize(PDF_FONT.BODY);
  doc.text(`1. Loại hình cơ sở: ${p.businessType || "-"}`, margin, startY);
  doc.text(`2. Ngành nghề sản xuất chính: ${p.industryName || p.industry || "-"}`, margin, startY + 6);
  doc.text(`3. Tổng số lao động: ${formatNumberWithDots(report.totalEmployees || 0)} người. Trong đó nữ: ${formatNumberWithDots(report.femaleEmployees || 0)} người`, margin, startY + 12);
  doc.text(`4. Tổng quỹ lương: ${formatNumberWithDots(report.totalPayroll || 0)} triệu đồng`, margin, startY + 18);

  // Table I Header building
  const tableHeaders = [
    [
      { content: "Tên chỉ tiêu thống kê", rowSpan: 3, styles: { halign: "left" as const, valign: "middle" as const } },
      { content: "Mã số", rowSpan: 3, styles: { halign: "center" as const, valign: "middle" as const } },
      { content: "Phân loại TNLĐ theo mức độ thương tật", colSpan: 11, styles: { halign: "center" as const } }
    ],
    [
      { content: "Số vụ (Vụ)", colSpan: 3, styles: { halign: "center" as const } },
      { content: "Số người bị nạn (Người)", colSpan: 8, styles: { halign: "center" as const } }
    ],
    [
      { content: "Tổng số" },
      { content: "Vụ có người chết" },
      { content: "Vụ có ≥2 người" },

      { content: "Tổng số" },
      { content: "Không thuộc QL" },

      { content: "Tổng số" },
      { content: "Không thuộc QL" },

      { content: "Tổng số" },
      { content: "Không thuộc QL" },

      { content: "Tổng số" },
      { content: "Không thuộc QL" }
    ],
    [
      { content: "" },
      { content: "" },
      { content: "", colSpan: 3 },
      { content: "Tổng số", colSpan: 2 },
      { content: "Số LD nữ", colSpan: 2 },
      { content: "Số người chết", colSpan: 2 },
      { content: "Số người thương nặng", colSpan: 2 }
    ]
  ];

  // Table I rows calculation
  const tableRows: any[] = [];

  // 1. Tai nan lao dong
  tableRows.push([
    { content: "1. Tai nạn lao động", styles: { fontStyle: "bold" } },
    "",
    formatNumberWithDots(sumBlocks(report, "tongSoVu")),
    formatNumberWithDots(sumBlocks(report, "soVuCoNguoiChet")),
    formatNumberWithDots(sumBlocks(report, "soVuHaiNguoiTroLen")),
    formatNumberWithDots(sumBlocks(report, "tongSoNguoiBiNan")),
    formatNumberWithDots(sumBlocks(report, "soNguoiBiNanKhongQL")),
    formatNumberWithDots(sumBlocks(report, "soLaoDongNuBiNan")),
    formatNumberWithDots(sumBlocks(report, "laoDongNuBiNanKhongQL")),
    formatNumberWithDots(sumBlocks(report, "soNguoiChet")),
    formatNumberWithDots(sumBlocks(report, "soNguoiChetKhongQL")),
    formatNumberWithDots(sumBlocks(report, "soNguoiThuongNang")),
    formatNumberWithDots(sumBlocks(report, "soNguoiThuongNangKhongQL"))
  ]);

  // 1.1 Phân theo nguyên nhân
  const hasCauseA = CAUSE_CATEGORIES.slice(0, 6).some(title => !isCauseRowEmpty(report, title));
  const hasCauseB = CAUSE_CATEGORIES.slice(6, 9).some(title => !isCauseRowEmpty(report, title));

  if (hasCauseA || hasCauseB) {
    tableRows.push([
      { content: "1.1. Phân theo nguyên nhân xảy ra TNLĐ", colSpan: 13, styles: { fontStyle: "bold" } }
    ]);
  }

  if (hasCauseA) {
    tableRows.push([
      { content: "a. Do người sử dụng lao động", colSpan: 13, styles: { fontStyle: "bold", cellPadding: { left: 4 } } }
    ]);
    CAUSE_CATEGORIES.slice(0, 6).forEach((cause, idx) => {
      if (isCauseRowEmpty(report, cause)) return;
      tableRows.push([
        { content: cause, styles: { cellPadding: { left: 6 } } },
        String(idx + 1),
        formatNumberWithDots(sumBlocksByCause(report, cause, "tongSoVu")),
        formatNumberWithDots(sumBlocksByCause(report, cause, "soVuCoNguoiChet")),
        formatNumberWithDots(sumBlocksByCause(report, cause, "soVuHaiNguoiTroLen")),
        formatNumberWithDots(sumBlocksByCause(report, cause, "tongSoNguoiBiNan")),
        formatNumberWithDots(sumBlocksByCause(report, cause, "soNguoiBiNanKhongQL")),
        formatNumberWithDots(sumBlocksByCause(report, cause, "soLaoDongNuBiNan")),
        formatNumberWithDots(sumBlocksByCause(report, cause, "laoDongNuBiNanKhongQL")),
        formatNumberWithDots(sumBlocksByCause(report, cause, "soNguoiChet")),
        formatNumberWithDots(sumBlocksByCause(report, cause, "soNguoiChetKhongQL")),
        formatNumberWithDots(sumBlocksByCause(report, cause, "soNguoiThuongNang")),
        formatNumberWithDots(sumBlocksByCause(report, cause, "soNguoiThuongNangKhongQL"))
      ]);
    });
  }

  if (hasCauseB) {
    tableRows.push([
      { content: "b. Do người lao động", colSpan: 13, styles: { fontStyle: "bold", cellPadding: { left: 4 } } }
    ]);
    CAUSE_CATEGORIES.slice(6, 9).forEach((cause, idx) => {
      if (isCauseRowEmpty(report, cause)) return;
      tableRows.push([
        { content: cause, styles: { cellPadding: { left: 6 } } },
        String(idx + 7),
        formatNumberWithDots(sumBlocksByCause(report, cause, "tongSoVu")),
        formatNumberWithDots(sumBlocksByCause(report, cause, "soVuCoNguoiChet")),
        formatNumberWithDots(sumBlocksByCause(report, cause, "soVuHaiNguoiTroLen")),
        formatNumberWithDots(sumBlocksByCause(report, cause, "tongSoNguoiBiNan")),
        formatNumberWithDots(sumBlocksByCause(report, cause, "soNguoiBiNanKhongQL")),
        formatNumberWithDots(sumBlocksByCause(report, cause, "soLaoDongNuBiNan")),
        formatNumberWithDots(sumBlocksByCause(report, cause, "laoDongNuBiNanKhongQL")),
        formatNumberWithDots(sumBlocksByCause(report, cause, "soNguoiChet")),
        formatNumberWithDots(sumBlocksByCause(report, cause, "soNguoiChetKhongQL")),
        formatNumberWithDots(sumBlocksByCause(report, cause, "soNguoiThuongNang")),
        formatNumberWithDots(sumBlocksByCause(report, cause, "soNguoiThuongNangKhongQL"))
      ]);
    });
  }

  // 1.2 Phân theo yếu tố
  const hasFactors = FACTOR_CATEGORIES.some(factor => !isFactorRowEmpty(report, factor));
  if (hasFactors) {
    tableRows.push([
      { content: "1.2. Phân theo yếu tố gây chấn thương", colSpan: 13, styles: { fontStyle: "bold" } }
    ]);
    FACTOR_CATEGORIES.forEach((factor, idx) => {
      if (isFactorRowEmpty(report, factor)) return;
      tableRows.push([
        { content: factor, styles: { cellPadding: { left: 6 } } },
        String(101 + idx),
        formatNumberWithDots(sumBlocksByFactor(report, factor, "tongSoVu")),
        formatNumberWithDots(sumBlocksByFactor(report, factor, "soVuCoNguoiChet")),
        formatNumberWithDots(sumBlocksByFactor(report, factor, "soVuHaiNguoiTroLen")),
        formatNumberWithDots(sumBlocksByFactor(report, factor, "tongSoNguoiBiNan")),
        formatNumberWithDots(sumBlocksByFactor(report, factor, "soNguoiBiNanKhongQL")),
        formatNumberWithDots(sumBlocksByFactor(report, factor, "soLaoDongNuBiNan")),
        formatNumberWithDots(sumBlocksByFactor(report, factor, "laoDongNuBiNanKhongQL")),
        formatNumberWithDots(sumBlocksByFactor(report, factor, "soNguoiChet")),
        formatNumberWithDots(sumBlocksByFactor(report, factor, "soNguoiChetKhongQL")),
        formatNumberWithDots(sumBlocksByFactor(report, factor, "soNguoiThuongNang")),
        formatNumberWithDots(sumBlocksByFactor(report, factor, "soNguoiThuongNangKhongQL"))
      ]);
    });
  }

  // 1.3 Phân theo nghề nghiệp
  const hasJobs = JOB_CATEGORIES.some(job => !isJobRowEmpty(report, job));
  if (hasJobs) {
    tableRows.push([
      { content: "1.3. Phân theo nghề nghiệp", colSpan: 13, styles: { fontStyle: "bold" } }
    ]);
    JOB_CATEGORIES.forEach((job, idx) => {
      if (isJobRowEmpty(report, job)) return;
      tableRows.push([
        { content: job, styles: { cellPadding: { left: 6 } } },
        String(102 + idx),
        formatNumberWithDots(sumBlocksByJob(report, job, "tongSoVu")),
        formatNumberWithDots(sumBlocksByJob(report, job, "soVuCoNguoiChet")),
        formatNumberWithDots(sumBlocksByJob(report, job, "soVuHaiNguoiTroLen")),
        formatNumberWithDots(sumBlocksByJob(report, job, "tongSoNguoiBiNan")),
        formatNumberWithDots(sumBlocksByJob(report, job, "soNguoiBiNanKhongQL")),
        formatNumberWithDots(sumBlocksByJob(report, job, "soLaoDongNuBiNan")),
        formatNumberWithDots(sumBlocksByJob(report, job, "laoDongNuBiNanKhongQL")),
        formatNumberWithDots(sumBlocksByJob(report, job, "soNguoiChet")),
        formatNumberWithDots(sumBlocksByJob(report, job, "soNguoiChetKhongQL")),
        formatNumberWithDots(sumBlocksByJob(report, job, "soNguoiThuongNang")),
        formatNumberWithDots(sumBlocksByJob(report, job, "soNguoiThuongNangKhongQL"))
      ]);
    });
  }

  // 2. Tai nan duoc huong tro cap
  const isSection2Empty = [
    Number(report.tc_tongSoVu || 0),
    Number(report.tc_soVuCoNguoiChet || 0),
    Number(report.tc_soVuHaiNguoiTroLen || 0),
    Number(report.tc_tongSoNguoiBiNan || 0),
    Number(report.tc_soNguoiBiNanKhongQL || 0),
    Number(report.tc_soLaoDongNuBiNan || 0),
    Number(report.tc_laoDongNuBiNanKhongQL || 0),
    Number(report.tc_soNguoiChet || 0),
    Number(report.tc_soNguoiChetKhongQL || 0),
    Number(report.tc_soNguoiThuongNang || 0),
    Number(report.tc_soNguoiThuongNangKhongQL || 0)
  ].every(val => val === 0);

  if (!isSection2Empty) {
    tableRows.push([
      { content: "2. Tai nạn được hưởng trợ cấp theo Khoản 2 Điều 39 Luật ATVSLĐ", colSpan: 13, styles: { fontStyle: "bold" } }
    ]);
    tableRows.push([
      { content: "Tai nạn được hưởng trợ cấp", styles: { cellPadding: { left: 6 } } },
      "10",
      formatNumberWithDots(report.tc_tongSoVu || 0),
      formatNumberWithDots(report.tc_soVuCoNguoiChet || 0),
      formatNumberWithDots(report.tc_soVuHaiNguoiTroLen || 0),
      formatNumberWithDots(report.tc_tongSoNguoiBiNan || 0),
      formatNumberWithDots(report.tc_soNguoiBiNanKhongQL || 0),
      formatNumberWithDots(report.tc_soLaoDongNuBiNan || 0),
      formatNumberWithDots(report.tc_laoDongNuBiNanKhongQL || 0),
      formatNumberWithDots(report.tc_soNguoiChet || 0),
      formatNumberWithDots(report.tc_soNguoiChetKhongQL || 0),
      formatNumberWithDots(report.tc_soNguoiThuongNang || 0),
      formatNumberWithDots(report.tc_soNguoiThuongNangKhongQL || 0)
    ]);
  }

  // 3. Tong so (3 = 1 + 2)
  tableRows.push([
    { content: "3. Tổng số (3 = 1 + 2)", colSpan: 13, styles: { fontStyle: "bold" } }
  ]);
  tableRows.push([
    { content: "Tổng số (3=1+2)", styles: { fontStyle: "bold", cellPadding: { left: 6 } } },
    "-",
    formatNumberWithDots(sumCol(report, "tongSoVu", "tc_tongSoVu")),
    formatNumberWithDots(sumCol(report, "soVuCoNguoiChet", "tc_soVuCoNguoiChet")),
    formatNumberWithDots(sumCol(report, "soVuHaiNguoiTroLen", "tc_soVuHaiNguoiTroLen")),
    formatNumberWithDots(sumCol(report, "tongSoNguoiBiNan", "tc_tongSoNguoiBiNan")),
    formatNumberWithDots(sumCol(report, "soNguoiBiNanKhongQL", "tc_soNguoiBiNanKhongQL")),
    formatNumberWithDots(sumCol(report, "soLaoDongNuBiNan", "tc_soLaoDongNuBiNan")),
    formatNumberWithDots(sumCol(report, "laoDongNuBiNanKhongQL", "tc_laoDongNuBiNanKhongQL")),
    formatNumberWithDots(sumCol(report, "soNguoiChet", "tc_soNguoiChet")),
    formatNumberWithDots(sumCol(report, "soNguoiChetKhongQL", "tc_soNguoiChetKhongQL")),
    formatNumberWithDots(sumCol(report, "soNguoiThuongNang", "tc_soNguoiThuongNang")),
    formatNumberWithDots(sumCol(report, "soNguoiThuongNangKhongQL", "tc_soNguoiThuongNangKhongQL"))
  ]);

  // Render Table I
  (doc as any).autoTable({
    startY: startY + 24,
    head: tableHeaders,
    body: tableRows,
    theme: "striped",
    styles: {
      font: "Roboto",
      fontSize: PDF_FONT.TABLE_BODY,
      cellPadding: 1.2,
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      halign: "center",
      valign: "middle"
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [50, 50, 50],
      fontStyle: "bold",
      fontSize: PDF_FONT.TABLE_HEAD,
      lineWidth: 0.1,
      lineColor: [200, 200, 200]
    },
    columnStyles: {
      0: { halign: "left", width: 48 },
      1: { width: 8 }
    },
    margin: { left: margin, right: margin }
  });

  const nextY = (doc as any).lastAutoTable.finalY + 10;

  // Check if we need a new page for Table II
  const pageH = doc.internal.pageSize.getHeight();
  if (nextY + 60 > pageH) {
    doc.addPage();
  }
  const table2StartY = (nextY + 60 > pageH) ? 20 : nextY;

  // Header of Table II
  doc.setFont("Roboto", "bold");
  doc.setFontSize(PDF_FONT.SECTION_TITLE);
  doc.text("II. Thiệt hại do tai nạn lao động", margin, table2StartY);

  const tableIIHeaders = [
    [
      { content: "Tổng số ngày nghỉ vì tai nạn lao động (kể cả ngày nghỉ chế độ)", rowSpan: 3, styles: { halign: "left" as const, valign: "middle" as const } },
      { content: "Chi phí tính bằng tiền (1.000 đồng)", colSpan: 4, styles: { halign: "center" as const } },
      { content: "Thiệt hại tài sản (1.000 đồng)", rowSpan: 3, styles: { halign: "center" as const, valign: "middle" as const } }
    ],
    [
      { content: "Tổng số", rowSpan: 2, styles: { halign: "center" as const, valign: "middle" as const } },
      { content: "Khoản chi cụ thể của cơ sở", colSpan: 3, styles: { halign: "center" as const } }
    ],
    [
      { content: "Y tế", styles: { halign: "center" as const } },
      { content: "Trả lương trong thời gian điều trị", styles: { halign: "center" as const } },
      { content: "Bồi thường, trợ cấp", styles: { halign: "center" as const } }
    ]
  ];

  const tableIIRows = [
    [
      formatNumberWithDots(report.soNgayNghi || 0),
      formatNumberWithDots(report.tongChiPhi || 0),
      formatNumberWithDots(report.chiPhiYTe || 0),
      formatNumberWithDots(report.chiPhiLuong || 0),
      formatNumberWithDots(report.chiPhiBoiThuong || 0),
      formatNumberWithDots(report.thietHaiTaiSan || 0)
    ]
  ];

  // Render Table II
  (doc as any).autoTable({
    startY: table2StartY + 4,
    head: tableIIHeaders,
    body: tableIIRows,
    theme: "striped",
    styles: {
      font: "Roboto",
      fontSize: PDF_FONT.TABLE_II_BODY,
      cellPadding: 2,
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      halign: "center",
      valign: "middle"
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [50, 50, 50],
      fontStyle: "bold",
      fontSize: PDF_FONT.TABLE_II_HEAD,
      lineWidth: 0.1,
      lineColor: [200, 200, 200]
    },
    columnStyles: {
      0: { halign: "center", width: 55 }
    },
    margin: { left: margin, right: margin }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 14;

  // Check if signature block needs new page
  if (finalY + 50 > pageH) {
    doc.addPage();
  }
  const signStartY = (finalY + 50 > pageH) ? 20 : finalY;

  // Signature Block
  const curDate = report.updatedAt ? new Date(report.updatedAt) : new Date();
  const dateStr = `Hà Nội, ngày ${curDate.getDate()} tháng ${curDate.getMonth() + 1} năm ${curDate.getFullYear()}`;

  doc.setFont("Roboto", "normal");
  doc.setFontSize(PDF_FONT.DATE);
  doc.text(dateStr, pageW - margin - 5, signStartY, { align: "right" });
  doc.setFont("Roboto", "bold");
  doc.setFontSize(PDF_FONT.SIGN_TITLE);
  doc.text("ĐẠI DIỆN NGƯỜI SỬ DỤNG LAO ĐỘNG", pageW - margin - 5, signStartY + 7, { align: "right" });
  doc.setFont("Roboto", "normal");
  doc.setFontSize(PDF_FONT.SIGN_SUB);
  doc.text("(Ký, ghi rõ họ tên, chức vụ, đóng dấu)", pageW - margin - 5, signStartY + 13, { align: "right" });

  doc.setFont("Roboto", "bold");
  doc.setFontSize(PDF_FONT.SIGN_NAME);
  doc.text(profile.representativeName || "-", pageW - margin - 5, signStartY + 34, { align: "right" });

  // Save and trigger download
  const filename = `BaoCao_TNLD_${report.year || curDate.getFullYear()}_${profile.taxCode || "unknown"}.pdf`;
  doc.save(filename);
};

// Font size constant for Word (in half-points) - 12pt = 24 half-points
// Font size constant for Word (in half-points) - 12pt = 24 half-points
// Helper function to infer district code for Da Nang districts or via Online API
const inferDistrictCode = async (province: string, districtName: string): Promise<string> => {
  const normDistrict = (districtName || "").toLowerCase().trim();
  if (!normDistrict) return "";

  // Da Nang Local Fallback Mapping
  if (normDistrict.includes("hải châu")) return "0490";
  if (normDistrict.includes("thanh khê")) return "0491";
  if (normDistrict.includes("sơn trà")) return "0492";
  if (normDistrict.includes("ngũ hành sơn")) return "0493";
  if (normDistrict.includes("liên chiểu")) return "0494";
  if (normDistrict.includes("cẩm lệ")) return "0495";
  if (normDistrict.includes("hòa vang")) return "0497";
  if (normDistrict.includes("hoàng sa")) return "0498";

  // General Online API Fetch
  try {
    const provsRes = await fetch("https://provinces.open-api.vn/api/v2/p/");
    if (provsRes.ok) {
      const provinces = await provsRes.json();
      const normProvince = (province || "").toLowerCase().trim();
      const matchProv = provinces.find((pr: any) =>
        pr.name.toLowerCase().includes(normProvince) || normProvince.includes(pr.name.toLowerCase())
      );
      if (matchProv) {
        const distsRes = await fetch(`https://provinces.open-api.vn/api/v2/p/${matchProv.code}?depth=2`);
        if (distsRes.ok) {
          const distData = await distsRes.json();
          const list = distData?.wards || [];
          const matchDist = list.find((di: any) =>
            di.name.toLowerCase().includes(normDistrict) || normDistrict.includes(di.name.toLowerCase())
          );
          if (matchDist) {
            return String(matchDist.code).padStart(4, "0");
          }
        }
      }
    }
  } catch (e) {
    console.error("Online district query failed:", e);
  }
  return "";
};

// Helper function to map business type strings to 4-digit codes
const getBusinessTypeSeqCode = (typeStr: string): string => {
  const normalized = typeStr?.toLowerCase().trim() || "";
  if (normalized.includes("cổ phần")) return "1100";
  if (normalized.includes("1 thành viên") || normalized.includes("một thành viên")) return "1201";
  if (normalized.includes("2 thành viên") || normalized.includes("hai thành viên")) return "1202";
  if (normalized.includes("tnhh") || normalized.includes("trách nhiệm hữu hạn")) return "1200";
  if (normalized.includes("hợp danh")) return "1300";
  if (normalized.includes("tư nhân")) return "1400";
  if (normalized.includes("hộ kinh doanh")) return "1500";
  if (normalized.includes("hợp tác xã")) return "1600";
  if (normalized.includes("chi nhánh")) return "1700";
  return "";
};

// Helper function to map industry code or parse it to 4-digit code
const getIndustrySeqCode = (code: string, name: string): string => {
  if (code && code.trim()) {
    const digits = code.replace(/\D/g, "");
    if (digits.length > 0) {
      return digits.padEnd(4, "0").substring(0, 4);
    }
  }
  const n = name?.toLowerCase() || "";
  if (n.includes("xây dựng")) return "4100";
  if (n.includes("cơ khí") || n.includes("chế tạo")) return "2500";
  if (n.includes("vận tải") || n.includes("logistics")) return "4900";
  if (n.includes("dệt") || n.includes("may")) return "1300";
  if (n.includes("thương mại") || n.includes("bán buôn") || n.includes("bán lẻ")) return "4600";
  if (n.includes("công nghệ") || n.includes("phần mềm") || n.includes("it")) return "6200";
  if (n.includes("y tế") || n.includes("bệnh viện")) return "8600";
  if (n.includes("giáo dục") || n.includes("trường học") || n.includes("đào tạo")) return "8500";
  return "";
};

// Helper function to create line with code boxes (table)
const createLineWithCodeBoxes = (
  leftLabel: string,
  leftValue: string,
  rightLabel: string,
  code: string,
  colWidths: { left: number; mid: number; cell: number }
) => {
  const cleanCode = (code || "").replace(/\D/g, "");
  const padded = cleanCode.padEnd(4, " ").substring(0, 4);

  const cellBorders = {
    top: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
    bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
    left: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
    right: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
  };

  const noBorders = {
    top: { style: BorderStyle.NONE },
    bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE },
  };

  const cellMargins = {
    top: 80,
    bottom: 80,
    left: 80,
    right: 80,
  };

  return new Table({
    width: { size: 85, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: colWidths.left, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: [
              new Paragraph({
                spacing: { before: 0, after: 0, line: 240 },
                children: [
                  new TextRun({ text: leftLabel, size: DOCX_SIZE.BODY }),
                  new TextRun({ text: leftValue, bold: true, size: DOCX_SIZE.BODY }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: colWidths.mid, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 0, after: 0, line: 240 },
                children: [
                  new TextRun({ text: rightLabel, size: DOCX_SIZE.BODY }),
                ],
              }),
            ],
          }),
          ...Array.from(padded).map(
            (char) =>
              new TableCell({
                width: { size: colWidths.cell, type: WidthType.PERCENTAGE },
                borders: cellBorders,
                margins: cellMargins,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 0 },
                    children: [
                      new TextRun({
                        text: char,
                        bold: true,
                        size: DOCX_SIZE.BODY,
                      }),
                    ],
                  }),
                ],
              })
          ),
        ],
      }),
    ],
  });
};

// Font size constant for Word (in half-points) - 12pt = 24 half-points
const DOCX_SIZE = {
  BODY: 24,          // 12pt - standard body text
  TITLE: 28,         // 14pt - main title
  SUBTITLE: 24,      // 12pt - subtitle
  HEADER_INFO: 24,   // 12pt - company info
  TABLE_HEAD: 18,    // 9pt - table headers
  TABLE_BODY: 20,    // 10pt - table body data
  APPENDIX: 28,      // 14pt - appendix label
  APPENDIX_SUB: 24,  // 12pt - appendix subtitle (italics)
  SECTION_TITLE: 24, // 12pt - section titles
  SIGN_TITLE: 24,    // 12pt - signature title
  SIGN_SUB: 20,      // 10pt - signature subtitle (italics)
  SIGN_NAME: 24,     // 12pt - signer name
  DATE: 24           // 12pt - date text
};

export const exportReportDocx = async (rawReport: any, profile: any) => {
  const report = normalizeReportData(rawReport);
  const p = profile || {};
  const curDate = report.updatedAt ? new Date(report.updatedAt) : new Date();
  const dateStr = `Hà Nội, ngày ${curDate.getDate()} tháng ${curDate.getMonth() + 1} năm ${curDate.getFullYear()}`;
  const appendixText = report.period === "Cả năm" ? "PHỤ LỤC XIII" : "PHỤ LỤC XII";

  // Infer codes dynamically
  const districtCode = await inferDistrictCode(p.provinceCity, p.wardCommune);

  const bizTypeCode = getBusinessTypeSeqCode(p.businessType);

  const industryCodeValue = getIndustrySeqCode(p.industryCode, p.industryName || p.industry);

  // Re-calculate visibility helpers for Word document
  const hasCauseA = CAUSE_CATEGORIES.slice(0, 6).some(title => !isCauseRowEmpty(report, title));
  const hasCauseB = CAUSE_CATEGORIES.slice(6, 9).some(title => !isCauseRowEmpty(report, title));
  const hasFactors = FACTOR_CATEGORIES.some(factor => !isFactorRowEmpty(report, factor));
  const hasJobs = JOB_CATEGORIES.some(job => !isJobRowEmpty(report, job));

  const isSection2Empty = [
    Number(report.tc_tongSoVu || 0),
    Number(report.tc_soVuCoNguoiChet || 0),
    Number(report.tc_soVuHaiNguoiTroLen || 0),
    Number(report.tc_tongSoNguoiBiNan || 0),
    Number(report.tc_soNguoiBiNanKhongQL || 0),
    Number(report.tc_soLaoDongNuBiNan || 0),
    Number(report.tc_laoDongNuBiNanKhongQL || 0),
    Number(report.tc_soNguoiChet || 0),
    Number(report.tc_soNguoiChetKhongQL || 0),
    Number(report.tc_soNguoiThuongNang || 0),
    Number(report.tc_soNguoiThuongNangKhongQL || 0)
  ].every(val => val === 0);

  // Column widths definition for 13 columns of Table I (Must sum to exactly 100)
  const colWidths = [
    { size: 25, type: WidthType.PERCENTAGE },  // Col 1: Tên chỉ tiêu thống kê
    { size: 5, type: WidthType.PERCENTAGE },   // Col 2: Mã số
    { size: 6, type: WidthType.PERCENTAGE },   // Col 3: Số vụ - Tổng số
    { size: 6, type: WidthType.PERCENTAGE },   // Col 4: Số vụ - Có người chết
    { size: 6, type: WidthType.PERCENTAGE },   // Col 5: Số vụ - Có >= 2 người
    { size: 6.5, type: WidthType.PERCENTAGE }, // Col 6: Số người - Tổng số - Tổng số
    { size: 6.5, type: WidthType.PERCENTAGE }, // Col 7: Số người - Tổng số - Không thuộc QL
    { size: 6.5, type: WidthType.PERCENTAGE }, // Col 8: Số người - LĐ nữ - Tổng số
    { size: 6.5, type: WidthType.PERCENTAGE }, // Col 9: Số người - LĐ nữ - Không thuộc QL
    { size: 6.5, type: WidthType.PERCENTAGE }, // Col 10: Số người - Chết - Tổng số
    { size: 6.5, type: WidthType.PERCENTAGE }, // Col 11: Số người - Chết - Không thuộc QL
    { size: 6.5, type: WidthType.PERCENTAGE }, // Col 12: Số người - Thương nặng - Tổng số
    { size: 6.5, type: WidthType.PERCENTAGE }  // Col 13: Số người - Thương nặng - Không thuộc QL
  ];

  // Table I borders styling
  const tableBorders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "000000" }
  };

  // Helper function to create a cell with exact width for Table I
  const createDataRow = (title: string, code: string, values: (number | string)[], isBold = false) => {
    return new TableRow({
      children: [
        new TableCell({
          width: colWidths[0],
          children: [new Paragraph({ children: [new TextRun({ text: title, bold: isBold, size: DOCX_SIZE.TABLE_BODY })] })]
        }),
        new TableCell({
          width: colWidths[1],
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: code, bold: isBold, size: DOCX_SIZE.TABLE_BODY })] })]
        }),
        ...values.map((val, idx) => new TableCell({
          width: colWidths[idx + 2],
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(val), bold: isBold, size: DOCX_SIZE.TABLE_BODY })] })]
        }))
      ]
    });
  };

  // Helper function to create spanned row for Table I
  const createSpannedRow = (text: string, isBold = true, isItalic = false) => {
    return new TableRow({
      children: [
        new TableCell({
          columnSpan: 13,
          width: { size: 100, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: text, bold: isBold, italics: isItalic, size: DOCX_SIZE.TABLE_BODY })
              ]
            })
          ]
        })
      ]
    });
  };

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
            size: DOCX_SIZE.BODY,
            color: "000000"
          },
          paragraph: {
            spacing: {
              line: 240, // Single spacing (1.0)
              before: 0,
              after: 80  // Space after paragraphs
            }
          }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906,  // A4 Portrait Width (21cm) -> docx will swap this to 16838 for Landscape orientation
              height: 16838, // A4 Portrait Height (29.7cm) -> docx will swap this to 11906 for Landscape orientation
              orientation: PageOrientation.LANDSCAPE
            },
            margin: {
              top: 850,    // 1.5 cm
              bottom: 850, // 1.5 cm
              left: 567,   // 1.0 cm
              right: 567   // 1.0 cm
            }
          }
        },
        children: [
          // Appendix headers (centered, Times New Roman, bold / italic)
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: appendixText, bold: true, size: DOCX_SIZE.APPENDIX })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "MẪU BÁO CÁO TỔNG HỢP TÌNH HÌNH TAI NẠN LAO ĐỘNG CẤP CƠ SỞ",
                bold: true,
                size: DOCX_SIZE.APPENDIX
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "(Kèm theo Nghị định số 39/2016/NĐ-CP ngày 15 tháng 5 năm 2016 của Chính phủ)",
                size: DOCX_SIZE.APPENDIX_SUB,
                italics: true
              })
            ]
          }),

          new Paragraph({ text: "", spacing: { before: 120, after: 120 } }),

          // Company Information Block (Direct auto-filled fields)
          new Paragraph({
            children: [
              new TextRun({ text: "Đơn vị báo cáo (ghi tên cơ sở): ", size: DOCX_SIZE.BODY }),
              new TextRun({ text: p.businessName || ".........................................................................", bold: true, size: DOCX_SIZE.BODY })
            ]
          }),
          createLineWithCodeBoxes(
            "Địa chỉ: ",
            p.address || ".........................................................................",
            "    Mã huyện, quận¹: ",
            districtCode,
            { left: 55, mid: 25, cell: 5 }
          ),

          new Paragraph({ text: "", spacing: { before: 120, after: 120 } }),

          // Center Report Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "BÁO CÁO TỔNG HỢP TÌNH HÌNH TAI NẠN LAO ĐỘNG", bold: true, size: DOCX_SIZE.TITLE })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Kỳ báo cáo (6 tháng hoặc cả năm): ${report.period || "................"} năm ${report.year || "...."}`,
                bold: true,
                size: DOCX_SIZE.SUBTITLE
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `Ngày báo cáo: ${curDate.getDate()}/${curDate.getMonth() + 1}/${curDate.getFullYear()}`, size: DOCX_SIZE.DATE, italics: true })
            ],
            spacing: { after: 240 }
          }),

          // Metadata Fields (Auto-filled + Auto-inferred codes)
          createLineWithCodeBoxes(
            "Thuộc loại hình cơ sở² (doanh nghiệp): ",
            p.businessType || "................................................",
            "    Mã loại hình: ",
            bizTypeCode,
            { left: 55, mid: 25, cell: 5 }
          ),
          new Paragraph({
            children: [
              new TextRun({ text: "Đơn vị nhận báo cáo: ", size: DOCX_SIZE.BODY }),
              new TextRun({ text: "Sở Lao động - Thương binh và Xã hội", bold: true, size: DOCX_SIZE.BODY })
            ]
          }),
          createLineWithCodeBoxes(
            "Lĩnh vực sản xuất chính của cơ sở: ",
            p.industryName || p.industry || "................................................",
            "³    Mã lĩnh vực: ",
            industryCodeValue,
            { left: 55, mid: 25, cell: 5 }
          ),
          new Paragraph({
            children: [
              new TextRun({ text: "Tổng số lao động của cơ sở: ", size: DOCX_SIZE.BODY }),
              new TextRun({ text: formatNumberWithDots(report.totalEmployees || 0), bold: true, size: DOCX_SIZE.BODY }),
              new TextRun({ text: " người, trong đó nữ: ", size: DOCX_SIZE.BODY }),
              new TextRun({ text: formatNumberWithDots(report.femaleEmployees || 0), bold: true, size: DOCX_SIZE.BODY }),
              new TextRun({ text: " người", size: DOCX_SIZE.BODY })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Tổng quỹ lương: ", size: DOCX_SIZE.BODY }),
              new TextRun({ text: formatNumberWithDots(report.totalPayroll || 0), bold: true, size: DOCX_SIZE.BODY }),
              new TextRun({ text: " triệu đồng", size: DOCX_SIZE.BODY })
            ],
            spacing: { after: 240 }
          }),

          // Table I Title
          new Paragraph({
            children: [
              new TextRun({ text: "I. Tình hình chung tai nạn lao động", bold: true, size: DOCX_SIZE.SECTION_TITLE })
            ],
            spacing: { after: 120 }
          }),

          // Build Table I
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorders,
            rows: [
              // Row 1
              new TableRow({
                children: [
                  new TableCell({
                    rowSpan: 4,
                    width: colWidths[0],
                    verticalAlign: VerticalAlign.CENTER,
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Tên chỉ tiêu thống kê", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                  }),
                  new TableCell({
                    rowSpan: 4,
                    width: colWidths[1],
                    verticalAlign: VerticalAlign.CENTER,
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Mã số", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                  }),
                  new TableCell({
                    columnSpan: 11,
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Phân loại TNLĐ theo mức độ thương tật", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                  })
                ]
              }),
              // Row 2
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 3,
                    width: { size: 18, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Số vụ (Vụ)", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                  }),
                  new TableCell({
                    columnSpan: 8,
                    width: { size: 52, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Số người bị nạn (Người)", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                  })
                ]
              }),
              // Row 3
              new TableRow({
                children: [
                  new TableCell({
                    rowSpan: 2,
                    width: colWidths[2],
                    verticalAlign: VerticalAlign.CENTER,
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Tổng số", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                  }),
                  new TableCell({
                    rowSpan: 2,
                    width: colWidths[3],
                    verticalAlign: VerticalAlign.CENTER,
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Số vụ có người chết", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                  }),
                  new TableCell({
                    rowSpan: 2,
                    width: colWidths[4],
                    verticalAlign: VerticalAlign.CENTER,
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Số vụ có từ 2 người bị nạn trở lên", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                  }),
                  new TableCell({
                    columnSpan: 2,
                    width: { size: 13, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Tổng số", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                  }),
                  new TableCell({
                    columnSpan: 2,
                    width: { size: 13, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Số LĐ nữ", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                  }),
                  new TableCell({
                    columnSpan: 2,
                    width: { size: 13, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Số người chết", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                  }),
                  new TableCell({
                    columnSpan: 2,
                    width: { size: 13, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Số người bị thương nặng", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                  })
                ]
              }),
              // Row 4
              new TableRow({
                children: [
                  new TableCell({
                    width: colWidths[5],
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Tổng số", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                  }),
                  new TableCell({
                    width: colWidths[6],
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Nạn nhân không thuộc quyền quản lý", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                  }),
                  new TableCell({
                    width: colWidths[7],
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Tổng số", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                  }),
                  new TableCell({
                    width: colWidths[8],
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Nạn nhân không thuộc quyền quản lý", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                  }),
                  new TableCell({
                    width: colWidths[9],
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Tổng số", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                  }),
                  new TableCell({
                    width: colWidths[10],
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Nạn nhân không thuộc quyền quản lý", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                  }),
                  new TableCell({
                    width: colWidths[11],
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Tổng số", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                  }),
                  new TableCell({
                    width: colWidths[12],
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Nạn nhân không thuộc quyền quản lý", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                  })
                ]
              }),
              // Row 5 (Numbers row)
              new TableRow({
                children: Array.from({ length: 13 }, (_, i) => (
                  new TableCell({
                    width: colWidths[i],
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(i + 1), bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                  })
                ))
              }),

              // Data rows mapped
              ...(() => {
                const rows = [];

                // 1. Tai nan lao dong Row
                rows.push(
                  createDataRow(
                    "1. Tai nạn lao động",
                    "",
                    [
                      sumBlocks(report, "tongSoVu"),
                      sumBlocks(report, "soVuCoNguoiChet"),
                      sumBlocks(report, "soVuHaiNguoiTroLen"),
                      sumBlocks(report, "tongSoNguoiBiNan"),
                      sumBlocks(report, "soNguoiBiNanKhongQL"),
                      sumBlocks(report, "soLaoDongNuBiNan"),
                      sumBlocks(report, "laoDongNuBiNanKhongQL"),
                      sumBlocks(report, "soNguoiChet"),
                      sumBlocks(report, "soNguoiChetKhongQL"),
                      sumBlocks(report, "soNguoiThuongNang"),
                      sumBlocks(report, "soNguoiThuongNangKhongQL")
                    ].map(formatNumberWithDots),
                    true
                  )
                );

                // 1.1 Phân theo nguyên nhân
                if (hasCauseA || hasCauseB) {
                  rows.push(createSpannedRow("1.1. Phân theo nguyên nhân xảy ra TNLĐ", true, false));
                }

                if (hasCauseA) {
                  rows.push(createSpannedRow("a. Do người sử dụng lao động", true, true));

                  CAUSE_CATEGORIES.slice(0, 6).forEach((cause, idx) => {
                    if (isCauseRowEmpty(report, cause)) return;
                    rows.push(
                      createDataRow(
                        `   - ${cause}`,
                        String(idx + 1),
                        [
                          sumBlocksByCause(report, cause, "tongSoVu"),
                          sumBlocksByCause(report, cause, "soVuCoNguoiChet"),
                          sumBlocksByCause(report, cause, "soVuHaiNguoiTroLen"),
                          sumBlocksByCause(report, cause, "tongSoNguoiBiNan"),
                          sumBlocksByCause(report, cause, "soNguoiBiNanKhongQL"),
                          sumBlocksByCause(report, cause, "soLaoDongNuBiNan"),
                          sumBlocksByCause(report, cause, "laoDongNuBiNanKhongQL"),
                          sumBlocksByCause(report, cause, "soNguoiChet"),
                          sumBlocksByCause(report, cause, "soNguoiChetKhongQL"),
                          sumBlocksByCause(report, cause, "soNguoiThuongNang"),
                          sumBlocksByCause(report, cause, "soNguoiThuongNangKhongQL")
                        ].map(formatNumberWithDots)
                      )
                    );
                  });
                }

                if (hasCauseB) {
                  rows.push(createSpannedRow("b. Do người lao động", true, true));

                  CAUSE_CATEGORIES.slice(6, 9).forEach((cause, idx) => {
                    if (isCauseRowEmpty(report, cause)) return;
                    rows.push(
                      createDataRow(
                        `   - ${cause}`,
                        String(idx + 7),
                        [
                          sumBlocksByCause(report, cause, "tongSoVu"),
                          sumBlocksByCause(report, cause, "soVuCoNguoiChet"),
                          sumBlocksByCause(report, cause, "soVuHaiNguoiTroLen"),
                          sumBlocksByCause(report, cause, "tongSoNguoiBiNan"),
                          sumBlocksByCause(report, cause, "soNguoiBiNanKhongQL"),
                          sumBlocksByCause(report, cause, "soLaoDongNuBiNan"),
                          sumBlocksByCause(report, cause, "laoDongNuBiNanKhongQL"),
                          sumBlocksByCause(report, cause, "soNguoiChet"),
                          sumBlocksByCause(report, cause, "soNguoiChetKhongQL"),
                          sumBlocksByCause(report, cause, "soNguoiThuongNang"),
                          sumBlocksByCause(report, cause, "soNguoiThuongNangKhongQL")
                        ].map(formatNumberWithDots)
                      )
                    );
                  });
                }

                // 1.2 Phân theo yếu tố
                if (hasFactors) {
                  rows.push(createSpannedRow("1.2. Phân theo yếu tố gây chấn thương", true, false));

                  FACTOR_CATEGORIES.forEach((factor, idx) => {
                    if (isFactorRowEmpty(report, factor)) return;
                    rows.push(
                      createDataRow(
                        `   - ${factor}`,
                        String(101 + idx),
                        [
                          sumBlocksByFactor(report, factor, "tongSoVu"),
                          sumBlocksByFactor(report, factor, "soVuCoNguoiChet"),
                          sumBlocksByFactor(report, factor, "soVuHaiNguoiTroLen"),
                          sumBlocksByFactor(report, factor, "tongSoNguoiBiNan"),
                          sumBlocksByFactor(report, factor, "soNguoiBiNanKhongQL"),
                          sumBlocksByFactor(report, factor, "soLaoDongNuBiNan"),
                          sumBlocksByFactor(report, factor, "laoDongNuBiNanKhongQL"),
                          sumBlocksByFactor(report, factor, "soNguoiChet"),
                          sumBlocksByFactor(report, factor, "soNguoiChetKhongQL"),
                          sumBlocksByFactor(report, factor, "soNguoiThuongNang"),
                          sumBlocksByFactor(report, factor, "soNguoiThuongNangKhongQL")
                        ].map(formatNumberWithDots)
                      )
                    );
                  });
                }

                // 1.3 Phân theo nghề nghiệp
                if (hasJobs) {
                  rows.push(createSpannedRow("1.3. Phân theo nghề nghiệp", true, false));

                  JOB_CATEGORIES.forEach((job, idx) => {
                    if (isJobRowEmpty(report, job)) return;
                    rows.push(
                      createDataRow(
                        `   - ${job}`,
                        String(102 + idx),
                        [
                          sumBlocksByJob(report, job, "tongSoVu"),
                          sumBlocksByJob(report, job, "soVuCoNguoiChet"),
                          sumBlocksByJob(report, job, "soVuHaiNguoiTroLen"),
                          sumBlocksByJob(report, job, "tongSoNguoiBiNan"),
                          sumBlocksByJob(report, job, "soNguoiBiNanKhongQL"),
                          sumBlocksByJob(report, job, "soLaoDongNuBiNan"),
                          sumBlocksByJob(report, job, "laoDongNuBiNanKhongQL"),
                          sumBlocksByJob(report, job, "soNguoiChet"),
                          sumBlocksByJob(report, job, "soNguoiChetKhongQL"),
                          sumBlocksByJob(report, job, "soNguoiThuongNang"),
                          sumBlocksByJob(report, job, "soNguoiThuongNangKhongQL")
                        ].map(formatNumberWithDots)
                      )
                    );
                  });
                }

                // 2. Tai nan duoc huong tro cap
                if (!isSection2Empty) {
                  rows.push(createSpannedRow("2. Tai nạn được hưởng trợ cấp theo Khoản 2 Điều 39 Luật ATVSLĐ", true, false));
                  rows.push(
                    createDataRow(
                      "   - Tai nạn được hưởng trợ cấp",
                      "10",
                      [
                        report.tc_tongSoVu || 0,
                        report.tc_soVuCoNguoiChet || 0,
                        report.tc_soVuHaiNguoiTroLen || 0,
                        report.tc_tongSoNguoiBiNan || 0,
                        report.tc_soNguoiBiNanKhongQL || 0,
                        report.tc_soLaoDongNuBiNan || 0,
                        report.tc_laoDongNuBiNanKhongQL || 0,
                        report.tc_soNguoiChet || 0,
                        report.tc_soNguoiChetKhongQL || 0,
                        report.tc_soNguoiThuongNang || 0,
                        report.tc_soNguoiThuongNangKhongQL || 0
                      ].map(formatNumberWithDots)
                    )
                  );
                }

                // 3. Tong so (3 = 1 + 2)
                rows.push(createSpannedRow("3. Tổng số (3 = 1 + 2)", true, false));
                rows.push(
                  createDataRow(
                    "   - Tổng số (3=1+2)",
                    "-",
                    [
                      sumCol(report, "tongSoVu", "tc_tongSoVu"),
                      sumCol(report, "soVuCoNguoiChet", "tc_soVuCoNguoiChet"),
                      sumCol(report, "soVuHaiNguoiTroLen", "tc_soVuHaiNguoiTroLen"),
                      sumCol(report, "tongSoNguoiBiNan", "tc_tongSoNguoiBiNan"),
                      sumCol(report, "soNguoiBiNanKhongQL", "tc_soNguoiBiNanKhongQL"),
                      sumCol(report, "soLaoDongNuBiNan", "tc_soLaoDongNuBiNan"),
                      sumCol(report, "laoDongNuBiNanKhongQL", "tc_laoDongNuBiNanKhongQL"),
                      sumCol(report, "soNguoiChet", "tc_soNguoiChet"),
                      sumCol(report, "soNguoiChetKhongQL", "tc_soNguoiChetKhongQL"),
                      sumCol(report, "soNguoiThuongNang", "tc_soNguoiThuongNang"),
                      sumCol(report, "soNguoiThuongNangKhongQL", "tc_soNguoiThuongNangKhongQL")
                    ].map(formatNumberWithDots),
                    true
                  )
                );

                return rows;
              })()
            ]
          }),

          new Paragraph({ text: "", spacing: { before: 180, after: 180 } }),

          // Table II Title
          new Paragraph({
            children: [
              new TextRun({ text: "II. Thiệt hại do tai nạn lao động", bold: true, size: DOCX_SIZE.SECTION_TITLE })
            ],
            spacing: { after: 120 }
          }),

          // Table II Build
          (() => {
            const colWidthsII = [
              { size: 20, type: WidthType.PERCENTAGE }, // Col 1: Tổng số ngày nghỉ...
              { size: 16, type: WidthType.PERCENTAGE }, // Col 2: Chi phí - Tổng số
              { size: 16, type: WidthType.PERCENTAGE }, // Col 3: Chi phí - Y tế
              { size: 16, type: WidthType.PERCENTAGE }, // Col 4: Chi phí - Lương điều trị
              { size: 16, type: WidthType.PERCENTAGE }, // Col 5: Chi phí - Bồi thường
              { size: 16, type: WidthType.PERCENTAGE }  // Col 6: Thiệt hại tài sản
            ];

            return new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: tableBorders,
              rows: [
                // Row 1
                new TableRow({
                  children: [
                    new TableCell({
                      rowSpan: 3,
                      width: colWidthsII[0],
                      verticalAlign: VerticalAlign.CENTER,
                      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Tổng số ngày nghỉ vì tai nạn lao động (kể cả ngày nghỉ chế độ)", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                    }),
                    new TableCell({
                      columnSpan: 4,
                      width: { size: 64, type: WidthType.PERCENTAGE },
                      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Chi phí tính bằng tiền (1.000 đ)", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                    }),
                    new TableCell({
                      rowSpan: 3,
                      width: colWidthsII[5],
                      verticalAlign: VerticalAlign.CENTER,
                      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Thiệt hại tài sản (1.000 đ)", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                    })
                  ]
                }),
                // Row 2
                new TableRow({
                  children: [
                    new TableCell({
                      rowSpan: 2,
                      width: colWidthsII[1],
                      verticalAlign: VerticalAlign.CENTER,
                      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Tổng số", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                    }),
                    new TableCell({
                      columnSpan: 3,
                      width: { size: 48, type: WidthType.PERCENTAGE },
                      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Khoản chi cụ thể của cơ sở", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                    })
                  ]
                }),
                // Row 3
                new TableRow({
                  children: [
                    new TableCell({
                      width: colWidthsII[2],
                      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Y tế", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                    }),
                    new TableCell({
                      width: colWidthsII[3],
                      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Trả lương trong thời gian điều trị", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                    }),
                    new TableCell({
                      width: colWidthsII[4],
                      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Bồi thường /Trợ cấp", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                    })
                  ]
                }),
                // Row 4 (Numbers Row)
                new TableRow({
                  children: Array.from({ length: 6 }, (_, i) => (
                    new TableCell({
                      width: colWidthsII[i],
                      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(i + 1), bold: true, size: DOCX_SIZE.TABLE_HEAD })] })]
                    })
                  ))
                }),
                // Row 5 (Data Row)
                new TableRow({
                  children: [
                    new TableCell({
                      width: colWidthsII[0],
                      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: formatNumberWithDots(report.soNgayNghi || 0), bold: true, size: DOCX_SIZE.TABLE_BODY })] })]
                    }),
                    new TableCell({
                      width: colWidthsII[1],
                      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: formatNumberWithDots(report.tongChiPhi || 0), bold: true, size: DOCX_SIZE.TABLE_BODY })] })]
                    }),
                    new TableCell({
                      width: colWidthsII[2],
                      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: formatNumberWithDots(report.chiPhiYTe || 0), bold: true, size: DOCX_SIZE.TABLE_BODY })] })]
                    }),
                    new TableCell({
                      width: colWidthsII[3],
                      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: formatNumberWithDots(report.chiPhiLuong || 0), bold: true, size: DOCX_SIZE.TABLE_BODY })] })]
                    }),
                    new TableCell({
                      width: colWidthsII[4],
                      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: formatNumberWithDots(report.chiPhiBoiThuong || 0), bold: true, size: DOCX_SIZE.TABLE_BODY })] })]
                    }),
                    new TableCell({
                      width: colWidthsII[5],
                      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: formatNumberWithDots(report.thietHaiTaiSan || 0), bold: true, size: DOCX_SIZE.TABLE_BODY })] })]
                    })
                  ]
                })
              ]
            });
          })(),

          new Paragraph({ text: "", spacing: { before: 240, after: 240 } }),

          // Signature Block Table (Border-less, placed on the right column)
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "auto" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
              left: { style: BorderStyle.NONE, size: 0, color: "auto" },
              right: { style: BorderStyle.NONE, size: 0, color: "auto" },
              insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
              insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: []
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: dateStr, size: DOCX_SIZE.DATE, italics: true })
                        ]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "ĐẠI DIỆN NGƯỜI SỬ DỤNG LAO ĐỘNG", bold: true, size: DOCX_SIZE.SIGN_TITLE })
                        ]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "(Ký, ghi rõ họ tên, chức vụ, đóng dấu)", size: DOCX_SIZE.SIGN_SUB, italics: true })
                        ]
                      }),
                      new Paragraph({ text: "", spacing: { before: 400, after: 400 } }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: profile.representativeName || "-", bold: true, size: DOCX_SIZE.SIGN_NAME })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          // Footnotes Separator
          new Paragraph({
            children: [
              new TextRun({ text: "____________________", size: 18 })
            ],
            spacing: { before: 240, after: 120 }
          }),

          // Footnotes List (Times New Roman, size 9pt = 18 dxa, italic)
          new Paragraph({
            children: [
              new TextRun({ text: "¹ Ghi mã số theo Danh mục đơn vị hành chính do Thủ tướng Chính phủ ban hành theo quy định của Luật Thống kê.", size: 18, italics: true })
            ],
            spacing: { after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "² Ghi tên, mã số theo danh mục và mã số các đơn vị kinh tế, hành chính sự nghiệp theo quy định pháp luật hiện hành trong báo cáo thống kê.", size: 18, italics: true })
            ],
            spacing: { after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "³ Ghi tên ngành, mã ngành theo Hệ thống ngành kinh tế do Thủ tướng Chính phủ ban hành theo quy định của Luật Thống kê.", size: 18, italics: true })
            ],
            spacing: { after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "⁴ Ghi 01 nguyên nhân chính gây tai nạn lao động.", size: 18, italics: true })
            ],
            spacing: { after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "⁵ Ghi tên và mã số theo danh mục yếu tố gây chấn thương.", size: 18, italics: true })
            ],
            spacing: { after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "⁶ Ghi tên và mã số nghề nghiệp do Thủ tướng Chính phủ ban hành theo quy định của Luật Thống kê.", size: 18, italics: true })
            ],
            spacing: { after: 60 }
          })
        ]
      }
    ]
  });

  const { Packer } = await import("docx");
  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);

  const filename = `BaoCao_TNLD_${report.year || curDate.getFullYear()}_${profile.taxCode || "unknown"}.docx`;
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

// =====================================================================
// SUMMARY REPORT DOCX EXPORT (for Department / Sở)
// Uses same styling as exportReportDocx for consistency
// =====================================================================

const SUMMARY_CATEGORIES = [
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

export const exportSummaryReportDocx = async (
  summaryData: any,
  filters: { year: string; periodType: string; provinceCity: string }
) => {
  const curDate = new Date();
  const dateStr = `Hà Nội, ngày ${curDate.getDate()} tháng ${curDate.getMonth() + 1} năm ${curDate.getFullYear()}`;

  const periodLabel = filters.periodType === "SIX_MONTHS" ? "6 tháng"
    : filters.periodType === "FULL_YEAR" ? "Cả năm" : "Tất cả";
  const yearLabel = filters.year || String(curDate.getFullYear());
  const provinceCityLabel = filters.provinceCity || "Toàn quốc";

  // Table borders styling (same as exportReportDocx)
  const tableBorders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "000000" }
  };

  const noBorders = {
    top: { style: BorderStyle.NONE, size: 0, color: "auto" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
    left: { style: BorderStyle.NONE, size: 0, color: "auto" },
    right: { style: BorderStyle.NONE, size: 0, color: "auto" },
    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
    insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" }
  };

  const fmtNum = (val: any): string => {
    const num = Number(val);
    if (isNaN(num) || num === 0) return "-";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const fmtRate = (val: any): string => {
    const num = Number(val);
    if (isNaN(num) || num === 0) return "-";
    return num.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // ---- Table I: Thông tin tổng quan ----
  const buildTableI = () => {
    const colWidthsI = [
      { size: 22, type: WidthType.PERCENTAGE },  // Loại hình cơ sở
      { size: 5, type: WidthType.PERCENTAGE },   // Mã số
      { size: 6, type: WidthType.PERCENTAGE },   // Tổng số CS
      { size: 6, type: WidthType.PERCENTAGE },   // Số CS tham gia
      { size: 7, type: WidthType.PERCENTAGE },   // Tổng số LĐ
      { size: 7, type: WidthType.PERCENTAGE },   // Số LĐ tham gia BC
      { size: 7, type: WidthType.PERCENTAGE },   // Số LĐ nữ
      { size: 7, type: WidthType.PERCENTAGE },   // Tổng số TNLĐ
      { size: 7, type: WidthType.PERCENTAGE },   // Số người chết
      { size: 7, type: WidthType.PERCENTAGE },   // Số thương nặng
      { size: 6.5, type: WidthType.PERCENTAGE }, // KTNLĐ
      { size: 6.5, type: WidthType.PERCENTAGE }, // KChết
      { size: 6, type: WidthType.PERCENTAGE },   // Ghi chú
    ];

    const byBT = summaryData?.byBusinessType || {};

    // Calculate totals
    const totalRow = {
      totalBusinesses: 0, participatingBusinesses: 0, totalEmployees: 0,
      participatingEmployees: 0, femaleEmployees: 0, totalVictims: 0,
      deathVictims: 0, severeInjuryVictims: 0, ktnld: 0, kchet: 0,
    };
    SUMMARY_CATEGORIES.forEach(cat => {
      const d = byBT[cat] || {};
      totalRow.totalBusinesses += Number(d.totalBusinesses) || 0;
      totalRow.participatingBusinesses += Number(d.participatingBusinesses) || 0;
      totalRow.totalEmployees += Number(d.totalEmployees) || 0;
      totalRow.participatingEmployees += Number(d.participatingEmployees) || 0;
      totalRow.femaleEmployees += Number(d.femaleEmployees) || 0;
      totalRow.totalVictims += Number(d.totalVictims) || 0;
      totalRow.deathVictims += Number(d.deathVictims) || 0;
      totalRow.severeInjuryVictims += Number(d.severeInjuryVictims) || 0;
    });
    if (totalRow.participatingEmployees > 0) {
      totalRow.ktnld = Math.round((totalRow.totalVictims / totalRow.participatingEmployees) * 1000 * 100) / 100;
      totalRow.kchet = Math.round((totalRow.deathVictims / totalRow.participatingEmployees) * 1000 * 100) / 100;
    }

    const makeRow = (label: string, code: string, d: any, isBold = false) => new TableRow({
      children: [
        new TableCell({ width: colWidthsI[0], children: [new Paragraph({ children: [new TextRun({ text: label, bold: isBold, size: DOCX_SIZE.TABLE_BODY })] })] }),
        new TableCell({ width: colWidthsI[1], children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: code, bold: isBold, size: DOCX_SIZE.TABLE_BODY })] })] }),
        new TableCell({ width: colWidthsI[2], children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: fmtNum(d.totalBusinesses), bold: isBold, size: DOCX_SIZE.TABLE_BODY })] })] }),
        new TableCell({ width: colWidthsI[3], children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: fmtNum(d.participatingBusinesses), bold: isBold, size: DOCX_SIZE.TABLE_BODY })] })] }),
        new TableCell({ width: colWidthsI[4], children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: fmtNum(d.totalEmployees), bold: isBold, size: DOCX_SIZE.TABLE_BODY })] })] }),
        new TableCell({ width: colWidthsI[5], children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: fmtNum(d.participatingEmployees), bold: isBold, size: DOCX_SIZE.TABLE_BODY })] })] }),
        new TableCell({ width: colWidthsI[6], children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: fmtNum(d.femaleEmployees), bold: isBold, size: DOCX_SIZE.TABLE_BODY })] })] }),
        new TableCell({ width: colWidthsI[7], children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: fmtNum(d.totalVictims), bold: isBold, size: DOCX_SIZE.TABLE_BODY })] })] }),
        new TableCell({ width: colWidthsI[8], children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: fmtNum(d.deathVictims), bold: isBold, size: DOCX_SIZE.TABLE_BODY })] })] }),
        new TableCell({ width: colWidthsI[9], children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: fmtNum(d.severeInjuryVictims), bold: isBold, size: DOCX_SIZE.TABLE_BODY })] })] }),
        new TableCell({ width: colWidthsI[10], children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: fmtRate(d.ktnld), bold: isBold, size: DOCX_SIZE.TABLE_BODY })] })] }),
        new TableCell({ width: colWidthsI[11], children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: fmtRate(d.kchet), bold: isBold, size: DOCX_SIZE.TABLE_BODY })] })] }),
        new TableCell({ width: colWidthsI[12], children: [new Paragraph({ children: [new TextRun({ text: "", size: DOCX_SIZE.TABLE_BODY })] })] }),
      ]
    });

    const headerRows = [
      // Row 1
      new TableRow({
        children: [
          new TableCell({ rowSpan: 3, width: colWidthsI[0], verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Loại hình cơ sở", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ rowSpan: 3, width: colWidthsI[1], verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Mã số", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ columnSpan: 2, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Cơ sở", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ columnSpan: 3, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Lực lượng lao động", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ columnSpan: 3, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Tổng số tai nạn lao động", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ columnSpan: 2, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Tần suất TNLĐ", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ rowSpan: 3, width: colWidthsI[12], verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Ghi chú", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
        ]
      }),
      // Row 2
      new TableRow({
        children: [
          new TableCell({ rowSpan: 2, width: colWidthsI[2], verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Tổng số", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ rowSpan: 2, width: colWidthsI[3], verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Số CS tham gia", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ rowSpan: 2, width: colWidthsI[4], verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Tổng số LĐ", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ rowSpan: 2, width: colWidthsI[5], verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Số LĐ của CS tham gia BC", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ rowSpan: 2, width: colWidthsI[6], verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Số LĐ nữ", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ columnSpan: 3, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Số người bị TNLĐ", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ rowSpan: 2, width: colWidthsI[10], verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "KTNLĐ", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ rowSpan: 2, width: colWidthsI[11], verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "KChết", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
        ]
      }),
      // Row 3
      new TableRow({
        children: [
          new TableCell({ width: colWidthsI[7], children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Tổng số", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ width: colWidthsI[8], children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Số người chết", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ width: colWidthsI[9], children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Số người bị thương nặng", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
        ]
      }),
    ];

    const dataRows = [
      makeRow("Tổng số", "-", totalRow, true),
      ...SUMMARY_CATEGORIES.map((cat, idx) => makeRow(cat, String(idx + 1), byBT[cat] || {})),
    ];

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBorders,
      rows: [...headerRows, ...dataRows],
    });
  };

  // ---- Table II: Phân loại TNLĐ (15-column table) ----
  const buildTableIICatalogRows = (catalogData: any[], sectionTitle: string) => {
    const rows: TableRow[] = [];
    // Section header
    rows.push(new TableRow({
      children: [
        new TableCell({
          columnSpan: 15,
          width: { size: 100, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: sectionTitle, bold: true, size: DOCX_SIZE.TABLE_BODY })] })]
        })
      ]
    }));
    // Data rows
    (catalogData || []).forEach((row: any) => {
      const t = row?.totals || {};
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `   ${row?.catalog?.name || ""}`, size: DOCX_SIZE.TABLE_BODY })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(row?.catalog?.code || row?.catalog?.id || ""), size: DOCX_SIZE.TABLE_BODY })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: fmtNum(t.totalAccidents), size: DOCX_SIZE.TABLE_BODY })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: fmtNum(t.fatalAccidents), size: DOCX_SIZE.TABLE_BODY })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: fmtNum(t.accidentsWithTwoOrMoreVictims), size: DOCX_SIZE.TABLE_BODY })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: fmtNum(t.totalVictims), size: DOCX_SIZE.TABLE_BODY })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: fmtNum(t.femaleVictims), size: DOCX_SIZE.TABLE_BODY })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: fmtNum(t.deathVictims), size: DOCX_SIZE.TABLE_BODY })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: fmtNum(t.severeInjuryVictims), size: DOCX_SIZE.TABLE_BODY })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: fmtNum(t.totalDaysOff), size: DOCX_SIZE.TABLE_BODY })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: fmtNum(t.totalCost), size: DOCX_SIZE.TABLE_BODY })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: fmtNum(t.medicalCost), size: DOCX_SIZE.TABLE_BODY })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: fmtNum(t.salaryPaymentCost), size: DOCX_SIZE.TABLE_BODY })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: fmtNum(t.allowanceCost), size: DOCX_SIZE.TABLE_BODY })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: fmtNum(t.propertyDamage ? Math.round(Number(t.propertyDamage) / 1000) : 0), size: DOCX_SIZE.TABLE_BODY })] })] }),
        ]
      }));
    });
    return rows;
  };

  const buildTableII = () => {
    const totals = summaryData?.totals || {};
    const totalRowValues = [
      fmtNum(totals.totalAccidents), fmtNum(totals.fatalAccidents), fmtNum(totals.accidentsWithTwoOrMoreVictims),
      fmtNum(totals.totalVictims), fmtNum(totals.femaleVictims), fmtNum(totals.deathVictims), fmtNum(totals.severeInjuryVictims),
      fmtNum(totals.totalDaysOff), fmtNum(totals.totalCost), fmtNum(totals.medicalCost),
      fmtNum(totals.salaryPaymentCost), fmtNum(totals.allowanceCost),
      fmtNum(totals.propertyDamage ? Math.round(Number(totals.propertyDamage) / 1000) : 0),
    ];

    const headerRows = [
      // Row 1
      new TableRow({
        children: [
          new TableCell({ rowSpan: 3, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Tên chỉ tiêu thống kê", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ rowSpan: 3, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Mã số", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ columnSpan: 3, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Phân loại TNLĐ theo mức độ thương tật (Số vụ)", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ columnSpan: 4, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Số người bị nạn (Người)", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ rowSpan: 3, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Tổng số ngày nghỉ vì TNLĐ", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ columnSpan: 5, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Thiệt hại do tai nạn lao động", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
        ]
      }),
      // Row 2
      new TableRow({
        children: [
          new TableCell({ rowSpan: 2, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Tổng số", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ rowSpan: 2, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Số vụ có người chết", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ rowSpan: 2, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Số vụ có từ 2 người bị nạn trở lên", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ rowSpan: 2, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Tổng số", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ rowSpan: 2, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Số LĐ nữ", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ rowSpan: 2, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Số người bị chết", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ rowSpan: 2, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Số người bị thương nặng", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ rowSpan: 2, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Tổng số tiền (đồng)", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ columnSpan: 3, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Trong đó chi phí (đồng)", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ rowSpan: 2, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Thiệt hại tài sản (1.000 đ)", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
        ]
      }),
      // Row 3
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Y Tế", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Trả lương", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Bồi thường/Trợ cấp", bold: true, size: DOCX_SIZE.TABLE_HEAD })] })] }),
        ]
      }),
    ];

    // Totals row
    const totalDataRow = new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tổng số", bold: true, size: DOCX_SIZE.TABLE_BODY })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "-", bold: true, size: DOCX_SIZE.TABLE_BODY })] })] }),
        ...totalRowValues.map(val => new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: val, bold: true, size: DOCX_SIZE.TABLE_BODY })] })] })),
      ]
    });

    // Catalog sections
    const occupationRows = buildTableIICatalogRows(summaryData?.byOccupation, "Phân theo nghề nghiệp");
    const causeRows = buildTableIICatalogRows(summaryData?.byAccidentCause, "Phân theo nguyên nhân xảy ra TNLĐ");
    const factorRows = buildTableIICatalogRows(summaryData?.byInjuryFactor, "Phân theo yếu tố gây chấn thương");

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBorders,
      rows: [
        ...headerRows,
        totalDataRow,
        ...occupationRows,
        ...causeRows,
        ...factorRows,
      ],
    });
  };

  // ---- Build Document ----
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
            size: DOCX_SIZE.BODY,
            color: "000000"
          },
          paragraph: {
            spacing: {
              line: 240,
              before: 0,
              after: 80
            }
          }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906,
              height: 16838,
              orientation: PageOrientation.LANDSCAPE
            },
            margin: {
              top: 850,
              bottom: 850,
              left: 567,
              right: 567
            }
          }
        },
        children: [
          // Appendix header
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "BÁO CÁO TỔNG HỢP TÌNH HÌNH TAI NẠN LAO ĐỘNG", bold: true, size: DOCX_SIZE.TITLE })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Kỳ báo cáo: ${periodLabel} năm ${yearLabel}`,
                bold: true,
                size: DOCX_SIZE.SUBTITLE
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Tỉnh/Thành phố: ${provinceCityLabel}`,
                bold: true,
                size: DOCX_SIZE.SUBTITLE
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `Ngày báo cáo: ${curDate.getDate()}/${curDate.getMonth() + 1}/${curDate.getFullYear()}`, size: DOCX_SIZE.DATE, italics: true })
            ],
            spacing: { after: 60 }
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `Đơn vị tiền tệ: đồng; số ngày nghỉ: ngày; số liệu thống kê: vụ/người`, size: 18, italics: true })
            ],
            spacing: { after: 240 }
          }),

          // Metadata info
          new Paragraph({
            children: [
              new TextRun({ text: "Số báo cáo: ", size: DOCX_SIZE.BODY }),
              new TextRun({ text: fmtNum(summaryData?.reportCount || 0), bold: true, size: DOCX_SIZE.BODY }),
              new TextRun({ text: " báo cáo", size: DOCX_SIZE.BODY })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Đơn vị nhận báo cáo: ", size: DOCX_SIZE.BODY }),
              new TextRun({ text: "Sở Lao động - Thương binh và Xã hội", bold: true, size: DOCX_SIZE.BODY })
            ],
            spacing: { after: 240 }
          }),

          // Section I Title
          new Paragraph({
            children: [
              new TextRun({ text: "I. Thông tin tổng quan", bold: true, size: DOCX_SIZE.SECTION_TITLE })
            ],
            spacing: { after: 120 }
          }),

          // Table I
          buildTableI(),

          new Paragraph({ text: "", spacing: { before: 180, after: 180 } }),

          // Section II Title
          new Paragraph({
            children: [
              new TextRun({ text: "II. Phân loại tai nạn lao động", bold: true, size: DOCX_SIZE.SECTION_TITLE })
            ],
            spacing: { after: 120 }
          }),

          // Table II
          buildTableII(),

          new Paragraph({ text: "", spacing: { before: 240, after: 240 } }),

          // Signature Block
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorders,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: []
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: dateStr, size: DOCX_SIZE.DATE, italics: true })
                        ]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "GIÁM ĐỐC SỞ LAO ĐỘNG - TBXH", bold: true, size: DOCX_SIZE.SIGN_TITLE })
                        ]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "(Ký, ghi rõ họ tên, đóng dấu)", size: DOCX_SIZE.SIGN_SUB, italics: true })
                        ]
                      }),
                      new Paragraph({ text: "", spacing: { before: 400, after: 400 } }),
                    ]
                  })
                ]
              })
            ]
          }),
        ]
      }
    ]
  });

  const { Packer } = await import("docx");
  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);

  const filename = `BaoCao_TongHop_TNLD_${yearLabel}_${periodLabel.replace(/\s/g, "_")}.docx`;
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};