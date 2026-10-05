"use client";

import { useState, useTransition } from "react";
import { taoPhieuNhap } from "@/app/admin/actions";
import { tien } from "@/lib/format";

type NguyenLieu = { ma_nl: number; ten_nl: string; don_vi_tinh: string; don_gia_nhap: number };
type Dong = { ma_nl: string; so_luong: string; don_gia_nhap: string };

const DONG_TRONG: Dong = { ma_nl: "", so_luong: "", don_gia_nhap: "" };

export default function PhieuNhapForm({
  nhaCungCap,
  nguyenLieu,
}: {
  nhaCungCap: { ma_ncc: number; ten_ncc: string }[];
  nguyenLieu: NguyenLieu[];
}) {
  const [maNcc, setMaNcc] = useState("");
  const [dong, setDong] = useState<Dong[]>([{ ...DONG_TRONG }]);
  const [loi, setLoi] = useState("");
  const [dangGui, batDau] = useTransition();

  const sua = (i: number, thayDoi: Partial<Dong>) =>
    setDong((cu) => cu.map((d, j) => (j === i ? { ...d, ...thayDoi } : d)));

  // Khi chọn nguyên liệu, điền sẵn giá nhập gần nhất
  const chonNguyenLieu = (i: number, maNl: string) => {
    const nl = nguyenLieu.find((n) => String(n.ma_nl) === maNl);
    sua(i, { ma_nl: maNl, don_gia_nhap: nl ? String(nl.don_gia_nhap) : "" });
  };

  const tong = dong.reduce((t, d) => t + (Number(d.so_luong) || 0) * (Number(d.don_gia_nhap) || 0), 0);

  const gui = () => {
    setLoi("");
    if (!maNcc) return setLoi("Chưa chọn nhà cung cấp.");
    batDau(async () => {
      const kq = await taoPhieuNhap(
        Number(maNcc),
        dong.map((d) => ({ ma_nl: Number(d.ma_nl), so_luong: Number(d.so_luong), don_gia_nhap: Number(d.don_gia_nhap) })),
      );
      if (kq?.loi) setLoi(kq.loi);
    });
  };

  return (
    <div className="the max-w-4xl">
      <div className="mb-4 max-w-sm">
        <label className="nhan" htmlFor="ma_ncc">Nhà cung cấp</label>
        <select className="o-nhap" id="ma_ncc" value={maNcc} onChange={(e) => setMaNcc(e.target.value)}>
          <option value="">— Chọn —</option>
          {nhaCungCap.map((n) => (
            <option key={n.ma_ncc} value={n.ma_ncc}>{n.ten_ncc}</option>
          ))}
        </select>
      </div>

      <table className="bang">
        <thead>
          <tr>
            <th>Nguyên liệu</th>
            <th className="w-36">Số lượng</th>
            <th className="w-40">Giá nhập / đơn vị (đ)</th>
            <th className="so-phai w-36">Thành tiền</th>
            <th className="w-16"></th>
          </tr>
        </thead>
        <tbody>
          {dong.map((d, i) => {
            const nl = nguyenLieu.find((n) => String(n.ma_nl) === d.ma_nl);
            return (
              <tr key={i}>
                <td>
                  <select className="o-nhap" value={d.ma_nl} onChange={(e) => chonNguyenLieu(i, e.target.value)}>
                    <option value="">— Chọn —</option>
                    {nguyenLieu
                      .filter((n) => String(n.ma_nl) === d.ma_nl || !dong.some((x) => x.ma_nl === String(n.ma_nl)))
                      .map((n) => (
                        <option key={n.ma_nl} value={n.ma_nl}>{n.ten_nl} ({n.don_vi_tinh})</option>
                      ))}
                  </select>
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <input className="o-nhap text-right" type="number" min={0.01} step={0.01} value={d.so_luong} onChange={(e) => sua(i, { so_luong: e.target.value })} />
                    <span className="w-10 text-xs text-stone-500">{nl?.don_vi_tinh}</span>
                  </div>
                </td>
                <td>
                  <input className="o-nhap text-right" type="number" min={1} step={1} value={d.don_gia_nhap} onChange={(e) => sua(i, { don_gia_nhap: e.target.value })} />
                </td>
                <td className="so-phai">{tien((Number(d.so_luong) || 0) * (Number(d.don_gia_nhap) || 0))}</td>
                <td className="text-right">
                  <button type="button" className="nut nut-xoa px-2" disabled={dong.length === 1} onClick={() => setDong((cu) => cu.filter((_, j) => j !== i))}>
                    ✕
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="text-right font-semibold">Tổng cộng</td>
            <td className="so-phai text-lg font-bold text-amber-900">{tien(tong)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      {loi && <p className="mt-3 text-sm text-red-700">{loi}</p>}
      <div className="mt-4 flex gap-2">
        <button type="button" className="nut" disabled={dong.length >= nguyenLieu.length} onClick={() => setDong((cu) => [...cu, { ...DONG_TRONG }])}>
          + Thêm dòng
        </button>
        <button type="button" className="nut nut-chinh ml-auto" disabled={dangGui} onClick={gui}>
          {dangGui ? "Đang lưu…" : "Lưu phiếu nhập"}
        </button>
      </div>
      <p className="mt-3 text-xs text-stone-500">
        Khi lưu, giá nhập trên phiếu trở thành giá nhập hiện tại của nguyên liệu, dùng để tính giá vốn món.
      </p>
    </div>
  );
}
