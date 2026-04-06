function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface LineItemInput {
  qty: number;
  unitPrice: number;
  vatRate: number;
  sdRate: number;
  specificDutyAmount: number;
  truncatedBasePct: number;
  vdsRate: number;
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
  const vdsAmount = round2(vatAmount * (input.vdsRate / 100));

  return { taxableValue, sdAmount, vatAmount, specificDutyLine, lineTotal, grandTotal: lineTotal, vdsAmount };
}

export function calculateTotals(items: LineItemCalcResult[]) {
  const subtotal = round2(items.reduce((s, i) => s + i.taxableValue, 0));
  const sdTotal = round2(items.reduce((s, i) => s + i.sdAmount, 0));
  const vatTotal = round2(items.reduce((s, i) => s + i.vatAmount, 0));
  const specificDutyTotal = round2(items.reduce((s, i) => s + i.specificDutyLine, 0));
  const grandTotal = round2(items.reduce((s, i) => s + i.grandTotal, 0));
  const vdsAmount = round2(items.reduce((s, i) => s + i.vdsAmount, 0));
  const netReceivable = round2(grandTotal - vdsAmount);
  return { subtotal, sdTotal, vatTotal, specificDutyTotal, grandTotal, vdsAmount, netReceivable };
}
