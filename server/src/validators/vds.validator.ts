import { z } from 'zod';

export const createCertificateSchema = z.object({
  certificateDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  role: z.enum(['deductor', 'deductee']),
  invoiceId: z.string().optional(),
  counterpartyName: z.string().min(1).max(200),
  counterpartyBin: z.string().regex(/^\d{13}$/, 'BIN must be 13 digits'),
  counterpartyAddress: z.string().optional(),
  totalValue: z.number().min(0),
  vatAmount: z.number().min(0),
  vdsRate: z.number().min(0).max(100),
  vdsAmount: z.number().min(0),
  notes: z.string().optional(),
});

export const updateCertificateSchema = z.object({
  certificateDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  counterpartyName: z.string().min(1).max(200).optional(),
  counterpartyBin: z.string().regex(/^\d{13}$/, 'BIN must be 13 digits').optional(),
  counterpartyAddress: z.string().optional(),
  totalValue: z.number().min(0).optional(),
  vatAmount: z.number().min(0).optional(),
  vdsRate: z.number().min(0).max(100).optional(),
  vdsAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const createDepositSchema = z.object({
  challanNo: z.string().min(1).max(50),
  depositDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  bankName: z.string().min(1).max(200),
  bankBranch: z.string().max(200).optional(),
  accountCode: z.string().max(50).optional(),
  totalAmount: z.number().min(0),
  notes: z.string().optional(),
  certificateIds: z.array(z.string()).optional(),
});

export const updateDepositSchema = z.object({
  challanNo: z.string().min(1).max(50).optional(),
  depositDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  bankName: z.string().min(1).max(200).optional(),
  bankBranch: z.string().max(200).optional(),
  accountCode: z.string().max(50).optional(),
  totalAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const linkCertificatesSchema = z.object({
  certificates: z.array(z.object({
    certificateId: z.string().min(1),
    amount: z.number().min(0),
  })).min(1),
});

export type CreateCertificateInput = z.infer<typeof createCertificateSchema>;
export type UpdateCertificateInput = z.infer<typeof updateCertificateSchema>;
export type CreateDepositInput = z.infer<typeof createDepositSchema>;
export type UpdateDepositInput = z.infer<typeof updateDepositSchema>;
export type LinkCertificatesInput = z.infer<typeof linkCertificatesSchema>;
