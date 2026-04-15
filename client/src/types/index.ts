export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  status: 'active' | 'inactive';
}

export interface CompanyAccess {
  id: string;
  name: string;
  bin: string;
  role: 'admin' | 'operator';
}

export interface Company {
  id: string;
  name: string;
  bin: string;
  address: string;
  challanPrefix: string;
  nextChallanNo: number;
  fiscalYearStart: number;
  createdAt: string;
  updatedAt: string;
  role?: string;
}

export interface Product {
  id: string;
  companyId: string;
  productCode?: string;
  hsCode?: string;
  serviceCode?: string;
  name: string;
  nameBn?: string;
  type: 'product' | 'service';
  vatRate: number;
  sdRate: number;
  specificDutyAmount: number;
  truncatedBasePct: number;
  unit: string;
  unitPrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  binNid?: string;
  phone?: string;
  address?: string;
  isVdsEntity: boolean;
  vdsEntityType?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  companies: CompanyAccess[];
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

export interface LoginResponse {
  user: User;
  companies: CompanyAccess[];
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface InvoiceItem {
  id?: string;
  productId: string;
  description: string;
  descriptionBn?: string;
  hsCode?: string;
  qty: number;
  unitPrice: number;
  vatRate: number;
  sdRate: number;
  specificDutyAmount: number;
  truncatedBasePct: number;
  taxableValue: number;
  sdAmount: number;
  vatAmount: number;
  specificDutyLine: number;
  lineTotal: number;
  grandTotal: number;
  vdsRate: number;
  vdsAmount: number;
  product?: { unit: string };
}

export interface Invoice {
  id: string;
  companyId: string;
  customerId: string | null;
  invoiceType: 'sales' | 'purchase';
  challanNo: string;
  challanDate: string;
  subtotal: number;
  sdTotal: number;
  vatTotal: number;
  specificDutyTotal: number;
  grandTotal: number;
  vdsApplicable: boolean;
  vdsAmount: number;
  netReceivable: number;
  status: 'draft' | 'approved' | 'cancelled' | 'locked';
  createdBy: string;
  approvedBy: string | null;
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: InvoiceItem[];
  customer: Customer | null;
}

export interface VdsCertificate {
  id: string;
  companyId: string;
  certificateNo: string;
  certificateDate: string;
  fiscalYear: string;
  taxMonth: string;
  role: 'deductor' | 'deductee';
  invoiceId: string | null;
  counterpartyName: string;
  counterpartyBin: string;
  counterpartyAddress?: string;
  totalValue: number;
  vatAmount: number;
  vdsRate: number;
  vdsAmount: number;
  status: 'draft' | 'finalized' | 'cancelled';
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  invoice?: Partial<Invoice>;
  deposits: VdsCertificateDepositLink[];
}

export interface VdsCertificateDepositLink {
  id: string;
  depositId: string;
  amount: number;
  deposit?: TreasuryDeposit;
}

export interface TreasuryDeposit {
  id: string;
  companyId: string;
  challanNo: string;
  depositDate: string;
  fiscalYear: string;
  taxMonth: string;
  bankName: string;
  bankBranch?: string;
  accountCode?: string;
  totalAmount: number;
  status: 'pending' | 'deposited' | 'verified';
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  certificates: TreasuryDepositCertLink[];
}

export interface TreasuryDepositCertLink {
  id: string;
  certificateId: string;
  amount: number;
  certificate?: Partial<VdsCertificate>;
}

export interface RegisterEntry {
  sl: number;
  invoiceId: string;
  challanNo: string;
  challanDate: string;
  customerName: string | null;
  customerBin: string | null;
  subtotal: number;
  sdTotal: number;
  vatTotal: number;
  specificDutyTotal: number;
  grandTotal: number;
  vdsApplicable: boolean;
  vdsAmount: number;
  netReceivable: number;
}

export interface RegisterSummary {
  totalInvoices: number;
  subtotal: number;
  sdTotal: number;
  vatTotal: number;
  specificDutyTotal: number;
  grandTotal: number;
  vdsAmount: number;
  netReceivable: number;
}

export interface RegisterResult {
  invoiceType: 'sales' | 'purchase';
  taxMonth: string;
  fiscalYear: string;
  entries: RegisterEntry[];
  summary: RegisterSummary;
}

export interface VdsSummary {
  taxMonth: string;
  totalCertificates: number;
  deductorCount: number;
  deducteeCount: number;
  totalDeducted: number;
  totalDeposited: number;
  pendingDeposit: number;
  depositCount: number;
}

export type VatReturnStatus = 'draft' | 'reviewed' | 'submitted' | 'locked';

export interface VatReturn {
  id: string;
  companyId: string;
  taxMonth: string;
  fiscalYear: string;
  totalSalesValue: number;
  outputVat: number;
  sdPayable: number;
  totalPurchaseValue: number;
  inputVat: number;
  vdsCredit: number;
  carryForward: number;
  increasingAdjustment: number;
  decreasingAdjustment: number;
  notes: string | null;
  netPayable: number;
  musak91Json: Record<string, number>;
  status: VatReturnStatus;
  generatedBy: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  submittedBy: string | null;
  submittedAt: string | null;
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  companyId: string | null;
  userId: string | null;
  method: string;
  path: string;
  statusCode: number;
  createdAt: string;
}

export interface AuditLogListResult {
  items: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface VatSummary {
  taxMonth: string;
  salesCount: number;
  purchaseCount: number;
  totalSalesValue: number;
  totalPurchaseValue: number;
  outputVat: number;
  inputVat: number;
  sdPayable: number;
  vdsCredit: number;
  netPayable: number;
}

export interface VatBand {
  vatRate: number;
  taxableValue: number;
  sdAmount: number;
  vatAmount: number;
  invoiceCount: number;
}

export interface VatPayable {
  taxMonth: string;
  bands: VatBand[];
}

export interface SummaryRow {
  vatRate: number;
  taxableValue: number;
  sdAmount: number;
  vatAmount: number;
  specificDutyAmount: number;
  grandTotal: number;
  invoiceCount: number;
}

export interface SummaryTotals {
  taxableValue: number;
  sdAmount: number;
  vatAmount: number;
  specificDutyAmount: number;
  grandTotal: number;
}

export interface InvoiceSummary {
  taxMonth: string;
  rows: SummaryRow[];
  totals: SummaryTotals;
}

export interface ReportVdsSummary {
  taxMonth: string;
  certificateCount: number;
  totalDeducted: number;
  totalDeposited: number;
  totalPending: number;
}
