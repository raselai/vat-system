import prisma from '../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { CreatePaymentInput } from '../validators/payment.validator';

function serializePayment(p: any) {
  return {
    ...p,
    id: p.id.toString(),
    companyId: p.companyId.toString(),
    invoiceId: p.invoiceId.toString(),
    createdBy: p.createdBy.toString(),
    amount: Number(p.amount),
  };
}

export async function listPayments(
  companyId: bigint,
  filters?: { invoiceId?: string; page?: number; limit?: number }
) {
  const where: any = { companyId };
  if (filters?.invoiceId) where.invoiceId = BigInt(filters.invoiceId);
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);
  return { payments: payments.map(serializePayment), total, page, limit };
}

export async function createPayment(companyId: bigint, userId: bigint, input: CreatePaymentInput) {
  const invoiceId = BigInt(input.invoiceId);
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    include: { payments: true },
  });
  if (!invoice) throw new Error('Invoice not found');

  const totalPaid = invoice.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const outstanding = Number(invoice.netReceivable) - totalPaid;
  if (input.amount > outstanding + 0.001) {
    throw new Error(`Payment amount (${input.amount}) exceeds outstanding balance (${outstanding.toFixed(2)})`);
  }

  const payment = await prisma.payment.create({
    data: {
      companyId,
      invoiceId,
      amount: new Decimal(input.amount),
      paymentDate: new Date(input.paymentDate),
      paymentMethod: input.paymentMethod,
      reference: input.reference,
      notes: input.notes,
      createdBy: userId,
    },
  });
  return serializePayment(payment);
}

export async function deletePayment(companyId: bigint, paymentId: bigint) {
  const payment = await prisma.payment.findFirst({ where: { id: paymentId, companyId } });
  if (!payment) return null;
  await prisma.payment.delete({ where: { id: paymentId } });
  return true;
}

export interface AgingEntry {
  customerId: string | null;
  customerName: string | null;
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  current: number;   // 0-30 days
  days31_60: number;
  days61_90: number;
  over90: number;
}

async function buildAgingSummary(companyId: bigint, invoiceType: 'sales' | 'purchase'): Promise<AgingEntry[]> {
  const invoices = await prisma.invoice.findMany({
    where: { companyId, invoiceType, status: { not: 'cancelled' } },
    include: { payments: true, customer: true },
  });

  const today = new Date();
  const grouped = new Map<string, AgingEntry>();

  for (const inv of invoices) {
    const key = inv.customerId ? inv.customerId.toString() : '__none__';
    if (!grouped.has(key)) {
      grouped.set(key, {
        customerId: inv.customerId?.toString() || null,
        customerName: inv.customer?.name || null,
        totalInvoiced: 0,
        totalPaid: 0,
        outstanding: 0,
        current: 0,
        days31_60: 0,
        days61_90: 0,
        over90: 0,
      });
    }
    const entry = grouped.get(key)!;
    const invoiced = Number(inv.netReceivable);
    const paid = inv.payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
    const unpaid = Math.max(0, invoiced - paid);

    entry.totalInvoiced += invoiced;
    entry.totalPaid += paid;
    entry.outstanding += unpaid;

    if (unpaid > 0) {
      const ageDays = Math.floor((today.getTime() - new Date(inv.challanDate).getTime()) / 86400000);
      if (ageDays <= 30) entry.current += unpaid;
      else if (ageDays <= 60) entry.days31_60 += unpaid;
      else if (ageDays <= 90) entry.days61_90 += unpaid;
      else entry.over90 += unpaid;
    }
  }

  return Array.from(grouped.values()).map(e => ({
    ...e,
    totalInvoiced: Math.round(e.totalInvoiced * 100) / 100,
    totalPaid: Math.round(e.totalPaid * 100) / 100,
    outstanding: Math.round(e.outstanding * 100) / 100,
    current: Math.round(e.current * 100) / 100,
    days31_60: Math.round(e.days31_60 * 100) / 100,
    days61_90: Math.round(e.days61_90 * 100) / 100,
    over90: Math.round(e.over90 * 100) / 100,
  }));
}

export async function getArSummary(companyId: bigint) {
  return buildAgingSummary(companyId, 'sales');
}

export async function getApSummary(companyId: bigint) {
  return buildAgingSummary(companyId, 'purchase');
}
