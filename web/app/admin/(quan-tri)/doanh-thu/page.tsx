import Link from "next/link";
import { motGiaTri } from "@/components/ThongBao";
import { truyVan } from "@/lib/db";
import { tien } from "@/lib/format";

// Định dạng nhóm lấy từ danh sách cố định này, không lấy trực tiếp từ tham số người dùng
const KIEU: Record<string, { nhan: string; dinhDang: string }> = {
  ngay: { nhan: "Theo ngày", dinhDang: "YYYY-MM-DD" },
  thang: { nhan: "Theo tháng", dinhDang: "YYYY-MM" },
  nam: { nhan: "Theo năm", dinhDang: "YYYY" },
};
const NGAY = /^\d{4}-\d{2}-\d{2}$/;

function tenKy(ky: string): string {
  return ky.split("-").reverse().join("/");
}

export default async function TrangDoanhThu({ searchParams }: PageProps<"/admin/doanh-thu">) {
  const sp = await searchParams;
  const kieu = KIEU[motGiaTri(sp.kieu) ?? ""] ? motGiaTri(sp.kieu)! : "thang";
  const tu = motGiaTri(sp.tu);
  const den = motGiaTri(sp.den);

  const dieuKien: string[] = [];
  const thamSo: Record<string, string> = {};
  if (tu && NGAY.test(tu)) {
    dieuKien.push("ngay_lap >= TO_DATE(:tu, 'YYYY-MM-DD')");
    thamSo.tu = tu;
  }
  if (den && NGAY.test(den)) {
    dieuKien.push("ngay_lap < TO_DATE(:den, 'YYYY-MM-DD') + 1");
    thamSo.den = den;
  }
  const loc = dieuKien.map((d) => ` AND ${d}`).join("");
  const dinhDang = KIEU[kieu].dinhDang;

  const [dong, [huy]] = await Promise.all([
    truyVan<{ ky: string; so_hoa_don: number; doanh_thu: number; trung_binh: number; lon_nhat: number }>(
      `SELECT TO_CHAR(ngay_lap, '${dinhDang}') AS ky,
              COUNT(*)                         AS so_hoa_don,
              SUM(tong_tien)                   AS doanh_thu,
              ROUND(AVG(tong_tien))            AS trung_binh,
              MAX(tong_tien)                   AS lon_nhat
         FROM hoa_don
        WHERE trang_thai = 'DA_TT'${loc}
        GROUP BY TO_CHAR(ngay_lap, '${dinhDang}')
        ORDER BY ky DESC`,
      thamSo,
    ),
    truyVan<{ so_hoa_don: number; tong_tien: number }>(
      `SELECT COUNT(*) AS so_hoa_don, NVL(SUM(tong_tien), 0) AS tong_tien
         FROM hoa_don
        WHERE trang_thai = 'DA_HUY'${loc}`,
      thamSo,
    ),
  ]);

  const tongDoanhThu = dong.reduce((t, d) => t + d.doanh_thu, 0);
  const tongHoaDon = dong.reduce((t, d) => t + d.so_hoa_don, 0);
  const lonNhat = Math.max(1, ...dong.map((d) => d.doanh_thu));

  return (
    <>
      <h1 className="tieu-de">Doanh thu bán hàng</h1>

      <form className="the mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="nhan" htmlFor="kieu">Thống kê</label>
          <select className="o-nhap" id="kieu" name="kieu" defaultValue={kieu}>
            {Object.entries(KIEU).map(([k, v]) => (
              <option key={k} value={k}>{v.nhan}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="nhan" htmlFor="tu">Từ ngày</label>
          <input className="o-nhap" type="date" id="tu" name="tu" defaultValue={tu} />
        </div>
        <div>
          <label className="nhan" htmlFor="den">Đến ngày</label>
          <input className="o-nhap" type="date" id="den" name="den" defaultValue={den} />
        </div>
        <button className="nut nut-chinh">Xem</button>
        <Link className="nut" href="/admin/doanh-thu">Bỏ lọc</Link>
      </form>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="the">
          <div className="text-xs font-medium text-stone-500">Tổng doanh thu</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{tien(tongDoanhThu)}</div>
        </div>
        <div className="the">
          <div className="text-xs font-medium text-stone-500">Số hoá đơn đã thanh toán</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{tongHoaDon}</div>
        </div>
        <div className="the">
          <div className="text-xs font-medium text-stone-500">Trung bình mỗi hoá đơn</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{tien(tongHoaDon ? tongDoanhThu / tongHoaDon : 0)}</div>
        </div>
        <div className="the">
          <div className="text-xs font-medium text-stone-500">Hoá đơn đã huỷ (không tính)</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{huy.so_hoa_don}</div>
          <div className="text-xs text-stone-500">{tien(huy.tong_tien)}</div>
        </div>
      </div>

      <div className="the overflow-x-auto p-0">
        <table className="bang">
          <thead>
            <tr>
              <th>{kieu === "ngay" ? "Ngày" : kieu === "thang" ? "Tháng" : "Năm"}</th>
              <th className="so-phai">Số hoá đơn</th>
              <th className="so-phai">Doanh thu</th>
              <th className="w-1/3"></th>
              <th className="so-phai">Trung bình / hoá đơn</th>
              <th className="so-phai">Hoá đơn lớn nhất</th>
            </tr>
          </thead>
          <tbody>
            {dong.map((d) => (
              <tr key={d.ky}>
                <td className="font-medium">{tenKy(d.ky)}</td>
                <td className="so-phai">{d.so_hoa_don}</td>
                <td className="so-phai font-medium">{tien(d.doanh_thu)}</td>
                <td>
                  <div className="h-3 rounded bg-amber-700" style={{ width: `${Math.max(2, (100 * d.doanh_thu) / lonNhat)}%` }} />
                </td>
                <td className="so-phai">{tien(d.trung_binh)}</td>
                <td className="so-phai">{tien(d.lon_nhat)}</td>
              </tr>
            ))}
            {dong.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-stone-500">Không có hoá đơn nào trong khoảng thời gian này.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
