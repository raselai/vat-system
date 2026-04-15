import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import type { Browser } from 'puppeteer';

Handlebars.registerHelper('formatNumber', (value: number) => {
  if (value === null || value === undefined) return '0.00';
  return Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
});

Handlebars.registerHelper('add', (a: number, b: number) => a + b);

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
// On Vercel each invocation is ephemeral so we still spawn per-request there.
let _browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  // Vercel: no persistent process — always launch fresh
  if (process.env.VERCEL) {
    const chromium = require('@sparticuz/chromium');
    const puppeteerCore = require('puppeteer-core');
    return puppeteerCore.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }

  // Reuse existing browser if still connected
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
  isVercel: boolean,
): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf(pageOptions);
    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
    // On Vercel the browser is single-use — close it to free memory
    if (isVercel) await browser.close();
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
  }, !!process.env.VERCEL);
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
  }, !!process.env.VERCEL);
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
  }, !!process.env.VERCEL);
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
    netPayable: returnData.netPayable,
    notes: returnData.notes,
  });

  return renderPdf(html, {
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', right: '10mm', bottom: '15mm', left: '10mm' },
  }, !!process.env.VERCEL);
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
  }, !!process.env.VERCEL);
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

  return renderPdf(html, { format: 'A4', printBackground: true, margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' } }, !!process.env.VERCEL);
}
