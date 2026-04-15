import prisma from '../utils/prisma';
import { InvoiceType } from '@prisma/client';
import * as XLSX from 'xlsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export type ReportType =
  | 'vat-summary'
  | 'vat-payable'
  | 'sales-summary'
  | 'purchase-summary'
  | 'vds-summary';

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function monthDateRange(taxMonth: string): { startDate: Date; endDate: Date } {
  const [year, month] = taxMonth.split('-').map(Number);
  return {
    startDate: new Date(year, month - 1, 1),
    endDate: new Date(year, month, 0),
  };
}

// ─── Result types ─────────────────────────────────────────────────────────────

export interface VatSummaryResult {
  taxMonth: string;
  salesCount: number;
  purchaseCount: number;
  totalSalesValue: number;
  totalPurchaseValue: number;
  outputVat: number;
  inputVat: number;
  sdPayable: number;
  vdsCredit: number;
  netPayable: number;
}

export interface VatBand {
  vatRate: number;
  taxableValue: number;
  sdAmount: number;
  vatAmount: number;
  invoiceCount: number;
}

export interface VatPayableResult {
  taxMonth: string;
  bands: VatBand[];
}

export interface SummaryRow {
  vatRate: number;
  taxableValue: number;
  sdAmount: number;
  vatAmount: number;
  specificDutyAmount: number;
  grandTotal: number;
  invoiceCount: number;
}

export interface SummaryTotals {
  taxableValue: number;
  sdAmount: number;
  vatAmount: number;
  specificDutyAmount: number;
  grandTotal: number;
}

export interface InvoiceSummaryResult {
  taxMonth: string;
  rows: SummaryRow[];
  totals: SummaryTotals;
}

export interface VdsSummaryResult {
  taxMonth: string;
  certificateCount: number;
  totalDeducted: number;
  totalDeposited: number;
  totalPending: number;
}

// ─── Query functions ──────────────────────────────────────────────────────────

export async function getVatSummary(
  companyId: bigint,
  taxMonth: string,
): Promise<VatSummaryResult> {
  const { startDate, endDate } = monthDateRange(taxMonth);

  const [salesInvoices, purchaseInvoices, vdsCerts] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        companyId,
        invoiceType: 'sales' as InvoiceType,
        challanDate: { gte: startDate, lte: endDate },
        status: { not: 'cancelled' },
      },
      select: { vatTotal: true, sdTotal: true, subtotal: true },
    }),
    prisma.invoice.findMany({
      where: {
        companyId,
        invoiceType: 'purchase' as InvoiceType,
        challanDate: { gte: startDate, lte: endDate },
        status: { not: 'cancelled' },
      },
      select: { vatTotal: true, sdTotal: true, subtotal: true },
    }),
    prisma.vdsCertificate.findMany({
      where: { companyId, role: 'deductee', status: 'finalized', taxMonth },
      select: { vdsAmount: true },
    }),
  ]);

  const outputVat = round2(salesInvoices.reduce((s, i) => s + Number(i.vatTotal), 0));
  const sdPayable = round2(salesInvoices.reduce((s, i) => s + Number(i.sdTotal), 0));
  const totalSalesValue = round2(salesInvoices.reduce((s, i) => s + Number(i.subtotal), 0));
  const inputVat = round2(purchaseInvoices.reduce((s, i) => s + Number(i.vatTotal), 0));
  const totalPurchaseValue = round2(purchaseInvoices.reduce((s, i) => s + Number(i.subtotal), 0));
  const vdsCredit = round2(vdsCerts.reduce((s, c) => s + Number(c.vdsAmount), 0));
  const netPayable = round2(outputVat + sdPayable - inputVat - vdsCredit);

  return {
    taxMonth,
    salesCount: salesInvoices.length,
    purchaseCount: purchaseInvoices.length,
    totalSalesValue,
    totalPurchaseValue,
    outputVat,
    inputVat,
    sdPayable,
    vdsCredit,
    netPayable,
  };
}

export async function getVatPayable(
  companyId: bigint,
  taxMonth: string,
): Promise<VatPayableResult> {
  const { startDate, endDate } = monthDateRange(taxMonth);

  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      invoiceType: 'sales' as InvoiceType,
      challanDate: { gte: startDate, lte: endDate },
      status: { not: 'cancelled' },
    },
    select: {
      id: true,
      items: {
        select: {
          vatRate: true,
          taxableValue: true,
          sdAmount: true,
          vatAmount: true,
        },
      },
    },
  });

  const bandMap = new Map<
    number,
    { taxableValue: number; sdAmount: number; vatAmount: number; invoiceIds: Set<bigint> }
  >();

  for (const inv of invoices) {
    for (const item of inv.items) {
      const rate = Number(item.vatRate);
      if (!bandMap.has(rate)) {
        bandMap.set(rate, { taxableValue: 0, sdAmount: 0, vatAmount: 0, invoiceIds: new Set() });
      }
      const band = bandMap.get(rate)!;
      band.taxableValue += Number(item.taxableValue);
      band.sdAmount += Number(item.sdAmount);
      band.vatAmount += Number(item.vatAmount);
      band.invoiceIds.add(inv.id);
    }
  }

  const bands: VatBand[] = Array.from(bandMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([vatRate, band]) => ({
      vatRate,
      taxableValue: round2(band.taxableValue),
      sdAmount: round2(band.sdAmount),
      vatAmount: round2(band.vatAmount),
      invoiceCount: band.invoiceIds.size,
    }));

  return { taxMonth, bands };
}

async function getInvoiceSummary(
  companyId: bigint,
  taxMonth: string,
  invoiceType: 'sales' | 'purchase',
): Promise<InvoiceSummaryResult> {
  const { startDate, endDate } = monthDateRange(taxMonth);

  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      invoiceType: invoiceType as InvoiceType,
      challanDate: { gte: startDate, lte: endDate },
      status: { not: 'cancelled' },
    },
    select: {
      id: true,
      items: {
        select: {
          vatRate: true,
          taxableValue: true,
          sdAmount: true,
          vatAmount: true,
          specificDutyLine: true,
          grandTotal: true,
        },
      },
    },
  });

  const rowMap = new Map<
    number,
    {
      taxableValue: number;
      sdAmount: number;
      vatAmount: number;
      specificDutyAmount: number;
      grandTotal: number;
      invoiceIds: Set<bigint>;
    }
  >();

  for (const inv of invoices) {
    for (const item of inv.items) {
      const rate = Number(item.vatRate);
      if (!rowMap.has(rate)) {
        rowMap.set(rate, {
          taxableValue: 0,
          sdAmount: 0,
          vatAmount: 0,
          specificDutyAmount: 0,
          grandTotal: 0,
          invoiceIds: new Set(),
        });
      }
      const row = rowMap.get(rate)!;
      row.taxableValue += Number(item.taxableValue);
      row.sdAmount += Number(item.sdAmount);
      row.vatAmount += Number(item.vatAmount);
      row.specificDutyAmount += Number(item.specificDutyLine);
      row.grandTotal += Number(item.grandTotal);
      row.invoiceIds.add(inv.id);
    }
  }

  const rows: SummaryRow[] = Array.from(rowMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([vatRate, row]) => ({
      vatRate,
      taxableValue: round2(row.taxableValue),
      sdAmount: round2(row.sdAmount),
      vatAmount: round2(row.vatAmount),
      specificDutyAmount: round2(row.specificDutyAmount),
      grandTotal: round2(row.grandTotal),
      invoiceCount: row.invoiceIds.size,
    }));

  const totals: SummaryTotals = {
    taxableValue: round2(rows.reduce((s, r) => s + r.taxableValue, 0)),
    sdAmount: round2(rows.reduce((s, r) => s + r.sdAmount, 0)),
    vatAmount: round2(rows.reduce((s, r) => s + r.vatAmount, 0)),
    specificDutyAmount: round2(rows.reduce((s, r) => s + r.specificDutyAmount, 0)),
    grandTotal: round2(rows.reduce((s, r) => s + r.grandTotal, 0)),
  };

  return { taxMonth, rows, totals };
}

export function getSalesSummary(companyId: bigint, taxMonth: string): Promise<InvoiceSummaryResult> {
  return getInvoiceSummary(companyId, taxMonth, 'sales');
}

export function getPurchaseSummary(companyId: bigint, taxMonth: string): Promise<InvoiceSummaryResult> {
  return getInvoiceSummary(companyId, taxMonth, 'purchase');
}

export async function getVdsSummary(
  companyId: bigint,
  taxMonth: string,
): Promise<VdsSummaryResult> {
  const certs = await prisma.vdsCertificate.findMany({
    where: { companyId, taxMonth, role: 'deductor', status: { not: 'cancelled' } },
    select: {
      vdsAmount: true,
      deposits: { select: { amount: true } },
    },
  });

  const totalDeducted = round2(certs.reduce((s, c) => s + Number(c.vdsAmount), 0));
  const totalDeposited = round2(
    certs.reduce((s, c) => s + c.deposits.reduce((d, dep) => d + Number(dep.amount), 0), 0),
  );

  return {
    taxMonth,
    certificateCount: certs.length,
    totalDeducted,
    totalDeposited,
    totalPending: round2(totalDeducted - totalDeposited),
  };
}

// ─── Dispatcher (used by export endpoints) ────────────────────────────────────

export async function getReportData(
  companyId: bigint,
  type: ReportType,
  taxMonth: string,
): Promise<VatSummaryResult | VatPayableResult | InvoiceSummaryResult | VdsSummaryResult> {
  switch (type) {
    case 'vat-summary':      return getVatSummary(companyId, taxMonth);
    case 'vat-payable':      return getVatPayable(companyId, taxMonth);
    case 'sales-summary':    return getSalesSummary(companyId, taxMonth);
    case 'purchase-summary': return getPurchaseSummary(companyId, taxMonth);
    case 'vds-summary':      return getVdsSummary(companyId, taxMonth);
  }
}

// ─── Excel builders ───────────────────────────────────────────────────────────

function buildVatSummaryXlsx(data: VatSummaryResult): Buffer {
  const rows = [
    ['VAT Summary Report'],
    ['Tax Month', data.taxMonth],
    [],
    ['Metric', 'Value'],
    ['Sales Invoices', data.salesCount],
    ['Purchase Invoices', data.purchaseCount],
    ['Total Sales Value (BDT)', data.totalSalesValue],
    ['Total Purchase Value (BDT)', data.totalPurchaseValue],
    ['Output VAT (BDT)', data.outputVat],
    ['Input VAT Credit (BDT)', data.inputVat],
    ['SD Payable (BDT)', data.sdPayable],
    ['VDS Credit (BDT)', data.vdsCredit],
    ['Net VAT Payable (BDT)', data.netPayable],
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'VAT Summary');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

function buildVatPayableXlsx(data: VatPayableResult): Buffer {
  const header = [['Tax Month', data.taxMonth], [], ['VAT Rate (%)', 'Taxable Value', 'SD Amount', 'VAT Amount', 'Invoice Count']];
  const dataRows = data.bands.map(b => [b.vatRate, b.taxableValue, b.sdAmount, b.vatAmount, b.invoiceCount]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([...header, ...dataRows]), 'VAT Payable');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

function buildInvoiceSummaryXlsx(data: InvoiceSummaryResult, sheetName: string): Buffer {
  const header = [
    ['Tax Month', data.taxMonth],
    [],
    ['VAT Rate (%)', 'Taxable Value', 'SD Amount', 'VAT Amount', 'Specific Duty', 'Grand Total', 'Invoice Count'],
  ];
  const dataRows = data.rows.map(r => [
    r.vatRate,
    r.taxableValue,
    r.sdAmount,
    r.vatAmount,
    r.specificDutyAmount,
    r.grandTotal,
    r.invoiceCount,
  ]);
  const totalRow = [
    'TOTAL',
    data.totals.taxableValue,
    data.totals.sdAmount,
    data.totals.vatAmount,
    data.totals.specificDutyAmount,
    data.totals.grandTotal,
    '',
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([...header, ...dataRows, [], totalRow]), sheetName);
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

function buildVdsSummaryXlsx(data: VdsSummaryResult): Buffer {
  const rows = [
    ['VDS Summary Report'],
    ['Tax Month', data.taxMonth],
    [],
    ['Metric', 'Value'],
    ['Certificates', data.certificateCount],
    ['Total Deducted (BDT)', data.totalDeducted],
    ['Total Deposited (BDT)', data.totalDeposited],
    ['Total Pending (BDT)', data.totalPending],
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'VDS Summary');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

export async function buildXlsxReport(
  companyId: bigint,
  type: ReportType,
  taxMonth: string,
): Promise<Buffer> {
  switch (type) {
    case 'vat-summary': {
      const data = await getVatSummary(companyId, taxMonth);
      return buildVatSummaryXlsx(data);
    }
    case 'vat-payable': {
      const data = await getVatPayable(companyId, taxMonth);
      return buildVatPayableXlsx(data);
    }
    case 'sales-summary': {
      const data = await getSalesSummary(companyId, taxMonth);
      return buildInvoiceSummaryXlsx(data, 'Sales Summary');
    }
    case 'purchase-summary': {
      const data = await getPurchaseSummary(companyId, taxMonth);
      return buildInvoiceSummaryXlsx(data, 'Purchase Summary');
    }
    case 'vds-summary': {
      const data = await getVdsSummary(companyId, taxMonth);
      return buildVdsSummaryXlsx(data);
    }
  }
}
