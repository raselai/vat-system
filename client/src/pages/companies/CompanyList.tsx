import { useEffect, useState } from 'react';
import { Table, Button, Space, Typography, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Company } from '../../types';

const { Title } = Typography;

export default function CompanyList() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/companies');
      setCompanies(data.data);
    } catch {
      message.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompanies(); }, []);

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'BIN', dataIndex: 'bin', key: 'bin' },
    { title: 'Role', dataIndex: 'role', key: 'role' },
    { title: 'Challan Prefix', dataIndex: 'challanPrefix', key: 'challanPrefix' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: Company) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/companies/${record.id}/edit`)} />
          <Popconfirm title="Delete this company?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/companies/${id}`);
      message.success('Company deleted');
      fetchCompanies();
    } catch {
      message.error('Failed to delete company');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Companies</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/companies/new')}>
          Add Company
        </Button>
      </div>
      <Table columns={columns} dataSource={companies} rowKey="id" loading={loading} />
    </div>
  );
}
