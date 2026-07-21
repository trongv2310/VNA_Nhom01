"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  X,
  Save,
  ChevronDown,
} from "lucide-react";
import { SearchSelect } from "./SearchSelect";
import { DeleteConfirmModal } from "./DeleteConfirmModal";

import {
  createBusinessIndustry,
  createBusinessType,
  getBusinessIndustries,
  getBusinessTypes,
  updateBusinessIndustry,
  updateBusinessIndustryStatus,
  updateBusinessType,
  updateBusinessTypeCatalogStatus,
  deleteBusinessType,
  deleteBusinessIndustry,
  type BusinessIndustryCatalogItem,
  type BusinessListMeta,
  type BusinessTypeCatalogItem,
} from "../services/api";

type ReferenceKind = "business-type" | "industry";
type ReferenceItem = BusinessTypeCatalogItem | BusinessIndustryCatalogItem;

interface BusinessReferenceManagementProps {
  kind: ReferenceKind;
  showToast: (message: string, type: "success" | "error") => void;
  permissions?: string[];
  isAdmin?: boolean;
}

const EMPTY_META: BusinessListMeta = {
  page: 1,
  limit: 10,
  totalItems: 0,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
};

export const BusinessReferenceManagement: React.FC<
  BusinessReferenceManagementProps
> = ({ kind, showToast, permissions = [], isAdmin = false }) => {
  const isIndustry = kind === "industry";
  const title = isIndustry
    ? "Danh sách ngành nghề kinh doanh"
    : "Danh sách loại hình kinh doanh";
  const canManage =
    isAdmin ||
    permissions.includes(
      isIndustry ? "SYSTEM_C_INDUSTRY_MANAGE" : "SYSTEM_C_BUSINESS_TYPE_MANAGE",
    );

  const [items, setItems] = useState<ReferenceItem[]>([]);
  const [meta, setMeta] = useState<BusinessListMeta>(EMPTY_META);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState({
    code: "",
    name: "",
    level: "",
    isActive: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingItem, setEditingItem] = useState<ReferenceItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    parentId: "",
    sortOrder: "0",
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Clear selections when page/filters/kind changes
  useEffect(() => {
    setSelectedIds([]);
  }, [page, limit, filters, refreshKey, kind]);

  const handleSelectRow = (id: number) => {
    if (!canManage) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (!canManage) return;
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((b) => b.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (!canManage) return;
    setIsLoading(true);
    try {
      for (const id of selectedIds) {
        if (isIndustry) {
          await deleteBusinessIndustry(id);
        } else {
          await deleteBusinessType(id);
        }
      }
      showToast(
        isIndustry
          ? "Xóa ngành nghề kinh doanh thành công"
          : "Xóa loại hình kinh doanh thành công",
        "success",
      );
      setSelectedIds([]);
      setPage(1);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : isIndustry
            ? "Xóa ngành nghề kinh doanh thất bại"
            : "Xóa loại hình kinh doanh thất bại",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = isIndustry
        ? await getBusinessIndustries({
          page,
          limit,
          code: filters.code,
          name: filters.name,
          level: filters.level,
          isActive: filters.isActive,
        })
        : await getBusinessTypes({
          page,
          limit,
          code: filters.code,
          name: filters.name,
          isActive: filters.isActive,
        });
      setItems(response.data.items);
      setMeta(response.data.meta);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Không thể tải danh mục",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
    // showToast is intentionally omitted because the dashboard callback is not memoized.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, isIndustry, limit, page]);

  useEffect(() => {
    const timer = window.setTimeout(loadItems, 250);
    return () => window.clearTimeout(timer);
  }, [loadItems, refreshKey]);



  const openCreate = () => {
    setEditingItem(null);
    setForm({
      code: "",
      name: "",
      parentId: "",
      sortOrder: "0",
      isActive: true,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (item: ReferenceItem) => {
    setEditingItem(item);
    setForm({
      code: item.code,
      name: item.name,
      parentId:
        isIndustry && "parentId" in item && item.parentId
          ? String(item.parentId)
          : "",
      sortOrder: String(item.sortOrder ?? 0),
      isActive: item.isActive,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.code.trim()) next.code = "Mã không được để trống";
    if (!form.name.trim()) next.name = "Tên không được để trống";
    if (!editingItem && isIndustry) {
      const codeTrim = form.code.trim();
      const pattern = /^\d{4}$/;
      if (!pattern.test(codeTrim)) {
        next.code = "Mã ngành phải gồm 4 chữ số";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      if (isIndustry) {
        if (editingItem) {
          await updateBusinessIndustry(editingItem.id, {
            name: form.name.trim(),
            parentId: form.parentId ? Number(form.parentId) : null,
            sortOrder: Number(form.sortOrder) || 0,
          });
          if (editingItem.isActive !== form.isActive) {
            await updateBusinessIndustryStatus(editingItem.id, form.isActive);
          }
        } else {
          await createBusinessIndustry({
            code: form.code.trim(),
            name: form.name.trim(),
            parentId: form.parentId ? Number(form.parentId) : undefined,
            sortOrder: Number(form.sortOrder) || 0,
            isActive: form.isActive,
          });
        }
      } else if (editingItem) {
        await updateBusinessType(editingItem.id, {
          name: form.name.trim(),
          sortOrder: Number(form.sortOrder) || 0,
        });
        if (editingItem.isActive !== form.isActive) {
          await updateBusinessTypeCatalogStatus(editingItem.id, form.isActive);
        }
      } else {
        await createBusinessType({
          code: form.code.trim(),
          name: form.name.trim(),
          sortOrder: Number(form.sortOrder) || 0,
          isActive: form.isActive,
        });
      }
      showToast(
        editingItem
          ? "Cập nhật danh mục thành công"
          : "Thêm danh mục thành công",
        "success",
      );
      setIsModalOpen(false);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Không thể lưu danh mục",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (item: ReferenceItem) => {
    if (!canManage) return;
    try {
      if (isIndustry) {
        await updateBusinessIndustryStatus(item.id, !item.isActive);
      } else {
        await updateBusinessTypeCatalogStatus(item.id, !item.isActive);
      }
      showToast("Cập nhật trạng thái thành công", "success");
      setRefreshKey((value) => value + 1);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật trạng thái",
        "error",
      );
    }
  };

  const rangeStart = meta.totalItems ? (meta.page - 1) * meta.limit + 1 : 0;
  const rangeEnd = Math.min(meta.page * meta.limit, meta.totalItems);


  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Top Banner Header */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-950 rounded-2xl p-4 shadow-sm border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 select-none">
          {title}
        </h2>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-md shadow-blue-500/10 active:scale-98 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm mới</span>
          </button>
        )}
      </div>

      {/* Main Table Container */}
      <div className="relative flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[300px]">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 dark:bg-zinc-950/60 backdrop-blur-[1px] transition-all">
            <div className="flex flex-col items-center gap-2.5 animate-in fade-in zoom-in-95 duration-150">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 select-none">
                Đang tải danh sách...
              </span>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              {/* Row 1: Header Titles */}
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-zinc-500 dark:text-zinc-400 text-xs font-bold select-none bg-zinc-50/50 dark:bg-zinc-900/10">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={
                      items.length > 0 &&
                      selectedIds.length === items.length
                    }
                    onChange={handleSelectAll}
                    disabled={!canManage}
                    className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                  />
                </th>
                <th className="p-4 w-24 text-center">Thao tác</th>
                <th className="p-4 w-40">Mã</th>
                <th className="p-4">Tên danh mục</th>
                <th className="p-4 w-32 text-center">Trạng thái</th>
              </tr>
              {/* Row 2: Inline Column Filters */}
              <tr className="border-b border-zinc-200 dark:border-zinc-800 select-none">
                <td className="p-2"></td>
                <td className="p-2"></td>
                <td className="p-2">
                  <input
                    value={filters.code}
                    onChange={(event) => {
                      setFilters((value) => ({
                        ...value,
                        code: event.target.value,
                      }));
                      setPage(1);
                    }}
                    placeholder="Tìm mã"
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 focus:border-blue-500 transition-colors"
                  />
                </td>
                <td className="p-2">
                  <input
                    value={filters.name}
                    onChange={(event) => {
                      setFilters((value) => ({
                        ...value,
                        name: event.target.value,
                      }));
                      setPage(1);
                    }}
                    placeholder="Tìm tên"
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 focus:border-blue-500 transition-colors"
                  />
                </td>
                <td className="p-2 relative min-w-[130px]">
                  <select
                    value={filters.isActive}
                    onChange={(event) => {
                      setFilters((value) => ({
                        ...value,
                        isActive: event.target.value,
                      }));
                      setPage(1);
                    }}
                    className="w-full pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 appearance-none cursor-pointer focus:border-blue-500 transition-colors"
                  >
                    <option value="">Tất cả</option>
                    <option value="true">Sử dụng</option>
                    <option value="false">Không sử dụng</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                </td>
              </tr>
            </thead>
            <tbody>
              {!isLoading && items.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-12 text-center text-zinc-400 dark:text-zinc-555 font-semibold text-xs select-none"
                  >
                    Không tìm thấy dữ liệu phù hợp
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-zinc-100 dark:border-zinc-800/80 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => handleSelectRow(item.id)}
                          disabled={!canManage}
                          className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </td>
                      <td className="p-4 text-center">
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-blue-600 transition-all cursor-pointer"
                            aria-label="Chỉnh sửa"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                          </button>
                        )}
                      </td>
                      <td className="p-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {item.code}
                      </td>
                      <td className="p-4 font-bold text-zinc-900 dark:text-zinc-100">
                        {item.name}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          disabled={!canManage}
                          onClick={() => toggleStatus(item)}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            item.isActive ? "bg-blue-600" : "bg-zinc-200 dark:bg-zinc-800"
                          } ${canManage ? "" : "cursor-not-allowed opacity-50"}`}
                          aria-label="Đổi trạng thái"
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              item.isActive ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination Controls */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-semibold text-zinc-500 gap-6 select-none">
          <div className="flex items-center gap-2">
            <select
              className="px-2 py-1 border border-zinc-200 dark:border-zinc-800 rounded-md bg-white dark:bg-zinc-950 outline-none text-zinc-700 dark:text-zinc-300 cursor-pointer font-bold"
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <span className="font-bold">
            {meta.totalItems > 0
              ? `${rangeStart} - ${rangeEnd} of ${meta.totalItems}`
              : "0 - 0 of 0"}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!meta.hasPreviousPage || isLoading}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-650 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={!meta.hasNextPage || isLoading}
              onClick={() => setPage((value) => value + 1)}
              className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-650 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="bg-blue-600 dark:bg-blue-700 text-white py-4 text-center font-bold text-lg select-none tracking-wide relative rounded-t-2xl">
              {editingItem ? "Cập nhật" : "Thêm mới"}{" "}
              {isIndustry ? "ngành nghề kinh doanh" : "loại hình kinh doanh"}
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              {/* Mã ngành */}
              <div className="flex flex-col gap-1">
                <div className={`relative border rounded-xl px-4 py-2.5 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 transition-all bg-white dark:bg-zinc-950
                  ${errors.code ? "border-red-500 ring-1 ring-red-500" : "border-zinc-200 dark:border-zinc-800"}
                  ${editingItem ? "opacity-60 bg-zinc-50 dark:bg-zinc-900/40" : ""}
                `}>
                  <label className={`absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold transition-colors
                    ${errors.code ? "text-red-500" : "text-zinc-400 dark:text-zinc-500"}
                  `}>
                    Mã {isIndustry ? "ngành" : "loại hình"} <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.code}
                    disabled={Boolean(editingItem)}
                    onChange={(event) => {
                      setForm((value) => ({ ...value, code: event.target.value }));
                      if (errors.code) setErrors((prev) => { const next = { ...prev }; delete next.code; return next; });
                    }}
                    className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-bold pt-2 pb-0.5 disabled:cursor-not-allowed"
                  />
                </div>
                {errors.code && (
                  <span className="text-xs text-red-500 pl-1 font-semibold">
                    {errors.code}
                  </span>
                )}
              </div>

              {/* Tên ngành */}
              <div className="flex flex-col gap-1">
                <div className={`relative border rounded-xl px-4 py-2.5 flex flex-col justify-center focus-within:ring-1 focus-within:ring-blue-600 focus-within:border-blue-600 transition-all bg-white dark:bg-zinc-950
                  ${errors.name ? "border-red-500 ring-1 ring-red-500" : "border-zinc-200 dark:border-zinc-800"}
                `}>
                  <label className={`absolute -top-2.5 left-3 bg-white dark:bg-zinc-950 px-1.5 text-[11px] font-bold transition-colors
                    ${errors.name ? "text-red-500" : "text-zinc-400 dark:text-zinc-500"}
                  `}>
                    Tên {isIndustry ? "ngành" : "loại hình"} <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.name}
                    onChange={(event) => {
                      setForm((value) => ({ ...value, name: event.target.value }));
                      if (errors.name) setErrors((prev) => { const next = { ...prev }; delete next.name; return next; });
                    }}
                    className="w-full bg-transparent border-0 outline-none text-zinc-800 dark:text-zinc-200 text-sm font-bold pt-2 pb-0.5"
                  />
                </div>
                {errors.name && (
                  <span className="text-xs text-red-500 pl-1 font-semibold">
                    {errors.name}
                  </span>
                )}
              </div>



              <SearchSelect
                label="Trạng thái"
                required
                value={form.isActive ? "true" : "false"}
                options={[
                  { value: "true", label: "Sử dụng" },
                  { value: "false", label: "Không sử dụng" },
                ]}
                onChange={(val) =>
                  setForm((value) => ({
                    ...value,
                    isActive: val === "true",
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-end gap-5 px-6 pb-6 select-none text-xs font-bold rounded-b-2xl">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 font-bold transition-colors cursor-pointer focus:outline-none"
              >
                Huỷ bỏ
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={save}
                className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 font-bold shadow-md transition-all active:scale-98 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Lưu</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selection Action Bar */}
      {canManage && selectedIds.length > 0 && (
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
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3.5 h-3.5"
              >
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
        isOpen={canManage && isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteSelected}
        title={isIndustry ? "Xác nhận xóa ngành nghề kinh doanh" : "Xác nhận xóa loại hình kinh doanh"}
        description={
          isIndustry ? (
            <>
              Bạn có chắc chắn muốn xóa <strong>{selectedIds.length}</strong>{" "}
              ngành nghề kinh doanh đã chọn không? Hành động này sẽ xóa vĩnh viễn dữ liệu.
            </>
          ) : (
            <>
              Bạn có chắc chắn muốn xóa <strong>{selectedIds.length}</strong>{" "}
              loại hình kinh doanh đã chọn không? Hành động này sẽ xóa vĩnh viễn dữ liệu.
            </>
          )
        }
      />
    </div>
  );
};
