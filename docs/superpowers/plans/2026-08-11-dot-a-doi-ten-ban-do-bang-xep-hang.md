# Đợt A — Đổi tên, Giới hạn bản đồ, Bảng xếp hạng — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đổi tên app thành "Bản đồ số Thanh niên tình nguyện Hải Phòng", khóa bản đồ chỉ trong địa giới Hải Phòng, dựng bảng xếp hạng 2 tab (Cá nhân / Đơn vị) trên bảng `units` chuẩn hóa, đồng thời tách `server.ts` và vá 3 lỗ hổng bảo mật S1–S3.

**Architecture:** Backend Express hiện gom toàn bộ route trong `server.ts` → tách thành `src/routes/*.ts`, mỗi file một `express.Router()` giữ nguyên đường dẫn đầy đủ, gắn vào app bằng `app.use(router)`. Thêm `HttpError` + error handler tập trung để tách thông báo lỗi có chủ đích khỏi lỗi hệ thống. Frontend React thêm bảng `units` chuẩn hóa thay cho text tự do, LeaderboardPage tách thành 2 component tab.

**Tech Stack:** React 19 · Vite 6 · TypeScript 5.8 · Tailwind 4 · Express 4.21 · Drizzle ORM 0.45 (Postgres) · Firebase Auth · Leaflet 1.9 / react-leaflet 5 · shadcn trên **Base UI** (`@base-ui/react`, **không phải Radix**)

**Spec:** [2026-08-10-dot-a-doi-ten-ban-do-bang-xep-hang-design.md](../specs/2026-08-10-dot-a-doi-ten-ban-do-bang-xep-hang-design.md)

## Global Constraints

- **Ngôn ngữ giao diện: tiếng Việt.** Mọi chuỗi hiển thị cho người dùng viết tiếng Việt có dấu. Tên biến, tên file, tên hàm giữ tiếng Anh.
- **Tên app chính thức, dùng nguyên văn:** `Bản đồ số Thanh niên tình nguyện Hải Phòng`
- **Không dùng thư viện mới.** Mọi component đã có trong `src/components/ui/`. Không thêm dependency vào `package.json` trong Đợt A.
- **shadcn ở đây chạy trên Base UI, không phải Radix.** `Tabs.Root` dùng `defaultValue`/`value`+`onValueChange`; `Tabs.Tab` và `Tabs.Panel` dùng prop `value`. `Select.Root` dùng `value`+`onValueChange`. Đừng chép mẫu Radix từ tài liệu shadcn trên mạng.
- **Express 4 không tự bắt lỗi async.** Mọi handler `async` phải bọc trong `asyncHandler` (Task 3) hoặc tự `try/catch` + `next(err)`. Nếu không, lỗi thành unhandled rejection và không tới được error handler.
- **Không đổi đường dẫn, method, hay shape phản hồi của route đang có** ngoài những thay đổi ghi rõ trong plan này.
- **Import trong `src/` dùng đuôi `.ts`/`.tsx` đầy đủ** (`allowImportingTsExtensions: true`), theo đúng lối viết hiện tại của codebase. Alias `@/` trỏ tới `src/`, đã cấu hình sẵn ở `vite.config.ts` và `tsconfig.json`.
- **Không chạy `git commit`, `git push`, hay lệnh deploy** — quy tắc của chủ dự án. Các bước "Commit" trong plan này chỉ nêu lệnh gợi ý để người dùng tự chạy.
- **Cổng khi kiểm thử thủ công:** app chạy ở `http://localhost:3000` bằng `npm run dev`.
- **Cổng kiểm tra bắt buộc trước khi kết thúc mỗi task:** `npx tsc --noEmit` phải sạch lỗi.

## Vì sao plan này không theo TDD

Codebase **chưa có test framework nào** — `package.json` không có script `test`, không vitest, không jest. Spec đã duyệt (mục 3) chốt hoãn việc dựng test framework sang Đợt B, nơi logic chống gian lận check-in thực sự cần test tự động; dựng hạ tầng test kèm Postgres cho Đợt A sẽ làm phình đúng thứ mà việc chia 3 đợt muốn tránh.

Thay cho bước test tự động, **mỗi task có bước xác minh cụ thể**: lệnh `curl` kèm kết quả mong đợi, hoặc thao tác trình duyệt kèm kết quả mong đợi, cộng cổng `npx tsc --noEmit`. Không task nào được đánh dấu xong nếu chưa chạy bước xác minh và thấy đúng kết quả ghi trong plan.

---

## Cấu trúc file

### Tạo mới

| File | Trách nhiệm |
|---|---|
| `src/lib/http-error.ts` | Lớp `HttpError` + hàm `asyncHandler` |
| `src/middleware/error-handler.ts` | Error handler tập trung (S3) |
| `src/middleware/require-role.ts` | Kiểm tra vai trò, dùng cho route quản trị |
| `src/routes/stats.ts` | `/api/health`, `/api/stats` |
| `src/routes/users.ts` | `/api/auth/sync`, `/api/user/profile`, `/api/user/my-activities` |
| `src/routes/activities.ts` | 4 route `/api/activities*` |
| `src/routes/leaderboard.ts` | `/api/leaderboard`, `/api/leaderboard/units` |
| `src/routes/units.ts` | `/api/units` (GET/POST/PATCH) |
| `src/data/haiphong-wards.json` | Danh sách 114 phường/xã/đặc khu để seed |
| `scripts/seed-units.ts` | Script nạp `haiphong-wards.json` vào bảng `units` |
| `public/haiphong-boundary.geojson` | Ranh giới Hải Phòng sau sáp nhập |
| `src/pages/leaderboard/IndividualTab.tsx` | Tab xếp hạng cá nhân |
| `src/pages/leaderboard/UnitTab.tsx` | Tab xếp hạng đơn vị |
| `src/components/admin/UnitsManager.tsx` | Màn hình quản trị đơn vị |

### Sửa

| File | Thay đổi |
|---|---|
| `server.ts` | Bỏ toàn bộ route, chỉ còn lắp ráp app + gắn router + error handler |
| `src/db/schema.ts` | Thêm bảng `units`, đổi `users.unionUnit` → `users.unitId` |
| `index.html` | `<title>` |
| `public/manifest.json` | `name` |
| `src/components/Layout.tsx` | Dòng phụ dưới logo, `aria-label` |
| `src/pages/MapPage.tsx` | `maxBounds`, GeoJSON, bộ lọc mới |
| `src/pages/LeaderboardPage.tsx` | Rút gọn thành khung 2 tab |
| `src/pages/ProfilePage.tsx` | Ô đơn vị đổi thành `Select` |
| `src/pages/DashboardPage.tsx` | Gọi `?status=all`, thêm tab quản lý đơn vị |

**Vì sao tách `LeaderboardPage` và `UnitsManager` ra file riêng:** `LeaderboardPage.tsx` đang 203 dòng, `DashboardPage.tsx` đang 409 dòng. Nhồi thêm 2 tab và một màn CRUD vào chỗ cũ sẽ đẩy cả hai vượt 600 dòng, khó sửa và khó review.

---

## Task 1: Đổi tên app

**Files:**
- Modify: `index.html:6`
- Modify: `public/manifest.json:2`
- Modify: `src/components/Layout.tsx:70`, `src/components/Layout.tsx:84`
- Modify: `src/pages/MapPage.tsx:79`

**Interfaces:**
- Consumes: không
- Produces: không (thay đổi thuần chuỗi hiển thị)

- [ ] **Step 1: Sửa `<title>` trong `index.html`**

Dòng 6, đổi từ:
```html
    <title>Bản đồ số TNV Hải Phòng</title>
```
thành:
```html
    <title>Bản đồ số Thanh niên tình nguyện Hải Phòng</title>
```

- [ ] **Step 2: Sửa `name` trong `public/manifest.json`**

Dòng 2, đổi từ:
```json
  "name": "Bản đồ số TNV Hải Phòng",
```
thành:
```json
  "name": "Bản đồ số Thanh niên tình nguyện Hải Phòng",
```

**Giữ nguyên dòng 3 `"short_name": "TNV Hải Phòng"`** — chuỗi này hiện dưới icon trên màn hình chính điện thoại, tên đầy đủ 44 ký tự sẽ bị cắt.

- [ ] **Step 3: Sửa dòng phụ và `aria-label` trong `Layout.tsx`**

Dòng 70, đổi từ:
```tsx
            aria-label="Trang chủ TNV Hải Phòng"
```
thành:
```tsx
            aria-label="Trang chủ — Bản đồ số Thanh niên tình nguyện Hải Phòng"
```

Dòng 83-85, đổi từ:
```tsx
              <span className="text-[10px] text-blue-100 tracking-wider uppercase font-medium hidden sm:block">
                Bản đồ số & Điều phối tình nguyện
              </span>
```
thành:
```tsx
              <span className="text-[10px] text-blue-100 tracking-wider uppercase font-medium hidden sm:block">
                Bản đồ số Thanh niên tình nguyện Hải Phòng
              </span>
```

**Giữ nguyên dòng 80-82 `TNV HẢI PHÒNG`** — dòng logo lớn, tên đầy đủ sẽ vỡ header trên màn hình hẹp.

- [ ] **Step 4: Sửa heading trang Bản đồ**

`src/pages/MapPage.tsx` dòng 78-80, đổi từ:
```tsx
          <h1 className="text-lg sm:text-xl font-bold text-blue-950 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-700" /> Bản Đồ Số Tình Nguyện Hải Phòng
          </h1>
```
thành:
```tsx
          <h1 className="text-lg sm:text-xl font-bold text-blue-950 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-700" /> Bản đồ số Thanh niên tình nguyện Hải Phòng
          </h1>
```

- [ ] **Step 5: Xác minh không sót chỗ nào**

Chạy:
```bash
grep -rn "Bản đồ số TNV\|Bản Đồ Số Tình Nguyện\|Bản đồ số & Điều phối" index.html public/ src/
```
Kết quả mong đợi: **không có dòng nào** (exit code 1).

- [ ] **Step 6: Kiểm tra trên trình duyệt**

Chạy `npm run dev`, mở `http://localhost:3000`.

Kiểm tra:
- Tab trình duyệt hiện "Bản đồ số Thanh niên tình nguyện Hải Phòng"
- Dòng nhỏ dưới chữ "TNV HẢI PHÒNG" ở header hiện tên đầy đủ
- Thu cửa sổ về bề rộng 360px: header **không** xuống dòng lộn xộn, không có chữ tràn ra ngoài
- Vào `/map`: tiêu đề trang hiện tên mới

- [ ] **Step 7: Cổng TypeScript**

Chạy: `npx tsc --noEmit`
Kết quả mong đợi: không lỗi.

- [ ] **Step 8: Commit (người dùng tự chạy)**

```bash
git add index.html public/manifest.json src/components/Layout.tsx src/pages/MapPage.tsx
git commit -m "feat: đổi tên app thành Bản đồ số Thanh niên tình nguyện Hải Phòng"
```

---

## Task 2: Tách `server.ts` thành các router

**Files:**
- Create: `src/routes/stats.ts`, `src/routes/users.ts`, `src/routes/activities.ts`, `src/routes/leaderboard.ts`
- Modify: `server.ts` (toàn bộ)

**Interfaces:**
- Consumes: `requireAuth`, `AuthRequest` từ `src/middleware/auth.ts`; `getOrCreateUser` từ `src/db/users.ts`; `db` từ `src/db/index.ts`
- Produces:
  - `src/routes/stats.ts` → `export default router` (Router)
  - `src/routes/users.ts` → `export default router` (Router)
  - `src/routes/activities.ts` → `export default router` (Router)
  - `src/routes/leaderboard.ts` → `export default router` (Router)

**Nguyên tắc của task này: DI CHUYỂN THUẦN TÚY.** Không sửa logic, không sửa thông báo lỗi, không thêm validate, không đổi shape phản hồi. Mỗi router giữ **đường dẫn đầy đủ** (`/api/...`) và gắn bằng `app.use(router)` — cách này loại bỏ hoàn toàn rủi ro sai tiền tố đường dẫn.

- [ ] **Step 1: Ghi lại hành vi hiện tại để đối chiếu sau**

Chạy `npm run dev`, rồi ở terminal khác:
```bash
curl -s http://localhost:3000/api/health
curl -s http://localhost:3000/api/activities | head -c 300
curl -s http://localhost:3000/api/leaderboard
curl -s http://localhost:3000/api/stats
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/user/my-activities
```

Lưu kết quả vào file tạm để so sánh ở Step 7. Kết quả mong đợi của lệnh cuối: `401` (chưa có token).

- [ ] **Step 2: Tạo `src/routes/stats.ts`**

```ts
import { Router } from 'express';
import { db } from '../db/index.ts';
import { activities, users } from '../db/schema.ts';
import { sql } from 'drizzle-orm';

const router = Router();

router.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Thống kê tổng quan Thành Đoàn Hải Phòng
router.get('/api/stats', async (req, res) => {
  try {
    const totalVolunteers = await db.select({ count: sql<number>`count(*)` }).from(users);
    const totalActivities = await db.select({ count: sql<number>`count(*)` }).from(activities);
    const sumHours = await db.select({ total: sql<number>`COALESCE(sum(${users.volunteerHours}), 0)` }).from(users);

    res.json({
      totalVolunteers: Number(totalVolunteers[0]?.count || 0) + 1250, // cộng số thực tế tiêu chuẩn Hải Phòng
      totalActivities: Number(totalActivities[0]?.count || 0),
      totalHours: Number(sumHours[0]?.total || 0) + 4820,
      verifiedCount: 1040
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

- [ ] **Step 3: Tạo `src/routes/users.ts`**

```ts
import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { getOrCreateUser } from '../db/users.ts';
import { db } from '../db/index.ts';
import { activities, activityRegistrations, users } from '../db/schema.ts';
import { desc, eq } from 'drizzle-orm';

const router = Router();

// Auth & Sync Profile
router.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'No authenticated user' });
      return;
    }
    const user = await getOrCreateUser(req.user.uid, req.user.email || '');
    res.json(user);
  } catch (err: any) {
    console.error('Error in auth sync:', err);
    res.status(500).json({ error: err.message });
  }
});

// Cập nhật thông tin đoàn viên / TNV
router.post('/api/user/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { fullName, dob, gender, cccd, phone, address, unit, unionUnit, skills } = req.body;
    const updated = await db.update(users)
      .set({ fullName, dob, gender, cccd, phone, address, unit, unionUnit, skills })
      .where(eq(users.uid, req.user.uid))
      .returning();

    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Lấy danh sách các hoạt động người dùng đã đăng ký
router.get('/api/user/my-activities', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await getOrCreateUser(req.user!.uid, req.user!.email || '');
    const userRegs = await db.select({
      registrationId: activityRegistrations.id,
      registeredAt: activityRegistrations.createdAt,
      status: activityRegistrations.status,
      activity: activities
    })
    .from(activityRegistrations)
    .innerJoin(activities, eq(activityRegistrations.activityId, activities.id))
    .where(eq(activityRegistrations.userId, user.id))
    .orderBy(desc(activityRegistrations.createdAt));

    res.json(userRegs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

**Lưu ý:** `unionUnit` vẫn còn ở đây vì Task 8 mới đổi sang `unitId`. Đừng sửa trước.

- [ ] **Step 4: Tạo `src/routes/activities.ts`**

Chép nguyên văn 4 route `/api/activities*` từ `server.ts` dòng 86–199, đổi `app.` thành `router.`, thêm phần đầu và cuối file.

**Bốn route phải có mặt đầy đủ — đối chiếu chữ ký sau khi chép xong:**
```ts
router.get('/api/activities', async (req, res) => { ... })
router.post('/api/activities', requireAuth, async (req: AuthRequest, res) => { ... })
router.patch('/api/activities/:id/status', requireAuth, async (req: AuthRequest, res) => { ... })
router.post('/api/activities/:id/register', requireAuth, async (req: AuthRequest, res) => { ... })
```

Khung file:

```ts
import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { getOrCreateUser } from '../db/users.ts';
import { db } from '../db/index.ts';
import { activities, activityRegistrations, users } from '../db/schema.ts';
import { desc, eq, sql } from 'drizzle-orm';

const router = Router();

// ... 4 route chép từ server.ts, đổi app. -> router.

export default router;
```

Giữ nguyên từng dòng logic, kể cả các thông báo tiếng Việt `'Bạn đã đăng ký hoạt động này trước đó'` và `'Chỉ cán bộ Thành Đoàn có quyền phê duyệt'`.

- [ ] **Step 5: Tạo `src/routes/leaderboard.ts`**

```ts
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
```

**Chưa bỏ `email` ở task này** — đó là Task 5. Task 2 chỉ di chuyển.

- [ ] **Step 6: Viết lại `server.ts`**

```ts
import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import statsRouter from './src/routes/stats.ts';
import usersRouter from './src/routes/users.ts';
import activitiesRouter from './src/routes/activities.ts';
import leaderboardRouter from './src/routes/leaderboard.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.use(statsRouter);
  app.use(usersRouter);
  app.use(activitiesRouter);
  app.use(leaderboardRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
```

**Thứ tự quan trọng:** các router API phải gắn **trước** Vite middleware, y như bố cục cũ. Đảo ngược sẽ khiến Vite nuốt hết request `/api/*` và trả về HTML.

**Kiểm tra dòng cuối `server.ts` cũ:** nếu file gốc kết thúc bằng `startServer();` thì giữ; nếu là dạng khác thì giữ nguyên dạng đó.

- [ ] **Step 7: Xác minh không hồi quy**

Khởi động lại `npm run dev`, chạy lại đúng 5 lệnh `curl` ở Step 1.

Kết quả mong đợi: **giống hệt** kết quả đã lưu ở Step 1 — cùng status code, cùng cấu trúc JSON. `/api/health` trả `{"status":"ok",...}`, `/api/user/my-activities` trả `401`.

Mở trình duyệt kiểm tra tiếp: trang chủ, `/map`, `/activities`, `/leaderboard` đều tải được dữ liệu như trước.

- [ ] **Step 8: Cổng TypeScript và build**

```bash
npx tsc --noEmit
npm run build
```
Kết quả mong đợi: cả hai không lỗi.

- [ ] **Step 9: Commit (người dùng tự chạy)**

```bash
git add server.ts src/routes/
git commit -m "refactor: tách route từ server.ts sang src/routes/"
```

---

## Task 3: Error handler tập trung (vá S3)

**Files:**
- Create: `src/lib/http-error.ts`, `src/middleware/error-handler.ts`
- Modify: `server.ts`, `src/routes/stats.ts`, `src/routes/users.ts`, `src/routes/activities.ts`, `src/routes/leaderboard.ts`

**Interfaces:**
- Consumes: các router từ Task 2
- Produces:
  - `export class HttpError extends Error { status: number }` — ném ra khi muốn client **thấy** thông báo
  - `export function asyncHandler(fn)` — bọc handler async để lỗi tới được error handler
  - `export const errorHandler: ErrorRequestHandler` — gắn cuối cùng trong `server.ts`

**Vấn đề đang vá:** 8 endpoint trả `res.status(500).json({ error: err.message })`, riêng `/api/activities` còn thêm `details: err.message`. Kẻ tấn công gây lỗi có chủ đích sẽ đọc được tên bảng, tên cột, tên ràng buộc của Postgres.

- [ ] **Step 1: Tạo `src/lib/http-error.ts`**

```ts
import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Lỗi có chủ đích, thông điệp AN TOÀN để hiển thị cho người dùng.
 * Mọi lỗi không phải HttpError đều bị coi là lỗi hệ thống và bị giấu chi tiết.
 */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * Express 4 KHÔNG tự bắt lỗi từ handler async.
 * Bọc handler async bằng hàm này để lỗi được chuyển tới error handler.
 */
export function asyncHandler(
  fn: (req: any, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

- [ ] **Step 2: Tạo `src/middleware/error-handler.ts`**

```ts
import type { ErrorRequestHandler } from 'express';
import { HttpError } from '../lib/http-error.ts';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Log đầy đủ về phía server — chỗ duy nhất được thấy chi tiết lỗi
  console.error(err);

  if (err instanceof HttpError) {
    // Thông điệp có chủ đích, an toàn để người dùng đọc
    res.status(err.status).json({ error: err.message });
    return;
  }

  // Lỗi hệ thống: giấu hoàn toàn chi tiết
  res.status(500).json({ error: 'Đã có lỗi xảy ra, vui lòng thử lại sau.' });
};
```

- [ ] **Step 3: Chuyển các route sang `asyncHandler` + `HttpError`**

Với **mỗi** route async trong 4 file router, áp dụng đúng khuôn sau.

Trước:
```ts
router.post('/api/activities/:id/register', requireAuth, async (req: AuthRequest, res) => {
  try {
    // ...
    if (existing.length > 0) {
      res.status(400).json({ error: 'Bạn đã đăng ký hoạt động này trước đó' });
      return;
    }
    // ...
    res.json({ success: true, registration: reg[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
```

Sau:
```ts
router.post('/api/activities/:id/register', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  // ...
  if (existing.length > 0) {
    throw new HttpError(400, 'Bạn đã đăng ký hoạt động này trước đó');
  }
  // ...
  res.json({ success: true, registration: reg[0] });
}));
```

Quy tắc chuyển đổi:
- Bỏ hẳn khối `try/catch` bọc ngoài — `asyncHandler` lo phần đó.
- `res.status(4xx).json({ error: '<thông điệp tiếng Việt>' }); return;` → `throw new HttpError(4xx, '<thông điệp tiếng Việt>');`
- `res.status(500).json({ error: err.message })` → **xóa hẳn**, không thay bằng gì.
- `res.status(500).json({ error: 'Query failed', details: err.message })` → **xóa hẳn**.
- Thêm `import { HttpError, asyncHandler } from '../lib/http-error.ts';` vào đầu mỗi file router.

**Bốn thông điệp có chủ đích phải giữ nguyên văn:**
- `'No authenticated user'` → `throw new HttpError(401, 'No authenticated user')`
- `'Unauthorized'` → `throw new HttpError(401, 'Unauthorized')`
- `'Chỉ cán bộ Thành Đoàn có quyền phê duyệt'` → `throw new HttpError(403, ...)`
- `'Bạn đã đăng ký hoạt động này trước đó'` → `throw new HttpError(400, ...)`

**Không đụng tới `src/middleware/auth.ts`** — nó tự trả 401 và không đi qua error handler. Giữ nguyên.

- [ ] **Step 4: Gắn error handler vào `server.ts`**

Thêm import:
```ts
import { errorHandler } from './src/middleware/error-handler.ts';
```

Đặt `app.use(errorHandler);` **ngay trước** `app.listen(...)`, tức là **sau** cả khối Vite/static:

```ts
  app.use(errorHandler);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
```

Error handler của Express phải là middleware cuối cùng, và phải có đủ 4 tham số để Express nhận diện — `ErrorRequestHandler` đã đảm bảo điều đó.

- [ ] **Step 5: Xác minh lỗi hệ thống bị giấu**

Tạm thời chèn dòng sau vào đầu handler `/api/stats` trong `src/routes/stats.ts`:
```ts
  throw new Error('CHI TIET NHAY CAM KHONG DUOC LO RA');
```

Khởi động lại, chạy:
```bash
curl -s http://localhost:3000/api/stats
```

Kết quả mong đợi — client **chỉ** thấy:
```json
{"error":"Đã có lỗi xảy ra, vui lòng thử lại sau."}
```
Chuỗi `CHI TIET NHAY CAM` **không được** xuất hiện trong phản hồi, nhưng **phải** xuất hiện trong log terminal của server.

**Xóa dòng test đó đi sau khi xác minh xong.**

- [ ] **Step 6: Xác minh thông điệp có chủ đích vẫn hiển thị**

Đăng nhập vào app bằng tài khoản `tnv`, vào `/activities`, đăng ký một hoạt động hai lần.

Kết quả mong đợi: lần thứ hai hiện toast **"Bạn đã đăng ký hoạt động này trước đó"** nguyên văn, không phải câu thông báo chung.

- [ ] **Step 7: Xác minh không sót chỗ rò rỉ**

```bash
grep -rn "err.message" src/routes/ server.ts
```
Kết quả mong đợi: **không có dòng nào**.

- [ ] **Step 8: Cổng TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 9: Commit (người dùng tự chạy)**

```bash
git add src/lib/http-error.ts src/middleware/error-handler.ts src/routes/ server.ts
git commit -m "fix(security): S3 - error handler tập trung, không rò rỉ chi tiết lỗi CSDL"
```

---

## Task 4: Chỉ hiển thị hoạt động đã duyệt (vá S2)

**Files:**
- Create: `src/middleware/require-role.ts`
- Modify: `src/routes/activities.ts`
- Modify: `src/pages/DashboardPage.tsx:49`

**Interfaces:**
- Consumes: `HttpError`, `asyncHandler` từ Task 3
- Produces: `export async function getUserRole(req: AuthRequest): Promise<string | null>` trong `src/middleware/require-role.ts`

**Vấn đề đang vá:** `GET /api/activities` trả toàn bộ bảng gồm cả `status = 'pending'` và `'rejected'`. Hoạt động chưa ai duyệt vẫn hiện trên bản đồ và trang Hoạt động — cơ chế duyệt của Thành Đoàn hiện không có tác dụng.

**⚠️ Rủi ro R8:** `DashboardPage.tsx:49` đang gọi `/api/activities` không tham số để hiện bảng phê duyệt. Nếu chỉ thêm bộ lọc mà không sửa trang này, màn hình duyệt sẽ trống. Step 4 xử lý việc đó — **không được bỏ qua**.

- [ ] **Step 1: Tạo `src/middleware/require-role.ts`**

```ts
import type { AuthRequest } from './auth.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

/** Vai trò được phép xem hoạt động chưa duyệt */
export const STAFF_ROLES = ['thanh_doan', 'doan_co_so'];

/**
 * Đọc vai trò của người gọi. Trả null nếu chưa đăng nhập
 * hoặc chưa có bản ghi trong bảng users.
 */
export async function getUserRole(req: AuthRequest): Promise<string | null> {
  if (!req.user) return null;
  const rows = await db.select({ role: users.role })
    .from(users)
    .where(eq(users.uid, req.user.uid))
    .limit(1);
  return rows[0]?.role ?? null;
}
```

- [ ] **Step 2: Cho `GET /api/activities` chạy qua `requireAuth` dạng tùy chọn**

Route này phải công khai (khách chưa đăng nhập vẫn xem được hoạt động đã duyệt), nhưng cần biết vai trò nếu có token. Thêm middleware mềm vào `src/middleware/auth.ts`:

```ts
/**
 * Giống requireAuth nhưng KHÔNG chặn khi thiếu/sai token.
 * Chỉ gắn req.user nếu token hợp lệ. Dùng cho route công khai
 * nhưng có hành vi khác cho cán bộ.
 */
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    req.user = await adminAuth.verifyIdToken(token);
  } catch {
    // Token hỏng thì coi như khách, không báo lỗi
  }
  next();
};
```

- [ ] **Step 3: Thêm bộ lọc `status` vào `GET /api/activities`**

Trong `src/routes/activities.ts`, sửa route GET:

```ts
router.get('/api/activities', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const role = await getUserRole(req);
  const isStaff = role !== null && STAFF_ROLES.includes(role);

  // Khách và TNV: chỉ thấy hoạt động đã duyệt, bất kể truyền tham số gì
  // Cán bộ: được lọc theo ?status=pending|rejected|approved|all
  const requested = typeof req.query.status === 'string' ? req.query.status : 'approved';
  const effective = isStaff ? requested : 'approved';

  const allActivities = effective === 'all'
    ? await db.select().from(activities).orderBy(desc(activities.createdAt))
    : await db.select().from(activities)
        .where(eq(activities.status, effective))
        .orderBy(desc(activities.createdAt));

  const regCounts = await db.select({
    activityId: activityRegistrations.activityId,
    count: sql<number>`count(*)`
  }).from(activityRegistrations)
    .groupBy(activityRegistrations.activityId);

  const countMap = new Map<number, number>();
  regCounts.forEach(r => countMap.set(r.activityId, Number(r.count)));

  const result = allActivities.map(act => ({
    ...act,
    registeredCount: countMap.get(act.id) || 0
  }));

  res.json(result);
}));
```

Thêm import ở đầu file:
```ts
import { optionalAuth } from '../middleware/auth.ts';
import { getUserRole, STAFF_ROLES } from '../middleware/require-role.ts';
```

**Lưu ý về giá trị `status` không hợp lệ:** nếu cán bộ truyền `?status=abc`, truy vấn sẽ trả mảng rỗng — chấp nhận được, không cần báo lỗi.

- [ ] **Step 4: Sửa `DashboardPage.tsx` gọi `?status=all` (xử lý R8)**

Dòng 48-55, đổi từ:
```tsx
  const fetchActivities = () => {
    fetch('/api/activities')
```
thành:
```tsx
  const fetchActivities = async () => {
    if (!user) return;
    const token = await user.getIdToken();
    fetch('/api/activities?status=all', {
      headers: { Authorization: `Bearer ${token}` }
    })
```

Phần `.then(...)` phía sau giữ nguyên.

Đồng thời sửa `useEffect` ở dòng 44-46 để chạy lại khi `user` sẵn sàng:
```tsx
  useEffect(() => {
    fetchActivities();
  }, [user]);
```

Không có bước này, `fetchActivities` chạy khi `user` còn `null` và bảng phê duyệt sẽ trống.

- [ ] **Step 5: Xác minh khách chỉ thấy hoạt động đã duyệt**

Trước hết tạo dữ liệu thử: đăng nhập bằng tài khoản `tnv`, vào `/dashboard`... (nếu tài khoản chưa phải cán bộ thì tạo hoạt động qua `curl` bên dưới, thay `<TOKEN>` bằng ID token lấy từ DevTools Console bằng `await firebase.auth().currentUser.getIdToken()` hoặc từ tab Network của request `/api/auth/sync`).

```bash
curl -s -X POST http://localhost:3000/api/activities \
  -H "Authorization: Bearer <TOKEN_TNV>" \
  -H "Content-Type: application/json" \
  -d '{"title":"HOAT DONG CHO DUYET","description":"test","location":"Hải Phòng","timeStart":"2026-09-01T08:00","timeEnd":"2026-09-01T17:00","requiredVolunteers":5}'
```

Rồi kiểm tra với tư cách khách:
```bash
curl -s http://localhost:3000/api/activities | grep -c "HOAT DONG CHO DUYET"
```
Kết quả mong đợi: `0`.

- [ ] **Step 6: Xác minh TNV không lách được bằng tham số**

```bash
curl -s -H "Authorization: Bearer <TOKEN_TNV>" \
  "http://localhost:3000/api/activities?status=pending" | grep -c "HOAT DONG CHO DUYET"
```
Kết quả mong đợi: `0` — tài khoản `tnv` truyền `?status=pending` vẫn chỉ nhận hoạt động đã duyệt.

- [ ] **Step 7: Xác minh cán bộ vẫn thấy hoạt động chờ duyệt**

```bash
curl -s -H "Authorization: Bearer <TOKEN_THANH_DOAN>" \
  "http://localhost:3000/api/activities?status=pending" | grep -c "HOAT DONG CHO DUYET"
```
Kết quả mong đợi: `1`.

- [ ] **Step 8: Xác minh màn hình duyệt còn hoạt động (R8)**

Đăng nhập bằng tài khoản `thanh_doan`, vào `/dashboard`.

Kết quả mong đợi:
- Bảng "Danh Sách & Phê Duyệt Chiến Dịch Đoàn" hiện hoạt động vừa tạo, badge "Chờ Duyệt"
- Nút "Duyệt" và "Từ chối" hiện ra
- Bấm "Duyệt" → toast thành công, badge đổi thành "Đã Duyệt"
- Sau đó mở `/map` bằng cửa sổ ẩn danh (chưa đăng nhập) → hoạt động đó **đã** hiện trên bản đồ

- [ ] **Step 9: Cổng TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 10: Commit (người dùng tự chạy)**

```bash
git add src/middleware/ src/routes/activities.ts src/pages/DashboardPage.tsx
git commit -m "fix(security): S2 - chỉ công khai hoạt động đã duyệt"
```

---

## Task 5: Bỏ email khỏi bảng xếp hạng (vá S1)

**Files:**
- Modify: `src/routes/leaderboard.ts`
- Modify: `src/pages/LeaderboardPage.tsx:124`

**Interfaces:**
- Consumes: router từ Task 2
- Produces: shape phản hồi `/api/leaderboard` **không còn trường `email`**

**Vấn đề đang vá:** `/api/leaderboard` không cần đăng nhập và trả `email` của mọi TNV. Bất kỳ ai mở `https://<domain>/api/leaderboard` đều lấy được danh sách email đoàn viên.

- [ ] **Step 1: Xác nhận lỗ hổng còn tồn tại**

```bash
curl -s http://localhost:3000/api/leaderboard | grep -c "email"
```
Kết quả mong đợi trước khi sửa: số lớn hơn `0`.

- [ ] **Step 2: Bỏ `email` khỏi truy vấn**

Trong `src/routes/leaderboard.ts`, xóa dòng `email: users.email,` khỏi khối `db.select({...})`:

```ts
    const topVolunteers = await db.select({
      id: users.id,
      fullName: users.fullName,
      unionUnit: users.unionUnit,
      reputationPoints: users.reputationPoints,
      volunteerHours: users.volunteerHours,
      activitiesCount: users.activitiesCount,
      isVerified: users.isVerified
    })
```

- [ ] **Step 3: Sửa nhãn dự phòng ở giao diện**

`src/pages/LeaderboardPage.tsx` dòng 123-125, đổi từ:
```tsx
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {vol.fullName || vol.email}
```
thành:
```tsx
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {vol.fullName || 'Đoàn viên chưa cập nhật tên'}
```

Không sửa chỗ này thì TNV chưa điền `fullName` sẽ hiện `undefined` trên bảng công khai.

- [ ] **Step 4: Xác minh email đã biến mất**

```bash
curl -s http://localhost:3000/api/leaderboard | grep -c "@"
```
Kết quả mong đợi: `0`.

- [ ] **Step 5: Xác minh giao diện còn đúng**

Mở `/leaderboard`. Kết quả mong đợi: bảng vẫn hiện đủ TNV, không dòng nào hiện địa chỉ email, không dòng nào hiện `undefined`.

Nếu có tài khoản chưa đặt tên, dòng đó hiện "Đoàn viên chưa cập nhật tên".

- [ ] **Step 6: Cổng TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit (người dùng tự chạy)**

```bash
git add src/routes/leaderboard.ts src/pages/LeaderboardPage.tsx
git commit -m "fix(security): S1 - không trả email TNV qua API công khai"
```

---

## Task 6: Ranh giới GeoJSON và khóa khung bản đồ

**Files:**
- Create: `public/haiphong-boundary.geojson`
- Modify: `src/pages/MapPage.tsx`

**Interfaces:**
- Consumes: không
- Produces: hằng số `HAI_PHONG_BOUNDS` export từ `src/pages/MapPage.tsx` (Task 7 dùng lại nếu cần)

**Bối cảnh đã xác minh:** Hải Phòng sau sáp nhập với Hải Dương (hiệu lực 01/7/2025, Nghị quyết 1669/NQ-UBTVQH15) có **114 đơn vị hành chính cấp xã: 67 xã, 45 phường, 2 đặc khu**, diện tích 3.194,72 km². Hai đặc khu là Cát Hải và Bạch Long Vĩ.

- [ ] **Step 1: Lấy file ranh giới**

Nguồn ưu tiên: kho `nguyenduy1133/Free-GIS-Data` trên GitHub, file `Provinces.geojson` — chứa ranh giới của cả 34 tỉnh/thành sau sáp nhập.

```bash
curl -sL -o /tmp/provinces.geojson \
  "https://raw.githubusercontent.com/nguyenduy1133/Free-GIS-Data/main/Provinces.geojson"
```

Nếu đường dẫn nhánh `main` không đúng, mở kho trên trình duyệt để lấy đường dẫn raw chính xác.

**Giấy phép:** kho này ghi "cung cấp miễn phí cho mục đích công cộng, đề nghị ghi nguồn" — **không có giấy phép mã nguồn mở chính thức**. Đây là app của cơ quan nhà nước nên phải ghi nguồn trong phần chú thích bản đồ (Step 4). Nếu Thành Đoàn có dữ liệu ranh giới chính thức thì dùng dữ liệu đó thay thế, và bỏ dòng ghi nguồn.

- [ ] **Step 2: Trích riêng feature Hải Phòng**

```bash
node -e "
const fs=require('fs');
const g=JSON.parse(fs.readFileSync('/tmp/provinces.geojson','utf8'));
const names=g.features.map(f=>JSON.stringify(f.properties));
const hp=g.features.filter(f=>JSON.stringify(f.properties).includes('Hải Phòng'));
if(hp.length!==1){console.error('Tìm thấy',hp.length,'feature. Các thuộc tính có trong file:');console.error(names.slice(0,3).join('\n'));process.exit(1);}
fs.writeFileSync('public/haiphong-boundary.geojson',JSON.stringify({type:'FeatureCollection',features:hp}));
console.log('OK');
"
```

Nếu script báo tìm thấy 0 hoặc nhiều hơn 1 feature, nó in ra mẫu thuộc tính để bạn sửa điều kiện lọc cho khớp (có thể là `Ten_Tinh`, `NAME_1`, `province`...).

**Phương án dự phòng nếu không lấy được file:** ghép ranh giới Hải Phòng cũ và Hải Dương cũ từ cùng kho (hoặc từ OpenStreetMap, giấy phép ODbL, bắt buộc ghi nguồn). Nếu cả hai đều không được, **bỏ hẳn lớp GeoJSON** và chỉ làm phần khóa khung ở Step 3 — ghi lại lý do vào phần Rủi ro của spec.

- [ ] **Step 3: Đo lại khung bao từ dữ liệu thật**

```bash
node -e "
const fs=require('fs');
const g=JSON.parse(fs.readFileSync('public/haiphong-boundary.geojson','utf8'));
let minLat=90,maxLat=-90,minLng=180,maxLng=-180;
const walk=c=>Array.isArray(c[0])?c.forEach(walk):(minLng=Math.min(minLng,c[0]),maxLng=Math.max(maxLng,c[0]),minLat=Math.min(minLat,c[1]),maxLat=Math.max(maxLat,c[1]));
g.features.forEach(f=>walk(f.geometry.coordinates));
console.log('minLat',minLat,'maxLat',maxLat,'minLng',minLng,'maxLng',maxLng);
"
```

Ghi lại 4 số này. Giá trị trong spec (`20.55, 105.95` → `21.30, 107.15`) chỉ là ước lượng — **phải thay bằng số đo thật**.

**Xử lý Bạch Long Vĩ:** nếu `maxLng` vượt quá `107.3`, tức là khung đang bao cả đặc khu Bạch Long Vĩ ngoài vịnh Bắc Bộ. Theo quyết định trong spec, khung mặc định **chỉ bao đất liền + Cát Hải**: cắt `maxLng` xuống `107.15` và ghi chú lại. Không làm nút "Xem Bạch Long Vĩ" ở đợt này — chỉ làm khi thực sự có hoạt động ở đó.

- [ ] **Step 4: Áp dụng vào `MapPage.tsx`**

Thêm import:
```tsx
import { GeoJSON } from 'react-leaflet';
import type { LatLngBoundsExpression } from 'leaflet';
```

Thêm hằng số cạnh `DEFAULT_CENTER` (thay 4 số bằng kết quả đo ở Step 3):
```tsx
// Khung bao Hải Phòng sau sáp nhập với Hải Dương (hiệu lực 01/7/2025).
// Số đo lấy từ public/haiphong-boundary.geojson, đã cắt Bạch Long Vĩ.
export const HAI_PHONG_BOUNDS: LatLngBoundsExpression = [
  [20.55, 105.95],
  [21.30, 107.15],
];
```

Thêm state nạp ranh giới trong `MapPage`:
```tsx
  const [boundary, setBoundary] = useState<any>(null);

  useEffect(() => {
    fetch('/haiphong-boundary.geojson')
      .then(res => res.json())
      .then(setBoundary)
      .catch(() => setBoundary(null)); // không có ranh giới thì bản đồ vẫn chạy
  }, []);
```

Sửa `MapContainer`:
```tsx
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={10}
          maxBounds={HAI_PHONG_BOUNDS}
          maxBoundsViscosity={1.0}
          minZoom={9}
          style={{ height: '100%', width: '100%' }}
        >
```

Thêm lớp ranh giới ngay sau `<TileLayer>`:
```tsx
          {boundary && (
            <GeoJSON
              data={boundary}
              style={{ color: '#1D4ED8', weight: 2, fill: false }}
            />
          )}
```

Sửa dòng ghi nguồn của `TileLayer` để thêm nguồn ranh giới:
```tsx
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Ranh giới hành chính: Free-GIS-Data'
```

- [ ] **Step 5: Bỏ cơ chế recenter theo quận/huyện**

Xóa hẳn khỏi `MapPage.tsx`:
- Hằng số `DISTRICT_COORDS` (dòng 30-39)
- Component `MapRecenter` (dòng 41-47)
- State `selectedDistrict` và `center` (dòng 51-52)
- Hàm `handleDistrictChange` (dòng 61-66)
- Thẻ `<select>` chọn địa bàn (dòng 86-96)
- Dòng `<MapRecenter center={center} />` trong `MapContainer`
- Import `useMap` khỏi `react-leaflet`

Giữ lại `DEFAULT_CENTER`.

Tạm thời sửa `filteredActivities` thành `const filteredActivities = activities;` — Task 7 sẽ thay bằng bộ lọc thật.

- [ ] **Step 6: Xác minh khóa khung**

Mở `/map`. Thử lần lượt:
- Kéo bản đồ hết sức sang trái, phải, lên, xuống → **không** ra khỏi vùng Hải Phòng ở cả 4 hướng, không thấy vùng biển trống hay tỉnh xa
- Cuộn chuột thu nhỏ hết cỡ → dừng lại ở mức vẫn thấy Hải Phòng, **không** thu được ra toàn Việt Nam hay toàn thế giới
- Đường viền xanh bao quanh Hải Phòng hiện rõ, ôm khít phần đất liền

Nếu viền lệch khỏi nền bản đồ, dữ liệu ranh giới sai — quay lại Step 1 chọn nguồn khác.

- [ ] **Step 7: Cổng TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: Commit (người dùng tự chạy)**

```bash
git add public/haiphong-boundary.geojson src/pages/MapPage.tsx
git commit -m "feat(map): khóa khung bản đồ trong địa giới Hải Phòng, vẽ viền ranh giới"
```

---

## Task 7: Bộ lọc mới cho trang Bản đồ

**Files:**
- Modify: `src/pages/MapPage.tsx`

**Interfaces:**
- Consumes: `activities` state đã có trong `MapPage`
- Produces: không

- [ ] **Step 1: Thêm hàm bỏ dấu tiếng Việt**

Thêm vào đầu `src/pages/MapPage.tsx`, ngoài component:

```tsx
/** Chuẩn hóa chuỗi để tìm kiếm: bỏ dấu, thường hóa. "Đồ Sơn" -> "do son" */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}
```

Chữ `đ`/`Đ` phải xử lý riêng vì `NFD` không tách được nó thành ký tự cơ sở kèm dấu.

- [ ] **Step 2: Thêm state bộ lọc**

```tsx
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
```

- [ ] **Step 3: Lấy danh sách lĩnh vực từ chính dữ liệu**

```tsx
  const categories = Array.from(
    new Set(activities.map(a => a.category).filter(Boolean))
  ).sort();
```

Không thêm API mới — danh sách lĩnh vực suy ra từ dữ liệu đã tải.

- [ ] **Step 4: Thay logic lọc**

```tsx
  const filteredActivities = activities.filter(act => {
    if (category !== 'all' && act.category !== category) return false;
    if (search.trim() === '') return true;
    const needle = normalize(search);
    return normalize(act.title || '').includes(needle)
        || normalize(act.location || '').includes(needle);
  });
```

Hai bộ lọc kết hợp theo AND.

- [ ] **Step 5: Thay thanh công cụ**

Thay khối `<select>` địa bàn đã xóa ở Task 6 bằng:

```tsx
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoạt động hoặc địa điểm..."
            aria-label="Tìm kiếm hoạt động"
            className="h-11 px-3.5 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px] flex-1 md:flex-none md:w-64"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Lọc theo lĩnh vực"
            className="h-11 px-3.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px] flex-1 md:flex-none"
          >
            <option value="all">Tất cả lĩnh vực</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
```

Dùng `<select>` thuần như thẻ cũ, không dùng component `Select` của Base UI — thanh công cụ này nằm ngoài `MapContainer` nhưng cạnh bản đồ, và thẻ gốc tránh được rắc rối z-index với lớp bản đồ Leaflet.

- [ ] **Step 6: Thêm thông báo khi không có kết quả**

Ngay trong khối bọc `MapContainer` (thẻ `div` có `className="h-[calc(100vh-14rem)]..."`), thêm vào cuối, sau `</MapContainer>`:

```tsx
        {filteredActivities.length === 0 && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center pointer-events-none">
            <div className="bg-white/95 px-5 py-3 rounded-xl border border-slate-200 shadow-md text-sm font-semibold text-slate-700">
              Không có hoạt động nào khớp bộ lọc
            </div>
          </div>
        )}
```

`z-[1000]` để nổi trên lớp bản đồ Leaflet; `pointer-events-none` để vẫn kéo được bản đồ bên dưới.

- [ ] **Step 7: Xác minh bộ lọc**

Mở `/map`:
- Gõ `do son` (không dấu) vào ô tìm kiếm → hoạt động ở Đồ Sơn vẫn hiện. Đây là phép thử quan trọng nhất của hàm `normalize`.
- Gõ `ĐỒ SƠN` (hoa, có dấu) → ra cùng kết quả
- Gõ chuỗi vô nghĩa `zzzz` → bản đồ không còn marker nào, hiện thông báo "Không có hoạt động nào khớp bộ lọc"
- Chọn một lĩnh vực trong dropdown → chỉ còn marker thuộc lĩnh vực đó
- Vừa gõ tìm kiếm vừa chọn lĩnh vực → kết quả thỏa **cả hai** điều kiện
- Xóa hết bộ lọc → mọi marker hiện lại

- [ ] **Step 8: Xác minh đã dọn sạch code cũ**

```bash
grep -n "DISTRICT_COORDS\|MapRecenter\|selectedDistrict\|handleDistrictChange" src/pages/MapPage.tsx
```
Kết quả mong đợi: **không có dòng nào**.

- [ ] **Step 9: Cổng TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 10: Commit (người dùng tự chạy)**

```bash
git add src/pages/MapPage.tsx
git commit -m "feat(map): thay bộ lọc quận/huyện bằng tìm kiếm và lọc lĩnh vực"
```

---

## Task 8: Bảng `units` và migration schema

**Files:**
- Modify: `src/db/schema.ts`
- Modify: `src/routes/users.ts` (bỏ `unionUnit` khỏi route cập nhật hồ sơ)
- Modify: `src/routes/leaderboard.ts` (bỏ `unionUnit` khỏi truy vấn)
- Modify: `src/pages/ProfilePage.tsx:219` (chỗ hiển thị `dbUser.unionUnit`)

**Interfaces:**
- Consumes: không
- Produces:
  - `export const units` — bảng Drizzle với cột `id`, `name`, `type`, `isActive`, `createdAt`
  - `users.unitId: integer | null` — khóa ngoại tới `units.id`
  - `export const unitsRelations`

**⚠️ Rủi ro R5:** task này **xóa cột `union_unit`**. Spec chốt phương án này vì DB còn trống. Step 1 kiểm tra lại điều đó trước khi xóa — nếu có dữ liệu thật, **dừng lại và báo người dùng**, đừng tự ý chạy tiếp.

- [ ] **Step 1: Kiểm tra DB có dữ liệu thật không**

```bash
node -e "
require('dotenv').config();
const {Pool}=require('pg');
const p=new Pool({host:process.env.SQL_HOST,user:process.env.SQL_USER,password:process.env.SQL_PASSWORD,database:process.env.SQL_DB_NAME});
p.query('SELECT count(*) AS n, count(union_unit) AS filled FROM users').then(r=>{console.log(r.rows[0]);p.end();}).catch(e=>{console.error(e.message);process.exit(1);});
"
```

Kết quả mong đợi: `n` bằng `0`, hoặc chỉ vài tài khoản thử nghiệm mà bạn chấp nhận mất `union_unit`.

**Nếu `filled` lớn hơn 0 và đó là dữ liệu thật: DỪNG TASK NÀY.** Báo người dùng và chuyển sang phương án A trong spec (giữ `unionUnit`, thêm `unitId`).

- [ ] **Step 2: Thêm bảng `units` vào `src/db/schema.ts`**

Đặt **phía trên** khai báo `users` (vì `users` sẽ tham chiếu tới nó):

```ts
export const units = pgTable('units', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  // 'dia_ban' | 'truong_hoc' | 'doanh_nghiep' | 'luc_luong_vu_trang'
  type: text('type').notNull().default('dia_ban'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});
```

- [ ] **Step 3: Đổi `users.unionUnit` thành `users.unitId`**

Trong khai báo `users`, xóa dòng:
```ts
  unionUnit: text('union_unit'), // Đơn vị Đoàn
```
và thêm:
```ts
  unitId: integer('unit_id').references(() => units.id), // Đơn vị Đoàn, NULL nếu chưa chọn
```

Giữ nguyên `unit: text('unit')` — đó là đơn vị học tập/công tác, không dùng để xếp hạng.

- [ ] **Step 4: Thêm quan hệ**

Thêm sau `usersRelations`:
```ts
export const unitsRelations = relations(units, ({ many }) => ({
  members: many(users),
}));
```

Và bổ sung vào `usersRelations`:
```ts
export const usersRelations = relations(users, ({ one, many }) => ({
  activitiesOrganized: many(activities),
  registrations: many(activityRegistrations),
  unit: one(units, {
    fields: [users.unitId],
    references: [units.id],
  }),
}));
```

Chú ý `usersRelations` hiện chỉ nhận `({ many })` — phải đổi thành `({ one, many })`.

- [ ] **Step 5: Sinh và chạy migration**

```bash
npx drizzle-kit generate --config=src/db/drizzle.config.ts
```

Mở file SQL vừa sinh trong thư mục `drizzle/`, **đọc kỹ trước khi chạy**. Nó phải chứa: tạo bảng `units`, `ALTER TABLE users DROP COLUMN union_unit`, `ALTER TABLE users ADD COLUMN unit_id`. Nếu thấy lệnh `DROP TABLE` hay bất cứ thứ gì ngoài phạm vi trên — dừng lại, báo người dùng.

```bash
npx drizzle-kit migrate --config=src/db/drizzle.config.ts
```

**Lưu ý biến môi trường:** `drizzle.config.ts` dùng `SQL_ADMIN_USER`/`SQL_ADMIN_PASSWORD`, còn `src/db/index.ts` dùng `SQL_USER`/`SQL_PASSWORD`. Cả hai cặp phải có trong `.env`, nếu không migration sẽ báo thiếu thông tin đăng nhập.

- [ ] **Step 6: Gỡ mọi tham chiếu `unionUnit` còn sót**

Trong `src/routes/users.ts`, route `/api/user/profile`: bỏ `unionUnit` khỏi cả phần destructure `req.body` lẫn khối `.set({...})`.

Trong `src/routes/leaderboard.ts`: bỏ dòng `unionUnit: users.unionUnit,` khỏi `db.select({...})`.

Trong `src/pages/ProfilePage.tsx` dòng 219, đổi từ:
```tsx
              <span className="font-semibold text-slate-900">{dbUser?.unionUnit || 'Đoàn Thanh Niên Hải Phòng'}</span>
```
thành:
```tsx
              <span className="font-semibold text-slate-900">{dbUser?.unitName || 'Chưa chọn đơn vị'}</span>
```

Trong `src/pages/LeaderboardPage.tsx` dòng 130, đổi từ:
```tsx
                          {vol.unionUnit || 'Đoàn cơ sở Hải Phòng'}
```
thành:
```tsx
                          {vol.unitName || 'Chưa chọn đơn vị'}
```

Trong `src/pages/CheckinPage.tsx` dòng 118, đổi từ:
```tsx
                          {dbUser?.unionUnit || 'Đoàn Thanh Niên Hải Phòng'}
```
thành:
```tsx
                          {dbUser?.unitName || 'Đoàn Thanh Niên Hải Phòng'}
```

Phần form sửa hồ sơ trong `ProfilePage.tsx` (dòng 335-344) để nguyên ở task này — Task 11 thay bằng dropdown.

**Lưu ý về trạng thái tạm thời:** trường `unitName` chưa được API nào trả về cho tới Task 11 (`getOrCreateUser`) và Task 12 (`/api/leaderboard`). Từ sau Task 8 đến trước Task 11, các chỗ vừa sửa sẽ hiện chuỗi dự phòng ("Chưa chọn đơn vị"). Đó là hành vi đúng, **không phải lỗi** — đừng cố "sửa" bằng cách trỏ ngược lại `unionUnit`.

- [ ] **Step 7: Xác minh schema đã đổi**

```bash
node -e "
require('dotenv').config();
const {Pool}=require('pg');
const p=new Pool({host:process.env.SQL_HOST,user:process.env.SQL_USER,password:process.env.SQL_PASSWORD,database:process.env.SQL_DB_NAME});
p.query(\"SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name IN ('union_unit','unit_id')\").then(r=>{console.log(r.rows);p.end();});
"
```
Kết quả mong đợi: chỉ có `unit_id`, **không** còn `union_unit`.

- [ ] **Step 8: Xác minh không sót tham chiếu**

```bash
grep -rn "unionUnit\|union_unit" src/ server.ts
```
Kết quả mong đợi: **không có dòng nào** (trừ file migration trong `drizzle/`).

- [ ] **Step 9: Cổng TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 10: Commit (người dùng tự chạy)**

```bash
git add src/db/schema.ts drizzle/ src/routes/ src/pages/
git commit -m "feat(db): thêm bảng units, thay users.unionUnit bằng unitId"
```

---

## Task 9: Seed 114 phường/xã Hải Phòng

**Files:**
- Create: `src/data/haiphong-wards.json`
- Create: `scripts/seed-units.ts`

**Interfaces:**
- Consumes: bảng `units` từ Task 8
- Produces: dữ liệu trong bảng `units`; script chạy lại được nhiều lần không sinh trùng

- [ ] **Step 1: Lấy danh sách 114 đơn vị**

Nguồn chính thức: Nghị quyết 1669/NQ-UBTVQH15, danh sách đăng trên Cổng thông tin Chính phủ. Gồm **67 xã, 45 phường, 2 đặc khu** (Cát Hải và Bạch Long Vĩ).

Nguồn tiện dùng cho máy: kho `zuydd/vn-geo` trên GitHub, thư mục `json/` — danh sách tỉnh/thành và xã/phường sau sáp nhập, dạng JSON. Lọc lấy các đơn vị thuộc Hải Phòng.

Tạo `src/data/haiphong-wards.json` theo đúng dạng sau:

```json
[
  { "name": "Đoàn phường Hồng Bàng", "type": "dia_ban" },
  { "name": "Đoàn phường Ngô Quyền", "type": "dia_ban" },
  { "name": "Đoàn đặc khu Cát Hải", "type": "dia_ban" },
  { "name": "Đoàn đặc khu Bạch Long Vĩ", "type": "dia_ban" }
]
```

**Quy ước đặt tên:** tiền tố `Đoàn ` + tên đơn vị hành chính đầy đủ. Tên đoàn thể chứ không phải tên đơn vị hành chính, vì đây là danh sách đơn vị Đoàn.

**Xác minh trước khi sang bước sau:** file phải có đúng **114 phần tử**.
```bash
node -e "console.log(require('./src/data/haiphong-wards.json').length)"
```
Kết quả mong đợi: `114`.

- [ ] **Step 2: Viết `scripts/seed-units.ts`**

```ts
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
```

`onConflictDoNothing` trên cột `name` (đã `unique` ở Task 8) khiến script chạy lại nhiều lần cũng không sinh bản ghi trùng.

- [ ] **Step 3: Chạy seed**

```bash
npx tsx scripts/seed-units.ts
```
Kết quả mong đợi lần đầu: `Đã thêm mới 114 đơn vị (bỏ qua 0 đơn vị đã tồn tại).`

- [ ] **Step 4: Xác minh chạy lại không sinh trùng**

```bash
npx tsx scripts/seed-units.ts
```
Kết quả mong đợi lần hai: `Đã thêm mới 0 đơn vị (bỏ qua 114 đơn vị đã tồn tại).`

- [ ] **Step 5: Xác minh trong DB**

```bash
node -e "
require('dotenv').config();
const {Pool}=require('pg');
const p=new Pool({host:process.env.SQL_HOST,user:process.env.SQL_USER,password:process.env.SQL_PASSWORD,database:process.env.SQL_DB_NAME});
p.query('SELECT count(*) AS n FROM units').then(r=>{console.log(r.rows[0]);p.end();});
"
```
Kết quả mong đợi: `{ n: '114' }`.

- [ ] **Step 6: Commit (người dùng tự chạy)**

```bash
git add src/data/haiphong-wards.json scripts/seed-units.ts
git commit -m "feat(db): seed 114 đơn vị Đoàn theo phường/xã Hải Phòng sau sáp nhập"
```

---

## Task 10: API quản lý đơn vị

**Files:**
- Create: `src/routes/units.ts`
- Modify: `server.ts` (gắn router)

**Interfaces:**
- Consumes: `HttpError`, `asyncHandler` (Task 3); `getUserRole`, `STAFF_ROLES` (Task 4); bảng `units` (Task 8)
- Produces:
  - `GET /api/units` → `{ units: Array<{ id, name, type, isActive, memberCount? }> }`
  - `POST /api/units` → đơn vị vừa tạo
  - `PATCH /api/units/:id` → đơn vị sau khi sửa

- [ ] **Step 1: Tạo `src/routes/units.ts`**

```ts
import { Router } from 'express';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth.ts';
import { getUserRole } from '../middleware/require-role.ts';
import { HttpError, asyncHandler } from '../lib/http-error.ts';
import { db } from '../db/index.ts';
import { units, users } from '../db/schema.ts';
import { asc, eq, sql } from 'drizzle-orm';

const router = Router();

const VALID_TYPES = ['dia_ban', 'truong_hoc', 'doanh_nghiep', 'luc_luong_vu_trang'];

/**
 * Danh sách đơn vị.
 * Công khai: chỉ đơn vị đang hoạt động.
 * thanh_doan + ?includeInactive=true: toàn bộ, kèm số TNV.
 */
router.get('/api/units', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const role = await getUserRole(req);
  const wantsAll = req.query.includeInactive === 'true' && role === 'thanh_doan';

  if (wantsAll) {
    const rows = await db.select({
      id: units.id,
      name: units.name,
      type: units.type,
      isActive: units.isActive,
      memberCount: sql<number>`count(${users.id})`,
    })
      .from(units)
      .leftJoin(users, eq(users.unitId, units.id))
      .groupBy(units.id)
      .orderBy(asc(units.name));

    res.json({ units: rows.map(r => ({ ...r, memberCount: Number(r.memberCount) })) });
    return;
  }

  const rows = await db.select({
    id: units.id,
    name: units.name,
    type: units.type,
    isActive: units.isActive,
  })
    .from(units)
    .where(eq(units.isActive, true))
    .orderBy(asc(units.name));

  res.json({ units: rows });
}));

/** Tạo đơn vị mới. Chỉ Thành Đoàn. */
router.post('/api/units', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const role = await getUserRole(req);
  if (role !== 'thanh_doan') {
    throw new HttpError(403, 'Chỉ cán bộ Thành Đoàn có quyền quản lý đơn vị');
  }

  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const type = typeof req.body.type === 'string' ? req.body.type : 'dia_ban';

  if (name === '') {
    throw new HttpError(400, 'Tên đơn vị không được để trống');
  }
  if (!VALID_TYPES.includes(type)) {
    throw new HttpError(400, 'Loại đơn vị không hợp lệ');
  }

  const existing = await db.select({ id: units.id }).from(units).where(eq(units.name, name)).limit(1);
  if (existing.length > 0) {
    throw new HttpError(409, 'Đơn vị này đã tồn tại');
  }

  const created = await db.insert(units).values({ name, type }).returning();
  res.json(created[0]);
}));

/** Sửa tên, loại, hoặc ẩn/hiện đơn vị. Chỉ Thành Đoàn. */
router.patch('/api/units/:id', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const role = await getUserRole(req);
  if (role !== 'thanh_doan') {
    throw new HttpError(403, 'Chỉ cán bộ Thành Đoàn có quyền quản lý đơn vị');
  }

  const id = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    throw new HttpError(400, 'Mã đơn vị không hợp lệ');
  }

  const patch: { name?: string; type?: string; isActive?: boolean } = {};

  if (typeof req.body.name === 'string') {
    const name = req.body.name.trim();
    if (name === '') throw new HttpError(400, 'Tên đơn vị không được để trống');
    patch.name = name;
  }
  if (typeof req.body.type === 'string') {
    if (!VALID_TYPES.includes(req.body.type)) throw new HttpError(400, 'Loại đơn vị không hợp lệ');
    patch.type = req.body.type;
  }
  if (typeof req.body.isActive === 'boolean') {
    patch.isActive = req.body.isActive;
  }

  if (Object.keys(patch).length === 0) {
    throw new HttpError(400, 'Không có thông tin nào để cập nhật');
  }

  const updated = await db.update(units).set(patch).where(eq(units.id, id)).returning();
  if (updated.length === 0) {
    throw new HttpError(404, 'Không tìm thấy đơn vị');
  }

  res.json(updated[0]);
}));

export default router;
```

- [ ] **Step 2: Gắn router vào `server.ts`**

```ts
import unitsRouter from './src/routes/units.ts';
// ...
  app.use(unitsRouter);
```

Đặt cùng nhóm với các `app.use(...Router)` khác, trước Vite middleware.

- [ ] **Step 3: Xác minh danh sách công khai**

```bash
curl -s http://localhost:3000/api/units | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('Số đơn vị:',j.units.length,'| Mẫu:',j.units[0]);})"
```
Kết quả mong đợi: `Số đơn vị: 114`, mẫu có đủ `id`, `name`, `type`, `isActive` và **không có** `memberCount`.

- [ ] **Step 4: Xác minh chặn quyền**

```bash
curl -s -X POST http://localhost:3000/api/units \
  -H "Authorization: Bearer <TOKEN_TNV>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Đoàn thử nghiệm","type":"truong_hoc"}'
```
Kết quả mong đợi: `{"error":"Chỉ cán bộ Thành Đoàn có quyền quản lý đơn vị"}` với HTTP 403.

- [ ] **Step 5: Xác minh Thành Đoàn tạo được**

```bash
curl -s -X POST http://localhost:3000/api/units \
  -H "Authorization: Bearer <TOKEN_THANH_DOAN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Đoàn trường ĐH Hàng hải Việt Nam","type":"truong_hoc"}'
```
Kết quả mong đợi: JSON đơn vị mới có `id`, `type` là `truong_hoc`.

Gọi lại đúng lệnh trên lần nữa → mong đợi `{"error":"Đơn vị này đã tồn tại"}` với HTTP 409.

- [ ] **Step 6: Xác minh ẩn đơn vị và `includeInactive`**

Ẩn đơn vị vừa tạo (thay `<ID>` bằng id nhận ở Step 5):
```bash
curl -s -X PATCH http://localhost:3000/api/units/<ID> \
  -H "Authorization: Bearer <TOKEN_THANH_DOAN>" \
  -H "Content-Type: application/json" \
  -d '{"isActive":false}'
```

Rồi:
```bash
curl -s http://localhost:3000/api/units | grep -c "Hàng hải"
```
Kết quả mong đợi: `0` — đơn vị đã ẩn không lọt vào danh sách công khai.

```bash
curl -s -H "Authorization: Bearer <TOKEN_THANH_DOAN>" \
  "http://localhost:3000/api/units?includeInactive=true" | grep -c "Hàng hải"
```
Kết quả mong đợi: `1` — Thành Đoàn vẫn thấy để bật lại được.

```bash
curl -s -H "Authorization: Bearer <TOKEN_TNV>" \
  "http://localhost:3000/api/units?includeInactive=true" | grep -c "Hàng hải"
```
Kết quả mong đợi: `0` — TNV truyền tham số này thì bị bỏ qua, không báo lỗi.

- [ ] **Step 7: Cổng TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: Commit (người dùng tự chạy)**

```bash
git add src/routes/units.ts server.ts
git commit -m "feat(api): thêm CRUD đơn vị Đoàn cho Thành Đoàn"
```

---

## Task 11: Chọn đơn vị bằng dropdown ở trang Hồ sơ

**Files:**
- Modify: `src/pages/ProfilePage.tsx`
- Modify: `src/routes/users.ts` (nhận `unitId`)

**Interfaces:**
- Consumes: `GET /api/units` (Task 10)
- Produces: `/api/user/profile` nhận thêm trường `unitId: number | null`

- [ ] **Step 1: Cho API hồ sơ nhận `unitId`**

Trong `src/routes/users.ts`, route `/api/user/profile`, thêm `unitId` vào phần destructure và khối `.set()`:

```ts
  const { fullName, dob, gender, cccd, phone, address, unit, skills, unitId } = req.body;
  const updated = await db.update(users)
    .set({
      fullName, dob, gender, cccd, phone, address, unit, skills,
      unitId: unitId === null || unitId === undefined || unitId === '' ? null : Number(unitId),
    })
    .where(eq(users.uid, req.user.uid))
    .returning();
```

Chuỗi rỗng phải quy về `null`, nếu không `Number('')` cho ra `0` và khóa ngoại sẽ lỗi.

- [ ] **Step 2: Cho `/api/auth/sync` trả kèm tên đơn vị**

`ProfilePage` và `Layout` đọc `dbUser`, nên `dbUser` cần có `unitName`. Sửa `getOrCreateUser` trong `src/db/users.ts`:

```ts
import { db } from './index.ts';
import { units, users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string) {
  const result = await db.insert(users)
    .values({ uid, email })
    .onConflictDoUpdate({ target: users.uid, set: { email } })
    .returning();

  const user = result[0];

  // Kèm tên đơn vị để giao diện không phải gọi thêm API
  if (user.unitId === null) {
    return { ...user, unitName: null as string | null };
  }
  const unitRows = await db.select({ name: units.name })
    .from(units)
    .where(eq(units.id, user.unitId))
    .limit(1);

  return { ...user, unitName: unitRows[0]?.name ?? null };
}
```

- [ ] **Step 3: Nạp danh sách đơn vị trong `ProfilePage`**

Thêm state:
```tsx
  const [unitOptions, setUnitOptions] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    fetch('/api/units')
      .then(res => res.json())
      .then(data => setUnitOptions(data.units || []))
      .catch(console.error);
  }, []);
```

Thêm `unitId` vào `formData` (dòng 21-29):
```tsx
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    unit: '',
    unitId: '' as string,
    skills: '',
    address: '',
    cccd: ''
  });
```

Và vào phần nạp lại từ `dbUser` (dòng 32-41):
```tsx
        unitId: dbUser.unitId ? String(dbUser.unitId) : '',
```

Xóa dòng `unionUnit: ''` và `unionUnit: dbUser.unionUnit || ''` nếu Task 8 chưa xóa hết.

- [ ] **Step 4: Thay ô nhập bằng dropdown**

Dòng 335-344, thay toàn bộ khối `Đoàn cơ sở trực thuộc` bằng:

```tsx
            <div className="space-y-1.5">
              <Label htmlFor="unitId" className="text-xs font-bold text-slate-700">Đơn vị Đoàn trực thuộc</Label>
              <select
                id="unitId"
                value={formData.unitId}
                onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              >
                <option value="">— Chưa chọn đơn vị —</option>
                {unitOptions.map((u) => (
                  <option key={u.id} value={String(u.id)}>{u.name}</option>
                ))}
              </select>
              {formData.unitId === '' && (
                <p className="text-[11px] text-amber-600 font-medium">
                  Chọn đơn vị Đoàn để được tính vào bảng xếp hạng đơn vị.
                </p>
              )}
            </div>
```

Dùng `<select>` thuần cho nhất quán với ô "Danh Mục" đang có trong `DashboardPage` — và danh sách 114 mục thì `<select>` gốc của trình duyệt cho trải nghiệm cuộn tốt hơn trên điện thoại.

- [ ] **Step 5: Xác minh lưu được**

Đăng nhập, vào `/profile`, mở form sửa hồ sơ.

Kết quả mong đợi:
- Dropdown "Đơn vị Đoàn trực thuộc" có 114 mục cộng dòng "— Chưa chọn đơn vị —"
- Khi chưa chọn, có dòng nhắc màu hổ phách bên dưới
- Chọn một đơn vị rồi lưu → tải lại trang, dropdown vẫn giữ đúng đơn vị đã chọn
- Phần xem hồ sơ phía trên hiện đúng tên đơn vị ở mục "Đơn vị Đoàn trực thuộc"

- [ ] **Step 6: Xác minh trong DB**

```bash
node -e "
require('dotenv').config();
const {Pool}=require('pg');
const p=new Pool({host:process.env.SQL_HOST,user:process.env.SQL_USER,password:process.env.SQL_PASSWORD,database:process.env.SQL_DB_NAME});
p.query('SELECT u.email, un.name FROM users u LEFT JOIN units un ON un.id=u.unit_id').then(r=>{console.log(r.rows);p.end();});
"
```
Kết quả mong đợi: tài khoản vừa sửa có tên đơn vị đúng.

- [ ] **Step 7: Cổng TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: Commit (người dùng tự chạy)**

```bash
git add src/pages/ProfilePage.tsx src/routes/users.ts src/db/users.ts
git commit -m "feat(profile): chọn đơn vị Đoàn bằng dropdown thay vì gõ tự do"
```

---

## Task 12: API bảng xếp hạng cá nhân và đơn vị

**Files:**
- Modify: `src/routes/leaderboard.ts`

**Interfaces:**
- Consumes: bảng `units`, `users.unitId` (Task 8); `asyncHandler` (Task 3)
- Produces:
  - `GET /api/leaderboard?unitId=` → `{ topVolunteers: Array<{ id, fullName, unitId, unitName, reputationPoints, volunteerHours, activitiesCount, isVerified }> }`
  - `GET /api/leaderboard/units?sort=total|avg` → `{ topUnits: Array<{ id, name, type, totalPoints, memberCount, avgPoints, totalHours }> }`

- [ ] **Step 1: Viết lại `src/routes/leaderboard.ts`**

```ts
import { Router } from 'express';
import { asyncHandler } from '../lib/http-error.ts';
import { db } from '../db/index.ts';
import { units, users } from '../db/schema.ts';
import { desc, eq, sql } from 'drizzle-orm';

const router = Router();

/** Số TNV tối thiểu để một đơn vị được xếp theo điểm trung bình */
const MIN_MEMBERS_FOR_AVG = 3;

/** Bảng xếp hạng cá nhân. Lọc theo đơn vị nếu có ?unitId= */
router.get('/api/leaderboard', asyncHandler(async (req, res) => {
  const rawUnitId = typeof req.query.unitId === 'string' ? req.query.unitId : '';
  const unitId = rawUnitId === '' ? null : Number.parseInt(rawUnitId, 10);

  const columns = {
    id: users.id,
    fullName: users.fullName,
    unitId: users.unitId,
    unitName: units.name,
    reputationPoints: users.reputationPoints,
    volunteerHours: users.volunteerHours,
    activitiesCount: users.activitiesCount,
    isVerified: users.isVerified,
  };

  // Lọc TRƯỚC rồi mới cắt 10 — nếu làm ngược lại, đơn vị nhỏ sẽ ra bảng trống
  const base = db.select(columns).from(users).leftJoin(units, eq(users.unitId, units.id));

  const topVolunteers = (unitId !== null && !Number.isNaN(unitId))
    ? await base.where(eq(users.unitId, unitId)).orderBy(desc(users.reputationPoints)).limit(10)
    : await base.orderBy(desc(users.reputationPoints)).limit(10);

  res.json({ topVolunteers });
}));

/** Bảng xếp hạng đơn vị. ?sort=total (mặc định) hoặc avg */
router.get('/api/leaderboard/units', asyncHandler(async (req, res) => {
  const sortByAvg = req.query.sort === 'avg';

  const rows = await db.select({
    id: units.id,
    name: units.name,
    type: units.type,
    totalPoints: sql<number>`COALESCE(sum(${users.reputationPoints}), 0)`,
    totalHours: sql<number>`COALESCE(sum(${users.volunteerHours}), 0)`,
    memberCount: sql<number>`count(${users.id})`,
  })
    .from(units)
    // innerJoin đã loại sẵn cả đơn vị không có TNV lẫn TNV chưa chọn đơn vị
    .innerJoin(users, eq(users.unitId, units.id))
    .groupBy(units.id)
    .orderBy(desc(sql`sum(${users.reputationPoints})`));

  const enriched = rows.map(r => {
    const memberCount = Number(r.memberCount);
    const totalPoints = Number(r.totalPoints);
    return {
      id: r.id,
      name: r.name,
      type: r.type,
      totalPoints,
      totalHours: Number(r.totalHours),
      memberCount,
      avgPoints: memberCount === 0 ? 0 : Math.round((totalPoints / memberCount) * 10) / 10,
    };
  });

  const topUnits = sortByAvg
    // Đơn vị 1 người 500 điểm không được đứng trên đơn vị 200 người
    ? enriched.filter(u => u.memberCount >= MIN_MEMBERS_FOR_AVG)
              .sort((a, b) => b.avgPoints - a.avgPoints)
              .slice(0, 20)
    : enriched.slice(0, 20);

  res.json({ topUnits });
}));

export default router;
```

Giá trị `sort` không hợp lệ rơi về `total`, không báo lỗi — đúng quy tắc trong spec.

- [ ] **Step 2: Chuẩn bị dữ liệu thử**

Cần ít nhất 2 đơn vị, mỗi đơn vị vài TNV có điểm khác nhau, và 1 TNV chưa chọn đơn vị.

```bash
node -e "
require('dotenv').config();
const {Pool}=require('pg');
const p=new Pool({host:process.env.SQL_HOST,user:process.env.SQL_USER,password:process.env.SQL_PASSWORD,database:process.env.SQL_DB_NAME});
(async()=>{
  const u=await p.query('SELECT id FROM units ORDER BY id LIMIT 2');
  const [a,b]=u.rows.map(r=>r.id);
  await p.query(\"INSERT INTO users (uid,email,full_name,unit_id,reputation_points,volunteer_hours) VALUES ('t1','t1@test.vn','Nguyễn Văn A',\$1,500,50),('t2','t2@test.vn','Trần Thị B',\$1,300,30),('t3','t3@test.vn','Lê Văn C',\$1,200,20),('t4','t4@test.vn','Phạm Thị D',\$2,900,90),('t5','t5@test.vn','Hoàng Văn E',NULL,700,70) ON CONFLICT (uid) DO NOTHING\",[a,b]);
  console.log('Đơn vị A =',a,'(3 TNV, tổng 1000đ, TB 333.3) | Đơn vị B =',b,'(1 TNV, 900đ, TB 900)');
  p.end();
})();
"
```

- [ ] **Step 3: Xác minh bảng cá nhân**

```bash
curl -s http://localhost:3000/api/leaderboard
```
Kết quả mong đợi:
- Sắp giảm dần theo điểm: Phạm Thị D (900) → Hoàng Văn E (700) → Nguyễn Văn A (500) → ...
- Mỗi dòng có `unitName`; Hoàng Văn E có `unitName: null`
- **Không có trường `email`** ở bất kỳ dòng nào

- [ ] **Step 4: Xác minh lọc theo đơn vị**

```bash
curl -s "http://localhost:3000/api/leaderboard?unitId=<ID_DON_VI_A>"
```
Kết quả mong đợi: đúng 3 người (A, B, C), **không** có D và E. Đây là phép thử "lọc trước, cắt sau".

- [ ] **Step 5: Xác minh bảng đơn vị theo tổng điểm**

```bash
curl -s http://localhost:3000/api/leaderboard/units
```
Kết quả mong đợi: Đơn vị A đứng đầu (`totalPoints: 1000`, `memberCount: 3`, `avgPoints: 333.3`), Đơn vị B thứ hai (`totalPoints: 900`, `memberCount: 1`, `avgPoints: 900`).

Đơn vị không có TNV nào **không** xuất hiện. TNV chưa chọn đơn vị (Hoàng Văn E, 700đ) **không** được cộng vào đơn vị nào.

- [ ] **Step 6: Xác minh sắp theo điểm trung bình có ngưỡng**

```bash
curl -s "http://localhost:3000/api/leaderboard/units?sort=avg"
```
Kết quả mong đợi: **chỉ còn Đơn vị A**. Đơn vị B bị loại vì chỉ có 1 TNV, dưới ngưỡng 3.

Nếu Đơn vị B vẫn xuất hiện và đứng đầu với 900 điểm TB — ngưỡng chưa hoạt động, xem lại `MIN_MEMBERS_FOR_AVG`.

- [ ] **Step 7: Xác minh `sort` bậy không làm hỏng**

```bash
curl -s "http://localhost:3000/api/leaderboard/units?sort=abcxyz"
```
Kết quả mong đợi: giống hệt Step 5 (rơi về sắp theo tổng điểm), không báo lỗi.

- [ ] **Step 8: Cổng TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 9: Commit (người dùng tự chạy)**

```bash
git add src/routes/leaderboard.ts
git commit -m "feat(api): bảng xếp hạng cá nhân lọc theo đơn vị và bảng xếp hạng đơn vị"
```

---

## Task 13: Giao diện bảng xếp hạng 2 tab

**Files:**
- Create: `src/pages/leaderboard/IndividualTab.tsx`, `src/pages/leaderboard/UnitTab.tsx`
- Modify: `src/pages/LeaderboardPage.tsx`

**Interfaces:**
- Consumes: `GET /api/leaderboard?unitId=`, `GET /api/leaderboard/units?sort=`, `GET /api/units` (Task 10, 12)
- Produces:
  - `export function getRankBadge(index: number): JSX.Element` trong `IndividualTab.tsx`, `UnitTab.tsx` dùng lại
  - `export default function IndividualTab()`
  - `export default function UnitTab()`

**Nhắc lại ràng buộc:** `Tabs` ở đây là Base UI. `Tabs` nhận `defaultValue`; `TabsTrigger` và `TabsContent` nhận `value`. Không có `TabsPrimitive.Trigger`/`Content` kiểu Radix.

- [ ] **Step 1: Tạo `src/pages/leaderboard/IndividualTab.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Trophy, Medal, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

/** Huy hiệu hạng, dùng chung cho cả hai tab */
export function getRankBadge(index: number) {
  if (index === 0) {
    return (
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300 }}
        className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 border border-amber-300 flex items-center justify-center font-bold shadow-sm"
      >
        <Trophy className="w-5 h-5 text-amber-500" />
      </motion.div>
    );
  }
  if (index === 1) {
    return (
      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 border border-slate-300 flex items-center justify-center font-bold shadow-sm">
        <Medal className="w-5 h-5 text-slate-400" />
      </div>
    );
  }
  if (index === 2) {
    return (
      <div className="w-8 h-8 rounded-full bg-amber-900/10 text-amber-800 border border-amber-700/20 flex items-center justify-center font-bold shadow-sm">
        <Medal className="w-5 h-5 text-amber-700" />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-sm">
      {index + 1}
    </div>
  );
}

export default function IndividualTab() {
  const [topVolunteers, setTopVolunteers] = useState<any[]>([]);
  const [unitOptions, setUnitOptions] = useState<{ id: number; name: string }[]>([]);
  const [unitFilter, setUnitFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/units')
      .then(res => res.json())
      .then(data => setUnitOptions(data.units || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = unitFilter === 'all' ? '/api/leaderboard' : `/api/leaderboard?unitId=${unitFilter}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setTopVolunteers(data.topVolunteers || []);
        setLoading(false);
      })
      .catch(err => { console.error(err); setLoading(false); });
  }, [unitFilter]);

  return (
    <div>
      <div className="p-4 border-b border-slate-100 bg-slate-50/40">
        <select
          value={unitFilter}
          onChange={(e) => setUnitFilter(e.target.value)}
          aria-label="Lọc theo đơn vị Đoàn"
          className="w-full sm:w-80 h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
        >
          <option value="all">Tất cả đơn vị</option>
          {unitOptions.map((u) => (
            <option key={u.id} value={String(u.id)}>{u.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Đang tải bảng xếp hạng...</div>
      ) : topVolunteers.length === 0 ? (
        <div className="p-8 text-center text-slate-500">Chưa có dữ liệu tình nguyện viên.</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {topVolunteers.map((vol, idx) => (
            <motion.div
              key={vol.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              whileHover={{ backgroundColor: 'rgba(241, 245, 249, 0.9)', x: 2 }}
              className={`p-4 flex items-center justify-between transition-all ${idx === 0 ? 'bg-amber-50/40' : ''}`}
            >
              <div className="flex items-center gap-4">
                {getRankBadge(idx)}
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    {vol.fullName || 'Đoàn viên chưa cập nhật tên'}
                    {vol.isVerified && (
                      <ShieldCheck className="w-4 h-4 text-blue-600 fill-blue-600/20" />
                    )}
                  </div>
                  <div className={`text-xs ${vol.unitName ? 'text-slate-500' : 'text-slate-400 italic'}`}>
                    {vol.unitName || 'Chưa chọn đơn vị'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-extrabold text-blue-700 text-base">
                  {vol.reputationPoints || 0} <span className="text-xs font-semibold text-slate-500">Điểm</span>
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {vol.volunteerHours || 0} Giờ tình nguyện
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Tạo `src/pages/leaderboard/UnitTab.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { getRankBadge } from './IndividualTab.tsx';

export default function UnitTab() {
  const [topUnits, setTopUnits] = useState<any[]>([]);
  const [sort, setSort] = useState<'total' | 'avg'>('total');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard/units?sort=${sort}`)
      .then(res => res.json())
      .then(data => {
        setTopUnits(data.topUnits || []);
        setLoading(false);
      })
      .catch(err => { console.error(err); setLoading(false); });
  }, [sort]);

  return (
    <div>
      <div className="p-4 border-b border-slate-100 bg-slate-50/40 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => setSort('total')}
            className={`px-3 py-2 rounded-xl text-xs font-bold min-h-[40px] transition-colors ${
              sort === 'total' ? 'bg-blue-700 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Tổng điểm
          </button>
          <button
            onClick={() => setSort('avg')}
            className={`px-3 py-2 rounded-xl text-xs font-bold min-h-[40px] transition-colors ${
              sort === 'avg' ? 'bg-blue-700 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Điểm TB/người
          </button>
        </div>
        {sort === 'avg' && (
          <p className="text-[11px] text-slate-500 font-medium">
            Chỉ tính đơn vị có từ 3 TNV trở lên.
          </p>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Đang tải bảng xếp hạng...</div>
      ) : topUnits.length === 0 ? (
        <div className="p-8 text-center text-slate-500">Chưa có đơn vị nào đủ điều kiện xếp hạng.</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {topUnits.map((u, idx) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              className={`p-4 flex items-center justify-between ${idx === 0 ? 'bg-amber-50/40' : ''}`}
            >
              <div className="flex items-center gap-4">
                {getRankBadge(idx)}
                <div>
                  <div className="font-bold text-slate-900">{u.name}</div>
                  <div className="text-xs text-slate-500">
                    {u.memberCount} TNV · {u.totalHours} giờ
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-extrabold text-blue-700 text-base">
                  {u.totalPoints} <span className="text-xs font-semibold text-slate-500">Điểm</span>
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  TB {u.avgPoints} điểm/người
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Rút gọn `LeaderboardPage.tsx` thành khung 2 tab**

Xóa khỏi `LeaderboardPage.tsx`: state `topVolunteers`, `loading`, `useEffect` fetch, hàm `getRankBadge`, và toàn bộ khối danh sách TNV bên trong `<CardContent className="p-0">`.

Giữ nguyên: banner đầu trang, và cột phụ bên phải (Danh hiệu Đoàn viên, Xác minh Đoàn viên).

Thay `<Card className="md:col-span-2 ...">` bằng:

```tsx
        <Card className="md:col-span-2 border-slate-200 shadow-2xs">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-bold flex items-center justify-between text-blue-900">
              <span>Bảng xếp hạng</span>
              <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 bg-blue-50">
                Thành phố Hải Phòng
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="individual">
              <TabsList className="m-4">
                <TabsTrigger value="individual">Cá nhân</TabsTrigger>
                <TabsTrigger value="unit">Đơn vị</TabsTrigger>
              </TabsList>
              <TabsContent value="individual">
                <IndividualTab />
              </TabsContent>
              <TabsContent value="unit">
                <UnitTab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
```

Thêm import:
```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs.tsx';
import IndividualTab from './leaderboard/IndividualTab.tsx';
import UnitTab from './leaderboard/UnitTab.tsx';
```

Dọn các import không còn dùng ở `LeaderboardPage.tsx` (`Trophy`, `Medal`, `ShieldCheck`, `useEffect`, `useState` nếu không còn dùng) — `tsc --noEmit` sẽ không báo, nhưng để lại là rác.

- [ ] **Step 4: Xác minh tab Cá nhân**

Mở `/leaderboard`.

Kết quả mong đợi:
- Hai tab "Cá nhân" và "Đơn vị" hiện ra, tab Cá nhân mở sẵn
- Danh sách TNV hiện tên và đơn vị, xếp giảm dần theo điểm
- TNV chưa chọn đơn vị hiện "Chưa chọn đơn vị" màu nhạt, in nghiêng
- Chọn một đơn vị trong dropdown → danh sách chỉ còn TNV của đơn vị đó
- Chọn lại "Tất cả đơn vị" → danh sách đầy đủ trở lại
- Không dòng nào hiện email

- [ ] **Step 5: Xác minh tab Đơn vị**

Bấm sang tab "Đơn vị".

Kết quả mong đợi:
- Bảng xếp hạng đơn vị, mỗi dòng có tên đơn vị, số TNV, tổng giờ, tổng điểm, điểm TB
- Nút "Tổng điểm" đang được chọn (nền xanh)
- Bấm "Điểm TB/người" → thứ tự sắp lại, hiện dòng chú thích "Chỉ tính đơn vị có từ 3 TNV trở lên", các đơn vị dưới 3 TNV biến mất
- Bấm lại "Tổng điểm" → trở về danh sách đầy đủ

- [ ] **Step 6: Xác minh trên điện thoại**

Thu cửa sổ về 360px. Kết quả mong đợi: hai tab không tràn, dropdown lọc chiếm đủ chiều rộng, các dòng xếp hạng không bị vỡ bố cục.

- [ ] **Step 7: Cổng TypeScript và build**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 8: Commit (người dùng tự chạy)**

```bash
git add src/pages/LeaderboardPage.tsx src/pages/leaderboard/
git commit -m "feat(leaderboard): 2 tab Cá nhân và Đơn vị với bộ lọc đơn vị"
```

---

## Task 14: Màn hình quản trị đơn vị

**Files:**
- Create: `src/components/admin/UnitsManager.tsx`
- Modify: `src/pages/DashboardPage.tsx`

**Interfaces:**
- Consumes: `GET /api/units?includeInactive=true`, `POST /api/units`, `PATCH /api/units/:id` (Task 10)
- Produces: `export default function UnitsManager()`

- [ ] **Step 1: Tạo `src/components/admin/UnitsManager.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.tsx';
import { Button } from '../ui/button.tsx';
import { Input } from '../ui/input.tsx';
import { Badge } from '../ui/badge.tsx';
import { Plus, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../lib/auth-context.tsx';
import { toast } from 'sonner';

const TYPE_LABELS: Record<string, string> = {
  dia_ban: 'Địa bàn',
  truong_hoc: 'Trường học',
  doanh_nghiep: 'Doanh nghiệp',
  luc_luong_vu_trang: 'Lực lượng vũ trang',
};

export default function UnitsManager() {
  const { user } = useAuth();
  const [units, setUnits] = useState<any[]>([]);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('dia_ban');
  const [busy, setBusy] = useState(false);

  const fetchUnits = async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch('/api/units?includeInactive=true', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setUnits(data.units || []);
  };

  useEffect(() => { fetchUnits(); }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || newName.trim() === '') return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName.trim(), type: newType }),
      });
      if (res.ok) {
        toast.success('Đã thêm đơn vị mới');
        setNewName('');
        fetchUnits();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Thêm đơn vị thất bại');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async (unit: any) => {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch(`/api/units/${unit.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isActive: !unit.isActive }),
    });
    if (res.ok) {
      toast.success(unit.isActive ? 'Đã ẩn đơn vị' : 'Đã hiện lại đơn vị');
      fetchUnits();
    } else {
      const err = await res.json();
      toast.error(err.error || 'Cập nhật thất bại');
    }
  };

  return (
    <Card className="border-slate-200 shadow-2xs">
      <CardHeader className="bg-slate-50 border-b border-slate-100">
        <CardTitle className="text-base font-bold text-slate-900">
          Quản Lý Đơn Vị Đoàn ({units.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <form onSubmit={handleCreate} className="p-4 flex flex-col sm:flex-row gap-2 border-b border-slate-100">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Tên đơn vị mới, VD: Đoàn trường ĐH Hàng hải"
            className="rounded-xl h-10 text-sm flex-1"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            aria-label="Loại đơn vị"
            className="h-10 px-3 rounded-xl border border-slate-200 text-sm bg-white font-medium"
          >
            {Object.entries(TYPE_LABELS).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
          <Button type="submit" disabled={busy} className="bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl min-h-[40px]">
            <Plus className="w-4 h-4 mr-1.5" /> Thêm
          </Button>
        </form>

        <div className="max-h-[480px] overflow-y-auto divide-y divide-slate-100">
          {units.map((u) => (
            <div key={u.id} className={`p-3 flex items-center justify-between gap-3 ${u.isActive ? '' : 'bg-slate-50/60'}`}>
              <div className="min-w-0">
                <div className={`text-sm font-semibold truncate ${u.isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                  {u.name}
                </div>
                <div className="text-[11px] text-slate-500">
                  {TYPE_LABELS[u.type] || u.type} · {u.memberCount} TNV
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!u.isActive && <Badge variant="outline" className="text-[10px] text-slate-500">Đã ẩn</Badge>}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggle(u)}
                  className="h-8 text-[11px] px-2.5 rounded-lg"
                  aria-label={u.isActive ? `Ẩn ${u.name}` : `Hiện lại ${u.name}`}
                >
                  {u.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Gắn vào `DashboardPage.tsx`**

Thêm import:
```tsx
import UnitsManager from '../components/admin/UnitsManager.tsx';
```

Thêm ngay trước thẻ đóng `</div>` cuối cùng của phần nội dung (sau `Card` "Danh Sách & Phê Duyệt Chiến Dịch Đoàn", trước `<Dialog>`):

```tsx
      {dbUser?.role === 'thanh_doan' && <UnitsManager />}
```

Chỉ `thanh_doan` thấy, đúng như spec — `doan_co_so` vào được `/dashboard` nhưng không quản lý đơn vị.

- [ ] **Step 3: Xác minh với tài khoản Thành Đoàn**

Đăng nhập bằng `thanh_doan`, vào `/dashboard`, cuộn xuống cuối trang.

Kết quả mong đợi:
- Thẻ "Quản Lý Đơn Vị Đoàn (115)" hiện ra (114 seed + 1 tạo ở Task 10)
- Danh sách cuộn được, mỗi dòng hiện tên, loại, số TNV
- Đơn vị đã ẩn ở Task 10 hiện nền xám, chữ nhạt, có nhãn "Đã ẩn"
- Nhập tên mới rồi bấm Thêm → toast "Đã thêm đơn vị mới", đơn vị xuất hiện trong danh sách
- Nhập lại đúng tên đó rồi bấm Thêm → toast "Đơn vị này đã tồn tại"
- Bấm nút con mắt → toast báo đúng, trạng thái đổi ngay

- [ ] **Step 4: Xác minh với tài khoản Đoàn cơ sở**

Đăng nhập bằng `doan_co_so`, vào `/dashboard`.

Kết quả mong đợi: vào được trang, thấy bảng chiến dịch, **không** thấy thẻ Quản Lý Đơn Vị Đoàn.

- [ ] **Step 5: Xác minh đơn vị mới xuất hiện ở nơi khác**

Vào `/profile` → dropdown đơn vị có đơn vị vừa thêm.
Vào `/leaderboard` tab Cá nhân → dropdown lọc có đơn vị vừa thêm.
Đơn vị đã ẩn **không** xuất hiện ở cả hai chỗ.

- [ ] **Step 6: Cổng TypeScript và build**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 7: Commit (người dùng tự chạy)**

```bash
git add src/components/admin/UnitsManager.tsx src/pages/DashboardPage.tsx
git commit -m "feat(admin): màn hình quản lý đơn vị Đoàn cho Thành Đoàn"
```

---

## Task 15: Nghiệm thu toàn Đợt A

**Files:** không sửa file nào — task này chỉ chạy lại toàn bộ tiêu chí trong spec mục 9.

- [ ] **Step 1: Dọn dữ liệu thử**

```bash
node -e "
require('dotenv').config();
const {Pool}=require('pg');
const p=new Pool({host:process.env.SQL_HOST,user:process.env.SQL_USER,password:process.env.SQL_PASSWORD,database:process.env.SQL_DB_NAME});
p.query(\"DELETE FROM users WHERE uid IN ('t1','t2','t3','t4','t5')\").then(r=>{console.log('Đã xóa',r.rowCount,'tài khoản thử');p.end();});
"
```

Xóa cả các hoạt động thử tên `HOAT DONG CHO DUYET` và đơn vị `Đoàn thử nghiệm` nếu còn.

- [ ] **Step 2: Chạy lại checklist Đổi tên**

- [ ] Tab trình duyệt hiện "Bản đồ số Thanh niên tình nguyện Hải Phòng"
- [ ] Dòng phụ dưới logo hiện tên chính thức, header không vỡ ở 360px
- [ ] Heading trang Bản đồ hiện tên chính thức
- [ ] Các heading chức năng khác không đổi ("Bảng Điều Khiển Quản Lý Tình Nguyện", "Thẻ Điện Tử & Điểm Danh Hoạt Động")

- [ ] **Step 3: Chạy lại checklist Bản đồ**

- [ ] Không kéo được ra ngoài Hải Phòng theo cả 4 hướng
- [ ] Không zoom out xa hơn `minZoom`
- [ ] Viền ranh giới hiển thị đúng, ôm khít Hải Phòng
- [ ] Gõ `do son` không dấu lọc đúng
- [ ] Lọc lĩnh vực đúng, kết hợp tìm kiếm theo AND
- [ ] `grep -rn "DISTRICT_COORDS" src/` không ra kết quả

- [ ] **Step 4: Chạy lại checklist Bảng xếp hạng**

- [ ] Tab Cá nhân hiện tên + đơn vị
- [ ] Lọc theo đơn vị trả đúng danh sách
- [ ] Tab Đơn vị xếp đúng theo tổng điểm
- [ ] Chuyển sang Điểm TB xếp lại đúng, loại đơn vị dưới 3 TNV
- [ ] TNV chưa chọn đơn vị hiện "Chưa chọn đơn vị", không lọt vào BXH đơn vị

- [ ] **Step 5: Chạy lại checklist Đơn vị**

- [ ] `GET /api/units` trả 114 đơn vị đã seed
- [ ] Tài khoản `thanh_doan` thêm/sửa/ẩn được đơn vị
- [ ] Tài khoản `tnv` gọi `POST /api/units` nhận 403
- [ ] Ô đơn vị ở trang Hồ sơ là dropdown, lưu đúng `unitId`

- [ ] **Step 6: Chạy lại checklist Bảo mật**

- [ ] `curl -s http://localhost:3000/api/leaderboard | grep -c "@"` trả `0`
- [ ] Bảng xếp hạng hiện "Đoàn viên chưa cập nhật tên" khi thiếu tên, không hiện email
- [ ] `GET /api/activities` khi chưa đăng nhập chỉ trả hoạt động `approved`
- [ ] Tài khoản `tnv` truyền `?status=pending` vẫn chỉ nhận hoạt động đã duyệt
- [ ] Tài khoản `thanh_doan` gọi `?status=pending` nhận đúng danh sách chờ duyệt
- [ ] Màn hình duyệt ở `DashboardPage` hoạt động (R8)
- [ ] Gây lỗi cố ý: client chỉ nhận thông báo chung, server log đầy đủ
- [ ] Thông báo có chủ đích vẫn hiển thị nguyên văn

- [ ] **Step 7: Chạy lại checklist Không hồi quy**

- [ ] 10 route cũ hoạt động y như trước khi tách `server.ts`
- [ ] `npx tsc --noEmit` không lỗi
- [ ] `npm run build` thành công
- [ ] `grep -rn "unionUnit" src/ server.ts` không ra kết quả

- [ ] **Step 8: Cập nhật spec nếu có sai lệch**

Nếu Task 6 phải dùng phương án dự phòng (không có GeoJSON, hoặc ghép ranh giới cũ), ghi lại vào mục 8 R1 của spec để đợt sau biết.

Nếu số đo `HAI_PHONG_BOUNDS` khác giá trị ước lượng trong spec mục 7.2, cập nhật spec cho khớp thực tế.

- [ ] **Step 9: Commit (người dùng tự chạy)**

```bash
git add docs/
git commit -m "docs: cập nhật spec Đợt A theo kết quả triển khai"
```

---

## Nguồn tham khảo

- [Danh sách 114 xã, phường, đặc khu của thành phố Hải Phòng mới — Cổng TTĐT Chính phủ](https://xaydungchinhsach.chinhphu.vn/sap-xep-dvhc-danh-sach-114-xa-phuong-dac-khu-cua-thanh-pho-hai-phong-119250622201739743.htm)
- [Danh sách 114 xã phường đặc khu của Hải Phòng mới từ 1/7/2025 — Thư viện Pháp luật](https://thuvienphapluat.vn/phap-luat/ho-tro-phap-luat/danh-sach-114-xa-phuong-dac-khu-cua-hai-phong-moi-tu-172025-sau-sap-nhap-hai-phong-hai-duong-chinh--224269.html)
- [nguyenduy1133/Free-GIS-Data — GeoJSON ranh giới 34 tỉnh/thành sau sáp nhập](https://github.com/nguyenduy1133/Free-GIS-Data)
- [zuydd/vn-geo — danh sách tỉnh/thành và xã/phường sau sáp nhập 2025](https://github.com/zuydd/vn-geo)
