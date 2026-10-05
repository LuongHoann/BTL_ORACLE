import Link from "next/link";
import { dangXuat } from "@/app/admin/actions";
import { yeuCauAdmin } from "@/lib/auth";

const NHOM_MENU = [
  {
    ten: "Tổng quan",
    muc: [{ href: "/admin", nhan: "Bảng điều khiển" }],
  },
  {
    ten: "Thực đơn",
    muc: [
      { href: "/admin/loai-mon", nhan: "Nhóm món" },
      { href: "/admin/mon", nhan: "Món, giá và công thức" },
    ],
  },
  {
    ten: "Kho",
    muc: [
      { href: "/admin/nguyen-lieu", nhan: "Nguyên liệu và tồn kho" },
      { href: "/admin/nha-cung-cap", nhan: "Nhà cung cấp" },
      { href: "/admin/nhap-kho", nhan: "Nhập kho" },
    ],
  },
  {
    ten: "Nhân sự",
    muc: [
      { href: "/admin/chuc-vu", nhan: "Chức vụ" },
      { href: "/admin/nhan-vien", nhan: "Nhân viên" },
      { href: "/admin/tai-khoan", nhan: "Tài khoản" },
    ],
  },
  {
    ten: "Báo cáo",
    muc: [
      { href: "/admin/doanh-thu", nhan: "Doanh thu" },
      { href: "/admin/mon-ban", nhan: "Món bán trong ngày" },
    ],
  },
];

export default async function BoCucQuanTri({ children }: { children: React.ReactNode }) {
  const phien = await yeuCauAdmin();

  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <aside className="the h-fit p-3 text-sm">
        {NHOM_MENU.map((nhom) => (
          <div key={nhom.ten} className="mb-3">
            <div className="px-2 pb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">{nhom.ten}</div>
            {nhom.muc.map((m) => (
              <Link key={m.href} href={m.href} className="block rounded px-2 py-1.5 text-stone-700 hover:bg-amber-50 hover:text-amber-900">
                {m.nhan}
              </Link>
            ))}
          </div>
        ))}
        <div className="border-t border-stone-200 px-2 pt-3">
          <div className="text-xs text-stone-500">Đang đăng nhập</div>
          <div className="mb-2 font-medium">{phien.ho_ten}</div>
          <form action={dangXuat}>
            <button className="nut w-full">Đăng xuất</button>
          </form>
        </div>
      </aside>
      <section className="min-w-0">{children}</section>
    </div>
  );
}
