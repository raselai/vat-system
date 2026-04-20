import { useState, useEffect } from 'react';
import { Form, Input, InputNumber, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { D, PageHeader, GradBtn, TonalBtn, SLCard } from '../../styles/design';

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
    <div style={{ fontFamily: D.inter, color: D.onSurface, maxWidth: 640, margin: '0 auto' }}>
      <PageHeader
        eyebrow="Business Setup"
        title={isEdit ? 'Edit Company' : 'New Company'}
      />
      <SLCard style={{ padding: '1.75rem' }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ challanPrefix: 'CH', fiscalYearStart: 7 }}
        >
          <Form.Item name="name" label="Company Name" rules={[{ required: true, min: 2 }]}>
            <Input placeholder="Legal company name" />
          </Form.Item>
          <Form.Item
            name="bin"
            label="BIN (13 digits)"
            rules={[{ required: true, pattern: /^\d{13}$/, message: 'BIN must be exactly 13 numeric digits' }]}
          >
            <Input maxLength={13} placeholder="0000000000000" style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }} />
          </Form.Item>
          <Form.Item name="address" label="Registered Address" rules={[{ required: true, min: 5 }]}>
            <Input.TextArea rows={3} placeholder="Full registered address" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="challanPrefix" label="Challan Prefix">
              <Input placeholder="CH" />
            </Form.Item>
            <Form.Item name="fiscalYearStart" label="Fiscal Year Start Month (1–12)">
              <InputNumber min={1} max={12} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
            <GradBtn type="submit" icon={isEdit ? 'save' : 'add_business'} loading={loading}>
              {isEdit ? 'Update Company' : 'Create Company'}
            </GradBtn>
            <TonalBtn onClick={() => navigate('/companies')}>Cancel</TonalBtn>
          </div>
        </Form>
      </SLCard>
    </div>
  );
}
