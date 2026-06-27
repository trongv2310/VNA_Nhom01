import { DepartmentDashboardScreen } from "@/libs/tts";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chi tiết người dùng | Sở Giáo dục và Đào tạo",
  description: "Quản trị thông tin cá nhân và tài khoản - Hệ thống quản lý hành chính Sở GD&ĐT",
};

export default function DashboardPage() {
  return <DepartmentDashboardScreen />;
}
