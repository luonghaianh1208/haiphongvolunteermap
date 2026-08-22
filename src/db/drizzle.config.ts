import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const sqlHost = process.env.SQL_HOST;
const sqlDbName = process.env.SQL_DB_NAME;
const user = process.env.SQL_ADMIN_USER;
const password = process.env.SQL_ADMIN_PASSWORD;
// SQL_SSL: cùng quy ước với src/db/index.ts — mặc định bật SSL (Supabase), đặt
// SQL_SSL=false khi chạy Postgres cục bộ không có SSL.
const sslEnabled = process.env.SQL_SSL !== 'false';

if (!sqlHost || !sqlDbName || !user || !password) {
  // If variables are missing, Drizzle-kit operations might fail, but let's not crash immediately on load.
  console.warn("Missing SQL admin credentials for Drizzle Kit.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    host: sqlHost as string,
    user: user as string,
    password: password as string,
    database: sqlDbName as string,
    // rejectUnauthorized: false vì Supabase dùng CA riêng, không có trong kho CA gốc
    // của Node — xem giải thích chi tiết trong src/db/index.ts.
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  },
  verbose: true,
});
