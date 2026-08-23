import { Router } from 'express';
import { db } from '../db/index.ts';
import { activities, users } from '../db/schema.ts';
import { sql } from 'drizzle-orm';
import { asyncHandler } from '../lib/http-error.ts';
import { cached } from '../lib/cache.ts';
import { CACHE_TTL } from '../lib/cache-config.ts';

const router = Router();

router.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Thống kê tổng quan Thành Đoàn Hải Phòng
router.get('/api/stats', asyncHandler(async (req, res) => {
  const payload = await cached('stats', CACHE_TTL.stats, async () => {
    // Gộp 3 số đo trên bảng users vào một lần quét thay vì hai lượt truy vấn.
    const userStats = await db.select({
      total: sql<number>`count(*)`,
      verified: sql<number>`count(*) FILTER (WHERE ${users.isVerified})`,
      hours: sql<number>`COALESCE(sum(${users.volunteerHours}), 0)`,
    }).from(users);
    const totalActivities = await db.select({ count: sql<number>`count(*)` }).from(activities);

    return {
      totalVolunteers: Number(userStats[0]?.total || 0),
      totalActivities: Number(totalActivities[0]?.count || 0),
      totalHours: Number(userStats[0]?.hours || 0),
      verifiedCount: Number(userStats[0]?.verified || 0),
    };
  });

  res.json(payload);
}));

export default router;
