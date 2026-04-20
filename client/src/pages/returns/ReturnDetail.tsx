import { useEffect, useState } from 'react';
import { Form, InputNumber, Input, message, Popconfirm, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { VatReturn, VatReturnStatus } from '../../types';
import {
  getReturn, updateReturn, reviewReturn, submitReturn,
  lockReturn, downloadReturnPdf, downloadNbrFilingGuide,
} from '../../services/return';
import { D, Icon, GradBtn, TonalBtn, BackBtn, SLCard, SummaryRow, StatusChip } from '../../styles/design';

const { TextArea } = Input;

const STATUS_NEXT: Record<VatReturnStatus, { action: 'review' | 'submit' | 'lock'; label: string; confirm: string } | null> = {
  draft:     { action: 'review', label: 'Mark Reviewed', confirm: 'Mark this return as reviewed?' },
  reviewed:  { action: 'submit', label: 'Submit Return',  confirm: 'Submit this return to NBR? This step is hard to reverse.' },
  submitted: { action: 'lock',   label: 'Lock Return',    confirm: 'Lock this return? It will become immutable.' },
  locked:    null,
};

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

export default function ReturnDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ret, setRet] = useState<VatReturn | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [form] = Form.useForm();

  // Live net payable
  const outputVat  = ret?.outputVat  ?? 0;
  const sdPayable  = ret?.sdPayable  ?? 0;
  const inputVat   = ret?.inputVat   ?? 0;
  const vdsCredit  = ret?.vdsCredit  ?? 0;
  const [liveCarry, setLiveCarry] = useState(0);
  const [liveInc,   setLiveInc]   = useState(0);
  const [liveDec,   setLiveDec]   = useState(0);
  const liveNet = +(outputVat + sdPayable - inputVat - vdsCredit - liveCarry + liveInc - liveDec).toFixed(2);

  const fetchReturn = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getReturn(id);
      setRet(data);
      form.setFieldsValue({
        carryForward: data.carryForward,
        increasingAdjustment: data.increasingAdjustment,
        decreasingAdjustment: data.decreasingAdjustment,
        notes: data.notes,
      });
      setLiveCarry(data.carryForward);
      setLiveInc(data.increasingAdjustment);
      setLiveDec(data.decreasingAdjustment);
    } catch { message.error('Failed to load return'); }
    finally   { setLoading(false); }
  };

  useEffect(() => { fetchReturn(); }, [id]);

  const handleSave = async (values: any) => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await updateReturn(id, values);
      setRet(updated);
      message.success('Adjustments saved');
    } catch (err: any) { message.error(err.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleAction = async (action: 'review' | 'submit' | 'lock') => {
    if (!id) return;
    try {
      const fns = { review: reviewReturn, submit: submitReturn, lock: lockReturn };
      const updated = await fns[action](id);
      setRet(updated);
      message.success(`Return ${action}ed`);
    } catch (err: any) { message.error(err.response?.data?.error || `Failed to ${action}`); }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!ret) return null;

  const isDraft = ret.status === 'draft';
  const netDisplay = isDraft ? liveNet : ret.netPayable;
  const nextAction = STATUS_NEXT[ret.status];

  return (
    <div style={{ fontFamily: D.inter, color: D.onSurface, maxWidth: 1100, margin: '0 auto' }}>
      <BackBtn onClick={() => navigate('/returns')} label="All Returns" />

      <div style={{ marginTop: 16, marginBottom: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 4 }}>
            মূসক-৯.১ / Musak 9.1
          </p>
          <h1 style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 'clamp(1.5rem,3vw,2.25rem)', letterSpacing: '-0.04em', color: D.onSurface, lineHeight: 1.1, marginBottom: 8 }}>
            Monthly Return — {ret.taxMonth}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StatusChip status={ret.status} />
            <span style={{ fontSize: 13, color: D.onSurfaceVar }}>Fiscal Year {ret.fiscalYear}</span>
          </div>
        </div>

        {/* Action bar */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <TonalBtn icon="picture_as_pdf" onClick={async () => { try { await downloadReturnPdf(ret.id, ret.taxMonth); } catch { message.error('Failed'); } }}>
            PDF
          </TonalBtn>
          <TonalBtn icon="assignment" onClick={async () => { try { await downloadNbrFilingGuide(ret.id, ret.taxMonth); } catch { message.error('Failed'); } }}>
            NBR Guide
          </TonalBtn>
          {nextAction && (
            <Popconfirm title={nextAction.confirm} onConfirm={() => handleAction(nextAction.action)}>
              <GradBtn icon={nextAction.action === 'lock' ? 'lock' : 'check_circle'} danger={nextAction.action === 'lock'}>
                {nextAction.label}
              </GradBtn>
            </Popconfirm>
          )}
        </div>
      </div>

      {/* Net Payable hero */}
      <div style={{
        background: netDisplay > 0 ? D.grad : 'linear-gradient(135deg, #003e28, #006a4e)',
        borderRadius: 20, padding: '1.5rem 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, boxShadow: '0 24px 60px rgba(0,29,82,0.18)',
      }}>
        <div>
          <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', marginBottom: 8 }}>
            প্রদেয় কর (নিট) · Net VAT Payable
          </p>
          <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 'clamp(2rem,4vw,3rem)', letterSpacing: '-0.04em', lineHeight: 1, color: '#fff' }}>
            ৳ {fmt(netDisplay)}
          </p>
          {isDraft && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 8 }}>
              Live calculation — save adjustments to confirm
            </p>
          )}
        </div>
        <Icon name="account_balance" size={56} style={{ color: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Auto-calculated figures */}
        <SLCard style={{ padding: '1.5rem' }}>
          <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 16 }}>
            Auto-Calculated Figures
          </p>

          {/* Featured gradient: Output VAT */}
          <div style={{ background: D.grad, borderRadius: 14, padding: '1rem 1.25rem', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontFamily: D.manrope, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Output VAT</p>
            <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 18, color: '#fff' }}>৳ {fmt(outputVat)}</p>
          </div>
          <div style={{ background: D.surfaceLow, borderRadius: 14, padding: '1rem 1.25rem', marginBottom: 12 }}>
            {([
              ['Total Sales Value',     `৳ ${fmt(ret.totalSalesValue)}`],
              ['SD Payable',            `৳ ${fmt(sdPayable)}`],
            ]).map(([label, value]) => (
              <SummaryRow key={label} label={label} value={value} />
            ))}
          </div>

          {/* Green: Input */}
          <div style={{ background: 'linear-gradient(135deg, #003e28, #006a4e)', borderRadius: 14, padding: '1rem 1.25rem', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontFamily: D.manrope, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Input VAT Credit</p>
            <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 18, color: '#fff' }}>৳ {fmt(inputVat)}</p>
          </div>
          <div style={{ background: D.surfaceLow, borderRadius: 14, padding: '1rem 1.25rem' }}>
            {([
              ['Total Purchase Value',  `৳ ${fmt(ret.totalPurchaseValue)}`],
              ['VDS Credit',            `৳ ${fmt(vdsCredit)}`],
            ]).map(([label, value]) => (
              <SummaryRow key={label} label={label} value={value} />
            ))}
          </div>
        </SLCard>

        {/* Manual adjustments */}
        <SLCard style={{ padding: '1.5rem' }}>
          <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 16 }}>
            Manual Adjustments
          </p>
          <Form form={form} layout="vertical" onFinish={handleSave}>
            <Form.Item label="Carry Forward (from previous month)" name="carryForward">
              <InputNumber
                min={0} precision={2} style={{ width: '100%' }}
                disabled={!isDraft}
                onChange={(v) => setLiveCarry(v ?? 0)}
              />
            </Form.Item>
            <Form.Item label="Increasing Adjustment" name="increasingAdjustment">
              <InputNumber
                min={0} precision={2} style={{ width: '100%' }}
                disabled={!isDraft}
                onChange={(v) => setLiveInc(v ?? 0)}
              />
            </Form.Item>
            <Form.Item label="Decreasing Adjustment" name="decreasingAdjustment">
              <InputNumber
                min={0} precision={2} style={{ width: '100%' }}
                disabled={!isDraft}
                onChange={(v) => setLiveDec(v ?? 0)}
              />
            </Form.Item>
            <Form.Item label="Notes" name="notes">
              <TextArea rows={3} disabled={!isDraft} maxLength={2000} placeholder="Internal notes about this return..." />
            </Form.Item>
            {isDraft && (
              <Form.Item style={{ marginBottom: 0 }}>
                <GradBtn type="submit" icon="save" loading={saving}>
                  Save Adjustments
                </GradBtn>
              </Form.Item>
            )}
          </Form>

          {!isDraft && (
            <div style={{ marginTop: 16, padding: '10px 14px', background: D.surfaceLow, borderRadius: 10 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Icon name="lock" size={14} style={{ color: D.onSurfaceVar }} />
                <p style={{ fontSize: 12, color: D.onSurfaceVar }}>
                  Adjustments are locked once a return is reviewed.
                </p>
              </div>
            </div>
          )}
        </SLCard>
      </div>
    </div>
  );
}
