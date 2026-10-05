import oracledb from "oracledb";

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

export type GiaTri = string | number | null;
export type Dong = Record<string, GiaTri>;
export type ThamSo = oracledb.BindParameters;

// Giữ pool trên globalThis để không tạo lại mỗi lần Next.js nạp lại module ở chế độ dev
const toanCuc = globalThis as unknown as { __oraclePool?: Promise<oracledb.Pool> };

function layPool(): Promise<oracledb.Pool> {
  if (!toanCuc.__oraclePool) {
    toanCuc.__oraclePool = oracledb.createPool({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECT_STRING,
      poolMin: 1,
      poolMax: 5,
      // Đặt múi giờ phiên để CURRENT_DATE trả về giờ Việt Nam (SYSDATE của container là UTC)
      sessionCallback: (conn, _tag, xong) => {
        conn
          .execute("ALTER SESSION SET TIME_ZONE = 'Asia/Ho_Chi_Minh'")
          .then(() => xong(), xong);
      },
    });
  }
  return toanCuc.__oraclePool;
}

// Oracle trả tên cột viết hoa; đổi sang chữ thường cho dễ dùng trong code
function chuThuong<T>(rows: unknown[] | undefined): T[] {
  return (rows ?? []).map(
    (r) =>
      Object.fromEntries(
        Object.entries(r as Record<string, unknown>).map(([k, v]) => [k.toLowerCase(), v]),
      ) as T,
  );
}

export async function truyVan<T = Dong>(sql: string, thamSo: ThamSo = {}): Promise<T[]> {
  const conn = await (await layPool()).getConnection();
  try {
    const kq = await conn.execute(sql, thamSo);
    return chuThuong<T>(kq.rows);
  } finally {
    await conn.close();
  }
}

export async function thucThi(sql: string, thamSo: ThamSo = {}): Promise<number> {
  const conn = await (await layPool()).getConnection();
  try {
    const kq = await conn.execute(sql, thamSo, { autoCommit: true });
    return kq.rowsAffected ?? 0;
  } finally {
    await conn.close();
  }
}

export type GiaoDich = {
  truyVan<T = Dong>(sql: string, thamSo?: ThamSo): Promise<T[]>;
  thucThi(sql: string, thamSo?: ThamSo): Promise<oracledb.Result<unknown>>;
  thucThiNhieu(sql: string, danhSach: Record<string, GiaTri>[]): Promise<void>;
};

// Chạy nhiều lệnh trong một giao dịch: thành công thì commit, lỗi thì rollback toàn bộ
export async function giaoDich<T>(viec: (gd: GiaoDich) => Promise<T>): Promise<T> {
  const conn = await (await layPool()).getConnection();
  try {
    const kq = await viec({
      truyVan: async <R = Dong>(sql: string, thamSo: ThamSo = {}) =>
        chuThuong<R>((await conn.execute(sql, thamSo)).rows),
      thucThi: (sql, thamSo = {}) => conn.execute(sql, thamSo),
      thucThiNhieu: async (sql, danhSach) => {
        if (danhSach.length > 0) await conn.executeMany(sql, danhSach);
      },
    });
    await conn.commit();
    return kq;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    await conn.close();
  }
}

export const THAM_SO_RA_SO = { dir: oracledb.BIND_OUT, type: oracledb.NUMBER };

// Đổi lỗi Oracle thành thông báo dễ hiểu cho người dùng
export function thongBaoLoi(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (m.includes("ORA-02292")) return "Không xoá được vì dữ liệu này đang được dùng ở nơi khác.";
  if (m.includes("ORA-00001")) return "Giá trị bị trùng với dữ liệu đã có.";
  if (m.includes("ORA-02290")) return "Giá trị không hợp lệ (vi phạm ràng buộc kiểm tra).";
  if (m.includes("ORA-01400") || m.includes("ORA-01407")) return "Thiếu thông tin bắt buộc.";
  if (m.includes("ORA-02291")) return "Dữ liệu tham chiếu không tồn tại.";
  if (m.includes("ORA-12899")) return "Giá trị quá dài.";
  return m;
}
