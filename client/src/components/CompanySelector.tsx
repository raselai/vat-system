import { Select } from 'antd';
import { BankOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { useCompany } from '../contexts/CompanyContext';

export default function CompanySelector() {
  const { companies } = useAuth();
  const { activeCompany, setActiveCompany } = useCompany();

  if (companies.length === 0) {
    return <span style={{ color: '#999' }}>No companies</span>;
  }

  return (
    <Select
      value={activeCompany?.id}
      onChange={(value) => {
        const company = companies.find(c => c.id === value);
        if (company) setActiveCompany(company);
      }}
      style={{ width: 240 }}
      suffixIcon={<BankOutlined />}
      options={companies.map(c => ({
        value: c.id,
        label: `${c.name} (${c.role})`,
      }))}
    />
  );
}
