import { Request, Response } from 'express';
import * as incomeTaxService from '../services/incomeTax.service';
import { computeIncomeTaxReturn } from '../services/incomeTaxCalc.service';
import {
  computeIncomeTaxSchema, previewIncomeTaxSchema, updateIncomeTaxSchema,
} from '../validators/incomeTax.validator';
import { success, created, error, notFound } from '../utils/response';
import { generateIncomeTaxComputationPdf } from '../services/pdf.service';
import prisma from '../utils/prisma';

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General individual',
  women_senior: 'Woman / Senior citizen (65+)',
  third_gender_disabled: 'Third gender / Person with disability',
  freedom_fighter: 'Gazetted war-wounded freedom fighter',
};

function uid(req: Request): bigint {
  return BigInt(req.user!.userId);
}

// Stateless calculator — compute without persisting.
export async function preview(req: Request, res: Response) {
  const parsed = previewIncomeTaxSchema.safeParse(req.body);
  if (!parsed.success) return error(res, parsed.error.errors.map(e => e.message).join(', '));
  const result = computeIncomeTaxReturn({
    taxableIncome: parsed.data.taxableIncome,
    category: parsed.data.category,
    taxpayerStatus: parsed.data.taxpayerStatus,
    advanceTaxPaid: parsed.data.advanceTaxPaid,
    subjectToMinimum: parsed.data.subjectToMin,
  });
  return success(res, result);
}

export async function list(req: Request, res: Response) {
  const rows = await incomeTaxService.listComputations(uid(req));
  return success(res, rows);
}

export async function getOne(req: Request, res: Response) {
  const c = await incomeTaxService.getComputationById(uid(req), BigInt(req.params.id as string));
  if (!c) return notFound(res, 'Income tax computation not found');
  return success(res, c);
}

export async function create(req: Request, res: Response) {
  const parsed = computeIncomeTaxSchema.safeParse(req.body);
  if (!parsed.success) return error(res, parsed.error.errors.map(e => e.message).join(', '));
  try {
    const c = await incomeTaxService.createComputation(uid(req), parsed.data);
    return created(res, c);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function update(req: Request, res: Response) {
  const parsed = updateIncomeTaxSchema.safeParse(req.body);
  if (!parsed.success) return error(res, parsed.error.errors.map(e => e.message).join(', '));
  try {
    const c = await incomeTaxService.updateComputation(uid(req), BigInt(req.params.id as string), parsed.data);
    if (!c) return notFound(res, 'Income tax computation not found');
    return success(res, c);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function remove(req: Request, res: Response) {
  const ok = await incomeTaxService.deleteComputation(uid(req), BigInt(req.params.id as string));
  if (!ok) return notFound(res, 'Income tax computation not found');
  return success(res, { deleted: true });
}

export async function pdf(req: Request, res: Response) {
  const c = await incomeTaxService.getComputationById(uid(req), BigInt(req.params.id as string));
  if (!c) return notFound(res, 'Income tax computation not found');
  const user = await prisma.user.findUnique({ where: { id: uid(req) } });
  try {
    const pdfBuffer = await generateIncomeTaxComputationPdf({
      taxpayerName: user?.fullName || req.user!.email || 'Taxpayer',
      assessmentYear: c.assessmentYear,
      categoryLabel: CATEGORY_LABELS[c.category] || c.category,
      taxpayerStatusLabel: c.taxpayerStatus === 'existing' ? 'Existing taxpayer' : 'New taxpayer',
      taxableIncome: c.taxableIncome,
      breakdown: c.breakdownJson,
      grossTax: c.grossTax,
      minimumTax: c.minimumTax,
      taxAfterMinimum: c.taxAfterMinimum,
      advanceTaxPaid: c.advanceTaxPaid,
      netPayable: c.netPayable,
      refundable: c.refundable,
    });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="income-tax-${c.assessmentYear}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err: any) {
    return error(res, `PDF generation failed: ${err.message}`, 500);
  }
}
