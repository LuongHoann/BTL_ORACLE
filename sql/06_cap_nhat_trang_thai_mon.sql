-- =====================================================================
-- 06. Thêm trạng thái "tạm hết hàng" (TAM_HET) cho món
-- Chạy bằng: QLCAFE tại PDB FREEPDB1
-- Chỉ cần cho CSDL đã tạo trước khi có trạng thái này; không xoá dữ liệu nào.
-- CSDL dựng mới từ 02_tao_bang.sql đã có sẵn ràng buộc mới, không cần chạy script này.
--
-- Ba trạng thái của món:
--   CON_BAN   : hiện trên thực đơn, đặt được
--   TAM_HET   : hiện trên thực đơn với nhãn "Hết hàng", không đặt được
--   NGUNG_BAN : ẩn hẳn khỏi thực đơn
-- =====================================================================
ALTER TABLE mon DROP CONSTRAINT ck_mon_trang_thai;

ALTER TABLE mon ADD CONSTRAINT ck_mon_trang_thai
    CHECK (trang_thai IN ('CON_BAN', 'TAM_HET', 'NGUNG_BAN'));
