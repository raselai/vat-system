import api from './api';
import { ApiResponse, StockRow, StockRegister, StockAdjustment } from '../types';

export async function getStockSummary() {
  const { data } = await api.get<ApiResponse<StockRow[]>>('/products/stock');
  return data.data!;
}

export async function getStockRegister(productId: string) {
  const { data } = await api.get<ApiResponse<StockRegister>>(`/products/${productId}/stock-register`);
  return data.data!;
}

export async function listAdjustments(productId: string) {
  const { data } = await api.get<ApiResponse<StockAdjustment[]>>(`/products/${productId}/adjustments`);
  return data.data!;
}

export async function createAdjustment(
  productId: string,
  body: { qty: number; reason: string; adjustedAt: string },
) {
  const { data } = await api.post<ApiResponse<StockAdjustment>>(`/products/${productId}/adjustments`, body);
  return data.data!;
}

export async function downloadStockRegisterPdf(productId: string) {
  const response = await api.get(`/products/${productId}/stock-register/pdf`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `musak61-${productId}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
