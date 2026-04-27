import prisma from '../utils/prisma';
import { CreateCompanyInput, UpdateCompanyInput } from '../validators/company.validator';

function serializeCompany(company: any) {
  return {
    ...company,
    id: company.id.toString(),
  };
}

export async function getUserCompanies(userId: bigint) {
  const userCompanies = await prisma.userCompany.findMany({
    where: { userId },
    include: { company: true },
  });

  return userCompanies.map((uc: any) => ({
    ...serializeCompany(uc.company),
    role: uc.role,
  }));
}

export async function createCompany(userId: bigint, input: CreateCompanyInput) {
  const company = await prisma.$transaction(async (tx: any) => {
    const company = await tx.company.create({
      data: {
        name: input.name,
        bin: input.bin,
        tin: input.tin,
        address: input.address,
        challanPrefix: input.challanPrefix || 'CH',
        fiscalYearStart: input.fiscalYearStart || 7,
      },
    });

    // Creator becomes admin of this company
    await tx.userCompany.create({
      data: {
        userId,
        companyId: company.id,
        role: 'admin',
      },
    });

    return company;
  });

  return serializeCompany(company);
}

export async function getCompanyById(companyId: bigint) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return null;
  return serializeCompany(company);
}

export async function updateCompany(companyId: bigint, input: UpdateCompanyInput) {
  const company = await prisma.company.update({
    where: { id: companyId },
    data: input,
  });
  return serializeCompany(company);
}

export async function deleteCompany(companyId: bigint) {
  await prisma.company.delete({ where: { id: companyId } });
}
