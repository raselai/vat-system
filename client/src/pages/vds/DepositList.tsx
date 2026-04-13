import { useEffect, useState } from 'react';
import { Table, Button, Space, Typography, message, Tag, Select, Popconfirm } from 'antd';
import { PlusOutlined, CheckOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { TreasuryDeposit } from '../../types';
import { markDeposited } from '../../services/vds';

const { Title } = Typography;

const statusColors: Record<string, string> = {
  pending: 'default',
  deposited: 'green',
  verified: 'blue',
};

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
    { title: 'Challan No', dataIndex: 'challanNo', key: 'challanNo' },
    { title: 'Date', dataIndex: 'depositDate', key: 'depositDate', render: (d: string) => new Date(d).toLocaleDateString('en-GB') },
    { title: 'Bank', dataIndex: 'bankName', key: 'bankName' },
    { title: 'Branch', dataIndex: 'bankBranch', key: 'bankBranch', render: (v: string) => v || '-' },
    { title: 'Amount', dataIndex: 'totalAmount', key: 'totalAmount', render: (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
    { title: 'Tax Month', dataIndex: 'taxMonth', key: 'taxMonth' },
    {
      title: 'Certificates', key: 'certCount',
      render: (_: unknown, r: TreasuryDeposit) => <Tag>{r.certificates?.length || 0} linked</Tag>,
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (status: string) => <Tag color={statusColors[status]}>{status}</Tag>,
    },
    {
      title: 'Actions', key: 'actions',
      render: (_: unknown, record: TreasuryDeposit) => (
        <Space>
          {record.status === 'pending' && (
            <Popconfirm title="Mark as deposited?" onConfirm={() => handleMarkDeposited(record.id)}>
              <Button size="small" icon={<CheckOutlined />} type="primary">Deposited</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Treasury Deposits</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/vds/deposits/new')}>
          New Deposit
        </Button>
      </div>
      <Space style={{ marginBottom: 16 }}>
        <Select placeholder="Status" allowClear style={{ width: 140 }} onChange={setStatusFilter}
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'deposited', label: 'Deposited' },
            { value: 'verified', label: 'Verified' },
          ]}
        />
      </Space>
      <Table columns={columns} dataSource={deposits} rowKey="id" loading={loading} scroll={{ x: 1000 }} />
    </div>
  );
}
