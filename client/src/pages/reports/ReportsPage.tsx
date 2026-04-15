import { useState, useEffect, useCallback } from 'react';
import { Tabs, DatePicker, Spin, Button, Table, Space } from 'antd';
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

function M({ name, filled, className }: { name: string; filled?: boolean; className?: string }) {
  return (
    <span
      className={`material-symbols-outlined ${className || ''}`}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  );
}

// ─── Export bar ───────────────────────────────────────────────────────────────

function ExportBar({ reportType, taxMonth }: { reportType: string; taxMonth: string }) {
  const [dlPdf, setDlPdf] = useState(false);
  const [dlXlsx, setDlXlsx] = useState(false);

  const handle = async (format: 'pdf' | 'xlsx') => {
    if (format === 'pdf') {
      setDlPdf(true);
      await downloadReport(reportType, taxMonth, 'pdf').finally(() => setDlPdf(false));
    } else {
      setDlXlsx(true);
      await downloadReport(reportType, taxMonth, 'xlsx').finally(() => setDlXlsx(false));
    }
  };

  return (
    <Space size="small">
      <Button
        size="small"
        loading={dlPdf}
        icon={<M name="picture_as_pdf" className="text-sm align-middle" />}
        onClick={() => handle('pdf')}
      >
        PDF
      </Button>
      <Button
        size="small"
        loading={dlXlsx}
        icon={<M name="table_view" className="text-sm align-middle" />}
        onClick={() => handle('xlsx')}
      >
        Excel
      </Button>
    </Space>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: string;
  highlight?: boolean;
}) {
  if (highlight) {
    return (
      <div className="bg-primary text-on-primary p-5 rounded-2xl shadow-xl shadow-primary/20 relative overflow-hidden">
        <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-2">{label}</p>
        <h3 className="font-headline text-2xl font-black mb-1">{value}</h3>
        {sub && <p className="text-[10px] font-medium opacity-60 leading-snug">{sub}</p>}
        <div className="absolute -right-3 -bottom-3 opacity-[0.06]">
          <M name={icon} className="text-[80px]" />
        </div>
      </div>
    );
  }
  return (
    <div className="bg-surface-container-low p-5 rounded-2xl relative overflow-hidden group">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{label}</p>
      <h3 className="font-headline text-2xl font-black text-on-surface mb-1">{value}</h3>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
      <div className="absolute -right-3 -bottom-3 opacity-[0.04] group-hover:scale-110 transition-transform duration-700">
        <M name={icon} className="text-[80px]" />
      </div>
    </div>
  );
}

// ─── VAT Summary tab ──────────────────────────────────────────────────────────

function VatSummaryTab({ data }: { data: VatSummary }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard label="Output VAT" value={`৳ ${fmt(data.outputVat)}`} sub={`${data.salesCount} sales invoices`} icon="receipt" />
        <KpiCard label="Input VAT Credit" value={`৳ ${fmt(data.inputVat)}`} sub={`${data.purchaseCount} purchase invoices`} icon="credit_card" />
        <KpiCard label="SD Payable" value={`৳ ${fmt(data.sdPayable)}`} icon="payments" />
        <KpiCard label="VDS Credit" value={`৳ ${fmt(data.vdsCredit)}`} icon="verified" />
        <KpiCard label="Net VAT Payable" value={`৳ ${fmt(data.netPayable)}`} sub="Output + SD − Input − VDS" icon="account_balance" highlight />
      </div>

      <div className="bg-surface-container-low rounded-2xl p-5 max-w-lg">
        <h4 className="font-headline font-bold text-sm mb-4 text-on-surface">Breakdown</h4>
        <div className="space-y-2">
          {([
            { label: 'Total Sales Value', value: `৳ ${fmt(data.totalSalesValue)}` },
            { label: 'Total Purchase Value', value: `৳ ${fmt(data.totalPurchaseValue)}` },
            { label: 'Output VAT', value: `+ ৳ ${fmt(data.outputVat)}` },
            { label: 'SD Payable', value: `+ ৳ ${fmt(data.sdPayable)}` },
            { label: 'Input VAT Credit', value: `− ৳ ${fmt(data.inputVat)}` },
            { label: 'VDS Credit', value: `− ৳ ${fmt(data.vdsCredit)}` },
          ]).map((row) => (
            <div key={row.label} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
              <span className="text-xs text-slate-500">{row.label}</span>
              <span className="text-sm font-bold text-on-surface">{row.value}</span>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2">
            <span className="text-sm font-bold text-on-surface">Net VAT Payable</span>
            <span className="text-base font-black text-primary">৳ {fmt(data.netPayable)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── VAT Payable tab ──────────────────────────────────────────────────────────

function VatPayableTab({ data }: { data: VatPayable }) {
  const columns: ColumnsType<VatBand> = [
    { title: 'VAT Rate (%)', dataIndex: 'vatRate', key: 'vatRate', render: (v: number) => `${v}%` },
    { title: 'Taxable Value (BDT)', dataIndex: 'taxableValue', key: 'taxableValue', align: 'right', render: (v: number) => fmt(v) },
    { title: 'SD Amount (BDT)', dataIndex: 'sdAmount', key: 'sdAmount', align: 'right', render: (v: number) => fmt(v) },
    { title: 'VAT Amount (BDT)', dataIndex: 'vatAmount', key: 'vatAmount', align: 'right', render: (v: number) => <span className="font-bold">{fmt(v)}</span> },
    { title: 'Invoice Count', dataIndex: 'invoiceCount', key: 'invoiceCount', align: 'center' },
  ];

  return (
    <Table
      dataSource={data.bands}
      columns={columns}
      rowKey="vatRate"
      pagination={false}
      size="middle"
      className="rounded-2xl overflow-hidden"
      summary={(rows) => {
        const total = rows.reduce((acc, r) => ({ taxableValue: acc.taxableValue + r.taxableValue, vatAmount: acc.vatAmount + r.vatAmount }), { taxableValue: 0, vatAmount: 0 });
        return (
          <Table.Summary.Row className="font-bold bg-surface-container-low">
            <Table.Summary.Cell index={0}><span className="font-bold">Total</span></Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right"><span className="font-bold">{fmt(total.taxableValue)}</span></Table.Summary.Cell>
            <Table.Summary.Cell index={2} />
            <Table.Summary.Cell index={3} align="right"><span className="font-bold text-primary">{fmt(total.vatAmount)}</span></Table.Summary.Cell>
            <Table.Summary.Cell index={4} />
          </Table.Summary.Row>
        );
      }}
    />
  );
}

// ─── Invoice Summary tab (Sales / Purchase) ───────────────────────────────────

function InvoiceSummaryTab({ data }: { data: InvoiceSummary }) {
  const columns: ColumnsType<SummaryRow> = [
    { title: 'VAT Rate (%)', dataIndex: 'vatRate', key: 'vatRate', render: (v: number) => `${v}%` },
    { title: 'Taxable Value (BDT)', dataIndex: 'taxableValue', key: 'taxableValue', align: 'right', render: (v: number) => fmt(v) },
    { title: 'SD Amount (BDT)', dataIndex: 'sdAmount', key: 'sdAmount', align: 'right', render: (v: number) => fmt(v) },
    { title: 'VAT Amount (BDT)', dataIndex: 'vatAmount', key: 'vatAmount', align: 'right', render: (v: number) => fmt(v) },
    { title: 'Specific Duty (BDT)', dataIndex: 'specificDutyAmount', key: 'specificDutyAmount', align: 'right', render: (v: number) => fmt(v) },
    { title: 'Grand Total (BDT)', dataIndex: 'grandTotal', key: 'grandTotal', align: 'right', render: (v: number) => <span className="font-bold">{fmt(v)}</span> },
    { title: 'Invoices', dataIndex: 'invoiceCount', key: 'invoiceCount', align: 'center' },
  ];

  const t = data.totals;

  return (
    <Table
      dataSource={data.rows}
      columns={columns}
      rowKey="vatRate"
      pagination={false}
      size="middle"
      className="rounded-2xl overflow-hidden"
      summary={() => (
        <Table.Summary.Row className="font-bold">
          <Table.Summary.Cell index={0}><span className="font-bold">Total</span></Table.Summary.Cell>
          <Table.Summary.Cell index={1} align="right"><span className="font-bold">{fmt(t.taxableValue)}</span></Table.Summary.Cell>
          <Table.Summary.Cell index={2} align="right"><span className="font-bold">{fmt(t.sdAmount)}</span></Table.Summary.Cell>
          <Table.Summary.Cell index={3} align="right"><span className="font-bold">{fmt(t.vatAmount)}</span></Table.Summary.Cell>
          <Table.Summary.Cell index={4} align="right"><span className="font-bold">{fmt(t.specificDutyAmount)}</span></Table.Summary.Cell>
          <Table.Summary.Cell index={5} align="right"><span className="font-bold text-primary">{fmt(t.grandTotal)}</span></Table.Summary.Cell>
          <Table.Summary.Cell index={6} />
        </Table.Summary.Row>
      )}
    />
  );
}

// ─── VDS Summary tab ──────────────────────────────────────────────────────────

function VdsSummaryTab({ data }: { data: ReportVdsSummary }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard label="Certificates" value={String(data.certificateCount)} icon="verified" />
      <KpiCard label="Total Deducted" value={`৳ ${fmt(data.totalDeducted)}`} icon="receipt" />
      <KpiCard label="Total Deposited" value={`৳ ${fmt(data.totalDeposited)}`} icon="account_balance" />
      <KpiCard label="Pending Deposit" value={`৳ ${fmt(data.totalPending)}`} icon="pending_actions" highlight />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

interface ReportsData {
  vatSummary: VatSummary | null;
  vatPayable: VatPayable | null;
  salesSummary: InvoiceSummary | null;
  purchaseSummary: InvoiceSummary | null;
  vdsSummary: ReportVdsSummary | null;
}

export default function ReportsPage() {
  const { activeCompany } = useCompany();
  const [taxMonth, setTaxMonth] = useState<string>(dayjs().format('YYYY-MM'));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReportsData>({
    vatSummary: null,
    vatPayable: null,
    salesSummary: null,
    purchaseSummary: null,
    vdsSummary: null,
  });

  const loadData = useCallback(
    async (month: string) => {
      if (!activeCompany) return;
      setLoading(true);
      try {
        const [vatSummary, vatPayable, salesSummary, purchaseSummary, vdsSummary] =
          await Promise.all([
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
    },
    [activeCompany],
  );

  useEffect(() => {
    loadData(taxMonth);
  }, [loadData, taxMonth]);

  const handleMonthChange = (value: Dayjs | null) => {
    if (value) setTaxMonth(value.format('YYYY-MM'));
  };

  const tabItems = [
    {
      key: 'vat-summary',
      label: 'VAT Summary',
      children: (
        <div>
          <div className="flex justify-end mb-4">
            <ExportBar reportType="vat-summary" taxMonth={taxMonth} />
          </div>
          {loading || !data.vatSummary ? (
            <div className="flex justify-center py-16"><Spin /></div>
          ) : (
            <VatSummaryTab data={data.vatSummary} />
          )}
        </div>
      ),
    },
    {
      key: 'vat-payable',
      label: 'VAT Payable',
      children: (
        <div>
          <div className="flex justify-end mb-4">
            <ExportBar reportType="vat-payable" taxMonth={taxMonth} />
          </div>
          {loading || !data.vatPayable ? (
            <div className="flex justify-center py-16"><Spin /></div>
          ) : (
            <VatPayableTab data={data.vatPayable} />
          )}
        </div>
      ),
    },
    {
      key: 'sales-summary',
      label: 'Sales Summary',
      children: (
        <div>
          <div className="flex justify-end mb-4">
            <ExportBar reportType="sales-summary" taxMonth={taxMonth} />
          </div>
          {loading || !data.salesSummary ? (
            <div className="flex justify-center py-16"><Spin /></div>
          ) : (
            <InvoiceSummaryTab data={data.salesSummary} />
          )}
        </div>
      ),
    },
    {
      key: 'purchase-summary',
      label: 'Purchase Summary',
      children: (
        <div>
          <div className="flex justify-end mb-4">
            <ExportBar reportType="purchase-summary" taxMonth={taxMonth} />
          </div>
          {loading || !data.purchaseSummary ? (
            <div className="flex justify-center py-16"><Spin /></div>
          ) : (
            <InvoiceSummaryTab data={data.purchaseSummary} />
          )}
        </div>
      ),
    },
    {
      key: 'vds-summary',
      label: 'VDS Summary',
      children: (
        <div>
          <div className="flex justify-end mb-4">
            <ExportBar reportType="vds-summary" taxMonth={taxMonth} />
          </div>
          {loading || !data.vdsSummary ? (
            <div className="flex justify-center py-16"><Spin /></div>
          ) : (
            <VdsSummaryTab data={data.vdsSummary} />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="font-headline text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface mb-1">
            VAT Reports
          </h2>
          <p className="text-slate-500 text-sm">
            Aggregated VAT figures by tax month — export to PDF or Excel
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tax Month</span>
          <DatePicker
            picker="month"
            value={dayjs(taxMonth, 'YYYY-MM')}
            onChange={handleMonthChange}
            format="MMM YYYY"
            allowClear={false}
            className="w-36"
          />
        </div>
      </div>

      {/* No company state */}
      {!activeCompany ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <M name="summarize" className="text-5xl text-slate-300 mb-4" />
          <p className="text-slate-500 text-sm">Select a company to view reports.</p>
        </div>
      ) : (
        <div className="bg-surface-container-low rounded-2xl p-5 sm:p-6">
          <Tabs items={tabItems} />
        </div>
      )}
    </div>
  );
}
