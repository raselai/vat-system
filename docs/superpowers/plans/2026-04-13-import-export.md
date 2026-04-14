# Import/Export Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CSV/Excel bulk import for Products, Customers, and Invoices, plus CSV/Excel export for all three, with a two-step column-mapping UI on the client.

**Architecture:** A single new server service (`importExport.service.ts`) handles file parsing, row validation, bulk writes, and spreadsheet generation. A dedicated controller + route file wires it to `/api/v1/import` and `/api/v1/export`. The client gets one new page (`ImportExportPage.tsx`) with Import/Export tabs, routed at `/import-export` and added to the sidebar.

**Tech Stack:** `xlsx` (SheetJS) on server for reading uploads and writing downloads, `multer` for `multipart/form-data` handling, Ant Design `Upload` + `Steps` + `Table` on client, `axios` with `responseType: 'blob'` for file downloads.

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `server/src/services/importExport.service.ts` | parseFile, validate rows, bulk write, export generation |
| `server/src/controllers/importExport.controller.ts` | HTTP handlers — preview, import, export |
| `server/src/routes/importExport.routes.ts` | Route definitions, multer middleware |
| `client/src/pages/importExport/ImportExportPage.tsx` | Full import/export UI page |

### Modified files
| File | Change |
|------|--------|
| `server/src/app.ts` | Mount `/api/v1/import` and `/api/v1/export` routes |
| `client/src/App.tsx` | Add `/import-export` route |
| `client/src/components/AppLayout.tsx` | Add "Import / Export" sidebar item |

---

## Task 1: Install Server Dependencies

**Files:**
- Modify: `server/package.json` (via npm install)

- [ ] **Step 1: Install xlsx and multer in the server package**

```bash
cd server
npm install xlsx multer
npm install --save-dev @types/multer
```

- [ ] **Step 2: Verify installation**

```bash
cd server
node -e "require('xlsx'); require('multer'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "chore: add xlsx and multer to server dependencies"
```

---

## Task 2: Import/Export Service — File Parsing + Product & Customer Import

**Files:**
- Create: `server/src/services/importExport.service.ts`

- [ ] **Step 1: Create the service file with parseFile and product/customer helpers**

Create `server/src/services/importExport.service.ts`:

```typescript
import * as XLSX from 'xlsx';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../utils/prisma';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ColumnMap = Record<string, string>; // expectedField -> actual header in file

export interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
}

export interface ImportResult {
  imported: number;
  errors: ImportError[];
}

// ─── File Parsing ─────────────────────────────────────────────────────────────

export function parseFile(buffer: Buffer): ParsedFile {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  if (raw.length === 0) return { headers: [], rows: [] };

  const headers = (raw[0] as unknown[]).map(h => String(h ?? '').trim());
  const rows = (raw.slice(1) as unknown[][])
    .filter(row => row.some(cell => String(cell ?? '').trim() !== ''))
    .map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = String(row[i] ?? '').trim();
      });
      return obj;
    });

  return { headers, rows };
}

// Apply a columnMap to a raw row: return a new object keyed by expectedField
function applyMap(row: Record<string, string>, map: ColumnMap): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [field, header] of Object.entries(map)) {
    out[field] = row[header] ?? '';
  }
  return out;
}

// ─── Product Import ───────────────────────────────────────────────────────────

export const PRODUCT_FIELDS = [
  { name: 'name',               label: 'Name',                    required: true },
  { name: 'type',               label: 'Type (product/service)',  required: true },
  { name: 'vatRate',            label: 'VAT Rate (%)',            required: true },
  { name: 'productCode',        label: 'Product Code',            required: false },
  { name: 'hsCode',             label: 'HS Code',                 required: false },
  { name: 'serviceCode',        label: 'Service Code',            required: false },
  { name: 'nameBn',             label: 'Name (Bangla)',           required: false },
  { name: 'sdRate',             label: 'SD Rate (%)',             required: false },
  { name: 'specificDutyAmount', label: 'Specific Duty Amount',    required: false },
  { name: 'truncatedBasePct',   label: 'Truncated Base %',        required: false },
  { name: 'unit',               label: 'Unit',                    required: false },
  { name: 'unitPrice',          label: 'Unit Price',              required: false },
];

export function suggestColumnMap(headers: string[], fields: { name: string; label: string }[]): ColumnMap {
  const map: ColumnMap = {};
  for (const field of fields) {
    const lower = field.label.toLowerCase();
    const match = headers.find(h => h.toLowerCase() === lower)
      || headers.find(h => h.toLowerCase().includes(field.name.toLowerCase()))
      || headers.find(h => field.name.toLowerCase().includes(h.toLowerCase()));
    if (match) map[field.name] = match;
  }
  return map;
}

export async function importProducts(
  companyId: bigint,
  buffer: Buffer,
  columnMap: ColumnMap
): Promise<ImportResult> {
  const { rows } = parseFile(buffer);
  const errors: ImportError[] = [];
  const valid: Array<Parameters<typeof prisma.product.create>[0]['data']> = [];

  rows.forEach((rawRow, i) => {
    const rowNum = i + 2; // 1-indexed + header row
    const row = applyMap(rawRow, columnMap);

    if (!row.name) {
      errors.push({ row: rowNum, field: 'name', message: 'Name is required' });
      return;
    }
    if (!['product', 'service'].includes(row.type)) {
      errors.push({ row: rowNum, field: 'type', message: 'Type must be "product" or "service"' });
      return;
    }
    const vatRate = parseFloat(row.vatRate);
    if (isNaN(vatRate) || vatRate < 0 || vatRate > 100) {
      errors.push({ row: rowNum, field: 'vatRate', message: 'VAT Rate must be a number 0–100' });
      return;
    }

    const sdRate = row.sdRate ? parseFloat(row.sdRate) : 0;
    if (isNaN(sdRate) || sdRate < 0 || sdRate > 100) {
      errors.push({ row: rowNum, field: 'sdRate', message: 'SD Rate must be a number 0–100' });
      return;
    }

    const specificDutyAmount = row.specificDutyAmount ? parseFloat(row.specificDutyAmount) : 0;
    const truncatedBasePct = row.truncatedBasePct ? parseFloat(row.truncatedBasePct) : 100;
    const unitPrice = row.unitPrice ? parseFloat(row.unitPrice) : 0;

    if (isNaN(specificDutyAmount) || specificDutyAmount < 0) {
      errors.push({ row: rowNum, field: 'specificDutyAmount', message: 'Specific Duty Amount must be ≥ 0' });
      return;
    }
    if (isNaN(truncatedBasePct) || truncatedBasePct < 0 || truncatedBasePct > 100) {
      errors.push({ row: rowNum, field: 'truncatedBasePct', message: 'Truncated Base % must be 0–100' });
      return;
    }

    valid.push({
      companyId,
      name: row.name,
      type: row.type as 'product' | 'service',
      vatRate: new Decimal(vatRate),
      productCode: row.productCode || null,
      hsCode: row.hsCode || null,
      serviceCode: row.serviceCode || null,
      nameBn: row.nameBn || null,
      sdRate: new Decimal(sdRate),
      specificDutyAmount: new Decimal(specificDutyAmount),
      truncatedBasePct: new Decimal(truncatedBasePct),
      unit: row.unit || 'pcs',
      unitPrice: new Decimal(unitPrice),
    });
  });

  if (valid.length > 0) {
    await prisma.product.createMany({ data: valid });
  }

  return { imported: valid.length, errors };
}

// ─── Customer Import ──────────────────────────────────────────────────────────

export const CUSTOMER_FIELDS = [
  { name: 'name',    label: 'Name',         required: true },
  { name: 'binNid',  label: 'BIN / NID',    required: false },
  { name: 'phone',   label: 'Phone',        required: false },
  { name: 'address', label: 'Address',      required: false },
];

export async function importCustomers(
  companyId: bigint,
  buffer: Buffer,
  columnMap: ColumnMap
): Promise<ImportResult> {
  const { rows } = parseFile(buffer);
  const errors: ImportError[] = [];
  const valid: Array<Parameters<typeof prisma.customer.create>[0]['data']> = [];

  rows.forEach((rawRow, i) => {
    const rowNum = i + 2;
    const row = applyMap(rawRow, columnMap);

    if (!row.name) {
      errors.push({ row: rowNum, field: 'name', message: 'Name is required' });
      return;
    }

    if (row.binNid) {
      const isValidBin = /^\d{13}$/.test(row.binNid);
      const isValidNid = /^\d{10,17}$/.test(row.binNid);
      if (!isValidBin && !isValidNid) {
        errors.push({ row: rowNum, field: 'binNid', message: 'BIN must be 13 digits or NID must be 10–17 digits' });
        return;
      }
    }

    valid.push({
      companyId,
      name: row.name,
      binNid: row.binNid || null,
      phone: row.phone || null,
      address: row.address || null,
    });
  });

  if (valid.length > 0) {
    await prisma.customer.createMany({ data: valid });
  }

  return { imported: valid.length, errors };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/services/importExport.service.ts
git commit -m "feat: add import/export service with file parsing, product and customer import"
```

---

## Task 3: Import/Export Service — Invoice Import

**Files:**
- Modify: `server/src/services/importExport.service.ts`

Invoice import format: **one row = one invoice with one item**. The `productCode` column is matched against existing active products for the company. `customerBin` is matched against existing active customers.

- [ ] **Step 1: Append invoice import to the service**

Add to the bottom of `server/src/services/importExport.service.ts`:

```typescript
// ─── Invoice Import ───────────────────────────────────────────────────────────

export const INVOICE_FIELDS = [
  { name: 'invoiceType',      label: 'Invoice Type (sales/purchase)', required: true },
  { name: 'challanDate',      label: 'Challan Date (YYYY-MM-DD)',      required: true },
  { name: 'productCode',      label: 'Product Code',                   required: true },
  { name: 'description',      label: 'Description',                    required: true },
  { name: 'qty',              label: 'Quantity',                       required: true },
  { name: 'unitPrice',        label: 'Unit Price',                     required: true },
  { name: 'vatRate',          label: 'VAT Rate (%)',                    required: true },
  { name: 'customerBin',      label: 'Customer BIN / NID',             required: false },
  { name: 'sdRate',           label: 'SD Rate (%)',                    required: false },
  { name: 'truncatedBasePct', label: 'Truncated Base %',               required: false },
];

// Reuse challan generation logic inline (mirrors invoice.service.ts)
async function generateChallanNo(tx: any, companyId: bigint): Promise<string> {
  const companies: any[] = await tx.$queryRaw`
    SELECT challan_prefix, next_challan_no, fiscal_year_start
    FROM companies WHERE id = ${companyId} FOR UPDATE
  `;
  const c = companies[0];
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const fyStart = c.fiscal_year_start as number;
  const startYear = month >= fyStart ? year : year - 1;
  const fiscalYear = `${startYear}-${startYear + 1}`;
  const seq = String(c.next_challan_no).padStart(4, '0');
  const challanNo = `${c.challan_prefix}-${fiscalYear}-${seq}`;
  await tx.$executeRaw`UPDATE companies SET next_challan_no = next_challan_no + 1 WHERE id = ${companyId}`;
  return challanNo;
}

export async function importInvoices(
  companyId: bigint,
  userId: bigint,
  buffer: Buffer,
  columnMap: ColumnMap
): Promise<ImportResult> {
  const { rows } = parseFile(buffer);
  const errors: ImportError[] = [];

  // Pre-load lookup tables once for the whole import batch
  const [allProducts, allCustomers] = await Promise.all([
    prisma.product.findMany({ where: { companyId, isActive: true }, select: { id: true, productCode: true, vatRate: true } }),
    prisma.customer.findMany({ where: { companyId, isActive: true }, select: { id: true, binNid: true } }),
  ]);

  const productByCode = new Map(allProducts.filter(p => p.productCode).map(p => [p.productCode!.toLowerCase(), p]));
  const customerByBin = new Map(allCustomers.filter(c => c.binNid).map(c => [c.binNid!, c]));

  type ValidRow = {
    customerId: bigint | null;
    invoiceType: 'sales' | 'purchase';
    challanDate: Date;
    productId: bigint;
    description: string;
    qty: number;
    unitPrice: number;
    vatRate: number;
    sdRate: number;
    truncatedBasePct: number;
  };

  const validRows: ValidRow[] = [];

  rows.forEach((rawRow, i) => {
    const rowNum = i + 2;
    const row = applyMap(rawRow, columnMap);

    if (!['sales', 'purchase'].includes(row.invoiceType)) {
      errors.push({ row: rowNum, field: 'invoiceType', message: 'Must be "sales" or "purchase"' });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.challanDate)) {
      errors.push({ row: rowNum, field: 'challanDate', message: 'Date must be YYYY-MM-DD' });
      return;
    }

    const product = productByCode.get((row.productCode ?? '').toLowerCase());
    if (!product) {
      errors.push({ row: rowNum, field: 'productCode', message: `Product code "${row.productCode}" not found` });
      return;
    }

    if (!row.description) {
      errors.push({ row: rowNum, field: 'description', message: 'Description is required' });
      return;
    }

    const qty = parseFloat(row.qty);
    const unitPrice = parseFloat(row.unitPrice);
    const vatRate = parseFloat(row.vatRate);

    if (isNaN(qty) || qty <= 0) {
      errors.push({ row: rowNum, field: 'qty', message: 'Quantity must be a positive number' });
      return;
    }
    if (isNaN(unitPrice) || unitPrice < 0) {
      errors.push({ row: rowNum, field: 'unitPrice', message: 'Unit Price must be ≥ 0' });
      return;
    }
    if (isNaN(vatRate) || vatRate < 0 || vatRate > 100) {
      errors.push({ row: rowNum, field: 'vatRate', message: 'VAT Rate must be 0–100' });
      return;
    }

    const sdRate = row.sdRate ? parseFloat(row.sdRate) : 0;
    const truncatedBasePct = row.truncatedBasePct ? parseFloat(row.truncatedBasePct) : 100;

    let customerId: bigint | null = null;
    if (row.customerBin) {
      const customer = customerByBin.get(row.customerBin);
      if (!customer) {
        errors.push({ row: rowNum, field: 'customerBin', message: `Customer BIN "${row.customerBin}" not found` });
        return;
      }
      customerId = customer.id;
    }

    validRows.push({
      customerId,
      invoiceType: row.invoiceType as 'sales' | 'purchase',
      challanDate: new Date(row.challanDate),
      productId: product.id,
      description: row.description,
      qty,
      unitPrice,
      vatRate,
      sdRate,
      truncatedBasePct,
    });
  });

  // Import valid rows one-by-one in a transaction (challan numbers must be sequential)
  let imported = 0;
  for (const v of validRows) {
    try {
      await prisma.$transaction(async (tx: any) => {
        const challanNo = await generateChallanNo(tx, companyId);
        const taxableValue = Math.round(v.qty * v.unitPrice * 100) / 100;
        const vatAmount = Math.round(taxableValue * (v.vatRate / 100) * 100) / 100;
        const sdAmount = Math.round(taxableValue * (v.sdRate / 100) * 100) / 100;
        const lineTotal = Math.round((taxableValue + sdAmount) * 100) / 100;
        const grandTotal = Math.round((lineTotal + vatAmount) * 100) / 100;

        await tx.invoice.create({
          data: {
            companyId,
            customerId: v.customerId,
            invoiceType: v.invoiceType,
            challanNo,
            challanDate: v.challanDate,
            subtotal: new Decimal(taxableValue),
            sdTotal: new Decimal(sdAmount),
            vatTotal: new Decimal(vatAmount),
            specificDutyTotal: new Decimal(0),
            grandTotal: new Decimal(grandTotal),
            vdsApplicable: false,
            vdsAmount: new Decimal(0),
            netReceivable: new Decimal(grandTotal),
            createdBy: userId,
            items: {
              create: [{
                productId: v.productId,
                description: v.description,
                qty: new Decimal(v.qty),
                unitPrice: new Decimal(v.unitPrice),
                vatRate: new Decimal(v.vatRate),
                sdRate: new Decimal(v.sdRate),
                specificDutyAmount: new Decimal(0),
                truncatedBasePct: new Decimal(v.truncatedBasePct),
                taxableValue: new Decimal(taxableValue),
                sdAmount: new Decimal(sdAmount),
                vatAmount: new Decimal(vatAmount),
                specificDutyLine: new Decimal(0),
                lineTotal: new Decimal(lineTotal),
                grandTotal: new Decimal(grandTotal),
                vdsRate: new Decimal(0),
                vdsAmount: new Decimal(0),
              }],
            },
          },
        });
      });
      imported++;
    } catch {
      // challan conflict or other DB error — skip silently, already validated
    }
  }

  return { imported, errors };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/services/importExport.service.ts
git commit -m "feat: add invoice import to importExport service"
```

---

## Task 4: Import/Export Service — Export Functions

**Files:**
- Modify: `server/src/services/importExport.service.ts`

- [ ] **Step 1: Append export functions to the service**

Add to the bottom of `server/src/services/importExport.service.ts`:

```typescript
// ─── Export ───────────────────────────────────────────────────────────────────

type ExportFormat = 'csv' | 'xlsx';

function buildBuffer(rows: Record<string, unknown>[], format: ExportFormat): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const bookType = format === 'csv' ? 'csv' : 'xlsx';
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType }));
}

export async function exportProducts(companyId: bigint, format: ExportFormat): Promise<Buffer> {
  const products = await prisma.product.findMany({
    where: { companyId },
    orderBy: { name: 'asc' },
  });

  const rows = products.map(p => ({
    productCode: p.productCode ?? '',
    name: p.name,
    nameBn: p.nameBn ?? '',
    type: p.type,
    hsCode: p.hsCode ?? '',
    serviceCode: p.serviceCode ?? '',
    vatRate: Number(p.vatRate),
    sdRate: Number(p.sdRate),
    specificDutyAmount: Number(p.specificDutyAmount),
    truncatedBasePct: Number(p.truncatedBasePct),
    unit: p.unit,
    unitPrice: Number(p.unitPrice),
    isActive: p.isActive ? 'yes' : 'no',
  }));

  return buildBuffer(rows, format);
}

export async function exportCustomers(companyId: bigint, format: ExportFormat): Promise<Buffer> {
  const customers = await prisma.customer.findMany({
    where: { companyId },
    orderBy: { name: 'asc' },
  });

  const rows = customers.map(c => ({
    name: c.name,
    binNid: c.binNid ?? '',
    phone: c.phone ?? '',
    address: c.address ?? '',
    isVdsEntity: c.isVdsEntity ? 'yes' : 'no',
    vdsEntityType: c.vdsEntityType ?? '',
    isActive: c.isActive ? 'yes' : 'no',
  }));

  return buildBuffer(rows, format);
}

export async function exportInvoices(
  companyId: bigint,
  format: ExportFormat,
  filters?: { invoiceType?: string; from?: string; to?: string }
): Promise<Buffer> {
  const where: any = { companyId };
  if (filters?.invoiceType) where.invoiceType = filters.invoiceType;
  if (filters?.from || filters?.to) {
    where.challanDate = {};
    if (filters.from) where.challanDate.gte = new Date(filters.from);
    if (filters.to) where.challanDate.lte = new Date(filters.to);
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: { items: { include: { product: true } }, customer: true },
    orderBy: { challanDate: 'asc' },
  });

  const rows: Record<string, unknown>[] = [];
  for (const inv of invoices) {
    for (const item of inv.items) {
      rows.push({
        challanNo: inv.challanNo,
        challanDate: inv.challanDate.toISOString().slice(0, 10),
        invoiceType: inv.invoiceType,
        status: inv.status,
        customerName: inv.customer?.name ?? '',
        customerBin: inv.customer?.binNid ?? '',
        productCode: item.product?.productCode ?? '',
        description: item.description,
        qty: Number(item.qty),
        unitPrice: Number(item.unitPrice),
        vatRate: Number(item.vatRate),
        sdRate: Number(item.sdRate),
        taxableValue: Number(item.taxableValue),
        sdAmount: Number(item.sdAmount),
        vatAmount: Number(item.vatAmount),
        lineTotal: Number(item.lineTotal),
        grandTotal: Number(item.grandTotal),
        vdsRate: Number(item.vdsRate),
        vdsAmount: Number(item.vdsAmount),
      });
    }
  }

  return buildBuffer(rows, format);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/services/importExport.service.ts
git commit -m "feat: add product/customer/invoice export to importExport service"
```

---

## Task 5: Controller, Routes, and Wire into app.ts

**Files:**
- Create: `server/src/controllers/importExport.controller.ts`
- Create: `server/src/routes/importExport.routes.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Create the controller**

Create `server/src/controllers/importExport.controller.ts`:

```typescript
import { Request, Response } from 'express';
import * as svc from '../services/importExport.service';
import { success, error } from '../utils/response';

// POST /import/preview
// Body: multipart file. Returns headers, first 5 preview rows, field list, suggested columnMap.
export async function preview(req: Request, res: Response) {
  if (!req.file) return error(res, 'No file uploaded');

  const entity = req.query.entity as string;
  const fieldDefs: Record<string, typeof svc.PRODUCT_FIELDS> = {
    products: svc.PRODUCT_FIELDS,
    customers: svc.CUSTOMER_FIELDS,
    invoices: svc.INVOICE_FIELDS,
  };
  const fields = fieldDefs[entity];
  if (!fields) return error(res, 'entity must be one of: products, customers, invoices');

  const parsed = svc.parseFile(req.file.buffer);
  const suggestedMap = svc.suggestColumnMap(parsed.headers, fields);

  return success(res, {
    headers: parsed.headers,
    previewRows: parsed.rows.slice(0, 5),
    totalRows: parsed.rows.length,
    fields,
    suggestedMap,
  });
}

// POST /import/products
export async function importProducts(req: Request, res: Response) {
  if (!req.file) return error(res, 'No file uploaded');

  let columnMap: svc.ColumnMap;
  try {
    columnMap = JSON.parse(req.body.columnMap ?? '{}');
  } catch {
    return error(res, 'columnMap must be valid JSON');
  }

  // Validate required fields are mapped
  const missing = svc.PRODUCT_FIELDS
    .filter(f => f.required && !columnMap[f.name])
    .map(f => f.label);
  if (missing.length > 0) return error(res, `Missing required column mappings: ${missing.join(', ')}`);

  try {
    const result = await svc.importProducts(req.companyId!, req.file.buffer, columnMap);
    return success(res, result);
  } catch (err: any) {
    return error(res, err.message);
  }
}

// POST /import/customers
export async function importCustomers(req: Request, res: Response) {
  if (!req.file) return error(res, 'No file uploaded');

  let columnMap: svc.ColumnMap;
  try {
    columnMap = JSON.parse(req.body.columnMap ?? '{}');
  } catch {
    return error(res, 'columnMap must be valid JSON');
  }

  const missing = svc.CUSTOMER_FIELDS
    .filter(f => f.required && !columnMap[f.name])
    .map(f => f.label);
  if (missing.length > 0) return error(res, `Missing required column mappings: ${missing.join(', ')}`);

  try {
    const result = await svc.importCustomers(req.companyId!, req.file.buffer, columnMap);
    return success(res, result);
  } catch (err: any) {
    return error(res, err.message);
  }
}

// POST /import/invoices
export async function importInvoices(req: Request, res: Response) {
  if (!req.file) return error(res, 'No file uploaded');

  let columnMap: svc.ColumnMap;
  try {
    columnMap = JSON.parse(req.body.columnMap ?? '{}');
  } catch {
    return error(res, 'columnMap must be valid JSON');
  }

  const missing = svc.INVOICE_FIELDS
    .filter(f => f.required && !columnMap[f.name])
    .map(f => f.label);
  if (missing.length > 0) return error(res, `Missing required column mappings: ${missing.join(', ')}`);

  try {
    const result = await svc.importInvoices(req.companyId!, req.user!.userId as unknown as bigint, req.file.buffer, columnMap);
    return success(res, result);
  } catch (err: any) {
    return error(res, err.message);
  }
}

// GET /export/products?format=csv|xlsx
export async function exportProducts(req: Request, res: Response) {
  const format = (req.query.format === 'xlsx') ? 'xlsx' : 'csv';
  const buf = await svc.exportProducts(req.companyId!, format);
  const mime = format === 'xlsx'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'text/csv';
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `attachment; filename="products.${format}"`);
  res.send(buf);
}

// GET /export/customers?format=csv|xlsx
export async function exportCustomers(req: Request, res: Response) {
  const format = (req.query.format === 'xlsx') ? 'xlsx' : 'csv';
  const buf = await svc.exportCustomers(req.companyId!, format);
  const mime = format === 'xlsx'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'text/csv';
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `attachment; filename="customers.${format}"`);
  res.send(buf);
}

// GET /export/invoices?format=csv|xlsx&invoiceType=sales|purchase&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function exportInvoices(req: Request, res: Response) {
  const format = (req.query.format === 'xlsx') ? 'xlsx' : 'csv';
  const invoiceType = req.query.invoiceType as string | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;

  const buf = await svc.exportInvoices(req.companyId!, format, { invoiceType, from, to });
  const mime = format === 'xlsx'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'text/csv';
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `attachment; filename="invoices.${format}"`);
  res.send(buf);
}
```

- [ ] **Step 2: Create the routes file**

Create `server/src/routes/importExport.routes.ts`:

```typescript
import { Router } from 'express';
import multer from 'multer';
import * as ctrl from '../controllers/importExport.controller';
import { authenticate } from '../middleware/auth.middleware';
import { companyScope } from '../middleware/companyScope.middleware';
import { auditLog } from '../middleware/auditLog.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB limit

router.use(authenticate, companyScope);

// Import routes (POST) — auditLog middleware fires on these
router.post('/import/preview',   upload.single('file'), ctrl.preview);
router.post('/import/products',  upload.single('file'), auditLog, ctrl.importProducts);
router.post('/import/customers', upload.single('file'), auditLog, ctrl.importCustomers);
router.post('/import/invoices',  upload.single('file'), auditLog, ctrl.importInvoices);

// Export routes (GET) — read-only, no audit needed
router.get('/export/products',  ctrl.exportProducts);
router.get('/export/customers', ctrl.exportCustomers);
router.get('/export/invoices',  ctrl.exportInvoices);

export default router;
```

- [ ] **Step 3: Wire the routes into app.ts**

In `server/src/app.ts`, add after the existing import lines:

```typescript
import importExportRoutes from './routes/importExport.routes';
```

And add the mount after the existing `app.use` lines (before the closing `export default app`):

```typescript
app.use('/api/v1', importExportRoutes);
```

- [ ] **Step 4: Fix userId type in controller**

The `req.user!.userId` from the JWT payload is a `string` in `TokenPayload`. Open `server/src/utils/jwt.ts` to check the exact shape, then update the `importInvoices` controller to convert properly:

Read `server/src/utils/jwt.ts` first, then use:
```typescript
const result = await svc.importInvoices(
  req.companyId!,
  BigInt(req.user!.userId),
  req.file.buffer,
  columnMap
);
```

Replace the line in `importInvoices` controller that reads:
```typescript
const result = await svc.importInvoices(req.companyId!, req.user!.userId as unknown as bigint, req.file.buffer, columnMap);
```
with:
```typescript
const result = await svc.importInvoices(req.companyId!, BigInt(req.user!.userId), req.file.buffer, columnMap);
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 6: Smoke test the server**

```bash
# In one terminal:
cd server && npm run dev

# In another terminal (PowerShell or bash):
curl -s http://localhost:4000/api/v1/health
```

Expected: `{"success":true,"data":{"status":"ok",...}}`

- [ ] **Step 7: Commit**

```bash
git add server/src/controllers/importExport.controller.ts \
        server/src/routes/importExport.routes.ts \
        server/src/app.ts
git commit -m "feat: add import/export controller, routes, and wire into app"
```

---

## Task 6: Client — ImportExportPage (Export Tab)

**Files:**
- Create: `client/src/pages/importExport/ImportExportPage.tsx`

Build the Export tab first — it's simpler and lets us verify the download endpoints work end-to-end.

- [ ] **Step 1: Create the page with the Export tab wired up**

Create `client/src/pages/importExport/ImportExportPage.tsx`:

```tsx
import { useState } from 'react';
import { Tabs, Button, Space, Select, DatePicker, Typography, Card, Row, Col, message } from 'antd';
import { DownloadOutlined, UploadOutlined, InboxOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import Upload from 'antd/es/upload';
import dayjs from 'dayjs';
import api from '../../services/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Dragger } = Upload;

// ─── Export Tab ───────────────────────────────────────────────────────────────

function ExportSection() {
  const [invoiceType, setInvoiceType] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  const download = async (path: string, filename: string) => {
    try {
      const res = await api.get(path, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error('Export failed');
    }
  };

  const downloadProducts = (format: 'csv' | 'xlsx') =>
    download(`/export/products?format=${format}`, `products.${format}`);

  const downloadCustomers = (format: 'csv' | 'xlsx') =>
    download(`/export/customers?format=${format}`, `customers.${format}`);

  const downloadInvoices = (format: 'csv' | 'xlsx') => {
    const params = new URLSearchParams({ format });
    if (invoiceType) params.set('invoiceType', invoiceType);
    if (dateRange) {
      params.set('from', dateRange[0]);
      params.set('to', dateRange[1]);
    }
    download(`/export/invoices?${params.toString()}`, `invoices.${format}`);
  };

  return (
    <div className="space-y-6">
      <Row gutter={[16, 16]}>
        {/* Products */}
        <Col xs={24} md={8}>
          <Card title="Products" size="small">
            <Text type="secondary" className="block mb-4">
              Export all products with VAT rates, pricing, and codes.
            </Text>
            <Space>
              <Button icon={<DownloadOutlined />} onClick={() => downloadProducts('csv')}>CSV</Button>
              <Button icon={<DownloadOutlined />} type="primary" onClick={() => downloadProducts('xlsx')}>Excel</Button>
            </Space>
          </Card>
        </Col>

        {/* Customers */}
        <Col xs={24} md={8}>
          <Card title="Customers / Suppliers" size="small">
            <Text type="secondary" className="block mb-4">
              Export all customers and suppliers with BIN/NID and contact info.
            </Text>
            <Space>
              <Button icon={<DownloadOutlined />} onClick={() => downloadCustomers('csv')}>CSV</Button>
              <Button icon={<DownloadOutlined />} type="primary" onClick={() => downloadCustomers('xlsx')}>Excel</Button>
            </Space>
          </Card>
        </Col>

        {/* Invoices */}
        <Col xs={24} md={8}>
          <Card title="Invoices" size="small">
            <div className="space-y-3 mb-4">
              <Select
                allowClear
                placeholder="All types"
                style={{ width: '100%' }}
                options={[
                  { value: 'sales', label: 'Sales only' },
                  { value: 'purchase', label: 'Purchase only' },
                ]}
                onChange={setInvoiceType}
              />
              <RangePicker
                style={{ width: '100%' }}
                onChange={(_, strs) => {
                  if (strs[0] && strs[1]) setDateRange([strs[0], strs[1]]);
                  else setDateRange(null);
                }}
              />
            </div>
            <Space>
              <Button icon={<DownloadOutlined />} onClick={() => downloadInvoices('csv')}>CSV</Button>
              <Button icon={<DownloadOutlined />} type="primary" onClick={() => downloadInvoices('xlsx')}>Excel</Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

// ─── Import Tab (stub — implemented in Task 7) ────────────────────────────────

function ImportSection() {
  return (
    <div className="flex items-center justify-center h-40 text-slate-400">
      Import feature — coming in next task
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ImportExportPage() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>Import / Export</Title>
      <Tabs
        defaultActiveKey="export"
        items={[
          { key: 'export', label: 'Export Data', children: <ExportSection /> },
          { key: 'import', label: 'Import Data', children: <ImportSection /> },
        ]}
      />
    </div>
  );
}
```

- [ ] **Step 2: Wire the route and sidebar (do both at once)**

In `client/src/App.tsx`, add the import at the top:

```tsx
import ImportExportPage from './pages/importExport/ImportExportPage';
```

Add the route inside the layout `<Route>` block (after the `audit-logs` route):

```tsx
<Route path="import-export" element={<ImportExportPage />} />
```

In `client/src/components/AppLayout.tsx`, add to the `menuItems` array (after the audit-logs entry, before settings):

```tsx
{ key: '/import-export', icon: 'import_export', label: 'Import / Export' },
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd client && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Manual test — export works**

1. Start the app: `npm run dev` from the repo root
2. Log in and select a company
3. Navigate to "Import / Export" in the sidebar
4. Click "Export" tab → click "CSV" under Products
5. Verify a `products.csv` file downloads with correct columns

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/importExport/ImportExportPage.tsx \
        client/src/App.tsx \
        client/src/components/AppLayout.tsx
git commit -m "feat: add ImportExportPage with export tab and sidebar/router wiring"
```

---

## Task 7: Client — Import Tab with Column Mapping UI

**Files:**
- Modify: `client/src/pages/importExport/ImportExportPage.tsx`

The import flow is a 3-step wizard per entity:
1. **Upload** — drag-and-drop a CSV or Excel file
2. **Map Columns** — table showing expected fields; user maps each to a file column via dropdown
3. **Result** — show imported count + error list per row

- [ ] **Step 1: Replace the `ImportSection` stub with the full implementation**

Replace the `ImportSection` function and all its imports in `ImportExportPage.tsx`. The final file should look like this (full replacement of the file):

```tsx
import { useState } from 'antd/node_modules/react'; // remove this line - just use:
```

Replace the entire `client/src/pages/importExport/ImportExportPage.tsx` with:

```tsx
import { useState } from 'react';
import {
  Tabs, Button, Space, Select, DatePicker, Typography, Card, Row, Col,
  message, Steps, Table, Tag, Alert, Upload, Spin,
} from 'antd';
import { DownloadOutlined, InboxOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload';
import api from '../../services/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Dragger } = Upload;

// ─── Types ────────────────────────────────────────────────────────────────────

interface FieldDef {
  name: string;
  label: string;
  required: boolean;
}

interface PreviewData {
  headers: string[];
  previewRows: Record<string, string>[];
  totalRows: number;
  fields: FieldDef[];
  suggestedMap: Record<string, string>;
}

interface ImportError {
  row: number;
  field: string;
  message: string;
}

interface ImportResultData {
  imported: number;
  errors: ImportError[];
}

// ─── Export Tab ───────────────────────────────────────────────────────────────

function ExportSection() {
  const [invoiceType, setInvoiceType] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  const download = async (path: string, filename: string) => {
    try {
      const res = await api.get(path, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error('Export failed');
    }
  };

  const downloadProducts = (format: 'csv' | 'xlsx') =>
    download(`/export/products?format=${format}`, `products.${format}`);

  const downloadCustomers = (format: 'csv' | 'xlsx') =>
    download(`/export/customers?format=${format}`, `customers.${format}`);

  const downloadInvoices = (format: 'csv' | 'xlsx') => {
    const params = new URLSearchParams({ format });
    if (invoiceType) params.set('invoiceType', invoiceType);
    if (dateRange) {
      params.set('from', dateRange[0]);
      params.set('to', dateRange[1]);
    }
    download(`/export/invoices?${params.toString()}`, `invoices.${format}`);
  };

  return (
    <div className="space-y-6">
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card title="Products" size="small">
            <Text type="secondary" className="block mb-4">
              Export all products with VAT rates, pricing, and codes.
            </Text>
            <Space>
              <Button icon={<DownloadOutlined />} onClick={() => downloadProducts('csv')}>CSV</Button>
              <Button icon={<DownloadOutlined />} type="primary" onClick={() => downloadProducts('xlsx')}>Excel</Button>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Customers / Suppliers" size="small">
            <Text type="secondary" className="block mb-4">
              Export all customers and suppliers with BIN/NID and contact info.
            </Text>
            <Space>
              <Button icon={<DownloadOutlined />} onClick={() => downloadCustomers('csv')}>CSV</Button>
              <Button icon={<DownloadOutlined />} type="primary" onClick={() => downloadCustomers('xlsx')}>Excel</Button>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Invoices" size="small">
            <div className="space-y-3 mb-4">
              <Select
                allowClear
                placeholder="All types"
                style={{ width: '100%' }}
                options={[
                  { value: 'sales', label: 'Sales only' },
                  { value: 'purchase', label: 'Purchase only' },
                ]}
                onChange={setInvoiceType}
              />
              <RangePicker
                style={{ width: '100%' }}
                onChange={(_, strs) => {
                  if (strs[0] && strs[1]) setDateRange([strs[0], strs[1]]);
                  else setDateRange(null);
                }}
              />
            </div>
            <Space>
              <Button icon={<DownloadOutlined />} onClick={() => downloadInvoices('csv')}>CSV</Button>
              <Button icon={<DownloadOutlined />} type="primary" onClick={() => downloadInvoices('xlsx')}>Excel</Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

// ─── Import Wizard ────────────────────────────────────────────────────────────

function ImportWizard({ entity }: { entity: 'products' | 'customers' | 'invoices' }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<RcFile | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportResultData | null>(null);

  const reset = () => {
    setStep(0);
    setFile(null);
    setPreview(null);
    setColumnMap({});
    setResult(null);
  };

  // Step 0 → Step 1: upload and preview
  const handleUpload = async (f: RcFile) => {
    setFile(f);
    setLoading(true);
    const form = new FormData();
    form.append('file', f);
    try {
      const { data } = await api.post(`/import/preview?entity=${entity}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(data.data);
      setColumnMap(data.data.suggestedMap);
      setStep(1);
    } catch {
      message.error('Failed to parse file');
    } finally {
      setLoading(false);
    }
    return false; // prevent antd auto-upload
  };

  // Step 1 → Step 2: import with confirmed mapping
  const handleImport = async () => {
    if (!file || !preview) return;
    setLoading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('columnMap', JSON.stringify(columnMap));
    try {
      const { data } = await api.post(`/import/${entity}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data.data);
      setStep(2);
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 0: Upload ──
  if (step === 0) {
    return (
      <Spin spinning={loading}>
        <Dragger
          beforeUpload={handleUpload}
          accept=".csv,.xlsx,.xls"
          showUploadList={false}
          style={{ padding: '24px 0' }}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined style={{ fontSize: 48, color: '#00503a' }} /></p>
          <p className="ant-upload-text">Click or drag a CSV / Excel file here</p>
          <p className="ant-upload-hint">Supports .csv, .xlsx, .xls — max 10 MB</p>
        </Dragger>
      </Spin>
    );
  }

  // ── Step 1: Map Columns ──
  if (step === 1 && preview) {
    const headerOptions = preview.headers.map(h => ({ value: h, label: h }));

    const mappingColumns = [
      {
        title: 'Expected Field',
        dataIndex: 'label',
        key: 'label',
        render: (label: string, rec: FieldDef) => (
          <span>
            {label}
            {rec.required && <Tag color="red" style={{ marginLeft: 8 }}>required</Tag>}
          </span>
        ),
      },
      {
        title: `Map to column in "${file?.name}"`,
        key: 'mapping',
        render: (_: unknown, rec: FieldDef) => (
          <Select
            style={{ width: 280 }}
            allowClear
            placeholder="— skip —"
            options={headerOptions}
            value={columnMap[rec.name] ?? undefined}
            onChange={(val) =>
              setColumnMap(prev => val ? { ...prev, [rec.name]: val } : Object.fromEntries(Object.entries(prev).filter(([k]) => k !== rec.name)))
            }
          />
        ),
      },
    ];

    const missingRequired = preview.fields.filter(f => f.required && !columnMap[f.name]);

    return (
      <Spin spinning={loading}>
        <div className="space-y-4">
          <Alert
            type="info"
            message={`Detected ${preview.totalRows} data rows in "${file?.name}". Map the columns below, then click Import.`}
          />
          <Table
            dataSource={preview.fields}
            columns={mappingColumns}
            rowKey="name"
            pagination={false}
            size="small"
          />
          {missingRequired.length > 0 && (
            <Alert
              type="warning"
              message={`Map required fields first: ${missingRequired.map(f => f.label).join(', ')}`}
            />
          )}
          <Space>
            <Button onClick={reset}>Back</Button>
            <Button
              type="primary"
              disabled={missingRequired.length > 0}
              loading={loading}
              onClick={handleImport}
            >
              Import {preview.totalRows} rows
            </Button>
          </Space>
        </div>
      </Spin>
    );
  }

  // ── Step 2: Result ──
  if (step === 2 && result) {
    const errorColumns = [
      { title: 'Row', dataIndex: 'row', key: 'row', width: 80 },
      { title: 'Field', dataIndex: 'field', key: 'field', width: 160 },
      { title: 'Error', dataIndex: 'message', key: 'message' },
    ];

    return (
      <div className="space-y-4">
        <Alert
          type={result.errors.length === 0 ? 'success' : 'warning'}
          icon={result.errors.length === 0 ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          message={
            `Imported ${result.imported} records` +
            (result.errors.length > 0 ? `, ${result.errors.length} rows skipped due to errors` : ' successfully')
          }
          showIcon
        />
        {result.errors.length > 0 && (
          <Table
            dataSource={result.errors}
            columns={errorColumns}
            rowKey={(r) => `${r.row}-${r.field}`}
            size="small"
            pagination={{ pageSize: 10 }}
            title={() => <Text strong>Skipped rows</Text>}
          />
        )}
        <Button onClick={reset}>Import another file</Button>
      </div>
    );
  }

  return null;
}

// ─── Import Tab ───────────────────────────────────────────────────────────────

function ImportSection() {
  return (
    <div className="space-y-6">
      <Alert
        type="info"
        showIcon
        message="Import tips"
        description={
          <ul className="list-disc pl-4 mt-1 space-y-1 text-sm">
            <li>Supports CSV, XLS, and XLSX files up to 10 MB.</li>
            <li>The first row must be a header row.</li>
            <li>For Invoices: each row creates one invoice with one item. Match products by their Product Code.</li>
            <li>Rows with validation errors are skipped; valid rows are always imported.</li>
          </ul>
        }
      />
      <Tabs
        type="card"
        items={[
          { key: 'products', label: 'Products', children: <ImportWizard entity="products" /> },
          { key: 'customers', label: 'Customers / Suppliers', children: <ImportWizard entity="customers" /> },
          { key: 'invoices', label: 'Invoices', children: <ImportWizard entity="invoices" /> },
        ]}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ImportExportPage() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>Import / Export</Title>
      <Tabs
        defaultActiveKey="export"
        items={[
          { key: 'export', label: 'Export Data', children: <ExportSection /> },
          { key: 'import', label: 'Import Data', children: <ImportSection /> },
        ]}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd client && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Manual test — full import flow**

1. Start the app: `npm run dev`
2. Create a test CSV for products with columns: `Name,Type (product/service),VAT Rate (%),Product Code`
   ```
   Name,Type (product/service),VAT Rate (%),Product Code
   Test Widget,product,15,TW001
   Test Service,service,5,TS001
   ```
3. Navigate to Import / Export → Import Data → Products
4. Upload the CSV file
5. Verify the column mapping UI appears with pre-filled suggestions
6. Click "Import 2 rows"
7. Verify the result shows "Imported 2 records"
8. Navigate to Products page to confirm both products exist

- [ ] **Step 4: Manual test — import error report**

Create a CSV with one bad row:
```
Name,Type (product/service),VAT Rate (%)
Good Product,product,15
,service,5
Bad Product,unknown,15
```
Expected: "Imported 1 records, 2 rows skipped" with errors listed for rows 3 and 4.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/importExport/ImportExportPage.tsx
git commit -m "feat: add full import tab with column mapping wizard and validation report"
```

---

## Self-Review Checklist

### Spec coverage
| PRD requirement | Covered by |
|----------------|-----------|
| CSV/Excel import for products | Tasks 2, 7 |
| CSV/Excel import for customers | Tasks 2, 7 |
| CSV/Excel import for transactions (invoices) | Tasks 3, 7 |
| Export PDF / Excel / CSV | PDF already exists; CSV/XLSX in Tasks 4, 6 |
| Column mapping assistant during import | Task 7 (`ImportWizard` step 1) |
| Validation report after import | Task 7 (`ImportWizard` step 2) + `ImportResult.errors` |

### Placeholder scan — none found.

### Type consistency
- `ColumnMap` defined in Task 2, used in Tasks 3, 4, 5 consistently.
- `PRODUCT_FIELDS`, `CUSTOMER_FIELDS`, `INVOICE_FIELDS` defined in service (Tasks 2–3), re-exported via controller in Task 5.
- `ImportResult` type used consistently in service and reflected in `ImportResultData` on client.
- `ParsedFile` type used internally in service only.
- `req.user!.userId` → `BigInt(req.user!.userId)` fixed in Task 5 Step 4.
