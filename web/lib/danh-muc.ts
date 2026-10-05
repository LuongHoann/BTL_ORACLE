import type { Dong } from "./db";

// Cấu hình các danh mục đơn giản (một bảng, thêm / sửa / xoá) của khu vực quản trị.
// Tên bảng, tên cột và điều kiện lọc chỉ lấy từ cấu hình này, không bao giờ lấy từ dữ liệu người dùng gửi lên.

export type LuaChon = { gia_tri: string; nhan: string };

export type Truong = {
  ten: string;
  nhan: string;
  kieu: "text" | "number" | "date" | "select" | "email";
  batBuoc?: boolean;
  luaChon?: LuaChon[];
  // Câu truy vấn trả về hai cột gia_tri, nhan
  sqlLuaChon?: string;
  buoc?: string;
};

export type Cot = { ten: string; nhan: string; kieu?: "tien" | "so" | "ngay" };

// Bộ lọc dạng danh sách chọn trên trang danh sách.
// Mặc định so sánh cột `ten` với giá trị được chọn; `dieuKien` cho phép gán điều kiện riêng cho từng giá trị.
export type BoLoc = {
  ten: string;
  nhan: string;
  luaChon?: LuaChon[];
  sqlLuaChon?: string;
  dieuKien?: Record<string, string>;
};

export type DanhMuc = {
  tieuDe: string;
  bang: string;
  khoaChinh: string;
  // Không kèm ORDER BY: trang danh sách bọc câu này lại để lọc rồi sắp theo `sapXep`
  sqlDanhSach: string;
  sapXep: string;
  cot: Cot[];
  truong: Truong[];
  // Các cột được tìm theo từ khoá
  timKiem: string[];
  loc?: BoLoc[];
  ghiChu?: string;
  canhBao?: (dong: Dong) => boolean;
};

export const DANH_MUC: Record<string, DanhMuc> = {
  "loai-mon": {
    tieuDe: "Nhóm món",
    bang: "loai_mon",
    khoaChinh: "ma_loai",
    sqlDanhSach: `SELECT l.ma_loai, l.ten_loai, l.mo_ta,
                         (SELECT COUNT(*) FROM mon m WHERE m.ma_loai = l.ma_loai) AS so_mon
                    FROM loai_mon l`,
    sapXep: "ma_loai",
    cot: [
      { ten: "ten_loai", nhan: "Tên nhóm" },
      { ten: "mo_ta", nhan: "Mô tả" },
      { ten: "so_mon", nhan: "Số món", kieu: "so" },
    ],
    truong: [
      { ten: "ten_loai", nhan: "Tên nhóm", kieu: "text", batBuoc: true },
      { ten: "mo_ta", nhan: "Mô tả", kieu: "text" },
    ],
    timKiem: ["ten_loai", "mo_ta"],
  },

  "chuc-vu": {
    tieuDe: "Chức vụ",
    bang: "chuc_vu",
    khoaChinh: "ma_cv",
    sqlDanhSach: `SELECT cv.ma_cv, cv.ten_cv, cv.luong_co_ban,
                         (SELECT COUNT(*) FROM nhan_vien nv WHERE nv.ma_cv = cv.ma_cv) AS so_nhan_vien
                    FROM chuc_vu cv`,
    sapXep: "ma_cv",
    cot: [
      { ten: "ten_cv", nhan: "Tên chức vụ" },
      { ten: "luong_co_ban", nhan: "Lương cơ bản", kieu: "tien" },
      { ten: "so_nhan_vien", nhan: "Số nhân viên", kieu: "so" },
    ],
    truong: [
      { ten: "ten_cv", nhan: "Tên chức vụ", kieu: "text", batBuoc: true },
      { ten: "luong_co_ban", nhan: "Lương cơ bản (đ)", kieu: "number", batBuoc: true, buoc: "1000" },
    ],
    timKiem: ["ten_cv"],
  },

  "nhan-vien": {
    tieuDe: "Nhân viên",
    bang: "nhan_vien",
    khoaChinh: "ma_nv",
    sqlDanhSach: `SELECT nv.ma_nv, nv.ho_ten,
                         TO_CHAR(nv.ngay_sinh, 'YYYY-MM-DD')    AS ngay_sinh,
                         nv.gioi_tinh,
                         DECODE(nv.gioi_tinh, 'NAM', 'Nam', 'Nữ') AS ten_gioi_tinh,
                         nv.sdt, nv.dia_chi,
                         TO_CHAR(nv.ngay_vao_lam, 'YYYY-MM-DD') AS ngay_vao_lam,
                         nv.ma_cv, cv.ten_cv, cv.luong_co_ban
                    FROM nhan_vien nv
                    JOIN chuc_vu cv ON cv.ma_cv = nv.ma_cv`,
    sapXep: "ma_nv",
    cot: [
      { ten: "ho_ten", nhan: "Họ tên" },
      { ten: "ten_cv", nhan: "Chức vụ" },
      { ten: "luong_co_ban", nhan: "Lương cơ bản", kieu: "tien" },
      { ten: "ten_gioi_tinh", nhan: "Giới tính" },
      { ten: "ngay_sinh", nhan: "Ngày sinh", kieu: "ngay" },
      { ten: "sdt", nhan: "Số điện thoại" },
      { ten: "ngay_vao_lam", nhan: "Ngày vào làm", kieu: "ngay" },
    ],
    truong: [
      { ten: "ho_ten", nhan: "Họ tên", kieu: "text", batBuoc: true },
      {
        ten: "ma_cv",
        nhan: "Chức vụ",
        kieu: "select",
        batBuoc: true,
        sqlLuaChon: `SELECT TO_CHAR(ma_cv) AS gia_tri, ten_cv AS nhan FROM chuc_vu ORDER BY ma_cv`,
      },
      {
        ten: "gioi_tinh",
        nhan: "Giới tính",
        kieu: "select",
        batBuoc: true,
        luaChon: [
          { gia_tri: "NAM", nhan: "Nam" },
          { gia_tri: "NU", nhan: "Nữ" },
        ],
      },
      { ten: "ngay_sinh", nhan: "Ngày sinh", kieu: "date" },
      { ten: "sdt", nhan: "Số điện thoại", kieu: "text", batBuoc: true },
      { ten: "dia_chi", nhan: "Địa chỉ", kieu: "text" },
      { ten: "ngay_vao_lam", nhan: "Ngày vào làm", kieu: "date", batBuoc: true },
    ],
    timKiem: ["ho_ten", "sdt", "dia_chi"],
    loc: [
      {
        ten: "ma_cv",
        nhan: "Chức vụ",
        sqlLuaChon: `SELECT TO_CHAR(ma_cv) AS gia_tri, ten_cv AS nhan FROM chuc_vu ORDER BY ma_cv`,
      },
      {
        ten: "gioi_tinh",
        nhan: "Giới tính",
        luaChon: [
          { gia_tri: "NAM", nhan: "Nam" },
          { gia_tri: "NU", nhan: "Nữ" },
        ],
      },
    ],
  },

  "nha-cung-cap": {
    tieuDe: "Nhà cung cấp",
    bang: "nha_cung_cap",
    khoaChinh: "ma_ncc",
    sqlDanhSach: `SELECT ncc.ma_ncc, ncc.ten_ncc, ncc.dia_chi, ncc.sdt, ncc.email,
                         (SELECT COUNT(*) FROM phieu_nhap pn WHERE pn.ma_ncc = ncc.ma_ncc) AS so_phieu_nhap
                    FROM nha_cung_cap ncc`,
    sapXep: "ma_ncc",
    cot: [
      { ten: "ten_ncc", nhan: "Tên nhà cung cấp" },
      { ten: "dia_chi", nhan: "Địa chỉ" },
      { ten: "sdt", nhan: "Số điện thoại" },
      { ten: "email", nhan: "Email" },
      { ten: "so_phieu_nhap", nhan: "Số phiếu nhập", kieu: "so" },
    ],
    truong: [
      { ten: "ten_ncc", nhan: "Tên nhà cung cấp", kieu: "text", batBuoc: true },
      { ten: "dia_chi", nhan: "Địa chỉ", kieu: "text" },
      { ten: "sdt", nhan: "Số điện thoại", kieu: "text", batBuoc: true },
      { ten: "email", nhan: "Email", kieu: "email" },
    ],
    timKiem: ["ten_ncc", "dia_chi", "sdt", "email"],
  },

  "nguyen-lieu": {
    tieuDe: "Nguyên liệu",
    bang: "nguyen_lieu",
    khoaChinh: "ma_nl",
    sqlDanhSach: `SELECT ma_nl, ten_nl, don_vi_tinh, ton_toi_thieu, don_gia_nhap,
                         tong_nhap, tong_tieu_hao, so_luong_ton
                    FROM v_ton_kho`,
    sapXep: "ten_nl",
    cot: [
      { ten: "ten_nl", nhan: "Tên nguyên liệu" },
      { ten: "don_vi_tinh", nhan: "Đơn vị" },
      { ten: "don_gia_nhap", nhan: "Giá nhập / đơn vị", kieu: "tien" },
      { ten: "tong_nhap", nhan: "Tổng nhập", kieu: "so" },
      { ten: "tong_tieu_hao", nhan: "Đã tiêu hao", kieu: "so" },
      { ten: "so_luong_ton", nhan: "Tồn kho", kieu: "so" },
      { ten: "ton_toi_thieu", nhan: "Tồn tối thiểu", kieu: "so" },
    ],
    truong: [
      { ten: "ten_nl", nhan: "Tên nguyên liệu", kieu: "text", batBuoc: true },
      { ten: "don_vi_tinh", nhan: "Đơn vị tính", kieu: "text", batBuoc: true },
      { ten: "don_gia_nhap", nhan: "Giá nhập / đơn vị (đ)", kieu: "number", batBuoc: true, buoc: "1" },
      { ten: "ton_toi_thieu", nhan: "Tồn tối thiểu", kieu: "number", batBuoc: true, buoc: "0.01" },
    ],
    timKiem: ["ten_nl", "don_vi_tinh"],
    loc: [
      {
        ten: "muc_ton",
        nhan: "Mức tồn",
        luaChon: [
          { gia_tri: "thieu", nhan: "Dưới mức tối thiểu" },
          { gia_tri: "du", nhan: "Đủ mức tồn" },
        ],
        dieuKien: {
          thieu: "so_luong_ton < ton_toi_thieu",
          du: "so_luong_ton >= ton_toi_thieu",
        },
      },
    ],
    ghiChu:
      "Tồn kho không nhập tay: bằng tổng nhập (từ phiếu nhập) trừ lượng tiêu hao tính theo công thức của các hoá đơn đã thanh toán. Hoá đơn đã huỷ không được tính. Dòng tô đỏ là nguyên liệu dưới mức tồn tối thiểu.",
    canhBao: (d) => Number(d.so_luong_ton) < Number(d.ton_toi_thieu),
  },
};
