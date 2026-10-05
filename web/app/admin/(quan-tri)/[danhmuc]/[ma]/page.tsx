import Link from "next/link";
import { notFound } from "next/navigation";
import ThongBao, { motGiaTri } from "@/components/ThongBao";
import { luuDanhMuc } from "@/app/admin/actions";
import { DANH_MUC, type LuaChon } from "@/lib/danh-muc";
import { truyVan } from "@/lib/db";

// Form dùng chung cho thêm mới (/admin/<danh mục>/moi) và sửa (/admin/<danh mục>/<mã>)
export default async function TrangFormDanhMuc({ params, searchParams }: PageProps<"/admin/[danhmuc]/[ma]">) {
  const { danhmuc: khoa, ma } = await params;
  const dm = DANH_MUC[khoa];
  if (!dm) notFound();
  const sp = await searchParams;
  const laThemMoi = ma === "moi";
  if (!laThemMoi && !/^\d+$/.test(ma)) notFound();

  const [dong, luaChon] = await Promise.all([
    laThemMoi
      ? Promise.resolve([])
      : truyVan(`SELECT * FROM (${dm.sqlDanhSach}) WHERE ${dm.khoaChinh} = :ma`, { ma: Number(ma) }),
    Promise.all(
      dm.truong.map(async (t): Promise<LuaChon[]> =>
        t.sqlLuaChon ? truyVan<LuaChon>(t.sqlLuaChon) : (t.luaChon ?? []),
      ),
    ),
  ]);
  const dangSua = dong[0];
  if (!laThemMoi && !dangSua) notFound();

  return (
    <div className="max-w-3xl">
      <Link href={`/admin/${khoa}`} className="text-sm text-amber-800 hover:underline">← {dm.tieuDe}</Link>
      <h1 className="tieu-de mt-1">
        {laThemMoi ? `Thêm ${dm.tieuDe.toLowerCase()}` : `Sửa ${dm.tieuDe.toLowerCase()} #${ma}`}
      </h1>
      <ThongBao loi={motGiaTri(sp.loi)} />

      <form action={luuDanhMuc.bind(null, khoa)} className="the">
        {dangSua && <input type="hidden" name={dm.khoaChinh} value={String(dangSua[dm.khoaChinh])} />}
        <div className="grid gap-3 sm:grid-cols-2">
          {dm.truong.map((t, i) => {
            const giaTri = dangSua ? String(dangSua[t.ten] ?? "") : "";
            return (
              <div key={t.ten}>
                <label className="nhan" htmlFor={t.ten}>
                  {t.nhan}
                  {t.batBuoc && <span className="text-red-600"> *</span>}
                </label>
                {t.kieu === "select" ? (
                  <select className="o-nhap" id={t.ten} name={t.ten} defaultValue={giaTri} required={t.batBuoc}>
                    <option value="">— Chọn —</option>
                    {luaChon[i].map((lc) => (
                      <option key={lc.gia_tri} value={lc.gia_tri}>{lc.nhan}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="o-nhap"
                    id={t.ten}
                    name={t.ten}
                    type={t.kieu}
                    step={t.buoc}
                    min={t.kieu === "number" ? 0 : undefined}
                    defaultValue={giaTri}
                    required={t.batBuoc}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex gap-2">
          <button className="nut nut-chinh">{laThemMoi ? "Thêm" : "Lưu thay đổi"}</button>
          <Link className="nut" href={`/admin/${khoa}`}>Huỷ bỏ</Link>
        </div>
      </form>
    </div>
  );
}
