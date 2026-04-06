import { useState } from 'react';
import { Layout, Menu, Button, Dropdown, Space, theme } from 'antd';
import {
  HomeOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  BarChartOutlined,
  AuditOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import CompanySelector from './CompanySelector';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: 'Dashboard' },
  { key: '/invoices', icon: <FileTextOutlined />, label: 'Musak 6.3' },
  { key: '/sales', icon: <ShoppingCartOutlined />, label: 'Sales Register' },
  { key: '/purchases', icon: <ShoppingOutlined />, label: 'Purchase Register' },
  { key: '/reports', icon: <BarChartOutlined />, label: 'Reports' },
  { key: '/returns', icon: <AuditOutlined />, label: 'Returns' },
  { key: '/products', icon: <ShoppingOutlined />, label: 'Products' },
  { key: '/customers', icon: <UserOutlined />, label: 'Customers' },
  { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: user?.fullName || 'User' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true },
  ];

  const handleUserMenu = async ({ key }: { key: string }) => {
    if (key === 'logout') {
      await logout();
      navigate('/login');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ fontWeight: 700, fontSize: collapsed ? 14 : 18, color: '#1677ff' }}>
            {collapsed ? 'VAT' : 'VAT System'}
          </span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
          <Space>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />
            <CompanySelector />
          </Space>
          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenu }} placement="bottomRight">
            <Button type="text" icon={<UserOutlined />}>
              {user?.fullName}
            </Button>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: colorBgContainer, borderRadius: borderRadiusLG, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
