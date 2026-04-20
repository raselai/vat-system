import { useEffect, useState } from 'react';
import { Table, message, Select, Popconfirm, DatePicker } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { VatReturn, VatReturnStatus } from '../../types';
import { listReturns, generateReturn, downloadReturnPdf } from '../../services/return';
import { D, PageHeader, GradBtn, TonalBtn, TableWrap, FilterBar, StatusChip } from '../../styles/design';

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
    {
      title: 'Tax Month',
      dataIndex: 'taxMonth',
      key: 'taxMonth',
      render: (v: string) => <span style={{ fontFamily: D.manrope, fontWeight: 700, color: D.primary, fontSize: 13 }}>{v}</span>,
    },
    {
      title: 'Fiscal Year',
      dataIndex: 'fiscalYear',
      key: 'fiscalYear',
      render: (v: string) => <span style={{ color: D.onSurfaceVar, fontSize: 13 }}>{v}</span>,
    },
    {
      title: 'Output VAT',
      dataIndex: 'outputVat',
      key: 'outputVat',
      render: (v: number) => <span style={{ color: D.onSurfaceVar }}>৳ {Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>,
    },
    {
      title: 'Input VAT',
      dataIndex: 'inputVat',
      key: 'inputVat',
      render: (v: number) => <span style={{ color: D.onSurfaceVar }}>৳ {Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>,
    },
    {
      title: 'Net Payable',
      dataIndex: 'netPayable',
      key: 'netPayable',
      render: (v: number) => (
        <span style={{ fontFamily: D.manrope, fontWeight: 800, color: D.primary, fontSize: 14 }}>
          ৳ {Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: VatReturnStatus) => <StatusChip status={s} />,
    },
    {
      title: '',
      key: 'actions',
      render: (_: unknown, record: VatReturn) => (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <TonalBtn icon="visibility" size="sm" onClick={() => navigate(`/returns/${record.id}`)}>View</TonalBtn>
          <TonalBtn icon="picture_as_pdf" size="sm" onClick={() => handlePdf(record.id, record.taxMonth)}>PDF</TonalBtn>
        </div>
      ),
    },
  ];

  return (
    <div style={{ fontFamily: D.inter, color: D.onSurface }}>
      <PageHeader
        eyebrow="মূসক-৯.১ / Musak 9.1"
        title="Monthly Returns"
      />
      <FilterBar>
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
          placeholder="Tax month to generate"
          onChange={(date) => setSelectedMonth(date ? date.format('YYYY-MM') : null)}
          value={selectedMonth ? dayjs(selectedMonth, 'YYYY-MM') : null}
        />
        <Popconfirm
          title={`Generate return for ${selectedMonth || '...'}?`}
          onConfirm={handleGenerate}
          disabled={!selectedMonth}
        >
          <GradBtn icon="sync" loading={generating} disabled={!selectedMonth} size="sm">
            Generate
          </GradBtn>
        </Popconfirm>
      </FilterBar>
      <TableWrap>
        <Table columns={columns} dataSource={returns} rowKey="id" loading={loading} />
      </TableWrap>
    </div>
  );
}
