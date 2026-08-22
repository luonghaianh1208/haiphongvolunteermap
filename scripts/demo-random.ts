/**
 * Các hàm thuần túy dùng để sinh dữ liệu demo.
 *
 * Tách khỏi `seed-demo.ts` vì file đó gọi `main()` ngay lúc nạp module và
 * chạm cơ sở dữ liệu — test import vào sẽ vô tình chạy nó. Ở đây không có
 * gì chạm CSDL, chạm mạng, hay đọc biến môi trường, nên kiểm thử được đầy đủ.
 */

/** Mỗi lượt đăng ký cộng 5 điểm uy tín — khớp với src/routes/activities.ts */
export const DIEM_MOI_LUOT_DANG_KY = 5;

export const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'] as const;
export const DEM = ['Văn', 'Thị', 'Hữu', 'Đức', 'Minh', 'Quang', 'Thanh', 'Xuân', 'Ngọc', 'Thu', 'Hải', 'Anh', 'Trung', 'Kim'] as const;
export const TEN = ['An', 'Bình', 'Cường', 'Dũng', 'Giang', 'Hà', 'Hùng', 'Khánh', 'Lan', 'Linh', 'Mai', 'Nam', 'Ngọc', 'Phúc', 'Quân', 'Sơn', 'Thảo', 'Trang', 'Tú', 'Vy', 'Yến', 'Đạt', 'Huy', 'Chi', 'Duy', 'Hạnh', 'Khoa', 'Nhung', 'Phong', 'Quyên'] as const;

/** Đúng 5 danh mục mà giao diện đang dùng — xem DashboardPage.tsx */
export const DANH_MUC = ['Môi trường', 'An sinh xã hội', 'Tiếp sức mùa thi', 'Hiến máu nhân đạo', 'Phản ứng nhanh'] as const;

export const MAU_TIEU_DE = [
  'Ra quân làm sạch',
  'Chiến dịch tình nguyện tại',
  'Ngày hội hiến máu tại',
  'Tiếp sức mùa thi tại',
  'Đội phản ứng nhanh hỗ trợ',
  'Thắp sáng đường quê tại',
  'Chủ nhật xanh tại',
] as const;

/**
 * Bộ sinh số giả ngẫu nhiên có hạt giống cố định (mulberry32).
 *
 * Dùng hạt giống cố định thay vì Math.random để chạy lại cho ra CÙNG bộ dữ liệu.
 * Buổi trình bày nào cũng thấy đúng những con số đã chuẩn bị, không đổi bất ngờ.
 */
export function taoPrng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function chon<T>(rnd: () => number, mang: readonly T[]): T {
  return mang[Math.floor(rnd() * mang.length)];
}

/** Trả số nguyên trong khoảng [min, max], bao gồm cả hai đầu. */
export function soNguyenTrongKhoang(rnd: () => number, min: number, max: number): number {
  return min + Math.floor(rnd() * (max - min + 1));
}

/** Ghép họ + đệm + tên thành họ tên đầy đủ kiểu Việt Nam. */
export function taoHoTen(rnd: () => number): string {
  return `${chon(rnd, HO)} ${chon(rnd, DEM)} ${chon(rnd, TEN)}`;
}

/** Điểm uy tín SUY RA từ số lượt đăng ký, không bịa ra con số. */
export function tinhDiemUyTin(soLuotDangKy: number): number {
  return soLuotDangKy * DIEM_MOI_LUOT_DANG_KY;
}
