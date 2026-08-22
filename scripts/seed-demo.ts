import 'dotenv/config';
import { db } from '../src/db/index.ts';
import { activities, activityRegistrations, units, users } from '../src/db/schema.ts';
import { eq, inArray, like, not, sql } from 'drizzle-orm';
import diaDiem from '../src/data/demo-locations.json' with { type: 'json' };
import {
  DANH_MUC,
  DIEM_MOI_LUOT_DANG_KY,
  MAU_TIEU_DE,
  chon,
  soNguyenTrongKhoang,
  taoHoTen,
  taoPrng,
  tinhDiemUyTin,
} from './demo-random.ts';

/**
 * Sinh dữ liệu DEMO cho Bản đồ số Thanh niên tình nguyện Hải Phòng.
 *
 *   npx tsx scripts/seed-demo.ts            # tạo dữ liệu sạch
 *   npx tsx scripts/seed-demo.ts --dirty    # tạo kèm bản ghi đăng ký TRÙNG để kiểm migration
 *   npx tsx scripts/seed-demo.ts --reset    # xóa sạch dữ liệu demo
 *   npx tsx scripts/seed-demo.ts --yes      # bỏ qua cảnh báo khi CSDL có dữ liệu thật
 *
 * CHỈ DÙNG CHO CSDL THỬ. Tài khoản demo không đăng nhập được — chúng không có
 * tài khoản Firebase, chỉ tồn tại để hiện trên bản đồ và bảng xếp hạng.
 */

/** Mọi bản ghi demo mang dấu này để --reset xóa được chính xác. */
export const DEMO_UID_PREFIX = 'demo-';

const SO_TNV = 100;
const SO_HOAT_DONG = 20;

async function danhSachIdNguoiDungDemo(): Promise<number[]> {
  const rows = await db.select({ id: users.id })
    .from(users)
    .where(like(users.uid, `${DEMO_UID_PREFIX}%`));
  return rows.map((r) => r.id);
}

async function xoaDuLieuDemo(): Promise<void> {
  const idNguoiDung = await danhSachIdNguoiDungDemo();

  if (idNguoiDung.length === 0) {
    console.log('Không tìm thấy dữ liệu demo nào để xóa.');
    return;
  }

  // Xóa theo thứ tự phụ thuộc khóa ngoại: đăng ký -> hoạt động -> người dùng.
  const idHoatDong = (await db.select({ id: activities.id })
    .from(activities)
    .where(inArray(activities.organizerId, idNguoiDung))).map((r) => r.id);

  if (idHoatDong.length > 0) {
    await db.delete(activityRegistrations).where(inArray(activityRegistrations.activityId, idHoatDong));
  }
  await db.delete(activityRegistrations).where(inArray(activityRegistrations.userId, idNguoiDung));
  if (idHoatDong.length > 0) {
    await db.delete(activities).where(inArray(activities.id, idHoatDong));
  }
  await db.delete(users).where(inArray(users.id, idNguoiDung));

  console.log(`Đã xóa ${idNguoiDung.length} người dùng demo và ${idHoatDong.length} hoạt động demo.`);
}

/** Ràng buộc duy nhất chỉ tồn tại sau khi migration 0001 chạy. */
async function ratBuocDuyNhatDaCo(): Promise<boolean> {
  const ketQua = await db.execute(
    sql`SELECT 1 FROM pg_indexes WHERE indexname = 'uniq_registrations_activity_user'`
  );
  return ketQua.rows.length > 0;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const reset = args.includes('--reset');
  const dirty = args.includes('--dirty');
  const dongY = args.includes('--yes');

  if (reset) {
    await xoaDuLieuDemo();
    process.exit(0);
  }

  // Chặn chạy nhầm vào CSDL thật.
  const nguoiThat = await db.select({ n: sql<number>`count(*)` })
    .from(users)
    .where(not(like(users.uid, `${DEMO_UID_PREFIX}%`)));
  const soNguoiThat = Number(nguoiThat[0]?.n ?? 0);

  if (soNguoiThat > 0 && !dongY) {
    console.error(`DỪNG: cơ sở dữ liệu này đang có ${soNguoiThat} người dùng KHÔNG phải demo.`);
    console.error('Script này chỉ dành cho CSDL thử. Nếu chắc chắn, chạy lại kèm --yes.');
    process.exit(1);
  }

  const danhSachDonVi = await db.select({ id: units.id }).from(units);
  if (danhSachDonVi.length === 0) {
    console.error('DỪNG: bảng units đang rỗng. Chạy `npx tsx scripts/seed-units.ts` trước.');
    process.exit(1);
  }

  await xoaDuLieuDemo();

  const rnd = taoPrng(20260823);

  // --- Người dùng ---
  const banGhiNguoiDung = Array.from({ length: SO_TNV }, (_, i) => {
    // ~10% cố ý không có đơn vị, để demo nhánh "Chưa chọn đơn vị".
    const coDonVi = rnd() > 0.1;
    return {
      uid: `${DEMO_UID_PREFIX}${String(i + 1).padStart(3, '0')}`,
      email: `demo${String(i + 1).padStart(3, '0')}@example.invalid`,
      fullName: taoHoTen(rnd),
      unitId: coDonVi ? chon(rnd, danhSachDonVi).id : null,
      isVerified: rnd() > 0.4,
      role: 'tnv',
    };
  });

  const nguoiDungDaTao = await db.insert(users).values(banGhiNguoiDung).returning({ id: users.id });
  console.log(`Đã tạo ${nguoiDungDaTao.length} tình nguyện viên.`);

  // --- Hoạt động ---
  const gio = 60 * 60 * 1000;
  const banGhiHoatDong = Array.from({ length: SO_HOAT_DONG }, (_, i) => {
    const noi = diaDiem[i % diaDiem.length];
    // 16 đã duyệt, 3 chờ duyệt, 1 từ chối — để diễn được luồng phê duyệt.
    const status = i < 16 ? 'approved' : i < 19 ? 'pending' : 'rejected';
    const batDau = new Date(Date.now() + soNguyenTrongKhoang(rnd, -20, 40) * 24 * gio);
    return {
      title: `${chon(rnd, MAU_TIEU_DE)} ${noi.ten}`,
      description: `Hoạt động tình nguyện do Thành Đoàn Hải Phòng tổ chức tại ${noi.ten}. Đây là DỮ LIỆU DEMO.`,
      organizerId: chon(rnd, nguoiDungDaTao).id,
      timeStart: batDau,
      timeEnd: new Date(batDau.getTime() + soNguyenTrongKhoang(rnd, 4, 9) * gio),
      location: noi.diaChi,
      lat: noi.lat,
      lng: noi.lng,
      requiredVolunteers: soNguyenTrongKhoang(rnd, 10, 60),
      category: chon(rnd, DANH_MUC),
      status,
    };
  });

  const hoatDongDaTao = await db.insert(activities).values(banGhiHoatDong).returning({ id: activities.id });
  console.log(`Đã tạo ${hoatDongDaTao.length} hoạt động (16 đã duyệt, 3 chờ duyệt, 1 từ chối).`);

  // --- Đăng ký ---
  const dangKy: { activityId: number; userId: number }[] = [];
  const demTheoNguoi = new Map<number, number>();
  const demTheoHoatDong = new Map<number, number>();

  for (const nd of nguoiDungDaTao) {
    const soLuot = soNguyenTrongKhoang(rnd, 0, 8);
    const daChon = new Set<number>();
    for (let k = 0; k < soLuot; k++) {
      const hd = chon(rnd, hoatDongDaTao).id;
      if (daChon.has(hd)) continue;   // không tự tạo trùng ở đường sạch
      daChon.add(hd);
      dangKy.push({ activityId: hd, userId: nd.id });
      demTheoNguoi.set(nd.id, (demTheoNguoi.get(nd.id) ?? 0) + 1);
      demTheoHoatDong.set(hd, (demTheoHoatDong.get(hd) ?? 0) + 1);
    }
  }

  await db.insert(activityRegistrations).values(
    dangKy.map((d) => ({ ...d, status: 'registered' }))
  );
  console.log(`Đã tạo ${dangKy.length} lượt đăng ký.`);

  // --- Bản ghi TRÙNG có chủ đích, để kiểm migration dọn trùng và hoàn điểm ---
  let soBanTrung = 0;
  if (dirty) {
    if (await ratBuocDuyNhatDaCo()) {
      console.warn('BỎ QUA --dirty: ràng buộc uniq_registrations_activity_user đã tồn tại,');
      console.warn('nghĩa là migration 0001 đã chạy. Muốn kiểm phần dọn trùng thì phải');
      console.warn('chèn bản trùng TRƯỚC khi chạy migration đó.');
    } else {
      const nhanTrung = dangKy.slice(0, 10);
      await db.insert(activityRegistrations).values(
        nhanTrung.map((d) => ({ ...d, status: 'registered' }))
      );
      soBanTrung = nhanTrung.length;
      // Cộng điểm thừa đúng như app sẽ làm nếu người dùng bấm đăng ký hai lần.
      for (const d of nhanTrung) {
        demTheoNguoi.set(d.userId, (demTheoNguoi.get(d.userId) ?? 0) + 1);
        demTheoHoatDong.set(d.activityId, (demTheoHoatDong.get(d.activityId) ?? 0) + 1);
      }
      console.log(`Đã chèn ${soBanTrung} bản ghi đăng ký TRÙNG có chủ đích.`);
    }
  }

  // --- Số liệu dẫn xuất, không bịa ---
  for (const [userId, soLuot] of demTheoNguoi) {
    await db.update(users).set({
      reputationPoints: tinhDiemUyTin(soLuot),
      activitiesCount: soLuot,
      volunteerHours: soLuot * soNguyenTrongKhoang(rnd, 3, 8),
    }).where(eq(users.id, userId));
  }

  // Cột registered_count chỉ tồn tại sau migration 0001.
  try {
    for (const [activityId, soLuot] of demTheoHoatDong) {
      await db.update(activities)
        .set({ registeredCount: soLuot })
        .where(eq(activities.id, activityId));
    }
  } catch {
    console.warn('Bỏ qua cập nhật registered_count: cột chưa tồn tại (migration 0001 chưa chạy).');
    console.warn('Migration sẽ tự điền số liệu này khi chạy — đó là hành vi đúng.');
  }

  console.log('\nXong. Dữ liệu demo đã sẵn sàng.');
  if (soBanTrung > 0) {
    console.log(`\nCòn ${soBanTrung} bản ghi trùng đang chờ migration 0001 dọn.`);
    console.log('Sau khi chạy migration, kiểm: số đăng ký giảm đúng ' + soBanTrung + ',');
    console.log('và điểm uy tín của những người liên quan giảm đúng ' + soBanTrung * DIEM_MOI_LUOT_DANG_KY + '.');
  }
  console.log('\nLƯU Ý: tài khoản demo KHÔNG đăng nhập được — chúng không có tài khoản Firebase.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Sinh dữ liệu demo thất bại:', err);
  process.exit(1);
});
