import api from './api';
import type { VatSummary, VatPayable, InvoiceSummary, ReportVdsSummary } from '../types';

async function get<T>(path: string, taxMonth: string): Promise<T> {
  const res = await api.get<{ success: boolean; data: T }>(path, { params: { taxMonth } });
  return res.data.data!;
}

export function getVatSummary(taxMonth: string): Promise<VatSummary> {
  return get<VatSummary>('/reports/vat-summary', taxMonth);
}

export function getVatPayable(taxMonth: string): Promise<VatPayable> {
  return get<VatPayable>('/reports/vat-payable', taxMonth);
}

export function getSalesSummary(taxMonth: string): Promise<InvoiceSummary> {
  return get<InvoiceSummary>('/reports/sales-summary', taxMonth);
}

export function getPurchaseSummary(taxMonth: string): Promise<InvoiceSummary> {
  return get<InvoiceSummary>('/reports/purchase-summary', taxMonth);
}

export function getVdsSummary(taxMonth: string): Promise<ReportVdsSummary> {
  return get<ReportVdsSummary>('/reports/vds-summary', taxMonth);
}

export async function downloadReport(
  type: string,
  taxMonth: string,
  format: 'pdf' | 'xlsx',
): Promise<void> {
  const response = await api.get(`/reports/${type}/${format}`, {
    params: { taxMonth },
    responseType: 'blob',
  });
  const mimeType =
    format === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const blob = new Blob([response.data as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}-${taxMonth}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
