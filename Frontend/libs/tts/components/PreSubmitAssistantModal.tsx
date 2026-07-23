"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Info,
  Loader2,
  Send,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import type {
  LaborAccidentPreSubmitCheckItem,
  LaborAccidentPreSubmitCheckPayload,
  LaborAccidentPreSubmitSeverity,
} from "../services/api";

interface PreSubmitAssistantModalProps {
  result: LaborAccidentPreSubmitCheckPayload;
  isSubmitting?: boolean;
  onClose: () => void;
  onBackToEdit: (targetStep?: number) => void;
  onConfirmSubmit: () => void;
}

const levelConfig: Record<
  LaborAccidentPreSubmitCheckPayload["level"],
  {
    title: string;
    description: string;
    badgeClassName: string;
    barClassName: string;
  }
> = {
  READY: {
    title: "Sẵn sàng gửi",
    description: "Báo cáo đã vượt qua các kiểm tra quan trọng.",
    badgeClassName:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900",
    barClassName: "bg-emerald-500",
  },
  REVIEW_RECOMMENDED: {
    title: "Nên rà soát thêm",
    description:
      "Báo cáo có một vài cảnh báo mềm, bạn vẫn có thể gửi nếu đã kiểm tra.",
    badgeClassName:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900",
    barClassName: "bg-amber-500",
  },
  NEEDS_ATTENTION: {
    title: "Cần chú ý",
    description:
      "Có cảnh báo đáng lưu ý. Hãy kiểm tra trước khi xác nhận gửi báo cáo.",
    badgeClassName:
      "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-900",
    barClassName: "bg-orange-500",
  },
  NEEDS_FIX: {
    title: "Cần sửa trước khi gửi",
    description:
      "Báo cáo còn lỗi chặn. Bạn cần quay lại chỉnh sửa trước khi gửi.",
    badgeClassName:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900",
    barClassName: "bg-red-500",
  },
};

const severityConfig: Record<
  LaborAccidentPreSubmitSeverity,
  {
    label: string;
    icon: React.ElementType;
    iconClassName: string;
    cardClassName: string;
    badgeClassName: string;
  }
> = {
  success: {
    label: "Đạt",
    icon: CheckCircle2,
    iconClassName: "text-emerald-600 bg-emerald-50 border-emerald-100",
    cardClassName:
      "border-emerald-100 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/10",
    badgeClassName:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  info: {
    label: "Gợi ý",
    icon: Info,
    iconClassName: "text-blue-600 bg-blue-50 border-blue-100",
    cardClassName:
      "border-blue-100 bg-blue-50/40 dark:border-blue-900/50 dark:bg-blue-950/10",
    badgeClassName:
      "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  },
  warning: {
    label: "Cảnh báo",
    icon: AlertTriangle,
    iconClassName: "text-amber-600 bg-amber-50 border-amber-100",
    cardClassName:
      "border-amber-100 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/10",
    badgeClassName:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
  danger: {
    label: "Cần xử lý",
    icon: XCircle,
    iconClassName: "text-red-600 bg-red-50 border-red-100",
    cardClassName:
      "border-red-100 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/10",
    badgeClassName:
      "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  },
};

function getFirstTargetStep(items: LaborAccidentPreSubmitCheckItem[]) {
  return items.find((item) => item.blocking)?.targetStep ?? items[0]?.targetStep;
}

function getTargetStepLabel(targetStep?: number) {
  if (targetStep === 1) return "Bước 1 - Thông tin doanh nghiệp";
  if (targetStep === 2) return "Bước 2 - Tổng số liệu";
  if (targetStep === 3) return "Bước 2 - Chi tiết vụ tai nạn";
  if (targetStep === 4) return "Bước 4 - Tổng quan & file đính kèm";

  return "Khu vực liên quan";
}

function formatCheckedTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${hour}:${minute} ${day}/${month}/${year}`;
}

export const PreSubmitAssistantModal: React.FC<
  PreSubmitAssistantModalProps
> = ({ result, isSubmitting = false, onClose, onBackToEdit, onConfirmSubmit }) => {
  const [confirmed, setConfirmed] = useState(!result.requireConfirmation);

  useEffect(() => {
    setConfirmed(!result.requireConfirmation);
  }, [result]);

  const level = levelConfig[result.level] || levelConfig.REVIEW_RECOMMENDED;
  const firstTargetStep = useMemo(
    () => getFirstTargetStep(result.items),
    [result.items],
  );
  const canConfirm = result.canSubmit && (!result.requireConfirmation || confirmed);
  const checkedTime = formatCheckedTime(result.checkedAt);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-[10001] flex max-h-[86vh] w-full max-w-[900px] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="relative bg-[#2563eb] px-6 py-5 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/70"
            aria-label="Đóng trợ lý rà soát"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center justify-center gap-3 pr-10">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div className="text-center">
              <h3 className="text-2xl font-extrabold leading-tight">
                Trợ lý kiểm tra báo cáo
              </h3>
              <p className="mt-1 text-sm font-semibold text-white/80">
                Bảng kiểm & cảnh báo mềm trước khi gửi
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold ${level.badgeClassName}`}
                  >
                    {level.title}
                  </span>
                  <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {level.description}
                  </p>
                  {checkedTime && (
                    <p className="mt-2 text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                      Rà soát lúc {checkedTime}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                    Điểm sẵn sàng
                  </p>
                  <p className="mt-1 text-4xl font-black text-zinc-900 dark:text-zinc-50">
                    {Math.round(result.readinessScore)}
                    <span className="text-lg text-zinc-400">/100</span>
                  </p>
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all ${level.barClassName}`}
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, result.readinessScore || 0),
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-200 bg-white p-3 text-center text-xs font-bold dark:border-zinc-800 dark:bg-zinc-950">
              <div className="rounded-xl bg-red-50 px-2 py-3 text-red-700 dark:bg-red-950/20 dark:text-red-300">
                <p className="text-xl font-black">
                  {result.summary.blockingCount}
                </p>
                <p>Lỗi chặn</p>
              </div>
              <div className="rounded-xl bg-amber-50 px-2 py-3 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">
                <p className="text-xl font-black">
                  {result.summary.warningCount + result.summary.dangerSoftCount}
                </p>
                <p>Cảnh báo</p>
              </div>
              <div className="rounded-xl bg-blue-50 px-2 py-3 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300">
                <p className="text-xl font-black">{result.summary.infoCount}</p>
                <p>Gợi ý</p>
              </div>
              <div className="rounded-xl bg-emerald-50 px-2 py-3 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300">
                <p className="text-xl font-black">
                  {result.summary.successCount}
                </p>
                <p>Đã đạt</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 text-xs font-bold text-zinc-500 dark:text-zinc-400 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
              Không tự sửa dữ liệu
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
              Không đổi trạng thái khi rà soát
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
              Không thay thế validate FE/BE
            </div>
          </div>

          {result.rejectionContext && (
            <div className="mt-4 rounded-2xl border border-red-100 bg-red-50/60 p-4 dark:border-red-900/50 dark:bg-red-950/10">
              <p className="text-sm font-extrabold text-red-700 dark:text-red-300">
                Gợi ý từ lần bị từ chối gần nhất
              </p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-zinc-700 dark:text-zinc-300">
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  Lý do:
                </span>{" "}
                {result.rejectionContext.reason || "Chưa có lý do cụ thể"}
              </p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-red-650 dark:text-red-300">
                {result.rejectionContext.suggestion}
              </p>
            </div>
          )}

          {result.previousReport && (
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/50 dark:bg-blue-950/10">
              <p className="text-sm font-extrabold text-blue-700 dark:text-blue-300">
                Tham chiếu kỳ báo cáo gần nhất
              </p>
              <p className="mt-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {result.previousReport.periodTypeLabel} năm{" "}
                {result.previousReport.year}:{" "}
                {result.previousReport.totalAccidents} vụ,{" "}
                {result.previousReport.totalVictims} nạn nhân, tổng chi phí{" "}
                {Number(result.previousReport.totalCost || 0).toLocaleString(
                  "vi-VN",
                )}
                .
              </p>
            </div>
          )}

          <div className="mt-5 space-y-3">
            {result.items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 px-4 py-6 text-center text-sm font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300">
                Chưa phát hiện cảnh báo nào. Báo cáo có thể gửi.
              </div>
            ) : (
              result.items.map((item) => {
                const config = severityConfig[item.severity];
                const Icon = config.icon;

                return (
                  <div
                    key={item.code}
                    className={`rounded-2xl border p-4 ${config.cardClassName}`}
                  >
                    <div className="flex gap-3">
                      <span
                        className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border ${config.iconClassName}`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${config.badgeClassName}`}
                          >
                            {config.label}
                          </span>
                          {item.targetStep && (
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-zinc-500 shadow-sm dark:bg-zinc-900 dark:text-zinc-400">
                              {getTargetStepLabel(item.targetStep)}
                            </span>
                          )}
                          {item.blocking && (
                            <span className="rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-extrabold text-white">
                              Bắt buộc sửa
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
                          {item.title}
                        </p>
                        <p className="mt-1 text-sm font-semibold leading-relaxed text-zinc-600 dark:text-zinc-300">
                          {item.message}
                        </p>
                        {item.suggestion && (
                          <p className="mt-2 text-sm font-semibold leading-relaxed text-blue-700 dark:text-blue-300">
                            Gợi ý: {item.suggestion}
                          </p>
                        )}
                        {item.targetStep && (
                          <button
                            type="button"
                            onClick={() => onBackToEdit(item.targetStep)}
                            className="mt-3 inline-flex items-center rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-extrabold text-blue-700 transition-colors hover:bg-blue-50 dark:border-blue-900/60 dark:bg-zinc-950 dark:text-blue-300 dark:hover:bg-blue-950/20"
                          >
                            Đi tới bước cần kiểm tra
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {result.requireConfirmation && result.canSubmit && (
            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-4 text-sm font-semibold leading-relaxed text-zinc-700 dark:border-amber-900/50 dark:bg-amber-950/10 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-600"
              />
              <span>
                Tôi đã kiểm tra các cảnh báo mềm phía trên và xác nhận tiếp tục
                gửi báo cáo.
              </span>
            </label>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
          <button
            type="button"
            onClick={() => onBackToEdit(firstTargetStep)}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-extrabold text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại chỉnh sửa
          </button>

          <button
            type="button"
            disabled={!canConfirm || isSubmitting}
            onClick={onConfirmSubmit}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-extrabold shadow-md transition-all ${
              canConfirm && !isSubmitting
                ? "bg-[#2563eb] text-white hover:bg-blue-700 active:scale-98"
                : "cursor-not-allowed bg-zinc-200 text-zinc-400 opacity-70 dark:bg-zinc-800 dark:text-zinc-500"
            }`}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {result.canSubmit ? "Tiếp tục gửi báo cáo" : "Chưa thể gửi"}
          </button>
        </div>
      </div>
    </div>
  );
};
