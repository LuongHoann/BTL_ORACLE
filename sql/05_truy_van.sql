-- =====================================================================
-- 05. 15 truy vấn SQL cho hệ thống quản lý quán café
-- Chạy bằng: QLCAFE tại PDB FREEPDB1
-- Chỉ dùng SQL thuần, mỗi câu độc lập, có thể chép riêng từng câu để dùng
-- Giá trị có chú thích "tham số" là chỗ đổi thành biến khi đưa vào ứng dụng
-- Các thống kê bán hàng chỉ tính hoá đơn hợp lệ (DA_TT), bỏ qua hoá đơn đã huỷ
-- Lưu ý: không đặt chú thích sau dấu ; trên cùng dòng (SQL*Plus sẽ bỏ qua câu lệnh)
-- =====================================================================

-- =====================================================================
-- NHÓM A – TRUY VẤN CƠ BẢN
-- =====================================================================

-- ---------------------------------------------------------------------
-- Câu 1. Thực đơn đang bán, kèm tên loại, kích cỡ và giá
-- Kỹ thuật: JOIN 3 bảng, WHERE, ORDER BY
-- ---------------------------------------------------------------------
SELECT l.ten_loai,
       m.ten_mon,
       ms.kich_co,
       ms.don_gia
  FROM mon m
  JOIN loai_mon l  ON l.ma_loai = m.ma_loai
  JOIN mon_size ms ON ms.ma_mon = m.ma_mon
 WHERE m.trang_thai = 'CON_BAN'
 ORDER BY l.ten_loai, m.ten_mon, ms.don_gia;

-- ---------------------------------------------------------------------
-- Câu 2. Danh sách nhân viên kèm chức vụ, lương, tuổi và số năm làm việc
-- Kỹ thuật: JOIN, hàm ngày (MONTHS_BETWEEN, TRUNC)
-- ---------------------------------------------------------------------
SELECT nv.ma_nv,
       nv.ho_ten,
       cv.ten_cv,
       cv.luong_co_ban,
       TRUNC(MONTHS_BETWEEN(SYSDATE, nv.ngay_sinh) / 12)    AS tuoi,
       TRUNC(MONTHS_BETWEEN(SYSDATE, nv.ngay_vao_lam) / 12) AS so_nam_lam_viec
  FROM nhan_vien nv
  JOIN chuc_vu cv ON cv.ma_cv = nv.ma_cv
 ORDER BY cv.luong_co_ban DESC, nv.ho_ten;

-- ---------------------------------------------------------------------
-- Câu 3. Các hoá đơn lập trong tháng 8/2026
-- Kỹ thuật: lọc theo khoảng ngày, định dạng ngày bằng TO_CHAR
-- Tham số: ngày bắt đầu và ngày kết thúc
-- ---------------------------------------------------------------------
SELECT ma_hd,
       TO_CHAR(ngay_lap, 'DD/MM/YYYY HH24:MI') AS thoi_gian_lap,
       tong_tien,
       trang_thai
  FROM hoa_don
 WHERE ngay_lap >= DATE '2026-08-01'
   AND ngay_lap <  DATE '2026-09-01'
 ORDER BY ngay_lap;

-- ---------------------------------------------------------------------
-- Câu 4. Chi tiết một hoá đơn: món, kích cỡ, số lượng, đơn giá, thành tiền
-- Kỹ thuật: JOIN 3 bảng, cột tính toán
-- Tham số: mã hoá đơn
-- ---------------------------------------------------------------------
SELECT h.ma_hd,
       m.ten_mon,
       ct.kich_co,
       ct.so_luong,
       ct.don_gia,
       ct.so_luong * ct.don_gia AS thanh_tien
  FROM hoa_don h
  JOIN ct_hoa_don ct ON ct.ma_hd = h.ma_hd
  JOIN mon m         ON m.ma_mon = ct.ma_mon
 WHERE h.ma_hd = 9
 ORDER BY m.ten_mon, ct.kich_co;

-- ---------------------------------------------------------------------
-- Câu 5. Tồn kho và giá trị tồn của từng nguyên liệu
-- Kỹ thuật: truy vấn trên view v_ton_kho, cột tính toán, ORDER BY giảm dần
-- ---------------------------------------------------------------------
SELECT ten_nl,
       don_vi_tinh,
       tong_nhap,
       tong_tieu_hao,
       so_luong_ton,
       don_gia_nhap,
       so_luong_ton * don_gia_nhap AS gia_tri_ton
  FROM v_ton_kho
 ORDER BY gia_tri_ton DESC;

-- =====================================================================
-- NHÓM B – TRUY VẤN NHÓM VÀ HÀM THỐNG KÊ
-- =====================================================================

-- ---------------------------------------------------------------------
-- Câu 6. Doanh thu theo tháng: số hoá đơn, tổng, trung bình, lớn nhất, nhỏ nhất
-- Kỹ thuật: GROUP BY, COUNT / SUM / AVG / MAX / MIN
-- ---------------------------------------------------------------------
SELECT TO_CHAR(ngay_lap, 'YYYY-MM') AS thang,
       COUNT(*)                     AS so_hoa_don,
       SUM(tong_tien)               AS doanh_thu,
       ROUND(AVG(tong_tien))        AS trung_binh_hoa_don,
       MAX(tong_tien)               AS hoa_don_lon_nhat,
       MIN(tong_tien)               AS hoa_don_nho_nhat
  FROM hoa_don
 WHERE trang_thai = 'DA_TT'
 GROUP BY TO_CHAR(ngay_lap, 'YYYY-MM')
 ORDER BY thang;

-- ---------------------------------------------------------------------
-- Câu 7. Top 5 món bán chạy nhất theo số lượng
-- Kỹ thuật: JOIN, GROUP BY, ORDER BY, FETCH FIRST
-- Tham số: số 5 trong FETCH FIRST là số món muốn lấy
-- ---------------------------------------------------------------------
SELECT m.ten_mon,
       SUM(ct.so_luong)              AS so_luong_ban,
       SUM(ct.so_luong * ct.don_gia) AS doanh_thu
  FROM ct_hoa_don ct
  JOIN hoa_don h ON h.ma_hd = ct.ma_hd
  JOIN mon m     ON m.ma_mon = ct.ma_mon
 WHERE h.trang_thai = 'DA_TT'
 GROUP BY m.ten_mon
 ORDER BY so_luong_ban DESC, m.ten_mon
 FETCH FIRST 5 ROWS ONLY;

-- ---------------------------------------------------------------------
-- Câu 8. Top 5 món ít được bán nhất, tính cả món chưa bán lần nào
-- Kỹ thuật: LEFT JOIN với bảng tổng hợp số lượng bán, NVL, FETCH FIRST
-- Tham số: số 5 trong FETCH FIRST là số món muốn lấy
-- ---------------------------------------------------------------------
SELECT m.ten_mon,
       m.trang_thai,
       NVL(ban.so_luong_ban, 0) AS so_luong_ban
  FROM mon m
  LEFT JOIN (SELECT ct.ma_mon,
                    SUM(ct.so_luong) AS so_luong_ban
               FROM ct_hoa_don ct
               JOIN hoa_don h ON h.ma_hd = ct.ma_hd
              WHERE h.trang_thai = 'DA_TT'
              GROUP BY ct.ma_mon) ban
         ON ban.ma_mon = m.ma_mon
 ORDER BY so_luong_ban, m.ten_mon
 FETCH FIRST 5 ROWS ONLY;

-- ---------------------------------------------------------------------
-- Câu 9. Số nhân viên và tổng quỹ lương theo từng chức vụ
-- Kỹ thuật: GROUP BY, COUNT, SUM
-- ---------------------------------------------------------------------
SELECT cv.ten_cv,
       cv.luong_co_ban,
       COUNT(nv.ma_nv)      AS so_nhan_vien,
       SUM(cv.luong_co_ban) AS tong_quy_luong
  FROM chuc_vu cv
  JOIN nhan_vien nv ON nv.ma_cv = cv.ma_cv
 GROUP BY cv.ten_cv, cv.luong_co_ban
 ORDER BY tong_quy_luong DESC;

-- ---------------------------------------------------------------------
-- Câu 10. Số phiếu nhập và tổng tiền nhập theo nhà cung cấp,
--         kể cả nhà cung cấp chưa có phiếu nhập nào
-- Kỹ thuật: LEFT JOIN, NVL, GROUP BY
-- ---------------------------------------------------------------------
SELECT ncc.ten_ncc,
       COUNT(pn.ma_pn)            AS so_phieu_nhap,
       NVL(SUM(pn.tong_tien), 0)  AS tong_tien_nhap
  FROM nha_cung_cap ncc
  LEFT JOIN phieu_nhap pn ON pn.ma_ncc = ncc.ma_ncc
 GROUP BY ncc.ten_ncc
 ORDER BY tong_tien_nhap DESC;

-- ---------------------------------------------------------------------
-- Câu 11. Số hoá đơn và doanh thu theo khung giờ: sáng / chiều / tối
-- Kỹ thuật: CASE, GROUP BY
-- ---------------------------------------------------------------------
SELECT CASE
           WHEN TO_NUMBER(TO_CHAR(ngay_lap, 'HH24')) < 12 THEN 'Sáng (trước 12h)'
           WHEN TO_NUMBER(TO_CHAR(ngay_lap, 'HH24')) < 18 THEN 'Chiều (12h-18h)'
           ELSE 'Tối (sau 18h)'
       END            AS khung_gio,
       COUNT(*)       AS so_hoa_don,
       SUM(tong_tien) AS doanh_thu
  FROM hoa_don
 WHERE trang_thai = 'DA_TT'
 GROUP BY CASE
              WHEN TO_NUMBER(TO_CHAR(ngay_lap, 'HH24')) < 12 THEN 'Sáng (trước 12h)'
              WHEN TO_NUMBER(TO_CHAR(ngay_lap, 'HH24')) < 18 THEN 'Chiều (12h-18h)'
              ELSE 'Tối (sau 18h)'
          END
 ORDER BY doanh_thu DESC;

-- =====================================================================
-- NHÓM C – TRUY VẤN LỒNG NHAU
-- =====================================================================

-- ---------------------------------------------------------------------
-- Câu 12. Doanh thu theo loại món và tỷ trọng % trên tổng doanh thu
-- Kỹ thuật: truy vấn con tính tổng doanh thu, đặt trong SELECT
-- ---------------------------------------------------------------------
SELECT l.ten_loai,
       SUM(ct.so_luong * ct.don_gia) AS doanh_thu,
       ROUND(100 * SUM(ct.so_luong * ct.don_gia)
                 / (SELECT SUM(tong_tien) FROM hoa_don WHERE trang_thai = 'DA_TT'), 1) AS ty_trong_phan_tram
  FROM ct_hoa_don ct
  JOIN hoa_don h  ON h.ma_hd = ct.ma_hd
  JOIN mon m      ON m.ma_mon = ct.ma_mon
  JOIN loai_mon l ON l.ma_loai = m.ma_loai
 WHERE h.trang_thai = 'DA_TT'
 GROUP BY l.ten_loai
 ORDER BY doanh_thu DESC;

-- ---------------------------------------------------------------------
-- Câu 13. Nguyên liệu dưới mức tồn tối thiểu: số lượng thiếu,
--         số tiền cần để nhập bù và ngày nhập gần nhất
-- Kỹ thuật: truy vấn con trong FROM (ngày nhập gần nhất của từng nguyên liệu)
-- ---------------------------------------------------------------------
SELECT tk.ten_nl,
       tk.don_vi_tinh,
       tk.so_luong_ton,
       tk.ton_toi_thieu,
       tk.ton_toi_thieu - tk.so_luong_ton                     AS so_luong_thieu,
       tk.don_gia_nhap,
       (tk.ton_toi_thieu - tk.so_luong_ton) * tk.don_gia_nhap AS tien_nhap_bu,
       TO_CHAR(lan_nhap.ngay_gan_nhat, 'DD/MM/YYYY')          AS ngay_nhap_gan_nhat
  FROM v_ton_kho tk
  LEFT JOIN (SELECT ct.ma_nl,
                    MAX(pn.ngay_nhap) AS ngay_gan_nhat
               FROM ct_phieu_nhap ct
               JOIN phieu_nhap pn ON pn.ma_pn = ct.ma_pn
              GROUP BY ct.ma_nl) lan_nhap
         ON lan_nhap.ma_nl = tk.ma_nl
 WHERE tk.so_luong_ton < tk.ton_toi_thieu
 ORDER BY tien_nhap_bu DESC;

-- ---------------------------------------------------------------------
-- Câu 14. Giá bán, giá vốn và lãi trên 1 đơn vị của từng món theo kích cỡ
--         Giá vốn = tổng (định lượng x giá nhập) của các nguyên liệu trong công thức
-- Kỹ thuật: truy vấn con trong FROM
-- ---------------------------------------------------------------------
SELECT m.ten_mon,
       ms.kich_co,
       ms.don_gia                                              AS gia_ban,
       gv.gia_von,
       ms.don_gia - gv.gia_von                                 AS lai_moi_don_vi,
       ROUND(100 * (ms.don_gia - gv.gia_von) / ms.don_gia, 1)  AS ty_le_lai_phan_tram
  FROM mon m
  JOIN mon_size ms ON ms.ma_mon = m.ma_mon
  JOIN (SELECT c.ma_mon,
               c.kich_co,
               SUM(c.dinh_luong * nl.don_gia_nhap) AS gia_von
          FROM cong_thuc c
          JOIN nguyen_lieu nl ON nl.ma_nl = c.ma_nl
         GROUP BY c.ma_mon, c.kich_co) gv
    ON gv.ma_mon = ms.ma_mon AND gv.kich_co = ms.kich_co
 ORDER BY m.ten_mon, ms.don_gia;

-- ---------------------------------------------------------------------
-- Câu 15. Doanh thu, giá vốn và lợi nhuận theo từng món đã bán
--         (chỉ tính món có công thức; bánh nhập sẵn không có giá vốn nguyên liệu)
-- Kỹ thuật: truy vấn con trong FROM, JOIN, GROUP BY
-- ---------------------------------------------------------------------
SELECT m.ten_mon,
       SUM(ct.so_luong)                                           AS so_luong_ban,
       SUM(ct.so_luong * ct.don_gia)                              AS doanh_thu,
       SUM(ct.so_luong * gv.gia_von)                              AS tong_gia_von,
       SUM(ct.so_luong * ct.don_gia) - SUM(ct.so_luong * gv.gia_von) AS loi_nhuan
  FROM ct_hoa_don ct
  JOIN hoa_don h ON h.ma_hd = ct.ma_hd
  JOIN mon m     ON m.ma_mon = ct.ma_mon
  JOIN (SELECT c.ma_mon,
               c.kich_co,
               SUM(c.dinh_luong * nl.don_gia_nhap) AS gia_von
          FROM cong_thuc c
          JOIN nguyen_lieu nl ON nl.ma_nl = c.ma_nl
         GROUP BY c.ma_mon, c.kich_co) gv
    ON gv.ma_mon = ct.ma_mon AND gv.kich_co = ct.kich_co
 WHERE h.trang_thai = 'DA_TT'
 GROUP BY m.ten_mon
 ORDER BY loi_nhuan DESC;
