import Link from "next/link";
import { notFound } from "next/navigation";
import NutXacNhan from "@/components/NutXacNhan";
import ThongBao, { motGiaTri } from "@/components/ThongBao";
import { xoaDanhMuc } from "@/app/admin/actions";
import { type Cot, DANH_MUC, type LuaChon } from "@/lib/danh-muc";
import { type GiaTri, truyVan } from "@/lib/db";
import { so, tien } from "@/lib/format";

function hienThi(v: GiaTri, kieu: Cot["kieu"]): string {
  if (v === null || v === undefined || v === "") return "—";
  if (kieu === "tien") return tien(Number(v));
  if (kieu === "so") return so(Number(v));
  if (kieu === "ngay") return String(v).split("-").reverse().join("/");
  return String(v);
}

// Trang danh sách dùng chung cho các danh mục một bảng: lọc, xem, xoá.
// Thêm và sửa nằm ở trang form riêng: /admin/<danh mục>/moi và /admin/<danh mục>/<mã>
export default async function TrangDanhMuc({ params, searchParams }: PageProps<"/admin/[danhmuc]">) {
  const khoa = (await params).danhmuc;
  const dm = DANH_MUC[khoa];
  if (!dm) notFound();
  const sp = await searchParams;

  const boLoc = dm.loc ?? [];
  const tuKhoa = (motGiaTri(sp.q) ?? "").trim();
  const luaChonLoc: LuaChon[][] = await Promise.all(
    boLoc.map(async (b) => (b.sqlLuaChon ? truyVan<LuaChon>(b.sqlLuaChon) : (b.luaChon ?? []))),
  );

  const dieuKien: string[] = [];
  const thamSo: Record<string, string> = {};
  if (tuKhoa) {
    dieuKien.push(`(${dm.timKiem.map((c) => `UPPER(${c}) LIKE '%' || UPPER(:q) || '%'`).join(" OR ")})`);
    thamSo.q = tuKhoa;
  }
  const giaTriLoc = boLoc.map((b, i) => {
    const v = motGiaTri(sp[b.ten]) ?? "";
    // Chỉ nhận giá trị có trong danh sách lựa chọn của bộ lọc
    if (!v || !luaChonLoc[i].some((lc) => lc.gia_tri === v)) return "";
    if (b.dieuKien) dieuKien.push(`(${b.dieuKien[v]})`);
    else {
      dieuKien.push(`TO_CHAR(${b.ten}) = :loc_${b.ten}`);
      thamSo[`loc_${b.ten}`] = v;
    }
    return v;
  });
  const dangLoc = dieuKien.length > 0;

  const dong = await truyVan(
    `SELECT * FROM (${dm.sqlDanhSach})
      ${dangLoc ? "WHERE " + dieuKien.join(" AND ") : ""}
      ORDER BY ${dm.sapXep}`,
    thamSo,
  );

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="tieu-de mb-0">{dm.tieuDe}</h1>
        <Link className="nut nut-chinh" href={`/admin/${khoa}/moi`}>+ Thêm mới</Link>
      </div>
      <ThongBao loi={motGiaTri(sp.loi)} ok={motGiaTri(sp.ok)} />
      {dm.ghiChu && <p className="mb-4 text-sm text-stone-600">{dm.ghiChu}</p>}

      <form className="the mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label className="nhan" htmlFor="q">Tìm kiếm</label>
          <input
            className="o-nhap"
            id="q"
            name="q"
            defaultValue={tuKhoa}
            placeholder={dm.cot
              .filter((c) => dm.timKiem.includes(c.ten))
              .map((c) => c.nhan.toLowerCase())
              .join(", ")}
          />
        </div>
        {boLoc.map((b, i) => (
          <div key={b.ten}>
            <label className="nhan" htmlFor={b.ten}>{b.nhan}</label>
            <select className="o-nhap" id={b.ten} name={b.ten} defaultValue={giaTriLoc[i]}>
              <option value="">Tất cả</option>
              {luaChonLoc[i].map((lc) => (
                <option key={lc.gia_tri} value={lc.gia_tri}>{lc.nhan}</option>
              ))}
            </select>
          </div>
        ))}
        <button className="nut nut-chinh">Lọc</button>
        {dangLoc && <Link className="nut" href={`/admin/${khoa}`}>Bỏ lọc</Link>}
      </form>

      <div className="the overflow-x-auto p-0">
        <table className="bang">
          <thead>
            <tr>
              <th>Mã</th>
              {dm.cot.map((c) => (
                <th key={c.ten} className={c.kieu === "tien" || c.kieu === "so" ? "so-phai" : ""}>{c.nhan}</th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {dong.map((d) => {
              const ma = String(d[dm.khoaChinh]);
              return (
                <tr key={ma} className={dm.canhBao?.(d) ? "bg-red-50" : ""}>
                  <td>{ma}</td>
                  {dm.cot.map((c) => (
                    <td key={c.ten} className={c.kieu === "tien" || c.kieu === "so" ? "so-phai" : ""}>
                      {hienThi(d[c.ten], c.kieu)}
                    </td>
                  ))}
                  <td>
                    <div className="flex justify-end gap-2">
                      <Link className="nut" href={`/admin/${khoa}/${ma}`}>Sửa</Link>
                      <form action={xoaDanhMuc.bind(null, khoa)}>
                        <input type="hidden" name={dm.khoaChinh} value={ma} />
                        <NutXacNhan cauHoi={`Xoá mục có mã ${ma}?`}>Xoá</NutXacNhan>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {dong.length === 0 && (
              <tr>
                <td colSpan={dm.cot.length + 2} className="py-6 text-center text-stone-500">
                  {dangLoc ? "Không có mục nào khớp với bộ lọc." : "Chưa có dữ liệu."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-stone-600">{dong.length} mục</p>
    </>
  );
}
