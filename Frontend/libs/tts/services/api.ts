import type { UserData } from "../components/UserProfile";
import { STATIC_BUSINESS_TYPES, STATIC_INDUSTRIES_LEVEL4 } from "./mockData";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

const ACCESS_TOKEN_KEY = "vna_access_token";
const REFRESH_TOKEN_KEY = "vna_refresh_token";
const USER_ID_KEY = "vna_user_id";
const USER_DATA_KEY = "vna_user_data";
const REMEMBER_ME_KEY = "vna_remember_me";

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  error?: string;
  timestamp: string;
  path: string;
}

export interface BackendUser {
  id?: number | string;
  username?: string;
  fullName?: string;
  email?: string;
  avatar?: string | null;
  dateOfBirth?: string;
  gender?: string;
  position?: string;
  provinceCity?: string;
  wardCommune?: string;
  address?: string;
  isActive?: boolean;
  accountType?: "DEPARTMENT" | "BUSINESS";
  roles?: Array<string | { code?: string; name?: string }>;
  permissions?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface LoginPayload {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  expiresIn?: number;
  user: BackendUser;
}

interface ForgotPasswordPayload {
  email: string;
  expiresInSeconds: number;
  mailMode?: string;
  messageId?: string | null;
}

type ChangeGmailOtpPayload = ForgotPasswordPayload;

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem(ACCESS_TOKEN_KEY) ||
    sessionStorage.getItem(ACCESS_TOKEN_KEY)
  );
}

export function getUserId() {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem(USER_ID_KEY) || sessionStorage.getItem(USER_ID_KEY)
  );
}

export function getStoredBackendUser(): BackendUser | null {
  if (typeof window === "undefined") return null;

  const raw =
    localStorage.getItem(USER_DATA_KEY) ||
    sessionStorage.getItem(USER_DATA_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as BackendUser;
  } catch {
    localStorage.removeItem(USER_DATA_KEY);
    sessionStorage.removeItem(USER_DATA_KEY);
    return null;
  }
}

export function setAuthTokens(
  accessToken: string,
  refreshToken: string,
  userId?: string | number,
  rememberMe: boolean = true,
) {
  if (typeof window === "undefined") return;

  if (rememberMe) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    if (userId !== undefined && userId !== null) {
      localStorage.setItem(USER_ID_KEY, String(userId));
    }
    localStorage.setItem(REMEMBER_ME_KEY, "true");

    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(USER_ID_KEY);
  } else {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    if (userId !== undefined && userId !== null) {
      sessionStorage.setItem(USER_ID_KEY, String(userId));
    }
    localStorage.setItem(REMEMBER_ME_KEY, "false");

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
  }
}

export function setStoredBackendUser(user: BackendUser, rememberMe?: boolean) {
  if (typeof window === "undefined") return;

  const shouldRemember =
    rememberMe ?? localStorage.getItem(REMEMBER_ME_KEY) !== "false";

  if (user.id !== undefined && user.id !== null) {
    if (shouldRemember) {
      localStorage.setItem(USER_ID_KEY, String(user.id));
      sessionStorage.removeItem(USER_ID_KEY);
    } else {
      sessionStorage.setItem(USER_ID_KEY, String(user.id));
      localStorage.removeItem(USER_ID_KEY);
    }
  }

  const serialized = JSON.stringify(user);
  if (shouldRemember) {
    localStorage.setItem(USER_DATA_KEY, serialized);
    sessionStorage.removeItem(USER_DATA_KEY);
  } else {
    sessionStorage.setItem(USER_DATA_KEY, serialized);
    localStorage.removeItem(USER_DATA_KEY);
  }
}

export function clearAuthTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_DATA_KEY);
  localStorage.removeItem(REMEMBER_ME_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(USER_ID_KEY);
  sessionStorage.removeItem(USER_DATA_KEY);
}

export function mapBackendUserToUserData(user: BackendUser): UserData {
  const roleObjects = (user.roles || []).map((item) =>
    typeof item === "string"
      ? { code: item, name: item === "ADMIN" ? "Quản trị viên" : item === "USER" ? "Người dùng" : item === "MANAGER" ? "Quản lý" : item }
      : { code: item.code || "", name: item.name || item.code || "" }
  );

  const roleCodes = roleObjects.map((r) => r.code).filter(Boolean);
  const roleNames = roleObjects.map((r) => r.name || r.code).filter(Boolean);
  const roleDisplay = (user as any).roleDisplay || roleNames.join(", ") || (user as any).roleName || roleNames.join(", ");

  const normalizedPosition = user.position?.trim().toLowerCase();
  const accountType =
    user.accountType === "BUSINESS" || user.accountType === "DEPARTMENT"
      ? user.accountType
      : roleCodes.includes("ADMIN")
        ? "DEPARTMENT"
        : normalizedPosition === "doanh nghiệp" ||
            normalizedPosition === "doanh nghiep"
          ? "BUSINESS"
          : "DEPARTMENT";

  return {
    avatarUrl: user.avatar || "",
    accountType,
    username: user.username || "",
    fullName: user.fullName || "",
    dob: user.dateOfBirth || "",
    gender: user.gender || "",
    title: user.position || "",
    role: roleDisplay || "Người dùng",
    email: user.email || "",
    province: user.provinceCity || "",
    ward: user.wardCommune || "",
    address: user.address || "",
    isActive: user.isActive ?? true,
    permissions: user.permissions || [],
  };
}

export function dataURLtoFile(dataurl: string, filename: string): File | null {
  if (!dataurl.startsWith("data:")) return null;
  const arr = dataurl.split(",");
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch) return null;
  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

export function mapUserDataToUpdateMe(data: UserData): FormData {
  const formData = new FormData();
  if (data.fullName) formData.append("fullName", data.fullName);
  if (data.gender) formData.append("gender", data.gender);
  if (data.dob) formData.append("dateOfBirth", data.dob);
  if (data.title) formData.append("position", data.title);
  if (data.province) formData.append("provinceCity", data.province);
  if (data.ward) formData.append("wardCommune", data.ward);
  if (data.address) formData.append("address", data.address);
  formData.append("isActive", String(data.isActive ?? true));

  if (data.avatarUrl?.startsWith("data:")) {
    const file = dataURLtoFile(data.avatarUrl, "avatar.png");
    if (file) {
      formData.append("avatar", file);
    }
  }

  return formData;
}

export async function login(
  username: string,
  password: string,
  rememberMe: boolean = true,
) {
  const response = await request<LoginPayload>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password, rememberMe }),
  });

  if (response.data?.accessToken && response.data?.refreshToken) {
    setAuthTokens(
      response.data.accessToken,
      response.data.refreshToken,
      response.data.user?.id,
      rememberMe,
    );
    if (response.data.user) {
      setStoredBackendUser(response.data.user, rememberMe);
    }
  }

  return response;
}

export function getStoredUserData() {
  const user = getStoredBackendUser();
  return user ? mapBackendUserToUserData(user) : null;
}

export async function getProfile() {
  const response = await request<BackendUser>("/users/me", {
    method: "GET",
    headers: authHeaders(),
  });

  if (response.data) {
    setStoredBackendUser(response.data);
  }

  return response;
}

export async function deleteMyAvatar() {
  const response = await request<BackendUser>("/users/me/avatar", {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (response.data) {
    setStoredBackendUser(response.data);
  }

  return response;
}

export async function updateMe(data: UserData) {
  const response = await request<BackendUser>("/users/me", {
    method: "PATCH",
    headers: authHeaders(),
    body: mapUserDataToUpdateMe(data),
  });

  if (response.data) {
    setStoredBackendUser(response.data);
  }

  return response;
}

export async function changePassword(
  oldPassword: string,
  newPassword: string,
  confirmPassword: string,
) {
  return request<null>("/auth/change-password", {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
  });
}

export async function requestForgotPassword(email: string) {
  return request<ForgotPasswordPayload>("/auth/forgot-password/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function verifyForgotPasswordOtp(email: string, otp: string) {
  return request<null>("/auth/forgot-password/verify", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
}

export async function resetPassword(
  email: string,
  otp: string,
  newPassword: string,
  confirmPassword: string,
) {
  return request<null>("/auth/forgot-password/reset", {
    method: "POST",
    body: JSON.stringify({ email, otp, newPassword, confirmPassword }),
  });
}

export async function sendChangeGmailOtp() {
  return request<ChangeGmailOtpPayload>("/auth/change-gmail/send-otp", {
    method: "POST",
    headers: authHeaders(),
  });
}

export async function verifyChangeGmailOtp(otp: string) {
  return request<null>("/auth/change-gmail/verify-otp", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ otp }),
  });
}

export async function updateChangeGmail(newEmail: string) {
  const response = await request<BackendUser>("/auth/change-gmail/update", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ newEmail }),
  });

  if (response.data) {
    setStoredBackendUser(response.data);
  }

  return response;
}

export interface UserListMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface UserListItem {
  id: number;
  fullName: string;
  username: string;
  email: string;
  avatar: string | null;
  position: string;
  isActive: boolean;
  accountType?: "DEPARTMENT" | "BUSINESS";
  statusLabel: string;
  roles: Array<{ id: number; code: string; name: string }>;
  roleCodes: string[];
  roleNames: string[];
  roleDisplay: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserListResponse {
  items: UserListItem[];
  meta: UserListMeta;
}

export async function getUsers(query?: {
  page?: number | string;
  limit?: number | string;
  keyword?: string;
  fullName?: string;
  username?: string;
  email?: string;
  role?: string;
  position?: string;
  isActive?: string;
}) {
  const params = new URLSearchParams();
  if (query) {
    Object.entries(query).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        params.append(key, String(val));
      }
    });
  }
  const queryString = params.toString();
  const path = `/users${queryString ? `?${queryString}` : ""}`;
  return request<UserListResponse>(path, {
    method: "GET",
    headers: authHeaders(),
  });
}

export async function updateUserAdmin(
  id: number | string,
  data: Partial<BackendUser> & { roleCode?: string; password?: string },
) {
  const formData = new FormData();
  if (data.username !== undefined) formData.append("username", data.username);
  if (data.password !== undefined) formData.append("password", data.password);
  if (data.fullName !== undefined) formData.append("fullName", data.fullName);
  if (data.email !== undefined) formData.append("email", data.email);
  if (data.gender !== undefined) formData.append("gender", data.gender);
  if (data.dateOfBirth !== undefined)
    formData.append("dateOfBirth", data.dateOfBirth);
  if (data.position !== undefined) formData.append("position", data.position);
  if (data.roleCode !== undefined) formData.append("roleCode", data.roleCode);
  if (data.isActive !== undefined)
    formData.append("isActive", String(data.isActive));
  if (data.provinceCity !== undefined)
    formData.append("provinceCity", data.provinceCity);
  if (data.wardCommune !== undefined)
    formData.append("wardCommune", data.wardCommune);
  if (data.address !== undefined) formData.append("address", data.address);

  if (data.avatar?.startsWith("data:")) {
    const file = dataURLtoFile(data.avatar, "avatar.png");
    if (file) {
      formData.append("avatar", file);
    }
  } else if (data.avatar === null) {
    formData.append("removeAvatar", "true");
  }

  return request<BackendUser>(`/users/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: formData,
  });
}

export async function createUser(
  data: Partial<BackendUser> & {
    roleCode?: string;
    password?: string;
    provinceCity?: string;
    wardCommune?: string;
  },
) {
  const formData = new FormData();
  if (data.username !== undefined) formData.append("username", data.username);
  if (data.password !== undefined) formData.append("password", data.password);
  if (data.fullName !== undefined) formData.append("fullName", data.fullName);
  if (data.email !== undefined) formData.append("email", data.email);
  if (data.gender !== undefined) formData.append("gender", data.gender);
  if (data.dateOfBirth !== undefined)
    formData.append("dateOfBirth", data.dateOfBirth);
  if (data.position !== undefined) formData.append("position", data.position);
  if (data.roleCode !== undefined) formData.append("roleCode", data.roleCode);
  if (data.isActive !== undefined)
    formData.append("isActive", String(data.isActive));
  if (data.provinceCity !== undefined)
    formData.append("provinceCity", data.provinceCity);
  if (data.wardCommune !== undefined)
    formData.append("wardCommune", data.wardCommune);
  if (data.address !== undefined) formData.append("address", data.address);

  if (data.avatar?.startsWith("data:")) {
    const file = dataURLtoFile(data.avatar, "avatar.png");
    if (file) {
      formData.append("avatar", file);
    }
  }

  return request<BackendUser>("/users", {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
}

export async function getUserDetail(id: number | string) {
  return request<BackendUser>(`/users/${id}`, {
    method: "GET",
    headers: authHeaders(),
  });
}

export async function deleteUser(id: number | string) {
  return request<{ id: number }>(`/users/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

export interface PermissionItem {
  id: number;
  code: string;
  name: string;
  type: "GROUP" | "COMPONENT";
  parentId: number | null;
  sortOrder: number;
}

export interface ManagedRole {
  id: number;
  code: string;
  name: string;
  isSystem: boolean;
  scope: "DEPARTMENT" | "BUSINESS" | "LEGACY";
  permissionIds: number[];
  permissionCount: number;
  assignedUserCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssignableRole {
  id: number;
  code: string;
  name: string;
  isSystem: boolean;
  scope: "DEPARTMENT" | "BUSINESS" | "LEGACY";
}

export interface RoleListResponse {
  items: ManagedRole[];
  meta: UserListMeta;
}

export async function getPermissions() {
  return request<{ items: PermissionItem[] }>("/permissions", {
    method: "GET",
    headers: authHeaders(),
  });
}

export async function getRoles(query?: {
  page?: number;
  limit?: number;
  code?: string;
  name?: string;
}) {
  const params = new URLSearchParams();
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, String(value));
      }
    });
  }

  const queryString = params.toString();
  return request<RoleListResponse>(
    `/roles${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
      headers: authHeaders(),
    },
  );
}

export async function getRoleDetail(id: number) {
  return request<ManagedRole>(`/roles/${id}`, {
    method: "GET",
    headers: authHeaders(),
  });
}

export async function getAssignableRoles() {
  return request<{ items: AssignableRole[] }>("/roles/assignable", {
    method: "GET",
    headers: authHeaders(),
  });
}

export async function createRole(data: {
  code: string;
  name: string;
  permissionIds: number[];
}) {
  return request<ManagedRole>("/roles", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}

export async function updateRole(
  id: number,
  data: {
    name: string;
    permissionIds: number[];
  },
) {
  return request<ManagedRole>(`/roles/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}

export async function deleteRole(id: number) {
  return request<null>(`/roles/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

export async function bulkDeleteRoles(ids: number[]) {
  return request<null>("/roles/bulk-delete", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ ids }),
  });
}

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function joinApiPath(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function normalizeMessage(message: unknown) {
  if (Array.isArray(message)) {
    return message.filter(Boolean).join("\n");
  }

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  return null;
}

async function request<T>(path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };

  if (!(init.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;
  const url = joinApiPath(API_BASE_URL, path);
  try {
    response = await fetch(url, {
      ...init,
      headers,
    });
  } catch (error) {
    console.error("Fetch API error:", { url, error });
    throw new Error(
      "Không thể kết nối đến máy chủ. Kiểm tra backend và cấu hình API.",
    );
  }

  const payload = (await response
    .json()
    .catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !payload?.success) {
    const message =
      normalizeMessage(payload?.message) ||
      normalizeMessage(payload?.error) ||
      `May chu tra ve loi ${response.status}`;
    throw new Error(message);
  }

  return {
    ...payload,
    message: normalizeMessage(payload.message) || "Thành công",
  };
}

export interface BusinessAttachment {
  id: number;
  displayName: string;
  originalName: string;
  fileUrl: string;
  mimetype: string;
  size: number;
  createdAt: string;
}

export interface BusinessTypeCatalogItem {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BusinessIndustryCatalogItem {
  id: number;
  code: string;
  name: string;
  level: number;
  parentId: number | null;
  parentCode: string | null;
  parentName: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BusinessListItem {
  id: number;
  businessName: string;
  foreignName?: string | null;
  taxCode: string;
  businessType: string;
  businessTypeId?: number | null;
  businessTypeCode?: string | null;
  industryCode: string;
  industryName: string;
  industryId?: number | null;
  industryDisplay: string;
  licenseIssueDate?: string | null;
  provinceCity: string;
  wardCommune: string;
  address?: string | null;
  email?: string | null;
  agencyPhone?: string | null;
  operatingProvinceCity?: string | null;
  operatingWardCommune?: string | null;
  businessLocation?: string | null;
  representativeName?: string | null;
  representativePhone?: string | null;
  isActive: boolean;
  statusLabel: string;
  attachments: BusinessAttachment[];
  createdAt: string;
  updatedAt: string;
  accountUserId?: number | null;
  accountUsername?: string | null;
  accountInfo?: {
    username: string;
    password: string;
  };
}

export interface BusinessListMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface BusinessListResponse {
  items: BusinessListItem[];
  meta: BusinessListMeta;
}

export interface BusinessOptionsResponse {
  businessTypes: string[];
  businessTypeOptions: BusinessTypeCatalogItem[];
  industries: BusinessIndustryCatalogItem[];
  taxCodeRules: {
    format: string;
    examples: string[];
  };
  industryLevel: number;
  industryCodeRule: string;
}

export async function getBusinesses(query?: {
  page?: number | string;
  limit?: number | string;
  keyword?: string;
  businessName?: string;
  taxCode?: string;
  businessType?: string;
  industryCode?: string;
  industryName?: string;
  wardCommune?: string;
  isActive?: string;
}) {
  const params = new URLSearchParams();
  if (query) {
    Object.entries(query).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        params.append(key, String(val));
      }
    });
  }
  const queryString = params.toString();
  const path = `/businesses${queryString ? `?${queryString}` : ""}`;
  return request<BusinessListResponse>(path, {
    method: "GET",
    headers: authHeaders(),
  });
}

export interface CatalogListResponse<T> {
  items: T[];
  meta: BusinessListMeta;
}

export async function getBusinessOptions(): Promise<
  ApiResponse<BusinessOptionsResponse>
> {
  try {
    return await request<BusinessOptionsResponse>("/businesses/options", {
      method: "GET",
      headers: authHeaders(),
    });
  } catch {
    return getRegistrationOptions();
  }
}

export async function getIndustries(): Promise<
  ApiResponse<BusinessIndustryCatalogItem[]>
> {
  const response = await getRegistrationOptions();
  return {
    ...response,
    data: response.data.industries,
  };
}

function buildCatalogQuery(
  query?: Record<string, string | number | boolean | undefined | null>,
) {
  const params = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export async function getBusinessTypes(query?: {
  page?: number;
  limit?: number;
  keyword?: string;
  code?: string;
  name?: string;
  isActive?: string | boolean;
}) {
  return request<CatalogListResponse<BusinessTypeCatalogItem>>(
    `/business-types${buildCatalogQuery(query)}`,
    { method: "GET", headers: authHeaders() },
  );
}

export async function createBusinessType(body: {
  code: string;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}) {
  return request<BusinessTypeCatalogItem>("/business-types", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
}

export async function updateBusinessType(
  id: number,
  body: { name?: string; sortOrder?: number },
) {
  return request<BusinessTypeCatalogItem>(`/business-types/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
}

export async function updateBusinessTypeCatalogStatus(
  id: number,
  isActive: boolean,
) {
  return request<BusinessTypeCatalogItem>(`/business-types/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ isActive }),
  });
}

export async function deleteBusinessType(id: number | string) {
  return request<any>(`/business-types/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

export async function getBusinessIndustries(query?: {
  page?: number;
  limit?: number;
  keyword?: string;
  code?: string;
  name?: string;
  level?: number | string;
  parentId?: number | string;
  isActive?: string | boolean;
}) {
  return request<CatalogListResponse<BusinessIndustryCatalogItem>>(
    `/business-industries${buildCatalogQuery(query)}`,
    { method: "GET", headers: authHeaders() },
  );
}

export async function createBusinessIndustry(body: {
  code: string;
  name: string;
  parentId?: number;
  sortOrder?: number;
  isActive?: boolean;
}) {
  return request<BusinessIndustryCatalogItem>("/business-industries", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
}

export async function updateBusinessIndustry(
  id: number,
  body: { name?: string; parentId?: number | null; sortOrder?: number },
) {
  return request<BusinessIndustryCatalogItem>(`/business-industries/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
}

export async function updateBusinessIndustryStatus(
  id: number,
  isActive: boolean,
) {
  return request<BusinessIndustryCatalogItem>(
    `/business-industries/${id}/status`,
    {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ isActive }),
    },
  );
}

export async function deleteBusinessIndustry(id: number | string) {
  return request<any>(`/business-industries/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}


export async function getBusinessDetail(id: number | string) {
  return request<BusinessListItem>(`/businesses/${id}`, {
    method: "GET",
    headers: authHeaders(),
  });
}

export async function validateBusinessUniqueness(data: {
  taxCode: string;
  email: string;
  businessId?: number;
}) {
  return request<{ available: boolean }>("/businesses/validate-uniqueness", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}

export async function createBusiness(formData: FormData) {
  return request<BusinessListItem>("/businesses", {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
}

export async function updateBusiness(id: number | string, formData: FormData) {
  return request<BusinessListItem>(`/businesses/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: formData,
  });
}

export async function updateBusinessStatus(
  id: number | string,
  isActive: boolean,
) {
  return request<BusinessListItem>(`/businesses/${id}/status`, {
    method: "PATCH",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ isActive }),
  });
}

export async function deleteBusiness(id: number | string) {
  return request<{ id: number }>(`/businesses/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

export async function deleteBusinessAttachment(
  businessId: number | string,
  attachmentId: number | string,
) {
  return request<{ id: number }>(
    `/businesses/${businessId}/attachments/${attachmentId}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    },
  );
}

export async function getRegistrationOptions(): Promise<
  ApiResponse<BusinessOptionsResponse>
> {
  try {
    return await request<BusinessOptionsResponse>(
      "/businesses/register/options",
      {
        method: "GET",
      },
    );
  } catch {
    const businessTypeOptions = STATIC_BUSINESS_TYPES.map((name, index) => ({
      id: -(index + 1),
      code: `LEGACY_${index + 1}`,
      name,
      isActive: true,
      sortOrder: index + 1,
    }));
    const industries = STATIC_INDUSTRIES_LEVEL4.map((item, index) => ({
      id: -(index + 1),
      ...item,
      level: 4,
      parentId: null,
      parentCode: null,
      parentName: null,
      isActive: true,
      sortOrder: index + 1,
    }));

    return {
      success: true,
      statusCode: 200,
      message: "Đang sử dụng danh mục dự phòng",
      data: {
        businessTypes: [...STATIC_BUSINESS_TYPES],
        businessTypeOptions,
        industries,
        taxCodeRules: {
          format: "10 digits or 10 digits-3 digits",
          examples: ["9100008882", "0100109106-001"],
        },
        industryLevel: 4,
        industryCodeRule: "Mã ngành nghề cấp 4 gồm 4 chữ số theo VSIC",
      },
      timestamp: new Date().toISOString(),
      path: "/businesses/register/options",
    };
  }
}

export async function sendRegistrationOtp(body: {
  email: string;
  taxCode?: string;
}) {
  return request<{ email: string; expiresInSeconds: number }>(
    "/businesses/register/send-otp",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export async function verifyRegistrationOtp(body: {
  email: string;
  otp: string;
}) {
  return request<{ email: string; verified: boolean }>(
    "/businesses/register/verify-otp",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export async function confirmRegistration(formData: FormData) {
  return request<any>("/businesses/register/confirm", {
    method: "POST",
    body: formData,
  });
}

export async function getMyBusinessProfile() {
  return request<BusinessListItem>("/businesses/me", {
    method: "GET",
    headers: authHeaders(),
  });
}

export async function sendBusinessProfileEmailOtp() {
  return request<any>("/businesses/me/email/send-otp", {
    method: "POST",
    headers: authHeaders(),
  });
}

export async function verifyBusinessProfileEmailOtp(otp: string) {
  return request<any>("/businesses/me/email/verify-otp", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ otp }),
  });
}

export async function updateMyBusinessProfile(formData: FormData) {
  return request<BusinessListItem>("/businesses/me", {
    method: "PATCH",
    headers: authHeaders(),
    body: formData,
  });
}

export async function checkEmailExists(email: string) {
  return request<{ exists: boolean }>(`/users/check-email?email=${encodeURIComponent(email)}`, {
    method: "GET",
    headers: authHeaders(),
  });
}

export interface ListDepartmentReportsQuery {
  page?: number | string;
  limit?: number | string;
  year?: string;
  periodType?: string;
  status?: string;
  reportPeriodId?: string;
  businessName?: string;
  taxCode?: string;
  provinceCity?: string;
  wardCommune?: string;
}

function getCatalogName(type: string, id: number): string {
  let categories: string[] = [];
  if (type === "ACCIDENT_CAUSE") {
    categories = [
      "Không có thiết bị an toàn hoặc thiết bị không đảm bảo an toàn",
      "Không có phương tiện bảo vệ cá nhân hoặc phương tiện bảo vệ cá nhân không tốt",
      "Tổ chức lao động không hợp lý",
      "Chưa huấn luyện hoặc huấn luyện an toàn vệ sinh lao động chưa đầy đủ",
      "Không có quy trình an toàn hoặc biện pháp làm việc an toàn",
      "Điều kiện làm việc không tốt",
      "Vi phạm nội quy, quy trình, biện pháp làm việc an toàn",
      "Không sử dụng phương tiện bảo vệ cá nhân",
      "Khách quan khó tránh/ Nguyên nhân chưa kể đến",
    ];
  } else if (type === "INJURY_FACTOR") {
    categories = [
      "Thiết bị nâng",
      "Máy gia công cắt gọt kim loại, gỗ",
      "Điện giật",
      "Ngã từ trên cao",
      "Vật rơi, vật văng bắn",
      "Nhiệt độ cao, bỏng lửa",
      "Khác",
    ];
  } else if (type === "OCCUPATION") {
    categories = [
      "Nhà lãnh đạo cơ quan Đảng Cộng sản Việt nam cấp Trung ương",
      "Công nhân",
      "Nhà quản lý, điều hành doanh nghiệp",
      "Kỹ sư, kỹ thuật viên chuyên nghiệp",
      "Thợ vận hành máy và thiết bị",
      "Lao động thủ công giản đơn",
      "Khác",
    ];
  }
  return categories[id - 1] || "";
}

export async function getDepartmentReports(query?: ListDepartmentReportsQuery) {
  const params = new URLSearchParams();
  if (query) {
    Object.entries(query).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        params.append(key, String(val));
      }
    });
  }
  const queryString = params.toString();
  return request<any>(
    `/labor-accident-reports/admin${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
      headers: authHeaders(),
    },
  );
}

export async function receiveDepartmentReport(id: number | string) {
  return request<any>(`/labor-accident-reports/admin/${id}/receive`, {
    method: "POST",
    headers: authHeaders(),
  });
}

export async function bulkReceiveDepartmentReports(ids: number[]) {
  return request<any>(`/labor-accident-reports/admin/bulk-receive`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ ids }),
  });
}

export async function bulkRejectDepartmentReports(
  reports: { id: number; rejectReason: string }[],
) {
  return request<any>(`/labor-accident-reports/admin/bulk-reject`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ reports }),
  });
}

export async function getMyLaborAccidentReports(query?: {
  page?: number | string;
  limit?: number | string;
  year?: string;
  periodType?: string;
  status?: string;
}) {
  const params = new URLSearchParams();
  if (query) {
    Object.entries(query).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        params.append(key, String(val));
      }
    });
  }
  const queryString = params.toString();
  return request<any>(
    `/labor-accident-reports/my${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
      headers: authHeaders(),
    },
  );
}

export async function getMyLaborAccidentReportPeriods() {
  return request<any>("/labor-accident-reports/my/periods", {
    method: "GET",
    headers: authHeaders(),
  });
}

export async function getMyLaborAccidentReportDetail(id: number | string) {
  return request<any>(`/labor-accident-reports/my/${id}`, {
    method: "GET",
    headers: authHeaders(),
  });
}

export type LaborAccidentReportAuditAction =
  | "CREATE_DRAFT"
  | "UPDATE_DRAFT"
  | "SUBMIT"
  | "RESUBMIT"
  | "RECEIVE"
  | "REJECT"
  | "BACKFILL";

export interface LaborAccidentReportAuditLogItem {
  id: number;
  action: LaborAccidentReportAuditAction;
  actionLabel?: string;
  oldStatus?: string | null;
  oldStatusLabel?: string | null;
  newStatus?: string | null;
  newStatusLabel?: string | null;
  actorUserId?: number | null;
  actorName?: string | null;
  actorRole?: string | null;
  message?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface LaborAccidentReportAuditLogsPayload {
  reportId: number;
  items: LaborAccidentReportAuditLogItem[];
}

export async function getMyLaborAccidentReportAuditLogs(
  id: number | string,
) {
  return request<LaborAccidentReportAuditLogsPayload>(
    `/labor-accident-reports/my/${id}/audit-logs`,
    {
      method: "GET",
      headers: authHeaders(),
    },
  );
}

export async function saveLaborAccidentReportDraft(body: FormData) {
  return request<any>("/labor-accident-reports/my/draft", {
    method: "POST",
    headers: authHeaders(),
    body,
  });
}

export type LaborAccidentPreSubmitSeverity =
  | "success"
  | "info"
  | "warning"
  | "danger";

export type LaborAccidentPreSubmitLevel =
  | "READY"
  | "REVIEW_RECOMMENDED"
  | "NEEDS_ATTENTION"
  | "NEEDS_FIX";

export interface LaborAccidentPreSubmitCheckItem {
  code: string;
  severity: LaborAccidentPreSubmitSeverity;
  category: string;
  title: string;
  message: string;
  suggestion?: string;
  targetStep?: number;
  targetSection?: string;
  blocking: boolean;
  metadata?: Record<string, unknown>;
}

export interface LaborAccidentPreSubmitCheckPayload {
  readinessScore: number;
  level: LaborAccidentPreSubmitLevel;
  canSubmit: boolean;
  requireConfirmation: boolean;
  checkedAt: string;
  summary: {
    totalItems: number;
    blockingCount: number;
    dangerSoftCount: number;
    warningCount: number;
    infoCount: number;
    successCount: number;
  };
  rejectionContext?: {
    rejectedAt?: string | null;
    reason?: string | null;
    actorName?: string | null;
    topic?: string;
    isClear?: boolean;
    suggestion?: string;
  } | null;
  previousReport?: {
    id: number;
    year: number;
    periodType: string;
    periodTypeLabel: string;
    status: string;
    statusLabel: string;
    totalAccidents: number;
    totalVictims: number;
    totalCost: number;
    submittedAt?: string | null;
    receivedAt?: string | null;
  } | null;
  items: LaborAccidentPreSubmitCheckItem[];
}

export async function checkLaborAccidentReportBeforeSubmit(
  id: number | string,
  body: FormData,
) {
  return request<LaborAccidentPreSubmitCheckPayload>(
    `/labor-accident-reports/my/${id}/pre-submit-check`,
    {
      method: "POST",
      headers: authHeaders(),
      body,
    },
  );
}

export async function submitLaborAccidentReport(
  id: number | string,
  body: FormData,
) {
  return request<any>(`/labor-accident-reports/my/${id}/submit`, {
    method: "POST",
    headers: authHeaders(),
    body,
  });
}

export type LaborCatalogType =
  "ACCIDENT_CAUSE" | "INJURY_FACTOR" | "INJURY_TYPE" | "OCCUPATION";

export interface LaborCatalogItem {
  id: number;
  type: LaborCatalogType;
  typeLabel: string;
  code: string;
  name: string;
  level: number;
  parentId: number | null;
  parentCode: string | null;
  parentName: string | null;
  isActive: boolean;
  statusLabel: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function getCatalogTypes() {
  return request<Array<{ value: LaborCatalogType; label: string }>>(
    "/labor-accident-catalogs/types",
    { method: "GET", headers: authHeaders() },
  );
}

export async function getLaborCatalogs(query?: {
  page?: number;
  limit?: number;
  type?: LaborCatalogType;
  keyword?: string;
  code?: string;
  name?: string;
  level?: number | string;
  parentId?: number | string;
  isActive?: string | boolean;
}) {
  return request<CatalogListResponse<LaborCatalogItem>>(
    `/labor-accident-catalogs${buildCatalogQuery(query)}`,
    { method: "GET", headers: authHeaders() },
  );
}

export async function getCatalogOptions(type?: LaborCatalogType) {
  const query = type ? `?type=${type}` : "";
  return request<LaborCatalogItem[]>(
    `/labor-accident-catalogs/options${query}`,
    {
      method: "GET",
      headers: authHeaders(),
    },
  );
}

export async function createLaborCatalog(body: {
  type: LaborCatalogType;
  code: string;
  name: string;
  parentId?: number;
  isActive?: boolean;
}) {
  return request<LaborCatalogItem>("/labor-accident-catalogs", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
}

export async function updateLaborCatalog(
  id: number,
  body: {
    type?: LaborCatalogType;
    code?: string;
    name?: string;
    parentId?: number | null;
  },
) {
  return request<LaborCatalogItem>(`/labor-accident-catalogs/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
}

export async function updateLaborCatalogStatus(id: number, isActive: boolean) {
  return request<LaborCatalogItem>(`/labor-accident-catalogs/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ isActive }),
  });
}

export async function getDepartmentReportDetail(id: number | string) {
  return request<any>(`/labor-accident-reports/admin/${id}`, {
    method: "GET",
    headers: authHeaders(),
  });
}

export async function getDepartmentReportAuditLogs(id: number | string) {
  return request<LaborAccidentReportAuditLogsPayload>(
    `/labor-accident-reports/admin/${id}/audit-logs`,
    {
      method: "GET",
      headers: authHeaders(),
    },
  );
}

export async function getReportPeriods(query?: {
  page?: number | string;
  limit?: number | string;
  year?: string;
  reportName?: string;
  periodType?: string;
  startDate?: string;
  endDate?: string;
  isActive?: string | boolean;
}) {
  const params = new URLSearchParams();
  if (query) {
    Object.entries(query).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        params.append(key, String(val));
      }
    });
  }
  const queryString = params.toString();
  return request<any>(
    `/labor-accident-report-periods${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
      headers: authHeaders(),
    },
  );
}

export async function getReportPeriodYears() {
  return request<{ years: number[] }>("/labor-accident-report-periods/years", {
    method: "GET",
    headers: authHeaders(),
  });
}

export async function createReportPeriod(body: {
  reportName: string;
  year: number | string;
  periodType: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}) {
  return request<any>("/labor-accident-report-periods", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
}

export async function updateReportPeriod(
  id: number | string,
  body: {
    reportName?: string;
    year?: number | string;
    periodType?: string;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
  },
) {
  return request<any>(`/labor-accident-report-periods/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
}

export async function updateReportPeriodStatus(
  id: number | string,
  isActive: boolean,
) {
  return request<any>(`/labor-accident-report-periods/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ isActive }),
  });
}

export async function deleteLaborCatalogsBulk(ids: number[]) {
  return request<any>("/labor-accident-catalogs/delete-bulk", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ ids }),
  });
}

export async function getDepartmentReportSummary(query?: {
  year?: string;
  periodType?: string;
  provinceCity?: string;
  wardCommune?: string;
  status?: string;
}) {
  const params = new URLSearchParams();
  if (query) {
    Object.entries(query).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        params.append(key, String(val));
      }
    });
  }
  const queryString = params.toString();
  return request<any>(
    `/labor-accident-reports/admin/summary${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
      headers: authHeaders(),
    },
  );
}

export interface DepartmentReportDashboardQuery {
  reportPeriodId?: string;
  year?: string;
  periodType?: string;
  provinceCity?: string;
  wardCommune?: string;
}

export interface DepartmentReportDashboardProgress {
  totalEligibleReportObligations: number;
  totalExistingReports: number;
  notStartedCount: number;
  draftCount: number;
  submittedCount: number;
  receivedCount: number;
  rejectedCount: number;
  submittedOrReceivedCount: number;
  submittedRate: number;
  receivedRate: number;
  completionRate: number;
}

export interface DepartmentReportDashboardStatusRow {
  status: string;
  label: string;
  count: number;
  percentage: number;
}

export interface DepartmentReportDashboardWarningCard {
  type: string;
  label: string;
  severity: "danger" | "warning" | "info";
  count: number;
}

export interface DepartmentReportDashboardPeriod {
  id: number;
  reportName: string;
  year: number;
  periodType: string;
  periodTypeLabel: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  windowStatus: "INACTIVE" | "UPCOMING" | "OPEN" | "CLOSED";
  daysToStart: number;
  daysToDeadline: number;
  progress: DepartmentReportDashboardProgress;
  byStatus: DepartmentReportDashboardStatusRow[];
  warningSummary: Record<string, number>;
  warnings: DepartmentReportDashboardWarningCard[];
}

export interface DepartmentReportDashboardUrgentBusiness {
  type: string;
  label: string;
  severity: "danger" | "warning" | "info";
  businessId: number;
  businessName: string;
  taxCode: string;
  businessType?: string | null;
  provinceCity?: string | null;
  wardCommune?: string | null;
  reportId?: number | null;
  reportPeriodId: number;
  reportName: string;
  year: number;
  periodType: string;
  periodTypeLabel: string;
  status: string;
  statusLabel: string;
  windowStatus: "INACTIVE" | "UPCOMING" | "OPEN" | "CLOSED";
  daysToDeadline: number;
  submittedAt?: string | null;
  receivedAt?: string | null;
  rejectReason?: string | null;
}

export interface DepartmentReportDashboardData {
  filters: {
    reportPeriodId: number | null;
    year: number | null;
    periodType: string | null;
    periodTypeLabel: string | null;
    provinceCity: string | null;
    wardCommune: string | null;
  };
  generatedAt: string;
  totalActiveBusinesses?: number;
  reportPeriods: DepartmentReportDashboardPeriod[];
  progress: DepartmentReportDashboardProgress;
  byStatus: DepartmentReportDashboardStatusRow[];
  warningSummary: Record<string, number>;
  warnings: DepartmentReportDashboardWarningCard[];
  urgentBusinesses: DepartmentReportDashboardUrgentBusiness[];
}

export async function getDepartmentReportDashboard(
  query?: DepartmentReportDashboardQuery,
) {
  const params = new URLSearchParams();
  if (query) {
    Object.entries(query).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        params.append(key, String(val));
      }
    });
  }
  const queryString = params.toString();
  return request<DepartmentReportDashboardData>(
    `/labor-accident-reports/admin/dashboard${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
      headers: authHeaders(),
    },
  );
}

export async function exportDepartmentSummaryExcel(query?: {
  year?: string;
  periodType?: string;
  provinceCity?: string;
  wardCommune?: string;
  status?: string;
}) {
  const params = new URLSearchParams();
  if (query) {
    Object.entries(query).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        params.append(key, String(val));
      }
    });
  }
  const queryString = params.toString();
  const url = joinApiPath(
    API_BASE_URL,
    `/labor-accident-reports/admin/summary/export/excel${queryString ? `?${queryString}` : ""}`
  );
  
  const headers = authHeaders();
  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new Error("Không thể xuất file Excel");
  }

  return response.blob();
}

export async function exportDepartmentSummaryWord(query?: {
  year?: string;
  periodType?: string;
  provinceCity?: string;
  wardCommune?: string;
  status?: string;
}) {
  const params = new URLSearchParams();
  if (query) {
    Object.entries(query).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        params.append(key, String(val));
      }
    });
  }
  const queryString = params.toString();
  const url = joinApiPath(
    API_BASE_URL,
    `/labor-accident-reports/admin/summary/export/word${queryString ? `?${queryString}` : ""}`
  );
  
  const headers = authHeaders();
  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new Error("Không thể xuất file Word");
  }

  return response.blob();
}

export interface ImportResultDetail {
  rowNumber: number;
  taxCode: string;
  businessName: string;
  errors: string[];
}

export interface ImportSummaryResponse {
  total: number;
  successCount: number;
  failCount: number;
  details: ImportResultDetail[];
}

export async function importBusinessesExcel(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return request<ImportSummaryResponse>("/businesses/import", {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
}

export async function downloadBusinessTemplate() {
  const token = getAccessToken();
  const url = `${API_BASE_URL.replace(/\/$/, "")}/businesses/import/template`;
  const response = await fetch(url, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error("Không thể tải file mẫu");
  }
  return response.blob();
}

export async function exportBusinessesExcel(query?: {
  keyword?: string;
  businessName?: string;
  taxCode?: string;
  businessType?: string;
  industryCode?: string;
  industryName?: string;
  wardCommune?: string;
  isActive?: string;
}) {
  const token = getAccessToken();
  const params = new URLSearchParams();
  if (query) {
    Object.entries(query).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        params.append(key, String(val));
      }
    });
  }
  const queryString = params.toString();
  const url = `${API_BASE_URL.replace(/\/$/, "")}/businesses/export${queryString ? `?${queryString}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error("Không thể xuất dữ liệu doanh nghiệp");
  }
  return response.blob();
}

export interface UserImportResultDetail {
  rowNumber: number;
  username: string;
  fullName: string;
  errors: string[];
}

export interface UserImportSummaryResponse {
  total: number;
  successCount: number;
  failCount: number;
  details: UserImportResultDetail[];
}

export async function importUsersExcel(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return request<UserImportSummaryResponse>("/users/import", {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
}

export async function downloadUserTemplate() {
  const token = getAccessToken();
  const url = `${API_BASE_URL.replace(/\/$/, "")}/users/import/template`;
  const response = await fetch(url, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error("Không thể tải file mẫu");
  }
  return response.blob();
}

export async function exportUsersExcel(query?: {
  keyword?: string;
  fullName?: string;
  username?: string;
  email?: string;
  role?: string;
  position?: string;
  isActive?: string;
}) {
  const token = getAccessToken();
  const params = new URLSearchParams();
  if (query) {
    Object.entries(query).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        params.append(key, String(val));
      }
    });
  }
  const queryString = params.toString();
  const url = `${API_BASE_URL.replace(/\/$/, "")}/users/export${queryString ? `?${queryString}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error("Không thể xuất dữ liệu người dùng");
  }
  return response.blob();
}
