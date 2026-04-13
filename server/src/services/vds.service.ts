import prisma from '../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateCertificateInput, UpdateCertificateInput, CreateDepositInput, UpdateDepositInput, LinkCertificatesInput } from '../validators/vds.validator';
import { getFiscalYear, getTaxMonth } from '../utils/validators';

function serializeCertificate(cert: any) {
  return {
    ...cert,
    id: cert.id.toString(),
    companyId: cert.companyId.toString(),
    invoiceId: cert.invoiceId?.toString() || null,
    createdBy: cert.createdBy.toString(),
    totalValue: Number(cert.totalValue),
    vatAmount: Number(cert.vatAmount),
    vdsRate: Number(cert.vdsRate),
    vdsAmount: Number(cert.vdsAmount),
    invoice: cert.invoice ? {
      ...cert.invoice,
      id: cert.invoice.id.toString(),
      companyId: cert.invoice.companyId.toString(),
      subtotal: Number(cert.invoice.subtotal),
      vatTotal: Number(cert.invoice.vatTotal),
      grandTotal: Number(cert.invoice.grandTotal),
      vdsAmount: Number(cert.invoice.vdsAmount),
      netReceivable: Number(cert.invoice.netReceivable),
    } : undefined,
    deposits: cert.deposits?.map((d: any) => ({
      id: d.id.toString(),
      depositId: d.depositId.toString(),
      amount: Number(d.amount),
      deposit: d.deposit ? serializeDeposit(d.deposit) : undefined,
    })) || [],
  };
}

function serializeDeposit(dep: any) {
  return {
    ...dep,
    id: dep.id.toString(),
    companyId: dep.companyId.toString(),
    createdBy: dep.createdBy.toString(),
    totalAmount: Number(dep.totalAmount),
    certificates: dep.certificates?.map((c: any) => ({
      id: c.id.toString(),
      certificateId: c.certificateId.toString(),
      amount: Number(c.amount),
      certificate: c.certificate ? {
        id: c.certificate.id.toString(),
        certificateNo: c.certificate.certificateNo,
        counterpartyName: c.certificate.counterpartyName,
        vdsAmount: Number(c.certificate.vdsAmount),
        status: c.certificate.status,
      } : undefined,
    })) || [],
  };
}

// ---------- Certificate number generation ----------

async function generateCertificateNo(tx: any, companyId: bigint, date: Date): Promise<string> {
  const fiscalYear = getFiscalYear(date);
  const count = await tx.vdsCertificate.count({
    where: { companyId, fiscalYear },
  });
  const seqNo = String(count + 1).padStart(4, '0');
  return `VDS-${fiscalYear}-${seqNo}`;
}

// ---------- Certificates ----------

export async function listCertificates(
  companyId: bigint,
  filters?: { role?: string; status?: string; taxMonth?: string; fiscalYear?: string; page?: number; limit?: number }
) {
  const where: any = { companyId };
  if (filters?.role) where.role = filters.role;
  if (filters?.status) where.status = filters.status;
  if (filters?.taxMonth) where.taxMonth = filters.taxMonth;
  if (filters?.fiscalYear) where.fiscalYear = filters.fiscalYear;
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const [certificates, total] = await Promise.all([
    prisma.vdsCertificate.findMany({
      where,
      include: { invoice: true, deposits: { include: { deposit: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.vdsCertificate.count({ where }),
  ]);
  return { certificates: certificates.map(serializeCertificate), total, page, limit };
}

export async function createCertificate(companyId: bigint, userId: bigint, input: CreateCertificateInput) {
  const certDate = new Date(input.certificateDate);
  const fiscalYear = getFiscalYear(certDate);
  const taxMonth = getTaxMonth(certDate);

  return prisma.$transaction(async (tx: any) => {
    const certificateNo = await generateCertificateNo(tx, companyId, certDate);
    const cert = await tx.vdsCertificate.create({
      data: {
        companyId,
        certificateNo,
        certificateDate: certDate,
        fiscalYear,
        taxMonth,
        role: input.role,
        invoiceId: input.invoiceId ? BigInt(input.invoiceId) : null,
        counterpartyName: input.counterpartyName,
        counterpartyBin: input.counterpartyBin,
        counterpartyAddress: input.counterpartyAddress,
        totalValue: new Decimal(input.totalValue),
        vatAmount: new Decimal(input.vatAmount),
        vdsRate: new Decimal(input.vdsRate),
        vdsAmount: new Decimal(input.vdsAmount),
        createdBy: userId,
        notes: input.notes,
      },
      include: { invoice: true, deposits: true },
    });
    return serializeCertificate(cert);
  });
}

export async function getCertificateById(companyId: bigint, certId: bigint) {
  const cert = await prisma.vdsCertificate.findFirst({
    where: { id: certId, companyId },
    include: { invoice: true, deposits: { include: { deposit: true } } },
  });
  if (!cert) return null;
  return serializeCertificate(cert);
}

export async function updateCertificate(companyId: bigint, certId: bigint, input: UpdateCertificateInput) {
  const existing = await prisma.vdsCertificate.findFirst({ where: { id: certId, companyId } });
  if (!existing) return null;
  if (existing.status !== 'draft') throw new Error('Only draft certificates can be edited');

  const updateData: any = {};
  if (input.certificateDate) {
    const certDate = new Date(input.certificateDate);
    updateData.certificateDate = certDate;
    updateData.fiscalYear = getFiscalYear(certDate);
    updateData.taxMonth = getTaxMonth(certDate);
  }
  if (input.counterpartyName !== undefined) updateData.counterpartyName = input.counterpartyName;
  if (input.counterpartyBin !== undefined) updateData.counterpartyBin = input.counterpartyBin;
  if (input.counterpartyAddress !== undefined) updateData.counterpartyAddress = input.counterpartyAddress;
  if (input.totalValue !== undefined) updateData.totalValue = new Decimal(input.totalValue);
  if (input.vatAmount !== undefined) updateData.vatAmount = new Decimal(input.vatAmount);
  if (input.vdsRate !== undefined) updateData.vdsRate = new Decimal(input.vdsRate);
  if (input.vdsAmount !== undefined) updateData.vdsAmount = new Decimal(input.vdsAmount);
  if (input.notes !== undefined) updateData.notes = input.notes;

  const cert = await prisma.vdsCertificate.update({
    where: { id: certId },
    data: updateData,
    include: { invoice: true, deposits: { include: { deposit: true } } },
  });
  return serializeCertificate(cert);
}

export async function finalizeCertificate(companyId: bigint, certId: bigint) {
  const cert = await prisma.vdsCertificate.findFirst({ where: { id: certId, companyId } });
  if (!cert) return null;
  if (cert.status !== 'draft') throw new Error('Only draft certificates can be finalized');
  const updated = await prisma.vdsCertificate.update({
    where: { id: certId },
    data: { status: 'finalized' },
    include: { invoice: true, deposits: { include: { deposit: true } } },
  });
  return serializeCertificate(updated);
}

export async function cancelCertificate(companyId: bigint, certId: bigint) {
  const cert = await prisma.vdsCertificate.findFirst({ where: { id: certId, companyId } });
  if (!cert) return null;
  if (cert.status !== 'draft') throw new Error('Only draft certificates can be cancelled');
  const updated = await prisma.vdsCertificate.update({
    where: { id: certId },
    data: { status: 'cancelled' },
    include: { invoice: true, deposits: { include: { deposit: true } } },
  });
  return serializeCertificate(updated);
}

export async function createCertificateFromInvoice(companyId: bigint, userId: bigint, invoiceId: bigint, role: 'deductor' | 'deductee') {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    include: { customer: true },
  });
  if (!invoice) return null;
  if (!invoice.vdsApplicable || Number(invoice.vdsAmount) === 0) {
    throw new Error('Invoice does not have VDS applied');
  }

  const input: CreateCertificateInput = {
    certificateDate: invoice.challanDate.toISOString().split('T')[0],
    role,
    invoiceId: invoiceId.toString(),
    counterpartyName: invoice.customer?.name || 'Unknown',
    counterpartyBin: invoice.customer?.binNid || '0000000000000',
    counterpartyAddress: invoice.customer?.address || undefined,
    totalValue: Number(invoice.grandTotal),
    vatAmount: Number(invoice.vatTotal),
    vdsRate: Number(invoice.vdsAmount) / Number(invoice.vatTotal) * 100,
    vdsAmount: Number(invoice.vdsAmount),
  };

  return createCertificate(companyId, userId, input);
}

// ---------- Treasury Deposits ----------

export async function listDeposits(
  companyId: bigint,
  filters?: { status?: string; taxMonth?: string; fiscalYear?: string; page?: number; limit?: number }
) {
  const where: any = { companyId };
  if (filters?.status) where.status = filters.status;
  if (filters?.taxMonth) where.taxMonth = filters.taxMonth;
  if (filters?.fiscalYear) where.fiscalYear = filters.fiscalYear;
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const [deposits, total] = await Promise.all([
    prisma.treasuryDeposit.findMany({
      where,
      include: { certificates: { include: { certificate: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.treasuryDeposit.count({ where }),
  ]);
  return { deposits: deposits.map(serializeDeposit), total, page, limit };
}

export async function createDeposit(companyId: bigint, userId: bigint, input: CreateDepositInput) {
  const depDate = new Date(input.depositDate);
  const fiscalYear = getFiscalYear(depDate);
  const taxMonth = getTaxMonth(depDate);

  return prisma.$transaction(async (tx: any) => {
    const deposit = await tx.treasuryDeposit.create({
      data: {
        companyId,
        challanNo: input.challanNo,
        depositDate: depDate,
        fiscalYear,
        taxMonth,
        bankName: input.bankName,
        bankBranch: input.bankBranch,
        accountCode: input.accountCode,
        totalAmount: new Decimal(input.totalAmount),
        createdBy: userId,
        notes: input.notes,
      },
    });

    if (input.certificateIds?.length) {
      for (const certIdStr of input.certificateIds) {
        const certId = BigInt(certIdStr);
        const cert = await tx.vdsCertificate.findFirst({ where: { id: certId, companyId } });
        if (!cert) throw new Error(`Certificate ${certIdStr} not found`);
        await tx.vdsCertificateDeposit.create({
          data: {
            certificateId: certId,
            depositId: deposit.id,
            amount: cert.vdsAmount,
          },
        });
      }
    }

    const result = await tx.treasuryDeposit.findUnique({
      where: { id: deposit.id },
      include: { certificates: { include: { certificate: true } } },
    });
    return serializeDeposit(result);
  });
}

export async function getDepositById(companyId: bigint, depositId: bigint) {
  const deposit = await prisma.treasuryDeposit.findFirst({
    where: { id: depositId, companyId },
    include: { certificates: { include: { certificate: true } } },
  });
  if (!deposit) return null;
  return serializeDeposit(deposit);
}

export async function updateDeposit(companyId: bigint, depositId: bigint, input: UpdateDepositInput) {
  const existing = await prisma.treasuryDeposit.findFirst({ where: { id: depositId, companyId } });
  if (!existing) return null;
  if (existing.status !== 'pending') throw new Error('Only pending deposits can be edited');

  const updateData: any = {};
  if (input.challanNo !== undefined) updateData.challanNo = input.challanNo;
  if (input.depositDate) {
    const depDate = new Date(input.depositDate);
    updateData.depositDate = depDate;
    updateData.fiscalYear = getFiscalYear(depDate);
    updateData.taxMonth = getTaxMonth(depDate);
  }
  if (input.bankName !== undefined) updateData.bankName = input.bankName;
  if (input.bankBranch !== undefined) updateData.bankBranch = input.bankBranch;
  if (input.accountCode !== undefined) updateData.accountCode = input.accountCode;
  if (input.totalAmount !== undefined) updateData.totalAmount = new Decimal(input.totalAmount);
  if (input.notes !== undefined) updateData.notes = input.notes;

  const deposit = await prisma.treasuryDeposit.update({
    where: { id: depositId },
    data: updateData,
    include: { certificates: { include: { certificate: true } } },
  });
  return serializeDeposit(deposit);
}

export async function markDeposited(companyId: bigint, depositId: bigint) {
  const deposit = await prisma.treasuryDeposit.findFirst({ where: { id: depositId, companyId } });
  if (!deposit) return null;
  if (deposit.status !== 'pending') throw new Error('Only pending deposits can be marked as deposited');
  const updated = await prisma.treasuryDeposit.update({
    where: { id: depositId },
    data: { status: 'deposited' },
    include: { certificates: { include: { certificate: true } } },
  });
  return serializeDeposit(updated);
}

export async function linkCertificates(companyId: bigint, depositId: bigint, input: LinkCertificatesInput) {
  const deposit = await prisma.treasuryDeposit.findFirst({ where: { id: depositId, companyId } });
  if (!deposit) return null;

  return prisma.$transaction(async (tx: any) => {
    for (const entry of input.certificates) {
      const certId = BigInt(entry.certificateId);
      const cert = await tx.vdsCertificate.findFirst({ where: { id: certId, companyId } });
      if (!cert) throw new Error(`Certificate ${entry.certificateId} not found`);

      await tx.vdsCertificateDeposit.upsert({
        where: { certificateId_depositId: { certificateId: certId, depositId: BigInt(depositId) } },
        create: { certificateId: certId, depositId: BigInt(depositId), amount: new Decimal(entry.amount) },
        update: { amount: new Decimal(entry.amount) },
      });
    }

    const result = await tx.treasuryDeposit.findUnique({
      where: { id: BigInt(depositId) },
      include: { certificates: { include: { certificate: true } } },
    });
    return serializeDeposit(result);
  });
}

// ---------- Summary ----------

export async function getMonthlySummary(companyId: bigint, taxMonth: string) {
  const [certificates, deposits] = await Promise.all([
    prisma.vdsCertificate.findMany({
      where: { companyId, taxMonth, status: { not: 'cancelled' } },
    }),
    prisma.treasuryDeposit.findMany({
      where: { companyId, taxMonth, status: { not: 'pending' } },
    }),
  ]);

  const totalDeducted = certificates.reduce((sum, c) => sum + Number(c.vdsAmount), 0);
  const totalDeposited = deposits.reduce((sum, d) => sum + Number(d.totalAmount), 0);
  const deductorCount = certificates.filter(c => c.role === 'deductor').length;
  const deducteeCount = certificates.filter(c => c.role === 'deductee').length;

  return {
    taxMonth,
    totalCertificates: certificates.length,
    deductorCount,
    deducteeCount,
    totalDeducted: Math.round(totalDeducted * 100) / 100,
    totalDeposited: Math.round(totalDeposited * 100) / 100,
    pendingDeposit: Math.round((totalDeducted - totalDeposited) * 100) / 100,
    depositCount: deposits.length,
  };
}
