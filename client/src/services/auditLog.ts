import api from './api';
import { ApiResponse, AuditLogListResult } from '../types';

export interface AuditLogFilters {
  userId?: string;
  method?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export async function listAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogListResult> {
  const params: Record<string, string | number> = {};
  if (filters.userId)  params.userId  = filters.userId;
  if (filters.method)  params.method  = filters.method;
  if (filters.from)    params.from    = filters.from;
  if (filters.to)      params.to      = filters.to;
  if (filters.page)    params.page    = filters.page;
  if (filters.limit)   params.limit   = filters.limit;

  const { data } = await api.get<ApiResponse<AuditLogListResult>>('/audit-logs', { params });
  return data.data!;
}
