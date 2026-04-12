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
