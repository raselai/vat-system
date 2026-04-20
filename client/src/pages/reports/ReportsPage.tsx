import { useState, useEffect, useCallback } from 'react';
import { Tabs, DatePicker, Spin, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useCompany } from '../../contexts/CompanyContext';
import {
  getVatSummary,
  getVatPayable,
  getSalesSummary,
  getPurchaseSummary,
  getVdsSummary,
  downloadReport,
} from '../../services/reports.service';
import type {
  VatSummary,
  VatPayable,
  VatBand,
  InvoiceSummary,
  SummaryRow,
  ReportVdsSummary,
} from '../../types';
import { D, Icon, PageHeader, TonalBtn, TableWrap, SLCard } from '../../styles/design';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

// ─── Export bar ───────────────────────────────────────────────────────────────

function ExportBar({ reportType, taxMonth }: { reportType: string; taxMonth: string }) {
  const [dlPdf,  setDlPdf]  = useState(false);
  const [dlXlsx, setDlXlsx] = useState(false);

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
      <TonalBtn
        icon="picture_as_pdf"
        size="sm"
        onClick={async () => {
          setDlPdf(true);
          await downloadReport(reportType, taxMonth, 'pdf').finally(() => setDlPdf(false));
        }}
        disabled={dlPdf}
      >
        PDF
      </TonalBtn>
      <TonalBtn
        icon="table_view"
        size="sm"
        onClick={async () => {
          setDlXlsx(true);
          await downloadReport(reportType, taxMonth, 'xlsx').finally(() => setDlXlsx(false));
        }}
        disabled={dlXlsx}
      >
        Excel
      </TonalBtn>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon, featured,
}: {
  label: string; value: string; sub?: string; icon: string; featured?: boolean;
}) {
  return (
    <div style={{
      borderRadius: 18, padding: '1.5rem',
      background: featured ? D.grad : D.surfaceBright,
      boxShadow: featured ? '0 24px 60px rgba(0,29,82,0.18)' : D.ambient,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: featured ? 'rgba(255,255,255,0.14)' : D.surfaceLow }}>
        <Icon name={icon} size={18} style={{ color: featured ? '#fff' : D.primary }} />
      </div>
      <p style={{ fontFamily: D.manrope, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: featured ? 'rgba(255,255,255,0.65)' : D.onSurfaceVar, marginBottom: 6 }}>
        {label}
      </p>
      <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 'clamp(1.3rem,2.5vw,1.75rem)', letterSpacing: '-0.04em', lineHeight: 1.1, color: featured ? '#fff' : D.onSurface, marginBottom: 4 }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: 11, color: featured ? 'rgba(255,255,255,0.55)' : D.onSurfaceVar, lineHeight: 1.4 }}>
          {sub}
        </p>
      )}
      {/* Decorative background icon */}
      <span
        className="material-symbols-outlined"
        style={{
          position: 'absolute', right: -8, bottom: -8,
          fontSize: 72, color: featured ? 'rgba(255,255,255,0.06)' : 'rgba(0,29,82,0.04)',
          lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
        }}
      >
        {icon}
      </span>
    </div>
  );
}

// ─── VAT Summary tab ──────────────────────────────────────────────────────────

function VatSummaryTab({ data }: { data: VatSummary }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Output VAT"     value={`৳ ${fmt(data.outputVat)}`}   sub={`${data.salesCount} sales`}     icon="receipt"         />
        <KpiCard label="Input VAT"      value={`৳ ${fmt(data.inputVat)}`}    sub={`${data.purchaseCount} purchases`} icon="credit_card"    />
        <KpiCard label="SD Payable"     value={`৳ ${fmt(data.sdPayable)}`}                                          icon="payments"        />
        <KpiCard label="VDS Credit"     value={`৳ ${fmt(data.vdsCredit)}`}                                          icon="verified"        />
        <KpiCard label="Net VAT Payable" value={`৳ ${fmt(data.netPayable)}`} sub="Output + SD − Input − VDS"       icon="account_balance" featured />
      </div>

      {/* Breakdown card */}
      <div style={{ background: D.surfaceLow, borderRadius: 16, padding: '1.5rem', maxWidth: 440 }}>
        <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 14 }}>
          Calculation Breakdown
        </p>
        {([
          { label: 'Total Sales Value',     value: `৳ ${fmt(data.totalSalesValue)}` },
          { label: 'Total Purchase Value',  value: `৳ ${fmt(data.totalPurchaseValue)}` },
          { label: 'Output VAT',            value: `+ ৳ ${fmt(data.outputVat)}` },
          { label: 'SD Payable',            value: `+ ৳ ${fmt(data.sdPayable)}` },
          { label: 'Input VAT Credit',      value: `− ৳ ${fmt(data.inputVat)}` },
          { label: 'VDS Credit',            value: `− ৳ ${fmt(data.vdsCredit)}` },
        ]).map((row, i, arr) => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(196,198,207,0.15)' : 'none' }}>
            <span style={{ fontSize: 12, color: D.onSurfaceVar }}>{row.label}</span>
            <span style={{ fontFamily: D.manrope, fontWeight: 700, fontSize: 13, color: D.onSurface }}>{row.value}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginTop: 4 }}>
          <span style={{ fontFamily: D.manrope, fontWeight: 700, fontSize: 13, color: D.onSurface }}>Net VAT Payable</span>
          <span style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 18, color: D.primary }}>৳ {fmt(data.netPayable)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── VAT Payable tab ──────────────────────────────────────────────────────────

function VatPayableTab({ data }: { data: VatPayable }) {
  const columns: ColumnsType<VatBand> = [
    { title: 'VAT Rate (%)', dataIndex: 'vatRate', key: 'vatRate', render: (v: number) => <span style={{ fontFamily: D.manrope, fontWeight: 700, color: D.primary }}>{v}%</span> },
    { title: 'Taxable Value (BDT)', dataIndex: 'taxableValue', key: 'taxableValue', align: 'right', render: (v: number) => <span style={{ fontFamily: D.manrope, fontWeight: 600, color: D.onSurface }}>{fmt(v)}</span> },
    { title: 'SD Amount (BDT)', dataIndex: 'sdAmount', key: 'sdAmount', align: 'right', render: (v: number) => <span style={{ color: D.onSurfaceVar }}>{fmt(v)}</span> },
    { title: 'VAT Amount (BDT)', dataIndex: 'vatAmount', key: 'vatAmount', align: 'right', render: (v: number) => <span style={{ fontFamily: D.manrope, fontWeight: 800, color: D.onSurface }}>{fmt(v)}</span> },
    { title: 'Invoice Count', dataIndex: 'invoiceCount', key: 'invoiceCount', align: 'center', render: (v: number) => <span style={{ color: D.onSurfaceVar }}>{v}</span> },
  ];

  return (
    <TableWrap>
      <Table
        dataSource={data.bands}
        columns={columns}
        rowKey="vatRate"
        pagination={false}
        size="middle"
        summary={(rows) => {
          const total = rows.reduce((acc, r) => ({ taxableValue: acc.taxableValue + r.taxableValue, vatAmount: acc.vatAmount + r.vatAmount }), { taxableValue: 0, vatAmount: 0 });
          return (
            <Table.Summary.Row style={{ background: D.surfaceLow }}>
              <Table.Summary.Cell index={0}><span style={{ fontFamily: D.manrope, fontWeight: 800, color: D.onSurface }}>Total</span></Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right"><span style={{ fontFamily: D.manrope, fontWeight: 700 }}>{fmt(total.taxableValue)}</span></Table.Summary.Cell>
              <Table.Summary.Cell index={2} />
              <Table.Summary.Cell index={3} align="right"><span style={{ fontFamily: D.manrope, fontWeight: 800, color: D.primary }}>{fmt(total.vatAmount)}</span></Table.Summary.Cell>
              <Table.Summary.Cell index={4} />
            </Table.Summary.Row>
          );
        }}
      />
    </TableWrap>
  );
}

// ─── Invoice Summary tab ──────────────────────────────────────────────────────

function InvoiceSummaryTab({ data }: { data: InvoiceSummary }) {
  const columns: ColumnsType<SummaryRow> = [
    { title: 'VAT Rate (%)', dataIndex: 'vatRate', key: 'vatRate', render: (v: number) => <span style={{ fontFamily: D.manrope, fontWeight: 700, color: D.primary }}>{v}%</span> },
    { title: 'Taxable Value (BDT)', dataIndex: 'taxableValue', key: 'taxableValue', align: 'right', render: (v: number) => fmt(v) },
    { title: 'SD Amount (BDT)', dataIndex: 'sdAmount', key: 'sdAmount', align: 'right', render: (v: number) => fmt(v) },
    { title: 'VAT Amount (BDT)', dataIndex: 'vatAmount', key: 'vatAmount', align: 'right', render: (v: number) => fmt(v) },
    { title: 'Specific Duty (BDT)', dataIndex: 'specificDutyAmount', key: 'specificDutyAmount', align: 'right', render: (v: number) => fmt(v) },
    { title: 'Grand Total (BDT)', dataIndex: 'grandTotal', key: 'grandTotal', align: 'right', render: (v: number) => <span style={{ fontFamily: D.manrope, fontWeight: 800 }}>{fmt(v)}</span> },
    { title: 'Invoices', dataIndex: 'invoiceCount', key: 'invoiceCount', align: 'center' },
  ];
  const t = data.totals;

  return (
    <TableWrap>
      <Table
        dataSource={data.rows}
        columns={columns}
        rowKey="vatRate"
        pagination={false}
        size="middle"
        summary={() => (
          <Table.Summary.Row style={{ background: D.surfaceLow }}>
            <Table.Summary.Cell index={0}><span style={{ fontFamily: D.manrope, fontWeight: 800 }}>Total</span></Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right"><span style={{ fontFamily: D.manrope, fontWeight: 700 }}>{fmt(t.taxableValue)}</span></Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right"><span style={{ fontFamily: D.manrope, fontWeight: 700 }}>{fmt(t.sdAmount)}</span></Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right"><span style={{ fontFamily: D.manrope, fontWeight: 700 }}>{fmt(t.vatAmount)}</span></Table.Summary.Cell>
            <Table.Summary.Cell index={4} align="right"><span style={{ fontFamily: D.manrope, fontWeight: 700 }}>{fmt(t.specificDutyAmount)}</span></Table.Summary.Cell>
            <Table.Summary.Cell index={5} align="right"><span style={{ fontFamily: D.manrope, fontWeight: 800, color: D.primary }}>{fmt(t.grandTotal)}</span></Table.Summary.Cell>
            <Table.Summary.Cell index={6} />
          </Table.Summary.Row>
        )}
      />
    </TableWrap>
  );
}

// ─── VDS Summary tab ──────────────────────────────────────────────────────────

function VdsSummaryTab({ data }: { data: ReportVdsSummary }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard label="Certificates"   value={String(data.certificateCount)} icon="verified"        />
      <KpiCard label="Total Deducted" value={`৳ ${fmt(data.totalDeducted)}`} icon="receipt"        />
      <KpiCard label="Total Deposited" value={`৳ ${fmt(data.totalDeposited)}`} icon="account_balance" />
      <KpiCard label="Pending Deposit" value={`৳ ${fmt(data.totalPending)}`} icon="pending_actions" featured />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

interface ReportsData {
  vatSummary:      VatSummary      | null;
  vatPayable:      VatPayable      | null;
  salesSummary:    InvoiceSummary  | null;
  purchaseSummary: InvoiceSummary  | null;
  vdsSummary:      ReportVdsSummary | null;
}

export default function ReportsPage() {
  const { activeCompany } = useCompany();
  const [taxMonth, setTaxMonth] = useState<string>(dayjs().format('YYYY-MM'));
  const [loading, setLoading]   = useState(false);
  const [data, setData]         = useState<ReportsData>({
    vatSummary: null, vatPayable: null,
    salesSummary: null, purchaseSummary: null, vdsSummary: null,
  });

  const loadData = useCallback(async (month: string) => {
    if (!activeCompany) return;
    setLoading(true);
    try {
      const [vatSummary, vatPayable, salesSummary, purchaseSummary, vdsSummary] = await Promise.all([
        getVatSummary(month),
        getVatPayable(month),
        getSalesSummary(month),
        getPurchaseSummary(month),
        getVdsSummary(month),
      ]);
      setData({ vatSummary, vatPayable, salesSummary, purchaseSummary, vdsSummary });
    } finally {
      setLoading(false);
    }
  }, [activeCompany]);

  useEffect(() => { loadData(taxMonth); }, [loadData, taxMonth]);

  const handleMonthChange = (value: Dayjs | null) => {
    if (value) setTaxMonth(value.format('YYYY-MM'));
  };

  const spinFallback = (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
      <Spin size="large" />
    </div>
  );

  const tabItems = [
    {
      key: 'vat-summary',
      label: 'VAT Summary',
      children: (
        <div>
          <ExportBar reportType="vat-summary" taxMonth={taxMonth} />
          {loading || !data.vatSummary ? spinFallback : <VatSummaryTab data={data.vatSummary} />}
        </div>
      ),
    },
    {
      key: 'vat-payable',
      label: 'VAT Payable',
      children: (
        <div>
          <ExportBar reportType="vat-payable" taxMonth={taxMonth} />
          {loading || !data.vatPayable ? spinFallback : <VatPayableTab data={data.vatPayable} />}
        </div>
      ),
    },
    {
      key: 'sales-summary',
      label: 'Sales Summary',
      children: (
        <div>
          <ExportBar reportType="sales-summary" taxMonth={taxMonth} />
          {loading || !data.salesSummary ? spinFallback : <InvoiceSummaryTab data={data.salesSummary} />}
        </div>
      ),
    },
    {
      key: 'purchase-summary',
      label: 'Purchase Summary',
      children: (
        <div>
          <ExportBar reportType="purchase-summary" taxMonth={taxMonth} />
          {loading || !data.purchaseSummary ? spinFallback : <InvoiceSummaryTab data={data.purchaseSummary} />}
        </div>
      ),
    },
    {
      key: 'vds-summary',
      label: 'VDS Summary',
      children: (
        <div>
          <ExportBar reportType="vds-summary" taxMonth={taxMonth} />
          {loading || !data.vdsSummary ? spinFallback : <VdsSummaryTab data={data.vdsSummary} />}
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', fontFamily: D.inter, color: D.onSurface }}>
      <PageHeader
        eyebrow="Analytics"
        title="VAT Reports"
        sub="Aggregated figures by tax month — export to PDF or Excel"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: D.manrope, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: D.onSurfaceVar }}>
              Tax Month
            </span>
            <DatePicker
              picker="month"
              value={dayjs(taxMonth, 'YYYY-MM')}
              onChange={handleMonthChange}
              format="MMM YYYY"
              allowClear={false}
              style={{ width: 136 }}
            />
          </div>
        }
      />

      {!activeCompany ? (
        <SLCard style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ width: 60, height: 60, background: D.surfaceLow, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Icon name="summarize" size={28} style={{ color: D.onSurfaceVar }} />
          </div>
          <p style={{ fontFamily: D.manrope, fontWeight: 700, fontSize: '1rem', color: D.onSurface, marginBottom: 6 }}>
            No Company Selected
          </p>
          <p style={{ fontSize: 13, color: D.onSurfaceVar, lineHeight: 1.6 }}>
            Select a company to view VAT reports.
          </p>
        </SLCard>
      ) : (
        <SLCard style={{ padding: '1.5rem' }}>
          <Tabs items={tabItems} />
        </SLCard>
      )}
    </div>
  );
}
