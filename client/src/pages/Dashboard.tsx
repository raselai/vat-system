import { Card, Row, Col, Statistic, Typography } from 'antd';
import { ShoppingCartOutlined, ShoppingOutlined, TeamOutlined, FileTextOutlined } from '@ant-design/icons';
import { useCompany } from '../contexts/CompanyContext';

const { Title } = Typography;

export default function Dashboard() {
  const { activeCompany } = useCompany();

  return (
    <div>
      <Title level={4}>Dashboard</Title>
      {activeCompany ? (
        <>
          <p style={{ color: '#666', marginBottom: 24 }}>
            {activeCompany.name} — BIN: {activeCompany.bin}
          </p>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title="Products" value={0} prefix={<ShoppingCartOutlined />} /></Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title="Customers" value={0} prefix={<TeamOutlined />} /></Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title="Invoices" value={0} prefix={<FileTextOutlined />} /></Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title="Pending Returns" value={0} prefix={<ShoppingOutlined />} /></Card>
            </Col>
          </Row>
        </>
      ) : (
        <Card>
          <p>No company selected. Please create or select a company from the top bar.</p>
        </Card>
      )}
    </div>
  );
}
