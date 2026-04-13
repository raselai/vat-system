import { Request, Response } from 'express';
import * as vdsService from '../services/vds.service';
import {
  createCertificateSchema, updateCertificateSchema,
  createDepositSchema, updateDepositSchema, linkCertificatesSchema,
} from '../validators/vds.validator';
import { success, created, error, notFound, forbidden } from '../utils/response';
import { generateMusak66Pdf } from '../services/pdf.service';

// ---------- Certificates ----------

export async function listCertificates(req: Request, res: Response) {
  const filters = {
    role: req.query.role as string | undefined,
    status: req.query.status as string | undefined,
    taxMonth: req.query.taxMonth as string | undefined,
    fiscalYear: req.query.fiscalYear as string | undefined,
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
  };
  const result = await vdsService.listCertificates(req.companyId!, filters);
  return success(res, result);
}

export async function createCertificate(req: Request, res: Response) {
  const parsed = createCertificateSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }
  try {
    const cert = await vdsService.createCertificate(req.companyId!, BigInt(req.user!.userId), parsed.data);
    return created(res, cert);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function getCertificate(req: Request, res: Response) {
  const cert = await vdsService.getCertificateById(req.companyId!, BigInt(req.params.id as string));
  if (!cert) return notFound(res, 'VDS certificate not found');
  return success(res, cert);
}

export async function updateCertificate(req: Request, res: Response) {
  const parsed = updateCertificateSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }
  try {
    const cert = await vdsService.updateCertificate(req.companyId!, BigInt(req.params.id as string), parsed.data);
    if (!cert) return notFound(res, 'VDS certificate not found');
    return success(res, cert);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function finalizeCertificate(req: Request, res: Response) {
  if (req.companyRole !== 'admin') return forbidden(res, 'Only admins can finalize certificates');
  try {
    const cert = await vdsService.finalizeCertificate(req.companyId!, BigInt(req.params.id as string));
    if (!cert) return notFound(res, 'VDS certificate not found');
    return success(res, cert);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function cancelCertificate(req: Request, res: Response) {
  try {
    const cert = await vdsService.cancelCertificate(req.companyId!, BigInt(req.params.id as string));
    if (!cert) return notFound(res, 'VDS certificate not found');
    return success(res, cert);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function createFromInvoice(req: Request, res: Response) {
  const role = (req.body.role || 'deductor') as 'deductor' | 'deductee';
  try {
    const cert = await vdsService.createCertificateFromInvoice(
      req.companyId!, BigInt(req.user!.userId), BigInt(req.params.invoiceId as string), role
    );
    if (!cert) return notFound(res, 'Invoice not found');
    return created(res, cert);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function getCertificatePdf(req: Request, res: Response) {
  const cert = await vdsService.getCertificateById(req.companyId!, BigInt(req.params.id as string));
  if (!cert) return notFound(res, 'VDS certificate not found');

  try {
    const pdfBuffer = await generateMusak66Pdf(cert);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="musak66-${cert.certificateNo}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err: any) {
    return error(res, `PDF generation failed: ${err.message}`, 500);
  }
}

// ---------- Treasury Deposits ----------

export async function listDeposits(req: Request, res: Response) {
  const filters = {
    status: req.query.status as string | undefined,
    taxMonth: req.query.taxMonth as string | undefined,
    fiscalYear: req.query.fiscalYear as string | undefined,
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
  };
  const result = await vdsService.listDeposits(req.companyId!, filters);
  return success(res, result);
}

export async function createDeposit(req: Request, res: Response) {
  const parsed = createDepositSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }
  try {
    const deposit = await vdsService.createDeposit(req.companyId!, BigInt(req.user!.userId), parsed.data);
    return created(res, deposit);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function getDeposit(req: Request, res: Response) {
  const deposit = await vdsService.getDepositById(req.companyId!, BigInt(req.params.id as string));
  if (!deposit) return notFound(res, 'Treasury deposit not found');
  return success(res, deposit);
}

export async function updateDeposit(req: Request, res: Response) {
  const parsed = updateDepositSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }
  try {
    const deposit = await vdsService.updateDeposit(req.companyId!, BigInt(req.params.id as string), parsed.data);
    if (!deposit) return notFound(res, 'Treasury deposit not found');
    return success(res, deposit);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function markDeposited(req: Request, res: Response) {
  if (req.companyRole !== 'admin') return forbidden(res, 'Only admins can mark deposits');
  try {
    const deposit = await vdsService.markDeposited(req.companyId!, BigInt(req.params.id as string));
    if (!deposit) return notFound(res, 'Treasury deposit not found');
    return success(res, deposit);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function linkCertificates(req: Request, res: Response) {
  const parsed = linkCertificatesSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }
  try {
    const deposit = await vdsService.linkCertificates(req.companyId!, BigInt(req.params.id as string), parsed.data);
    if (!deposit) return notFound(res, 'Treasury deposit not found');
    return success(res, deposit);
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
  const summary = await vdsService.getMonthlySummary(req.companyId!, taxMonth);
  return success(res, summary);
}
