import { useEffect, useState } from 'react';
import { Table, message } from 'antd';
import { getApSummary } from '../../services/payment';
import { AgingEntry } from '../../types';
import { D, PageHeader, TableWrap } from '../../styles/design';

function fmt(v: number) {
  return '৳ ' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ApPage() {
  const [data, setData] = useState<AgingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getApSummary()
      .then(setData)
      .catch(() => message.error('Failed to load AP summary'))
      .finally(() => setLoading(false));
  }, []);

  const totals = data.reduce(
    (acc, r) => ({
      totalInvoiced: acc.totalInvoiced + r.totalInvoiced,
      totalPaid: acc.totalPaid + r.totalPaid,
      outstanding: acc.outstanding + r.outstanding,
      over90: acc.over90 + r.over90,
    }),
    { totalInvoiced: 0, totalPaid: 0, outstanding: 0, over90: 0 }
  );

  const columns = [
    {
      title: 'Supplier / Party',
      key: 'customer',
      render: (_: unknown, r: AgingEntry) => (
        <span style={{ fontFamily: D.manrope, fontWeight: 600, color: D.onSurface }}>
          {r.customerName || <span style={{ color: D.onSurfaceVar, fontStyle: 'italic' }}>No party</span>}
        </span>
      ),
    },
    {
      title: 'Total Payable',
      key: 'totalInvoiced',
      align: 'right' as const,
      render: (_: unknown, r: AgingEntry) => <span style={{ fontFamily: D.manrope }}>{fmt(r.totalInvoiced)}</span>,
    },
    {
      title: 'Paid',
      key: 'totalPaid',
      align: 'right' as const,
      render: (_: unknown, r: AgingEntry) => <span style={{ fontFamily: D.manrope, color: D.tertiary }}>{fmt(r.totalPaid)}</span>,
    },
    {
      title: 'Outstanding',
      key: 'outstanding',
      align: 'right' as const,
      render: (_: unknown, r: AgingEntry) => (
        <span style={{ fontFamily: D.manrope, fontWeight: 700, color: r.outstanding > 0 ? D.amber : D.tertiary }}>
          {fmt(r.outstanding)}
        </span>
      ),
    },
    {
      title: '0–30 days',
      key: 'current',
      align: 'right' as const,
      render: (_: unknown, r: AgingEntry) => <span style={{ fontFamily: D.manrope, fontSize: 12, color: D.onSurfaceVar }}>{fmt(r.current)}</span>,
    },
    {
      title: '31–60 days',
      key: 'days31_60',
      align: 'right' as const,
      render: (_: unknown, r: AgingEntry) => <span style={{ fontFamily: D.manrope, fontSize: 12, color: r.days31_60 > 0 ? D.amber : D.onSurfaceVar }}>{fmt(r.days31_60)}</span>,
    },
    {
      title: '61–90 days',
      key: 'days61_90',
      align: 'right' as const,
      render: (_: unknown, r: AgingEntry) => <span style={{ fontFamily: D.manrope, fontSize: 12, color: r.days61_90 > 0 ? D.amber : D.onSurfaceVar }}>{fmt(r.days61_90)}</span>,
    },
    {
      title: '90+ days',
      key: 'over90',
      align: 'right' as const,
      render: (_: unknown, r: AgingEntry) => <span style={{ fontFamily: D.manrope, fontSize: 12, color: r.over90 > 0 ? D.red : D.onSurfaceVar }}>{fmt(r.over90)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Accounts Payable"
        title="AP Aging Report"
        sub="Outstanding payables from purchase invoices, grouped by supplier"
      />

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        {[
          { label: 'Total Payable', value: fmt(totals.totalInvoiced), color: D.onSurface },
          { label: 'Total Paid', value: fmt(totals.totalPaid), color: D.tertiary },
          { label: 'Outstanding', value: fmt(totals.outstanding), color: D.amber },
          { label: 'Overdue 90+', value: fmt(totals.over90), color: D.red },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', boxShadow: D.ambient, minWidth: 160, flex: 1 }}>
            <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: D.onSurfaceVar, margin: '0 0 6px' }}>{label}</p>
            <p style={{ fontFamily: D.manrope, fontSize: 20, fontWeight: 800, color, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      <TableWrap>
        <Table
          columns={columns}
          dataSource={data}
          rowKey={r => r.customerId || '__none__'}
          loading={loading}
          pagination={{ pageSize: 50, hideOnSinglePage: true }}
          size="small"
          scroll={{ x: 900 }}
        />
      </TableWrap>
    </div>
  );
}
