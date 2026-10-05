import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const TEN_COOKIE = "phien_admin";
const THOI_HAN_GIAY = 8 * 60 * 60;

export type Phien = {
  ma_tk: number;
  ten_dang_nhap: string;
  ma_nv: number;
  ho_ten: string;
  het_han: number;
};

// Mật khẩu lưu dạng scrypt:<salt hex>:<hash hex>
export function bamMatKhau(matKhau: string): string {
  const salt = randomBytes(16);
  return `scrypt:${salt.toString("hex")}:${scryptSync(matKhau, salt, 32).toString("hex")}`;
}

export function kiemTraMatKhau(matKhau: string, daBam: string): boolean {
  const [kieu, saltHex, hashHex] = daBam.split(":");
  if (kieu !== "scrypt" || !saltHex || !hashHex) return false;
  const mong = Buffer.from(hashHex, "hex");
  const thuc = scryptSync(matKhau, Buffer.from(saltHex, "hex"), mong.length);
  return timingSafeEqual(mong, thuc);
}

function ky(noiDung: string): string {
  const khoa = process.env.SESSION_SECRET;
  if (!khoa) throw new Error("Thiếu SESSION_SECRET trong .env.local");
  return createHmac("sha256", khoa).update(noiDung).digest("base64url");
}

export async function taoPhien(p: Omit<Phien, "het_han">): Promise<void> {
  const phien: Phien = { ...p, het_han: Date.now() + THOI_HAN_GIAY * 1000 };
  const noiDung = Buffer.from(JSON.stringify(phien)).toString("base64url");
  (await cookies()).set(TEN_COOKIE, `${noiDung}.${ky(noiDung)}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: THOI_HAN_GIAY,
  });
}

export async function xoaPhien(): Promise<void> {
  (await cookies()).delete(TEN_COOKIE);
}

export async function layPhien(): Promise<Phien | null> {
  const giaTri = (await cookies()).get(TEN_COOKIE)?.value;
  if (!giaTri) return null;
  const [noiDung, chuKy] = giaTri.split(".");
  if (!noiDung || !chuKy) return null;
  const mong = Buffer.from(ky(noiDung));
  const thuc = Buffer.from(chuKy);
  if (mong.length !== thuc.length || !timingSafeEqual(mong, thuc)) return null;
  try {
    const phien = JSON.parse(Buffer.from(noiDung, "base64url").toString()) as Phien;
    return phien.het_han > Date.now() ? phien : null;
  } catch {
    return null;
  }
}

// Dùng ở mọi trang và mọi Server Action của khu vực quản trị
export async function yeuCauAdmin(): Promise<Phien> {
  const phien = await layPhien();
  if (!phien) redirect("/admin/dang-nhap");
  return phien;
}
