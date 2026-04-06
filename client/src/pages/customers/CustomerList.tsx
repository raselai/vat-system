import { useEffect, useState } from 'react';
import { Table, Button, Space, Typography, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Customer } from '../../types';

const { Title } = Typography;

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

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'BIN/NID', dataIndex: 'binNid', key: 'binNid' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    {
      title: 'VDS Entity',
      key: 'isVdsEntity',
      render: (_: unknown, record: Customer) =>
        record.isVdsEntity ? <Tag color="orange">{record.vdsEntityType || 'Yes'}</Tag> : <Tag>No</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Customer) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/customers/${record.id}/edit`)} />
          <Popconfirm title="Deactivate this customer?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/customers/${id}`);
      message.success('Customer deactivated');
      fetchCustomers();
    } catch {
      message.error('Failed to deactivate customer');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Customers</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/customers/new')}>
          Add Customer
        </Button>
      </div>
      <Table columns={columns} dataSource={customers} rowKey="id" loading={loading} />
    </div>
  );
}
