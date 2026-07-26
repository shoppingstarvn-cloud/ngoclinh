import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.from('site_settings').select('*');
  const config: Record<string, string> = {};
  data?.forEach((c) => {
    config[c.key] = c.value;
  });
  return NextResponse.json(config);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      full_name?: string;
      phone?: string;
      email?: string;
      subject?: string;
      message?: string;
    };
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();
    const { error } = await supabase.from('contact_submissions').insert(body);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Gửi liên hệ thất bại';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
