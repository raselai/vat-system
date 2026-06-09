import api from './api';
import { ApiResponse, IncomeTaxComputation, IncomeTaxResult } from '../types';

export async function previewIncomeTax(input: Record<string, any>) {
  const { data } = await api.post<ApiResponse<IncomeTaxResult>>('/income-tax/preview', input);
  return data.data!;
}

export async function listComputations() {
  const { data } = await api.get<ApiResponse<IncomeTaxComputation[]>>('/income-tax');
  return data.data!;
}

export async function getComputation(id: string) {
  const { data } = await api.get<ApiResponse<IncomeTaxComputation>>(`/income-tax/${id}`);
  return data.data!;
}

export async function saveComputation(input: Record<string, any>) {
  const { data } = await api.post<ApiResponse<IncomeTaxComputation>>('/income-tax', input);
  return data.data!;
}

export async function updateComputation(id: string, input: Record<string, any>) {
  const { data } = await api.put<ApiResponse<IncomeTaxComputation>>(`/income-tax/${id}`, input);
  return data.data!;
}

export async function deleteComputation(id: string) {
  const { data } = await api.delete<ApiResponse<{ deleted: boolean }>>(`/income-tax/${id}`);
  return data.data!;
}

export async function downloadComputationPdf(id: string, assessmentYear: string) {
  const response = await api.get(`/income-tax/${id}/pdf`, { responseType: 'blob' });
  const blob = new Blob([response.data as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `income-tax-${assessmentYear}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
