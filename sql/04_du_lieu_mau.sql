-- =====================================================================
-- 04. Dữ liệu mẫu cho 13 bảng
-- Chạy bằng: QLCAFE tại PDB FREEPDB1
-- Chạy lại được nhiều lần: script xoá dữ liệu cũ trước khi nhập
-- Lưu ý: file lưu UTF-8; với SQL*Plus cần đặt NLS_LANG=AMERICAN_AMERICA.AL32UTF8
--        Cú pháp VALUES nhiều dòng cần Oracle 23ai trở lên
-- =====================================================================
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK

-- Xoá dữ liệu cũ: bảng con trước, bảng cha sau
DELETE FROM cong_thuc;
DELETE FROM ct_phieu_nhap;
DELETE FROM phieu_nhap;
DELETE FROM ct_hoa_don;
DELETE FROM hoa_don;
DELETE FROM nguyen_lieu;
DELETE FROM nha_cung_cap;
DELETE FROM tai_khoan;
DELETE FROM nhan_vien;
DELETE FROM chuc_vu;
DELETE FROM mon_size;
DELETE FROM mon;
DELETE FROM loai_mon;

-- ---------------------------------------------------------------------
-- Thực đơn
-- ---------------------------------------------------------------------
INSERT INTO loai_mon (ma_loai, ten_loai, mo_ta) VALUES
    (1, 'Cà phê',    'Các món pha từ cà phê rang xay'),
    (2, 'Trà',       'Trà trái cây và trà sữa'),
    (3, 'Sinh tố',   'Sinh tố trái cây tươi xay'),
    (4, 'Nước ép',   'Nước ép trái cây nguyên chất'),
    (5, 'Bánh ngọt', 'Bánh nhập sẵn, dùng kèm đồ uống');

INSERT INTO mon (ma_mon, ten_mon, don_vi_tinh, trang_thai, ma_loai) VALUES
    (1,  'Cà phê đen',        'Ly',  'CON_BAN',   1),
    (2,  'Cà phê sữa',        'Ly',  'CON_BAN',   1),
    (3,  'Bạc xỉu',           'Ly',  'CON_BAN',   1),
    (4,  'Cappuccino',        'Ly',  'CON_BAN',   1),
    (5,  'Latte',             'Ly',  'CON_BAN',   1),
    (6,  'Trà đào cam sả',    'Ly',  'CON_BAN',   2),
    (7,  'Trà sữa trân châu', 'Ly',  'CON_BAN',   2),
    (8,  'Trà chanh',         'Ly',  'CON_BAN',   2),
    (9,  'Sinh tố bơ',        'Ly',  'CON_BAN',   3),
    (10, 'Sinh tố xoài',      'Ly',  'CON_BAN',   3),
    (11, 'Nước ép cam',       'Ly',  'CON_BAN',   4),
    (12, 'Nước ép dưa hấu',   'Ly',  'CON_BAN',   4),
    (13, 'Bánh tiramisu',     'Cái', 'CON_BAN',   5),
    (14, 'Bánh croissant',    'Cái', 'CON_BAN',   5),
    (15, 'Trà vải',           'Ly',  'NGUNG_BAN', 2);

-- Đồ uống có 3 size: giá size M cho trong danh sách, size S rẻ hơn 5.000đ, size L đắt hơn 7.000đ
INSERT INTO mon_size (ma_mon, kich_co, don_gia)
SELECT g.ma_mon, s.kich_co, g.gia_size_m + s.chenh_lech
  FROM (VALUES
        (1, 25000), (2, 29000), (3, 32000), (4, 45000), (5, 45000),
        (6, 39000), (7, 35000), (8, 25000), (9, 45000), (10, 42000),
        (11, 39000), (12, 35000), (15, 39000)
       ) g (ma_mon, gia_size_m)
 CROSS JOIN (VALUES ('S', -5000), ('M', 0), ('L', 7000)) s (kich_co, chenh_lech);

-- Bánh không chia size: một cỡ (F)
INSERT INTO mon_size (ma_mon, kich_co, don_gia) VALUES
    (13, 'F', 35000),
    (14, 'F', 28000);

-- ---------------------------------------------------------------------
-- Nhân sự và tài khoản
-- ---------------------------------------------------------------------
INSERT INTO chuc_vu (ma_cv, ten_cv, luong_co_ban) VALUES
    (1, 'Quản lý',  15000000),
    (2, 'Thu ngân',  8000000),
    (3, 'Pha chế',   9000000),
    (4, 'Phục vụ',   6500000),
    (5, 'Thủ kho',   8500000);

INSERT INTO nhan_vien (ma_nv, ho_ten, ngay_sinh, gioi_tinh, sdt, dia_chi, ngay_vao_lam, ma_cv) VALUES
    (1, 'Nguyễn Văn An',   DATE '1990-03-15', 'NAM', '0901000001', 'Cầu Giấy, Hà Nội',     DATE '2023-01-10', 1),
    (2, 'Trần Thị Bình',   DATE '1998-07-22', 'NU',  '0901000002', 'Đống Đa, Hà Nội',      DATE '2023-03-01', 2),
    (3, 'Lê Thị Cúc',      DATE '2000-11-05', 'NU',  '0901000003', 'Thanh Xuân, Hà Nội',   DATE '2024-06-15', 2),
    (4, 'Phạm Minh Dũng',  DATE '1996-02-28', 'NAM', '0901000004', 'Hà Đông, Hà Nội',      DATE '2023-02-20', 3),
    (5, 'Hoàng Văn Em',    DATE '1993-09-12', 'NAM', '0901000005', 'Long Biên, Hà Nội',    DATE '2023-05-05', 5),
    (6, 'Vũ Thị Giang',    DATE '1999-12-30', 'NU',  '0901000006', 'Hai Bà Trưng, Hà Nội', DATE '2024-09-01', 3),
    (7, 'Đỗ Quang Huy',    DATE '2003-04-18', 'NAM', '0901000007', 'Nam Từ Liêm, Hà Nội',  DATE '2025-02-10', 4),
    (8, 'Bùi Thị Lan',     DATE '2004-08-08', 'NU',  '0901000008', 'Hoàng Mai, Hà Nội',    DATE '2025-07-01', 4);

-- Mật khẩu đã băm scrypt, dạng scrypt:<salt hex>:<hash hex>
-- admin: Admin_123 ; các tài khoản còn lại: Nhanvien_123
INSERT INTO tai_khoan (ma_tk, ten_dang_nhap, mat_khau, vai_tro, trang_thai, ma_nv) VALUES
    (1, 'admin',    'scrypt:a3d5cc8e7b5db1a829cc798a53386e37:1b3a60d6fca397534df96b5a4e0f30ef75d1e96d61fdcee514049dce2cbc7116', 'ADMIN',     'HOAT_DONG', 1),
    (2, 'binhtt',   'scrypt:6a26c08eb6bb9cb9708aea16858bf4e8:ae027cf8bf5707816d05842531331d06a1111951d2a5219215e37cf3164d0291', 'NHAN_VIEN', 'HOAT_DONG', 2),
    (3, 'cuclt',    'scrypt:6a26c08eb6bb9cb9708aea16858bf4e8:ae027cf8bf5707816d05842531331d06a1111951d2a5219215e37cf3164d0291', 'NHAN_VIEN', 'HOAT_DONG', 3),
    (4, 'dungpm',   'scrypt:6a26c08eb6bb9cb9708aea16858bf4e8:ae027cf8bf5707816d05842531331d06a1111951d2a5219215e37cf3164d0291', 'NHAN_VIEN', 'KHOA',      4),
    (5, 'emhv',     'scrypt:6a26c08eb6bb9cb9708aea16858bf4e8:ae027cf8bf5707816d05842531331d06a1111951d2a5219215e37cf3164d0291', 'NHAN_VIEN', 'HOAT_DONG', 5);

-- ---------------------------------------------------------------------
-- Kho nguyên liệu
-- ---------------------------------------------------------------------
INSERT INTO nha_cung_cap (ma_ncc, ten_ncc, dia_chi, sdt, email) VALUES
    (1, 'Công ty Cà phê Trung Nguyên', 'Buôn Ma Thuột, Đắk Lắk', '02623000001', 'banhang@trungnguyen.example'),
    (2, 'Công ty Sữa Vinamilk',        'Quận 7, TP. Hồ Chí Minh', '02854000002', 'daily@vinamilk.example'),
    (3, 'Vựa trái cây Hoa Quả Sạch',   'Chợ Long Biên, Hà Nội',   '02437000003', NULL),
    (4, 'Công ty Nguyên liệu Pha chế Hà Thành', 'Hoàng Mai, Hà Nội', '02436000004', 'sales@hathanh.example'),
    (5, 'Công ty Bao bì Tân Tiến',     'Từ Sơn, Bắc Ninh',        '02223000005', 'lienhe@tantien.example');

-- don_gia_nhap lấy theo giá của lần nhập gần nhất (Syrup vải chưa nhập lần nào, dùng giá niêm yết)
INSERT INTO nguyen_lieu (ma_nl, ten_nl, don_vi_tinh, ton_toi_thieu, don_gia_nhap) VALUES
    (1,  'Cà phê hạt', 'gram', 1000,   310),
    (2,  'Sữa đặc',    'ml',   1000,    60),
    (3,  'Sữa tươi',   'ml',   2000,    36),
    (4,  'Đường',      'gram', 1000,    25),
    (5,  'Trà đen',    'gram',  300,   255),
    (6,  'Đào ngâm',   'gram',  500,   120),
    (7,  'Trân châu',  'gram',  500,    80),
    (8,  'Chanh',      'quả',    10,  2000),
    (9,  'Bơ',         'quả',    10, 16000),
    (10, 'Xoài',       'quả',    10, 12000),
    (11, 'Cam',        'quả',    20,  6500),
    (12, 'Dưa hấu',    'gram', 2000,    22),
    (13, 'Syrup vải',  'ml',    500,   150);

INSERT INTO phieu_nhap (ma_pn, ngay_nhap, ma_ncc, ma_nv) VALUES
    (1, DATE '2026-06-25', 1, 5),
    (2, DATE '2026-06-26', 2, 5),
    (3, DATE '2026-06-27', 3, 5),
    (4, DATE '2026-07-01', 4, 1),
    (5, DATE '2026-08-01', 1, 5),
    (6, DATE '2026-08-05', 2, 5),
    (7, DATE '2026-08-20', 3, 1),
    (8, DATE '2026-09-10', 4, 5);

INSERT INTO ct_phieu_nhap (ma_pn, ma_nl, so_luong, don_gia_nhap) VALUES
    (1, 1,  3000,   300),
    (2, 2,  3000,    60),
    (2, 3,  6000,    35),
    (3, 8,    10,  2000),
    (3, 9,     5, 15000),
    (3, 10,   10, 12000),
    (3, 11,   30,  6000),
    (3, 12, 5000,    20),
    (4, 4,  5000,    25),
    (4, 5,  1000,   250),
    (4, 6,  2000,   120),
    (4, 7,  2000,    80),
    (5, 1,  2000,   310),
    (6, 2,  2000,    60),
    (6, 3,  4000,    36),
    (7, 9,     5, 16000),
    (7, 10,   10, 12000),
    (7, 11,   30,  6500),
    (7, 12, 5000,    22),
    (8, 5,   500,   255),
    (8, 7,  1000,    80);

-- Công thức: định lượng size M cho trong danh sách, size S dùng 80%, size L dùng 130%
-- (bánh nhập sẵn nên không có công thức)
INSERT INTO cong_thuc (ma_mon, kich_co, ma_nl, dinh_luong)
SELECT c.ma_mon, s.kich_co, c.ma_nl, ROUND(c.dinh_luong_m * s.he_so, 2)
  FROM (VALUES
        (1, 1, 20),  (1, 4, 10),
        (2, 1, 20),  (2, 2, 30),
        (3, 1, 15),  (3, 2, 30),  (3, 3, 60),
        (4, 1, 18),  (4, 3, 150),
        (5, 1, 18),  (5, 3, 200),
        (6, 5, 5),   (6, 6, 50),  (6, 4, 20),  (6, 11, 0.5),
        (7, 5, 5),   (7, 3, 100), (7, 7, 50),  (7, 4, 20),
        (8, 5, 5),   (8, 8, 1),   (8, 4, 20),
        (9, 9, 1),   (9, 2, 30),  (9, 3, 50),
        (10, 10, 1), (10, 2, 30), (10, 3, 50),
        (11, 11, 3), (11, 4, 10),
        (12, 12, 300), (12, 4, 10),
        (15, 5, 5),  (15, 13, 30)
       ) c (ma_mon, ma_nl, dinh_luong_m)
 CROSS JOIN (VALUES ('S', 0.8), ('M', 1), ('L', 1.3)) s (kich_co, he_so);

-- ---------------------------------------------------------------------
-- Bán hàng
-- ---------------------------------------------------------------------
INSERT INTO hoa_don (ma_hd, ngay_lap, trang_thai) VALUES
    (1,  TO_DATE('2026-07-03 08:15', 'YYYY-MM-DD HH24:MI'), 'DA_TT'),
    (2,  TO_DATE('2026-07-03 09:40', 'YYYY-MM-DD HH24:MI'), 'DA_TT'),
    (3,  TO_DATE('2026-07-10 14:20', 'YYYY-MM-DD HH24:MI'), 'DA_TT'),
    (4,  TO_DATE('2026-07-15 10:05', 'YYYY-MM-DD HH24:MI'), 'DA_TT'),
    (5,  TO_DATE('2026-07-22 16:30', 'YYYY-MM-DD HH24:MI'), 'DA_TT'),
    (6,  TO_DATE('2026-07-28 19:10', 'YYYY-MM-DD HH24:MI'), 'DA_TT'),
    (7,  TO_DATE('2026-08-02 08:00', 'YYYY-MM-DD HH24:MI'), 'DA_TT'),
    (8,  TO_DATE('2026-08-05 15:45', 'YYYY-MM-DD HH24:MI'), 'DA_TT'),
    (9,  TO_DATE('2026-08-09 20:15', 'YYYY-MM-DD HH24:MI'), 'DA_TT'),
    (10, TO_DATE('2026-08-14 09:30', 'YYYY-MM-DD HH24:MI'), 'DA_TT'),
    (11, TO_DATE('2026-08-18 13:00', 'YYYY-MM-DD HH24:MI'), 'DA_TT'),
    (12, TO_DATE('2026-08-23 17:20', 'YYYY-MM-DD HH24:MI'), 'DA_TT'),
    (13, TO_DATE('2026-08-30 10:50', 'YYYY-MM-DD HH24:MI'), 'DA_TT'),
    (14, TO_DATE('2026-09-02 08:25', 'YYYY-MM-DD HH24:MI'), 'DA_TT'),
    (15, TO_DATE('2026-09-06 14:10', 'YYYY-MM-DD HH24:MI'), 'DA_TT'),
    (16, TO_DATE('2026-09-12 18:40', 'YYYY-MM-DD HH24:MI'), 'DA_TT'),
    (17, TO_DATE('2026-09-19 11:15', 'YYYY-MM-DD HH24:MI'), 'DA_TT'),
    (18, TO_DATE('2026-09-25 16:00', 'YYYY-MM-DD HH24:MI'), 'DA_TT'),
    (19, TO_DATE('2026-10-01 09:05', 'YYYY-MM-DD HH24:MI'), 'DA_TT'),
    (20, TO_DATE('2026-10-02 08:30', 'YYYY-MM-DD HH24:MI'), 'DA_TT'),
    (21, TO_DATE('2026-10-02 09:10', 'YYYY-MM-DD HH24:MI'), 'DA_TT'),
    (22, TO_DATE('2026-10-02 09:20', 'YYYY-MM-DD HH24:MI'), 'DA_HUY');

-- Đơn giá lấy theo giá hiện tại của món và kích cỡ tương ứng
INSERT INTO ct_hoa_don (ma_hd, ma_mon, kich_co, so_luong, don_gia)
SELECT v.ma_hd, v.ma_mon, v.kich_co, v.so_luong, ms.don_gia
  FROM (VALUES
        (1, 1, 'M', 2),   (1, 2, 'S', 1),
        (2, 4, 'M', 1),   (2, 13, 'F', 1),
        (3, 7, 'L', 2),   (3, 14, 'F', 2),
        (4, 3, 'M', 2),   (4, 6, 'L', 1),
        (5, 9, 'M', 1),   (5, 11, 'M', 1),
        (6, 2, 'M', 3),   (6, 8, 'S', 2),
        (7, 1, 'S', 1),   (7, 5, 'L', 2),
        (8, 10, 'M', 2),  (8, 12, 'L', 1),
        (9, 7, 'M', 3),   (9, 13, 'F', 2),  (9, 6, 'M', 1),
        (10, 2, 'L', 2),  (10, 14, 'F', 1),
        (11, 4, 'L', 2),  (11, 5, 'M', 1),
        (12, 11, 'M', 2), (12, 9, 'L', 1),  (12, 3, 'S', 1),
        (13, 6, 'M', 3),  (13, 8, 'M', 1),
        (14, 2, 'M', 4),  (14, 1, 'M', 2),
        (15, 7, 'S', 2),  (15, 12, 'M', 2),
        (16, 5, 'M', 2),  (16, 13, 'F', 1), (16, 14, 'F', 1),
        (17, 3, 'L', 3),  (17, 10, 'S', 1),
        (18, 9, 'M', 2),  (18, 6, 'S', 2),  (18, 2, 'M', 1),
        (19, 4, 'S', 1),  (19, 1, 'L', 1),
        (20, 2, 'M', 2),  (20, 2, 'L', 1),  (20, 7, 'M', 1),
        (21, 11, 'L', 1), (21, 14, 'F', 2),
        (22, 5, 'L', 3),  (22, 9, 'L', 2)
       ) v (ma_hd, ma_mon, kich_co, so_luong)
  JOIN mon_size ms ON ms.ma_mon = v.ma_mon AND ms.kich_co = v.kich_co;

-- ---------------------------------------------------------------------
-- Tính các cột tổng hợp từ dữ liệu chi tiết
-- ---------------------------------------------------------------------
UPDATE hoa_don h
   SET tong_tien = (SELECT SUM(so_luong * don_gia) FROM ct_hoa_don WHERE ma_hd = h.ma_hd);

UPDATE phieu_nhap p
   SET tong_tien = (SELECT SUM(so_luong * don_gia_nhap) FROM ct_phieu_nhap WHERE ma_pn = p.ma_pn);

COMMIT;

-- Đưa bộ đếm identity lên sau giá trị lớn nhất, để lần thêm mới không trùng mã
ALTER TABLE loai_mon     MODIFY ma_loai GENERATED BY DEFAULT ON NULL AS IDENTITY (START WITH LIMIT VALUE);
ALTER TABLE mon          MODIFY ma_mon  GENERATED BY DEFAULT ON NULL AS IDENTITY (START WITH LIMIT VALUE);
ALTER TABLE chuc_vu      MODIFY ma_cv   GENERATED BY DEFAULT ON NULL AS IDENTITY (START WITH LIMIT VALUE);
ALTER TABLE nhan_vien    MODIFY ma_nv   GENERATED BY DEFAULT ON NULL AS IDENTITY (START WITH LIMIT VALUE);
ALTER TABLE tai_khoan    MODIFY ma_tk   GENERATED BY DEFAULT ON NULL AS IDENTITY (START WITH LIMIT VALUE);
ALTER TABLE hoa_don      MODIFY ma_hd   GENERATED BY DEFAULT ON NULL AS IDENTITY (START WITH LIMIT VALUE);
ALTER TABLE nha_cung_cap MODIFY ma_ncc  GENERATED BY DEFAULT ON NULL AS IDENTITY (START WITH LIMIT VALUE);
ALTER TABLE nguyen_lieu  MODIFY ma_nl   GENERATED BY DEFAULT ON NULL AS IDENTITY (START WITH LIMIT VALUE);
ALTER TABLE phieu_nhap   MODIFY ma_pn   GENERATED BY DEFAULT ON NULL AS IDENTITY (START WITH LIMIT VALUE);
