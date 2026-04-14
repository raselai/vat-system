import { useEffect, useState } from 'react';
import logoUrl from '../../Image/Logo.png';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Card, Typography, message, Tag, Space,
  Table, Select, DatePicker, InputNumber, Popconfirm, Divider,
} from 'antd';
import {
  EditOutlined, CheckOutlined, LockOutlined,
  CloseOutlined, FilePdfOutlined, ArrowLeftOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../services/api';
import { Invoice, InvoiceItem, Product, Company } from '../../types';
import { calculateLineItem, calculateTotals } from '../../utils/vatCalc';
import { useCompany } from '../../contexts/CompanyContext';

const { Title, Text } = Typography;

const statusColors: Record<string, string> = {
  draft: 'default',
  approved: 'green',
  cancelled: 'red',
  locked: 'blue',
};

function fmt(v: number) {
  return Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface EditItem extends InvoiceItem {
  key: string;
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeCompany } = useCompany();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  // Edit state
  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [editCustomerId, setEditCustomerId] = useState<string | undefined>();
  const [editDate, setEditDate] = useState<string>('');

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/invoices/${id}`);
      setInvoice(data.data);
    } catch {
      message.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
    api.get('/products').then(r => setProducts(r.data.data)).catch(() => {});
    api.get('/customers').then(r => setCustomers(r.data.data)).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (activeCompany?.id) {
      api.get(`/companies/${activeCompany.id}`).then(r => setCompany(r.data.data)).catch(() => {});
    }
  }, [activeCompany?.id]);

  const enterEditMode = () => {
    if (!invoice) return;
    setEditItems(invoice.items.map(item => ({ ...item, key: item.id || Date.now().toString() })));
    setEditCustomerId(invoice.customerId || undefined);
    setEditDate(invoice.challanDate);
    setEditMode(true);
  };

  const updateItem = (key: string, field: string, value: any) => {
    setEditItems(prev => prev.map(item => {
      if (item.key !== key) return item;
      const updated = { ...item, [field]: value };
      if (field === 'productId') {
        const product = products.find(p => p.id === value);
        if (product) {
          updated.description = product.name;
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
        vdsRate: invoice?.vdsApplicable ? updated.vdsRate : 0,
      });
      return { ...updated, ...calc };
    }));
  };

  const handleSave = async () => {
    setActionLoading(true);
    try {
      await api.put(`/invoices/${id}`, {
        customerId: editCustomerId,
        challanDate: editDate,
        items: editItems.map(i => ({
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
      message.success('Invoice updated');
      setEditMode(false);
      fetchInvoice();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to update invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAction = async (action: 'approve' | 'cancel' | 'lock') => {
    setActionLoading(true);
    try {
      await api.post(`/invoices/${id}/${action}`);
      message.success(`Invoice ${action}d`);
      fetchInvoice();
    } catch (err: any) {
      message.error(err.response?.data?.error || `Failed to ${action} invoice`);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePdf = async () => {
    if (!invoice) return;
    try {
      const response = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `musak63-${invoice.challanNo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Failed to generate PDF');
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;
  if (!invoice) return <div style={{ padding: 24 }}>Invoice not found.</div>;

  const totals = editMode ? calculateTotals(editItems) : null;

  const editColumns = [
    {
      title: 'Product', key: 'productId', width: 200,
      render: (_: unknown, r: EditItem) => (
        <Select value={r.productId || undefined} onChange={v => updateItem(r.key, 'productId', v)}
          style={{ width: '100%' }} showSearch optionFilterProp="label" placeholder="Select product"
          options={products.map(p => ({ value: p.id, label: `${p.name} (${p.vatRate}%)` }))} />
      ),
    },
    {
      title: 'Qty', key: 'qty', width: 80,
      render: (_: unknown, r: EditItem) => <InputNumber value={r.qty} min={0.001} onChange={v => updateItem(r.key, 'qty', v || 0)} style={{ width: '100%' }} />,
    },
    {
      title: 'Unit Price', key: 'unitPrice', width: 110,
      render: (_: unknown, r: EditItem) => <InputNumber value={r.unitPrice} min={0} onChange={v => updateItem(r.key, 'unitPrice', v || 0)} style={{ width: '100%' }} />,
    },
    { title: 'Taxable', key: 'taxableValue', width: 100, render: (_: unknown, r: EditItem) => fmt(r.taxableValue) },
    { title: 'VAT', key: 'vatAmount', width: 100, render: (_: unknown, r: EditItem) => fmt(r.vatAmount) },
    { title: 'Total', key: 'grandTotal', width: 110, render: (_: unknown, r: EditItem) => <strong>{fmt(r.grandTotal)}</strong> },
  ];

  return (
    <div>
      {/* Action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/invoices')}>Back</Button>
          <Title level={4} style={{ margin: 0 }}>
            {invoice.challanNo} <Tag color={statusColors[invoice.status]}>{invoice.status}</Tag>
          </Title>
        </Space>
        <Space>
          {invoice.status === 'draft' && !editMode && (
            <>
              <Button icon={<EditOutlined />} onClick={enterEditMode}>Edit</Button>
              <Button type="primary" icon={<CheckOutlined />} loading={actionLoading} onClick={() => handleAction('approve')}>Approve</Button>
              <Popconfirm title="Cancel this invoice?" onConfirm={() => handleAction('cancel')} okText="Yes" cancelText="No">
                <Button danger icon={<CloseOutlined />} loading={actionLoading}>Cancel</Button>
              </Popconfirm>
            </>
          )}
          {invoice.status === 'draft' && editMode && (
            <>
              <Button type="primary" loading={actionLoading} onClick={handleSave}>Save</Button>
              <Button onClick={() => setEditMode(false)}>Discard</Button>
            </>
          )}
          {invoice.status === 'approved' && (
            <>
              <Button type="primary" icon={<LockOutlined />} loading={actionLoading} onClick={() => handleAction('lock')}>Lock</Button>
              <Popconfirm title="Cancel this invoice?" onConfirm={() => handleAction('cancel')} okText="Yes" cancelText="No">
                <Button danger icon={<CloseOutlined />} loading={actionLoading}>Cancel</Button>
              </Popconfirm>
            </>
          )}
          {invoice.status !== 'cancelled' && (
            <Button icon={<FilePdfOutlined />} onClick={handlePdf}>Download PDF</Button>
          )}
        </Space>
      </div>

      {/* Edit mode */}
      {editMode && (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <Space size="large" wrap>
              <div>
                <Text strong>Date: </Text>
                <DatePicker value={dayjs(editDate)} onChange={d => setEditDate(d?.format('YYYY-MM-DD') || '')} />
              </div>
              <div>
                <Text strong>Customer: </Text>
                <Select value={editCustomerId} onChange={setEditCustomerId} allowClear style={{ width: 220 }}
                  showSearch optionFilterProp="label" placeholder="Select customer"
                  options={customers.map((c: any) => ({ value: c.id, label: `${c.name} (${c.binNid || 'No BIN'})` }))} />
              </div>
            </Space>
          </Card>
          <Card title="Line Items" style={{ marginBottom: 16 }}>
            <Table columns={editColumns} dataSource={editItems} rowKey="key" pagination={false} scroll={{ x: 700 }} size="small" />
          </Card>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ minWidth: 300 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Subtotal:</span><span>{fmt(totals!.subtotal)}</span></div>
                {totals!.sdTotal > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>SD Total:</span><span>{fmt(totals!.sdTotal)}</span></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>VAT Total:</span><span>{fmt(totals!.vatTotal)}</span></div>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}><span>Grand Total:</span><span>{fmt(totals!.grandTotal)}</span></div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Challan preview (view mode) */}
      {!editMode && (
        <div style={{
          background: '#fff',
          border: '1px solid #d9d9d9',
          borderRadius: 4,
          padding: 32,
          maxWidth: 900,
          fontFamily: "'Noto Sans Bengali', sans-serif",
          fontSize: 11,
          color: '#333',
        }}>
          {/* Government header */}
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <img src={logoUrl} alt="Government Seal" style={{ width: 64, height: 64, marginBottom: 4, display: 'block', margin: '0 auto 4px' }} />
            <div style={{ fontSize: 13, fontWeight: 700 }}>গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</div>
            <div style={{ fontSize: 11, fontWeight: 600 }}>জাতীয় রাজস্ব বোর্ড</div>
            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>Government of the People's Republic of Bangladesh</div>
            <div style={{ fontSize: 10, fontWeight: 600 }}>National Board of Revenue</div>
            <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>মূসক-৬.৩ / Musak-6.3</div>
          </div>

          {/* Challan header */}
          <div style={{ textAlign: 'center', borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '8px 0', marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>কর চালানপত্র / Tax Invoice (Challan)</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{company?.name || activeCompany?.name}</div>
            <div style={{ fontSize: 10, color: '#555' }}>
              BIN: {company?.bin || activeCompany?.bin} {company?.address ? `| ${company.address}` : ''}
            </div>
          </div>

          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            <div>
              {[
                ['চালান নম্বর / Challan No', invoice.challanNo],
                ['তারিখ / Date', new Date(invoice.challanDate).toLocaleDateString('en-GB')],
                ['ধরন / Type', invoice.invoiceType === 'sales' ? 'বিক্রয় / Sales' : 'ক্রয় / Purchase'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, minWidth: 160, fontSize: 11 }}>{label}:</span>
                  <span style={{ flex: 1, fontSize: 11 }}>{value}</span>
                </div>
              ))}
            </div>
            <div>
              {[
                ['ক্রেতার নাম / Buyer', invoice.customer?.name || 'N/A'],
                ['ক্রেতার BIN', invoice.customer?.binNid || 'N/A'],
                ['ঠিকানা / Address', invoice.customer?.address || 'N/A'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, minWidth: 140, fontSize: 11 }}>{label}:</span>
                  <span style={{ flex: 1, fontSize: 11 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Line items table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
            <thead>
              <tr>
                {['ক্রম\nSL', 'পণ্য/সেবার বিবরণ\nDescription', 'HS Code', 'একক\nUnit', 'পরিমাণ\nQty', 'একক মূল্য\nUnit Price', 'করযোগ্য মূল্য\nTaxable Value', 'SD %', 'SD পরিমাণ\nSD Amount', 'VAT %', 'VAT পরিমাণ\nVAT Amount', 'মোট\nTotal'].map((h, i) => (
                  <th key={i} style={{ border: '1px solid #333', padding: '4px 5px', background: '#f0f0f0', fontWeight: 700, textAlign: 'center', fontSize: 10, whiteSpace: 'pre-line' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td style={{ border: '1px solid #333', padding: '4px 5px', textAlign: 'center', fontSize: 10 }}>{idx + 1}</td>
                  <td style={{ border: '1px solid #333', padding: '4px 5px', fontSize: 10 }}>
                    {item.description}
                    {item.descriptionBn && <><br /><span style={{ color: '#555' }}>{item.descriptionBn}</span></>}
                  </td>
                  <td style={{ border: '1px solid #333', padding: '4px 5px', textAlign: 'center', fontSize: 10 }}>{item.hsCode || '-'}</td>
                  <td style={{ border: '1px solid #333', padding: '4px 5px', textAlign: 'center', fontSize: 10 }}>{item.product?.unit || '-'}</td>
                  <td style={{ border: '1px solid #333', padding: '4px 5px', textAlign: 'right', fontSize: 10 }}>{item.qty}</td>
                  <td style={{ border: '1px solid #333', padding: '4px 5px', textAlign: 'right', fontSize: 10 }}>{fmt(item.unitPrice)}</td>
                  <td style={{ border: '1px solid #333', padding: '4px 5px', textAlign: 'right', fontSize: 10 }}>{fmt(item.taxableValue)}</td>
                  <td style={{ border: '1px solid #333', padding: '4px 5px', textAlign: 'right', fontSize: 10 }}>{item.sdRate}</td>
                  <td style={{ border: '1px solid #333', padding: '4px 5px', textAlign: 'right', fontSize: 10 }}>{fmt(item.sdAmount)}</td>
                  <td style={{ border: '1px solid #333', padding: '4px 5px', textAlign: 'right', fontSize: 10 }}>{item.vatRate}</td>
                  <td style={{ border: '1px solid #333', padding: '4px 5px', textAlign: 'right', fontSize: 10 }}>{fmt(item.vatAmount)}</td>
                  <td style={{ border: '1px solid #333', padding: '4px 5px', textAlign: 'right', fontSize: 10, fontWeight: 600 }}>{fmt(item.grandTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginBottom: 40 }}>
            {[
              ['মোট করযোগ্য মূল্য / Subtotal', fmt(invoice.subtotal)],
              ...(invoice.sdTotal > 0 ? [['সম্পূরক শুল্ক / SD Total', fmt(invoice.sdTotal)]] : []),
              ['মূল্য সংযোজন কর / VAT Total', fmt(invoice.vatTotal)],
              ...(invoice.specificDutyTotal > 0 ? [['সুনির্দিষ্ট শুল্ক / Specific Duty', fmt(invoice.specificDutyTotal)]] : []),
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', gap: 20, marginBottom: 3 }}>
                <span style={{ fontWeight: 600, minWidth: 240, textAlign: 'right', fontSize: 11 }}>{label}:</span>
                <span style={{ minWidth: 120, textAlign: 'right', fontSize: 11 }}>{value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 20, marginBottom: 3, borderTop: '1px solid #333', paddingTop: 4 }}>
              <span style={{ fontWeight: 700, minWidth: 240, textAlign: 'right', fontSize: 13 }}>সর্বমোট / Grand Total:</span>
              <span style={{ minWidth: 120, textAlign: 'right', fontSize: 13, fontWeight: 700 }}>{fmt(invoice.grandTotal)}</span>
            </div>
            {invoice.vdsApplicable && (
              <>
                <div style={{ display: 'flex', gap: 20, marginBottom: 3 }}>
                  <span style={{ fontWeight: 600, minWidth: 240, textAlign: 'right', fontSize: 11 }}>উৎসে কর্তিত VAT / VDS Amount:</span>
                  <span style={{ minWidth: 120, textAlign: 'right', fontSize: 11 }}>{fmt(invoice.vdsAmount)}</span>
                </div>
                <div style={{ display: 'flex', gap: 20 }}>
                  <span style={{ fontWeight: 600, minWidth: 240, textAlign: 'right', fontSize: 11 }}>নীট প্রাপ্য / Net Receivable:</span>
                  <span style={{ minWidth: 120, textAlign: 'right', fontSize: 11 }}>{fmt(invoice.netReceivable)}</span>
                </div>
              </>
            )}
          </div>

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'center', borderTop: '1px solid #333', paddingTop: 4, minWidth: 150, fontSize: 11 }}>
              ক্রেতার স্বাক্ষর<br />Buyer's Signature
            </div>
            <div style={{ textAlign: 'center', borderTop: '1px solid #333', paddingTop: 4, minWidth: 150, fontSize: 11 }}>
              বিক্রেতার স্বাক্ষর<br />Seller's Signature
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
