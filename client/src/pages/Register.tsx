import { useState } from 'react';
import { Card, Form, Input, Button, Typography, message, Space, Segmented } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, BankOutlined, SolutionOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { UserType } from '../types';

const { Title, Text } = Typography;

export default function Register() {
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Default from the Get Started chooser's ?type=, but selectable in the form.
  const [userType, setUserType] = useState<UserType>(
    params.get('type') === 'income_tax' ? 'income_tax' : 'company'
  );
  const isIncomeTax = userType === 'income_tax';

  const onFinish = async (values: { fullName: string; email: string; password: string }) => {
    setLoading(true);
    try {
      await register(values.fullName, values.email, values.password, userType);
      message.success('Registration successful');
      // Income-tax payers skip company setup and go straight to their home.
      navigate(isIncomeTax ? '/income-tax-home' : '/welcome');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
      <Card style={{ width: 400, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>Create Account</Title>
            <Text type="secondary">
              {isIncomeTax ? 'For Income Tax payers — personal tax only' : 'For Companies — VAT / Mushak'}
            </Text>
          </div>
          <Form layout="vertical" onFinish={onFinish} size="large">
            <Form.Item label="I am registering as" style={{ marginBottom: 16, textAlign: 'left' }}>
              <Segmented
                block
                value={userType}
                onChange={(val) => setUserType(val as UserType)}
                options={[
                  { label: 'Company (VAT)', value: 'company', icon: <BankOutlined /> },
                  { label: 'Income Tax Payer', value: 'income_tax', icon: <SolutionOutlined /> },
                ]}
              />
            </Form.Item>
            <Form.Item name="fullName" rules={[{ required: true, min: 2, message: 'Enter your full name' }]}>
              <Input prefix={<UserOutlined />} placeholder="Full Name" />
            </Form.Item>
            <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}>
              <Input prefix={<MailOutlined />} placeholder="Email" />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, min: 8, message: 'Password must be at least 8 characters' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="Password" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                Register
              </Button>
            </Form.Item>
          </Form>
          <Text>Already have an account? <Link to="/login">Sign In</Link></Text>
        </Space>
      </Card>
    </div>
  );
}
