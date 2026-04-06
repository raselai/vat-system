import { Response } from 'express';

export function success<T>(res: Response, data: T, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

export function created<T>(res: Response, data: T) {
  return success(res, data, 201);
}

export function error(res: Response, message: string, statusCode = 400) {
  return res.status(statusCode).json({ success: false, error: message });
}

export function notFound(res: Response, message = 'Resource not found') {
  return error(res, message, 404);
}

export function unauthorized(res: Response, message = 'Unauthorized') {
  return error(res, message, 401);
}

export function forbidden(res: Response, message = 'Forbidden') {
  return error(res, message, 403);
}
