# Ứng dụng web quản lý quán café

Next.js 16 nối thẳng tới Oracle (`FREEPDB1`, schema `qlcafe`) bằng thư viện `oracledb`.

```powershell
npm install
npm run dev
```

Mở http://localhost:3000. Trang quản trị: http://localhost:3000/admin (`admin` / `Admin_123`).

Cấu hình kết nối nằm trong `.env.local` (mẫu: `.env.example`).

Hướng dẫn đầy đủ: [docs/HUONG_DAN_MUC_5_WEB.md](../docs/HUONG_DAN_MUC_5_WEB.md).
