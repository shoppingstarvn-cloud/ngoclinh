import AdminApp from './AdminApp';

// Không cache/prerender trang admin ở edge — luôn trả HTML mới trỏ đúng bundle mới nhất,
// tránh việc trình duyệt/edge nạp lại chunk JS cũ sau mỗi lần deploy.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AdminPage() {
  return (
    <div className="admin-root">
      <AdminApp />
    </div>
  );
}
