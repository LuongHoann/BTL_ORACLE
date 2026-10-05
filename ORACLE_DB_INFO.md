# Oracle Database (Docker) – Thông tin cấu hình & tài khoản

> Khởi tạo ngày 2026-10-02. Đây là môi trường dev/học tập trên máy cá nhân, mật khẩu lưu dạng plain text — không dùng cho production.

## 1. Tổng quan

| Mục | Giá trị |
|---|---|
| Phiên bản DB | Oracle AI Database 26ai Free – Release 23.26.3.0.0 |
| Docker image | `gvenzl/oracle-free:slim-faststart` |
| Tên container | `oracle-btl` |
| Volume dữ liệu | `oracle-btl-data` → `/opt/oracle/oradata` |
| Restart policy | `unless-stopped` (tự chạy lại khi mở Docker Desktop) |
| File cấu hình | [docker-compose.yml](docker-compose.yml) |

## 2. Thông tin kết nối

| Mục | Giá trị |
|---|---|
| Host | `localhost` |
| Port | `1521` |
| Service name (PDB – dùng để làm việc) | `FREEPDB1` |
| Service name (CDB root – chỉ cho quản trị) | `FREE` |
| SID | `FREE` |

- JDBC URL: `jdbc:oracle:thin:@//localhost:1521/FREEPDB1`
- EZConnect: `localhost:1521/FREEPDB1`

## 3. Tài khoản

| Tài khoản | Mật khẩu | Vai trò | Ghi chú |
|---|---|---|---|
| `qlcafe` | `Cafe_123456` | Schema của đề tài quán café | Tạo bằng `sql/01_tao_tablespace_user.sql`. Tablespace mặc định `TBS_CAFE` |
| `btl_user` | `Btl_123456` | User ứng dụng (schema `BTL_USER`) | Do image tạo sẵn, dùng tablespace `USERS` nên không dùng cho đề tài |
| `system` | `Oracle_123456` | Quản trị (DBA) | Dùng để tạo user, cấp quyền |
| `sys` | `Oracle_123456` | Quản trị cao nhất | Phải đăng nhập với role `SYSDBA` |
| `pdbadmin` | `Oracle_123456` | Quản trị PDB | Chỉ trong `FREEPDB1` |

Dùng `qlcafe` cho mọi việc của đề tài; chỉ dùng `system`/`sys` khi cần quản trị.

### User minh hoạ phân quyền (mục 4)

User Oracle trong `FREEPDB1`, tạo để minh hoạ role và quyền; chi tiết trong `docs/HUONG_DAN_MUC_4_QUAN_TRI.md`.

| Tài khoản | Mật khẩu | Role | Được làm gì trên bảng của `qlcafe` |
|---|---|---|---|
| `nv_quanly` | `Quanly_123` | `ROLE_QUAN_LY` | Đọc, thêm, sửa, xoá mọi bảng |
| `nv_thungan` | `Thungan_123` | `ROLE_THU_NGAN` | Xem thực đơn; xem và thêm hoá đơn |
| `nv_thukho` | `Thukho_123` | `ROLE_THU_KHO` | Quản lý nguyên liệu, nhà cung cấp, phiếu nhập; xem tồn kho |

Cả ba dùng profile `PF_NHAN_VIEN`: sai mật khẩu 3 lần bị khoá 1 phút, mật khẩu hết hạn sau 90 ngày. Khi truy vấn phải ghi tên đầy đủ, ví dụ `qlcafe.mon`.

### Tài khoản của ứng dụng web

Đây là tài khoản lưu trong bảng `TAI_KHOAN` của schema `qlcafe`, không phải user của Oracle.

| Tên đăng nhập | Mật khẩu | Vai trò | Ghi chú |
|---|---|---|---|
| `admin` | `Admin_123` | Quản trị | Đăng nhập trang quản trị tại http://localhost:3000/admin |
| `binhtt`, `cuclt`, `emhv` | `Nhanvien_123` | Nhân viên | Không vào được trang quản trị |
| `dungpm` | `Nhanvien_123` | Nhân viên | Đang bị khoá |

Chạy lại `sql/04_du_lieu_mau.sql` sẽ đưa các tài khoản này về đúng mật khẩu trên.

## 4. Cách kết nối

### SQL Developer / DBeaver / DataGrip

- Host: `localhost` – Port: `1521`
- Chọn **Service name** (không phải SID): `FREEPDB1`
- Username: `qlcafe` – Password: `Cafe_123456`
- Với `sys`: chọn Role = `SYSDBA`

### SQL*Plus trong container

```powershell
# Schema đề tài
docker exec -it oracle-btl sqlplus qlcafe/Cafe_123456@//localhost:1521/FREEPDB1

# Quản trị
docker exec -it oracle-btl sqlplus system/Oracle_123456@//localhost:1521/FREEPDB1
docker exec -it oracle-btl sqlplus / as sysdba
```

## 5. Lệnh quản lý

Chạy tại thư mục `C:\Project\BTL_Oracle`:

```powershell
docker compose up -d        # Khởi động
docker compose stop         # Dừng (giữ nguyên dữ liệu)
docker compose start        # Chạy lại
docker compose logs -f      # Xem log
docker compose down         # Xoá container (dữ liệu vẫn còn trong volume)
docker compose down -v      # XOÁ CẢ DỮ LIỆU – không khôi phục được
```

## 6. Lưu ý

- Mật khẩu trong `docker-compose.yml` chỉ có tác dụng ở **lần khởi tạo đầu tiên** (khi volume còn trống). Muốn đổi mật khẩu sau đó:
  ```sql
  ALTER USER btl_user IDENTIFIED BY "MatKhauMoi";
  ```
  hoặc với `sys`/`system`: `docker exec oracle-btl resetPassword MatKhauMoi`
- Giới hạn của bản Free: tối đa 2 CPU, 2 GB RAM, 12 GB dữ liệu người dùng.
- Tạo thêm user mới (đăng nhập bằng `system` vào `FREEPDB1`):
  ```sql
  CREATE USER ten_user IDENTIFIED BY "MatKhau" QUOTA UNLIMITED ON USERS;
  GRANT CONNECT, RESOURCE TO ten_user;
  ```
- Chạy script khởi tạo tự động: mount thư mục chứa file `.sql` vào `/container-entrypoint-initdb.d` (chỉ chạy khi DB được tạo mới).
