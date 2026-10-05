"use client";

// Nút gửi form có hỏi lại trước khi thực hiện (dùng cho xoá, huỷ)
export default function NutXacNhan({
  cauHoi,
  className = "nut nut-xoa",
  children,
}: {
  cauHoi: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(cauHoi)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
