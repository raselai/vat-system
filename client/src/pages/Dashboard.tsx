import { useEffect, useState } from 'react';
import { Table, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import type { Invoice, Product, Customer } from '../types';

/* ═══════════ Helpers ═══════════ */

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

const fmt = (v: number) =>
  new Intl.NumberFormat('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const fiscalYear = () => {
  const now = dayjs();
  const y = now.month() >= 6 ? now.year() : now.year() - 1;
  return `${y}-${y + 1}`;
};

const taxPeriod = () => dayjs().format('MMMM YYYY');

const daysUntilDeadline = () => {
  const now = dayjs();
  const deadline = now.date() > 15
    ? now.add(1, 'month').date(15)
    : now.date(15);
  return Math.max(0, deadline.diff(now, 'day'));
};

/* ═══════════ Types ═══════════ */

interface Stats {
  totalProducts: number;
  totalCustomers: number;
  invoices: Invoice[];
  salesInvoices: Invoice[];
  purchaseInvoices: Invoice[];
  totalSales: number;
  totalPurchases: number;
  outputVat: number;
  inputVat: number;
  draftCount: number;
  approvedCount: number;
}

const emptyStats: Stats = {
  totalProducts: 0, totalCustomers: 0, invoices: [],
  salesInvoices: [], purchaseInvoices: [],
  totalSales: 0, totalPurchases: 0, outputVat: 0, inputVat: 0,
  draftCount: 0, approvedCount: 0,
};

const statusConfig: Record<string, { color: string; bgClass: string; label: string }> = {
  draft:     { color: '#584200', bgClass: 'bg-[#584200]/10', label: 'DRAFT' },
  approved:  { color: '#00503a', bgClass: 'bg-[#00503a]/10', label: 'RECORDED' },
  locked:    { color: '#465f88', bgClass: 'bg-[#465f88]/10', label: 'LOCKED' },
  cancelled: { color: '#ba1a1a', bgClass: 'bg-[#ba1a1a]/10', label: 'CANCELLED' },
};

/* ═══════════ Section Label ═══════════ */

function SectionLabel({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <M name={icon} className="text-lg text-slate-400" />
      <h3 className="font-headline text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</h3>
    </div>
  );
}

/* ═══════════ Dashboard ═══════════ */

export default function Dashboard() {
  const { activeCompany } = useCompany();
  useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeCompany) { setLoading(false); return; }
    setLoading(true);

    Promise.all([
      api.get('/products').catch(() => ({ data: { data: [] } })),
      api.get('/customers').catch(() => ({ data: { data: [] } })),
      api.get('/invoices').catch(() => ({ data: { data: [] } })),
    ]).then(([pRes, cRes, iRes]) => {
      const products: Product[] = pRes.data.data || [];
      const customers: Customer[] = cRes.data.data || [];
      const invoices: Invoice[] = iRes.data.data || [];
      const sales = invoices.filter(i => i.invoiceType === 'sales');
      const purchases = invoices.filter(i => i.invoiceType === 'purchase');

      setStats({
        totalProducts: products.length,
        totalCustomers: customers.length,
        invoices,
        salesInvoices: sales,
        purchaseInvoices: purchases,
        totalSales: sales.reduce((acc, i) => acc + Number(i.grandTotal || 0), 0),
        totalPurchases: purchases.reduce((acc, i) => acc + Number(i.grandTotal || 0), 0),
        outputVat: sales.reduce((acc, i) => acc + Number(i.vatTotal || 0), 0),
        inputVat: purchases.reduce((acc, i) => acc + Number(i.vatTotal || 0), 0),
        draftCount: invoices.filter(i => i.status === 'draft').length,
        approvedCount: invoices.filter(i => i.status === 'approved' || i.status === 'locked').length,
      });
    }).finally(() => setLoading(false));
  }, [activeCompany]);

  /* ─── Empty state ─── */
  if (!activeCompany) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 bg-primary/5 rounded-2xl flex items-center justify-center mb-6">
          <M name="domain_add" className="text-5xl text-primary" />
        </div>
        <h3 className="font-headline text-xl font-bold mb-2 text-on-surface">No Company Selected</h3>
        <p className="text-slate-500 text-sm mb-6 max-w-xs">Create or select a company from the top bar to begin managing your VAT compliance.</p>
        <button
          onClick={() => navigate('/companies/new')}
          className="bg-primary text-on-primary px-6 py-3 rounded-xl font-headline font-bold text-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2"
        >
          <M name="add" className="text-sm" />
          Create Company
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spin size="large" />
      </div>
    );
  }

  const s = stats ?? emptyStats;
  const netVat = s.outputVat - s.inputVat;
  const recent = s.invoices.slice(0, 5);
  const deadlineDays = daysUntilDeadline();

  /* ─── Table columns ─── */
  const columns = [
    {
      title: 'Invoice No',
      dataIndex: 'challanNo',
      key: 'challanNo',
      render: (v: string) => <span className="font-bold text-sm text-on-surface">{v}</span>,
    },
    {
      title: 'Date',
      dataIndex: 'challanDate',
      key: 'challanDate',
      responsive: ['sm' as const],
      render: (d: string) => <span className="text-sm text-slate-600">{dayjs(d).format('DD MMM, YYYY')}</span>,
    },
    {
      title: 'Party',
      key: 'party',
      responsive: ['md' as const],
      render: (_: unknown, record: Invoice) => (
        <span className="text-sm font-medium text-on-surface">{record.customer?.name || 'Walk-in'}</span>
      ),
    },
    {
      title: 'VAT',
      dataIndex: 'vatTotal',
      key: 'vatTotal',
      align: 'right' as const,
      render: (v: number) => <span className="text-sm font-black text-on-surface whitespace-nowrap">{`৳ ${fmt(Number(v))}`}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      align: 'right' as const,
      render: (status: string) => {
        const cfg = statusConfig[status] || statusConfig.draft;
        return (
          <span className={`inline-flex items-center gap-1.5 px-2 py-1 ${cfg.bgClass} text-[10px] font-bold rounded`} style={{ color: cfg.color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
            {cfg.label}
          </span>
        );
      },
    },
  ];

  /* ═══════════════════════════════════════════
     RENDER — structured top-to-bottom sections
     ═══════════════════════════════════════════ */

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">

      {/* ╔══════════════════════════════════════╗
         ║  SECTION 1 — Hero Header + Deadline  ║
         ╚══════════════════════════════════════╝ */}
      <section>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h2 className="font-headline text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface mb-1">
              Compliance Dashboard
            </h2>
            <p className="text-slate-500 text-sm sm:text-base">
              VAT auditing for{' '}
              <span className="text-primary font-semibold">{taxPeriod()}</span> &middot; FY {fiscalYear()}
            </p>
          </div>
          <div className="bg-primary-container text-on-primary-container px-4 py-3 sm:px-5 sm:py-3.5 rounded-xl flex items-center gap-3 shadow-lg shadow-primary/10 w-full sm:w-auto">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <M name="event" filled className="text-primary-fixed" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Filing Deadline</p>
              <p className="text-sm sm:text-base font-bold truncate">{deadlineDays} Days Left (Mushak 9.1)</p>
            </div>
          </div>
        </div>
      </section>

      {/* ╔══════════════════════════════════════╗
         ║  SECTION 2 — KPI Cards               ║
         ╚══════════════════════════════════════╝ */}
      <section>
        <SectionLabel icon="monitoring" label="Tax Overview" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {/* Output VAT */}
          <div className="bg-surface-container-low p-5 rounded-2xl relative overflow-hidden group">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Output VAT</p>
            <h3 className="font-headline text-2xl lg:text-3xl font-black text-on-surface mb-1">{`৳ ${fmt(s.outputVat)}`}</h3>
            <div className="flex items-center gap-1.5 text-primary font-bold text-xs">
              <M name="trending_up" className="text-sm" />
              <span>{s.salesInvoices.length} sales</span>
            </div>
            <div className="absolute -right-3 -bottom-3 opacity-[0.04] group-hover:scale-110 transition-transform duration-700">
              <M name="receipt" className="text-[80px]" />
            </div>
          </div>

          {/* Input VAT */}
          <div className="bg-surface-container-low p-5 rounded-2xl relative overflow-hidden group">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Input Tax Credit</p>
            <h3 className="font-headline text-2xl lg:text-3xl font-black text-on-surface mb-1">{`৳ ${fmt(s.inputVat)}`}</h3>
            <div className="flex items-center gap-1.5 text-primary font-bold text-xs">
              <M name="trending_down" className="text-sm" />
              <span>{s.purchaseInvoices.length} purchases</span>
            </div>
          </div>

          {/* Net VAT — Featured */}
          <div className="bg-primary text-on-primary p-5 rounded-2xl shadow-xl shadow-primary/20 relative">
            <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-3">Net VAT Payable</p>
            <h3 className="font-headline text-2xl lg:text-3xl font-black mb-1">{`৳ ${fmt(Math.max(0, netVat))}`}</h3>
            <p className="text-[10px] font-medium opacity-60 leading-snug">After input credit &amp; VDS rebates</p>
            <span className="inline-block mt-3 px-2 py-0.5 bg-white/10 rounded text-[10px] font-bold">CURRENT BALANCE</span>
          </div>

          {/* Invoice Summary */}
          <div className="bg-surface-container-low p-5 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Invoices</p>
            <h3 className="font-headline text-2xl lg:text-3xl font-black text-on-surface mb-1">{s.invoices.length}</h3>
            <div className="flex items-center gap-1.5 text-tertiary font-bold text-xs">
              <M name="pending_actions" className="text-sm" />
              <span>{s.draftCount} draft &middot; {s.approvedCount} approved</span>
            </div>
          </div>
        </div>
      </section>

      {/* ╔══════════════════════════════════════╗
         ║  SECTION 3 — Quick Actions            ║
         ╚══════════════════════════════════════╝ */}
      <section>
        <SectionLabel icon="bolt" label="Quick Actions" />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {([
            { icon: 'add_notes',   label: 'New Invoice',  sub: 'Musak 6.3', path: '/invoices/new',  bgIcon: 'bg-[#00503a]/5',  textIcon: 'text-[#00503a]' },
            { icon: 'inventory_2', label: 'Add Product',  sub: 'পণ্য যোগ',     path: '/products/new', bgIcon: 'bg-[#465f88]/5',  textIcon: 'text-[#465f88]' },
            { icon: 'group_add',   label: 'Add Customer', sub: 'গ্রাহক যোগ',    path: '/customers/new', bgIcon: 'bg-[#584200]/5', textIcon: 'text-[#584200]' },
          ]).map((a) => (
            <button
              key={a.path}
              onClick={() => navigate(a.path)}
              className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col items-center justify-center text-center group border border-slate-50"
            >
              <div className={`w-12 h-12 sm:w-14 sm:h-14 ${a.bgIcon} rounded-2xl flex items-center justify-center ${a.textIcon} mb-3 group-hover:scale-110 transition-transform`}>
                <M name={a.icon} filled className="text-2xl sm:text-3xl" />
              </div>
              <p className="font-headline font-bold text-xs sm:text-sm text-on-surface">{a.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">{a.sub}</p>
            </button>
          ))}
        </div>
      </section>

      {/* ╔══════════════════════════════════════╗
         ║  SECTION 4 — Invoices + Sidebar       ║
         ╚══════════════════════════════════════╝ */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

          {/* ── Recent Invoices ── */}
          <div className="lg:col-span-7 xl:col-span-8">
            <SectionLabel icon="receipt_long" label="Recent Invoices" />

            <div className="bg-surface-container-low rounded-2xl overflow-hidden">
              <div className="flex justify-between items-center px-5 sm:px-6 py-4">
                <h3 className="font-headline text-base sm:text-lg font-bold tracking-tight text-on-surface">
                  Mushak 6.3 Challans
                </h3>
                <button
                  onClick={() => navigate('/invoices')}
                  className="text-primary text-xs sm:text-sm font-bold inline-flex items-center gap-1 hover:underline"
                >
                  View All
                  <M name="arrow_forward" className="text-sm" />
                </button>
              </div>

              {recent.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table
                    dataSource={recent}
                    columns={columns}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    onRow={(record) => ({
                      onClick: () => navigate(`/invoices/${record.id}`),
                    })}
                  />
                </div>
              ) : (
                <div className="py-12 sm:py-16 text-center px-4">
                  <div className="w-14 h-14 bg-surface-container rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <M name="receipt_long" className="text-3xl text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500 mb-4">No invoices yet</p>
                  <button
                    onClick={() => navigate('/invoices/new')}
                    className="bg-primary text-on-primary px-5 py-2.5 rounded-xl font-headline font-bold text-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2"
                  >
                    <M name="add" className="text-sm" />
                    Create Invoice
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Right Sidebar ── */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-5">

            {/* Compliance Checklist */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-bl-[40px] -mr-6 -mt-6" />

              <h4 className="font-headline text-base font-bold mb-5 flex items-center gap-2 text-on-surface relative z-10">
                <M name="gavel" className="text-primary text-xl" />
                Compliance Status
              </h4>

              <div className="space-y-4">
                {([
                  { label: 'System Setup', sub: 'Master Data & Roles', done: true },
                  { label: 'Invoices', sub: `${s.salesInvoices.length} Sales / ${s.purchaseInvoices.length} Purchases`, done: true },
                  { label: 'Master Data', sub: `${s.totalProducts} Products, ${s.totalCustomers} Customers`, done: true },
                ]).map((item) => (
                  <div key={item.label} className="relative pl-5">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#9ef4d0] rounded-full" />
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-sm text-on-surface leading-tight">{item.label}</p>
                        <p className="text-[10px] text-slate-500">{item.sub}</p>
                      </div>
                      <M name="check_circle" filled className="text-primary text-lg flex-shrink-0" />
                    </div>
                  </div>
                ))}

                {/* Return — in progress */}
                <div className="relative pl-5">
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#f7be06] rounded-full" />
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm text-tertiary leading-tight">Return Filing</p>
                      <p className="text-[10px] text-slate-500">Musak 9.1 — {dayjs().format('MMMM')}</p>
                    </div>
                    <span className="text-[10px] font-bold text-tertiary bg-[#ffdf98]/30 px-2 py-0.5 rounded flex-shrink-0">
                      PENDING
                    </span>
                  </div>
                  <div className="mt-2.5 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#f7be06] rounded-full transition-all" style={{ width: '35%' }} />
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/returns')}
                className="w-full mt-6 py-2.5 bg-primary text-on-primary rounded-xl font-headline font-bold text-sm hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2"
              >
                Finalize Return
                <M name="arrow_forward" className="text-sm" />
              </button>
            </div>

            {/* Financial Summary */}
            <div className="bg-surface-container-low rounded-2xl p-5">
              <h4 className="font-headline font-bold text-sm mb-4 text-on-surface flex items-center gap-2">
                <M name="account_balance" className="text-primary text-lg" />
                Financial Summary
              </h4>
              <div className="space-y-2.5">
                {([
                  { label: 'Total Sales',      value: `৳ ${fmt(s.totalSales)}`,     icon: 'trending_up',    ic: 'text-[#00503a]' },
                  { label: 'Total Purchases',  value: `৳ ${fmt(s.totalPurchases)}`, icon: 'trending_down',  ic: 'text-[#584200]' },
                  { label: 'Output VAT',       value: `৳ ${fmt(s.outputVat)}`,      icon: 'receipt',        ic: 'text-[#00503a]' },
                  { label: 'Input VAT Credit', value: `৳ ${fmt(s.inputVat)}`,       icon: 'credit_card',    ic: 'text-[#465f88]' },
                  { label: 'Fiscal Year',      value: fiscalYear(),                  icon: 'calendar_month', ic: 'text-slate-500' },
                ]).map((row) => (
                  <div key={row.label} className="flex justify-between items-center py-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <M name={row.icon} className={`text-base ${row.ic} flex-shrink-0`} />
                      <span className="text-xs text-slate-500 truncate">{row.label}</span>
                    </div>
                    <span className="text-sm font-bold text-on-surface whitespace-nowrap ml-2">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance Tip */}
            <div className="bg-[#b6d0ff]/20 rounded-2xl p-5 border border-[#b6d0ff]/40">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 bg-[#b6d0ff] rounded-lg flex items-center justify-center text-[#3f5881] flex-shrink-0">
                  <M name="lightbulb" className="text-lg" />
                </div>
                <h4 className="font-headline font-bold text-sm text-[#3f5881]">Compliance Tip</h4>
              </div>
              <p className="text-xs text-[#3f5881]/80 leading-relaxed">
                Ensure all Musak 6.3 invoices for {dayjs().format('MMMM')} are uploaded before the 15th of{' '}
                {dayjs().add(1, 'month').format('MMMM')} to avoid penalties under Section 127.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
