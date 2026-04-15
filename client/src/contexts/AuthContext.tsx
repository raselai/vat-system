import { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '../services/api';
import { User, CompanyAccess, LoginResponse, RegisterResponse } from '../types';

interface AuthContextType {
  user: User | null;
  companies: CompanyAccess[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [companies, setCompanies] = useState<CompanyAccess[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }

    api.get('/auth/me')
      .then(({ data }) => {
        setUser(data.data.user);
        setCompanies(data.data.companies);
      })
      .catch(() => {
        localStorage.clear();
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<{ success: boolean; data: LoginResponse }>('/auth/login', { email, password });
    const { user, companies, accessToken, refreshToken } = data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(user);
    setCompanies(companies);

    if (companies.length > 0 && !localStorage.getItem('activeCompanyId')) {
      localStorage.setItem('activeCompanyId', companies[0].id);
    }
  }, []);

  const register = useCallback(async (fullName: string, email: string, password: string) => {
    const { data } = await api.post<{ success: boolean; data: RegisterResponse }>('/auth/register', { fullName, email, password });
    const { user, accessToken, refreshToken } = data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(user);
    setCompanies([]);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // Ignore errors on logout
    }
    localStorage.clear();
    setUser(null);
    setCompanies([]);
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...patch } : prev);
  }, []);

  return (
    <AuthContext.Provider value={{ user, companies, isAuthenticated, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
