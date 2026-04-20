import { useState, useEffect } from 'react';
import { Form, Input, message, Switch, Select } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { D, PageHeader, GradBtn, TonalBtn, SLCard } from '../../styles/design';

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
    <div style={{ fontFamily: D.inter, color: D.onSurface, maxWidth: 640, margin: '0 auto' }}>
      <PageHeader
        eyebrow="Counterparties"
        title={isEdit ? 'Edit Customer' : 'New Customer / Supplier'}
      />
      <SLCard style={{ padding: '1.75rem' }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ isVdsEntity: false }}
        >
          <Form.Item name="name" label="Customer Name" rules={[{ required: true, min: 2 }]}>
            <Input placeholder="Full legal name" />
          </Form.Item>
          <Form.Item name="binNid" label="BIN / NID">
            <Input
              placeholder="13-digit BIN or 10–17 digit NID"
              style={{ fontFamily: 'monospace', letterSpacing: '0.04em' }}
            />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="phone" label="Phone">
              <Input placeholder="+880..." />
            </Form.Item>
            <Form.Item name="isVdsEntity" label="VDS Entity" valuePropName="checked">
              <Switch onChange={setIsVds} />
            </Form.Item>
          </div>
          <Form.Item name="address" label="Address">
            <Input.TextArea rows={3} placeholder="Street, city, district" />
          </Form.Item>
          {isVds && (
            <Form.Item name="vdsEntityType" label="VDS Entity Type">
              <Select options={[
                { value: 'bank',           label: 'Bank' },
                { value: 'govt',           label: 'Government' },
                { value: 'ngo',            label: 'NGO' },
                { value: 'listed_company', label: 'Listed Company' },
              ]} placeholder="Select entity type" />
            </Form.Item>
          )}
          <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
            <GradBtn type="submit" icon={isEdit ? 'save' : 'person_add'} loading={loading}>
              {isEdit ? 'Update' : 'Add Customer'}
            </GradBtn>
            <TonalBtn onClick={() => navigate('/customers')}>Cancel</TonalBtn>
          </div>
        </Form>
      </SLCard>
    </div>
  );
}
