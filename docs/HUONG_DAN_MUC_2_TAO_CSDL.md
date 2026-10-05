# Hướng dẫn thao tác tay – Mục 2: Tạo tablespace, user và các bảng

Tài liệu này mô tả từng bước để tự tay dựng CSDL quản lý quán café. Các lệnh SQL nằm sẵn trong thư mục `sql/`; bạn có thể chạy cả file hoặc gõ/dán từng lệnh.

| Bước | Việc làm | Đăng nhập bằng | Script |
|---|---|---|---|
| 0 | Kiểm tra container đang chạy | – | – |
| 1 | Tạo tablespace `TBS_CAFE` và user `QLCAFE` | `system` | `sql/01_tao_tablespace_user.sql` |
| 2 | Tạo 13 bảng, ràng buộc và view tồn kho | `qlcafe` | `sql/02_tao_bang.sql` |
| 3 | Kiểm tra kết quả | `system` | `sql/03_kiem_tra.sql` |
| 4 | Nhập dữ liệu mẫu | `qlcafe` | `sql/04_du_lieu_mau.sql` |
| – | Cập nhật CSDL cũ: thêm trạng thái món "tạm hết" | `qlcafe` | `sql/06_cap_nhat_trang_thai_mon.sql` |
| – | Xoá bảng để tạo lại cấu trúc (giữ user, tablespace) | `qlcafe` | `sql/98_xoa_bang.sql` |
| – | Xoá hết để làm lại | `system` | `sql/99_xoa_tat_ca.sql` |

Thư mục `sql/` trên máy được gắn vào container tại đường dẫn `/sql`, nên sửa file trên máy là container thấy ngay.

## Bước 0 – Kiểm tra container

Mở PowerShell tại `C:\Project\BTL_Oracle`:

```powershell
docker ps --filter name=oracle-btl
```

Cột `STATUS` phải có chữ `(healthy)`. Nếu chưa chạy: `docker compose up -d`.

## Bước 1 – Tạo tablespace và user (bằng SYSTEM)

Đăng nhập SQL*Plus với tài khoản quản trị, vào PDB `FREEPDB1`:

```powershell
docker exec -it oracle-btl sqlplus system/Oracle_123456@//localhost:1521/FREEPDB1
```

Tại dấu nhắc `SQL>`, chạy cả file:

```sql
@/sql/01_tao_tablespace_user.sql
```

Hoặc gõ tay từng lệnh:

```sql
CREATE TABLESPACE tbs_cafe
    DATAFILE '/opt/oracle/oradata/FREE/FREEPDB1/tbs_cafe01.dbf'
    SIZE 100M
    AUTOEXTEND ON NEXT 10M MAXSIZE 500M;

CREATE USER qlcafe IDENTIFIED BY "Cafe_123456"
    DEFAULT TABLESPACE tbs_cafe
    TEMPORARY TABLESPACE temp
    QUOTA UNLIMITED ON tbs_cafe;

GRANT CREATE SESSION, CREATE TABLE, CREATE VIEW,
      CREATE SEQUENCE, CREATE PROCEDURE, CREATE TRIGGER
   TO qlcafe;
```

Kết quả mong đợi: `Tablespace created.` → `User created.` → `Grant succeeded.`

Giải thích:

- `DATAFILE ... SIZE 100M`: file dữ liệu vật lý của tablespace, ban đầu 100 MB.
- `AUTOEXTEND ON NEXT 10M MAXSIZE 500M`: đầy thì tự nới thêm 10 MB mỗi lần, tối đa 500 MB.
- `DEFAULT TABLESPACE tbs_cafe`: mọi bảng `qlcafe` tạo ra sẽ nằm trong tablespace mới này (yêu cầu bắt buộc của đề).
- `QUOTA UNLIMITED ON tbs_cafe`: cho phép user dùng dung lượng trong tablespace; thiếu dòng này sẽ lỗi `ORA-01950` khi thêm dữ liệu.

Gõ `exit` để thoát.

## Bước 2 – Tạo các bảng (bằng QLCAFE)

Đăng nhập bằng user mới:

```powershell
docker exec -it oracle-btl sqlplus qlcafe/Cafe_123456@//localhost:1521/FREEPDB1
```

```sql
@/sql/02_tao_bang.sql
```

Kết quả mong đợi: 13 dòng `Table created.` và 1 dòng `View created.`

Nếu muốn gõ tay từng bảng, mở `sql/02_tao_bang.sql` và dán lần lượt theo đúng thứ tự trong file. Bảng cha phải tạo trước bảng con:

1. `LOAI_MON` → `MON` → `MON_SIZE`
2. `CHUC_VU` → `NHAN_VIEN` → `TAI_KHOAN`
3. `HOA_DON` → `CT_HOA_DON`
4. `NHA_CUNG_CAP`, `NGUYEN_LIEU` → `PHIEU_NHAP` → `CT_PHIEU_NHAP`
5. `CONG_THUC`
6. View `V_TON_KHO`

Một số điểm thiết kế cần biết khi trình bày:

- **Kích cỡ**: giá bán nằm ở `MON_SIZE` (mỗi món một dòng cho mỗi kích cỡ S / M / L; món không chia size dùng một dòng F). `CT_HOA_DON` và `CONG_THUC` đều tham chiếu tới cặp (món, kích cỡ).
- **Tồn kho không lưu thành cột**: view `V_TON_KHO` tính tồn = tổng nhập − lượng tiêu hao theo công thức của các hoá đơn đã thanh toán. Hoá đơn đã huỷ (`DA_HUY`) không được tính.
- **Tài khoản**: `TAI_KHOAN.mat_khau` lưu chuỗi băm scrypt, không lưu mật khẩu rõ.
- **Trạng thái món**: `CON_BAN` (đặt được), `TAM_HET` (hiện "Hết hàng", không đặt được), `NGUNG_BAN` (ẩn khỏi thực đơn). CSDL dựng trước khi có `TAM_HET` thì chạy thêm `@/sql/06_cap_nhat_trang_thai_mon.sql`; script chỉ đổi ràng buộc CHECK, không xoá dữ liệu.

Kiểm tra nhanh ngay trong phiên này:

```sql
SELECT table_name, tablespace_name FROM user_tables ORDER BY table_name;
DESC mon
```

## Bước 3 – Kiểm tra kết quả (bằng SYSTEM)

```powershell
docker exec -it oracle-btl sqlplus system/Oracle_123456@//localhost:1521/FREEPDB1
```

```sql
@/sql/03_kiem_tra.sql
```

Kết quả mong đợi:

- Tablespace `TBS_CAFE`, 1 datafile `tbs_cafe01.dbf`, 100 MB, autoextend `YES`, tối đa 500 MB.
- User `QLCAFE`, default tablespace `TBS_CAFE`, trạng thái `OPEN`.
- 13 bảng, tất cả nằm trong `TBS_CAFE`.
- 50 ràng buộc có tên: 13 khoá chính, 12 khoá ngoại, 8 unique, 17 check.

Chụp màn hình các kết quả này để đưa vào báo cáo.

## Bước 4 – Nhập dữ liệu mẫu (bằng QLCAFE)

Script có tiếng Việt có dấu nên phải đặt `NLS_LANG` khi mở SQL*Plus, nếu không chữ sẽ bị hỏng:

```powershell
docker exec -it -e NLS_LANG=AMERICAN_AMERICA.AL32UTF8 oracle-btl sqlplus qlcafe/Cafe_123456@//localhost:1521/FREEPDB1
```

```sql
@/sql/04_du_lieu_mau.sql
```

Script xoá dữ liệu cũ rồi nhập lại, nên chạy nhiều lần được. Số bản ghi sau khi chạy:

| Bảng | Số dòng | Bảng | Số dòng |
|---|---|---|---|
| `LOAI_MON` | 5 | `CT_HOA_DON` | 49 |
| `MON` | 15 | `NHA_CUNG_CAP` | 5 |
| `MON_SIZE` | 41 | `NGUYEN_LIEU` | 13 |
| `CHUC_VU` | 5 | `PHIEU_NHAP` | 8 |
| `NHAN_VIEN` | 8 | `CT_PHIEU_NHAP` | 21 |
| `TAI_KHOAN` | 5 | `CONG_THUC` | 102 |
| `HOA_DON` | 22 | | |

Tài khoản mẫu: `admin` / `Admin_123` (quản trị); `binhtt`, `cuclt`, `dungpm` (đang khoá), `emhv` / `Nhanvien_123` (nhân viên).

Nếu chạy bằng DBeaver / SQL Developer thì không cần `NLS_LANG`, chỉ cần mở file ở dạng UTF-8.

## Làm bằng công cụ đồ hoạ (SQL Developer / DBeaver)

Tạo 2 kết nối, cùng Host `localhost`, Port `1521`, **Service name** `FREEPDB1`:

| Kết nối | Username | Password | Dùng cho |
|---|---|---|---|
| Quản trị | `system` | `Oracle_123456` | Bước 1 và 3 |
| Đề tài | `qlcafe` | `Cafe_123456` | Bước 2 (tạo sau khi xong bước 1) |

Mở file `.sql` tương ứng trong từng kết nối và chạy toàn bộ script (SQL Developer: F5; DBeaver: Alt+X). Riêng `03_kiem_tra.sql` có các lệnh `SET`, `COLUMN`, `PROMPT` của SQL*Plus: SQL Developer chạy được, DBeaver thì chỉ chạy các câu `SELECT`.

### Hiển thị lược đồ quan hệ

- **DBeaver**: kết nối `qlcafe` → chuột phải vào schema `QLCAFE` → *View Diagram*.
- **SQL Developer**: *File → Data Modeler → Import → Data Dictionary* → chọn kết nối `qlcafe` → chọn schema `QLCAFE` → chọn cả 13 bảng.

## Làm lại từ đầu

Đăng nhập bằng `system` rồi chạy:

```sql
@/sql/99_xoa_tat_ca.sql
```

Script xoá user `QLCAFE` cùng mọi bảng, và xoá tablespace `TBS_CAFE` cùng datafile. Sau đó làm lại từ bước 1.

Nếu chỉ cần tạo lại cấu trúc bảng (ví dụ sau khi sửa `02_tao_bang.sql`) thì đăng nhập bằng `qlcafe` và chạy `@/sql/98_xoa_bang.sql`, rồi làm lại từ bước 2. Cách này giữ nguyên user và tablespace, và chạy được cả khi DBeaver đang kết nối.

## Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `ORA-01543: tablespace 'TBS_CAFE' already exists` | Đã chạy bước 1 rồi | Bỏ qua, hoặc chạy script 99 để làm lại |
| `ORA-01920: user name 'QLCAFE' conflicts...` | User đã tồn tại | Như trên |
| `ORA-65096: invalid common user or role name` | Đang ở CDB root (`FREE`) thay vì PDB | Đăng nhập lại với service `FREEPDB1` |
| `ORA-01017: invalid username/password` | Sai mật khẩu, hoặc chưa tạo user | Kiểm tra lại bước 1 |
| `ORA-00955: name is already used by an existing object` | Bảng đã tồn tại | Bỏ qua, hoặc `DROP TABLE ten_bang CASCADE CONSTRAINTS;` |
| `ORA-00942: table or view does not exist` khi tạo bảng | Tạo bảng con trước bảng cha | Tạo theo đúng thứ tự ở bước 2 |
| `ORA-01940: cannot drop a user who is currently connected` | Còn phiên đang đăng nhập bằng `qlcafe` (ví dụ DBeaver) | Ngắt kết nối `qlcafe` ở mọi công cụ rồi chạy lại script 99 |
| `SP2-0310: unable to open file` | Sai đường dẫn script | Dùng đường dẫn trong container: `/sql/...` |
