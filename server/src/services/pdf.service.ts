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

export async function generateMusak63Pdf(invoiceData: any): Promise<Buffer> {
  const templateSource = readTemplate('musak63.html');
  const template = Handlebars.compile(templateSource);

  const html = template({
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
