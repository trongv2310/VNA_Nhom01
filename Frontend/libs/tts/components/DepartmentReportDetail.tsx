"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Printer, AlertCircle, Loader2 } from "lucide-react";
import { getDepartmentReportDetail } from "../services/api";
import { exportReportDocx } from "../utils/reportExporter";

interface ReportDetailProps {
  report: {
    id: number;
    businessName: string;
    taxCode: string;
    periodLabel: string;
    status: string;
    statusLabel: string;
  };
  year: string;
  onBack: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

interface TableRowData {
  title: string;
  code?: string;
  isBoldHeader?: boolean;
  isSubHeader?: boolean;
  data?: (number | string)[];
}

// Mock details fallback has been removed to load real data only

export const DepartmentReportDetail: React.FC<ReportDetailProps> = ({
  report,
  year,
  onBack,
  showToast,
}) => {
  const [detail, setDetail] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingWord, setIsGeneratingWord] = useState<boolean>(false);

  useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const res = await getDepartmentReportDetail(report.id);
        if (res.success && res.data) {
          setDetail(res.data);
        } else {
          setDetail(null);
          showToast(res.message || "Không tìm thấy dữ liệu báo cáo trên máy chủ.", "error");
        }
      } catch (err: any) {
        console.error("API Fetch Error:", err);
        setDetail(null);
        showToast(err.message || "Lỗi khi kết nối với máy chủ.", "error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [report.id]);

  const handlePrintWord = async () => {
    if (!detail) return;
    setIsGeneratingWord(true);
    try {
      await exportReportDocx(detail, detail.business);
      showToast("Tải báo cáo Word thành công!", "success");
    } catch (err) {
      console.error(err);
      showToast("Không thể xuất báo cáo Word.", "error");
    } finally {
      setIsGeneratingWord(false);
    }
  };

  const handleDownloadAttachment = (e: React.MouseEvent) => {
    if (detail?.attachments && detail.attachments.length > 0) {
      // Allow default navigation to the fileUrl
      return;
    }
    e.preventDefault();
    showToast("Không tìm thấy tài liệu đính kèm nào trên máy chủ", "error");
  };

  const formatNumberWithDots = (val: string | number) => {
    if (val === undefined || val === null || val === "") return "0";
    const num = Math.floor(Number(val));
    if (isNaN(num)) return "0";
    return num.toLocaleString("vi-VN");
  };

  const dynamicPartIData = useMemo<TableRowData[]>(() => {
    if (!detail) {
      return [
        {
          title: "1. Tai nạn lao động",
          isBoldHeader: true,
        },
        {
          title: "Tai nạn lao động",
          code: "",
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        {
          title: "1.1 Phân theo nguyên nhân xảy ra TNLĐ",
          isSubHeader: true,
        },
        {
          title: "a. Do người sử dụng lao động",
          isSubHeader: true,
        },
        {
          title: "Không có thiết bị an toàn hoặc thiết bị không đảm bảo an toàn",
          code: "1",
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        {
          title: "Không có phương tiện bảo vệ cá nhân hoặc phương tiện bảo vệ cá nhân không tốt",
          code: "2",
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        {
          title: "Tổ chức lao động không hợp lý",
          code: "3",
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        {
          title: "Chưa huấn luyện hoặc huấn luyện an toàn vệ sinh lao động chưa đầy đủ",
          code: "4",
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        {
          title: "Không có quy trình an toàn hoặc biện pháp làm việc an toàn",
          code: "5",
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        {
          title: "Điều kiện làm việc không tốt",
          code: "6",
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        {
          title: "b. Do người lao động",
          isSubHeader: true,
        },
        {
          title: "Vi phạm nội quy, quy trình, quy chuẩn, biện pháp làm việc an toàn",
          code: "7",
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        {
          title: "Không sử dụng phương tiện bảo vệ cá nhân",
          code: "8",
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        {
          title: "Khách quan khó tránh/ Nguyên nhân chưa kể đến",
          code: "9",
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        {
          title: "1.2. Phân theo yếu tố gây chấn thương",
          isSubHeader: true,
        },
        {
          title: "Thiết bị nâng",
          code: "101",
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        {
          title: "1.3 Phân theo nghề nghiệp",
          isSubHeader: true,
        },
        {
          title: "Nhà lãnh đạo cơ quan Đảng Cộng sản Việt Nam cấp Trung ương",
          code: "102",
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        {
          title: "Công nhân",
          code: "103",
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        {
          title: "2. Tai nạn được hưởng trợ cấp theo quy định tại Khoản 2 Điều 39 Luật ATVSLĐ",
          isBoldHeader: true,
        },
        {
          title: "Tai nạn được hưởng trợ cấp theo quy định tại Khoản 2 Điều 39 Luật ATVSLĐ",
          code: "10",
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        {
          title: "3. Tổng số",
          isBoldHeader: true,
        },
        {
          title: "Tổng số (3=1+2)",
          code: "",
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
      ];
    }

    const buildDataArray = (obj: any) => {
      if (!obj) return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      return [
        Number(obj.totalAccidents || 0),
        Number(obj.fatalAccidents || 0),
        Number(obj.accidentsWithTwoOrMoreVictims || 0),
        Number(obj.totalVictims || 0),
        Number(obj.victimsNotUnderManagement || 0),
        Number(obj.femaleVictims || 0),
        Number(obj.femaleVictimsNotUnderManagement || 0),
        Number(obj.deathVictims || 0),
        Number(obj.deathVictimsNotUnderManagement || 0),
        Number(obj.severeInjuryVictims || 0),
        Number(obj.severeInjuryVictimsNotUnderManagement || 0),
      ];
    };

    const sumAccidentDetails = (filterFn: (d: any) => boolean) => {
      const accs = (detail.details || []).filter((d: any) => d.section === "ACCIDENT" && filterFn(d));
      const result = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      accs.forEach((d: any) => {
        const arr = buildDataArray(d);
        for (let i = 0; i < 11; i++) {
          result[i] += arr[i];
        }
      });
      return result;
    };

    const row1 = buildDataArray(detail);
    const allowanceDetail = (detail.details || []).find((d: any) => d.section === "ARTICLE_39_ALLOWANCE");
    const row2 = buildDataArray(allowanceDetail);
    const row3 = row1.map((val, idx) => val + row2[idx]);

    const fullList = [
      {
        title: "1. Tai nạn lao động",
        isBoldHeader: true,
      },
      {
        title: "Tai nạn lao động",
        code: "",
        data: row1,
      },
      {
        title: "1.1 Phân theo nguyên nhân xảy ra TNLĐ",
        isSubHeader: true,
      },
      {
        title: "a. Do người sử dụng lao động",
        isSubHeader: true,
      },
      {
        title: "Không có thiết bị an toàn hoặc thiết bị không đảm bảo an toàn",
        code: "1",
        data: sumAccidentDetails((d) => d.accidentCauseCatalog?.code === "1"),
      },
      {
        title: "Không có phương tiện bảo vệ cá nhân hoặc phương tiện bảo vệ cá nhân không tốt",
        code: "2",
        data: sumAccidentDetails((d) => d.accidentCauseCatalog?.code === "2"),
      },
      {
        title: "Tổ chức lao động không hợp lý",
        code: "3",
        data: sumAccidentDetails((d) => d.accidentCauseCatalog?.code === "3"),
      },
      {
        title: "Chưa huấn luyện hoặc huấn luyện an toàn vệ sinh lao động chưa đầy đủ",
        code: "4",
        data: sumAccidentDetails((d) => d.accidentCauseCatalog?.code === "4"),
      },
      {
        title: "Không có quy trình an toàn hoặc biện pháp làm việc an toàn",
        code: "5",
        data: sumAccidentDetails((d) => d.accidentCauseCatalog?.code === "5"),
      },
      {
        title: "Điều kiện làm việc không tốt",
        code: "6",
        data: sumAccidentDetails((d) => d.accidentCauseCatalog?.code === "6"),
      },
      {
        title: "b. Do người lao động",
        isSubHeader: true,
      },
      {
        title: "Vi phạm nội quy, quy trình, quy chuẩn, biện pháp làm việc an toàn",
        code: "7",
        data: sumAccidentDetails((d) => d.accidentCauseCatalog?.code === "7"),
      },
      {
        title: "Không sử dụng phương tiện bảo vệ cá nhân",
        code: "8",
        data: sumAccidentDetails((d) => d.accidentCauseCatalog?.code === "8"),
      },
      {
        title: "Khách quan khó tránh/ Nguyên nhân chưa kể đến",
        code: "9",
        data: sumAccidentDetails((d) => d.accidentCauseCatalog?.code === "9"),
      },
      {
        title: "1.2. Phân theo yếu tố gây chấn thương",
        isSubHeader: true,
      },
      {
        title: "Thiết bị nâng",
        code: "101",
        data: sumAccidentDetails((d) => d.injuryFactorCatalog?.code === "4" || d.injuryFactorCatalog?.name?.toLowerCase().includes("thiết bị nâng")),
      },
      {
        title: "1.3 Phân theo nghề nghiệp",
        isSubHeader: true,
      },
      {
        title: "Nhà lãnh đạo cơ quan Đảng Cộng sản Việt Nam cấp Trung ương",
        code: "102",
        data: sumAccidentDetails((d) => d.occupationCatalog?.code === "111" || d.occupationCatalog?.code === "1111" || d.occupationCatalog?.name?.toLowerCase().includes("đảng cộng sản việt nam cấp trung ương") || d.occupationCatalog?.name?.toLowerCase().includes("đảng cộng sản việt nam")),
      },
      {
        title: "Công nhân",
        code: "103",
        data: sumAccidentDetails((d) => d.occupationCatalog?.code === "103" || d.occupationCatalog?.name?.toLowerCase().includes("công nhân")),
      },
      {
        title: "2. Tai nạn được hưởng trợ cấp theo quy định tại Khoản 2 Điều 39 Luật ATVSLĐ",
        isBoldHeader: true,
      },
      {
        title: "Tai nạn được hưởng trợ cấp theo quy định tại Khoản 2 Điều 39 Luật ATVSLĐ",
        code: "10",
        data: row2,
      },
      {
        title: "3. Tổng số",
        isBoldHeader: true,
      },
      {
        title: "Tổng số (3=1+2)",
        code: "",
        data: row3,
      },
    ];

    const filteredList: TableRowData[] = [];

    const isRowNonZero = (row: TableRowData) => {
      return row.data && row.data.some(val => Number(val || 0) > 0);
    };

    const nonZeroDataList = fullList.map(item => {
      if (item.data) {
        return isRowNonZero(item) ? item : null;
      }
      return item;
    });

    for (let i = 0; i < nonZeroDataList.length; i++) {
      const current = nonZeroDataList[i];
      if (!current) continue;

      if (current.isBoldHeader || current.isSubHeader) {
        let hasActiveChild = false;
        for (let j = i + 1; j < nonZeroDataList.length; j++) {
          const next = nonZeroDataList[j];
          if (!next) continue;
          if (current.isSubHeader && (next.isSubHeader || next.isBoldHeader)) {
            break;
          }
          if (current.isBoldHeader && next.isBoldHeader) {
            break;
          }
          if (next.data) {
            hasActiveChild = true;
            break;
          }
        }

        if (hasActiveChild) {
          filteredList.push(current);
        }
      } else {
        filteredList.push(current);
      }
    }

    return filteredList;
  }, [detail]);

  return (
    <div className="flex flex-col gap-6 h-full text-zinc-700 dark:text-zinc-300 relative">
      {/* CSS style block for browser print settings */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          /* Reset parent heights and overflows to enable full page printing */
          html, body, #__next, .h-screen, .overflow-hidden, main, .overflow-y-auto, [class*="h-screen"], [class*="overflow-hidden"], [class*="overflow-y-auto"] {
            height: auto !important;
            overflow: visible !important;
            position: static !important;
          }
          /* Hide Sidebar, Header, Layout elements */
          body * {
            visibility: hidden;
          }
          /* Show print container and everything in it */
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
          /* Remove borders & scrollbars in print */
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
      `}} />

      {/* Top Banner Header - Hidden during print */}
      <div className="flex items-center justify-between border-t-4 border-blue-600 bg-white dark:bg-zinc-950 rounded-2xl p-4 shadow-sm border border-zinc-200/60 dark:border-zinc-800/80 no-print select-none">
        <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
          Báo cáo định kỳ Tai nạn lao động
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 font-bold text-xs select-none transition-all cursor-pointer"
          >
            Quay lại
          </button>
          <button
            disabled={isGeneratingWord}
            onClick={handlePrintWord}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-md shadow-blue-500/10 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
          >
            {isGeneratingWord ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            <span>{isGeneratingWord ? "Đang tạo Word..." : "In báo cáo"}</span>
          </button>
        </div>
      </div>

      {/* Main Body Report Content */}
      <div className="printable-report-wrapper flex-1 bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl shadow-sm p-6 overflow-y-auto flex flex-col gap-6">
        {/* Title details */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4 flex flex-col gap-2">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
            Báo cáo tổng hợp tình hình tai nạn lao động - Kỳ báo cáo: {report.periodLabel} năm {year}
          </h3>
          <div className="text-sm text-zinc-500 dark:text-zinc-400 font-semibold flex items-center gap-4 flex-wrap mt-0.5">
            <span>Doanh nghiệp: <strong className="text-zinc-800 dark:text-zinc-200">{detail?.businessName || report.businessName || "-"}</strong></span>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <span>Mã số thuế: <strong className="text-zinc-800 dark:text-zinc-200">{detail?.taxCode || report.taxCode || "-"}</strong></span>
          </div>
          <div className="no-print flex items-center gap-2 text-xs">
            <span className="font-semibold text-red-500 flex items-center gap-1">
              **Vui lòng đính kèm báo cáo TNLĐ có dấu mộc công ty:
            </span>
            {detail?.attachments && detail.attachments.length > 0 ? (
              <a
                href={`/department/dashboard/view-document?url=${encodeURIComponent(
                  detail.attachments[0].fileUrl && detail.attachments[0].fileUrl !== "#"
                    ? detail.attachments[0].fileUrl
                    : "/template.pdf"
                )}&name=${encodeURIComponent(
                  detail.attachments[0].displayName || detail.attachments[0].originalName || "baocaoTNLĐ.pdf"
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline font-bold"
              >
                {detail.attachments[0].displayName || detail.attachments[0].originalName || "baocaoTNLĐ.pdf"}
              </a>
            ) : (
              <span className="text-zinc-400 italic">Không có tệp đính kèm</span>
            )}
          </div>
        </div>

        {detail ? (
          <>
            {/* Section 1: Detailed Accidents Table */}
            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                I. Tai nạn lao động
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-zinc-200 dark:border-zinc-800 border-collapse min-w-[1200px]">
                  <thead>
                    {/* Header Row 1 */}
                    <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                      <th
                        rowSpan={3}
                        className="p-3 border-r border-zinc-200 dark:border-zinc-800 font-bold text-zinc-700 dark:text-zinc-300 w-[20%]"
                      >
                        Tên chỉ tiêu thống kê
                      </th>
                      <th
                        rowSpan={3}
                        className="p-3 border-r border-zinc-200 dark:border-zinc-800 font-bold text-zinc-700 dark:text-zinc-300 text-center w-[6%]"
                      >
                        Mã số
                      </th>
                      <th
                        colSpan={11}
                        className="p-2 border-r border-zinc-200 dark:border-zinc-800 font-bold text-zinc-700 dark:text-zinc-300 text-center"
                      >
                        Phân loại TNLĐ theo mức độ thương tật
                      </th>
                    </tr>

                    {/* Header Row 2 */}
                    <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                      <th
                        colSpan={3}
                        className="p-2 border-r border-zinc-200 dark:border-zinc-800 font-bold text-zinc-700 dark:text-zinc-300 text-center"
                      >
                        Số vụ (Vụ)
                      </th>
                      <th
                        colSpan={8}
                        className="p-2 border-r border-zinc-200 dark:border-zinc-800 font-bold text-zinc-700 dark:text-zinc-300 text-center"
                      >
                        Số người bị nạn (Người)
                      </th>
                    </tr>

                    {/* Header Row 3 */}
                    <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 text-center">
                      {/* Under Số vụ */}
                      <th className="p-2 border-r border-zinc-200 dark:border-zinc-800 font-bold text-zinc-600 dark:text-zinc-400">
                        Tổng số
                      </th>
                      <th className="p-2 border-r border-zinc-200 dark:border-zinc-800 font-bold text-zinc-600 dark:text-zinc-400">
                        Số vụ có người chết
                      </th>
                      <th className="p-2 border-r border-zinc-200 dark:border-zinc-800 font-bold text-zinc-600 dark:text-zinc-400">
                        Số vụ có từ 2 người bị nạn trở lên
                      </th>
                      {/* Under Số người */}
                      <th
                        colSpan={2}
                        className="p-2 border-r border-zinc-200 dark:border-zinc-800 font-bold text-zinc-600 dark:text-zinc-400"
                      >
                        Tổng số
                      </th>
                      <th
                        colSpan={2}
                        className="p-2 border-r border-zinc-200 dark:border-zinc-800 font-bold text-zinc-600 dark:text-zinc-400"
                      >
                        Số LĐ nữ
                      </th>
                      <th
                        colSpan={2}
                        className="p-2 border-r border-zinc-200 dark:border-zinc-800 font-bold text-zinc-600 dark:text-zinc-400"
                      >
                        Số người bị chết
                      </th>
                      <th
                        colSpan={2}
                        className="p-2 border-r border-zinc-200 dark:border-zinc-800 font-bold text-zinc-600 dark:text-zinc-400"
                      >
                        Số người bị thương nặng
                      </th>
                    </tr>

                    {/* Header Row 4 */}
                    <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 text-center text-[10px] text-zinc-500 dark:text-zinc-400">
                      <th className="p-2 border-r border-zinc-200 dark:border-zinc-800"></th>
                      <th className="p-2 border-r border-zinc-200 dark:border-zinc-800"></th>
                      <th className="p-1 border-r border-zinc-200 dark:border-zinc-800"></th>
                      <th className="p-1 border-r border-zinc-200 dark:border-zinc-800"></th>
                      <th className="p-1 border-r border-zinc-200 dark:border-zinc-800"></th>
                      {/* Under Số người - Tổng số */}
                      <th className="p-1 border-r border-zinc-200 dark:border-zinc-800 font-bold">Tổng số</th>
                      <th className="p-1 border-r border-zinc-200 dark:border-zinc-800 font-bold">NN không thuộc quyền quản lý</th>
                      {/* Under Số người - Số LĐ nữ */}
                      <th className="p-1 border-r border-zinc-200 dark:border-zinc-800 font-bold">Tổng số</th>
                      <th className="p-1 border-r border-zinc-200 dark:border-zinc-800 font-bold">NN không thuộc quyền quản lý</th>
                      {/* Under Số người - Số người bị chết */}
                      <th className="p-1 border-r border-zinc-200 dark:border-zinc-800 font-bold">Tổng số</th>
                      <th className="p-1 border-r border-zinc-200 dark:border-zinc-800 font-bold">NN không thuộc quyền quản lý</th>
                      {/* Under Số người - Số người bị thương nặng */}
                      <th className="p-1 border-r border-zinc-200 dark:border-zinc-800 font-bold">Tổng số</th>
                      <th className="p-1 border-r border-zinc-200 dark:border-zinc-800 font-bold">NN không thuộc quyền quản lý</th>
                    </tr>
                  </thead>

                  <tbody>
                    {dynamicPartIData.map((row, idx) => {
                      if (row.isBoldHeader) {
                        return (
                          <tr
                            key={idx}
                            className="bg-zinc-100/40 dark:bg-zinc-900/30 font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800"
                          >
                            <td className="p-3 pl-4" colSpan={13}>
                              {row.title}
                            </td>
                          </tr>
                        );
                      }

                      if (row.isSubHeader) {
                        return (
                          <tr
                            key={idx}
                            className="bg-zinc-50/20 dark:bg-zinc-900/10 font-bold text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800 text-[11px]"
                          >
                            <td className="p-2.5 pl-6" colSpan={13}>
                              {row.title}
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr
                          key={idx}
                          className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-55/20 dark:hover:bg-zinc-900/10 transition-colors"
                        >
                          <td className="p-3 pl-8 text-zinc-700 dark:text-zinc-300 font-medium">
                            {row.title}
                          </td>
                          <td className="p-3 border-l border-r border-zinc-200 dark:border-zinc-800 text-center font-bold text-zinc-500">
                            {row.code || "-"}
                          </td>
                          {row.data?.map((val, subIdx) => (
                            <td
                              key={subIdx}
                              className="p-3 border-r border-zinc-200 dark:border-zinc-800 text-center font-semibold"
                            >
                              {val}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Damage Summary Table */}
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
                      <th rowSpan={3} className="p-3 border-r border-zinc-200 dark:border-zinc-800 text-left min-w-[280px]">
                        Tổng số ngày nghỉ vì tai nạn lao động (kể cả ngày nghỉ chế độ)
                      </th>
                      <th colSpan={4} className="p-2 border-r border-zinc-200 dark:border-zinc-800">
                        Tổng số ngày nghỉ vi TNLĐ (1.000đ)
                      </th>
                      <th rowSpan={3} className="p-3 w-44">
                        Thiệt hại tài sản (1.000đ)
                      </th>
                    </tr>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/20 text-zinc-550 dark:text-zinc-400 font-bold select-none text-center text-[10px]">
                      <th rowSpan={2} className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-24">Tổng số</th>
                      <th colSpan={3} className="p-2 border-r border-zinc-200 dark:border-zinc-800">Khoảng chi cụ thể của cơ sở</th>
                    </tr>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/20 text-zinc-550 dark:text-zinc-400 font-bold select-none text-center text-[10px]">
                      <th className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-24">Y tế</th>
                      <th className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-36">Trả lương trong thời gian điều trị</th>
                      <th className="p-2 border-r border-zinc-200 dark:border-zinc-800 w-28">Bồi thường trợ cấp</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="text-center font-bold text-zinc-800 dark:text-zinc-200">
                      <td className="p-3.5 border-r border-zinc-200 dark:border-zinc-800 text-center">
                        {detail ? detail.totalDaysOff : "0"}
                      </td>
                      <td className="p-3.5 border-r border-zinc-200 dark:border-zinc-800 text-blue-600 dark:text-blue-400 text-center">
                        {detail ? formatNumberWithDots(detail.totalCost) : "0"}
                      </td>
                      <td className="p-3.5 border-r border-zinc-200 dark:border-zinc-800 text-center">
                        {detail ? formatNumberWithDots(detail.medicalCost) : "0"}
                      </td>
                      <td className="p-3.5 border-r border-zinc-200 dark:border-zinc-800 text-center">
                        {detail ? formatNumberWithDots(detail.salaryPaymentCost) : "0"}
                      </td>
                      <td className="p-3.5 border-r border-zinc-200 dark:border-zinc-800 text-center">
                        {detail ? formatNumberWithDots(detail.allowanceCost) : "0"}
                      </td>
                      <td className="p-3.5 text-center text-red-600 dark:text-red-400 font-bold">
                        {detail ? formatNumberWithDots(detail.propertyDamage) : "0"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          !isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-450 dark:text-zinc-500 font-semibold text-sm">
              <AlertCircle className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-3" />
              Không tìm thấy thông tin chi tiết báo cáo trên máy chủ.
            </div>
          )
        )}
      </div>

      {/* Loading Overlay */}
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
