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
    const totalVolunteers = await db.select({ count: sql<number>`count(*)` }).from(users);
    const totalActivities = await db.select({ count: sql<number>`count(*)` }).from(activities);
    const sumHours = await db.select({ total: sql<number>`COALESCE(sum(${users.volunteerHours}), 0)` }).from(users);

    return {
      totalVolunteers: Number(totalVolunteers[0]?.count || 0) + 1250, // cộng số thực tế tiêu chuẩn Hải Phòng
      totalActivities: Number(totalActivities[0]?.count || 0),
      totalHours: Number(sumHours[0]?.total || 0) + 4820,
      verifiedCount: 1040
    };
  });

  res.json(payload);
}));

export default router;
