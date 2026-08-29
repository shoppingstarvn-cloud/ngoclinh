import Link from 'next/link';

export default function MatKhauNoiDungPage() {
  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h4 mb-3">Cổng đăng nhập menu con</h1>
      <p className="text-muted">
        Trang menu thuộc nhóm <strong>Hoạt động</strong> chỉ xem được sau khi đăng nhập. Không còn mật khẩu
        nội dung riêng.
      </p>
      <Link href="/admin" className="btn btn-primary btn-sm">
        Về trang quản trị
      </Link>
    </div>
  );
}
