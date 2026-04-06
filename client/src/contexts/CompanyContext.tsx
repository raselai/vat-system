import { createContext, useState, useCallback, useContext, ReactNode, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { CompanyAccess } from '../types';

interface CompanyContextType {
  activeCompany: CompanyAccess | null;
  setActiveCompany: (company: CompanyAccess) => void;
  isAdmin: boolean;
}

export const CompanyContext = createContext<CompanyContextType | null>(null);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { companies } = useAuth();
  const [activeCompany, setActiveCompanyState] = useState<CompanyAccess | null>(null);

  useEffect(() => {
    const savedId = localStorage.getItem('activeCompanyId');
    const found = companies.find(c => c.id === savedId);
    if (found) {
      setActiveCompanyState(found);
    } else if (companies.length > 0) {
      setActiveCompanyState(companies[0]);
      localStorage.setItem('activeCompanyId', companies[0].id);
    }
  }, [companies]);

  const setActiveCompany = useCallback((company: CompanyAccess) => {
    setActiveCompanyState(company);
    localStorage.setItem('activeCompanyId', company.id);
  }, []);

  const isAdmin = activeCompany?.role === 'admin';

  return (
    <CompanyContext.Provider value={{ activeCompany, setActiveCompany, isAdmin }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
