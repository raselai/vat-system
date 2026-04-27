import { useState } from 'react';
import { Form, Input, InputNumber, DatePicker, Select, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { createDeduction } from '../../services/tds';
import { D, PageHeader, CardSection, GradBtn, TonalBtn, BackBtn, FormActions } from '../../styles/design';

const SECTION_OPTIONS = [
  { value: '52', label: '52 — Supply of goods' },
  { value: '52A', label: '52A — Machinery & equipment' },
  { value: '52B', label: '52B — Construction works' },
  { value: '53', label: '53 — Interest on loan/deposit' },
  { value: '55', label: '55 — Advertisement' },
  { value: '56A', label: '56A — Transport / freight' },
  { value: '57', label: '57 — Rent' },
  { value: '58', label: '58 — Commission / brokerage' },
];

export default function DeductionForm() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const recalcTds = () => {
    const gross = form.getFieldValue('grossAmount') || 0;
    const rate = form.getFieldValue('tdsRate') || 0;
    form.setFieldValue('tdsAmount', Math.round(gross * rate) / 100);
  };

  const handleSubmit = async () => {
    let values: any;
    try { values = await form.validateFields(); } catch { return; }
    setLoading(true);
    try {
      await createDeduction({
        deductionDate: values.deductionDate.format('YYYY-MM-DD'),
        sectionCode: values.sectionCode,
        deducteeName: values.deducteeName,
        deducteeTin: values.deducteeTin,
        deducteeAddress: values.deducteeAddress || undefined,
        grossAmount: values.grossAmount,
        tdsRate: values.tdsRate,
        tdsAmount: values.tdsAmount,
        notes: values.notes || undefined,
      });
      message.success('TDS deduction created');
      navigate('/tds/deductions');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to create deduction');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <BackBtn onClick={() => navigate('/tds/deductions')} label="TDS Deductions" />
      <div style={{ marginTop: 16, marginBottom: 24 }}>
        <PageHeader eyebrow="Income Tax" title="New TDS Deduction" />
      </div>

      <Form form={form} layout="vertical" initialValues={{ deductionDate: dayjs(), tdsRate: 5 }}>
        <CardSection title="Deduction Details">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <Form.Item name="deductionDate" label="Deduction Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="sectionCode" label="IT Act Section" rules={[{ required: true, message: 'Section is required' }]}>
              <Select options={SECTION_OPTIONS} placeholder="Select section" />
            </Form.Item>
          </div>
        </CardSection>

        <CardSection title="Deductee Information">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <Form.Item name="deducteeName" label="Deductee Name" rules={[{ required: true, min: 1 }]}>
              <Input placeholder="Full legal name" />
            </Form.Item>
            <Form.Item name="deducteeTin" label="TIN (12 digits)" rules={[
              { required: true },
              { pattern: /^\d{12}$/, message: 'TIN must be exactly 12 digits' },
            ]}>
              <Input placeholder="123456789012" maxLength={12} />
            </Form.Item>
          </div>
          <Form.Item name="deducteeAddress" label="Address">
            <Input.TextArea rows={2} placeholder="Optional" />
          </Form.Item>
        </CardSection>

        <CardSection title="Deduction Amounts">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <Form.Item name="grossAmount" label="Gross Payment Amount (৳)" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0} precision={2} onChange={recalcTds} />
            </Form.Item>
            <Form.Item name="tdsRate" label="TDS Rate (%)" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0} max={100} precision={2} onChange={recalcTds} />
            </Form.Item>
            <Form.Item name="tdsAmount" label="TDS Amount (৳)" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0} precision={2}
                addonBefore={<span style={{ fontFamily: D.manrope, fontWeight: 700, color: D.primary }}>৳</span>} />
            </Form.Item>
          </div>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Optional" />
          </Form.Item>
        </CardSection>

        <FormActions>
          <GradBtn icon="save" loading={loading} onClick={handleSubmit}>Save Deduction</GradBtn>
          <TonalBtn onClick={() => navigate('/tds/deductions')}>Cancel</TonalBtn>
        </FormActions>
      </Form>
    </div>
  );
}
