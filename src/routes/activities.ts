import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { getOrCreateUser } from '../db/users.ts';
import { db } from '../db/index.ts';
import { activities, activityRegistrations, users } from '../db/schema.ts';
import { desc, eq, sql } from 'drizzle-orm';
import { HttpError, asyncHandler } from '../lib/http-error.ts';

const router = Router();

// Lấy danh sách hoạt động kèm số lượng đã đăng ký
router.get('/api/activities', asyncHandler(async (req, res) => {
  const allActivities = await db.select().from(activities).orderBy(desc(activities.createdAt));

  // Calculate registrations count for each activity
  const regCounts = await db.select({
    activityId: activityRegistrations.activityId,
    count: sql<number>`count(*)`
  }).from(activityRegistrations)
    .groupBy(activityRegistrations.activityId);

  const countMap = new Map<number, number>();
  regCounts.forEach(r => countMap.set(r.activityId, Number(r.count)));

  const result = allActivities.map(act => ({
    ...act,
    registeredCount: countMap.get(act.id) || 0
  }));

  res.json(result);
}));

// Tạo hoạt động mới (Cơ sở Đoàn / Thành Đoàn)
router.post('/api/activities', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const { title, description, banner, timeStart, timeEnd, location, lat, lng, requiredVolunteers, category, zaloLink } = req.body;

  // Lấy thông tin user tạo
  const organizer = await getOrCreateUser(req.user!.uid, req.user!.email || '');

  const newAct = await db.insert(activities).values({
    title,
    description,
    banner,
    organizerId: organizer.id,
    timeStart: new Date(timeStart),
    timeEnd: new Date(timeEnd),
    location,
    lat: lat ? parseFloat(lat) : null,
    lng: lng ? parseFloat(lng) : null,
    requiredVolunteers: parseInt(requiredVolunteers) || 10,
    category: category || 'Khác',
    zaloLink,
    status: organizer.role === 'thanh_doan' ? 'approved' : 'pending'
  }).returning();

  res.json(newAct[0]);
}));

// Duyệt hoặc cập nhật trạng thái hoạt động (Thành Đoàn)
router.patch('/api/activities/:id/status', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const activityId = parseInt(req.params.id);
  const { status } = req.body;
  const user = await getOrCreateUser(req.user!.uid, req.user!.email || '');

  if (user.role !== 'thanh_doan') {
    throw new HttpError(403, 'Chỉ cán bộ Thành Đoàn có quyền phê duyệt');
  }

  const updated = await db.update(activities)
    .set({ status })
    .where(eq(activities.id, activityId))
    .returning();

  res.json(updated[0]);
}));

// Đăng ký tham gia hoạt động
router.post('/api/activities/:id/register', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const activityId = parseInt(req.params.id);
  const user = await getOrCreateUser(req.user!.uid, req.user!.email || '');

  // Kiểm tra đăng ký trùng
  const existing = await db.select().from(activityRegistrations)
    .where(sql`${activityRegistrations.activityId} = ${activityId} AND ${activityRegistrations.userId} = ${user.id}`);

  if (existing.length > 0) {
    throw new HttpError(400, 'Bạn đã đăng ký hoạt động này trước đó');
  }

  // Đăng ký thành công + cộng 5 điểm uy tín đăng ký
  const reg = await db.insert(activityRegistrations).values({
    activityId,
    userId: user.id,
    status: 'registered'
  }).returning();

  // Cộng điểm uy tín
  await db.update(users)
    .set({
      reputationPoints: sql`${users.reputationPoints} + 5`,
      activitiesCount: sql`${users.activitiesCount} + 1`
    })
    .where(eq(users.id, user.id));

  res.json({ success: true, registration: reg[0] });
}));

export default router;
