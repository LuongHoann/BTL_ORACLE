-- =====================================================================
-- 99. Xoá toàn bộ user và tablespace của đề tài để làm lại từ đầu
-- Chạy bằng: SYSTEM tại PDB FREEPDB1
-- CẢNH BÁO: xoá hết bảng và dữ liệu của QLCAFE, không khôi phục được
-- =====================================================================
DROP USER qlcafe CASCADE;
DROP TABLESPACE tbs_cafe INCLUDING CONTENTS AND DATAFILES;
