import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const fontChinh = Be_Vietnam_Pro({
  variable: "--font-chinh",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Quản lý quán café",
  description: "Bài tập lớn Oracle – Đề 12: hệ thống quản lý quán café",
};

// Mọi trang đều đọc dữ liệu trực tiếp từ Oracle nên luôn dựng lại theo từng yêu cầu
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${fontChinh.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-stone-200 bg-white">
          <nav className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
            <Link href="/" className="text-lg font-bold text-amber-900">
              ☕ Quán Café
            </Link>
            <Link href="/" className="text-sm font-medium text-stone-700 hover:text-amber-800">
              Đặt món
            </Link>
            <Link href="/hoa-don" className="text-sm font-medium text-stone-700 hover:text-amber-800">
              Lịch sử hoá đơn
            </Link>
            <Link href="/bat-tat-mon" className="text-sm font-medium text-stone-700 hover:text-amber-800">
              Bật/tắt món
            </Link>
            <Link href="/admin" className="ml-auto text-sm font-medium text-stone-700 hover:text-amber-800">
              Quản trị
            </Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
