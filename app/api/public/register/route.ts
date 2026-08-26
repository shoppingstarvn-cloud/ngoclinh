import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\s().-]{8,20}$/;

function clip(value: unknown, max: number) {
  return String(value ?? '').trim().slice(0, max);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    // Honeypot — bot điền field ẩn thì giả thành công, không ghi DB
    if (clip(body.company_website, 200)) {
      return NextResponse.json({ success: true });
    }

    const fullName = clip(body.full_name, 120);
    const phone = clip(body.phone, 20);
    const email = clip(body.email, 160).toLowerCase();
    const occupation = clip(body.occupation, 160);
    const service = clip(body.service, 240);
    const needs = clip(body.needs, 2000);
    const serviceIdRaw = body.service_id;

    if (fullName.length < 2) {
      return NextResponse.json({ success: false, error: 'Vui lòng nhập họ tên.' }, { status: 400 });
    }
    if (!PHONE_RE.test(phone)) {
      return NextResponse.json({ success: false, error: 'Số điện thoại chưa hợp lệ.' }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ success: false, error: 'Email chưa hợp lệ.' }, { status: 400 });
    }
    if (occupation.length < 2) {
      return NextResponse.json({ success: false, error: 'Vui lòng nhập ngành nghề công tác.' }, { status: 400 });
    }
    if (service.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng chọn dịch vụ (bấm ô dịch vụ bên trên).' },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    let serviceId: number | null = null;
    if (typeof serviceIdRaw === 'number' && Number.isFinite(serviceIdRaw)) {
      serviceId = serviceIdRaw;
    } else if (typeof serviceIdRaw === 'string' && /^\d+$/.test(serviceIdRaw)) {
      serviceId = Number(serviceIdRaw);
    }

    if (serviceId) {
      const { data: exists } = await supabase.from('services').select('id').eq('id', serviceId).maybeSingle();
      if (!exists?.id) serviceId = null;
    }
    if (!serviceId) {
      const { data: matched } = await supabase
        .from('services')
        .select('id,title_top')
        .eq('is_active', true)
        .ilike('title_top', service)
        .limit(1)
        .maybeSingle();
      if (matched?.id) serviceId = Number(matched.id);
    }

    const { error } = await supabase.from('registrations').insert({
      full_name: fullName,
      phone,
      email,
      occupation,
      service,
      service_id: serviceId,
      needs,
      is_read: false,
    });

    if (error) {
      const missing = /schema cache|does not exist|Could not find the table/i.test(error.message);
      return NextResponse.json(
        {
          success: false,
          error: missing
            ? 'Bảng đăng ký chưa tạo trên Supabase. Anh chạy file sql/06_REGISTRATIONS.sql rồi thử lại.'
            : 'Gửi đăng ký chưa thành công. Anh thử lại giúp em.',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Gửi đăng ký thất bại. Anh thử lại giúp em.' },
      { status: 500 },
    );
  }
}
