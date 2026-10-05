import DatMon, { type MonMenu } from "@/components/DatMon";
import { truyVan } from "@/lib/db";
import { THU_TU_SIZE } from "@/lib/format";

export default async function TrangDatMon() {
  const [loai, dong] = await Promise.all([
    truyVan<{ ma_loai: number; ten_loai: string }>(
      `SELECT ma_loai, ten_loai FROM loai_mon ORDER BY ma_loai`,
    ),
    truyVan<{
      ma_mon: number;
      ten_mon: string;
      ma_loai: number;
      don_vi_tinh: string;
      trang_thai: string;
      kich_co: string;
      don_gia: number;
    }>(
      // Món tạm hết vẫn hiện trên thực đơn (kèm nhãn "Hết hàng"); món ngừng bán thì ẩn hẳn
      `SELECT m.ma_mon, m.ten_mon, m.ma_loai, m.don_vi_tinh, m.trang_thai, ms.kich_co, ms.don_gia
         FROM mon m
         JOIN mon_size ms ON ms.ma_mon = m.ma_mon
        WHERE m.trang_thai IN ('CON_BAN', 'TAM_HET')
        ORDER BY m.ma_loai, m.ten_mon`,
    ),
  ]);

  // Gom các dòng (món, kích cỡ) thành từng món kèm danh sách kích cỡ
  const theoMa = new Map<number, MonMenu>();
  for (const d of dong) {
    if (!theoMa.has(d.ma_mon)) {
      theoMa.set(d.ma_mon, { ma_mon: d.ma_mon, ten_mon: d.ten_mon, ma_loai: d.ma_loai, don_vi_tinh: d.don_vi_tinh, het_hang: d.trang_thai === "TAM_HET", sizes: [] });
    }
    theoMa.get(d.ma_mon)!.sizes.push({ kich_co: d.kich_co, don_gia: d.don_gia });
  }
  const mon = [...theoMa.values()];
  for (const m of mon) m.sizes.sort((a, b) => THU_TU_SIZE.indexOf(a.kich_co) - THU_TU_SIZE.indexOf(b.kich_co));

  return (
    <>
      <h1 className="tieu-de">Đặt món</h1>
      <DatMon loai={loai} mon={mon} />
    </>
  );
}
