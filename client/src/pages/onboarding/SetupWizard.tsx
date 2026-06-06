import { useState } from 'react';
import { Form, Input, InputNumber, Select, Steps, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { D, Icon, GradBtn, TonalBtn, SLCard } from '../../styles/design';
import { useLang } from '../../contexts/LanguageContext';
import { useAuth } from '../../hooks/useAuth';

const WELCOME_KEY = 'welcomeComplete';

/** Marks onboarding done so the first-run gate stops redirecting here. */
export function markWelcomeComplete() {
  localStorage.setItem(WELCOME_KEY, '1');
}
export function isWelcomeComplete() {
  return localStorage.getItem(WELCOME_KEY) === '1';
}

/**
 * Guided first-run setup for brand-new users: Welcome → create business →
 * add first product (skippable) → done. Reuses the company/product create
 * endpoints and field rules; full-screen (no sidebar).
 */
export default function SetupWizard() {
  const { t, lang } = useLang();
  const { reloadProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [bizForm] = Form.useForm();
  const [prodForm] = Form.useForm();

  const finish = () => {
    markWelcomeComplete();
    navigate('/', { replace: true });
  };

  const createBusiness = async (values: Record<string, unknown>) => {
    setLoading(true);
    try {
      const { data } = await api.post('/companies', values);
      const newId = data.data.id as string;
      localStorage.setItem('activeCompanyId', newId);
      await reloadProfile();
      message.success(t('wizard.business.created'));
      setStep(2);
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const createProduct = async (values: Record<string, unknown>) => {
    setLoading(true);
    try {
      await api.post('/products', {
        ...values,
        sdRate: 0,
        specificDutyAmount: 0,
        truncatedBasePct: 100,
      });
      message.success(t('wizard.product.created'));
      setStep(3);
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: D.surface, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: 620 }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: D.grad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="account_balance" filled size={22} style={{ color: '#fff' }} />
          </div>
          <span style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 17, color: D.primary, letterSpacing: '-0.02em' }}>Sovereign Ledger</span>
        </div>

        <Steps
          size="small"
          current={step}
          style={{ marginBottom: 28 }}
          items={[
            { title: t('wizard.step.welcome') },
            { title: t('wizard.step.business') },
            { title: t('wizard.step.product') },
            { title: t('wizard.step.done') },
          ]}
        />

        <SLCard style={{ padding: '2rem' }}>
          {/* Step 0 — Welcome */}
          {step === 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: 20, background: D.navy10, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Icon name="waving_hand" filled size={36} style={{ color: D.primary }} />
              </div>
              <h2 style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 24, color: D.onSurface, margin: '0 0 12px', letterSpacing: '-0.02em' }}>{t('wizard.welcome.title')}</h2>
              <p style={{ fontFamily: D.inter, fontSize: 14.5, color: D.onSurfaceVar, lineHeight: 1.7, margin: '0 auto 28px', maxWidth: '46ch' }}>{t('wizard.welcome.body')}</p>
              <GradBtn size="lg" icon="arrow_forward" onClick={() => setStep(1)}>{t('wizard.welcome.cta')}</GradBtn>
            </div>
          )}

          {/* Step 1 — Business */}
          {step === 1 && (
            <div>
              <h2 style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 20, color: D.onSurface, margin: '0 0 6px' }}>{t('wizard.business.title')}</h2>
              <p style={{ fontFamily: D.inter, fontSize: 13.5, color: D.onSurfaceVar, margin: '0 0 20px', lineHeight: 1.6 }}>{t('wizard.business.body')}</p>
              <Form form={bizForm} layout="vertical" onFinish={createBusiness} initialValues={{ challanPrefix: 'CH', fiscalYearStart: 7 }}>
                <Form.Item name="name" label={lang === 'bn' ? 'ব্যবসার নাম' : 'Business Name'} rules={[{ required: true, min: 2, message: t('common.required') }]}>
                  <Input placeholder={lang === 'bn' ? 'আইনি ব্যবসার নাম' : 'Legal business name'} size="large" />
                </Form.Item>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Form.Item name="bin" label={t('common.bin')} rules={[{ required: true, pattern: /^\d{13}$/, message: lang === 'bn' ? 'বিআইএন ঠিক ১৩ সংখ্যার হতে হবে' : 'BIN must be exactly 13 digits' }]}>
                    <Input maxLength={13} placeholder="0000000000000" size="large" style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }} />
                  </Form.Item>
                  <Form.Item name="tin" label={lang === 'bn' ? 'টিআইএন (ঐচ্ছিক, ১২ সংখ্যা)' : 'TIN (optional, 12 digits)'} rules={[{ pattern: /^\d{12}$/, message: lang === 'bn' ? 'টিআইএন ঠিক ১২ সংখ্যার হতে হবে' : 'TIN must be exactly 12 digits' }]}>
                    <Input maxLength={12} placeholder="000000000000" size="large" style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }} />
                  </Form.Item>
                </div>
                <Form.Item name="address" label={lang === 'bn' ? 'নিবন্ধিত ঠিকানা' : 'Registered Address'} rules={[{ required: true, min: 5, message: t('common.required') }]}>
                  <Input.TextArea rows={2} placeholder={lang === 'bn' ? 'পূর্ণ ঠিকানা' : 'Full registered address'} />
                </Form.Item>
                <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
                  <GradBtn type="submit" icon="arrow_forward" loading={loading}>{t('wizard.next')}</GradBtn>
                  <TonalBtn onClick={() => setStep(0)}>{t('wizard.back')}</TonalBtn>
                </div>
              </Form>
            </div>
          )}

          {/* Step 2 — First product */}
          {step === 2 && (
            <div>
              <h2 style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 20, color: D.onSurface, margin: '0 0 6px' }}>{t('wizard.product.title')}</h2>
              <p style={{ fontFamily: D.inter, fontSize: 13.5, color: D.onSurfaceVar, margin: '0 0 20px', lineHeight: 1.6 }}>{t('wizard.product.body')}</p>
              <Form form={prodForm} layout="vertical" onFinish={createProduct} initialValues={{ type: 'product', vatRate: 15, unit: 'pcs', unitPrice: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                  <Form.Item name="name" label={lang === 'bn' ? 'পণ্য / সেবার নাম' : 'Product / Service Name'} rules={[{ required: true, min: 2, message: t('common.required') }]}>
                    <Input placeholder={lang === 'bn' ? 'পণ্যের নাম' : 'Product name'} size="large" />
                  </Form.Item>
                  <Form.Item name="type" label={lang === 'bn' ? 'ধরন' : 'Type'} rules={[{ required: true }]}>
                    <Select size="large" options={[{ value: 'product', label: lang === 'bn' ? 'পণ্য' : 'Product' }, { value: 'service', label: lang === 'bn' ? 'সেবা' : 'Service' }]} />
                  </Form.Item>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <Form.Item name="vatRate" label={lang === 'bn' ? 'ভ্যাট হার (%)' : 'VAT Rate (%)'} rules={[{ required: true }]}>
                    <InputNumber min={0} max={100} size="large" style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="unit" label={lang === 'bn' ? 'একক' : 'Unit'}>
                    <Input placeholder="pcs, kg, ltr..." size="large" />
                  </Form.Item>
                  <Form.Item name="unitPrice" label={lang === 'bn' ? 'একক দাম (৳)' : 'Unit Price (৳)'}>
                    <InputNumber min={0} size="large" style={{ width: '100%' }} />
                  </Form.Item>
                </div>
                <div style={{ display: 'flex', gap: 10, paddingTop: 8, alignItems: 'center' }}>
                  <GradBtn type="submit" icon="arrow_forward" loading={loading}>{t('wizard.next')}</GradBtn>
                  <TonalBtn onClick={() => setStep(3)}>{t('wizard.skip')}</TonalBtn>
                </div>
              </Form>
            </div>
          )}

          {/* Step 3 — Done */}
          {step === 3 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: 20, background: D.green12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Icon name="celebration" filled size={36} style={{ color: D.tertiary }} />
              </div>
              <h2 style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 24, color: D.onSurface, margin: '0 0 12px', letterSpacing: '-0.02em' }}>{t('wizard.done.title')}</h2>
              <p style={{ fontFamily: D.inter, fontSize: 14.5, color: D.onSurfaceVar, lineHeight: 1.7, margin: '0 auto 28px', maxWidth: '46ch' }}>{t('wizard.done.body')}</p>
              <GradBtn size="lg" icon="home" onClick={finish}>{t('wizard.done.cta')}</GradBtn>
            </div>
          )}
        </SLCard>
      </div>
    </div>
  );
}
