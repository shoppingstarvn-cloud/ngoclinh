const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM = process.env.RESEND_FROM || 'ShopMartAI <onboarding@resend.dev>';

export function emailConfigured(): boolean {
  return !!RESEND_API_KEY;
}

/** Gửi email giao dịch qua Resend REST API (không cần thư viện). Node 18+. */
export async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) throw new Error('Dịch vụ email chưa cấu hình (thiếu RESEND_API_KEY)');
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + RESEND_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, html }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error('Gửi email lỗi: ' + (d.message || d.name || 'HTTP ' + r.status));
  }
  return d;
}

/** Mẫu email chứa mã 6 số đặt lại mật khẩu. */
export function resetCodeHtml(code: string, fullName?: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    <div style="background:#004000;color:#fff;padding:20px 24px"><h2 style="margin:0;font-size:18px">🔐 Đặt lại mật khẩu</h2></div>
    <div style="padding:24px">
      <p style="font-size:15px;color:#334155">Xin chào ${fullName || 'bạn'},</p>
      <p style="font-size:15px;color:#334155">Nhập mã xác minh dưới đây để tạo mật khẩu mới:</p>
      <div style="text-align:center;margin:24px 0"><div style="display:inline-block;background:#f1f5f9;border:2px dashed #94a3b8;border-radius:10px;padding:14px 28px;font-size:32px;font-weight:800;letter-spacing:8px;color:#004000">${code}</div></div>
      <p style="font-size:13px;color:#64748b">Mã có hiệu lực <b>15 phút</b>, chỉ dùng <b>một lần</b>. Không phải bạn yêu cầu? Hãy bỏ qua email này.</p>
    </div></div>`;
}
