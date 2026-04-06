import { useEffect, useState } from 'react';
import { Table, Button, Space, Typography, message, Tag, Select } from 'antd';
import { PlusOutlined, EyeOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Invoice } from '../../types';

const { Title } = Typography;

const statusColors: Record<string, string> = {
  draft: 'default',
  approved: 'green',
  cancelled: 'red',
  locked: 'blue',
};

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const navigate = useNavigate();

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('invoiceType', typeFilter);
      const { data } = await api.get(`/invoices?${params}`);
      setInvoices(data.data.invoices);
    } catch {
      message.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, [statusFilter, typeFilter]);

  const handlePdf = async (id: string, challanNo: string) => {
    try {
      const response = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `musak63-${challanNo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Failed to generate PDF');
    }
  };

  const columns = [
    { title: 'Challan No', dataIndex: 'challanNo', key: 'challanNo' },
    {
      title: 'Type',
      dataIndex: 'invoiceType',
      key: 'invoiceType',
      render: (type: string) => <Tag color={type === 'sales' ? 'blue' : 'orange'}>{type}</Tag>,
    },
    { title: 'Date', dataIndex: 'challanDate', key: 'challanDate', render: (d: string) => new Date(d).toLocaleDateString('en-GB') },
    { title: 'Customer', key: 'customer', render: (_: unknown, r: Invoice) => r.customer?.name || '-' },
    { title: 'Grand Total', dataIndex: 'grandTotal', key: 'grandTotal', render: (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
    { title: 'VAT', dataIndex: 'vatTotal', key: 'vatTotal', render: (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={statusColors[status]}>{status}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Invoice) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/invoices/${record.id}`)} />
          <Button size="small" icon={<FilePdfOutlined />} onClick={() => handlePdf(record.id, record.challanNo)} />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Musak 6.3 — Invoices (Challans)</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/invoices/new')}>
          New Invoice
        </Button>
      </div>
      <Space style={{ marginBottom: 16 }}>
        <Select placeholder="Status" allowClear style={{ width: 140 }} onChange={setStatusFilter}
          options={[
            { value: 'draft', label: 'Draft' },
            { value: 'approved', label: 'Approved' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: 'locked', label: 'Locked' },
          ]}
        />
        <Select placeholder="Type" allowClear style={{ width: 140 }} onChange={setTypeFilter}
          options={[
            { value: 'sales', label: 'Sales' },
            { value: 'purchase', label: 'Purchase' },
          ]}
        />
      </Space>
      <Table columns={columns} dataSource={invoices} rowKey="id" loading={loading} scroll={{ x: 1000 }} />
    </div>
  );
}
