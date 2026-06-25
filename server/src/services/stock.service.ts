import prisma from '../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';

// ─── Result types ───────────────────────────────────────────────────────────

export interface StockRow {
  productId: string;
  name: string;
  unit: string;
  openingStock: number;
  purchased: number;
  sold: number;
  adjustments: number;
  currentStock: number;
}

export interface StockMovement {
  date: string;
  type: 'opening' | 'in' | 'out';
  source: 'opening' | 'invoice' | 'adjustment';
  invoiceType: 'sales' | 'purchase' | null;
  reference: string; // challanNo, "Opening Balance", or adjustment reason
  status: string | null;
  qtyIn: number;
  qtyOut: number;
  balance: number;
}

export interface StockRegister {
  product: { id: string; name: string; unit: string; openingStock: number };
  entries: StockMovement[];
  currentStock: number;
}

export interface StockAdjustmentRow {
  id: string;
  productId: string;
  qty: number;
  reason: string;
  adjustedAt: string;
  createdBy: string;
  createdAt: string;
}

// ─── Aggregation helpers ────────────────────────────────────────────────────

// Non-cancelled invoices count toward stock — same filter as reports.service.ts,
// so stock reconciles with the VAT registers the user already trusts.
const INVOICE_FILTER = { status: { not: 'cancelled' as const } };

function toNum(v: Decimal | null | undefined): number {
  return v ? Number(v) : 0;
}

// ─── computeStockForAllProducts — one catalog read + three groupBy queries ──

export async function computeStockForAllProducts(companyId: bigint): Promise<StockRow[]> {
  const products = await prisma.product.findMany({
    where: { companyId, isActive: true, type: 'product' },
    orderBy: { name: 'asc' },
  });

  const [purchaseSums, salesSums, adjustmentSums] = await Promise.all([
    prisma.invoiceItem.groupBy({
      by: ['productId'],
      where: { invoice: { companyId, invoiceType: 'purchase', ...INVOICE_FILTER } },
      _sum: { qty: true },
    }),
    prisma.invoiceItem.groupBy({
      by: ['productId'],
      where: { invoice: { companyId, invoiceType: 'sales', ...INVOICE_FILTER } },
      _sum: { qty: true },
    }),
    prisma.stockAdjustment.groupBy({
      by: ['productId'],
      where: { companyId },
      _sum: { qty: true },
    }),
  ]);

  const purchaseMap = new Map(purchaseSums.map((r) => [r.productId.toString(), toNum(r._sum.qty)]));
  const salesMap = new Map(salesSums.map((r) => [r.productId.toString(), toNum(r._sum.qty)]));
  const adjMap = new Map(adjustmentSums.map((r) => [r.productId.toString(), toNum(r._sum.qty)]));

  return products.map((p) => {
    const id = p.id.toString();
    const openingStock = toNum(p.openingStock);
    const purchased = purchaseMap.get(id) ?? 0;
    const sold = salesMap.get(id) ?? 0;
    const adjustments = adjMap.get(id) ?? 0;
    return {
      productId: id,
      name: p.name,
      unit: p.unit,
      openingStock,
      purchased,
      sold,
      adjustments,
      currentStock: openingStock + purchased - sold + adjustments,
    };
  });
}

// ─── computeStockForProduct ─────────────────────────────────────────────────

export async function computeStockForProduct(companyId: bigint, productId: bigint): Promise<StockRow | null> {
  const product = await prisma.product.findFirst({ where: { id: productId, companyId } });
  if (!product) return null;

  const [purchase, sales, adjustment] = await Promise.all([
    prisma.invoiceItem.aggregate({
      where: { productId, invoice: { companyId, invoiceType: 'purchase', ...INVOICE_FILTER } },
      _sum: { qty: true },
    }),
    prisma.invoiceItem.aggregate({
      where: { productId, invoice: { companyId, invoiceType: 'sales', ...INVOICE_FILTER } },
      _sum: { qty: true },
    }),
    prisma.stockAdjustment.aggregate({
      where: { companyId, productId },
      _sum: { qty: true },
    }),
  ]);

  const openingStock = toNum(product.openingStock);
  const purchased = toNum(purchase._sum.qty);
  const sold = toNum(sales._sum.qty);
  const adjustments = toNum(adjustment._sum.qty);

  return {
    productId: product.id.toString(),
    name: product.name,
    unit: product.unit,
    openingStock,
    purchased,
    sold,
    adjustments,
    currentStock: openingStock + purchased - sold + adjustments,
  };
}

// ─── getStockRegister — the Musak 6.1 ledger ────────────────────────────────

export async function getStockRegister(companyId: bigint, productId: bigint): Promise<StockRegister | null> {
  const product = await prisma.product.findFirst({ where: { id: productId, companyId } });
  if (!product) return null;

  const [items, adjustments] = await Promise.all([
    prisma.invoiceItem.findMany({
      where: { productId, invoice: { companyId, ...INVOICE_FILTER } },
      include: { invoice: { select: { challanNo: true, challanDate: true, invoiceType: true, status: true } } },
    }),
    prisma.stockAdjustment.findMany({ where: { companyId, productId } }),
  ]);

  // Merge invoice items and adjustments into one chronological movement stream.
  type Raw = { date: Date; ord: number; movement: Omit<StockMovement, 'balance'> };
  const raw: Raw[] = [];

  for (const item of items) {
    const isPurchase = item.invoice.invoiceType === 'purchase';
    const qty = toNum(item.qty);
    raw.push({
      date: item.invoice.challanDate,
      ord: Number(item.id),
      movement: {
        date: item.invoice.challanDate.toISOString(),
        type: isPurchase ? 'in' : 'out',
        source: 'invoice',
        invoiceType: item.invoice.invoiceType,
        reference: item.invoice.challanNo,
        status: item.invoice.status,
        qtyIn: isPurchase ? qty : 0,
        qtyOut: isPurchase ? 0 : qty,
      },
    });
  }

  for (const adj of adjustments) {
    const qty = toNum(adj.qty);
    const isIncrease = qty >= 0;
    raw.push({
      date: adj.adjustedAt,
      ord: Number(adj.id),
      movement: {
        date: adj.adjustedAt.toISOString(),
        type: isIncrease ? 'in' : 'out',
        source: 'adjustment',
        invoiceType: null,
        reference: adj.reason,
        status: null,
        qtyIn: isIncrease ? qty : 0,
        qtyOut: isIncrease ? 0 : Math.abs(qty),
      },
    });
  }

  raw.sort((a, b) => a.date.getTime() - b.date.getTime() || a.ord - b.ord);

  const openingStock = toNum(product.openingStock);
  let balance = openingStock;
  const entries: StockMovement[] = [
    {
      date: product.createdAt.toISOString(),
      type: 'opening',
      source: 'opening',
      invoiceType: null,
      reference: 'Opening Balance',
      status: null,
      qtyIn: 0,
      qtyOut: 0,
      balance: openingStock,
    },
  ];

  for (const { movement } of raw) {
    balance += movement.qtyIn - movement.qtyOut;
    entries.push({ ...movement, balance });
  }

  return {
    product: { id: product.id.toString(), name: product.name, unit: product.unit, openingStock },
    entries,
    currentStock: balance,
  };
}

// ─── Adjustments ────────────────────────────────────────────────────────────

function serializeAdjustment(adj: any): StockAdjustmentRow {
  return {
    id: adj.id.toString(),
    productId: adj.productId.toString(),
    qty: Number(adj.qty),
    reason: adj.reason,
    adjustedAt: adj.adjustedAt.toISOString(),
    createdBy: adj.createdBy.toString(),
    createdAt: adj.createdAt.toISOString(),
  };
}

export async function createAdjustment(
  companyId: bigint,
  productId: bigint,
  userId: bigint,
  input: { qty: number; reason: string; adjustedAt: string },
): Promise<StockAdjustmentRow | null> {
  const product = await prisma.product.findFirst({ where: { id: productId, companyId } });
  if (!product) return null;

  const adj = await prisma.stockAdjustment.create({
    data: {
      companyId,
      productId,
      qty: new Decimal(input.qty),
      reason: input.reason,
      adjustedAt: new Date(input.adjustedAt),
      createdBy: userId,
    },
  });
  return serializeAdjustment(adj);
}

export async function listAdjustments(companyId: bigint, productId: bigint): Promise<StockAdjustmentRow[]> {
  const adjustments = await prisma.stockAdjustment.findMany({
    where: { companyId, productId },
    orderBy: [{ adjustedAt: 'desc' }, { id: 'desc' }],
  });
  return adjustments.map(serializeAdjustment);
}
