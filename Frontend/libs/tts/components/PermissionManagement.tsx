"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

import {
  getPermissions,
  type PermissionItem,
} from "../services/api";

interface PermissionManagementProps {
  showToast: (message: string, type: "success" | "error") => void;
}

export const PermissionManagement: React.FC<PermissionManagementProps> = ({
  showToast,
}) => {
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState({
    type: "",
    code: "",
    name: "",
  });

  useEffect(() => {
    let active = true;

    const loadPermissions = async () => {
      setIsLoading(true);
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
        if (active) setIsLoading(false);
      }
    };

    loadPermissions();
    return () => {
      active = false;
    };
  }, [showToast]);

  const groups = useMemo(() => {
    const codeFilter = filters.code.trim().toLowerCase();
    const nameFilter = filters.name.trim().toLowerCase();

    return permissions
      .filter((permission) => permission.type === "GROUP")
      .map((group) => {
        const children = permissions.filter(
          (permission) => permission.parentId === group.id,
        );
        const matchingChildren = children.filter((permission) => {
          const matchesType =
            !filters.type || permission.type === filters.type;
          const matchesCode =
            !codeFilter || permission.code.toLowerCase().includes(codeFilter);
          const matchesName =
            !nameFilter || permission.name.toLowerCase().includes(nameFilter);
          return matchesType && matchesCode && matchesName;
        });
        const groupMatches =
          (!filters.type || group.type === filters.type) &&
          (!codeFilter || group.code.toLowerCase().includes(codeFilter)) &&
          (!nameFilter || group.name.toLowerCase().includes(nameFilter));

        return {
          group,
          children:
            codeFilter || nameFilter || filters.type
              ? matchingChildren
              : children,
          visible: groupMatches || matchingChildren.length > 0,
        };
      })
      .filter((item) => item.visible);
  }, [filters, permissions]);

  const totalPages = Math.max(1, Math.ceil(groups.length / limit));
  const normalizedPage = Math.min(page, totalPages);
  const pagedGroups = groups.slice(
    (normalizedPage - 1) * limit,
    normalizedPage * limit,
  );
  const rangeStart = groups.length === 0 ? 0 : (normalizedPage - 1) * limit + 1;
  const rangeEnd = Math.min(normalizedPage * limit, groups.length);

  const toggleGroup = (id: number) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 p-6 md:p-8">
      <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
          Danh sách quyền
        </h2>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
          Quyền hệ thống
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 bg-zinc-50 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="w-20 px-4 py-4 text-center font-bold">STT</th>
                <th className="w-36 px-4 py-4 font-bold">Loại</th>
                <th className="px-4 py-4 font-bold">Mã quyền</th>
                <th className="px-4 py-4 font-bold">Tên quyền</th>
              </tr>
              <tr className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                <th />
                <th className="px-2 py-2">
                  <select
                    value={filters.type}
                    onChange={(event) =>
                      updateFilter("type", event.target.value)
                    }
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <option value="">Tất cả</option>
                    <option value="GROUP">Group</option>
                    <option value="COMPONENT">Component</option>
                  </select>
                </th>
                <th className="px-2 py-2">
                  <input
                    value={filters.code}
                    onChange={(event) =>
                      updateFilter("code", event.target.value)
                    }
                    placeholder="Tìm mã quyền"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </th>
                <th className="px-2 py-2">
                  <input
                    value={filters.name}
                    onChange={(event) =>
                      updateFilter("name", event.target.value)
                    }
                    placeholder="Tìm tên quyền"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                    <p className="mt-3 font-semibold text-zinc-500">
                      Đang tải danh sách quyền...
                    </p>
                  </td>
                </tr>
              ) : pagedGroups.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-16 text-center font-semibold text-zinc-400"
                  >
                    Không tìm thấy quyền phù hợp
                  </td>
                </tr>
              ) : (
                pagedGroups.map(({ group, children }, groupIndex) => {
                  const isExpanded = expandedGroups.has(group.id);
                  const displayIndex =
                    (normalizedPage - 1) * limit + groupIndex + 1;

                  return (
                    <React.Fragment key={group.id}>
                      <tr className="bg-zinc-50/70 font-semibold text-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100">
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.id)}
                            aria-label={
                              isExpanded ? "Thu gọn nhóm quyền" : "Mở nhóm quyền"
                            }
                            className="inline-flex items-center gap-2"
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${
                                isExpanded ? "" : "-rotate-90"
                              }`}
                            />
                            <span>{displayIndex}</span>
                          </button>
                        </td>
                        <td className="px-4 py-3">Group</td>
                        <td className="px-4 py-3 font-mono">{group.code}</td>
                        <td className="px-4 py-3">{group.name}</td>
                      </tr>
                      {isExpanded &&
                        children.map((permission, childIndex) => (
                          <tr
                            key={permission.id}
                            className="text-zinc-600 hover:bg-blue-50/30 dark:text-zinc-300 dark:hover:bg-blue-950/10"
                          >
                            <td className="px-4 py-3 text-center">
                              {childIndex + 1}
                            </td>
                            <td className="px-4 py-3">Component</td>
                            <td className="px-4 py-3 pl-8 font-mono">
                              {permission.code}
                            </td>
                            <td className="px-4 py-3">{permission.name}</td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-auto flex items-center justify-end gap-5 border-t border-zinc-200 px-5 py-3 text-xs text-zinc-500 dark:border-zinc-800">
          <select
            value={limit}
            onChange={(event) => {
              setLimit(Number(event.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span>
            {rangeStart} - {rangeEnd} of {groups.length}
          </span>
          <button
            type="button"
            disabled={normalizedPage <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={normalizedPage >= totalPages}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            className="disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
