import type { AuthRequest } from './auth.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

/** Vai trò được phép xem hoạt động chưa duyệt */
export const STAFF_ROLES = ['thanh_doan', 'doan_co_so'];

/**
 * Đọc vai trò của người gọi. Trả null nếu chưa đăng nhập
 * hoặc chưa có bản ghi trong bảng users.
 */
export async function getUserRole(req: AuthRequest): Promise<string | null> {
  if (!req.user) return null;
  const rows = await db.select({ role: users.role })
    .from(users)
    .where(eq(users.uid, req.user.uid))
    .limit(1);
  return rows[0]?.role ?? null;
}
