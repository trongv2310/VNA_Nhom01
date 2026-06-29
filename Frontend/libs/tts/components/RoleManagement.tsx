"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import {
  bulkDeleteRoles,
  createRole,
  deleteRole,
  getPermissions,
  getRoleDetail,
  getRoles,
  updateRole,
  type ManagedRole,
  type PermissionItem,
  type UserListMeta,
} from "../services/api";
import { DeleteConfirmModal } from "./DeleteConfirmModal";

interface RoleManagementProps {
  showToast: (message: string, type: "success" | "error") => void;
  permissions?: string[];
  isAdmin?: boolean;
}

type RoleFormMode = "create" | "edit";

interface RoleFormState {
  code: string;
  name: string;
  permissionIds: Set<number>;
}

const EMPTY_META: UserListMeta = {
  page: 1,
  limit: 10,
  totalItems: 0,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
};

const EMPTY_FORM: RoleFormState = {
  code: "",
  name: "",
  permissionIds: new Set<number>(),
};

export const RoleManagement: React.FC<RoleManagementProps> = ({
  showToast,
  permissions: permissionCodes = [],
  isAdmin = false,
}) => {
  const hasPermission = (permission: string) =>
    isAdmin || permissionCodes.includes(permission);
  const canCreate = hasPermission("SYSTEM_C_ROLE_CREATE");
  const canUpdate = hasPermission("SYSTEM_C_ROLE_UPDATE");
  const canDelete = hasPermission("SYSTEM_C_ROLE_DELETE");

  const [roles, setRoles] = useState<ManagedRole[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [meta, setMeta] = useState<UserListMeta>(EMPTY_META);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState({
    code: "",
    name: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [modalMode, setModalMode] = useState<RoleFormMode>("create");
  const [editingRole, setEditingRole] = useState<ManagedRole | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<ManagedRole | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [form, setForm] = useState<RoleFormState>(EMPTY_FORM);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [permissionFilters, setPermissionFilters] = useState({
    code: "",
    name: "",
  });

  useEffect(() => {
    if (!canCreate && !canUpdate) {
      setPermissions([]);
      setIsLoadingPermissions(false);
      return;
    }

    let active = true;

    const loadPermissions = async () => {
      setIsLoadingPermissions(true);
      try {
        const response = await getPermissions();
        if (!active || !response.success || !response.data) return;

        const items = response.data.items;
        setPermissions(items);
        setExpandedGroups(
          new Set(
            items
              .filter((permission) => permission.type === "GROUP")
              .map((permission) => permission.id),
          ),
        );
      } catch (error) {
        if (active) {
          showToast(
            error instanceof Error
              ? error.message
              : "Không thể tải danh sách quyền",
            "error",
          );
        }
      } finally {
        if (active) setIsLoadingPermissions(false);
      }
    };

    loadPermissions();
    return () => {
      active = false;
    };
  }, [canCreate, canUpdate, showToast]);

  useEffect(() => {
    let active = true;

    const loadRoles = async () => {
      setIsLoading(true);
      try {
        const response = await getRoles({
          page,
          limit,
          code: filters.code,
          name: filters.name,
        });

        if (!active || !response.success || !response.data) return;
        setRoles(response.data.items);
        setMeta(response.data.meta);
      } catch (error) {
        if (active) {
          showToast(
            error instanceof Error
              ? error.message
              : "Không thể tải danh sách vai trò",
            "error",
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    const debounceTimer = window.setTimeout(loadRoles, 350);

    return () => {
      active = false;
      window.clearTimeout(debounceTimer);
    };
  }, [filters, limit, page, refreshTrigger, showToast]);

  const permissionGroups = useMemo(() => {
    const codeFilter = permissionFilters.code.trim().toLowerCase();
    const nameFilter = permissionFilters.name.trim().toLowerCase();

    return permissions
      .filter((permission) => permission.type === "GROUP")
      .map((group) => {
        const children = permissions.filter(
          (permission) => permission.parentId === group.id,
        );
        const matchingChildren = children.filter((permission) => {
          const matchesCode =
            !codeFilter || permission.code.toLowerCase().includes(codeFilter);
          const matchesName =
            !nameFilter || permission.name.toLowerCase().includes(nameFilter);
          return matchesCode && matchesName;
        });
        const groupMatches =
          (!codeFilter || group.code.toLowerCase().includes(codeFilter)) &&
          (!nameFilter || group.name.toLowerCase().includes(nameFilter));

        return {
          group,
          children:
            codeFilter || nameFilter || groupMatches
              ? matchingChildren
              : children,
          visible: groupMatches || matchingChildren.length > 0,
        };
      })
      .filter((item) => item.visible);
  }, [permissionFilters, permissions]);

  const customRoleIdsOnPage = useMemo(
    () =>
      canDelete
        ? roles.filter((role) => !role.isSystem).map((role) => role.id)
        : [],
    [canDelete, roles],
  );

  const allCustomRolesSelected =
    customRoleIdsOnPage.length > 0 &&
    customRoleIdsOnPage.every((id) => selectedIds.includes(id));

  const startIdx = meta.totalItems > 0 ? (meta.page - 1) * meta.limit + 1 : 0;
  const endIdx = Math.min(meta.page * meta.limit, meta.totalItems);

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setSelectedIds([]);
    setPage(1);
  };

  const toggleRowSelection = (role: ManagedRole) => {
    if (!canDelete || role.isSystem) return;
    setSelectedIds((current) =>
      current.includes(role.id)
        ? current.filter((id) => id !== role.id)
        : [...current, role.id],
    );
  };

  const toggleSelectAll = () => {
    if (!canDelete) return;
    if (allCustomRolesSelected) {
      setSelectedIds((current) =>
        current.filter((id) => !customRoleIdsOnPage.includes(id)),
      );
      return;
    }

    setSelectedIds((current) => [
      ...current.filter((id) => !customRoleIdsOnPage.includes(id)),
      ...customRoleIdsOnPage,
    ]);
  };

  const resetForm = () => {
    setForm({
      code: "",
      name: "",
      permissionIds: new Set<number>(),
    });
    setPermissionFilters({
      code: "",
      name: "",
    });
    setEditingRole(null);
    setModalMode("create");
  };

  const openCreateModal = () => {
    if (!canCreate) return;
    resetForm();
    setIsFormOpen(true);
  };

  const openEditModal = async (role: ManagedRole) => {
    if (!canUpdate) return;

    if (role.isSystem) {
      showToast("Vai trò hệ thống chỉ dùng để bảo toàn dữ liệu nền.", "error");
      return;
    }

    setModalMode("edit");
    setEditingRole(role);
    setIsFormOpen(true);
    setPermissionFilters({
      code: "",
      name: "",
    });

    try {
      const response = await getRoleDetail(role.id);
      const detail = response.data || role;
      setForm({
        code: detail.code,
        name: detail.name,
        permissionIds: new Set(detail.permissionIds),
      });
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Không thể tải vai trò",
        "error",
      );
      setForm({
        code: role.code,
        name: role.name,
        permissionIds: new Set(role.permissionIds),
      });
    }
  };

  const closeForm = () => {
    setIsFormOpen(false);
    resetForm();
  };

  const togglePermissionGroup = (group: PermissionItem, children: PermissionItem[]) => {
    const ids = [group.id, ...children.map((child) => child.id)];
    setForm((current) => {
      const next = new Set(current.permissionIds);
      const isFullySelected = ids.every((id) => next.has(id));

      ids.forEach((id) => {
        if (isFullySelected) next.delete(id);
        else next.add(id);
      });

      return {
        ...current,
        permissionIds: next,
      };
    });
  };

  const togglePermission = (permission: PermissionItem) => {
    setForm((current) => {
      const next = new Set(current.permissionIds);

      if (next.has(permission.id)) {
        next.delete(permission.id);

        if (permission.parentId) {
          const siblings = permissions.filter(
            (item) => item.parentId === permission.parentId,
          );
          const hasSiblingSelected = siblings.some((sibling) =>
            next.has(sibling.id),
          );
          if (!hasSiblingSelected) next.delete(permission.parentId);
        }
      } else {
        next.add(permission.id);
        if (permission.parentId) next.add(permission.parentId);
      }

      return {
        ...current,
        permissionIds: next,
      };
    });
  };

  const toggleExpandGroup = (id: number) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveRole = async () => {
    if (
      (modalMode === "create" && !canCreate) ||
      (modalMode === "edit" && !canUpdate)
    ) {
      showToast("Bạn không có quyền thực hiện thao tác này", "error");
      return;
    }

    const code = form.code.trim();
    const name = form.name.trim();
    const permissionIds = Array.from(form.permissionIds);

    if (!code) {
      showToast("Vui lòng nhập mã vai trò", "error");
      return;
    }

    if (!name) {
      showToast("Vui lòng nhập tên vai trò", "error");
      return;
    }

    if (permissionIds.length === 0) {
      showToast("Vui lòng chọn ít nhất một quyền", "error");
      return;
    }

    setIsSaving(true);
    try {
      const response =
        modalMode === "create"
          ? await createRole({ code, name, permissionIds })
          : editingRole
          ? await updateRole(editingRole.id, { name, permissionIds })
          : null;

      if (!response) return;
      showToast(response.message || "Lưu vai trò thành công", "success");
      closeForm();
      setSelectedIds([]);
      setRefreshTrigger((current) => current + 1);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Lưu vai trò thất bại",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!canDelete || !roleToDelete) return;

    try {
      setIsLoading(true);
      const response = await deleteRole(roleToDelete.id);
      showToast(response.message || "Xóa vai trò thành công", "success");
      setRoleToDelete(null);
      setSelectedIds((current) =>
        current.filter((id) => id !== roleToDelete.id),
      );
      setRefreshTrigger((current) => current + 1);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Xóa vai trò thất bại",
        "error",
      );
      setRefreshTrigger((current) => current + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!canDelete || selectedIds.length === 0) return;

    try {
      setIsLoading(true);
      const response = await bulkDeleteRoles(selectedIds);
      showToast(response.message || "Xóa danh sách vai trò thành công", "success");
      setSelectedIds([]);
      setRefreshTrigger((current) => current + 1);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Xóa vai trò thất bại",
        "error",
      );
      setRefreshTrigger((current) => current + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const renderScopeLabel = (role: ManagedRole) => {
    if (role.scope === "DEPARTMENT") return "Sở";
    if (role.scope === "BUSINESS") return "Doanh nghiệp";
    return "Kế thừa";
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="select-none text-lg font-bold text-zinc-800 dark:text-zinc-100">
          Danh sách vai trò
        </h2>
        {canCreate && (
          <button
            type="button"
            onClick={openCreateModal}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/10 transition-all hover:bg-blue-700 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm mới</span>
          </button>
        )}
      </div>

      <div className="relative flex min-h-[300px] flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-[1px] transition-all dark:bg-zinc-950/60">
            <div className="flex animate-in flex-col items-center gap-2.5 fade-in zoom-in-95 duration-150">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="select-none text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                Đang tải danh sách...
              </span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-xs">
            <thead>
              <tr className="select-none border-b border-zinc-200 bg-zinc-50/50 text-left text-xs font-bold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/10 dark:text-zinc-400">
                <th className="w-12 p-4 text-center">
                  <input
                    type="checkbox"
                    checked={allCustomRolesSelected}
                    disabled={!canDelete || customRoleIdsOnPage.length === 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700"
                  />
                </th>
                <th className="w-24 p-4 text-center">Tác vụ</th>
                <th className="p-4">Mã vai trò</th>
                <th className="p-4">Tên vai trò</th>
                <th className="p-4">Phạm vi</th>
                <th className="p-4 text-center">Số quyền</th>
                <th className="p-4 text-center">Người dùng</th>
                <th className="p-4 text-center">Loại</th>
              </tr>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <td className="p-2" />
                <td className="p-2" />
                <td className="p-2">
                  <input
                    type="text"
                    value={filters.code}
                    onChange={(event) =>
                      updateFilter("code", event.target.value)
                    }
                    placeholder="Tìm mã vai trò"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 outline-none transition-colors focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    value={filters.name}
                    onChange={(event) =>
                      updateFilter("name", event.target.value)
                    }
                    placeholder="Tìm tên vai trò"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 outline-none transition-colors focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                  />
                </td>
                <td className="p-2" />
                <td className="p-2" />
                <td className="p-2" />
                <td className="p-2" />
              </tr>
            </thead>
            <tbody>
              {roles.length === 0 && !isLoading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-12 text-center text-xs font-semibold text-zinc-400 dark:text-zinc-500"
                  >
                    Không tìm thấy vai trò nào phù hợp.
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr
                    key={role.id}
                    className="border-b border-zinc-100 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50/50 dark:border-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-900/30"
                  >
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(role.id)}
                        disabled={!canDelete || role.isSystem}
                        onChange={() => toggleRowSelection(role)}
                        title={
                          role.isSystem
                            ? "Không thể chọn vai trò hệ thống"
                            : "Chọn vai trò"
                        }
                        className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700"
                      />
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => openEditModal(role)}
                            disabled={role.isSystem}
                            title={
                              role.isSystem
                                ? "Vai trò hệ thống không được phép chỉnh sửa"
                                : "Chỉnh sửa vai trò"
                            }
                            className="rounded-lg p-1 text-slate-400 transition-all hover:bg-zinc-100 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-slate-400 dark:hover:bg-zinc-800"
                          >
                            <Pencil className="h-[18px] w-[18px]" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setRoleToDelete(role)}
                            disabled={role.isSystem}
                            title={
                              role.isSystem
                                ? "Không thể xóa vai trò hệ thống"
                                : "Xóa vai trò"
                            }
                            className="rounded-lg p-1 text-slate-400 transition-all hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-slate-400 dark:hover:bg-red-950/20"
                          >
                            <Trash2 className="h-[18px] w-[18px]" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {role.code}
                    </td>
                    <td className="p-4 font-bold text-zinc-900 dark:text-zinc-100">
                      {role.name}
                    </td>
                    <td className="p-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      {renderScopeLabel(role)}
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                        {role.permissionCount}
                      </span>
                    </td>
                    <td className="p-4 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      {role.assignedUserCount}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
                          role.isSystem
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                        }`}
                      >
                        {role.isSystem ? "Hệ thống" : "Tùy chỉnh"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-6 border-t border-zinc-200 bg-white px-6 py-4 text-xs font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
          <select
            value={limit}
            onChange={(event) => {
              setLimit(Number(event.target.value));
              setSelectedIds([]);
              setPage(1);
            }}
            className="cursor-pointer rounded-md border border-zinc-200 bg-white px-2 py-1 text-zinc-700 outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span>
            {meta.totalItems > 0
              ? `${startIdx} - ${endIdx} of ${meta.totalItems}`
              : "0 - 0 of 0"}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setSelectedIds([]);
                setPage((current) => Math.max(current - 1, 1));
              }}
              disabled={!meta.hasPreviousPage || isLoading}
              className="cursor-pointer rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedIds([]);
                setPage((current) => Math.min(current + 1, meta.totalPages));
              }}
              disabled={!meta.hasNextPage || isLoading}
              className="cursor-pointer rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {canDelete && selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 animate-in items-center justify-between overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-xl fade-in slide-in-from-bottom-4 duration-300 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center">
            <div className="flex h-10 min-w-[40px] items-center justify-center bg-blue-600 px-3 text-sm font-bold text-white">
              {selectedIds.length}
            </div>
            <span className="select-none px-3.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              dữ liệu được chọn
            </span>
          </div>
          <div className="flex items-center gap-3 pr-3">
            <button
              type="button"
              onClick={() => setIsBulkDeleteOpen(true)}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-red-500/10 transition-all hover:bg-red-700"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Xóa</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="cursor-pointer p-1.5 text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-200"
              title="Bỏ chọn"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {isFormOpen &&
        ((modalMode === "create" && canCreate) ||
          (modalMode === "edit" && canUpdate)) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={closeForm}
          />
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[20px] border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                {modalMode === "create" ? "Thêm mới vai trò" : "Chỉnh sửa vai trò"}
              </h3>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-500">
                  <span>
                    Mã vai trò <span className="text-red-500">*</span>
                  </span>
                  <input
                    value={form.code}
                    disabled={modalMode === "edit"}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        code: event.target.value,
                      }))
                    }
                    placeholder="Ví dụ: MANAGER"
                    className="rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-medium text-zinc-800 outline-none transition-colors focus:border-blue-500 disabled:bg-zinc-50 disabled:text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:disabled:bg-zinc-900"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-500">
                  <span>
                    Tên vai trò <span className="text-red-500">*</span>
                  </span>
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Ví dụ: Quản lý"
                    className="rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-medium text-zinc-800 outline-none transition-colors focus:border-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </label>
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                  <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900/70 dark:text-zinc-400">
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="w-24 px-4 py-3 text-center font-bold" />
                      <th className="px-4 py-3 font-bold">Mã quyền</th>
                      <th className="px-4 py-3 font-bold">Tên quyền</th>
                    </tr>
                    <tr className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                      <th />
                      <th className="px-2 py-2">
                        <input
                          value={permissionFilters.code}
                          onChange={(event) =>
                            setPermissionFilters((current) => ({
                              ...current,
                              code: event.target.value,
                            }))
                          }
                          placeholder="Tìm mã quyền"
                          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
                        />
                      </th>
                      <th className="px-2 py-2">
                        <input
                          value={permissionFilters.name}
                          onChange={(event) =>
                            setPermissionFilters((current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                          placeholder="Tìm tên quyền"
                          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {isLoadingPermissions ? (
                      <tr>
                        <td colSpan={3} className="py-12 text-center">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                          <p className="mt-3 font-semibold text-zinc-500">
                            Đang tải quyền...
                          </p>
                        </td>
                      </tr>
                    ) : permissionGroups.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-12 text-center font-semibold text-zinc-400"
                        >
                          Không tìm thấy quyền phù hợp
                        </td>
                      </tr>
                    ) : (
                      permissionGroups.map(({ group, children }) => {
                        const groupPermissionIds = [
                          group.id,
                          ...children.map((child) => child.id),
                        ];
                        const isGroupChecked = groupPermissionIds.every((id) =>
                          form.permissionIds.has(id),
                        );
                        const isExpanded = expandedGroups.has(group.id);

                        return (
                          <React.Fragment key={group.id}>
                            <tr className="bg-zinc-50/70 font-semibold text-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100">
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandGroup(group.id)}
                                    className="rounded p-0.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                                  >
                                    <ChevronDown
                                      className={`h-4 w-4 transition-transform ${
                                        isExpanded ? "" : "-rotate-90"
                                      }`}
                                    />
                                  </button>
                                  <input
                                    type="checkbox"
                                    checked={isGroupChecked}
                                    onChange={() =>
                                      togglePermissionGroup(group, children)
                                    }
                                    className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-700"
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-3 font-mono">
                                {group.code}
                              </td>
                              <td className="px-4 py-3">{group.name}</td>
                            </tr>
                            {isExpanded &&
                              children.map((permission) => (
                                <tr
                                  key={permission.id}
                                  className="text-zinc-600 hover:bg-blue-50/30 dark:text-zinc-300 dark:hover:bg-blue-950/10"
                                >
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={form.permissionIds.has(
                                        permission.id,
                                      )}
                                      onChange={() =>
                                        togglePermission(permission)
                                      }
                                      className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-700"
                                    />
                                  </td>
                                  <td className="px-4 py-3 pl-8 font-mono">
                                    {permission.code}
                                  </td>
                                  <td className="px-4 py-3">
                                    {permission.name}
                                  </td>
                                </tr>
                              ))}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg px-4 py-2 text-xs font-bold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveRole}
                disabled={isSaving || isLoadingPermissions}
                className="flex min-w-[88px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/10 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>Lưu</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={canDelete && Boolean(roleToDelete)}
        onClose={() => setRoleToDelete(null)}
        onConfirm={handleDeleteRole}
        title="Xác nhận xóa vai trò"
        description={
          <>
            Bạn có chắc chắn muốn xóa vai trò{" "}
            <strong>{roleToDelete?.name}</strong> không? Hành động này không
            thể hoàn tác.
          </>
        }
      />

      <DeleteConfirmModal
        isOpen={canDelete && isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title="Xác nhận xóa vai trò"
        description={
          <>
            Bạn có chắc chắn muốn xóa <strong>{selectedIds.length}</strong> vai
            trò đã chọn không? Chỉ các vai trò tùy chỉnh chưa gán cho người dùng
            mới được phép xóa.
          </>
        }
      />
    </div>
  );
};
