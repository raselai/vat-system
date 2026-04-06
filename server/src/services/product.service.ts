import prisma from '../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateProductInput, UpdateProductInput } from '../validators/product.validator';

function serializeProduct(product: any) {
  return {
    ...product,
    id: product.id.toString(),
    companyId: product.companyId.toString(),
    vatRate: Number(product.vatRate),
    sdRate: Number(product.sdRate),
    specificDutyAmount: Number(product.specificDutyAmount),
    truncatedBasePct: Number(product.truncatedBasePct),
    unitPrice: Number(product.unitPrice),
  };
}

export async function listProducts(companyId: bigint, includeInactive = false) {
  const where: any = { companyId };
  if (!includeInactive) {
    where.isActive = true;
  }
  const products = await prisma.product.findMany({ where, orderBy: { name: 'asc' } });
  return products.map(serializeProduct);
}

export async function createProduct(companyId: bigint, input: CreateProductInput) {
  const product = await prisma.product.create({
    data: {
      companyId,
      productCode: input.productCode,
      hsCode: input.hsCode,
      serviceCode: input.serviceCode,
      name: input.name,
      nameBn: input.nameBn,
      type: input.type,
      vatRate: new Decimal(input.vatRate),
      sdRate: new Decimal(input.sdRate),
      specificDutyAmount: new Decimal(input.specificDutyAmount),
      truncatedBasePct: new Decimal(input.truncatedBasePct),
      unit: input.unit,
      unitPrice: new Decimal(input.unitPrice),
    },
  });
  return serializeProduct(product);
}

export async function getProductById(companyId: bigint, productId: bigint) {
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId },
  });
  if (!product) return null;
  return serializeProduct(product);
}

export async function updateProduct(companyId: bigint, productId: bigint, input: UpdateProductInput) {
  const data: any = { ...input };
  if (input.vatRate !== undefined) data.vatRate = new Decimal(input.vatRate);
  if (input.sdRate !== undefined) data.sdRate = new Decimal(input.sdRate);
  if (input.specificDutyAmount !== undefined) data.specificDutyAmount = new Decimal(input.specificDutyAmount);
  if (input.truncatedBasePct !== undefined) data.truncatedBasePct = new Decimal(input.truncatedBasePct);
  if (input.unitPrice !== undefined) data.unitPrice = new Decimal(input.unitPrice);

  const product = await prisma.product.updateMany({
    where: { id: productId, companyId },
    data,
  });
  if (product.count === 0) return null;

  return getProductById(companyId, productId);
}

export async function deleteProduct(companyId: bigint, productId: bigint) {
  const result = await prisma.product.updateMany({
    where: { id: productId, companyId },
    data: { isActive: false },
  });
  return result.count > 0;
}
