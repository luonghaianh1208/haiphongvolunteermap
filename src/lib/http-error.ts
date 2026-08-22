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
