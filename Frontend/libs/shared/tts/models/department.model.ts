export interface LoginCredentials {
  username: string;
  password?: string;
  rememberMe: boolean;
}

export interface OTPRequest {
  email: string;
}

export interface OTPVerifyRequest {
  email: string;
  otp: string;
}

export interface PasswordResetRequest {
  email: string;
  otp: string;
  passwordNew: string;
  passwordConfirm: string;
}

export interface UserSession {
  token: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  departmentName?: string;
}
