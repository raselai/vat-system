import { z } from 'zod';

export const createPaymentAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(200),
  type: z.enum(['cash', 'bank', 'mobile_banking']),
  accountNumber: z.string().max(50).optional(),
  bankName: z.string().max(200).optional(),
  openingBalance: z.number().default(0),
  isActive: z.boolean().optional(),
});

export const updatePaymentAccountSchema = createPaymentAccountSchema.partial();

export type CreatePaymentAccountInput = z.infer<typeof createPaymentAccountSchema>;
export type UpdatePaymentAccountInput = z.infer<typeof updatePaymentAccountSchema>;
