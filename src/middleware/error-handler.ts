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
