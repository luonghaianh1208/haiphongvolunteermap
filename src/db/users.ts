import { db } from './index.ts';
import { units, users } from './schema.ts';
import { eq } from 'drizzle-orm';

/**
 * Lấy bản ghi người dùng theo Firebase UID, tạo mới nếu chưa có.
 *
 * Đường phổ biến nhất (người dùng đã tồn tại, email không đổi) chỉ tốn
 * MỘT truy vấn đọc và KHÔNG ghi gì — trước đây luôn ghi mỗi lần mở app.
 */
export async function getOrCreateUser(uid: string, email: string) {
  const found = await readUserWithUnit(uid);

  if (found) {
    if (found.email === email) {
      return found;                       // đường phổ biến nhất: 1 đọc, 0 ghi
    }
    const updated = await db.update(users)
      .set({ email })
      .where(eq(users.id, found.id))
      .returning();
    return { ...updated[0], unitName: found.unitName };
  }

  // ON CONFLICT DO NOTHING chứ không phải INSERT trần: hai request của cùng
  // người dùng có thể chạy đồng thời ở lần đăng nhập đầu (ví dụ mở hai tab).
  // Cả hai đều thấy "chưa có" ở bước đọc; INSERT trần sẽ khiến một cái vi phạm
  // ràng buộc unique trên uid rồi ném 500.
  await db.insert(users)
    .values({ uid, email })
    .onConflictDoNothing({ target: users.uid });

  const created = await readUserWithUnit(uid);
  if (!created) {
    throw new Error(`Không tạo được người dùng cho uid ${uid}`);
  }
  return created;
}

/** Đọc người dùng kèm tên đơn vị trong MỘT truy vấn. */
async function readUserWithUnit(uid: string) {
  const rows = await db.select({
    user: users,
    unitName: units.name,
  })
    .from(users)
    .leftJoin(units, eq(users.unitId, units.id))
    .where(eq(users.uid, uid))
    .limit(1);

  if (rows.length === 0) return null;
  return { ...rows[0].user, unitName: rows[0].unitName ?? null };
}
