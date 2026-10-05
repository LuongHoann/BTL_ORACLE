import Link from "next/link";
import PhieuNhapForm from "@/components/PhieuNhapForm";
import { truyVan } from "@/lib/db";

export default async function TrangLapPhieuNhap() {
  const [nhaCungCap, nguyenLieu] = await Promise.all([
    truyVan<{ ma_ncc: number; ten_ncc: string }>(`SELECT ma_ncc, ten_ncc FROM nha_cung_cap ORDER BY ten_ncc`),
    truyVan<{ ma_nl: number; ten_nl: string; don_vi_tinh: string; don_gia_nhap: number }>(
      `SELECT ma_nl, ten_nl, don_vi_tinh, don_gia_nhap FROM nguyen_lieu ORDER BY ten_nl`,
    ),
  ]);

  return (
    <>
      <Link href="/admin/nhap-kho" className="text-sm text-amber-800 hover:underline">← Danh sách phiếu nhập</Link>
      <h1 className="tieu-de mt-1">Lập phiếu nhập</h1>
      <PhieuNhapForm nhaCungCap={nhaCungCap} nguyenLieu={nguyenLieu} />
    </>
  );
}
