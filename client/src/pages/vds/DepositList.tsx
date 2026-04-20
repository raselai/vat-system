import { useEffect, useState } from 'react';
import { Table, message, Select, Popconfirm } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { TreasuryDeposit } from '../../types';
import { markDeposited } from '../../services/vds';
import { D, PageHeader, GradBtn, TonalBtn, TableWrap, FilterBar, StatusChip } from '../../styles/design';

export default function DepositList() {
  const [deposits, setDeposits] = useState<TreasuryDeposit[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const navigate = useNavigate();

  const fetchDeposits = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await api.get(`/vds/deposits?${params}`);
      setDeposits(data.data.deposits);
    } catch {
      message.error('Failed to load deposits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDeposits(); }, [statusFilter]);

  const handleMarkDeposited = async (id: string) => {
    try {
      await markDeposited(id);
      message.success('Marked as deposited');
      fetchDeposits();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to update');
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
      title: 'Date',
      dataIndex: 'depositDate',
      key: 'depositDate',
      render: (d: string) => <span style={{ color: D.onSurfaceVar, fontSize: 13 }}>{new Date(d).toLocaleDateString('en-GB')}</span>,
    },
    {
      title: 'Bank',
      dataIndex: 'bankName',
      key: 'bankName',
      render: (v: string) => <span style={{ fontFamily: D.manrope, fontWeight: 600, color: D.onSurface }}>{v}</span>,
    },
    {
      title: 'Branch',
      dataIndex: 'bankBranch',
      key: 'bankBranch',
      render: (v: string) => <span style={{ color: D.onSurfaceVar, fontSize: 13 }}>{v || '—'}</span>,
    },
    {
      title: 'Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (v: number) => (
        <span style={{ fontFamily: D.manrope, fontWeight: 700, color: D.onSurface }}>
          ৳ {Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: 'Tax Month',
      dataIndex: 'taxMonth',
      key: 'taxMonth',
      render: (v: string) => <span style={{ color: D.onSurfaceVar, fontSize: 13 }}>{v}</span>,
    },
    {
      title: 'Linked Certs',
      key: 'certCount',
      render: (_: unknown, r: TreasuryDeposit) => (
        <span style={{ fontFamily: D.manrope, fontWeight: 700, color: D.primary }}>
          {r.certificates?.length || 0}
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
      render: (_: unknown, record: TreasuryDeposit) => (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {record.status === 'pending' && (
            <Popconfirm title="Mark as deposited?" onConfirm={() => handleMarkDeposited(record.id)}>
              <TonalBtn icon="check_circle" size="sm">Mark Deposited</TonalBtn>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ fontFamily: D.inter, color: D.onSurface }}>
      <PageHeader
        eyebrow="VDS Workflow"
        title="Treasury Deposits"
        action={<GradBtn icon="add" onClick={() => navigate('/vds/deposits/new')}>New Deposit</GradBtn>}
      />
      <FilterBar>
        <Select
          placeholder="All Statuses"
          allowClear
          style={{ width: 160 }}
          onChange={setStatusFilter}
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'deposited', label: 'Deposited' },
            { value: 'verified', label: 'Verified' },
          ]}
        />
      </FilterBar>
      <TableWrap>
        <Table columns={columns} dataSource={deposits} rowKey="id" loading={loading} scroll={{ x: 1000 }} />
      </TableWrap>
    </div>
  );
}
