import { useState, useEffect } from 'react';
import { message, DatePicker, Input, InputNumber, Table, Checkbox } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../services/api';
import { createDeposit } from '../../services/vds';
import { VdsCertificate } from '../../types';
import { D, PageHeader, GradBtn, TonalBtn, SLCard, TableWrap, SummaryRow, SLDivider } from '../../styles/design';

export default function DepositForm() {
  const [loading, setLoading]         = useState(false);
  const [certificates, setCertificates] = useState<VdsCertificate[]>([]);
  const [selectedCertIds, setSelectedCertIds] = useState<string[]>([]);
  const [challanNo, setChallanNo]     = useState('');
  const [depositDate, setDepositDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [bankName, setBankName]       = useState('');
  const [bankBranch, setBankBranch]   = useState('');
  const [accountCode, setAccountCode] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [notes, setNotes]             = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/vds/certificates?role=deductor&status=finalized').then(res => {
      setCertificates(res.data.data.certificates);
    }).catch(() => {});
  }, []);

  const toggleCertificate = (id: string, checked: boolean) => {
    const next = checked ? [...selectedCertIds, id] : selectedCertIds.filter(c => c !== id);
    setSelectedCertIds(next);
    const total = certificates
      .filter(c => next.includes(c.id))
      .reduce((sum, c) => sum + c.vdsAmount, 0);
    setTotalAmount(Math.round(total * 100) / 100);
  };

  const fmt = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const certColumns = [
    {
      title: '', key: 'select', width: 44,
      render: (_: unknown, r: VdsCertificate) => (
        <Checkbox
          checked={selectedCertIds.includes(r.id)}
          onChange={e => toggleCertificate(r.id, e.target.checked)}
        />
      ),
    },
    { title: 'Certificate No', dataIndex: 'certificateNo', key: 'certificateNo',
      render: (v: string) => <span style={{ fontFamily: D.manrope, fontWeight: 700, color: D.primary, fontSize: 13 }}>{v}</span> },
    { title: 'Counterparty', dataIndex: 'counterpartyName', key: 'counterpartyName',
      render: (v: string) => <span style={{ fontFamily: D.manrope, fontWeight: 600, color: D.onSurface }}>{v}</span> },
    { title: 'VDS Amount', dataIndex: 'vdsAmount', key: 'vdsAmount', align: 'right' as const,
      render: (v: number) => <span style={{ fontFamily: D.manrope, fontWeight: 700, color: D.onSurface }}>৳ {fmt(v)}</span> },
    { title: 'Tax Month', dataIndex: 'taxMonth', key: 'taxMonth',
      render: (v: string) => <span style={{ color: D.onSurfaceVar, fontSize: 13 }}>{v}</span> },
  ];

  const handleSubmit = async () => {
    if (!challanNo || !bankName) return message.error('Challan number and bank name are required');
    if (totalAmount <= 0) return message.error('Total amount must be greater than 0');
    setLoading(true);
    try {
      await createDeposit({
        challanNo, depositDate, bankName,
        bankBranch: bankBranch || undefined,
        accountCode: accountCode || undefined,
        totalAmount,
        notes: notes || undefined,
        certificateIds: selectedCertIds.length > 0 ? selectedCertIds : undefined,
      });
      message.success('Treasury deposit created');
      navigate('/vds/deposits');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to create deposit');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ fontFamily: D.inter, color: D.onSurface, maxWidth: 920, margin: '0 auto' }}>
      <PageHeader
        eyebrow="VDS Workflow"
        title="New Treasury Deposit"
        sub="Link finalized VDS certificates to a bank challan"
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Deposit details */}
        <SLCard style={{ padding: '1.5rem' }}>
          <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 16 }}>
            Deposit Details
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 6 }}>Treasury Challan No</p>
              <Input value={challanNo} onChange={e => setChallanNo(e.target.value)} placeholder="e.g. TC-2026-001" />
            </div>
            <div>
              <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 6 }}>Deposit Date</p>
              <DatePicker
                value={dayjs(depositDate)}
                onChange={(d) => setDepositDate(d?.format('YYYY-MM-DD') || '')}
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 6 }}>Bank Name</p>
              <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Bank name" />
            </div>
            <div>
              <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 6 }}>Branch (optional)</p>
              <Input value={bankBranch} onChange={e => setBankBranch(e.target.value)} placeholder="Branch name" />
            </div>
            <div>
              <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 6 }}>Govt Account Code</p>
              <Input value={accountCode} onChange={e => setAccountCode(e.target.value)} placeholder="Account code" />
            </div>
          </div>
        </SLCard>

        {/* Certificates table */}
        <SLCard style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: D.onSurfaceVar }}>
              Link VDS Certificates (Deductor)
            </p>
            {selectedCertIds.length > 0 && (
              <span style={{ fontFamily: D.manrope, fontSize: 12, fontWeight: 700, color: D.tertiary }}>
                {selectedCertIds.length} selected
              </span>
            )}
          </div>
          <TableWrap>
            <Table columns={certColumns} dataSource={certificates} rowKey="id" pagination={false} scroll={{ x: 600 }} size="small" />
          </TableWrap>
        </SLCard>

        {/* Summary + override + notes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <SLCard style={{ padding: '1.5rem' }}>
            <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 16 }}>
              Amount Summary
            </p>
            <SummaryRow label="Linked Certificates" value={selectedCertIds.length} />
            <SLDivider />
            {/* Gradient total */}
            <div style={{ background: D.grad, borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 16 }}>
              <p style={{ fontFamily: D.manrope, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', marginBottom: 6 }}>
                Total Amount
              </p>
              <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.04em', lineHeight: 1, color: '#fff' }}>
                ৳ {fmt(totalAmount)}
              </p>
            </div>
            <div>
              <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 6 }}>
                Override Amount
              </p>
              <InputNumber
                value={totalAmount}
                min={0}
                onChange={v => setTotalAmount(v || 0)}
                style={{ width: '100%' }}
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </div>
          </SLCard>

          <SLCard style={{ padding: '1.5rem' }}>
            <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 16 }}>
              Notes
            </p>
            <Input.TextArea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={5}
              placeholder="Optional notes about this deposit..."
            />
          </SLCard>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <GradBtn icon="account_balance" loading={loading} onClick={handleSubmit}>
            Create Deposit
          </GradBtn>
          <TonalBtn onClick={() => navigate('/vds/deposits')}>Cancel</TonalBtn>
        </div>
      </div>
    </div>
  );
}
