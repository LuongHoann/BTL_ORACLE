import Link from "next/link";
import ThongBao, { motGiaTri } from "@/components/ThongBao";
import { batTatMon } from "@/app/actions";
import { truyVan } from "@/lib/db";
import { THU_TU_SIZE, tien } from "@/lib/format";

type Mon = {
  ma_mon: number;
  ten_mon: string;
  ten_loai: string;
  het_hang: boolean;
  sizes: { kich_co: string; don_gia: number }[];
};

// Trang bật/tắt nhanh món: báo một món tạm hết hàng hoặc mở bán lại.
// Trạng thái nằm ở món, nên tắt một món là tắt mọi kích cỡ của món đó.
export default async function TrangBatTatMon({ searchParams }: PageProps<"/bat-tat-mon">) {
  const sp = await searchParams;
  const maLoai = Number(motGiaTri(sp.ma_loai)) || 0;
  const chiHetHang = motGiaTri(sp.trang_thai) === "TAM_HET";
  const tuKhoa = (motGiaTri(sp.q) ?? "").trim();

  const dieuKien = ["m.trang_thai IN ('CON_BAN', 'TAM_HET')"];
  const thamSo: Record<string, string | number> = {};
  if (maLoai) {
    dieuKien.push("m.ma_loai = :ma_loai");
    thamSo.ma_loai = maLoai;
  }
  if (chiHetHang) dieuKien.push("m.trang_thai = 'TAM_HET'");
  if (tuKhoa) {
    dieuKien.push("UPPER(m.ten_mon) LIKE '%' || UPPER(:q) || '%'");
    thamSo.q = tuKhoa;
  }

  const [loai, dong, [tong]] = await Promise.all([
    truyVan<{ ma_loai: number; ten_loai: string }>(`SELECT ma_loai, ten_loai FROM loai_mon ORDER BY ma_loai`),
    truyVan<{
      ma_mon: number;
      ten_mon: string;
      ten_loai: string;
      trang_thai: string;
      kich_co: string | null;
      don_gia: number | null;
    }>(
      // LEFT JOIN để món chưa có kích cỡ vẫn hiện và vẫn bật/tắt được
      `SELECT m.ma_mon, m.ten_mon, l.ten_loai, m.trang_thai, ms.kich_co, ms.don_gia
         FROM mon m
         JOIN loai_mon l ON l.ma_loai = m.ma_loai
         LEFT JOIN mon_size ms ON ms.ma_mon = m.ma_mon
        WHERE ${dieuKien.join(" AND ")}
        ORDER BY l.ma_loai, m.ten_mon`,
      thamSo,
    ),
    truyVan<{ dang_ban: number; het_hang: number }>(
      `SELECT COUNT(CASE WHEN trang_thai = 'CON_BAN' THEN 1 END) AS dang_ban,
              COUNT(CASE WHEN trang_thai = 'TAM_HET' THEN 1 END) AS het_hang
         FROM mon`,
    ),
  ]);

  const theoMa = new Map<number, Mon>();
  for (const d of dong) {
    if (!theoMa.has(d.ma_mon)) {
      theoMa.set(d.ma_mon, {
        ma_mon: d.ma_mon,
        ten_mon: d.ten_mon,
        ten_loai: d.ten_loai,
        het_hang: d.trang_thai === "TAM_HET",
        sizes: [],
      });
    }
    if (d.kich_co && d.don_gia !== null) theoMa.get(d.ma_mon)!.sizes.push({ kich_co: d.kich_co, don_gia: d.don_gia });
  }
  const mon = [...theoMa.values()];
  for (const m of mon) m.sizes.sort((a, b) => THU_TU_SIZE.indexOf(a.kich_co) - THU_TU_SIZE.indexOf(b.kich_co));

  // Đường dẫn hiện tại (kèm bộ lọc) để sau khi bật/tắt quay lại đúng chỗ đang xem
  const boLoc = new URLSearchParams();
  if (maLoai) boLoc.set("ma_loai", String(maLoai));
  if (chiHetHang) boLoc.set("trang_thai", "TAM_HET");
  if (tuKhoa) boLoc.set("q", tuKhoa);
  const veTrang = boLoc.size ? `/bat-tat-mon?${boLoc}` : "/bat-tat-mon";
  const dangLoc = boLoc.size > 0;

  return (
    <>
      <h1 className="tieu-de">Bật/tắt món</h1>
      <ThongBao loi={motGiaTri(sp.loi)} />
      <p className="mb-4 text-sm text-stone-600">
        Báo hết hàng để tạm dừng bán một món: món vẫn hiện trên trang đặt món với nhãn &quot;Hết hàng&quot; nhưng không đặt
        được. Tắt một món là tắt <strong>toàn bộ kích cỡ</strong> của món đó. Hiện có{" "}
        <strong>{tong.dang_ban}</strong> món đang bán và <strong>{tong.het_hang}</strong> món hết hàng.
      </p>

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
          <select className="o-nhap" id="trang_thai" name="trang_thai" defaultValue={chiHetHang ? "TAM_HET" : ""}>
            <option value="">Tất cả</option>
            <option value="TAM_HET">Chỉ món hết hàng</option>
          </select>
        </div>
        <button className="nut nut-chinh">Lọc</button>
        {dangLoc && <Link className="nut" href="/bat-tat-mon">Bỏ lọc</Link>}
      </form>

      <div className="the overflow-x-auto p-0">
        <table className="bang">
          <thead>
            <tr>
              <th>Nhóm</th>
              <th>Món</th>
              <th>Kích cỡ bị ảnh hưởng</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {mon.map((m) => (
              <tr key={m.ma_mon} className={m.het_hang ? "bg-stone-50" : ""}>
                <td>{m.ten_loai}</td>
                <td className="font-medium">{m.ten_mon}</td>
                <td className={m.het_hang ? "text-stone-400 line-through" : ""}>
                  {m.sizes.length === 0
                    ? "Chưa có kích cỡ"
                    : m.sizes.map((s) => `${s.kich_co === "F" ? "Một cỡ" : s.kich_co} ${tien(s.don_gia)}`).join("  ·  ")}
                </td>
                <td>
                  <span className={`huy-hieu ${m.het_hang ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                    {m.het_hang ? "Hết hàng" : "Đang bán"}
                  </span>
                </td>
                <td className="text-right">
                  <form action={batTatMon}>
                    <input type="hidden" name="ma_mon" value={m.ma_mon} />
                    <input type="hidden" name="tam_het" value={m.het_hang ? "0" : "1"} />
                    <input type="hidden" name="ve_trang" value={veTrang} />
                    <button className={`nut w-32 ${m.het_hang ? "nut-chinh" : "nut-xoa"}`}>
                      {m.het_hang ? "Mở bán lại" : "Báo hết hàng"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {mon.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-stone-500">
                  {dangLoc ? "Không có món nào khớp với bộ lọc." : "Chưa có món nào."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-stone-500">
        Món đã ngừng bán hẳn không nằm trong danh sách này; chỉ quản trị viên mở lại được trong khu quản trị.
      </p>
    </>
  );
}
