import { z } from 'zod';

export const generateReturnSchema = z.object({
  taxMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'taxMonth must be YYYY-MM format'),
});

export const updateReturnSchema = z.object({
  carryForward: z.number().min(0).optional(),
  increasingAdjustment: z.number().min(0).optional(),
  decreasingAdjustment: z.number().min(0).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export type GenerateReturnInput = z.infer<typeof generateReturnSchema>;
export type UpdateReturnInput = z.infer<typeof updateReturnSchema>;
