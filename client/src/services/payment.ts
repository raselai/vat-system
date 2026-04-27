import api from './api';
import { ApiResponse, Payment, AgingEntry } from '../types';

export async function getArSummary() {
  const { data } = await api.get<ApiResponse<AgingEntry[]>>('/accounts/ar');
  return data.data!;
}

export async function getApSummary() {
  const { data } = await api.get<ApiResponse<AgingEntry[]>>('/accounts/ap');
  return data.data!;
}

export async function listPayments(params?: Record<string, string>) {
  const { data } = await api.get<ApiResponse<{ payments: Payment[]; total: number }>>('/accounts/payments', { params });
  return data.data!;
}

export async function createPayment(input: Record<string, any>) {
  const { data } = await api.post<ApiResponse<Payment>>('/accounts/payments', input);
  return data.data!;
}

export async function deletePayment(id: string) {
  const { data } = await api.delete<ApiResponse<{ deleted: boolean }>>(`/accounts/payments/${id}`);
  return data.data!;
}
