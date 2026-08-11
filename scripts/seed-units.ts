import 'dotenv/config';
import { db } from '../src/db/index.ts';
import { units } from '../src/db/schema.ts';
import wards from '../src/data/haiphong-wards.json' with { type: 'json' };

async function seed() {
  const rows = wards as { name: string; type: string }[];
  console.log(`Đang nạp ${rows.length} đơn vị...`);

  const inserted = await db.insert(units)
    .values(rows)
    .onConflictDoNothing({ target: units.name })
    .returning({ id: units.id });

  console.log(`Đã thêm mới ${inserted.length} đơn vị (bỏ qua ${rows.length - inserted.length} đơn vị đã tồn tại).`);
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed thất bại:', err);
  process.exit(1);
});
