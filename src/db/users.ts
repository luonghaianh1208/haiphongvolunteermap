import { db } from './index.ts';
import { units, users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string) {
  const result = await db.insert(users)
    .values({
      uid,
      email,
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        email,
      },
    })
    .returning();

  const user = result[0];

  // Kèm tên đơn vị để giao diện không phải gọi thêm API
  if (user.unitId === null) {
    return { ...user, unitName: null as string | null };
  }
  const unitRows = await db.select({ name: units.name })
    .from(units)
    .where(eq(units.id, user.unitId))
    .limit(1);

  return { ...user, unitName: unitRows[0]?.name ?? null };
}
