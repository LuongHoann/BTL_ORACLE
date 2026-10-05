import Link from "next/link";
import { notFound } from "next/navigation";
import NutXacNhan from "@/components/NutXacNhan";
import ThongBao, { motGiaTri } from "@/components/ThongBao";
import { xoaPhieuNhap } from "@/app/admin/actions";
import { truyVan } from "@/lib/db";
import { so, tien } from "@/lib/format";

export default async function TrangChiTietPhieuNhap({ params, searchParams }: PageProps<"/admin/nhap-kho/[id]">) {
  const maPn = Number((await params).id);
  if (!Number.isInteger(maPn)) notFound();
  const sp = await searchParams;

  const [[phieu], chiTiet] = await Promise.all([
    truyVan<{ ma_pn: number; ngay_nhap: string; tong_tien: number; ten_ncc: string; ho_ten: string }>(
      `SELECT pn.ma_pn, TO_CHAR(pn.ngay_nhap, 'DD/MM/YYYY') AS ngay_nhap, pn.tong_tien, ncc.ten_ncc, nv.ho_ten
         FROM phieu_nhap pn
         JOIN nha_cung_cap ncc ON ncc.ma_ncc = pn.ma_ncc
         JOIN nhan_vien nv     ON nv.ma_nv = pn.ma_nv
        WHERE pn.ma_pn = :ma`,
      { ma: maPn },
    ),
    truyVan<{ ten_nl: string; don_vi_tinh: string; so_luong: number; don_gia_nhap: number; thanh_tien: number }>(
      `SELECT nl.ten_nl, nl.don_vi_tinh, ct.so_luong, ct.don_gia_nhap, ct.so_luong * ct.don_gia_nhap AS thanh_tien
         FROM ct_phieu_nhap ct
         JOIN nguyen_lieu nl ON nl.ma_nl = ct.ma_nl
        WHERE ct.ma_pn = :ma
        ORDER BY nl.ten_nl`,
      { ma: maPn },
    ),
  ]);
  if (!phieu) notFound();

  return (
    <div className="max-w-3xl">
      <Link href="/admin/nhap-kho" className="text-sm text-amber-800 hover:underline">← Danh sách phiếu nhập</Link>
      <h1 className="tieu-de mt-1">Phiếu nhập #{phieu.ma_pn}</h1>
      <ThongBao loi={motGiaTri(sp.loi)} ok={motGiaTri(sp.ok)} />

      <div className="the">
        <dl className="mb-4 grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-stone-500">Ngày nhập</dt>
            <dd className="font-medium">{phieu.ngay_nhap}</dd>
          </div>
          <div>
            <dt className="text-xs text-stone-500">Nhà cung cấp</dt>
            <dd className="font-medium">{phieu.ten_ncc}</dd>
          </div>
          <div>
            <dt className="text-xs text-stone-500">Người lập</dt>
            <dd className="font-medium">{phieu.ho_ten}</dd>
          </div>
        </dl>

        <table className="bang">
          <thead>
            <tr>
              <th>Nguyên liệu</th>
              <th className="so-phai">Số lượng</th>
              <th className="so-phai">Giá nhập / đơn vị</th>
              <th className="so-phai">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {chiTiet.map((d) => (
              <tr key={d.ten_nl}>
                <td>{d.ten_nl}</td>
                <td className="so-phai">{so(d.so_luong)} {d.don_vi_tinh}</td>
                <td className="so-phai">{tien(d.don_gia_nhap)}</td>
                <td className="so-phai">{tien(d.thanh_tien)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="text-right font-semibold">Tổng cộng</td>
              <td className="so-phai text-lg font-bold text-amber-900">{tien(phieu.tong_tien)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <form action={xoaPhieuNhap} className="mt-4">
        <input type="hidden" name="ma_pn" value={phieu.ma_pn} />
        <NutXacNhan cauHoi={`Xoá phiếu nhập #${phieu.ma_pn}? Tồn kho sẽ giảm tương ứng.`}>Xoá phiếu nhập</NutXacNhan>
      </form>
    </div>
  );
}
