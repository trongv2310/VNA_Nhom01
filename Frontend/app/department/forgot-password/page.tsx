import { DepartmentForgotPasswordScreen } from "@/libs/tts";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Khôi phục mật khẩu | Sở Giáo dục và Đào tạo",
  description: "Cổng khôi phục mật khẩu tài khoản quản trị viên - Cấp quản lý Sở GD&ĐT",
};

export default function ForgotPasswordPage() {
  return <DepartmentForgotPasswordScreen />;
}
