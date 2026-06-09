import prisma from '../utils/prisma';

export interface CashBookEntry {
  sl: number;
  paymentId: string;
  date: string;
  invoiceId: string;
  challanNo: string;
  partyName: string | null;
  invoiceType: 'sales' | 'purchase';
  direction: 'in' | 'out';
  method: string;
  reference: string | null;
  moneyIn: number;
  moneyOut: number;
  balance: number;
}

export interface CashBookResult {
  account: {
    id: string;
    name: string;
    type: string;
    accountNumber: string | null;
    bankName: string | null;
    openingBalance: number;
  } | null;
  broughtForward: number;
  entries: CashBookEntry[];
  summary: {
    totalIn: number;
    totalOut: number;
    netChange: number;
    closingBalance: number;
  };
}

export interface PartyLedgerEntry {
  sl: number;
  date: string;
  type: 'invoice' | 'payment';
  refId: string;
  challanNo: string;
  invoiceType: 'sales' | 'purchase';
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface PartyLedgerResult {
  customer: {
    id: string;
    name: string;
    binNid: string | null;
  };
  broughtForward: number;
  entries: PartyLedgerEntry[];
  summary: {
    totalDebit: number;
    totalCredit: number;
    closingBalance: number;
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function paymentWhere(companyId: bigint, accountId: string) {
  return {
    companyId,
    paymentAccountId: accountId === 'unassigned' ? null : BigInt(accountId),
    invoice: { status: { not: 'cancelled' as const } },
  };
}

export async function getCashBook(
  companyId: bigint,
  filters: { accountId: string; from?: string; to?: string }
): Promise<CashBookResult> {
  let account: CashBookResult['account'] = null;
  let openingBalance = 0;

  if (filters.accountId !== 'unassigned') {
    const acc = await prisma.paymentAccount.findFirst({
      where: { id: BigInt(filters.accountId), companyId },
    });
    if (!acc) throw new Error('Payment account not found');
    openingBalance = Number(acc.openingBalance);
    account = {
      id: acc.id.toString(),
      name: acc.name,
      type: acc.type,
      accountNumber: acc.accountNumber,
      bankName: acc.bankName,
      openingBalance,
    };
  }

  // Brought forward = opening balance + net movement before the range start
  let broughtForward = openingBalance;
  if (filters.from) {
    const prior = await prisma.payment.findMany({
      where: {
        ...paymentWhere(companyId, filters.accountId),
        paymentDate: { lt: new Date(filters.from) },
      },
      include: { invoice: { select: { invoiceType: true } } },
    });
    for (const p of prior) {
      const amount = Number(p.amount);
      broughtForward += p.invoice.invoiceType === 'sales' ? amount : -amount;
    }
    broughtForward = round2(broughtForward);
  }

  const where: any = paymentWhere(companyId, filters.accountId);
  if (filters.from || filters.to) {
    where.paymentDate = {};
    if (filters.from) where.paymentDate.gte = new Date(filters.from);
    if (filters.to) where.paymentDate.lte = new Date(filters.to);
  }

  const payments = await prisma.payment.findMany({
    where,
    include: { invoice: { include: { customer: true } } },
    orderBy: [{ paymentDate: 'asc' }, { id: 'asc' }],
  });

  let balance = broughtForward;
  let totalIn = 0;
  let totalOut = 0;

  const entries: CashBookEntry[] = payments.map((p, idx) => {
    const amount = Number(p.amount);
    const isIn = p.invoice.invoiceType === 'sales';
    if (isIn) totalIn += amount;
    else totalOut += amount;
    balance = round2(balance + (isIn ? amount : -amount));
    return {
      sl: idx + 1,
      paymentId: p.id.toString(),
      date: p.paymentDate.toISOString().split('T')[0],
      invoiceId: p.invoiceId.toString(),
      challanNo: p.invoice.challanNo,
      partyName: p.invoice.customer?.name || null,
      invoiceType: p.invoice.invoiceType as 'sales' | 'purchase',
      direction: isIn ? 'in' : 'out',
      method: p.paymentMethod,
      reference: p.reference,
      moneyIn: isIn ? round2(amount) : 0,
      moneyOut: isIn ? 0 : round2(amount),
      balance,
    };
  });

  totalIn = round2(totalIn);
  totalOut = round2(totalOut);

  return {
    account,
    broughtForward,
    entries,
    summary: {
      totalIn,
      totalOut,
      netChange: round2(totalIn - totalOut),
      closingBalance: balance,
    },
  };
}

export async function getPartyLedger(
  companyId: bigint,
  customerId: bigint,
  filters: { from?: string; to?: string }
): Promise<PartyLedgerResult> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId },
  });
  if (!customer) throw new Error('Customer not found');

  const invoiceWhere: any = { companyId, customerId, status: { not: 'cancelled' } };
  const paymentInvoiceWhere = { customerId, status: { not: 'cancelled' as const } };

  // Debit = party owes us more (sales invoice, payment made on a purchase).
  // Credit = we owe / party paid (purchase invoice, payment received on a sale).
  const debitOf = (invoiceType: string, kind: 'invoice' | 'payment', amount: number) => {
    if (kind === 'invoice') return invoiceType === 'sales' ? amount : 0;
    return invoiceType === 'purchase' ? amount : 0;
  };
  const creditOf = (invoiceType: string, kind: 'invoice' | 'payment', amount: number) => {
    if (kind === 'invoice') return invoiceType === 'purchase' ? amount : 0;
    return invoiceType === 'sales' ? amount : 0;
  };

  // Brought forward = net debit-credit before the range start
  let broughtForward = 0;
  if (filters.from) {
    const fromDate = new Date(filters.from);
    const [priorInvoices, priorPayments] = await Promise.all([
      prisma.invoice.findMany({
        where: { ...invoiceWhere, challanDate: { lt: fromDate } },
        select: { invoiceType: true, netReceivable: true },
      }),
      prisma.payment.findMany({
        where: { companyId, invoice: paymentInvoiceWhere, paymentDate: { lt: fromDate } },
        include: { invoice: { select: { invoiceType: true } } },
      }),
    ]);
    for (const inv of priorInvoices) {
      const amount = Number(inv.netReceivable);
      broughtForward += debitOf(inv.invoiceType, 'invoice', amount) - creditOf(inv.invoiceType, 'invoice', amount);
    }
    for (const p of priorPayments) {
      const amount = Number(p.amount);
      broughtForward += debitOf(p.invoice.invoiceType, 'payment', amount) - creditOf(p.invoice.invoiceType, 'payment', amount);
    }
    broughtForward = round2(broughtForward);
  }

  if (filters.from || filters.to) {
    invoiceWhere.challanDate = {};
    if (filters.from) invoiceWhere.challanDate.gte = new Date(filters.from);
    if (filters.to) invoiceWhere.challanDate.lte = new Date(filters.to);
  }
  const paymentDateWhere: any = {};
  if (filters.from) paymentDateWhere.gte = new Date(filters.from);
  if (filters.to) paymentDateWhere.lte = new Date(filters.to);

  const [invoices, payments] = await Promise.all([
    prisma.invoice.findMany({
      where: invoiceWhere,
      select: { id: true, challanNo: true, challanDate: true, invoiceType: true, netReceivable: true },
    }),
    prisma.payment.findMany({
      where: {
        companyId,
        invoice: paymentInvoiceWhere,
        ...(filters.from || filters.to ? { paymentDate: paymentDateWhere } : {}),
      },
      include: { invoice: { select: { challanNo: true, invoiceType: true } } },
    }),
  ]);

  type RawEntry = Omit<PartyLedgerEntry, 'sl' | 'balance'> & { sortId: bigint };

  const raw: RawEntry[] = [
    ...invoices.map((inv): RawEntry => {
      const amount = Number(inv.netReceivable);
      return {
        date: inv.challanDate.toISOString().split('T')[0],
        type: 'invoice',
        refId: inv.id.toString(),
        challanNo: inv.challanNo,
        invoiceType: inv.invoiceType as 'sales' | 'purchase',
        description: inv.invoiceType === 'sales' ? 'Sales invoice' : 'Purchase invoice',
        debit: round2(debitOf(inv.invoiceType, 'invoice', amount)),
        credit: round2(creditOf(inv.invoiceType, 'invoice', amount)),
        sortId: inv.id,
      };
    }),
    ...payments.map((p): RawEntry => {
      const amount = Number(p.amount);
      return {
        date: p.paymentDate.toISOString().split('T')[0],
        type: 'payment',
        refId: p.id.toString(),
        challanNo: p.invoice.challanNo,
        invoiceType: p.invoice.invoiceType as 'sales' | 'purchase',
        description: p.invoice.invoiceType === 'sales' ? 'Payment received' : 'Payment made',
        debit: round2(debitOf(p.invoice.invoiceType, 'payment', amount)),
        credit: round2(creditOf(p.invoice.invoiceType, 'payment', amount)),
        sortId: p.id,
      };
    }),
  ];

  // Sort by date, invoices before payments on the same day, then by id
  raw.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.type !== b.type) return a.type === 'invoice' ? -1 : 1;
    return a.sortId < b.sortId ? -1 : a.sortId > b.sortId ? 1 : 0;
  });

  let balance = broughtForward;
  let totalDebit = 0;
  let totalCredit = 0;

  const entries: PartyLedgerEntry[] = raw.map(({ sortId, ...e }, idx) => {
    totalDebit += e.debit;
    totalCredit += e.credit;
    balance = round2(balance + e.debit - e.credit);
    return { sl: idx + 1, ...e, balance };
  });

  return {
    customer: {
      id: customer.id.toString(),
      name: customer.name,
      binNid: customer.binNid,
    },
    broughtForward,
    entries,
    summary: {
      totalDebit: round2(totalDebit),
      totalCredit: round2(totalCredit),
      closingBalance: balance,
    },
  };
}
