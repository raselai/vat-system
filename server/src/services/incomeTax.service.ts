import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { ComputeIncomeTaxInput, UpdateIncomeTaxInput } from '../validators/incomeTax.validator';
import { computeIncomeTaxReturn, IncomeTaxCategory, IncomeTaxpayerStatus } from './incomeTaxCalc.service';

function serialize(c: any) {
  return {
    ...c,
    id: c.id.toString(),
    userId: c.userId.toString(),
    taxableIncome: Number(c.taxableIncome),
    advanceTaxPaid: Number(c.advanceTaxPaid),
    grossTax: Number(c.grossTax),
    minimumTax: Number(c.minimumTax),
    taxAfterMinimum: Number(c.taxAfterMinimum),
    netPayable: Number(c.netPayable),
    refundable: Number(c.refundable),
  };
}

/** Run the engine and shape the derived columns for persistence. */
function deriveFields(input: {
  taxableIncome: number;
  category: IncomeTaxCategory;
  taxpayerStatus: IncomeTaxpayerStatus;
  advanceTaxPaid: number;
  subjectToMin: boolean;
}) {
  const result = computeIncomeTaxReturn({
    taxableIncome: input.taxableIncome,
    category: input.category,
    taxpayerStatus: input.taxpayerStatus,
    advanceTaxPaid: input.advanceTaxPaid,
    subjectToMinimum: input.subjectToMin,
  });
  return {
    grossTax: new Decimal(result.grossTax),
    minimumTax: new Decimal(result.applicableMinimum),
    taxAfterMinimum: new Decimal(result.taxAfterMinimum),
    netPayable: new Decimal(result.netPayable),
    refundable: new Decimal(result.refundable),
    breakdownJson: result.breakdown as unknown as Prisma.InputJsonValue,
  };
}

export async function listComputations(userId: bigint) {
  const rows = await prisma.incomeTaxComputation.findMany({
    where: { userId },
    orderBy: { assessmentYear: 'desc' },
  });
  return rows.map(serialize);
}

export async function getComputationById(userId: bigint, id: bigint) {
  const c = await prisma.incomeTaxComputation.findFirst({ where: { id, userId } });
  if (!c) return null;
  return serialize(c);
}

export async function createComputation(userId: bigint, input: ComputeIncomeTaxInput) {
  const subjectToMin = input.subjectToMin ?? true;
  const advanceTaxPaid = input.advanceTaxPaid ?? 0;
  const derived = deriveFields({
    taxableIncome: input.taxableIncome,
    category: input.category,
    taxpayerStatus: input.taxpayerStatus,
    advanceTaxPaid,
    subjectToMin,
  });

  const c = await prisma.incomeTaxComputation.upsert({
    where: { userId_assessmentYear: { userId, assessmentYear: input.assessmentYear } },
    create: {
      userId,
      assessmentYear: input.assessmentYear,
      category: input.category,
      taxpayerStatus: input.taxpayerStatus,
      subjectToMin,
      taxableIncome: new Decimal(input.taxableIncome),
      advanceTaxPaid: new Decimal(advanceTaxPaid),
      notes: input.notes,
      ...derived,
    },
    update: {
      category: input.category,
      taxpayerStatus: input.taxpayerStatus,
      subjectToMin,
      taxableIncome: new Decimal(input.taxableIncome),
      advanceTaxPaid: new Decimal(advanceTaxPaid),
      notes: input.notes,
      ...derived,
    },
  });
  return serialize(c);
}

export async function updateComputation(userId: bigint, id: bigint, input: UpdateIncomeTaxInput) {
  const existing = await prisma.incomeTaxComputation.findFirst({ where: { id, userId } });
  if (!existing) return null;

  // Merge incoming fields over existing values, then recompute derived columns.
  const merged = {
    assessmentYear: input.assessmentYear ?? existing.assessmentYear,
    category: (input.category ?? existing.category) as IncomeTaxCategory,
    taxpayerStatus: (input.taxpayerStatus ?? existing.taxpayerStatus) as IncomeTaxpayerStatus,
    subjectToMin: input.subjectToMin ?? existing.subjectToMin,
    taxableIncome: input.taxableIncome ?? Number(existing.taxableIncome),
    advanceTaxPaid: input.advanceTaxPaid ?? Number(existing.advanceTaxPaid),
    notes: input.notes ?? existing.notes ?? undefined,
  };
  const derived = deriveFields(merged);

  const c = await prisma.incomeTaxComputation.update({
    where: { id },
    data: {
      assessmentYear: merged.assessmentYear,
      category: merged.category,
      taxpayerStatus: merged.taxpayerStatus,
      subjectToMin: merged.subjectToMin,
      taxableIncome: new Decimal(merged.taxableIncome),
      advanceTaxPaid: new Decimal(merged.advanceTaxPaid),
      notes: merged.notes,
      ...derived,
    },
  });
  return serialize(c);
}

export async function deleteComputation(userId: bigint, id: bigint) {
  const existing = await prisma.incomeTaxComputation.findFirst({ where: { id, userId } });
  if (!existing) return null;
  await prisma.incomeTaxComputation.delete({ where: { id } });
  return true;
}
