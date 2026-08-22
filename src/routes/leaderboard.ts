import { Router } from 'express';
import { asyncHandler } from '../lib/http-error.ts';
import { db } from '../db/index.ts';
import { units, users } from '../db/schema.ts';
import { desc, eq, sql } from 'drizzle-orm';
import { cached } from '../lib/cache.ts';
import { CACHE_TTL } from '../lib/cache-config.ts';

const router = Router();

/** Số TNV tối thiểu để một đơn vị được xếp theo điểm trung bình */
const MIN_MEMBERS_FOR_AVG = 3;

/** Bảng xếp hạng cá nhân. Lọc theo đơn vị nếu có ?unitId= */
router.get('/api/leaderboard', asyncHandler(async (req, res) => {
  const rawUnitId = typeof req.query.unitId === 'string' ? req.query.unitId : '';
  const unitId = rawUnitId === '' ? null : Number.parseInt(rawUnitId, 10);

  const columns = {
    id: users.id,
    fullName: users.fullName,
    unitId: users.unitId,
    unitName: units.name,
    reputationPoints: users.reputationPoints,
    volunteerHours: users.volunteerHours,
    activitiesCount: users.activitiesCount,
    isVerified: users.isVerified,
  };

  // Khóa cache phải phân biệt có lọc theo đơn vị hay không, nếu không hai đơn vị
  // khác nhau sẽ dùng chung một kết quả.
  const key = (unitId !== null && !Number.isNaN(unitId)) ? `lb:unit:${unitId}` : 'lb:all';

  const topVolunteers = await cached(key, CACHE_TTL.leaderboard, async () => {
    // Lọc TRƯỚC rồi mới cắt 10 — nếu làm ngược lại, đơn vị nhỏ sẽ ra bảng trống.
    // Builder của Drizzle đột biến (mutate) chính nó thay vì clone, nên KHÔNG được
    // dùng chung một biến builder rồi gọi .where() theo nhánh — mỗi nhánh phải tự
    // dựng builder riêng để tránh rò trạng thái giữa các request.
    return (unitId !== null && !Number.isNaN(unitId))
      ? await db.select(columns).from(users)
          .leftJoin(units, eq(users.unitId, units.id))
          .where(eq(users.unitId, unitId))
          .orderBy(desc(users.reputationPoints))
          .limit(10)
      : await db.select(columns).from(users)
          .leftJoin(units, eq(users.unitId, units.id))
          .orderBy(desc(users.reputationPoints))
          .limit(10);
  });

  res.json({ topVolunteers });
}));

/** Bảng xếp hạng đơn vị. ?sort=total (mặc định) hoặc avg */
router.get('/api/leaderboard/units', asyncHandler(async (req, res) => {
  const sortByAvg = req.query.sort === 'avg';
  const key = sortByAvg ? 'lbunits:avg' : 'lbunits:total';

  const topUnits = await cached(key, CACHE_TTL.leaderboard, async () => {
    const rows = await db.select({
      id: units.id,
      name: units.name,
      type: units.type,
      totalPoints: sql<number>`COALESCE(sum(${users.reputationPoints}), 0)`,
      totalHours: sql<number>`COALESCE(sum(${users.volunteerHours}), 0)`,
      memberCount: sql<number>`count(${users.id})`,
    })
      .from(units)
      // innerJoin đã loại sẵn cả đơn vị không có TNV lẫn TNV chưa chọn đơn vị
      .innerJoin(users, eq(users.unitId, units.id))
      .groupBy(units.id)
      .orderBy(desc(sql`sum(${users.reputationPoints})`));

    const enriched = rows.map(r => {
      const memberCount = Number(r.memberCount);
      const totalPoints = Number(r.totalPoints);
      return {
        id: r.id,
        name: r.name,
        type: r.type,
        totalPoints,
        totalHours: Number(r.totalHours),
        memberCount,
        avgPoints: memberCount === 0 ? 0 : Math.round((totalPoints / memberCount) * 10) / 10,
      };
    });

    return sortByAvg
      // Đơn vị 1 người 500 điểm không được đứng trên đơn vị 200 người
      ? enriched.filter(u => u.memberCount >= MIN_MEMBERS_FOR_AVG)
                .sort((a, b) => b.avgPoints - a.avgPoints)
                .slice(0, 20)
      : enriched.slice(0, 20);
  });

  res.json({ topUnits });
}));

export default router;
