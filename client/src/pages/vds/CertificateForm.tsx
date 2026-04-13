import { useState, useEffect } from 'react';
import { Button, Card, Typography, message, Select, DatePicker, Input, InputNumber, Space, Divider } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../services/api';
import { createCertificate } from '../../services/vds';
import { Invoice } from '../../types';

const { Title, Text } = Typography;

export default function CertificateForm() {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [role, setRole] = useState<'deductor' | 'deductee'>('deductor');
  const [certificateDate, setCertificateDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [invoiceId, setInvoiceId] = useState<string | undefined>();
  const [counterpartyName, setCounterpartyName] = useState('');
  const [counterpartyBin, setCounterpartyBin] = useState('');
  const [counterpartyAddress, setCounterpartyAddress] = useState('');
  const [totalValue, setTotalValue] = useState(0);
  const [vatAmount, setVatAmount] = useState(0);
  const [vdsRate, setVdsRate] = useState(0);
  const [vdsAmount, setVdsAmount] = useState(0);
  const [notes, setNotes] = useState('');
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
      if (inv.vatTotal > 0) {
        setVdsRate(Math.round((inv.vdsAmount / inv.vatTotal) * 10000) / 100);
      }
      setCertificateDate(dayjs(inv.challanDate).format('YYYY-MM-DD'));
    }
  };

  const handleVdsRateChange = (rate: number) => {
    setVdsRate(rate);
    setVdsAmount(Math.round(vatAmount * rate) / 100);
  };

  const handleSubmit = async () => {
    if (!counterpartyName || !counterpartyBin) {
      message.error('Counterparty name and BIN are required');
      return;
    }
    if (!/^\d{13}$/.test(counterpartyBin)) {
      message.error('BIN must be 13 digits');
      return;
    }

    setLoading(true);
    try {
      await createCertificate({
        certificateDate,
        role,
        invoiceId,
        counterpartyName,
        counterpartyBin,
        counterpartyAddress: counterpartyAddress || undefined,
        totalValue,
        vatAmount,
        vdsRate,
        vdsAmount,
        notes: notes || undefined,
      });
      message.success('VDS Certificate created');
      navigate('/vds/certificates');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to create certificate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={4}>New VDS Certificate (Musak 6.6)</Title>

      <Card title="Certificate Details" style={{ marginBottom: 16 }}>
        <Space size="large" wrap>
          <div>
            <Text strong>Role: </Text>
            <Select value={role} onChange={setRole} style={{ width: 160 }}
              options={[{ value: 'deductor', label: 'Deductor (Buyer)' }, { value: 'deductee', label: 'Deductee (Seller)' }]} />
          </div>
          <div>
            <Text strong>Date: </Text>
            <DatePicker value={dayjs(certificateDate)} onChange={(d) => setCertificateDate(d?.format('YYYY-MM-DD') || '')} />
          </div>
          <div>
            <Text strong>Link Invoice: </Text>
            <Select value={invoiceId} onChange={handleInvoiceSelect} allowClear style={{ width: 280 }}
              placeholder="Auto-fill from invoice" showSearch optionFilterProp="label"
              options={invoices.map(i => ({ value: i.id, label: `${i.challanNo} — ${i.customer?.name || 'No customer'} (${i.grandTotal.toLocaleString('en-IN')})` }))} />
          </div>
        </Space>
      </Card>

      <Card title="Counterparty Information" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Text strong>Name: </Text>
              <Input value={counterpartyName} onChange={e => setCounterpartyName(e.target.value)} placeholder="Counterparty name" />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Text strong>BIN (13 digits): </Text>
              <Input value={counterpartyBin} onChange={e => setCounterpartyBin(e.target.value)} placeholder="0000000000000" maxLength={13} />
            </div>
          </div>
          <div>
            <Text strong>Address: </Text>
            <Input value={counterpartyAddress} onChange={e => setCounterpartyAddress(e.target.value)} placeholder="Address (optional)" />
          </div>
        </Space>
      </Card>

      <Card title="Deduction Details" style={{ marginBottom: 16 }}>
        <Space size="large" wrap>
          <div>
            <Text strong>Total Value (incl. VAT): </Text>
            <InputNumber value={totalValue} min={0} onChange={v => setTotalValue(v || 0)} style={{ width: 160 }}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </div>
          <div>
            <Text strong>VAT Amount: </Text>
            <InputNumber value={vatAmount} min={0} onChange={v => { setVatAmount(v || 0); setVdsAmount(Math.round((v || 0) * vdsRate) / 100); }} style={{ width: 160 }}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </div>
          <div>
            <Text strong>VDS Rate (%): </Text>
            <InputNumber value={vdsRate} min={0} max={100} onChange={v => handleVdsRateChange(v || 0)} style={{ width: 100 }} />
          </div>
          <div>
            <Text strong>VDS Amount: </Text>
            <InputNumber value={vdsAmount} min={0} onChange={v => setVdsAmount(v || 0)} style={{ width: 160 }}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </div>
        </Space>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Text strong>Notes: </Text>
        <Input.TextArea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Optional notes" />
      </Card>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <div style={{ minWidth: 300 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Total Value:</span><span>{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>VAT Amount:</span><span>{vatAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>VDS Rate:</span><span>{vdsRate}%</span></div>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}><span>VDS Amount:</span><span>{vdsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
          </div>
        </div>
        <Divider />
        <Space>
          <Button type="primary" size="large" loading={loading} onClick={handleSubmit}>
            Create Certificate
          </Button>
          <Button size="large" onClick={() => navigate('/vds/certificates')}>Cancel</Button>
        </Space>
      </Card>
    </div>
  );
}
