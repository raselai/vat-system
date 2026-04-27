import prisma from '../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateInvoiceInput, UpdateInvoiceInput } from '../validators/invoice.validator';
import { calculateLineItem, calculateInvoiceTotals } from './vatCalc.service';
import { generateChallanNo } from '../utils/challan';

function serializeInvoice(invoice: any) {
  return {
    ...invoice,
    id: invoice.id.toString(),
    companyId: invoice.companyId.toString(),
    customerId: invoice.customerId?.toString() || null,
    createdBy: invoice.createdBy.toString(),
    approvedBy: invoice.approvedBy?.toString() || null,
    subtotal: Number(invoice.subtotal),
    sdTotal: Number(invoice.sdTotal),
    vatTotal: Number(invoice.vatTotal),
    specificDutyTotal: Number(invoice.specificDutyTotal),
    grandTotal: Number(invoice.grandTotal),
    vdsAmount: Number(invoice.vdsAmount),
    netReceivable: Number(invoice.netReceivable),
    items: invoice.items?.map(serializeItem) || [],
    customer: invoice.customer ? {
      ...invoice.customer,
      id: invoice.customer.id.toString(),
      companyId: invoice.customer.companyId.toString(),
    } : null,
  };
}

function serializeItem(item: any) {
  return {
    ...item,
    id: item.id.toString(),
    invoiceId: item.invoiceId.toString(),
    productId: item.productId.toString(),
    product: item.product ? {
      ...item.product,
      id: item.product.id.toString(),
      companyId: item.product.companyId.toString(),
    } : undefined,
    qty: Number(item.qty),
    unitPrice: Number(item.unitPrice),
    vatRate: Number(item.vatRate),
    sdRate: Number(item.sdRate),
    specificDutyAmount: Number(item.specificDutyAmount),
    truncatedBasePct: Number(item.truncatedBasePct),
    taxableValue: Number(item.taxableValue),
    sdAmount: Number(item.sdAmount),
    vatAmount: Number(item.vatAmount),
    specificDutyLine: Number(item.specificDutyLine),
    lineTotal: Number(item.lineTotal),
    grandTotal: Number(item.grandTotal),
    vdsRate: Number(item.vdsRate),
    vdsAmount: Number(item.vdsAmount),
  };
}

export async function listInvoices(
  companyId: bigint,
  filters?: { status?: string; invoiceType?: string; page?: number; limit?: number }
) {
  const where: any = { companyId };
  if (filters?.status) where.status = filters.status;
  if (filters?.invoiceType) where.invoiceType = filters.invoiceType;
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { items: true, customer: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ]);
  return { invoices: invoices.map(serializeInvoice), total, page, limit };
}

export async function createInvoice(companyId: bigint, userId: bigint, input: CreateInvoiceInput) {
  return prisma.$transaction(async (tx: any) => {
    const challanNo = await generateChallanNo(tx, companyId, new Date(input.challanDate));
    const calculatedItems = input.items.map(item => {
      const calc = calculateLineItem({
        qty: item.qty,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
        sdRate: item.sdRate,
        specificDutyAmount: item.specificDutyAmount,
        truncatedBasePct: item.truncatedBasePct,
        vdsRate: input.vdsApplicable ? item.vdsRate : 0,
      });
      return { ...item, ...calc };
    });
    const totals = calculateInvoiceTotals(calculatedItems);
    const invoice = await tx.invoice.create({
      data: {
        companyId,
        customerId: input.customerId ? BigInt(input.customerId) : null,
        invoiceType: input.invoiceType,
        challanNo,
        challanDate: new Date(input.challanDate),
        subtotal: new Decimal(totals.subtotal),
        sdTotal: new Decimal(totals.sdTotal),
        vatTotal: new Decimal(totals.vatTotal),
        specificDutyTotal: new Decimal(totals.specificDutyTotal),
        grandTotal: new Decimal(totals.grandTotal),
        vdsApplicable: input.vdsApplicable,
        vdsAmount: new Decimal(totals.vdsAmount),
        netReceivable: new Decimal(totals.netReceivable),
        createdBy: userId,
        items: {
          create: calculatedItems.map(item => ({
            productId: BigInt(item.productId),
            description: item.description,
            descriptionBn: item.descriptionBn,
            hsCode: item.hsCode,
            qty: new Decimal(item.qty),
            unitPrice: new Decimal(item.unitPrice),
            vatRate: new Decimal(item.vatRate),
            sdRate: new Decimal(item.sdRate),
            specificDutyAmount: new Decimal(item.specificDutyAmount),
            truncatedBasePct: new Decimal(item.truncatedBasePct),
            taxableValue: new Decimal(item.taxableValue),
            sdAmount: new Decimal(item.sdAmount),
            vatAmount: new Decimal(item.vatAmount),
            specificDutyLine: new Decimal(item.specificDutyLine),
            lineTotal: new Decimal(item.lineTotal),
            grandTotal: new Decimal(item.grandTotal),
            vdsRate: new Decimal(input.vdsApplicable ? item.vdsRate : 0),
            vdsAmount: new Decimal(item.vdsAmount),
          })),
        },
      },
      include: { items: true, customer: true },
    });
    return serializeInvoice(invoice);
  });
}

export async function getInvoiceById(companyId: bigint, invoiceId: bigint) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    include: { items: { include: { product: true } }, customer: true, payments: true },
  });
  if (!invoice) return null;
  const serialized = serializeInvoice(invoice);
  return {
    ...serialized,
    payments: (invoice.payments || []).map((p: any) => ({
      id: p.id.toString(),
      companyId: p.companyId.toString(),
      invoiceId: p.invoiceId.toString(),
      amount: Number(p.amount),
      paymentDate: p.paymentDate,
      paymentMethod: p.paymentMethod,
      reference: p.reference,
      notes: p.notes,
      createdBy: p.createdBy.toString(),
      createdAt: p.createdAt,
    })),
  };
}

export async function updateInvoice(companyId: bigint, invoiceId: bigint, userId: bigint, input: UpdateInvoiceInput) {
  const existing = await prisma.invoice.findFirst({ where: { id: invoiceId, companyId } });
  if (!existing) return null;
  if (existing.status !== 'draft') throw new Error('Only draft invoices can be edited');

  return prisma.$transaction(async (tx: any) => {
    const updateData: any = {};
    if (input.challanDate) updateData.challanDate = new Date(input.challanDate);
    if (input.customerId !== undefined) updateData.customerId = input.customerId ? BigInt(input.customerId) : null;
    if (input.vdsApplicable !== undefined) updateData.vdsApplicable = input.vdsApplicable;

    if (input.items) {
      await tx.invoiceItem.deleteMany({ where: { invoiceId } });
      const vdsApplicable = input.vdsApplicable ?? existing.vdsApplicable;
      const calculatedItems = input.items.map(item => {
        const calc = calculateLineItem({
          qty: item.qty, unitPrice: item.unitPrice, vatRate: item.vatRate,
          sdRate: item.sdRate, specificDutyAmount: item.specificDutyAmount,
          truncatedBasePct: item.truncatedBasePct, vdsRate: vdsApplicable ? item.vdsRate : 0,
        });
        return { ...item, ...calc };
      });
      const totals = calculateInvoiceTotals(calculatedItems);
      updateData.subtotal = new Decimal(totals.subtotal);
      updateData.sdTotal = new Decimal(totals.sdTotal);
      updateData.vatTotal = new Decimal(totals.vatTotal);
      updateData.specificDutyTotal = new Decimal(totals.specificDutyTotal);
      updateData.grandTotal = new Decimal(totals.grandTotal);
      updateData.vdsAmount = new Decimal(totals.vdsAmount);
      updateData.netReceivable = new Decimal(totals.netReceivable);
      await tx.invoiceItem.createMany({
        data: calculatedItems.map(item => ({
          invoiceId, productId: BigInt(item.productId),
          description: item.description, descriptionBn: item.descriptionBn, hsCode: item.hsCode,
          qty: new Decimal(item.qty), unitPrice: new Decimal(item.unitPrice),
          vatRate: new Decimal(item.vatRate), sdRate: new Decimal(item.sdRate),
          specificDutyAmount: new Decimal(item.specificDutyAmount),
          truncatedBasePct: new Decimal(item.truncatedBasePct),
          taxableValue: new Decimal(item.taxableValue), sdAmount: new Decimal(item.sdAmount),
          vatAmount: new Decimal(item.vatAmount), specificDutyLine: new Decimal(item.specificDutyLine),
          lineTotal: new Decimal(item.lineTotal), grandTotal: new Decimal(item.grandTotal),
          vdsRate: new Decimal(vdsApplicable ? item.vdsRate : 0), vdsAmount: new Decimal(item.vdsAmount),
        })),
      });
    }
    const invoice = await tx.invoice.update({
      where: { id: invoiceId }, data: updateData,
      include: { items: true, customer: true },
    });
    return serializeInvoice(invoice);
  });
}

export async function approveInvoice(companyId: bigint, invoiceId: bigint, userId: bigint) {
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, companyId } });
  if (!invoice) return null;
  if (invoice.status !== 'draft') throw new Error('Only draft invoices can be approved');
  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: 'approved', approvedBy: userId },
    include: { items: true, customer: true },
  });
  return serializeInvoice(updated);
}

export async function cancelInvoice(companyId: bigint, invoiceId: bigint) {
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, companyId } });
  if (!invoice) return null;
  if (invoice.status !== 'draft') throw new Error('Only draft invoices can be cancelled');
  const updated = await prisma.invoice.update({
    where: { id: invoiceId }, data: { status: 'cancelled' },
    include: { items: true, customer: true },
  });
  return serializeInvoice(updated);
}

export async function lockInvoice(companyId: bigint, invoiceId: bigint) {
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, companyId } });
  if (!invoice) return null;
  if (invoice.status !== 'approved') throw new Error('Only approved invoices can be locked');
  const updated = await prisma.invoice.update({
    where: { id: invoiceId }, data: { status: 'locked', lockedAt: new Date() },
    include: { items: true, customer: true },
  });
  return serializeInvoice(updated);
}
