import { Request, Response } from 'express';
import * as tdsService from '../services/tds.service';
import {
  createDeductionSchema, updateDeductionSchema,
  createTdsPaymentSchema, updateTdsPaymentSchema, linkDeductionsSchema,
} from '../validators/tds.validator';
import { success, created, error, notFound } from '../utils/response';

// ---------- Deductions ----------

export async function listDeductions(req: Request, res: Response) {
  const filters = {
    status: req.query.status as string | undefined,
    taxMonth: req.query.taxMonth as string | undefined,
    fiscalYear: req.query.fiscalYear as string | undefined,
    sectionCode: req.query.sectionCode as string | undefined,
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
  };
  const result = await tdsService.listDeductions(req.companyId!, filters);
  return success(res, result);
}

export async function createDeduction(req: Request, res: Response) {
  const parsed = createDeductionSchema.safeParse(req.body);
  if (!parsed.success) return error(res, parsed.error.errors.map(e => e.message).join(', '));
  try {
    const d = await tdsService.createDeduction(req.companyId!, BigInt(req.user!.userId), parsed.data);
    return created(res, d);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function getDeduction(req: Request, res: Response) {
  const d = await tdsService.getDeductionById(req.companyId!, BigInt(req.params.id as string));
  if (!d) return notFound(res, 'TDS deduction not found');
  return success(res, d);
}

export async function updateDeduction(req: Request, res: Response) {
  const parsed = updateDeductionSchema.safeParse(req.body);
  if (!parsed.success) return error(res, parsed.error.errors.map(e => e.message).join(', '));
  try {
    const d = await tdsService.updateDeduction(req.companyId!, BigInt(req.params.id as string), parsed.data);
    if (!d) return notFound(res, 'TDS deduction not found');
    return success(res, d);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function finalizeDeduction(req: Request, res: Response) {
  try {
    const d = await tdsService.finalizeDeduction(req.companyId!, BigInt(req.params.id as string));
    if (!d) return notFound(res, 'TDS deduction not found');
    return success(res, d);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function cancelDeduction(req: Request, res: Response) {
  try {
    const d = await tdsService.cancelDeduction(req.companyId!, BigInt(req.params.id as string));
    if (!d) return notFound(res, 'TDS deduction not found');
    return success(res, d);
  } catch (err: any) {
    return error(res, err.message);
  }
}

// ---------- TDS Payments ----------

export async function listTdsPayments(req: Request, res: Response) {
  const filters = {
    status: req.query.status as string | undefined,
    taxMonth: req.query.taxMonth as string | undefined,
    fiscalYear: req.query.fiscalYear as string | undefined,
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
  };
  const result = await tdsService.listTdsPayments(req.companyId!, filters);
  return success(res, result);
}

export async function createTdsPayment(req: Request, res: Response) {
  const parsed = createTdsPaymentSchema.safeParse(req.body);
  if (!parsed.success) return error(res, parsed.error.errors.map(e => e.message).join(', '));
  try {
    const p = await tdsService.createTdsPayment(req.companyId!, BigInt(req.user!.userId), parsed.data);
    return created(res, p);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function getTdsPayment(req: Request, res: Response) {
  const p = await tdsService.getTdsPaymentById(req.companyId!, BigInt(req.params.id as string));
  if (!p) return notFound(res, 'TDS payment not found');
  return success(res, p);
}

export async function updateTdsPayment(req: Request, res: Response) {
  const parsed = updateTdsPaymentSchema.safeParse(req.body);
  if (!parsed.success) return error(res, parsed.error.errors.map(e => e.message).join(', '));
  try {
    const p = await tdsService.updateTdsPayment(req.companyId!, BigInt(req.params.id as string), parsed.data);
    if (!p) return notFound(res, 'TDS payment not found');
    return success(res, p);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function markDeposited(req: Request, res: Response) {
  try {
    const p = await tdsService.markTdsDeposited(req.companyId!, BigInt(req.params.id as string));
    if (!p) return notFound(res, 'TDS payment not found');
    return success(res, p);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function linkDeductions(req: Request, res: Response) {
  const parsed = linkDeductionsSchema.safeParse(req.body);
  if (!parsed.success) return error(res, parsed.error.errors.map(e => e.message).join(', '));
  try {
    const p = await tdsService.linkDeductions(req.companyId!, BigInt(req.params.id as string), parsed.data);
    if (!p) return notFound(res, 'TDS payment not found');
    return success(res, p);
  } catch (err: any) {
    return error(res, err.message);
  }
}

// ---------- Summary ----------

export async function getSummary(req: Request, res: Response) {
  const taxMonth = req.query.taxMonth as string;
  if (!taxMonth || !/^\d{4}-\d{2}$/.test(taxMonth)) {
    return error(res, 'taxMonth query parameter is required (YYYY-MM)');
  }
  const summary = await tdsService.getMonthlySummary(req.companyId!, taxMonth);
  return success(res, summary);
}
