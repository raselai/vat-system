import prisma from '../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { CreatePaymentAccountInput, UpdatePaymentAccountInput } from '../validators/paymentAccount.validator';

function serializeAccount(account: any) {
  return {
    ...account,
    id: account.id.toString(),
    companyId: account.companyId.toString(),
    openingBalance: Number(account.openingBalance),
  };
}

export async function listPaymentAccounts(companyId: bigint, includeInactive = false) {
  const where: any = { companyId };
  if (!includeInactive) {
    where.isActive = true;
  }
  const accounts = await prisma.paymentAccount.findMany({ where, orderBy: { name: 'asc' } });
  return accounts.map(serializeAccount);
}

export async function createPaymentAccount(companyId: bigint, input: CreatePaymentAccountInput) {
  const account = await prisma.paymentAccount.create({
    data: {
      companyId,
      name: input.name,
      type: input.type,
      accountNumber: input.accountNumber,
      bankName: input.bankName,
      openingBalance: new Decimal(input.openingBalance),
      isActive: input.isActive ?? true,
    },
  });
  return serializeAccount(account);
}

export async function getPaymentAccountById(companyId: bigint, accountId: bigint) {
  const account = await prisma.paymentAccount.findFirst({
    where: { id: accountId, companyId },
  });
  if (!account) return null;
  return serializeAccount(account);
}

export async function updatePaymentAccount(companyId: bigint, accountId: bigint, input: UpdatePaymentAccountInput) {
  const data: any = { ...input };
  if (input.openingBalance !== undefined) data.openingBalance = new Decimal(input.openingBalance);

  const result = await prisma.paymentAccount.updateMany({
    where: { id: accountId, companyId },
    data,
  });
  if (result.count === 0) return null;

  return getPaymentAccountById(companyId, accountId);
}

export async function deletePaymentAccount(companyId: bigint, accountId: bigint) {
  const result = await prisma.paymentAccount.updateMany({
    where: { id: accountId, companyId },
    data: { isActive: false },
  });
  return result.count > 0;
}
