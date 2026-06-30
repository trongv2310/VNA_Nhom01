"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  X,
  Save,
} from "lucide-react";
import { SearchSelect } from "./SearchSelect";

import {
  createBusinessIndustry,
  createBusinessType,
  getBusinessIndustries,
  getBusinessTypes,
  updateBusinessIndustry,
  updateBusinessIndustryStatus,
  updateBusinessType,
  updateBusinessTypeCatalogStatus,
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
  const [parentOptions, setParentOptions] = useState<
    BusinessIndustryCatalogItem[]
  >([]);
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

  useEffect(() => {
    if (!isIndustry || !isModalOpen) return;
    let active = true;
    const loadParents = async () => {
      try {
        const first = await getBusinessIndustries({ page: 1, limit: 100 });
        const all = [...first.data.items];
        for (
          let nextPage = 2;
          nextPage <= first.data.meta.totalPages;
          nextPage += 1
        ) {
          const next = await getBusinessIndustries({
            page: nextPage,
            limit: 100,
          });
          all.push(...next.data.items);
        }
        if (active) {
          setParentOptions(
            all.filter(
              (item) =>
                item.isActive && item.level < 4 && item.id !== editingItem?.id,
            ),
          );
        }
      } catch (error) {
        if (active) {
          showToast(
            error instanceof Error
              ? error.message
              : "Không thể tải danh mục ngành cha",
            "error",
          );
        }
      }
    };
    loadParents();
    return () => {
      active = false;
    };
    // showToast is intentionally omitted because the dashboard callback is not memoized.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingItem?.id, isIndustry, isModalOpen]);

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
      const expectsDigits = Boolean(form.parentId) || /^\d/.test(codeTrim);
      const pattern = expectsDigits ? /^\d{4}$/ : /^[A-Za-z]$/;
      if (!pattern.test(codeTrim)) {
        next.code = expectsDigits
          ? "Mã ngành phải gồm 4 chữ số"
          : "Mã ngành cấp 1 phải gồm một chữ cái";
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
  const sortedParents = useMemo(
    () =>
      [...parentOptions].sort(
        (left, right) =>
          left.level - right.level ||
          left.code.localeCompare(right.code, "vi", { numeric: true }),
      ),
    [parentOptions],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-800">{title}</h2>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Thêm mới
          </button>
        )}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
          </div>
        )}
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 bg-zinc-50 text-zinc-500">
              <tr className="border-b border-zinc-200">
                <th className="w-24 p-4 text-center">Thao tác</th>
                <th className="w-40 p-4">Mã</th>
                <th className="p-4">Tên danh mục</th>
                {isIndustry && <th className="w-24 p-4">Cấp</th>}
                {isIndustry && <th className="w-64 p-4">Danh mục cha</th>}
                <th className="w-32 p-4 text-center">Trạng thái</th>
              </tr>
              <tr className="border-b border-zinc-200 bg-white">
                <th />
                <th className="p-2">
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
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-blue-500"
                  />
                </th>
                <th className="p-2">
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
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-blue-500"
                  />
                </th>
                {isIndustry && (
                  <th className="p-2">
                    <select
                      value={filters.level}
                      onChange={(event) => {
                        setFilters((value) => ({
                          ...value,
                          level: event.target.value,
                        }));
                        setPage(1);
                      }}
                      className="w-full rounded-lg border border-zinc-200 px-2 py-2"
                    >
                      <option value="">Tất cả</option>
                      {[1, 2, 3, 4].map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </th>
                )}
                {isIndustry && <th />}
                <th className="p-2">
                  <select
                    value={filters.isActive}
                    onChange={(event) => {
                      setFilters((value) => ({
                        ...value,
                        isActive: event.target.value,
                      }));
                      setPage(1);
                    }}
                    className="w-full rounded-lg border border-zinc-200 px-2 py-2"
                  >
                    <option value="">Tất cả</option>
                    <option value="true">Sử dụng</option>
                    <option value="false">Không sử dụng</option>
                  </select>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {!isLoading && items.length === 0 ? (
                <tr>
                  <td
                    colSpan={isIndustry ? 6 : 4}
                    className="py-16 text-center font-semibold text-zinc-400"
                  >
                    Không tìm thấy dữ liệu phù hợp
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const industry = isIndustry && "level" in item ? item : null;
                  return (
                    <tr key={item.id} className="hover:bg-blue-50/30">
                      <td className="p-4 text-center">
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="text-slate-400 hover:text-blue-600"
                            aria-label="Chỉnh sửa"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                          </button>
                        )}
                      </td>
                      <td className="p-4 font-mono font-semibold">
                        {item.code}
                      </td>
                      <td className="p-4 font-semibold">{item.name}</td>
                      {isIndustry && (
                        <td className="p-4">Cấp {industry?.level}</td>
                      )}
                      {isIndustry && (
                        <td className="p-4 text-zinc-500">
                          {industry?.parentCode
                            ? `${industry.parentCode} - ${industry.parentName}`
                            : "-"}
                        </td>
                      )}
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          disabled={!canManage}
                          onClick={() => toggleStatus(item)}
                          className={`relative h-6 w-11 rounded-full transition-colors ${
                            item.isActive ? "bg-blue-600" : "bg-zinc-300"
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                          aria-label="Đổi trạng thái"
                        >
                          <span
                            className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${
                              item.isActive ? "left-6" : "left-1"
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

        <div className="flex items-center justify-end gap-5 border-t border-zinc-200 px-5 py-3 text-xs text-zinc-500">
          <select
            value={limit}
            onChange={(event) => {
              setLimit(Number(event.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-zinc-200 px-3 py-2"
          >
            {[10, 20, 50].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <span>
            {rangeStart} - {rangeEnd} of {meta.totalItems}
          </span>
          <button
            type="button"
            disabled={!meta.hasPreviousPage}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            className="disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={!meta.hasNextPage}
            onClick={() => setPage((value) => value + 1)}
            className="disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
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

              {isIndustry && (
                <SearchSelect
                  label="Nhóm ngành cha"
                  value={form.parentId}
                  options={[
                    { value: "", label: "Không có - ngành cấp 1" },
                    ...sortedParents.map((item) => ({
                      value: String(item.id),
                      label: `${item.code} - ${item.name}`,
                    })),
                  ]}
                  placeholder="Chọn nhóm ngành cha"
                  onChange={(val) => {
                    setForm((value) => ({
                      ...value,
                      parentId: val,
                    }));
                    if (errors.code) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.code;
                        return next;
                      });
                    }
                  }}
                />
              )}

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
    </div>
  );
};
