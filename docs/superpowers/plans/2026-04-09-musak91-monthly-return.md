# Musak 9.1 Monthly Return — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Musak 9.1 monthly VAT return module — auto-aggregation from invoices and VDS certificates, manual adjustments, draft → reviewed → submitted → locked workflow, bilingual PDF, and stub NBR export.

**Architecture:** Persisted `vat_returns` table stores auto-calculated fields plus manual adjustments. Generation endpoint aggregates from existing invoices/VDS data and saves a snapshot. Status transitions are admin-only; operators can generate and view. Full 24-section JSON blob stored in `musak_91_json` for future extension.

**Tech Stack:** Express + Prisma + MySQL (server), React + Ant Design + Tailwind (client), Puppeteer + Handlebars (PDF), Zod (validation), TypeScript strict mode throughout.

---

## File Map

**New — Server:**
- `server/src/validators/return.validator.ts` — Zod schemas: `generateReturnSchema`, `updateReturnSchema`
- `server/src/services/return.service.ts` — aggregation, CRUD, status transitions, serialization
- `server/src/controllers/return.controller.ts` — thin request handlers
- `server/src/routes/return.routes.ts` — route definitions
- `server/src/templates/musak91.html` — bilingual Handlebars PDF template

**Modified — Server:**
- `server/prisma/schema.prisma` — add `VatReturnStatus` enum, `VatReturn` model, relations on `User` and `Company`
- `server/src/services/pdf.service.ts` — add `generateMusak91Pdf()` export
- `server/src/app.ts` — import and mount `returnRoutes`

**New — Client:**
- `client/src/services/return.ts` — API calls
- `client/src/pages/returns/ReturnList.tsx` — list page with generate button
- `client/src/pages/returns/ReturnDetail.tsx` — detail/edit page with workflow actions

**Modified — Client:**
- `client/src/types/index.ts` — add `VatReturnStatus`, `VatReturn` types
- `client/src/App.tsx` — add routes `/returns` and `/returns/:id`
- `client/src/components/AppLayout.tsx` — add "Monthly Return" nav item

---

## Task 1: Prisma Schema — VatReturn Model

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add `VatReturnStatus` enum and `VatReturn` model to schema**

Open `server/prisma/schema.prisma`. After the `TreasuryDepositStatus` enum (line 221), add:

```prisma
enum VatReturnStatus {
  draft
  reviewed
  submitted
  locked
}
```

After the `VdsCertificateDeposit` model (end of file), add:

```prisma
model VatReturn {
  id                   BigInt          @id @default(autoincrement())
  companyId            BigInt          @map("company_id")
  taxMonth             String          @map("tax_month") @db.Char(7)
  fiscalYear           String          @map("fiscal_year") @db.VarChar(9)

  totalSalesValue      Decimal         @map("total_sales_value") @db.Decimal(14, 2)
  outputVat            Decimal         @map("output_vat") @db.Decimal(14, 2)
  sdPayable            Decimal         @map("sd_payable") @db.Decimal(14, 2)
  totalPurchaseValue   Decimal         @map("total_purchase_value") @db.Decimal(14, 2)
  inputVat             Decimal         @map("input_vat") @db.Decimal(14, 2)
  vdsCredit            Decimal         @map("vds_credit") @db.Decimal(14, 2)

  carryForward         Decimal         @default(0) @map("carry_forward") @db.Decimal(14, 2)
  increasingAdjustment Decimal         @default(0) @map("increasing_adjustment") @db.Decimal(14, 2)
  decreasingAdjustment Decimal         @default(0) @map("decreasing_adjustment") @db.Decimal(14, 2)
  notes                String?         @db.Text

  netPayable           Decimal         @map("net_payable") @db.Decimal(14, 2)
  musak91Json          Json            @map("musak_91_json")

  status               VatReturnStatus @default(draft)
  generatedBy          BigInt          @map("generated_by")
  reviewedBy           BigInt?         @map("reviewed_by")
  submittedAt          DateTime?       @map("submitted_at")
  lockedAt             DateTime?       @map("locked_at")
  createdAt            DateTime        @default(now()) @map("created_at")
  updatedAt            DateTime        @updatedAt @map("updated_at")

  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  generator User    @relation("vatReturnGenerator", fields: [generatedBy], references: [id])
  reviewer  User?   @relation("vatReturnReviewer", fields: [reviewedBy], references: [id])

  @@unique([companyId, taxMonth])
  @@map("vat_returns")
}
```

- [ ] **Step 2: Add relations to `User` and `Company` models**

In the `User` model (around line 20), add these two lines to the relations block:

```prisma
  generatedReturns VatReturn[] @relation("vatReturnGenerator")
  reviewedReturns  VatReturn[] @relation("vatReturnReviewer")
```

In the `Company` model (around line 57), add:

```prisma
  vatReturns       VatReturn[]
```

- [ ] **Step 3: Push schema to database**

```bash
cd server && npm run db:push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 4: Verify Prisma client regenerated**

```bash
cd server && npx prisma generate
```

Expected: `Generated Prisma Client`.

- [ ] **Step 5: Commit**

```bash
cd ..
git add server/prisma/schema.prisma
git commit -m "feat: add VatReturn model to Prisma schema"
```

---

## Task 2: Validator

**Files:**
- Create: `server/src/validators/return.validator.ts`

- [ ] **Step 1: Create the validator file**

```typescript
import { z } from 'zod';

export const generateReturnSchema = z.object({
  taxMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'taxMonth must be YYYY-MM format'),
});

export const updateReturnSchema = z.object({
  carryForward: z.number().min(0).optional(),
  increasingAdjustment: z.number().min(0).optional(),
  decreasingAdjustment: z.number().min(0).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export type GenerateReturnInput = z.infer<typeof generateReturnSchema>;
export type UpdateReturnInput = z.infer<typeof updateReturnSchema>;
```

- [ ] **Step 2: Type-check**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/validators/return.validator.ts
git commit -m "feat: add Musak 9.1 return Zod validators"
```

---

## Task 3: Return Service

**Files:**
- Create: `server/src/services/return.service.ts`

- [ ] **Step 1: Create the service file**

```typescript
import prisma from '../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import type { GenerateReturnInput, UpdateReturnInput } from '../validators/return.validator';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function getFiscalYear(taxMonth: string): string {
  const [year, month] = taxMonth.split('-').map(Number);
  return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

function buildMusak91Json(data: {
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
}): Record<string, number> {
  return {
    section_1_sales_value: data.totalSalesValue,
    section_2_output_vat: data.outputVat,
    section_3_sd_payable: data.sdPayable,
    section_4_purchase_value: data.totalPurchaseValue,
    section_5_input_vat: data.inputVat,
    section_6_vds_credit: data.vdsCredit,
    section_7_carry_forward: data.carryForward,
    section_8_increasing_adjustment: data.increasingAdjustment,
    section_9_decreasing_adjustment: data.decreasingAdjustment,
    section_10_net_payable: data.netPayable,
    // Sections 11–24: placeholders for future NBR extension
    section_11_import_vat: 0,
    section_12_export_zero_rating: 0,
    section_13_exemptions: 0,
    section_14_penalty: 0,
    section_15_interest: 0,
    section_16: 0,
    section_17: 0,
    section_18: 0,
    section_19: 0,
    section_20: 0,
    section_21: 0,
    section_22: 0,
    section_23: 0,
    section_24: 0,
  };
}

export async function generateReturn(
  companyId: bigint,
  userId: bigint,
  input: GenerateReturnInput,
) {
  const { taxMonth } = input;
  const fiscalYear = getFiscalYear(taxMonth);

  const [year, month] = taxMonth.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // last day of month

  const existing = await prisma.vatReturn.findUnique({
    where: { companyId_taxMonth: { companyId, taxMonth } },
  });

  if (existing && (existing.status === 'submitted' || existing.status === 'locked')) {
    throw new Error(`Cannot regenerate a ${existing.status} return`);
  }

  // Aggregate sales invoices
  const salesAgg = await prisma.invoice.aggregate({
    where: {
      companyId,
      invoiceType: 'sales',
      status: { not: 'cancelled' },
      challanDate: { gte: startDate, lte: endDate },
    },
    _sum: { grandTotal: true, vatTotal: true, sdTotal: true },
  });

  // Aggregate purchase invoices
  const purchaseAgg = await prisma.invoice.aggregate({
    where: {
      companyId,
      invoiceType: 'purchase',
      status: { not: 'cancelled' },
      challanDate: { gte: startDate, lte: endDate },
    },
    _sum: { grandTotal: true, vatTotal: true },
  });

  // Aggregate VDS credit (finalized, deductee role, this tax month)
  const vdsAgg = await prisma.vdsCertificate.aggregate({
    where: { companyId, status: 'finalized', role: 'deductee', taxMonth },
    _sum: { vdsAmount: true },
  });

  const totalSalesValue = round2(Number(salesAgg._sum.grandTotal ?? 0));
  const outputVat = round2(Number(salesAgg._sum.vatTotal ?? 0));
  const sdPayable = round2(Number(salesAgg._sum.sdTotal ?? 0));
  const totalPurchaseValue = round2(Number(purchaseAgg._sum.grandTotal ?? 0));
  const inputVat = round2(Number(purchaseAgg._sum.vatTotal ?? 0));
  const vdsCredit = round2(Number(vdsAgg._sum.vdsAmount ?? 0));

  // Preserve manual adjustments when re-generating
  const carryForward = existing ? round2(Number(existing.carryForward)) : 0;
  const increasingAdjustment = existing ? round2(Number(existing.increasingAdjustment)) : 0;
  const decreasingAdjustment = existing ? round2(Number(existing.decreasingAdjustment)) : 0;
  const notes = existing?.notes ?? null;

  const netPayable = round2(
    outputVat + sdPayable - inputVat - vdsCredit - carryForward + increasingAdjustment - decreasingAdjustment,
  );

  const musak91Json = buildMusak91Json({
    totalSalesValue, outputVat, sdPayable,
    totalPurchaseValue, inputVat, vdsCredit,
    carryForward, increasingAdjustment, decreasingAdjustment, netPayable,
  });

  const fields = {
    companyId,
    taxMonth,
    fiscalYear,
    totalSalesValue: new Decimal(totalSalesValue),
    outputVat: new Decimal(outputVat),
    sdPayable: new Decimal(sdPayable),
    totalPurchaseValue: new Decimal(totalPurchaseValue),
    inputVat: new Decimal(inputVat),
    vdsCredit: new Decimal(vdsCredit),
    carryForward: new Decimal(carryForward),
    increasingAdjustment: new Decimal(increasingAdjustment),
    decreasingAdjustment: new Decimal(decreasingAdjustment),
    notes,
    netPayable: new Decimal(netPayable),
    musak91Json,
    generatedBy: userId,
  };

  if (existing) {
    return prisma.vatReturn.update({
      where: { id: existing.id },
      data: { ...fields, status: 'draft', reviewedBy: null, submittedAt: null, lockedAt: null },
    });
  }

  return prisma.vatReturn.create({ data: fields });
}

export async function listReturns(companyId: bigint, fiscalYear?: string) {
  return prisma.vatReturn.findMany({
    where: { companyId, ...(fiscalYear ? { fiscalYear } : {}) },
    orderBy: { taxMonth: 'desc' },
  });
}

export async function getReturnById(companyId: bigint, id: bigint) {
  return prisma.vatReturn.findFirst({ where: { id, companyId } });
}

export async function updateReturn(
  companyId: bigint,
  id: bigint,
  input: UpdateReturnInput,
) {
  const ret = await prisma.vatReturn.findFirst({ where: { id, companyId } });
  if (!ret) return null;
  if (ret.status !== 'draft') throw new Error('Only draft returns can be updated');

  const carryForward = input.carryForward ?? round2(Number(ret.carryForward));
  const increasingAdjustment = input.increasingAdjustment ?? round2(Number(ret.increasingAdjustment));
  const decreasingAdjustment = input.decreasingAdjustment ?? round2(Number(ret.decreasingAdjustment));

  const netPayable = round2(
    Number(ret.outputVat) + Number(ret.sdPayable)
    - Number(ret.inputVat) - Number(ret.vdsCredit)
    - carryForward + increasingAdjustment - decreasingAdjustment,
  );

  const musak91Json = buildMusak91Json({
    totalSalesValue: Number(ret.totalSalesValue),
    outputVat: Number(ret.outputVat),
    sdPayable: Number(ret.sdPayable),
    totalPurchaseValue: Number(ret.totalPurchaseValue),
    inputVat: Number(ret.inputVat),
    vdsCredit: Number(ret.vdsCredit),
    carryForward,
    increasingAdjustment,
    decreasingAdjustment,
    netPayable,
  });

  return prisma.vatReturn.update({
    where: { id },
    data: {
      carryForward: new Decimal(carryForward),
      increasingAdjustment: new Decimal(increasingAdjustment),
      decreasingAdjustment: new Decimal(decreasingAdjustment),
      notes: input.notes !== undefined ? input.notes : ret.notes,
      netPayable: new Decimal(netPayable),
      musak91Json,
    },
  });
}

export async function transitionStatus(
  companyId: bigint,
  id: bigint,
  userId: bigint,
  action: 'review' | 'submit' | 'lock',
) {
  const ret = await prisma.vatReturn.findFirst({ where: { id, companyId } });
  if (!ret) return null;

  const transitions = {
    review: { from: 'draft' as const, to: 'reviewed' as const, extra: { reviewedBy: userId } },
    submit: { from: 'reviewed' as const, to: 'submitted' as const, extra: { submittedAt: new Date() } },
    lock:   { from: 'submitted' as const, to: 'locked' as const, extra: { lockedAt: new Date() } },
  };

  const t = transitions[action];
  if (ret.status !== t.from) {
    throw new Error(`Cannot ${action} a ${ret.status} return`);
  }

  return prisma.vatReturn.update({
    where: { id },
    data: { status: t.to, ...t.extra },
  });
}

export function serializeReturn(ret: any) {
  return {
    ...ret,
    id: ret.id.toString(),
    companyId: ret.companyId.toString(),
    generatedBy: ret.generatedBy.toString(),
    reviewedBy: ret.reviewedBy?.toString() ?? null,
    totalSalesValue: Number(ret.totalSalesValue),
    outputVat: Number(ret.outputVat),
    sdPayable: Number(ret.sdPayable),
    totalPurchaseValue: Number(ret.totalPurchaseValue),
    inputVat: Number(ret.inputVat),
    vdsCredit: Number(ret.vdsCredit),
    carryForward: Number(ret.carryForward),
    increasingAdjustment: Number(ret.increasingAdjustment),
    decreasingAdjustment: Number(ret.decreasingAdjustment),
    netPayable: Number(ret.netPayable),
  };
}
```

- [ ] **Step 2: Type-check**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/services/return.service.ts
git commit -m "feat: add Musak 9.1 return service with aggregation and workflow"
```

---

## Task 4: PDF Template

**Files:**
- Create: `server/src/templates/musak91.html`
- Modify: `server/src/services/pdf.service.ts`

- [ ] **Step 1: Create the Handlebars PDF template**

Create `server/src/templates/musak91.html`:

```html
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Noto Sans Bengali', sans-serif; font-size: 11px; padding: 20px; color: #333; }
    .musak-no { font-size: 10px; color: #999; margin-bottom: 4px; }
    .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #000; padding-bottom: 10px; }
    .header h1 { font-size: 16px; font-weight: 700; }
    .header h2 { font-size: 13px; font-weight: 600; margin-top: 4px; }
    .section { margin-bottom: 16px; }
    .section-title { font-weight: 700; font-size: 12px; margin-bottom: 8px; border-bottom: 1px solid #999; padding-bottom: 4px; }
    .info-row { display: flex; margin-bottom: 4px; }
    .info-label { font-weight: 600; min-width: 260px; }
    .info-value { flex: 1; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th, td { border: 1px solid #333; padding: 6px 8px; font-size: 10px; }
    th { background: #f0f0f0; font-weight: 700; text-align: left; }
    td.number { text-align: right; }
    .net-payable { font-weight: 700; font-size: 13px; background: #e8f5e9; }
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
    .footer { margin-top: 40px; display: flex; justify-content: space-between; }
    .signature { text-align: center; border-top: 1px solid #333; padding-top: 4px; min-width: 180px; }
    .notice { margin-top: 20px; padding: 8px; border: 1px dashed #999; font-size: 9px; color: #666; }
  </style>
</head>
<body>
  <div class="musak-no">মূসক-৯.১ / Musak-9.1</div>
  <div class="header">
    <h1>মাসিক ভ্যাট রিটার্ন / Monthly VAT Return</h1>
    <h2>Value Added Tax and Supplementary Duty Act, 2012</h2>
  </div>

  <div class="section">
    <div class="section-title">প্রতিষ্ঠানের তথ্য / Company Information</div>
    <div class="info-row"><span class="info-label">প্রতিষ্ঠানের নাম / Company Name:</span><span class="info-value">{{companyName}}</span></div>
    <div class="info-row"><span class="info-label">BIN:</span><span class="info-value">{{companyBin}}</span></div>
    <div class="info-row"><span class="info-label">ঠিকানা / Address:</span><span class="info-value">{{companyAddress}}</span></div>
    <div class="info-row"><span class="info-label">কর মাস / Tax Month:</span><span class="info-value">{{taxMonth}}</span></div>
    <div class="info-row"><span class="info-label">অর্থ বৎসর / Fiscal Year:</span><span class="info-value">{{fiscalYear}}</span></div>
    <div class="info-row"><span class="info-label">অবস্থা / Status:</span><span class="info-value">{{status}}</span></div>
  </div>

  <div class="section">
    <div class="section-title">বিক্রয় তথ্য / Output Tax (Sales)</div>
    <table>
      <thead>
        <tr><th>বিবরণ / Description</th><th style="text-align:right">পরিমাণ (টাকা) / Amount (BDT)</th></tr>
      </thead>
      <tbody>
        <tr><td>মোট বিক্রয় মূল্য / Total Sales Value</td><td class="number">{{formatNumber totalSalesValue}}</td></tr>
        <tr><td>আউটপুট ভ্যাট / Output VAT</td><td class="number">{{formatNumber outputVat}}</td></tr>
        <tr><td>সম্পূরক শুল্ক / Supplementary Duty (SD)</td><td class="number">{{formatNumber sdPayable}}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">ক্রয় তথ্য / Input Tax Credit (Purchases)</div>
    <table>
      <thead>
        <tr><th>বিবরণ / Description</th><th style="text-align:right">পরিমাণ (টাকা) / Amount (BDT)</th></tr>
      </thead>
      <tbody>
        <tr><td>মোট ক্রয় মূল্য / Total Purchase Value</td><td class="number">{{formatNumber totalPurchaseValue}}</td></tr>
        <tr><td>ইনপুট ট্যাক্স ক্রেডিট / Input VAT Credit</td><td class="number">{{formatNumber inputVat}}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">সমন্বয় / Adjustments</div>
    <table>
      <thead>
        <tr><th>বিবরণ / Description</th><th style="text-align:right">পরিমাণ (টাকা) / Amount (BDT)</th></tr>
      </thead>
      <tbody>
        <tr><td>উৎসে কর্তিত ক্রেডিট / VDS Credit</td><td class="number">{{formatNumber vdsCredit}}</td></tr>
        <tr><td>পূর্ববর্তী মাসের ক্রেডিট / Carry Forward</td><td class="number">{{formatNumber carryForward}}</td></tr>
        <tr><td>বর্ধিত সমন্বয় / Increasing Adjustment</td><td class="number">{{formatNumber increasingAdjustment}}</td></tr>
        <tr><td>হ্রাসমান সমন্বয় / Decreasing Adjustment</td><td class="number">{{formatNumber decreasingAdjustment}}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <table>
      <tbody>
        <tr class="net-payable">
          <td>প্রদেয় কর (নিট) / Net VAT Payable</td>
          <td class="number">{{formatNumber netPayable}}</td>
        </tr>
      </tbody>
    </table>
  </div>

  {{#if notes}}
  <div class="notice">
    <strong>মন্তব্য / Notes:</strong> {{notes}}
  </div>
  {{/if}}

  <div class="notice">
    আমি ঘোষণা করিতেছি যে এই রিটার্নে প্রদত্ত তথ্যাদি সত্য ও সঠিক।<br>
    I declare that the information provided in this return is true and correct.
  </div>

  <div class="footer">
    <div class="signature">করদাতার স্বাক্ষর ও সীল<br>Taxpayer's Signature & Seal</div>
    <div class="signature">তারিখ / Date</div>
  </div>
</body>
</html>
```

- [ ] **Step 2: Add `generateMusak91Pdf` to `pdf.service.ts`**

Append this function to `server/src/services/pdf.service.ts`:

```typescript
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
```

- [ ] **Step 3: Type-check**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/templates/musak91.html server/src/services/pdf.service.ts
git commit -m "feat: add Musak 9.1 PDF template and generator"
```

---

## Task 5: Controller

**Files:**
- Create: `server/src/controllers/return.controller.ts`

- [ ] **Step 1: Create the controller**

```typescript
import { Request, Response } from 'express';
import * as returnService from '../services/return.service';
import { generateReturnSchema, updateReturnSchema } from '../validators/return.validator';
import { success, created, error, notFound, forbidden } from '../utils/response';
import { generateMusak91Pdf } from '../services/pdf.service';
import prisma from '../utils/prisma';

export async function listReturns(req: Request, res: Response) {
  const { fiscalYear } = req.query as { fiscalYear?: string };
  const returns = await returnService.listReturns(req.companyId!, fiscalYear);
  return success(res, returns.map(returnService.serializeReturn));
}

export async function generateReturn(req: Request, res: Response) {
  const parsed = generateReturnSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }
  try {
    const ret = await returnService.generateReturn(
      req.companyId!,
      BigInt(req.user!.userId),
      parsed.data,
    );
    return created(res, returnService.serializeReturn(ret));
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function getReturn(req: Request, res: Response) {
  const ret = await returnService.getReturnById(req.companyId!, BigInt(req.params.id));
  if (!ret) return notFound(res, 'Return not found');
  return success(res, returnService.serializeReturn(ret));
}

export async function updateReturn(req: Request, res: Response) {
  const parsed = updateReturnSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }
  try {
    const ret = await returnService.updateReturn(req.companyId!, BigInt(req.params.id), parsed.data);
    if (!ret) return notFound(res, 'Return not found');
    return success(res, returnService.serializeReturn(ret));
  } catch (err: any) {
    return error(res, err.message);
  }
}

async function handleTransition(action: 'review' | 'submit' | 'lock') {
  return async (req: Request, res: Response) => {
    if (req.companyRole !== 'admin') return forbidden(res, 'Only admins can perform this action');
    try {
      const ret = await returnService.transitionStatus(
        req.companyId!,
        BigInt(req.params.id),
        BigInt(req.user!.userId),
        action,
      );
      if (!ret) return notFound(res, 'Return not found');
      return success(res, returnService.serializeReturn(ret));
    } catch (err: any) {
      return error(res, err.message);
    }
  };
}

export const reviewReturn = handleTransition('review');
export const submitReturn = handleTransition('submit');
export const lockReturn = handleTransition('lock');

export async function getReturnPdf(req: Request, res: Response) {
  const ret = await returnService.getReturnById(req.companyId!, BigInt(req.params.id));
  if (!ret) return notFound(res, 'Return not found');

  // Fetch company info for PDF header
  const company = await prisma.company.findUnique({ where: { id: ret.companyId } });
  if (!company) return notFound(res, 'Company not found');

  try {
    const pdfBuffer = await generateMusak91Pdf({
      ...returnService.serializeReturn(ret),
      companyName: company.name,
      companyBin: company.bin,
      companyAddress: company.address,
    });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="musak91-${ret.taxMonth}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err: any) {
    return error(res, `PDF generation failed: ${err.message}`, 500);
  }
}

export async function nbrExport(req: Request, res: Response) {
  if (req.companyRole !== 'admin') return forbidden(res, 'Only admins can export');
  const ret = await returnService.getReturnById(req.companyId!, BigInt(req.params.id));
  if (!ret) return notFound(res, 'Return not found');
  return success(res, ret.musak91Json);
}
```

- [ ] **Step 2: Type-check**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/controllers/return.controller.ts
git commit -m "feat: add Musak 9.1 return controller"
```

---

## Task 6: Routes + App Mount

**Files:**
- Create: `server/src/routes/return.routes.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Create routes file**

```typescript
import { Router } from 'express';
import * as returnController from '../controllers/return.controller';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';

const router = Router();

router.use(authenticate, companyScope);

// Specific action routes BEFORE parameterized routes
router.post('/generate', returnController.generateReturn);
router.get('/', returnController.listReturns);
router.post('/:id/review', returnController.reviewReturn);
router.post('/:id/submit', returnController.submitReturn);
router.post('/:id/lock', returnController.lockReturn);
router.get('/:id/pdf', returnController.getReturnPdf);
router.get('/:id/nbr-export', returnController.nbrExport);
router.get('/:id', returnController.getReturn);
router.put('/:id', returnController.updateReturn);

export default router;
```

- [ ] **Step 2: Mount in `app.ts`**

Add the import after the existing imports (line 9):

```typescript
import returnRoutes from './routes/return.routes';
```

Add the route mount after `registerRoutes` (line 28):

```typescript
app.use('/api/v1/returns', returnRoutes);
```

- [ ] **Step 3: Type-check and start server to confirm it boots**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/return.routes.ts server/src/app.ts
git commit -m "feat: mount Musak 9.1 return routes at /api/v1/returns"
```

---

## Task 7: Client Types

**Files:**
- Modify: `client/src/types/index.ts`

- [ ] **Step 1: Add `VatReturnStatus` and `VatReturn` types at the end of the file**

```typescript
export type VatReturnStatus = 'draft' | 'reviewed' | 'submitted' | 'locked';

export interface VatReturn {
  id: string;
  companyId: string;
  taxMonth: string;
  fiscalYear: string;
  totalSalesValue: number;
  outputVat: number;
  sdPayable: number;
  totalPurchaseValue: number;
  inputVat: number;
  vdsCredit: number;
  carryForward: number;
  increasingAdjustment: number;
  decreasingAdjustment: number;
  notes: string | null;
  netPayable: number;
  musak91Json: Record<string, number>;
  status: VatReturnStatus;
  generatedBy: string;
  reviewedBy: string | null;
  submittedAt: string | null;
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Type-check client**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/types/index.ts
git commit -m "feat: add VatReturn TypeScript types"
```

---

## Task 8: Client Service

**Files:**
- Create: `client/src/services/return.ts`

- [ ] **Step 1: Create the service file**

```typescript
import api from './api';
import { ApiResponse, VatReturn } from '../types';

export async function listReturns(fiscalYear?: string) {
  const params = fiscalYear ? { fiscalYear } : {};
  const { data } = await api.get<ApiResponse<VatReturn[]>>('/returns', { params });
  return data.data!;
}

export async function generateReturn(taxMonth: string) {
  const { data } = await api.post<ApiResponse<VatReturn>>('/returns/generate', { taxMonth });
  return data.data!;
}

export async function getReturn(id: string) {
  const { data } = await api.get<ApiResponse<VatReturn>>(`/returns/${id}`);
  return data.data!;
}

export async function updateReturn(
  id: string,
  fields: { carryForward?: number; increasingAdjustment?: number; decreasingAdjustment?: number; notes?: string | null },
) {
  const { data } = await api.put<ApiResponse<VatReturn>>(`/returns/${id}`, fields);
  return data.data!;
}

export async function reviewReturn(id: string) {
  const { data } = await api.post<ApiResponse<VatReturn>>(`/returns/${id}/review`);
  return data.data!;
}

export async function submitReturn(id: string) {
  const { data } = await api.post<ApiResponse<VatReturn>>(`/returns/${id}/submit`);
  return data.data!;
}

export async function lockReturn(id: string) {
  const { data } = await api.post<ApiResponse<VatReturn>>(`/returns/${id}/lock`);
  return data.data!;
}

export async function downloadReturnPdf(id: string, taxMonth: string) {
  const response = await api.get(`/returns/${id}/pdf`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `musak91-${taxMonth}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function exportNbr(id: string) {
  const { data } = await api.get<ApiResponse<Record<string, number>>>(`/returns/${id}/nbr-export`);
  return data.data!;
}
```

- [ ] **Step 2: Type-check**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/services/return.ts
git commit -m "feat: add Musak 9.1 return client service"
```

---

## Task 9: ReturnList Page

**Files:**
- Create: `client/src/pages/returns/ReturnList.tsx`

- [ ] **Step 1: Create the list page**

```typescript
import { useEffect, useState } from 'react';
import { Table, Button, Space, Typography, message, Tag, Select, Popconfirm, DatePicker } from 'antd';
import { SyncOutlined, FilePdfOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { VatReturn, VatReturnStatus } from '../../types';
import { listReturns, generateReturn, downloadReturnPdf } from '../../services/return';

const { Title } = Typography;

const statusColors: Record<VatReturnStatus, string> = {
  draft: 'default',
  reviewed: 'blue',
  submitted: 'orange',
  locked: 'green',
};

export default function ReturnList() {
  const [returns, setReturns] = useState<VatReturn[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [fiscalYear, setFiscalYear] = useState<string | undefined>();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const data = await listReturns(fiscalYear);
      setReturns(data);
    } catch {
      message.error('Failed to load returns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReturns(); }, [fiscalYear]);

  const handleGenerate = async () => {
    if (!selectedMonth) return message.warning('Select a tax month first');
    setGenerating(true);
    try {
      await generateReturn(selectedMonth);
      message.success(`Return for ${selectedMonth} generated`);
      fetchReturns();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to generate return');
    } finally {
      setGenerating(false);
    }
  };

  const handlePdf = async (id: string, taxMonth: string) => {
    try {
      await downloadReturnPdf(id, taxMonth);
    } catch {
      message.error('Failed to generate PDF');
    }
  };

  const columns = [
    { title: 'Tax Month', dataIndex: 'taxMonth', key: 'taxMonth' },
    { title: 'Fiscal Year', dataIndex: 'fiscalYear', key: 'fiscalYear' },
    {
      title: 'Output VAT', dataIndex: 'outputVat', key: 'outputVat',
      render: (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    },
    {
      title: 'Input VAT', dataIndex: 'inputVat', key: 'inputVat',
      render: (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    },
    {
      title: 'Net Payable', dataIndex: 'netPayable', key: 'netPayable',
      render: (v: number) => (
        <strong>{v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
      ),
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (s: VatReturnStatus) => <Tag color={statusColors[s]}>{s.toUpperCase()}</Tag>,
    },
    {
      title: 'Actions', key: 'actions',
      render: (_: unknown, record: VatReturn) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/returns/${record.id}`)}>
            View
          </Button>
          <Button size="small" icon={<FilePdfOutlined />} onClick={() => handlePdf(record.id, record.taxMonth)} />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>মূসক-৯.১ / Musak 9.1 — Monthly Returns</Title>
      </div>
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="Fiscal Year"
          allowClear
          style={{ width: 160 }}
          onChange={setFiscalYear}
          options={[
            { value: '2025-2026', label: '2025-2026' },
            { value: '2024-2025', label: '2024-2025' },
          ]}
        />
        <DatePicker
          picker="month"
          placeholder="Select tax month"
          onChange={(date) => setSelectedMonth(date ? date.format('YYYY-MM') : null)}
          value={selectedMonth ? dayjs(selectedMonth, 'YYYY-MM') : null}
        />
        <Popconfirm
          title={`Generate return for ${selectedMonth || '...'}?`}
          onConfirm={handleGenerate}
          disabled={!selectedMonth}
        >
          <Button
            type="primary"
            icon={<SyncOutlined />}
            loading={generating}
            disabled={!selectedMonth}
          >
            Generate
          </Button>
        </Popconfirm>
      </Space>
      <Table columns={columns} dataSource={returns} rowKey="id" loading={loading} />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/returns/ReturnList.tsx
git commit -m "feat: add Musak 9.1 return list page"
```

---

## Task 10: ReturnDetail Page

**Files:**
- Create: `client/src/pages/returns/ReturnDetail.tsx`

- [ ] **Step 1: Create the detail page**

```typescript
import { useEffect, useState } from 'react';
import {
  Typography, Descriptions, Form, InputNumber, Input, Button, Space,
  message, Tag, Popconfirm, Divider, Row, Col, Card,
} from 'antd';
import { ArrowLeftOutlined, FilePdfOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { VatReturn, VatReturnStatus } from '../../types';
import {
  getReturn, updateReturn, reviewReturn, submitReturn,
  lockReturn, downloadReturnPdf,
} from '../../services/return';

const { Title } = Typography;
const { TextArea } = Input;

const statusColors: Record<VatReturnStatus, string> = {
  draft: 'default',
  reviewed: 'blue',
  submitted: 'orange',
  locked: 'green',
};

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

export default function ReturnDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ret, setRet] = useState<VatReturn | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // Live net payable calculation
  const outputVat = ret?.outputVat ?? 0;
  const sdPayable = ret?.sdPayable ?? 0;
  const inputVat = ret?.inputVat ?? 0;
  const vdsCredit = ret?.vdsCredit ?? 0;
  const [liveCarry, setLiveCarry] = useState(0);
  const [liveInc, setLiveInc] = useState(0);
  const [liveDec, setLiveDec] = useState(0);
  const liveNet = +(outputVat + sdPayable - inputVat - vdsCredit - liveCarry + liveInc - liveDec).toFixed(2);

  const fetchReturn = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getReturn(id);
      setRet(data);
      form.setFieldsValue({
        carryForward: data.carryForward,
        increasingAdjustment: data.increasingAdjustment,
        decreasingAdjustment: data.decreasingAdjustment,
        notes: data.notes,
      });
      setLiveCarry(data.carryForward);
      setLiveInc(data.increasingAdjustment);
      setLiveDec(data.decreasingAdjustment);
    } catch {
      message.error('Failed to load return');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReturn(); }, [id]);

  const handleSave = async (values: any) => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await updateReturn(id, values);
      setRet(updated);
      message.success('Adjustments saved');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (action: 'review' | 'submit' | 'lock') => {
    if (!id) return;
    try {
      const fns = { review: reviewReturn, submit: submitReturn, lock: lockReturn };
      const updated = await fns[action](id);
      setRet(updated);
      message.success(`Return ${action}ed`);
    } catch (err: any) {
      message.error(err.response?.data?.error || `Failed to ${action}`);
    }
  };

  const handlePdf = async () => {
    if (!ret) return;
    try {
      await downloadReturnPdf(ret.id, ret.taxMonth);
    } catch {
      message.error('Failed to generate PDF');
    }
  };

  if (!ret) return null;

  const isDraft = ret.status === 'draft';

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/returns')}>Back</Button>
        <Title level={4} style={{ margin: 0 }}>
          Musak 9.1 — {ret.taxMonth} &nbsp;
          <Tag color={statusColors[ret.status]}>{ret.status.toUpperCase()}</Tag>
        </Title>
      </Space>

      <Row gutter={24}>
        {/* Left: Auto-calculated (read-only) */}
        <Col xs={24} lg={12}>
          <Card title="Auto-Calculated Figures" loading={loading} style={{ marginBottom: 16 }}>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Total Sales Value">৳ {fmt(ret.totalSalesValue)}</Descriptions.Item>
              <Descriptions.Item label="Output VAT">৳ {fmt(ret.outputVat)}</Descriptions.Item>
              <Descriptions.Item label="SD Payable">৳ {fmt(ret.sdPayable)}</Descriptions.Item>
              <Descriptions.Item label="Total Purchase Value">৳ {fmt(ret.totalPurchaseValue)}</Descriptions.Item>
              <Descriptions.Item label="Input VAT Credit">৳ {fmt(ret.inputVat)}</Descriptions.Item>
              <Descriptions.Item label="VDS Credit">৳ {fmt(ret.vdsCredit)}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Right: Manual adjustments */}
        <Col xs={24} lg={12}>
          <Card title="Manual Adjustments" style={{ marginBottom: 16 }}>
            <Form form={form} layout="vertical" onFinish={handleSave}>
              <Form.Item label="Carry Forward (from prev. month)" name="carryForward">
                <InputNumber
                  min={0} precision={2} style={{ width: '100%' }}
                  disabled={!isDraft}
                  onChange={(v) => setLiveCarry(v ?? 0)}
                />
              </Form.Item>
              <Form.Item label="Increasing Adjustment" name="increasingAdjustment">
                <InputNumber
                  min={0} precision={2} style={{ width: '100%' }}
                  disabled={!isDraft}
                  onChange={(v) => setLiveInc(v ?? 0)}
                />
              </Form.Item>
              <Form.Item label="Decreasing Adjustment" name="decreasingAdjustment">
                <InputNumber
                  min={0} precision={2} style={{ width: '100%' }}
                  disabled={!isDraft}
                  onChange={(v) => setLiveDec(v ?? 0)}
                />
              </Form.Item>
              <Form.Item label="Notes" name="notes">
                <TextArea rows={3} disabled={!isDraft} maxLength={2000} />
              </Form.Item>
              {isDraft && (
                <Form.Item>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                    Save Adjustments
                  </Button>
                </Form.Item>
              )}
            </Form>
          </Card>
        </Col>
      </Row>

      {/* Net Payable */}
      <Card style={{ marginBottom: 16, borderColor: liveNet > 0 ? '#f5222d' : '#52c41a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>
            প্রদেয় কর (নিট) / Net VAT Payable
          </Title>
          <Title level={3} style={{ margin: 0, color: liveNet > 0 ? '#f5222d' : '#52c41a' }}>
            ৳ {fmt(isDraft ? liveNet : ret.netPayable)}
          </Title>
        </div>
      </Card>

      {/* Workflow Actions */}
      <Divider />
      <Space>
        <Button icon={<FilePdfOutlined />} onClick={handlePdf}>Download PDF</Button>
        {ret.status === 'draft' && (
          <Popconfirm title="Mark as reviewed?" onConfirm={() => handleAction('review')}>
            <Button type="primary">Mark Reviewed</Button>
          </Popconfirm>
        )}
        {ret.status === 'reviewed' && (
          <Popconfirm title="Submit this return? This cannot be undone easily." onConfirm={() => handleAction('submit')}>
            <Button type="primary" danger>Submit Return</Button>
          </Popconfirm>
        )}
        {ret.status === 'submitted' && (
          <Popconfirm title="Lock this return? It will become immutable." onConfirm={() => handleAction('lock')}>
            <Button danger>Lock Return</Button>
          </Popconfirm>
        )}
      </Space>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/returns/ReturnDetail.tsx
git commit -m "feat: add Musak 9.1 return detail page with workflow actions"
```

---

## Task 11: Wire Client Routes and Nav

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/AppLayout.tsx`

- [ ] **Step 1: Add imports and routes to `App.tsx`**

Add these two imports after the `PurchaseRegister` import (line 22):

```typescript
import ReturnList from './pages/returns/ReturnList';
import ReturnDetail from './pages/returns/ReturnDetail';
```

Add these two routes after the `registers/purchase` route (line 58):

```typescript
          <Route path="returns" element={<ReturnList />} />
          <Route path="returns/:id" element={<ReturnDetail />} />
```

- [ ] **Step 2: Add nav item to `AppLayout.tsx`**

In the `menuItems` array (line 13), add this entry after the `Purchase Register` item:

```typescript
  { key: '/returns', icon: 'assignment_turned_in', label: 'Monthly Return' },
```

- [ ] **Step 3: Type-check**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/App.tsx client/src/components/AppLayout.tsx
git commit -m "feat: wire Musak 9.1 return pages into router and sidebar"
```

---

## Task 12: Manual End-to-End Verification

- [ ] **Step 1: Start the dev server**

```bash
cd .. && npm run dev
```

Expected: client on `http://localhost:5173`, server on `http://localhost:4000`.

- [ ] **Step 2: Verify the generate endpoint**

Ensure you have some invoices in the database for a tax month (e.g., `2026-03`). Then from the UI navigate to **Monthly Return** in the sidebar, pick `2026-03` from the month picker, and click **Generate**. Expected: a new draft return row appears in the table with correct output/input VAT totals.

- [ ] **Step 3: Verify manual adjustments**

Click **View** on the draft return. Enter a carry-forward value and click **Save Adjustments**. Expected: net payable recalculates live and the saved value persists on refresh.

- [ ] **Step 4: Verify workflow transitions**

Click **Mark Reviewed** → **Submit Return** → **Lock Return** in sequence. Expected: status badge updates each time. After locking, the adjustment fields are read-only.

- [ ] **Step 5: Verify PDF**

Click **Download PDF** on any return. Expected: a bilingual Musak 9.1 PDF downloads with company info, all figures, and correct net payable.

- [ ] **Step 6: Verify re-generation is blocked for submitted/locked returns**

Try generating for the same month that's now locked. Expected: error message "Cannot regenerate a locked return".

- [ ] **Step 7: Final commit**

```bash
git add -A
git status  # confirm only expected files
git commit -m "feat: complete Musak 9.1 monthly return module"
```
