import { useState, useEffect } from 'react';
import { Form, Input, InputNumber, message, Select } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { getPaymentAccount, createPaymentAccount, updatePaymentAccount } from '../../services/payment';
import { D, PageHeader, GradBtn, TonalBtn, SLCard } from '../../styles/design';

export default function PaymentAccountForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const type = Form.useWatch('type', form);

  useEffect(() => {
    if (isEdit) {
      getPaymentAccount(id!).then(account => {
        form.setFieldsValue(account);
      }).catch(() => message.error('Failed to load account'));
    }
  }, [id, isEdit, form]);

  const onFinish = async (values: Record<string, unknown>) => {
    setLoading(true);
    try {
      if (isEdit) {
        await updatePaymentAccount(id!, values);
        message.success('Account updated');
      } else {
        await createPaymentAccount(values);
        message.success('Account created');
      }
      navigate('/accounts/payment-accounts');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: D.inter, color: D.onSurface, maxWidth: 640, margin: '0 auto' }}>
      <PageHeader
        eyebrow="Accounts"
        title={isEdit ? 'Edit Money Account' : 'New Money Account'}
      />
      <SLCard style={{ padding: '1.75rem' }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ type: 'cash', openingBalance: 0 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr]" style={{ gap: 16 }}>
            <Form.Item name="name" label="Account Name" rules={[{ required: true, min: 1 }]}>
              <Input placeholder="e.g. Cash in hand, DBBL CA-1234, bKash Merchant" />
            </Form.Item>
            <Form.Item name="type" label="Type" rules={[{ required: true }]}>
              <Select options={[
                { value: 'cash', label: 'Cash' },
                { value: 'bank', label: 'Bank' },
                { value: 'mobile_banking', label: 'Mobile Banking' },
              ]} />
            </Form.Item>
          </div>

          {type !== 'cash' && (
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 16 }}>
              <Form.Item name="bankName" label={type === 'mobile_banking' ? 'Provider' : 'Bank Name'}>
                <Input placeholder={type === 'mobile_banking' ? 'e.g. bKash, Nagad, Rocket' : 'e.g. Dutch-Bangla Bank'} />
              </Form.Item>
              <Form.Item name="accountNumber" label={type === 'mobile_banking' ? 'Wallet Number' : 'Account Number'}>
                <Input placeholder={type === 'mobile_banking' ? '01XXXXXXXXX' : 'Account number'} />
              </Form.Item>
            </div>
          )}

          <Form.Item name="openingBalance" label="Opening Balance (৳)" extra="Balance in this account when you start tracking it here">
            <InputNumber style={{ width: '100%' }} precision={2} />
          </Form.Item>

          <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
            <GradBtn type="submit" icon={isEdit ? 'save' : 'add_circle'} loading={loading}>
              {isEdit ? 'Update Account' : 'Create Account'}
            </GradBtn>
            <TonalBtn onClick={() => navigate('/accounts/payment-accounts')}>Cancel</TonalBtn>
          </div>
        </Form>
      </SLCard>
    </div>
  );
}
