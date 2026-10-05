# BTL môn Oracle – Đề số 12: Xây dựng CSDL hệ thống quản lý quán café

## Yêu cầu chung của bài tập lớn (tiêu chí chấm)

| # | Nội dung | Điểm |
|---|---|---|
| 1 | Giới thiệu đề tài, mô tả các thực thể, mối quan hệ các thực thể | 0.5 |
| 2 | Xây dựng CSDL | 2.5 |
| 3 | Truy vấn SQL | 1 |
| 4 | Quản trị CSDL Oracle | 5 |
| 5 | Ứng dụng web kết nối CSDL Oracle | 1 |

### 1. Giới thiệu đề tài (0.5đ)

- Giới thiệu đề tài.
- Mô tả các thực thể.
- Mối quan hệ giữa các thực thể.

### 2. Xây dựng CSDL (2.5đ)

- Tạo các bảng, khoá chính, liên kết giữa các bảng, các ràng buộc.
- Hiển thị lược đồ quan hệ.
- Nhập dữ liệu: **tối thiểu 5 bản ghi mỗi bảng**.
- **Bắt buộc**: các bảng của đề tài được tạo trong **1 user mới**, dữ liệu lưu trong **1 tablespace mới hoàn toàn**, không dùng tablespace có sẵn (`USERS`, `SYSTEM`...).

### 3. Truy vấn SQL (1đ)

- **Tối thiểu 10 truy vấn**, gồm: truy vấn cơ bản, truy vấn lồng nhau, truy vấn nhóm, các hàm thống kê...

### 4. Quản trị CSDL Oracle (5đ)

- **Quản lý Instance**: minh hoạ các chế độ startup, shutdown database, read only, restricted session...
- **Quản lý Tablespace & Datafile**:
  - Thêm, sửa, xoá tablespace.
  - Di chuyển vị trí các datafile.
  - Bật/tắt tự động mở rộng (autoextend) của 1 datafile.
  - Truy vấn thông tin liên quan đến tablespace và datafile.
  - Khôi phục datafile bị mất.
- **Quản trị người dùng, phân quyền, chức danh** (user, privilege, role).
- **Minh hoạ import, export 1 schema**.

### 5. Ứng dụng web (1đ)

- Ứng dụng đơn giản chạy trên web, kết nối CSDL Oracle; công nghệ tự chọn (Oracle Forms, Oracle APEX, Java, PHP...).
- Mức tối thiểu theo ví dụ của đề: hiển thị danh sách và thêm, sửa, xoá thông tin cơ bản.

## Phạm vi đề tài (đã chốt)

- Một quán café, gồm: thực đơn, bán hàng, nhân viên, **kho nguyên liệu (bắt buộc)**.
- **Không làm** khuyến mại, voucher, quản lý bàn và khách hàng.
- Hoá đơn **không** ghi nhân viên lập (`HOA_DON` không có `ma_nv`) vì không đúng luồng thực tế; nhân viên chỉ gắn với phiếu nhập.
- `NGUYEN_LIEU.don_gia_nhap` là giá nhập hiện tại trên 1 đơn vị, dùng để tính giá vốn và lợi nhuận món qua `CONG_THUC`.
- Truy vấn viết dạng SQL thô, dễ hiểu (JOIN, GROUP BY, subquery không tương quan); tránh CTE, `NOT EXISTS`, subquery tương quan.
- Món có kích cỡ đầy đủ: giá riêng (`MON_SIZE`) và công thức riêng (`CONG_THUC`) theo từng size S / M / L; món không chia size dùng size `F`.
- Thanh toán **không** trừ kho. Tồn kho không lưu thành cột mà tính trong view `V_TON_KHO`: tổng nhập − tiêu hao theo công thức của hoá đơn `DA_TT`. Hoá đơn `DA_HUY` (order nhầm) không tính vào doanh thu lẫn tồn kho.
- Chỉ admin đăng nhập (bảng `TAI_KHOAN`, mật khẩu băm scrypt); trang bán hàng mở tự do; chỉ admin huỷ được hoá đơn.
- Món có 3 trạng thái: `CON_BAN`, `TAM_HET` (hiện "Hết hàng", không đặt được; ai cũng bật/tắt được ở tab riêng `/bat-tat-mon`, không cần đăng nhập; trạng thái theo món nên tắt là tắt mọi size), `NGUNG_BAN` (ẩn hẳn, chỉ admin đổi).
- 13 bảng: `LOAI_MON`, `MON`, `MON_SIZE`, `CHUC_VU`, `NHAN_VIEN`, `TAI_KHOAN`, `HOA_DON`, `CT_HOA_DON`, `NHA_CUNG_CAP`, `NGUYEN_LIEU`, `PHIEU_NHAP`, `CT_PHIEU_NHAP`, `CONG_THUC`.

## Môi trường

- Oracle AI Database 26ai Free chạy bằng Docker, container `oracle-btl`, cấu hình ở `docker-compose.yml`.
- Thông tin kết nối và tài khoản: xem `ORACLE_DB_INFO.md`.
- Kiến trúc multitenant: CDB `FREE`, PDB làm việc `FREEPDB1`. Tablespace, user, bảng của đề tài tạo trong `FREEPDB1`.
- User `btl_user` do image tạo sẵn đang dùng tablespace mặc định `USERS` → **không đạt yêu cầu mục 2**; schema của đề tài phải là user mới gắn với tablespace mới.

- Schema đề tài: user `qlcafe`, tablespace `TBS_CAFE` (script trong `sql/`, hướng dẫn thao tác tay trong `docs/`). Thư mục `sql/` được mount vào container tại `/sql`.
- Script 01, 02 và 04 đã được áp dụng vào DB ngày 2026-10-02 (tablespace, user, 13 bảng, view, dữ liệu mẫu). Mục 2 đã xong.
- Thay đổi nhỏ trên DB đang có dữ liệu của người dùng: viết script `ALTER` riêng (ví dụ `sql/06_cap_nhat_trang_thai_mon.sql`) và sửa song song `02_tao_bang.sql`, không dựng lại bảng.
- Đổi cấu trúc bảng lớn: sửa `sql/02_tao_bang.sql`, chạy `sql/98_xoa_bang.sql` (bằng `qlcafe`) rồi 02 và 04.
- Mục 5 đã xong: ứng dụng Next.js trong `web/`, hướng dẫn trong `docs/HUONG_DAN_MUC_5_WEB.md`. 
- Mục 4 đã xong ngày 2026-10-02: tài liệu `docs/HUONG_DAN_MUC_4_QUAN_TRI.md`, mọi lệnh đã chạy thật trên `oracle-btl` (người dùng chọn chạy trên DB thật). Còn lại mục 1 (phần viết giới thiệu).
- Đặc điểm môi trường ảnh hưởng tới quản trị: image `slim` **không có RMAN** (có `expdp`/`impdp`, chạy được); tablespace mặc định là BIGFILE (thêm datafile cần `CREATE SMALLFILE TABLESPACE`); bản Free không có online move datafile (`ORA-00439`); DB chạy NOARCHIVELOG.
- Đối tượng quản trị được giữ lại trong `FREEPDB1`: profile `PF_NHAN_VIEN`, role `ROLE_QUAN_LY` / `ROLE_THU_NGAN` / `ROLE_THU_KHO`, user `nv_quanly` / `nv_thungan` / `nv_thukho`, directory `DP_DIR` (`/opt/oracle/oradata/dpump`). Bản export của `QLCAFE` nằm trong `backup/`.
- Trước thao tác quản trị có rủi ro trên DB thật: export `QLCAFE` ra `backup/` trước, chỉ làm thao tác phá huỷ trên tablespace minh hoạ, và đối chiếu số dòng 13 bảng sau cùng.
- Mục 3 đã xong: 15 truy vấn trong `sql/05_truy_van.sql`, kết quả chạy trong `docs/HUONG_DAN_MUC_3_TRUY_VAN.md`.
- Trong script chạy bằng SQL*Plus, không đặt chú thích `--` sau dấu `;` cùng dòng (câu lệnh sẽ bị bỏ qua).
- `sql/99_xoa_tat_ca.sql` lỗi `ORA-01940` nếu còn phiên `qlcafe` đang kết nối (DBeaver của người dùng).
- Script có tiếng Việt có dấu: chạy SQL*Plus với `docker exec -e NLS_LANG=AMERICAN_AMERICA.AL32UTF8 ...`, nếu không chữ sẽ hỏng.

## Ứng dụng web (`web/`)

- Next.js 16 (App Router, TypeScript, Tailwind 4) + `oracledb` thin mode, nối thẳng `FREEPDB1` bằng `qlcafe`; cấu hình trong `web/.env.local`. Next.js 16 khác bản cũ: đọc `web/AGENTS.md` trước khi sửa code.
- Đọc dữ liệu trong Server Component, ghi bằng Server Action (`web/app/actions.ts` cho bán hàng, `web/app/admin/actions.ts` cho quản trị). Mọi action quản trị gọi `yeuCauAdmin()`.
- SQL viết thô trong từng trang; tên định danh, giao diện và thông báo bằng tiếng Việt.
- Danh mục một bảng (nhóm món, chức vụ, nhân viên, nhà cung cấp, nguyên liệu) dùng chung trang, cấu hình trong `web/lib/danh-muc.ts`.
- Quy ước giao diện quản trị (người dùng yêu cầu): trang danh sách có tìm kiếm / bộ lọc và không chứa form nhập; thêm và sửa dùng chung một trang form riêng (`.../moi` và `.../<mã>`).
- Người dùng tự chạy `npm run dev` ở cổng 3000 và tự tạo dữ liệu khi dùng thử: khi thử nghiệm, chạy bản build ở cổng khác và chỉ xoá các dòng do bài thử tạo ra, **không** chạy lại `sql/04_du_lieu_mau.sql` nếu chưa hỏi.
- `SYSDATE` của container là UTC: ứng dụng đặt múi giờ phiên `Asia/Ho_Chi_Minh` và dùng `CURRENT_DATE` khi ghi ngày giờ.
- Kiểm tra sau khi sửa: `npx tsc --noEmit` và `npm run lint` trong `web/`. Khi cần bản build để thử mà `npm run dev` của người dùng đang chạy: `NEXT_DIST_DIR=.next-thu npx next build` rồi `next start -p 3100` với cùng biến môi trường (không build vào `.next`); lệnh build này tự sửa `tsconfig.json`, cần khôi phục lại sau đó.

## Quy ước làm việc

- Làm từng phần, thảo luận và chốt thiết kế với người dùng trước khi dựng.
- Mọi thao tác trên DB lưu thành script `.sql` chạy lại được từ đầu, để đưa vào báo cáo.
- Phần quản trị (mục 4) cần lưu cả lệnh lẫn kết quả chạy để làm minh hoạ.
