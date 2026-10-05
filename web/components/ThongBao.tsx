// Hiển thị thông báo lỗi / thành công truyền qua query string (?loi=... hoặc ?ok=...)
export default function ThongBao({ loi, ok }: { loi?: string; ok?: string }) {
  if (loi) {
    return (
      <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{loi}</div>
    );
  }
  if (ok) {
    return (
      <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
        {ok}
      </div>
    );
  }
  return null;
}

export function motGiaTri(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
