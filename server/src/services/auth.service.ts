import bcrypt from 'bcrypt';
import prisma from '../utils/prisma';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, TokenPayload } from '../utils/jwt';
import { RegisterInput, LoginInput } from '../validators/auth.validator';

const SALT_ROUNDS = 12;

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new Error('Email already registered');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      passwordHash,
    },
    select: { id: true, fullName: true, email: true, status: true, createdAt: true },
  });

  const payload: TokenPayload = { userId: user.id.toString(), email: user.email };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: { userId: user.id, token: refreshToken, expiresAt },
  });

  return {
    user: { ...user, id: user.id.toString() },
    accessToken,
    refreshToken,
  };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new Error('Invalid email or password');
  }

  if (user.status === 'inactive') {
    throw new Error('Account is inactive');
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new Error('Invalid email or password');
  }

  const payload: TokenPayload = { userId: user.id.toString(), email: user.email };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: { userId: user.id, token: refreshToken, expiresAt },
  });

  const userCompanies = await prisma.userCompany.findMany({
    where: { userId: user.id },
    include: { company: { select: { id: true, name: true, bin: true } } },
  });

  return {
    user: {
      id: user.id.toString(),
      fullName: user.fullName,
      email: user.email,
      status: user.status,
    },
    companies: userCompanies.map((uc: any) => ({
      id: uc.company.id.toString(),
      name: uc.company.name,
      bin: uc.company.bin,
      role: uc.role,
    })),
    accessToken,
    refreshToken,
  };
}

export async function refresh(refreshTokenStr: string) {
  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshTokenStr } });
  if (!stored || stored.expiresAt < new Date()) {
    throw new Error('Invalid or expired refresh token');
  }

  let payload: TokenPayload;
  try {
    payload = verifyRefreshToken(refreshTokenStr);
  } catch {
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    throw new Error('Invalid refresh token');
  }

  // Delete old token and create new one (rotation)
  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: { userId: BigInt(payload.userId), token: newRefreshToken, expiresAt },
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function logout(refreshTokenStr: string) {
  await prisma.refreshToken.deleteMany({ where: { token: refreshTokenStr } });
}
