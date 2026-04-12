import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { success, error } from '../utils/response';

const VALID_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

export async function list(req: Request, res: Response) {
  const {
    userId,
    method,
    from,
    to,
    page = '1',
    limit = '50',
  } = req.query as Record<string, string | undefined>;

  const pageNum  = Math.max(1, parseInt(page  ?? '1',  10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? '50', 10) || 50));
  const skip     = (pageNum - 1) * limitNum;

  // Validate userId before BigInt conversion
  if (userId && !/^\d+$/.test(userId)) {
    return error(res, 'userId must be a numeric ID');
  }

  // Validate dates before use
  if (from && isNaN(new Date(from).getTime())) {
    return error(res, 'Invalid from date');
  }
  if (to && isNaN(new Date(to).getTime())) {
    return error(res, 'Invalid to date');
  }

  const where: Prisma.AuditLogWhereInput = {
    companyId: req.companyId!,
    ...(userId ? { userId: BigInt(userId) } : {}),
    ...(method && VALID_METHODS.has(method.toUpperCase()) ? { method: method.toUpperCase() } : {}),
    ...(from || to ? {
      createdAt: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to   ? { lte: new Date(to)   } : {}),
      },
    } : {}),
  };

  try {
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return success(res, {
      items: items.map(row => ({
        id:         row.id.toString(),
        companyId:  row.companyId?.toString() ?? null,
        userId:     row.userId?.toString()    ?? null,
        method:     row.method,
        path:       row.path,
        statusCode: row.statusCode,
        createdAt:  row.createdAt.toISOString(),
      })),
      total,
      page:  pageNum,
      limit: limitNum,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return error(res, msg, 500);
  }
}
