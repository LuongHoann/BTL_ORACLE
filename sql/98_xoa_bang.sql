-- =====================================================================
-- 98. Xoá toàn bộ bảng và view của đề tài, giữ nguyên user và tablespace
-- Chạy bằng: QLCAFE tại PDB FREEPDB1
-- Dùng khi cần tạo lại cấu trúc bảng mà không phải xoá user
-- (script 99 không chạy được nếu còn phiên QLCAFE đang kết nối)
-- CẢNH BÁO: xoá hết dữ liệu, không khôi phục được
-- =====================================================================
BEGIN
    FOR v IN (SELECT view_name FROM user_views) LOOP
        EXECUTE IMMEDIATE 'DROP VIEW ' || v.view_name;
    END LOOP;
    FOR t IN (SELECT table_name FROM user_tables) LOOP
        EXECUTE IMMEDIATE 'DROP TABLE ' || t.table_name || ' CASCADE CONSTRAINTS PURGE';
    END LOOP;
END;
/
