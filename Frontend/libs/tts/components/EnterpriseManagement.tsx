"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Upload,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  X,
} from "lucide-react";
import { ResetPasswordModal } from "./ResetPasswordModal";
import { CreateEnterprise } from "./CreateEnterprise";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { IndustrySearchSelect, type IndustryLevel4 } from "./IndustrySearchSelect";
import { SearchSelect } from "./SearchSelect";
import {
  getBusinesses,
  getBusinessOptions,
  createBusiness,
  updateBusiness,
  updateBusinessStatus,
  deleteBusiness,
  getUsers,
  updateUserAdmin,
  getIndustries,
  type BusinessListItem,
  type BusinessListMeta,
} from "../services/api";

export const BUSINESS_TYPE_LABELS: Record<string, string> = {
  "Cong ty TNHH 1 thanh vien": "Công ty TNHH 1 thành viên",
  "Cong ty TNHH 2 thanh vien tro len": "Công ty TNHH 2 thành viên trở lên",
  "Cong ty co phan": "Công ty Cổ phần",
  "Cong ty hop danh": "Công ty Hợp danh",
  "Doanh nghiep tu nhan": "Doanh nghiệp Tư nhân",
  "Ho kinh doanh": "Hộ kinh doanh",
  "Hop tac xa": "Hợp tác xã",
  "Chi nhanh": "Chi nhánh",
};

const WARD_OPTIONS = [
  "Phường Bến Nghé",
  "Phường Bến Thành",
  "Phường Cô Giang",
  "Phường Cầu Kho",
  "Phường Nguyễn Cư Trinh",
  "Phường Đa Kao",
  "Phường Tân Định",
  "Phường Phạm Ngũ Lão",
  "Phường Nguyễn Thái Bình",
  "Phường Cầu Ông Lãnh",
];

interface EnterpriseManagementProps {
  showToast: (message: string, type: "success" | "error") => void;
  permissions?: string[];
  isAdmin?: boolean;
}

export const EnterpriseManagement: React.FC<EnterpriseManagementProps> = ({
  showToast,
  permissions = [],
  isAdmin = false,
}) => {
  const hasPermission = (permission: string) =>
    isAdmin || permissions.includes(permission);
  const canCreate = hasPermission("SYSTEM_C_BUSINESS_CREATE");
  const canUpdate = hasPermission("SYSTEM_C_BUSINESS_UPDATE");
  const canDelete = hasPermission("SYSTEM_C_BUSINESS_DELETE");
  const canChangeStatus = hasPermission("SYSTEM_C_BUSINESS_STATUS");
  const canResetPassword = isAdmin;

  // Lists & Options state
  const [businesses, setBusinesses] = useState<BusinessListItem[]>([]);
  const [businessTypes, setBusinessTypes] = useState<string[]>([]);
  const [industries, setIndustries] = useState<IndustryLevel4[]>([]);

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [meta, setMeta] = useState<BusinessListMeta>({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  });

  // Filters State
  const [filters, setFilters] = useState({
    businessName: "",
    taxCode: "",
    businessType: "",
    industryCode: "",
    wardCommune: "",
    isActive: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modals & Wizard state
  const [passwordResetEnterprise, setPasswordResetEnterprise] = useState<BusinessListItem | null>(null);
  const [wizardMode, setWizardMode] = useState<"create" | "edit" | "view" | null>(null);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const resolveBusinessAccountUserId = async (business: BusinessListItem) => {
    if (business.accountUserId !== undefined && business.accountUserId !== null) {
      return business.accountUserId;
    }

    const username = (business.accountUsername || business.taxCode || "").trim();
    if (!username) {
      return null;
    }

    const response = await getUsers({ username, limit: 20 });
    if (!response.success || !response.data?.items?.length) {
      return null;
    }

    const matchedUser = response.data.items.find(
      (user) => user.username?.trim().toLowerCase() === username.toLowerCase(),
    );

    return matchedUser?.id ?? null;
  };

  // Fetch BUSINESS_TYPES & INDUSTRIES options from backend/frontend API
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [optRes, indRes] = await Promise.all([
          getBusinessOptions(),
          getIndustries(),
        ]);
        if (optRes.success && optRes.data) {
          setBusinessTypes(optRes.data.businessTypes);
        }
        if (indRes.success && indRes.data) {
          setIndustries(indRes.data);
        }
      } catch (error) {
        showToast("Không thể tải cấu hình danh mục hoặc ngành nghề doanh nghiệp", "error");
      }
    };
    fetchOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load business list on page, limit, or filter changes
  useEffect(() => {
    let active = true;
    const loadBusinesses = async () => {
      setIsLoading(true);
      try {
        const response = await getBusinesses({
          page,
          limit,
          businessName: filters.businessName,
          taxCode: filters.taxCode,
          businessType: filters.businessType,
          industryCode: filters.industryCode,
          wardCommune: filters.wardCommune,
          isActive: filters.isActive,
        });

        if (active && response.success && response.data) {
          setBusinesses(response.data.items);
          setMeta(response.data.meta);
        }
      } catch (error) {
        if (active) {
          showToast(error instanceof Error ? error.message : "Không thể tải danh sách doanh nghiệp", "error");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    const delayDebounceFn = setTimeout(() => {
      loadBusinesses();
    }, 400);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, filters, refreshTrigger]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to page 1 on filter change
  };

  // Toggle Single Checkbox Selection
  const handleSelectRow = (id: number) => {
    if (!canDelete) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle All Checkboxes
  const handleSelectAll = () => {
    if (!canDelete) return;
    if (selectedIds.length === businesses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(businesses.map((b) => b.id));
    }
  };

  // Toggle Enterprise Status Switch
  const handleToggleActive = async (enterprise: BusinessListItem) => {
    if (!canChangeStatus) return;
    const originalBusinesses = [...businesses];
    // Optimistic UI Update
    setBusinesses((prev) =>
      prev.map((b) => (b.id === enterprise.id ? { ...b, isActive: !b.isActive } : b))
    );

    try {
      const response = await updateBusinessStatus(enterprise.id, !enterprise.isActive);
      if (response.success) {
        showToast("Cập nhật trạng thái doanh nghiệp thành công", "success");
      } else {
        throw new Error("Cập nhật thất bại");
      }
    } catch (error) {
      // Revert if error
      setBusinesses(originalBusinesses);
      showToast(error instanceof Error ? error.message : "Cập nhật trạng thái thất bại", "error");
    }
  };

  const handleSaveWizard = () => {
    setWizardMode(null);
    setEditingId(undefined);
    setPage(1); // Refresh list
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleDeleteSelected = async () => {
    if (!canDelete) return;
    try {
      setIsLoading(true);
      // Delete sequentially
      for (const id of selectedIds) {
        await deleteBusiness(id);
      }
      showToast("Xóa danh sách doanh nghiệp thành công", "success");
      setSelectedIds([]);
      setPage(1); // Refresh list
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Xóa doanh nghiệp thất bại", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const startIdx = meta.totalItems > 0 ? (meta.page - 1) * meta.limit + 1 : 0;
  const endIdx = Math.min(meta.page * meta.limit, meta.totalItems);

  if (
    wizardMode &&
    (wizardMode === "view" ||
      (wizardMode === "create" && canCreate) ||
      (wizardMode === "edit" && canUpdate))
  ) {
    return (
      <CreateEnterprise
        businessTypes={businessTypes}
        onSave={handleSaveWizard}
        onCancel={() => {
          setWizardMode(null);
          setEditingId(undefined);
        }}
        showToast={showToast}
        mode={wizardMode}
        enterpriseId={editingId}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Top Banner Header */}
      <div className="flex items-center justify-between border-t-4 border-emerald-600 bg-white dark:bg-zinc-950 rounded-2xl p-4 shadow-sm border border-zinc-200/60 dark:border-zinc-800/80">
        <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 select-none">
          Danh sách doanh nghiệp
        </h2>
        {canCreate && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => showToast("Chức năng thêm từ file đang được phát triển", "success")}
              className="flex items-center gap-2 px-4 py-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 font-bold text-xs select-none transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Thêm từ file</span>
            </button>
            <button
              onClick={() => setWizardMode("create")}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-md shadow-blue-500/10 active:scale-98 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm mới</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Table Container */}
      <div className="relative flex-1 bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[300px]">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 dark:bg-zinc-950/60 backdrop-blur-[1px] transition-all">
            <div className="flex flex-col items-center gap-2.5 animate-in fade-in zoom-in-95 duration-150">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 select-none">Đang tải danh sách...</span>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              {/* Row 1: Header Titles */}
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-zinc-500 dark:text-zinc-400 text-xs font-bold select-none bg-zinc-50/50 dark:bg-zinc-900/10">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={businesses.length > 0 && selectedIds.length === businesses.length}
                    onChange={handleSelectAll}
                    disabled={!canDelete}
                    className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                  />
                </th>
                <th className="p-4 w-28 text-center">Thao tác</th>
                <th className="p-4">Tên doanh nghiệp</th>
                <th className="p-4 w-40">Mã số thuế</th>
                <th className="p-4">Loại hình kinh doanh</th>
                <th className="p-4">Ngành nghề kinh doanh</th>
                <th className="p-4">Phường/Xã</th>
                <th className="p-4 w-28 text-center">Trạng thái</th>
              </tr>
              {/* Row 2: Inline Column Filters */}
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <td className="p-2"></td>
                <td className="p-2"></td>
                <td className="p-2">
                  <input
                    type="text"
                    className="w-full text-xs px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 focus:border-blue-500 transition-colors"
                    placeholder="Tìm tên DN"
                    value={filters.businessName}
                    onChange={(e) => handleFilterChange("businessName", e.target.value)}
                  />
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    className="w-full text-xs px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 focus:border-blue-500 transition-colors"
                    placeholder="Tìm mã số thuế"
                    value={filters.taxCode}
                    onChange={(e) => handleFilterChange("taxCode", e.target.value)}
                  />
                </td>
                <td className="p-2 relative min-w-[150px]">
                  <select
                    className="w-full text-xs pl-3 pr-8 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 appearance-none cursor-pointer focus:border-blue-500 transition-colors"
                    value={filters.businessType}
                    onChange={(e) => handleFilterChange("businessType", e.target.value)}
                  >
                    <option value="">Tất cả</option>
                    {businessTypes.map((t) => (
                      <option key={t} value={t}>
                        {BUSINESS_TYPE_LABELS[t] || t}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                </td>
                <td className="p-2 relative min-w-[150px]">
                  <select
                    className="w-full text-xs pl-3 pr-8 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 appearance-none cursor-pointer focus:border-blue-500 transition-colors"
                    value={filters.industryCode}
                    onChange={(e) => handleFilterChange("industryCode", e.target.value)}
                  >
                    <option value="">Tất cả</option>
                    {industries.map((ind) => (
                      <option key={ind.code} value={ind.code}>
                        {ind.code} - {ind.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                </td>
                <td className="p-2 relative min-w-[140px]">
                  <select
                    className="w-full text-xs pl-3 pr-8 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 appearance-none cursor-pointer focus:border-blue-500 transition-colors"
                    value={filters.wardCommune}
                    onChange={(e) => handleFilterChange("wardCommune", e.target.value)}
                  >
                    <option value="">Tất cả</option>
                    {WARD_OPTIONS.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                </td>
                <td className="p-2 relative min-w-[130px]">
                  <select
                    className="w-full text-xs pl-3 pr-8 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 appearance-none cursor-pointer focus:border-blue-500 transition-colors"
                    value={filters.isActive}
                    onChange={(e) => handleFilterChange("isActive", e.target.value)}
                  >
                    <option value="">Tất cả</option>
                    <option value="true">Hoạt động</option>
                    <option value="false">Ngừng hoạt động</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                </td>
              </tr>
            </thead>
            <tbody>
              {businesses.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-zinc-400 dark:text-zinc-500 font-semibold select-none text-sm">
                    Không tìm thấy doanh nghiệp nào phù hợp.
                  </td>
                </tr>
              ) : (
                businesses.map((ent) => (
                  <tr
                    key={ent.id}
                    className="border-b border-zinc-100 dark:border-zinc-800/80 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
                  >
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(ent.id)}
                        onChange={() => handleSelectRow(ent.id)}
                        disabled={!canDelete}
                        className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                      />
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-3.5">
                        <button
                          onClick={() => {
                            setWizardMode("view");
                            setEditingId(ent.id);
                          }}
                          title="Xem chi tiết"
                          className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer group"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] text-slate-400 group-hover:text-green-600 transition-colors">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                        {canUpdate && (
                          <button
                            onClick={() => {
                              setWizardMode("edit");
                              setEditingId(ent.id);
                            }}
                            title="Chỉnh sửa"
                            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer group"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] text-slate-400 group-hover:text-blue-600 transition-colors">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                          </button>
                        )}
                        {canResetPassword && (
                          <button
                            onClick={() => setPasswordResetEnterprise(ent)}
                            title="Đổi mật khẩu"
                            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer group"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] text-slate-400 group-hover:text-amber-600 transition-colors">
                              <path d="M21 2L12.7 10.3" />
                              <path d="M15 5.5l3 3" />
                              <path d="M11 9.5l2 2" />
                              <circle cx="7.5" cy="16.5" r="4.5" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-bold text-zinc-900 dark:text-zinc-100">{ent.businessName}</td>
                    <td className="p-4 font-mono text-xs text-zinc-650 dark:text-zinc-350">{ent.taxCode}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300">
                        {BUSINESS_TYPE_LABELS[ent.businessType] || ent.businessType}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-zinc-600 dark:text-zinc-400">
                      {ent.industryDisplay || `${ent.industryCode} - ${ent.industryName}`}
                    </td>
                    <td className="p-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{ent.wardCommune}</td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleActive(ent)}
                        disabled={!canChangeStatus}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer
                          ${ent.isActive ? "bg-blue-600" : "bg-zinc-200 dark:bg-zinc-800"}
                          ${canChangeStatus ? "" : "cursor-not-allowed opacity-50"}
                        `}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm
                            ${ent.isActive ? "translate-x-6" : "translate-x-1"}
                          `}
                        />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-semibold text-zinc-500 select-none">
          <button
            onClick={() => showToast("Chức năng xuất dữ liệu đang được phát triển", "success")}
            className="flex items-center gap-2 px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-lg text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất dữ liệu</span>
          </button>

          <div className="flex items-center gap-6">
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
              {meta.totalItems > 0 ? `${startIdx} - ${endIdx} of ${meta.totalItems}` : "0 - 0 of 0"}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={!meta.hasPreviousPage || isLoading}
                className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-50 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, meta.totalPages))}
                disabled={!meta.hasNextPage || isLoading}
                className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-50 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>





      {/* Reset Password Modal */}
      {passwordResetEnterprise && canResetPassword && (
        <ResetPasswordModal
          username={passwordResetEnterprise.accountUsername || passwordResetEnterprise.taxCode}
          onSave={async (pw) => {
            try {
              const resolvedUserId = await resolveBusinessAccountUserId(passwordResetEnterprise);
              if (!resolvedUserId) {
                showToast("Không tìm thấy tài khoản liên kết với doanh nghiệp này", "error");
                return;
              }
              const response = await updateUserAdmin(resolvedUserId, {
                password: pw,
              });
              if (response.success) {
                showToast("Đổi mật khẩu thành công.", "success");
                setPasswordResetEnterprise(null);
              } else {
                throw new Error(response.message || "Đổi mật khẩu thất bại");
              }
            } catch (error) {
              showToast(error instanceof Error ? error.message : "Đổi mật khẩu thất bại", "error");
              throw error;
            }
          }}
          onCancel={() => setPasswordResetEnterprise(null)}
          showToast={showToast}
        />
      )}

      {/* Selection Action Bar */}
      {canDelete && selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex items-center justify-between overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300 dark:border-zinc-800 dark:bg-zinc-900 -translate-x-1/2">
          <div className="flex items-center">
            <div className="flex min-w-[40px] h-10 items-center justify-center bg-blue-600 px-3 text-sm font-bold text-white">
              {selectedIds.length}
            </div>
            <span className="px-3.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 select-none">
              dữ liệu được chọn
            </span>
          </div>
          <div className="flex items-center gap-3 pr-3">
            <button
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs px-3.5 py-1.5 flex items-center gap-1.5 transition-all shadow-md shadow-red-500/10 cursor-pointer"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
              </svg>
              <span>Xoá</span>
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

      <DeleteConfirmModal
        isOpen={canDelete && isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteSelected}
        title="Xác nhận xóa doanh nghiệp"
        description={
          <>
            Bạn có chắc chắn muốn xóa <strong>{selectedIds.length}</strong> doanh nghiệp đã chọn không? Hành động này sẽ xóa vĩnh viễn dữ liệu doanh nghiệp khỏi hệ thống và không thể hoàn tác.
          </>
        }
      />
    </div>
  );
};

// ==========================================
// Sub-Components
// ==========================================

// --- View Enterprise Details Modal ---
interface EnterpriseDetailModalProps {
  enterprise: BusinessListItem;
  onCancel: () => void;
}

const EnterpriseDetailModal: React.FC<EnterpriseDetailModalProps> = ({ enterprise, onCancel }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onCancel} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-[20px] w-full max-w-[460px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        <div className="bg-blue-600 dark:bg-blue-700 text-white py-4 text-center font-bold text-base select-none tracking-wide">
          Chi tiết doanh nghiệp
        </div>

        <div className="p-6 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
          {/* Tên doanh nghiệp */}
          <div className="relative border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 flex flex-col justify-center bg-zinc-50 dark:bg-zinc-900/40">
            <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 font-bold">
              Tên doanh nghiệp
            </label>
            <input
              type="text"
              readOnly
              className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold pt-2 pb-0.5"
              value={enterprise.businessName}
            />
          </div>

          {/* Mã số thuế */}
          <div className="relative border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 flex flex-col justify-center bg-zinc-50 dark:bg-zinc-900/40">
            <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 font-bold">
              Mã số thuế
            </label>
            <input
              type="text"
              readOnly
              className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold pt-2 pb-0.5 font-mono"
              value={enterprise.taxCode}
            />
          </div>

          {/* Loại hình kinh doanh */}
          <div className="relative border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 flex flex-col justify-center bg-zinc-50 dark:bg-zinc-900/40">
            <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 font-bold">
              Loại hình kinh doanh
            </label>
            <input
              type="text"
              readOnly
              className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold pt-2 pb-0.5"
              value={BUSINESS_TYPE_LABELS[enterprise.businessType] || enterprise.businessType}
            />
          </div>

          {/* Ngành nghề kinh doanh */}
          <div className="relative border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 flex flex-col justify-center bg-zinc-50 dark:bg-zinc-900/40">
            <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 font-bold">
              Ngành nghề kinh doanh
            </label>
            <input
              type="text"
              readOnly
              className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold pt-2 pb-0.5"
              value={enterprise.industryDisplay || `${enterprise.industryCode} - ${enterprise.industryName}`}
            />
          </div>

          {/* Phường/Xã */}
          <div className="relative border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 flex flex-col justify-center bg-zinc-50 dark:bg-zinc-900/40">
            <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 font-bold">
              Phường/Xã DKKD
            </label>
            <input
              type="text"
              readOnly
              className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold pt-2 pb-0.5"
              value={enterprise.wardCommune}
            />
          </div>

          {/* Địa chỉ chi tiết */}
          <div className="relative border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 flex flex-col justify-center bg-zinc-50 dark:bg-zinc-900/40">
            <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 font-bold">
              Địa chỉ chi tiết DKKD
            </label>
            <input
              type="text"
              readOnly
              className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold pt-2 pb-0.5"
              value={enterprise.address || "-"}
            />
          </div>

          {/* Trạng thái */}
          <div className="relative border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 flex flex-col justify-center bg-zinc-50 dark:bg-zinc-900/40">
            <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 font-bold">
              Trạng thái
            </label>
            <input
              type="text"
              readOnly
              className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold pt-2 pb-0.5"
              value={enterprise.isActive ? "Hoạt động" : "Ngừng hoạt động"}
            />
          </div>
        </div>

        <div className="flex items-center justify-end px-6 pb-6 select-none font-bold text-sm">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Edit Enterprise Modal ---
interface EditEnterpriseModalProps {
  enterprise: BusinessListItem;
  businessTypes: string[];
  onSave: () => void;
  onCancel: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

const EditEnterpriseModal: React.FC<EditEnterpriseModalProps> = ({
  enterprise,
  businessTypes,
  onSave,
  onCancel,
  showToast,
}) => {
  const [name, setName] = useState(enterprise.businessName);
  const [taxCode, setTaxCode] = useState(enterprise.taxCode);
  const [businessType, setBusinessType] = useState(enterprise.businessType);
  const [industryCode, setIndustryCode] = useState(enterprise.industryCode);
  const [industryName, setIndustryName] = useState(enterprise.industryName);
  const [ward, setWard] = useState(enterprise.wardCommune);
  const [address, setAddress] = useState(enterprise.address || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Vui lòng nhập tên doanh nghiệp", "error");
      return;
    }
    if (!taxCode.trim()) {
      showToast("Vui lòng nhập mã số thuế", "error");
      return;
    }
    if (!/^\d{10}(-\d{3})?$/.test(taxCode.replace(/\s/g, ""))) {
      showToast("Mã số thuế phải gồm 10 số hoặc dạng 10 số-3 số", "error");
      return;
    }
    if (!businessType) {
      showToast("Vui lòng chọn loại hình kinh doanh", "error");
      return;
    }
    if (!industryCode) {
      showToast("Vui lòng chọn ngành nghề kinh doanh", "error");
      return;
    }
    if (!ward) {
      showToast("Vui lòng chọn phường/xã", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("businessName", name.trim());
      fd.append("taxCode", taxCode.replace(/\s/g, ""));
      fd.append("businessType", businessType);
      fd.append("industryCode", industryCode);
      fd.append("industryName", industryName);
      fd.append("provinceCity", "Thành phố Hồ Chí Minh");
      fd.append("wardCommune", ward);
      fd.append("address", address.trim());
      fd.append("isActive", String(enterprise.isActive));

      const response = await updateBusiness(enterprise.id, fd);
      if (response.success) {
        onSave();
      } else {
        throw new Error(response.message || "Cập nhật thất bại");
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Cập nhật doanh nghiệp thất bại", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={isSubmitting ? undefined : onCancel} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <form
        onSubmit={handleSubmit}
        className="relative bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-[20px] w-full max-w-[460px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
      >
        <div className="bg-blue-600 dark:bg-blue-700 text-white py-4 text-center font-bold text-base select-none tracking-wide">
          Chỉnh sửa doanh nghiệp
        </div>

        <div className="p-6 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
          {/* Tên doanh nghiệp */}
          <div className="relative border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950">
            <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 font-bold">
              Tên doanh nghiệp <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold pt-2 pb-0.5"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Mã số thuế */}
          <div className="relative border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950">
            <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 font-bold">
              Mã số thuế <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold pt-2 pb-0.5 font-mono"
              value={taxCode}
              onChange={(e) => setTaxCode(e.target.value)}
            />
          </div>

          {/* Loại hình kinh doanh */}
          <SearchSelect
            label="Loại hình kinh doanh"
            value={businessType}
            options={businessTypes.map((t) => ({
              value: t,
              label: BUSINESS_TYPE_LABELS[t] || t,
            }))}
            placeholder="Chọn loại hình"
            onChange={setBusinessType}
            required
          />

          {/* Ngành nghề kinh doanh */}
          <IndustrySearchSelect
            value={industryCode}
            onChange={(code, name) => {
              setIndustryCode(code);
              setIndustryName(name);
            }}
          />

          {/* Phường/Xã */}
          <SearchSelect
            label="Phường/Xã DKKD"
            value={ward}
            options={WARD_OPTIONS.map((w) => ({
              value: w,
              label: w,
            }))}
            placeholder="Chọn phường/xã"
            onChange={setWard}
            required
          />

          {/* Địa chỉ chi tiết */}
          <div className="relative border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 bg-white dark:bg-zinc-950">
            <label className="absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 font-bold">
              Địa chỉ chi tiết DKKD
            </label>
            <input
              type="text"
              className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-semibold pt-2 pb-0.5"
              placeholder="Nhập địa chỉ đăng ký"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-5 px-6 pb-6 select-none font-bold text-sm">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
          >
            {isSubmitting ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </form>
    </div>
  );
};


