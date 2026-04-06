/**
 * VAT Calculation Engine — all pure functions, no DB access.
 * Handles: standard VAT, truncated base, specific duty, SD, VDS.
 * All monetary values rounded to 2 decimal places.
 */

export interface LineItemInput {
  qty: number;
  unitPrice: number;
  vatRate: number;
  sdRate: number;
  specificDutyAmount: number;  // per-unit flat amount
  truncatedBasePct: number;    // 100 = no truncation
  vdsRate: number;             // 0 = no VDS
}

export interface LineItemCalcResult {
  taxableValue: number;
  sdAmount: number;
  vatAmount: number;
  specificDutyLine: number;
  lineTotal: number;
  grandTotal: number;
  vdsAmount: number;
}

export interface InvoiceTotals {
  subtotal: number;
  sdTotal: number;
  vatTotal: number;
  specificDutyTotal: number;
  grandTotal: number;
  vdsAmount: number;
  netReceivable: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate all amounts for a single line item.
 *
 * Standard:       taxable = qty × unitPrice
 *                 sd = taxable × sdRate%
 *                 vatBase = taxable + sd
 *                 vat = vatBase × vatRate%
 *
 * Truncated base: effectiveBase = taxable × truncatedBasePct%
 *                 vat = effectiveBase × vatRate%
 *                 (SD is NOT applied when truncated base is used)
 *
 * Specific duty:  specificDuty = qty × specificDutyAmount
 *                 added to grand total alongside VAT
 *
 * VDS:            vdsAmount = vatAmount × vdsRate%
 */
export function calculateLineItem(input: LineItemInput): LineItemCalcResult {
  const taxableValue = round2(input.qty * input.unitPrice);
  const isTruncated = input.truncatedBasePct < 100;

  let sdAmount = 0;
  let vatAmount = 0;

  if (isTruncated) {
    const effectiveBase = round2(taxableValue * (input.truncatedBasePct / 100));
    vatAmount = round2(effectiveBase * (input.vatRate / 100));
  } else {
    sdAmount = round2(taxableValue * (input.sdRate / 100));
    const vatBase = round2(taxableValue + sdAmount);
    vatAmount = round2(vatBase * (input.vatRate / 100));
  }

  const specificDutyLine = round2(input.qty * input.specificDutyAmount);
  const lineTotal = round2(taxableValue + sdAmount + vatAmount + specificDutyLine);
  const grandTotal = lineTotal;
  const vdsAmount = round2(vatAmount * (input.vdsRate / 100));

  return { taxableValue, sdAmount, vatAmount, specificDutyLine, lineTotal, grandTotal, vdsAmount };
}

/**
 * Aggregate line item results into invoice totals.
 */
export function calculateInvoiceTotals(items: LineItemCalcResult[]): InvoiceTotals {
  const subtotal = round2(items.reduce((sum, i) => sum + i.taxableValue, 0));
  const sdTotal = round2(items.reduce((sum, i) => sum + i.sdAmount, 0));
  const vatTotal = round2(items.reduce((sum, i) => sum + i.vatAmount, 0));
  const specificDutyTotal = round2(items.reduce((sum, i) => sum + i.specificDutyLine, 0));
  const grandTotal = round2(items.reduce((sum, i) => sum + i.grandTotal, 0));
  const vdsAmount = round2(items.reduce((sum, i) => sum + i.vdsAmount, 0));
  const netReceivable = round2(grandTotal - vdsAmount);

  return { subtotal, sdTotal, vatTotal, specificDutyTotal, grandTotal, vdsAmount, netReceivable };
}
