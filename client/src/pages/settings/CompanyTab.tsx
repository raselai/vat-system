import { useState, useEffect } from 'react';
import { Form, Input, InputNumber, message } from 'antd';
import { useCompany } from '../../contexts/CompanyContext';
import api from '../../services/api';
import { D, Icon, GradBtn } from '../../styles/design';

export default function CompanyTab() {
  const { activeCompany, setActiveCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [displayTin, setDisplayTin] = useState<string | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!activeCompany) return;
    api.get(`/companies/${activeCompany.id}`)
      .then(({ data }) => {
        form.setFieldsValue(data.data);
        setDisplayTin(data.data.tin ?? null);
      })
      .catch(() => message.error('Failed to load company details'));
  }, [activeCompany?.id, form]);

  const onFinish = async (values: { name: string; address: string; challanPrefix: string; fiscalYearStart: number; tin?: string }) => {
    if (!activeCompany) return;
    setLoading(true);
    try {
      const { data } = await api.put(`/companies/${activeCompany.id}`, values);
      setActiveCompany({ ...activeCompany, name: data.data.name });
      setDisplayTin(data.data.tin ?? null);
      message.success('Company updated');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to update company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, paddingTop: 8 }}>
      {/* BIN + TIN read-only badges */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: D.surfaceLow, borderRadius: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: D.navy10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="business" size={18} style={{ color: D.primary }} />
          </div>
          <div>
            <p style={{ fontFamily: D.manrope, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 2 }}>
              BIN — VAT (read-only)
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: D.onSurface, letterSpacing: '0.05em' }}>
              {activeCompany?.bin ?? '—'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: D.surfaceLow, borderRadius: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: D.navy10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="receipt_long" size={18} style={{ color: D.primary }} />
          </div>
          <div>
            <p style={{ fontFamily: D.manrope, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 2 }}>
              TIN — Income Tax
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: D.onSurface, letterSpacing: '0.05em' }}>
              {displayTin ?? <span style={{ color: D.onSurfaceVar, fontStyle: 'italic', fontSize: 13, fontFamily: D.inter }}>Not set</span>}
            </p>
          </div>
        </div>
      </div>

      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="name"
          label="Company Name"
          rules={[{ required: true, min: 2, message: 'At least 2 characters required' }]}
        >
          <Input
            prefix={<Icon name="apartment" size={15} style={{ color: D.onSurfaceVar, marginRight: 4 }} />}
            placeholder="Legal company name"
          />
        </Form.Item>
        <Form.Item
          name="address"
          label="Registered Address"
          rules={[{ required: true, min: 5, message: 'At least 5 characters required' }]}
        >
          <Input.TextArea rows={3} placeholder="Full registered address" />
        </Form.Item>
        <Form.Item
          name="tin"
          label="TIN — Income Tax (12 digits)"
          rules={[{ pattern: /^\d{12}$/, message: 'TIN must be exactly 12 numeric digits' }]}
        >
          <Input
            maxLength={12}
            placeholder="000000000000"
            style={{ fontFamily: 'monospace', letterSpacing: '0.05em', maxWidth: 200 }}
          />
        </Form.Item>
        <Form.Item name="challanPrefix" label="Challan Prefix">
          <Input placeholder="e.g. CH" style={{ maxWidth: 120 }} />
        </Form.Item>
        <Form.Item name="fiscalYearStart" label="Fiscal Year Start Month (1–12)">
          <InputNumber min={1} max={12} style={{ width: 120 }} />
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
