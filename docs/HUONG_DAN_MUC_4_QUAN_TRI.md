# Mục 4 – Quản trị CSDL Oracle

Tài liệu này hướng dẫn từng thao tác quản trị theo đúng bốn yêu cầu của đề, kèm lệnh, kết quả và giải thích. Mọi khối "Kết quả" là kết quả chạy thật ngày 02/10/2026 trên container `oracle-btl` (Oracle AI Database 26ai Free, 23.26.3.0.0); những chỗ chưa chạy được đánh dấu rõ.

| Phần | Yêu cầu của đề |
|---|---|
| [1. Quản lý Instance](#1-quản-lý-instance) | startup, shutdown, read only, restricted session |
| [2. Tablespace và Datafile](#2-quản-lý-tablespace-và-datafile) | thêm, sửa, xoá tablespace; di chuyển datafile; autoextend; truy vấn thông tin |
| [3. Khôi phục datafile bị mất](#3-khôi-phục-datafile-bị-mất) | khôi phục datafile bị mất |
| [4. Người dùng, quyền, chức danh](#4-người-dùng-quyền-chức-danh) | user, privilege, role |
| [5. Export / Import schema](#5-export--import-một-schema) | import, export 1 schema |

## Những điều cần biết trước khi làm

**Bốn đặc điểm của môi trường này khác với giáo trình**, nên nêu trong báo cáo:

| Đặc điểm | Hệ quả |
|---|---|
| Kiến trúc multitenant: CDB `FREE` chứa PDB `FREEPDB1` | Lệnh về instance chạy ở CDB; lệnh về tablespace, user chạy ở PDB |
| Tablespace mặc định là kiểu BIGFILE | Tablespace bigfile chỉ có một datafile; muốn nhiều datafile phải tạo `SMALLFILE` |
| Bản Free không có tính năng di chuyển datafile online | `ALTER DATABASE MOVE DATAFILE` báo `ORA-00439`; phải dùng cách offline |
| Image `slim` không có chương trình RMAN | Sao lưu và khôi phục datafile làm thủ công bằng lệnh chép file và `RECOVER` |

**An toàn dữ liệu**: mọi thao tác phá huỷ trong tài liệu chỉ làm trên tablespace minh hoạ `TBS_DEMO`, không đụng tới `TBS_CAFE` (dữ liệu đề tài). Import được đưa vào schema mới `QLCAFE_BK`, không ghi đè `QLCAFE`.

**Khi đang làm phần 1 và phần 3**, DB bị tắt/mở nhiều lần: ứng dụng web và DBeaver sẽ mất kết nối. Sau khi xong, chạy lại `npm run dev` nếu web báo lỗi kết nối.

### Cách vào SQL*Plus

Mở PowerShell rồi dùng một trong ba cách đăng nhập sau, tuỳ lệnh cần chạy:

```powershell
# (a) Quyền SYSDBA, vào CDB root – dùng cho startup, shutdown, archivelog
docker exec -it oracle-btl sqlplus / as sysdba

# (b) Tài khoản quản trị SYSTEM, vào thẳng PDB – dùng cho tablespace, user, role
docker exec -it oracle-btl sqlplus system/Oracle_123456@//localhost:1521/FREEPDB1

# (c) Schema của đề tài
docker exec -it oracle-btl sqlplus qlcafe/Cafe_123456@//localhost:1521/FREEPDB1
```

Từ phiên (a), chuyển vào PDB bằng `ALTER SESSION SET CONTAINER = freepdb1;`.

Trong SQL*Plus, lệnh `HOST <lệnh>` chạy một lệnh hệ điều hành bên trong container (ví dụ `HOST ls -l ...`).

Để kết quả dễ đọc khi chụp màn hình, đặt trước:

```sql
SET LINESIZE 170
SET PAGESIZE 100
COL name FORMAT a10
COL open_mode FORMAT a12
COL file_name FORMAT a58
COL tablespace_name FORMAT a14
```

---

## 1. Quản lý Instance

Đăng nhập kiểu (a): `sqlplus / as sysdba`.

### 1.1 Xem trạng thái hiện tại

```sql
SELECT instance_name, status, database_status FROM v$instance;
SELECT name, open_mode, log_mode FROM v$database;
SELECT name, open_mode, restricted FROM v$pdbs;
```

Kết quả:

```
INSTANCE_N STATUS     DATABASE_STATUS
---------- ---------- ----------------
FREE       OPEN       ACTIVE

NAME       OPEN_MODE    LOG_MODE
---------- ------------ ------------
FREE       READ WRITE   NOARCHIVELOG

NAME       OPEN_MODE    RES
---------- ------------ ---
PDB$SEED   READ ONLY    NO
FREEPDB1   READ WRITE   NO
```

### 1.2 Ba giai đoạn khởi động

Oracle khởi động qua ba giai đoạn. Có thể dừng ở từng giai đoạn để làm việc quản trị.

| Giai đoạn | Lệnh | Oracle đã làm gì | Dùng khi |
|---|---|---|---|
| NOMOUNT | `STARTUP NOMOUNT` | Đọc file tham số, cấp phát bộ nhớ SGA, chạy các tiến trình nền | Tạo database, tạo lại control file |
| MOUNT | `ALTER DATABASE MOUNT` | Mở control file, biết vị trí datafile và redo log nhưng chưa mở chúng | Bật/tắt ARCHIVELOG, đổi tên datafile, khôi phục |
| OPEN | `ALTER DATABASE OPEN` | Mở datafile và redo log, người dùng truy cập được | Hoạt động bình thường |

```sql
SHUTDOWN IMMEDIATE
STARTUP NOMOUNT
SELECT instance_name, status FROM v$instance;
SELECT name, open_mode FROM v$database;
```

Kết quả – instance đã chạy (`STARTED`) nhưng chưa có database nào được gắn, nên hỏi `v$database` báo lỗi:

```
Database closed.
Database dismounted.
ORACLE instance shut down.
ORACLE instance started.

Total System Global Area 1603398928 bytes
Fixed Size                  5033232 bytes
Variable Size             671088640 bytes
Database Buffers          922746880 bytes
Redo Buffers                4530176 bytes

INSTANCE_N STATUS
---------- ----------
FREE       STARTED

SELECT name, open_mode FROM v$database
                            *
ERROR at line 1:
ORA-01507: database not mounted
```

```sql
ALTER DATABASE MOUNT;
SELECT instance_name, status FROM v$instance;
SELECT name, open_mode FROM v$database;
SELECT COUNT(*) FROM dba_users;
```

Kết quả – đã đọc được control file (`MOUNTED`), nhưng bảng dữ liệu thường như `dba_users` chưa truy cập được:

```
Database altered.

INSTANCE_N STATUS
---------- ----------
FREE       MOUNTED

NAME       OPEN_MODE
---------- ------------
FREE       MOUNTED

SELECT COUNT(*) FROM dba_users
                     *
ERROR at line 1:
ORA-01219: Database or pluggable database not open. Queries allowed on fixed tables or views only.
```

```sql
ALTER DATABASE OPEN;
SELECT instance_name, status FROM v$instance;
SELECT name, open_mode FROM v$database;
SELECT name, open_mode, restricted FROM v$pdbs;
SELECT COUNT(*) FROM dba_users;
```

Kết quả – database mở hoàn toàn; PDB `FREEPDB1` tự mở theo vì đã được lưu trạng thái (saved state):

```
Database altered.

INSTANCE_N STATUS
---------- ----------
FREE       OPEN

NAME       OPEN_MODE
---------- ------------
FREE       READ WRITE

NAME       OPEN_MODE    RES
---------- ------------ ---
PDB$SEED   READ ONLY    NO
FREEPDB1   READ WRITE   NO

  COUNT(*)
----------
        30
```

Lệnh `STARTUP` không kèm tham số làm cả ba giai đoạn liên tiếp.

Chụp màn hình: kết quả `v$instance` ở cả ba giai đoạn (`STARTED` → `MOUNTED` → `OPEN`) và hai lỗi `ORA-01507`, `ORA-01219`.

### 1.3 Các chế độ tắt database

| Lệnh | Phiên đang kết nối | Giao dịch đang dở | Lần khởi động sau | Đã chạy? |
|---|---|---|---|---|
| `SHUTDOWN NORMAL` | Chờ mọi người tự thoát | Chờ kết thúc | Bình thường | Không (sẽ treo nếu còn phiên kết nối) |
| `SHUTDOWN TRANSACTIONAL` | Ngắt sau khi giao dịch xong | Chờ commit hoặc rollback | Bình thường | Có |
| `SHUTDOWN IMMEDIATE` | Ngắt ngay | Tự rollback | Bình thường | Có |
| `SHUTDOWN ABORT` | Ngắt ngay | Bỏ dở, không rollback | Phải tự khôi phục instance (instance recovery) | **Không chạy** vì là thao tác tắt cưỡng bức trên DB đang có dữ liệu thật |

Kết quả của `SHUTDOWN IMMEDIATE` và `SHUTDOWN TRANSACTIONAL` giống nhau:

```
Database closed.
Database dismounted.
ORACLE instance shut down.
```

`STARTUP FORCE` tương đương `SHUTDOWN ABORT` rồi `STARTUP`; cũng **không chạy** vì cùng lý do.

### 1.4 Chế độ Read Only

Ở chế độ chỉ đọc, người dùng truy vấn được nhưng không thay đổi được dữ liệu. Dùng khi cần đóng băng dữ liệu để báo cáo hoặc bảo trì.

**Cách 1 – chỉ PDB `FREEPDB1` (nên dùng):**

```sql
ALTER PLUGGABLE DATABASE freepdb1 CLOSE IMMEDIATE;
ALTER PLUGGABLE DATABASE freepdb1 OPEN READ ONLY;
SELECT name, open_mode, restricted FROM v$pdbs WHERE name = 'FREEPDB1';
```

```
NAME       OPEN_MODE    RES
---------- ------------ ---
FREEPDB1   READ ONLY    NO
```

Thử bằng schema đề tài:

```sql
CONNECT qlcafe/Cafe_123456@//localhost:1521/FREEPDB1
SELECT COUNT(*) AS so_mon FROM mon;
INSERT INTO loai_mon (ten_loai) VALUES ('Thu read only');
UPDATE mon SET don_vi_tinh = don_vi_tinh WHERE ma_mon = 1;
```

Kết quả – đọc được, ghi bị từ chối:

```
    SO_MON
----------
        16

INSERT INTO loai_mon (ten_loai) VALUES ('Thu read only')
            *
ERROR at line 1:
ORA-16000: Attempting to modify database or pluggable database that is open for read-only access.

UPDATE mon SET don_vi_tinh = don_vi_tinh WHERE ma_mon = 1
       *
ERROR at line 1:
ORA-16000: Attempting to modify database or pluggable database that is open for read-only access.
```

Trả về đọc/ghi:

```sql
CONNECT / AS SYSDBA
ALTER PLUGGABLE DATABASE freepdb1 CLOSE IMMEDIATE;
ALTER PLUGGABLE DATABASE freepdb1 OPEN READ WRITE;
```

**Cách 2 – cả CDB:**

```sql
SHUTDOWN TRANSACTIONAL
STARTUP MOUNT
ALTER DATABASE OPEN READ ONLY;
SELECT name, open_mode FROM v$database;
SELECT name, open_mode, restricted FROM v$pdbs;
```

```
NAME       OPEN_MODE
---------- ------------
FREE       READ ONLY

NAME       OPEN_MODE    RES
---------- ------------ ---
PDB$SEED   READ ONLY    NO
FREEPDB1   MOUNTED
```

Khi CDB mở ở chế độ read only, `FREEPDB1` không tự mở (vẫn `MOUNTED`). Trả về bình thường bằng `SHUTDOWN IMMEDIATE` rồi `STARTUP`.

### 1.5 Restricted Session

Ở chế độ hạn chế, chỉ user có quyền `RESTRICTED SESSION` mới đăng nhập được. Dùng khi bảo trì mà không muốn người dùng thường vào.

**Cách 1 – bật trong PDB khi đang chạy:**

```sql
ALTER SESSION SET CONTAINER = freepdb1;
ALTER SYSTEM ENABLE RESTRICTED SESSION;
SELECT name, open_mode, restricted FROM v$pdbs;
```

```
NAME       OPEN_MODE    RES
---------- ------------ ---
FREEPDB1   READ WRITE   YES
```

User thường bị từ chối, user quản trị vẫn vào được:

```sql
CONNECT qlcafe/Cafe_123456@//localhost:1521/FREEPDB1
```

```
ERROR:
ORA-01035: Login denied. Database is in RESTRICTED mode.
```

```sql
CONNECT system/Oracle_123456@//localhost:1521/FREEPDB1
SELECT USER FROM dual;
```

```
USER
------
SYSTEM
```

Cấp quyền `RESTRICTED SESSION` thì user thường vào được:

```sql
GRANT RESTRICTED SESSION TO qlcafe;
CONNECT qlcafe/Cafe_123456@//localhost:1521/FREEPDB1
SELECT USER FROM dual;
```

```
USER
------
QLCAFE
```

Thu hồi quyền và tắt chế độ hạn chế:

```sql
CONNECT / AS SYSDBA
ALTER SESSION SET CONTAINER = freepdb1;
REVOKE RESTRICTED SESSION FROM qlcafe;
ALTER SYSTEM DISABLE RESTRICTED SESSION;
SELECT name, open_mode, restricted FROM v$pdbs;
```

```
NAME       OPEN_MODE    RES
---------- ------------ ---
FREEPDB1   READ WRITE   NO
```

**Cách 2 – khởi động cả instance ở chế độ hạn chế:**

```sql
SHUTDOWN IMMEDIATE
STARTUP RESTRICT
SELECT instance_name, status, logins FROM v$instance;
SELECT name, open_mode, restricted FROM v$pdbs;
```

```
INSTANCE_N STATUS     LOGINS
---------- ---------- ------------
FREE       OPEN       RESTRICTED

NAME       OPEN_MODE    RES
---------- ------------ ---
PDB$SEED   READ ONLY    YES
FREEPDB1   MOUNTED
```

Lúc này kết nối qua listener bị từ chối:

```
ERROR:
ORA-12526: TNS:listener: all appropriate instances are in restricted mode
```

Tắt chế độ hạn chế:

```sql
ALTER SYSTEM DISABLE RESTRICTED SESSION;
SELECT instance_name, status, logins FROM v$instance;
```

```
INSTANCE_N STATUS     LOGINS
---------- ---------- ------------
FREE       OPEN       ALLOWED
```

Sau `STARTUP RESTRICT`, `FREEPDB1` vẫn ở `MOUNTED`. Cách gọn nhất để mọi thứ về bình thường là khởi động lại:

```sql
SHUTDOWN IMMEDIATE
STARTUP
SELECT instance_name, status, logins FROM v$instance;
SELECT name, open_mode, restricted FROM v$pdbs;
```

```
INSTANCE_N STATUS     LOGINS
---------- ---------- ------------
FREE       OPEN       ALLOWED

NAME       OPEN_MODE    RES
---------- ------------ ---
PDB$SEED   READ ONLY    NO
FREEPDB1   READ WRITE   NO
```

Chụp màn hình: `ORA-16000` khi ghi ở chế độ read only; `ORA-01035` khi `qlcafe` đăng nhập ở chế độ restricted; cột `LOGINS = RESTRICTED`.

---

## 2. Quản lý Tablespace và Datafile

Đăng nhập kiểu (b): `sqlplus system/Oracle_123456@//localhost:1521/FREEPDB1`.

### 2.1 Thêm tablespace

Trước hết xem kiểu tablespace mặc định:

```sql
SELECT property_value AS kieu_mac_dinh FROM database_properties WHERE property_name = 'DEFAULT_TBS_TYPE';
```

```
KIEU_MAC_DINH
-------------
BIGFILE
```

Vì mặc định là BIGFILE (chỉ một datafile), tablespace minh hoạ được tạo với từ khoá `SMALLFILE` để thêm được datafile thứ hai ở bước sau:

```sql
CREATE SMALLFILE TABLESPACE tbs_demo
    DATAFILE '/opt/oracle/oradata/FREE/FREEPDB1/tbs_demo01.dbf' SIZE 20M
    AUTOEXTEND OFF;

SELECT tablespace_name, status, contents, bigfile FROM dba_tablespaces ORDER BY tablespace_name;
```

```
Tablespace created.

TABLESPACE_NAM STATUS     CONTENTS   BIGFILE
-------------- ---------- ---------- -------
SYSAUX         ONLINE     PERMANENT  YES
SYSTEM         ONLINE     PERMANENT  YES
TBS_CAFE       ONLINE     PERMANENT  YES
TBS_DEMO       ONLINE     PERMANENT  NO
TEMP           ONLINE     TEMPORARY  NO
UNDOTBS1       ONLINE     UNDO       YES
USERS          ONLINE     PERMANENT  NO
```

Tạo một bảng có dữ liệu trong tablespace này để các bước sau có thứ để kiểm tra:

```sql
CREATE TABLE system.demo_nhat_ky (
    ma NUMBER PRIMARY KEY,
    noi_dung VARCHAR2(100),
    thoi_gian DATE DEFAULT SYSDATE
) TABLESPACE tbs_demo;

INSERT INTO system.demo_nhat_ky (ma, noi_dung)
SELECT LEVEL, 'Dong so ' || LEVEL FROM dual CONNECT BY LEVEL <= 1000;
COMMIT;
```

### 2.2 Sửa tablespace

**Thêm datafile thứ hai:**

```sql
ALTER TABLESPACE tbs_demo ADD DATAFILE '/opt/oracle/oradata/FREE/FREEPDB1/tbs_demo02.dbf' SIZE 10M;
```

Nếu chạy lệnh này trên tablespace kiểu bigfile (như `TBS_CAFE`) thì bị từ chối:

```
ERROR at line 1:
ORA-32771: cannot add file to bigfile tablespace
```

**Đổi kích thước datafile:**

```sql
ALTER DATABASE DATAFILE '/opt/oracle/oradata/FREE/FREEPDB1/tbs_demo01.dbf' RESIZE 30M;

SELECT file_id, file_name, bytes/1024/1024 AS size_mb, autoextensible AS autoext, maxbytes/1024/1024 AS max_mb
  FROM dba_data_files WHERE tablespace_name = 'TBS_DEMO' ORDER BY file_id;
```

```
   FILE_ID FILE_NAME                                                     SIZE_MB AUTOEXT     MAX_MB
---------- ---------------------------------------------------------- ---------- ------- ----------
        29 /opt/oracle/oradata/FREE/FREEPDB1/tbs_demo01.dbf                   30 NO               0
        30 /opt/oracle/oradata/FREE/FREEPDB1/tbs_demo02.dbf                   10 NO               0
```

Số `FILE_ID` trên máy bạn có thể khác; các bước sau dùng số này thì thay bằng số của bạn.

**Đổi tên tablespace** – các bảng bên trong tự theo tên mới:

```sql
ALTER TABLESPACE tbs_demo RENAME TO tbs_demo_moi;
SELECT tablespace_name, status FROM dba_tablespaces WHERE tablespace_name LIKE 'TBS_DEMO%';
SELECT table_name, tablespace_name FROM dba_tables WHERE owner = 'SYSTEM' AND table_name = 'DEMO_NHAT_KY';
ALTER TABLESPACE tbs_demo_moi RENAME TO tbs_demo;
```

```
TABLESPACE_NAM STATUS
-------------- ----------
TBS_DEMO_MOI   ONLINE

TABLE_NAME     TABLESPACE_NAM
-------------- --------------
DEMO_NHAT_KY   TBS_DEMO_MOI
```

**Chuyển sang chỉ đọc rồi về đọc/ghi:**

```sql
ALTER TABLESPACE tbs_demo READ ONLY;
SELECT tablespace_name, status FROM dba_tablespaces WHERE tablespace_name = 'TBS_DEMO';
SELECT COUNT(*) FROM system.demo_nhat_ky;
INSERT INTO system.demo_nhat_ky (ma, noi_dung) VALUES (2001, 'Thu ghi khi read only');
ALTER TABLESPACE tbs_demo READ WRITE;
```

```
TABLESPACE_NAM STATUS
-------------- ----------
TBS_DEMO       READ ONLY

  COUNT(*)
----------
      1000

INSERT INTO system.demo_nhat_ky (ma, noi_dung) VALUES (2001, 'Thu ghi khi read only')
                   *
ERROR at line 1:
ORA-00372: file 29 cannot be modified at this time
ORA-01110: data file 29: '/opt/oracle/oradata/FREE/FREEPDB1/tbs_demo01.dbf'
```

**Offline rồi online:**

```sql
ALTER TABLESPACE tbs_demo OFFLINE;
SELECT tablespace_name, status FROM dba_tablespaces WHERE tablespace_name = 'TBS_DEMO';
SELECT COUNT(*) FROM system.demo_nhat_ky;
ALTER TABLESPACE tbs_demo ONLINE;
SELECT COUNT(*) FROM system.demo_nhat_ky;
```

```
TABLESPACE_NAM STATUS
-------------- ----------
TBS_DEMO       OFFLINE

SELECT COUNT(*) FROM system.demo_nhat_ky
*
ERROR at line 1:
ORA-00376: file 29 cannot be read at this time
ORA-01110: data file 29: '/opt/oracle/oradata/FREE/FREEPDB1/tbs_demo01.dbf'

Tablespace altered.

  COUNT(*)
----------
      1000
```

### 2.3 Bật / tắt tự động mở rộng (autoextend)

**Bật** – khi datafile đầy, tự nới thêm 5 MB mỗi lần, tối đa 100 MB:

```sql
ALTER DATABASE DATAFILE '/opt/oracle/oradata/FREE/FREEPDB1/tbs_demo02.dbf'
    AUTOEXTEND ON NEXT 5M MAXSIZE 100M;

SELECT file_id, file_name, bytes/1024/1024 AS size_mb, autoextensible AS autoext,
       increment_by * 8192/1024/1024 AS next_mb, maxbytes/1024/1024 AS max_mb
  FROM dba_data_files WHERE tablespace_name = 'TBS_DEMO' ORDER BY file_id;
```

```
   FILE_ID FILE_NAME                                                     SIZE_MB AUTOEXT    NEXT_MB     MAX_MB
---------- ---------------------------------------------------------- ---------- ------- ---------- ----------
        29 /opt/oracle/oradata/FREE/FREEPDB1/tbs_demo01.dbf                   30 NO               0          0
        30 /opt/oracle/oradata/FREE/FREEPDB1/tbs_demo02.dbf                   10 YES              5        100
```

Cột `increment_by` tính bằng số block; nhân với kích thước block (8192 byte) ra dung lượng mỗi lần nới.

**Tắt:**

```sql
ALTER DATABASE DATAFILE '/opt/oracle/oradata/FREE/FREEPDB1/tbs_demo02.dbf' AUTOEXTEND OFF;
```

```
   FILE_ID FILE_NAME                                                     SIZE_MB AUTOEXT     MAX_MB
---------- ---------------------------------------------------------- ---------- ------- ----------
        29 /opt/oracle/oradata/FREE/FREEPDB1/tbs_demo01.dbf                   30 NO               0
        30 /opt/oracle/oradata/FREE/FREEPDB1/tbs_demo02.dbf                   10 NO               0
```

### 2.4 Di chuyển vị trí datafile

Tạo thư mục đích trước (chạy trong PowerShell):

```powershell
docker exec oracle-btl mkdir -p /opt/oracle/oradata/FREE/FREEPDB1/demo
```

**Cách online – không dùng được trên bản Free:**

```sql
ALTER DATABASE MOVE DATAFILE '/opt/oracle/oradata/FREE/FREEPDB1/tbs_demo02.dbf'
    TO '/opt/oracle/oradata/FREE/FREEPDB1/demo/tbs_demo02.dbf';
```

```
ERROR at line 1:
ORA-00439: feature not enabled: online move datafile
```

**Cách offline – gồm bốn bước:** đưa tablespace offline, chuyển file bằng lệnh hệ điều hành, báo cho Oracle vị trí mới, đưa online lại.

```sql
ALTER TABLESPACE tbs_demo OFFLINE NORMAL;

HOST mv /opt/oracle/oradata/FREE/FREEPDB1/tbs_demo01.dbf /opt/oracle/oradata/FREE/FREEPDB1/demo/tbs_demo01.dbf

ALTER TABLESPACE tbs_demo RENAME DATAFILE '/opt/oracle/oradata/FREE/FREEPDB1/tbs_demo01.dbf'
    TO '/opt/oracle/oradata/FREE/FREEPDB1/demo/tbs_demo01.dbf';

ALTER TABLESPACE tbs_demo ONLINE;

SELECT file_id, file_name, online_status FROM dba_data_files WHERE tablespace_name = 'TBS_DEMO' ORDER BY file_id;
HOST ls -l /opt/oracle/oradata/FREE/FREEPDB1/demo/
SELECT COUNT(*) FROM system.demo_nhat_ky;
```

```
   FILE_ID FILE_NAME                                                      ONLINE_STATUS
---------- -------------------------------------------------------------- -------------
        29 /opt/oracle/oradata/FREE/FREEPDB1/demo/tbs_demo01.dbf          ONLINE
        30 /opt/oracle/oradata/FREE/FREEPDB1/tbs_demo02.dbf               ONLINE

total 30728
-rw-r----- 1 oracle oinstall 31465472 Oct  2 10:38 tbs_demo01.dbf

  COUNT(*)
----------
      1000
```

Lệnh `RENAME DATAFILE` chỉ sửa thông tin trong control file, không tự chuyển file; vì vậy phải `mv` trước.

### 2.5 Truy vấn thông tin tablespace và datafile

**Danh sách tablespace:**

```sql
SELECT tablespace_name, status, contents, bigfile, block_size, extent_management, segment_space_management
  FROM dba_tablespaces ORDER BY tablespace_name;
```

```
TABLESPACE_NAM STATUS     CONTENTS   BIGFILE BLOCK_SIZE EXTENT_MAN SEGMEN
-------------- ---------- ---------- ------- ---------- ---------- ------
SYSAUX         ONLINE     PERMANENT  YES           8192 LOCAL      AUTO
SYSTEM         ONLINE     PERMANENT  YES           8192 LOCAL      MANUAL
TBS_CAFE       ONLINE     PERMANENT  YES           8192 LOCAL      AUTO
TBS_DEMO       ONLINE     PERMANENT  NO            8192 LOCAL      AUTO
TEMP           ONLINE     TEMPORARY  NO            8192 LOCAL      MANUAL
UNDOTBS1       ONLINE     UNDO       YES           8192 LOCAL      MANUAL
USERS          ONLINE     PERMANENT  NO            8192 LOCAL      AUTO
```

**Datafile của từng tablespace:**

```sql
SELECT tablespace_name, file_id, file_name, ROUND(bytes/1024/1024) AS size_mb,
       autoextensible AS autoext, ROUND(maxbytes/1024/1024) AS max_mb, online_status AS status
  FROM dba_data_files ORDER BY tablespace_name, file_id;
```

```
TABLESPACE_NAM    FILE_ID FILE_NAME                                                     SIZE_MB AUTOEXT     MAX_MB STATUS
-------------- ---------- ---------------------------------------------------------- ---------- ------- ---------- ----------
SYSAUX                 22 /opt/oracle/oradata/FREE/FREEPDB1/sysaux01.dbf                    374 YES       33554432 ONLINE
SYSTEM                 21 /opt/oracle/oradata/FREE/FREEPDB1/system01.dbf                    298 YES       33554432 SYSTEM
TBS_CAFE               27 /opt/oracle/oradata/FREE/FREEPDB1/tbs_cafe01.dbf                  100 YES            500 ONLINE
TBS_DEMO               29 /opt/oracle/oradata/FREE/FREEPDB1/demo/tbs_demo01.dbf              30 NO               0 ONLINE
TBS_DEMO               30 /opt/oracle/oradata/FREE/FREEPDB1/tbs_demo02.dbf                   10 NO               0 ONLINE
UNDOTBS1               23 /opt/oracle/oradata/FREE/FREEPDB1/undotbs01.dbf                    11 YES       33554432 ONLINE
USERS                  24 /opt/oracle/oradata/FREE/FREEPDB1/users01.dbf                       1 YES          32768 ONLINE
```

**Tempfile** (tablespace tạm nằm ở view riêng):

```sql
SELECT tablespace_name, file_name, ROUND(bytes/1024/1024) AS size_mb, autoextensible AS autoext FROM dba_temp_files;
```

```
TABLESPACE_NAM FILE_NAME                                                     SIZE_MB AUTOEXT
-------------- ---------------------------------------------------------- ---------- -------
TEMP           /opt/oracle/oradata/FREE/FREEPDB1/temp01.dbf                       10 YES
```

**Dung lượng đã dùng và còn trống:**

```sql
SELECT d.tablespace_name,
       ROUND(d.tong_mb, 1)                              AS tong_mb,
       ROUND(d.tong_mb - NVL(f.trong_mb, 0), 1)         AS da_dung_mb,
       ROUND(NVL(f.trong_mb, 0), 1)                     AS con_trong_mb,
       ROUND(100 * (d.tong_mb - NVL(f.trong_mb, 0)) / d.tong_mb, 1) AS phan_tram_dung
  FROM (SELECT tablespace_name, SUM(bytes)/1024/1024 AS tong_mb FROM dba_data_files GROUP BY tablespace_name) d
  LEFT JOIN (SELECT tablespace_name, SUM(bytes)/1024/1024 AS trong_mb FROM dba_free_space GROUP BY tablespace_name) f
    ON f.tablespace_name = d.tablespace_name
 ORDER BY d.tablespace_name;
```

```
TABLESPACE_NAM    TONG_MB DA_DUNG_MB CON_TRONG_MB PHAN_TRAM_DUNG
-------------- ---------- ---------- ------------ --------------
SYSAUX              374.1      290.6         83.5           77.7
SYSTEM                298      289.3          8.8           97.1
TBS_CAFE              100        8.2         91.8            8.2
TBS_DEMO               40        2.1         37.9            5.3
UNDOTBS1               11       10.9           .1           98.9
USERS                   1         .1           .9            6.3
```

**Trạng thái datafile theo `v$datafile`:**

```sql
SELECT file#, name, status, enabled, checkpoint_change# FROM v$datafile ORDER BY file#;
```

```
     FILE# NAME                                                       STATUS     ENABLED    CHECKPOINT_CHANGE#
---------- ---------------------------------------------------------- ---------- ---------- ------------------
        21 /opt/oracle/oradata/FREE/FREEPDB1/system01.dbf             SYSTEM     READ WRITE            2342163
        22 /opt/oracle/oradata/FREE/FREEPDB1/sysaux01.dbf             ONLINE     READ WRITE            2342163
        23 /opt/oracle/oradata/FREE/FREEPDB1/undotbs01.dbf            ONLINE     READ WRITE            2342163
        24 /opt/oracle/oradata/FREE/FREEPDB1/users01.dbf              ONLINE     READ WRITE            2342163
        27 /opt/oracle/oradata/FREE/FREEPDB1/tbs_cafe01.dbf           ONLINE     READ WRITE            2342163
        29 /opt/oracle/oradata/FREE/FREEPDB1/demo/tbs_demo01.dbf      ONLINE     READ WRITE            2344414
        30 /opt/oracle/oradata/FREE/FREEPDB1/tbs_demo02.dbf           ONLINE     READ WRITE            2344414
```

**Các bảng của đề tài nằm trong `TBS_CAFE`:**

```sql
SELECT owner, segment_name, segment_type, ROUND(bytes/1024) AS kb
  FROM dba_segments WHERE tablespace_name = 'TBS_CAFE' AND segment_type = 'TABLE' ORDER BY segment_name;
```

```
OWNER    SEGMENT_NAME           SEGMENT_TY         KB
-------- ---------------------- ---------- ----------
QLCAFE   CHUC_VU                TABLE              64
QLCAFE   CONG_THUC              TABLE              64
QLCAFE   CT_HOA_DON             TABLE              64
QLCAFE   CT_PHIEU_NHAP          TABLE              64
QLCAFE   HOA_DON                TABLE              64
QLCAFE   LOAI_MON               TABLE              64
QLCAFE   MON                    TABLE              64
QLCAFE   MON_SIZE               TABLE              64
QLCAFE   NGUYEN_LIEU            TABLE              64
QLCAFE   NHAN_VIEN              TABLE              64
QLCAFE   NHA_CUNG_CAP           TABLE              64
QLCAFE   PHIEU_NHAP             TABLE              64
QLCAFE   TAI_KHOAN              TABLE              64
```

**Tablespace mặc định và hạn mức của user:**

```sql
SELECT u.username, u.default_tablespace, u.temporary_tablespace,
       DECODE(q.max_bytes, -1, 'UNLIMITED', TO_CHAR(q.max_bytes)) AS han_muc
  FROM dba_users u
  LEFT JOIN dba_ts_quotas q ON q.username = u.username AND q.tablespace_name = u.default_tablespace
 WHERE u.username IN ('QLCAFE', 'BTL_USER');
```

```
USERNAME   DEFAULT_TABLESPACE TEMPORARY_TABLESPACE HAN_MUC
---------- ------------------ -------------------- ------------
QLCAFE     TBS_CAFE           TEMP                 UNLIMITED
BTL_USER   USERS              TEMP                 UNLIMITED
```

### 2.6 Xoá tablespace

Làm sau khi xong phần 3, vì phần 3 còn dùng `TBS_DEMO`:

```sql
DROP TABLESPACE tbs_demo INCLUDING CONTENTS AND DATAFILES;
SELECT tablespace_name, status FROM dba_tablespaces ORDER BY tablespace_name;
```

```
Tablespace dropped.

TABLESPACE_NAM STATUS
-------------- ---------
SYSAUX         ONLINE
SYSTEM         ONLINE
TBS_CAFE       ONLINE
TEMP           ONLINE
UNDOTBS1       ONLINE
USERS          ONLINE
```

`INCLUDING CONTENTS` xoá mọi bảng bên trong; `AND DATAFILES` xoá luôn file trên đĩa. Thiếu `INCLUDING CONTENTS` thì lệnh bị từ chối khi tablespace còn đối tượng.

Chụp màn hình: bảng datafile trước và sau khi bật autoextend; `ORA-00439` và kết quả di chuyển bằng cách offline; bảng dung lượng đã dùng / còn trống.

---

## 3. Khôi phục datafile bị mất

Nguyên lý: datafile khôi phục được nếu có **toàn bộ redo** kể từ thời điểm của bản sao lưu (hoặc kể từ khi file được tạo). Redo log chỉ được giữ lại đầy đủ khi database chạy ở chế độ **ARCHIVELOG**, nên bước đầu tiên là bật chế độ này.

Image này không có RMAN, nên phần này dùng cách sao lưu và khôi phục thủ công (user-managed): chép file bằng lệnh hệ điều hành và dùng lệnh `RECOVER` của SQL*Plus.

### 3.1 Bật ARCHIVELOG

Tạo thư mục chứa archive log và bản sao lưu (PowerShell):

```powershell
docker exec oracle-btl mkdir -p /opt/oracle/oradata/arch /opt/oracle/oradata/backup_demo
```

Đăng nhập kiểu (a) `sqlplus / as sysdba`:

```sql
SELECT name, log_mode FROM v$database;
ARCHIVE LOG LIST
```

```
NAME       LOG_MODE
---------- ------------
FREE       NOARCHIVELOG

Database log mode              No Archive Mode
Automatic archival             Disabled
Archive destination            /opt/oracle/product/26ai/dbhomeFree/dbs/arch
Oldest online log sequence     23
Current log sequence           22
```

Đổi chế độ log phải làm ở trạng thái MOUNT:

```sql
ALTER SYSTEM SET log_archive_dest_1 = 'LOCATION=/opt/oracle/oradata/arch' SCOPE = SPFILE;
SHUTDOWN IMMEDIATE
STARTUP MOUNT
ALTER DATABASE ARCHIVELOG;
ALTER DATABASE OPEN;
SELECT name, log_mode FROM v$database;
ARCHIVE LOG LIST
```

```
NAME       LOG_MODE
---------- ------------
FREE       ARCHIVELOG

Database log mode              Archive Mode
Automatic archival             Enabled
Archive destination            /opt/oracle/oradata/arch
Oldest online log sequence     23
Next log sequence to archive   23
Current log sequence           22
```

Ép ghi một archive log để thấy file được tạo:

```sql
ALTER SYSTEM ARCHIVE LOG CURRENT;
HOST ls -l /opt/oracle/oradata/arch
```

```
total 9568
-rw-r----- 1 oracle oinstall 9797120 Oct  2 10:39 1_23_1242688064.dbf
```

### 3.2 Kịch bản A – mất datafile khi đã có bản sao lưu

Các lệnh dưới chạy trong PDB:

```sql
CONNECT / AS SYSDBA
ALTER SESSION SET CONTAINER = freepdb1;
```

**Bước 1 – sao lưu nóng (database vẫn chạy):**

```sql
ALTER TABLESPACE tbs_demo BEGIN BACKUP;
SELECT file#, status, change# FROM v$backup WHERE file# IN (29, 30);
HOST cp /opt/oracle/oradata/FREE/FREEPDB1/demo/tbs_demo01.dbf /opt/oracle/oradata/backup_demo/tbs_demo01.dbf
HOST cp /opt/oracle/oradata/FREE/FREEPDB1/tbs_demo02.dbf /opt/oracle/oradata/backup_demo/tbs_demo02.dbf
ALTER TABLESPACE tbs_demo END BACKUP;
HOST ls -l /opt/oracle/oradata/backup_demo
```

```
     FILE# STATUS        CHANGE#
---------- ---------- ----------
        29 ACTIVE        2346424
        30 ACTIVE        2346424

total 40976
-rw-r----- 1 oracle oinstall 31465472 Oct  2 10:39 tbs_demo01.dbf
-rw-r----- 1 oracle oinstall 10493952 Oct  2 10:39 tbs_demo02.dbf
```

`BEGIN BACKUP` đóng băng phần đầu (header) của datafile để bản chép nhất quán; `END BACKUP` kết thúc trạng thái đó.

**Bước 2 – thêm dữ liệu sau thời điểm sao lưu.** 500 dòng này không có trong bản sao lưu; nếu khôi phục đúng thì chúng vẫn phải còn.

```sql
SELECT COUNT(*) AS truoc FROM system.demo_nhat_ky;
INSERT INTO system.demo_nhat_ky (ma, noi_dung)
SELECT 1000 + LEVEL, 'Them sau sao luu ' || LEVEL FROM dual CONNECT BY LEVEL <= 500;
COMMIT;
SELECT COUNT(*) AS sau FROM system.demo_nhat_ky;
```

```
     TRUOC
----------
      1000

       SAU
----------
      1500
```

Ghi redo ra archive log (lệnh này phải chạy ở CDB root):

```sql
CONNECT / AS SYSDBA
ALTER SYSTEM ARCHIVE LOG CURRENT;
ALTER SESSION SET CONTAINER = freepdb1;
```

**Bước 3 – làm mất datafile:**

```sql
HOST rm /opt/oracle/oradata/FREE/FREEPDB1/demo/tbs_demo01.dbf
HOST ls -l /opt/oracle/oradata/FREE/FREEPDB1/demo/
ALTER DATABASE DATAFILE 29 OFFLINE;
SELECT file#, name, status FROM v$datafile WHERE file# IN (29, 30);
SELECT COUNT(*) FROM system.demo_nhat_ky;
ALTER DATABASE DATAFILE 29 ONLINE;
SELECT file#, online_status, error FROM v$recover_file;
```

Kết quả – file không còn trên đĩa, datafile chuyển sang trạng thái `RECOVER`, không đọc được bảng, không đưa online được:

```
total 0

     FILE# NAME                                                       STATUS
---------- ---------------------------------------------------------- ----------
        29 /opt/oracle/oradata/FREE/FREEPDB1/demo/tbs_demo01.dbf      RECOVER
        30 /opt/oracle/oradata/FREE/FREEPDB1/tbs_demo02.dbf           ONLINE

SELECT COUNT(*) FROM system.demo_nhat_ky
                            *
ERROR at line 1:
ORA-00376: file 29 cannot be read at this time
ORA-01110: data file 29: '/opt/oracle/oradata/FREE/FREEPDB1/demo/tbs_demo01.dbf'

ALTER DATABASE DATAFILE 29 ONLINE
*
ERROR at line 1:
ORA-01157: cannot identify/lock data file 29 - see DBWR trace file
ORA-01110: data file 29: '/opt/oracle/oradata/FREE/FREEPDB1/demo/tbs_demo01.dbf'

     FILE# ONLINE_ ERROR
---------- ------- --------------------
        29 OFFLINE FILE NOT FOUND
```

Các tablespace khác, kể cả `TBS_CAFE`, vẫn hoạt động bình thường trong lúc này.

**Bước 4 – chép bản sao lưu về vị trí cũ (restore):**

```sql
HOST cp /opt/oracle/oradata/backup_demo/tbs_demo01.dbf /opt/oracle/oradata/FREE/FREEPDB1/demo/tbs_demo01.dbf
SELECT file#, online_status, error, change# FROM v$recover_file;
```

```
     FILE# ONLINE_ ERROR                   CHANGE#
---------- ------- -------------------- ----------
        29 OFFLINE                         2346424
```

File đã có lại nhưng còn ở thời điểm sao lưu (SCN 2346424), cũ hơn phần còn lại của database nên chưa đưa online được.

**Bước 5 – áp redo để đưa file về hiện tại (recover):**

```sql
SET AUTORECOVERY ON
RECOVER DATAFILE 29;
```

```
Media recovery complete.
```

`SET AUTORECOVERY ON` để Oracle tự lấy các archive log cần thiết, không hỏi từng file.

**Bước 6 – đưa online và kiểm tra:**

```sql
ALTER DATABASE DATAFILE 29 ONLINE;
SELECT file#, name, status FROM v$datafile WHERE file# IN (29, 30);
SELECT COUNT(*) AS tong_so_dong, MAX(ma) AS ma_lon_nhat FROM system.demo_nhat_ky;
SELECT COUNT(*) AS dong_them_sau_sao_luu FROM system.demo_nhat_ky WHERE ma > 1000;
```

```
     FILE# NAME                                                       STATUS
---------- ---------------------------------------------------------- ----------
        29 /opt/oracle/oradata/FREE/FREEPDB1/demo/tbs_demo01.dbf      ONLINE
        30 /opt/oracle/oradata/FREE/FREEPDB1/tbs_demo02.dbf           ONLINE

TONG_SO_DONG MA_LON_NHAT
------------ -----------
        1500        1500

DONG_THEM_SAU_SAO_LUU
---------------------
                  500
```

Đủ 1.500 dòng: 1.000 dòng từ bản sao lưu và 500 dòng được dựng lại từ redo. Không mất dữ liệu.

### 3.3 Kịch bản B – mất datafile khi không có bản sao lưu

Nếu database ở ARCHIVELOG **từ trước khi datafile được tạo**, Oracle dựng lại được file từ con số không bằng cách tạo file rỗng rồi áp toàn bộ redo kể từ lúc tạo.

**Bước 1 – tạo tablespace mới, có dữ liệu, không sao lưu:**

```sql
CREATE SMALLFILE TABLESPACE tbs_demo_b
    DATAFILE '/opt/oracle/oradata/FREE/FREEPDB1/demo/tbs_demo_b01.dbf' SIZE 10M;
CREATE TABLE system.demo_b (ma NUMBER PRIMARY KEY, noi_dung VARCHAR2(50)) TABLESPACE tbs_demo_b;
INSERT INTO system.demo_b
SELECT LEVEL, 'Du lieu khong co ban sao luu ' || LEVEL FROM dual CONNECT BY LEVEL <= 300;
COMMIT;
SELECT file_id, file_name FROM dba_data_files WHERE tablespace_name = 'TBS_DEMO_B';

CONNECT / AS SYSDBA
ALTER SYSTEM ARCHIVE LOG CURRENT;
ALTER SESSION SET CONTAINER = freepdb1;
```

```
   FILE_ID FILE_NAME
---------- ----------------------------------------------------------
        31 /opt/oracle/oradata/FREE/FREEPDB1/demo/tbs_demo_b01.dbf
```

**Bước 2 – làm mất datafile:**

```sql
HOST rm /opt/oracle/oradata/FREE/FREEPDB1/demo/tbs_demo_b01.dbf
ALTER DATABASE DATAFILE '/opt/oracle/oradata/FREE/FREEPDB1/demo/tbs_demo_b01.dbf' OFFLINE;
SELECT COUNT(*) FROM system.demo_b;
SELECT file#, online_status, error FROM v$recover_file;
```

```
SELECT COUNT(*) FROM system.demo_b
                            *
ERROR at line 1:
ORA-00376: file 31 cannot be read at this time
ORA-01110: data file 31: '/opt/oracle/oradata/FREE/FREEPDB1/demo/tbs_demo_b01.dbf'

     FILE# ONLINE_ ERROR
---------- ------- --------------------
        31 OFFLINE FILE NOT FOUND
```

**Bước 3 – tạo lại file rỗng, áp redo, đưa online:**

```sql
ALTER DATABASE CREATE DATAFILE '/opt/oracle/oradata/FREE/FREEPDB1/demo/tbs_demo_b01.dbf';
HOST ls -l /opt/oracle/oradata/FREE/FREEPDB1/demo/
SET AUTORECOVERY ON
RECOVER DATAFILE '/opt/oracle/oradata/FREE/FREEPDB1/demo/tbs_demo_b01.dbf';
ALTER DATABASE DATAFILE '/opt/oracle/oradata/FREE/FREEPDB1/demo/tbs_demo_b01.dbf' ONLINE;
SELECT file#, name, status FROM v$datafile WHERE name LIKE '%tbs_demo_b01%';
SELECT COUNT(*) AS so_dong FROM system.demo_b;
```

```
Database altered.

total 40976
-rw-r----- 1 oracle oinstall 31465472 Oct  2 10:40 tbs_demo01.dbf
-rw-r----- 1 oracle oinstall 10493952 Oct  2 10:40 tbs_demo_b01.dbf

Media recovery complete.

Database altered.

     FILE# NAME                                                       STATUS
---------- ---------------------------------------------------------- ----------
        31 /opt/oracle/oradata/FREE/FREEPDB1/demo/tbs_demo_b01.dbf    ONLINE

   SO_DONG
----------
       300
```

Cả 300 dòng trở lại dù không có bản sao lưu nào.

Cách này **không áp dụng** cho datafile được tạo khi database còn ở NOARCHIVELOG (như `tbs_cafe01.dbf` hiện nay), vì redo từ lúc tạo đã bị ghi đè. Với những file đó, bắt buộc phải có bản sao lưu như kịch bản A.

### 3.4 Tóm tắt quy trình

| Bước | Có bản sao lưu (A) | Không có bản sao lưu (B) |
|---|---|---|
| 1. Cô lập file hỏng | `ALTER DATABASE DATAFILE n OFFLINE` | như A |
| 2. Có lại file trên đĩa | `cp` bản sao lưu về vị trí cũ | `ALTER DATABASE CREATE DATAFILE '...'` |
| 3. Áp redo | `RECOVER DATAFILE n` | như A |
| 4. Mở lại | `ALTER DATABASE DATAFILE n ONLINE` | như A |
| Điều kiện | ARCHIVELOG + archive log từ lúc sao lưu | ARCHIVELOG + archive log từ lúc tạo file |

### 3.5 Lệnh RMAN tương đương (chưa chạy thử)

Trên bản cài có RMAN, kịch bản A thường được làm như sau. **Các lệnh này chưa được chạy trong môi trường của đề tài vì image `slim` không có chương trình `rman`**; chỉ ghi lại để tham khảo:

```
rman target /
BACKUP TABLESPACE freepdb1:tbs_demo;
-- sau khi mất file:
ALTER DATABASE DATAFILE 29 OFFLINE;
RESTORE DATAFILE 29;
RECOVER DATAFILE 29;
ALTER DATABASE DATAFILE 29 ONLINE;
```

### 3.6 Trả về NOARCHIVELOG (tuỳ chọn)

Ở ARCHIVELOG, archive log cứ tích dần trên đĩa. Với môi trường học tập, sau khi minh hoạ xong có thể trả về NOARCHIVELOG. Xoá các tablespace minh hoạ trước (mục 2.6 và `DROP TABLESPACE tbs_demo_b INCLUDING CONTENTS AND DATAFILES;`), rồi:

```sql
CONNECT / AS SYSDBA
SHUTDOWN IMMEDIATE
STARTUP MOUNT
ALTER DATABASE NOARCHIVELOG;
ALTER DATABASE OPEN;
ALTER SYSTEM RESET log_archive_dest_1 SCOPE = SPFILE;
SELECT name, log_mode FROM v$database;
```

```
NAME       LOG_MODE
---------- ------------
FREE       NOARCHIVELOG
```

Xoá các thư mục minh hoạ (PowerShell):

```powershell
docker exec oracle-btl bash -c "rm -rf /opt/oracle/oradata/arch /opt/oracle/oradata/backup_demo /opt/oracle/oradata/FREE/FREEPDB1/demo"
```

Chụp màn hình: `ARCHIVE LOG LIST` trước và sau; trạng thái `RECOVER` và `FILE NOT FOUND`; `Media recovery complete.`; số dòng sau khôi phục.

---

## 4. Người dùng, quyền, chức danh

Đăng nhập kiểu (b): `sqlplus system/Oracle_123456@//localhost:1521/FREEPDB1`.

Thiết kế phân quyền theo vai trò trong quán:

| Role | Được làm gì trên dữ liệu của `QLCAFE` | User minh hoạ | Mật khẩu |
|---|---|---|---|
| `ROLE_QUAN_LY` | Đọc, thêm, sửa, xoá trên cả 13 bảng; xem tồn kho | `nv_quanly` | `Quanly_123` |
| `ROLE_THU_NGAN` | Xem thực đơn; xem và thêm hoá đơn, chi tiết hoá đơn | `nv_thungan` | `Thungan_123` |
| `ROLE_THU_KHO` | Đọc, thêm, sửa, xoá nguyên liệu, nhà cung cấp, phiếu nhập; xem tồn kho | `nv_thukho` | `Thukho_123` |

Quyền được cấp cho role, rồi role được gán cho user. Thêm nhân viên mới chỉ cần tạo user và gán role tương ứng.

Các role, user và profile này **hiện đã tồn tại trong DB**. Muốn tự chạy lại từ đầu để chụp màn hình thì xoá trước:

```sql
DROP USER nv_quanly CASCADE;
DROP USER nv_thungan CASCADE;
DROP USER nv_thukho CASCADE;
DROP ROLE role_quan_ly;
DROP ROLE role_thu_ngan;
DROP ROLE role_thu_kho;
DROP PROFILE pf_nhan_vien;
```

### 4.1 Tạo profile

Profile đặt giới hạn về mật khẩu và tài nguyên cho nhóm user:

```sql
CREATE PROFILE pf_nhan_vien LIMIT
    FAILED_LOGIN_ATTEMPTS 3
    PASSWORD_LOCK_TIME    1/1440
    PASSWORD_LIFE_TIME    90
    SESSIONS_PER_USER     2
    IDLE_TIME             30;
```

| Giới hạn | Ý nghĩa |
|---|---|
| `FAILED_LOGIN_ATTEMPTS 3` | Sai mật khẩu 3 lần thì khoá tài khoản |
| `PASSWORD_LOCK_TIME 1/1440` | Khoá trong 1 phút (đơn vị là ngày; 1/1440 ngày = 1 phút) |
| `PASSWORD_LIFE_TIME 90` | Mật khẩu hết hạn sau 90 ngày |
| `SESSIONS_PER_USER 2` | Tối đa 2 phiên đồng thời |
| `IDLE_TIME 30` | Ngắt phiên không hoạt động quá 30 phút |

### 4.2 Tạo role và cấp quyền cho role

```sql
CREATE ROLE role_quan_ly;
CREATE ROLE role_thu_ngan;
CREATE ROLE role_thu_kho;
```

**Quyền hệ thống** – cho phép đăng nhập:

```sql
GRANT CREATE SESSION TO role_quan_ly, role_thu_ngan, role_thu_kho;
```

**Quyền đối tượng** – trên từng bảng của `QLCAFE`:

```sql
-- Thu ngân: xem thực đơn, lập hoá đơn
GRANT SELECT ON qlcafe.loai_mon TO role_thu_ngan;
GRANT SELECT ON qlcafe.mon      TO role_thu_ngan;
GRANT SELECT ON qlcafe.mon_size TO role_thu_ngan;
GRANT SELECT, INSERT ON qlcafe.hoa_don    TO role_thu_ngan;
GRANT SELECT, INSERT ON qlcafe.ct_hoa_don TO role_thu_ngan;

-- Thủ kho: quản lý nguyên liệu, nhà cung cấp, phiếu nhập; xem tồn kho
GRANT SELECT, INSERT, UPDATE, DELETE ON qlcafe.nguyen_lieu   TO role_thu_kho;
GRANT SELECT, INSERT, UPDATE, DELETE ON qlcafe.nha_cung_cap  TO role_thu_kho;
GRANT SELECT, INSERT, UPDATE, DELETE ON qlcafe.phieu_nhap    TO role_thu_kho;
GRANT SELECT, INSERT, UPDATE, DELETE ON qlcafe.ct_phieu_nhap TO role_thu_kho;
GRANT SELECT ON qlcafe.v_ton_kho TO role_thu_kho;

-- Quản lý: toàn quyền đọc/ghi trên mọi bảng, và xem view tồn kho
BEGIN
    FOR t IN (SELECT table_name FROM dba_tables WHERE owner = 'QLCAFE') LOOP
        EXECUTE IMMEDIATE 'GRANT SELECT, INSERT, UPDATE, DELETE ON qlcafe.' || t.table_name || ' TO role_quan_ly';
    END LOOP;
END;
/
GRANT SELECT ON qlcafe.v_ton_kho TO role_quan_ly;
```

### 4.3 Tạo user và gán role

```sql
CREATE USER nv_quanly  IDENTIFIED BY "Quanly_123"  PROFILE pf_nhan_vien;
CREATE USER nv_thungan IDENTIFIED BY "Thungan_123" PROFILE pf_nhan_vien;
CREATE USER nv_thukho  IDENTIFIED BY "Thukho_123"  PROFILE pf_nhan_vien;

GRANT role_quan_ly  TO nv_quanly;
GRANT role_thu_ngan TO nv_thungan;
GRANT role_thu_kho  TO nv_thukho;
```

Các user này không sở hữu bảng nào, chỉ thao tác trên bảng của `QLCAFE` nên phải ghi tên đầy đủ `qlcafe.<tên bảng>`.

### 4.4 Kiểm tra quyền có hiệu lực

**Thu ngân:**

```sql
CONNECT nv_thungan/Thungan_123@//localhost:1521/FREEPDB1
SELECT role FROM session_roles;
SELECT privilege FROM session_privs;
SELECT COUNT(*) AS so_mon FROM qlcafe.mon;
INSERT INTO qlcafe.hoa_don (tong_tien) VALUES (0);
ROLLBACK;
UPDATE qlcafe.mon_size SET don_gia = 1 WHERE ma_mon = 1;
DELETE FROM qlcafe.hoa_don WHERE ma_hd = 1;
SELECT COUNT(*) FROM qlcafe.nguyen_lieu;
CREATE TABLE thu (a NUMBER);
```

```
ROLE
----------------
ROLE_THU_NGAN

PRIVILEGE
--------------------
CREATE SESSION

    SO_MON
----------
        16

1 row created.

Rollback complete.

UPDATE qlcafe.mon_size SET don_gia = 1 WHERE ma_mon = 1
              *
ERROR at line 1:
ORA-41900: missing UPDATE privilege on "QLCAFE"."MON_SIZE"

DELETE FROM qlcafe.hoa_don WHERE ma_hd = 1
                   *
ERROR at line 1:
ORA-41900: missing DELETE privilege on "QLCAFE"."HOA_DON"

SELECT COUNT(*) FROM qlcafe.nguyen_lieu
                            *
ERROR at line 1:
ORA-00942: table or view "QLCAFE"."NGUYEN_LIEU" does not exist

CREATE TABLE thu (a NUMBER)
*
ERROR at line 1:
ORA-01031: insufficient privileges
```

Ba loại lỗi khác nhau, đáng nêu trong báo cáo:

| Lỗi | Xảy ra khi |
|---|---|
| `ORA-41900` | Thấy được bảng (có ít nhất một quyền) nhưng thiếu đúng quyền đang cần |
| `ORA-00942` | Không có quyền nào trên bảng: Oracle báo như thể bảng không tồn tại |
| `ORA-01031` | Thiếu quyền hệ thống (ở đây là `CREATE TABLE`) |

**Thủ kho:**

```sql
CONNECT nv_thukho/Thukho_123@//localhost:1521/FREEPDB1
UPDATE qlcafe.nguyen_lieu SET ton_toi_thieu = ton_toi_thieu WHERE ma_nl = 1;
ROLLBACK;
SELECT COUNT(*) AS so_nguyen_lieu_thieu FROM qlcafe.v_ton_kho WHERE so_luong_ton < ton_toi_thieu;
INSERT INTO qlcafe.hoa_don (tong_tien) VALUES (0);
SELECT COUNT(*) FROM qlcafe.tai_khoan;
```

```
1 row updated.

Rollback complete.

SO_NGUYEN_LIEU_THIEU
--------------------
                   3

INSERT INTO qlcafe.hoa_don (tong_tien) VALUES (0)
                   *
ERROR at line 1:
ORA-00942: table or view "QLCAFE"."HOA_DON" does not exist

SELECT COUNT(*) FROM qlcafe.tai_khoan
                            *
ERROR at line 1:
ORA-00942: table or view "QLCAFE"."TAI_KHOAN" does not exist
```

**Quản lý** – đọc/ghi mọi bảng nhưng không được thay đổi cấu trúc:

```sql
CONNECT nv_quanly/Quanly_123@//localhost:1521/FREEPDB1
SELECT COUNT(*) AS so_tai_khoan FROM qlcafe.tai_khoan;
UPDATE qlcafe.mon SET don_vi_tinh = don_vi_tinh WHERE ma_mon = 1;
ROLLBACK;
DROP TABLE qlcafe.mon;
```

```
SO_TAI_KHOAN
------------
           5

1 row updated.

Rollback complete.

DROP TABLE qlcafe.mon
                  *
ERROR at line 1:
ORA-01031: insufficient privileges
```

Các lệnh ghi thử ở trên đều được `ROLLBACK`, không làm thay đổi dữ liệu.

### 4.5 Thu hồi quyền

**Thu hồi quyền đối tượng khỏi role** – mọi user có role đó mất quyền ngay:

```sql
CONNECT system/Oracle_123456@//localhost:1521/FREEPDB1
REVOKE INSERT ON qlcafe.hoa_don FROM role_thu_ngan;

CONNECT nv_thungan/Thungan_123@//localhost:1521/FREEPDB1
INSERT INTO qlcafe.hoa_don (tong_tien) VALUES (0);
```

```
ERROR at line 1:
ORA-41900: missing INSERT privilege on "QLCAFE"."HOA_DON"
```

```sql
CONNECT system/Oracle_123456@//localhost:1521/FREEPDB1
GRANT INSERT ON qlcafe.hoa_don TO role_thu_ngan;
```

**Cấp và thu hồi quyền hệ thống trực tiếp cho user:**

```sql
GRANT CREATE TABLE TO nv_quanly;
SELECT grantee, privilege FROM dba_sys_privs WHERE grantee = 'NV_QUANLY';
REVOKE CREATE TABLE FROM nv_quanly;
SELECT grantee, privilege FROM dba_sys_privs WHERE grantee = 'NV_QUANLY';
```

```
GRANTEE   PRIVILEGE
--------- ----------------------------------------
NV_QUANLY CREATE TABLE

Revoke succeeded.

no rows selected
```

**Thu hồi role khỏi user** – vì quyền đăng nhập nằm trong role, user không vào được nữa:

```sql
REVOKE role_thu_kho FROM nv_thukho;
CONNECT nv_thukho/Thukho_123@//localhost:1521/FREEPDB1
```

```
ERROR:
ORA-01045: Login denied. User NV_THUKHO does not have CREATE SESSION privilege.
```

```sql
CONNECT system/Oracle_123456@//localhost:1521/FREEPDB1
GRANT role_thu_kho TO nv_thukho;
```

### 4.6 Khoá tài khoản, đổi mật khẩu

**Khoá và mở khoá:**

```sql
ALTER USER nv_thungan ACCOUNT LOCK;
SELECT username, account_status, profile FROM dba_users WHERE username = 'NV_THUNGAN';
CONNECT nv_thungan/Thungan_123@//localhost:1521/FREEPDB1
```

```
USERNAME     ACCOUNT_STATUS     PROFILE
------------ ------------------ --------------
NV_THUNGAN   LOCKED             PF_NHAN_VIEN

ERROR:
ORA-28000: The account is locked; login denied.
```

```sql
CONNECT system/Oracle_123456@//localhost:1521/FREEPDB1
ALTER USER nv_thungan ACCOUNT UNLOCK;
```

**Đổi mật khẩu** – mật khẩu cũ hết dùng được:

```sql
ALTER USER nv_thungan IDENTIFIED BY "Matkhau_Moi_1";
CONNECT nv_thungan/Thungan_123@//localhost:1521/FREEPDB1
```

```
ERROR:
ORA-01017: invalid credential or not authorized; logon denied
```

```sql
CONNECT nv_thungan/Matkhau_Moi_1@//localhost:1521/FREEPDB1
SELECT USER FROM dual;
```

```
USER
----------
NV_THUNGAN
```

Sau khi minh hoạ, mật khẩu đã được đặt lại là `Thungan_123`.

**Profile tự khoá khi sai mật khẩu 3 lần:**

```sql
CONNECT nv_thukho/sai1@//localhost:1521/FREEPDB1
CONNECT nv_thukho/sai2@//localhost:1521/FREEPDB1
CONNECT nv_thukho/sai3@//localhost:1521/FREEPDB1
CONNECT nv_thukho/Thukho_123@//localhost:1521/FREEPDB1
```

Ba lần đầu báo `ORA-01017`; lần thứ tư dùng đúng mật khẩu vẫn bị từ chối:

```
ERROR:
ORA-28000: The account is locked; login denied.
```

```sql
CONNECT system/Oracle_123456@//localhost:1521/FREEPDB1
SELECT username, account_status, profile FROM dba_users WHERE username = 'NV_THUKHO';
ALTER USER nv_thukho ACCOUNT UNLOCK;
```

```
USERNAME     ACCOUNT_STATUS     PROFILE
------------ ------------------ --------------
NV_THUKHO    LOCKED(TIMED)      PF_NHAN_VIEN
```

`LOCKED(TIMED)` là khoá có thời hạn do profile; hết 1 phút sẽ tự mở, hoặc quản trị viên mở bằng `ACCOUNT UNLOCK`.

### 4.7 Tạo và xoá user

```sql
CREATE USER nv_tam IDENTIFIED BY "Tam_123456" DEFAULT TABLESPACE tbs_cafe QUOTA 5M ON tbs_cafe;
GRANT CREATE SESSION, CREATE TABLE TO nv_tam;

CONNECT nv_tam/Tam_123456@//localhost:1521/FREEPDB1
CREATE TABLE ghi_chu (noi_dung VARCHAR2(50));

CONNECT system/Oracle_123456@//localhost:1521/FREEPDB1
DROP USER nv_tam;
DROP USER nv_tam CASCADE;
SELECT COUNT(*) AS con_user_nv_tam FROM dba_users WHERE username = 'NV_TAM';
```

```
DROP USER nv_tam
*
ERROR at line 1:
ORA-01922: CASCADE must be specified to drop 'NV_TAM'

User dropped.

CON_USER_NV_TAM
---------------
              0
```

User đang sở hữu đối tượng thì phải xoá bằng `CASCADE`, khi đó các đối tượng của user bị xoá theo.

### 4.8 Truy vấn thông tin user, role, quyền

```sql
SELECT username, account_status, default_tablespace, profile, TO_CHAR(created, 'DD/MM/YYYY') AS ngay_tao
  FROM dba_users WHERE username IN ('QLCAFE', 'NV_QUANLY', 'NV_THUNGAN', 'NV_THUKHO') ORDER BY username;
```

```
USERNAME     ACCOUNT_STATUS   DEFAULT_TABL PROFILE        NGAY_TAO
------------ ---------------- ------------ -------------- ----------
NV_QUANLY    OPEN             USERS        PF_NHAN_VIEN   02/10/2026
NV_THUKHO    OPEN             USERS        PF_NHAN_VIEN   02/10/2026
NV_THUNGAN   OPEN             USERS        PF_NHAN_VIEN   02/10/2026
QLCAFE       OPEN             TBS_CAFE     DEFAULT        02/10/2026
```

```sql
SELECT grantee, granted_role, admin_option, default_role FROM dba_role_privs
 WHERE grantee IN ('NV_QUANLY', 'NV_THUNGAN', 'NV_THUKHO') ORDER BY grantee;
```

```
GRANTEE          GRANTED_ROLE     ADM DEF
---------------- ---------------- --- ---
NV_QUANLY        ROLE_QUAN_LY     NO  YES
NV_THUKHO        ROLE_THU_KHO     NO  YES
NV_THUNGAN       ROLE_THU_NGAN    NO  YES
```

```sql
SELECT grantee, privilege, admin_option FROM dba_sys_privs
 WHERE grantee IN ('ROLE_QUAN_LY', 'ROLE_THU_NGAN', 'ROLE_THU_KHO', 'QLCAFE') ORDER BY grantee, privilege;
```

```
GRANTEE          PRIVILEGE          ADM
---------------- ------------------ ---
QLCAFE           CREATE PROCEDURE   NO
QLCAFE           CREATE SEQUENCE    NO
QLCAFE           CREATE SESSION     NO
QLCAFE           CREATE TABLE       NO
QLCAFE           CREATE TRIGGER     NO
QLCAFE           CREATE VIEW        NO
ROLE_QUAN_LY     CREATE SESSION     NO
ROLE_THU_KHO     CREATE SESSION     NO
ROLE_THU_NGAN    CREATE SESSION     NO
```

```sql
SELECT grantee, table_name, LISTAGG(privilege, ', ') WITHIN GROUP (ORDER BY privilege) AS quyen
  FROM dba_tab_privs WHERE grantee IN ('ROLE_THU_NGAN', 'ROLE_THU_KHO')
 GROUP BY grantee, table_name ORDER BY grantee, table_name;
```

```
GRANTEE          TABLE_NAME       QUYEN
---------------- ---------------- --------------------------------
ROLE_THU_KHO     CT_PHIEU_NHAP    DELETE, INSERT, SELECT, UPDATE
ROLE_THU_KHO     NGUYEN_LIEU      DELETE, INSERT, SELECT, UPDATE
ROLE_THU_KHO     NHA_CUNG_CAP     DELETE, INSERT, SELECT, UPDATE
ROLE_THU_KHO     PHIEU_NHAP       DELETE, INSERT, SELECT, UPDATE
ROLE_THU_KHO     V_TON_KHO        SELECT
ROLE_THU_NGAN    CT_HOA_DON       INSERT, SELECT
ROLE_THU_NGAN    HOA_DON          INSERT, SELECT
ROLE_THU_NGAN    LOAI_MON         SELECT
ROLE_THU_NGAN    MON              SELECT
ROLE_THU_NGAN    MON_SIZE         SELECT
```

```sql
SELECT grantee, COUNT(DISTINCT table_name) AS so_doi_tuong, COUNT(*) AS so_quyen
  FROM dba_tab_privs WHERE grantee LIKE 'ROLE\_%' ESCAPE '\' GROUP BY grantee ORDER BY grantee;
```

```
GRANTEE          SO_DOI_TUONG   SO_QUYEN
---------------- ------------ ----------
ROLE_QUAN_LY               14         53
ROLE_THU_KHO                5         17
ROLE_THU_NGAN               5          7
```

```sql
SELECT resource_name, limit FROM dba_profiles
 WHERE profile = 'PF_NHAN_VIEN' AND limit <> 'DEFAULT' ORDER BY resource_name;
```

```
RESOURCE_NAME            LIMIT
------------------------ ------------
FAILED_LOGIN_ATTEMPTS    3
IDLE_TIME                30
PASSWORD_LIFE_TIME       90
PASSWORD_LOCK_TIME       .0006
SESSIONS_PER_USER        2
```

Chụp màn hình: ba lỗi `ORA-41900`, `ORA-00942`, `ORA-01031`; `ORA-28000` khi tài khoản bị khoá; bảng quyền đối tượng của từng role.

---

## 5. Export / Import một schema

Dùng Oracle Data Pump (`expdp`, `impdp`). Hai chương trình này chạy từ dòng lệnh hệ điều hành trong container, không phải trong SQL*Plus.

### 5.1 Tạo directory object

Data Pump chỉ đọc/ghi file trong thư mục đã khai báo với database.

```powershell
docker exec oracle-btl mkdir -p /opt/oracle/oradata/dpump
```

Trong SQL*Plus, đăng nhập kiểu (b):

```sql
CREATE OR REPLACE DIRECTORY dp_dir AS '/opt/oracle/oradata/dpump';
SELECT directory_name, directory_path FROM dba_directories WHERE directory_name = 'DP_DIR';
```

```
DIRECTORY_NA DIRECTORY_PATH
------------ ----------------------------------------
DP_DIR       /opt/oracle/oradata/dpump
```

### 5.2 Export schema `QLCAFE`

File dump cũ trùng tên phải xoá trước, nếu không `expdp` báo lỗi:

```powershell
docker exec oracle-btl rm -f /opt/oracle/oradata/dpump/qlcafe_schema.dmp
docker exec oracle-btl expdp system/Oracle_123456@//localhost:1521/FREEPDB1 schemas=QLCAFE directory=DP_DIR dumpfile=qlcafe_schema.dmp logfile=qlcafe_schema_exp.log
```

| Tham số | Ý nghĩa |
|---|---|
| `schemas=QLCAFE` | Export toàn bộ đối tượng của schema này |
| `directory=DP_DIR` | Thư mục chứa file dump và file log |
| `dumpfile=...` | Tên file dump (dạng nhị phân) |
| `logfile=...` | Tên file ghi lại quá trình |

Kết quả:

```
Export: Release 23.26.3.0.0 - Production on Fri Oct 2 10:41:47 2026
Version 23.26.3.0.0

Connected to: Oracle AI Database 26ai Free Release 23.26.3.0.0 - Develop, Learn, and Run for Free
Starting "SYSTEM"."SYS_EXPORT_SCHEMA_01":  system/********@//localhost:1521/FREEPDB1 schemas=QLCAFE directory=DP_DIR dumpfile=qlcafe_schema.dmp logfile=qlcafe_schema_exp.log
Processing object type SCHEMA_EXPORT/TABLE/TABLE_DATA
Processing object type SCHEMA_EXPORT/TABLE/INDEX/STATISTICS/INDEX_STATISTICS
Processing object type SCHEMA_EXPORT/TABLE/STATISTICS/TABLE_STATISTICS
Processing object type SCHEMA_EXPORT/USER
Processing object type SCHEMA_EXPORT/SYSTEM_GRANT
Processing object type SCHEMA_EXPORT/DEFAULT_ROLE
Processing object type SCHEMA_EXPORT/TABLESPACE_QUOTA
Processing object type SCHEMA_EXPORT/PRE_SCHEMA/PROCACT_SCHEMA/LOGREP
Processing object type SCHEMA_EXPORT/TABLE/TABLE
Processing object type SCHEMA_EXPORT/TABLE/GRANT/OWNER_GRANT/OBJECT_GRANT
Processing object type SCHEMA_EXPORT/TABLE/IDENTITY_COLUMN
Processing object type SCHEMA_EXPORT/VIEW/VIEW
Processing object type SCHEMA_EXPORT/VIEW/GRANT/OWNER_GRANT/OBJECT_GRANT
Processing object type SCHEMA_EXPORT/TABLE/CONSTRAINT/CONSTRAINT
Processing object type SCHEMA_EXPORT/TABLE/CONSTRAINT/REF_CONSTRAINT
. . exported "QLCAFE"."CHUC_VU"                            6.1 KB       5 rows
. . exported "QLCAFE"."CONG_THUC"                            8 KB     102 rows
. . exported "QLCAFE"."CT_HOA_DON"                         7.9 KB      51 rows
. . exported "QLCAFE"."CT_PHIEU_NHAP"                      6.8 KB      21 rows
. . exported "QLCAFE"."HOA_DON"                              7 KB      23 rows
. . exported "QLCAFE"."LOAI_MON"                           6.3 KB       5 rows
. . exported "QLCAFE"."MON"                                7.4 KB      16 rows
. . exported "QLCAFE"."MON_SIZE"                           6.5 KB      41 rows
. . exported "QLCAFE"."NGUYEN_LIEU"                        7.3 KB      13 rows
. . exported "QLCAFE"."NHAN_VIEN"                          8.9 KB       9 rows
. . exported "QLCAFE"."NHA_CUNG_CAP"                       7.4 KB       5 rows
. . exported "QLCAFE"."PHIEU_NHAP"                         7.1 KB       8 rows
. . exported "QLCAFE"."TAI_KHOAN"                            8 KB       5 rows
Master table "SYSTEM"."SYS_EXPORT_SCHEMA_01" successfully loaded/unloaded
******************************************************************************
Dump file set for SYSTEM.SYS_EXPORT_SCHEMA_01 is:
  /opt/oracle/oradata/dpump/qlcafe_schema.dmp
Job "SYSTEM"."SYS_EXPORT_SCHEMA_01" successfully completed at Fri Oct 2 10:42:25 2026 elapsed 0 00:00:35
```

Số dòng của bạn sẽ khác nếu dữ liệu đã thay đổi so với thời điểm này.

### 5.3 Import vào schema mới `QLCAFE_BK`

`REMAP_SCHEMA` đổi tên schema khi import, nên dữ liệu gốc trong `QLCAFE` không bị ghi đè. User `QLCAFE_BK` được tạo tự động từ thông tin trong file dump.

```powershell
docker exec oracle-btl impdp system/Oracle_123456@//localhost:1521/FREEPDB1 directory=DP_DIR dumpfile=qlcafe_schema.dmp logfile=qlcafe_bk_imp.log remap_schema=QLCAFE:QLCAFE_BK
```

Kết quả:

```
Import: Release 23.26.3.0.0 - Production on Fri Oct 2 10:42:29 2026
Version 23.26.3.0.0

Connected to: Oracle AI Database 26ai Free Release 23.26.3.0.0 - Develop, Learn, and Run for Free
Master table "SYSTEM"."SYS_IMPORT_FULL_01" successfully loaded/unloaded
Starting "SYSTEM"."SYS_IMPORT_FULL_01":  system/********@//localhost:1521/FREEPDB1 directory=DP_DIR dumpfile=qlcafe_schema.dmp logfile=qlcafe_bk_imp.log remap_schema=QLCAFE:QLCAFE_BK
Processing object type SCHEMA_EXPORT/USER
Processing object type SCHEMA_EXPORT/SYSTEM_GRANT
Processing object type SCHEMA_EXPORT/DEFAULT_ROLE
Processing object type SCHEMA_EXPORT/TABLESPACE_QUOTA
Processing object type SCHEMA_EXPORT/PRE_SCHEMA/PROCACT_SCHEMA/LOGREP
Processing object type SCHEMA_EXPORT/TABLE/TABLE
Processing object type SCHEMA_EXPORT/TABLE/TABLE_DATA
. . imported "QLCAFE_BK"."CHUC_VU"                         6.1 KB       5 rows
. . imported "QLCAFE_BK"."CONG_THUC"                         8 KB     102 rows
. . imported "QLCAFE_BK"."CT_HOA_DON"                      7.9 KB      51 rows
. . imported "QLCAFE_BK"."CT_PHIEU_NHAP"                   6.8 KB      21 rows
. . imported "QLCAFE_BK"."HOA_DON"                           7 KB      23 rows
. . imported "QLCAFE_BK"."LOAI_MON"                        6.3 KB       5 rows
. . imported "QLCAFE_BK"."MON"                             7.4 KB      16 rows
. . imported "QLCAFE_BK"."MON_SIZE"                        6.5 KB      41 rows
. . imported "QLCAFE_BK"."NGUYEN_LIEU"                     7.3 KB      13 rows
. . imported "QLCAFE_BK"."NHAN_VIEN"                       8.9 KB       9 rows
. . imported "QLCAFE_BK"."NHA_CUNG_CAP"                    7.4 KB       5 rows
. . imported "QLCAFE_BK"."PHIEU_NHAP"                      7.1 KB       8 rows
. . imported "QLCAFE_BK"."TAI_KHOAN"                         8 KB       5 rows
Processing object type SCHEMA_EXPORT/TABLE/GRANT/OWNER_GRANT/OBJECT_GRANT
Processing object type SCHEMA_EXPORT/TABLE/IDENTITY_COLUMN
Processing object type SCHEMA_EXPORT/VIEW/VIEW
Processing object type SCHEMA_EXPORT/VIEW/GRANT/OWNER_GRANT/OBJECT_GRANT
Processing object type SCHEMA_EXPORT/TABLE/CONSTRAINT/CONSTRAINT
Processing object type SCHEMA_EXPORT/TABLE/INDEX/STATISTICS/INDEX_STATISTICS
Processing object type SCHEMA_EXPORT/TABLE/CONSTRAINT/REF_CONSTRAINT
Processing object type SCHEMA_EXPORT/TABLE/STATISTICS/TABLE_STATISTICS
Job "SYSTEM"."SYS_IMPORT_FULL_01" successfully completed at Fri Oct 2 10:43:00 2026 elapsed 0 00:00:29
```

Các quyền đã cấp cho role ở phần 4 cũng được import theo (dòng `OBJECT_GRANT`), áp trên các bảng của `QLCAFE_BK`.

### 5.4 Kiểm tra bản import khớp bản gốc

```sql
SELECT g.table_name,
       TO_NUMBER(EXTRACTVALUE(XMLTYPE(DBMS_XMLGEN.GETXML('select count(*) c from qlcafe.'    || g.table_name)), '/ROWSET/ROW/C')) AS qlcafe,
       TO_NUMBER(EXTRACTVALUE(XMLTYPE(DBMS_XMLGEN.GETXML('select count(*) c from qlcafe_bk.' || g.table_name)), '/ROWSET/ROW/C')) AS qlcafe_bk
  FROM dba_tables g WHERE g.owner = 'QLCAFE' ORDER BY g.table_name;
```

```
TABLE_NAME           QLCAFE  QLCAFE_BK
---------------- ---------- ----------
CHUC_VU                   5          5
CONG_THUC               102        102
CT_HOA_DON               51         51
CT_PHIEU_NHAP            21         21
HOA_DON                  23         23
LOAI_MON                  5          5
MON                      16         16
MON_SIZE                 41         41
NGUYEN_LIEU              13         13
NHAN_VIEN                 9          9
NHA_CUNG_CAP              5          5
PHIEU_NHAP                8          8
TAI_KHOAN                 5          5
```

```sql
SELECT owner, object_type, COUNT(*) AS so_luong FROM dba_objects
 WHERE owner IN ('QLCAFE', 'QLCAFE_BK') GROUP BY owner, object_type ORDER BY object_type, owner;
```

```
OWNER      OBJECT_TYPE    SO_LUONG
---------- ------------ ----------
QLCAFE     INDEX                21
QLCAFE_BK  INDEX                21
QLCAFE     SEQUENCE              9
QLCAFE_BK  SEQUENCE              9
QLCAFE     TABLE                13
QLCAFE_BK  TABLE                13
QLCAFE     VIEW                  1
QLCAFE_BK  VIEW                  1
```

```sql
SELECT owner, constraint_type, COUNT(*) AS so_rang_buoc FROM dba_constraints
 WHERE owner IN ('QLCAFE', 'QLCAFE_BK') AND constraint_name NOT LIKE 'SYS%' AND constraint_name NOT LIKE 'BIN$%'
 GROUP BY owner, constraint_type ORDER BY constraint_type, owner;
```

```
OWNER      C SO_RANG_BUOC
---------- - ------------
QLCAFE     C           17
QLCAFE_BK  C           17
QLCAFE     P           13
QLCAFE_BK  P           13
QLCAFE     R           12
QLCAFE_BK  R           12
QLCAFE     U            8
QLCAFE_BK  U            8
```

Bảng, view, index, sequence (của cột identity), ràng buộc và số dòng đều khớp.

### 5.5 Khôi phục một bảng bị xoá nhầm từ file dump

File dump của cả schema cũng dùng được để lấy lại riêng một bảng.

```sql
DROP TABLE qlcafe_bk.ct_phieu_nhap PURGE;
SELECT COUNT(*) AS so_bang FROM dba_tables WHERE owner = 'QLCAFE_BK';
```

```
   SO_BANG
----------
        12
```

```powershell
docker exec oracle-btl impdp system/Oracle_123456@//localhost:1521/FREEPDB1 directory=DP_DIR dumpfile=qlcafe_schema.dmp logfile=qlcafe_bk_imp_bang.log tables=QLCAFE.CT_PHIEU_NHAP remap_schema=QLCAFE:QLCAFE_BK
```

```
Starting "SYSTEM"."SYS_IMPORT_TABLE_01":  system/********@//localhost:1521/FREEPDB1 directory=DP_DIR dumpfile=qlcafe_schema.dmp logfile=qlcafe_bk_imp_bang.log tables=QLCAFE.CT_PHIEU_NHAP remap_schema=QLCAFE:QLCAFE_BK
Processing object type SCHEMA_EXPORT/TABLE/TABLE
Processing object type SCHEMA_EXPORT/TABLE/TABLE_DATA
. . imported "QLCAFE_BK"."CT_PHIEU_NHAP"                   6.8 KB      21 rows
Processing object type SCHEMA_EXPORT/TABLE/GRANT/OWNER_GRANT/OBJECT_GRANT
Processing object type SCHEMA_EXPORT/TABLE/CONSTRAINT/CONSTRAINT
Processing object type SCHEMA_EXPORT/TABLE/INDEX/STATISTICS/INDEX_STATISTICS
Processing object type SCHEMA_EXPORT/TABLE/CONSTRAINT/REF_CONSTRAINT
Processing object type SCHEMA_EXPORT/TABLE/STATISTICS/TABLE_STATISTICS
Job "SYSTEM"."SYS_IMPORT_TABLE_01" successfully completed at Fri Oct 2 10:43:55 2026 elapsed 0 00:00:27
```

```sql
SELECT COUNT(*) AS so_bang FROM dba_tables WHERE owner = 'QLCAFE_BK';
SELECT COUNT(*) AS so_dong_ct_phieu_nhap FROM qlcafe_bk.ct_phieu_nhap;
```

```
   SO_BANG
----------
        13

SO_DONG_CT_PHIEU_NHAP
---------------------
                   21
```

### 5.6 Chép file dump ra máy và dọn dẹp

```powershell
docker cp oracle-btl:/opt/oracle/oradata/dpump/qlcafe_schema.dmp C:\Project\BTL_Oracle\backup\qlcafe_schema.dmp
```

Xoá schema import thử:

```sql
DROP USER qlcafe_bk CASCADE;
```

Chụp màn hình: phần cuối của `expdp` (danh sách bảng và dòng `successfully completed`); phần `imported "QLCAFE_BK"...` của `impdp`; bảng so sánh số dòng hai schema.

---

## 6. Trạng thái của DB sau khi chạy xong

Sau khi các lệnh trong tài liệu được chạy ngày 02/10/2026, DB được trả về như sau:

| Hạng mục | Trạng thái |
|---|---|
| Instance, `FREEPDB1` | `OPEN`, `READ WRITE`, không hạn chế |
| Chế độ log | `NOARCHIVELOG` (như ban đầu) |
| `TBS_DEMO`, `TBS_DEMO_B`, bảng minh hoạ | Đã xoá |
| Schema `QLCAFE_BK` | Đã xoá |
| Thư mục `arch`, `backup_demo`, `demo` trong container | Đã xoá |
| Profile `PF_NHAN_VIEN`, 3 role, 3 user `nv_*` | **Giữ lại** |
| Directory object `DP_DIR` và thư mục `/opt/oracle/oradata/dpump` | **Giữ lại**, còn chứa `qlcafe_schema.dmp` |
| Schema `QLCAFE` | Không đổi: số dòng 13 bảng trước và sau khớp nhau |
| Thư mục `backup/` trên máy | `qlcafe_schema.dmp` và `qlcafe_antoan_20261002.dmp` (bản export an toàn chụp trước khi bắt đầu) |

Vì các đối tượng minh hoạ đã xoá, bạn chạy lại được phần 1, 2, 3 và 5 từ đầu theo đúng thứ tự trong tài liệu. Riêng phần 4 cần chạy khối `DROP` ở đầu phần đó trước.

Thứ tự gợi ý khi tự làm lại: phần 1 → phần 2 (trừ mục 2.6) → phần 3 → mục 2.6 và 3.6 → phần 4 → phần 5.

## 7. Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `ORA-01034: ORACLE not available` | Instance đang tắt | `sqlplus / as sysdba` rồi `STARTUP` |
| `ORA-12514` hoặc `ORA-12526` khi kết nối qua `@//localhost...` | DB chưa mở xong, hoặc đang ở chế độ restricted | Vào bằng `sqlplus / as sysdba`, kiểm tra `v$instance` và `v$pdbs` |
| `FREEPDB1` ở trạng thái `MOUNTED` sau khi khởi động | Đã khởi động bằng `RESTRICT` hoặc `READ ONLY` | `ALTER PLUGGABLE DATABASE freepdb1 OPEN;` hoặc `SHUTDOWN IMMEDIATE` rồi `STARTUP` |
| `ORA-65096` khi tạo user hoặc role | Đang ở CDB root thay vì PDB | `ALTER SESSION SET CONTAINER = freepdb1;` |
| `ORA-32771` khi thêm datafile | Tablespace kiểu bigfile | Tạo tablespace bằng `CREATE SMALLFILE TABLESPACE` |
| `ORA-00439: online move datafile` | Bản Free không có tính năng này | Dùng cách offline ở mục 2.4 |
| `ORA-01145` khi `ALTER DATABASE DATAFILE ... OFFLINE` | Database đang ở NOARCHIVELOG | Bật ARCHIVELOG (mục 3.1) |
| `ORA-00279` / được hỏi tên archive log khi `RECOVER` | Chưa bật tự động | `SET AUTORECOVERY ON` trước khi `RECOVER` |
| `ORA-39001`, `ORA-27038` khi `expdp` | File dump trùng tên đã tồn tại | Xoá file cũ hoặc đổi tên `dumpfile` |
| `ORA-31684: ... already exists` khi `impdp` | Schema đích đã có đối tượng | `DROP USER qlcafe_bk CASCADE;` rồi import lại |
| `ORA-01920`, `ORA-01921`, `ORA-02379` ở phần 4 | User, role hoặc profile đã tồn tại | Chạy khối `DROP` ở đầu phần 4 |
| Ứng dụng web báo lỗi kết nối sau khi tắt/mở DB | Kết nối cũ trong pool đã bị ngắt | Đợi DB mở xong rồi chạy lại `npm run dev` |

Các mã lỗi trong bảng này, ngoại trừ những mã đã xuất hiện ở các phần trên, được ghi theo hiểu biết chung về Oracle chứ không phải từ lần chạy này.
