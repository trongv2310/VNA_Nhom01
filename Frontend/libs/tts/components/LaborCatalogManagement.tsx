"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import {
  createLaborCatalog,
  getCatalogTypes,
  getLaborCatalogs,
  updateLaborCatalog,
  updateLaborCatalogStatus,
  deleteLaborCatalogsBulk,
  type BusinessListMeta,
  type LaborCatalogItem,
  type LaborCatalogType,
} from "../services/api";
import { DeleteConfirmModal } from "./DeleteConfirmModal";

interface LaborCatalogManagementProps {
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

const MAX_LEVEL_BY_TYPE: Record<LaborCatalogType, number> = {
  ACCIDENT_CAUSE: 2,
  INJURY_FACTOR: 1,
  INJURY_TYPE: 3,
  OCCUPATION: 4,
};

export const LaborCatalogManagement: React.FC<LaborCatalogManagementProps> = ({
  showToast,
  permissions = [],
  isAdmin = false,
}) => {
  const canManage = isAdmin || permissions.includes("LABOR_C_CATALOG_MANAGE");
  const [types, setTypes] = useState<
    Array<{ value: LaborCatalogType; label: string }>
  >([]);
  const [selectedType, setSelectedType] =
    useState<LaborCatalogType>("INJURY_FACTOR");
  const [items, setItems] = useState<LaborCatalogItem[]>([]);
  const [parentOptions, setParentOptions] = useState<LaborCatalogItem[]>([]);
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
  const [editingItem, setEditingItem] = useState<LaborCatalogItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    parentId: "",
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    setSelectedIds([]);
  }, [selectedType, page, limit, filters]);

  useEffect(() => {
    let active = true;
    getCatalogTypes()
      .then((response) => {
        if (active && response.data.length) setTypes(response.data);
      })
      .catch((error) => {
        if (active) {
          showToast(
            error instanceof Error
              ? error.message
              : "Không thể tải loại danh mục",
            "error",
          );
        }
      });
    return () => {
      active = false;
    };
    // showToast is intentionally omitted because the dashboard callback is not memoized.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getLaborCatalogs({
        page,
        limit,
        type: selectedType,
        code: filters.code,
        name: filters.name,
        level: filters.level,
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
  }, [filters, limit, page, selectedType]);

  useEffect(() => {
    const timer = window.setTimeout(loadItems, 250);
    return () => window.clearTimeout(timer);
  }, [loadItems, refreshKey]);

  useEffect(() => {
    setFilters((value) => {
      if (
        value.level &&
        Number(value.level) > MAX_LEVEL_BY_TYPE[selectedType]
      ) {
        return { ...value, level: "" };
      }
      return value;
    });
  }, [selectedType]);

  useEffect(() => {
    if (!isModalOpen) return;
    let active = true;
    const loadParentOptions = async () => {
      const first = await getLaborCatalogs({
        page: 1,
        limit: 100,
        type: selectedType,
        isActive: true,
      });
      const all = [...first.data.items];
      for (
        let nextPage = 2;
        nextPage <= first.data.meta.totalPages;
        nextPage += 1
      ) {
        const next = await getLaborCatalogs({
          page: nextPage,
          limit: 100,
          type: selectedType,
          isActive: true,
        });
        all.push(...next.data.items);
      }

      return all;
    };

    loadParentOptions()
      .then((catalogs) => {
        if (active) {
          setParentOptions(
            catalogs.filter(
              (item) =>
                item.id !== editingItem?.id &&
                item.level < MAX_LEVEL_BY_TYPE[selectedType],
            ),
          );
        }
      })
      .catch((error) => {
        if (active) {
          showToast(
            error instanceof Error
              ? error.message
              : "Không thể tải danh mục cha",
            "error",
          );
        }
      });
    return () => {
      active = false;
    };
    // showToast is intentionally omitted because the dashboard callback is not memoized.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingItem?.id, isModalOpen, selectedType]);

  const currentTypeLabel =
    types.find((item) => item.value === selectedType)?.label ?? "Danh mục";
  const sortedParents = useMemo(
    () =>
      [...parentOptions].sort(
        (left, right) =>
          left.level - right.level ||
          left.code.localeCompare(right.code, "vi", { numeric: true }),
      ),
    [parentOptions],
  );

  const openCreate = () => {
    setEditingItem(null);
    setForm({ code: "", name: "", parentId: "", isActive: true });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (item: LaborCatalogItem) => {
    setEditingItem(item);
    setForm({
      code: item.code,
      name: item.name,
      parentId: item.parentId ? String(item.parentId) : "",
      isActive: item.isActive,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const save = async () => {
    const nextErrors: Record<string, string> = {};
    if (!form.code.trim()) nextErrors.code = "Mã danh mục không được để trống";
    if (!form.name.trim()) nextErrors.name = "Tên danh mục không được để trống";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setIsSaving(true);
    try {
      if (editingItem) {
        await updateLaborCatalog(editingItem.id, {
          type: selectedType,
          code: form.code.trim(),
          name: form.name.trim(),
          parentId: form.parentId ? Number(form.parentId) : null,
        });
      } else {
        await createLaborCatalog({
          type: selectedType,
          code: form.code.trim(),
          name: form.name.trim(),
          parentId: form.parentId ? Number(form.parentId) : undefined,
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

  const toggleStatus = async (item: LaborCatalogItem) => {
    if (!canManage) return;
    try {
      await updateLaborCatalogStatus(item.id, !item.isActive);
      showToast("Cập nhật trạng thái danh mục thành công", "success");
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

  const handleToggleSelectAll = () => {
    if (items.length > 0 && selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((item) => item.id));
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleDeleteSelected = async () => {
    if (!canManage) return;
    try {
      await deleteLaborCatalogsBulk(selectedIds);
      showToast("Xóa danh mục tai nạn lao động thành công!", "success");
      setSelectedIds([]);
      setRefreshKey((value) => value + 1);
      setIsDeleteConfirmOpen(false);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Xóa danh mục thất bại",
        "error",
      );
    }
  };

  const rangeStart = meta.totalItems ? (meta.page - 1) * meta.limit + 1 : 0;
  const rangeEnd = Math.min(meta.page * meta.limit, meta.totalItems);

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-800">Khai báo danh mục</h2>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Thêm mới
          </button>
        )}
      </div>

      <div className="w-full max-w-sm">
        <select
          value={selectedType}
          onChange={(event) => {
            setSelectedType(event.target.value as LaborCatalogType);
            setPage(1);
          }}
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
        >
          {types.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
          </div>
        )}
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[800px] border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 bg-zinc-50 text-zinc-500">
              <tr className="border-b border-zinc-200">
                <th className="w-12 p-4 text-center select-none">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selectedIds.length === items.length}
                    onChange={handleToggleSelectAll}
                    className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="w-24 p-4 text-center">Thao tác</th>
                <th className="w-36 p-4">Mã số</th>
                <th className="p-4">Tên danh mục</th>
                <th className="w-24 p-4">Cấp</th>
                <th className="w-64 p-4">Danh mục cha</th>
                <th className="w-32 p-4 text-center">Trạng thái</th>
              </tr>
              <tr className="border-b border-zinc-200 bg-white">
                <th />
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
                    {Array.from(
                      { length: MAX_LEVEL_BY_TYPE[selectedType] },
                      (_, index) => index + 1,
                    ).map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </th>
                <th />
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
                    colSpan={7}
                    className="py-16 text-center font-semibold text-zinc-400"
                  >
                    Không tìm thấy dữ liệu phù hợp
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/30">
                    <td className="w-12 p-4 text-center select-none">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => handleToggleSelect(item.id)}
                        className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
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
                    <td className="p-4 font-mono font-semibold">{item.code}</td>
                    <td className="p-4 font-semibold">{item.name}</td>
                    <td className="p-4">Cấp {item.level}</td>
                    <td className="p-4 text-zinc-500">
                      {item.parentCode
                        ? `${item.parentCode} - ${item.parentName}`
                        : "-"}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        disabled={!canManage}
                        onClick={() => toggleStatus(item)}
                        className={`relative h-6 w-11 rounded-full ${
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
                ))
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
                {currentTypeLabel.toLowerCase()}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5 p-6">
              <label className="block text-sm font-semibold text-zinc-700">
                Mã số <span className="text-red-500">*</span>
                <input
                  value={form.code}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, code: event.target.value }))
                  }
                  className={`mt-2 w-full rounded-xl border px-4 py-3 outline-none ${
                    errors.code
                      ? "border-red-500"
                      : "border-zinc-200 focus:border-blue-500"
                  }`}
                />
                {errors.code && (
                  <span className="mt-1 block text-xs text-red-500">
                    {errors.code}
                  </span>
                )}
              </label>
              <label className="block text-sm font-semibold text-zinc-700">
                Tên danh mục <span className="text-red-500">*</span>
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
              {selectedType !== "INJURY_FACTOR" && (
                <label className="block text-sm font-semibold text-zinc-700">
                  Danh mục cha
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
                    <option value="">Không có</option>
                    {sortedParents.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code} - {item.name} (Cấp {item.level})
                      </option>
                    ))}
                  </select>
                </label>
              )}
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
        title="Xác nhận xóa danh mục"
        description={
          <p className="text-sm font-semibold select-none leading-relaxed text-zinc-700 dark:text-zinc-300">
            Bạn có chắc chắn muốn xóa {selectedIds.length} danh mục đã chọn không?
            Hành động này không thể hoàn tác.
          </p>
        }
      />
    </div>
  );
};
