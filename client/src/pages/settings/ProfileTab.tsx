import { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

export default function ProfileTab() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const onFinish = async (values: { fullName: string; email: string }) => {
    setLoading(true);
    try {
      await api.put('/auth/me', values);
      updateUser(values);
      message.success('Profile updated');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={{ fullName: user?.fullName, email: user?.email }}
      style={{ maxWidth: 480 }}
    >
      <Form.Item
        name="fullName"
        label="Full Name"
        rules={[{ required: true, min: 2, message: 'At least 2 characters required' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="email"
        label="Email"
        rules={[{ required: true, type: 'email', message: 'Enter a valid email address' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          Save Changes
        </Button>
      </Form.Item>
    </Form>
  );
}
