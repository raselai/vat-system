import { z } from 'zod';

const invoiceItemSchema = z.object({
  productId: z.string().min(1),
  description: z.string().min(1).max(255),
  descriptionBn: z.string().max(255).optional(),
  hsCode: z.string().max(20).optional(),
  qty: z.number().positive(),
  unitPrice: z.number().min(0),
  vatRate: z.number().min(0).max(100),
  sdRate: z.number().min(0).max(100).default(0),
  specificDutyAmount: z.number().min(0).default(0),
  truncatedBasePct: z.number().min(0).max(100).default(100),
  vdsRate: z.number().min(0).max(100).default(0),
});

export const createInvoiceSchema = z.object({
  customerId: z.string().optional(),
  invoiceType: z.enum(['sales', 'purchase']),
  challanDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  vdsApplicable: z.boolean().default(false),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
});

export const updateInvoiceSchema = z.object({
  customerId: z.string().optional(),
  challanDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  vdsApplicable: z.boolean().optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required').optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
