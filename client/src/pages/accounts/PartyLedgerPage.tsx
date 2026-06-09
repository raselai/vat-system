import { useEffect, useState, useCallback } from 'react';
import { Table, message, Select, DatePicker } from 'antd';
import { Link } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import api from '../../services/api';
import { getPartyLedger } from '../../services/payment';
import { Customer, PartyLedgerEntry, PartyLedgerResult } from '../../types';
import { D, PageHeader, TableWrap, StatusChip } from '../../styles/design';

function fmt(v: number) {
  return '৳ ' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PartyLedgerPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState<string>();
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [result, setResult] = useState<PartyLedgerResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/customers')
      .then(({ data }) => setCustomers(data.data || []))
      .catch(() => message.error('Failed to load customers'));
  }, []);

  const fetchLedger = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      setResult(await getPartyLedger({
        customerId,
        from: range ? range[0].format('YYYY-MM-DD') : undefined,
        to: range ? range[1].format('YYYY-MM-DD') : undefined,
      }));
    } catch {
      message.error('Failed to load party ledger');
    } finally {
      setLoading(false);
    }
  }, [customerId, range]);

  useEffect(() => { fetchLedger(); }, [fetchLedger]);

  const columns = [
    { title: 'SL', dataIndex: 'sl', key: 'sl', width: 50, render: (v: number) => <span style={{ color: D.onSurfaceVar, fontSize: 12 }}>{v}</span> },
    { title: 'Date', dataIndex: 'date', key: 'date', render: (v: string) => <span style={{ fontFamily: D.manrope, fontSize: 13 }}>{dayjs(v).format('DD/MM/YYYY')}</span> },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (v: string) => <StatusChip status={v} />,
    },
    {
      title: 'Challan',
      key: 'challanNo',
      render: (_: unknown, r: PartyLedgerEntry) => {
        const invoiceId = r.type === 'invoice' ? r.refId : null;
        return invoiceId
          ? <Link to={`/invoices/${invoiceId}`} style={{ fontFamily: 'monospace', fontSize: 12, color: D.primary, fontWeight: 600 }}>{r.challanNo}</Link>
          : <span style={{ fontFamily: 'monospace', fontSize: 12, color: D.onSurfaceVar }}>{r.challanNo}</span>;
      },
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      className: 'hidden md:table-cell',
      render: (v: string) => <span style={{ color: D.onSurfaceVar, fontSize: 13 }}>{v}</span>,
    },
    {
      title: 'Debit',
      dataIndex: 'debit',
      key: 'debit',
      align: 'right' as const,
      render: (v: number) => v > 0 ? <span style={{ fontFamily: D.manrope, fontWeight: 600, color: D.onSurface }}>{fmt(v)}</span> : <span style={{ color: D.onSurfaceVar }}>—</span>,
    },
    {
      title: 'Credit',
      dataIndex: 'credit',
      key: 'credit',
      align: 'right' as const,
      render: (v: number) => v > 0 ? <span style={{ fontFamily: D.manrope, fontWeight: 600, color: D.tertiary }}>{fmt(v)}</span> : <span style={{ color: D.onSurfaceVar }}>—</span>,
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right' as const,
      render: (v: number) => (
        <span style={{ fontFamily: D.manrope, fontWeight: 700, color: v > 0 ? D.red : v < 0 ? D.amber : D.tertiary }}>{fmt(v)}</span>
      ),
    },
  ];

  const summary = result?.summary;
  const closing = summary?.closingBalance ?? 0;

  return (
    <div style={{ fontFamily: D.inter, color: D.onSurface }}>
      <PageHeader
        eyebrow="Accounts"
        title="Party Ledger"
        sub="Invoice and payment statement per customer or supplier, with running balance"
      />

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <Select
          style={{ minWidth: 260 }}
          showSearch
          optionFilterProp="label"
          value={customerId}
          onChange={setCustomerId}
          options={customers.map(c => ({ value: c.id, label: c.name }))}
          placeholder="Select customer / supplier"
        />
        <DatePicker.RangePicker
          value={range}
          onChange={v => setRange(v as [Dayjs, Dayjs] | null)}
          format="DD/MM/YYYY"
          allowClear
        />
      </div>

      {result && summary && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          {[
            { label: 'Brought Forward', value: fmt(result.broughtForward), color: D.onSurface },
            { label: 'Total Debit', value: fmt(summary.totalDebit), color: D.onSurface },
            { label: 'Total Credit', value: fmt(summary.totalCredit), color: D.tertiary },
            {
              label: closing > 0 ? 'They Owe Us' : closing < 0 ? 'We Owe Them' : 'Settled',
              value: fmt(Math.abs(closing)),
              color: closing > 0 ? D.red : closing < 0 ? D.amber : D.tertiary,
            },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', boxShadow: D.ambient, minWidth: 160, flex: 1 }}>
              <p style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: D.onSurfaceVar, margin: '0 0 6px' }}>{label}</p>
              <p style={{ fontFamily: D.manrope, fontSize: 20, fontWeight: 800, color, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <TableWrap>
        <Table
          columns={columns}
          dataSource={result?.entries || []}
          rowKey={r => `${r.type}-${r.refId}`}
          loading={loading}
          pagination={{ pageSize: 50, hideOnSinglePage: true }}
          size="small"
          scroll={{ x: 900 }}
          locale={{ emptyText: customerId ? 'No transactions for this party' : 'Select a customer or supplier to view their statement' }}
        />
      </TableWrap>
    </div>
  );
}
