import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { getOrCreateUser } from '../db/users.ts';
import { db } from '../db/index.ts';
import { activities, activityRegistrations, users } from '../db/schema.ts';
import { desc, eq } from 'drizzle-orm';

const router = Router();

// Auth & Sync Profile
router.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'No authenticated user' });
      return;
    }
    const user = await getOrCreateUser(req.user.uid, req.user.email || '');
    res.json(user);
  } catch (err: any) {
    console.error('Error in auth sync:', err);
    res.status(500).json({ error: err.message });
  }
});

// Cập nhật thông tin đoàn viên / TNV
router.post('/api/user/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { fullName, dob, gender, cccd, phone, address, unit, unionUnit, skills } = req.body;
    const updated = await db.update(users)
      .set({ fullName, dob, gender, cccd, phone, address, unit, unionUnit, skills })
      .where(eq(users.uid, req.user.uid))
      .returning();

    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Lấy danh sách các hoạt động người dùng đã đăng ký
router.get('/api/user/my-activities', requireAuth, async (req: AuthRequest, res) => {
  try {
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
