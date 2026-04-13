import api from './api';
import { ApiResponse, RegisterResult } from '../types';

export async function getRegister(type: 'sales' | 'purchase', taxMonth: string) {
  const { data } = await api.get<ApiResponse<RegisterResult>>(`/registers/${type}`, { params: { taxMonth } });
  return data.data!;
}

export async function downloadRegisterPdf(type: 'sales' | 'purchase', taxMonth: string) {
  const response = await api.get(`/registers/${type}/pdf`, {
    params: { taxMonth },
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `musak67-${type}-${taxMonth}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
