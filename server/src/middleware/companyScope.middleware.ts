import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { forbidden, unauthorized } from '../utils/response';

declare global {
  namespace Express {
    interface Request {
      companyId?: bigint;
    }
  }
}

export async function companyScope(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    unauthorized(res);
    return;
  }

  const companyId = req.headers['x-company-id'] as string;
  if (!companyId) {
    forbidden(res, 'Company ID is required in x-company-id header');
    return;
  }

  const userCompany = await prisma.userCompany.findUnique({
    where: {
      userId_companyId: {
        userId: BigInt(req.user.userId),
        companyId: BigInt(companyId),
      },
    },
  });

  if (!userCompany) {
    forbidden(res, 'You do not have access to this company');
    return;
  }

  req.companyId = BigInt(companyId);
  req.companyRole = userCompany.role as 'admin' | 'operator';
  next();
}
