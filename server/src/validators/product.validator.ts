import { z } from 'zod';

export const createProductSchema = z.object({
  productCode: z.string().max(50).optional(),
  hsCode: z.string().max(20).optional(),
  serviceCode: z.string().max(20).optional(),
  name: z.string().min(2).max(200),
  nameBn: z.string().max(200).optional(),
  type: z.enum(['product', 'service']),
  vatRate: z.number().min(0).max(100),
  sdRate: z.number().min(0).max(100).default(0),
  specificDutyAmount: z.number().min(0).default(0),
  truncatedBasePct: z.number().min(0).max(100).default(100),
  unit: z.string().max(50).default('pcs'),
  unitPrice: z.number().min(0).default(0),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
