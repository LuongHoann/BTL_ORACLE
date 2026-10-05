import { redirect } from "next/navigation";
import ThongBao, { motGiaTri } from "@/components/ThongBao";
import { dangNhap } from "@/app/admin/actions";
import { layPhien } from "@/lib/auth";

export default async function TrangDangNhap({ searchParams }: PageProps<"/admin/dang-nhap">) {
  if (await layPhien()) redirect("/admin");
  const sp = await searchParams;

  return (
    <div className="mx-auto mt-10 max-w-sm">
      <h1 className="tieu-de text-center">Đăng nhập quản trị</h1>
      <ThongBao loi={motGiaTri(sp.loi)} />
      <form action={dangNhap} className="the flex flex-col gap-3">
        <div>
          <label className="nhan" htmlFor="ten_dang_nhap">Tên đăng nhập</label>
          <input className="o-nhap" id="ten_dang_nhap" name="ten_dang_nhap" required autoFocus autoComplete="username" />
        </div>
        <div>
          <label className="nhan" htmlFor="mat_khau">Mật khẩu</label>
          <input className="o-nhap" id="mat_khau" name="mat_khau" type="password" required autoComplete="current-password" />
        </div>
        <button className="nut nut-chinh">Đăng nhập</button>
      </form>
    </div>
  );
}
