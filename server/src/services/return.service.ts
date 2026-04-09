import prisma from '../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import type { GenerateReturnInput, UpdateReturnInput } from '../validators/return.validator';
import type { VatReturn } from '@prisma/client';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function getFiscalYear(taxMonth: string): string {
  const [year, month] = taxMonth.split('-').map(Number);
  return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

function buildMusak91Json(data: {
  totalSalesValue: number;
  outputVat: number;
  sdPayable: number;
  totalPurchaseValue: number;
  inputVat: number;
  vdsCredit: number;
  carryForward: number;
  increasingAdjustment: number;
  decreasingAdjustment: number;
  netPayable: number;
}): Record<string, number> {
  return {
    section_1_sales_value: data.totalSalesValue,
    section_2_output_vat: data.outputVat,
    section_3_sd_payable: data.sdPayable,
    section_4_purchase_value: data.totalPurchaseValue,
    section_5_input_vat: data.inputVat,
    section_6_vds_credit: data.vdsCredit,
    section_7_carry_forward: data.carryForward,
    section_8_increasing_adjustment: data.increasingAdjustment,
    section_9_decreasing_adjustment: data.decreasingAdjustment,
    section_10_net_payable: data.netPayable,
    // Sections 11–24: placeholders for future NBR extension
    section_11_import_vat: 0,
    section_12_export_zero_rating: 0,
    section_13_exemptions: 0,
    section_14_penalty: 0,
    section_15_interest: 0,
    section_16: 0,
    section_17: 0,
    section_18: 0,
    section_19: 0,
    section_20: 0,
    section_21: 0,
    section_22: 0,
    section_23: 0,
    section_24: 0,
  };
}

export async function generateReturn(
  companyId: bigint,
  userId: bigint,
  input: GenerateReturnInput,
) {
  const { taxMonth } = input;
  const fiscalYear = getFiscalYear(taxMonth);

  const [year, month] = taxMonth.split('-').map(Number);
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const existing = await prisma.vatReturn.findUnique({
    where: { companyId_taxMonth: { companyId, taxMonth } },
  });

  if (existing && (existing.status === 'reviewed' || existing.status === 'submitted' || existing.status === 'locked')) {
    throw new Error(`Cannot regenerate a ${existing.status} return`);
  }

  // Aggregate sales invoices
  const salesAgg = await prisma.invoice.aggregate({
    where: {
      companyId,
      invoiceType: 'sales',
      status: { not: 'cancelled' },
      challanDate: { gte: startDate, lte: endDate },
    },
    _sum: { grandTotal: true, vatTotal: true, sdTotal: true },
  });

  // Aggregate purchase invoices
  const purchaseAgg = await prisma.invoice.aggregate({
    where: {
      companyId,
      invoiceType: 'purchase',
      status: { not: 'cancelled' },
      challanDate: { gte: startDate, lte: endDate },
    },
    _sum: { grandTotal: true, vatTotal: true },
  });

  // Aggregate VDS credit (finalized, deductee role, this tax month)
  const vdsAgg = await prisma.vdsCertificate.aggregate({
    where: { companyId, status: 'finalized', role: 'deductee', taxMonth },
    _sum: { vdsAmount: true },
  });

  const totalSalesValue = round2(Number(salesAgg._sum.grandTotal ?? 0));
  const outputVat = round2(Number(salesAgg._sum.vatTotal ?? 0));
  const sdPayable = round2(Number(salesAgg._sum.sdTotal ?? 0));
  const totalPurchaseValue = round2(Number(purchaseAgg._sum.grandTotal ?? 0));
  const inputVat = round2(Number(purchaseAgg._sum.vatTotal ?? 0));
  const vdsCredit = round2(Number(vdsAgg._sum.vdsAmount ?? 0));

  // Preserve manual adjustments when re-generating
  const carryForward = existing ? round2(Number(existing.carryForward)) : 0;
  const increasingAdjustment = existing ? round2(Number(existing.increasingAdjustment)) : 0;
  const decreasingAdjustment = existing ? round2(Number(existing.decreasingAdjustment)) : 0;
  const notes = existing?.notes ?? null;

  const netPayable = round2(
    outputVat + sdPayable - inputVat - vdsCredit - carryForward + increasingAdjustment - decreasingAdjustment,
  );

  const musak91Json = buildMusak91Json({
    totalSalesValue, outputVat, sdPayable,
    totalPurchaseValue, inputVat, vdsCredit,
    carryForward, increasingAdjustment, decreasingAdjustment, netPayable,
  });

  const fields = {
    companyId,
    taxMonth,
    fiscalYear,
    totalSalesValue: new Decimal(totalSalesValue),
    outputVat: new Decimal(outputVat),
    sdPayable: new Decimal(sdPayable),
    totalPurchaseValue: new Decimal(totalPurchaseValue),
    inputVat: new Decimal(inputVat),
    vdsCredit: new Decimal(vdsCredit),
    carryForward: new Decimal(carryForward),
    increasingAdjustment: new Decimal(increasingAdjustment),
    decreasingAdjustment: new Decimal(decreasingAdjustment),
    notes,
    netPayable: new Decimal(netPayable),
    musak91Json,
    generatedBy: userId,
  };

  if (existing) {
    return prisma.vatReturn.update({
      where: { id: existing.id },
      data: { ...fields, status: 'draft', reviewedBy: null, reviewedAt: null, submittedAt: null, submittedBy: null, lockedAt: null },
    });
  }

  return prisma.vatReturn.create({ data: fields });
}

export async function listReturns(companyId: bigint, fiscalYear?: string) {
  return prisma.vatReturn.findMany({
    where: { companyId, ...(fiscalYear ? { fiscalYear } : {}) },
    orderBy: { taxMonth: 'desc' },
  });
}

export async function getReturnById(companyId: bigint, id: bigint) {
  return prisma.vatReturn.findFirst({ where: { id, companyId } });
}

export async function updateReturn(
  companyId: bigint,
  id: bigint,
  input: UpdateReturnInput,
) {
  const ret = await prisma.vatReturn.findFirst({ where: { id, companyId } });
  if (!ret) return null;
  if (ret.status !== 'draft') throw new Error('Only draft returns can be updated');

  const carryForward = input.carryForward ?? round2(Number(ret.carryForward));
  const increasingAdjustment = input.increasingAdjustment ?? round2(Number(ret.increasingAdjustment));
  const decreasingAdjustment = input.decreasingAdjustment ?? round2(Number(ret.decreasingAdjustment));

  const netPayable = round2(
    Number(ret.outputVat) + Number(ret.sdPayable)
    - Number(ret.inputVat) - Number(ret.vdsCredit)
    - carryForward + increasingAdjustment - decreasingAdjustment,
  );

  const musak91Json = buildMusak91Json({
    totalSalesValue: Number(ret.totalSalesValue),
    outputVat: Number(ret.outputVat),
    sdPayable: Number(ret.sdPayable),
    totalPurchaseValue: Number(ret.totalPurchaseValue),
    inputVat: Number(ret.inputVat),
    vdsCredit: Number(ret.vdsCredit),
    carryForward,
    increasingAdjustment,
    decreasingAdjustment,
    netPayable,
  });

  return prisma.vatReturn.update({
    where: { id },
    data: {
      carryForward: new Decimal(carryForward),
      increasingAdjustment: new Decimal(increasingAdjustment),
      decreasingAdjustment: new Decimal(decreasingAdjustment),
      notes: input.notes !== undefined ? input.notes : ret.notes,
      netPayable: new Decimal(netPayable),
      musak91Json,
    },
  });
}

export async function transitionStatus(
  companyId: bigint,
  id: bigint,
  userId: bigint,
  action: 'review' | 'submit' | 'lock',
) {
  const ret = await prisma.vatReturn.findFirst({ where: { id, companyId } });
  if (!ret) return null;

  const transitions = {
    review: { from: 'draft' as const, to: 'reviewed' as const, extra: { reviewedBy: userId, reviewedAt: new Date() } },
    submit: { from: 'reviewed' as const, to: 'submitted' as const, extra: { submittedAt: new Date(), submittedBy: userId } },
    lock:   { from: 'submitted' as const, to: 'locked' as const, extra: { lockedAt: new Date() } },
  };

  const t = transitions[action];
  if (ret.status !== t.from) {
    throw new Error(`Cannot ${action} a ${ret.status} return`);
  }

  return prisma.vatReturn.update({
    where: { id },
    data: { status: t.to, ...t.extra },
  });
}

export function serializeReturn(ret: VatReturn) {
  return {
    ...ret,
    id: ret.id.toString(),
    companyId: ret.companyId.toString(),
    generatedBy: ret.generatedBy.toString(),
    reviewedBy: ret.reviewedBy?.toString() ?? null,
    submittedBy: ret.submittedBy?.toString() ?? null,
    totalSalesValue: Number(ret.totalSalesValue),
    outputVat: Number(ret.outputVat),
    sdPayable: Number(ret.sdPayable),
    totalPurchaseValue: Number(ret.totalPurchaseValue),
    inputVat: Number(ret.inputVat),
    vdsCredit: Number(ret.vdsCredit),
    carryForward: Number(ret.carryForward),
    increasingAdjustment: Number(ret.increasingAdjustment),
    decreasingAdjustment: Number(ret.decreasingAdjustment),
    netPayable: Number(ret.netPayable),
  };
}
