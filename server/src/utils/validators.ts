export function isValidBin(bin: string): boolean {
  return /^\d{13}$/.test(bin);
}

export function getFiscalYear(date: Date, fiscalYearStartMonth = 7): string {
  const month = date.getMonth() + 1; // 1-indexed
  const year = date.getFullYear();
  if (month >= fiscalYearStartMonth) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

export function getTaxMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
