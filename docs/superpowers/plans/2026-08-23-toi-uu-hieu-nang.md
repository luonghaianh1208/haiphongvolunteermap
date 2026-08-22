# Tối ưu hiệu năng — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Giảm tải cơ sở dữ liệu và tăng tốc phản hồi cho quy mô ~300.000 người dùng, bằng index, cache điều khiển qua biến môi trường, và cột đếm sẵn — đồng thời sửa một lỗi cộng điểm trùng.

**Architecture:** Ba lớp độc lập nhau. Lớp index để Postgres tra cứu thay vì quét bảng. Lớp cache trong bộ nhớ tiến trình, tắt hoàn toàn ở giai đoạn demo và bật bằng biến môi trường sau nghiệm thu. Lớp cột đếm sẵn `registered_count` xóa phép `GROUP BY` khỏi endpoint không cache được. Cache **chỉ là tối ưu, không bao giờ chứa state bắt buộc** — xóa sạch cache không được làm sai kết quả.

**Tech Stack:** Express 4.21 · Drizzle ORM 0.45 (Postgres) · React 19 · TypeScript 5.8 · **Vitest** (mới, devDependency)

**Spec:** [2026-08-23-toi-uu-hieu-nang-design.md](../specs/2026-08-23-toi-uu-hieu-nang-design.md)

## Global Constraints

- **Nhánh làm việc: `feat/perf`**, tách từ `main`. Implementer tự commit trên nhánh này. **KHÔNG `git push`**, **KHÔNG** chuyển sang `main`.
- **Ngôn ngữ giao diện tiếng Việt có dấu.** Tên biến, tên hàm, tên file giữ tiếng Anh.
- **Không thêm dependency runtime.** `vitest` là **devDependency** và đã được duyệt trong spec (quyết định 6) — đây là ngoại lệ duy nhất.
- **Import trong `src/` và `scripts/` dùng đuôi `.ts` đầy đủ**, theo lối viết hiện tại của codebase.
- **Mặc định thời gian cache là `0`** khi biến môi trường vắng mặt. Quên cấu hình thì hệ thống chạy **đúng nhưng chậm**, không bao giờ nhanh nhưng sai.
- **Ba endpoint KHÔNG BAO GIỜ được cache**, không có biến môi trường nào bật được: `GET /api/activities`, `GET /api/units?includeInactive=true`, mọi thứ dưới `/api/user/*` và `POST /api/auth/sync`.
- **Không phá ba bản vá bảo mật của Đợt A:**
  - **S1** — `src/routes/leaderboard.ts` không có trường `email`
  - **S2** — `src/routes/activities.ts` giữ dòng `const effective = isStaff ? requested : 'approved';`
  - **S3** — không nơi nào trong `src/routes/` hay `server.ts` trả `err.message` ra client
- **Mọi handler async phải bọc `asyncHandler`** — Express 4 không tự bắt lỗi async, quên bọc thì request treo.
- **Ném lỗi bằng `throw new HttpError(status, 'thông điệp tiếng Việt')`**, không dùng `res.status().json()`.
- **Cổng bắt buộc trước khi kết thúc mỗi task:** `npx tsc --noEmit` phải **0 lỗi** (repo đã sạch từ Đợt A, đừng làm bẩn lại), và `npm run build` thành công.

## Bối cảnh môi trường

**Chưa có Postgres.** Người dùng đang dựng VPS Hostinger KVM2 + Coolify, chưa kết nối CSDL. Nghĩa là:

- **Task 1 và 2 kiểm thử được đầy đủ** — logic cache là hàm thuần túy, không chạm CSDL. Đây là lý do chúng đứng đầu.
- **Các task còn lại chỉ xác minh tĩnh được**: `tsc`, `npm run build`, đọc code, và `curl` để xác nhận route vẫn trả 500 (lỗi kết nối CSDL) chứ không phải 404 hay treo.
- **Không được giả vờ đã chạy** những bước cần CSDL. Mỗi task có mục "Checklist khi có CSDL" để chạy lại sau.

Server dev chạy bằng `npm run dev` ở cổng 3000. Gặp `EADDRINUSE` thì dừng tiến trình cũ trước.

---

## Cấu trúc file

### Tạo mới

| File | Trách nhiệm |
|---|---|
| `vitest.config.ts` | Cấu hình Vitest chạy môi trường node, chỉ lấy file trong `tests/` |
| `src/lib/cache.ts` | Cache trong bộ nhớ: hết hạn theo thời gian, gộp request trùng, giới hạn kích thước |
| `src/lib/cache-config.ts` | Đọc biến môi trường `CACHE_TTL_*` một lần lúc khởi động |
| `tests/cache.test.ts` | 10 trường hợp kiểm thử cho hai module trên |
| `scripts/recount-registrations.ts` | Đối chiếu và sửa `registered_count` khi nghi lệch |

### Sửa

| File | Thay đổi |
|---|---|
| `package.json` | Thêm `vitest` vào devDependencies, thêm script `test` |
| `.env.example` | Khai báo 3 biến `CACHE_TTL_*` |
| `server.ts` | `PORT` đọc từ biến môi trường |
| `src/db/schema.ts` | 5 index + cột `registered_count` |
| `src/db/users.ts` | `getOrCreateUser` đọc trước, gộp 2 truy vấn thành 1 |
| `src/routes/stats.ts` | Bọc cache |
| `src/routes/leaderboard.ts` | Bọc cache cả 2 route |
| `src/routes/units.ts` | Bọc cache nhánh công khai + xóa cache khi ghi |
| `src/routes/activities.ts` | Dùng cột đếm sẵn, thêm `limit`, viết lại endpoint đăng ký |

**Vì sao tách `cache.ts` và `cache-config.ts`:** `cache.ts` là cấu trúc dữ liệu thuần túy, không biết gì về biến môi trường hay endpoint nào. `cache-config.ts` là chỗ duy nhất đọc `process.env`. Tách ra thì `cache.ts` kiểm thử được mà không phải giả lập môi trường.

---

## Task 1: Dựng Vitest và module cache

**Files:**
- Create: `vitest.config.ts`, `src/lib/cache.ts`, `tests/cache.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: không
- Produces:
  - `export function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T>`
  - `export function invalidate(prefix: string): void`
  - `export function clearAll(): void`

Đây là task theo TDD thật: viết test trước, xem nó đỏ, rồi mới cài đặt.

- [ ] **Step 1: Cài Vitest**

```bash
npm install --save-dev vitest
```

Thêm vào `"scripts"` trong `package.json`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Tạo `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

**Vì sao cần file riêng:** Vitest mặc định đọc `vite.config.ts`, mà file đó nạp plugin React và Tailwind — không cần thiết cho test logic thuần túy và có thể gây lỗi. File cấu hình riêng khiến Vitest bỏ qua nó.

- [ ] **Step 3: Viết test — chạy trước khi có code, phải đỏ**

Tạo `tests/cache.test.ts`:

```ts
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
});
```

**Ghi chú về trường hợp 7:** `k0` bị loại nên gọi lại phải chạy hàm gốc. `k499` vẫn còn nên không chạy. Đó là cách chứng minh loại đúng mục **sớm nhất** chứ không phải loại bừa.

**Ghi chú về trường hợp 9:** đây là đường đi của giai đoạn demo. Ba lần gọi phải chạy đủ ba lần — nếu chỉ chạy một lần thì cơ chế gộp request trùng đã lọt vào nhánh `ttlMs = 0`, sai.

- [ ] **Step 4: Chạy test, xác nhận đỏ**

```bash
npm test
```
Kỳ vọng: **THẤT BẠI** với lỗi không tìm thấy module `../src/lib/cache.ts`.

- [ ] **Step 5: Cài đặt `src/lib/cache.ts`**

```ts
/**
 * Cache trong bộ nhớ tiến trình.
 *
 * NGUYÊN TẮC: đây chỉ là tối ưu, KHÔNG BAO GIỜ chứa state bắt buộc.
 * Xóa sạch cache, khởi động lại tiến trình, hay chạy thêm replica đều
 * không được làm sai kết quả — chỉ được làm chậm hơn.
 */

type Entry = { value: unknown; expiresAt: number };

/** Chặn rò rỉ bộ nhớ từ khóa động như `lb:unit:<id>` (114 giá trị khả dĩ). */
const MAX_ENTRIES = 500;

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

export function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  // ttlMs = 0: bỏ qua hoàn toàn. Không đọc, không ghi, không gộp request trùng.
  // Đây là đường đi của giai đoạn demo — phải giống hệt như chưa từng có cache.
  if (ttlMs <= 0) return fn();

  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return Promise.resolve(hit.value as T);
  }

  // Gộp request trùng: nếu đã có một lời gọi đang chạy cho khóa này,
  // mọi request đến sau chờ chung kết quả đó thay vì cùng lao xuống CSDL.
  const running = inflight.get(key);
  if (running) return running as Promise<T>;

  const promise = fn()
    .then((value) => {
      setEntry(key, value, ttlMs);
      inflight.delete(key);
      return value;
    })
    .catch((err) => {
      // KHÔNG lưu lỗi vào cache — lần gọi sau phải được thử lại.
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, promise);
  return promise;
}

function setEntry(key: string, value: unknown, ttlMs: number): void {
  if (store.size >= MAX_ENTRIES && !store.has(key)) {
    // Map giữ thứ tự chèn, nên khóa đầu tiên là mục được thêm sớm nhất.
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/** Xóa mọi khóa bắt đầu bằng `prefix`. Dùng khi dữ liệu nguồn vừa thay đổi. */
export function invalidate(prefix: string): void {
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(prefix)) store.delete(key);
  }
  for (const key of Array.from(inflight.keys())) {
    if (key.startsWith(prefix)) inflight.delete(key);
  }
}

/** Chỉ dùng trong test. */
export function clearAll(): void {
  store.clear();
  inflight.clear();
}
```

- [ ] **Step 6: Chạy test, xác nhận xanh**

```bash
npm test
```
Kỳ vọng: **9/9 đạt**.

Nếu trường hợp 4 thất bại: kiểm lại thứ tự — phải đặt promise vào `inflight` **trước khi** await nó.
Nếu trường hợp 9 thất bại: nhánh `ttlMs <= 0` phải đứng **trước** mọi thao tác đọc cache.

- [ ] **Step 7: Cổng kỹ thuật**

```bash
npx tsc --noEmit
npm run build
```
Kỳ vọng: `tsc` **0 lỗi**, build thành công.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/cache.ts tests/cache.test.ts
git commit -m "feat(perf): module cache trong bộ nhớ có gộp request trùng, kèm Vitest"
```

---

## Task 2: Module đọc cấu hình thời gian cache

**Files:**
- Create: `src/lib/cache-config.ts`
- Modify: `tests/cache.test.ts` (thêm nhóm test mới), `.env.example`

**Interfaces:**
- Consumes: không
- Produces:
  - `export function readTtl(name: string): number`
  - `export const CACHE_TTL: { stats: number; leaderboard: number; units: number }`

- [ ] **Step 1: Viết test trước**

Thêm vào cuối `tests/cache.test.ts`:

Thêm `readTtl` vào dòng import sẵn có ở đầu file:
```ts
import { readTtl } from '../src/lib/cache-config.ts';
```

Rồi thêm nhóm test:

```ts
describe('readTtl', () => {
  const TEN = 'CACHE_TTL_TEST';
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    delete process.env[TEN];
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
    delete process.env[TEN];
  });

  it('10a. biến vắng mặt thì trả 0, không cảnh báo', () => {
    expect(readTtl(TEN)).toBe(0);
    expect(warn).not.toHaveBeenCalled();
  });

  it('10b. chuỗi toàn khoảng trắng thì trả 0, không cảnh báo', () => {
    process.env[TEN] = '   ';
    expect(readTtl(TEN)).toBe(0);
    expect(warn).not.toHaveBeenCalled();
  });

  it('10c. giá trị âm thì trả 0 KÈM cảnh báo', () => {
    process.env[TEN] = '-5';
    expect(readTtl(TEN)).toBe(0);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('10d. giá trị không phải số thì trả 0 KÈM cảnh báo', () => {
    process.env[TEN] = 'abc';
    expect(readTtl(TEN)).toBe(0);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('10e. giá trị hợp lệ thì trả đúng số', () => {
    process.env[TEN] = '600000';
    expect(readTtl(TEN)).toBe(600000);
  });
});
```

**Vì sao kiểm thử `readTtl` chứ không kiểm thử `CACHE_TTL`:** `CACHE_TTL` được tính **một lần lúc nạp module**. Test đổi `process.env` sau khi module đã nạp sẽ không thấy thay đổi. Nên kiểm thử hàm, không kiểm thử hằng số.

**Lưu ý:** nhóm test này **không** dùng đồng hồ giả. Nếu `beforeEach` ở nhóm `describe('cache')` phía trên gọi `vi.useFakeTimers()` thì nó chỉ ảnh hưởng trong phạm vi nhóm đó, vì đã có `vi.useRealTimers()` trong `afterEach` tương ứng.

- [ ] **Step 2: Chạy test, xác nhận đỏ**

```bash
npm test
```
Kỳ vọng: 5 test mới **THẤT BẠI**, 9 test cũ vẫn đạt.

- [ ] **Step 3: Cài đặt `src/lib/cache-config.ts`**

```ts
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
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

```bash
npm test
```
Kỳ vọng: **14/14 đạt**.

- [ ] **Step 5: Khai báo biến trong `.env.example`**

Thêm vào cuối file:

```bash
# --- Thời gian sống của cache, đơn vị mili-giây ---
# Để trống hoặc 0 = TẮT cache hoàn toàn. Đây là mặc định, và là cấu hình
# dùng cho giai đoạn demo với lãnh đạo (mọi số liệu phản hồi tức thì).
#
# Sau khi nghiệm thu, bật giá trị production bằng cách bỏ chú thích bên dưới.
# Đổi giữa hai giai đoạn CHỈ cần sửa file này và khởi động lại, không sửa code.

CACHE_TTL_STATS="0"          # production khuyến nghị: 600000  (10 phút)
CACHE_TTL_LEADERBOARD="0"    # production khuyến nghị: 60000   (60 giây)
CACHE_TTL_UNITS="0"          # production khuyến nghị: 900000  (15 phút)
```

- [ ] **Step 6: Cổng kỹ thuật**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/cache-config.ts tests/cache.test.ts .env.example
git commit -m "feat(perf): đọc thời gian cache từ biến môi trường, mặc định tắt"
```

---

## Task 3: Sửa PORT hardcode

**Files:**
- Modify: `server.ts:13`

**Interfaces:**
- Consumes: không
- Produces: không

Task nhỏ nhưng **chặn triển khai**: Coolify và mọi nền tảng container đều tiêm biến `PORT` và yêu cầu ứng dụng lắng nghe đúng cổng đó. Không sửa thì app không khởi động được.

- [ ] **Step 1: Sửa**

Đổi từ:
```ts
  const PORT = 3000;
```
thành:
```ts
  // Coolify và các nền tảng container tiêm biến PORT; phải nghe đúng cổng đó.
  const PORT = Number(process.env.PORT) || 3000;
```

- [ ] **Step 2: Xác minh biến môi trường có tác dụng**

```bash
PORT=8123 npm run dev
```
Kỳ vọng: log in `Server running on port 8123`.

Ở terminal khác:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8123/api/health
```
Kỳ vọng: `200`.

Dừng server, chạy lại không có biến:
```bash
npm run dev
```
Kỳ vọng: `Server running on port 3000` — giá trị dự phòng vẫn đúng.

- [ ] **Step 3: Cổng kỹ thuật**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add server.ts
git commit -m "fix: PORT đọc từ biến môi trường để chạy được trên Coolify"
```

---

## Task 4: Index và cột đếm sẵn trong schema

**Files:**
- Modify: `src/db/schema.ts`
- Create: file migration trong `drizzle/` (do `drizzle-kit` sinh, rồi sửa tay)

**Interfaces:**
- Consumes: không
- Produces:
  - `activities.registeredCount` — cột `integer`, `NOT NULL`, mặc định `0`
  - Ràng buộc `uniq_registrations_activity_user` trên `(activity_id, user_id)` — Task 7 bắt lỗi vi phạm theo **đúng tên này**

- [ ] **Step 1: Thêm index cho bảng `users`**

Drizzle khai báo index bằng tham số thứ ba của `pgTable`. Sửa khai báo `users`, thêm sau object định nghĩa cột:

```ts
export const users = pgTable('users', {
  // ... giữ nguyên toàn bộ cột hiện có ...
}, (t) => ({
  reputationIdx: index('idx_users_reputation').on(t.reputationPoints),
  unitReputationIdx: index('idx_users_unit_reputation').on(t.unitId, t.reputationPoints),
}));
```

Thêm `index` vào danh sách import từ `drizzle-orm/pg-core`.

**Vì sao không khai báo `DESC`:** các truy vấn sắp giảm dần (`ORDER BY reputation_points DESC`), nhưng Postgres **quét ngược được index B-tree thông thường** với chi phí như nhau. Chiều sắp xếp trong index chỉ quan trọng khi sắp nhiều cột theo chiều trái ngược nhau — không phải trường hợp ở đây. Dùng index thường tránh được rủi ro cú pháp và cho kết quả y hệt.

- [ ] **Step 2: Thêm index cho `activities` và cột `registered_count`**

```ts
export const activities = pgTable('activities', {
  // ... giữ nguyên toàn bộ cột hiện có ...
  registeredCount: integer('registered_count').notNull().default(0),
}, (t) => ({
  statusCreatedIdx: index('idx_activities_status_created').on(t.status, t.createdAt),
}));
```

- [ ] **Step 3: Thêm index cho `activity_registrations`**

```ts
export const activityRegistrations = pgTable('activity_registrations', {
  // ... giữ nguyên toàn bộ cột hiện có ...
}, (t) => ({
  userCreatedIdx: index('idx_registrations_user_created').on(t.userId, t.createdAt),
  activityUserUniq: uniqueIndex('uniq_registrations_activity_user').on(t.activityId, t.userId),
}));
```

Thêm `uniqueIndex` vào danh sách import từ `drizzle-orm/pg-core`.

**Tên `uniq_registrations_activity_user` phải đúng từng ký tự** — Task 7 bắt lỗi vi phạm ràng buộc bằng cách so tên này.

- [ ] **Step 4: Sinh migration**

```bash
npx drizzle-kit generate --config=src/db/drizzle.config.ts
```

Mở file SQL vừa sinh trong `drizzle/`. Nó phải chứa: `ALTER TABLE "activities" ADD COLUMN "registered_count"`, 4 lệnh `CREATE INDEX`, và 1 lệnh `CREATE UNIQUE INDEX`.

- [ ] **Step 5: Sửa tay file migration — thêm 2 khối bắt buộc**

`drizzle-kit` không biết gì về dữ liệu, nên phải tự thêm.

**Khối 1 — dọn bản ghi trùng, đặt TRƯỚC lệnh `CREATE UNIQUE INDEX`:**

```sql
--> statement-breakpoint
-- Dọn đăng ký trùng trước khi tạo ràng buộc duy nhất.
-- Giữ bản ghi cũ nhất theo id, xóa các bản trùng còn lại.
DELETE FROM "activity_registrations" a
USING "activity_registrations" b
WHERE a.activity_id = b.activity_id
  AND a.user_id = b.user_id
  AND a.id > b.id;
```

Không có khối này, `CREATE UNIQUE INDEX` sẽ thất bại nếu CSDL đã có dữ liệu trùng, và **cả migration bị hoàn tác**.

**Khối 2 — điền số liệu cho cột mới, đặt SAU lệnh `ADD COLUMN`:**

```sql
--> statement-breakpoint
-- Điền registered_count cho các hoạt động đã có.
UPDATE "activities" a
SET registered_count = (
  SELECT count(*) FROM "activity_registrations" r WHERE r.activity_id = a.id
);
```

Không có khối này, mọi hoạt động cũ sẽ hiện 0 người đăng ký dù thực tế có.

- [ ] **Step 6: KHÔNG chạy migration**

Chưa có Postgres. **Không chạy `drizzle-kit migrate`.** Ghi vào checklist bàn giao.

- [ ] **Step 7: Cổng kỹ thuật**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 8: Commit**

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat(db): 5 index và cột registered_count, kèm dọn trùng và điền số liệu"
```

**Checklist khi có CSDL:**
```bash
npx drizzle-kit migrate --config=src/db/drizzle.config.ts
```
Rồi xác nhận:
```sql
SELECT indexname FROM pg_indexes WHERE tablename IN ('users','activities','activity_registrations');
SELECT count(*) FROM activities WHERE registered_count IS NULL;   -- phải là 0
```

---

## Task 5: Bọc cache cho `/api/stats` và hai route bảng xếp hạng

**Files:**
- Modify: `src/routes/stats.ts`, `src/routes/leaderboard.ts`

**Interfaces:**
- Consumes: `cached` từ `src/lib/cache.ts`, `CACHE_TTL` từ `src/lib/cache-config.ts`
- Produces: không

**Nguyên tắc quan trọng:** bọc **phần truy vấn**, không bọc cả handler. Việc đọc và kiểm tra tham số phải chạy cho **mọi** request.

- [ ] **Step 1: Bọc `/api/stats`**

Trong `src/routes/stats.ts`, thêm import:
```ts
import { cached } from '../lib/cache.ts';
import { CACHE_TTL } from '../lib/cache-config.ts';
```

Sửa handler:
```ts
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
```

Giữ nguyên các hằng số `+1250`, `+4820`, `1040` và chú thích — chúng đang chờ người dùng quyết định, **không được đụng**.

- [ ] **Step 2: Bọc `/api/leaderboard`**

Trong `src/routes/leaderboard.ts`, thêm cùng hai import trên.

Khóa cache phải phân biệt được có lọc hay không:
```ts
  const key = (unitId !== null && !Number.isNaN(unitId)) ? `lb:unit:${unitId}` : 'lb:all';

  const topVolunteers = await cached(key, CACHE_TTL.leaderboard, async () => {
    // ... giữ nguyên toàn bộ truy vấn hiện có, gồm cả biểu thức ba ngôi
    // và hai builder độc lập đã tách ở Đợt A ...
  });

  res.json({ topVolunteers });
```

**Giữ nguyên:** không có trường `email`, lọc theo `unitId` **trước** `.limit(10)`, dùng `leftJoin` để TNV chưa chọn đơn vị vẫn hiện với `unitName: null`, và hai nhánh vẫn dựng builder riêng.

- [ ] **Step 3: Bọc `/api/leaderboard/units`**

```ts
  const key = sortByAvg ? 'lbunits:avg' : 'lbunits:total';

  const topUnits = await cached(key, CACHE_TTL.leaderboard, async () => {
    // ... giữ nguyên toàn bộ truy vấn, phép tính enriched, lọc ngưỡng
    // MIN_MEMBERS_FOR_AVG và slice(0, 20) hiện có ...
  });

  res.json({ topUnits });
```

Hai route bảng xếp hạng **dùng chung** `CACHE_TTL.leaderboard` — hai bảng nên tươi như nhau.

- [ ] **Step 4: Xác minh route vẫn sống**

Chưa có CSDL nên cả ba route trả 500. Điều cần xác nhận là chúng **vẫn trả 500**, không thành 404 và không treo:

```bash
npm run dev
```
Terminal khác:
```bash
curl -s -o /dev/null -w "stats=%{http_code}\n" http://localhost:3000/api/stats
curl -s -o /dev/null -w "lb=%{http_code}\n" http://localhost:3000/api/leaderboard
curl -s -o /dev/null -w "lbunits=%{http_code}\n" http://localhost:3000/api/leaderboard/units
```
Kỳ vọng: cả ba là `500`. Treo không phản hồi nghĩa là thiếu `asyncHandler` ở đâu đó.

Vì `CACHE_TTL` mặc định là 0 nên lúc này cache đang tắt — đúng như thiết kế.

- [ ] **Step 5: Xác minh S1 còn nguyên**

```bash
grep -n "email" src/routes/leaderboard.ts
```
Kỳ vọng: **rỗng**.

- [ ] **Step 6: Cổng kỹ thuật**

```bash
npx tsc --noEmit
npm run build
npm test
```
Kỳ vọng: `tsc` 0 lỗi, build thành công, 14/14 test đạt.

- [ ] **Step 7: Commit**

```bash
git add src/routes/stats.ts src/routes/leaderboard.ts
git commit -m "perf: bọc cache cho /api/stats và hai route bảng xếp hạng"
```

**Checklist khi có CSDL:**
1. Không đặt biến `CACHE_TTL_*` → gọi `/api/stats` hai lần, log CSDL phải có **2** truy vấn
2. Đặt `CACHE_TTL_STATS=600000`, khởi động lại → gọi hai lần, log chỉ có **1** truy vấn

---

## Task 6: Bọc cache và xóa cache cho `/api/units`

**Files:**
- Modify: `src/routes/units.ts`

**Interfaces:**
- Consumes: `cached`, `invalidate` từ `src/lib/cache.ts`; `CACHE_TTL` từ `src/lib/cache-config.ts`
- Produces: không

Task này tách riêng khỏi Task 5 vì có thêm phần xóa cache khi ghi — một cơ chế khác hẳn.

- [ ] **Step 1: Chỉ bọc nhánh CÔNG KHAI**

Route `GET /api/units` có hai nhánh. Chỉ nhánh công khai được cache:

```ts
router.get('/api/units', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const role = await getUserRole(req);
  const wantsAll = req.query.includeInactive === 'true' && role === 'thanh_doan';

  if (wantsAll) {
    // KHÔNG BAO GIỜ cache nhánh này: dữ liệu quản trị, cần chính xác,
    // và phụ thuộc quyền của người gọi.
    const rows = await db.select({ /* ... giữ nguyên ... */ })
      // ... giữ nguyên toàn bộ truy vấn có leftJoin, groupBy, memberCount ...
    res.json({ units: rows.map(r => ({ ...r, memberCount: Number(r.memberCount) })) });
    return;
  }

  const rows = await cached('units:public', CACHE_TTL.units, async () => {
    return db.select({
      id: units.id,
      name: units.name,
      type: units.type,
      isActive: units.isActive,
    })
      .from(units)
      .where(eq(units.isActive, true))
      .orderBy(asc(units.name));
  });

  res.json({ units: rows });
}));
```

**Việc kiểm tra quyền (`getUserRole`) nằm NGOÀI cache** — nó chạy cho mọi request. Cache chỉ bọc phần truy vấn danh sách công khai, vốn giống hệt nhau với mọi người gọi.

- [ ] **Step 2: Xóa cache khi ghi**

Thêm `invalidate('units:')` vào **cuối** cả hai handler `POST /api/units` và `PATCH /api/units/:id`, ngay trước `res.json(...)`:

```ts
  const created = await db.insert(units).values({ name, type }).returning();
  invalidate('units:');   // cán bộ phải thấy đơn vị mới NGAY, không đợi hết hạn
  res.json(created[0]);
```

```ts
  const updated = await db.update(units).set(patch).where(eq(units.id, id)).returning();
  if (updated.length === 0) {
    throw new HttpError(404, 'Không tìm thấy đơn vị');
  }
  invalidate('units:');
  res.json(updated[0]);
```

Đặt **sau** khi ghi thành công. Đặt trước thì lỗi ghi vẫn xóa cache một cách vô ích.

- [ ] **Step 3: Xác minh phân quyền không bị cache**

Đọc lại code và tự trả lời trong báo cáo: nếu tài khoản `thanh_doan` gọi `?includeInactive=true` rồi ngay sau đó một khách ẩn danh gọi `/api/units`, khách có nhận được danh sách gồm đơn vị đã ẩn không?

Đáp án đúng phải là **không** — hai nhánh dùng đường đi khác nhau và chỉ nhánh công khai có khóa cache.

- [ ] **Step 4: Xác minh route vẫn sống**

```bash
curl -s -o /dev/null -w "units=%{http_code}\n" http://localhost:3000/api/units
```
Kỳ vọng: `500` (lỗi CSDL), không phải 404, không treo.

- [ ] **Step 5: Cổng kỹ thuật**

```bash
npx tsc --noEmit
npm run build
npm test
```

- [ ] **Step 6: Commit**

```bash
git add src/routes/units.ts
git commit -m "perf: cache danh sách đơn vị công khai, xóa cache khi admin ghi"
```

**Checklist khi có CSDL:** đặt `CACHE_TTL_UNITS=900000`, khởi động lại, thêm một đơn vị qua màn quản trị, rồi mở `/profile` — đơn vị mới phải xuất hiện **ngay** trong dropdown.

---

## Task 7: Viết lại endpoint đăng ký — transaction và ràng buộc duy nhất

**Files:**
- Modify: `src/routes/activities.ts`

**Interfaces:**
- Consumes: ràng buộc `uniq_registrations_activity_user` từ Task 4; cột `activities.registeredCount` từ Task 4
- Produces: không

**Đây là task sửa lỗi, không chỉ tối ưu.** Code hiện tại kiểm tra đăng ký trùng bằng `SELECT` rồi mới `INSERT`. Hai request đồng thời — người dùng bấm hai lần, hoặc mạng chậm rồi bấm lại — **cả hai đều qua được bước kiểm tra**, tạo hai bản ghi và cộng **+10 điểm thay vì +5**. Trong bảng thi đua của Thành Đoàn, đó là lỗi ảnh hưởng tới kết quả xếp hạng.

- [ ] **Step 1: Thay toàn bộ handler**

```ts
router.post('/api/activities/:id/register', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const activityId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(activityId)) {
    throw new HttpError(400, 'Mã hoạt động không hợp lệ');
  }

  const user = await getOrCreateUser(req.user!.uid, req.user!.email || '');

  try {
    const registration = await db.transaction(async (tx) => {
      const reg = await tx.insert(activityRegistrations).values({
        activityId,
        userId: user.id,
        status: 'registered'
      }).returning();

      // Bộ đếm chỉ TĂNG, vì hiện chưa có chức năng hủy đăng ký.
      // KHI NÀO thêm chức năng hủy, phải giảm registered_count trong CÙNG
      // transaction với lệnh xóa bản ghi đăng ký. Quên là bộ đếm lệch vĩnh viễn.
      await tx.update(activities)
        .set({ registeredCount: sql`${activities.registeredCount} + 1` })
        .where(eq(activities.id, activityId));

      await tx.update(users)
        .set({
          reputationPoints: sql`${users.reputationPoints} + 5`,
          activitiesCount: sql`${users.activitiesCount} + 1`
        })
        .where(eq(users.id, user.id));

      return reg[0];
    });

    res.json({ success: true, registration });
  } catch (err: any) {
    // 23505 = vi phạm ràng buộc duy nhất trong Postgres.
    // Kiểm cả TÊN ràng buộc, vì bảng này có thể có ràng buộc duy nhất khác
    // trong tương lai và ta không được hiểu nhầm thành "đã đăng ký".
    if (err?.code === '23505' && err?.constraint === 'uniq_registrations_activity_user') {
      throw new HttpError(400, 'Bạn đã đăng ký hoạt động này trước đó');
    }
    throw err;
  }
}));
```

- [ ] **Step 2: Xóa khối kiểm tra trùng cũ**

Xóa hẳn đoạn `SELECT` kiểm tra `existing` — ràng buộc duy nhất đã lo. Nếu còn sót, nó chỉ thêm một truy vấn thừa mà vẫn không chặn được cuộc đua.

- [ ] **Step 3: Xác nhận thông điệp giữ nguyên văn**

```bash
grep -n "Bạn đã đăng ký hoạt động này trước đó" src/routes/activities.ts
```
Kỳ vọng: tìm thấy **đúng 1 dòng**, chuỗi y hệt bản cũ. Người dùng phải thấy thông báo không đổi.

- [ ] **Step 4: Xác nhận ba lệnh ghi nằm trong cùng transaction**

Đọc lại code, xác nhận cả `insert`, `update activities`, `update users` đều dùng `tx` chứ không phải `db`. Dùng nhầm `db` bên trong `db.transaction` sẽ khiến lệnh đó chạy **ngoài** transaction — mất tính nguyên tử mà không có lỗi nào báo.

- [ ] **Step 5: Cổng kỹ thuật**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/routes/activities.ts
git commit -m "fix(api): chặn đăng ký trùng bằng ràng buộc duy nhất, gói 3 lệnh ghi vào transaction"
```

**Checklist khi có CSDL:**
1. Đăng ký một hoạt động → thành công, `registered_count` tăng 1, điểm uy tín tăng 5
2. Đăng ký lại hoạt động đó → nhận `Bạn đã đăng ký hoạt động này trước đó`
3. **Phép thử quan trọng nhất** — hai request đồng thời:
```bash
curl -s -X POST http://localhost:3000/api/activities/1/register -H "Authorization: Bearer <TOKEN>" &
curl -s -X POST http://localhost:3000/api/activities/1/register -H "Authorization: Bearer <TOKEN>" &
wait
```
Kỳ vọng: đúng **một** bản ghi đăng ký, điểm uy tín tăng đúng **5** (không phải 10)

---

## Task 8: `/api/activities` dùng cột đếm sẵn và thêm giới hạn

**Files:**
- Modify: `src/routes/activities.ts`

**Interfaces:**
- Consumes: cột `activities.registeredCount` từ Task 4
- Produces: không

- [ ] **Step 1: Thêm tham số `limit`**

Trong handler `GET /api/activities`, sau phần xử lý `status`:

```ts
  // Chặn trên kích thước phản hồi. KHÔNG phải phân trang — client không có
  // cách lấy dòng thứ 201 trở đi. Khi số hoạt động approved chạm ~150,
  // phải bổ sung cursor pagination trước khi vượt 200.
  const rawLimit = typeof req.query.limit === 'string'
    ? Number.parseInt(req.query.limit, 10)
    : Number.NaN;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(rawLimit, 500)
    : 200;
```

- [ ] **Step 2: Thêm `.limit(limit)` vào cả hai nhánh truy vấn**

```ts
  const allActivities = effective === 'all'
    ? await db.select().from(activities).orderBy(desc(activities.createdAt)).limit(limit)
    : await db.select().from(activities)
        .where(eq(activities.status, effective))
        .orderBy(desc(activities.createdAt))
        .limit(limit);
```

**Giữ nguyên** dòng `const effective = isStaff ? requested : 'approved';` — đó là bản vá bảo mật S2.

- [ ] **Step 3: Xóa khối `GROUP BY` đếm số đăng ký**

Xóa hẳn:
```ts
  const regCounts = await db.select({ ... }).from(activityRegistrations).groupBy(...);
  const countMap = new Map<number, number>();
  regCounts.forEach(...);
  const result = allActivities.map(act => ({ ...act, registeredCount: countMap.get(act.id) || 0 }));
```

Thay bằng:
```ts
  res.json(allActivities);
```

Cột `registered_count` được Drizzle ánh xạ thành trường `registeredCount` trong kết quả, nên **tên trường trong phản hồi không đổi** và giao diện không phải sửa gì.

- [ ] **Step 4: Xác minh không còn GROUP BY và S2 còn nguyên**

```bash
grep -n "groupBy\|activityRegistrations" src/routes/activities.ts
```
Kỳ vọng: `activityRegistrations` chỉ còn xuất hiện trong handler đăng ký (Task 7), **không còn** trong handler `GET /api/activities`.

```bash
grep -n "effective = isStaff" src/routes/activities.ts
```
Kỳ vọng: tìm thấy đúng 1 dòng.

- [ ] **Step 5: Cổng kỹ thuật**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/routes/activities.ts
git commit -m "perf: /api/activities đọc cột đếm sẵn thay vì GROUP BY, thêm limit 200"
```

**Checklist khi có CSDL:**
1. `curl 'http://localhost:3000/api/activities'` → tối đa 200 dòng, mỗi dòng có `registeredCount`
2. `curl 'http://localhost:3000/api/activities?limit=9999'` → tối đa **500** dòng
3. `curl 'http://localhost:3000/api/activities?limit=abc'` → về mặc định 200
4. Đăng ký một hoạt động rồi gọi lại → `registeredCount` của hoạt động đó tăng **ngay**

---

## Task 9: `getOrCreateUser` đọc trước và gộp truy vấn

**Files:**
- Modify: `src/db/users.ts`

**Interfaces:**
- Consumes: không
- Produces: `getOrCreateUser(uid, email)` trả về **cùng hình dạng như cũ**: `{ ...user, unitName: string | null }`

Hàm này chạy mỗi lần `AuthProvider` đồng bộ trạng thái đăng nhập — tức **mỗi lần người đăng nhập mở app**. Hiện nó luôn ghi CSDL (`INSERT ... ON CONFLICT DO UPDATE`) và chạy **hai** truy vấn.

- [ ] **Step 1: Viết lại toàn bộ hàm**

```ts
import { db } from './index.ts';
import { units, users } from './schema.ts';
import { eq } from 'drizzle-orm';

/**
 * Lấy bản ghi người dùng theo Firebase UID, tạo mới nếu chưa có.
 *
 * Đường phổ biến nhất (người dùng đã tồn tại, email không đổi) chỉ tốn
 * MỘT truy vấn đọc và KHÔNG ghi gì — trước đây luôn ghi mỗi lần mở app.
 */
export async function getOrCreateUser(uid: string, email: string) {
  const found = await readUserWithUnit(uid);

  if (found) {
    if (found.email === email) {
      return found;                       // đường phổ biến nhất: 1 đọc, 0 ghi
    }
    const updated = await db.update(users)
      .set({ email })
      .where(eq(users.id, found.id))
      .returning();
    return { ...updated[0], unitName: found.unitName };
  }

  // ON CONFLICT DO NOTHING chứ không phải INSERT trần: hai request của cùng
  // người dùng có thể chạy đồng thời ở lần đăng nhập đầu (ví dụ mở hai tab).
  // Cả hai đều thấy "chưa có" ở bước đọc; INSERT trần sẽ khiến một cái vi phạm
  // ràng buộc unique trên uid rồi ném 500.
  await db.insert(users)
    .values({ uid, email })
    .onConflictDoNothing({ target: users.uid });

  const created = await readUserWithUnit(uid);
  if (!created) {
    throw new Error(`Không tạo được người dùng cho uid ${uid}`);
  }
  return created;
}

/** Đọc người dùng kèm tên đơn vị trong MỘT truy vấn. */
async function readUserWithUnit(uid: string) {
  const rows = await db.select({
    user: users,
    unitName: units.name,
  })
    .from(users)
    .leftJoin(units, eq(users.unitId, units.id))
    .where(eq(users.uid, uid))
    .limit(1);

  if (rows.length === 0) return null;
  return { ...rows[0].user, unitName: rows[0].unitName ?? null };
}
```

- [ ] **Step 2: Xác nhận hình dạng trả về không đổi**

Nơi gọi đọc `dbUser.unitName`, `dbUser.id`, `dbUser.role`, `dbUser.fullName`, `dbUser.unitId`, `dbUser.reputationPoints`, `dbUser.volunteerHours`, `dbUser.activitiesCount`, `dbUser.isVerified`.

Vì `readUserWithUnit` trải toàn bộ `rows[0].user` rồi thêm `unitName`, mọi trường trên đều còn. Đọc lại `src/lib/auth-context.tsx`, `src/pages/ProfilePage.tsx`, `src/pages/CheckinPage.tsx` để tự xác nhận, ghi kết quả vào báo cáo.

- [ ] **Step 3: Xác minh route vẫn sống**

```bash
curl -s -o /dev/null -w "sync=%{http_code}\n" -X POST http://localhost:3000/api/auth/sync
```
Kỳ vọng: `401` (thiếu token) — chứng tỏ route tới được middleware xác thực.

- [ ] **Step 4: Cổng kỹ thuật**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/db/users.ts
git commit -m "perf: getOrCreateUser đọc trước, gộp 2 truy vấn thành 1, bỏ ghi mỗi lần tải trang"
```

**Checklist khi có CSDL:** bật log truy vấn của Postgres, đăng nhập rồi tải lại trang vài lần. Kỳ vọng: **không có lệnh `UPDATE users` nào** sau lần đăng nhập đầu tiên.

---

## Task 10: Script đối chiếu số đăng ký

**Files:**
- Create: `scripts/recount-registrations.ts`

**Interfaces:**
- Consumes: cột `activities.registeredCount` từ Task 4
- Produces: không

Dữ liệu phi chuẩn hóa luôn có nguy cơ lệch. Có sẵn công cụ sửa là điều kiện bắt buộc để chấp nhận đánh đổi này.

- [ ] **Step 1: Viết script**

```ts
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
```

**Vì sao mặc định chỉ báo cáo, phải thêm `--fix` mới sửa:** script ghi đè dữ liệu, nên chạy nhầm không được gây hậu quả. Thoát với mã khác 0 khi có lệch để dùng được trong kiểm tra tự động.

- [ ] **Step 2: Xác minh biên dịch được**

```bash
npx tsc --noEmit
```
Kỳ vọng: **0 lỗi**. Không chạy script — chưa có CSDL.

- [ ] **Step 3: Commit**

```bash
git add scripts/recount-registrations.ts
git commit -m "feat(ops): script đối chiếu registered_count với số đăng ký thật"
```

**Checklist khi có CSDL:**
```bash
npx tsx scripts/recount-registrations.ts
```
Kỳ vọng sau khi migration đã điền số liệu: `Không có hoạt động nào lệch số liệu.`

---

## Task 11: Nghiệm thu và cập nhật tài liệu bàn giao

**Files:**
- Modify: `docs/superpowers/HANDOVER-dot-a.md`

Task này không viết code — chạy lại toàn bộ tiêu chí và ghi lại phần chưa kiểm được.

- [ ] **Step 1: Chạy toàn bộ cổng kỹ thuật**

```bash
npm test
npx tsc --noEmit
npm run build
```
Kỳ vọng: 14/14 test đạt, `tsc` **0 lỗi**, build thành công.

- [ ] **Step 2: Xác minh ba bản vá bảo mật còn nguyên**

```bash
grep -n "email" src/routes/leaderboard.ts || echo "S1 sạch"
grep -n "effective = isStaff" src/routes/activities.ts
grep -rn "err.message" src/routes/ server.ts || echo "S3 sạch"
```
Kỳ vọng: S1 sạch, S2 tìm thấy đúng 1 dòng, S3 sạch.

- [ ] **Step 3: Xác minh cache mặc định TẮT**

```bash
grep -n "CACHE_TTL" .env.example
```
Kỳ vọng: cả 3 biến khai báo với giá trị `"0"`, kèm chú thích ghi giá trị production khuyến nghị.

Và xác nhận ba endpoint không bao giờ cache:
```bash
grep -n "cached(" src/routes/activities.ts || echo "activities không cache — đúng"
grep -n "cached(" src/routes/users.ts || echo "user routes không cache — đúng"
```

- [ ] **Step 4: Xác minh mọi route vẫn sống**

```bash
npm run dev
```
Terminal khác:
```bash
for p in health stats activities leaderboard leaderboard/units units; do
  printf "%-20s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/$p)"
done
curl -s -o /dev/null -w "my-activities        %{http_code}\n" http://localhost:3000/api/user/my-activities
```
Kỳ vọng: `health` là `200`, `my-activities` là `401`, còn lại là `500` (lỗi CSDL). **Không cái nào là 404, không cái nào treo.**

- [ ] **Step 5: Bổ sung mục vào tài liệu bàn giao**

Thêm một mục mới vào `docs/superpowers/HANDOVER-dot-a.md`, gom toàn bộ checklist "khi có CSDL" của 10 task trên, theo thứ tự:

1. Chạy migration (Task 4) — nhớ kiểm CSDL trống trước
2. Xác nhận 5 index tồn tại và `registered_count` đã điền
3. Chạy `npx tsx scripts/recount-registrations.ts` → phải báo 0 lệch
4. Kiểm cache tắt: gọi `/api/stats` hai lần, log có 2 truy vấn
5. Kiểm cache bật: đặt `CACHE_TTL_STATS=600000`, khởi động lại, gọi hai lần, log có 1 truy vấn
6. Kiểm xóa cache: bật `CACHE_TTL_UNITS`, thêm đơn vị, mở `/profile` thấy ngay
7. Kiểm đăng ký trùng: hai request đồng thời chỉ tạo 1 bản ghi, cộng đúng +5 điểm
8. Kiểm `limit`: mặc định 200, `?limit=9999` chặn ở 500
9. Kiểm không ghi thừa: đăng nhập, tải lại trang vài lần, không có `UPDATE users`
10. Đo hiệu năng bằng `EXPLAIN (ANALYZE, BUFFERS)` trên dữ liệu giả quy mô gần thực tế — so sánh trước và sau khi có index. **Seq Scan không mặc định là lỗi**; xem mục 9.1 của spec về cách đọc kết quả

Ghi rõ trong tài liệu: **toàn bộ số ước tính hiệu năng trong spec là dự đoán, chưa đo trên dữ liệu thật.**

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/HANDOVER-dot-a.md
git commit -m "docs: bổ sung checklist nghiệm thu hiệu năng khi có CSDL"
```

---

## Nguồn tham khảo

- [Supabase — giới hạn kết nối theo compute add-on](https://supabase.com/docs/guides/troubleshooting/how-to-change-max-database-connections-_BQ8P5)
- [Supabase — connection pooling](https://supabase.com/docs/guides/database/connecting-to-postgres)
- Mã lỗi `23505` (`unique_violation`) — bảng mã lỗi của PostgreSQL
