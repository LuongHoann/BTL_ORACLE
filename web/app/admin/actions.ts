"use server";

import { redirect } from "next/navigation";
import { bamMatKhau, kiemTraMatKhau, taoPhien, xoaPhien, yeuCauAdmin } from "@/lib/auth";
import { DANH_MUC } from "@/lib/danh-muc";
import { giaoDich, type GiaTri, THAM_SO_RA_SO, thongBaoLoi, thucThi, truyVan } from "@/lib/db";

const KICH_CO = ["S", "M", "L", "F"];

// Chạy một thao tác ghi của quản trị viên rồi quay lại trang, kèm thông báo lỗi nếu có.
// redirect() phải nằm ngoài try/catch vì nó hoạt động bằng cách ném ngoại lệ.
// Khi lỗi thì quay về duongDanLoi (mặc định cũng là duongDan), ví dụ quay lại trang form đang nhập.
async function chay(duongDan: string, viec: () => Promise<void>, duongDanLoi = duongDan): Promise<never> {
  await yeuCauAdmin();
  let loi = "";
  try {
    await viec();
  } catch (e) {
    loi = thongBaoLoi(e);
  }
  redirect(loi ? `${duongDanLoi}?loi=${encodeURIComponent(loi)}` : duongDan);
}

function kemThongBao(duongDan: string, thongBao: string): string {
  return `${duongDan}?ok=${encodeURIComponent(thongBao)}`;
}

function chu(fd: FormData, ten: string): string {
  return String(fd.get(ten) ?? "").trim();
}

function soNguyen(fd: FormData, ten: string): number {
  const n = Number(chu(fd, ten));
  if (!Number.isInteger(n)) throw new Error("Mã không hợp lệ.");
  return n;
}

function soDuong(fd: FormData, ten: string, nhan: string): number {
  const n = Number(chu(fd, ten));
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${nhan} phải là số lớn hơn 0.`);
  return n;
}

// ---------------------------------------------------------------------
// Đăng nhập / đăng xuất
// ---------------------------------------------------------------------
export async function dangNhap(fd: FormData): Promise<void> {
  const tenDangNhap = chu(fd, "ten_dang_nhap");
  const matKhau = String(fd.get("mat_khau") ?? "");

  const [tk] = await truyVan<{
    ma_tk: number;
    ten_dang_nhap: string;
    mat_khau: string;
    vai_tro: string;
    trang_thai: string;
    ma_nv: number;
    ho_ten: string;
  }>(
    `SELECT tk.ma_tk, tk.ten_dang_nhap, tk.mat_khau, tk.vai_tro, tk.trang_thai, tk.ma_nv, nv.ho_ten
       FROM tai_khoan tk
       JOIN nhan_vien nv ON nv.ma_nv = tk.ma_nv
      WHERE tk.ten_dang_nhap = :ten`,
    { ten: tenDangNhap },
  );

  let loi = "";
  if (!tk || !kiemTraMatKhau(matKhau, tk.mat_khau)) loi = "Sai tên đăng nhập hoặc mật khẩu.";
  else if (tk.trang_thai !== "HOAT_DONG") loi = "Tài khoản đang bị khoá.";
  else if (tk.vai_tro !== "ADMIN") loi = "Tài khoản này không có quyền quản trị.";
  if (loi) redirect(`/admin/dang-nhap?loi=${encodeURIComponent(loi)}`);

  await taoPhien({ ma_tk: tk.ma_tk, ten_dang_nhap: tk.ten_dang_nhap, ma_nv: tk.ma_nv, ho_ten: tk.ho_ten });
  redirect("/admin");
}

export async function dangXuat(): Promise<void> {
  await xoaPhien();
  redirect("/admin/dang-nhap");
}

// ---------------------------------------------------------------------
// Danh mục đơn giản: nhóm món, chức vụ, nhân viên, nhà cung cấp, nguyên liệu
// ---------------------------------------------------------------------
export async function luuDanhMuc(khoa: string, fd: FormData): Promise<void> {
  const dm = DANH_MUC[khoa];
  if (!dm) throw new Error("Danh mục không tồn tại.");
  const maDangSua = chu(fd, dm.khoaChinh);
  const ketQua = kemThongBao(`/admin/${khoa}`, maDangSua ? "Đã lưu thay đổi." : "Đã thêm mới.");
  await chay(ketQua, async () => {
    const thamSo: Record<string, GiaTri> = {};
    for (const t of dm.truong) {
      const v = chu(fd, t.ten);
      if (t.batBuoc && v === "") throw new Error(`Chưa nhập "${t.nhan}".`);
      if (v === "") thamSo[t.ten] = null;
      else if (t.kieu === "number" || (t.kieu === "select" && t.sqlLuaChon)) {
        const n = Number(v);
        if (!Number.isFinite(n)) throw new Error(`"${t.nhan}" phải là số.`);
        thamSo[t.ten] = n;
      } else thamSo[t.ten] = v;
    }
    const giaTri = (ten: string, kieu: string) => (kieu === "date" ? `TO_DATE(:${ten}, 'YYYY-MM-DD')` : `:${ten}`);

    const ma = chu(fd, dm.khoaChinh);
    if (ma) {
      const gan = dm.truong.map((t) => `${t.ten} = ${giaTri(t.ten, t.kieu)}`).join(", ");
      await thucThi(`UPDATE ${dm.bang} SET ${gan} WHERE ${dm.khoaChinh} = :khoa_chinh`, {
        ...thamSo,
        khoa_chinh: soNguyen(fd, dm.khoaChinh),
      });
    } else {
      const cot = dm.truong.map((t) => t.ten).join(", ");
      const gt = dm.truong.map((t) => giaTri(t.ten, t.kieu)).join(", ");
      await thucThi(`INSERT INTO ${dm.bang} (${cot}) VALUES (${gt})`, thamSo);
    }
  }, `/admin/${khoa}/${/^\d+$/.test(maDangSua) ? maDangSua : "moi"}`);
}

export async function xoaDanhMuc(khoa: string, fd: FormData): Promise<void> {
  const dm = DANH_MUC[khoa];
  if (!dm) throw new Error("Danh mục không tồn tại.");
  await chay(kemThongBao(`/admin/${khoa}`, "Đã xoá."), async () => {
    await thucThi(`DELETE FROM ${dm.bang} WHERE ${dm.khoaChinh} = :ma`, { ma: soNguyen(fd, dm.khoaChinh) });
  }, `/admin/${khoa}`);
}

// ---------------------------------------------------------------------
// Món, kích cỡ và công thức
// ---------------------------------------------------------------------
export async function luuMon(fd: FormData): Promise<void> {
  await yeuCauAdmin();
  const ma = chu(fd, "ma_mon");
  let loi = "";
  let maMon = ma ? Number(ma) : 0;
  try {
    const thamSo = {
      ten_mon: chu(fd, "ten_mon"),
      don_vi_tinh: chu(fd, "don_vi_tinh") || "Ly",
      trang_thai: ["TAM_HET", "NGUNG_BAN"].includes(chu(fd, "trang_thai")) ? chu(fd, "trang_thai") : "CON_BAN",
      ma_loai: soNguyen(fd, "ma_loai"),
    };
    if (!thamSo.ten_mon) throw new Error("Chưa nhập tên món.");
    if (ma) {
      await thucThi(
        `UPDATE mon
            SET ten_mon = :ten_mon, don_vi_tinh = :don_vi_tinh, trang_thai = :trang_thai, ma_loai = :ma_loai
          WHERE ma_mon = :ma_mon`,
        { ...thamSo, ma_mon: maMon },
      );
    } else {
      maMon = await giaoDich(async (gd) => {
        const kq = await gd.thucThi(
          `INSERT INTO mon (ten_mon, don_vi_tinh, trang_thai, ma_loai)
           VALUES (:ten_mon, :don_vi_tinh, :trang_thai, :ma_loai)
           RETURNING ma_mon INTO :ma_mon`,
          { ...thamSo, ma_mon: THAM_SO_RA_SO },
        );
        return (kq.outBinds as { ma_mon: number[] }).ma_mon[0];
      });
    }
  } catch (e) {
    loi = thongBaoLoi(e);
  }
  if (loi) redirect(`/admin/mon/${maMon || "moi"}?loi=${encodeURIComponent(loi)}`);
  redirect(`/admin/mon/${maMon}?ok=${encodeURIComponent("Đã lưu thông tin món.")}`);
}

export async function xoaMon(fd: FormData): Promise<void> {
  await chay(kemThongBao("/admin/mon", "Đã xoá món."), async () => {
    await thucThi(`DELETE FROM mon WHERE ma_mon = :ma`, { ma: soNguyen(fd, "ma_mon") });
  }, "/admin/mon");
}

export async function luuSize(fd: FormData): Promise<void> {
  const maMon = soNguyen(fd, "ma_mon");
  await chay(`/admin/mon/${maMon}`, async () => {
    const kichCo = chu(fd, "kich_co");
    if (!KICH_CO.includes(kichCo)) throw new Error("Kích cỡ không hợp lệ.");
    await thucThi(
      `MERGE INTO mon_size ms
       USING (SELECT :ma_mon AS ma_mon, :kich_co AS kich_co FROM dual) v
          ON (ms.ma_mon = v.ma_mon AND ms.kich_co = v.kich_co)
        WHEN MATCHED THEN UPDATE SET ms.don_gia = :don_gia
        WHEN NOT MATCHED THEN INSERT (ma_mon, kich_co, don_gia) VALUES (v.ma_mon, v.kich_co, :don_gia)`,
      { ma_mon: maMon, kich_co: kichCo, don_gia: soDuong(fd, "don_gia", "Giá bán") },
    );
  });
}

export async function xoaSize(fd: FormData): Promise<void> {
  const maMon = soNguyen(fd, "ma_mon");
  await chay(`/admin/mon/${maMon}`, async () => {
    await thucThi(`DELETE FROM mon_size WHERE ma_mon = :ma_mon AND kich_co = :kich_co`, {
      ma_mon: maMon,
      kich_co: chu(fd, "kich_co"),
    });
  });
}

export async function luuCongThuc(fd: FormData): Promise<void> {
  const maMon = soNguyen(fd, "ma_mon");
  await chay(`/admin/mon/${maMon}`, async () => {
    await thucThi(
      `MERGE INTO cong_thuc c
       USING (SELECT :ma_mon AS ma_mon, :kich_co AS kich_co, :ma_nl AS ma_nl FROM dual) v
          ON (c.ma_mon = v.ma_mon AND c.kich_co = v.kich_co AND c.ma_nl = v.ma_nl)
        WHEN MATCHED THEN UPDATE SET c.dinh_luong = :dinh_luong
        WHEN NOT MATCHED THEN INSERT (ma_mon, kich_co, ma_nl, dinh_luong)
             VALUES (v.ma_mon, v.kich_co, v.ma_nl, :dinh_luong)`,
      {
        ma_mon: maMon,
        kich_co: chu(fd, "kich_co"),
        ma_nl: soNguyen(fd, "ma_nl"),
        dinh_luong: soDuong(fd, "dinh_luong", "Định lượng"),
      },
    );
  });
}

export async function xoaCongThuc(fd: FormData): Promise<void> {
  const maMon = soNguyen(fd, "ma_mon");
  await chay(`/admin/mon/${maMon}`, async () => {
    await thucThi(`DELETE FROM cong_thuc WHERE ma_mon = :ma_mon AND kich_co = :kich_co AND ma_nl = :ma_nl`, {
      ma_mon: maMon,
      kich_co: chu(fd, "kich_co"),
      ma_nl: soNguyen(fd, "ma_nl"),
    });
  });
}

// ---------------------------------------------------------------------
// Tài khoản
// ---------------------------------------------------------------------
function kiemTraDoDaiMatKhau(matKhau: string): void {
  if (matKhau.length < 6) throw new Error("Mật khẩu phải có ít nhất 6 ký tự.");
}

// Dùng chung cho tạo mới và sửa. Khi sửa: đổi được vai trò, và đặt lại mật khẩu nếu có nhập mật khẩu mới.
export async function luuTaiKhoan(fd: FormData): Promise<void> {
  const phien = await yeuCauAdmin();
  const ma = chu(fd, "ma_tk");
  const dangSua = /^\d+$/.test(ma);
  await chay(
    kemThongBao("/admin/tai-khoan", dangSua ? "Đã lưu tài khoản." : "Đã tạo tài khoản."),
    async () => {
      const matKhau = String(fd.get("mat_khau") ?? "");
      const vaiTro = chu(fd, "vai_tro") === "ADMIN" ? "ADMIN" : "NHAN_VIEN";
      if (dangSua) {
        const maTk = Number(ma);
        if (maTk === phien.ma_tk && vaiTro !== "ADMIN") {
          throw new Error("Không thể tự bỏ quyền quản trị của tài khoản đang đăng nhập.");
        }
        if (matKhau) {
          kiemTraDoDaiMatKhau(matKhau);
          await thucThi(`UPDATE tai_khoan SET vai_tro = :vai_tro, mat_khau = :mat_khau WHERE ma_tk = :ma`, {
            vai_tro: vaiTro,
            mat_khau: bamMatKhau(matKhau),
            ma: maTk,
          });
        } else {
          await thucThi(`UPDATE tai_khoan SET vai_tro = :vai_tro WHERE ma_tk = :ma`, { vai_tro: vaiTro, ma: maTk });
        }
        return;
      }
      const ten = chu(fd, "ten_dang_nhap");
      if (!/^[a-zA-Z0-9_.]{3,30}$/.test(ten)) {
        throw new Error("Tên đăng nhập gồm 3–30 ký tự: chữ không dấu, số, dấu chấm hoặc gạch dưới.");
      }
      kiemTraDoDaiMatKhau(matKhau);
      await thucThi(
        `INSERT INTO tai_khoan (ten_dang_nhap, mat_khau, vai_tro, trang_thai, ma_nv)
         VALUES (:ten, :mat_khau, :vai_tro, 'HOAT_DONG', :ma_nv)`,
        { ten, mat_khau: bamMatKhau(matKhau), vai_tro: vaiTro, ma_nv: soNguyen(fd, "ma_nv") },
      );
    },
    `/admin/tai-khoan/${dangSua ? ma : "moi"}`,
  );
}

export async function doiTrangThaiTaiKhoan(fd: FormData): Promise<void> {
  const phien = await yeuCauAdmin();
  await chay("/admin/tai-khoan", async () => {
    const maTk = soNguyen(fd, "ma_tk");
    if (maTk === phien.ma_tk) throw new Error("Không thể tự khoá tài khoản đang đăng nhập.");
    await thucThi(
      `UPDATE tai_khoan
          SET trang_thai = CASE trang_thai WHEN 'HOAT_DONG' THEN 'KHOA' ELSE 'HOAT_DONG' END
        WHERE ma_tk = :ma`,
      { ma: maTk },
    );
  });
}

export async function xoaTaiKhoan(fd: FormData): Promise<void> {
  const phien = await yeuCauAdmin();
  await chay("/admin/tai-khoan", async () => {
    const maTk = soNguyen(fd, "ma_tk");
    if (maTk === phien.ma_tk) throw new Error("Không thể xoá tài khoản đang đăng nhập.");
    await thucThi(`DELETE FROM tai_khoan WHERE ma_tk = :ma`, { ma: maTk });
  });
}

// ---------------------------------------------------------------------
// Nhập kho
// ---------------------------------------------------------------------
export type DongNhap = { ma_nl: number; so_luong: number; don_gia_nhap: number };

// Lập phiếu nhập: phiếu, các dòng chi tiết và cập nhật giá nhập hiện tại của nguyên liệu
// nằm trong cùng một giao dịch. Người lập là quản trị viên đang đăng nhập.
export async function taoPhieuNhap(maNcc: number, dong: DongNhap[]): Promise<{ loi: string } | void> {
  const phien = await yeuCauAdmin();
  let maPn: number;
  try {
    if (!Number.isInteger(maNcc)) throw new Error("Chưa chọn nhà cung cấp.");
    if (dong.length === 0) throw new Error("Phiếu nhập chưa có nguyên liệu nào.");
    const daCo = new Set<number>();
    const chiTiet = dong.map((d) => {
      const ct = { ma_nl: Number(d.ma_nl), so_luong: Number(d.so_luong), don_gia_nhap: Math.round(Number(d.don_gia_nhap)) };
      if (!Number.isInteger(ct.ma_nl)) throw new Error("Có dòng chưa chọn nguyên liệu.");
      if (daCo.has(ct.ma_nl)) throw new Error("Mỗi nguyên liệu chỉ được xuất hiện một lần trong phiếu.");
      daCo.add(ct.ma_nl);
      if (!(ct.so_luong > 0) || !(ct.don_gia_nhap > 0)) throw new Error("Số lượng và giá nhập phải lớn hơn 0.");
      return ct;
    });
    const tongTien = Math.round(chiTiet.reduce((t, d) => t + d.so_luong * d.don_gia_nhap, 0));

    maPn = await giaoDich(async (gd) => {
      const kq = await gd.thucThi(
        `INSERT INTO phieu_nhap (ngay_nhap, tong_tien, ma_ncc, ma_nv)
         VALUES (CURRENT_DATE, :tong_tien, :ma_ncc, :ma_nv)
         RETURNING ma_pn INTO :ma_pn`,
        { tong_tien: tongTien, ma_ncc: maNcc, ma_nv: phien.ma_nv, ma_pn: THAM_SO_RA_SO },
      );
      const ma = (kq.outBinds as { ma_pn: number[] }).ma_pn[0];
      await gd.thucThiNhieu(
        `INSERT INTO ct_phieu_nhap (ma_pn, ma_nl, so_luong, don_gia_nhap)
         VALUES (:ma_pn, :ma_nl, :so_luong, :don_gia_nhap)`,
        chiTiet.map((d) => ({ ma_pn: ma, ...d })),
      );
      await gd.thucThiNhieu(
        `UPDATE nguyen_lieu SET don_gia_nhap = :don_gia_nhap WHERE ma_nl = :ma_nl`,
        chiTiet.map((d) => ({ don_gia_nhap: d.don_gia_nhap, ma_nl: d.ma_nl })),
      );
      return ma;
    });
  } catch (e) {
    return { loi: thongBaoLoi(e) };
  }
  redirect(`/admin/nhap-kho/${maPn}?ok=${encodeURIComponent("Đã lập phiếu nhập.")}`);
}

export async function xoaPhieuNhap(fd: FormData): Promise<void> {
  await chay("/admin/nhap-kho", async () => {
    await thucThi(`DELETE FROM phieu_nhap WHERE ma_pn = :ma`, { ma: soNguyen(fd, "ma_pn") });
  });
}

// ---------------------------------------------------------------------
// Hoá đơn
// ---------------------------------------------------------------------
export async function huyHoaDon(fd: FormData): Promise<void> {
  const maHd = soNguyen(fd, "ma_hd");
  await chay(`/hoa-don/${maHd}`, async () => {
    const soDong = await thucThi(`UPDATE hoa_don SET trang_thai = 'DA_HUY' WHERE ma_hd = :ma AND trang_thai = 'DA_TT'`, {
      ma: maHd,
    });
    if (soDong === 0) throw new Error("Hoá đơn không tồn tại hoặc đã bị huỷ trước đó.");
  });
}
