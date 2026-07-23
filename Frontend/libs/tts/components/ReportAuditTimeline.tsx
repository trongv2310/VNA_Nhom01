"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import {
  getDepartmentReportAuditLogs,
  getMyLaborAccidentReportAuditLogs,
  type LaborAccidentReportAuditAction,
  type LaborAccidentReportAuditLogItem,
} from "../services/api";

type ReportAuditTimelineVariant = "department" | "business";

interface ReportAuditTimelineProps {
  reportId?: number | string | null;
  variant: ReportAuditTimelineVariant;
  enabled?: boolean;
  className?: string;
  refreshKey?: number | string;
  onClose?: () => void;
}

const actionConfig: Record<
  LaborAccidentReportAuditAction,
  {
    label: string;
    dotClassName: string;
  }
> = {
  CREATE_DRAFT: {
    label: "Tạo nháp",
    dotClassName:
      "border-zinc-400 bg-white dark:border-zinc-600 dark:bg-zinc-950",
  },
  UPDATE_DRAFT: {
    label: "Cập nhật nháp",
    dotClassName:
      "border-blue-500 bg-white dark:border-blue-400 dark:bg-zinc-950",
  },
  SUBMIT: {
    label: "Gửi báo cáo",
    dotClassName:
      "border-blue-500 bg-white dark:border-blue-400 dark:bg-zinc-950",
  },
  RESUBMIT: {
    label: "Gửi lại báo cáo",
    dotClassName:
      "border-amber-500 bg-white dark:border-amber-400 dark:bg-zinc-950",
  },
  RECEIVE: {
    label: "Tiếp nhận",
    dotClassName:
      "border-emerald-500 bg-white dark:border-emerald-400 dark:bg-zinc-950",
  },
  REJECT: {
    label: "Từ chối",
    dotClassName:
      "border-red-500 bg-white dark:border-red-400 dark:bg-zinc-950",
  },
  BACKFILL: {
    label: "Khôi phục dữ liệu",
    dotClassName:
      "border-zinc-400 bg-white dark:border-zinc-600 dark:bg-zinc-950",
  },
};

function formatAuditTime(value?: string | null) {
  if (!value) return "--/--/---- --:--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--/--/---- --:--";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hour}:${minute}`;
}

function getAuditMessage(item: LaborAccidentReportAuditLogItem) {
  if (item.message?.trim()) return item.message.trim();

  const actor = item.actorName || "Hệ thống";
  const action = item.actionLabel || getActionConfig(item.action).label || "xử lý";
  return `${actor} đã ${action.toLowerCase()}`;
}

function getActionConfig(action?: string) {
  if (action && action in actionConfig) {
    return actionConfig[action as LaborAccidentReportAuditAction];
  }

  return actionConfig.BACKFILL;
}

function splitAuditMessage(item: LaborAccidentReportAuditLogItem) {
  const message = getAuditMessage(item);
  const actor = item.actorName?.trim();

  if (actor && message.toLowerCase().startsWith(actor.toLowerCase())) {
    return {
      actor,
      detail: message.slice(actor.length).trimStart(),
    };
  }

  return {
    actor: "",
    detail: message,
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Không thể tải tiến độ xử lý báo cáo";
}

export const ReportAuditTimeline: React.FC<ReportAuditTimelineProps> = ({
  reportId,
  variant,
  enabled = true,
  className = "",
  refreshKey,
  onClose,
}) => {
  const [items, setItems] = useState<LaborAccidentReportAuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!enabled || !reportId) {
      return;
    }

    let active = true;
    const loadAuditLogs = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response =
          variant === "department"
            ? await getDepartmentReportAuditLogs(reportId)
            : await getMyLaborAccidentReportAuditLogs(reportId);

        if (!active) return;
        setItems(response.data?.items || []);
      } catch (error: unknown) {
        if (!active) return;
        console.error("Failed to load report audit logs:", error);
        setItems([]);
        setErrorMessage(getErrorMessage(error));
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadAuditLogs();

    return () => {
      active = false;
    };
  }, [enabled, reportId, refreshKey, variant]);

  const displayItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        const timeDiff =
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return timeDiff || Number(b.id) - Number(a.id);
      }),
    [items],
  );

  if (!enabled || !reportId) return null;

  return (
    <div
      className={`no-print overflow-hidden rounded-2xl border border-zinc-200/70 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950 ${className}`}
    >
      <div className="relative bg-[#2563eb] px-6 py-6 text-white">
        <h3 className="text-center text-3xl font-extrabold leading-tight tracking-tight">
          Tiến độ xử lý
        </h3>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/70"
            aria-label="Đóng tiến độ xử lý"
          >
            <X className="h-5 w-5" />
          </button>
        )}

      </div>

      <div className="max-h-[min(64vh,520px)] overflow-y-auto px-7 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span>Đang tải lịch sử xử lý...</span>
          </div>
        ) : errorMessage ? (
          <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-650 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm font-semibold text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
            Chưa có lịch sử xử lý cho báo cáo này.
          </div>
        ) : (
          <div className="flex flex-col">
            {displayItems.map((item, index) => {
              const config = getActionConfig(item.action);
              const messageParts = splitAuditMessage(item);
              const isLast = index === displayItems.length - 1;

              return (
                <div
                  key={item.id}
                  className="relative grid grid-cols-[2.5rem_1fr] gap-4 pb-7 last:pb-0"
                >
                  {!isLast && (
                    <span className="absolute left-[0.625rem] top-8 h-[calc(100%-1.5rem)] w-px bg-zinc-300 dark:bg-zinc-700" />
                  )}
                  <div
                    className={`relative z-10 mt-1 h-5 w-5 rounded-full border-2 ${config.dotClassName}`}
                  />

                  <div className="min-w-0 pt-0.5">
                    <span className="text-lg font-medium text-zinc-500 dark:text-zinc-400">
                      {formatAuditTime(item.createdAt)}
                    </span>

                    <p className="mt-2 text-xl font-semibold leading-relaxed text-zinc-900 dark:text-zinc-100">
                      {messageParts.actor ? (
                        <>
                          <span>{messageParts.actor}</span>{" "}
                          <span className="text-zinc-500 dark:text-zinc-400">
                            {messageParts.detail}
                          </span>
                        </>
                      ) : (
                        messageParts.detail
                      )}
                    </p>

                    {item.reason && (
                      <p className="mt-2 text-lg font-semibold leading-relaxed text-zinc-800 dark:text-zinc-200">
                        <span className="font-bold text-red-600 dark:text-red-400">
                          Lý do:
                        </span>{" "}
                        {item.reason}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
