# Tối ưu hiệu năng và khả năng chịu tải — Thiết kế

**Ngày:** 2026-08-23
**Trạng thái:** Chờ duyệt
**Mục tiêu quy mô:** ~300.000 người dùng đăng ký, tải giật cục theo đợt chiến dịch

---

## 1. Bối cảnh

Đợt A đã hoàn thành và đẩy lên nhánh `feat/dot-a`. Trước khi kết nối cơ sở dữ liệu thật và mở cho người dùng, cần tối ưu tầng truy vấn — vì ở quy mô 300.000 người dùng, code hiện tại sẽ chậm bất kể mua gói hạ tầng nào.

### 1.1 Hạ tầng đã chốt

**Hostinger VPS gói KVM2** (2 vCPU · 8GB RAM · 100GB NVMe · 8TB băng thông), triển khai qua **Coolify**.

Đây là **một máy chủ cố định, một tiến trình Node duy nhất**. Điều này quyết định toàn bộ thiết kế bên dưới:

- Cache trong bộ nhớ tiến trình hoạt động đúng — không cần Redis, không cần thư viện mới
- Không có vấn đề cạn kết nối do tự động co giãn
- Không cần materialized view (đó là giải pháp cho môi trường nhiều bản sao)

Nơi đặt Postgres (Supabase hay tự cài trên cùng VPS qua Coolify) **chưa chốt**, nhưng không ảnh hưởng thiết kế này — chỉ khác chuỗi kết nối.

### 1.2 Bốn nút thắt đã đo được

| # | Nút thắt | Vị trí |
|---|---|---|
| 1 | Trang chủ gọi 2 API, cộng lại là **5 phép quét toàn bảng cho mỗi khách** | `HomePage.tsx:14-20` |
| 2 | `/api/activities` `GROUP BY` toàn bộ bảng đăng ký (~1,5 triệu dòng ở quy mô mục tiêu), bị gọi từ **4 màn hình** | `routes/activities.ts` |
| 3 | **Một lệnh ghi CSDL mỗi lần người đăng nhập mở app**, chỉ để ghi lại email vốn không đổi | `db/users.ts` |
| 4 | **Không index nào** ngoài khóa chính và 2 ràng buộc `unique` | `db/schema.ts` |

---

## 2. Quyết định đã chốt

| # | Vấn đề | Quyết định |
|---|---|---|
| 1 | Hạ tầng chạy | Một VPS cố định (Hostinger KVM2 + Coolify) |
| 2 | Phương án tổng thể | **A** — Index + cache theo tầng + cột đếm sẵn |
| 3 | Độ tươi dữ liệu | **Khác nhau theo từng endpoint** (bảng ở mục 4.2) |
| 4 | Cache dùng gì | Module tự viết trong bộ nhớ tiến trình, **không thêm dependency** |
| 5 | Materialized view | **Không dùng** — giải pháp cho vấn đề không tồn tại ở mô hình một máy chủ |
| 6 | Test framework | **Dựng Vitest**, chỉ cho logic cache (hàm thuần túy, không cần CSDL) |
| 7 | Giới hạn `/api/activities` | Mặc định 200, tối đa 500 |

---

## 3. Lớp 1 — Index

### 3.1 Danh sách index

Chọn theo đúng các truy vấn có thật trong code, không thêm index suy đoán.

| Index | Bảng | Phục vụ |
|---|---|---|
| `idx_users_reputation` trên `(reputation_points DESC)` | `users` | `GET /api/leaderboard` không lọc |
| `idx_users_unit_reputation` trên `(unit_id, reputation_points DESC)` | `users` | `GET /api/leaderboard?unitId=`, và `GROUP BY` ở `/api/leaderboard/units` |
| `idx_activities_status_created` trên `(status, created_at DESC)` | `activities` | `GET /api/activities` lọc theo `status` |
| `idx_registrations_user_created` trên `(user_id, created_at DESC)` | `activity_registrations` | `GET /api/user/my-activities` |
| `uniq_registrations_activity_user` trên `(activity_id, user_id)` **UNIQUE** | `activity_registrations` | Chặn đăng ký trùng |

**Không thêm** index riêng cho `users(unit_id)` — cột này đã là cột dẫn đầu của `idx_users_unit_reputation`, Postgres dùng được index đó.

`users.uid` và `units.name` đã có ràng buộc `unique` nên đã có index sẵn.

### 3.2 Index UNIQUE sửa một lỗi thật, không chỉ tối ưu

`POST /api/activities/:id/register` hiện kiểm tra đăng ký trùng bằng `SELECT` rồi mới `INSERT`:

```ts
const existing = await db.select().from(activityRegistrations).where(...);
if (existing.length > 0) throw new HttpError(400, 'Bạn đã đăng ký hoạt động này trước đó');
const reg = await db.insert(activityRegistrations).values({...});
await db.update(users).set({ reputationPoints: sql`... + 5`, activitiesCount: sql`... + 1` });
```

Hai request đồng thời — người dùng bấm hai lần, hoặc mạng chậm rồi bấm lại — **cả hai đều qua được bước kiểm tra**. Kết quả: hai bản ghi đăng ký, và **+10 điểm uy tín thay vì +5**.

Trong bảng thi đua của Thành Đoàn, đây là lỗi ảnh hưởng tới kết quả xếp hạng.

Ràng buộc `UNIQUE` khiến Postgres từ chối bản ghi thứ hai ở tầng CSDL — không cách nào lách.

### 3.3 Migration phải xử lý dữ liệu trùng có sẵn

Nếu CSDL đã có bản ghi đăng ký trùng, lệnh tạo index `UNIQUE` sẽ thất bại. Migration phải **dọn trùng trước khi tạo index**: giữ bản ghi cũ nhất theo `id`, xóa các bản ghi trùng còn lại.

Ở thời điểm viết spec, CSDL chưa có dữ liệu nên bước dọn sẽ không xóa gì — nhưng vẫn phải có, vì migration còn chạy trên môi trường khác về sau.

---

## 4. Lớp 2 — Cache trong bộ nhớ

### 4.1 Module `src/lib/cache.ts`

Giao diện:

```ts
export function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T>;
export function invalidate(prefix: string): void;
export function clearAll(): void;   // chỉ dùng trong test
```

**Ba hành vi bắt buộc:**

**a. Hết hạn theo thời gian.** Mỗi mục lưu kèm mốc hết hạn. Đọc sau mốc đó thì coi như không có.

**b. Gộp request trùng (single-flight).** Đây là phần quan trọng nhất, và cũng là phần dễ bỏ sót.

Khi cache hết hạn và 500 người cùng truy cập, nếu không có cơ chế này thì **500 truy vấn giống hệt nhau** cùng lao xuống CSDL. Đúng lúc khai mạc chiến dịch — thời điểm tải cao nhất — cache hết hạn sẽ tạo ra chính cơn bão truy vấn mà ta muốn tránh.

Cách làm: lưu **promise đang chạy** vào cache ngay khi bắt đầu, không đợi nó xong. Request thứ hai trở đi thấy promise đó thì chờ chung kết quả. Chỉ **một** truy vấn chạm CSDL.

Nếu promise thất bại, phải **xóa nó khỏi cache** để lần gọi sau thử lại — không được lưu lỗi.

**c. Giới hạn kích thước.** Tối đa **500 mục**, khi đầy thì loại mục được thêm sớm nhất. Chặn rò rỉ bộ nhớ từ các khóa động như `?unitId=` (114 giá trị khả dĩ) nhân với `?sort=`.

### 4.2 Thời gian cache theo endpoint

| Endpoint | Khóa cache | Thời gian | Lý do |
|---|---|---|---|
| `GET /api/stats` | `stats` | **10 phút** | Số tổng quan trang chủ; lệch vài phút không ai nhận ra |
| `GET /api/leaderboard` | `lb:all` hoặc `lb:unit:<id>` | **60 giây** | Bảng thi đua |
| `GET /api/leaderboard/units` | `lbunits:total` hoặc `lbunits:avg` | **60 giây** | Bảng thi đua |
| `GET /api/units` | `units:public` | **15 phút** | Danh mục ít đổi |
| `GET /api/units?includeInactive=true` | **không cache** | — | Màn quản trị, số ít người dùng, cần chính xác |
| `GET /api/activities` | **không cache** | — | Số đăng ký phải chính xác tức thì |
| `GET /api/user/*`, `POST /api/auth/sync` | **không cache** | — | Dữ liệu riêng từng người |

### 4.3 Xóa cache khi dữ liệu đổi

Cache theo thời gian là chưa đủ ở một chỗ: khi cán bộ Thành Đoàn thêm hoặc sửa đơn vị, họ phải thấy kết quả **ngay**, không đợi 15 phút.

- `POST /api/units` và `PATCH /api/units/:id` → gọi `invalidate('units:')`

Các endpoint khác không cần xóa chủ động: điểm uy tín thay đổi liên tục theo hoạt động của người dùng, chờ tối đa 60 giây là chấp nhận được và đã được người dùng đồng ý.

### 4.4 Cache nằm ở đâu trong luồng xử lý

Bọc **phần truy vấn**, không bọc cả handler. Lý do: phân quyền và kiểm tra tham số phải chạy cho **mọi** request, không được cache.

Ví dụ với `/api/leaderboard`:

```
handler
 ├─ đọc và kiểm tra tham số unitId        ← luôn chạy
 ├─ cached('lb:unit:3', 60_000, () => truy vấn)  ← chỉ phần này được cache
 └─ res.json(...)
```

Sai lầm cần tránh: cache theo toàn bộ URL bao gồm cả header xác thực, hoặc cache kết quả của endpoint có phân quyền. `/api/units` có nhánh công khai và nhánh `thanh_doan` khác nhau — **chỉ nhánh công khai được cache**.

---

## 5. Lớp 3 — Cột đếm sẵn `registered_count`

### 5.1 Thay đổi schema

```ts
// bảng activities, thêm:
registeredCount: integer('registered_count').notNull().default(0),
```

### 5.2 Cập nhật khi có người đăng ký

Trong `POST /api/activities/:id/register`, ba lệnh ghi phải nằm **trong cùng một transaction**:

1. `INSERT` vào `activity_registrations`
2. `UPDATE activities SET registered_count = registered_count + 1`
3. `UPDATE users SET reputation_points = reputation_points + 5, activities_count = activities_count + 1`

Dùng `db.transaction(async (tx) => { ... })` của Drizzle. Nếu bất kỳ lệnh nào thất bại, toàn bộ được hoàn tác — không có chuyện cộng điểm mà không có bản ghi đăng ký, hay ngược lại.

### 5.3 Bỏ bước kiểm tra trùng bằng SELECT

Với ràng buộc `UNIQUE` ở mục 3.2, không cần `SELECT` kiểm tra trước nữa. Thay bằng: cứ `INSERT`, nếu Postgres báo vi phạm ràng buộc duy nhất (**mã lỗi `23505`**) thì chuyển thành `HttpError(400, 'Bạn đã đăng ký hoạt động này trước đó')`.

Thông điệp tiếng Việt giữ **nguyên văn** — người dùng thấy y hệt như trước.

Lợi ích: chặn triệt để cuộc đua đồng thời, và bỏ được một lượt truy vấn (bước `SELECT` kiểm tra trùng).

Đếm chính xác số lệnh chạm CSDL của endpoint này:

| | Trước | Sau |
|---|---|---|
| `getOrCreateUser` | 2 (upsert + tra tên đơn vị) | 1 (một `SELECT` có `leftJoin`, theo mục 6.2) |
| Kiểm tra trùng | 1 `SELECT` | **0** — ràng buộc `UNIQUE` lo |
| Ghi | 2 (`INSERT` + cộng điểm) | 3 (`INSERT` + tăng `registered_count` + cộng điểm), gói trong 1 transaction |
| **Tổng** | **5** | **4** |

Số lệnh giảm không nhiều, nhưng ba lệnh ghi nay là **nguyên tử** và bước kiểm tra trùng nay **không thể lách**.

### 5.4 `/api/activities` chỉ đọc cột

Xóa hẳn khối `GROUP BY` đếm số đăng ký. Trường `registeredCount` trong phản hồi giờ lấy thẳng từ cột CSDL.

**Tên trường trong phản hồi giữ nguyên `registeredCount`** → giao diện không phải sửa gì.

### 5.5 Điền số liệu cho dữ liệu đã có

Migration phải tính lại số đăng ký cho mọi hoạt động đang tồn tại:

```sql
UPDATE activities a
SET registered_count = (
  SELECT count(*) FROM activity_registrations r WHERE r.activity_id = a.id
);
```

### 5.6 Script đối chiếu

Tạo `scripts/recount-registrations.ts` chạy đúng phép tính trên và báo cáo những hoạt động có số lệch. Dùng khi nghi ngờ số liệu sai, hoặc chạy định kỳ.

Dữ liệu phi chuẩn hóa luôn có nguy cơ lệch. Có sẵn công cụ sửa là điều kiện bắt buộc để chấp nhận đánh đổi này.

### 5.7 Chưa cần giảm bộ đếm

Hiện **không có endpoint hủy đăng ký** — người dùng đăng ký rồi thì không rút được. Nên bộ đếm chỉ tăng, không bao giờ giảm.

Ghi lại điều này vì khi nào thêm tính năng hủy đăng ký, **phải nhớ giảm `registered_count` trong cùng transaction**. Quên là bộ đếm lệch vĩnh viễn.

---

## 6. Ba sửa nhỏ đi kèm

### 6.1 Bỏ lệnh ghi mỗi lần tải trang

`getOrCreateUser` hiện luôn chạy `INSERT ... ON CONFLICT DO UPDATE`, kể cả khi người dùng đã tồn tại và email không đổi. Hàm này chạy mỗi lần `AuthProvider` đồng bộ trạng thái đăng nhập — tức **mỗi lần mở app**.

**Đổi thành đọc trước:**
1. `SELECT` theo `uid` (dùng index `unique` đã có — rất nhanh)
2. Không có → `INSERT ... ON CONFLICT (uid) DO NOTHING`, rồi `SELECT` lại
3. Có và `email` khác → `UPDATE`
4. Có và `email` giống → **trả về luôn, không ghi**

Trường hợp 4 là phổ biến nhất trong thực tế.

**Vì sao bước 2 không dùng `INSERT` trần:** hai request của cùng người dùng có thể chạy đồng thời ở lần đăng nhập đầu tiên (ví dụ mở hai tab). Cả hai đều thấy "không có" ở bước 1, cả hai cùng `INSERT`, và một trong hai sẽ vi phạm ràng buộc `unique` trên `uid` rồi ném lỗi 500. `ON CONFLICT DO NOTHING` rồi đọc lại khiến cả hai đều thành công. Đây là rủi ro R7.

### 6.2 Gộp hai truy vấn của `getOrCreateUser` thành một

Hàm hiện chạy **hai** truy vấn: upsert người dùng, rồi tra tên đơn vị riêng. Đường đọc (trường hợp 4 ở trên) gộp được thành một truy vấn duy nhất dùng `leftJoin` sang `units`.

Kết quả trả về giữ nguyên hình dạng `{ ...user, unitName }` — nơi gọi không phải sửa.

### 6.3 `PORT` hardcode

`server.ts` đặt `const PORT = 3000`. Coolify (và mọi nền tảng container) tiêm biến môi trường `PORT` và yêu cầu ứng dụng lắng nghe đúng cổng đó.

```ts
const PORT = Number(process.env.PORT) || 3000;
```

**Không có sửa này thì app không khởi động được trên Coolify.**

### 6.4 Giới hạn số dòng `/api/activities`

Endpoint hiện trả **toàn bộ** hoạt động đã duyệt với đầy đủ mọi cột, gồm cả `description` và `files`. Vài nghìn hoạt động là vài MB JSON gửi tới **mỗi khách vào trang chủ** — nặng với mạng di động.

Thêm tham số `limit`: mặc định **200**, tối đa **500**, giá trị không hợp lệ thì dùng mặc định.

Sắp xếp giữ nguyên `created_at DESC` nên 200 dòng đầu là các hoạt động mới nhất.

---

## 7. Kiểm thử

### 7.1 Dựng Vitest cho logic cache

Đây là lần đầu dự án có lý do chính đáng để dựng test tự động: `src/lib/cache.ts` là **logic thuần túy, không chạm CSDL, không chạm mạng** — kiểm thử được đầy đủ ngay bây giờ, không phải chờ Supabase.

Thêm `vitest` vào `devDependencies` và script `"test": "vitest run"`.

**Các trường hợp phải phủ:**

| # | Trường hợp | Kỳ vọng |
|---|---|---|
| 1 | Gọi lần đầu | Chạy hàm gốc, trả kết quả |
| 2 | Gọi lại trong thời gian sống | **Không** chạy hàm gốc, trả kết quả cũ |
| 3 | Gọi lại sau khi hết hạn | Chạy lại hàm gốc |
| 4 | **10 lời gọi đồng thời khi cache rỗng** | Hàm gốc chỉ chạy **đúng 1 lần**, cả 10 nhận cùng kết quả |
| 5 | Hàm gốc ném lỗi | Lỗi được ném ra ngoài, và **không lưu vào cache** — lần gọi sau thử lại |
| 6 | `invalidate('units:')` | Xóa mọi khóa bắt đầu bằng `units:`, giữ nguyên khóa khác |
| 7 | Vượt 500 mục | Mục thêm sớm nhất bị loại, tổng số không vượt 500 |
| 8 | Khóa khác nhau | Không đè lên nhau |

Trường hợp 4 và 5 là hai chỗ dễ viết sai nhất.

Điều khiển thời gian bằng đồng hồ giả của Vitest (`vi.useFakeTimers`), không dùng `setTimeout` thật.

### 7.2 Phần cần CSDL

Index, transaction, cột đếm sẵn — chỉ xác minh được khi có Postgres. Spec này bổ sung một mục vào checklist bàn giao hiện có, gồm cả cách **đo bằng `EXPLAIN ANALYZE`** để chứng minh index thực sự được dùng chứ không chỉ tồn tại.

---

## 8. Ngoài phạm vi

- **Rate limit, security headers, validate đầu vào** — thuộc Đợt S, không gộp vào đây
- **Cắt bớt cột trong phản hồi `/api/activities`** (bỏ `description` khỏi danh sách, thêm endpoint chi tiết riêng) — cần sửa giao diện, để đợt sau
- **Phân trang thật** cho danh sách hoạt động — `limit` ở mục 6.4 chỉ là chặn trên, chưa phải phân trang
- **Redis hoặc cache dùng chung** — không cần với mô hình một máy chủ
- **Materialized view** — như mục 2, không dùng
- **Ba mục sản phẩm chờ quyết định** (số liệu minh họa, giấy chứng nhận, trang Phản ứng nhanh) — nêu ở tài liệu bàn giao Đợt A, không thuộc phạm vi tối ưu

---

## 9. Rủi ro và giả định

| # | Rủi ro | Xử lý |
|---|---|---|
| R1 | Cột `registered_count` lệch so với số đếm thật | Ba lệnh ghi trong cùng transaction; có `scripts/recount-registrations.ts` để đối chiếu và sửa |
| R2 | Migration tạo index `UNIQUE` thất bại vì có dữ liệu trùng sẵn | Migration dọn trùng trước khi tạo index (mục 3.3) |
| R3 | Cache khiến cán bộ không thấy đơn vị vừa thêm | `invalidate('units:')` khi ghi (mục 4.3) |
| R4 | Bắt nhầm lỗi `23505` của ràng buộc `unique` khác, hiểu sai thành đăng ký trùng | Kiểm tên ràng buộc trong lỗi, không chỉ kiểm mã lỗi |
| R5 | Cache làm lộ dữ liệu giữa người dùng | Chỉ cache endpoint **công khai**. Không cache `/api/user/*`, không cache nhánh `thanh_doan` của `/api/units`. Khóa cache không bao giờ chứa token |
| R6 | Chưa đo được trên dữ liệu thật | Toàn bộ số ước tính trong spec này là dự đoán. Checklist mục 7.2 yêu cầu `EXPLAIN ANALYZE` để xác nhận |
| R7 | `getOrCreateUser` đổi sang đọc-trước tạo cuộc đua khi hai request cùng tạo user mới | Giữ `ON CONFLICT DO NOTHING` ở nhánh `INSERT` rồi đọc lại, thay vì giả định `INSERT` luôn thành công |

---

## 10. Tiêu chí hoàn thành

**Index**
- [ ] 5 index ở mục 3.1 tồn tại trong CSDL
- [ ] `EXPLAIN ANALYZE` cho `/api/leaderboard` cho thấy **Index Scan**, không phải Seq Scan
- [ ] Đăng ký cùng một hoạt động hai lần nhận đúng thông báo `Bạn đã đăng ký hoạt động này trước đó`
- [ ] Hai request đăng ký **đồng thời** chỉ tạo một bản ghi và cộng đúng +5 điểm

**Cache**
- [ ] `npm test` chạy được, 8 trường hợp ở mục 7.1 đều đạt
- [ ] Gọi `/api/stats` hai lần liên tiếp: lần hai không sinh truy vấn nào trong log CSDL
- [ ] Thêm đơn vị mới qua màn quản trị → xuất hiện **ngay** trong dropdown trang Hồ sơ
- [ ] Không endpoint nào thuộc `/api/user/*` được cache

**Cột đếm sẵn**
- [ ] `/api/activities` không còn `GROUP BY` trên `activity_registrations`
- [ ] Đăng ký một hoạt động → `registeredCount` tăng ngay trong phản hồi kế tiếp
- [ ] `scripts/recount-registrations.ts` chạy được và báo 0 hoạt động lệch
- [ ] Giao diện **không phải sửa** — tên trường vẫn là `registeredCount`

**Sửa nhỏ**
- [ ] Mở app khi đã đăng nhập, email không đổi → **không** sinh lệnh ghi nào vào bảng `users`
- [ ] `getOrCreateUser` chạy 1 truy vấn ở đường đọc thay vì 2
- [ ] Đặt biến môi trường `PORT=8080` → server lắng nghe cổng 8080
- [ ] `/api/activities` mặc định trả tối đa 200 dòng; `?limit=9999` bị chặn ở 500

**Không hồi quy**
- [ ] Ba bản vá bảo mật S1, S2, S3 còn nguyên
- [ ] `npx tsc --noEmit` **0 lỗi**
- [ ] `npm run build` thành công

---

## 11. Bước tiếp theo

Sau khi spec được duyệt: dùng skill `writing-plans` để viết kế hoạch triển khai chi tiết.
