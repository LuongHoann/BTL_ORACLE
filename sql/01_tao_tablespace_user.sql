-- =====================================================================
-- 01. Tạo tablespace mới và user mới cho đề tài quản lý quán café
-- Chạy bằng: SYSTEM tại PDB FREEPDB1
-- =====================================================================

-- Tablespace riêng của đề tài
CREATE TABLESPACE tbs_cafe
    DATAFILE '/opt/oracle/oradata/FREE/FREEPDB1/tbs_cafe01.dbf'
    SIZE 100M
    AUTOEXTEND ON NEXT 10M MAXSIZE 500M;

-- User (schema) chứa toàn bộ bảng của đề tài
CREATE USER qlcafe IDENTIFIED BY "Cafe_123456"
    DEFAULT TABLESPACE tbs_cafe
    TEMPORARY TABLESPACE temp
    QUOTA UNLIMITED ON tbs_cafe;

-- Quyền tối thiểu để đăng nhập và tạo đối tượng trong schema của mình
GRANT CREATE SESSION,
      CREATE TABLE,
      CREATE VIEW,
      CREATE SEQUENCE,
      CREATE PROCEDURE,
      CREATE TRIGGER
   TO qlcafe;
