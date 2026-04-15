# Reports API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tax-month-scoped Reports API (5 endpoints, PDF/Excel export) and a Reports page in the client, then fix Dashboard KPI cards to show current-month figures.

**Architecture:** New `reports.service.ts` runs Prisma queries against `invoices`/`invoice_items`/`vds_certificates` directly. A thin controller dispatches to service functions and handles export responses. Client loads all five reports in parallel with `Promise.all` and exposes a `DatePicker`-driven Reports page plus updated Dashboard cards.

**Tech Stack:** Express + Prisma + TypeScript (server), React + Ant Design + Axios (client), SheetJS (`xlsx`) for Excel, Handlebars + Puppeteer (`pdf.service.ts`) for PDF.

> **Note:** This project has no test infrastructure. The verification step for every task is `npx tsc --noEmit` (TypeScript strict-mode check) rather than a test runner.

---

### Task 1: Server — Reports service (queries)

**Files:**
- Create: `server/src/services/reports.service.ts`

- [ ] **Step 1: Create the service file with all types and five query functions**

`server/src/services/reports.service.ts`:

```typescript
import prisma from '../utils/prisma';
import { InvoiceType } from '@prisma/client';

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
    where: { companyId, taxMonth, status: { not: 'cancelled' } },
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
```

- [ ] **Step 2: Type-check**

```bash
cd "E:/Desktop 1/Vat/server" && npx tsc --noEmit
```

Expected: no errors.

---

### Task 2: Server — Excel export (add to reports service)

**Files:**
- Modify: `server/src/services/reports.service.ts`

- [ ] **Step 1: Add the xlsx import and five sheet-builder functions at the bottom of `reports.service.ts`**

Add at the top of the file (after the existing `import prisma` line):

```typescript
import * as XLSX from 'xlsx';
```

Add these functions at the bottom of `server/src/services/reports.service.ts`:

```typescript
// ─── Excel builders ───────────────────────────────────────────────────────────

function fmt(n: number): number { return n; }

function buildVatSummaryXlsx(data: VatSummaryResult): Buffer {
  const rows = [
    ['VAT Summary Report'],
    ['Tax Month', data.taxMonth],
    [],
    ['Metric', 'Value'],
    ['Sales Invoices', data.salesCount],
    ['Purchase Invoices', data.purchaseCount],
    ['Total Sales Value (BDT)', fmt(data.totalSalesValue)],
    ['Total Purchase Value (BDT)', fmt(data.totalPurchaseValue)],
    ['Output VAT (BDT)', fmt(data.outputVat)],
    ['Input VAT Credit (BDT)', fmt(data.inputVat)],
    ['SD Payable (BDT)', fmt(data.sdPayable)],
    ['VDS Credit (BDT)', fmt(data.vdsCredit)],
    ['Net VAT Payable (BDT)', fmt(data.netPayable)],
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'VAT Summary');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

function buildVatPayableXlsx(data: VatPayableResult): Buffer {
  const header = [['Tax Month', data.taxMonth], [], ['VAT Rate (%)', 'Taxable Value', 'SD Amount', 'VAT Amount', 'Invoice Count']];
  const dataRows = data.bands.map(b => [b.vatRate, fmt(b.taxableValue), fmt(b.sdAmount), fmt(b.vatAmount), b.invoiceCount]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([...header, ...dataRows]), 'VAT Payable');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

function buildInvoiceSummaryXlsx(data: InvoiceSummaryResult, sheetName: string): Buffer {
  const header = [
    ['Tax Month', data.taxMonth],
    [],
    ['VAT Rate (%)', 'Taxable Value', 'SD Amount', 'VAT Amount', 'Specific Duty', 'Grand Total', 'Invoice Count'],
  ];
  const dataRows = data.rows.map(r => [
    r.vatRate,
    fmt(r.taxableValue),
    fmt(r.sdAmount),
    fmt(r.vatAmount),
    fmt(r.specificDutyAmount),
    fmt(r.grandTotal),
    r.invoiceCount,
  ]);
  const totalRow = [
    'TOTAL',
    fmt(data.totals.taxableValue),
    fmt(data.totals.sdAmount),
    fmt(data.totals.vatAmount),
    fmt(data.totals.specificDutyAmount),
    fmt(data.totals.grandTotal),
    '',
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([...header, ...dataRows, [], totalRow]), sheetName);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

function buildVdsSummaryXlsx(data: VdsSummaryResult): Buffer {
  const rows = [
    ['VDS Summary Report'],
    ['Tax Month', data.taxMonth],
    [],
    ['Metric', 'Value'],
    ['Certificates', data.certificateCount],
    ['Total Deducted (BDT)', fmt(data.totalDeducted)],
    ['Total Deposited (BDT)', fmt(data.totalDeposited)],
    ['Total Pending (BDT)', fmt(data.totalPending)],
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'VDS Summary');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
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
```

- [ ] **Step 2: Type-check**

```bash
cd "E:/Desktop 1/Vat/server" && npx tsc --noEmit
```

Expected: no errors.

---

### Task 3: Server — PDF template + generateReportPdf

**Files:**
- Create: `server/src/templates/reports.html`
- Modify: `server/src/services/pdf.service.ts`

- [ ] **Step 1: Create the Handlebars PDF template**

`server/src/templates/reports.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Noto Sans Bengali', Arial, sans-serif; font-size: 10px; padding: 24px; color: #333; }
    .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #00503a; padding-bottom: 10px; }
    .header h1 { font-size: 15px; font-weight: 700; color: #00503a; }
    .header p { font-size: 9px; color: #666; margin-top: 3px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #ccc; padding: 4px 6px; font-size: 9px; }
    th { background: #f0f0f0; font-weight: 700; text-align: center; }
    td.number { text-align: right; }
    td.label { font-weight: 600; }
    tr.total td { font-weight: 700; background: #f5f5f5; }
    .meta { font-size: 9px; margin-bottom: 8px; }
    .meta span { font-weight: 600; }
  </style>
</head>
<body>

<div class="header">
  <h1>{{reportTitle}}</h1>
  <p>Tax Month: <strong>{{taxMonth}}</strong> &nbsp;|&nbsp; Generated: {{generatedAt}}</p>
</div>

{{#if isVatSummary}}
<table>
  <tr><th colspan="2">VAT Overview</th></tr>
  <tr><td class="label">Sales Invoices</td><td class="number">{{salesCount}}</td></tr>
  <tr><td class="label">Purchase Invoices</td><td class="number">{{purchaseCount}}</td></tr>
  <tr><td class="label">Total Sales Value (BDT)</td><td class="number">{{formatNumber totalSalesValue}}</td></tr>
  <tr><td class="label">Total Purchase Value (BDT)</td><td class="number">{{formatNumber totalPurchaseValue}}</td></tr>
  <tr><td class="label">Output VAT (BDT)</td><td class="number">{{formatNumber outputVat}}</td></tr>
  <tr><td class="label">Input VAT Credit (BDT)</td><td class="number">{{formatNumber inputVat}}</td></tr>
  <tr><td class="label">SD Payable (BDT)</td><td class="number">{{formatNumber sdPayable}}</td></tr>
  <tr><td class="label">VDS Credit (BDT)</td><td class="number">{{formatNumber vdsCredit}}</td></tr>
  <tr class="total"><td class="label">Net VAT Payable (BDT)</td><td class="number">{{formatNumber netPayable}}</td></tr>
</table>
{{/if}}

{{#if isVatPayable}}
<table>
  <thead>
    <tr>
      <th>VAT Rate (%)</th>
      <th>Taxable Value</th>
      <th>SD Amount</th>
      <th>VAT Amount</th>
      <th>Invoice Count</th>
    </tr>
  </thead>
  <tbody>
    {{#each bands}}
    <tr>
      <td class="number">{{vatRate}}</td>
      <td class="number">{{formatNumber taxableValue}}</td>
      <td class="number">{{formatNumber sdAmount}}</td>
      <td class="number">{{formatNumber vatAmount}}</td>
      <td class="number">{{invoiceCount}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>
{{/if}}

{{#if isSalesSummary}}
<table>
  <thead>
    <tr>
      <th>VAT Rate (%)</th>
      <th>Taxable Value</th>
      <th>SD Amount</th>
      <th>VAT Amount</th>
      <th>Specific Duty</th>
      <th>Grand Total</th>
      <th>Invoice Count</th>
    </tr>
  </thead>
  <tbody>
    {{#each rows}}
    <tr>
      <td class="number">{{vatRate}}</td>
      <td class="number">{{formatNumber taxableValue}}</td>
      <td class="number">{{formatNumber sdAmount}}</td>
      <td class="number">{{formatNumber vatAmount}}</td>
      <td class="number">{{formatNumber specificDutyAmount}}</td>
      <td class="number">{{formatNumber grandTotal}}</td>
      <td class="number">{{invoiceCount}}</td>
    </tr>
    {{/each}}
    <tr class="total">
      <td class="label">TOTAL</td>
      <td class="number">{{formatNumber totals.taxableValue}}</td>
      <td class="number">{{formatNumber totals.sdAmount}}</td>
      <td class="number">{{formatNumber totals.vatAmount}}</td>
      <td class="number">{{formatNumber totals.specificDutyAmount}}</td>
      <td class="number">{{formatNumber totals.grandTotal}}</td>
      <td></td>
    </tr>
  </tbody>
</table>
{{/if}}

{{#if isPurchaseSummary}}
<table>
  <thead>
    <tr>
      <th>VAT Rate (%)</th>
      <th>Taxable Value</th>
      <th>SD Amount</th>
      <th>VAT Amount</th>
      <th>Specific Duty</th>
      <th>Grand Total</th>
      <th>Invoice Count</th>
    </tr>
  </thead>
  <tbody>
    {{#each rows}}
    <tr>
      <td class="number">{{vatRate}}</td>
      <td class="number">{{formatNumber taxableValue}}</td>
      <td class="number">{{formatNumber sdAmount}}</td>
      <td class="number">{{formatNumber vatAmount}}</td>
      <td class="number">{{formatNumber specificDutyAmount}}</td>
      <td class="number">{{formatNumber grandTotal}}</td>
      <td class="number">{{invoiceCount}}</td>
    </tr>
    {{/each}}
    <tr class="total">
      <td class="label">TOTAL</td>
      <td class="number">{{formatNumber totals.taxableValue}}</td>
      <td class="number">{{formatNumber totals.sdAmount}}</td>
      <td class="number">{{formatNumber totals.vatAmount}}</td>
      <td class="number">{{formatNumber totals.specificDutyAmount}}</td>
      <td class="number">{{formatNumber totals.grandTotal}}</td>
      <td></td>
    </tr>
  </tbody>
</table>
{{/if}}

{{#if isVdsSummary}}
<table>
  <tr><th colspan="2">VDS Certificate Summary</th></tr>
  <tr><td class="label">Certificates (non-cancelled)</td><td class="number">{{certificateCount}}</td></tr>
  <tr><td class="label">Total Deducted (BDT)</td><td class="number">{{formatNumber totalDeducted}}</td></tr>
  <tr><td class="label">Total Deposited (BDT)</td><td class="number">{{formatNumber totalDeposited}}</td></tr>
  <tr class="total"><td class="label">Total Pending (BDT)</td><td class="number">{{formatNumber totalPending}}</td></tr>
</table>
{{/if}}

</body>
</html>
```

- [ ] **Step 2: Add `generateReportPdf` to `pdf.service.ts`**

The function follows the same pattern as `generateMusak63Pdf`. Add it at the end of `server/src/services/pdf.service.ts`:

```typescript
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
    generatedAt: new Date().toLocaleDateString('en-BD'),
    isVatSummary:      type === 'vat-summary',
    isVatPayable:      type === 'vat-payable',
    isSalesSummary:    type === 'sales-summary',
    isPurchaseSummary: type === 'purchase-summary',
    isVdsSummary:      type === 'vds-summary',
    ...data,
  });

  return renderPdf(html, { format: 'A4' }, !!process.env.VERCEL);
}
```

- [ ] **Step 3: Type-check**

```bash
cd "E:/Desktop 1/Vat/server" && npx tsc --noEmit
```

Expected: no errors.

---

### Task 4: Server — Controller, routes, and wire into app.ts

**Files:**
- Create: `server/src/controllers/reports.controller.ts`
- Create: `server/src/routes/reports.routes.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Create the controller**

`server/src/controllers/reports.controller.ts`:

```typescript
import { Request, Response } from 'express';
import * as reportsService from '../services/reports.service';
import { generateReportPdf } from '../services/pdf.service';
import { success, error } from '../utils/response';
import type { ReportType } from '../services/reports.service';

const REPORT_TYPES: ReportType[] = [
  'vat-summary',
  'vat-payable',
  'sales-summary',
  'purchase-summary',
  'vds-summary',
];

function validateTaxMonth(req: Request): string | null {
  const taxMonth = req.query.taxMonth as string;
  if (!taxMonth || !/^\d{4}-\d{2}$/.test(taxMonth)) return null;
  return taxMonth;
}

export async function getVatSummary(req: Request, res: Response) {
  const taxMonth = validateTaxMonth(req);
  if (!taxMonth) return error(res, 'taxMonth is required (YYYY-MM)', 400);
  const data = await reportsService.getVatSummary(req.companyId!, taxMonth);
  return success(res, data);
}

export async function getVatPayable(req: Request, res: Response) {
  const taxMonth = validateTaxMonth(req);
  if (!taxMonth) return error(res, 'taxMonth is required (YYYY-MM)', 400);
  const data = await reportsService.getVatPayable(req.companyId!, taxMonth);
  return success(res, data);
}

export async function getSalesSummary(req: Request, res: Response) {
  const taxMonth = validateTaxMonth(req);
  if (!taxMonth) return error(res, 'taxMonth is required (YYYY-MM)', 400);
  const data = await reportsService.getSalesSummary(req.companyId!, taxMonth);
  return success(res, data);
}

export async function getPurchaseSummary(req: Request, res: Response) {
  const taxMonth = validateTaxMonth(req);
  if (!taxMonth) return error(res, 'taxMonth is required (YYYY-MM)', 400);
  const data = await reportsService.getPurchaseSummary(req.companyId!, taxMonth);
  return success(res, data);
}

export async function getVdsSummary(req: Request, res: Response) {
  const taxMonth = validateTaxMonth(req);
  if (!taxMonth) return error(res, 'taxMonth is required (YYYY-MM)', 400);
  const data = await reportsService.getVdsSummary(req.companyId!, taxMonth);
  return success(res, data);
}

export async function exportPdf(req: Request, res: Response) {
  const type = req.params.type as string;
  if (!REPORT_TYPES.includes(type as ReportType)) {
    return error(res, `Invalid report type. Must be one of: ${REPORT_TYPES.join(', ')}`, 400);
  }
  const taxMonth = validateTaxMonth(req);
  if (!taxMonth) return error(res, 'taxMonth is required (YYYY-MM)', 400);

  const data = await reportsService.getReportData(req.companyId!, type as ReportType, taxMonth);
  try {
    const pdfBuffer = await generateReportPdf(type, data);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${type}-${taxMonth}.pdf"`,
      'Content-Length': String(pdfBuffer.length),
    });
    res.send(pdfBuffer);
  } catch (err: any) {
    return error(res, `PDF generation failed: ${err.message}`, 500);
  }
}

export async function exportXlsx(req: Request, res: Response) {
  const type = req.params.type as string;
  if (!REPORT_TYPES.includes(type as ReportType)) {
    return error(res, `Invalid report type. Must be one of: ${REPORT_TYPES.join(', ')}`, 400);
  }
  const taxMonth = validateTaxMonth(req);
  if (!taxMonth) return error(res, 'taxMonth is required (YYYY-MM)', 400);

  const buffer = await reportsService.buildXlsxReport(req.companyId!, type as ReportType, taxMonth);
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${type}-${taxMonth}.xlsx"`,
    'Content-Length': String(buffer.length),
  });
  res.send(buffer);
}
```

- [ ] **Step 2: Create the routes file**

`server/src/routes/reports.routes.ts`:

```typescript
import { Router } from 'express';
import * as reportsController from '../controllers/reports.controller';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';

const router = Router();

router.use(authenticate, companyScope);

// Named routes first to prevent /:type capturing them
router.get('/vat-summary',      reportsController.getVatSummary);
router.get('/vat-payable',      reportsController.getVatPayable);
router.get('/sales-summary',    reportsController.getSalesSummary);
router.get('/purchase-summary', reportsController.getPurchaseSummary);
router.get('/vds-summary',      reportsController.getVdsSummary);

// Export routes
router.get('/:type/pdf',  reportsController.exportPdf);
router.get('/:type/xlsx', reportsController.exportXlsx);

export default router;
```

- [ ] **Step 3: Register in app.ts**

In `server/src/app.ts`, add the import and route registration. After the existing `import backupRoutes` line, add:

```typescript
import reportsRoutes from './routes/reports.routes';
```

After the existing `app.use('/api/v1/backup', backupRoutes);` line, add:

```typescript
app.use('/api/v1/reports', reportsRoutes);
```

- [ ] **Step 4: Type-check**

```bash
cd "E:/Desktop 1/Vat/server" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Smoke-test the server**

```bash
cd "E:/Desktop 1/Vat" && npm run dev:server
```

In another terminal, hit the health endpoint to confirm the server starts:

```bash
curl http://localhost:4000/api/v1/health
```

Expected: `{"success":true,"data":{"status":"ok",...}}`

Stop the server with `Ctrl+C`.

- [ ] **Step 6: Commit**

```bash
cd "E:/Desktop 1/Vat"
git add server/src/services/reports.service.ts \
        server/src/services/pdf.service.ts \
        server/src/templates/reports.html \
        server/src/controllers/reports.controller.ts \
        server/src/routes/reports.routes.ts \
        server/src/app.ts
git commit -m "feat: add reports API (vat-summary, vat-payable, sales/purchase-summary, vds-summary) with PDF and Excel export"
```

---

### Task 5: Client — Types and reports service

**Files:**
- Modify: `client/src/types/index.ts`
- Create: `client/src/services/reports.service.ts`

- [ ] **Step 1: Add report types to `client/src/types/index.ts`**

Append to the end of `client/src/types/index.ts`:

```typescript
// ─── Reports ──────────────────────────────────────────────────────────────────

export interface VatSummary {
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

export interface VatPayable {
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

export interface InvoiceSummary {
  taxMonth: string;
  rows: SummaryRow[];
  totals: SummaryTotals;
}

export interface VdsSummary {
  taxMonth: string;
  certificateCount: number;
  totalDeducted: number;
  totalDeposited: number;
  totalPending: number;
}
```

- [ ] **Step 2: Create the client reports service**

`client/src/services/reports.service.ts`:

```typescript
import api from './api';
import type { VatSummary, VatPayable, InvoiceSummary, VdsSummary } from '../types';

async function get<T>(path: string, taxMonth: string): Promise<T> {
  const res = await api.get<{ success: boolean; data: T }>(path, { params: { taxMonth } });
  return res.data.data!;
}

export function getVatSummary(taxMonth: string): Promise<VatSummary> {
  return get<VatSummary>('/reports/vat-summary', taxMonth);
}

export function getVatPayable(taxMonth: string): Promise<VatPayable> {
  return get<VatPayable>('/reports/vat-payable', taxMonth);
}

export function getSalesSummary(taxMonth: string): Promise<InvoiceSummary> {
  return get<InvoiceSummary>('/reports/sales-summary', taxMonth);
}

export function getPurchaseSummary(taxMonth: string): Promise<InvoiceSummary> {
  return get<InvoiceSummary>('/reports/purchase-summary', taxMonth);
}

export function getVdsSummary(taxMonth: string): Promise<VdsSummary> {
  return get<VdsSummary>('/reports/vds-summary', taxMonth);
}

export async function downloadReport(
  type: string,
  taxMonth: string,
  format: 'pdf' | 'xlsx',
): Promise<void> {
  const response = await api.get(`/reports/${type}/${format}`, {
    params: { taxMonth },
    responseType: 'blob',
  });
  const mimeType =
    format === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const blob = new Blob([response.data as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}-${taxMonth}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 3: Type-check**

```bash
cd "E:/Desktop 1/Vat/client" && npx tsc --noEmit
```

Expected: no errors.

---

### Task 6: Client — ReportsPage UI

**Files:**
- Create: `client/src/pages/reports/ReportsPage.tsx`

- [ ] **Step 1: Create the Reports page**

`client/src/pages/reports/ReportsPage.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { Tabs, DatePicker, Button, Spin, Table, Descriptions } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import { useCompany } from '../../contexts/CompanyContext';
import {
  getVatSummary,
  getVatPayable,
  getSalesSummary,
  getPurchaseSummary,
  getVdsSummary,
  downloadReport,
} from '../../services/reports.service';
import type { VatSummary, VatPayable, VatBand, InvoiceSummary, SummaryRow, VdsSummary } from '../../types';

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function M({ name }: { name: string }) {
  return <span className="material-symbols-outlined">{name}</span>;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

function ExportBar({ type, taxMonth }: { type: string; taxMonth: string }) {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingXlsx, setLoadingXlsx] = useState(false);

  const handleDownload = async (format: 'pdf' | 'xlsx') => {
    if (format === 'pdf') setLoadingPdf(true);
    else setLoadingXlsx(true);
    try {
      await downloadReport(type, taxMonth, format);
    } finally {
      setLoadingPdf(false);
      setLoadingXlsx(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        size="small"
        loading={loadingPdf}
        icon={<M name="picture_as_pdf" />}
        onClick={() => handleDownload('pdf')}
      >
        PDF
      </Button>
      <Button
        size="small"
        loading={loadingXlsx}
        icon={<M name="table_view" />}
        onClick={() => handleDownload('xlsx')}
      >
        Excel
      </Button>
    </div>
  );
}

/* ── Tab panels ──────────────────────────────────────────────────────────── */

function VatSummaryTab({ data, taxMonth }: { data: VatSummary | null; taxMonth: string }) {
  if (!data) return <Spin />;
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ExportBar type="vat-summary" taxMonth={taxMonth} />
      </div>
      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label="Sales Invoices">{data.salesCount}</Descriptions.Item>
        <Descriptions.Item label="Purchase Invoices">{data.purchaseCount}</Descriptions.Item>
        <Descriptions.Item label="Total Sales Value">৳ {fmt(data.totalSalesValue)}</Descriptions.Item>
        <Descriptions.Item label="Total Purchase Value">৳ {fmt(data.totalPurchaseValue)}</Descriptions.Item>
        <Descriptions.Item label="Output VAT">৳ {fmt(data.outputVat)}</Descriptions.Item>
        <Descriptions.Item label="Input VAT Credit">৳ {fmt(data.inputVat)}</Descriptions.Item>
        <Descriptions.Item label="SD Payable">৳ {fmt(data.sdPayable)}</Descriptions.Item>
        <Descriptions.Item label="VDS Credit">৳ {fmt(data.vdsCredit)}</Descriptions.Item>
        <Descriptions.Item label={<strong>Net VAT Payable</strong>}>
          <strong>৳ {fmt(data.netPayable)}</strong>
        </Descriptions.Item>
      </Descriptions>
    </div>
  );
}

function VatPayableTab({ data, taxMonth }: { data: VatPayable | null; taxMonth: string }) {
  const columns: ColumnsType<VatBand> = [
    { title: 'VAT Rate (%)', dataIndex: 'vatRate', key: 'vatRate', align: 'right' },
    { title: 'Taxable Value', dataIndex: 'taxableValue', key: 'taxableValue', align: 'right', render: (v: number) => `৳ ${fmt(v)}` },
    { title: 'SD Amount', dataIndex: 'sdAmount', key: 'sdAmount', align: 'right', render: (v: number) => `৳ ${fmt(v)}` },
    { title: 'VAT Amount', dataIndex: 'vatAmount', key: 'vatAmount', align: 'right', render: (v: number) => `৳ ${fmt(v)}` },
    { title: 'Invoice Count', dataIndex: 'invoiceCount', key: 'invoiceCount', align: 'right' },
  ];
  if (!data) return <Spin />;
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ExportBar type="vat-payable" taxMonth={taxMonth} />
      </div>
      <Table dataSource={data.bands} columns={columns} rowKey="vatRate" pagination={false} size="small" />
    </div>
  );
}

function InvoiceSummaryTab({
  data,
  type,
  taxMonth,
}: {
  data: InvoiceSummary | null;
  type: 'sales-summary' | 'purchase-summary';
  taxMonth: string;
}) {
  const columns: ColumnsType<SummaryRow> = [
    { title: 'VAT Rate (%)', dataIndex: 'vatRate', key: 'vatRate', align: 'right' },
    { title: 'Taxable Value', dataIndex: 'taxableValue', key: 'taxableValue', align: 'right', render: (v: number) => `৳ ${fmt(v)}` },
    { title: 'SD Amount', dataIndex: 'sdAmount', key: 'sdAmount', align: 'right', render: (v: number) => `৳ ${fmt(v)}` },
    { title: 'VAT Amount', dataIndex: 'vatAmount', key: 'vatAmount', align: 'right', render: (v: number) => `৳ ${fmt(v)}` },
    { title: 'Specific Duty', dataIndex: 'specificDutyAmount', key: 'specificDutyAmount', align: 'right', render: (v: number) => `৳ ${fmt(v)}` },
    { title: 'Grand Total', dataIndex: 'grandTotal', key: 'grandTotal', align: 'right', render: (v: number) => `৳ ${fmt(v)}` },
    { title: 'Invoice Count', dataIndex: 'invoiceCount', key: 'invoiceCount', align: 'right' },
  ];
  if (!data) return <Spin />;
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ExportBar type={type} taxMonth={taxMonth} />
      </div>
      <Table
        dataSource={data.rows}
        columns={columns}
        rowKey="vatRate"
        pagination={false}
        size="small"
        summary={() => (
          <Table.Summary.Row className="font-bold">
            <Table.Summary.Cell index={0}>TOTAL</Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right">৳ {fmt(data.totals.taxableValue)}</Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right">৳ {fmt(data.totals.sdAmount)}</Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right">৳ {fmt(data.totals.vatAmount)}</Table.Summary.Cell>
            <Table.Summary.Cell index={4} align="right">৳ {fmt(data.totals.specificDutyAmount)}</Table.Summary.Cell>
            <Table.Summary.Cell index={5} align="right">৳ {fmt(data.totals.grandTotal)}</Table.Summary.Cell>
            <Table.Summary.Cell index={6} />
          </Table.Summary.Row>
        )}
      />
    </div>
  );
}

function VdsSummaryTab({ data, taxMonth }: { data: VdsSummary | null; taxMonth: string }) {
  if (!data) return <Spin />;
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ExportBar type="vds-summary" taxMonth={taxMonth} />
      </div>
      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label="Certificates (non-cancelled)">{data.certificateCount}</Descriptions.Item>
        <Descriptions.Item label="Total Deducted">৳ {fmt(data.totalDeducted)}</Descriptions.Item>
        <Descriptions.Item label="Total Deposited">৳ {fmt(data.totalDeposited)}</Descriptions.Item>
        <Descriptions.Item label={<strong>Total Pending</strong>}>
          <strong>৳ {fmt(data.totalPending)}</strong>
        </Descriptions.Item>
      </Descriptions>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function ReportsPage() {
  const { activeCompany } = useCompany();
  const [taxMonth, setTaxMonth] = useState<string>(dayjs().format('YYYY-MM'));
  const [loading, setLoading] = useState(false);
  const [vatSummary, setVatSummary] = useState<VatSummary | null>(null);
  const [vatPayable, setVatPayable] = useState<VatPayable | null>(null);
  const [salesSummary, setSalesSummary] = useState<InvoiceSummary | null>(null);
  const [purchaseSummary, setPurchaseSummary] = useState<InvoiceSummary | null>(null);
  const [vdsSummary, setVdsSummary] = useState<VdsSummary | null>(null);

  useEffect(() => {
    if (!activeCompany) return;
    setLoading(true);
    setVatSummary(null);
    setVatPayable(null);
    setSalesSummary(null);
    setPurchaseSummary(null);
    setVdsSummary(null);

    Promise.all([
      getVatSummary(taxMonth),
      getVatPayable(taxMonth),
      getSalesSummary(taxMonth),
      getPurchaseSummary(taxMonth),
      getVdsSummary(taxMonth),
    ])
      .then(([vs, vp, ss, ps, vds]) => {
        setVatSummary(vs);
        setVatPayable(vp);
        setSalesSummary(ss);
        setPurchaseSummary(ps);
        setVdsSummary(vds);
      })
      .finally(() => setLoading(false));
  }, [activeCompany, taxMonth]);

  const tabItems = [
    {
      key: 'vat-summary',
      label: 'VAT Summary',
      children: <VatSummaryTab data={vatSummary} taxMonth={taxMonth} />,
    },
    {
      key: 'vat-payable',
      label: 'VAT Payable',
      children: <VatPayableTab data={vatPayable} taxMonth={taxMonth} />,
    },
    {
      key: 'sales-summary',
      label: 'Sales Summary',
      children: <InvoiceSummaryTab data={salesSummary} type="sales-summary" taxMonth={taxMonth} />,
    },
    {
      key: 'purchase-summary',
      label: 'Purchase Summary',
      children: <InvoiceSummaryTab data={purchaseSummary} type="purchase-summary" taxMonth={taxMonth} />,
    },
    {
      key: 'vds-summary',
      label: 'VDS Summary',
      children: <VdsSummaryTab data={vdsSummary} taxMonth={taxMonth} />,
    },
  ];

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">
            Reports
          </h2>
          <p className="text-slate-500 text-sm mt-1">Aggregated VAT data by tax month</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 font-medium">Tax Month:</span>
          <DatePicker
            picker="month"
            value={dayjs(taxMonth, 'YYYY-MM')}
            onChange={(date: Dayjs | null) => {
              if (date) setTaxMonth(date.format('YYYY-MM'));
            }}
            format="MMMM YYYY"
            allowClear={false}
          />
        </div>
      </div>

      {!activeCompany ? (
        <div className="text-center py-16 text-slate-500">Select a company to view reports.</div>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Spin size="large" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <Tabs items={tabItems} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd "E:/Desktop 1/Vat/client" && npx tsc --noEmit
```

Expected: no errors.

---

### Task 7: Wire route in App.tsx and nav item in AppLayout.tsx

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/AppLayout.tsx`

- [ ] **Step 1: Add the import and route in `App.tsx`**

Add the import alongside the other page imports:

```typescript
import ReportsPage from './pages/reports/ReportsPage';
```

Add the route inside the protected `<Route path="/">` block, alongside the other routes:

```tsx
<Route path="reports" element={<ReportsPage />} />
```

- [ ] **Step 2: Add nav item in `AppLayout.tsx`**

In `AppLayout.tsx`, find the `menuItems` array. Add a Reports entry after the `Monthly Return` item:

```typescript
{ key: '/reports', icon: 'bar_chart', label: 'Reports' },
```

- [ ] **Step 3: Type-check**

```bash
cd "E:/Desktop 1/Vat/client" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd "E:/Desktop 1/Vat"
git add client/src/types/index.ts \
        client/src/services/reports.service.ts \
        client/src/pages/reports/ReportsPage.tsx \
        client/src/App.tsx \
        client/src/components/AppLayout.tsx
git commit -m "feat: add Reports page with VAT summary, payable, sales/purchase summary, and VDS summary tabs"
```

---

### Task 8: Fix Dashboard KPI cards

**Files:**
- Modify: `client/src/pages/Dashboard.tsx`

- [ ] **Step 1: Replace the three parallel fetches with vat-summary + invoices**

In `Dashboard.tsx`, replace the entire `Stats` interface and `useEffect` with the following:

Replace the `Stats` interface:

```typescript
interface Stats {
  invoices: Invoice[];
  salesCount: number;
  purchaseCount: number;
  totalSalesValue: number;
  totalPurchaseValue: number;
  outputVat: number;
  inputVat: number;
  sdPayable: number;
  vdsCredit: number;
  netPayable: number;
  draftCount: number;
  approvedCount: number;
}

const emptyStats: Stats = {
  invoices: [],
  salesCount: 0,
  purchaseCount: 0,
  totalSalesValue: 0,
  totalPurchaseValue: 0,
  outputVat: 0,
  inputVat: 0,
  sdPayable: 0,
  vdsCredit: 0,
  netPayable: 0,
  draftCount: 0,
  approvedCount: 0,
};
```

Add the import for `getVatSummary` alongside the existing `api` import:

```typescript
import { getVatSummary } from '../services/reports.service';
```

Replace the `useEffect` that currently calls `/products`, `/customers`, `/invoices`:

```typescript
useEffect(() => {
  if (!activeCompany) { setLoading(false); return; }
  setLoading(true);

  const currentTaxMonth = dayjs().format('YYYY-MM');

  Promise.all([
    getVatSummary(currentTaxMonth),
    api.get('/invoices').catch(() => ({ data: { data: [] } })),
  ]).then(([vs, iRes]) => {
    const invoices: Invoice[] = iRes.data.data || [];
    setStats({
      invoices,
      salesCount: vs.salesCount,
      purchaseCount: vs.purchaseCount,
      totalSalesValue: vs.totalSalesValue,
      totalPurchaseValue: vs.totalPurchaseValue,
      outputVat: vs.outputVat,
      inputVat: vs.inputVat,
      sdPayable: vs.sdPayable,
      vdsCredit: vs.vdsCredit,
      netPayable: vs.netPayable,
      draftCount: invoices.filter(i => i.status === 'draft').length,
      approvedCount: invoices.filter(i => i.status === 'approved' || i.status === 'locked').length,
    });
  }).finally(() => setLoading(false));
}, [activeCompany]);
```

- [ ] **Step 2: Update the KPI cards and Financial Summary to use the new stats fields**

In the KPI cards section, replace the four cards with:

```tsx
{/* Output VAT */}
<div className="bg-surface-container-low p-5 rounded-2xl relative overflow-hidden group">
  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Output VAT</p>
  <h3 className="font-headline text-2xl lg:text-3xl font-black text-on-surface mb-1">{`৳ ${fmt(s.outputVat)}`}</h3>
  <div className="flex items-center gap-1.5 text-primary font-bold text-xs">
    <M name="trending_up" className="text-sm" />
    <span>{s.salesCount} sales</span>
  </div>
  <div className="absolute -right-3 -bottom-3 opacity-[0.04] group-hover:scale-110 transition-transform duration-700">
    <M name="receipt" className="text-[80px]" />
  </div>
</div>

{/* Input VAT */}
<div className="bg-surface-container-low p-5 rounded-2xl relative overflow-hidden group">
  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Input Tax Credit</p>
  <h3 className="font-headline text-2xl lg:text-3xl font-black text-on-surface mb-1">{`৳ ${fmt(s.inputVat)}`}</h3>
  <div className="flex items-center gap-1.5 text-primary font-bold text-xs">
    <M name="trending_down" className="text-sm" />
    <span>{s.purchaseCount} purchases</span>
  </div>
</div>

{/* Net VAT — Featured */}
<div className="bg-primary text-on-primary p-5 rounded-2xl shadow-xl shadow-primary/20 relative">
  <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-3">Net VAT Payable</p>
  <h3 className="font-headline text-2xl lg:text-3xl font-black mb-1">{`৳ ${fmt(Math.max(0, s.netPayable))}`}</h3>
  <p className="text-[10px] font-medium opacity-60 leading-snug">After input credit &amp; VDS rebates</p>
  <span className="inline-block mt-3 px-2 py-0.5 bg-white/10 rounded text-[10px] font-bold">
    {dayjs().format('MMMM YYYY')}
  </span>
</div>

{/* Invoice Summary */}
<div className="bg-surface-container-low p-5 rounded-2xl">
  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Invoices</p>
  <h3 className="font-headline text-2xl lg:text-3xl font-black text-on-surface mb-1">{s.salesCount + s.purchaseCount}</h3>
  <div className="flex items-center gap-1.5 text-tertiary font-bold text-xs">
    <M name="pending_actions" className="text-sm" />
    <span>{s.draftCount} draft &middot; {s.approvedCount} approved</span>
  </div>
</div>
```

In the Financial Summary sidebar, replace the rows array with:

```tsx
{([
  { label: 'Total Sales',      value: `৳ ${fmt(s.totalSalesValue)}`,    icon: 'trending_up',    ic: 'text-[#00503a]' },
  { label: 'Total Purchases',  value: `৳ ${fmt(s.totalPurchaseValue)}`, icon: 'trending_down',  ic: 'text-[#584200]' },
  { label: 'Output VAT',       value: `৳ ${fmt(s.outputVat)}`,          icon: 'receipt',        ic: 'text-[#00503a]' },
  { label: 'Input VAT Credit', value: `৳ ${fmt(s.inputVat)}`,           icon: 'credit_card',    ic: 'text-[#465f88]' },
  { label: 'Fiscal Year',      value: fiscalYear(),                       icon: 'calendar_month', ic: 'text-slate-500' },
]).map((row) => (
  <div key={row.label} className="flex justify-between items-center py-1">
    <div className="flex items-center gap-2 min-w-0">
      <M name={row.icon} className={`text-base ${row.ic} flex-shrink-0`} />
      <span className="text-xs text-slate-500 truncate">{row.label}</span>
    </div>
    <span className="text-sm font-bold text-on-surface whitespace-nowrap ml-2">{row.value}</span>
  </div>
))}

Remove any references to deleted fields (`totalProducts`, `totalCustomers`, `salesInvoices`, `purchaseInvoices`, `totalSales`, `totalPurchases`). The recent invoices table uses `s.invoices` directly — keep that unchanged (`const recent = s.invoices.slice(0, 5)`).

- [ ] **Step 3: Type-check**

```bash
cd "E:/Desktop 1/Vat/client" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd "E:/Desktop 1/Vat"
git add client/src/pages/Dashboard.tsx
git commit -m "fix: scope Dashboard KPI cards to current tax month via vat-summary API"
```
