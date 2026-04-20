import { useState, useEffect } from 'react';
import { message, Select, DatePicker, Switch, Table, InputNumber } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../services/api';
import { Product } from '../../types';
import { calculateLineItem, calculateTotals } from '../../utils/vatCalc';
import { D, Icon, PageHeader, GradBtn, TonalBtn, SLCard, TableWrap, SummaryRow, SLDivider } from '../../styles/design';

interface FormItem {
  key: string;
  productId: string;
  description: string;
  descriptionBn?: string;
  hsCode?: string;
  qty: number;
  unitPrice: number;
  vatRate: number;
  sdRate: number;
  specificDutyAmount: number;
  truncatedBasePct: number;
  vdsRate: number;
  taxableValue: number;
  sdAmount: number;
  vatAmount: number;
  specificDutyLine: number;
  lineTotal: number;
  grandTotal: number;
  vdsAmount: number;
}

const labelStyle = {
  fontFamily: D.manrope,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  color: D.onSurfaceVar,
  marginBottom: 6,
};

export default function InvoiceForm() {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<FormItem[]>([]);
  const [invoiceType, setInvoiceType] = useState<'sales' | 'purchase'>('sales');
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [challanDate, setChallanDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [vdsApplicable, setVdsApplicable] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/products'),
      api.get('/customers'),
    ]).then(([prodRes, custRes]) => {
      setProducts(prodRes.data.data);
      setCustomers(custRes.data.data);
    }).catch(() => message.error('Failed to load data'));
  }, []);

  const addItem = () => {
    setItems([...items, {
      key: Date.now().toString(),
      productId: '',
      description: '',
      qty: 1,
      unitPrice: 0,
      vatRate: 15,
      sdRate: 0,
      specificDutyAmount: 0,
      truncatedBasePct: 100,
      vdsRate: 0,
      taxableValue: 0,
      sdAmount: 0,
      vatAmount: 0,
      specificDutyLine: 0,
      lineTotal: 0,
      grandTotal: 0,
      vdsAmount: 0,
    }]);
  };

  const removeItem = (key: string) => {
    setItems(items.filter(i => i.key !== key));
  };

  const updateItem = (key: string, field: string, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.key !== key) return item;
      const updated = { ...item, [field]: value };

      if (field === 'productId') {
        const product = products.find(p => p.id === value);
        if (product) {
          updated.description = product.name;
          updated.descriptionBn = product.nameBn || undefined;
          updated.hsCode = product.hsCode || undefined;
          updated.unitPrice = product.unitPrice;
          updated.vatRate = product.vatRate;
          updated.sdRate = product.sdRate;
          updated.specificDutyAmount = product.specificDutyAmount;
          updated.truncatedBasePct = product.truncatedBasePct;
        }
      }

      const calc = calculateLineItem({
        qty: updated.qty,
        unitPrice: updated.unitPrice,
        vatRate: updated.vatRate,
        sdRate: updated.sdRate,
        specificDutyAmount: updated.specificDutyAmount,
        truncatedBasePct: updated.truncatedBasePct,
        vdsRate: vdsApplicable ? updated.vdsRate : 0,
      });

      return { ...updated, ...calc };
    }));
  };

  const totals = calculateTotals(items);
  const fmt = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const handleSubmit = async () => {
    if (items.length === 0) return message.error('Add at least one item');
    setLoading(true);
    try {
      await api.post('/invoices', {
        customerId,
        invoiceType,
        challanDate,
        vdsApplicable,
        items: items.map(i => ({
          productId: i.productId,
          description: i.description,
          descriptionBn: i.descriptionBn,
          hsCode: i.hsCode,
          qty: i.qty,
          unitPrice: i.unitPrice,
          vatRate: i.vatRate,
          sdRate: i.sdRate,
          specificDutyAmount: i.specificDutyAmount,
          truncatedBasePct: i.truncatedBasePct,
          vdsRate: i.vdsRate,
        })),
      });
      message.success('Invoice created');
      navigate('/invoices');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Product',
      key: 'productId',
      width: 200,
      render: (_: unknown, record: FormItem) => (
        <Select
          value={record.productId || undefined}
          onChange={(v) => updateItem(record.key, 'productId', v)}
          style={{ width: '100%' }}
          showSearch
          optionFilterProp="label"
          placeholder="Select product"
          options={products.map(p => ({ value: p.id, label: `${p.name} (${p.vatRate}%)` }))}
        />
      ),
    },
    {
      title: 'Qty', key: 'qty', width: 80,
      render: (_: unknown, r: FormItem) => (
        <InputNumber value={r.qty} min={0.001} onChange={v => updateItem(r.key, 'qty', v || 0)} style={{ width: '100%' }} />
      ),
    },
    {
      title: 'Unit Price', key: 'unitPrice', width: 110,
      render: (_: unknown, r: FormItem) => (
        <InputNumber value={r.unitPrice} min={0} onChange={v => updateItem(r.key, 'unitPrice', v || 0)} style={{ width: '100%' }} />
      ),
    },
    {
      title: 'Taxable', key: 'taxableValue', width: 100, align: 'right' as const,
      render: (_: unknown, r: FormItem) => (
        <span style={{ fontFamily: D.manrope, fontWeight: 600, color: D.onSurface, fontSize: 13 }}>
          {fmt(r.taxableValue)}
        </span>
      ),
    },
    {
      title: 'SD', key: 'sdAmount', width: 80, align: 'right' as const,
      render: (_: unknown, r: FormItem) => (
        <span style={{ fontFamily: D.manrope, color: D.onSurfaceVar, fontSize: 13 }}>
          {fmt(r.sdAmount)}
        </span>
      ),
    },
    {
      title: 'VAT', key: 'vatAmount', width: 100, align: 'right' as const,
      render: (_: unknown, r: FormItem) => (
        <span style={{ fontFamily: D.manrope, fontWeight: 600, color: D.tertiary, fontSize: 13 }}>
          {fmt(r.vatAmount)}
        </span>
      ),
    },
    {
      title: 'Total', key: 'grandTotal', width: 110, align: 'right' as const,
      render: (_: unknown, r: FormItem) => (
        <span style={{ fontFamily: D.manrope, fontWeight: 800, color: D.primary, fontSize: 14 }}>
          ৳ {fmt(r.grandTotal)}
        </span>
      ),
    },
    {
      title: '', key: 'action', width: 44,
      render: (_: unknown, r: FormItem) => (
        <button
          onClick={() => removeItem(r.key)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#b91c1c', padding: '4px 6px', borderRadius: 6,
            display: 'flex', alignItems: 'center',
          }}
        >
          <Icon name="delete" size={18} />
        </button>
      ),
    },
  ];

  return (
    <div style={{ fontFamily: D.inter, color: D.onSurface, maxWidth: 1100, margin: '0 auto' }}>
      <PageHeader
        eyebrow="মূসক-৬.৩ / Musak 6.3"
        title="New Invoice"
        sub="Create a tax challan for sales or purchase"
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Invoice meta */}
        <SLCard style={{ padding: '1.5rem' }}>
          <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 16 }}>
            Invoice Details
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: 16, alignItems: 'end' }}>
            <div>
              <p style={labelStyle}>Invoice Type</p>
              <Select
                value={invoiceType}
                onChange={setInvoiceType}
                style={{ width: '100%' }}
                options={[
                  { value: 'sales', label: 'Sales' },
                  { value: 'purchase', label: 'Purchase' },
                ]}
              />
            </div>
            <div>
              <p style={labelStyle}>Challan Date</p>
              <DatePicker
                value={dayjs(challanDate)}
                onChange={(d) => setChallanDate(d?.format('YYYY-MM-DD') || '')}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <p style={labelStyle}>Customer / Supplier</p>
              <Select
                value={customerId}
                onChange={setCustomerId}
                allowClear
                style={{ width: '100%' }}
                placeholder="Select customer or supplier"
                showSearch
                optionFilterProp="label"
                options={customers.map((c: any) => ({
                  value: c.id,
                  label: `${c.name} (${c.binNid || 'No BIN'})`,
                }))}
              />
            </div>
            <div>
              <p style={labelStyle}>VDS Applicable</p>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: vdsApplicable ? 'rgba(0,106,78,0.08)' : D.surfaceLow,
                border: `1.5px solid ${vdsApplicable ? D.tertiary : D.outline}`,
                borderRadius: 8, padding: '6px 12px', height: 32,
              }}>
                <Switch checked={vdsApplicable} onChange={setVdsApplicable} size="small" />
                <span style={{ fontFamily: D.manrope, fontSize: 12, fontWeight: 700, color: vdsApplicable ? D.tertiary : D.onSurfaceVar }}>
                  {vdsApplicable ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </SLCard>

        {/* Line items */}
        <SLCard style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: D.onSurfaceVar }}>
              Line Items
            </p>
            <button
              onClick={addItem}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: D.surfaceLow,
                border: `1.5px solid ${D.outline}`,
                borderRadius: 8, padding: '6px 14px',
                fontFamily: D.manrope, fontSize: 12, fontWeight: 700,
                color: D.primary, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <Icon name="add" size={16} />
              Add Item
            </button>
          </div>

          {items.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '2.5rem 1rem',
              background: D.surfaceLow, borderRadius: 10,
              color: D.onSurfaceVar, fontFamily: D.inter, fontSize: 14,
            }}>
              <Icon name="receipt_long" size={32} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.4 }} />
              No items yet — click <strong>Add Item</strong> to get started
            </div>
          ) : (
            <TableWrap>
              <Table
                columns={columns}
                dataSource={items}
                rowKey="key"
                pagination={false}
                scroll={{ x: 900 }}
                size="small"
              />
            </TableWrap>
          )}
        </SLCard>

        {/* Summary + actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>

          {/* Actions card */}
          <SLCard style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 12 }}>
              Submit Invoice
            </p>
            <p style={{ fontFamily: D.inter, fontSize: 13, color: D.onSurfaceVar, marginBottom: 20, lineHeight: 1.6 }}>
              Once submitted, the invoice will be saved as <strong>Draft</strong>. An admin can then approve and lock it.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <GradBtn icon="receipt_long" loading={loading} onClick={handleSubmit}>
                Create Invoice
              </GradBtn>
              <TonalBtn onClick={() => navigate('/invoices')}>Cancel</TonalBtn>
            </div>
          </SLCard>

          {/* Totals card */}
          <SLCard style={{ padding: '1.5rem' }}>
            <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 16 }}>
              Summary
            </p>
            <SummaryRow label="Subtotal" value={`৳ ${fmt(totals.subtotal)}`} />
            {totals.sdTotal > 0 && <SummaryRow label="SD Total" value={`৳ ${fmt(totals.sdTotal)}`} />}
            <SummaryRow label="VAT Total" value={`৳ ${fmt(totals.vatTotal)}`} />
            {totals.specificDutyTotal > 0 && <SummaryRow label="Specific Duty" value={`৳ ${fmt(totals.specificDutyTotal)}`} />}
            <SLDivider />
            {/* Grand total featured */}
            <div style={{ background: D.grad, borderRadius: 12, padding: '1rem 1.25rem', marginBottom: vdsApplicable ? 12 : 0 }}>
              <p style={{ fontFamily: D.manrope, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', marginBottom: 6 }}>
                Grand Total
              </p>
              <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.04em', lineHeight: 1, color: '#fff' }}>
                ৳ {fmt(totals.grandTotal)}
              </p>
            </div>
            {vdsApplicable && (
              <>
                <SummaryRow label="VDS Amount" value={`৳ ${fmt(totals.vdsAmount)}`} />
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0',
                }}>
                  <span style={{ fontFamily: D.manrope, fontSize: 13, fontWeight: 700, color: D.onSurface }}>Net Receivable</span>
                  <span style={{ fontFamily: D.manrope, fontSize: 14, fontWeight: 800, color: D.tertiary }}>
                    ৳ {fmt(totals.netReceivable)}
                  </span>
                </div>
              </>
            )}
          </SLCard>
        </div>
      </div>
    </div>
  );
}
