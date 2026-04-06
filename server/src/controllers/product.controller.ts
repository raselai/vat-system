import { Request, Response } from 'express';
import * as productService from '../services/product.service';
import { createProductSchema, updateProductSchema } from '../validators/product.validator';
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
