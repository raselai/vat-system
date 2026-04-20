import { useEffect, useState } from 'react';
import { Table, message, Select } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Invoice } from '../../types';
import { D, PageHeader, GradBtn, TonalBtn, TableWrap, FilterBar, StatusChip } from '../../styles/design';

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
    {
      title: 'Challan No',
      dataIndex: 'challanNo',
      key: 'challanNo',
      render: (v: string) => <span style={{ fontFamily: D.manrope, fontWeight: 700, color: D.primary, fontSize: 13 }}>{v}</span>,
    },
    {
      title: 'Type',
      dataIndex: 'invoiceType',
      key: 'invoiceType',
      render: (v: string) => <StatusChip status={v} />,
    },
    {
      title: 'Date',
      dataIndex: 'challanDate',
      key: 'challanDate',
      render: (d: string) => <span style={{ color: D.onSurfaceVar, fontSize: 13 }}>{new Date(d).toLocaleDateString('en-GB')}</span>,
    },
    {
      title: 'Customer',
      key: 'customer',
      render: (_: unknown, r: Invoice) => (
        <span style={{ fontFamily: D.manrope, fontWeight: 600, color: D.onSurface }}>{r.customer?.name || '—'}</span>
      ),
    },
    {
      title: 'Grand Total',
      dataIndex: 'grandTotal',
      key: 'grandTotal',
      render: (v: number) => (
        <span style={{ fontFamily: D.manrope, fontWeight: 700, color: D.onSurface }}>
          ৳ {Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: 'VAT',
      dataIndex: 'vatTotal',
      key: 'vatTotal',
      render: (v: number) => (
        <span style={{ color: D.onSurfaceVar, fontSize: 13 }}>
          ৳ {Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <StatusChip status={s} />,
    },
    {
      title: '',
      key: 'actions',
      render: (_: unknown, record: Invoice) => (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <TonalBtn icon="visibility" size="sm" onClick={() => navigate(`/invoices/${record.id}`)}>View</TonalBtn>
          <TonalBtn icon="picture_as_pdf" size="sm" onClick={() => handlePdf(record.id, record.challanNo)}>PDF</TonalBtn>
        </div>
      ),
    },
  ];

  return (
    <div style={{ fontFamily: D.inter, color: D.onSurface }}>
      <PageHeader
        eyebrow="Musak 6.3"
        title="Invoices (Challans)"
        action={<GradBtn icon="add" onClick={() => navigate('/invoices/new')}>New Invoice</GradBtn>}
      />
      <FilterBar>
        <Select
          placeholder="All Statuses"
          allowClear
          style={{ width: 160 }}
          onChange={setStatusFilter}
          options={[
            { value: 'draft', label: 'Draft' },
            { value: 'approved', label: 'Approved' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: 'locked', label: 'Locked' },
          ]}
        />
        <Select
          placeholder="All Types"
          allowClear
          style={{ width: 160 }}
          onChange={setTypeFilter}
          options={[
            { value: 'sales', label: 'Sales' },
            { value: 'purchase', label: 'Purchase' },
          ]}
        />
      </FilterBar>
      <TableWrap>
        <Table columns={columns} dataSource={invoices} rowKey="id" loading={loading} scroll={{ x: 1000 }} />
      </TableWrap>
    </div>
  );
}
