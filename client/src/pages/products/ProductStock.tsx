import { useEffect, useMemo, useState } from 'react';
import { Table, message, Modal, Form, InputNumber, Input, DatePicker, Tag } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { StockRegister, StockMovement } from '../../types';
import { getStockRegister, createAdjustment, downloadStockRegisterPdf } from '../../services/stock';
import { D, Icon, PageHeader, BackBtn, GradBtn, TonalBtn, TableWrap } from '../../styles/design';
import { useCompany } from '../../contexts/CompanyContext';
import HelpHint from '../../components/HelpHint';
import { useLang } from '../../contexts/LanguageContext';

const fmtQty = (v: number) => v.toLocaleString('en-IN', { maximumFractionDigits: 3 });

export default function ProductStock() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useCompany();
  const { lang } = useLang();
  const [data, setData] = useState<StockRegister | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetchRegister = async () => {
    if (!id) return;
    setLoading(true);
    try {
      setData(await getStockRegister(id));
    } catch {
      message.error('Failed to load stock register');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRegister(); }, [id]);

  // Derive the KPI figures from the movement ledger — no extra request needed.
  const kpis = useMemo(() => {
    const opening = data?.product.openingStock ?? 0;
    let purchased = 0, sold = 0, adjustments = 0;
    for (const e of data?.entries ?? []) {
      if (e.source === 'invoice') {
        if (e.invoiceType === 'purchase') purchased += e.qtyIn;
        else sold += e.qtyOut;
      } else if (e.source === 'adjustment') {
        adjustments += e.qtyIn - e.qtyOut;
      }
    }
    return { opening, purchased, sold, adjustments, current: data?.currentStock ?? 0 };
  }, [data]);

  const handlePdf = async () => {
    if (!id) return;
    setPdfLoading(true);
    try {
      await downloadStockRegisterPdf(id);
    } catch {
      message.error('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleAdjust = async () => {
    if (!id) return;
    try {
      const values = await form.validateFields();
      setSaving(true);
      await createAdjustment(id, {
        qty: values.qty,
        reason: values.reason,
        adjustedAt: (values.adjustedAt as dayjs.Dayjs).format('YYYY-MM-DD'),
      });
      message.success('Stock adjustment recorded');
      setModalOpen(false);
      form.resetFields();
      fetchRegister();
    } catch (err: any) {
      if (err?.errorFields) return; // validation error — keep modal open
      message.error(err.response?.data?.error || 'Failed to record adjustment');
    } finally {
      setSaving(false);
    }
  };

  const unit = data?.product.unit ?? '';

  const typeTag = (e: StockMovement) => {
    if (e.source === 'opening') return <Tag color="default">Opening</Tag>;
    if (e.source === 'adjustment') return <Tag color="purple">Adjustment</Tag>;
    return e.invoiceType === 'purchase'
      ? <Tag color="green">Purchase</Tag>
      : <Tag color="blue">Sale</Tag>;
  };

  const columns = [
    { title: 'Date', dataIndex: 'date', key: 'date', width: 110,
      render: (d: string, r: StockMovement) => r.source === 'opening'
        ? <span style={{ color: D.onSurfaceVar, fontStyle: 'italic' }}>—</span>
        : <span style={{ color: D.onSurfaceVar, fontSize: 13 }}>{new Date(d).toLocaleDateString('en-GB')}</span> },
    { title: 'Type', key: 'type', width: 120, render: (_: unknown, r: StockMovement) => typeTag(r) },
    { title: 'Reference', dataIndex: 'reference', key: 'reference',
      render: (v: string, r: StockMovement) => (
        <span style={{ fontFamily: r.source === 'invoice' ? D.manrope : D.inter, fontWeight: r.source === 'invoice' ? 700 : 500, color: r.source === 'invoice' ? D.primary : D.onSurface }}>{v}</span>
      ) },
    { title: 'In', dataIndex: 'qtyIn', key: 'qtyIn', width: 100, align: 'right' as const,
      render: (v: number) => v ? <span style={{ fontFamily: D.manrope, fontWeight: 700, color: D.tertiary }}>+{fmtQty(v)}</span> : <span style={{ color: D.onSurfaceVar }}>—</span> },
    { title: 'Out', dataIndex: 'qtyOut', key: 'qtyOut', width: 100, align: 'right' as const,
      render: (v: number) => v ? <span style={{ fontFamily: D.manrope, fontWeight: 700, color: D.red }}>−{fmtQty(v)}</span> : <span style={{ color: D.onSurfaceVar }}>—</span> },
    { title: 'Balance', dataIndex: 'balance', key: 'balance', width: 120, align: 'right' as const,
      render: (v: number) => <span style={{ fontFamily: D.manrope, fontWeight: 800, color: v < 0 ? D.red : D.onSurface }}>{fmtQty(v)} <span style={{ fontWeight: 500, fontSize: 11, color: D.onSurfaceVar }}>{unit}</span></span> },
  ];

  return (
    <div style={{ fontFamily: D.inter, color: D.onSurface }}>
      <BackBtn onClick={() => navigate('/products')} label="Products" />
      <PageHeader
        eyebrow="মূসক-৬.১ / Musak 6.1"
        title={data ? `Stock — ${data.product.name}` : 'Stock Register'}
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isAdmin && <GradBtn icon="tune" onClick={() => setModalOpen(true)}>Adjust Stock</GradBtn>}
            <TonalBtn icon="picture_as_pdf" loading={pdfLoading} onClick={handlePdf}>PDF</TonalBtn>
          </div>
        }
      />

      <HelpHint id="stock-register">
        {lang === 'bn'
          ? 'মজুদ খতিয়ান (মূসক ৬.১) আপনার চালান থেকে নিজে নিজেই তৈরি হয় — ক্রয় মজুদ বাড়ায়, বিক্রয় কমায়। ১০টি কিনে ৭টি বিক্রি করলে এখানে ৩টি দেখাবে। ক্ষতি বা নষ্ট হলে "Adjust Stock" দিয়ে সমন্বয় করুন।'
          : 'The stock register (Musak 6.1) builds itself from your invoices — purchases add stock, sales subtract it. Buy 10 and sell 7 and it shows 3. Use "Adjust Stock" for damage, loss, or corrections.'}
      </HelpHint>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" style={{ marginBottom: 24 }}>
        {([
          { label: 'Opening',     value: kpis.opening,     icon: 'flag' },
          { label: 'Purchased',   value: kpis.purchased,   icon: 'add_shopping_cart' },
          { label: 'Sold',        value: kpis.sold,        icon: 'sell' },
          { label: 'Adjustments', value: kpis.adjustments, icon: 'tune' },
          { label: 'In Stock',    value: kpis.current,     icon: 'inventory_2', featured: true },
        ]).map(({ label, value, icon, featured }) => (
          <div key={label} style={{ borderRadius: 14, padding: '1rem', background: featured ? D.grad : D.surfaceBright, boxShadow: featured ? '0 12px 40px rgba(0,29,82,0.16)' : D.ambient }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Icon name={icon} size={14} style={{ color: featured ? 'rgba(255,255,255,0.7)' : D.onSurfaceVar }} />
              <p style={{ fontFamily: D.manrope, fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: featured ? 'rgba(255,255,255,0.65)' : D.onSurfaceVar }}>{label}</p>
            </div>
            <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 16, color: featured ? '#fff' : D.onSurface, lineHeight: 1 }}>
              {fmtQty(value)} <span style={{ fontSize: 11, fontWeight: 500, color: featured ? 'rgba(255,255,255,0.7)' : D.onSurfaceVar }}>{unit}</span>
            </p>
          </div>
        ))}
      </div>

      <TableWrap>
        <Table columns={columns} dataSource={data?.entries || []} rowKey={(_, i) => String(i)} loading={loading} pagination={false} size="small" scroll={{ x: 'max-content' }} />
      </TableWrap>

      <Modal
        title="Adjust Stock"
        open={modalOpen}
        onOk={handleAdjust}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        confirmLoading={saving}
        okText="Record Adjustment"
      >
        <p style={{ color: D.onSurfaceVar, fontSize: 13, marginBottom: 16 }}>
          Use a positive quantity to add stock, or a negative quantity for damage, loss, or wastage.
        </p>
        <Form form={form} layout="vertical" initialValues={{ adjustedAt: dayjs() }}>
          <Form.Item name="qty" label={`Quantity (${unit || 'units'})`} rules={[{ required: true, message: 'Quantity is required' }, { validator: (_, v) => v === 0 ? Promise.reject('Quantity cannot be zero') : Promise.resolve() }]}>
            <InputNumber step={1} style={{ width: '100%' }} placeholder="e.g. -1 for a damaged unit" />
          </Form.Item>
          <Form.Item name="reason" label="Reason" rules={[{ required: true, message: 'Reason is required' }]}>
            <Input placeholder="Damage / loss / wastage / opening correction" maxLength={255} />
          </Form.Item>
          <Form.Item name="adjustedAt" label="Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" allowClear={false} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
