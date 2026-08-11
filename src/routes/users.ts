import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { getOrCreateUser } from '../db/users.ts';
import { db } from '../db/index.ts';
import { activities, activityRegistrations, users } from '../db/schema.ts';
import { desc, eq } from 'drizzle-orm';
import { HttpError, asyncHandler } from '../lib/http-error.ts';

const router = Router();

// Auth & Sync Profile
router.post('/api/auth/sync', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user) {
    throw new HttpError(401, 'No authenticated user');
  }
  const user = await getOrCreateUser(req.user.uid, req.user.email || '');
  res.json(user);
}));

// Cập nhật thông tin đoàn viên / TNV
router.post('/api/user/profile', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  if (!req.user) {
    throw new HttpError(401, 'Unauthorized');
  }
  const { fullName, dob, gender, cccd, phone, address, unit, skills } = req.body;
  const updated = await db.update(users)
    .set({ fullName, dob, gender, cccd, phone, address, unit, skills })
    .where(eq(users.uid, req.user.uid))
    .returning();

  res.json(updated[0]);
}));

// Lấy danh sách các hoạt động người dùng đã đăng ký
router.get('/api/user/my-activities', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const user = await getOrCreateUser(req.user!.uid, req.user!.email || '');
  const userRegs = await db.select({
    registrationId: activityRegistrations.id,
    registeredAt: activityRegistrations.createdAt,
    status: activityRegistrations.status,
    activity: activities
  })
  .from(activityRegistrations)
  .innerJoin(activities, eq(activityRegistrations.activityId, activities.id))
  .where(eq(activityRegistrations.userId, user.id))
  .orderBy(desc(activityRegistrations.createdAt));

  res.json(userRegs);
}));

export default router;
