import { z } from 'zod';

const categoryEnum = z.enum(['general', 'women_senior', 'third_gender_disabled', 'freedom_fighter']);
const statusEnum = z.enum(['existing', 'new']);

export const computeIncomeTaxSchema = z.object({
  assessmentYear: z.string().regex(/^\d{4}-\d{4}$/, 'Assessment year must be YYYY-YYYY'),
  category: categoryEnum,
  taxpayerStatus: statusEnum,
  subjectToMin: z.boolean().optional(),
  taxableIncome: z.number().min(0),
  advanceTaxPaid: z.number().min(0).optional(),
  notes: z.string().optional(),
});

// Preview does not persist, so the assessment year is optional there.
export const previewIncomeTaxSchema = computeIncomeTaxSchema.partial({ assessmentYear: true });

export const updateIncomeTaxSchema = computeIncomeTaxSchema.partial();

export type ComputeIncomeTaxInput = z.infer<typeof computeIncomeTaxSchema>;
export type PreviewIncomeTaxInput = z.infer<typeof previewIncomeTaxSchema>;
export type UpdateIncomeTaxInput = z.infer<typeof updateIncomeTaxSchema>;
