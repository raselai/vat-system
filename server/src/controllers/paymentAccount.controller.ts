import { Request, Response } from 'express';
import * as paymentAccountService from '../services/paymentAccount.service';
import { createPaymentAccountSchema, updatePaymentAccountSchema } from '../validators/paymentAccount.validator';
import { success, created, error, notFound } from '../utils/response';

export async function list(req: Request, res: Response) {
  const includeInactive = req.query.includeInactive === 'true';
  const accounts = await paymentAccountService.listPaymentAccounts(req.companyId!, includeInactive);
  return success(res, accounts);
}

export async function create(req: Request, res: Response) {
  const parsed = createPaymentAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }

  try {
    const account = await paymentAccountService.createPaymentAccount(req.companyId!, parsed.data);
    return created(res, account);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function get(req: Request, res: Response) {
  const account = await paymentAccountService.getPaymentAccountById(req.companyId!, BigInt(req.params.id as string));
  if (!account) {
    return notFound(res, 'Payment account not found');
  }
  return success(res, account);
}

export async function update(req: Request, res: Response) {
  const parsed = updatePaymentAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }

  const account = await paymentAccountService.updatePaymentAccount(req.companyId!, BigInt(req.params.id as string), parsed.data);
  if (!account) {
    return notFound(res, 'Payment account not found');
  }
  return success(res, account);
}

export async function remove(req: Request, res: Response) {
  const deleted = await paymentAccountService.deletePaymentAccount(req.companyId!, BigInt(req.params.id as string));
  if (!deleted) {
    return notFound(res, 'Payment account not found');
  }
  return success(res, { message: 'Payment account deactivated' });
}
