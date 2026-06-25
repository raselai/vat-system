import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import * as productService from '../services/product.service';
import * as stockService from '../services/stock.service';
import { generateMusak61Pdf } from '../services/pdf.service';
import { createProductSchema, updateProductSchema, createAdjustmentSchema, bulkRateUpdateSchema } from '../validators/product.validator';
import { success, created, error, notFound } from '../utils/response';

export async function list(req: Request, res: Response) {
  const includeInactive = req.query.includeInactive === 'true';
  const products = await productService.listProducts(req.companyId!, includeInactive);
  return success(res, products);
}

export async function create(req: Request, res: Response) {
  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }

  try {
    const product = await productService.createProduct(req.companyId!, parsed.data);
    return created(res, product);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function get(req: Request, res: Response) {
  const product = await productService.getProductById(req.companyId!, BigInt(req.params.id as string));
  if (!product) {
    return notFound(res, 'Product not found');
  }
  return success(res, product);
}

export async function update(req: Request, res: Response) {
  const parsed = updateProductSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }

  const product = await productService.updateProduct(req.companyId!, BigInt(req.params.id as string), parsed.data);
  if (!product) {
    return notFound(res, 'Product not found');
  }
  return success(res, product);
}

export async function remove(req: Request, res: Response) {
  const deleted = await productService.deleteProduct(req.companyId!, BigInt(req.params.id as string));
  if (!deleted) {
    return notFound(res, 'Product not found');
  }
  return success(res, { message: 'Product deactivated' });
}

export async function bulkRateUpdate(req: Request, res: Response) {
  const parsed = bulkRateUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map((e) => e.message).join(', '));
  }
  try {
    const result = await productService.bulkUpdateRates(req.companyId!, parsed.data);
    return success(res, result);
  } catch (err: any) {
    return error(res, err.message);
  }
}

// ─── Stock ──────────────────────────────────────────────────────────────────

export async function stockSummary(req: Request, res: Response) {
  try {
    const rows = await stockService.computeStockForAllProducts(req.companyId!);
    return success(res, rows);
  } catch (err: any) {
    return error(res, err.message, 500);
  }
}

export async function stockRegister(req: Request, res: Response) {
  const register = await stockService.getStockRegister(req.companyId!, BigInt(req.params.id as string));
  if (!register) {
    return notFound(res, 'Product not found');
  }
  return success(res, register);
}

export async function stockRegisterPdf(req: Request, res: Response) {
  try {
    const register = await stockService.getStockRegister(req.companyId!, BigInt(req.params.id as string));
    if (!register) {
      return notFound(res, 'Product not found');
    }
    const company = await prisma.company.findUnique({
      where: { id: req.companyId! },
      select: { name: true, bin: true, address: true },
    });
    const pdfBuffer = await generateMusak61Pdf({
      companyName: company?.name ?? '',
      companyBin: company?.bin ?? '',
      companyAddress: company?.address ?? '',
      product: register.product,
      entries: register.entries,
      currentStock: register.currentStock,
    });
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="musak61-${req.params.id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err: any) {
    return error(res, `PDF generation failed: ${err.message}`, 500);
  }
}

export async function listAdjustments(req: Request, res: Response) {
  const rows = await stockService.listAdjustments(req.companyId!, BigInt(req.params.id as string));
  return success(res, rows);
}

export async function createAdjustment(req: Request, res: Response) {
  const parsed = createAdjustmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map((e) => e.message).join(', '));
  }
  try {
    const adjustment = await stockService.createAdjustment(
      req.companyId!,
      BigInt(req.params.id as string),
      BigInt(req.user!.userId),
      parsed.data,
    );
    if (!adjustment) {
      return notFound(res, 'Product not found');
    }
    return created(res, adjustment);
  } catch (err: any) {
    return error(res, err.message);
  }
}
