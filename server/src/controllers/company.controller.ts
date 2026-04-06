import { Request, Response } from 'express';
import * as companyService from '../services/company.service';
import { createCompanySchema, updateCompanySchema } from '../validators/company.validator';
import { success, created, error, notFound, forbidden } from '../utils/response';

export async function list(req: Request, res: Response) {
  const companies = await companyService.getUserCompanies(BigInt(req.user!.userId));
  return success(res, companies);
}

export async function create(req: Request, res: Response) {
  const parsed = createCompanySchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }

  try {
    const company = await companyService.createCompany(BigInt(req.user!.userId), parsed.data);
    return created(res, company);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function get(req: Request, res: Response) {
  const company = await companyService.getCompanyById(req.companyId!);
  if (!company) {
    return notFound(res, 'Company not found');
  }
  return success(res, company);
}

export async function update(req: Request, res: Response) {
  if (req.companyRole !== 'admin') {
    return forbidden(res, 'Only admins can update company details');
  }

  const parsed = updateCompanySchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors.map(e => e.message).join(', '));
  }

  try {
    const company = await companyService.updateCompany(req.companyId!, parsed.data);
    return success(res, company);
  } catch (err: any) {
    return error(res, err.message);
  }
}

export async function remove(req: Request, res: Response) {
  if (req.companyRole !== 'admin') {
    return forbidden(res, 'Only admins can delete companies');
  }

  try {
    await companyService.deleteCompany(req.companyId!);
    return success(res, { message: 'Company deleted' });
  } catch (err: any) {
    return error(res, err.message);
  }
}
