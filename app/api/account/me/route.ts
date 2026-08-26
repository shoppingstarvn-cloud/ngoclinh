import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/user-session';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name || '',
      avatar_url: user.avatar_url || '',
    },
  });
}
