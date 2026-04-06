import { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Button, Card, Typography, message, Select, Space } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const { Title } = Typography;

export default function ProductForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  useEffect(() => {
    if (isEdit) {
      api.get(`/products/${id}`).then(({ data }) => {
        form.setFieldsValue(data.data);
      }).catch(() => message.error('Failed to load product'));
    }
  }, [id, isEdit, form]);

  const onFinish = async (values: Record<string, unknown>) => {
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/products/${id}`, values);
        message.success('Product updated');
      } else {
        await api.post('/products', values);
        message.success('Product created');
      }
      navigate('/products');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={4}>{isEdit ? 'Edit Product' : 'New Product'}</Title>
      <Card style={{ maxWidth: 700 }}>
        <Form form={form} layout="vertical" onFinish={onFinish}
          initialValues={{ type: 'product', vatRate: 15, sdRate: 0, specificDutyAmount: 0, truncatedBasePct: 100, unit: 'pcs', unitPrice: 0 }}>
          <Form.Item name="name" label="Product Name" rules={[{ required: true, min: 2 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="nameBn" label="Name (Bangla)">
            <Input />
          </Form.Item>
          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="type" label="Type" rules={[{ required: true }]}>
              <Select options={[{ value: 'product', label: 'Product' }, { value: 'service', label: 'Service' }]} style={{ width: 150 }} />
            </Form.Item>
            <Form.Item name="productCode" label="Product Code">
              <Input />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="hsCode" label="HS Code">
              <Input />
            </Form.Item>
            <Form.Item name="serviceCode" label="Service Code">
              <Input />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="vatRate" label="VAT Rate (%)" rules={[{ required: true }]}>
              <InputNumber min={0} max={100} style={{ width: 150 }} />
            </Form.Item>
            <Form.Item name="sdRate" label="SD Rate (%)">
              <InputNumber min={0} max={100} style={{ width: 150 }} />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="specificDutyAmount" label="Specific Duty (per unit)">
              <InputNumber min={0} style={{ width: 150 }} />
            </Form.Item>
            <Form.Item name="truncatedBasePct" label="Truncated Base (%)">
              <InputNumber min={0} max={100} style={{ width: 150 }} />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size="large">
            <Form.Item name="unit" label="Unit">
              <Input style={{ width: 150 }} />
            </Form.Item>
            <Form.Item name="unitPrice" label="Unit Price">
              <InputNumber min={0} style={{ width: 150 }} />
            </Form.Item>
          </Space>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {isEdit ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => navigate('/products')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
