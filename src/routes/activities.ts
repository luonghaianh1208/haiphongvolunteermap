import { Router } from 'express';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth.ts';
import { getUserRole, STAFF_ROLES } from '../middleware/require-role.ts';
import { getOrCreateUser } from '../db/users.ts';
import { db } from '../db/index.ts';
import { activities, activityRegistrations, users } from '../db/schema.ts';
import { desc, eq, sql } from 'drizzle-orm';
import { HttpError, asyncHandler } from '../lib/http-error.ts';

const router = Router();

// Lấy danh sách hoạt động kèm số lượng đã đăng ký
router.get('/api/activities', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const role = await getUserRole(req);
  const isStaff = role !== null && STAFF_ROLES.includes(role);

  // Khách và TNV: chỉ thấy hoạt động đã duyệt, bất kể truyền tham số gì
  // Cán bộ: được lọc theo ?status=pending|rejected|approved|all
  const requested = typeof req.query.status === 'string' ? req.query.status : 'approved';
  const effective = isStaff ? requested : 'approved';

  // Chặn trên kích thước phản hồi. KHÔNG phải phân trang — client không có
  // cách lấy dòng thứ 201 trở đi. Khi số hoạt động approved chạm ~150,
  // phải bổ sung cursor pagination trước khi vượt 200.
  const rawLimit = typeof req.query.limit === 'string'
    ? Number.parseInt(req.query.limit, 10)
    : Number.NaN;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(rawLimit, 500)
    : 200;

  const allActivities = effective === 'all'
    ? await db.select().from(activities).orderBy(desc(activities.createdAt)).limit(limit)
    : await db.select().from(activities)
        .where(eq(activities.status, effective))
        .orderBy(desc(activities.createdAt))
        .limit(limit);

  res.json(allActivities);
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
  const activityId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(activityId)) {
    throw new HttpError(400, 'Mã hoạt động không hợp lệ');
  }

  const user = await getOrCreateUser(req.user!.uid, req.user!.email || '');

  try {
    const registration = await db.transaction(async (tx) => {
      const reg = await tx.insert(activityRegistrations).values({
        activityId,
        userId: user.id,
        status: 'registered'
      }).returning();

      // Bộ đếm chỉ TĂNG, vì hiện chưa có chức năng hủy đăng ký.
      // KHI NÀO thêm chức năng hủy, phải giảm registered_count trong CÙNG
      // transaction với lệnh xóa bản ghi đăng ký. Quên là bộ đếm lệch vĩnh viễn.
      await tx.update(activities)
        .set({ registeredCount: sql`${activities.registeredCount} + 1` })
        .where(eq(activities.id, activityId));

      await tx.update(users)
        .set({
          reputationPoints: sql`${users.reputationPoints} + 5`,
          activitiesCount: sql`${users.activitiesCount} + 1`
        })
        .where(eq(users.id, user.id));

      return reg[0];
    });

    res.json({ success: true, registration });
  } catch (err: any) {
    // 23505 = vi phạm ràng buộc duy nhất trong Postgres.
    // Kiểm cả TÊN ràng buộc, vì bảng này có thể có ràng buộc duy nhất khác
    // trong tương lai và ta không được hiểu nhầm thành "đã đăng ký".
    if (err?.code === '23505' && err?.constraint === 'uniq_registrations_activity_user') {
      throw new HttpError(400, 'Bạn đã đăng ký hoạt động này trước đó');
    }
    throw err;
  }
}));

export default router;
