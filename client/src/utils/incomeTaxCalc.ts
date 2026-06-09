/**
 * Individual Income Tax Calculation Engine (client mirror).
 * Bangladesh NBR slabs for FY 2025-26 (Assessment Year 2026-27).
 *
 * IMPORTANT: Mirror of server/src/services/incomeTaxCalc.service.ts.
 * Keep the two in sync manually (same convention as the VAT calc engine).
 */

export type IncomeTaxCategory = 'general' | 'women_senior' | 'third_gender_disabled' | 'freedom_fighter';
export type IncomeTaxpayerStatus = 'existing' | 'new';

export const THRESHOLDS: Record<IncomeTaxCategory, number> = {
  general: 375000,
  women_senior: 425000,
  third_gender_disabled: 500000,
  freedom_fighter: 525000,
};

export const MINIMUM_TAX: Record<IncomeTaxpayerStatus, number> = {
  existing: 5000,
  new: 1000,
};

const PROGRESSIVE_BANDS: { width: number; rate: number }[] = [
  { width: 300000, rate: 0.10 },
  { width: 400000, rate: 0.15 },
  { width: 500000, rate: 0.20 },
  { width: 2000000, rate: 0.25 },
  { width: Infinity, rate: 0.30 },
];

export interface SlabBreakdownRow {
  label: string;
  slabAmount: number;
  rate: number;
  tax: number;
}

export interface IncomeTaxResult {
  grossTax: number;
  applicableMinimum: number;
  taxAfterMinimum: number;
  netPayable: number;
  refundable: number;
  breakdown: SlabBreakdownRow[];
}

export interface IncomeTaxInput {
  taxableIncome: number;
  category: IncomeTaxCategory;
  taxpayerStatus: IncomeTaxpayerStatus;
  advanceTaxPaid?: number;
  subjectToMinimum?: boolean;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function fmtBn(n: number): string {
  return n.toLocaleString('en-IN');
}

export function computeIncomeTax(taxableIncome: number, category: IncomeTaxCategory): { grossTax: number; breakdown: SlabBreakdownRow[] } {
  const income = Math.max(0, taxableIncome);
  const threshold = THRESHOLDS[category];
  const breakdown: SlabBreakdownRow[] = [];

  const taxFree = Math.min(income, threshold);
  breakdown.push({ label: `Tax-free (first ${fmtBn(threshold)})`, slabAmount: round2(taxFree), rate: 0, tax: 0 });

  let remaining = income - taxFree;
  let grossTax = 0;

  for (const band of PROGRESSIVE_BANDS) {
    if (remaining <= 0) break;
    const amt = Math.min(remaining, band.width);
    const bandTax = amt * band.rate;
    grossTax += bandTax;
    const ratePct = Math.round(band.rate * 100);
    const label = band.width === Infinity
      ? `Remaining @ ${ratePct}%`
      : `Next ${fmtBn(band.width)} @ ${ratePct}%`;
    breakdown.push({ label, slabAmount: round2(amt), rate: ratePct, tax: round2(bandTax) });
    remaining -= amt;
  }

  return { grossTax: round2(grossTax), breakdown };
}

export function computeIncomeTaxReturn(input: IncomeTaxInput): IncomeTaxResult {
  const taxableIncome = Math.max(0, input.taxableIncome);
  const advanceTaxPaid = Math.max(0, input.advanceTaxPaid ?? 0);
  const subjectToMinimum = input.subjectToMinimum ?? true;
  const threshold = THRESHOLDS[input.category];

  const { grossTax, breakdown } = computeIncomeTax(taxableIncome, input.category);

  const applicableMinimum = (subjectToMinimum && taxableIncome > threshold)
    ? MINIMUM_TAX[input.taxpayerStatus]
    : 0;

  const taxAfterMinimum = round2(Math.max(grossTax, applicableMinimum));
  const netPayable = round2(Math.max(0, taxAfterMinimum - advanceTaxPaid));
  const refundable = round2(Math.max(0, advanceTaxPaid - taxAfterMinimum));

  return { grossTax, applicableMinimum, taxAfterMinimum, netPayable, refundable, breakdown };
}
