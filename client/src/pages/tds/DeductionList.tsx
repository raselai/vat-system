import { useEffect, useState } from 'react';
import { Table, Select, message, Popconfirm } from 'antd';
import { useNavigate } from 'react-router-dom';
import { listDeductions, finalizeDeduction, cancelDeduction } from '../../services/tds';
import { TdsDeduction } from '../../types';
import { D, PageHeader, TableWrap, FilterBar, StatusChip, GradBtn, TonalBtn } from '../../styles/design';

const SECTION_OPTIONS = [
  { value: '52', label: '52 — Supply of goods' },
  { value: '52A', label: '52A — Machinery & equipment' },
  { value: '52B', label: '52B — Construction works' },
  { value: '53', label: '53 — Interest' },
  { value: '55', label: '55 — Advertisement' },
  { value: '56A', label: '56A — Transport' },
  { value: '57', label: '57 — Rent' },
];

function fmt(v: number) {
  return '৳ ' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DeductionList() {
  const navigate = useNavigate();
  const [deductions, setDeductions] = useState<TdsDeduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sectionFilter, setSectionFilter] = useState<string>('');

  const fetchDeductions = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (sectionFilter) params.sectionCode = sectionFilter;
    listDeductions(params)
      .then(r => setDeductions(r.deductions))
      .catch(() => message.error('Failed to load TDS deductions'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDeductions(); }, [statusFilter, sectionFilter]);

  const handleFinalize = async (id: string) => {
    try {
      await finalizeDeduction(id);
      message.success('Deduction finalized');
      fetchDeductions();
    } catch (err: any) { message.error(err.response?.data?.error || 'Failed to finalize'); }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelDeduction(id);
      message.success('Deduction cancelled');
      fetchDeductions();
    } catch (err: any) { message.error(err.response?.data?.error || 'Failed to cancel'); }
  };

  const columns = [
    {
      title: 'Deduction No',
      key: 'deductionNo',
      render: (_: unknown, r: TdsDeduction) => (
        <span style={{ fontFamily: D.manrope, fontWeight: 700, color: D.primary }}>{r.deductionNo}</span>
      ),
    },
    {
      title: 'Section',
      key: 'section',
      render: (_: unknown, r: TdsDeduction) => (
        <span style={{ fontFamily: D.manrope, fontWeight: 600, fontSize: 12 }}>{r.sectionCode}</span>
      ),
    },
    {
      title: 'Date',
      key: 'date',
      render: (_: unknown, r: TdsDeduction) => new Date(r.deductionDate).toLocaleDateString('en-GB'),
    },
    {
      title: 'Deductee',
      key: 'deductee',
      render: (_: unknown, r: TdsDeduction) => (
        <div>
          <p style={{ fontFamily: D.manrope, fontWeight: 600, margin: 0, fontSize: 13 }}>{r.deducteeName}</p>
          <p style={{ fontFamily: D.inter, fontSize: 11, color: D.onSurfaceVar, margin: 0 }}>TIN: {r.deducteeTin}</p>
        </div>
      ),
    },
    {
      title: 'Gross Amount',
      key: 'grossAmount',
      align: 'right' as const,
      render: (_: unknown, r: TdsDeduction) => <span style={{ fontFamily: D.manrope }}>{fmt(r.grossAmount)}</span>,
    },
    {
      title: 'TDS Rate',
      key: 'tdsRate',
      align: 'right' as const,
      render: (_: unknown, r: TdsDeduction) => <span style={{ fontFamily: D.manrope }}>{r.tdsRate}%</span>,
    },
    {
      title: 'TDS Amount',
      key: 'tdsAmount',
      align: 'right' as const,
      render: (_: unknown, r: TdsDeduction) => (
        <span style={{ fontFamily: D.manrope, fontWeight: 700, color: D.primary }}>{fmt(r.tdsAmount)}</span>
      ),
    },
    { title: 'Month', key: 'taxMonth', dataIndex: 'taxMonth' },
    {
      title: 'Status',
      key: 'status',
      render: (_: unknown, r: TdsDeduction) => <StatusChip status={r.status} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, r: TdsDeduction) => (
        <div style={{ display: 'flex', gap: 6 }}>
          {r.status === 'draft' && (
            <>
              <TonalBtn size="sm" icon="check_circle" onClick={() => handleFinalize(r.id)}>Finalize</TonalBtn>
              <Popconfirm title="Cancel this deduction?" onConfirm={() => handleCancel(r.id)}>
                <TonalBtn size="sm" icon="cancel" danger>Cancel</TonalBtn>
              </Popconfirm>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Income Tax"
        title="TDS Deductions"
        sub="Tax deducted at source — draft → finalize → link to payment"
        action={<GradBtn icon="add" onClick={() => navigate('/tds/deductions/new')}>New Deduction</GradBtn>}
      />
      <FilterBar>
        <Select
          placeholder="All Statuses"
          value={statusFilter || undefined}
          allowClear
          onChange={v => setStatusFilter(v || '')}
          style={{ width: 160 }}
          options={[
            { value: 'draft', label: 'Draft' },
            { value: 'finalized', label: 'Finalized' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
        <Select
          placeholder="All Sections"
          value={sectionFilter || undefined}
          allowClear
          onChange={v => setSectionFilter(v || '')}
          style={{ width: 220 }}
          options={SECTION_OPTIONS}
        />
      </FilterBar>
      <TableWrap>
        <Table
          columns={columns}
          dataSource={deductions}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 50, hideOnSinglePage: true }}
          size="small"
          scroll={{ x: 1100 }}
        />
      </TableWrap>
    </div>
  );
}
