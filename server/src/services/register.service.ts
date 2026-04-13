import prisma from '../utils/prisma';
import { InvoiceType } from '@prisma/client';

export interface RegisterEntry {
  sl: number;
  invoiceId: string;
  challanNo: string;
  challanDate: string;
  customerName: string | null;
  customerBin: string | null;
  subtotal: number;
  sdTotal: number;
  vatTotal: number;
  specificDutyTotal: number;
  grandTotal: number;
  vdsApplicable: boolean;
  vdsAmount: number;
  netReceivable: number;
}

export interface RegisterSummary {
  totalInvoices: number;
  subtotal: number;
  sdTotal: number;
  vatTotal: number;
  specificDutyTotal: number;
  grandTotal: number;
  vdsAmount: number;
  netReceivable: number;
}

export interface RegisterResult {
  invoiceType: 'sales' | 'purchase';
  taxMonth: string;
  fiscalYear: string;
  entries: RegisterEntry[];
  summary: RegisterSummary;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function getRegister(
  companyId: bigint,
  invoiceType: 'sales' | 'purchase',
  taxMonth: string,
  fiscalYear: string
): Promise<RegisterResult> {
  // Parse tax month to date range
  const [year, month] = taxMonth.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // last day of month

  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      invoiceType: invoiceType as InvoiceType,
      challanDate: { gte: startDate, lte: endDate },
      status: { not: 'cancelled' },
    },
    include: { customer: true },
    orderBy: { challanDate: 'asc' },
  });

  const entries: RegisterEntry[] = invoices.map((inv, idx) => ({
    sl: idx + 1,
    invoiceId: inv.id.toString(),
    challanNo: inv.challanNo,
    challanDate: inv.challanDate.toISOString().split('T')[0],
    customerName: inv.customer?.name || null,
    customerBin: inv.customer?.binNid || null,
    subtotal: Number(inv.subtotal),
    sdTotal: Number(inv.sdTotal),
    vatTotal: Number(inv.vatTotal),
    specificDutyTotal: Number(inv.specificDutyTotal),
    grandTotal: Number(inv.grandTotal),
    vdsApplicable: inv.vdsApplicable,
    vdsAmount: Number(inv.vdsAmount),
    netReceivable: Number(inv.netReceivable),
  }));

  const summary: RegisterSummary = {
    totalInvoices: entries.length,
    subtotal: round2(entries.reduce((s, e) => s + e.subtotal, 0)),
    sdTotal: round2(entries.reduce((s, e) => s + e.sdTotal, 0)),
    vatTotal: round2(entries.reduce((s, e) => s + e.vatTotal, 0)),
    specificDutyTotal: round2(entries.reduce((s, e) => s + e.specificDutyTotal, 0)),
    grandTotal: round2(entries.reduce((s, e) => s + e.grandTotal, 0)),
    vdsAmount: round2(entries.reduce((s, e) => s + e.vdsAmount, 0)),
    netReceivable: round2(entries.reduce((s, e) => s + e.netReceivable, 0)),
  };

  return { invoiceType, taxMonth, fiscalYear, entries, summary };
}
