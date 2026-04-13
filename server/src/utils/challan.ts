import { getFiscalYear } from './validators';

export async function generateChallanNo(tx: any, companyId: bigint, challanDate: Date): Promise<string> {
  const companies: any[] = await tx.$queryRaw`
    SELECT challan_prefix, next_challan_no, fiscal_year_start
    FROM companies WHERE id = ${companyId} FOR UPDATE
  `;
  const c = companies[0];
  const fiscalYear = getFiscalYear(challanDate, c.fiscal_year_start);
  const seq = String(c.next_challan_no).padStart(4, '0');
  const challanNo = `${c.challan_prefix}-${fiscalYear}-${seq}`;
  await tx.$executeRaw`UPDATE companies SET next_challan_no = next_challan_no + 1 WHERE id = ${companyId}`;
  return challanNo;
}
