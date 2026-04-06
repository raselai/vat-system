import { Request, Response } from 'express';
import * as invoiceService from '../services/invoice.service';
import { createInvoiceSchema, updateInvoiceSchema } from '../validators/invoice.validator';
import { success, created, error, notFound, forbidden } from '../utils/response';
import { generateMusak63Pdf } from '../services/pdf.service';
import prisma from '../utils/prisma';

export async function list(req: Request, res: Response) {
  const filters = {
    status: req.query.status as string | undefined,
    invoiceType: req.query.invoiceType as string | undefined,
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
  };
  const result = await invoiceService.listInvoices(req.companyId!, filters);
  return success(res, result);
}

export async function create(req: Request, res: Response) {
  const parsed = createInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }
  try {
    const invoice = await invoiceService.createInvoice(req.companyId!, BigInt(req.user!.userId), parsed.data);
    return created(res, invoice);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function get(req: Request, res: Response) {
  const invoice = await invoiceService.getInvoiceById(req.companyId!, BigInt(req.params.id as string));
  if (!invoice) return notFound(res, 'Invoice not found');
  return success(res, invoice);
}

export async function update(req: Request, res: Response) {
  const parsed = updateInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }
  try {
    const invoice = await invoiceService.updateInvoice(req.companyId!, BigInt(req.params.id as string), BigInt(req.user!.userId), parsed.data);
    if (!invoice) return notFound(res, 'Invoice not found');
    return success(res, invoice);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function approve(req: Request, res: Response) {
  if (req.companyRole !== 'admin') return forbidden(res, 'Only admins can approve invoices');
  try {
    const invoice = await invoiceService.approveInvoice(req.companyId!, BigInt(req.params.id as string), BigInt(req.user!.userId));
    if (!invoice) return notFound(res, 'Invoice not found');
    return success(res, invoice);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function cancel(req: Request, res: Response) {
  try {
    const invoice = await invoiceService.cancelInvoice(req.companyId!, BigInt(req.params.id as string));
    if (!invoice) return notFound(res, 'Invoice not found');
    return success(res, invoice);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function lock(req: Request, res: Response) {
  if (req.companyRole !== 'admin') return forbidden(res, 'Only admins can lock invoices');
  try {
    const invoice = await invoiceService.lockInvoice(req.companyId!, BigInt(req.params.id as string));
    if (!invoice) return notFound(res, 'Invoice not found');
    return success(res, invoice);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function getPdf(req: Request, res: Response) {
  const invoice = await invoiceService.getInvoiceById(req.companyId!, BigInt(req.params.id as string));
  if (!invoice) return notFound(res, 'Invoice not found');

  const company = await prisma.company.findUnique({ where: { id: req.companyId! } });

  const pdfData = {
    companyName: company!.name,
    companyBin: company!.bin,
    companyAddress: company!.address,
    challanNo: invoice.challanNo,
    challanDate: new Date(invoice.challanDate).toLocaleDateString('en-GB'),
    invoiceType: invoice.invoiceType,
    customerName: invoice.customer?.name,
    customerBin: invoice.customer?.binNid,
    customerAddress: invoice.customer?.address,
    items: invoice.items,
    subtotal: invoice.subtotal,
    sdTotal: invoice.sdTotal,
    vatTotal: invoice.vatTotal,
    specificDutyTotal: invoice.specificDutyTotal,
    grandTotal: invoice.grandTotal,
    vdsApplicable: invoice.vdsApplicable,
    vdsAmount: invoice.vdsAmount,
    netReceivable: invoice.netReceivable,
  };

  try {
    const pdfBuffer = await generateMusak63Pdf(pdfData);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="musak63-${invoice.challanNo}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err: any) {
    return error(res, `PDF generation failed: ${err.message}`, 500);
  }
}
