export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  status: 'active' | 'inactive';
}

export interface CompanyAccess {
  id: string;
  name: string;
  bin: string;
  role: 'admin' | 'operator';
}

export interface Company {
  id: string;
  name: string;
  bin: string;
  address: string;
  challanPrefix: string;
  nextChallanNo: number;
  fiscalYearStart: number;
  createdAt: string;
  updatedAt: string;
  role?: string;
}

export interface Product {
  id: string;
  companyId: string;
  productCode?: string;
  hsCode?: string;
  serviceCode?: string;
  name: string;
  nameBn?: string;
  type: 'product' | 'service';
  vatRate: number;
  sdRate: number;
  specificDutyAmount: number;
  truncatedBasePct: number;
  unit: string;
  unitPrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  binNid?: string;
  phone?: string;
  address?: string;
  isVdsEntity: boolean;
  vdsEntityType?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  companies: CompanyAccess[];
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

export interface LoginResponse {
  user: User;
  companies: CompanyAccess[];
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
