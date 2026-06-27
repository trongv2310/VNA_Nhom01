import type { NextConfig } from "next";

const backendApiUrl =
  process.env.BACKEND_API_URL || "http://localhost:3000/api/v1";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendApiUrl.replace(/\/$/, "")}/:path*`,
      },
    ];
  },
};

export default nextConfig;
