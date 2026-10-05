import Link from "next/link";
import NutXacNhan from "@/components/NutXacNhan";
import ThongBao, { motGiaTri } from "@/components/ThongBao";
import { xoaMon } from "@/app/admin/actions";
import { truyVan } from "@/lib/db";
import { MAU_TRANG_THAI_MON, TEN_TRANG_THAI_MON } from "@/lib/format";

export default async function TrangMon({ searchParams }: PageProps<"/admin/mon">) {
  const sp = await searchParams;
  const tuKhoa = (motGiaTri(sp.q) ?? "").trim();
  const maLoai = Number(motGiaTri(sp.ma_loai)) || 0;
  const trangThai = motGiaTri(sp.trang_thai);

  const dieuKien: string[] = [];
  const thamSo: Record<string, string | number> = {};
  if (tuKhoa) {
    dieuKien.push("UPPER(m.ten_mon) LIKE '%' || UPPER(:q) || '%'");
    thamSo.q = tuKhoa;
  }
  if (maLoai) {
    dieuKien.push("m.ma_loai = :ma_loai");
    thamSo.ma_loai = maLoai;
  }
  if (trangThai && TEN_TRANG_THAI_MON[trangThai]) {
    dieuKien.push("m.trang_thai = :trang_thai");
    thamSo.trang_thai = trangThai;
  }
  const dangLoc = dieuKien.length > 0;

  const [loai, mon] = await Promise.all([
    truyVan<{ ma_loai: number; ten_loai: string }>(`SELECT ma_loai, ten_loai FROM loai_mon ORDER BY ma_loai`),
    truyVan<{
      ma_mon: number;
      ten_mon: string;
      ten_loai: string;
      don_vi_tinh: string;
      trang_thai: string;
      bang_gia: string | null;
      so_nguyen_lieu: number;
    }>(
      `SELECT m.ma_mon, m.ten_mon, l.ten_loai, m.don_vi_tinh, m.trang_thai,
              (SELECT LISTAGG(ms.kich_co || ' ' || REPLACE(TRIM(TO_CHAR(ms.don_gia, '999,999,999')), ',', '.'), '  ·  ')
                      WITHIN GROUP (ORDER BY ms.don_gia)
                 FROM mon_size ms
                WHERE ms.ma_mon = m.ma_mon) AS bang_gia,
              (SELECT COUNT(DISTINCT c.ma_nl) FROM cong_thuc c WHERE c.ma_mon = m.ma_mon) AS so_nguyen_lieu
         FROM mon m
         JOIN loai_mon l ON l.ma_loai = m.ma_loai
        ${dangLoc ? "WHERE " + dieuKien.join(" AND ") : ""}
        ORDER BY l.ma_loai, m.ten_mon`,
      thamSo,
    ),
  ]);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="tieu-de mb-0">Món, giá và công thức</h1>
        <Link className="nut nut-chinh" href="/admin/mon/moi">+ Thêm món</Link>
      </div>
      <ThongBao loi={motGiaTri(sp.loi)} ok={motGiaTri(sp.ok)} />

      <form className="the mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label className="nhan" htmlFor="q">Tìm kiếm</label>
          <input className="o-nhap" id="q" name="q" defaultValue={tuKhoa} placeholder="tên món" />
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
        <div>
          <label className="nhan" htmlFor="trang_thai">Trạng thái</label>
          <select className="o-nhap" id="trang_thai" name="trang_thai" defaultValue={trangThai ?? ""}>
            <option value="">Tất cả</option>
            {Object.entries(TEN_TRANG_THAI_MON).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <button className="nut nut-chinh">Lọc</button>
        {dangLoc && <Link className="nut" href="/admin/mon">Bỏ lọc</Link>}
      </form>

      <div className="the overflow-x-auto p-0">
        <table className="bang">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tên món</th>
              <th>Nhóm</th>
              <th>Giá theo kích cỡ</th>
              <th className="so-phai">Số nguyên liệu</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {mon.map((m) => (
              <tr key={m.ma_mon}>
                <td>{m.ma_mon}</td>
                <td className="font-medium">{m.ten_mon}</td>
                <td>{m.ten_loai}</td>
                <td>{m.bang_gia ?? <span className="text-red-700">Chưa có giá</span>}</td>
                <td className="so-phai">{m.so_nguyen_lieu || "—"}</td>
                <td>
                  <span className={`huy-hieu ${MAU_TRANG_THAI_MON[m.trang_thai]}`}>{TEN_TRANG_THAI_MON[m.trang_thai]}</span>
                </td>
                <td>
                  <div className="flex justify-end gap-2">
                    <Link className="nut" href={`/admin/mon/${m.ma_mon}`}>Sửa</Link>
                    <form action={xoaMon}>
                      <input type="hidden" name="ma_mon" value={m.ma_mon} />
                      <NutXacNhan cauHoi={`Xoá món "${m.ten_mon}" cùng giá và công thức của nó?`}>Xoá</NutXacNhan>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {mon.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-stone-500">
                  {dangLoc ? "Không có món nào khớp với bộ lọc." : "Chưa có món nào."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-stone-600">{mon.length} món</p>
    </>
  );
}
