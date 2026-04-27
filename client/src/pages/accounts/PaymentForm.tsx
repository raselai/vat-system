import { useState } from 'react';
import { Modal, Form, InputNumber, DatePicker, Select, Input, message } from 'antd';
import dayjs from 'dayjs';
import { createPayment } from '../../services/payment';
import { D, GradBtn, TonalBtn } from '../../styles/design';

interface PaymentFormProps {
  invoiceId: string;
  outstanding: number;
  onSuccess: () => void;
  onClose: () => void;
}

const METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_banking', label: 'Mobile Banking' },
];

export default function PaymentForm({ invoiceId, outstanding, onSuccess, onClose }: PaymentFormProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    let values: any;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setLoading(true);
    try {
      await createPayment({
        invoiceId,
        amount: values.amount,
        paymentDate: values.paymentDate.format('YYYY-MM-DD'),
        paymentMethod: values.paymentMethod,
        reference: values.reference || undefined,
        notes: values.notes || undefined,
      });
      message.success('Payment recorded');
      onSuccess();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      title={<span style={{ fontFamily: D.manrope, fontWeight: 700 }}>Record Payment</span>}
      onCancel={onClose}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <TonalBtn onClick={onClose}>Cancel</TonalBtn>
          <GradBtn icon="payments" loading={loading} onClick={handleSubmit}>Record Payment</GradBtn>
        </div>
      }
    >
      <p style={{ fontFamily: D.inter, fontSize: 13, color: D.onSurfaceVar, marginBottom: 16 }}>
        Outstanding balance: <strong style={{ color: D.onSurface }}>
          ৳ {outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </strong>
      </p>
      <Form form={form} layout="vertical" initialValues={{ paymentDate: dayjs(), paymentMethod: 'bank_transfer' }}>
        <Form.Item name="amount" label="Amount (৳)" rules={[
          { required: true, message: 'Amount is required' },
          { type: 'number', min: 0.01, message: 'Amount must be positive' },
          { validator: (_, v) => v <= outstanding + 0.001 ? Promise.resolve() : Promise.reject('Exceeds outstanding balance') },
        ]}>
          <InputNumber style={{ width: '100%' }} min={0.01} max={outstanding} precision={2} />
        </Form.Item>
        <Form.Item name="paymentDate" label="Payment Date" rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="paymentMethod" label="Payment Method" rules={[{ required: true }]}>
          <Select options={METHOD_OPTIONS} />
        </Form.Item>
        <Form.Item name="reference" label="Reference / Cheque No.">
          <Input placeholder="Optional" />
        </Form.Item>
        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={2} placeholder="Optional" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
