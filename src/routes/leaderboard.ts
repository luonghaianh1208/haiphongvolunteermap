import { Router } from 'express';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { desc } from 'drizzle-orm';

const router = Router();

// Bảng xếp hạng TNV & Đơn vị Đoàn
router.get('/api/leaderboard', async (req, res) => {
  try {
    const topVolunteers = await db.select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      unionUnit: users.unionUnit,
      reputationPoints: users.reputationPoints,
      volunteerHours: users.volunteerHours,
      activitiesCount: users.activitiesCount,
      isVerified: users.isVerified
    })
    .from(users)
    .orderBy(desc(users.reputationPoints))
    .limit(10);

    res.json({ topVolunteers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
