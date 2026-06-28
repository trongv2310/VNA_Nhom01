"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  X,
} from "lucide-react";

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
      const expectedLevel = form.parentId
        ? (parentOptions.find((item) => item.id === Number(form.parentId))
            ?.level ?? 0) + 1
        : 1;
      const pattern =
        expectedLevel === 1
          ? /^[A-Za-z]$/
          : new RegExp(`^\\d{${expectedLevel}}$`);
      if (!pattern.test(form.code.trim())) {
        next.code =
          expectedLevel === 1
            ? "Mã ngành cấp 1 phải gồm một chữ cái"
            : `Mã ngành cấp ${expectedLevel} phải gồm ${expectedLevel} chữ số`;
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
                            <Pencil className="h-4 w-4" />
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
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-blue-600 px-6 py-5 text-white">
              <h3 className="text-xl font-bold">
                {editingItem ? "Cập nhật" : "Thêm mới"}{" "}
                {isIndustry ? "ngành nghề kinh doanh" : "loại hình kinh doanh"}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5 p-6">
              <label className="block text-sm font-semibold text-zinc-700">
                Mã <span className="text-red-500">*</span>
                <input
                  value={form.code}
                  disabled={Boolean(editingItem)}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, code: event.target.value }))
                  }
                  className={`mt-2 w-full rounded-xl border px-4 py-3 outline-none ${
                    errors.code
                      ? "border-red-500"
                      : "border-zinc-200 focus:border-blue-500"
                  } disabled:bg-zinc-100`}
                />
                {errors.code && (
                  <span className="mt-1 block text-xs text-red-500">
                    {errors.code}
                  </span>
                )}
              </label>
              <label className="block text-sm font-semibold text-zinc-700">
                Tên <span className="text-red-500">*</span>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, name: event.target.value }))
                  }
                  className={`mt-2 w-full rounded-xl border px-4 py-3 outline-none ${
                    errors.name
                      ? "border-red-500"
                      : "border-zinc-200 focus:border-blue-500"
                  }`}
                />
                {errors.name && (
                  <span className="mt-1 block text-xs text-red-500">
                    {errors.name}
                  </span>
                )}
              </label>
              {isIndustry && (
                <label className="block text-sm font-semibold text-zinc-700">
                  Nhóm ngành cha
                  <select
                    value={form.parentId}
                    onChange={(event) =>
                      setForm((value) => ({
                        ...value,
                        parentId: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="">Không có - ngành cấp 1</option>
                    {sortedParents.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code} - {item.name} (Cấp {item.level})
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block text-sm font-semibold text-zinc-700">
                Trạng thái
                <select
                  value={form.isActive ? "true" : "false"}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      isActive: event.target.value === "true",
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
                >
                  <option value="true">Sử dụng</option>
                  <option value="false">Không sử dụng</option>
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl px-5 py-3 text-sm font-bold text-zinc-500 hover:bg-zinc-100"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={save}
                className="flex min-w-28 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Lưu"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
