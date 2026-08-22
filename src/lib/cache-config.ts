/**
 * Thời gian sống của cache, đọc từ biến môi trường MỘT LẦN lúc khởi động.
 *
 * Mặc định là 0 (tắt cache) khi biến vắng mặt hoặc không hợp lệ.
 * Quên cấu hình thì hệ thống chạy ĐÚNG nhưng chậm, không bao giờ nhanh nhưng sai.
 */

export function readTtl(name: string): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return 0;

  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    console.warn(`[cache] ${name}="${raw}" không hợp lệ, dùng 0 (tắt cache)`);
    return 0;
  }
  return value;
}

export const CACHE_TTL = {
  stats: readTtl('CACHE_TTL_STATS'),
  leaderboard: readTtl('CACHE_TTL_LEADERBOARD'),
  units: readTtl('CACHE_TTL_UNITS'),
};
