import { DepartmentLoginScreen } from "@/libs/tts";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng nhập | Sở Giáo dục và Đào tạo",
  description: "Cổng đăng nhập hệ thống khảo thí và đánh giá chất lượng giáo dục - Cấp quản lý Sở GD&ĐT",
};

export default function LoginPage() {
  return <DepartmentLoginScreen />;
}
