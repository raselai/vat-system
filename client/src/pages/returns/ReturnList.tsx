import { useEffect, useState } from 'react';
import { Table, Button, Space, Typography, message, Tag, Select, Popconfirm, DatePicker } from 'antd';
import { SyncOutlined, FilePdfOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { VatReturn, VatReturnStatus } from '../../types';
import { listReturns, generateReturn, downloadReturnPdf } from '../../services/return';

const { Title } = Typography;

const statusColors: Record<VatReturnStatus, string> = {
  draft: 'default',
  reviewed: 'blue',
  submitted: 'orange',
  locked: 'green',
};

export default function ReturnList() {
  const [returns, setReturns] = useState<VatReturn[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [fiscalYear, setFiscalYear] = useState<string | undefined>();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const data = await listReturns(fiscalYear);
      setReturns(data);
    } catch {
      message.error('Failed to load returns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReturns(); }, [fiscalYear]);

  const handleGenerate = async () => {
    if (!selectedMonth) return message.warning('Select a tax month first');
    setGenerating(true);
    try {
      await generateReturn(selectedMonth);
      message.success(`Return for ${selectedMonth} generated`);
      fetchReturns();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to generate return');
    } finally {
      setGenerating(false);
    }
  };

  const handlePdf = async (id: string, taxMonth: string) => {
    try {
      await downloadReturnPdf(id, taxMonth);
    } catch {
      message.error('Failed to generate PDF');
    }
  };

  const columns = [
    { title: 'Tax Month', dataIndex: 'taxMonth', key: 'taxMonth' },
    { title: 'Fiscal Year', dataIndex: 'fiscalYear', key: 'fiscalYear' },
    {
      title: 'Output VAT', dataIndex: 'outputVat', key: 'outputVat',
      render: (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    },
    {
      title: 'Input VAT', dataIndex: 'inputVat', key: 'inputVat',
      render: (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    },
    {
      title: 'Net Payable', dataIndex: 'netPayable', key: 'netPayable',
      render: (v: number) => (
        <strong>{v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
      ),
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (s: VatReturnStatus) => <Tag color={statusColors[s]}>{s.toUpperCase()}</Tag>,
    },
    {
      title: 'Actions', key: 'actions',
      render: (_: unknown, record: VatReturn) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/returns/${record.id}`)}>
            View
          </Button>
          <Button size="small" icon={<FilePdfOutlined />} onClick={() => handlePdf(record.id, record.taxMonth)} />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>মূসক-৯.১ / Musak 9.1 — Monthly Returns</Title>
      </div>
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="Fiscal Year"
          allowClear
          style={{ width: 160 }}
          onChange={setFiscalYear}
          options={[
            { value: '2025-2026', label: '2025-2026' },
            { value: '2024-2025', label: '2024-2025' },
          ]}
        />
        <DatePicker
          picker="month"
          placeholder="Select tax month"
          onChange={(date) => setSelectedMonth(date ? date.format('YYYY-MM') : null)}
          value={selectedMonth ? dayjs(selectedMonth, 'YYYY-MM') : null}
        />
        <Popconfirm
          title={`Generate return for ${selectedMonth || '...'}?`}
          onConfirm={handleGenerate}
          disabled={!selectedMonth}
        >
          <Button
            type="primary"
            icon={<SyncOutlined />}
            loading={generating}
            disabled={!selectedMonth}
          >
            Generate
          </Button>
        </Popconfirm>
      </Space>
      <Table columns={columns} dataSource={returns} rowKey="id" loading={loading} />
    </div>
  );
}
