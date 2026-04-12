import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { success, error } from '../utils/response';

export async function list(req: Request, res: Response) {
  const {
    userId,
    method,
    from,
    to,
    page = '1',
    limit = '50',
  } = req.query as Record<string, string | undefined>;

  const pageNum  = Math.max(1, parseInt(page  ?? '1',  10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? '50', 10)));
  const skip     = (pageNum - 1) * limitNum;

  const where: Record<string, unknown> = {
    companyId: req.companyId!,
  };

  if (userId) {
    where.userId = BigInt(userId);
  }
  if (method) {
    where.method = method.toUpperCase();
  }
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to   ? { lte: new Date(to)   } : {}),
    };
  }

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
    return error(res, (err as Error).message);
  }
}
