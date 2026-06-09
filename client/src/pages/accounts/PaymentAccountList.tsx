import { useEffect, useState } from 'react';
import { Table, message, Popconfirm } from 'antd';
import { useNavigate } from 'react-router-dom';
import { listPaymentAccounts, deletePaymentAccount } from '../../services/payment';
import { PaymentAccount } from '../../types';
import { D, PageHeader, GradBtn, TonalBtn, TableWrap, StatusChip } from '../../styles/design';

const TYPE_LABELS: Record<PaymentAccount['type'], string> = {
  cash: 'Cash',
  bank: 'Bank',
  mobile_banking: 'Mobile Banking',
};

export default function PaymentAccountList() {
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      setAccounts(await listPaymentAccounts(true));
    } catch {
      message.error('Failed to load payment accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, []);

  const handleDelete = async (id: string) => {
    try {
      await deletePaymentAccount(id);
      message.success('Account deactivated');
      fetchAccounts();
    } catch {
      message.error('Failed to deactivate account');
    }
  };

  const columns = [
    {
      title: 'Account',
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => <span style={{ fontFamily: D.manrope, fontWeight: 600, color: D.onSurface }}>{v}</span>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (v: PaymentAccount['type']) => <span style={{ color: D.onSurfaceVar, fontSize: 13 }}>{TYPE_LABELS[v]}</span>,
    },
    {
      title: 'Bank / Provider',
      dataIndex: 'bankName',
      key: 'bankName',
      className: 'hidden md:table-cell',
      render: (v: string) => <span style={{ color: D.onSurfaceVar, fontSize: 13 }}>{v || '—'}</span>,
    },
    {
      title: 'Account No.',
      dataIndex: 'accountNumber',
      key: 'accountNumber',
      className: 'hidden md:table-cell',
      render: (v: string) => v ? <code style={{ fontSize: 12, background: D.surfaceLow, padding: '2px 8px', borderRadius: 6, fontFamily: 'monospace', color: D.onSurfaceVar }}>{v}</code> : <span style={{ color: D.onSurfaceVar }}>—</span>,
    },
    {
      title: 'Opening Balance',
      dataIndex: 'openingBalance',
      key: 'openingBalance',
      align: 'right' as const,
      className: 'hidden sm:table-cell',
      render: (v: number) => (
        <span style={{ fontFamily: D.manrope, fontWeight: 600, color: D.onSurface }}>
          ৳ {Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (v: boolean) => <StatusChip status={v ? 'active' : 'inactive'} />,
    },
    {
      title: '',
      key: 'actions',
      render: (_: unknown, record: PaymentAccount) => (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <TonalBtn icon="edit" size="sm" onClick={() => navigate(`/accounts/payment-accounts/${record.id}/edit`)}>Edit</TonalBtn>
          {record.isActive && (
            <Popconfirm title="Deactivate this account?" onConfirm={() => handleDelete(record.id)}>
              <TonalBtn icon="delete" size="sm" danger>Deactivate</TonalBtn>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ fontFamily: D.inter, color: D.onSurface }}>
      <PageHeader
        eyebrow="Accounts"
        title="Money Accounts"
        sub="Cash, bank, and mobile banking accounts used to receive and make payments"
        action={<GradBtn icon="add" onClick={() => navigate('/accounts/payment-accounts/new')}>Add Account</GradBtn>}
      />
      <TableWrap>
        <Table columns={columns} dataSource={accounts} rowKey="id" loading={loading} scroll={{ x: 'max-content' }} />
      </TableWrap>
    </div>
  );
}
