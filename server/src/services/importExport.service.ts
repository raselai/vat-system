import * as XLSX from 'xlsx';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
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
    const nameLower = field.name.toLowerCase();
    const match =
      headers.find(h => h.toLowerCase() === lower) ||              // exact label match
      headers.find(h => h.toLowerCase() === nameLower) ||          // exact field-name match
      headers.find(h => h.toLowerCase().includes(nameLower));      // header contains field name
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
  const valid: Prisma.ProductCreateManyInput[] = [];

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

    if (isNaN(unitPrice) || unitPrice < 0) {
      errors.push({ row: rowNum, field: 'unitPrice', message: 'Unit Price must be a number ≥ 0' });
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
  const valid: Prisma.CustomerCreateManyInput[] = [];

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

// Challan generation logic (mirrors invoice.service.ts generateChallanNo)
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

  // Import valid rows sequentially — challan numbers must be atomically sequential
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
      // Challan conflict or DB error — skip silently, already validated
    }
  }

  return { imported, errors };
}
