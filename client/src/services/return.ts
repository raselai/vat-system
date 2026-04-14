import api from './api';
import { ApiResponse, VatReturn } from '../types';

export async function listReturns(fiscalYear?: string) {
  const params = fiscalYear ? { fiscalYear } : {};
  const { data } = await api.get<ApiResponse<VatReturn[]>>('/returns', { params });
  return data.data!;
}

export async function generateReturn(taxMonth: string) {
  const { data } = await api.post<ApiResponse<VatReturn>>('/returns/generate', { taxMonth });
  return data.data!;
}

export async function getReturn(id: string) {
  const { data } = await api.get<ApiResponse<VatReturn>>(`/returns/${id}`);
  return data.data!;
}

export async function updateReturn(
  id: string,
  fields: { carryForward?: number; increasingAdjustment?: number; decreasingAdjustment?: number; notes?: string | null },
) {
  const { data } = await api.put<ApiResponse<VatReturn>>(`/returns/${id}`, fields);
  return data.data!;
}

export async function reviewReturn(id: string) {
  const { data } = await api.post<ApiResponse<VatReturn>>(`/returns/${id}/review`);
  return data.data!;
}

export async function submitReturn(id: string) {
  const { data } = await api.post<ApiResponse<VatReturn>>(`/returns/${id}/submit`);
  return data.data!;
}

export async function lockReturn(id: string) {
  const { data } = await api.post<ApiResponse<VatReturn>>(`/returns/${id}/lock`);
  return data.data!;
}

export async function downloadReturnPdf(id: string, taxMonth: string) {
  const response = await api.get(`/returns/${id}/pdf`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `musak91-${taxMonth}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadNbrFilingGuide(id: string, taxMonth: string) {
  const response = await api.get(`/returns/${id}/nbr-export`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `nbr-filing-guide-${taxMonth}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
