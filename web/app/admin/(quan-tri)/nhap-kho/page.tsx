import Link from "next/link";
import ThongBao, { motGiaTri } from "@/components/ThongBao";
import { truyVan } from "@/lib/db";
import { tien } from "@/lib/format";

const NGAY = /^\d{4}-\d{2}-\d{2}$/;

export default async function TrangNhapKho({ searchParams }: PageProps<"/admin/nhap-kho">) {
  const sp = await searchParams;
  const maNcc = Number(motGiaTri(sp.ma_ncc)) || 0;
  const tu = motGiaTri(sp.tu);
  const den = motGiaTri(sp.den);

  const dieuKien: string[] = [];
  const thamSo: Record<string, string | number> = {};
  if (maNcc) {
    dieuKien.push("pn.ma_ncc = :ma_ncc");
    thamSo.ma_ncc = maNcc;
  }
  if (tu && NGAY.test(tu)) {
    dieuKien.push("pn.ngay_nhap >= TO_DATE(:tu, 'YYYY-MM-DD')");
    thamSo.tu = tu;
  }
  if (den && NGAY.test(den)) {
    dieuKien.push("pn.ngay_nhap < TO_DATE(:den, 'YYYY-MM-DD') + 1");
    thamSo.den = den;
  }
  const dangLoc = dieuKien.length > 0;

  const [nhaCungCap, phieu] = await Promise.all([
    truyVan<{ ma_ncc: number; ten_ncc: string }>(`SELECT ma_ncc, ten_ncc FROM nha_cung_cap ORDER BY ten_ncc`),
    truyVan<{
      ma_pn: number;
      ngay_nhap: string;
      ten_ncc: string;
      ho_ten: string;
      so_dong: number;
      tong_tien: number;
    }>(
      `SELECT pn.ma_pn,
              TO_CHAR(pn.ngay_nhap, 'DD/MM/YYYY') AS ngay_nhap,
              ncc.ten_ncc,
              nv.ho_ten,
              (SELECT COUNT(*) FROM ct_phieu_nhap ct WHERE ct.ma_pn = pn.ma_pn) AS so_dong,
              pn.tong_tien
         FROM phieu_nhap pn
         JOIN nha_cung_cap ncc ON ncc.ma_ncc = pn.ma_ncc
         JOIN nhan_vien nv     ON nv.ma_nv = pn.ma_nv
        ${dangLoc ? "WHERE " + dieuKien.join(" AND ") : ""}
        ORDER BY pn.ngay_nhap DESC, pn.ma_pn DESC`,
      thamSo,
    ),
  ]);
  const tongTien = phieu.reduce((t, p) => t + p.tong_tien, 0);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="tieu-de mb-0">Nhập kho</h1>
        <Link className="nut nut-chinh" href="/admin/nhap-kho/moi">+ Lập phiếu nhập</Link>
      </div>
      <ThongBao loi={motGiaTri(sp.loi)} ok={motGiaTri(sp.ok)} />

      <form className="the mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label className="nhan" htmlFor="ma_ncc">Nhà cung cấp</label>
          <select className="o-nhap" id="ma_ncc" name="ma_ncc" defaultValue={maNcc || ""}>
            <option value="">Tất cả</option>
            {nhaCungCap.map((n) => (
              <option key={n.ma_ncc} value={n.ma_ncc}>{n.ten_ncc}</option>
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
        <button className="nut nut-chinh">Lọc</button>
        {dangLoc && <Link className="nut" href="/admin/nhap-kho">Bỏ lọc</Link>}
      </form>

      <div className="the overflow-x-auto p-0">
        <table className="bang">
          <thead>
            <tr>
              <th>Mã phiếu</th>
              <th>Ngày nhập</th>
              <th>Nhà cung cấp</th>
              <th>Người lập</th>
              <th className="so-phai">Số nguyên liệu</th>
              <th className="so-phai">Tổng tiền</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {phieu.map((p) => (
              <tr key={p.ma_pn}>
                <td>#{p.ma_pn}</td>
                <td>{p.ngay_nhap}</td>
                <td>{p.ten_ncc}</td>
                <td>{p.ho_ten}</td>
                <td className="so-phai">{p.so_dong}</td>
                <td className="so-phai">{tien(p.tong_tien)}</td>
                <td className="text-right">
                  <Link className="nut" href={`/admin/nhap-kho/${p.ma_pn}`}>Xem chi tiết</Link>
                </td>
              </tr>
            ))}
            {phieu.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-stone-500">
                  {dangLoc ? "Không có phiếu nhập nào khớp với bộ lọc." : "Chưa có phiếu nhập nào."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-stone-600">
        {phieu.length} phiếu nhập · tổng tiền: <strong>{tien(tongTien)}</strong>
      </p>
    </>
  );
}
