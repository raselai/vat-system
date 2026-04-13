import { Request, Response } from 'express';
import * as registerService from '../services/register.service';
import { success, error } from '../utils/response';
import { generateMusak67Pdf } from '../services/pdf.service';
import { getFiscalYear } from '../utils/validators';
import prisma from '../utils/prisma';

function validateParams(req: Request): { invoiceType: 'sales' | 'purchase'; taxMonth: string; fiscalYear: string } | null {
  const invoiceType = req.params.type as string;
  if (invoiceType !== 'sales' && invoiceType !== 'purchase') return null;

  const taxMonth = req.query.taxMonth as string;
  if (!taxMonth || !/^\d{4}-\d{2}$/.test(taxMonth)) return null;

  const [year, month] = taxMonth.split('-').map(Number);
  const fiscalYear = getFiscalYear(new Date(year, month - 1, 1));

  return { invoiceType, taxMonth, fiscalYear };
}

export async function getRegister(req: Request, res: Response) {
  const params = validateParams(req);
  if (!params) {
    return error(res, 'Valid type (sales/purchase) and taxMonth (YYYY-MM) are required');
  }

  const result = await registerService.getRegister(
    req.companyId!, params.invoiceType, params.taxMonth, params.fiscalYear
  );
  return success(res, result);
}

export async function getRegisterPdf(req: Request, res: Response) {
  const params = validateParams(req);
  if (!params) {
    return error(res, 'Valid type (sales/purchase) and taxMonth (YYYY-MM) are required');
  }

  const result = await registerService.getRegister(
    req.companyId!, params.invoiceType, params.taxMonth, params.fiscalYear
  );

  const company = await prisma.company.findUnique({ where: { id: req.companyId! } });

  try {
    const pdfBuffer = await generateMusak67Pdf({
      companyName: company!.name,
      companyBin: company!.bin,
      companyAddress: company!.address,
      ...result,
    });
    const typeLabel = params.invoiceType === 'sales' ? 'sales' : 'purchase';
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="musak67-${typeLabel}-${params.taxMonth}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err: any) {
    return error(res, `PDF generation failed: ${err.message}`, 500);
  }
}
