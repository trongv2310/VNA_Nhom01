"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, LogOut, X } from "lucide-react";
import {
  ChangePassword,
  DashboardLayout,
  Sidebar,
  UserProfile,
  UserManagement,
  EnterpriseManagement,
  CreateEnterprise,
  DepartmentReports,
  TnldTheoHdld,
  ReportPeriodManagement,
  PermissionManagement,
  RoleManagement,
  BusinessReferenceManagement,
  LaborCatalogManagement,
  DepartmentReportDashboard,
} from "../../components";
import type { UserData } from "../../components/UserProfile";
import {
  changePassword,
  clearAuthTokens,
  deleteMyAvatar,
  getAccessToken,
  getProfile,
  getStoredBackendUser,
  getStoredUserData,
  setStoredBackendUser,
  mapBackendUserToUserData,
  updateMe,
  updateChangeGmail,
} from "../../services/api";

const EMPTY_USER_DATA: UserData = {
  avatarUrl: "",
  accountType: "DEPARTMENT",
  username: "",
  fullName: "",
  dob: "",
  gender: "",
  title: "",
  role: "",
  email: "",
  province: "",
  ward: "",
  address: "",
  isActive: true,
  permissions: [],
};

type ActiveView =
  | "profile"
  | "change-password"
  | "user-management"
  | "enterprise-management"
  | "permission-management"
  | "role-management"
  | "business-type-management"
  | "industry-management"
  | "labor-catalog-management"
  | "labor-dashboard"
  | "company-info"
  | "tnld-reports"
  | "tnld-theo-hdld"
  | "report-period";

const hasUserRole = (data: UserData, role: string) =>
  data.role
    .split(",")
    .map((item) => item.trim())
    .includes(role);

const hasUserPermission = (data: UserData, permission: string) =>
  hasUserRole(data, "ADMIN") || data.permissions.includes(permission);

const VIEW_PERMISSIONS: Partial<Record<ActiveView, string>> = {
  "user-management": "SYSTEM_C_USER_VIEW",
  "enterprise-management": "SYSTEM_C_BUSINESS_VIEW",
  "permission-management": "SYSTEM_C_PERMISSION_VIEW",
  "role-management": "SYSTEM_C_ROLE_VIEW",
  "business-type-management": "SYSTEM_C_BUSINESS_TYPE_VIEW",
  "industry-management": "SYSTEM_C_INDUSTRY_VIEW",
  "labor-catalog-management": "LABOR_C_CATALOG_VIEW",
  "labor-dashboard": "LABOR_C_REPORT_DASHBOARD",
  "report-period": "SYSTEM_C_REPORT_PERIOD_VIEW",
  "tnld-reports": "LABOR_C_REPORT_VIEW",
};

const canAccessView = (data: UserData, view: ActiveView) => {
  const permission = VIEW_PERMISSIONS[view];
  return !permission || hasUserPermission(data, permission);
};

const getDefaultActiveView = (data: UserData): ActiveView => {
  if (hasUserRole(data, "ADMIN")) return "user-management";
  if (data.accountType === "BUSINESS") return "company-info";
  if (hasUserPermission(data, "SYSTEM_C_USER_VIEW")) return "user-management";
  if (hasUserPermission(data, "SYSTEM_C_BUSINESS_VIEW"))
    return "enterprise-management";
  if (hasUserPermission(data, "SYSTEM_C_BUSINESS_TYPE_VIEW"))
    return "business-type-management";
  if (hasUserPermission(data, "SYSTEM_C_INDUSTRY_VIEW"))
    return "industry-management";
  if (hasUserPermission(data, "SYSTEM_C_PERMISSION_VIEW"))
    return "permission-management";
  if (hasUserPermission(data, "SYSTEM_C_ROLE_VIEW")) return "role-management";
  if (hasUserPermission(data, "SYSTEM_C_REPORT_PERIOD_VIEW"))
    return "report-period";
  if (hasUserPermission(data, "LABOR_C_REPORT_DASHBOARD"))
    return "labor-dashboard";
  if (hasUserPermission(data, "LABOR_C_CATALOG_VIEW"))
    return "labor-catalog-management";
  if (hasUserPermission(data, "LABOR_C_REPORT_VIEW")) return "tnld-reports";
  return "profile";
};

export const DepartmentDashboardScreen: React.FC = () => {
  const router = useRouter();

  const [userData, setUserData] = useState<UserData>(EMPTY_USER_DATA);
  const [initialUserData, setInitialUserData] =
    useState<UserData>(EMPTY_USER_DATA);
  const [profileResetKey, setProfileResetKey] = useState(0);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>("profile");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const isSelfUpdatingRef = useRef(false);

  // Polling to check if the user's password or status has been changed by Admin
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const interval = setInterval(async () => {
      if (isSelfUpdatingRef.current) return;

      try {
        const storedUser = getStoredBackendUser();
        if (!storedUser) return;

        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        const res = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/users/me`, {
          method: "GET",
          headers,
        });

        // If the polling request receives a 401, session is invalid
        if (res.status === 401) {
          clearAuthTokens();
          showToastMsg(
            "Phiên đăng nhập đã hết hạn hoặc tài khoản đã thay đổi. Vui lòng đăng nhập lại.",
            "error",
          );
          router.push("/department/login");
          return;
        }

        // If the account was deleted by Admin
        if (res.status === 404) {
          clearAuthTokens();
          showToastMsg(
            "Tài khoản của bạn đã bị xóa bởi quản trị viên.",
            "error",
          );
          router.push("/department/login");
          return;
        }

        if (res.ok) {
          const payload = await res.json();
          if (payload?.success && payload?.data) {
            const freshUser = payload.data;

            // Check if user was deactivated
            if (freshUser.isActive === false) {
              clearAuthTokens();
              showToastMsg(
                "Tài khoản của bạn đã bị khóa bởi quản trị viên.",
                "error",
              );
              router.push("/department/login");
              return;
            }

            // Check if password or profile changed (updatedAt changed)
            if (
              !isSelfUpdatingRef.current &&
              storedUser.updatedAt &&
              freshUser.updatedAt &&
              freshUser.updatedAt !== storedUser.updatedAt
            ) {
              clearAuthTokens();
              showToastMsg(
                "Thông tin tài khoản hoặc mật khẩu đã bị thay đổi. Vui lòng đăng nhập lại.",
                "error",
              );
              router.push("/department/login");
              return;
            }
          }
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra trạng thái phiên đăng nhập:", error);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/department/login");
      return;
    }

    const storedUserData = getStoredUserData();
    if (!storedUserData) {
      clearAuthTokens();
      router.replace("/department/login");
      return;
    }

    // Set initial profile data from cache
    setUserData(storedUserData);
    setInitialUserData(storedUserData);
    setProfileResetKey((current) => current + 1);
    setIsLoadingProfile(false);

    setActiveView(getDefaultActiveView(storedUserData));

    // Fetch fresh profile data from DB in background
    let active = true;
    const fetchFreshProfile = async () => {
      try {
        const response = await getProfile();
        if (active && response.data) {
          const freshUserData = mapBackendUserToUserData(response.data);
          setUserData(freshUserData);
          setInitialUserData(freshUserData);
          setProfileResetKey((current) => current + 1);
          setActiveView(getDefaultActiveView(freshUserData));
        }
      } catch (error) {
        console.error("Failed to fetch fresh user profile:", error);
      }
    };

    fetchFreshProfile();

    return () => {
      active = false;
    };
  }, [router]);

  const showToastMsg = (message: string, type: "success" | "error") => {
    setToast({ message, type });
  };

  const handleSaveProfile = async (
    updatedData: UserData,
    successMessage?: string,
  ) => {
    isSelfUpdatingRef.current = true;
    try {
      const emailChanged = updatedData.email.trim().toLowerCase() !== initialUserData.email.trim().toLowerCase();
      if (emailChanged) {
        await updateChangeGmail(updatedData.email.trim());
      }
      const response = await updateMe(updatedData);
      const nextUserData = mapBackendUserToUserData(response.data);

      if (nextUserData.isActive === false) {
        showToastMsg(
          "Tài khoản của bạn đã bị hủy kích hoạt. Vui lòng đăng nhập lại.",
          "error",
        );
        setTimeout(() => {
          clearAuthTokens();
          router.push("/department/login");
        }, 1000);
        return;
      }

      setUserData(nextUserData);
      setInitialUserData(nextUserData);
      setProfileResetKey((current) => current + 1);
      showToastMsg(
        String(
          successMessage || response.message || "Cập nhật thông tin thành công",
        ),
        "success",
      );
    } catch (error) {
      showToastMsg(
        error instanceof Error ? error.message : "Cập nhật thông tin thất bại",
        "error",
      );
    } finally {
      setTimeout(() => {
        isSelfUpdatingRef.current = false;
      }, 2000);
    }
  };

  const handleDeleteProfileAvatar = async () => {
    isSelfUpdatingRef.current = true;
    try {
      const response = await deleteMyAvatar();
      const nextUserData = mapBackendUserToUserData(response.data);
      setUserData(nextUserData);
      setInitialUserData(nextUserData);
      setProfileResetKey((current) => current + 1);
      showToastMsg(
        String(response.message || "Xóa ảnh đại diện thành công"),
        "success",
      );
      return true;
    } catch (error) {
      showToastMsg(
        error instanceof Error ? error.message : "Xóa ảnh đại diện thất bại",
        "error",
      );
      return false;
    } finally {
      setTimeout(() => {
        isSelfUpdatingRef.current = false;
      }, 2000);
    }
  };

  const handleSaveBusinessProfile = async () => {
    const response = await getProfile();
    if (response.success && response.data) {
      setStoredBackendUser(response.data);
      const nextUserData = mapBackendUserToUserData(response.data);
      setUserData(nextUserData);
      setInitialUserData(nextUserData);
    }
    setProfileResetKey((current) => current + 1);
  };

  const handleCancelProfile = () => {
    setUserData({ ...initialUserData });
    setProfileResetKey((current) => current + 1);
    showToastMsg("Đã khôi phục dữ liệu ban đầu.", "success");
  };

  const handleSavePassword = async (
    currentPw: string,
    newPw: string,
    confirmPw: string,
  ) => {
    isSelfUpdatingRef.current = true;
    try {
      const response = await changePassword(currentPw, newPw, confirmPw);
      showToastMsg(
        String(
          response.message || "Đổi mật khẩu thành công. Đang đăng xuất...",
        ),
        "success",
      );
      setShowChangePasswordModal(false);

      // Clear auth tokens and redirect to login page
      clearAuthTokens();
      window.setTimeout(() => {
        router.push("/department/login");
      }, 1000);
    } catch (error) {
      showToastMsg(
        error instanceof Error ? error.message : "Đổi mật khẩu thất bại",
        "error",
      );
    } finally {
      setTimeout(() => {
        isSelfUpdatingRef.current = false;
      }, 2000);
    }
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    clearAuthTokens();
    showToastMsg("Đang đăng xuất khỏi hệ thống...", "success");
    window.setTimeout(() => {
      router.push("/department/login");
    }, 700);
  };

  const sidebarElement = (
    <Sidebar
      fullName={userData.fullName}
      avatarUrl={userData.avatarUrl}
      role={userData.role}
      accountType={userData.accountType}
      permissions={userData.permissions}
      onSelectView={(view) => {
        if (view === "change-password") {
          setShowChangePasswordModal(true);
        } else if (canAccessView(userData, view)) {
          setActiveView(view);
        } else {
          showToastMsg("Bạn không có quyền truy cập chức năng này", "error");
          setActiveView(getDefaultActiveView(userData));
        }
        setMobileMenuOpen(false);
      }}
      onLogout={() => setShowLogoutConfirm(true)}
      activeItem={
        activeView === "user-management"
          ? "quan_ly_nguoi_dung"
          : activeView === "permission-management"
            ? "quan_ly_quyen"
            : activeView === "role-management"
              ? "quan_ly_vai_tro"
              : activeView === "enterprise-management"
                ? "quan_ly_doanh_nghiep"
                : activeView === "business-type-management"
                  ? "quan_ly_loai_hinh"
                  : activeView === "industry-management"
                    ? "quan_ly_nganh_nghe"
                    : activeView === "labor-catalog-management"
                      ? "danh_muc_chung"
                      : activeView === "labor-dashboard"
                        ? "dashboard_tnld"
                        : activeView === "company-info"
                          ? "thong_tin_doanh_nghiep"
                          : activeView === "tnld-reports" ||
                              activeView === "tnld-theo-hdld"
                            ? "tnld_theo_hdld"
                            : activeView === "report-period"
                              ? "ky_bao_cao"
                              : activeView === "profile" &&
                                  userData.accountType === "DEPARTMENT"
                                ? "thong_tin_tai_khoan"
                                : ""
      }
      onCloseMobile={() => setMobileMenuOpen(false)}
    />
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {toast && (
        <div
          className={`fixed top-6 left-1/2 z-[50000] flex items-center gap-4 rounded-xl px-5 py-3.5 text-sm font-semibold shadow-lg border select-none transition-all animate-in fade-in slide-in-from-top-4 duration-300 w-[min(480px,calc(100vw-32px))] -translate-x-1/2 ${
            toast.type === "success"
              ? "bg-[#e9ffd7] text-[#147a22] border-[#c2f0a5]"
              : "bg-red-50 text-red-800 border-red-100"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 rounded-full bg-[#52d934] text-white" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500 fill-white" />
          )}
          <span className="flex-1 pr-2">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className={`rounded-lg p-1 transition-colors ${
              toast.type === "success"
                ? "text-[#0f5132] hover:bg-black/5"
                : "text-red-800 hover:bg-black/5"
            }`}
          >
            <X className="h-4.5 w-4.5 stroke-[2.5]" />
          </button>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setShowLogoutConfirm(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative flex w-full max-w-md flex-col items-center gap-6 rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 md:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400">
              <LogOut className="h-6 w-6" />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                Xác nhận đăng xuất
              </h3>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này không?
              </p>
            </div>
            <div className="mt-2 flex w-full items-center gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white shadow-md shadow-red-500/10 transition-all hover:bg-red-700"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoadingProfile ? (
        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-500">
          Đang tải thông tin người dùng...
        </div>
      ) : (
        <DashboardLayout
          sidebar={sidebarElement}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        >
          {activeView === "user-management" ? (
            <UserManagement
              showToast={showToastMsg}
              permissions={userData.permissions}
              isAdmin={hasUserRole(userData, "ADMIN")}
            />
          ) : activeView === "permission-management" ? (
            <PermissionManagement showToast={showToastMsg} />
          ) : activeView === "role-management" ? (
            <RoleManagement
              showToast={showToastMsg}
              permissions={userData.permissions}
              isAdmin={hasUserRole(userData, "ADMIN")}
            />
          ) : activeView === "enterprise-management" ? (
            <EnterpriseManagement
              showToast={showToastMsg}
              permissions={userData.permissions}
              isAdmin={hasUserRole(userData, "ADMIN")}
            />
          ) : activeView === "business-type-management" ? (
            <BusinessReferenceManagement
              kind="business-type"
              showToast={showToastMsg}
              permissions={userData.permissions}
              isAdmin={hasUserRole(userData, "ADMIN")}
            />
          ) : activeView === "industry-management" ? (
            <BusinessReferenceManagement
              kind="industry"
              showToast={showToastMsg}
              permissions={userData.permissions}
              isAdmin={hasUserRole(userData, "ADMIN")}
            />
          ) : activeView === "labor-catalog-management" ? (
            <LaborCatalogManagement
              showToast={showToastMsg}
              permissions={userData.permissions}
              isAdmin={hasUserRole(userData, "ADMIN")}
            />
          ) : activeView === "labor-dashboard" ? (
            <DepartmentReportDashboard showToast={showToastMsg} />
          ) : activeView === "company-info" ? (
            <CreateEnterprise
              key={profileResetKey}
              businessTypes={[]}
              isProfileEdit={true}
              mode="edit"
              onSave={handleSaveBusinessProfile}
              onProfileSavingChange={(isSaving) => {
                isSelfUpdatingRef.current = isSaving;
              }}
              onCancel={() => {
                setProfileResetKey((curr) => curr + 1);
                showToastMsg("Đã khôi phục dữ liệu ban đầu.", "success");
              }}
              showToast={showToastMsg}
            />
          ) : activeView === "report-period" ? (
            <ReportPeriodManagement
              showToast={showToastMsg}
              permissions={userData.permissions}
              isAdmin={hasUserRole(userData, "ADMIN")}
            />
          ) : activeView === "tnld-reports" ? (
            <DepartmentReports
              showToast={showToastMsg}
              permissions={userData.permissions}
              isAdmin={hasUserRole(userData, "ADMIN")}
            />
          ) : activeView === "tnld-theo-hdld" ? (
            <TnldTheoHdld showToast={showToastMsg} />
          ) : (
            <UserProfile
              key={profileResetKey}
              initialData={userData}
              onSave={handleSaveProfile}
              onDeleteAvatar={handleDeleteProfileAvatar}
              onCancel={handleCancelProfile}
              showToast={showToastMsg}
            />
          )}
        </DashboardLayout>
      )}

      {showChangePasswordModal && (
        <ChangePassword
          onSave={handleSavePassword}
          onCancel={() => {
            setShowChangePasswordModal(false);
            showToastMsg("Đã hủy bỏ đổi mật khẩu.", "success");
          }}
          showToast={showToastMsg}
        />
      )}
    </div>
  );
};
