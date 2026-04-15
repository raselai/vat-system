import { Request, Response } from 'express';
import * as reportsService from '../services/reports.service';
import { generateReportPdf } from '../services/pdf.service';
import { success, error } from '../utils/response';
import type { ReportType } from '../services/reports.service';

const REPORT_TYPES: ReportType[] = [
  'vat-summary',
  'vat-payable',
  'sales-summary',
  'purchase-summary',
  'vds-summary',
];

function validateTaxMonth(req: Request): string | null {
  const taxMonth = req.query.taxMonth as string;
  if (!taxMonth || !/^\d{4}-\d{2}$/.test(taxMonth)) return null;
  return taxMonth;
}

export async function getVatSummary(req: Request, res: Response) {
  const taxMonth = validateTaxMonth(req);
  if (!taxMonth) return error(res, 'taxMonth is required (YYYY-MM)', 400);
  try {
    const data = await reportsService.getVatSummary(req.companyId!, taxMonth);
    return success(res, data);
  } catch (err: any) {
    return error(res, err.message, 500);
  }
}

export async function getVatPayable(req: Request, res: Response) {
  const taxMonth = validateTaxMonth(req);
  if (!taxMonth) return error(res, 'taxMonth is required (YYYY-MM)', 400);
  try {
    const data = await reportsService.getVatPayable(req.companyId!, taxMonth);
    return success(res, data);
  } catch (err: any) {
    return error(res, err.message, 500);
  }
}

export async function getSalesSummary(req: Request, res: Response) {
  const taxMonth = validateTaxMonth(req);
  if (!taxMonth) return error(res, 'taxMonth is required (YYYY-MM)', 400);
  try {
    const data = await reportsService.getSalesSummary(req.companyId!, taxMonth);
    return success(res, data);
  } catch (err: any) {
    return error(res, err.message, 500);
  }
}

export async function getPurchaseSummary(req: Request, res: Response) {
  const taxMonth = validateTaxMonth(req);
  if (!taxMonth) return error(res, 'taxMonth is required (YYYY-MM)', 400);
  try {
    const data = await reportsService.getPurchaseSummary(req.companyId!, taxMonth);
    return success(res, data);
  } catch (err: any) {
    return error(res, err.message, 500);
  }
}

export async function getVdsSummary(req: Request, res: Response) {
  const taxMonth = validateTaxMonth(req);
  if (!taxMonth) return error(res, 'taxMonth is required (YYYY-MM)', 400);
  try {
    const data = await reportsService.getVdsSummary(req.companyId!, taxMonth);
    return success(res, data);
  } catch (err: any) {
    return error(res, err.message, 500);
  }
}

export async function exportPdf(req: Request, res: Response) {
  const type = req.params.type as string;
  if (!REPORT_TYPES.includes(type as ReportType)) {
    return error(res, `Invalid report type. Must be one of: ${REPORT_TYPES.join(', ')}`, 400);
  }
  const taxMonth = validateTaxMonth(req);
  if (!taxMonth) return error(res, 'taxMonth is required (YYYY-MM)', 400);

  try {
    const data = await reportsService.getReportData(req.companyId!, type as ReportType, taxMonth);
    const pdfBuffer = await generateReportPdf(type, data);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${type}-${taxMonth}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err: any) {
    return error(res, `PDF generation failed: ${err.message}`, 500);
  }
}

export async function exportXlsx(req: Request, res: Response) {
  const type = req.params.type as string;
  if (!REPORT_TYPES.includes(type as ReportType)) {
    return error(res, `Invalid report type. Must be one of: ${REPORT_TYPES.join(', ')}`, 400);
  }
  const taxMonth = validateTaxMonth(req);
  if (!taxMonth) return error(res, 'taxMonth is required (YYYY-MM)', 400);

  try {
    const buffer = await reportsService.buildXlsxReport(req.companyId!, type as ReportType, taxMonth);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${type}-${taxMonth}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  } catch (err: any) {
    return error(res, `Excel generation failed: ${err.message}`, 500);
  }
}
