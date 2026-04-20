import { useEffect, useState } from 'react';
import { Table, message, DatePicker } from 'antd';
import dayjs from 'dayjs';
import { RegisterResult } from '../../types';
import { getRegister, downloadRegisterPdf } from '../../services/register';
import { D, Icon, PageHeader, TonalBtn, TableWrap } from '../../styles/design';

const fmt = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2 });

interface RegisterPageProps {
  type: 'sales' | 'purchase';
  title: string;
}

export default function RegisterPage({ type, title }: RegisterPageProps) {
  const [data, setData]         = useState<RegisterResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [taxMonth, setTaxMonth] = useState<string>(dayjs().format('YYYY-MM'));

  const fetchRegister = async () => {
    setLoading(true);
    try {
      const result = await getRegister(type, taxMonth);
      setData(result);
    } catch {
      message.error('Failed to load register');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRegister(); }, [taxMonth, type]);

  const handlePdf = async () => {
    setPdfLoading(true);
    try {
      await downloadRegisterPdf(type, taxMonth);
    } catch {
      message.error('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const summary = data?.summary;

  const columns = [
    { title: 'SL', dataIndex: 'sl', key: 'sl', width: 50, render: (v: number) => <span style={{ color: D.onSurfaceVar }}>{v}</span> },
    { title: 'Challan No', dataIndex: 'challanNo', key: 'challanNo', width: 140,
      render: (v: string) => <span style={{ fontFamily: D.manrope, fontWeight: 700, color: D.primary, fontSize: 13 }}>{v}</span> },
    { title: 'Date', dataIndex: 'challanDate', key: 'challanDate', width: 100,
      render: (d: string) => <span style={{ color: D.onSurfaceVar, fontSize: 13 }}>{new Date(d).toLocaleDateString('en-GB')}</span> },
    { title: type === 'sales' ? 'Buyer' : 'Seller', dataIndex: 'customerName', key: 'customerName',
      render: (v: string | null) => <span style={{ fontFamily: D.manrope, fontWeight: 600, color: D.onSurface }}>{v || '—'}</span> },
    { title: 'BIN', dataIndex: 'customerBin', key: 'customerBin', width: 130,
      render: (v: string | null) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: D.onSurfaceVar }}>{v || '—'}</span> },
    { title: 'Taxable Value', dataIndex: 'subtotal', key: 'subtotal', width: 130, align: 'right' as const,
      render: fmt },
    { title: 'SD', dataIndex: 'sdTotal', key: 'sdTotal', width: 90, align: 'right' as const,
      render: (v: number) => <span style={{ color: D.onSurfaceVar }}>{fmt(v)}</span> },
    { title: 'VAT', dataIndex: 'vatTotal', key: 'vatTotal', width: 120, align: 'right' as const,
      render: (v: number) => <span style={{ fontFamily: D.manrope, fontWeight: 700, color: D.onSurface }}>{fmt(v)}</span> },
    { title: 'Specific Duty', dataIndex: 'specificDutyTotal', key: 'specificDutyTotal', width: 110, align: 'right' as const,
      render: (v: number) => <span style={{ color: D.onSurfaceVar }}>{fmt(v)}</span> },
    { title: 'Grand Total', dataIndex: 'grandTotal', key: 'grandTotal', width: 130, align: 'right' as const,
      render: (v: number) => <span style={{ fontFamily: D.manrope, fontWeight: 800, color: D.onSurface }}>{fmt(v)}</span> },
    { title: 'VDS', dataIndex: 'vdsAmount', key: 'vdsAmount', width: 100, align: 'right' as const,
      render: (v: number) => <span style={{ color: D.onSurfaceVar }}>{fmt(v)}</span> },
    { title: 'Net Receivable', dataIndex: 'netReceivable', key: 'netReceivable', width: 130, align: 'right' as const,
      render: (v: number) => <span style={{ fontFamily: D.manrope, fontWeight: 700, color: D.tertiary }}>{fmt(v)}</span> },
  ];

  return (
    <div style={{ fontFamily: D.inter, color: D.onSurface }}>
      <PageHeader
        eyebrow={type === 'sales' ? 'মূসক-৬.৭ / Musak 6.7' : 'মূসক-৬.৭ / Musak 6.7'}
        title={title}
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <DatePicker
              picker="month"
              value={dayjs(taxMonth, 'YYYY-MM')}
              onChange={(d) => setTaxMonth(d?.format('YYYY-MM') || dayjs().format('YYYY-MM'))}
              allowClear={false}
              format="MMM YYYY"
              style={{ width: 130 }}
            />
            <TonalBtn icon="picture_as_pdf" loading={pdfLoading} onClick={handlePdf}>
              PDF
            </TonalBtn>
          </div>
        }
      />

      {/* Summary KPI strip */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" style={{ marginBottom: 24 }}>
          {([
            { label: 'Invoices',      value: String(summary.totalInvoices), icon: 'receipt_long'   },
            { label: 'Taxable Value', value: `৳ ${fmt(summary.subtotal)}`,  icon: 'attach_money'   },
            { label: 'VAT Total',     value: `৳ ${fmt(summary.vatTotal)}`,  icon: 'percent'        },
            { label: 'Grand Total',   value: `৳ ${fmt(summary.grandTotal)}`, icon: 'payments', featured: true },
            { label: 'VDS',           value: `৳ ${fmt(summary.vdsAmount)}`, icon: 'verified'       },
            { label: 'Net Receivable', value: `৳ ${fmt(summary.netReceivable)}`, icon: 'account_balance' },
          ]).map(({ label, value, icon, featured }) => (
            <div
              key={label}
              style={{
                borderRadius: 14, padding: '1rem',
                background: featured ? D.grad : D.surfaceBright,
                boxShadow: featured ? '0 12px 40px rgba(0,29,82,0.16)' : D.ambient,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Icon name={icon} size={14} style={{ color: featured ? 'rgba(255,255,255,0.7)' : D.onSurfaceVar }} />
                <p style={{ fontFamily: D.manrope, fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: featured ? 'rgba(255,255,255,0.65)' : D.onSurfaceVar }}>
                  {label}
                </p>
              </div>
              <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 13, color: featured ? '#fff' : D.onSurface, lineHeight: 1 }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      <TableWrap>
        <Table
          columns={columns}
          dataSource={data?.entries || []}
          rowKey="invoiceId"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={false}
          size="small"
          summary={() =>
            summary && summary.totalInvoices > 0 ? (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: D.surfaceLow }}>
                  <Table.Summary.Cell index={0} colSpan={5}>
                    <span style={{ fontFamily: D.manrope, fontWeight: 800, color: D.onSurface }}>Total</span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right"><span style={{ fontFamily: D.manrope, fontWeight: 700 }}>{fmt(summary.subtotal)}</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="right"><span style={{ color: D.onSurfaceVar }}>{fmt(summary.sdTotal)}</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={7} align="right"><span style={{ fontFamily: D.manrope, fontWeight: 700, color: D.onSurface }}>{fmt(summary.vatTotal)}</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={8} align="right"><span style={{ color: D.onSurfaceVar }}>{fmt(summary.specificDutyTotal)}</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={9} align="right"><span style={{ fontFamily: D.manrope, fontWeight: 800, color: D.onSurface }}>{fmt(summary.grandTotal)}</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={10} align="right"><span style={{ color: D.onSurfaceVar }}>{fmt(summary.vdsAmount)}</span></Table.Summary.Cell>
                  <Table.Summary.Cell index={11} align="right"><span style={{ fontFamily: D.manrope, fontWeight: 800, color: D.tertiary }}>{fmt(summary.netReceivable)}</span></Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            ) : null
          }
        />
      </TableWrap>
    </div>
  );
}
