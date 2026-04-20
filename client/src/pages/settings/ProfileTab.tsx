import { useState } from 'react';
import { Form, Input, message } from 'antd';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import { D, Icon, GradBtn } from '../../styles/design';

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
    <div style={{ maxWidth: 480, paddingTop: 8 }}>
      {/* Avatar placeholder */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, padding: '16px 20px', background: D.surfaceLow, borderRadius: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #001d52, #00307e)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="person" filled size={26} style={{ color: '#fff' }} />
        </div>
        <div>
          <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 15, color: D.onSurface, marginBottom: 2 }}>
            {user?.fullName || 'User'}
          </p>
          <p style={{ fontSize: 12, color: D.onSurfaceVar }}>{user?.email}</p>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ fullName: user?.fullName, email: user?.email }}
      >
        <Form.Item
          name="fullName"
          label="Full Name"
          rules={[{ required: true, min: 2, message: 'At least 2 characters required' }]}
        >
          <Input
            prefix={<Icon name="person" size={15} style={{ color: D.onSurfaceVar, marginRight: 4 }} />}
            placeholder="Your full name"
          />
        </Form.Item>
        <Form.Item
          name="email"
          label="Email Address"
          rules={[{ required: true, type: 'email', message: 'Enter a valid email address' }]}
        >
          <Input
            prefix={<Icon name="mail" size={15} style={{ color: D.onSurfaceVar, marginRight: 4 }} />}
            placeholder="your@email.com"
          />
        </Form.Item>
        <Form.Item style={{ marginTop: 24 }}>
          <GradBtn type="submit" icon="save" loading={loading}>
            Save Changes
          </GradBtn>
        </Form.Item>
      </Form>
    </div>
  );
}
