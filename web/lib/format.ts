export const TEN_SIZE: Record<string, string> = {
  S: "Nhỏ (S)",
  M: "Vừa (M)",
  L: "Lớn (L)",
  F: "Một cỡ",
};

export const THU_TU_SIZE = ["S", "M", "L", "F"];

export function tien(n: number | null | undefined): string {
  return `${Math.round(n ?? 0).toLocaleString("vi-VN")} đ`;
}

export function so(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}

// CON_BAN: đặt được; TAM_HET: hiện "Hết hàng", không đặt được; NGUNG_BAN: ẩn khỏi thực đơn
export const TEN_TRANG_THAI_MON: Record<string, string> = {
  CON_BAN: "Còn bán",
  TAM_HET: "Tạm hết",
  NGUNG_BAN: "Ngừng bán",
};

export const MAU_TRANG_THAI_MON: Record<string, string> = {
  CON_BAN: "bg-green-100 text-green-800",
  TAM_HET: "bg-amber-100 text-amber-800",
  NGUNG_BAN: "bg-stone-200 text-stone-600",
};

export const TEN_TRANG_THAI_HD: Record<string, string> = {
  DA_TT: "Đã thanh toán",
  DA_HUY: "Đã huỷ",
};
