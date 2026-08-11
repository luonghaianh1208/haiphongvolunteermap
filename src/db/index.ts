import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.ts';

const { Pool } = pg;

// SQL_SSL: mặc định bật SSL (bắt buộc với Supabase). Đặt SQL_SSL=false để tắt khi
// chạy Postgres cục bộ không có SSL trong lúc phát triển.
const sslEnabled = process.env.SQL_SSL !== 'false';

export const createPool = () => {
  return new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    connectionTimeoutMillis: 15000,
    // rejectUnauthorized: false vì Supabase dùng chứng chỉ do CA riêng của họ ký,
    // không nằm trong kho CA gốc của Node. Đặt true mà không cung cấp CA của Supabase
    // sẽ khiến kết nối luôn thất bại. Đây là đánh đổi có ý thức, không phải sơ suất.
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  });
};

const pool = createPool();

pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});

export const db = drizzle(pool, { schema });
