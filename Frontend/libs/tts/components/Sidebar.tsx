"use client";

import React, { useState } from "react";
import { Settings, ChevronDown, Menu, ShieldAlert } from "lucide-react";
import { UserMenu } from "./UserMenu";

type SidebarView =
  | "profile"
  | "change-password"
  | "user-management"
  | "enterprise-management"
  | "permission-management"
  | "role-management"
  | "business-type-management"
  | "industry-management"
  | "labor-catalog-management"
  | "company-info"
  | "tnld-reports"
  | "tnld-theo-hdld"
  | "report-period";

interface SidebarProps {
  fullName: string;
  avatarUrl: string;
  role: string;
  accountType: "DEPARTMENT" | "BUSINESS";
  permissions?: string[];
  onSelectView: (view: SidebarView) => void;
  onLogout: () => void;
  activeItem?: string;
  onCloseMobile?: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  children?: { id: string; label: string }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  fullName,
  avatarUrl,
  role,
  accountType,
  permissions = [],
  onSelectView,
  onLogout,
  activeItem = "quan_ly_nguoi_dung",
  onCloseMobile,
}) => {
  // Toggle state for accordion menus
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    he_thong: true, // Default open as "Quản lý người dùng" is inside
    tai_nan_lao_dong: false,
  });

  const toggleMenu = (menuId: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  const isAdmin = role
    .split(",")
    .map((item) => item.trim())
    .includes("ADMIN");
  const hasPermission = (permission: string) =>
    isAdmin || permissions.includes(permission);
  const menuItems: MenuItem[] = [];

  if (isAdmin) {
    menuItems.push({
      id: "he_thong",
      label: "Hệ thống",
      icon: <Settings className="w-5 h-5 flex-shrink-0" />,
      children: [
        { id: "quan_ly_nguoi_dung", label: "Quản lý người dùng" },
        { id: "quan_ly_quyen", label: "Quản lý quyền" },
        { id: "quan_ly_vai_tro", label: "Quản lý vai trò" },
        { id: "quan_ly_doanh_nghiep", label: "Quản lý doanh nghiệp" },
        { id: "quan_ly_loai_hinh", label: "Loại hình kinh doanh" },
        { id: "quan_ly_nganh_nghe", label: "Ngành nghề kinh doanh" },
        { id: "ky_bao_cao", label: "Kỳ báo cáo" },
      ],
    });
    menuItems.push({
      id: "tai_nan_lao_dong",
      label: "Tai nạn lao động",
      icon: <ShieldAlert className="w-5 h-5 flex-shrink-0" />,
      children: [
        { id: "danh_muc_chung", label: "Danh mục chung" },
        { id: "tnld_theo_hdld", label: "TNLĐ theo HĐLĐ" },
      ],
    });
  } else if (accountType === "BUSINESS") {
    menuItems.push({
      id: "he_thong",
      label: "Hệ thống",
      icon: <Settings className="w-5 h-5 flex-shrink-0" />,
      children: [
        { id: "thong_tin_doanh_nghiep", label: "Thông tin doanh nghiệp" },
      ],
    });
    menuItems.push({
      id: "tai_nan_lao_dong",
      label: "Tai nạn lao động",
      icon: <ShieldAlert className="w-5 h-5 flex-shrink-0" />,
      children: [{ id: "tnld_theo_hdld", label: "TNLĐ theo HĐLĐ" }],
    });
  } else {
    const systemChildren = [
      { id: "thong_tin_tai_khoan", label: "Thông tin tài khoản" },
    ];

    if (hasPermission("SYSTEM_C_USER_VIEW")) {
      systemChildren.push({
        id: "quan_ly_nguoi_dung",
        label: "Quản lý người dùng",
      });
    }
    if (hasPermission("SYSTEM_C_PERMISSION_VIEW")) {
      systemChildren.push({ id: "quan_ly_quyen", label: "Quản lý quyền" });
    }
    if (hasPermission("SYSTEM_C_ROLE_VIEW")) {
      systemChildren.push({ id: "quan_ly_vai_tro", label: "Quản lý vai trò" });
    }
    if (hasPermission("SYSTEM_C_BUSINESS_VIEW")) {
      systemChildren.push({
        id: "quan_ly_doanh_nghiep",
        label: "Quản lý doanh nghiệp",
      });
    }
    if (hasPermission("SYSTEM_C_BUSINESS_TYPE_VIEW")) {
      systemChildren.push({
        id: "quan_ly_loai_hinh",
        label: "Loại hình kinh doanh",
      });
    }
    if (hasPermission("SYSTEM_C_INDUSTRY_VIEW")) {
      systemChildren.push({
        id: "quan_ly_nganh_nghe",
        label: "Ngành nghề kinh doanh",
      });
    }
    if (hasPermission("SYSTEM_C_REPORT_PERIOD_VIEW")) {
      systemChildren.push({ id: "ky_bao_cao", label: "Kỳ báo cáo" });
    }

    menuItems.push({
      id: "he_thong",
      label: "Hệ thống",
      icon: <Settings className="w-5 h-5 flex-shrink-0" />,
      children: systemChildren,
    });

    if (
      hasPermission("LABOR_C_REPORT_VIEW") ||
      hasPermission("LABOR_C_CATALOG_VIEW")
    ) {
      const laborChildren: { id: string; label: string }[] = [];
      if (hasPermission("LABOR_C_CATALOG_VIEW")) {
        laborChildren.push({ id: "danh_muc_chung", label: "Danh mục chung" });
      }
      if (hasPermission("LABOR_C_REPORT_VIEW")) {
        laborChildren.push({ id: "tnld_theo_hdld", label: "TNLĐ theo HĐLĐ" });
      }
      menuItems.push({
        id: "tai_nan_lao_dong",
        label: "Tai nạn lao động",
        icon: <ShieldAlert className="w-5 h-5 flex-shrink-0" />,
        children: laborChildren,
      });
    }
  }

  return (
    <div className="w-72 h-full flex flex-col bg-[#0b2868] text-white select-none border-r border-[#081e50]">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-[#081e50]">
        <div className="flex items-center gap-3">
          {/* Logo container */}
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-transparent">
            <img
              src="/icons/Emblem_of_Vietnam.svg"
              alt="Emblem of Vietnam"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="leading-tight">
            <h1 className="text-xs font-bold text-white uppercase tracking-wider">
              Uỷ ban nhân dân
            </h1>
            <p className="text-[11px] text-[#93c5fd] font-semibold uppercase">
              Thành phố Hồ Chí Minh
            </p>
          </div>
        </div>
        {/* Burger Button to close drawer on mobile */}
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 active:bg-white/15 focus:outline-none transition-colors"
        >
          <Menu className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Sidebar Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {menuItems.map((item) => {
          const isExpandable = !!item.children;
          const isExpanded = expandedMenus[item.id];

          return (
            <div key={item.id} className="flex flex-col">
              {isExpandable ? (
                // Collapsible Section Header
                <button
                  type="button"
                  onClick={() => toggleMenu(item.id)}
                  className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl hover:bg-white/10 transition-all text-left text-white/90 hover:text-white font-medium text-sm focus:outline-none focus:ring-1 focus:ring-white/15 cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-white/60" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white/60 -rotate-90 transition-transform" />
                  )}
                </button>
              ) : (
                // Single Direct Link
                <button
                  type="button"
                  className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all text-left font-medium text-sm focus:outline-none focus:ring-1 focus:ring-white/15 cursor-pointer
                    ${
                      activeItem === item.id
                        ? "bg-white/15 text-white shadow-sm font-semibold"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }
                  `}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              )}

              {/* Sub-menu items */}
              {isExpandable && isExpanded && (
                <div className="mt-1 ml-6 pl-4 border-l border-white/10 space-y-1">
                  {item.children?.map((child) => {
                    const isChildActive = activeItem === child.id;
                    return (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => {
                          if (child.id === "quan_ly_nguoi_dung") {
                            onSelectView("user-management");
                          } else if (child.id === "quan_ly_quyen") {
                            onSelectView("permission-management");
                          } else if (child.id === "quan_ly_vai_tro") {
                            onSelectView("role-management");
                          } else if (child.id === "quan_ly_doanh_nghiep") {
                            onSelectView("enterprise-management");
                          } else if (child.id === "quan_ly_loai_hinh") {
                            onSelectView("business-type-management");
                          } else if (child.id === "quan_ly_nganh_nghe") {
                            onSelectView("industry-management");
                          } else if (child.id === "danh_muc_chung") {
                            onSelectView("labor-catalog-management");
                          } else if (child.id === "thong_tin_doanh_nghiep") {
                            onSelectView("company-info");
                          } else if (child.id === "thong_tin_tai_khoan") {
                            onSelectView("profile");
                          } else if (child.id === "tnld_theo_hdld") {
                            if (accountType !== "BUSINESS") {
                              onSelectView("tnld-reports");
                            } else {
                              onSelectView("tnld-theo-hdld");
                            }
                          } else if (child.id === "ky_bao_cao") {
                            onSelectView("report-period");
                          }
                        }}
                        className={`w-full flex items-center px-4 py-2 text-xs rounded-lg transition-all text-left font-medium cursor-pointer
                          ${
                            isChildActive
                              ? "bg-white/20 text-white font-bold"
                              : "text-white/70 hover:bg-white/5 hover:text-white"
                          }
                        `}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white/40 mr-2.5 flex-shrink-0" />
                        <span>{child.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sidebar User Profile Section at bottom */}
      <div className="p-4 border-t border-[#081e50] bg-[#092053]">
        <UserMenu
          fullName={fullName}
          avatarUrl={avatarUrl}
          role={role}
          onSelectView={onSelectView}
          onLogout={onLogout}
        />
      </div>
    </div>
  );
};
