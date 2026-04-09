import { useEffect, useState } from 'react';
import { Table, Button, Space, Typography, message, Tag, Select, Popconfirm } from 'antd';
import { PlusOutlined, FilePdfOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { VdsCertificate } from '../../types';
import { finalizeCertificate, cancelCertificate } from '../../services/vds';

const { Title } = Typography;

const statusColors: Record<string, string> = {
  draft: 'default',
  finalized: 'green',
  cancelled: 'red',
};

const roleColors: Record<string, string> = {
  deductor: 'blue',
  deductee: 'orange',
};

export default function CertificateList() {
  const [certificates, setCertificates] = useState<VdsCertificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [roleFilter, setRoleFilter] = useState<string | undefined>();
  const navigate = useNavigate();

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (roleFilter) params.set('role', roleFilter);
      const { data } = await api.get(`/vds/certificates?${params}`);
      setCertificates(data.data.certificates);
    } catch {
      message.error('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCertificates(); }, [statusFilter, roleFilter]);

  const handleFinalize = async (id: string) => {
    try {
      await finalizeCertificate(id);
      message.success('Certificate finalized');
      fetchCertificates();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to finalize');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelCertificate(id);
      message.success('Certificate cancelled');
      fetchCertificates();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to cancel');
    }
  };

  const handlePdf = async (id: string, certNo: string) => {
    try {
      const response = await api.get(`/vds/certificates/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `musak66-${certNo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Failed to generate PDF');
    }
  };

  const columns = [
    { title: 'Certificate No', dataIndex: 'certificateNo', key: 'certificateNo' },
    {
      title: 'Role', dataIndex: 'role', key: 'role',
      render: (role: string) => <Tag color={roleColors[role]}>{role}</Tag>,
    },
    { title: 'Date', dataIndex: 'certificateDate', key: 'certificateDate', render: (d: string) => new Date(d).toLocaleDateString('en-GB') },
    { title: 'Counterparty', dataIndex: 'counterpartyName', key: 'counterpartyName' },
    { title: 'BIN', dataIndex: 'counterpartyBin', key: 'counterpartyBin' },
    { title: 'VAT Amount', dataIndex: 'vatAmount', key: 'vatAmount', render: (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
    { title: 'VDS Amount', dataIndex: 'vdsAmount', key: 'vdsAmount', render: (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
    { title: 'Tax Month', dataIndex: 'taxMonth', key: 'taxMonth' },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (status: string) => <Tag color={statusColors[status]}>{status}</Tag>,
    },
    {
      title: 'Actions', key: 'actions',
      render: (_: unknown, record: VdsCertificate) => (
        <Space>
          <Button size="small" icon={<FilePdfOutlined />} onClick={() => handlePdf(record.id, record.certificateNo)} />
          {record.status === 'draft' && (
            <>
              <Popconfirm title="Finalize this certificate?" onConfirm={() => handleFinalize(record.id)}>
                <Button size="small" icon={<CheckOutlined />} type="primary" />
              </Popconfirm>
              <Popconfirm title="Cancel this certificate?" onConfirm={() => handleCancel(record.id)}>
                <Button size="small" icon={<CloseOutlined />} danger />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Musak 6.6 — VDS Certificates</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/vds/certificates/new')}>
          New Certificate
        </Button>
      </div>
      <Space style={{ marginBottom: 16 }}>
        <Select placeholder="Status" allowClear style={{ width: 140 }} onChange={setStatusFilter}
          options={[
            { value: 'draft', label: 'Draft' },
            { value: 'finalized', label: 'Finalized' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
        <Select placeholder="Role" allowClear style={{ width: 140 }} onChange={setRoleFilter}
          options={[
            { value: 'deductor', label: 'Deductor' },
            { value: 'deductee', label: 'Deductee' },
          ]}
        />
      </Space>
      <Table columns={columns} dataSource={certificates} rowKey="id" loading={loading} scroll={{ x: 1200 }} />
    </div>
  );
}
