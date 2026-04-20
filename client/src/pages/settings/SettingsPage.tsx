import { Tabs } from 'antd';
import { useCompany } from '../../contexts/CompanyContext';
import ProfileTab from './ProfileTab';
import CompanyTab from './CompanyTab';
import { D, PageHeader, SLCard } from '../../styles/design';

export default function SettingsPage() {
  const { isAdmin } = useCompany();

  const items = [
    { key: 'profile', label: 'Profile',  children: <ProfileTab /> },
    ...(isAdmin ? [{ key: 'company', label: 'Company', children: <CompanyTab /> }] : []),
  ];

  return (
    <div style={{ fontFamily: D.inter, color: D.onSurface, maxWidth: 860, margin: '0 auto' }}>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        sub="Manage your profile and company preferences"
      />
      <SLCard style={{ padding: '1.5rem 2rem' }}>
        <Tabs items={items} />
      </SLCard>
    </div>
  );
}
