import { useEffect, useState } from 'react';
import { Table, message, Popconfirm } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Company } from '../../types';
import { D, PageHeader, GradBtn, TonalBtn, TableWrap } from '../../styles/design';

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

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/companies/${id}`);
      message.success('Company deleted');
      fetchCompanies();
    } catch {
      message.error('Failed to delete company');
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
      title: 'BIN',
      dataIndex: 'bin',
      key: 'bin',
      render: (v: string) => <span style={{ fontFamily: D.inter, fontSize: 13, color: D.onSurfaceVar }}>{v}</span>,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (v: string) => (
        <span style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' as const, background: D.navy10, color: D.primary, borderRadius: 6, padding: '2px 10px' }}>
          {v}
        </span>
      ),
    },
    {
      title: 'Challan Prefix',
      dataIndex: 'challanPrefix',
      key: 'challanPrefix',
      render: (v: string) => <code style={{ fontSize: 12, background: D.surfaceLow, padding: '2px 8px', borderRadius: 6, fontFamily: 'monospace', color: D.onSurfaceVar }}>{v}</code>,
    },
    {
      title: '',
      key: 'actions',
      render: (_: unknown, record: Company) => (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <TonalBtn icon="edit" size="sm" onClick={() => navigate(`/companies/${record.id}/edit`)}>Edit</TonalBtn>
          <Popconfirm title="Delete this company?" onConfirm={() => handleDelete(record.id)}>
            <TonalBtn icon="delete" size="sm" danger>Delete</TonalBtn>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div style={{ fontFamily: D.inter, color: D.onSurface }}>
      <PageHeader
        eyebrow="Business Setup"
        title="Companies"
        action={<GradBtn icon="add" onClick={() => navigate('/companies/new')}>Add Company</GradBtn>}
      />
      <TableWrap>
        <Table columns={columns} dataSource={companies} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} />
      </TableWrap>
    </div>
  );
}
