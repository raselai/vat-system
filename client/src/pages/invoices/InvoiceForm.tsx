import { useState, useEffect } from 'react';
import { Button, Card, Typography, message, Select, DatePicker, Switch, Table, InputNumber, Space, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../services/api';
import { Product } from '../../types';
import { calculateLineItem, calculateTotals } from '../../utils/vatCalc';

const { Title, Text } = Typography;

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
  // Calculated fields
  taxableValue: number;
  sdAmount: number;
  vatAmount: number;
  specificDutyLine: number;
  lineTotal: number;
  grandTotal: number;
  vdsAmount: number;
}

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

      // Auto-fill from product
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

      // Recalculate
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

  const handleSubmit = async () => {
    if (items.length === 0) {
      message.error('Add at least one item');
      return;
    }

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
      render: (_: unknown, r: FormItem) => <InputNumber value={r.qty} min={0.001} onChange={v => updateItem(r.key, 'qty', v || 0)} style={{ width: '100%' }} />,
    },
    {
      title: 'Unit Price', key: 'unitPrice', width: 110,
      render: (_: unknown, r: FormItem) => <InputNumber value={r.unitPrice} min={0} onChange={v => updateItem(r.key, 'unitPrice', v || 0)} style={{ width: '100%' }} />,
    },
    { title: 'Taxable', key: 'taxableValue', width: 100, render: (_: unknown, r: FormItem) => r.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
    { title: 'SD', key: 'sdAmount', width: 80, render: (_: unknown, r: FormItem) => r.sdAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
    { title: 'VAT', key: 'vatAmount', width: 100, render: (_: unknown, r: FormItem) => r.vatAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
    { title: 'Total', key: 'grandTotal', width: 110, render: (_: unknown, r: FormItem) => <strong>{r.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> },
    {
      title: '', key: 'action', width: 40,
      render: (_: unknown, r: FormItem) => <Button size="small" icon={<DeleteOutlined />} danger onClick={() => removeItem(r.key)} />,
    },
  ];

  return (
    <div>
      <Title level={4}>New Invoice (Musak 6.3)</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space size="large" wrap>
          <div>
            <Text strong>Type: </Text>
            <Select value={invoiceType} onChange={setInvoiceType} style={{ width: 140 }}
              options={[{ value: 'sales', label: 'Sales' }, { value: 'purchase', label: 'Purchase' }]} />
          </div>
          <div>
            <Text strong>Date: </Text>
            <DatePicker value={dayjs(challanDate)} onChange={(d) => setChallanDate(d?.format('YYYY-MM-DD') || '')} />
          </div>
          <div>
            <Text strong>Customer: </Text>
            <Select value={customerId} onChange={setCustomerId} allowClear style={{ width: 220 }} placeholder="Select customer"
              showSearch optionFilterProp="label"
              options={customers.map((c: any) => ({ value: c.id, label: `${c.name} (${c.binNid || 'No BIN'})` }))} />
          </div>
          <div>
            <Text strong>VDS Applicable: </Text>
            <Switch checked={vdsApplicable} onChange={setVdsApplicable} />
          </div>
        </Space>
      </Card>

      <Card title="Line Items" extra={<Button icon={<PlusOutlined />} onClick={addItem}>Add Item</Button>}>
        <Table columns={columns} dataSource={items} rowKey="key" pagination={false} scroll={{ x: 900 }} size="small" />
      </Card>

      <Card style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ minWidth: 300 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Subtotal:</span><span>{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
            {totals.sdTotal > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>SD Total:</span><span>{totals.sdTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>VAT Total:</span><span>{totals.vatTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
            {totals.specificDutyTotal > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Specific Duty:</span><span>{totals.specificDutyTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>}
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, marginBottom: 4 }}><span>Grand Total:</span><span>{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
            {vdsApplicable && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>VDS Amount:</span><span>{totals.vdsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}><span>Net Receivable:</span><span>{totals.netReceivable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
              </>
            )}
          </div>
        </div>
        <Divider />
        <Space>
          <Button type="primary" size="large" loading={loading} onClick={handleSubmit}>
            Create Invoice
          </Button>
          <Button size="large" onClick={() => navigate('/invoices')}>Cancel</Button>
        </Space>
      </Card>
    </div>
  );
}
