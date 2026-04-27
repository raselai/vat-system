import { Request, Response } from 'express';
import * as paymentService from '../services/payment.service';
import { createPaymentSchema } from '../validators/payment.validator';
import { success, created, error, notFound } from '../utils/response';

export async function listPayments(req: Request, res: Response) {
  const filters = {
    invoiceId: req.query.invoiceId as string | undefined,
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
  };
  const result = await paymentService.listPayments(req.companyId!, filters);
  return success(res, result);
}

export async function createPayment(req: Request, res: Response) {
  const parsed = createPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }
  try {
    const payment = await paymentService.createPayment(req.companyId!, BigInt(req.user!.userId), parsed.data);
    return created(res, payment);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function deletePayment(req: Request, res: Response) {
  const result = await paymentService.deletePayment(req.companyId!, BigInt(req.params.id as string));
  if (!result) return notFound(res, 'Payment not found');
  return success(res, { deleted: true });
}

export async function getArSummary(req: Request, res: Response) {
  const summary = await paymentService.getArSummary(req.companyId!);
  return success(res, summary);
}

export async function getApSummary(req: Request, res: Response) {
  const summary = await paymentService.getApSummary(req.companyId!);
  return success(res, summary);
}
