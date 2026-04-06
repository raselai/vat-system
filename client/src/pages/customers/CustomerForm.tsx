import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, message, Switch, Select, Space } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const { Title } = Typography;

export default function CustomerForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isVds, setIsVds] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  useEffect(() => {
    if (isEdit) {
      api.get(`/customers/${id}`).then(({ data }) => {
        form.setFieldsValue(data.data);
        setIsVds(data.data.isVdsEntity);
      }).catch(() => message.error('Failed to load customer'));
    }
  }, [id, isEdit, form]);

  const onFinish = async (values: Record<string, unknown>) => {
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/customers/${id}`, values);
        message.success('Customer updated');
      } else {
        await api.post('/customers', values);
        message.success('Customer created');
      }
      navigate('/customers');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={4}>{isEdit ? 'Edit Customer' : 'New Customer'}</Title>
      <Card style={{ maxWidth: 600 }}>
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ isVdsEntity: false }}>
          <Form.Item name="name" label="Customer Name" rules={[{ required: true, min: 2 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="binNid" label="BIN / NID">
            <Input placeholder="13-digit BIN or 10-17 digit NID" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="isVdsEntity" label="VDS Entity" valuePropName="checked">
            <Switch onChange={setIsVds} />
          </Form.Item>
          {isVds && (
            <Form.Item name="vdsEntityType" label="VDS Entity Type">
              <Select options={[
                { value: 'bank', label: 'Bank' },
                { value: 'govt', label: 'Government' },
                { value: 'ngo', label: 'NGO' },
                { value: 'listed_company', label: 'Listed Company' },
              ]} />
            </Form.Item>
          )}
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {isEdit ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => navigate('/customers')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
