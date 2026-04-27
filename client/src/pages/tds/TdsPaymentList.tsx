import { useEffect, useState } from 'react';
import { Table, Select, message, Popconfirm } from 'antd';
import { useNavigate } from 'react-router-dom';
import { listTdsPayments, markDeposited } from '../../services/tds';
import { TdsPayment } from '../../types';
import { D, PageHeader, TableWrap, FilterBar, StatusChip, GradBtn, TonalBtn } from '../../styles/design';

function fmt(v: number) {
  return '৳ ' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function TdsPaymentList() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<TdsPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchPayments = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    listTdsPayments(params)
      .then(r => setPayments(r.payments))
      .catch(() => message.error('Failed to load TDS payments'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPayments(); }, [statusFilter]);

  const handleMarkDeposited = async (id: string) => {
    try {
      await markDeposited(id);
      message.success('Marked as deposited');
      fetchPayments();
    } catch (err: any) { message.error(err.response?.data?.error || 'Failed to update'); }
  };

  const columns = [
    {
      title: 'Challan No',
      key: 'challanNo',
      render: (_: unknown, r: TdsPayment) => (
        <span style={{ fontFamily: D.manrope, fontWeight: 700, color: D.primary }}>{r.challanNo}</span>
      ),
    },
    {
      title: 'Date',
      key: 'date',
      render: (_: unknown, r: TdsPayment) => new Date(r.paymentDate).toLocaleDateString('en-GB'),
    },
    {
      title: 'Bank',
      key: 'bank',
      render: (_: unknown, r: TdsPayment) => (
        <div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{r.bankName}</p>
          {r.bankBranch && <p style={{ margin: 0, fontSize: 11, color: D.onSurfaceVar }}>{r.bankBranch}</p>}
        </div>
      ),
    },
    {
      title: 'Total Amount',
      key: 'totalAmount',
      align: 'right' as const,
      render: (_: unknown, r: TdsPayment) => (
        <span style={{ fontFamily: D.manrope, fontWeight: 700, color: D.primary }}>{fmt(r.totalAmount)}</span>
      ),
    },
    {
      title: 'Deductions',
      key: 'deductions',
      align: 'right' as const,
      render: (_: unknown, r: TdsPayment) => (
        <span style={{ fontFamily: D.manrope, color: D.onSurfaceVar }}>{r.deductions.length}</span>
      ),
    },
    { title: 'Month', key: 'taxMonth', dataIndex: 'taxMonth' },
    {
      title: 'Status',
      key: 'status',
      render: (_: unknown, r: TdsPayment) => <StatusChip status={r.status} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, r: TdsPayment) => (
        r.status === 'pending' ? (
          <Popconfirm title="Mark this payment as deposited?" onConfirm={() => handleMarkDeposited(r.id)}>
            <TonalBtn size="sm" icon="check_circle">Mark Deposited</TonalBtn>
          </Popconfirm>
        ) : null
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Income Tax"
        title="TDS Payments"
        sub="Treasury challan payments for tax deducted at source"
        action={<GradBtn icon="add" onClick={() => navigate('/tds/payments/new')}>New Payment</GradBtn>}
      />
      <FilterBar>
        <Select
          placeholder="All Statuses"
          value={statusFilter || undefined}
          allowClear
          onChange={v => setStatusFilter(v || '')}
          style={{ width: 160 }}
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'deposited', label: 'Deposited' },
            { value: 'verified', label: 'Verified' },
          ]}
        />
      </FilterBar>
      <TableWrap>
        <Table
          columns={columns}
          dataSource={payments}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 50, hideOnSinglePage: true }}
          size="small"
          scroll={{ x: 900 }}
        />
      </TableWrap>
    </div>
  );
}
