import { useEffect, useState } from 'react';
import { Table, message, Popconfirm } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Customer } from '../../types';
import { D, PageHeader, GradBtn, TonalBtn, TableWrap, StatusChip } from '../../styles/design';

export default function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/customers');
      setCustomers(data.data);
    } catch {
      message.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/customers/${id}`);
      message.success('Customer deactivated');
      fetchCustomers();
    } catch {
      message.error('Failed to deactivate customer');
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => <span style={{ fontFamily: D.manrope, fontWeight: 600, color: D.onSurface }}>{v}</span>,
    },
    {
      title: 'BIN / NID',
      dataIndex: 'binNid',
      key: 'binNid',
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 13, color: D.onSurfaceVar }}>{v || '—'}</span>,
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (v: string) => <span style={{ color: D.onSurfaceVar, fontSize: 13 }}>{v || '—'}</span>,
    },
    {
      title: 'VDS Entity',
      key: 'isVdsEntity',
      render: (_: unknown, record: Customer) =>
        record.isVdsEntity
          ? <StatusChip status={record.vdsEntityType || 'yes'} label={record.vdsEntityType || 'VDS'} />
          : <StatusChip status="no" label="No" />,
    },
    {
      title: '',
      key: 'actions',
      render: (_: unknown, record: Customer) => (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <TonalBtn icon="edit" size="sm" onClick={() => navigate(`/customers/${record.id}/edit`)}>Edit</TonalBtn>
          <Popconfirm title="Deactivate this customer?" onConfirm={() => handleDelete(record.id)}>
            <TonalBtn icon="delete" size="sm" danger>Deactivate</TonalBtn>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div style={{ fontFamily: D.inter, color: D.onSurface }}>
      <PageHeader
        eyebrow="Counterparties"
        title="Customers & Suppliers"
        action={<GradBtn icon="add" onClick={() => navigate('/customers/new')}>Add Customer</GradBtn>}
      />
      <TableWrap>
        <Table columns={columns} dataSource={customers} rowKey="id" loading={loading} />
      </TableWrap>
    </div>
  );
}
