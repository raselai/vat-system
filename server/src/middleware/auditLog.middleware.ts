import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function auditLog(req: Request, res: Response, next: NextFunction): void {
  if (!MUTATING_METHODS.has(req.method)) {
    next();
    return;
  }

  res.on('finish', () => {
    prisma.auditLog.create({
      data: {
        userId:     req.user?.userId ? BigInt(req.user.userId) : null,
        companyId:  req.companyId ?? null,
        method:     req.method,
        path:       req.path,
        statusCode: res.statusCode,
      },
    }).catch((err: unknown) => {
      console.error('[audit] write failed:', err);
    });
  });

  next();
}
