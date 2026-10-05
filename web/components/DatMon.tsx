"use client";

import { useState, useTransition } from "react";
import { thanhToan } from "@/app/actions";
import { TEN_SIZE, tien } from "@/lib/format";

export type MonMenu = {
  ma_mon: number;
  ten_mon: string;
  ma_loai: number;
  don_vi_tinh: string;
  // Món tạm hết hàng (bật/tắt ở trang "Bật/tắt món"): vẫn hiện trên thực đơn nhưng không đặt được
  het_hang: boolean;
  sizes: { kich_co: string; don_gia: number }[];
};

type DongGio = { ma_mon: number; ten_mon: string; kich_co: string; don_gia: number; so_luong: number };

function TheMon({ mon, them }: { mon: MonMenu; them: (d: DongGio) => void }) {
  const [kichCo, setKichCo] = useState(
    (mon.sizes.find((s) => s.kich_co === "M") ?? mon.sizes[0]).kich_co,
  );
  const [soLuong, setSoLuong] = useState(1);
  const size = mon.sizes.find((s) => s.kich_co === kichCo) ?? mon.sizes[0];
  const khoa = mon.het_hang;

  return (
    <div className={`the flex flex-col gap-3 ${khoa ? "bg-stone-50" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className={khoa ? "opacity-50" : ""}>
          <div className="font-semibold text-stone-900">{mon.ten_mon}</div>
          <div className="text-sm font-semibold text-amber-800">{tien(size.don_gia)}</div>
        </div>
        {khoa && <span className="huy-hieu shrink-0 bg-red-100 text-red-800">Hết hàng</span>}
      </div>

      <div className={khoa ? "opacity-50" : ""}>
        {mon.sizes.length > 1 ? (
          <div className="flex gap-1">
            {mon.sizes.map((s) => (
              <button
                key={s.kich_co}
                type="button"
                disabled={khoa}
                onClick={() => setKichCo(s.kich_co)}
                className={`nut flex-1 px-2 py-1 ${s.kich_co === kichCo ? "nut-chinh" : ""}`}
                title={`${TEN_SIZE[s.kich_co]}: ${tien(s.don_gia)}`}
              >
                {s.kich_co}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-xs text-stone-500">Không chia kích cỡ</div>
        )}
      </div>

      <div className={`mt-auto flex items-center gap-2 ${khoa ? "opacity-50" : ""}`}>
        <div className="flex items-center">
          <button type="button" className="nut rounded-r-none px-2.5" disabled={khoa} onClick={() => setSoLuong(Math.max(1, soLuong - 1))}>
            −
          </button>
          <span className="w-9 border-y border-stone-300 bg-white py-1.5 text-center text-sm tabular-nums">
            {soLuong}
          </span>
          <button type="button" className="nut rounded-l-none px-2.5" disabled={khoa} onClick={() => setSoLuong(Math.min(99, soLuong + 1))}>
            +
          </button>
        </div>
        <button
          type="button"
          className="nut nut-chinh flex-1"
          disabled={khoa}
          onClick={() => {
            them({ ma_mon: mon.ma_mon, ten_mon: mon.ten_mon, kich_co: size.kich_co, don_gia: size.don_gia, so_luong: soLuong });
            setSoLuong(1);
          }}
        >
          {khoa ? "Hết hàng" : "Thêm vào giỏ"}
        </button>
      </div>
    </div>
  );
}

export default function DatMon({
  loai,
  mon,
}: {
  loai: { ma_loai: number; ten_loai: string }[];
  mon: MonMenu[];
}) {
  const [loaiChon, setLoaiChon] = useState(0);
  const [gio, setGio] = useState<DongGio[]>([]);
  const [loi, setLoi] = useState("");
  const [dangGui, batDau] = useTransition();

  const them = (d: DongGio) =>
    setGio((cu) => {
      const i = cu.findIndex((x) => x.ma_mon === d.ma_mon && x.kich_co === d.kich_co);
      if (i < 0) return [...cu, d];
      return cu.map((x, j) => (j === i ? { ...x, so_luong: Math.min(999, x.so_luong + d.so_luong) } : x));
    });

  const doiSoLuong = (i: number, thayDoi: number) =>
    setGio((cu) =>
      cu.map((x, j) => (j === i ? { ...x, so_luong: x.so_luong + thayDoi } : x)).filter((x) => x.so_luong > 0),
    );

  // Món có thể bị báo hết hàng từ trang "Bật/tắt món" trong lúc đang nằm trong giỏ
  const maHetHang = new Set(mon.filter((m) => m.het_hang).map((m) => m.ma_mon));
  const gioCoMonHet = gio.some((d) => maHetHang.has(d.ma_mon));
  const tong = gio.reduce((t, d) => t + d.so_luong * d.don_gia, 0);
  const hienThi = loaiChon === 0 ? mon : mon.filter((m) => m.ma_loai === loaiChon);

  const guiThanhToan = () => {
    setLoi("");
    batDau(async () => {
      const kq = await thanhToan(gio.map(({ ma_mon, kich_co, so_luong }) => ({ ma_mon, kich_co, so_luong })));
      if (kq?.loi) setLoi(kq.loi);
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button type="button" className={`nut ${loaiChon === 0 ? "nut-chinh" : ""}`} onClick={() => setLoaiChon(0)}>
            Tất cả
          </button>
          {loai.map((l) => (
            <button
              key={l.ma_loai}
              type="button"
              className={`nut ${loaiChon === l.ma_loai ? "nut-chinh" : ""}`}
              onClick={() => setLoaiChon(l.ma_loai)}
            >
              {l.ten_loai}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {hienThi.map((m) => (
            <TheMon key={m.ma_mon} mon={m} them={them} />
          ))}
        </div>
        {hienThi.length === 0 && <p className="text-sm text-stone-500">Chưa có món nào trong loại này.</p>}
      </section>

      <aside className="the h-fit lg:sticky lg:top-4">
        <h2 className="mb-3 text-lg font-semibold">Giỏ hàng</h2>
        {gio.length === 0 ? (
          <p className="text-sm text-stone-500">Chưa có món nào. Chọn món ở bên trái để thêm vào giỏ.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {gio.map((d, i) => (
              <li key={`${d.ma_mon}-${d.kich_co}`} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{d.ten_mon}</div>
                  <div className="text-xs text-stone-500">
                    {TEN_SIZE[d.kich_co]} · {tien(d.don_gia)}
                    {maHetHang.has(d.ma_mon) && <span className="ml-1 font-medium text-red-700">· đã hết hàng</span>}
                  </div>
                </div>
                <button type="button" className="nut px-2 py-0.5" onClick={() => doiSoLuong(i, -1)}>
                  −
                </button>
                <span className="w-6 text-center text-sm tabular-nums">{d.so_luong}</span>
                <button type="button" className="nut px-2 py-0.5" onClick={() => doiSoLuong(i, 1)}>
                  +
                </button>
                <span className="w-20 text-right text-sm font-medium tabular-nums">{tien(d.so_luong * d.don_gia)}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-stone-200 pt-3">
          <span className="font-medium">Tổng cộng</span>
          <span className="text-lg font-bold text-amber-900 tabular-nums">{tien(tong)}</span>
        </div>
        {gioCoMonHet && (
          <p className="mt-2 text-sm text-red-700">Giỏ có món đã hết hàng. Bỏ món đó khỏi giỏ để thanh toán.</p>
        )}
        {loi && <p className="mt-2 text-sm text-red-700">{loi}</p>}
        <div className="mt-3 flex gap-2">
          <button type="button" className="nut" disabled={gio.length === 0 || dangGui} onClick={() => setGio([])}>
            Xoá giỏ
          </button>
          <button
            type="button"
            className="nut nut-chinh flex-1"
            disabled={gio.length === 0 || dangGui || gioCoMonHet}
            onClick={guiThanhToan}
          >
            {dangGui ? "Đang xử lý…" : "Thanh toán"}
          </button>
        </div>
      </aside>
    </div>
  );
}
