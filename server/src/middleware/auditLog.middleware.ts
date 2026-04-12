import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function parseUserId(req: Request): bigint | null {
  try {
    return req.user?.userId ? BigInt(req.user.userId) : null;
  } catch {
    return null;
  }
}

export function auditLog(req: Request, res: Response, next: NextFunction): void {
  if (!MUTATING_METHODS.has(req.method)) {
    next();
    return;
  }

  res.on('finish', () => {
    prisma.auditLog.create({
      data: {
        userId:     parseUserId(req),
        companyId:  req.companyId ?? null,
        method:     req.method,
        path:       req.originalUrl.split('?')[0],
        statusCode: res.statusCode,
      },
    }).catch((err: unknown) => {
      console.error('[audit] write failed:', err);
    });
  });

  next();
}
