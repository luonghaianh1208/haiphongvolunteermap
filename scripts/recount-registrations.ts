import 'dotenv/config';
import { db } from '../src/db/index.ts';
import { activities, activityRegistrations } from '../src/db/schema.ts';
import { eq, sql } from 'drizzle-orm';

/**
 * Đối chiếu activities.registered_count với số đăng ký thật.
 *
 * Chạy khi nghi số liệu lệch, hoặc định kỳ.
 *   npx tsx scripts/recount-registrations.ts          # chỉ báo cáo
 *   npx tsx scripts/recount-registrations.ts --fix    # báo cáo và sửa
 */
async function main() {
  const shouldFix = process.argv.includes('--fix');

  const rows = await db.select({
    id: activities.id,
    title: activities.title,
    stored: activities.registeredCount,
    actual: sql<number>`(
      SELECT count(*) FROM ${activityRegistrations}
      WHERE ${activityRegistrations.activityId} = ${activities.id}
    )`,
  }).from(activities);

  const lech = rows.filter(r => Number(r.stored) !== Number(r.actual));

  console.log(`Đã kiểm ${rows.length} hoạt động.`);

  if (lech.length === 0) {
    console.log('Không có hoạt động nào lệch số liệu.');
    process.exit(0);
  }

  console.log(`Phát hiện ${lech.length} hoạt động lệch:`);
  for (const r of lech) {
    console.log(`  #${r.id} "${r.title}": đang lưu ${r.stored}, thực tế ${r.actual}`);
  }

  if (!shouldFix) {
    console.log('\nChạy lại kèm --fix để sửa.');
    process.exit(1);
  }

  for (const r of lech) {
    await db.update(activities)
      .set({ registeredCount: Number(r.actual) })
      .where(eq(activities.id, r.id));
  }
  console.log(`\nĐã sửa ${lech.length} hoạt động.`);
  process.exit(0);
}

main().catch(err => {
  console.error('Đối chiếu thất bại:', err);
  process.exit(1);
});
