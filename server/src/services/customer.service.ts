import prisma from '../utils/prisma';
import { CreateCustomerInput, UpdateCustomerInput } from '../validators/customer.validator';

function serializeCustomer(customer: any) {
  return {
    ...customer,
    id: customer.id.toString(),
    companyId: customer.companyId.toString(),
  };
}

export async function listCustomers(companyId: bigint, includeInactive = false) {
  const where: any = { companyId };
  if (!includeInactive) {
    where.isActive = true;
  }
  const customers = await prisma.customer.findMany({ where, orderBy: { name: 'asc' } });
  return customers.map(serializeCustomer);
}

export async function createCustomer(companyId: bigint, input: CreateCustomerInput) {
  const customer = await prisma.customer.create({
    data: {
      companyId,
      name: input.name,
      binNid: input.binNid,
      phone: input.phone,
      address: input.address,
      isVdsEntity: input.isVdsEntity,
      vdsEntityType: input.vdsEntityType,
    },
  });
  return serializeCustomer(customer);
}

export async function getCustomerById(companyId: bigint, customerId: bigint) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId },
  });
  if (!customer) return null;
  return serializeCustomer(customer);
}

export async function updateCustomer(companyId: bigint, customerId: bigint, input: UpdateCustomerInput) {
  const result = await prisma.customer.updateMany({
    where: { id: customerId, companyId },
    data: input,
  });
  if (result.count === 0) return null;
  return getCustomerById(companyId, customerId);
}

export async function deleteCustomer(companyId: bigint, customerId: bigint) {
  const result = await prisma.customer.updateMany({
    where: { id: customerId, companyId },
    data: { isActive: false },
  });
  return result.count > 0;
}
