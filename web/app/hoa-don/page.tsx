import Link from "next/link";
import { motGiaTri } from "@/components/ThongBao";
import { truyVan } from "@/lib/db";
import { TEN_TRANG_THAI_HD, tien } from "@/lib/format";

const NGAY = /^\d{4}-\d{2}-\d{2}$/;

export default async function TrangLichSuHoaDon({ searchParams }: PageProps<"/hoa-don">) {
  const sp = await searchParams;
  const tu = motGiaTri(sp.tu);
  const den = motGiaTri(sp.den);
  const trangThai = motGiaTri(sp.trang_thai);

  const dieuKien: string[] = [];
  const thamSo: Record<string, string> = {};
  if (tu && NGAY.test(tu)) {
    dieuKien.push("h.ngay_lap >= TO_DATE(:tu, 'YYYY-MM-DD')");
    thamSo.tu = tu;
  }
  if (den && NGAY.test(den)) {
    dieuKien.push("h.ngay_lap < TO_DATE(:den, 'YYYY-MM-DD') + 1");
    thamSo.den = den;
  }
  if (trangThai === "DA_TT" || trangThai === "DA_HUY") {
    dieuKien.push("h.trang_thai = :trang_thai");
    thamSo.trang_thai = trangThai;
  }

  const hoaDon = await truyVan<{
    ma_hd: number;
    thoi_gian: string;
    so_mon: number;
    tong_tien: number;
    trang_thai: string;
  }>(
    `SELECT h.ma_hd,
            TO_CHAR(h.ngay_lap, 'DD/MM/YYYY HH24:MI') AS thoi_gian,
            (SELECT NVL(SUM(ct.so_luong), 0) FROM ct_hoa_don ct WHERE ct.ma_hd = h.ma_hd) AS so_mon,
            h.tong_tien,
            h.trang_thai
       FROM hoa_don h
      ${dieuKien.length ? "WHERE " + dieuKien.join(" AND ") : ""}
      ORDER BY h.ngay_lap DESC, h.ma_hd DESC
      FETCH FIRST 200 ROWS ONLY`,
    thamSo,
  );

  const tongHopLe = hoaDon.filter((h) => h.trang_thai === "DA_TT").reduce((t, h) => t + h.tong_tien, 0);

  return (
    <>
      <h1 className="tieu-de">Lịch sử hoá đơn</h1>

      <form className="the mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="nhan" htmlFor="tu">Từ ngày</label>
          <input className="o-nhap" type="date" id="tu" name="tu" defaultValue={tu} />
        </div>
        <div>
          <label className="nhan" htmlFor="den">Đến ngày</label>
          <input className="o-nhap" type="date" id="den" name="den" defaultValue={den} />
        </div>
        <div>
          <label className="nhan" htmlFor="trang_thai">Trạng thái</label>
          <select className="o-nhap" id="trang_thai" name="trang_thai" defaultValue={trangThai ?? ""}>
            <option value="">Tất cả</option>
            <option value="DA_TT">Đã thanh toán</option>
            <option value="DA_HUY">Đã huỷ</option>
          </select>
        </div>
        <button className="nut nut-chinh">Lọc</button>
        <Link className="nut" href="/hoa-don">Bỏ lọc</Link>
      </form>

      <div className="the overflow-x-auto p-0">
        <table className="bang">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Thời gian</th>
              <th className="so-phai">Số món</th>
              <th className="so-phai">Tổng tiền</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {hoaDon.map((h) => (
              <tr key={h.ma_hd} className={h.trang_thai === "DA_HUY" ? "text-stone-400" : ""}>
                <td>#{h.ma_hd}</td>
                <td>{h.thoi_gian}</td>
                <td className="so-phai">{h.so_mon}</td>
                <td className="so-phai">{tien(h.tong_tien)}</td>
                <td>
                  <span
                    className={`huy-hieu ${h.trang_thai === "DA_TT" ? "bg-green-100 text-green-800" : "bg-stone-200 text-stone-600"}`}
                  >
                    {TEN_TRANG_THAI_HD[h.trang_thai]}
                  </span>
                </td>
                <td className="text-right">
                  <Link className="nut" href={`/hoa-don/${h.ma_hd}`}>Xem chi tiết</Link>
                </td>
              </tr>
            ))}
            {hoaDon.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-stone-500">Không có hoá đơn nào.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-stone-600">
        {hoaDon.length} hoá đơn · tổng tiền các hoá đơn đã thanh toán: <strong>{tien(tongHopLe)}</strong>
      </p>
    </>
  );
}
