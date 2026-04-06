import { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Button, Card, Typography, message, Space } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const { Title } = Typography;

export default function CompanyForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  useEffect(() => {
    if (isEdit) {
      api.get(`/companies/${id}`).then(({ data }) => {
        form.setFieldsValue(data.data);
      }).catch(() => message.error('Failed to load company'));
    }
  }, [id, isEdit, form]);

  const onFinish = async (values: Record<string, unknown>) => {
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/companies/${id}`, values);
        message.success('Company updated');
      } else {
        await api.post('/companies', values);
        message.success('Company created');
      }
      navigate('/companies');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={4}>{isEdit ? 'Edit Company' : 'New Company'}</Title>
      <Card style={{ maxWidth: 600 }}>
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ challanPrefix: 'CH', fiscalYearStart: 7 }}>
          <Form.Item name="name" label="Company Name" rules={[{ required: true, min: 2 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="bin" label="BIN (13 digits)" rules={[{ required: true, pattern: /^\d{13}$/, message: 'BIN must be exactly 13 digits' }]}>
            <Input maxLength={13} />
          </Form.Item>
          <Form.Item name="address" label="Address" rules={[{ required: true, min: 5 }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="challanPrefix" label="Challan Prefix">
            <Input />
          </Form.Item>
          <Form.Item name="fiscalYearStart" label="Fiscal Year Start Month (7 = July)">
            <InputNumber min={1} max={12} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {isEdit ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => navigate('/companies')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
