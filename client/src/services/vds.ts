import api from './api';
import { ApiResponse, VdsCertificate, TreasuryDeposit, VdsSummary } from '../types';

// ---------- Certificates ----------

export async function listCertificates(params?: Record<string, string>) {
  const { data } = await api.get<ApiResponse<{ certificates: VdsCertificate[]; total: number }>>('/vds/certificates', { params });
  return data.data!;
}

export async function getCertificate(id: string) {
  const { data } = await api.get<ApiResponse<VdsCertificate>>(`/vds/certificates/${id}`);
  return data.data!;
}

export async function createCertificate(input: Record<string, any>) {
  const { data } = await api.post<ApiResponse<VdsCertificate>>('/vds/certificates', input);
  return data.data!;
}

export async function updateCertificate(id: string, input: Record<string, any>) {
  const { data } = await api.put<ApiResponse<VdsCertificate>>(`/vds/certificates/${id}`, input);
  return data.data!;
}

export async function finalizeCertificate(id: string) {
  const { data } = await api.post<ApiResponse<VdsCertificate>>(`/vds/certificates/${id}/finalize`);
  return data.data!;
}

export async function cancelCertificate(id: string) {
  const { data } = await api.post<ApiResponse<VdsCertificate>>(`/vds/certificates/${id}/cancel`);
  return data.data!;
}

export async function createCertificateFromInvoice(invoiceId: string, role: string) {
  const { data } = await api.post<ApiResponse<VdsCertificate>>(`/vds/certificates/from-invoice/${invoiceId}`, { role });
  return data.data!;
}

export function getCertificatePdfUrl(id: string) {
  return `/api/v1/vds/certificates/${id}/pdf`;
}

// ---------- Treasury Deposits ----------

export async function listDeposits(params?: Record<string, string>) {
  const { data } = await api.get<ApiResponse<{ deposits: TreasuryDeposit[]; total: number }>>('/vds/deposits', { params });
  return data.data!;
}

export async function getDeposit(id: string) {
  const { data } = await api.get<ApiResponse<TreasuryDeposit>>(`/vds/deposits/${id}`);
  return data.data!;
}

export async function createDeposit(input: Record<string, any>) {
  const { data } = await api.post<ApiResponse<TreasuryDeposit>>('/vds/deposits', input);
  return data.data!;
}

export async function updateDeposit(id: string, input: Record<string, any>) {
  const { data } = await api.put<ApiResponse<TreasuryDeposit>>(`/vds/deposits/${id}`, input);
  return data.data!;
}

export async function markDeposited(id: string) {
  const { data } = await api.post<ApiResponse<TreasuryDeposit>>(`/vds/deposits/${id}/mark-deposited`);
  return data.data!;
}

export async function linkCertificatesToDeposit(id: string, certificates: { certificateId: string; amount: number }[]) {
  const { data } = await api.post<ApiResponse<TreasuryDeposit>>(`/vds/deposits/${id}/link-certificates`, { certificates });
  return data.data!;
}

// ---------- Summary ----------

export async function getSummary(taxMonth: string) {
  const { data } = await api.get<ApiResponse<VdsSummary>>('/vds/summary', { params: { taxMonth } });
  return data.data!;
}
