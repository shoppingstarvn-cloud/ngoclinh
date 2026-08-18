import { NextResponse } from 'next/server';
import { isConfigured } from '@/lib/storage/googleDrive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Frontend hỏi đang dùng kho nào: 'drive' nếu đã cấu hình, không thì fallback 'supabase'.
export async function GET() {
  return NextResponse.json({ backend: isConfigured() ? 'drive' : 'supabase' });
}
