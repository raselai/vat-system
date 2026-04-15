import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { registerSchema, loginSchema, refreshSchema, updateMeSchema } from '../validators/auth.validator';
import { success, created, error, unauthorized } from '../utils/response';
import prisma from '../utils/prisma';

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }

  try {
    const result = await authService.register(parsed.data);
    return created(res, result);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }

  try {
    const result = await authService.login(parsed.data);
    return success(res, result);
  } catch (err: any) {
    return unauthorized(res, err.message);
  }
}

export async function refresh(req: Request, res: Response) {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }

  try {
    const result = await authService.refresh(parsed.data.refreshToken);
    return success(res, result);
  } catch (err: any) {
    return unauthorized(res, err.message);
  }
}

export async function logout(req: Request, res: Response) {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await authService.logout(refreshToken);
  }
  return success(res, { message: 'Logged out successfully' });
}

export async function me(req: Request, res: Response) {
  if (!req.user) {
    return unauthorized(res);
  }

  const user = await prisma.user.findUnique({
    where: { id: BigInt(req.user.userId) },
    select: { id: true, fullName: true, email: true, status: true, createdAt: true },
  });

  if (!user) {
    return unauthorized(res, 'User not found');
  }

  const userCompanies = await prisma.userCompany.findMany({
    where: { userId: user.id },
    include: { company: { select: { id: true, name: true, bin: true } } },
  });

  return success(res, {
    user: { ...user, id: user.id.toString() },
    companies: userCompanies.map((uc: any) => ({
      id: uc.company.id.toString(),
      name: uc.company.name,
      bin: uc.company.bin,
      role: uc.role,
    })),
  });
}

export async function updateMe(req: Request, res: Response) {
  if (!req.user) return unauthorized(res);

  const parsed = updateMeSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }

  const { fullName, email } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { email, NOT: { id: BigInt(req.user.userId) } },
  });
  if (existing) return error(res, 'Email is already in use by another account');

  const updated = await prisma.user.update({
    where: { id: BigInt(req.user.userId) },
    data: { fullName, email },
    select: { id: true, fullName: true, email: true, status: true },
  });

  return success(res, { user: { ...updated, id: updated.id.toString() } });
}
