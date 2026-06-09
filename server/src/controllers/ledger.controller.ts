import { Request, Response } from 'express';
import * as ledgerService from '../services/ledger.service';
import { success, error, notFound } from '../utils/response';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDateFilters(req: Request): { from?: string; to?: string } | null {
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  if (from && !DATE_RE.test(from)) return null;
  if (to && !DATE_RE.test(to)) return null;
  return { from, to };
}

export async function getCashBook(req: Request, res: Response) {
  const accountId = req.query.accountId as string | undefined;
  if (!accountId || (accountId !== 'unassigned' && !/^\d+$/.test(accountId))) {
    return error(res, 'accountId is required (numeric id or "unassigned")');
  }
  const dates = parseDateFilters(req);
  if (!dates) return error(res, 'Dates must be YYYY-MM-DD');

  try {
    const result = await ledgerService.getCashBook(req.companyId!, { accountId, ...dates });
    return success(res, result);
  } catch (err: any) {
    if (err.message === 'Payment account not found') return notFound(res, err.message);
    return error(res, err.message);
  }
}

export async function getPartyLedger(req: Request, res: Response) {
  const customerId = req.query.customerId as string | undefined;
  if (!customerId || !/^\d+$/.test(customerId)) {
    return error(res, 'customerId is required');
  }
  const dates = parseDateFilters(req);
  if (!dates) return error(res, 'Dates must be YYYY-MM-DD');

  try {
    const result = await ledgerService.getPartyLedger(req.companyId!, BigInt(customerId), dates);
    return success(res, result);
  } catch (err: any) {
    if (err.message === 'Customer not found') return notFound(res, err.message);
    return error(res, err.message);
  }
}
