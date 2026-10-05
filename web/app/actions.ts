"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { giaoDich, THAM_SO_RA_SO, thongBaoLoi, thucThi } from "@/lib/db";

export type DongGio = { ma_mon: number; kich_co: string; so_luong: number };

// Thanh toán giỏ hàng: tạo hoá đơn và các dòng chi tiết trong cùng một giao dịch.
// Giá luôn lấy lại từ CSDL, không tin giá gửi lên từ trình duyệt.
export async function thanhToan(gio: DongGio[]): Promise<{ loi: string } | void> {
  // Gộp các dòng trùng món và kích cỡ
  const gop = new Map<string, DongGio>();
  for (const d of gio) {
    const soLuong = Math.floor(Number(d.so_luong));
    if (!Number.isInteger(Number(d.ma_mon)) || !soLuong || soLuong < 1 || soLuong > 999) {
      return { loi: "Giỏ hàng có dòng không hợp lệ." };
    }
    const khoa = `${d.ma_mon}-${d.kich_co}`;
    const cu = gop.get(khoa);
    gop.set(khoa, { ma_mon: Number(d.ma_mon), kich_co: String(d.kich_co), so_luong: (cu?.so_luong ?? 0) + soLuong });
  }
  if (gop.size === 0) return { loi: "Giỏ hàng đang trống." };

  let maHd: number;
  try {
    maHd = await giaoDich(async (gd) => {
      const chiTiet: { ma_mon: number; kich_co: string; so_luong: number; don_gia: number }[] = [];
      for (const d of gop.values()) {
        const [gia] = await gd.truyVan<{ don_gia: number; ten_mon: string; trang_thai: string }>(
          `SELECT ms.don_gia, m.ten_mon, m.trang_thai
             FROM mon_size ms
             JOIN mon m ON m.ma_mon = ms.ma_mon
            WHERE ms.ma_mon = :ma_mon AND ms.kich_co = :kich_co`,
          { ma_mon: d.ma_mon, kich_co: d.kich_co },
        );
        if (!gia || gia.trang_thai === "NGUNG_BAN") {
          throw new Error("Có món không còn bán hoặc không có kích cỡ đã chọn.");
        }
        if (gia.trang_thai !== "CON_BAN") {
          throw new Error(`Món "${gia.ten_mon}" đang tạm hết hàng. Bỏ món này khỏi giỏ rồi thanh toán lại.`);
        }
        chiTiet.push({ ...d, don_gia: gia.don_gia });
      }
      const tongTien = chiTiet.reduce((t, d) => t + d.so_luong * d.don_gia, 0);

      const kq = await gd.thucThi(
        `INSERT INTO hoa_don (ngay_lap, tong_tien, trang_thai)
         VALUES (CURRENT_DATE, :tong_tien, 'DA_TT')
         RETURNING ma_hd INTO :ma_hd`,
        { tong_tien: tongTien, ma_hd: THAM_SO_RA_SO },
      );
      const ma = (kq.outBinds as { ma_hd: number[] }).ma_hd[0];

      await gd.thucThiNhieu(
        `INSERT INTO ct_hoa_don (ma_hd, ma_mon, kich_co, so_luong, don_gia)
         VALUES (:ma_hd, :ma_mon, :kich_co, :so_luong, :don_gia)`,
        chiTiet.map((d) => ({ ma_hd: ma, ...d })),
      );
      return ma;
    });
  } catch (e) {
    return { loi: thongBaoLoi(e) };
  }
  redirect(`/hoa-don/${maHd}?moi=1`);
}

// Bật/tắt một món trên trang "Bật/tắt món": chuyển giữa còn bán và tạm hết hàng.
// Trạng thái nằm ở món nên áp dụng cho mọi kích cỡ của món đó. Không cần đăng nhập.
// Món đã ngừng bán (NGUNG_BAN) không đổi được ở đây, chỉ quản trị viên mới mở lại.
export async function batTatMon(fd: FormData): Promise<void> {
  const maMon = Number(fd.get("ma_mon"));
  const tamHet = fd.get("tam_het") === "1";
  // Quay lại đúng bộ lọc đang xem; chỉ nhận đường dẫn của chính trang này
  const veTrang = String(fd.get("ve_trang") ?? "");
  const duongDan = veTrang.startsWith("/bat-tat-mon") ? veTrang : "/bat-tat-mon";

  let loi = "";
  if (!Number.isInteger(maMon)) loi = "Món không hợp lệ.";
  else {
    try {
      const soDong = await thucThi(
        `UPDATE mon
            SET trang_thai = :trang_thai
          WHERE ma_mon = :ma_mon
            AND trang_thai IN ('CON_BAN', 'TAM_HET')`,
        { trang_thai: tamHet ? "TAM_HET" : "CON_BAN", ma_mon: maMon },
      );
      if (soDong === 0) loi = "Món không tồn tại hoặc đã ngừng bán.";
    } catch (e) {
      loi = thongBaoLoi(e);
    }
  }
  revalidatePath("/");
  redirect(loi ? `${duongDan}${duongDan.includes("?") ? "&" : "?"}loi=${encodeURIComponent(loi)}` : duongDan);
}
