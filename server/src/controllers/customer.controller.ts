import { Request, Response } from 'express';
import * as customerService from '../services/customer.service';
import { createCustomerSchema, updateCustomerSchema } from '../validators/customer.validator';
import { success, created, error, notFound } from '../utils/response';

export async function list(req: Request, res: Response) {
  const includeInactive = req.query.includeInactive === 'true';
  const customers = await customerService.listCustomers(req.companyId!, includeInactive);
  return success(res, customers);
}

export async function create(req: Request, res: Response) {
  const parsed = createCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }

  try {
    const customer = await customerService.createCustomer(req.companyId!, parsed.data);
    return created(res, customer);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function get(req: Request, res: Response) {
  const customer = await customerService.getCustomerById(req.companyId!, BigInt(req.params.id as string));
  if (!customer) {
    return notFound(res, 'Customer not found');
  }
  return success(res, customer);
}

export async function update(req: Request, res: Response) {
  const parsed = updateCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }

  const customer = await customerService.updateCustomer(req.companyId!, BigInt(req.params.id as string), parsed.data);
  if (!customer) {
    return notFound(res, 'Customer not found');
  }
  return success(res, customer);
}

export async function remove(req: Request, res: Response) {
  const deleted = await customerService.deleteCustomer(req.companyId!, BigInt(req.params.id as string));
  if (!deleted) {
    return notFound(res, 'Customer not found');
  }
  return success(res, { message: 'Customer deactivated' });
}
