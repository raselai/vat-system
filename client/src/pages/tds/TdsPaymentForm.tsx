import { useState, useEffect } from 'react';
import { message, DatePicker, Input, InputNumber, Table, Checkbox } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { listDeductions, createTdsPayment } from '../../services/tds';
import { TdsDeduction } from '../../types';
import { D, PageHeader, BackBtn, GradBtn, TonalBtn, SLCard, TableWrap, SummaryRow, SLDivider } from '../../styles/design';

function fmt(v: number) {
  return v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function TdsPaymentForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [deductions, setDeductions] = useState<TdsDeduction[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [challanNo, setChallanNo] = useState('');
  const [paymentDate, setPaymentDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [bankName, setBankName] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [accountCode, setAccountCode] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    listDeductions({ status: 'finalized' })
      .then(r => setDeductions(r.deductions))
      .catch(() => {});
  }, []);

  const toggleDeduction = (id: string, checked: boolean) => {
    const next = checked ? [...selectedIds, id] : selectedIds.filter(x => x !== id);
    setSelectedIds(next);
    const sum = deductions
      .filter(d => next.includes(d.id))
      .reduce((acc, d) => acc + d.tdsAmount, 0);
    setTotalAmount(Math.round(sum * 100) / 100);
  };

  const deductionColumns = [
    {
      title: '', key: 'select', width: 44,
      render: (_: unknown, r: TdsDeduction) => (
        <Checkbox
          checked={selectedIds.includes(r.id)}
          onChange={e => toggleDeduction(r.id, e.target.checked)}
        />
      ),
    },
    {
      title: 'Deduction No', key: 'deductionNo',
      render: (_: unknown, r: TdsDeduction) => (
        <span style={{ fontFamily: D.manrope, fontWeight: 700, color: D.primary, fontSize: 13 }}>{r.deductionNo}</span>
      ),
    },
    {
      title: 'Section', key: 'section',
      render: (_: unknown, r: TdsDeduction) => (
        <span style={{ fontFamily: D.manrope, fontWeight: 600, fontSize: 12 }}>{r.sectionCode}</span>
      ),
    },
    {
      title: 'Deductee', key: 'deductee',
      render: (_: unknown, r: TdsDeduction) => (
        <div>
          <p style={{ fontFamily: D.manrope, fontWeight: 600, margin: 0, fontSize: 13 }}>{r.deducteeName}</p>
          <p style={{ fontFamily: D.inter, fontSize: 11, color: D.onSurfaceVar, margin: 0 }}>TIN: {r.deducteeTin}</p>
        </div>
      ),
    },
    {
      title: 'TDS Amount', key: 'tdsAmount', align: 'right' as const,
      render: (_: unknown, r: TdsDeduction) => (
        <span style={{ fontFamily: D.manrope, fontWeight: 700, color: D.onSurface }}>৳ {fmt(r.tdsAmount)}</span>
      ),
    },
    {
      title: 'Tax Month', key: 'taxMonth',
      render: (_: unknown, r: TdsDeduction) => (
        <span style={{ color: D.onSurfaceVar, fontSize: 13 }}>{r.taxMonth}</span>
      ),
    },
  ];

  const handleSubmit = async () => {
    if (!challanNo.trim()) return message.error('Challan number is required');
    if (!bankName.trim()) return message.error('Bank name is required');
    if (totalAmount <= 0) return message.error('Total amount must be greater than 0');
    setLoading(true);
    try {
      await createTdsPayment({
        challanNo: challanNo.trim(),
        paymentDate,
        bankName: bankName.trim(),
        bankBranch: bankBranch.trim() || undefined,
        accountCode: accountCode.trim() || undefined,
        totalAmount,
        notes: notes.trim() || undefined,
        deductionIds: selectedIds.length > 0 ? selectedIds : undefined,
      });
      message.success('TDS payment created');
      navigate('/tds/payments');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to create TDS payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: D.inter, color: D.onSurface, maxWidth: 960, margin: '0 auto' }}>
      <BackBtn onClick={() => navigate('/tds/payments')} label="TDS Payments" />
      <div style={{ marginTop: 16, marginBottom: 24 }}>
        <PageHeader
          eyebrow="Income Tax"
          title="New TDS Payment"
          sub="Record a treasury challan payment and link finalized deductions"
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Payment details */}
        <SLCard style={{ padding: '1.5rem' }}>
          <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 16 }}>
            Payment Details
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 6 }}>Treasury Challan No *</p>
              <Input value={challanNo} onChange={e => setChallanNo(e.target.value)} placeholder="e.g. TC-2026-001" />
            </div>
            <div>
              <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 6 }}>Payment Date *</p>
              <DatePicker
                value={dayjs(paymentDate)}
                onChange={d => setPaymentDate(d?.format('YYYY-MM-DD') || '')}
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 6 }}>Bank Name *</p>
              <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. Sonali Bank" />
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

        {/* Deductions table */}
        <SLCard style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: D.onSurfaceVar, margin: 0 }}>
              Link Finalized Deductions
            </p>
            {selectedIds.length > 0 && (
              <span style={{ fontFamily: D.manrope, fontSize: 12, fontWeight: 700, color: D.tertiary }}>
                {selectedIds.length} selected
              </span>
            )}
          </div>
          {deductions.length === 0 ? (
            <p style={{ color: D.onSurfaceVar, fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
              No finalized deductions available. Finalize deductions first before creating a payment.
            </p>
          ) : (
            <TableWrap>
              <Table
                columns={deductionColumns}
                dataSource={deductions}
                rowKey="id"
                pagination={false}
                scroll={{ x: 700 }}
                size="small"
              />
            </TableWrap>
          )}
        </SLCard>

        {/* Summary + notes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <SLCard style={{ padding: '1.5rem' }}>
            <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 16 }}>
              Amount Summary
            </p>
            <SummaryRow label="Linked Deductions" value={selectedIds.length} />
            <SLDivider />
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
              placeholder="Optional notes about this payment..."
            />
          </SLCard>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <GradBtn icon="account_balance" loading={loading} onClick={handleSubmit}>
            Create Payment
          </GradBtn>
          <TonalBtn onClick={() => navigate('/tds/payments')}>Cancel</TonalBtn>
        </div>
      </div>
    </div>
  );
}
