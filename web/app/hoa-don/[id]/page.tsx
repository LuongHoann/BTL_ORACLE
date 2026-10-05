import Link from "next/link";
import { notFound } from "next/navigation";
import NutXacNhan from "@/components/NutXacNhan";
import ThongBao, { motGiaTri } from "@/components/ThongBao";
import { huyHoaDon } from "@/app/admin/actions";
import { layPhien } from "@/lib/auth";
import { truyVan } from "@/lib/db";
import { TEN_SIZE, TEN_TRANG_THAI_HD, tien } from "@/lib/format";

export default async function TrangChiTietHoaDon({ params, searchParams }: PageProps<"/hoa-don/[id]">) {
  const maHd = Number((await params).id);
  if (!Number.isInteger(maHd)) notFound();
  const sp = await searchParams;

  const [[hoaDon], chiTiet, phien] = await Promise.all([
    truyVan<{ ma_hd: number; thoi_gian: string; tong_tien: number; trang_thai: string }>(
      `SELECT ma_hd, TO_CHAR(ngay_lap, 'DD/MM/YYYY HH24:MI') AS thoi_gian, tong_tien, trang_thai
         FROM hoa_don
        WHERE ma_hd = :ma_hd`,
      { ma_hd: maHd },
    ),
    truyVan<{ ten_mon: string; kich_co: string; so_luong: number; don_gia: number; thanh_tien: number }>(
      `SELECT m.ten_mon, ct.kich_co, ct.so_luong, ct.don_gia, ct.so_luong * ct.don_gia AS thanh_tien
         FROM ct_hoa_don ct
         JOIN mon m ON m.ma_mon = ct.ma_mon
        WHERE ct.ma_hd = :ma_hd
        ORDER BY m.ten_mon, ct.kich_co`,
      { ma_hd: maHd },
    ),
    layPhien(),
  ]);
  if (!hoaDon) notFound();

  const daHuy = hoaDon.trang_thai === "DA_HUY";

  return (
    <div className="mx-auto max-w-2xl">
      <ThongBao
        loi={motGiaTri(sp.loi)}
        ok={motGiaTri(sp.moi) ? "Thanh toán thành công. Hoá đơn đã được lưu." : motGiaTri(sp.ok)}
      />

      <div className="the">
        <div className="mb-4 flex items-start justify-between border-b border-stone-200 pb-4">
          <div>
            <h1 className="text-xl font-bold text-stone-900">Hoá đơn #{hoaDon.ma_hd}</h1>
            <p className="text-sm text-stone-600">Thời gian: {hoaDon.thoi_gian}</p>
          </div>
          <span className={`huy-hieu ${daHuy ? "bg-stone-200 text-stone-600" : "bg-green-100 text-green-800"}`}>
            {TEN_TRANG_THAI_HD[hoaDon.trang_thai]}
          </span>
        </div>

        <table className="bang">
          <thead>
            <tr>
              <th>Món</th>
              <th>Kích cỡ</th>
              <th className="so-phai">SL</th>
              <th className="so-phai">Đơn giá</th>
              <th className="so-phai">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {chiTiet.map((d) => (
              <tr key={`${d.ten_mon}-${d.kich_co}`}>
                <td>{d.ten_mon}</td>
                <td>{TEN_SIZE[d.kich_co]}</td>
                <td className="so-phai">{d.so_luong}</td>
                <td className="so-phai">{tien(d.don_gia)}</td>
                <td className="so-phai">{tien(d.thanh_tien)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="text-right font-semibold">Tổng cộng</td>
              <td className={`so-phai text-lg font-bold ${daHuy ? "text-stone-400 line-through" : "text-amber-900"}`}>
                {tien(hoaDon.tong_tien)}
              </td>
            </tr>
          </tfoot>
        </table>

        {daHuy && (
          <p className="mt-3 text-sm text-stone-500">
            Hoá đơn đã huỷ: không được tính vào doanh thu và không trừ nguyên liệu trong báo cáo tồn kho.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link className="nut nut-chinh" href="/">Đặt đơn mới</Link>
        <Link className="nut" href="/hoa-don">Lịch sử hoá đơn</Link>
        {!daHuy &&
          (phien ? (
            <form action={huyHoaDon} className="ml-auto">
              <input type="hidden" name="ma_hd" value={hoaDon.ma_hd} />
              <NutXacNhan cauHoi={`Huỷ hoá đơn #${hoaDon.ma_hd}? Thao tác này không hoàn tác được.`}>
                Huỷ hoá đơn
              </NutXacNhan>
            </form>
          ) : (
            <span className="ml-auto text-xs text-stone-500">Chỉ quản trị viên đã đăng nhập mới huỷ được hoá đơn.</span>
          ))}
      </div>
    </div>
  );
}
