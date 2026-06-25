import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import type { Browser } from 'puppeteer';

Handlebars.registerHelper('formatNumber', (value: number) => {
  if (value === null || value === undefined) return '0.00';
  return Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
});

Handlebars.registerHelper('add', (a: number, b: number) => a + b);

// Quantities are DECIMAL(14,3) — show up to 3 decimals, trimming trailing zeros.
Handlebars.registerHelper('formatQty', (value: number) => {
  if (value === null || value === undefined) return '0';
  return Number(value).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
});

function readTemplate(fileName: string): string {
  const candidates = [
    path.join(__dirname, '../templates', fileName),
    path.join(process.cwd(), 'src', 'templates', fileName),
    path.join(process.cwd(), 'server', 'src', 'templates', fileName),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate, 'utf-8');
    }
  }

  throw new Error(`Template not found: ${fileName}`);
}

// Singleton browser — launched once, reused across all PDF requests.
let _browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (_browser) {
    try {
      // ping — throws if the process has died
      await _browser.version();
      return _browser;
    } catch {
      _browser = null;
    }
  }

  const puppeteer = await import('puppeteer');
  _browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // Clean up reference if Chromium exits unexpectedly
  _browser.on('disconnected', () => { _browser = null; });

  return _browser;
}

async function renderPdf(
  html: string,
  pageOptions: Parameters<import('puppeteer').Page['pdf']>[0],
): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf(pageOptions);
    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

function readLogoAsBase64(): string {
  const candidates = [
    path.join(__dirname, '../templates/Logo.png'),
    path.join(process.cwd(), 'src', 'templates', 'Logo.png'),
    path.join(process.cwd(), 'server', 'src', 'templates', 'Logo.png'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return `data:image/png;base64,${fs.readFileSync(candidate).toString('base64')}`;
    }
  }
  return '';
}

export async function generateMusak63Pdf(invoiceData: any): Promise<Buffer> {
  const templateSource = readTemplate('musak63.html');
  const template = Handlebars.compile(templateSource);

  const html = template({
    logoDataUri: readLogoAsBase64(),
    companyName: invoiceData.companyName,
    companyBin: invoiceData.companyBin,
    companyAddress: invoiceData.companyAddress,
    challanNo: invoiceData.challanNo,
    challanDate: invoiceData.challanDate,
    invoiceType: invoiceData.invoiceType === 'sales' ? 'বিক্রয় / Sales' : 'ক্রয় / Purchase',
    customerName: invoiceData.customerName || 'N/A',
    customerBin: invoiceData.customerBin || 'N/A',
    customerAddress: invoiceData.customerAddress || 'N/A',
    items: invoiceData.items,
    subtotal: invoiceData.subtotal,
    sdTotal: invoiceData.sdTotal,
    vatTotal: invoiceData.vatTotal,
    specificDutyTotal: invoiceData.specificDutyTotal,
    grandTotal: invoiceData.grandTotal,
    vdsApplicable: invoiceData.vdsApplicable,
    vdsAmount: invoiceData.vdsAmount,
    netReceivable: invoiceData.netReceivable,
  });

  return renderPdf(html, {
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', right: '10mm', bottom: '15mm', left: '10mm' },
  });
}

export async function generateMusak66Pdf(certData: any): Promise<Buffer> {
  const templateSource = readTemplate('musak66.html');
  const template = Handlebars.compile(templateSource);

  const html = template({
    certificateNo: certData.certificateNo,
    certificateDate: new Date(certData.certificateDate).toLocaleDateString('en-GB'),
    fiscalYear: certData.fiscalYear,
    taxMonth: certData.taxMonth,
    role: certData.role,
    roleLabel: certData.role === 'deductor' ? 'উৎসে কর্তনকারী / Deductor' : 'উৎসে কর্তিত / Deductee',
    counterpartyName: certData.counterpartyName,
    counterpartyBin: certData.counterpartyBin,
    counterpartyAddress: certData.counterpartyAddress || 'N/A',
    totalValue: certData.totalValue,
    vatAmount: certData.vatAmount,
    vdsRate: certData.vdsRate,
    vdsAmount: certData.vdsAmount,
    invoiceChallanNo: certData.invoice?.challanNo || 'N/A',
  });

  return renderPdf(html, {
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', right: '10mm', bottom: '15mm', left: '10mm' },
  });
}

export async function generateIncomeTaxComputationPdf(data: {
  taxpayerName: string;
  assessmentYear: string;
  categoryLabel: string;
  taxpayerStatusLabel: string;
  taxableIncome: number;
  breakdown: { label: string; slabAmount: number; rate: number; tax: number }[];
  grossTax: number;
  minimumTax: number;
  taxAfterMinimum: number;
  advanceTaxPaid: number;
  netPayable: number;
  refundable: number;
}): Promise<Buffer> {
  const templateSource = readTemplate('income-tax-computation.html');
  const template = Handlebars.compile(templateSource);

  const html = template({
    logoDataUri: readLogoAsBase64(),
    generatedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
    minimumApplied: data.minimumTax > 0 && data.taxAfterMinimum === data.minimumTax && data.grossTax < data.minimumTax,
    ...data,
  });

  return renderPdf(html, {
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', right: '10mm', bottom: '15mm', left: '10mm' },
  });
}

export async function generateMusak67Pdf(registerData: any): Promise<Buffer> {
  const templateSource = readTemplate('musak67.html');
  const template = Handlebars.compile(templateSource);

  const isSales = registerData.invoiceType === 'sales';
  const html = template({
    registerTitle: isSales
      ? 'বিক্রয় হিসাবপুস্তক / Sales Register'
      : 'ক্রয় হিসাবপুস্তক / Purchase Register',
    counterpartyHeader: isSales ? 'ক্রেতার নাম / Buyer' : 'বিক্রেতার নাম / Seller',
    companyName: registerData.companyName,
    companyBin: registerData.companyBin,
    companyAddress: registerData.companyAddress,
    taxMonth: registerData.taxMonth,
    fiscalYear: registerData.fiscalYear,
    entries: registerData.entries,
    summary: registerData.summary,
  });

  return renderPdf(html, {
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '10mm', right: '8mm', bottom: '10mm', left: '8mm' },
  });
}

export async function generateMusak61Pdf(data: {
  companyName: string;
  companyBin: string;
  companyAddress: string;
  product: { name: string; unit: string; openingStock: number };
  entries: Array<{
    date: string;
    type: 'opening' | 'in' | 'out';
    source: 'opening' | 'invoice' | 'adjustment';
    invoiceType: 'sales' | 'purchase' | null;
    reference: string;
    qtyIn: number;
    qtyOut: number;
    balance: number;
  }>;
  currentStock: number;
}): Promise<Buffer> {
  const templateSource = readTemplate('musak61.html');
  const template = Handlebars.compile(templateSource);

  const typeLabel = (e: { source: string; invoiceType: string | null }) => {
    if (e.source === 'opening') return 'প্রারম্ভিক / Opening';
    if (e.source === 'adjustment') return 'সমন্বয় / Adjustment';
    return e.invoiceType === 'purchase' ? 'ক্রয় / Purchase' : 'বিক্রয় / Sale';
  };

  const entries = data.entries.map((e, i) => ({
    sl: e.source === 'opening' ? '—' : i,
    dateLabel: new Date(e.date).toLocaleDateString('en-GB'),
    typeLabel: typeLabel(e),
    isOpening: e.source === 'opening',
    reference: e.reference,
    qtyIn: e.qtyIn,
    qtyOut: e.qtyOut,
    balance: e.balance,
  }));

  const html = template({
    logoDataUri: readLogoAsBase64(),
    companyName: data.companyName,
    companyBin: data.companyBin,
    companyAddress: data.companyAddress,
    productName: data.product.name,
    unit: data.product.unit,
    openingStock: data.product.openingStock,
    entries,
    currentStock: data.currentStock,
  });

  return renderPdf(html, {
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' },
  });
}

export async function generateMusak91Pdf(returnData: any): Promise<Buffer> {
  const templateSource = readTemplate('musak91.html');
  const template = Handlebars.compile(templateSource);

  const html = template({
    companyName: returnData.companyName,
    companyBin: returnData.companyBin,
    companyAddress: returnData.companyAddress,
    taxMonth: returnData.taxMonth,
    fiscalYear: returnData.fiscalYear,
    status: returnData.status,
    totalSalesValue: returnData.totalSalesValue,
    outputVat: returnData.outputVat,
    sdPayable: returnData.sdPayable,
    totalPurchaseValue: returnData.totalPurchaseValue,
    inputVat: returnData.inputVat,
    vdsCredit: returnData.vdsCredit,
    carryForward: returnData.carryForward,
    increasingAdjustment: returnData.increasingAdjustment,
    decreasingAdjustment: returnData.decreasingAdjustment,
    openingBalance: returnData.openingBalance,
    hasOpeningBalance: Number(returnData.openingBalance) !== 0,
    netPayable: returnData.netPayable,
    notes: returnData.notes,
  });

  return renderPdf(html, {
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', right: '10mm', bottom: '15mm', left: '10mm' },
  });
}

function fmt(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function filingDeadline(taxMonth: string): string {
  const [year, month] = taxMonth.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const date = new Date(nextYear, nextMonth - 1, 15);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function prevMonth(taxMonth: string): string {
  const [year, month] = taxMonth.split('-').map(Number);
  const pm = month === 1 ? 12 : month - 1;
  const py = month === 1 ? year - 1 : year;
  return `${py}-${String(pm).padStart(2, '0')}`;
}

export async function generateNbrFilingGuidePdf(data: {
  companyName: string;
  companyBin: string;
  companyAddress: string;
  taxMonth: string;
  status: string;
  totalSalesValue: number;
  outputVat: number;
  sdPayable: number;
  totalPurchaseValue: number;
  inputVat: number;
  vdsCredit: number;
  carryForward: number;
  increasingAdjustment: number;
  decreasingAdjustment: number;
  netPayable: number;
}): Promise<Buffer> {
  const templateSource = readTemplate('nbr-filing-guide.html');
  const template = Handlebars.compile(templateSource);

  const html = template({
    logoDataUri: readLogoAsBase64(),
    companyName: data.companyName,
    companyBin: data.companyBin,
    companyAddress: data.companyAddress,
    taxMonth: data.taxMonth,
    status: data.status,
    filingDeadline: filingDeadline(data.taxMonth),
    prevMonth: prevMonth(data.taxMonth),
    totalSalesValue: fmt(data.totalSalesValue),
    outputVat: fmt(data.outputVat),
    sdPayable: fmt(data.sdPayable),
    hasSd: data.sdPayable > 0,
    totalPurchaseValue: fmt(data.totalPurchaseValue),
    inputVat: fmt(data.inputVat),
    vdsCredit: fmt(data.vdsCredit),
    hasVds: data.vdsCredit > 0,
    carryForward: data.carryForward > 0 ? fmt(data.carryForward) : null,
    increasingAdjustment: data.increasingAdjustment > 0 ? fmt(data.increasingAdjustment) : null,
    decreasingAdjustment: data.decreasingAdjustment > 0 ? fmt(data.decreasingAdjustment) : null,
    hasAdjustments: data.carryForward > 0 || data.increasingAdjustment > 0 || data.decreasingAdjustment > 0,
    netPayable: fmt(data.netPayable),
  });

  return renderPdf(html, {
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', right: '12mm', bottom: '15mm', left: '12mm' },
  });
}

const REPORT_TITLES: Record<string, string> = {
  'vat-summary':      'VAT Summary Report',
  'vat-payable':      'VAT Payable by Rate Band',
  'sales-summary':    'Sales Summary Report',
  'purchase-summary': 'Purchase Summary Report',
  'vds-summary':      'VDS Certificate Summary',
};

export async function generateReportPdf(type: string, data: any): Promise<Buffer> {
  const templateSource = readTemplate('reports.html');
  const template = Handlebars.compile(templateSource);

  const html = template({
    reportTitle: REPORT_TITLES[type] ?? 'Report',
    generatedAt: new Date().toLocaleDateString('en-GB'),
    isVatSummary:       type === 'vat-summary',
    isVatPayable:       type === 'vat-payable',
    showInvoiceSummary: type === 'sales-summary' || type === 'purchase-summary',
    isVdsSummary:       type === 'vds-summary',
    ...data,
  });

  return renderPdf(html, { format: 'A4', printBackground: true, margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' } });
}
