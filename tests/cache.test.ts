import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cached, invalidate, clearAll } from '../src/lib/cache.ts';

describe('cache', () => {
  beforeEach(() => {
    clearAll();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('1. gọi lần đầu thì chạy hàm gốc', async () => {
    const fn = vi.fn().mockResolvedValue('A');
    const result = await cached('k', 1000, fn);
    expect(result).toBe('A');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('2. gọi lại trong thời gian sống thì không chạy hàm gốc', async () => {
    const fn = vi.fn().mockResolvedValue('A');
    await cached('k', 1000, fn);
    const result = await cached('k', 1000, fn);
    expect(result).toBe('A');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('3. gọi lại sau khi hết hạn thì chạy lại hàm gốc', async () => {
    const fn = vi.fn().mockResolvedValue('A');
    await cached('k', 1000, fn);
    vi.advanceTimersByTime(1001);
    await cached('k', 1000, fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('4. 10 lời gọi đồng thời khi cache rỗng chỉ chạy hàm gốc 1 lần', async () => {
    let resolveFn: (v: string) => void = () => {};
    const fn = vi.fn(() => new Promise<string>((r) => { resolveFn = r; }));

    const calls = Array.from({ length: 10 }, () => cached('k', 1000, fn));
    resolveFn('A');
    const results = await Promise.all(calls);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(results).toEqual(Array(10).fill('A'));
  });

  it('5. hàm gốc ném lỗi thì lỗi được ném ra và KHÔNG lưu vào cache', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('hỏng'))
      .mockResolvedValueOnce('A');

    await expect(cached('k', 1000, fn)).rejects.toThrow('hỏng');

    const result = await cached('k', 1000, fn);
    expect(result).toBe('A');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('6. invalidate xóa đúng tiền tố, giữ nguyên khóa khác', async () => {
    const fn = vi.fn().mockResolvedValue('A');
    await cached('units:public', 1000, fn);
    await cached('stats', 1000, fn);
    expect(fn).toHaveBeenCalledTimes(2);

    invalidate('units:');

    await cached('units:public', 1000, fn);
    expect(fn).toHaveBeenCalledTimes(3);

    await cached('stats', 1000, fn);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('7. vượt 500 mục thì loại mục thêm sớm nhất', async () => {
    const fn = vi.fn().mockResolvedValue('A');
    for (let i = 0; i < 500; i++) {
      await cached(`k${i}`, 60_000, fn);
    }
    expect(fn).toHaveBeenCalledTimes(500);

    await cached('k500', 60_000, fn);
    expect(fn).toHaveBeenCalledTimes(501);

    await cached('k0', 60_000, fn);
    expect(fn).toHaveBeenCalledTimes(502);

    await cached('k499', 60_000, fn);
    expect(fn).toHaveBeenCalledTimes(502);
  });

  it('8. khóa khác nhau không đè lên nhau', async () => {
    const fnA = vi.fn().mockResolvedValue('A');
    const fnB = vi.fn().mockResolvedValue('B');
    expect(await cached('a', 1000, fnA)).toBe('A');
    expect(await cached('b', 1000, fnB)).toBe('B');
    expect(await cached('a', 1000, fnA)).toBe('A');
  });

  it('9. ttlMs = 0 thì bỏ qua cache hoàn toàn', async () => {
    const fn = vi.fn().mockResolvedValue('A');
    await cached('k', 0, fn);
    await cached('k', 0, fn);
    await cached('k', 0, fn);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('9b. ttlMs = 0 thì KHÔNG gộp request trùng, kể cả khi gọi đồng thời', async () => {
    // Dùng mảng resolver thay vì 1 biến resolveFn dùng chung: với ttlMs=0,
    // fn() được gọi độc lập ở MỖI lần cached() (không qua inflight), nên có
    // tới 10 promise cần resolve riêng — 1 biến dùng chung sẽ bị ghi đè và
    // làm 9 promise còn lại treo vô thời hạn (đã xác nhận bằng thực nghiệm:
    // bản dùng 1 biến resolveFn bị timeout, không phải fail đúng nghĩa).
    const resolvers: Array<(v: string) => void> = [];
    const fn = vi.fn(() => new Promise<string>((r) => { resolvers.push(r); }));

    const calls = Array.from({ length: 10 }, () => cached('k', 0, fn));
    resolvers.forEach((r) => r('A'));
    const results = await Promise.all(calls);

    // Khác hẳn test 4: ở đó ttl > 0 nên gộp còn 1 lời gọi (1 resolver).
    // Ở đây ttl = 0 nên KHÔNG được gộp — mỗi request phải tự chạy hàm gốc
    // (10 resolver độc lập).
    expect(fn).toHaveBeenCalledTimes(10);
    expect(results).toEqual(Array(10).fill('A'));
  });
});
