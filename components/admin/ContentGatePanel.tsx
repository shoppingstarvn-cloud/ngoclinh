'use client';

export default function ContentGatePanel() {
  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h5 className="card-title mb-3">
          <i className="fas fa-user-lock text-primary me-2" />
          Cổng đăng nhập menu con
        </h5>
        <p className="text-muted mb-3">
          Các liên kết thuộc danh mục có tên chứa <strong>Hoạt động</strong> (không phân biệt dấu) yêu cầu
          khách <strong>đăng nhập hoặc đăng ký</strong> trước khi xem trang con.
        </p>
        <ul className="mb-0">
          <li>Khách chưa đăng nhập bấm menu con → hiện cửa sổ đăng nhập / đăng ký.</li>
          <li>Sau khi đăng nhập thành công → tự chuyển tới trang đích.</li>
          <li>Album / nhật ký và bình luận cũng chỉ mở khi đã đăng nhập.</li>
        </ul>
        <p className="text-muted small mt-3 mb-0">
          Không còn mật khẩu xem nội dung riêng. Quản lý tài khoản tại tab <strong>Quản lý Users</strong>.
        </p>
      </div>
    </div>
  );
}
