import { Request, Response } from 'express';
import * as returnService from '../services/return.service';
import { generateReturnSchema, updateReturnSchema } from '../validators/return.validator';
import { success, created, error, notFound, forbidden } from '../utils/response';
import { generateMusak91Pdf } from '../services/pdf.service';
import prisma from '../utils/prisma';

export async function listReturns(req: Request, res: Response) {
  const { fiscalYear } = req.query as { fiscalYear?: string };
  const returns = await returnService.listReturns(req.companyId!, fiscalYear);
  return success(res, returns.map(returnService.serializeReturn));
}

export async function generateReturn(req: Request, res: Response) {
  const parsed = generateReturnSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }
  try {
    const ret = await returnService.generateReturn(
      req.companyId!,
      BigInt(req.user!.userId),
      parsed.data,
    );
    return created(res, returnService.serializeReturn(ret));
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function getReturn(req: Request, res: Response) {
  const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
  const ret = await returnService.getReturnById(req.companyId!, BigInt(id));
  if (!ret) return notFound(res, 'Return not found');
  return success(res, returnService.serializeReturn(ret));
}

export async function updateReturn(req: Request, res: Response) {
  const parsed = updateReturnSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    const ret = await returnService.updateReturn(req.companyId!, BigInt(id), parsed.data);
    if (!ret) return notFound(res, 'Return not found');
    return success(res, returnService.serializeReturn(ret));
  } catch (err: any) {
    return error(res, err.message);
  }
}

function handleTransition(action: 'review' | 'submit' | 'lock') {
  return async (req: Request, res: Response) => {
    if (req.companyRole !== 'admin') return forbidden(res, 'Only admins can perform this action');
    try {
      const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
      const ret = await returnService.transitionStatus(
        req.companyId!,
        BigInt(id),
        BigInt(req.user!.userId),
        action,
      );
      if (!ret) return notFound(res, 'Return not found');
      return success(res, returnService.serializeReturn(ret));
    } catch (err: any) {
      return error(res, err.message);
    }
  };
}

export const reviewReturn = handleTransition('review');
export const submitReturn = handleTransition('submit');
export const lockReturn = handleTransition('lock');

export async function getReturnPdf(req: Request, res: Response) {
  const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
  const ret = await returnService.getReturnById(req.companyId!, BigInt(id));
  if (!ret) return notFound(res, 'Return not found');

  const company = await prisma.company.findUnique({ where: { id: ret.companyId } });
  if (!company) return notFound(res, 'Company not found');

  try {
    const pdfBuffer = await generateMusak91Pdf({
      ...returnService.serializeReturn(ret),
      companyName: company.name,
      companyBin: company.bin,
      companyAddress: company.address,
    });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="musak91-${ret.taxMonth}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err: any) {
    return error(res, `PDF generation failed: ${err.message}`, 500);
  }
}

export async function nbrExport(req: Request, res: Response) {
  if (req.companyRole !== 'admin') return forbidden(res, 'Only admins can export');
  const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
  const ret = await returnService.getReturnById(req.companyId!, BigInt(id));
  if (!ret) return notFound(res, 'Return not found');
  return success(res, ret.musak91Json);
}
