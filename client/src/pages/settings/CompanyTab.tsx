import { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Button, message, Descriptions } from 'antd';
import { useCompany } from '../../contexts/CompanyContext';
import api from '../../services/api';

export default function CompanyTab() {
  const { activeCompany, setActiveCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!activeCompany) return;
    api.get(`/companies/${activeCompany.id}`)
      .then(({ data }) => form.setFieldsValue(data.data))
      .catch(() => message.error('Failed to load company details'));
  }, [activeCompany?.id, form]);

  const onFinish = async (values: { name: string; address: string; challanPrefix: string; fiscalYearStart: number }) => {
    if (!activeCompany) return;
    setLoading(true);
    try {
      const { data } = await api.put(`/companies/${activeCompany.id}`, values);
      setActiveCompany({ ...activeCompany, name: data.data.name });
      message.success('Company updated');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to update company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Descriptions
        bordered
        size="small"
        style={{ maxWidth: 480, marginBottom: 24 }}
        column={1}
      >
        <Descriptions.Item label="BIN (read-only)">{activeCompany?.bin}</Descriptions.Item>
      </Descriptions>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={{ maxWidth: 480 }}
      >
        <Form.Item
          name="name"
          label="Company Name"
          rules={[{ required: true, min: 2, message: 'At least 2 characters required' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="address"
          label="Address"
          rules={[{ required: true, min: 5, message: 'At least 5 characters required' }]}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="challanPrefix" label="Challan Prefix">
          <Input placeholder="CH" />
        </Form.Item>
        <Form.Item
          name="fiscalYearStart"
          label="Fiscal Year Start Month (1–12)"
        >
          <InputNumber min={1} max={12} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            Save Changes
          </Button>
        </Form.Item>
      </Form>
    </>
  );
}
