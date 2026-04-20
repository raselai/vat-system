import { useEffect, useState } from 'react';
import { Table, message, Select, Popconfirm } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { VdsCertificate } from '../../types';
import { finalizeCertificate, cancelCertificate } from '../../services/vds';
import { D, PageHeader, GradBtn, TonalBtn, TableWrap, FilterBar, StatusChip } from '../../styles/design';

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
    {
      title: 'Certificate No',
      dataIndex: 'certificateNo',
      key: 'certificateNo',
      render: (v: string) => <span style={{ fontFamily: D.manrope, fontWeight: 700, color: D.primary, fontSize: 13 }}>{v}</span>,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (v: string) => <StatusChip status={v} />,
    },
    {
      title: 'Date',
      dataIndex: 'certificateDate',
      key: 'certificateDate',
      render: (d: string) => <span style={{ color: D.onSurfaceVar, fontSize: 13 }}>{new Date(d).toLocaleDateString('en-GB')}</span>,
    },
    {
      title: 'Counterparty',
      dataIndex: 'counterpartyName',
      key: 'counterpartyName',
      render: (v: string) => <span style={{ fontFamily: D.manrope, fontWeight: 600, color: D.onSurface }}>{v}</span>,
    },
    {
      title: 'BIN',
      dataIndex: 'counterpartyBin',
      key: 'counterpartyBin',
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: D.onSurfaceVar }}>{v}</span>,
    },
    {
      title: 'VAT Amount',
      dataIndex: 'vatAmount',
      key: 'vatAmount',
      render: (v: number) => <span style={{ color: D.onSurfaceVar }}>৳ {Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>,
    },
    {
      title: 'VDS Amount',
      dataIndex: 'vdsAmount',
      key: 'vdsAmount',
      render: (v: number) => <span style={{ fontFamily: D.manrope, fontWeight: 700, color: D.onSurface }}>৳ {Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>,
    },
    {
      title: 'Tax Month',
      dataIndex: 'taxMonth',
      key: 'taxMonth',
      render: (v: string) => <span style={{ color: D.onSurfaceVar, fontSize: 13 }}>{v}</span>,
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
      render: (_: unknown, record: VdsCertificate) => (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <TonalBtn icon="picture_as_pdf" size="sm" onClick={() => handlePdf(record.id, record.certificateNo)}>PDF</TonalBtn>
          {record.status === 'draft' && (
            <>
              <Popconfirm title="Finalize this certificate?" onConfirm={() => handleFinalize(record.id)}>
                <TonalBtn icon="check_circle" size="sm">Finalize</TonalBtn>
              </Popconfirm>
              <Popconfirm title="Cancel this certificate?" onConfirm={() => handleCancel(record.id)}>
                <TonalBtn icon="cancel" size="sm" danger>Cancel</TonalBtn>
              </Popconfirm>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ fontFamily: D.inter, color: D.onSurface }}>
      <PageHeader
        eyebrow="Musak 6.6"
        title="VDS Certificates"
        action={<GradBtn icon="add" onClick={() => navigate('/vds/certificates/new')}>New Certificate</GradBtn>}
      />
      <FilterBar>
        <Select
          placeholder="All Statuses"
          allowClear
          style={{ width: 160 }}
          onChange={setStatusFilter}
          options={[
            { value: 'draft', label: 'Draft' },
            { value: 'finalized', label: 'Finalized' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
        <Select
          placeholder="All Roles"
          allowClear
          style={{ width: 160 }}
          onChange={setRoleFilter}
          options={[
            { value: 'deductor', label: 'Deductor' },
            { value: 'deductee', label: 'Deductee' },
          ]}
        />
      </FilterBar>
      <TableWrap>
        <Table columns={columns} dataSource={certificates} rowKey="id" loading={loading} scroll={{ x: 1200 }} />
      </TableWrap>
    </div>
  );
}
