import api from './api';
import { ApiResponse, TdsDeduction, TdsPayment, TdsSummary } from '../types';

// ---------- Deductions ----------

export async function listDeductions(params?: Record<string, string>) {
  const { data } = await api.get<ApiResponse<{ deductions: TdsDeduction[]; total: number }>>('/tds/deductions', { params });
  return data.data!;
}

export async function getDeduction(id: string) {
  const { data } = await api.get<ApiResponse<TdsDeduction>>(`/tds/deductions/${id}`);
  return data.data!;
}

export async function createDeduction(input: Record<string, any>) {
  const { data } = await api.post<ApiResponse<TdsDeduction>>('/tds/deductions', input);
  return data.data!;
}

export async function updateDeduction(id: string, input: Record<string, any>) {
  const { data } = await api.put<ApiResponse<TdsDeduction>>(`/tds/deductions/${id}`, input);
  return data.data!;
}

export async function finalizeDeduction(id: string) {
  const { data } = await api.post<ApiResponse<TdsDeduction>>(`/tds/deductions/${id}/finalize`);
  return data.data!;
}

export async function cancelDeduction(id: string) {
  const { data } = await api.post<ApiResponse<TdsDeduction>>(`/tds/deductions/${id}/cancel`);
  return data.data!;
}

// ---------- Payments ----------

export async function listTdsPayments(params?: Record<string, string>) {
  const { data } = await api.get<ApiResponse<{ payments: TdsPayment[]; total: number }>>('/tds/payments', { params });
  return data.data!;
}

export async function getTdsPayment(id: string) {
  const { data } = await api.get<ApiResponse<TdsPayment>>(`/tds/payments/${id}`);
  return data.data!;
}

export async function createTdsPayment(input: Record<string, any>) {
  const { data } = await api.post<ApiResponse<TdsPayment>>('/tds/payments', input);
  return data.data!;
}

export async function updateTdsPayment(id: string, input: Record<string, any>) {
  const { data } = await api.put<ApiResponse<TdsPayment>>(`/tds/payments/${id}`, input);
  return data.data!;
}

export async function markDeposited(id: string) {
  const { data } = await api.post<ApiResponse<TdsPayment>>(`/tds/payments/${id}/mark-deposited`);
  return data.data!;
}

export async function linkDeductionsToPayment(id: string, deductions: { deductionId: string; amount: number }[]) {
  const { data } = await api.post<ApiResponse<TdsPayment>>(`/tds/payments/${id}/link-deductions`, { deductions });
  return data.data!;
}

// ---------- Summary ----------

export async function getTdsSummary(taxMonth: string) {
  const { data } = await api.get<ApiResponse<TdsSummary>>('/tds/summary', { params: { taxMonth } });
  return data.data!;
}
