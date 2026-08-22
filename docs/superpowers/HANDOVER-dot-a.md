# Bàn giao Đợt A — Bản đồ số Thanh niên tình nguyện Hải Phòng

**Nhánh:** `feat/dot-a` · **Ngày:** 2026-08-11

---

## 1. Đợt A đã làm gì

| # | Nội dung | Trạng thái |
|---|---|---|
| 1 | Đổi tên app thành *Bản đồ số Thanh niên tình nguyện Hải Phòng* | Xong |
| 2 | Khóa bản đồ trong địa giới Hải Phòng + vẽ viền ranh giới | Xong |
| 3 | Thay bộ lọc quận/huyện cũ bằng tìm kiếm + lọc lĩnh vực | Xong |
| 4 | Bảng xếp hạng 2 tab: Cá nhân / Đơn vị | Xong |
| 5 | Bảng `units` chuẩn hóa + seed 114 đơn vị + màn quản trị | Xong |
| 6 | Tách `server.ts` thành `src/routes/*` | Xong |
| 7 | Vá 3 lỗ hổng bảo mật S1, S2, S3 | Xong |

**Chưa kiểm thử với dữ liệu thật.** Toàn bộ xác minh đến nay là tĩnh: đọc code, `tsc`, `npm run build`, chụp màn hình trạng thái rỗng. Chưa có Postgres nào được kết nối.

---

## 2. Ba lỗ hổng bảo mật đã vá

| Mã | Lỗ hổng | Cách vá |
|---|---|---|
| **S1** | `/api/leaderboard` công khai trả `email` của mọi tình nguyện viên | Bỏ hẳn trường `email` khỏi truy vấn |
| **S2** | `GET /api/activities` trả cả hoạt động `pending`/`rejected` ra công khai, vô hiệu hóa cơ chế phê duyệt | Ép cứng `status = 'approved'` cho người không phải cán bộ |
| **S3** | 9 endpoint trả nguyên `err.message` của Postgres, làm lộ cấu trúc CSDL | Error handler tập trung, client chỉ nhận thông báo chung |

---

## 3. Kết nối Supabase — làm theo đúng thứ tự này

### Bước 1: Tạo file `.env`

Tự tạo ở thư mục gốc, **không đưa mật khẩu vào chat hay commit**:

```bash
SQL_HOST=db.<project-ref>.supabase.co
SQL_USER=postgres
SQL_PASSWORD=<mật khẩu database>
SQL_DB_NAME=postgres

SQL_ADMIN_USER=postgres
SQL_ADMIN_PASSWORD=<cùng mật khẩu trên>

SQL_SSL=true
```

Lấy mật khẩu: **Supabase Dashboard → Project Settings → Database**. Quên thì bấm *Reset database password*.

`.env` đã nằm trong `.gitignore`, không lo commit nhầm.

### Bước 2: Kiểm tra CSDL có trống không — BẮT BUỘC

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

- **Trống** → sang bước 3.
- **Đã có bảng `users`/`activities`/`activity_registrations`** → **DỪNG.** File `drizzle/0000_modern_falcon.sql` là migration nền dùng `CREATE TABLE` trần, không có `IF NOT EXISTS`. Chạy trên CSDL đã có bảng sẽ gãy giữa chừng và rollback toàn bộ — không mất dữ liệu nhưng không áp dụng được gì. Lúc đó phải viết tay `CREATE TABLE units` + `ALTER TABLE users ADD COLUMN unit_id`.

### Bước 3: Chạy migration và seed

```bash
npx drizzle-kit migrate --config=src/db/drizzle.config.ts
npx tsx scripts/seed-units.ts
```

Seed lần đầu phải in `Đã thêm mới 114 đơn vị`. **Chạy lại lần hai** phải in `Đã thêm mới 0 đơn vị (bỏ qua 114)` — đó là bằng chứng script an toàn khi chạy lặp.

### Bước 4: Nâng quyền một tài khoản

App **không có** đường nào tự nâng quyền. Sau khi đăng nhập Google lần đầu:

```sql
UPDATE users SET role = 'thanh_doan' WHERE email = '<email của bạn>';
```

Không có bước này thì không kiểm thử được phân quyền và không dùng được màn quản trị đơn vị.

---

## 4. Thứ tự kiểm thử — phát hiện lỗi sớm nhất

Mỗi bước gãy to và rẻ hơn bước sau. Đừng đảo thứ tự.

| # | Kiểm | Kỳ vọng |
|---|---|---|
| 1 | `GET /api/health` | `{"status":"ok"}` — server chạy, chưa chạm CSDL |
| 2 | `GET /api/stats` | Truy vấn đơn giản nhất. Treo 15 giây ở đây = lỗi kết nối (SSL, cổng, host), **không phải lỗi code** |
| 3 | Sau migration: `SELECT` 4 bảng, xác nhận `users.unit_id` tồn tại | Đủ 4 bảng |
| 4 | Chạy seed hai lần | `114` rồi `0` |
| 5 | `GET /api/units` ẩn danh | 114 dòng. **Soi mắt tìm `email`/`cccd`/`phone`** — phải không có |
| 6 | `GET /api/leaderboard` ẩn danh | `unitName` có giá trị, **không có trường `email`** ← kiểm S1 trên dữ liệu thật |
| 7 | `GET /api/leaderboard/units?sort=total` rồi `?sort=avg` | Hai truy vấn tổng hợp, chế độ `avg` loại đơn vị dưới 3 TNV |
| 8 | Đăng nhập → `/profile` → chọn đơn vị → lưu → mở lại | Đơn vị còn, và hiện trên dòng bảng xếp hạng ← toàn bộ đường đi dữ liệu |
| 9 | Tạo hoạt động bằng tài khoản `tnv`, rồi `GET /api/activities` ẩn danh | Hoạt động đó **vắng mặt**. Với token `thanh_doan` + `?status=all` → **có mặt** ← kiểm S2 |
| 10 | Tạo đơn vị trùng tên | Thông báo tiếng Việt `Đơn vị này đã tồn tại`, **không lộ chi tiết Postgres** ← kiểm S3 |

**Lưu ý quan trọng:** error handler tập trung (S3) **giấu nguyên nhân lỗi khỏi trình duyệt**. Khi gỡ lỗi kết nối, phải đọc log phía server, không đoán từ giao diện.

---

## 5. Cần quyết định trước khi trình lãnh đạo

Những mục dưới đây **có sẵn từ trước Đợt A**, không do đợt này tạo ra, nhưng sẽ hiện ra trong buổi trình bày.

### 5.1 Số liệu minh họa đang hiển thị như thống kê thật

| Vị trí | Nội dung |
|---|---|
| `src/routes/stats.ts` | Cộng thêm `+1250` TNV và `+4820` giờ vào số đếm thật; `verifiedCount: 1040` cứng |
| `src/pages/DashboardPage.tsx` | Cứng `12,345` TNV · `89%` tỉ lệ tham gia · `45,670h`; biểu đồ tăng trưởng 7 tháng là số bịa |

Lãnh đạo xem sẽ mặc định đây là số liệu có thật trong CSDL. **Cần chọn một:** đổi sang số thật (hoặc 0), hoặc gắn nhãn *"Dữ liệu minh họa"* rõ ràng trên giao diện.

### 5.2 Trang Phản ứng nhanh chưa lưu gì

`src/pages/RapidResponsePage.tsx` — nút đăng ký **không gọi API nào**, chỉ hiện thông báo thành công. Người đăng ký không được lưu ở đâu cả.

### 5.3 Giấy chứng nhận cấp cho mọi người

`src/pages/ProfilePage.tsx` in giấy chứng nhận có dòng *"ĐÃ XÁC THỰC"* và *"TM. BAN THƯỜNG VỤ THÀNH ĐOÀN"* cho **bất kỳ ai đăng nhập**, không kiểm tra `isVerified`. Với văn bản mang danh nghĩa Thành Đoàn, đây là việc cần xử lý trước khi mở cho người dùng thật.

### 5.4 Bảng xếp hạng công khai có thể quét thành danh bạ

Đợt A thêm tham số `?unitId=` vào `/api/leaderboard`. Endpoint này công khai, không giới hạn tần suất. Quét 114 đơn vị × top 10 cho ra khoảng **1.140 họ tên thật**, mỗi tên gắn với đơn vị Đoàn (tương đương phường/xã) và trạng thái xác minh.

Từng trường riêng lẻ là dữ liệu bảng vinh danh bình thường. Gộp theo lô thì thành danh sách công dân do cơ quan nhà nước công bố. **Đây là quyết định của Thành Đoàn, không phải lỗi kỹ thuật.** Cách giảm nhẹ rẻ nhất: bắt buộc đăng nhập khi có tham số `?unitId=`, hoặc bỏ `isVerified` khỏi phản hồi công khai.

---

## 6. Đợt tiếp theo

| Đợt | Nội dung | Ghi chú |
|---|---|---|
| **S** | Bảo mật: rate limit, phân quyền tạo hoạt động, validate đầu vào, security headers, rà `cccd` theo Nghị định 13/2023 | **Nên làm trước khi mở cho người dùng thật** |
| **B** | QR check-in tại điểm bằng camera | Cần dựng test framework |
| **C** | Giấy chứng nhận PDF | Phụ thuộc dữ liệu điểm danh của Đợt B |

**Vì sao Đợt S nên đi trước:** Đợt A mới chặn phần *hiển thị* của chuỗi spam. `POST /api/activities` vẫn chỉ có `requireAuth` — mọi tài khoản Google đăng nhập được đều tạo được hoạt động, không giới hạn tần suất. Rác không hiện ra công khai nữa, nhưng vẫn vào được CSDL.

---

## 7. Nợ kỹ thuật đã ghi nhận

Không mục nào chặn merge.

- `POST /api/units` có khe hở TOCTOU: kiểm trùng tên rồi mới insert. Hai admin gõ trùng tên cùng lúc thì người thua nhận 500 thay vì 409. Ràng buộc `UNIQUE` vẫn bảo vệ toàn vẹn dữ liệu.
- `Number.parseInt("12abc")` cho `12` thay vì báo lỗi 400.
- `orderBy` ở `/api/leaderboard/units` dùng `sum()` thô không `COALESCE`, khác cột `totalPoints` hiển thị. Chỉ lệch ở ca biên NULL tường minh.
- `maxBounds` của Leaflet là hình chữ nhật nên vẫn lộ chút biển và rìa Quảng Ninh ở góc. Giới hạn cố hữu của thư viện.
- `MapPage.tsx` còn vài import thừa có sẵn từ trước.
- `package.json` chưa có script cho `drizzle-kit` và seed — hiện phải gõ lệnh đầy đủ.
- `README.md` vẫn là bản mặc định của AI Studio, không nhắc gì tới Postgres, Firebase hay cách chạy.

---

## 8. Nguồn dữ liệu

- **Ranh giới hành chính:** kho [nguyenduy1133/Free-GIS-Data](https://github.com/nguyenduy1133/Free-GIS-Data), file `Provinces.geojson`. Kho ghi *"miễn phí cho mục đích công cộng, đề nghị ghi nguồn"* — **không có giấy phép mã nguồn mở chính thức**. Đã ghi nguồn trong chú thích bản đồ. Nếu Thành Đoàn có dữ liệu ranh giới chính thức thì nên thay.
- **Danh sách 114 đơn vị:** [Cổng thông tin Chính phủ](https://xaydungchinhsach.chinhphu.vn/sap-xep-dvhc-danh-sach-114-xa-phuong-dac-khu-cua-thanh-pho-hai-phong-119250622201739743.htm) — Nghị quyết 1669/NQ-UBTVQH15, đối chiếu chéo với kho [zuydd/vn-geo](https://github.com/zuydd/vn-geo). Cơ cấu: 67 xã, 45 phường, 2 đặc khu (Cát Hải, Bạch Long Vĩ).

---

## 9. Đợt tối ưu hiệu năng — checklist khi có CSDL

**Nhánh:** `feat/perf`. Toàn bộ 10 task của đợt này (index, cột đếm sẵn `registered_count`, chống đăng ký trùng, cache có TTL, giới hạn `limit`, chống ghi thừa ở `getOrCreateUser`, script đối chiếu số liệu...) đã qua xác minh **tĩnh**: `tsc --noEmit` 0 lỗi, `npm run build` thành công, `npm test` 15/15 đạt, và toàn bộ route sống trả đúng mã trạng thái kỳ vọng khi CSDL chưa kết nối (`health` 200, `my-activities` 401, còn lại 500 vì thiếu Postgres). **Chưa có bước nào trong đợt này chạy được với dữ liệu thật** — dưới đây là checklist thực hiện theo đúng thứ tự khi đã có Postgres, tiếp nối quy trình kết nối Supabase ở mục 3.

1. **Chạy migration (Task 4)** — nhớ kiểm CSDL trống trước (xem mục 3, Bước 2 ở trên; migration này cũng không dùng `IF NOT EXISTS`).
2. **Xác nhận 5 index tồn tại** và cột `registered_count` đã được điền đúng cho các hoạt động có sẵn (migration backfill từ số đăng ký thật).
3. **Chạy `npx tsx scripts/recount-registrations.ts`** (không kèm `--fix`) → phải báo `Không có hoạt động nào lệch số liệu.` Nếu lệch, chạy lại kèm `--fix` rồi kiểm lại lần nữa.
4. **Kiểm cache tắt (giai đoạn demo):** không đặt biến `CACHE_TTL_*` nào → gọi `GET /api/stats` hai lần liên tiếp → log CSDL phải ghi nhận **hai** truy vấn riêng biệt.
5. **Kiểm cache bật (giai đoạn production):** đặt `CACHE_TTL_STATS=600000`, khởi động lại server, gọi `/api/stats` hai lần → log chỉ còn **một** truy vấn.
6. **Kiểm xóa cache theo sự kiện ghi:** bật `CACHE_TTL_UNITS`, thêm một đơn vị mới qua màn quản trị, mở `/profile` → đơn vị mới phải xuất hiện **ngay** trong dropdown, không cần đợi TTL hết hạn.
7. **Kiểm chống đăng ký trùng:** bắn hai request đăng ký cùng một hoạt động **đồng thời** → chỉ tạo đúng **một** bản ghi trong `activity_registrations`, cộng đúng **+5 điểm** (không phải +10).
8. **Kiểm giới hạn `limit`:** gọi endpoint phân trang không truyền `limit` → mặc định 200; truyền `?limit=9999` → bị chặn ở mức trần 500.
9. **Kiểm không ghi thừa ở `getOrCreateUser`:** đăng nhập, tải lại trang `/profile` vài lần liên tiếp → log CSDL không phát sinh câu lệnh `UPDATE users` nào khi dữ liệu người dùng không đổi.
10. **Đo hiệu năng bằng `EXPLAIN (ANALYZE, BUFFERS)`** trên dữ liệu giả ở quy mô gần thực tế (bảng vài chục nghìn dòng trở lên) — so sánh **cùng một truy vấn**, trên **cùng bộ dữ liệu**, **trước và sau** khi thêm mỗi index. Xem mục 9.1 của `docs/superpowers/specs/2026-08-23-toi-uu-hieu-nang-design.md` về cách đọc kết quả.

### Hai điều bắt buộc phải nhớ khi đo hiệu năng

- **Dùng `EXPLAIN (ANALYZE, BUFFERS)`, không dùng `EXPLAIN ANALYZE` trơn.** Và **`Seq Scan` không mặc định là lỗi** — Postgres chọn quét tuần tự khi nó thực sự rẻ hơn: trên bảng nhỏ, hoặc khi truy vấn lấy phần lớn số dòng. Ép dùng index trong tình huống đó làm **chậm đi**, không nhanh lên. Cái cần so sánh là `execution time` và `Buffers` (đặc biệt tỉ lệ `hit=`/`read=`) **trước và sau** khi thêm index, trên **cùng bộ dữ liệu** — không phải kế hoạch truy vấn cụ thể Postgres chọn. Và phải có dữ liệu đủ lớn mới đo được gì có ý nghĩa: trên bảng vài chục hay vài trăm dòng thì mọi kế hoạch đều nhanh như nhau, không phản ánh được gì về sau này khi dữ liệu lớn lên.
- **Toàn bộ số ước tính hiệu năng trong tài liệu thiết kế (`docs/superpowers/specs/2026-08-23-toi-uu-hieu-nang-design.md`) là dự đoán, chưa đo trên dữ liệu thật.** Không trích dẫn các con số đó như kết quả đã kiểm chứng khi trình bày — phải đo lại bằng `EXPLAIN (ANALYZE, BUFFERS)` trên dữ liệu thật (hoặc dữ liệu giả quy mô gần thực tế) rồi mới có số liệu để báo cáo.
