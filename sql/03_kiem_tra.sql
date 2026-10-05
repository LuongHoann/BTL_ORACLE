-- =====================================================================
-- 03. Kiểm tra kết quả sau khi chạy 01 và 02
-- Chạy bằng: SYSTEM tại PDB FREEPDB1
-- =====================================================================
SET LINESIZE 200
SET PAGESIZE 100
COLUMN tablespace_name   FORMAT A16
COLUMN file_name         FORMAT A52
COLUMN username          FORMAT A10
COLUMN default_tablespace FORMAT A18
COLUMN table_name        FORMAT A16
COLUMN constraint_name   FORMAT A30
COLUMN loai              FORMAT A12
COLUMN bang_cha          FORMAT A16

PROMPT === Tablespace va datafile ===
SELECT tablespace_name, file_name, bytes / 1024 / 1024 AS size_mb,
       autoextensible, maxbytes / 1024 / 1024 AS max_mb
  FROM dba_data_files
 WHERE tablespace_name = 'TBS_CAFE';

PROMPT === User va tablespace mac dinh ===
SELECT username, default_tablespace, account_status
  FROM dba_users
 WHERE username = 'QLCAFE';

PROMPT === Cac bang cua QLCAFE va tablespace luu tru ===
SELECT table_name, tablespace_name
  FROM dba_tables
 WHERE owner = 'QLCAFE'
 ORDER BY table_name;

PROMPT === Rang buoc (P = khoa chinh, R = khoa ngoai, U = unique, C = check) ===
SELECT c.table_name, c.constraint_name,
       DECODE(c.constraint_type, 'P', 'PRIMARY KEY', 'R', 'FOREIGN KEY',
                                 'U', 'UNIQUE', 'C', 'CHECK') AS loai,
       r.table_name AS bang_cha
  FROM dba_constraints c
  LEFT JOIN dba_constraints r
         ON r.owner = c.r_owner AND r.constraint_name = c.r_constraint_name
 WHERE c.owner = 'QLCAFE'
   AND c.constraint_name NOT LIKE 'SYS\_%' ESCAPE '\'
 ORDER BY c.table_name, c.constraint_type, c.constraint_name;
