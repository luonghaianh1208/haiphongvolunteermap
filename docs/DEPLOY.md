# Triển khai

## Nền tảng nào chạy được

Ứng dụng này là **một tiến trình Node duy nhất**: Express vừa phục vụ API `/api/*`,
vừa phục vụ SPA đã build trong `dist/`. Nó cần một nền tảng chạy container hoặc
chạy tiến trình thường trực — Coolify, Render, Railway, Fly.io, hoặc một VPS.

**Netlify và Vercel (chế độ tĩnh) KHÔNG chạy được.** Chúng chỉ phục vụ file tĩnh,
nên `dist/` tải lên vẫn hiện giao diện nhưng mọi lệnh gọi `/api/*` đều trả 404.
Triệu chứng: trang chủ hiện toàn số 0, bản đồ và bảng xếp hạng trống, không có
thông báo lỗi nào. Thêm biến môi trường vào bảng điều khiển Netlify cũng vô ích
vì không có tiến trình nào đọc chúng.

## Cấu hình build

| Mục | Giá trị |
|---|---|
| Node | `>=22` (đã ghim ở `engines` trong `package.json`) |
| Cài đặt | `npm ci` |
| Build | `npm run build` |
| Khởi động | `npm start` |
| Cổng | Đọc từ biến `PORT` do nền tảng tiêm vào, mặc định 3000 |

`npm run build` chạy hai bước: `vite build` sinh SPA vào `dist/`, rồi `esbuild`
đóng gói `server.ts` thành `dist/server.cjs`.

Lưu ý khi cấu hình cài đặt phụ thuộc: build **cần** devDependencies (`esbuild`,
`typescript`). Đừng chạy `npm ci --omit=dev` trước bước build. Nếu dùng Docker
nhiều tầng thì tầng build cài đầy đủ, tầng chạy mới `--omit=dev` — mọi module
mà `dist/server.cjs` cần lúc chạy đều đã nằm ở `dependencies`.

## Biến môi trường

Khai báo trên bảng điều khiển của nền tảng. **Không commit file `.env`.**

| Biến | Bắt buộc | Ghi chú |
|---|---|---|
| `SQL_HOST` | có | `db.<ref>.supabase.co` |
| `SQL_USER` | có | `postgres` |
| `SQL_PASSWORD` | có | Lấy tại Dashboard > Database > Settings > Database password |
| `SQL_DB_NAME` | có | `postgres` |
| `SQL_SSL` | có | `true` với Supabase |
| `SQL_ADMIN_USER` | chỉ khi chạy migration | dùng bởi drizzle-kit |
| `SQL_ADMIN_PASSWORD` | chỉ khi chạy migration | dùng bởi drizzle-kit |
| `PORT` | không | nền tảng thường tự tiêm |
| `CACHE_TTL_STATS` | không | mili-giây, để trống = tắt cache |
| `CACHE_TTL_LEADERBOARD` | không | mili-giây |
| `CACHE_TTL_UNITS` | không | mili-giây |

Giai đoạn demo để cả ba `CACHE_TTL_*` bằng 0 cho số liệu phản hồi tức thì. Khi
chạy thật thì đặt lần lượt 600000 / 60000 / 900000.

### IPv4 và IPv6

`db.<ref>.supabase.co` chỉ có bản ghi IPv6 (IPv4 phải mua add-on). Nếu nền tảng
triển khai không có IPv6, kết nối sẽ lỗi `ENETUNREACH`. Khi đó chuyển sang
Session Pooler — chạy IPv4, cổng 5432 nên không phải sửa code:

```
SQL_HOST=aws-<n>-ap-southeast-1.pooler.supabase.com
SQL_USER=postgres.<ref>
```

Lấy host chính xác ở nút **Connect** trên Dashboard, mục *Session pooler*.

Đừng dùng Transaction Pooler (cổng 6543): nó không hỗ trợ prepared statement mà
drizzle/pg có dùng.

## Migration

Chạy một lần khi CSDL còn trống, từ máy có `.env` trỏ đúng:

```
npx drizzle-kit migrate
npx tsx scripts/seed-units.ts     # 114 phường/xã
npx tsx scripts/seed-demo.ts      # dữ liệu demo, CHỈ dùng cho CSDL thử
```

## Kiểm tra sau khi deploy

```
curl https://<tên-miền>/api/health      # {"status":"ok",...}
curl https://<tên-miền>/api/stats       # số liệu thật, không phải toàn 0
curl -o /dev/null -w '%{http_code}\n' https://<tên-miền>/map   # 200, không phải 404
```

`/api/stats` trả toàn 0 nghĩa là server không nối được CSDL — kiểm tra log và
mục IPv4/IPv6 ở trên. `/map` trả 404 nghĩa là đang chạy trên nền tảng tĩnh chứ
không phải Node.

## Việc còn treo

Row Level Security đang **tắt** trên cả 4 bảng. Với dữ liệu demo thì chấp nhận
được, nhưng bảng `users` có cột `cccd` và `phone` — phải bật RLS kèm policy
trước khi đưa dữ liệu thật vào.
