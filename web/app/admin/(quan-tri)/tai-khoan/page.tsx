import Link from "next/link";
import NutXacNhan from "@/components/NutXacNhan";
import ThongBao, { motGiaTri } from "@/components/ThongBao";
import { doiTrangThaiTaiKhoan, xoaTaiKhoan } from "@/app/admin/actions";
import { yeuCauAdmin } from "@/lib/auth";
import { truyVan } from "@/lib/db";

export default async function TrangTaiKhoan({ searchParams }: PageProps<"/admin/tai-khoan">) {
  const phien = await yeuCauAdmin();
  const sp = await searchParams;
  const tuKhoa = (motGiaTri(sp.q) ?? "").trim();
  const vaiTro = motGiaTri(sp.vai_tro);
  const trangThai = motGiaTri(sp.trang_thai);

  const dieuKien: string[] = [];
  const thamSo: Record<string, string> = {};
  if (tuKhoa) {
    dieuKien.push("(UPPER(tk.ten_dang_nhap) LIKE '%' || UPPER(:q) || '%' OR UPPER(nv.ho_ten) LIKE '%' || UPPER(:q) || '%')");
    thamSo.q = tuKhoa;
  }
  if (vaiTro === "ADMIN" || vaiTro === "NHAN_VIEN") {
    dieuKien.push("tk.vai_tro = :vai_tro");
    thamSo.vai_tro = vaiTro;
  }
  if (trangThai === "HOAT_DONG" || trangThai === "KHOA") {
    dieuKien.push("tk.trang_thai = :trang_thai");
    thamSo.trang_thai = trangThai;
  }
  const dangLoc = dieuKien.length > 0;

  const taiKhoan = await truyVan<{
    ma_tk: number;
    ten_dang_nhap: string;
    vai_tro: string;
    trang_thai: string;
    ho_ten: string;
    ten_cv: string;
  }>(
    `SELECT tk.ma_tk, tk.ten_dang_nhap, tk.vai_tro, tk.trang_thai, nv.ho_ten, cv.ten_cv
       FROM tai_khoan tk
       JOIN nhan_vien nv ON nv.ma_nv = tk.ma_nv
       JOIN chuc_vu cv   ON cv.ma_cv = nv.ma_cv
      ${dangLoc ? "WHERE " + dieuKien.join(" AND ") : ""}
      ORDER BY tk.ma_tk`,
    thamSo,
  );

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="tieu-de mb-0">Tài khoản</h1>
        <Link className="nut nut-chinh" href="/admin/tai-khoan/moi">+ Tạo tài khoản</Link>
      </div>
      <ThongBao loi={motGiaTri(sp.loi)} ok={motGiaTri(sp.ok)} />
      <p className="mb-4 text-sm text-stone-600">
        Mỗi nhân viên có tối đa một tài khoản. Chỉ tài khoản vai trò Quản trị đang hoạt động mới đăng nhập được vào khu vực này.
      </p>

      <form className="the mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label className="nhan" htmlFor="q">Tìm kiếm</label>
          <input className="o-nhap" id="q" name="q" defaultValue={tuKhoa} placeholder="tên đăng nhập, họ tên nhân viên" />
        </div>
        <div>
          <label className="nhan" htmlFor="vai_tro">Vai trò</label>
          <select className="o-nhap" id="vai_tro" name="vai_tro" defaultValue={vaiTro ?? ""}>
            <option value="">Tất cả</option>
            <option value="ADMIN">Quản trị</option>
            <option value="NHAN_VIEN">Nhân viên</option>
          </select>
        </div>
        <div>
          <label className="nhan" htmlFor="trang_thai">Trạng thái</label>
          <select className="o-nhap" id="trang_thai" name="trang_thai" defaultValue={trangThai ?? ""}>
            <option value="">Tất cả</option>
            <option value="HOAT_DONG">Hoạt động</option>
            <option value="KHOA">Đã khoá</option>
          </select>
        </div>
        <button className="nut nut-chinh">Lọc</button>
        {dangLoc && <Link className="nut" href="/admin/tai-khoan">Bỏ lọc</Link>}
      </form>

      <div className="the overflow-x-auto p-0">
        <table className="bang">
          <thead>
            <tr>
              <th>Tên đăng nhập</th>
              <th>Nhân viên</th>
              <th>Chức vụ</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {taiKhoan.map((tk) => {
              const laToi = tk.ma_tk === phien.ma_tk;
              const hoatDong = tk.trang_thai === "HOAT_DONG";
              return (
                <tr key={tk.ma_tk}>
                  <td className="font-medium">
                    {tk.ten_dang_nhap}
                    {laToi && <span className="ml-1 text-xs text-stone-500">(bạn)</span>}
                  </td>
                  <td>{tk.ho_ten}</td>
                  <td>{tk.ten_cv}</td>
                  <td>{tk.vai_tro === "ADMIN" ? "Quản trị" : "Nhân viên"}</td>
                  <td>
                    <span className={`huy-hieu ${hoatDong ? "bg-green-100 text-green-800" : "bg-stone-200 text-stone-600"}`}>
                      {hoatDong ? "Hoạt động" : "Đã khoá"}
                    </span>
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <Link className="nut" href={`/admin/tai-khoan/${tk.ma_tk}`}>Sửa</Link>
                      {!laToi && (
                        <>
                          <form action={doiTrangThaiTaiKhoan}>
                            <input type="hidden" name="ma_tk" value={tk.ma_tk} />
                            <button className="nut">{hoatDong ? "Khoá" : "Mở khoá"}</button>
                          </form>
                          <form action={xoaTaiKhoan}>
                            <input type="hidden" name="ma_tk" value={tk.ma_tk} />
                            <NutXacNhan cauHoi={`Xoá tài khoản "${tk.ten_dang_nhap}"?`}>Xoá</NutXacNhan>
                          </form>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {taiKhoan.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-stone-500">
                  {dangLoc ? "Không có tài khoản nào khớp với bộ lọc." : "Chưa có tài khoản nào."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-stone-600">{taiKhoan.length} tài khoản</p>
    </>
  );
}
