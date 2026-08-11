import { Router } from 'express';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth.ts';
import { getUserRole } from '../middleware/require-role.ts';
import { HttpError, asyncHandler } from '../lib/http-error.ts';
import { db } from '../db/index.ts';
import { units, users } from '../db/schema.ts';
import { asc, eq, sql } from 'drizzle-orm';

const router = Router();

const VALID_TYPES = ['dia_ban', 'truong_hoc', 'doanh_nghiep', 'luc_luong_vu_trang'];

/**
 * Danh sách đơn vị.
 * Công khai: chỉ đơn vị đang hoạt động.
 * thanh_doan + ?includeInactive=true: toàn bộ, kèm số TNV.
 */
router.get('/api/units', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const role = await getUserRole(req);
  const wantsAll = req.query.includeInactive === 'true' && role === 'thanh_doan';

  if (wantsAll) {
    const rows = await db.select({
      id: units.id,
      name: units.name,
      type: units.type,
      isActive: units.isActive,
      memberCount: sql<number>`count(${users.id})`,
    })
      .from(units)
      .leftJoin(users, eq(users.unitId, units.id))
      .groupBy(units.id)
      .orderBy(asc(units.name));

    res.json({ units: rows.map(r => ({ ...r, memberCount: Number(r.memberCount) })) });
    return;
  }

  const rows = await db.select({
    id: units.id,
    name: units.name,
    type: units.type,
    isActive: units.isActive,
  })
    .from(units)
    .where(eq(units.isActive, true))
    .orderBy(asc(units.name));

  res.json({ units: rows });
}));

/** Tạo đơn vị mới. Chỉ Thành Đoàn. */
router.post('/api/units', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const role = await getUserRole(req);
  if (role !== 'thanh_doan') {
    throw new HttpError(403, 'Chỉ cán bộ Thành Đoàn có quyền quản lý đơn vị');
  }

  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const type = typeof req.body.type === 'string' ? req.body.type : 'dia_ban';

  if (name === '') {
    throw new HttpError(400, 'Tên đơn vị không được để trống');
  }
  if (!VALID_TYPES.includes(type)) {
    throw new HttpError(400, 'Loại đơn vị không hợp lệ');
  }

  const existing = await db.select({ id: units.id }).from(units).where(eq(units.name, name)).limit(1);
  if (existing.length > 0) {
    throw new HttpError(409, 'Đơn vị này đã tồn tại');
  }

  const created = await db.insert(units).values({ name, type }).returning();
  res.json(created[0]);
}));

/** Sửa tên, loại, hoặc ẩn/hiện đơn vị. Chỉ Thành Đoàn. */
router.patch('/api/units/:id', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const role = await getUserRole(req);
  if (role !== 'thanh_doan') {
    throw new HttpError(403, 'Chỉ cán bộ Thành Đoàn có quyền quản lý đơn vị');
  }

  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw new HttpError(400, 'Mã đơn vị không hợp lệ');
  }

  const patch: { name?: string; type?: string; isActive?: boolean } = {};

  if (typeof req.body.name === 'string') {
    const name = req.body.name.trim();
    if (name === '') throw new HttpError(400, 'Tên đơn vị không được để trống');
    patch.name = name;
  }
  if (typeof req.body.type === 'string') {
    if (!VALID_TYPES.includes(req.body.type)) throw new HttpError(400, 'Loại đơn vị không hợp lệ');
    patch.type = req.body.type;
  }
  if (typeof req.body.isActive === 'boolean') {
    patch.isActive = req.body.isActive;
  }

  if (Object.keys(patch).length === 0) {
    throw new HttpError(400, 'Không có thông tin nào để cập nhật');
  }

  const updated = await db.update(units).set(patch).where(eq(units.id, id)).returning();
  if (updated.length === 0) {
    throw new HttpError(404, 'Không tìm thấy đơn vị');
  }

  res.json(updated[0]);
}));

export default router;
