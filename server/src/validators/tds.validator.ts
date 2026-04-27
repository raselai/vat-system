import { z } from 'zod';

export const createDeductionSchema = z.object({
  deductionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  sectionCode: z.string().min(1).max(20),
  deducteeName: z.string().min(1).max(200),
  deducteeTin: z.string().regex(/^\d{12}$/, 'TIN must be exactly 12 digits'),
  deducteeAddress: z.string().optional(),
  grossAmount: z.number().min(0),
  tdsRate: z.number().min(0).max(100),
  tdsAmount: z.number().min(0),
  invoiceId: z.string().optional(),
  notes: z.string().optional(),
});

export const updateDeductionSchema = createDeductionSchema.partial();

export const createTdsPaymentSchema = z.object({
  challanNo: z.string().min(1).max(50),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  bankName: z.string().min(1).max(200),
  bankBranch: z.string().max(200).optional(),
  accountCode: z.string().max(50).optional(),
  totalAmount: z.number().min(0),
  notes: z.string().optional(),
  deductionIds: z.array(z.string()).optional(),
});

export const updateTdsPaymentSchema = createTdsPaymentSchema.partial();

export const linkDeductionsSchema = z.object({
  deductions: z.array(z.object({
    deductionId: z.string().min(1),
    amount: z.number().min(0),
  })).min(1),
});

export type CreateDeductionInput = z.infer<typeof createDeductionSchema>;
export type UpdateDeductionInput = z.infer<typeof updateDeductionSchema>;
export type CreateTdsPaymentInput = z.infer<typeof createTdsPaymentSchema>;
export type UpdateTdsPaymentInput = z.infer<typeof updateTdsPaymentSchema>;
export type LinkDeductionsInput = z.infer<typeof linkDeductionsSchema>;
