import { useState, useEffect } from 'react';
import { message, Select, DatePicker, Input, InputNumber } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../services/api';
import { createCertificate } from '../../services/vds';
import { Invoice } from '../../types';
import { D, PageHeader, GradBtn, TonalBtn, SLCard, SummaryRow, SLDivider } from '../../styles/design';

export default function CertificateForm() {
  const [loading, setLoading]           = useState(false);
  const [invoices, setInvoices]         = useState<Invoice[]>([]);
  const [role, setRole]                 = useState<'deductor' | 'deductee'>('deductor');
  const [certificateDate, setCertificateDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [invoiceId, setInvoiceId]       = useState<string | undefined>();
  const [counterpartyName, setCounterpartyName]     = useState('');
  const [counterpartyBin, setCounterpartyBin]       = useState('');
  const [counterpartyAddress, setCounterpartyAddress] = useState('');
  const [totalValue, setTotalValue]     = useState(0);
  const [vatAmount, setVatAmount]       = useState(0);
  const [vdsRate, setVdsRate]           = useState(0);
  const [vdsAmount, setVdsAmount]       = useState(0);
  const [notes, setNotes]               = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/invoices?status=approved').then(res => {
      setInvoices(res.data.data.invoices.filter((i: Invoice) => i.vdsApplicable));
    }).catch(() => {});
  }, []);

  const handleInvoiceSelect = (id: string) => {
    setInvoiceId(id);
    const inv = invoices.find(i => i.id === id);
    if (inv) {
      setCounterpartyName(inv.customer?.name || '');
      setCounterpartyBin(inv.customer?.binNid || '');
      setCounterpartyAddress(inv.customer?.address || '');
      setTotalValue(inv.grandTotal);
      setVatAmount(inv.vatTotal);
      setVdsAmount(inv.vdsAmount);
      if (inv.vatTotal > 0) setVdsRate(Math.round((inv.vdsAmount / inv.vatTotal) * 10000) / 100);
      setCertificateDate(dayjs(inv.challanDate).format('YYYY-MM-DD'));
    }
  };

  const handleVdsRateChange = (rate: number) => {
    setVdsRate(rate);
    setVdsAmount(Math.round(vatAmount * rate) / 100);
  };

  const handleSubmit = async () => {
    if (!counterpartyName || !counterpartyBin) return message.error('Counterparty name and BIN are required');
    if (!/^\d{13}$/.test(counterpartyBin))     return message.error('BIN must be exactly 13 digits');
    setLoading(true);
    try {
      await createCertificate({
        certificateDate, role, invoiceId,
        counterpartyName, counterpartyBin,
        counterpartyAddress: counterpartyAddress || undefined,
        totalValue, vatAmount, vdsRate, vdsAmount,
        notes: notes || undefined,
      });
      message.success('VDS Certificate created');
      navigate('/vds/certificates');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to create certificate');
    } finally { setLoading(false); }
  };

  const fmt = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 });

  return (
    <div style={{ fontFamily: D.inter, color: D.onSurface, maxWidth: 860, margin: '0 auto' }}>
      <PageHeader
        eyebrow="মূসক-৬.৬ / Musak 6.6"
        title="New VDS Certificate"
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Certificate meta */}
        <SLCard style={{ padding: '1.5rem' }}>
          <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 16 }}>
            Certificate Details
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 6 }}>Role</p>
              <Select
                value={role}
                onChange={setRole}
                style={{ width: '100%' }}
                options={[
                  { value: 'deductor', label: 'Deductor (Buyer)' },
                  { value: 'deductee', label: 'Deductee (Seller)' },
                ]}
              />
            </div>
            <div>
              <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 6 }}>Date</p>
              <DatePicker
                value={dayjs(certificateDate)}
                onChange={(d) => setCertificateDate(d?.format('YYYY-MM-DD') || '')}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 6 }}>Link Invoice (auto-fill)</p>
              <Select
                value={invoiceId}
                onChange={handleInvoiceSelect}
                allowClear
                style={{ width: '100%' }}
                placeholder="Select an approved VDS invoice"
                showSearch
                optionFilterProp="label"
                options={invoices.map(i => ({
                  value: i.id,
                  label: `${i.challanNo} — ${i.customer?.name || 'No customer'} (${i.grandTotal.toLocaleString('en-IN')})`,
                }))}
              />
            </div>
          </div>
        </SLCard>

        {/* Counterparty */}
        <SLCard style={{ padding: '1.5rem' }}>
          <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 16 }}>
            Counterparty Information
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
            <div>
              <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 6 }}>Name</p>
              <Input value={counterpartyName} onChange={e => setCounterpartyName(e.target.value)} placeholder="Counterparty legal name" />
            </div>
            <div>
              <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 6 }}>BIN (13 digits)</p>
              <Input
                value={counterpartyBin}
                onChange={e => setCounterpartyBin(e.target.value)}
                placeholder="0000000000000"
                maxLength={13}
                style={{ fontFamily: 'monospace', letterSpacing: '0.08em' }}
              />
            </div>
          </div>
          <div>
            <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 6 }}>Address (optional)</p>
            <Input value={counterpartyAddress} onChange={e => setCounterpartyAddress(e.target.value)} placeholder="Full address" />
          </div>
        </SLCard>

        {/* Deduction details + summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <SLCard style={{ padding: '1.5rem' }}>
            <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 16 }}>
              Deduction Details
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {([
                { label: 'Total Value (incl. VAT)', value: totalValue, onChange: (v: number | null) => setTotalValue(v || 0) },
                { label: 'VAT Amount', value: vatAmount, onChange: (v: number | null) => { setVatAmount(v || 0); setVdsAmount(Math.round((v || 0) * vdsRate) / 100); } },
                { label: 'VDS Rate (%)', value: vdsRate, onChange: (v: number | null) => handleVdsRateChange(v || 0), max: 100 },
                { label: 'VDS Amount', value: vdsAmount, onChange: (v: number | null) => setVdsAmount(v || 0) },
              ]).map(({ label, value, onChange, max }) => (
                <div key={label}>
                  <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 5 }}>{label}</p>
                  <InputNumber
                    value={value}
                    min={0}
                    max={max}
                    onChange={onChange}
                    style={{ width: '100%' }}
                    formatter={max ? undefined : (v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','))}
                  />
                </div>
              ))}
            </div>
          </SLCard>

          {/* Summary + VDS amount */}
          <SLCard style={{ padding: '1.5rem' }}>
            <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 16 }}>
              Summary
            </p>
            <SummaryRow label="Total Value" value={`৳ ${fmt(totalValue)}`} />
            <SummaryRow label="VAT Amount" value={`৳ ${fmt(vatAmount)}`} />
            <SummaryRow label="VDS Rate" value={`${vdsRate}%`} />
            <SLDivider />
            {/* Featured VDS amount */}
            <div style={{ background: D.grad, borderRadius: 12, padding: '1rem 1.25rem', marginTop: 12 }}>
              <p style={{ fontFamily: D.manrope, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', marginBottom: 6 }}>
                VDS Amount
              </p>
              <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.04em', lineHeight: 1, color: '#fff' }}>
                ৳ {fmt(vdsAmount)}
              </p>
            </div>

            {/* Notes */}
            <div style={{ marginTop: 16 }}>
              <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 6 }}>
                Notes (optional)
              </p>
              <Input.TextArea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Internal notes..."
              />
            </div>
          </SLCard>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <GradBtn icon="verified" loading={loading} onClick={handleSubmit}>
            Create Certificate
          </GradBtn>
          <TonalBtn onClick={() => navigate('/vds/certificates')}>Cancel</TonalBtn>
        </div>
      </div>
    </div>
  );
}
