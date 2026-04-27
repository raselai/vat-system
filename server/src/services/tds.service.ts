import prisma from '../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateDeductionInput, UpdateDeductionInput, CreateTdsPaymentInput, UpdateTdsPaymentInput, LinkDeductionsInput } from '../validators/tds.validator';
import { getFiscalYear, getTaxMonth } from '../utils/validators';

function serializeDeduction(d: any) {
  return {
    ...d,
    id: d.id.toString(),
    companyId: d.companyId.toString(),
    invoiceId: d.invoiceId?.toString() || null,
    createdBy: d.createdBy.toString(),
    grossAmount: Number(d.grossAmount),
    tdsRate: Number(d.tdsRate),
    tdsAmount: Number(d.tdsAmount),
    payments: d.payments?.map((p: any) => ({
      id: p.id.toString(),
      paymentId: p.paymentId.toString(),
      amount: Number(p.amount),
      payment: p.payment ? serializeTdsPayment(p.payment) : undefined,
    })) || [],
  };
}

function serializeTdsPayment(p: any) {
  return {
    ...p,
    id: p.id.toString(),
    companyId: p.companyId.toString(),
    createdBy: p.createdBy.toString(),
    totalAmount: Number(p.totalAmount),
    deductions: p.deductions?.map((d: any) => ({
      id: d.id.toString(),
      deductionId: d.deductionId.toString(),
      amount: Number(d.amount),
      deduction: d.deduction ? {
        id: d.deduction.id.toString(),
        deductionNo: d.deduction.deductionNo,
        deducteeName: d.deduction.deducteeName,
        tdsAmount: Number(d.deduction.tdsAmount),
        status: d.deduction.status,
      } : undefined,
    })) || [],
  };
}

async function generateDeductionNo(tx: any, companyId: bigint, date: Date): Promise<string> {
  const fiscalYear = getFiscalYear(date);
  const count = await tx.tdsDeduction.count({ where: { companyId, fiscalYear } });
  return `TDS-${fiscalYear}-${String(count + 1).padStart(4, '0')}`;
}

// ---------- Deductions ----------

export async function listDeductions(
  companyId: bigint,
  filters?: { status?: string; taxMonth?: string; fiscalYear?: string; sectionCode?: string; page?: number; limit?: number }
) {
  const where: any = { companyId };
  if (filters?.status) where.status = filters.status;
  if (filters?.taxMonth) where.taxMonth = filters.taxMonth;
  if (filters?.fiscalYear) where.fiscalYear = filters.fiscalYear;
  if (filters?.sectionCode) where.sectionCode = filters.sectionCode;
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const [deductions, total] = await Promise.all([
    prisma.tdsDeduction.findMany({
      where,
      include: { payments: { include: { payment: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.tdsDeduction.count({ where }),
  ]);
  return { deductions: deductions.map(serializeDeduction), total, page, limit };
}

export async function createDeduction(companyId: bigint, userId: bigint, input: CreateDeductionInput) {
  const date = new Date(input.deductionDate);
  const fiscalYear = getFiscalYear(date);
  const taxMonth = getTaxMonth(date);

  return prisma.$transaction(async (tx: any) => {
    const deductionNo = await generateDeductionNo(tx, companyId, date);
    const deduction = await tx.tdsDeduction.create({
      data: {
        companyId,
        deductionNo,
        deductionDate: date,
        fiscalYear,
        taxMonth,
        sectionCode: input.sectionCode,
        deducteeName: input.deducteeName,
        deducteeTin: input.deducteeTin,
        deducteeAddress: input.deducteeAddress,
        grossAmount: new Decimal(input.grossAmount),
        tdsRate: new Decimal(input.tdsRate),
        tdsAmount: new Decimal(input.tdsAmount),
        invoiceId: input.invoiceId ? BigInt(input.invoiceId) : null,
        notes: input.notes,
        createdBy: userId,
      },
      include: { payments: true },
    });
    return serializeDeduction(deduction);
  });
}

export async function getDeductionById(companyId: bigint, deductionId: bigint) {
  const d = await prisma.tdsDeduction.findFirst({
    where: { id: deductionId, companyId },
    include: { payments: { include: { payment: true } } },
  });
  if (!d) return null;
  return serializeDeduction(d);
}

export async function updateDeduction(companyId: bigint, deductionId: bigint, input: UpdateDeductionInput) {
  const existing = await prisma.tdsDeduction.findFirst({ where: { id: deductionId, companyId } });
  if (!existing) return null;
  if (existing.status !== 'draft') throw new Error('Only draft deductions can be edited');

  const updateData: any = {};
  if (input.deductionDate) {
    const date = new Date(input.deductionDate);
    updateData.deductionDate = date;
    updateData.fiscalYear = getFiscalYear(date);
    updateData.taxMonth = getTaxMonth(date);
  }
  if (input.sectionCode !== undefined) updateData.sectionCode = input.sectionCode;
  if (input.deducteeName !== undefined) updateData.deducteeName = input.deducteeName;
  if (input.deducteeTin !== undefined) updateData.deducteeTin = input.deducteeTin;
  if (input.deducteeAddress !== undefined) updateData.deducteeAddress = input.deducteeAddress;
  if (input.grossAmount !== undefined) updateData.grossAmount = new Decimal(input.grossAmount);
  if (input.tdsRate !== undefined) updateData.tdsRate = new Decimal(input.tdsRate);
  if (input.tdsAmount !== undefined) updateData.tdsAmount = new Decimal(input.tdsAmount);
  if (input.notes !== undefined) updateData.notes = input.notes;

  const d = await prisma.tdsDeduction.update({
    where: { id: deductionId },
    data: updateData,
    include: { payments: { include: { payment: true } } },
  });
  return serializeDeduction(d);
}

export async function finalizeDeduction(companyId: bigint, deductionId: bigint) {
  const d = await prisma.tdsDeduction.findFirst({ where: { id: deductionId, companyId } });
  if (!d) return null;
  if (d.status !== 'draft') throw new Error('Only draft deductions can be finalized');
  const updated = await prisma.tdsDeduction.update({
    where: { id: deductionId },
    data: { status: 'finalized' },
    include: { payments: { include: { payment: true } } },
  });
  return serializeDeduction(updated);
}

export async function cancelDeduction(companyId: bigint, deductionId: bigint) {
  const d = await prisma.tdsDeduction.findFirst({ where: { id: deductionId, companyId } });
  if (!d) return null;
  if (d.status !== 'draft') throw new Error('Only draft deductions can be cancelled');
  const updated = await prisma.tdsDeduction.update({
    where: { id: deductionId },
    data: { status: 'cancelled' },
    include: { payments: { include: { payment: true } } },
  });
  return serializeDeduction(updated);
}

// ---------- TDS Payments ----------

export async function listTdsPayments(
  companyId: bigint,
  filters?: { status?: string; taxMonth?: string; fiscalYear?: string; page?: number; limit?: number }
) {
  const where: any = { companyId };
  if (filters?.status) where.status = filters.status;
  if (filters?.taxMonth) where.taxMonth = filters.taxMonth;
  if (filters?.fiscalYear) where.fiscalYear = filters.fiscalYear;
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const [payments, total] = await Promise.all([
    prisma.tdsPayment.findMany({
      where,
      include: { deductions: { include: { deduction: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.tdsPayment.count({ where }),
  ]);
  return { payments: payments.map(serializeTdsPayment), total, page, limit };
}

export async function createTdsPayment(companyId: bigint, userId: bigint, input: CreateTdsPaymentInput) {
  const date = new Date(input.paymentDate);
  const fiscalYear = getFiscalYear(date);
  const taxMonth = getTaxMonth(date);

  return prisma.$transaction(async (tx: any) => {
    const payment = await tx.tdsPayment.create({
      data: {
        companyId,
        challanNo: input.challanNo,
        paymentDate: date,
        fiscalYear,
        taxMonth,
        bankName: input.bankName,
        bankBranch: input.bankBranch,
        accountCode: input.accountCode,
        totalAmount: new Decimal(input.totalAmount),
        notes: input.notes,
        createdBy: userId,
      },
    });

    if (input.deductionIds?.length) {
      for (const dedIdStr of input.deductionIds) {
        const dedId = BigInt(dedIdStr);
        const ded = await tx.tdsDeduction.findFirst({ where: { id: dedId, companyId } });
        if (!ded) throw new Error(`Deduction ${dedIdStr} not found`);
        await tx.tdsDeductionPayment.create({
          data: { deductionId: dedId, paymentId: payment.id, amount: ded.tdsAmount },
        });
      }
    }

    const result = await tx.tdsPayment.findUnique({
      where: { id: payment.id },
      include: { deductions: { include: { deduction: true } } },
    });
    return serializeTdsPayment(result);
  });
}

export async function getTdsPaymentById(companyId: bigint, paymentId: bigint) {
  const p = await prisma.tdsPayment.findFirst({
    where: { id: paymentId, companyId },
    include: { deductions: { include: { deduction: true } } },
  });
  if (!p) return null;
  return serializeTdsPayment(p);
}

export async function updateTdsPayment(companyId: bigint, paymentId: bigint, input: UpdateTdsPaymentInput) {
  const existing = await prisma.tdsPayment.findFirst({ where: { id: paymentId, companyId } });
  if (!existing) return null;
  if (existing.status !== 'pending') throw new Error('Only pending payments can be edited');

  const updateData: any = {};
  if (input.challanNo !== undefined) updateData.challanNo = input.challanNo;
  if (input.paymentDate) {
    const date = new Date(input.paymentDate);
    updateData.paymentDate = date;
    updateData.fiscalYear = getFiscalYear(date);
    updateData.taxMonth = getTaxMonth(date);
  }
  if (input.bankName !== undefined) updateData.bankName = input.bankName;
  if (input.bankBranch !== undefined) updateData.bankBranch = input.bankBranch;
  if (input.accountCode !== undefined) updateData.accountCode = input.accountCode;
  if (input.totalAmount !== undefined) updateData.totalAmount = new Decimal(input.totalAmount);
  if (input.notes !== undefined) updateData.notes = input.notes;

  const p = await prisma.tdsPayment.update({
    where: { id: paymentId },
    data: updateData,
    include: { deductions: { include: { deduction: true } } },
  });
  return serializeTdsPayment(p);
}

export async function markTdsDeposited(companyId: bigint, paymentId: bigint) {
  const p = await prisma.tdsPayment.findFirst({ where: { id: paymentId, companyId } });
  if (!p) return null;
  if (p.status !== 'pending') throw new Error('Only pending payments can be marked as deposited');
  const updated = await prisma.tdsPayment.update({
    where: { id: paymentId },
    data: { status: 'deposited' },
    include: { deductions: { include: { deduction: true } } },
  });
  return serializeTdsPayment(updated);
}

export async function linkDeductions(companyId: bigint, paymentId: bigint, input: LinkDeductionsInput) {
  const p = await prisma.tdsPayment.findFirst({ where: { id: paymentId, companyId } });
  if (!p) return null;

  return prisma.$transaction(async (tx: any) => {
    for (const entry of input.deductions) {
      const dedId = BigInt(entry.deductionId);
      const ded = await tx.tdsDeduction.findFirst({ where: { id: dedId, companyId } });
      if (!ded) throw new Error(`Deduction ${entry.deductionId} not found`);
      await tx.tdsDeductionPayment.upsert({
        where: { deductionId_paymentId: { deductionId: dedId, paymentId: BigInt(paymentId) } },
        create: { deductionId: dedId, paymentId: BigInt(paymentId), amount: new Decimal(entry.amount) },
        update: { amount: new Decimal(entry.amount) },
      });
    }
    const result = await tx.tdsPayment.findUnique({
      where: { id: BigInt(paymentId) },
      include: { deductions: { include: { deduction: true } } },
    });
    return serializeTdsPayment(result);
  });
}

// ---------- Summary ----------

export async function getMonthlySummary(companyId: bigint, taxMonth: string) {
  const [deductions, payments] = await Promise.all([
    prisma.tdsDeduction.findMany({
      where: { companyId, taxMonth, status: { not: 'cancelled' } },
    }),
    prisma.tdsPayment.findMany({
      where: { companyId, taxMonth, status: { not: 'pending' } },
    }),
  ]);

  const totalDeducted = deductions.reduce((sum, d) => sum + Number(d.tdsAmount), 0);
  const totalDeposited = payments.reduce((sum, p) => sum + Number(p.totalAmount), 0);

  return {
    taxMonth,
    totalDeductions: deductions.length,
    totalDeducted: Math.round(totalDeducted * 100) / 100,
    totalDeposited: Math.round(totalDeposited * 100) / 100,
    pendingDeposit: Math.round((totalDeducted - totalDeposited) * 100) / 100,
    paymentCount: payments.length,
  };
}
