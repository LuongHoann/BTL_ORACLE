import { motGiaTri } from "@/components/ThongBao";
import { truyVan } from "@/lib/db";
import { TEN_SIZE, tien } from "@/lib/format";

const NGAY = /^\d{4}-\d{2}-\d{2}$/;

export default async function TrangMonBanTrongNgay({ searchParams }: PageProps<"/admin/mon-ban">) {
  const sp = await searchParams;
  const maLoai = Number(motGiaTri(sp.ma_loai)) || 0;

  const [loai, [homNay]] = await Promise.all([
    truyVan<{ ma_loai: number; ten_loai: string }>(`SELECT ma_loai, ten_loai FROM loai_mon ORDER BY ma_loai`),
    truyVan<{ ngay: string }>(`SELECT TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') AS ngay FROM dual`),
  ]);
  const ngayThamSo = motGiaTri(sp.ngay);
  const ngay = ngayThamSo && NGAY.test(ngayThamSo) ? ngayThamSo : homNay.ngay;

  const dong = await truyVan<{
    ten_loai: string;
    ten_mon: string;
    kich_co: string;
    so_luong: number;
    doanh_thu: number;
  }>(
    `SELECT l.ten_loai,
            m.ten_mon,
            ct.kich_co,
            SUM(ct.so_luong)              AS so_luong,
            SUM(ct.so_luong * ct.don_gia) AS doanh_thu
       FROM ct_hoa_don ct
       JOIN hoa_don h  ON h.ma_hd = ct.ma_hd
       JOIN mon m      ON m.ma_mon = ct.ma_mon
       JOIN loai_mon l ON l.ma_loai = m.ma_loai
      WHERE h.trang_thai = 'DA_TT'
        AND h.ngay_lap >= TO_DATE(:ngay, 'YYYY-MM-DD')
        AND h.ngay_lap <  TO_DATE(:ngay, 'YYYY-MM-DD') + 1
        AND (:ma_loai = 0 OR m.ma_loai = :ma_loai)
      GROUP BY l.ten_loai, m.ten_mon, ct.kich_co
      ORDER BY so_luong DESC, m.ten_mon, ct.kich_co`,
    { ngay, ma_loai: maLoai },
  );

  const tongSoLuong = dong.reduce((t, d) => t + d.so_luong, 0);
  const tongDoanhThu = dong.reduce((t, d) => t + d.doanh_thu, 0);

  return (
    <>
      <h1 className="tieu-de">Món bán trong ngày</h1>

      <form className="the mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="nhan" htmlFor="ngay">Ngày</label>
          <input className="o-nhap" type="date" id="ngay" name="ngay" defaultValue={ngay} />
        </div>
        <div>
          <label className="nhan" htmlFor="ma_loai">Nhóm món</label>
          <select className="o-nhap" id="ma_loai" name="ma_loai" defaultValue={maLoai || ""}>
            <option value="">Tất cả</option>
            {loai.map((l) => (
              <option key={l.ma_loai} value={l.ma_loai}>{l.ten_loai}</option>
            ))}
          </select>
        </div>
        <button className="nut nut-chinh">Xem</button>
      </form>

      <div className="the overflow-x-auto p-0">
        <table className="bang">
          <thead>
            <tr>
              <th>Nhóm</th>
              <th>Món</th>
              <th>Kích cỡ</th>
              <th className="so-phai">Số lượng</th>
              <th className="so-phai">Doanh thu</th>
            </tr>
          </thead>
          <tbody>
            {dong.map((d) => (
              <tr key={`${d.ten_mon}-${d.kich_co}`}>
                <td>{d.ten_loai}</td>
                <td className="font-medium">{d.ten_mon}</td>
                <td>{TEN_SIZE[d.kich_co]}</td>
                <td className="so-phai">{d.so_luong}</td>
                <td className="so-phai">{tien(d.doanh_thu)}</td>
              </tr>
            ))}
            {dong.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-stone-500">
                  Không có món nào được bán trong ngày {ngay.split("-").reverse().join("/")}.
                </td>
              </tr>
            )}
          </tbody>
          {dong.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={3} className="text-right font-semibold">Tổng cộng</td>
                <td className="so-phai font-bold">{tongSoLuong}</td>
                <td className="so-phai font-bold text-amber-900">{tien(tongDoanhThu)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className="mt-3 text-xs text-stone-500">Chỉ tính các hoá đơn đã thanh toán; hoá đơn đã huỷ không được tính.</p>
    </>
  );
}
