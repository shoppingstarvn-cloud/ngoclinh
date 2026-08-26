import { cookies } from 'next/headers';
import { verifyMemberToken, MEMBER_COOKIE, type MemberPayload } from '@/lib/auth/user-jwt';

/** Đọc thành viên hiện tại từ cookie (dùng trong Server Component / Route Handler / Server Action). */
export async function getCurrentUser(): Promise<MemberPayload | null> {
  const store = await cookies();
  const token = store.get(MEMBER_COOKIE)?.value;
  if (!token) return null;
  return verifyMemberToken(token);
}
