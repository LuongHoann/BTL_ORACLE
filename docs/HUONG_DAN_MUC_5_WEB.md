# Mục 5 – Ứng dụng web quản lý quán café

Ứng dụng nằm trong thư mục `web/`, viết bằng Next.js, phần server nối thẳng tới Oracle và chạy các câu SQL; không có tầng API riêng.

| Thành phần | Lựa chọn |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Giao diện | Tailwind CSS 4 |
| Kết nối CSDL | thư viện `oracledb` (thin mode, không cần cài Oracle Client) |
| CSDL | `FREEPDB1`, schema `qlcafe` |

## Chạy ứng dụng

Yêu cầu: container `oracle-btl` đang chạy và đã có dữ liệu (xem hướng dẫn mục 2), máy có Node.js 20 trở lên.

```powershell
cd C:\Project\BTL_Oracle\web
npm install        # chỉ cần lần đầu
npm run dev
```

Mở http://localhost:3000.

Thông tin kết nối nằm trong `web/.env.local`:

```
ORACLE_USER=qlcafe
ORACLE_PASSWORD=Cafe_123456
ORACLE_CONNECT_STRING=localhost:1521/FREEPDB1
SESSION_SECRET=<chuỗi ngẫu nhiên dùng để ký cookie đăng nhập>
```

File này không được đưa lên git. Trên máy khác, chép `web/.env.example` thành `.env.local` rồi điền mật khẩu và một chuỗi ngẫu nhiên cho `SESSION_SECRET`.

Tài khoản quản trị mẫu: `admin` / `Admin_123`.

## Các màn hình

### Bán hàng (không cần đăng nhập)

| Đường dẫn | Chức năng |
|---|---|
| `/` | Thực đơn theo nhóm món; chọn kích cỡ và số lượng, thêm vào giỏ; giỏ hàng và nút thanh toán |
| `/hoa-don/<mã>` | Hoá đơn vừa thanh toán hoặc chi tiết một hoá đơn cũ |
| `/hoa-don` | Lịch sử hoá đơn, lọc theo khoảng ngày và trạng thái |
| `/bat-tat-mon` | Bật/tắt món: báo một món hết hàng hoặc mở bán lại; tìm theo tên, lọc theo nhóm và trạng thái |

Luồng: chọn món → thêm vào giỏ → thanh toán → hiện hoá đơn → xem lại trong lịch sử → xem chi tiết.

### Bật/tắt nhanh món hết hàng

Tab "Bật/tắt món" trên thanh điều hướng (cạnh "Đặt món" và "Lịch sử hoá đơn") liệt kê các món kèm nút "Báo hết hàng" hoặc "Mở bán lại". Không cần đăng nhập.

Trạng thái nằm ở món chứ không ở từng kích cỡ: tắt một món là tắt toàn bộ kích cỡ của món đó.

Món có ba trạng thái:

| Trạng thái | Trên trang đặt món | Ai đổi |
|---|---|---|
| Còn bán (`CON_BAN`) | Hiện, đặt được | – |
| Tạm hết (`TAM_HET`) | Hiện mờ kèm nhãn "Hết hàng", không đặt được | Ai cũng bật/tắt được trên trang đặt món |
| Ngừng bán (`NGUNG_BAN`) | Ẩn hẳn | Chỉ quản trị viên, trong form sửa món |

Nút bật/tắt nhanh chỉ chuyển giữa Còn bán và Tạm hết; món đã Ngừng bán không mở lại được từ đây. Nếu giỏ hàng đang có món vừa bị báo hết, nút thanh toán bị khoá và máy chủ cũng từ chối thanh toán, báo rõ tên món.

### Quản trị (đăng nhập tại `/admin`)

| Đường dẫn | Chức năng |
|---|---|
| `/admin` | Bảng điều khiển: doanh thu hôm nay và tháng này, nguyên liệu sắp hết, món bán chạy |
| `/admin/loai-mon` | Nhóm món; tìm theo tên, mô tả |
| `/admin/mon` | Món; tìm theo tên, lọc theo nhóm và trạng thái |
| `/admin/mon/<mã>` | Sửa món; giá theo từng kích cỡ; công thức nguyên liệu theo từng kích cỡ, kèm giá vốn và lãi |
| `/admin/nguyen-lieu` | Nguyên liệu kèm tổng nhập, đã tiêu hao, tồn kho; tìm theo tên, lọc theo mức tồn |
| `/admin/nha-cung-cap` | Nhà cung cấp; tìm theo tên, địa chỉ, số điện thoại, email |
| `/admin/nhap-kho` | Phiếu nhập; lọc theo nhà cung cấp và khoảng ngày; lập, xem và xoá phiếu |
| `/admin/chuc-vu` | Chức vụ; tìm theo tên |
| `/admin/nhan-vien` | Nhân viên; tìm theo họ tên, số điện thoại, địa chỉ; lọc theo chức vụ và giới tính |
| `/admin/tai-khoan` | Tài khoản; tìm theo tên đăng nhập, họ tên; lọc theo vai trò và trạng thái; khoá / mở khoá, xoá |
| `/admin/doanh-thu` | Doanh thu theo ngày / tháng / năm, lọc theo khoảng ngày |
| `/admin/mon-ban` | Các món bán trong một ngày kèm số lượng; chọn được ngày và nhóm món |

Mọi danh mục theo cùng một cách bố trí:

- **Trang danh sách** chỉ để xem: có ô tìm kiếm và bộ lọc ở trên, nút "Thêm mới" ở góc phải, mỗi dòng có nút "Sửa" và "Xoá".
- **Thêm và sửa dùng chung một trang form riêng**: `/admin/<danh mục>/moi` để thêm, `/admin/<danh mục>/<mã>` để sửa (form được điền sẵn). Lưu xong quay về danh sách kèm thông báo; nếu lỗi thì ở lại form và hiện lý do.
- Với món: form thêm chỉ có thông tin chung; sau khi thêm sẽ chuyển sang trang của món để nhập giá và công thức.
- Với tài khoản: khi sửa chỉ đổi được vai trò và đặt mật khẩu mới (để trống là giữ mật khẩu cũ).

Hoá đơn chỉ huỷ được khi đang đăng nhập quản trị: nút "Huỷ hoá đơn" nằm ở trang chi tiết hoá đơn.

## Quy tắc nghiệp vụ

- **Giá khi thanh toán** luôn được lấy lại từ CSDL; ứng dụng không dùng giá do trình duyệt gửi lên. Giá tại thời điểm bán được chép vào `CT_HOA_DON.don_gia`, nên đổi giá món sau này không làm sai hoá đơn cũ.
- **Thanh toán không trừ kho.** Tồn kho được tính trong view `V_TON_KHO`: tổng nhập trừ lượng tiêu hao theo công thức của các hoá đơn đã thanh toán.
- **Huỷ hoá đơn** (order nhầm) chuyển trạng thái sang `DA_HUY`, không xoá dữ liệu. Hoá đơn đã huỷ không được tính vào doanh thu, báo cáo món bán và tồn kho.
- **Lập phiếu nhập** ghi phiếu, các dòng chi tiết và cập nhật giá nhập hiện tại của nguyên liệu trong cùng một giao dịch; người lập là quản trị viên đang đăng nhập.
- **Món chưa có kích cỡ nào** thì chưa hiện trên thực đơn. Món không chia size dùng một kích cỡ "Một cỡ".
- **Không xoá được dữ liệu đang được dùng** (nhóm còn món, kích cỡ đã từng bán, nguyên liệu có trong công thức hoặc phiếu nhập...): CSDL chặn bằng khoá ngoại và ứng dụng hiện thông báo.
- **Mật khẩu** lưu dạng băm scrypt; không xem lại được, chỉ đặt lại. Quản trị viên không tự khoá hoặc tự xoá tài khoản của mình.

## Cấu trúc mã nguồn

| Vị trí | Nội dung |
|---|---|
| `web/lib/db.ts` | Pool kết nối Oracle, hàm chạy truy vấn, giao dịch, đổi lỗi `ORA-` thành thông báo tiếng Việt |
| `web/lib/auth.ts` | Băm và kiểm tra mật khẩu, cookie phiên đăng nhập có chữ ký |
| `web/lib/danh-muc.ts` | Cấu hình các danh mục một bảng (cột hiển thị, trường nhập, cột tìm kiếm, bộ lọc, câu SQL danh sách) |
| `web/app/admin/(quan-tri)/[danhmuc]/` | Trang danh sách và trang form dùng chung cho các danh mục một bảng |
| `web/app/actions.ts` | Thanh toán giỏ hàng |
| `web/app/admin/actions.ts` | Mọi thao tác ghi của khu vực quản trị |
| `web/app/page.tsx`, `web/app/hoa-don/` | Các trang bán hàng |
| `web/app/admin/` | Các trang quản trị |
| `web/components/` | Giỏ hàng, form phiếu nhập và các thành phần dùng chung |

Câu SQL được viết trực tiếp trong từng trang và từng thao tác, dùng tham số bind (`:ten`) cho mọi giá trị do người dùng nhập.

Ứng dụng đặt múi giờ phiên là `Asia/Ho_Chi_Minh` và dùng `CURRENT_DATE` khi ghi thời gian hoá đơn, vì `SYSDATE` của container Oracle là giờ UTC.

## Kiểm tra đã thực hiện

Ngày 02/10/2026, ứng dụng được build (`npm run build`), lint (`npm run lint`) và thử qua HTTP với 114 kiểm tra, tất cả đều đạt:

- Thanh toán: tạo hoá đơn, gộp dòng trùng, từ chối giỏ trống, số lượng âm, món ngừng bán, kích cỡ không tồn tại.
- Bật/tắt món: trang riêng mở được khi chưa đăng nhập; báo hết hàng và mở bán lại; tắt món là khoá cả ba size trên trang đặt món và không thanh toán được size nào; không đụng được tới món ngừng bán; admin đổi được cả ba trạng thái từ form sửa món.
- Phân quyền: chưa đăng nhập thì không huỷ hoá đơn, không ghi danh mục, không lập phiếu nhập; sai mật khẩu, tài khoản nhân viên, tài khoản bị khoá và cookie giả đều bị từ chối.
- Mọi trang quản trị mở được; số liệu báo cáo khớp với dữ liệu mẫu.
- Danh mục: thêm, sửa, từ chối tên trùng, chặn xoá dữ liệu đang được dùng; lỗi khi lưu quay lại đúng form đang nhập.
- Bộ lọc: tìm theo từ khoá và lọc theo danh sách chọn trên các trang nhân viên, nguyên liệu, món, phiếu nhập, tài khoản cho kết quả đúng; giá trị lọc lạ bị bỏ qua.
- Form: form sửa được điền sẵn dữ liệu, form thêm để trống, đường dẫn tới mã không tồn tại trả 404.
- Món: thêm món, thêm và sửa giá theo kích cỡ, nhập công thức, giá vốn tính đúng.
- Tồn kho: bán làm tồn giảm, huỷ hoá đơn làm tồn trở lại, nhập kho làm tồn tăng và cập nhật giá nhập.
- Tài khoản: tạo, sửa vai trò, giữ mật khẩu cũ khi để trống, đăng nhập bằng tài khoản mới, không tự khoá / tự xoá / tự bỏ quyền quản trị được.

Phần chưa kiểm tra: thao tác bằng chuột trên trình duyệt thật (giỏ hàng, trang bật/tắt món, form phiếu nhập) và hiển thị trên màn hình điện thoại.

Sau khi thử, các dòng do bài thử tạo ra đã được xoá. Muốn đưa dữ liệu về trạng thái mẫu ban đầu bất cứ lúc nào thì chạy lại `sql/04_du_lieu_mau.sql` (script này xoá toàn bộ dữ liệu hiện có, kể cả hoá đơn bạn đã tạo).
