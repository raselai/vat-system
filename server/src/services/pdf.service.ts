import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

Handlebars.registerHelper('formatNumber', (value: number) => {
  if (value === null || value === undefined) return '0.00';
  return Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
});

Handlebars.registerHelper('add', (a: number, b: number) => a + b);

export async function generateMusak63Pdf(invoiceData: any): Promise<Buffer> {
  const templatePath = path.join(__dirname, '../templates/musak63.html');
  const templateSource = fs.readFileSync(templatePath, 'utf-8');
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

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', right: '10mm', bottom: '15mm', left: '10mm' },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

export async function generateMusak66Pdf(certData: any): Promise<Buffer> {
  const templatePath = path.join(__dirname, '../templates/musak66.html');
  const templateSource = fs.readFileSync(templatePath, 'utf-8');
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

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', right: '10mm', bottom: '15mm', left: '10mm' },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

export async function generateMusak67Pdf(registerData: any): Promise<Buffer> {
  const templatePath = path.join(__dirname, '../templates/musak67.html');
  const templateSource = fs.readFileSync(templatePath, 'utf-8');
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

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '10mm', right: '8mm', bottom: '10mm', left: '8mm' },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

export async function generateMusak91Pdf(returnData: any): Promise<Buffer> {
  const templatePath = path.join(__dirname, '../templates/musak91.html');
  const templateSource = fs.readFileSync(templatePath, 'utf-8');
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

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', right: '10mm', bottom: '15mm', left: '10mm' },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
