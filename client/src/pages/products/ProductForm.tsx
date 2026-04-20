import { useState, useEffect } from 'react';
import { Form, Input, InputNumber, message, Select } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { D, PageHeader, GradBtn, TonalBtn, SLCard } from '../../styles/design';

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
    <div style={{ fontFamily: D.inter, color: D.onSurface, maxWidth: 760, margin: '0 auto' }}>
      <PageHeader
        eyebrow="Inventory"
        title={isEdit ? 'Edit Product' : 'New Product / Service'}
      />
      <SLCard style={{ padding: '1.75rem' }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ type: 'product', vatRate: 15, sdRate: 0, specificDutyAmount: 0, truncatedBasePct: 100, unit: 'pcs', unitPrice: 0 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <Form.Item name="name" label="Product / Service Name" rules={[{ required: true, min: 2 }]}>
              <Input placeholder="Full product name" />
            </Form.Item>
            <Form.Item name="type" label="Type" rules={[{ required: true }]}>
              <Select options={[{ value: 'product', label: 'Product' }, { value: 'service', label: 'Service' }]} />
            </Form.Item>
          </div>

          <Form.Item name="nameBn" label="Name (Bangla)">
            <Input placeholder="বাংলা নাম (optional)" />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <Form.Item name="productCode" label="Product Code">
              <Input placeholder="e.g. PRD-001" />
            </Form.Item>
            <Form.Item name="hsCode" label="HS Code">
              <Input placeholder="6-digit HS" />
            </Form.Item>
            <Form.Item name="serviceCode" label="Service Code">
              <Input placeholder="S-xxx" />
            </Form.Item>
          </div>

          {/* VAT parameters */}
          <div style={{ background: D.surfaceLow, borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 16 }}>
            <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 12 }}>
              VAT Parameters
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
              <Form.Item name="vatRate" label="VAT Rate (%)" rules={[{ required: true }]}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="sdRate" label="SD Rate (%)">
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="specificDutyAmount" label="Specific Duty / Unit">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="truncatedBasePct" label="Truncated Base (%)">
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="unit" label="Unit of Measure">
              <Input placeholder="pcs, kg, ltr..." />
            </Form.Item>
            <Form.Item name="unitPrice" label="Default Unit Price (৳)">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
            <GradBtn type="submit" icon={isEdit ? 'save' : 'add_circle'} loading={loading}>
              {isEdit ? 'Update Product' : 'Create Product'}
            </GradBtn>
            <TonalBtn onClick={() => navigate('/products')}>Cancel</TonalBtn>
          </div>
        </Form>
      </SLCard>
    </div>
  );
}
