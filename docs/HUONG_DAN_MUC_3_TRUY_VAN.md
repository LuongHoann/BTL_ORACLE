# Mục 3 – 15 truy vấn SQL

Toàn bộ câu lệnh nằm trong `sql/05_truy_van.sql`. Tài liệu này ghi mục đích, kỹ thuật và kết quả chạy thực tế của từng câu trên dữ liệu mẫu (chạy ngày 02/10/2026).

| Nhóm | Câu | Yêu cầu của đề |
|---|---|---|
| A – Cơ bản | 1–5 | Truy vấn cơ bản |
| B – Nhóm và thống kê | 6–11 | Nhóm truy vấn, hàm thống kê |
| C – Lồng nhau | 12–15 | Truy vấn lồng nhau |

Các thống kê bán hàng chỉ tính hoá đơn đã thanh toán (`DA_TT`); hoá đơn đã huỷ (`DA_HUY`) bị bỏ qua. Cột `KICH_CO`: S = nhỏ, M = vừa, L = lớn, F = một cỡ.

## Cách chạy

**DBeaver / SQL Developer**: kết nối bằng `qlcafe`, mở `sql/05_truy_van.sql`, đặt con trỏ vào câu cần chạy rồi nhấn Ctrl+Enter.

**SQL*Plus** (chạy cả 15 câu):

```powershell
docker exec -it -e NLS_LANG=AMERICAN_AMERICA.AL32UTF8 oracle-btl sqlplus qlcafe/Cafe_123456@//localhost:1521/FREEPDB1
```

```sql
SET LINESIZE 200
SET PAGESIZE 100
@/sql/05_truy_van.sql
```

Các câu chỉ đọc dữ liệu, không thay đổi gì trong DB. Câu 2 tính tuổi và thâm niên theo ngày hiện tại nên kết quả thay đổi theo thời gian. Kết quả dưới đây ứng với dữ liệu mẫu gốc; sau khi bán hàng hoặc nhập kho trên ứng dụng web thì số liệu sẽ khác.

## Nhóm A – Truy vấn cơ bản

### Câu 1. Thực đơn đang bán kèm kích cỡ và giá

Kỹ thuật: JOIN 3 bảng, WHERE, ORDER BY. Món ngừng bán ("Trà vải") không xuất hiện; bánh chỉ có một cỡ (F).

| TEN_LOAI | TEN_MON | KICH_CO | DON_GIA |
|---|---|---|---|
| Bánh ngọt | Bánh croissant | F | 28000 |
| Bánh ngọt | Bánh tiramisu | F | 35000 |
| Cà phê | Bạc xỉu | S | 27000 |
| Cà phê | Bạc xỉu | M | 32000 |
| Cà phê | Bạc xỉu | L | 39000 |
| Cà phê | Cappuccino | S | 40000 |
| Cà phê | Cappuccino | M | 45000 |
| Cà phê | Cappuccino | L | 52000 |
| Cà phê | Cà phê sữa | S | 24000 |
| Cà phê | Cà phê sữa | M | 29000 |
| Cà phê | Cà phê sữa | L | 36000 |
| Cà phê | Cà phê đen | S | 20000 |
| Cà phê | Cà phê đen | M | 25000 |
| Cà phê | Cà phê đen | L | 32000 |
| Cà phê | Latte | S | 40000 |
| Cà phê | Latte | M | 45000 |
| Cà phê | Latte | L | 52000 |
| Nước ép | Nước ép cam | S | 34000 |
| Nước ép | Nước ép cam | M | 39000 |
| Nước ép | Nước ép cam | L | 46000 |
| Nước ép | Nước ép dưa hấu | S | 30000 |
| Nước ép | Nước ép dưa hấu | M | 35000 |
| Nước ép | Nước ép dưa hấu | L | 42000 |
| Sinh tố | Sinh tố bơ | S | 40000 |
| Sinh tố | Sinh tố bơ | M | 45000 |
| Sinh tố | Sinh tố bơ | L | 52000 |
| Sinh tố | Sinh tố xoài | S | 37000 |
| Sinh tố | Sinh tố xoài | M | 42000 |
| Sinh tố | Sinh tố xoài | L | 49000 |
| Trà | Trà chanh | S | 20000 |
| Trà | Trà chanh | M | 25000 |
| Trà | Trà chanh | L | 32000 |
| Trà | Trà sữa trân châu | S | 30000 |
| Trà | Trà sữa trân châu | M | 35000 |
| Trà | Trà sữa trân châu | L | 42000 |
| Trà | Trà đào cam sả | S | 34000 |
| Trà | Trà đào cam sả | M | 39000 |
| Trà | Trà đào cam sả | L | 46000 |

### Câu 2. Nhân viên kèm chức vụ, lương, tuổi, số năm làm việc

Kỹ thuật: JOIN, hàm ngày `MONTHS_BETWEEN`, `TRUNC`.

| MA_NV | HO_TEN | TEN_CV | LUONG_CO_BAN | TUOI | SO_NAM_LAM_VIEC |
|---|---|---|---|---|---|
| 1 | Nguyễn Văn An | Quản lý | 15000000 | 36 | 3 |
| 4 | Phạm Minh Dũng | Pha chế | 9000000 | 30 | 3 |
| 6 | Vũ Thị Giang | Pha chế | 9000000 | 26 | 2 |
| 5 | Hoàng Văn Em | Thủ kho | 8500000 | 33 | 3 |
| 3 | Lê Thị Cúc | Thu ngân | 8000000 | 25 | 2 |
| 2 | Trần Thị Bình | Thu ngân | 8000000 | 28 | 3 |
| 8 | Bùi Thị Lan | Phục vụ | 6500000 | 22 | 1 |
| 7 | Đỗ Quang Huy | Phục vụ | 6500000 | 23 | 1 |

### Câu 3. Hoá đơn lập trong tháng 8/2026

Kỹ thuật: lọc theo khoảng ngày, `TO_CHAR` định dạng ngày. Tham số: ngày bắt đầu và ngày kết thúc.

| MA_HD | THOI_GIAN_LAP | TONG_TIEN | TRANG_THAI |
|---|---|---|---|
| 7 | 02/08/2026 08:00 | 124000 | DA_TT |
| 8 | 05/08/2026 15:45 | 126000 | DA_TT |
| 9 | 09/08/2026 20:15 | 214000 | DA_TT |
| 10 | 14/08/2026 09:30 | 100000 | DA_TT |
| 11 | 18/08/2026 13:00 | 149000 | DA_TT |
| 12 | 23/08/2026 17:20 | 157000 | DA_TT |
| 13 | 30/08/2026 10:50 | 142000 | DA_TT |

### Câu 4. Chi tiết hoá đơn số 9

Kỹ thuật: JOIN 3 bảng, cột tính toán. Tham số: mã hoá đơn.

| MA_HD | TEN_MON | KICH_CO | SO_LUONG | DON_GIA | THANH_TIEN |
|---|---|---|---|---|---|
| 9 | Bánh tiramisu | F | 2 | 35000 | 70000 |
| 9 | Trà sữa trân châu | M | 3 | 35000 | 105000 |
| 9 | Trà đào cam sả | M | 1 | 39000 | 39000 |

### Câu 5. Tồn kho và giá trị tồn của từng nguyên liệu

Kỹ thuật: truy vấn trên view `v_ton_kho` (tồn = tổng nhập − tiêu hao theo công thức của hoá đơn đã thanh toán), cột tính toán, ORDER BY giảm dần.

| TEN_NL | DON_VI_TINH | TONG_NHAP | TONG_TIEU_HAO | SO_LUONG_TON | DON_GIA_NHAP | GIA_TRI_TON |
|---|---|---|---|---|---|---|
| Cà phê hạt | gram | 5000 | 696.5 | 4303.5 | 310 | 1334085 |
| Trà đen | gram | 1500 | 88.5 | 1411.5 | 255 | 359932.5 |
| Cam | quả | 60 | 16.35 | 43.65 | 6500 | 283725 |
| Sữa đặc | ml | 5000 | 855 | 4145 | 60 | 248700 |
| Sữa tươi | ml | 10000 | 3357 | 6643 | 36 | 239148 |
| Trân châu | gram | 3000 | 410 | 2590 | 80 | 207200 |
| Xoài | quả | 20 | 2.8 | 17.2 | 12000 | 206400 |
| Đào ngâm | gram | 2000 | 345 | 1655 | 120 | 198600 |
| Dưa hấu | gram | 10000 | 990 | 9010 | 22 | 198220 |
| Đường | gram | 5000 | 491 | 4509 | 25 | 112725 |
| Bơ | quả | 10 | 4.3 | 5.7 | 16000 | 91200 |
| Chanh | quả | 10 | 2.6 | 7.4 | 2000 | 14800 |
| Syrup vải | ml | 0 | 0 | 0 | 150 | 0 |

## Nhóm B – Truy vấn nhóm và hàm thống kê

### Câu 6. Doanh thu theo tháng

Kỹ thuật: GROUP BY, `COUNT`, `SUM`, `AVG`, `MAX`, `MIN`. Chỉ tính hoá đơn `DA_TT`.

| THANG | SO_HOA_DON | DOANH_THU | TRUNG_BINH_HOA_DON | HOA_DON_LON_NHAT | HOA_DON_NHO_NHAT |
|---|---|---|---|---|---|
| 2026-07 | 6 | 615000 | 102500 | 140000 | 74000 |
| 2026-08 | 7 | 1012000 | 144571 | 214000 | 100000 |
| 2026-09 | 5 | 790000 | 158000 | 187000 | 130000 |
| 2026-10 | 3 | 303000 | 101000 | 129000 | 72000 |

### Câu 7. Top 5 món bán chạy nhất

Kỹ thuật: JOIN, GROUP BY, ORDER BY, `FETCH FIRST`. Tham số: số món muốn lấy.

| TEN_MON | SO_LUONG_BAN | DOANH_THU |
|---|---|---|
| Cà phê sữa | 14 | 422000 |
| Trà sữa trân châu | 8 | 284000 |
| Trà đào cam sả | 7 | 270000 |
| Bánh croissant | 6 | 168000 |
| Bạc xỉu | 6 | 208000 |

### Câu 8. Top 5 món ít được bán nhất

Kỹ thuật: LEFT JOIN với bảng tổng hợp số lượng bán để giữ cả món chưa bán lần nào, `NVL` đổi NULL thành 0, `FETCH FIRST`.

| TEN_MON | TRANG_THAI | SO_LUONG_BAN |
|---|---|---|
| Trà vải | NGUNG_BAN | 0 |
| Nước ép dưa hấu | CON_BAN | 3 |
| Sinh tố xoài | CON_BAN | 3 |
| Trà chanh | CON_BAN | 3 |
| Bánh tiramisu | CON_BAN | 4 |

### Câu 9. Số nhân viên và quỹ lương theo chức vụ

Kỹ thuật: GROUP BY, `COUNT`, `SUM`.

| TEN_CV | LUONG_CO_BAN | SO_NHAN_VIEN | TONG_QUY_LUONG |
|---|---|---|---|
| Pha chế | 9000000 | 2 | 18000000 |
| Thu ngân | 8000000 | 2 | 16000000 |
| Quản lý | 15000000 | 1 | 15000000 |
| Phục vụ | 6500000 | 2 | 13000000 |
| Thủ kho | 8500000 | 1 | 8500000 |

### Câu 10. Tổng tiền nhập theo nhà cung cấp

Kỹ thuật: LEFT JOIN để giữ cả nhà cung cấp chưa có phiếu nhập, `NVL`, GROUP BY.

| TEN_NCC | SO_PHIEU_NHAP | TONG_TIEN_NHAP |
|---|---|---|
| Công ty Cà phê Trung Nguyên | 2 | 1520000 |
| Vựa trái cây Hoa Quả Sạch | 2 | 1000000 |
| Công ty Nguyên liệu Pha chế Hà Thành | 2 | 982500 |
| Công ty Sữa Vinamilk | 2 | 654000 |
| Công ty Bao bì Tân Tiến | 0 | 0 |

### Câu 11. Doanh thu theo khung giờ

Kỹ thuật: `CASE` phân loại giờ lập hoá đơn, GROUP BY theo biểu thức đó.

| KHUNG_GIO | SO_HOA_DON | DOANH_THU |
|---|---|---|
| Sáng (trước 12h) | 11 | 1253000 |
| Chiều (12h-18h) | 7 | 973000 |
| Tối (sau 18h) | 3 | 494000 |

## Nhóm C – Truy vấn lồng nhau

### Câu 12. Doanh thu theo loại món và tỷ trọng

Kỹ thuật: truy vấn con trong SELECT tính tổng doanh thu toàn quán, dùng làm mẫu số.

| TEN_LOAI | DOANH_THU | TY_TRONG_PHAN_TRAM |
|---|---|---|
| Cà phê | 1210000 | 44.5 |
| Trà | 619000 | 22.8 |
| Sinh tố | 308000 | 11.3 |
| Bánh ngọt | 308000 | 11.3 |
| Nước ép | 275000 | 10.1 |

### Câu 13. Nguyên liệu dưới mức tồn tối thiểu

Kỹ thuật: truy vấn con trong FROM tìm ngày nhập gần nhất của từng nguyên liệu, LEFT JOIN với view tồn kho. Syrup vải chưa nhập lần nào nên ngày nhập để trống.

| TEN_NL | DON_VI_TINH | SO_LUONG_TON | TON_TOI_THIEU | SO_LUONG_THIEU | DON_GIA_NHAP | TIEN_NHAP_BU | NGAY_NHAP_GAN_NHAT |
|---|---|---|---|---|---|---|---|
| Syrup vải | ml | 0 | 500 | 500 | 150 | 75000 |  |
| Bơ | quả | 5.7 | 10 | 4.3 | 16000 | 68800 | 20/08/2026 |
| Chanh | quả | 7.4 | 10 | 2.6 | 2000 | 5200 | 27/06/2026 |

### Câu 14. Giá bán, giá vốn và lãi trên 1 đơn vị của từng món theo kích cỡ

Kỹ thuật: truy vấn con trong FROM tính giá vốn = tổng (định lượng × giá nhập) của các nguyên liệu trong công thức. Hai món bánh không có công thức nên không xuất hiện.

| TEN_MON | KICH_CO | GIA_BAN | GIA_VON | LAI_MOI_DON_VI | TY_LE_LAI_PHAN_TRAM |
|---|---|---|---|---|---|
| Bạc xỉu | S | 27000 | 6888 | 20112 | 74.5 |
| Bạc xỉu | M | 32000 | 8610 | 23390 | 73.1 |
| Bạc xỉu | L | 39000 | 11193 | 27807 | 71.3 |
| Cappuccino | S | 40000 | 8784 | 31216 | 78 |
| Cappuccino | M | 45000 | 10980 | 34020 | 75.6 |
| Cappuccino | L | 52000 | 14274 | 37726 | 72.6 |
| Cà phê sữa | S | 24000 | 6400 | 17600 | 73.3 |
| Cà phê sữa | M | 29000 | 8000 | 21000 | 72.4 |
| Cà phê sữa | L | 36000 | 10400 | 25600 | 71.1 |
| Cà phê đen | S | 20000 | 5160 | 14840 | 74.2 |
| Cà phê đen | M | 25000 | 6450 | 18550 | 74.2 |
| Cà phê đen | L | 32000 | 8385 | 23615 | 73.8 |
| Latte | S | 40000 | 10224 | 29776 | 74.4 |
| Latte | M | 45000 | 12780 | 32220 | 71.6 |
| Latte | L | 52000 | 16614 | 35386 | 68.1 |
| Nước ép cam | S | 34000 | 15800 | 18200 | 53.5 |
| Nước ép cam | M | 39000 | 19750 | 19250 | 49.4 |
| Nước ép cam | L | 46000 | 25675 | 20325 | 44.2 |
| Nước ép dưa hấu | S | 30000 | 5480 | 24520 | 81.7 |
| Nước ép dưa hấu | M | 35000 | 6850 | 28150 | 80.4 |
| Nước ép dưa hấu | L | 42000 | 8905 | 33095 | 78.8 |
| Sinh tố bơ | S | 40000 | 15680 | 24320 | 60.8 |
| Sinh tố bơ | M | 45000 | 19600 | 25400 | 56.4 |
| Sinh tố bơ | L | 52000 | 25480 | 26520 | 51 |
| Sinh tố xoài | S | 37000 | 12480 | 24520 | 66.3 |
| Sinh tố xoài | M | 42000 | 15600 | 26400 | 62.9 |
| Sinh tố xoài | L | 49000 | 20280 | 28720 | 58.6 |
| Trà chanh | S | 20000 | 3020 | 16980 | 84.9 |
| Trà chanh | M | 25000 | 3775 | 21225 | 84.9 |
| Trà chanh | L | 32000 | 4907.5 | 27092.5 | 84.7 |
| Trà sữa trân châu | S | 30000 | 7500 | 22500 | 75 |
| Trà sữa trân châu | M | 35000 | 9375 | 25625 | 73.2 |
| Trà sữa trân châu | L | 42000 | 12187.5 | 29812.5 | 71 |
| Trà vải | S | 34000 | 4620 | 29380 | 86.4 |
| Trà vải | M | 39000 | 5775 | 33225 | 85.2 |
| Trà vải | L | 46000 | 7507.5 | 38492.5 | 83.7 |
| Trà đào cam sả | S | 34000 | 8820 | 25180 | 74.1 |
| Trà đào cam sả | M | 39000 | 11025 | 27975 | 71.7 |
| Trà đào cam sả | L | 46000 | 14332.5 | 31667.5 | 68.8 |

### Câu 15. Doanh thu, giá vốn và lợi nhuận theo từng món đã bán

Kỹ thuật: dùng lại truy vấn con tính giá vốn ở câu 14, JOIN với chi tiết hoá đơn theo món và kích cỡ, GROUP BY theo món. Chỉ tính món có công thức và hoá đơn `DA_TT`.

| TEN_MON | SO_LUONG_BAN | DOANH_THU | TONG_GIA_VON | LOI_NHUAN |
|---|---|---|---|---|
| Cà phê sữa | 14 | 422000 | 117600 | 304400 |
| Trà sữa trân châu | 8 | 284000 | 76875 | 207125 |
| Trà đào cam sả | 7 | 270000 | 76072.5 | 193927.5 |
| Latte | 5 | 239000 | 71568 | 167432 |
| Bạc xỉu | 6 | 208000 | 57687 | 150313 |
| Cappuccino | 4 | 189000 | 48312 | 140688 |
| Cà phê đen | 6 | 152000 | 39345 | 112655 |
| Sinh tố bơ | 4 | 187000 | 84280 | 102720 |
| Nước ép dưa hấu | 3 | 112000 | 22605 | 89395 |
| Nước ép cam | 4 | 163000 | 84925 | 78075 |
| Sinh tố xoài | 3 | 121000 | 43680 | 77320 |
| Trà chanh | 3 | 65000 | 9815 | 55185 |

Tổng 12 món ở câu 15: doanh thu 2.412.000 đ. Cộng thêm 308.000 đ doanh thu bánh thì bằng tổng doanh thu 2.720.000 đ ở câu 6.

## Lưu ý khi viết thêm truy vấn

Trong SQL*Plus, không đặt chú thích `--` sau dấu `;` trên cùng một dòng: câu lệnh sẽ không được chạy. Đặt chú thích ở dòng riêng phía trên.
