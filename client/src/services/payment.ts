import api from './api';
import { ApiResponse, Payment, AgingEntry, PaymentAccount, CashBookResult, PartyLedgerResult } from '../types';

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

// ─── Payment accounts ────────────────────────────────────────────────────────

export async function listPaymentAccounts(includeInactive = false) {
  const { data } = await api.get<ApiResponse<PaymentAccount[]>>('/accounts/payment-accounts', {
    params: includeInactive ? { includeInactive: 'true' } : undefined,
  });
  return data.data!;
}

export async function getPaymentAccount(id: string) {
  const { data } = await api.get<ApiResponse<PaymentAccount>>(`/accounts/payment-accounts/${id}`);
  return data.data!;
}

export async function createPaymentAccount(input: Record<string, any>) {
  const { data } = await api.post<ApiResponse<PaymentAccount>>('/accounts/payment-accounts', input);
  return data.data!;
}

export async function updatePaymentAccount(id: string, input: Record<string, any>) {
  const { data } = await api.put<ApiResponse<PaymentAccount>>(`/accounts/payment-accounts/${id}`, input);
  return data.data!;
}

export async function deletePaymentAccount(id: string) {
  const { data } = await api.delete<ApiResponse<{ message: string }>>(`/accounts/payment-accounts/${id}`);
  return data.data!;
}

// ─── Ledgers ─────────────────────────────────────────────────────────────────

export async function getCashBook(params: { accountId: string; from?: string; to?: string }) {
  const { data } = await api.get<ApiResponse<CashBookResult>>('/accounts/cashbook', { params });
  return data.data!;
}

export async function getPartyLedger(params: { customerId: string; from?: string; to?: string }) {
  const { data } = await api.get<ApiResponse<PartyLedgerResult>>('/accounts/party-ledger', { params });
  return data.data!;
}
