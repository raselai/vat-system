import { Tabs } from 'antd';
import { useCompany } from '../../contexts/CompanyContext';
import ProfileTab from './ProfileTab';
import CompanyTab from './CompanyTab';

export default function SettingsPage() {
  const { isAdmin } = useCompany();

  const items = [
    { key: 'profile', label: 'Profile', children: <ProfileTab /> },
    ...(isAdmin ? [{ key: 'company', label: 'Company', children: <CompanyTab /> }] : []),
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-on-surface mb-6 font-headline">Settings</h2>
      <Tabs items={items} />
    </div>
  );
}
