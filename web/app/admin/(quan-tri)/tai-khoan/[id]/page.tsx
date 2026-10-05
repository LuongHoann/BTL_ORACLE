import Link from "next/link";
import { notFound } from "next/navigation";
import ThongBao, { motGiaTri } from "@/components/ThongBao";
import { luuTaiKhoan } from "@/app/admin/actions";
import { truyVan } from "@/lib/db";

// Form dùng chung cho tạo tài khoản (/admin/tai-khoan/moi) và sửa (/admin/tai-khoan/<mã>)
export default async function TrangFormTaiKhoan({ params, searchParams }: PageProps<"/admin/tai-khoan/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const laTaoMoi = id === "moi";
  if (!laTaoMoi && !/^\d+$/.test(id)) notFound();

  const [taiKhoan, nhanVienChuaCo] = await Promise.all([
    laTaoMoi
      ? Promise.resolve([])
      : truyVan<{ ma_tk: number; ten_dang_nhap: string; vai_tro: string; ho_ten: string; ten_cv: string }>(
          `SELECT tk.ma_tk, tk.ten_dang_nhap, tk.vai_tro, nv.ho_ten, cv.ten_cv
             FROM tai_khoan tk
             JOIN nhan_vien nv ON nv.ma_nv = tk.ma_nv
             JOIN chuc_vu cv   ON cv.ma_cv = nv.ma_cv
            WHERE tk.ma_tk = :ma`,
          { ma: Number(id) },
        ),
    laTaoMoi
      ? truyVan<{ ma_nv: number; ho_ten: string; ten_cv: string }>(
          `SELECT nv.ma_nv, nv.ho_ten, cv.ten_cv
             FROM nhan_vien nv
             JOIN chuc_vu cv ON cv.ma_cv = nv.ma_cv
            WHERE nv.ma_nv NOT IN (SELECT ma_nv FROM tai_khoan)
            ORDER BY nv.ho_ten`,
        )
      : Promise.resolve([]),
  ]);
  const dangSua = taiKhoan[0];
  if (!laTaoMoi && !dangSua) notFound();

  const hetNhanVien = laTaoMoi && nhanVienChuaCo.length === 0;

  return (
    <div className="max-w-3xl">
      <Link href="/admin/tai-khoan" className="text-sm text-amber-800 hover:underline">← Tài khoản</Link>
      <h1 className="tieu-de mt-1">{laTaoMoi ? "Tạo tài khoản" : `Sửa tài khoản "${dangSua.ten_dang_nhap}"`}</h1>
      <ThongBao loi={motGiaTri(sp.loi)} />

      {hetNhanVien ? (
        <div className="the text-sm text-stone-600">
          Tất cả nhân viên đều đã có tài khoản. Thêm nhân viên mới trước khi tạo tài khoản.
        </div>
      ) : (
        <form action={luuTaiKhoan} className="the">
          {dangSua && <input type="hidden" name="ma_tk" value={dangSua.ma_tk} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="nhan" htmlFor="ma_nv">Nhân viên <span className="text-red-600">*</span></label>
              {dangSua ? (
                <input className="o-nhap bg-stone-100" id="ma_nv" value={`${dangSua.ho_ten} (${dangSua.ten_cv})`} disabled />
              ) : (
                <select className="o-nhap" id="ma_nv" name="ma_nv" required defaultValue="">
                  <option value="">— Chọn —</option>
                  {nhanVienChuaCo.map((n) => (
                    <option key={n.ma_nv} value={n.ma_nv}>{n.ho_ten} ({n.ten_cv})</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="nhan" htmlFor="ten_dang_nhap">Tên đăng nhập <span className="text-red-600">*</span></label>
              {dangSua ? (
                <input className="o-nhap bg-stone-100" id="ten_dang_nhap" value={dangSua.ten_dang_nhap} disabled />
              ) : (
                <input className="o-nhap" id="ten_dang_nhap" name="ten_dang_nhap" required autoComplete="off" />
              )}
            </div>
            <div>
              <label className="nhan" htmlFor="vai_tro">Vai trò</label>
              <select className="o-nhap" id="vai_tro" name="vai_tro" defaultValue={dangSua?.vai_tro ?? "NHAN_VIEN"}>
                <option value="NHAN_VIEN">Nhân viên</option>
                <option value="ADMIN">Quản trị</option>
              </select>
            </div>
            <div>
              <label className="nhan" htmlFor="mat_khau">
                {dangSua ? "Mật khẩu mới" : "Mật khẩu"} {!dangSua && <span className="text-red-600">*</span>}
              </label>
              <input
                className="o-nhap"
                id="mat_khau"
                name="mat_khau"
                type="password"
                minLength={6}
                required={!dangSua}
                autoComplete="new-password"
                placeholder={dangSua ? "Để trống nếu không đổi" : "Từ 6 ký tự"}
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-stone-500">
            Mật khẩu được lưu dưới dạng băm nên không xem lại được, chỉ có thể đặt mật khẩu mới.
            {dangSua && " Nhân viên và tên đăng nhập không đổi được; nếu cần thì xoá tài khoản rồi tạo lại."}
          </p>
          <div className="mt-4 flex gap-2">
            <button className="nut nut-chinh">{laTaoMoi ? "Tạo tài khoản" : "Lưu thay đổi"}</button>
            <Link className="nut" href="/admin/tai-khoan">Huỷ bỏ</Link>
          </div>
        </form>
      )}
    </div>
  );
}
