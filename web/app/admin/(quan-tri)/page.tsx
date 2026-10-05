import Link from "next/link";
import { truyVan } from "@/lib/db";
import { so, tien } from "@/lib/format";

export default async function TrangBangDieuKhien() {
  const [[tongQuan], sapHet, banChay] = await Promise.all([
    truyVan<{
      hom_nay: string;
      dt_hom_nay: number;
      hd_hom_nay: number;
      dt_thang: number;
      hd_thang: number;
      hd_huy_thang: number;
    }>(
      `SELECT TO_CHAR(CURRENT_DATE, 'DD/MM/YYYY') AS hom_nay,
              NVL(SUM(CASE WHEN trang_thai = 'DA_TT' AND ngay_lap >= TRUNC(CURRENT_DATE) THEN tong_tien END), 0) AS dt_hom_nay,
              COUNT(CASE WHEN trang_thai = 'DA_TT' AND ngay_lap >= TRUNC(CURRENT_DATE) THEN 1 END)               AS hd_hom_nay,
              NVL(SUM(CASE WHEN trang_thai = 'DA_TT' THEN tong_tien END), 0)                                     AS dt_thang,
              COUNT(CASE WHEN trang_thai = 'DA_TT' THEN 1 END)                                                   AS hd_thang,
              COUNT(CASE WHEN trang_thai = 'DA_HUY' THEN 1 END)                                                  AS hd_huy_thang
         FROM hoa_don
        WHERE ngay_lap >= TRUNC(CURRENT_DATE, 'MM')`,
    ),
    truyVan<{ ten_nl: string; don_vi_tinh: string; so_luong_ton: number; ton_toi_thieu: number }>(
      `SELECT ten_nl, don_vi_tinh, so_luong_ton, ton_toi_thieu
         FROM v_ton_kho
        WHERE so_luong_ton < ton_toi_thieu
        ORDER BY ten_nl`,
    ),
    truyVan<{ ten_mon: string; so_luong: number }>(
      `SELECT m.ten_mon, SUM(ct.so_luong) AS so_luong
         FROM ct_hoa_don ct
         JOIN hoa_don h ON h.ma_hd = ct.ma_hd
         JOIN mon m     ON m.ma_mon = ct.ma_mon
        WHERE h.trang_thai = 'DA_TT'
          AND h.ngay_lap >= TRUNC(CURRENT_DATE, 'MM')
        GROUP BY m.ten_mon
        ORDER BY so_luong DESC, m.ten_mon
        FETCH FIRST 5 ROWS ONLY`,
    ),
  ]);

  const the = [
    { nhan: "Doanh thu hôm nay", gia_tri: tien(tongQuan.dt_hom_nay), phu: `${tongQuan.hd_hom_nay} hoá đơn` },
    { nhan: "Doanh thu tháng này", gia_tri: tien(tongQuan.dt_thang), phu: `${tongQuan.hd_thang} hoá đơn` },
    { nhan: "Hoá đơn huỷ trong tháng", gia_tri: String(tongQuan.hd_huy_thang), phu: "không tính vào doanh thu" },
    { nhan: "Nguyên liệu sắp hết", gia_tri: String(sapHet.length), phu: "dưới mức tồn tối thiểu" },
  ];

  return (
    <>
      <h1 className="tieu-de">Bảng điều khiển · {tongQuan.hom_nay}</h1>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {the.map((t) => (
          <div key={t.nhan} className="the">
            <div className="text-xs font-medium text-stone-500">{t.nhan}</div>
            <div className="mt-1 text-2xl font-bold text-stone-900 tabular-nums">{t.gia_tri}</div>
            <div className="text-xs text-stone-500">{t.phu}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="the">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Nguyên liệu dưới mức tồn tối thiểu</h2>
            <Link className="text-sm text-amber-800 hover:underline" href="/admin/nhap-kho/moi">Lập phiếu nhập</Link>
          </div>
          {sapHet.length === 0 ? (
            <p className="text-sm text-stone-500">Tất cả nguyên liệu đều đủ mức tồn.</p>
          ) : (
            <table className="bang">
              <thead>
                <tr>
                  <th>Nguyên liệu</th>
                  <th className="so-phai">Tồn</th>
                  <th className="so-phai">Tối thiểu</th>
                </tr>
              </thead>
              <tbody>
                {sapHet.map((n) => (
                  <tr key={n.ten_nl}>
                    <td>{n.ten_nl}</td>
                    <td className="so-phai text-red-700">{so(n.so_luong_ton)} {n.don_vi_tinh}</td>
                    <td className="so-phai">{so(n.ton_toi_thieu)} {n.don_vi_tinh}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="the">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Món bán chạy trong tháng</h2>
            <Link className="text-sm text-amber-800 hover:underline" href="/admin/doanh-thu">Xem doanh thu</Link>
          </div>
          {banChay.length === 0 ? (
            <p className="text-sm text-stone-500">Tháng này chưa có hoá đơn nào.</p>
          ) : (
            <table className="bang">
              <thead>
                <tr>
                  <th>Món</th>
                  <th className="so-phai">Số lượng</th>
                </tr>
              </thead>
              <tbody>
                {banChay.map((m) => (
                  <tr key={m.ten_mon}>
                    <td>{m.ten_mon}</td>
                    <td className="so-phai">{m.so_luong}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
