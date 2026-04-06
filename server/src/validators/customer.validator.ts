import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(2).max(200),
  binNid: z.string().max(50).optional().refine(
    (val) => !val || /^\d{13}$/.test(val) || /^\d{10,17}$/.test(val),
    { message: 'BIN must be 13 digits, or NID must be 10-17 digits' }
  ),
  phone: z.string().max(30).optional(),
  address: z.string().optional(),
  isVdsEntity: z.boolean().default(false),
  vdsEntityType: z.enum(['bank', 'govt', 'ngo', 'listed_company']).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
