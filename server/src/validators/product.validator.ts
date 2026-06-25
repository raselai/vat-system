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
  openingStock: z.number().min(0).default(0),
});

export const updateProductSchema = createProductSchema.partial();

export const createAdjustmentSchema = z.object({
  qty: z.number().refine((v) => v !== 0, { message: 'Adjustment quantity cannot be zero' }),
  reason: z.string().min(1).max(255),
  adjustedAt: z.string().min(1),
});

export const bulkRateUpdateSchema = z
  .object({
    productIds: z.array(z.string().min(1)).min(1, { message: 'Select at least one product' }),
    vatRate: z.number().min(0).max(100).optional(),
    sdRate: z.number().min(0).max(100).optional(),
  })
  .refine((d) => d.vatRate !== undefined || d.sdRate !== undefined, {
    message: 'Provide a new VAT rate, a new SD rate, or both',
  });

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateAdjustmentInput = z.infer<typeof createAdjustmentSchema>;
export type BulkRateUpdateInput = z.infer<typeof bulkRateUpdateSchema>;
