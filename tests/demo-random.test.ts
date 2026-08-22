import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  DANH_MUC,
  DEM,
  HO,
  TEN,
  chon,
  soNguyenTrongKhoang,
  taoHoTen,
  taoPrng,
  tinhDiemUyTin,
} from '../scripts/demo-random.ts';
import diaDiem from '../src/data/demo-locations.json' with { type: 'json' };

describe('sinh dữ liệu demo', () => {
  it('1. cùng hạt giống cho ra cùng dãy số', () => {
    const a = taoPrng(12345);
    const b = taoPrng(12345);
    const dayA = Array.from({ length: 20 }, () => a());
    const dayB = Array.from({ length: 20 }, () => b());
    expect(dayA).toEqual(dayB);
  });

  it('2. hạt giống khác cho ra dãy khác', () => {
    const a = taoPrng(1);
    const b = taoPrng(2);
    expect(a()).not.toBe(b());
  });

  it('3. số sinh ra luôn nằm trong [0, 1)', () => {
    const rnd = taoPrng(999);
    for (let i = 0; i < 1000; i++) {
      const v = rnd();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('4. soNguyenTrongKhoang bao gồm cả hai đầu và không bao giờ vượt ra', () => {
    const rnd = taoPrng(42);
    const daThay = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = soNguyenTrongKhoang(rnd, 3, 7);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      daThay.add(v);
    }
    // Phải chạm được cả biên dưới lẫn biên trên, nếu không thì công thức lệch.
    expect(daThay.has(3)).toBe(true);
    expect(daThay.has(7)).toBe(true);
  });

  it('5. chon luôn trả về phần tử có trong mảng', () => {
    const rnd = taoPrng(7);
    for (let i = 0; i < 200; i++) {
      expect(DANH_MUC).toContain(chon(rnd, DANH_MUC));
    }
  });

  it('6. taoHoTen ghép đúng ba phần từ ba danh sách', () => {
    const rnd = taoPrng(2026);
    for (let i = 0; i < 200; i++) {
      const phan = taoHoTen(rnd).split(' ');
      expect(phan).toHaveLength(3);
      expect(HO).toContain(phan[0]);
      expect(DEM).toContain(phan[1]);
      expect(TEN).toContain(phan[2]);
    }
  });

  it('7. điểm uy tín suy ra đúng từ số lượt đăng ký', () => {
    expect(tinhDiemUyTin(0)).toBe(0);
    expect(tinhDiemUyTin(1)).toBe(5);
    expect(tinhDiemUyTin(8)).toBe(40);
  });

  it('8. mọi địa điểm demo nằm TRONG khung bao Hải Phòng của bản đồ', () => {
    // Đọc thẳng từ MapPage.tsx thay vì chép cứng, để nếu ai đó đổi khung bao
    // thì test này tự đối chiếu theo giá trị mới, không bị lệch âm thầm.
    const nguon = readFileSync('src/pages/MapPage.tsx', 'utf8');
    const khop = nguon.match(
      /HAI_PHONG_BOUNDS[\s\S]*?\[\s*([\d.]+)\s*,\s*([\d.]+)\s*\][\s\S]*?\[\s*([\d.]+)\s*,\s*([\d.]+)\s*\]/
    );
    expect(khop, 'không đọc được HAI_PHONG_BOUNDS từ MapPage.tsx').not.toBeNull();

    const [minLat, minLng, maxLat, maxLng] = khop!.slice(1, 5).map(Number);

    for (const noi of diaDiem) {
      expect(noi.lat, `${noi.ten} lệch vĩ độ`).toBeGreaterThanOrEqual(minLat);
      expect(noi.lat, `${noi.ten} lệch vĩ độ`).toBeLessThanOrEqual(maxLat);
      expect(noi.lng, `${noi.ten} lệch kinh độ`).toBeGreaterThanOrEqual(minLng);
      expect(noi.lng, `${noi.ten} lệch kinh độ`).toBeLessThanOrEqual(maxLng);
    }
  });

  it('9. địa điểm demo không trùng toạ độ và có đủ trường', () => {
    const khoa = new Set(diaDiem.map((n) => `${n.lat},${n.lng}`));
    expect(khoa.size).toBe(diaDiem.length);
    for (const noi of diaDiem) {
      expect(noi.ten.trim()).not.toBe('');
      expect(noi.diaChi.trim()).not.toBe('');
    }
  });
});
