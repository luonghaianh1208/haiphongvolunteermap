# Đợt A — Đổi tên app, Giới hạn bản đồ, Bảng xếp hạng đơn vị

**Ngày:** 2026-08-10
**Trạng thái:** Chờ duyệt
**Phạm vi:** Yêu cầu #3 (đổi tên), #1 (giới hạn bản đồ), #2 (bảng xếp hạng)

---

## 1. Bối cảnh

Người dùng đưa ra 5 yêu cầu. Chúng được chia thành 3 đợt vì #4 và #5 là subsystem mới, không phải sửa đổi giao diện:

| Đợt | Nội dung | Trạng thái |
|-----|----------|-----------|
| **A** | #3 đổi tên · #1 giới hạn bản đồ · #2 bảng xếp hạng · 3 bản vá bảo mật | ← tài liệu này |
| **B** | #4 QR check-in tại điểm (camera, chống gian lận) | Chưa brainstorm |
| **C** | #5 giấy chứng nhận PDF | Chưa brainstorm — phụ thuộc dữ liệu điểm danh của Đợt B |
| **S** | Bảo mật: rate limit, helmet, validate input, SSL cho DB, phân quyền tạo hoạt động | Chưa brainstorm — xem mục 2.1 |

Đợt C phụ thuộc Đợt B: giấy chứng nhận phải dựa trên bản ghi "đã tham gia", mà `activityRegistrations.status = 'attended'` hiện **không được set ở bất kỳ đâu trong code** — điểm danh đang là mock.

### 1.1 Ba bản vá bảo mật đưa vào Đợt A

Rà soát bảo mật ngày 2026-08-10 phát hiện nhiều lỗ hổng. Ba lỗi dưới đây nằm **đúng trong file mà Đợt A sẽ sửa**, nên vá luôn thay vì chờ Đợt S:

| Lỗi | Vị trí | Mức độ |
|---|---|---|
| **S1** — `/api/leaderboard` công khai trả `email` của mọi TNV | `server.ts:208` | Nghiêm trọng — rò rỉ dữ liệu cá nhân |
| **S2** — `GET /api/activities` không lọc `status`, hoạt động `pending`/`rejected` hiện công khai | `server.ts:88` | Nghiêm trọng — vô hiệu hóa cơ chế duyệt, mở đường cho spam |
| **S3** — 8 endpoint trả nguyên `err.message` của Postgres cho client | toàn bộ `server.ts` | Cao — rò rỉ cấu trúc CSDL |

### 1.2 Vấn đề bảo mật KHÔNG xử lý ở Đợt A

Chuyển sang Đợt S, ghi lại để không bị quên:

- **Không có rate limit / CAPTCHA** ở bất kỳ endpoint nào
- **`POST /api/activities` không kiểm tra role** — mọi tài khoản `tnv` đều tạo được hoạt động. Cùng với S2 tạo thành chuỗi spam hoàn chỉnh. *(S2 đã chặn phần hiển thị; phần phân quyền tạo vẫn hở)*
- **Postgres không bật SSL** — `src/db/index.ts` thiếu tuỳ chọn `ssl`
- **Không validate input** — `/api/user/profile` ghi thẳng `req.body`, không giới hạn độ dài, không kiểm định dạng
- **`zaloLink` render thẳng vào `href`** (`ActivitiesPage.tsx:330`) không kiểm tra scheme — cần allowlist `https://`
- **Không có security headers** — thiếu `helmet`, CSP, HSTS
- **`users.cccd` lưu thô** cùng `dob`, `phone`, `address` — cần rà theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân
- **`.env.example` thiếu** `SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, `SQL_DB_NAME`

---

## 2. Quyết định đã chốt

| # | Vấn đề | Quyết định |
|---|--------|-----------|
| 1 | Địa giới Hải Phòng | **Địa giới MỚI** sau sáp nhập 01/7/2025 (gồm Hải Dương cũ) |
| 2 | Cách giới hạn bản đồ | `maxBounds` khóa khung **+ đường viền GeoJSON** ranh giới |
| 3 | Bộ lọc trang Bản đồ | Bỏ dropdown quận/huyện → **ô tìm kiếm + lọc theo lĩnh vực** |
| 4 | Dữ liệu đơn vị | **Bảng `units` cố định**, không dùng text tự do |
| 5 | Nguồn danh sách đơn vị | **Admin CRUD trong app + seed sẵn** theo phường/xã |
| 6 | Cấu trúc bảng xếp hạng | **2 tab: Cá nhân \| Đơn vị** |
| 7 | Tiêu chí xếp hạng đơn vị | **Tổng điểm mặc định**, có nút đổi sang Điểm TB/TNV |
| 8 | Phạm vi đổi tên | Tên app (title, manifest, header, trang Bản đồ) — **giữ heading chức năng riêng của từng trang** |
| 9 | Migration `users` | **Thay hẳn** `unionUnit` bằng `unitId` — DB hiện còn trống |
| 10 | Cấu trúc `server.ts` | **Tách route ra file riêng ngay trong Đợt A** |
| 11 | Lỗ hổng bảo mật | **Vá S1, S2, S3 trong Đợt A** (nằm sẵn trong file đang sửa); phần còn lại tách sang **Đợt S** |

---

## 3. Ngoài phạm vi Đợt A

Ghi rõ để không bị hiểu nhầm là bỏ sót:

- Điểm danh QR (Đợt B), giấy chứng nhận PDF (Đợt C)
- Trường `users.unit` (đơn vị học tập/công tác) — giữ nguyên text tự do, không dùng để xếp hạng
- Bảng `activities`, `activityRegistrations` — không thay đổi
- Icon PWA đang trỏ tới `img.icons8.com` (icon la bàn của bên thứ ba) — ghi nhận là điểm yếu, không sửa trong đợt này
- `package.json` vẫn mang tên `react-example` — không đổi, không ảnh hưởng người dùng
- Dựng test framework — hoãn sang Đợt B, nơi logic chống gian lận thực sự cần test tự động
- Toàn bộ vấn đề bảo mật liệt kê ở mục 1.2 — chuyển sang Đợt S. Đợt A **chỉ** vá S1, S2, S3

---

## 4. Thiết kế dữ liệu

### 4.1 Bảng mới `units`

```ts
export const units = pgTable('units', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  type: text('type').notNull().default('dia_ban'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});
```

**`type`** nhận 4 giá trị: `'dia_ban'`, `'truong_hoc'`, `'doanh_nghiep'`, `'luc_luong_vu_trang'`.
Lý do: đơn vị Đoàn không chỉ là phường/xã. Không có trường này thì sau khi seed theo phường/xã sẽ không phân loại được Đoàn trường, Đoàn doanh nghiệp.

**`isActive`** thay cho việc xóa. Đơn vị giải thể vẫn phải giữ bản ghi để `users.unitId` của TNV cũ không trỏ vào khoảng không.

### 4.2 Sửa bảng `users`

```ts
// BỎ:
unionUnit: text('union_unit'),

// THÊM:
unitId: integer('unit_id').references(() => units.id),
```

`unitId` cho phép NULL: TNV mới đăng ký chưa kịp chọn đơn vị. TNV có `unitId = NULL` vẫn xuất hiện ở BXH cá nhân nhưng **không được tính vào BXH đơn vị**.

### 4.3 Quan hệ Drizzle

```ts
export const unitsRelations = relations(units, ({ many }) => ({
  members: many(users),
}));
// usersRelations thêm:
unit: one(units, { fields: [users.unitId], references: [units.id] }),
```

### 4.4 Migration

DB hiện chưa có dữ liệu thật (đã xác nhận với người dùng). Do đó:

1. Sinh migration bằng `drizzle-kit` — tạo `units`, drop `users.union_unit`, thêm `users.unit_id`.
2. Chạy script seed đơn vị theo danh sách phường/xã Hải Phòng sau sáp nhập, `type = 'dia_ban'`.
3. Không cần backfill.

**Nếu khi chạy migration phát hiện `users` có dữ liệu thật:** dừng lại, báo người dùng, không drop cột. Migration phải kiểm tra `SELECT count(*) FROM users` trước.

---

## 5. Thiết kế API

### 5.1 Endpoint mới và thay đổi

| Endpoint | Quyền | Mô tả |
|---|---|---|
| `GET /api/units` | Công khai | Danh sách đơn vị `isActive = true`, sắp theo tên. Dùng cho dropdown. |
| `GET /api/units?includeInactive=true` | `thanh_doan` | Toàn bộ đơn vị kể cả đã ẩn, kèm `memberCount`. Dùng cho màn hình quản trị. Tài khoản không đủ quyền truyền tham số này → bỏ qua tham số, trả như bản công khai (không báo lỗi). |
| `POST /api/units` | `thanh_doan` | Tạo đơn vị. Body: `{ name, type }`. Trùng `name` → 409. |
| `PATCH /api/units/:id` | `thanh_doan` | Sửa `name`, `type`, `isActive`. |
| `GET /api/leaderboard?unitId=` | Công khai | BXH cá nhân. `unitId` tùy chọn để lọc. |
| `GET /api/leaderboard/units?sort=total\|avg` | Công khai | BXH đơn vị. |

**Vì sao 2 endpoint riêng cho leaderboard thay vì 1 endpoint có query param:** hai bảng trả về shape hoàn toàn khác nhau (một bên là user, một bên là đơn vị đã tổng hợp). Gộp lại buộc client phải xử lý union type — khó dùng và dễ sai.

### 5.2 Shape phản hồi

`GET /api/leaderboard?unitId=`
```jsonc
{
  "topVolunteers": [
    {
      "id": 1,
      "fullName": "Nguyễn Văn An",
      "unitId": 3,
      "unitName": "Đoàn phường Lê Chân",   // NULL nếu chưa chọn đơn vị
      "reputationPoints": 520,
      "volunteerHours": 84,
      "activitiesCount": 12,
      "isVerified": true
    }
  ]
}
```

Giữ nguyên khóa `topVolunteers` để [LeaderboardPage.tsx:15](../../../src/pages/LeaderboardPage.tsx#L15) không vỡ. Thay `unionUnit` bằng `unitName`.

**Vá S1 — bỏ hẳn `email` khỏi phản hồi.** Endpoint này công khai, không cần đăng nhập; trả email là rò rỉ dữ liệu cá nhân của toàn bộ đoàn viên cho bất kỳ ai gọi API.

Kéo theo: [LeaderboardPage.tsx:124](../../../src/pages/LeaderboardPage.tsx#L124) đang dùng `vol.fullName || vol.email` làm nhãn dự phòng. Đổi thành `vol.fullName || 'Đoàn viên chưa cập nhật tên'`.

`GET /api/leaderboard/units?sort=total`
```jsonc
{
  "topUnits": [
    {
      "id": 3,
      "name": "Đoàn phường Lê Chân",
      "type": "dia_ban",
      "totalPoints": 2450,
      "memberCount": 42,
      "avgPoints": 58.3,
      "totalHours": 620
    }
  ]
}
```

**Giới hạn số dòng trả về:**
- `GET /api/leaderboard` không lọc: **top 10 toàn thành phố** (giữ nguyên hành vi hiện tại).
- `GET /api/leaderboard?unitId=3`: **top 10 trong nội bộ đơn vị đó** — lọc trước rồi mới cắt 10, không phải cắt top 10 toàn thành rồi lọc. Nếu làm ngược lại, đơn vị nhỏ sẽ ra bảng trống.
- `GET /api/leaderboard/units`: **top 20 đơn vị**.

**Quy tắc tổng hợp:**
- Chỉ tính user có `unitId IS NOT NULL`.
- `memberCount` đếm mọi user thuộc đơn vị, kể cả người 0 điểm — nếu chỉ đếm người có điểm thì `avgPoints` sẽ bị thổi phồng.
- Đơn vị có `memberCount = 0` **không xuất hiện** trong bảng.
- `sort=avg` yêu cầu `memberCount >= 3`; đơn vị dưới ngưỡng bị loại khỏi bảng khi sắp theo trung bình. Lý do: một đơn vị 1 người 500 điểm sẽ đứng trên đơn vị 200 người, làm bảng vô nghĩa.
- Giá trị `sort` không hợp lệ → mặc định `total`, không trả lỗi.

### 5.3 Bảo mật

`POST` và `PATCH /api/units` dùng `requireAuth` + kiểm tra `user.role === 'thanh_doan'`, theo đúng mẫu đã có ở [server.ts:149-152](../../../server.ts#L149-L152). Trả 403 với thông điệp tiếng Việt nếu không đủ quyền.

### 5.4 Vá S2 — chỉ hiển thị hoạt động đã duyệt

`GET /api/activities` hiện trả toàn bộ bảng, gồm cả `status = 'pending'` và `'rejected'`. Hậu quả: hoạt động chưa ai duyệt vẫn hiện trên bản đồ và trang Hoạt động — cơ chế duyệt của Thành Đoàn không có tác dụng.

**Sửa:** thêm `WHERE status = 'approved'` cho người dùng thường.

Ngoại lệ cho quản trị: cán bộ cần xem hoạt động chờ duyệt để mà duyệt. Thêm `GET /api/activities?status=pending|rejected|all`, chỉ chấp nhận với `role` là `thanh_doan` hoặc `doan_co_so`; người khác truyền tham số này thì bỏ qua, luôn nhận về danh sách đã duyệt.

Kiểm tra khi implement: [DashboardPage.tsx](../../../src/pages/DashboardPage.tsx) đang gọi `/api/activities` để hiện danh sách chờ duyệt — sau khi thêm bộ lọc phải chuyển sang gọi `?status=pending`, nếu không màn hình duyệt sẽ trống.

### 5.5 Vá S3 — không trả chi tiết lỗi cho client

Hiện 8 endpoint dùng `res.status(500).json({ error: err.message })`, riêng `GET /api/activities` còn thêm `details: err.message`. Cách này trả nguyên thông điệp lỗi Postgres (tên bảng, tên cột, tên ràng buộc) cho bất kỳ ai gọi API.

**Sửa:** thêm error handler tập trung ở cuối `server.ts`, đặt sau khi gắn hết router:

```ts
app.use((err, req, res, _next) => {
  console.error(err);                    // log đầy đủ về phía server
  res.status(err.status || 500).json({
    error: 'Đã có lỗi xảy ra, vui lòng thử lại sau.'   // client chỉ thấy câu này
  });
});
```

Các route chuyển sang `next(err)` thay vì tự trả lỗi. Thông điệp lỗi **có chủ đích** dành cho người dùng (ví dụ "Bạn đã đăng ký hoạt động này trước đó", "Chỉ cán bộ Thành Đoàn có quyền phê duyệt") giữ nguyên — chúng không rò rỉ gì và người dùng cần đọc được.

Làm bước này ngay sau khi tách `server.ts` ở mục 6, vì lúc đó mới có chỗ đặt handler tập trung.

---

## 6. Tách `server.ts`

Hiện `server.ts` 259 dòng chứa toàn bộ 10 route. Đợt A thêm 5 route; Đợt B và C còn thêm nữa.

**Cấu trúc mới:**

```
server.ts                  → tạo app, middleware, gắn router, Vite, listen
src/routes/activities.ts   → 4 route /api/activities*
src/routes/users.ts        → /api/auth/sync, /api/user/*
src/routes/leaderboard.ts  → /api/leaderboard, /api/leaderboard/units
src/routes/units.ts        → /api/units (GET/POST/PATCH)
src/routes/stats.ts        → /api/stats, /api/health
```

Mỗi file export một `express.Router()`. Hàm dùng chung `getOrCreateUser` chuyển sang `src/db/users.ts` (file đã tồn tại).

**Ràng buộc:** việc tách **không được đổi đường dẫn, method, hay shape phản hồi của bất kỳ route nào đang có**. Đây là thao tác di chuyển thuần túy. Xác minh bằng cách gọi thử từng route trước và sau khi tách.

---

## 7. Thiết kế UI

### 7.1 Đổi tên (#3)

Tên chính thức: **Bản đồ số Thanh niên tình nguyện Hải Phòng**

| File | Dòng | Hiện tại | Đổi thành |
|---|---|---|---|
| `index.html` | 6 | `Bản đồ số TNV Hải Phòng` | tên chính thức |
| `public/manifest.json` | 2 | `Bản đồ số TNV Hải Phòng` | tên chính thức |
| `public/manifest.json` | 3 | `TNV Hải Phòng` (short_name) | **giữ nguyên** |
| `src/components/Layout.tsx` | 84 | `Bản đồ số & Điều phối tình nguyện` | tên chính thức |
| `src/components/Layout.tsx` | 81 | `TNV HẢI PHÒNG` | **giữ nguyên** |
| `src/components/Layout.tsx` | 70 | `Trang chủ TNV Hải Phòng` (aria-label) | `Trang chủ — Bản đồ số Thanh niên tình nguyện Hải Phòng` |
| `src/pages/MapPage.tsx` | 79 | `Bản Đồ Số Tình Nguyện Hải Phòng` | tên chính thức |

**Vì sao giữ `Layout.tsx:81` và `manifest short_name`:** dòng logo lớn và nhãn icon điện thoại có giới hạn chiều ngang chặt. Tên đầy đủ 44 ký tự sẽ tràn hoặc bị cắt. Mô hình 2 dòng (viết tắt lớn + tên đầy đủ nhỏ) giữ nguyên.

**Không đổi:** các heading mô tả chức năng như "Bảng Xếp Hạng Tình Nguyện Viên Nòng Cốt", "Thẻ Điện Tử & Điểm Danh Hoạt Động", nhãn menu "Bản đồ GIS", nội dung footer.

### 7.2 Trang Bản đồ (#1)

**Khóa khung:**
```tsx
const HAI_PHONG_BOUNDS: L.LatLngBoundsExpression = [
  [20.55, 105.95],  // Tây Nam
  [21.30, 107.15],  // Đông Bắc
];

<MapContainer
  center={DEFAULT_CENTER}
  zoom={10}
  maxBounds={HAI_PHONG_BOUNDS}
  maxBoundsViscosity={1.0}
  minZoom={9}
/>
```

`maxBoundsViscosity={1.0}` chặn cứng — không cho kéo lố rồi bật lại.

Toạ độ trên là **giá trị khởi điểm cần xác minh** khi implement: đo lại từ file ranh giới GeoJSON thực tế và điều chỉnh cho khít. Không được giữ nguyên nếu đo ra khác.

**Huyện đảo Bạch Long Vĩ** nằm rất xa ngoài vịnh Bắc Bộ. Bao nó vào `maxBounds` sẽ kéo khung rộng ra biển và làm phần đất liền co nhỏ. Quyết định: khung mặc định **chỉ bao đất liền + Cát Bà/Cát Hải**. Nếu có hoạt động tại Bạch Long Vĩ, thêm nút "Xem Bạch Long Vĩ" để nhảy tới — chỉ làm khi thực sự có dữ liệu, không làm trước.

**Viền ranh giới:** `<GeoJSON>` đọc file tĩnh `public/haiphong-boundary.geojson`, style viền xanh 2px, không tô nền.

**Bộ lọc mới** — xóa `DISTRICT_COORDS`, `MapRecenter`, `handleDistrictChange`, state `selectedDistrict` và `center`:

- Ô tìm kiếm: lọc theo `title` và `location`, không phân biệt hoa thường và dấu.
- `<Select>` lĩnh vực: lấy giá trị `category` duy nhất từ chính mảng activities đã fetch. Không thêm API.
- Hai bộ lọc kết hợp bằng AND.
- Khi không có kết quả: hiện thông báo "Không có hoạt động nào khớp bộ lọc" chồng lên bản đồ.

### 7.3 Trang Bảng xếp hạng (#2)

Dùng `Tabs` và `Select` đã có trong `src/components/ui/`. Không thêm thư viện.

**Tab "Cá nhân"** — giữ nguyên bố cục hiện tại (huy hiệu hạng, tick xanh, điểm, giờ). Thêm:
- `<Select>` lọc đơn vị phía trên danh sách, mặc định "Tất cả đơn vị".
- Tên đơn vị lấy từ `unitName`; nếu NULL hiện "Chưa chọn đơn vị" màu xám.

**Tab "Đơn vị"** — bảng mới. Mỗi dòng: hạng · tên đơn vị · tổng điểm · số TNV · điểm TB.
- Nút chuyển sắp xếp: "Tổng điểm" ⇄ "Điểm TB/người".
- Khi đang sắp theo Điểm TB, hiện chú thích: "Chỉ tính đơn vị có từ 3 TNV trở lên".
- Ba hạng đầu dùng lại huy hiệu 🏆🥈🥉 như tab Cá nhân để hai tab nhất quán.

Cột phụ bên phải (Danh hiệu Đoàn viên, Xác minh Đoàn viên) giữ nguyên, hiển thị ở cả hai tab.

### 7.4 Trang Hồ sơ

Ô "Đơn vị Đoàn" đổi từ `<input>` gõ tự do thành `<Select>` nạp từ `GET /api/units`.

Nếu `unitId` đang NULL, hiện dòng nhắc dưới ô: *"Chọn đơn vị Đoàn để được tính vào bảng xếp hạng đơn vị."*

### 7.5 Quản trị đơn vị

Thêm tab "Quản lý đơn vị" vào `DashboardPage.tsx` — **không tạo trang mới**, vì đây đã là trang quản trị Thành Đoàn.

Chức năng: danh sách đơn vị (tên, loại, số TNV, trạng thái) · nút Thêm · sửa tên/loại · bật/tắt `isActive`.

Chỉ hiện với `role === 'thanh_doan'`. Vai trò `doan_co_so` không thấy tab này.

---

## 8. Rủi ro và giả định

| # | Rủi ro / Giả định | Ảnh hưởng | Xử lý |
|---|---|---|---|
| R1 | **Chưa xác minh có file GeoJSON ranh giới Hải Phòng sau sáp nhập** | Không vẽ được viền đúng | Khi implement: tra nguồn (OpenStreetMap relation, dữ liệu hành chính công khai). Dự phòng 1: ghép 2 polygon ranh giới cũ (Hải Phòng cũ + Hải Dương cũ). Dự phòng 2: bỏ viền, chỉ khóa khung — báo người dùng trước khi chọn |
| R2 | **Chưa xác minh danh sách phường/xã Hải Phòng sau sáp nhập** | Seed đơn vị sai tên | Tra danh sách chính thức khi viết script seed. Admin CRUD cho phép sửa sau nên không chặn |
| R3 | Toạ độ `HAI_PHONG_BOUNDS` là ước lượng | Khung lệch, cắt mất vùng có hoạt động | Đo lại từ GeoJSON thực tế khi implement (mục 7.2) |
| R4 | Tên đơn vị Đoàn thực tế có thể không trùng đơn vị hành chính | Seed không dùng được ngay | `type` phân loại sẵn 4 nhóm + admin CRUD để bổ sung |
| R5 | Giả định DB chưa có dữ liệu thật | Migration drop cột làm mất dữ liệu | Migration kiểm tra `count(*) FROM users` trước khi drop; có dữ liệu thì dừng và báo |
| R6 | Tách `server.ts` chạm vào code đang chạy | Vỡ route đang hoạt động | Thao tác di chuyển thuần túy, không đổi hành vi. Gọi thử từng route trước/sau khi tách |
| R7 | Không có test tự động | Lỗi hồi quy không được phát hiện | Kiểm thử thủ công theo mục 9. Dựng vitest ở Đợt B |
| R8 | Vá S2 làm vỡ màn hình duyệt hoạt động | Cán bộ không thấy hoạt động chờ duyệt nữa | Kiểm tra `DashboardPage.tsx` và chuyển sang gọi `?status=pending` cùng lúc với việc thêm bộ lọc (mục 5.4) |
| R9 | Đợt A vá S1–S3 nhưng chuỗi spam vẫn hở | `POST /api/activities` chưa phân quyền, chưa rate limit — bot vẫn tạo được hoạt động rác, chỉ là không hiện công khai | Chấp nhận có ý thức. Đợt S phải làm trước khi mở cho người dùng thật |
| R10 | Chưa kiểm tra được lịch sử git | Không rõ đã từng commit secret nào chưa | Git báo "dubious ownership". Chạy `git config --global --add safe.directory` rồi rà lại lịch sử ở Đợt S |

---

## 9. Tiêu chí hoàn thành

Đợt A xong khi tất cả các mục sau đúng:

**Đổi tên**
- [ ] Tab trình duyệt hiện "Bản đồ số Thanh niên tình nguyện Hải Phòng"
- [ ] Dòng phụ dưới logo hiện tên chính thức, header không vỡ ở màn hình 360px
- [ ] Heading trang Bản đồ hiện tên chính thức
- [ ] Các heading chức năng khác không đổi

**Bản đồ**
- [ ] Không kéo được bản đồ ra ngoài Hải Phòng theo cả 4 hướng
- [ ] Không zoom out được xa hơn `minZoom`
- [ ] Viền ranh giới hiển thị đúng (hoặc đã ghi nhận lý do bỏ theo R1)
- [ ] Gõ vào ô tìm kiếm lọc đúng theo tên hoạt động và địa điểm, không phân biệt dấu
- [ ] Lọc lĩnh vực hoạt động đúng; kết hợp với ô tìm kiếm theo AND
- [ ] Không còn tham chiếu tới `DISTRICT_COORDS` trong codebase

**Bảng xếp hạng**
- [ ] Tab Cá nhân hiện tên + đơn vị của từng TNV
- [ ] Lọc theo đơn vị ở tab Cá nhân trả đúng danh sách
- [ ] Tab Đơn vị xếp hạng đúng theo tổng điểm
- [ ] Chuyển sang Điểm TB xếp lại đúng và loại đơn vị dưới 3 TNV
- [ ] TNV chưa chọn đơn vị hiện "Chưa chọn đơn vị", không lọt vào BXH đơn vị

**Đơn vị**
- [ ] `GET /api/units` trả danh sách đã seed
- [ ] Tài khoản `thanh_doan` thêm/sửa/ẩn được đơn vị
- [ ] Tài khoản `tnv` gọi `POST /api/units` nhận 403
- [ ] Ô đơn vị ở trang Hồ sơ là dropdown, lưu đúng `unitId`

**Bảo mật (S1, S2, S3)**
- [ ] `GET /api/leaderboard` không còn trả trường `email` trong bất kỳ trường hợp nào
- [ ] Bảng xếp hạng vẫn hiện đúng khi TNV chưa cập nhật `fullName` (hiện "Đoàn viên chưa cập nhật tên", không hiện email)
- [ ] `GET /api/activities` khi chưa đăng nhập chỉ trả hoạt động `status = 'approved'`
- [ ] Tài khoản `tnv` truyền `?status=pending` vẫn chỉ nhận về hoạt động đã duyệt
- [ ] Tài khoản `thanh_doan` gọi `?status=pending` nhận đúng danh sách chờ duyệt
- [ ] Màn hình duyệt hoạt động ở `DashboardPage` vẫn hoạt động (kiểm tra R8)
- [ ] Gây lỗi cố ý ở một endpoint: client chỉ nhận câu thông báo chung, server log đầy đủ chi tiết
- [ ] Thông báo lỗi có chủ đích ("Bạn đã đăng ký hoạt động này trước đó", "Chỉ cán bộ Thành Đoàn có quyền phê duyệt") vẫn hiển thị nguyên văn cho người dùng

**Không hồi quy**
- [ ] 10 route cũ hoạt động y như trước khi tách `server.ts`
- [ ] `npm run lint` (tsc --noEmit) không lỗi
- [ ] `npm run build` thành công

---

## 10. Bước tiếp theo

Sau khi spec này được duyệt: dùng skill `writing-plans` để viết kế hoạch triển khai chi tiết cho Đợt A.

Đợt B, C và S sẽ có brainstorm và spec riêng.

**Đợt S nên làm trước khi mở app cho người dùng thật** — R9 nêu rõ Đợt A mới chặn phần hiển thị của chuỗi spam, chưa chặn phần tạo.
