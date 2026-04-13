import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Card, Typography, message, Tag, Space, Divider,
  Table, Select, DatePicker, InputNumber, Popconfirm, Descriptions,
} from 'antd';
import {
  EditOutlined, CheckOutlined, LockOutlined,
  CloseOutlined, FilePdfOutlined, ArrowLeftOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../services/api';
import { Invoice, InvoiceItem, Product } from '../../types';
import { calculateLineItem, calculateTotals } from '../../utils/vatCalc';

const { Title, Text } = Typography;

const statusColors: Record<string, string> = {
  draft: 'default',
  approved: 'green',
  cancelled: 'red',
  locked: 'blue',
};

interface EditItem extends InvoiceItem {
  key: string;
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  // Edit state
  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [editCustomerId, setEditCustomerId] = useState<string | undefined>();
  const [editDate, setEditDate] = useState<string>('');
  const [customers, setCustomers] = useState<any[]>([]);

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

  const enterEditMode = () => {
    if (!invoice) return;
    setEditItems(invoice.items.map(item => ({ ...item, key: item.id || Date.now().toString() })));
    setEditCustomerId(invoice.customerId || undefined);
    setEditDate(invoice.challanDate);
    setEditMode(true);
  };

  const cancelEdit = () => setEditMode(false);

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

  const viewColumns = [
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'HS Code', dataIndex: 'hsCode', key: 'hsCode', render: (v: string) => v || '-' },
    { title: 'Qty', dataIndex: 'qty', key: 'qty' },
    { title: 'Unit Price', dataIndex: 'unitPrice', key: 'unitPrice', render: (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
    { title: 'Taxable', dataIndex: 'taxableValue', key: 'taxableValue', render: (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
    { title: 'SD', dataIndex: 'sdAmount', key: 'sdAmount', render: (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
    { title: 'VAT', dataIndex: 'vatAmount', key: 'vatAmount', render: (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
    { title: 'Total', dataIndex: 'grandTotal', key: 'grandTotal', render: (v: number) => <strong>{v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> },
  ];

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
    { title: 'Taxable', key: 'taxableValue', width: 100, render: (_: unknown, r: EditItem) => r.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
    { title: 'VAT', key: 'vatAmount', width: 100, render: (_: unknown, r: EditItem) => r.vatAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
    { title: 'Total', key: 'grandTotal', width: 110, render: (_: unknown, r: EditItem) => <strong>{r.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> },
  ];

  return (
    <div>
      {/* Header */}
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
              <Button onClick={cancelEdit}>Discard</Button>
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

      {/* Info */}
      <Card style={{ marginBottom: 16 }}>
        {!editMode ? (
          <Descriptions column={3}>
            <Descriptions.Item label="Type">{invoice.invoiceType}</Descriptions.Item>
            <Descriptions.Item label="Date">{new Date(invoice.challanDate).toLocaleDateString('en-GB')}</Descriptions.Item>
            <Descriptions.Item label="Customer">{invoice.customer?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Customer BIN">{invoice.customer?.binNid || '-'}</Descriptions.Item>
            <Descriptions.Item label="VDS">{invoice.vdsApplicable ? 'Yes' : 'No'}</Descriptions.Item>
          </Descriptions>
        ) : (
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
        )}
      </Card>

      {/* Line Items */}
      <Card title="Line Items" style={{ marginBottom: 16 }}>
        <Table
          columns={editMode ? editColumns : viewColumns}
          dataSource={(editMode ? editItems : invoice.items) as any[]}
          rowKey={editMode ? 'key' : 'id'}
          pagination={false}
          scroll={{ x: 900 }}
          size="small"
        />
      </Card>

      {/* Totals */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ minWidth: 300 }}>
            {(() => {
              const sub = editMode ? totals!.subtotal : invoice.subtotal;
              const sd = editMode ? totals!.sdTotal : invoice.sdTotal;
              const vat = editMode ? totals!.vatTotal : invoice.vatTotal;
              const sd2 = editMode ? totals!.specificDutyTotal : invoice.specificDutyTotal;
              const grand = editMode ? totals!.grandTotal : invoice.grandTotal;
              const vdsAmt = editMode ? totals!.vdsAmount : invoice.vdsAmount;
              const net = editMode ? totals!.netReceivable : invoice.netReceivable;
              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Subtotal:</span><span>{sub.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                  {sd > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>SD Total:</span><span>{sd.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>VAT Total:</span><span>{vat.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                  {sd2 > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Specific Duty:</span><span>{sd2.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>}
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, marginBottom: 4 }}><span>Grand Total:</span><span>{grand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                  {invoice.vdsApplicable && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>VDS Amount:</span><span>{vdsAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}><span>Net Receivable:</span><span>{net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </Card>
    </div>
  );
}
