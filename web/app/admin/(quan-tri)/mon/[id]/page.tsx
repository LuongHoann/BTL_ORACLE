import Link from "next/link";
import { notFound } from "next/navigation";
import NutXacNhan from "@/components/NutXacNhan";
import ThongBao, { motGiaTri } from "@/components/ThongBao";
import { luuCongThuc, luuMon, luuSize, xoaCongThuc, xoaSize } from "@/app/admin/actions";
import { truyVan } from "@/lib/db";
import { TEN_SIZE, TEN_TRANG_THAI_MON, THU_TU_SIZE, tien } from "@/lib/format";

// Form thông tin món dùng chung cho thêm mới (/admin/mon/moi) và sửa (/admin/mon/<mã>).
// Giá theo kích cỡ và công thức chỉ nhập được sau khi món đã được tạo.
export default async function TrangChiTietMon({ params, searchParams }: PageProps<"/admin/mon/[id]">) {
  const { id } = await params;
  const laThemMoi = id === "moi";
  const maMon = laThemMoi ? 0 : Number(id);
  if (!laThemMoi && !/^\d+$/.test(id)) notFound();
  const sp = await searchParams;

  const [[monDaCo], loai, sizes, congThuc, nguyenLieu] = await Promise.all([
    truyVan<{ ma_mon: number; ten_mon: string; don_vi_tinh: string; trang_thai: string; ma_loai: number }>(
      `SELECT ma_mon, ten_mon, don_vi_tinh, trang_thai, ma_loai FROM mon WHERE ma_mon = :ma`,
      { ma: maMon },
    ),
    truyVan<{ ma_loai: number; ten_loai: string }>(`SELECT ma_loai, ten_loai FROM loai_mon ORDER BY ma_loai`),
    truyVan<{ kich_co: string; don_gia: number }>(
      `SELECT kich_co, don_gia FROM mon_size WHERE ma_mon = :ma`,
      { ma: maMon },
    ),
    truyVan<{
      kich_co: string;
      ma_nl: number;
      ten_nl: string;
      don_vi_tinh: string;
      dinh_luong: number;
      gia_von: number;
    }>(
      `SELECT c.kich_co, c.ma_nl, nl.ten_nl, nl.don_vi_tinh, c.dinh_luong,
              c.dinh_luong * nl.don_gia_nhap AS gia_von
         FROM cong_thuc c
         JOIN nguyen_lieu nl ON nl.ma_nl = c.ma_nl
        WHERE c.ma_mon = :ma
        ORDER BY nl.ten_nl`,
      { ma: maMon },
    ),
    truyVan<{ ma_nl: number; ten_nl: string; don_vi_tinh: string }>(
      `SELECT ma_nl, ten_nl, don_vi_tinh FROM nguyen_lieu ORDER BY ten_nl`,
    ),
  ]);
  if (!laThemMoi && !monDaCo) notFound();
  const mon = monDaCo ?? { ma_mon: 0, ten_mon: "", don_vi_tinh: "Ly", trang_thai: "CON_BAN", ma_loai: 0 };

  const formThongTin = (
    <form action={luuMon} className="the mb-4">
      <h2 className="mb-3 font-semibold">Thông tin món</h2>
      {!laThemMoi && <input type="hidden" name="ma_mon" value={mon.ma_mon} />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="nhan" htmlFor="ten_mon">Tên món</label>
          <input className="o-nhap" id="ten_mon" name="ten_mon" defaultValue={mon.ten_mon} required />
        </div>
        <div>
          <label className="nhan" htmlFor="ma_loai">Nhóm món</label>
          <select className="o-nhap" id="ma_loai" name="ma_loai" defaultValue={mon.ma_loai || ""} required>
            {laThemMoi && <option value="">— Chọn —</option>}
            {loai.map((l) => (
              <option key={l.ma_loai} value={l.ma_loai}>{l.ten_loai}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="nhan" htmlFor="don_vi_tinh">Đơn vị tính</label>
          <input className="o-nhap" id="don_vi_tinh" name="don_vi_tinh" defaultValue={mon.don_vi_tinh} />
        </div>
        <div>
          <label className="nhan" htmlFor="trang_thai">Trạng thái</label>
          <select className="o-nhap" id="trang_thai" name="trang_thai" defaultValue={mon.trang_thai}>
            {Object.entries(TEN_TRANG_THAI_MON).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button className="nut nut-chinh">{laThemMoi ? "Thêm món" : "Lưu thông tin"}</button>
        {laThemMoi && <Link className="nut" href="/admin/mon">Huỷ bỏ</Link>}
      </div>
    </form>
  );

  if (laThemMoi) {
    return (
      <div className="max-w-4xl">
        <Link href="/admin/mon" className="text-sm text-amber-800 hover:underline">← Danh sách món</Link>
        <h1 className="tieu-de mt-1">Thêm món</h1>
        <ThongBao loi={motGiaTri(sp.loi)} />
        {formThongTin}
        <p className="text-sm text-stone-600">
          Sau khi thêm, bạn sẽ được chuyển sang trang của món để nhập giá theo kích cỡ và công thức nguyên liệu.
          Món chỉ xuất hiện trên trang đặt món khi đã có ít nhất một kích cỡ kèm giá.
        </p>
      </div>
    );
  }

  sizes.sort((a, b) => THU_TU_SIZE.indexOf(a.kich_co) - THU_TU_SIZE.indexOf(b.kich_co));
  const sizeChuaCo = THU_TU_SIZE.filter((k) => !sizes.some((s) => s.kich_co === k));

  return (
    <>
      <Link href="/admin/mon" className="text-sm text-amber-800 hover:underline">← Danh sách món</Link>
      <h1 className="tieu-de mt-1">{mon.ten_mon}</h1>
      <ThongBao loi={motGiaTri(sp.loi)} ok={motGiaTri(sp.ok)} />

      {formThongTin}

      <div className="the mb-4">
        <h2 className="mb-1 font-semibold">Kích cỡ và giá bán</h2>
        <p className="mb-3 text-xs text-stone-500">
          Món không chia kích cỡ thì chỉ dùng một dòng &quot;Một cỡ&quot;. Không xoá được kích cỡ đã từng bán.
        </p>
        <div className="flex flex-col gap-2">
          {sizes.map((s) => (
            <div key={s.kich_co} className="flex flex-wrap items-center gap-2">
              <span className="w-24 text-sm font-medium">{TEN_SIZE[s.kich_co]}</span>
              <form action={luuSize} className="flex items-center gap-2">
                <input type="hidden" name="ma_mon" value={mon.ma_mon} />
                <input type="hidden" name="kich_co" value={s.kich_co} />
                <input className="o-nhap w-32 text-right" name="don_gia" type="number" min={1} step={500} defaultValue={s.don_gia} required />
                <span className="text-sm text-stone-500">đ</span>
                <button className="nut">Lưu giá</button>
              </form>
              <form action={xoaSize}>
                <input type="hidden" name="ma_mon" value={mon.ma_mon} />
                <input type="hidden" name="kich_co" value={s.kich_co} />
                <NutXacNhan cauHoi={`Xoá kích cỡ ${TEN_SIZE[s.kich_co]} cùng công thức của nó?`}>Xoá</NutXacNhan>
              </form>
            </div>
          ))}
          {sizes.length === 0 && <p className="text-sm text-red-700">Món chưa có kích cỡ nào nên chưa bán được.</p>}
        </div>

        {sizeChuaCo.length > 0 && (
          <form action={luuSize} className="mt-3 flex flex-wrap items-end gap-2 border-t border-stone-100 pt-3">
            <input type="hidden" name="ma_mon" value={mon.ma_mon} />
            <div>
              <label className="nhan" htmlFor="kich_co_moi">Thêm kích cỡ</label>
              <select className="o-nhap" id="kich_co_moi" name="kich_co">
                {sizeChuaCo.map((k) => (
                  <option key={k} value={k}>{TEN_SIZE[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="nhan" htmlFor="don_gia_moi">Giá bán (đ)</label>
              <input className="o-nhap w-32" id="don_gia_moi" name="don_gia" type="number" min={1} step={500} required />
            </div>
            <button className="nut nut-chinh">Thêm</button>
          </form>
        )}
      </div>

      <h2 className="mb-2 font-semibold">Công thức nguyên liệu theo kích cỡ</h2>
      <div className="grid gap-4 xl:grid-cols-2">
        {sizes.map((s) => {
          const dong = congThuc.filter((c) => c.kich_co === s.kich_co);
          const giaVon = dong.reduce((t, c) => t + c.gia_von, 0);
          const nlChuaCo = nguyenLieu.filter((n) => !dong.some((c) => c.ma_nl === n.ma_nl));
          return (
            <div key={s.kich_co} className="the">
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="font-semibold">{TEN_SIZE[s.kich_co]}</h3>
                <span className="text-xs text-stone-600">
                  Giá bán {tien(s.don_gia)} · giá vốn {tien(giaVon)} · lãi {tien(s.don_gia - giaVon)}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {dong.map((c) => (
                  <div key={c.ma_nl} className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm">{c.ten_nl}</span>
                    <form action={luuCongThuc} className="flex items-center gap-2">
                      <input type="hidden" name="ma_mon" value={mon.ma_mon} />
                      <input type="hidden" name="kich_co" value={s.kich_co} />
                      <input type="hidden" name="ma_nl" value={c.ma_nl} />
                      <input className="o-nhap w-24 text-right" name="dinh_luong" type="number" min={0.01} step={0.01} defaultValue={c.dinh_luong} required />
                      <span className="w-10 text-xs text-stone-500">{c.don_vi_tinh}</span>
                      <span className="w-20 text-right text-xs text-stone-500 tabular-nums">{tien(c.gia_von)}</span>
                      <button className="nut">Lưu</button>
                    </form>
                    <form action={xoaCongThuc}>
                      <input type="hidden" name="ma_mon" value={mon.ma_mon} />
                      <input type="hidden" name="kich_co" value={s.kich_co} />
                      <input type="hidden" name="ma_nl" value={c.ma_nl} />
                      <NutXacNhan cauHoi={`Bỏ "${c.ten_nl}" khỏi công thức?`}>Xoá</NutXacNhan>
                    </form>
                  </div>
                ))}
                {dong.length === 0 && (
                  <p className="text-sm text-stone-500">
                    Chưa có nguyên liệu. Món không có công thức sẽ không trừ kho và không tính được giá vốn.
                  </p>
                )}
              </div>

              {nlChuaCo.length > 0 && (
                <form action={luuCongThuc} className="mt-3 flex flex-wrap items-end gap-2 border-t border-stone-100 pt-3">
                  <input type="hidden" name="ma_mon" value={mon.ma_mon} />
                  <input type="hidden" name="kich_co" value={s.kich_co} />
                  <div className="min-w-40 flex-1">
                    <label className="nhan">Thêm nguyên liệu</label>
                    <select className="o-nhap" name="ma_nl" required defaultValue="">
                      <option value="">— Chọn —</option>
                      {nlChuaCo.map((n) => (
                        <option key={n.ma_nl} value={n.ma_nl}>{n.ten_nl} ({n.don_vi_tinh})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="nhan">Định lượng</label>
                    <input className="o-nhap w-24" name="dinh_luong" type="number" min={0.01} step={0.01} required />
                  </div>
                  <button className="nut nut-chinh">Thêm</button>
                </form>
              )}
            </div>
          );
        })}
      </div>
      {sizes.length === 0 && <p className="text-sm text-stone-500">Thêm kích cỡ trước, sau đó nhập công thức cho từng kích cỡ.</p>}
    </>
  );
}
