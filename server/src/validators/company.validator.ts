import { z } from 'zod';

export const createCompanySchema = z.object({
  name: z.string().min(2).max(200),
  bin: z.string().regex(/^\d{13}$/, 'BIN must be exactly 13 digits'),
  tin: z.string().regex(/^\d{12}$/, 'TIN must be exactly 12 digits').optional(),
  address: z.string().min(5),
  challanPrefix: z.string().max(20).default('CH'),
  fiscalYearStart: z.number().int().min(1).max(12).default(7),
  // Opening VAT position (signed: + payable / − credit) and the tax month it applies to.
  openingVatBalance: z.number().optional(),
  openingVatMonth: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM').nullable().optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
