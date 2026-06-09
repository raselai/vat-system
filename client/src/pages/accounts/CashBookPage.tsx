import { useEffect, useState, useCallback } from 'react';
import { Table, message, Select, DatePicker } from 'antd';
import { Link } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import { listPaymentAccounts, getCashBook } from '../../services/payment';
import { PaymentAccount, CashBookEntry, CashBookResult } from '../../types';
import { D, PageHeader, TableWrap } from '../../styles/design';

function fmt(v: number) {
  return '৳ ' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CashBookPage() {
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [accountId, setAccountId] = useState<string>();
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [result, setResult] = useState<CashBookResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listPaymentAccounts()
      .then(accs => {
        setAccounts(accs);
        setAccountId(accs.length > 0 ? accs[0].id : 'unassigned');
      })
      .catch(() => message.error('Failed to load payment accounts'));
  }, []);

  const fetchBook = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      setResult(await getCashBook({
        accountId,
        from: range ? range[0].format('YYYY-MM-DD') : undefined,
        to: range ? range[1].format('YYYY-MM-DD') : undefined,
      }));
    } catch {
      message.error('Failed to load cash book');
    } finally {
      setLoading(false);
    }
  }, [accountId, range]);

  useEffect(() => { fetchBook(); }, [fetchBook]);

  const accountOptions = [
    ...accounts.map(a => ({ value: a.id, label: a.bankName ? `${a.name} — ${a.bankName}` : a.name })),
    { value: 'unassigned', label: 'Unassigned (no account)' },
  ];

  const columns = [
    { title: 'SL', dataIndex: 'sl', key: 'sl', width: 50, render: (v: number) => <span style={{ color: D.onSurfaceVar, fontSize: 12 }}>{v}</span> },
    { title: 'Date', dataIndex: 'date', key: 'date', render: (v: string) => <span style={{ fontFamily: D.manrope, fontSize: 13 }}>{dayjs(v).format('DD/MM/YYYY')}</span> },
    {
      title: 'Challan',
      key: 'challanNo',
      render: (_: unknown, r: CashBookEntry) => (
        <Link to={`/invoices/${r.invoiceId}`} style={{ fontFamily: 'monospace', fontSize: 12, color: D.primary, fontWeight: 600 }}>{r.challanNo}</Link>
      ),
    },
    {
      title: 'Party',
      dataIndex: 'partyName',
      key: 'partyName',
      className: 'hidden md:table-cell',
      render: (v: string | null) => <span style={{ color: D.onSurfaceVar, fontSize: 13 }}>{v || '—'}</span>,
    },
    {
      title: 'Method',
      dataIndex: 'method',
      key: 'method',
      className: 'hidden lg:table-cell',
      render: (v: string) => <span style={{ color: D.onSurfaceVar, fontSize: 12, textTransform: 'capitalize' }}>{v.replace(/_/g, ' ')}</span>,
    },
    {
      title: 'Reference',
      dataIndex: 'reference',
      key: 'reference',
      className: 'hidden lg:table-cell',
      render: (v: string | null) => <span style={{ color: D.onSurfaceVar, fontSize: 12 }}>{v || '—'}</span>,
    },
    {
      title: 'Money In',
      dataIndex: 'moneyIn',
      key: 'moneyIn',
      align: 'right' as const,
      render: (v: number) => v > 0 ? <span style={{ fontFamily: D.manrope, fontWeight: 600, color: D.tertiary }}>{fmt(v)}</span> : <span style={{ color: D.onSurfaceVar }}>—</span>,
    },
    {
      title: 'Money Out',
      dataIndex: 'moneyOut',
      key: 'moneyOut',
      align: 'right' as const,
      render: (v: number) => v > 0 ? <span style={{ fontFamily: D.manrope, fontWeight: 600, color: D.red }}>{fmt(v)}</span> : <span style={{ color: D.onSurfaceVar }}>—</span>,
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right' as const,
      render: (v: number) => <span style={{ fontFamily: D.manrope, fontWeight: 700, color: v < 0 ? D.red : D.onSurface }}>{fmt(v)}</span>,
    },
  ];

  const summary = result?.summary;

  return (
    <div style={{ fontFamily: D.inter, color: D.onSurface }}>
      <PageHeader
        eyebrow="Accounts"
        title="Cash & Bank Book"
        sub="Money in and out per account, with running balance"
      />

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <Select
          style={{ minWidth: 260 }}
          value={accountId}
          onChange={setAccountId}
          options={accountOptions}
          placeholder="Select account"
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
            { label: 'Money In', value: fmt(summary.totalIn), color: D.tertiary },
            { label: 'Money Out', value: fmt(summary.totalOut), color: D.red },
            { label: 'Closing Balance', value: fmt(summary.closingBalance), color: summary.closingBalance < 0 ? D.red : D.primary },
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
          rowKey="paymentId"
          loading={loading}
          pagination={{ pageSize: 50, hideOnSinglePage: true }}
          size="small"
          scroll={{ x: 900 }}
        />
      </TableWrap>
    </div>
  );
}
