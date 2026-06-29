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
  Save,
  Trash2,
} from "lucide-react";
import { getUsers, updateUserAdmin, createUser, deleteUser, type UserListItem, type UserListMeta } from "../services/api";
import { CreateUser } from "./CreateUser";
import { EditUser } from "./EditUser";
import { ResetPasswordModal } from "./ResetPasswordModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";

interface UserManagementProps {
  showToast: (message: string, type: "success" | "error") => void;
  permissions?: string[];
  isAdmin?: boolean;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  showToast,
  permissions = [],
  isAdmin = false,
}) => {
  const hasPermission = (permission: string) =>
    isAdmin || permissions.includes(permission);
  const canCreate = hasPermission("SYSTEM_C_USER_CREATE");
  const canUpdate = hasPermission("SYSTEM_C_USER_UPDATE");
  const canDelete = hasPermission("SYSTEM_C_USER_DELETE");
  const canResetPassword = hasPermission("SYSTEM_C_USER_RESET_PASSWORD");

  // State for list & metadata
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [meta, setMeta] = useState<UserListMeta>({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  });

  // Query/Filters state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState({
    fullName: "",
    username: "",
    email: "",
    role: "",
    position: "",
    isActive: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modals state
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [passwordResetUser, setPasswordResetUser] = useState<UserListItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Load user data on filter/pagination changes
  useEffect(() => {
    let active = true;
    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const response = await getUsers({
          page,
          limit,
          fullName: filters.fullName,
          username: filters.username,
          email: filters.email,
          role: filters.role,
          position: filters.position,
          isActive: filters.isActive,
        });

        if (active && response.success && response.data) {
          setUsers(response.data.items);
          setMeta(response.data.meta);
        }
      } catch (error) {
        if (active) {
          showToast(error instanceof Error ? error.message : "Không thể tải danh sách người dùng", "error");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    const delayDebounceFn = setTimeout(() => {
      loadUsers();
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
    if (selectedIds.length === users.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(users.map((u) => u.id));
    }
  };

  // Toggle User Status Switch
  const handleToggleActive = async (user: UserListItem) => {
    if (!canUpdate) return;
    const originalUsers = [...users];
    // Optimistic Update
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u))
    );

    try {
      const response = await updateUserAdmin(user.id, {
        isActive: !user.isActive,
      });
      if (response.success) {
        showToast("Cập nhật trạng thái người dùng thành công", "success");
      } else {
        throw new Error("Cập nhật thất bại");
      }
    } catch (error) {
      // Revert if error
      setUsers(originalUsers);
      showToast(error instanceof Error ? error.message : "Cập nhật trạng thái thất bại", "error");
    }
  };

  const handleSaveEdit = () => {
    setEditingUser(null);
    setPage(1); // Refresh list
  };

  const handleSavePasswordReset = () => {
    setPasswordResetUser(null);
  };

  const handleDeleteSelected = async () => {
    if (!canDelete) return;
    try {
      setIsLoading(true);
      await Promise.all(selectedIds.map((id) => deleteUser(id)));
      showToast("Xóa danh sách người dùng thành công", "success");
      setSelectedIds([]);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Xóa người dùng thất bại", "error");
      setRefreshTrigger((prev) => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCreate = async (formData: any) => {
    if (!canCreate) {
      throw new Error("Bạn không có quyền thêm người dùng");
    }

    try {
      const response = await createUser({
        username: formData.username,
        password: formData.password,
        fullName: formData.fullName,
        email: formData.email,
        gender: formData.gender,
        dateOfBirth: formData.dob,
        position: formData.title,
        roleCode: formData.role,
        isActive: formData.isActive,
        avatar: formData.avatarUrl,
        provinceCity: formData.province,
        wardCommune: formData.ward,
        address: formData.address,
      });

      if (response.success && response.data) {
        const backendUser = response.data;
        const newUser: UserListItem = {
          id: Number(backendUser.id),
          fullName: backendUser.fullName || "",
          username: backendUser.username || "",
          email: backendUser.email || "",
          avatar: backendUser.avatar || null,
          position: backendUser.position || "",
          isActive: backendUser.isActive ?? true,
          statusLabel: backendUser.isActive ? "Đang hoạt động" : "Đang khóa",
          roles: (backendUser.roles || []).map((r: any, idx: number) => ({
            id: typeof r === "object" ? r.id || idx : idx,
            code: typeof r === "object" ? r.code : r,
            name: typeof r === "object" ? r.name : r,
          })),
          roleCodes: (backendUser.roles || []).map((r: any) => typeof r === "object" ? r.code : r),
          roleNames: (backendUser.roles || []).map((r: any) => typeof r === "object" ? r.name : r),
          roleDisplay: (backendUser.roles || []).map((r: any) => typeof r === "object" ? r.name : r).join(", ") || "Người dùng",
          createdAt: backendUser.createdAt || new Date().toISOString(),
          updatedAt: backendUser.updatedAt || new Date().toISOString(),
        };
        setUsers((prev) => [newUser, ...prev]);
        showToast("Thêm mới người dùng thành công", "success");
        setIsAddingNew(false);
      } else {
        throw new Error(response.message || "Tạo người dùng thất bại");
      }
    } catch (error) {
      throw error;
    }
  };

  if (isAddingNew && canCreate) {
    return (
      <CreateUser
        onSave={handleSaveCreate}
        onCancel={() => setIsAddingNew(false)}
        showToast={showToast}
      />
    );
  }

  if (editingUser && canUpdate) {
    return (
      <EditUser
        user={editingUser}
        onSave={handleSaveEdit}
        onCancel={() => setEditingUser(null)}
        showToast={showToast}
      />
    );
  }

  const startIdx = (meta.page - 1) * meta.limit + 1;
  const endIdx = Math.min(meta.page * meta.limit, meta.totalItems);

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Top Banner Header */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-950 rounded-2xl p-4 shadow-sm border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 select-none">
          Danh sách người dùng
        </h2>
        {canCreate && (
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 font-bold text-xs select-none transition-all cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Thêm từ file</span>
            </button>
            <button
              onClick={() => setIsAddingNew(true)}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-md shadow-blue-500/10 active:scale-98 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm mới</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Table Container */}
      <div className="relative flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[300px]">
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
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              {/* Row 1: Header Titles */}
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-zinc-500 dark:text-zinc-400 text-xs font-bold select-none bg-zinc-50/50 dark:bg-zinc-900/10">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={users.length > 0 && selectedIds.length === users.length}
                    onChange={handleSelectAll}
                    disabled={!canDelete}
                    className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                  />
                </th>
                <th className="p-4 w-24 text-center">Tác vụ</th>
                <th className="p-4">Họ và tên</th>
                <th className="p-4">Tài khoản</th>
                <th className="p-4">Email</th>
                <th className="p-4">Vai trò</th>
                <th className="p-4">Chức danh</th>
                <th className="p-4 text-center">Trạng thái</th>
              </tr>
              {/* Row 2: Inline Column Filters */}
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <td className="p-2"></td>
                <td className="p-2"></td>
                <td className="p-2">
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 focus:border-blue-500 transition-colors"
                    placeholder="Tìm họ tên"
                    value={filters.fullName}
                    onChange={(e) => handleFilterChange("fullName", e.target.value)}
                  />
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 focus:border-blue-500 transition-colors"
                    placeholder="Tìm tài khoản"
                    value={filters.username}
                    onChange={(e) => handleFilterChange("username", e.target.value)}
                  />
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 focus:border-blue-500 transition-colors"
                    placeholder="Tìm email"
                    value={filters.email}
                    onChange={(e) => handleFilterChange("email", e.target.value)}
                  />
                </td>
                <td className="p-2 relative min-w-[130px]">
                  <select
                    className="w-full pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 appearance-none cursor-pointer focus:border-blue-500 transition-colors"
                    value={filters.role}
                    onChange={(e) => handleFilterChange("role", e.target.value)}
                  >
                    <option value="">Tất cả</option>
                    <option value="ADMIN">Quản trị viên</option>
                    <option value="USER">Người dùng</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 focus:border-blue-500 transition-colors"
                    placeholder="Tìm chức danh"
                    value={filters.position}
                    onChange={(e) => handleFilterChange("position", e.target.value)}
                  />
                </td>
                <td className="p-2 relative min-w-[130px]">
                  <select
                    className="w-full pl-3 pr-8 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 appearance-none cursor-pointer focus:border-blue-500 transition-colors"
                    value={filters.isActive}
                    onChange={(e) => handleFilterChange("isActive", e.target.value)}
                  >
                    <option value="">Tất cả</option>
                    <option value="true">Đang hoạt động</option>
                    <option value="false">Đang khóa</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                </td>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-zinc-400 dark:text-zinc-500 font-semibold select-none text-xs">
                    Không tìm thấy người dùng nào phù hợp.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-zinc-100 dark:border-zinc-800/80 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
                  >
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(user.id)}
                        onChange={() => handleSelectRow(user.id)}
                        disabled={!canDelete}
                        className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                      />
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-4">
                        {canUpdate && (
                          <button
                            onClick={() => setEditingUser(user)}
                            title="Sửa thông tin"
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
                            onClick={() => setPasswordResetUser(user)}
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
                    <td className="p-4 font-bold text-zinc-900 dark:text-zinc-100">{user.fullName || "-"}</td>
                    <td className="p-4 font-mono text-xs">{user.username}</td>
                    <td className="p-4 text-zinc-500 dark:text-zinc-400 text-xs">{user.email || "-"}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300">
                        {user.roleDisplay || "Người dùng"}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{user.position || "-"}</td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleToggleActive(user)}
                        disabled={!canUpdate}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer
                          ${user.isActive ? "bg-blue-600" : "bg-zinc-200 dark:bg-zinc-800"}
                          ${canUpdate ? "" : "cursor-not-allowed opacity-50"}
                        `}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm
                            ${user.isActive ? "translate-x-6" : "translate-x-1"}
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


      {/* Reset Password Modal Dialog */}
      {passwordResetUser && canResetPassword && (
        <ResetPasswordModal
          username={passwordResetUser.username}
          onSave={async (pw) => {
            try {
              const response = await updateUserAdmin(passwordResetUser.id, {
                password: pw,
              });
              if (response.success) {
                showToast("Đổi mật khẩu thành công.", "success");
                handleSavePasswordReset();
              } else {
                throw new Error(response.message || "Đặt lại mật khẩu thất bại");
              }
            } catch (error) {
              showToast(error instanceof Error ? error.message : "Đặt lại mật khẩu thất bại", "error");
              throw error;
            }
          }}
          onCancel={() => setPasswordResetUser(null)}
          showToast={showToast}
        />
      )}

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
        title="Xác nhận xóa người dùng"
        description={
          <>
            Bạn có chắc chắn muốn xóa <strong>{selectedIds.length}</strong> người dùng đã chọn không? Hành động này sẽ xóa vĩnh viễn tài khoản khỏi cơ sở dữ liệu và không thể hoàn tác.
          </>
        }
      />
    </div>
  );
};




