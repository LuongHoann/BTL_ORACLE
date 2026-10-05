import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // oracledb là thư viện Node thuần, không đóng gói vào bundle của server
  serverExternalPackages: ["oracledb"],
  // Cho phép build bản thử vào thư mục khác (NEXT_DIST_DIR=.next-thu) để không đụng tới `npm run dev` đang chạy
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
