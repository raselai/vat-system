import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { forbidden, unauthorized } from '../utils/response';

declare global {
  namespace Express {
    interface Request {
      companyRole?: 'admin' | 'operator';
    }
  }
}

export function requireRole(...roles: Array<'admin' | 'operator'>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    if (!roles.includes(userCompany.role as 'admin' | 'operator')) {
      forbidden(res, `This action requires one of: ${roles.join(', ')}`);
      return;
    }

    req.companyRole = userCompany.role as 'admin' | 'operator';
    next();
  };
}
