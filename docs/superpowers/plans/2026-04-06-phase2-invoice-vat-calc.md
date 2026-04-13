# Phase 2: Musak 6.3 Invoice + VAT Calculation Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the invoice (Musak 6.3 challan) module with full multi-rate VAT calculation engine, atomic challan numbering, invoice lifecycle (draft→approved→locked), and bilingual PDF generation via Puppeteer.

**Architecture:** Invoice creation accepts line items with product references. The VAT Calculation Engine computes all amounts (taxable value, SD, VAT with truncated base support, specific duty, VDS). Challan numbers are generated atomically using Prisma transactions with row-level locking. Puppeteer renders bilingual HTML templates to PDF.

**Tech Stack:** Prisma (MySQL), Express, Zod, Puppeteer, Handlebars (HTML templates), Noto Sans Bengali font

---

## File Structure

```
server/
├── prisma/
│   └── schema.prisma                          # Add Invoice + InvoiceItem models
├── src/
│   ├── services/
│   │   ├── vatCalc.service.ts                 # VAT calculation engine (pure functions)
│   │   ├── invoice.service.ts                 # Invoice CRUD + lifecycle + challan numbering
│   │   └── pdf.service.ts                     # Puppeteer PDF generation
│   ├── controllers/
│   │   └── invoice.controller.ts              # Invoice request handlers
│   ├── routes/
│   │   └── invoice.routes.ts                  # Invoice route definitions
│   ├── validators/
│   │   └── invoice.validator.ts               # Zod schemas for invoice input
│   ├── templates/
│   │   └── musak63.html                       # Bilingual Musak 6.3 challan HTML template
│   └── app.ts                                 # Register invoice routes
client/
├── src/
│   ├── pages/
│   │   └── invoices/
│   │       ├── InvoiceList.tsx                 # Invoice list with status filters
│   │       └── InvoiceForm.tsx                 # Invoice creation/edit with line items
│   ├── utils/
│   │   └── vatCalc.ts                         # Client-side VAT calc for real-time preview
│   ├── types/
│   │   └── index.ts                           # Add Invoice + InvoiceItem types
│   └── App.tsx                                # Register invoice routes
```

---

### Task 1: Extend Prisma Schema — Invoice + InvoiceItem Models

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add Invoice and InvoiceItem models to schema.prisma**

Add after the `Product` model in `server/prisma/schema.prisma`:

```prisma
model Invoice {
  id                BigInt        @id @default(autoincrement())
  companyId         BigInt        @map("company_id")
  customerId        BigInt?       @map("customer_id")
  invoiceType       InvoiceType   @map("invoice_type")
  challanNo         String        @map("challan_no") @db.VarChar(50)
  challanDate       DateTime      @map("challan_date") @db.Date
  subtotal          Decimal       @db.Decimal(14, 2)
  sdTotal           Decimal       @default(0) @map("sd_total") @db.Decimal(14, 2)
  vatTotal          Decimal       @map("vat_total") @db.Decimal(14, 2)
  specificDutyTotal Decimal       @default(0) @map("specific_duty_total") @db.Decimal(14, 2)
  grandTotal        Decimal       @map("grand_total") @db.Decimal(14, 2)
  vdsApplicable     Boolean       @default(false) @map("vds_applicable")
  vdsAmount         Decimal       @default(0) @map("vds_amount") @db.Decimal(14, 2)
  netReceivable     Decimal       @map("net_receivable") @db.Decimal(14, 2)
  status            InvoiceStatus @default(draft)
  createdBy         BigInt        @map("created_by")
  approvedBy        BigInt?       @map("approved_by")
  lockedAt          DateTime?     @map("locked_at")
  createdAt         DateTime      @default(now()) @map("created_at")
  updatedAt         DateTime      @updatedAt @map("updated_at")

  company  Company       @relation(fields: [companyId], references: [id], onDelete: Cascade)
  customer Customer?     @relation(fields: [customerId], references: [id], onDelete: SetNull)
  creator  User          @relation("invoiceCreator", fields: [createdBy], references: [id])
  approver User?         @relation("invoiceApprover", fields: [approvedBy], references: [id])
  items    InvoiceItem[]

  @@unique([companyId, challanNo])
  @@map("invoices")
}

model InvoiceItem {
  id                 BigInt   @id @default(autoincrement())
  invoiceId          BigInt   @map("invoice_id")
  productId          BigInt   @map("product_id")
  description        String   @db.VarChar(255)
  descriptionBn      String?  @map("description_bn") @db.VarChar(255)
  hsCode             String?  @map("hs_code") @db.VarChar(20)
  qty                Decimal  @db.Decimal(14, 3)
  unitPrice          Decimal  @map("unit_price") @db.Decimal(14, 2)
  vatRate            Decimal  @map("vat_rate") @db.Decimal(5, 2)
  sdRate             Decimal  @default(0) @map("sd_rate") @db.Decimal(5, 2)
  specificDutyAmount Decimal  @default(0) @map("specific_duty_amount") @db.Decimal(14, 2)
  truncatedBasePct   Decimal  @default(100) @map("truncated_base_pct") @db.Decimal(5, 2)
  taxableValue       Decimal  @map("taxable_value") @db.Decimal(14, 2)
  sdAmount           Decimal  @default(0) @map("sd_amount") @db.Decimal(14, 2)
  vatAmount          Decimal  @map("vat_amount") @db.Decimal(14, 2)
  specificDutyLine   Decimal  @default(0) @map("specific_duty_line") @db.Decimal(14, 2)
  lineTotal          Decimal  @map("line_total") @db.Decimal(14, 2)
  grandTotal         Decimal  @map("grand_total") @db.Decimal(14, 2)
  vdsRate            Decimal  @default(0) @map("vds_rate") @db.Decimal(5, 2)
  vdsAmount          Decimal  @default(0) @map("vds_amount") @db.Decimal(14, 2)
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  invoice Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id])

  @@map("invoice_items")
}

enum InvoiceType {
  sales
  purchase
}

enum InvoiceStatus {
  draft
  approved
  cancelled
  locked
}
```

- [ ] **Step 2: Add reverse relations to existing models**

Add to `Company` model:
```prisma
  invoices      Invoice[]
```

Add to `Customer` model:
```prisma
  invoices      Invoice[]
```

Add to `Product` model:
```prisma
  invoiceItems  InvoiceItem[]
```

Add to `User` model:
```prisma
  createdInvoices  Invoice[] @relation("invoiceCreator")
  approvedInvoices Invoice[] @relation("invoiceApprover")
```

- [ ] **Step 3: Push schema to database**

Run: `cd "E:/Desktop 1/Vat/server" && npx prisma db push`
Expected: "Your database is now in sync with your Prisma schema."

- [ ] **Step 4: Commit**

```bash
git add server/prisma/schema.prisma
git commit -m "feat: add Invoice and InvoiceItem models to Prisma schema"
```

---

### Task 2: VAT Calculation Engine (Pure Functions)

**Files:**
- Create: `server/src/services/vatCalc.service.ts`

- [ ] **Step 1: Create the VAT calculation engine**

Create `server/src/services/vatCalc.service.ts`:

```typescript
/**
 * VAT Calculation Engine — all pure functions, no DB access.
 * Handles: standard VAT, truncated base, specific duty, SD, VDS.
 * All monetary values rounded to 2 decimal places.
 */

export interface LineItemInput {
  qty: number;
  unitPrice: number;
  vatRate: number;
  sdRate: number;
  specificDutyAmount: number;  // per-unit flat amount
  truncatedBasePct: number;    // 100 = no truncation
  vdsRate: number;             // 0 = no VDS
}

export interface LineItemCalcResult {
  taxableValue: number;
  sdAmount: number;
  vatAmount: number;
  specificDutyLine: number;
  lineTotal: number;
  grandTotal: number;
  vdsAmount: number;
}

export interface InvoiceTotals {
  subtotal: number;
  sdTotal: number;
  vatTotal: number;
  specificDutyTotal: number;
  grandTotal: number;
  vdsAmount: number;
  netReceivable: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate all amounts for a single line item.
 *
 * Standard:       taxable = qty × unitPrice
 *                 sd = taxable × sdRate%
 *                 vatBase = taxable + sd
 *                 vat = vatBase × vatRate%
 *
 * Truncated base: effectiveBase = taxable × truncatedBasePct%
 *                 vat = effectiveBase × vatRate%
 *                 (SD is NOT applied when truncated base is used)
 *
 * Specific duty:  specificDuty = qty × specificDutyAmount
 *                 added to grand total alongside VAT
 *
 * VDS:            vdsAmount = vatAmount × vdsRate%
 */
export function calculateLineItem(input: LineItemInput): LineItemCalcResult {
  const taxableValue = round2(input.qty * input.unitPrice);
  const isTruncated = input.truncatedBasePct < 100;

  let sdAmount = 0;
  let vatAmount = 0;

  if (isTruncated) {
    // Truncated base: VAT on reduced base, no SD
    const effectiveBase = round2(taxableValue * (input.truncatedBasePct / 100));
    vatAmount = round2(effectiveBase * (input.vatRate / 100));
  } else {
    // Standard: SD first, then VAT on (taxable + SD)
    sdAmount = round2(taxableValue * (input.sdRate / 100));
    const vatBase = round2(taxableValue + sdAmount);
    vatAmount = round2(vatBase * (input.vatRate / 100));
  }

  const specificDutyLine = round2(input.qty * input.specificDutyAmount);

  // lineTotal = taxableValue + sdAmount + vatAmount + specificDutyLine
  const lineTotal = round2(taxableValue + sdAmount + vatAmount + specificDutyLine);
  const grandTotal = lineTotal;

  // VDS = percentage of VAT amount
  const vdsAmount = round2(vatAmount * (input.vdsRate / 100));

  return {
    taxableValue,
    sdAmount,
    vatAmount,
    specificDutyLine,
    lineTotal,
    grandTotal,
    vdsAmount,
  };
}

/**
 * Aggregate line item results into invoice totals.
 */
export function calculateInvoiceTotals(items: LineItemCalcResult[]): InvoiceTotals {
  const subtotal = round2(items.reduce((sum, i) => sum + i.taxableValue, 0));
  const sdTotal = round2(items.reduce((sum, i) => sum + i.sdAmount, 0));
  const vatTotal = round2(items.reduce((sum, i) => sum + i.vatAmount, 0));
  const specificDutyTotal = round2(items.reduce((sum, i) => sum + i.specificDutyLine, 0));
  const grandTotal = round2(items.reduce((sum, i) => sum + i.grandTotal, 0));
  const vdsAmount = round2(items.reduce((sum, i) => sum + i.vdsAmount, 0));
  const netReceivable = round2(grandTotal - vdsAmount);

  return {
    subtotal,
    sdTotal,
    vatTotal,
    specificDutyTotal,
    grandTotal,
    vdsAmount,
    netReceivable,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/services/vatCalc.service.ts
git commit -m "feat: add VAT calculation engine with multi-rate, SD, truncated base, specific duty, VDS"
```

---

### Task 3: Invoice Validator (Zod Schema)

**Files:**
- Create: `server/src/validators/invoice.validator.ts`

- [ ] **Step 1: Create invoice validator**

Create `server/src/validators/invoice.validator.ts`:

```typescript
import { z } from 'zod';

const invoiceItemSchema = z.object({
  productId: z.string().min(1),
  description: z.string().min(1).max(255),
  descriptionBn: z.string().max(255).optional(),
  hsCode: z.string().max(20).optional(),
  qty: z.number().positive(),
  unitPrice: z.number().min(0),
  vatRate: z.number().min(0).max(100),
  sdRate: z.number().min(0).max(100).default(0),
  specificDutyAmount: z.number().min(0).default(0),
  truncatedBasePct: z.number().min(0).max(100).default(100),
  vdsRate: z.number().min(0).max(100).default(0),
});

export const createInvoiceSchema = z.object({
  customerId: z.string().optional(),
  invoiceType: z.enum(['sales', 'purchase']),
  challanDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  vdsApplicable: z.boolean().default(false),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
});

export const updateInvoiceSchema = z.object({
  customerId: z.string().optional(),
  challanDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  vdsApplicable: z.boolean().optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required').optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add server/src/validators/invoice.validator.ts
git commit -m "feat: add Zod validation schemas for invoice creation and update"
```

---

### Task 4: Invoice Service (CRUD + Challan Numbering + Lifecycle)

**Files:**
- Create: `server/src/services/invoice.service.ts`

- [ ] **Step 1: Create invoice service**

Create `server/src/services/invoice.service.ts`:

```typescript
import prisma from '../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateInvoiceInput, UpdateInvoiceInput } from '../validators/invoice.validator';
import { calculateLineItem, calculateInvoiceTotals } from './vatCalc.service';
import { getFiscalYear } from '../utils/validators';

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

/**
 * Generate next challan number atomically using DB-level locking.
 * Format: {prefix}-{fiscalYear}-{sequential} e.g. CH-2025-2026-0001
 */
async function generateChallanNo(tx: any, companyId: bigint): Promise<string> {
  // Lock the company row for atomic increment
  const companies = await tx.$queryRaw`
    SELECT challan_prefix, next_challan_no, fiscal_year_start
    FROM companies
    WHERE id = ${companyId}
    FOR UPDATE
  `;
  const company = (companies as any[])[0];

  const fiscalYear = getFiscalYear(new Date(), company.fiscal_year_start);
  const seqNo = String(company.next_challan_no).padStart(4, '0');
  const challanNo = `${company.challan_prefix}-${fiscalYear}-${seqNo}`;

  // Increment counter
  await tx.$executeRaw`
    UPDATE companies SET next_challan_no = next_challan_no + 1 WHERE id = ${companyId}
  `;

  return challanNo;
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

  return {
    invoices: invoices.map(serializeInvoice),
    total,
    page,
    limit,
  };
}

export async function createInvoice(companyId: bigint, userId: bigint, input: CreateInvoiceInput) {
  return prisma.$transaction(async (tx: any) => {
    // 1. Generate challan number atomically
    const challanNo = await generateChallanNo(tx, companyId);

    // 2. Calculate all line items
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

    // 3. Calculate invoice totals
    const totals = calculateInvoiceTotals(calculatedItems);

    // 4. Create invoice with items
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
    include: { items: { include: { product: true } }, customer: true },
  });
  if (!invoice) return null;
  return serializeInvoice(invoice);
}

export async function updateInvoice(companyId: bigint, invoiceId: bigint, userId: bigint, input: UpdateInvoiceInput) {
  const existing = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
  });
  if (!existing) return null;
  if (existing.status !== 'draft') {
    throw new Error('Only draft invoices can be edited');
  }

  return prisma.$transaction(async (tx: any) => {
    const updateData: any = {};

    if (input.challanDate) updateData.challanDate = new Date(input.challanDate);
    if (input.customerId !== undefined) updateData.customerId = input.customerId ? BigInt(input.customerId) : null;
    if (input.vdsApplicable !== undefined) updateData.vdsApplicable = input.vdsApplicable;

    if (input.items) {
      // Delete existing items and recreate
      await tx.invoiceItem.deleteMany({ where: { invoiceId } });

      const vdsApplicable = input.vdsApplicable ?? existing.vdsApplicable;
      const calculatedItems = input.items.map(item => {
        const calc = calculateLineItem({
          qty: item.qty,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
          sdRate: item.sdRate,
          specificDutyAmount: item.specificDutyAmount,
          truncatedBasePct: item.truncatedBasePct,
          vdsRate: vdsApplicable ? item.vdsRate : 0,
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
          invoiceId,
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
          vdsRate: new Decimal(vdsApplicable ? item.vdsRate : 0),
          vdsAmount: new Decimal(item.vdsAmount),
        })),
      });
    }

    const invoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: updateData,
      include: { items: true, customer: true },
    });

    return serializeInvoice(invoice);
  });
}

export async function approveInvoice(companyId: bigint, invoiceId: bigint, userId: bigint) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
  });
  if (!invoice) return null;
  if (invoice.status !== 'draft') {
    throw new Error('Only draft invoices can be approved');
  }

  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: 'approved', approvedBy: userId },
    include: { items: true, customer: true },
  });
  return serializeInvoice(updated);
}

export async function cancelInvoice(companyId: bigint, invoiceId: bigint) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
  });
  if (!invoice) return null;
  if (invoice.status !== 'draft') {
    throw new Error('Only draft invoices can be cancelled');
  }

  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: 'cancelled' },
    include: { items: true, customer: true },
  });
  return serializeInvoice(updated);
}

export async function lockInvoice(companyId: bigint, invoiceId: bigint) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
  });
  if (!invoice) return null;
  if (invoice.status !== 'approved') {
    throw new Error('Only approved invoices can be locked');
  }

  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: 'locked', lockedAt: new Date() },
    include: { items: true, customer: true },
  });
  return serializeInvoice(updated);
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/services/invoice.service.ts
git commit -m "feat: add invoice service with atomic challan numbering and lifecycle management"
```

---

### Task 5: Invoice Controller + Routes

**Files:**
- Create: `server/src/controllers/invoice.controller.ts`
- Create: `server/src/routes/invoice.routes.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Create invoice controller**

Create `server/src/controllers/invoice.controller.ts`:

```typescript
import { Request, Response } from 'express';
import * as invoiceService from '../services/invoice.service';
import { createInvoiceSchema, updateInvoiceSchema } from '../validators/invoice.validator';
import { success, created, error, notFound, forbidden } from '../utils/response';

export async function list(req: Request, res: Response) {
  const filters = {
    status: req.query.status as string | undefined,
    invoiceType: req.query.invoiceType as string | undefined,
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
  };
  const result = await invoiceService.listInvoices(req.companyId!, filters);
  return success(res, result);
}

export async function create(req: Request, res: Response) {
  const parsed = createInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }

  try {
    const invoice = await invoiceService.createInvoice(
      req.companyId!,
      BigInt(req.user!.userId),
      parsed.data
    );
    return created(res, invoice);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function get(req: Request, res: Response) {
  const invoice = await invoiceService.getInvoiceById(
    req.companyId!,
    BigInt(req.params.id as string)
  );
  if (!invoice) {
    return notFound(res, 'Invoice not found');
  }
  return success(res, invoice);
}

export async function update(req: Request, res: Response) {
  const parsed = updateInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }

  try {
    const invoice = await invoiceService.updateInvoice(
      req.companyId!,
      BigInt(req.params.id as string),
      BigInt(req.user!.userId),
      parsed.data
    );
    if (!invoice) {
      return notFound(res, 'Invoice not found');
    }
    return success(res, invoice);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function approve(req: Request, res: Response) {
  if (req.companyRole !== 'admin') {
    return forbidden(res, 'Only admins can approve invoices');
  }

  try {
    const invoice = await invoiceService.approveInvoice(
      req.companyId!,
      BigInt(req.params.id as string),
      BigInt(req.user!.userId)
    );
    if (!invoice) {
      return notFound(res, 'Invoice not found');
    }
    return success(res, invoice);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function cancel(req: Request, res: Response) {
  try {
    const invoice = await invoiceService.cancelInvoice(
      req.companyId!,
      BigInt(req.params.id as string)
    );
    if (!invoice) {
      return notFound(res, 'Invoice not found');
    }
    return success(res, invoice);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function lock(req: Request, res: Response) {
  if (req.companyRole !== 'admin') {
    return forbidden(res, 'Only admins can lock invoices');
  }

  try {
    const invoice = await invoiceService.lockInvoice(
      req.companyId!,
      BigInt(req.params.id as string)
    );
    if (!invoice) {
      return notFound(res, 'Invoice not found');
    }
    return success(res, invoice);
  } catch (err: any) {
    return error(res, err.message);
  }
}
```

- [ ] **Step 2: Create invoice routes**

Create `server/src/routes/invoice.routes.ts`:

```typescript
import { Router } from 'express';
import * as invoiceController from '../controllers/invoice.controller';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';

const router = Router();

router.use(authenticate, companyScope);

router.get('/', invoiceController.list);
router.post('/', invoiceController.create);
router.get('/:id', invoiceController.get);
router.put('/:id', invoiceController.update);
router.post('/:id/approve', invoiceController.approve);
router.post('/:id/cancel', invoiceController.cancel);
router.post('/:id/lock', invoiceController.lock);

export default router;
```

- [ ] **Step 3: Register invoice routes in app.ts**

Add to `server/src/app.ts` after existing imports:

```typescript
import invoiceRoutes from './routes/invoice.routes';
```

Add after existing routes:

```typescript
app.use('/api/v1/invoices', invoiceRoutes);
```

- [ ] **Step 4: Type-check**

Run: `cd "E:/Desktop 1/Vat/server" && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/invoice.controller.ts server/src/routes/invoice.routes.ts server/src/app.ts
git commit -m "feat: add invoice API endpoints with create, update, approve, cancel, lock"
```

---

### Task 6: PDF Service + Musak 6.3 Template

**Files:**
- Create: `server/src/services/pdf.service.ts`
- Create: `server/src/templates/musak63.html`
- Modify: `server/package.json` (add puppeteer + handlebars)

- [ ] **Step 1: Install Puppeteer and Handlebars**

Run: `cd "E:/Desktop 1/Vat/server" && npm install puppeteer handlebars && npm install -D @types/handlebars`
Expected: Dependencies installed.

- [ ] **Step 2: Create Musak 6.3 HTML template**

Create `server/src/templates/musak63.html`:

```html
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Noto Sans Bengali', sans-serif; font-size: 11px; padding: 20px; color: #333; }
    .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #000; padding-bottom: 10px; }
    .header h1 { font-size: 16px; font-weight: 700; }
    .header h2 { font-size: 13px; font-weight: 600; margin-top: 4px; }
    .header p { font-size: 10px; color: #666; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
    .info-row { display: flex; }
    .info-label { font-weight: 600; min-width: 120px; }
    .info-value { flex: 1; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th, td { border: 1px solid #333; padding: 4px 6px; text-align: left; font-size: 10px; }
    th { background: #f0f0f0; font-weight: 700; text-align: center; }
    td.number { text-align: right; }
    .totals { margin-top: 8px; }
    .totals .row { display: flex; justify-content: flex-end; gap: 20px; margin-bottom: 4px; }
    .totals .label { font-weight: 600; min-width: 200px; text-align: right; }
    .totals .value { min-width: 120px; text-align: right; }
    .footer { margin-top: 40px; display: flex; justify-content: space-between; }
    .signature { text-align: center; border-top: 1px solid #333; padding-top: 4px; min-width: 150px; }
    .musak-no { font-size: 10px; color: #999; margin-bottom: 4px; }
  </style>
</head>
<body>
  <div class="musak-no">মূসক-৬.৩ / Musak-6.3</div>
  <div class="header">
    <h1>কর চালানপত্র / Tax Invoice (Challan)</h1>
    <h2>{{companyName}}</h2>
    <p>BIN: {{companyBin}} | {{companyAddress}}</p>
  </div>

  <div class="info-grid">
    <div>
      <div class="info-row"><span class="info-label">চালান নম্বর / Challan No:</span><span class="info-value">{{challanNo}}</span></div>
      <div class="info-row"><span class="info-label">তারিখ / Date:</span><span class="info-value">{{challanDate}}</span></div>
      <div class="info-row"><span class="info-label">ধরন / Type:</span><span class="info-value">{{invoiceType}}</span></div>
    </div>
    <div>
      <div class="info-row"><span class="info-label">ক্রেতার নাম / Buyer:</span><span class="info-value">{{customerName}}</span></div>
      <div class="info-row"><span class="info-label">ক্রেতার BIN:</span><span class="info-value">{{customerBin}}</span></div>
      <div class="info-row"><span class="info-label">ঠিকানা / Address:</span><span class="info-value">{{customerAddress}}</span></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>ক্রম<br>SL</th>
        <th>পণ্য/সেবার বিবরণ<br>Description</th>
        <th>HS Code</th>
        <th>পরিমাণ<br>Qty</th>
        <th>একক মূল্য<br>Unit Price</th>
        <th>করযোগ্য মূল্য<br>Taxable Value</th>
        <th>SD %</th>
        <th>SD পরিমাণ<br>SD Amount</th>
        <th>VAT %</th>
        <th>VAT পরিমাণ<br>VAT Amount</th>
        <th>মোট<br>Total</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td style="text-align:center">{{add @index 1}}</td>
        <td>{{this.description}}{{#if this.descriptionBn}}<br>{{this.descriptionBn}}{{/if}}</td>
        <td>{{this.hsCode}}</td>
        <td class="number">{{this.qty}}</td>
        <td class="number">{{formatNumber this.unitPrice}}</td>
        <td class="number">{{formatNumber this.taxableValue}}</td>
        <td class="number">{{this.sdRate}}</td>
        <td class="number">{{formatNumber this.sdAmount}}</td>
        <td class="number">{{this.vatRate}}</td>
        <td class="number">{{formatNumber this.vatAmount}}</td>
        <td class="number">{{formatNumber this.grandTotal}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span class="label">মোট করযোগ্য মূল্য / Subtotal:</span><span class="value">{{formatNumber subtotal}}</span></div>
    {{#if sdTotal}}<div class="row"><span class="label">সম্পূরক শুল্ক / SD Total:</span><span class="value">{{formatNumber sdTotal}}</span></div>{{/if}}
    <div class="row"><span class="label">মূল্য সংযোজন কর / VAT Total:</span><span class="value">{{formatNumber vatTotal}}</span></div>
    {{#if specificDutyTotal}}<div class="row"><span class="label">সুনির্দিষ্ট শুল্ক / Specific Duty:</span><span class="value">{{formatNumber specificDutyTotal}}</span></div>{{/if}}
    <div class="row" style="font-weight:700; font-size:12px; border-top:1px solid #333; padding-top:4px;">
      <span class="label">সর্বমোট / Grand Total:</span><span class="value">{{formatNumber grandTotal}}</span>
    </div>
    {{#if vdsApplicable}}
    <div class="row"><span class="label">উৎসে কর্তিত VAT / VDS Amount:</span><span class="value">{{formatNumber vdsAmount}}</span></div>
    <div class="row"><span class="label">নীট প্রাপ্য / Net Receivable:</span><span class="value">{{formatNumber netReceivable}}</span></div>
    {{/if}}
  </div>

  <div class="footer">
    <div class="signature">ক্রেতার স্বাক্ষর<br>Buyer's Signature</div>
    <div class="signature">বিক্রেতার স্বাক্ষর<br>Seller's Signature</div>
  </div>
</body>
</html>
```

- [ ] **Step 3: Create PDF service**

Create `server/src/services/pdf.service.ts`:

```typescript
import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

// Register Handlebars helpers
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
```

- [ ] **Step 4: Add PDF endpoint to invoice controller**

Add to `server/src/controllers/invoice.controller.ts`:

```typescript
import { generateMusak63Pdf } from '../services/pdf.service';
import prisma from '../utils/prisma';

export async function getPdf(req: Request, res: Response) {
  const invoice = await invoiceService.getInvoiceById(
    req.companyId!,
    BigInt(req.params.id as string)
  );
  if (!invoice) {
    return notFound(res, 'Invoice not found');
  }

  // Get company details for PDF
  const company = await prisma.company.findUnique({
    where: { id: req.companyId! },
  });

  const pdfData = {
    companyName: company!.name,
    companyBin: company!.bin,
    companyAddress: company!.address,
    challanNo: invoice.challanNo,
    challanDate: new Date(invoice.challanDate).toLocaleDateString('en-GB'),
    invoiceType: invoice.invoiceType,
    customerName: invoice.customer?.name,
    customerBin: invoice.customer?.binNid,
    customerAddress: invoice.customer?.address,
    items: invoice.items,
    subtotal: invoice.subtotal,
    sdTotal: invoice.sdTotal,
    vatTotal: invoice.vatTotal,
    specificDutyTotal: invoice.specificDutyTotal,
    grandTotal: invoice.grandTotal,
    vdsApplicable: invoice.vdsApplicable,
    vdsAmount: invoice.vdsAmount,
    netReceivable: invoice.netReceivable,
  };

  try {
    const pdfBuffer = await generateMusak63Pdf(pdfData);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="musak63-${invoice.challanNo}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err: any) {
    return error(res, `PDF generation failed: ${err.message}`, 500);
  }
}
```

- [ ] **Step 5: Add PDF route**

Add to `server/src/routes/invoice.routes.ts` after the lock route:

```typescript
router.get('/:id/pdf', invoiceController.getPdf);
```

- [ ] **Step 6: Commit**

```bash
git add server/package.json server/package-lock.json server/src/services/pdf.service.ts server/src/templates/musak63.html server/src/controllers/invoice.controller.ts server/src/routes/invoice.routes.ts
git commit -m "feat: add Musak 6.3 bilingual PDF generation via Puppeteer"
```

---

### Task 7: Client-Side VAT Calculator + Invoice Types

**Files:**
- Create: `client/src/utils/vatCalc.ts`
- Modify: `client/src/types/index.ts`

- [ ] **Step 1: Create client-side VAT calculator**

Create `client/src/utils/vatCalc.ts`:

```typescript
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface LineItemInput {
  qty: number;
  unitPrice: number;
  vatRate: number;
  sdRate: number;
  specificDutyAmount: number;
  truncatedBasePct: number;
  vdsRate: number;
}

export interface LineItemCalcResult {
  taxableValue: number;
  sdAmount: number;
  vatAmount: number;
  specificDutyLine: number;
  lineTotal: number;
  grandTotal: number;
  vdsAmount: number;
}

export function calculateLineItem(input: LineItemInput): LineItemCalcResult {
  const taxableValue = round2(input.qty * input.unitPrice);
  const isTruncated = input.truncatedBasePct < 100;

  let sdAmount = 0;
  let vatAmount = 0;

  if (isTruncated) {
    const effectiveBase = round2(taxableValue * (input.truncatedBasePct / 100));
    vatAmount = round2(effectiveBase * (input.vatRate / 100));
  } else {
    sdAmount = round2(taxableValue * (input.sdRate / 100));
    const vatBase = round2(taxableValue + sdAmount);
    vatAmount = round2(vatBase * (input.vatRate / 100));
  }

  const specificDutyLine = round2(input.qty * input.specificDutyAmount);
  const lineTotal = round2(taxableValue + sdAmount + vatAmount + specificDutyLine);
  const vdsAmount = round2(vatAmount * (input.vdsRate / 100));

  return { taxableValue, sdAmount, vatAmount, specificDutyLine, lineTotal, grandTotal: lineTotal, vdsAmount };
}

export function calculateTotals(items: LineItemCalcResult[]) {
  const subtotal = round2(items.reduce((s, i) => s + i.taxableValue, 0));
  const sdTotal = round2(items.reduce((s, i) => s + i.sdAmount, 0));
  const vatTotal = round2(items.reduce((s, i) => s + i.vatAmount, 0));
  const specificDutyTotal = round2(items.reduce((s, i) => s + i.specificDutyLine, 0));
  const grandTotal = round2(items.reduce((s, i) => s + i.grandTotal, 0));
  const vdsAmount = round2(items.reduce((s, i) => s + i.vdsAmount, 0));
  const netReceivable = round2(grandTotal - vdsAmount);
  return { subtotal, sdTotal, vatTotal, specificDutyTotal, grandTotal, vdsAmount, netReceivable };
}
```

- [ ] **Step 2: Add Invoice types to client**

Add to `client/src/types/index.ts`:

```typescript
export interface InvoiceItem {
  id?: string;
  productId: string;
  description: string;
  descriptionBn?: string;
  hsCode?: string;
  qty: number;
  unitPrice: number;
  vatRate: number;
  sdRate: number;
  specificDutyAmount: number;
  truncatedBasePct: number;
  taxableValue: number;
  sdAmount: number;
  vatAmount: number;
  specificDutyLine: number;
  lineTotal: number;
  grandTotal: number;
  vdsRate: number;
  vdsAmount: number;
}

export interface Invoice {
  id: string;
  companyId: string;
  customerId: string | null;
  invoiceType: 'sales' | 'purchase';
  challanNo: string;
  challanDate: string;
  subtotal: number;
  sdTotal: number;
  vatTotal: number;
  specificDutyTotal: number;
  grandTotal: number;
  vdsApplicable: boolean;
  vdsAmount: number;
  netReceivable: number;
  status: 'draft' | 'approved' | 'cancelled' | 'locked';
  createdBy: string;
  approvedBy: string | null;
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: InvoiceItem[];
  customer: Customer | null;
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/utils/vatCalc.ts client/src/types/index.ts
git commit -m "feat: add client-side VAT calculator and Invoice types"
```

---

### Task 8: Invoice List Page

**Files:**
- Create: `client/src/pages/invoices/InvoiceList.tsx`

- [ ] **Step 1: Create InvoiceList page**

Create `client/src/pages/invoices/InvoiceList.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { Table, Button, Space, Typography, message, Tag, Select } from 'antd';
import { PlusOutlined, EyeOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Invoice } from '../../types';

const { Title } = Typography;

const statusColors: Record<string, string> = {
  draft: 'default',
  approved: 'green',
  cancelled: 'red',
  locked: 'blue',
};

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const navigate = useNavigate();

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('invoiceType', typeFilter);
      const { data } = await api.get(`/invoices?${params}`);
      setInvoices(data.data.invoices);
    } catch {
      message.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, [statusFilter, typeFilter]);

  const handlePdf = async (id: string, challanNo: string) => {
    try {
      const response = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `musak63-${challanNo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Failed to generate PDF');
    }
  };

  const columns = [
    { title: 'Challan No', dataIndex: 'challanNo', key: 'challanNo' },
    {
      title: 'Type',
      dataIndex: 'invoiceType',
      key: 'invoiceType',
      render: (type: string) => <Tag color={type === 'sales' ? 'blue' : 'orange'}>{type}</Tag>,
    },
    { title: 'Date', dataIndex: 'challanDate', key: 'challanDate', render: (d: string) => new Date(d).toLocaleDateString('en-GB') },
    { title: 'Customer', key: 'customer', render: (_: unknown, r: Invoice) => r.customer?.name || '-' },
    { title: 'Grand Total', dataIndex: 'grandTotal', key: 'grandTotal', render: (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
    { title: 'VAT', dataIndex: 'vatTotal', key: 'vatTotal', render: (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={statusColors[status]}>{status}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Invoice) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/invoices/${record.id}`)} />
          <Button size="small" icon={<FilePdfOutlined />} onClick={() => handlePdf(record.id, record.challanNo)} />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Musak 6.3 — Invoices (Challans)</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/invoices/new')}>
          New Invoice
        </Button>
      </div>
      <Space style={{ marginBottom: 16 }}>
        <Select placeholder="Status" allowClear style={{ width: 140 }} onChange={setStatusFilter}
          options={[
            { value: 'draft', label: 'Draft' },
            { value: 'approved', label: 'Approved' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: 'locked', label: 'Locked' },
          ]}
        />
        <Select placeholder="Type" allowClear style={{ width: 140 }} onChange={setTypeFilter}
          options={[
            { value: 'sales', label: 'Sales' },
            { value: 'purchase', label: 'Purchase' },
          ]}
        />
      </Space>
      <Table columns={columns} dataSource={invoices} rowKey="id" loading={loading} scroll={{ x: 1000 }} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/invoices/InvoiceList.tsx
git commit -m "feat: add invoice list page with status/type filters and PDF download"
```

---

### Task 9: Invoice Form Page (Create with Line Items)

**Files:**
- Create: `client/src/pages/invoices/InvoiceForm.tsx`

- [ ] **Step 1: Create InvoiceForm page**

Create `client/src/pages/invoices/InvoiceForm.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, message, Select, DatePicker, Switch, Table, InputNumber, Space, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../services/api';
import { Product } from '../../types';
import { calculateLineItem, calculateTotals } from '../../utils/vatCalc';

const { Title, Text } = Typography;

interface FormItem {
  key: string;
  productId: string;
  description: string;
  descriptionBn?: string;
  hsCode?: string;
  qty: number;
  unitPrice: number;
  vatRate: number;
  sdRate: number;
  specificDutyAmount: number;
  truncatedBasePct: number;
  vdsRate: number;
  // Calculated fields
  taxableValue: number;
  sdAmount: number;
  vatAmount: number;
  specificDutyLine: number;
  grandTotal: number;
  vdsAmount: number;
}

export default function InvoiceForm() {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<FormItem[]>([]);
  const [invoiceType, setInvoiceType] = useState<'sales' | 'purchase'>('sales');
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [challanDate, setChallanDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [vdsApplicable, setVdsApplicable] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/products'),
      api.get('/customers'),
    ]).then(([prodRes, custRes]) => {
      setProducts(prodRes.data.data);
      setCustomers(custRes.data.data);
    }).catch(() => message.error('Failed to load data'));
  }, []);

  const addItem = () => {
    setItems([...items, {
      key: Date.now().toString(),
      productId: '',
      description: '',
      qty: 1,
      unitPrice: 0,
      vatRate: 15,
      sdRate: 0,
      specificDutyAmount: 0,
      truncatedBasePct: 100,
      vdsRate: 0,
      taxableValue: 0,
      sdAmount: 0,
      vatAmount: 0,
      specificDutyLine: 0,
      grandTotal: 0,
      vdsAmount: 0,
    }]);
  };

  const removeItem = (key: string) => {
    setItems(items.filter(i => i.key !== key));
  };

  const updateItem = (key: string, field: string, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.key !== key) return item;
      const updated = { ...item, [field]: value };

      // Auto-fill from product
      if (field === 'productId') {
        const product = products.find(p => p.id === value);
        if (product) {
          updated.description = product.name;
          updated.descriptionBn = product.nameBn || undefined;
          updated.hsCode = product.hsCode || undefined;
          updated.unitPrice = product.unitPrice;
          updated.vatRate = product.vatRate;
          updated.sdRate = product.sdRate;
          updated.specificDutyAmount = product.specificDutyAmount;
          updated.truncatedBasePct = product.truncatedBasePct;
        }
      }

      // Recalculate
      const calc = calculateLineItem({
        qty: updated.qty,
        unitPrice: updated.unitPrice,
        vatRate: updated.vatRate,
        sdRate: updated.sdRate,
        specificDutyAmount: updated.specificDutyAmount,
        truncatedBasePct: updated.truncatedBasePct,
        vdsRate: vdsApplicable ? updated.vdsRate : 0,
      });

      return { ...updated, ...calc };
    }));
  };

  const totals = calculateTotals(items);

  const handleSubmit = async () => {
    if (items.length === 0) {
      message.error('Add at least one item');
      return;
    }

    setLoading(true);
    try {
      await api.post('/invoices', {
        customerId,
        invoiceType,
        challanDate,
        vdsApplicable,
        items: items.map(i => ({
          productId: i.productId,
          description: i.description,
          descriptionBn: i.descriptionBn,
          hsCode: i.hsCode,
          qty: i.qty,
          unitPrice: i.unitPrice,
          vatRate: i.vatRate,
          sdRate: i.sdRate,
          specificDutyAmount: i.specificDutyAmount,
          truncatedBasePct: i.truncatedBasePct,
          vdsRate: i.vdsRate,
        })),
      });
      message.success('Invoice created');
      navigate('/invoices');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Product',
      key: 'productId',
      width: 200,
      render: (_: unknown, record: FormItem) => (
        <Select
          value={record.productId || undefined}
          onChange={(v) => updateItem(record.key, 'productId', v)}
          style={{ width: '100%' }}
          showSearch
          optionFilterProp="label"
          placeholder="Select product"
          options={products.map(p => ({ value: p.id, label: `${p.name} (${p.vatRate}%)` }))}
        />
      ),
    },
    {
      title: 'Qty', key: 'qty', width: 80,
      render: (_: unknown, r: FormItem) => <InputNumber value={r.qty} min={0.001} onChange={v => updateItem(r.key, 'qty', v || 0)} style={{ width: '100%' }} />,
    },
    {
      title: 'Unit Price', key: 'unitPrice', width: 110,
      render: (_: unknown, r: FormItem) => <InputNumber value={r.unitPrice} min={0} onChange={v => updateItem(r.key, 'unitPrice', v || 0)} style={{ width: '100%' }} />,
    },
    { title: 'Taxable', key: 'taxableValue', width: 100, render: (_: unknown, r: FormItem) => r.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
    { title: 'SD', key: 'sdAmount', width: 80, render: (_: unknown, r: FormItem) => r.sdAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
    { title: 'VAT', key: 'vatAmount', width: 100, render: (_: unknown, r: FormItem) => r.vatAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
    { title: 'Total', key: 'grandTotal', width: 110, render: (_: unknown, r: FormItem) => <strong>{r.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> },
    {
      title: '', key: 'action', width: 40,
      render: (_: unknown, r: FormItem) => <Button size="small" icon={<DeleteOutlined />} danger onClick={() => removeItem(r.key)} />,
    },
  ];

  return (
    <div>
      <Title level={4}>New Invoice (Musak 6.3)</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space size="large" wrap>
          <div>
            <Text strong>Type: </Text>
            <Select value={invoiceType} onChange={setInvoiceType} style={{ width: 140 }}
              options={[{ value: 'sales', label: 'Sales' }, { value: 'purchase', label: 'Purchase' }]} />
          </div>
          <div>
            <Text strong>Date: </Text>
            <DatePicker value={dayjs(challanDate)} onChange={(d) => setChallanDate(d?.format('YYYY-MM-DD') || '')} />
          </div>
          <div>
            <Text strong>Customer: </Text>
            <Select value={customerId} onChange={setCustomerId} allowClear style={{ width: 220 }} placeholder="Select customer"
              showSearch optionFilterProp="label"
              options={customers.map((c: any) => ({ value: c.id, label: `${c.name} (${c.binNid || 'No BIN'})` }))} />
          </div>
          <div>
            <Text strong>VDS Applicable: </Text>
            <Switch checked={vdsApplicable} onChange={setVdsApplicable} />
          </div>
        </Space>
      </Card>

      <Card title="Line Items" extra={<Button icon={<PlusOutlined />} onClick={addItem}>Add Item</Button>}>
        <Table columns={columns} dataSource={items} rowKey="key" pagination={false} scroll={{ x: 900 }} size="small" />
      </Card>

      <Card style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ minWidth: 300 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Subtotal:</span><span>{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
            {totals.sdTotal > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>SD Total:</span><span>{totals.sdTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>VAT Total:</span><span>{totals.vatTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
            {totals.specificDutyTotal > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Specific Duty:</span><span>{totals.specificDutyTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>}
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, marginBottom: 4 }}><span>Grand Total:</span><span>{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
            {vdsApplicable && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>VDS Amount:</span><span>{totals.vdsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}><span>Net Receivable:</span><span>{totals.netReceivable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
              </>
            )}
          </div>
        </div>
        <Divider />
        <Space>
          <Button type="primary" size="large" loading={loading} onClick={handleSubmit}>
            Create Invoice
          </Button>
          <Button size="large" onClick={() => navigate('/invoices')}>Cancel</Button>
        </Space>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/invoices/InvoiceForm.tsx
git commit -m "feat: add invoice form with real-time VAT calculation and product auto-fill"
```

---

### Task 10: Wire Invoice Pages into Router + Install dayjs

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/package.json`

- [ ] **Step 1: Install dayjs for DatePicker**

Run: `cd "E:/Desktop 1/Vat/client" && npm install dayjs`
Expected: dayjs installed.

- [ ] **Step 2: Add invoice routes to App.tsx**

Add imports at top of `client/src/App.tsx`:

```typescript
import InvoiceList from './pages/invoices/InvoiceList';
import InvoiceForm from './pages/invoices/InvoiceForm';
```

Add routes inside the protected layout routes block, after the customer routes:

```typescript
<Route path="invoices" element={<InvoiceList />} />
<Route path="invoices/new" element={<InvoiceForm />} />
<Route path="invoices/:id" element={<InvoiceList />} />
```

- [ ] **Step 3: Type-check both server and client**

Run: `cd "E:/Desktop 1/Vat/server" && npx tsc --noEmit`
Run: `cd "E:/Desktop 1/Vat/client" && npx tsc --noEmit`
Expected: No errors on both.

- [ ] **Step 4: Commit**

```bash
git add client/src/App.tsx client/package.json client/package-lock.json
git commit -m "feat: wire invoice pages into router and add dayjs dependency"
```

---

### Task 11: Manual Integration Test

- [ ] **Step 1: Push updated schema**

Run: `cd "E:/Desktop 1/Vat/server" && npx prisma db push`
Expected: Schema synced with invoices and invoice_items tables.

- [ ] **Step 2: Start server and client**

Terminal 1: `cd "E:/Desktop 1/Vat/server" && npm run dev`
Terminal 2: `cd "E:/Desktop 1/Vat/client" && npm run dev`

- [ ] **Step 3: Test invoice flow**

1. Login as `admin@vatsystem.com` / `admin123`
2. Go to Musak 6.3 (Invoices) page — should show empty list
3. Click "New Invoice" — should show form
4. Select type = Sales, pick a date, select a customer
5. Click "Add Item", select "Laptop Computer" — should auto-fill rates
6. Set qty = 2 — should calculate: Taxable = 100,000, VAT (15%) = 15,000, Total = 115,000
7. Add another item "IT Consulting Service" — truncated base (30%) should apply
8. Click "Create Invoice" — should redirect to list with new invoice
9. Click PDF icon — should download bilingual Musak 6.3 PDF

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Phase 2 — Musak 6.3 invoice module with VAT calc and PDF"
```
