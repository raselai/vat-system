import { Request, Response } from 'express';
import * as svc from '../services/importExport.service';
import { success, error } from '../utils/response';

// POST /import/preview?entity=products|customers|invoices
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

  let parsed;
  try {
    parsed = svc.parseFile(req.file.buffer);
  } catch {
    return error(res, 'Failed to parse file. Ensure it is a valid CSV or Excel file.');
  }

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
    const result = await svc.importInvoices(
      req.companyId!,
      BigInt(req.user!.userId),
      req.file.buffer,
      columnMap
    );
    return success(res, result);
  } catch (err: any) {
    return error(res, err.message);
  }
}

// GET /export/products?format=csv|xlsx
export async function exportProducts(req: Request, res: Response) {
  const format = req.query.format === 'xlsx' ? 'xlsx' : 'csv';
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
  const format = req.query.format === 'xlsx' ? 'xlsx' : 'csv';
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
  const format = req.query.format === 'xlsx' ? 'xlsx' : 'csv';
  const invoiceType = req.query.invoiceType as string | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;

  // Validate invoiceType if provided
  if (invoiceType && !['sales', 'purchase'].includes(invoiceType)) {
    return error(res, 'invoiceType must be "sales" or "purchase"');
  }

  const buf = await svc.exportInvoices(req.companyId!, format, { invoiceType, from, to });
  const mime = format === 'xlsx'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'text/csv';
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `attachment; filename="invoices.${format}"`);
  res.send(buf);
}
