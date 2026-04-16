import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { getVatSummary } from '../services/reports.service';
import type { Invoice, VatSummary } from '../types';

/* ─────────────────────────────────────────────────────────
   DESIGN.md tokens — "The Sovereign Ledger"
   Primary: #001d52 (navy)  |  Tertiary: #006a4e (compliance green)
   Typography: Manrope (Authority) / Inter (Utility)
   Rules: No 1px dividers · Tonal layering · Ambient shadows
───────────────────────────────────────────────────────── */
const D = {
  primary:        '#001d52',
  primaryCont:    '#00307e',
  grad:           'linear-gradient(135deg, #001d52, #00307e)',
  surface:        '#f7f9fb',
  surfaceLow:     '#f2f4f6',
  surfaceMid:     '#eaecef',
  surfaceBright:  '#ffffff',
  onSurface:      '#191c1e',   // never 100% black per DESIGN.md
  onSurfaceVar:   '#44474a',
  tertiary:       '#006a4e',
  tertiaryDark:   '#003e28',
  ambient:        '0 16px 32px rgba(25,28,30,.06)',
  elevated:       '0 24px 48px rgba(0,29,82,.12)',
  manrope:        "'Manrope', sans-serif",
  inter:          "'Inter', sans-serif",
};

/* ── Helpers ─────────────────────────────────────────── */
function Icon({ name, filled, size = '1.2rem', color }: {
  name: string; filled?: boolean; size?: string; color?: string;
}) {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontSize: size, lineHeight: 1, display: 'block', color,
        ...(filled ? { fontVariationSettings: "'FILL' 1" } : {}),
      }}
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

const taxPeriod  = () => dayjs().format('MMMM YYYY');

const daysUntilDeadline = () => {
  const now = dayjs();
  const deadline = now.date() > 15
    ? now.add(1, 'month').date(15)
    : now.date(15);
  return Math.max(0, deadline.diff(now, 'day'));
};

/* ── Types ───────────────────────────────────────────── */
interface Stats {
  invoices:         Invoice[];
  salesInvoices:    Invoice[];
  purchaseInvoices: Invoice[];
  draftCount:       number;
  approvedCount:    number;
}

const emptyStats: Stats = {
  invoices: [], salesInvoices: [], purchaseInvoices: [],
  draftCount: 0, approvedCount: 0,
};

const statusCfg: Record<string, { color: string; bg: string; label: string }> = {
  draft:     { color: '#584200', bg: 'rgba(88,66,0,.09)',    label: 'DRAFT'     },
  approved:  { color: '#003e28', bg: 'rgba(0,62,40,.09)',    label: 'RECORDED'  },
  locked:    { color: '#001d52', bg: 'rgba(0,29,82,.09)',    label: 'LOCKED'    },
  cancelled: { color: '#ba1a1a', bg: 'rgba(186,26,26,.09)', label: 'CANCELLED' },
};

/* ── Micro-components ────────────────────────────────── */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: D.manrope, fontWeight: 800, fontSize: '.68rem',
      letterSpacing: '.11em', textTransform: 'uppercase',
      color: D.onSurfaceVar, marginBottom: '.625rem',
    }}>
      {children}
    </p>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: D.surfaceBright, borderRadius: 20,
      boxShadow: D.ambient, ...style,
    }}>
      {children}
    </div>
  );
}

/* ── Dashboard ───────────────────────────────────────── */
export default function Dashboard() {
  const { activeCompany } = useCompany();
  useAuth();
  const navigate = useNavigate();
  const [stats,   setStats]   = useState<Stats   | null>(null);
  const [vatData, setVatData] = useState<VatSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeCompany) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      getVatSummary(dayjs().format('YYYY-MM')).catch(() => null),
      api.get('/invoices').catch(() => ({ data: { data: [] } })),
    ]).then(([vat, iRes]) => {
      const invoices: Invoice[] = iRes.data.data || [];
      const sales     = invoices.filter(i => i.invoiceType === 'sales');
      const purchases = invoices.filter(i => i.invoiceType === 'purchase');
      setVatData(vat);
      setStats({
        invoices,
        salesInvoices:    sales,
        purchaseInvoices: purchases,
        draftCount:    invoices.filter(i => i.status === 'draft').length,
        approvedCount: invoices.filter(i => i.status === 'approved' || i.status === 'locked').length,
      });
    }).finally(() => setLoading(false));
  }, [activeCompany]);

  /* ── Empty state ─────────────────────────────────── */
  if (!activeCompany) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '2rem' }}>
        <div style={{ width: 72, height: 72, background: 'rgba(0,29,82,.06)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <Icon name="domain_add" size="2.5rem" color={D.primary} />
        </div>
        <h3 style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: '1.35rem', color: D.onSurface, marginBottom: 8, letterSpacing: '-.02em' }}>
          No Company Selected
        </h3>
        <p style={{ fontFamily: D.inter, fontSize: '.875rem', color: D.onSurfaceVar, marginBottom: 28, maxWidth: '32ch', lineHeight: 1.7 }}>
          Create or select a company to begin managing your VAT compliance.
        </p>
        <button
          onClick={() => navigate('/companies/new')}
          style={{ background: D.grad, color: '#fff', padding: '.75rem 2rem', borderRadius: '1.5rem', fontFamily: D.manrope, fontWeight: 700, fontSize: '.875rem', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Icon name="add" size=".95rem" color="#fff" />
          Create Company
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  const s           = stats ?? emptyStats;
  const recent      = s.invoices.slice(0, 6);
  const outputVat   = vatData?.outputVat   ?? 0;
  const inputVat    = vatData?.inputVat    ?? 0;
  const netPayable  = vatData?.netPayable  ?? 0;
  const deadlineDays = daysUntilDeadline();
  const isUrgent    = deadlineDays <= 5;

  /* ── Render ─────────────────────────────────────── */
  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', fontFamily: D.inter }}>

      {/* ════════════════════════════════════════════
          HEADER — editorial asymmetric layout
          Page title left · Filing deadline right
          ════════════════════════════════════════════ */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 40, flexWrap: 'wrap', gap: 20 }}>
        <div>
          <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: '.7rem', letterSpacing: '.12em', textTransform: 'uppercase', color: D.primary, marginBottom: 10 }}>
            Compliance Dashboard
          </p>
          <h1 style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 'clamp(2rem, 4vw, 3.25rem)', letterSpacing: '-.04em', color: D.onSurface, lineHeight: 1.05, marginBottom: 8 }}>
            {taxPeriod()}
          </h1>
          <p style={{ fontSize: '.875rem', color: D.onSurfaceVar }}>
            Fiscal Year {fiscalYear()} &middot; {activeCompany.name}
          </p>
        </div>

        {/* Filing deadline — ambient floating chip */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 14,
          padding: '1rem 1.5rem', borderRadius: 16,
          background: isUrgent ? 'rgba(186,26,26,.05)' : D.surfaceBright,
          boxShadow: D.ambient,
        }}>
          <div style={{ width: 46, height: 46, borderRadius: 13, background: isUrgent ? 'rgba(186,26,26,.08)' : D.surfaceLow, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="event" filled size="1.35rem" color={isUrgent ? '#ba1a1a' : D.primary} />
          </div>
          <div>
            <p style={{ fontFamily: D.manrope, fontSize: '.65rem', fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: D.onSurfaceVar, marginBottom: 3 }}>
              Musak 9.1 Filing Deadline
            </p>
            <p style={{ fontFamily: D.manrope, fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-.025em', color: isUrgent ? '#ba1a1a' : D.onSurface }}>
              {deadlineDays} days remaining
            </p>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          KPI CARDS — tonal layering, no borders
          surface_container_lowest on surface_base
          Featured card: gradient navy (DESIGN.md)
          ════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5" style={{ marginBottom: 32 }}>
        {([
          {
            label: 'Output VAT',
            value: `৳ ${fmt(outputVat)}`,
            sub: `${vatData?.salesCount ?? s.salesInvoices.length} sales invoices`,
            icon: 'trending_up',
            featured: false,
          },
          {
            label: 'Input Tax Credit',
            value: `৳ ${fmt(inputVat)}`,
            sub: `${vatData?.purchaseCount ?? s.purchaseInvoices.length} purchases`,
            icon: 'trending_down',
            featured: false,
          },
          {
            label: 'Net VAT Payable',
            value: `৳ ${fmt(Math.max(0, netPayable))}`,
            sub: 'After input credit & VDS rebates',
            icon: 'account_balance',
            featured: true,
          },
          {
            label: 'Total Invoices',
            value: String(s.invoices.length),
            sub: `${s.draftCount} draft · ${s.approvedCount} posted`,
            icon: 'receipt_long',
            featured: false,
          },
        ] as const).map(({ label, value, sub, icon, featured }) => (
          <div
            key={label}
            style={{
              borderRadius: 20, padding: '1.625rem',
              background: featured ? D.grad : D.surfaceBright,
              boxShadow: featured ? '0 24px 60px rgba(0,29,82,.2)' : D.ambient,
              position: 'relative', overflow: 'hidden',
            }}
          >
            {/* Icon badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: featured ? 'rgba(255,255,255,.14)' : D.surfaceLow, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={icon} size="1.1rem" color={featured ? '#fff' : D.primary} />
              </div>
              {featured && (
                <span style={{ padding: '.2rem .625rem', borderRadius: 100, background: 'rgba(255,255,255,.14)', fontFamily: D.manrope, fontSize: '.6rem', fontWeight: 800, letterSpacing: '.06em', color: 'rgba(255,255,255,.8)' }}>
                  CURRENT PERIOD
                </span>
              )}
            </div>

            {/* Label */}
            <p style={{ fontFamily: D.manrope, fontSize: '.67rem', fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: featured ? 'rgba(255,255,255,.65)' : D.onSurfaceVar, marginBottom: 8 }}>
              {label}
            </p>

            {/* Value — display-lg per DESIGN.md "don't be afraid" */}
            <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 'clamp(1.6rem, 3vw, 2.25rem)', letterSpacing: '-.04em', lineHeight: 1, color: featured ? '#fff' : D.onSurface, marginBottom: 8 }}>
              {value}
            </p>

            {/* Sub */}
            <p style={{ fontSize: '.75rem', color: featured ? 'rgba(255,255,255,.55)' : D.onSurfaceVar, lineHeight: 1.5 }}>
              {sub}
            </p>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════════
          QUICK ACTIONS — horizontal pill strip
          surface_bright cards, ambient shadows
          ════════════════════════════════════════════ */}
      <div style={{ marginBottom: 32 }}>
        <Eyebrow>Quick Actions</Eyebrow>
        <div className="flex flex-wrap gap-3">
          {([
            { icon: 'add_notes',   label: 'New Invoice',  sub: 'Musak 6.3', path: '/invoices/new'  },
            { icon: 'inventory_2', label: 'Add Product',  sub: 'Inventory',  path: '/products/new'  },
            { icon: 'group_add',   label: 'Add Customer', sub: 'Contacts',   path: '/customers/new' },
            { icon: 'summarize',   label: 'View Reports', sub: 'Analytics',  path: '/reports'       },
          ]).map(a => (
            <button
              key={a.path}
              onClick={() => navigate(a.path)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 12,
                padding: '.875rem 1.25rem', borderRadius: 14,
                background: D.surfaceBright, border: 'none', cursor: 'pointer',
                boxShadow: D.ambient, transition: 'all .2s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 40px rgba(25,28,30,.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = D.ambient; }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 11, background: D.surfaceLow, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={a.icon} filled size="1.15rem" color={D.primary} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontFamily: D.manrope, fontWeight: 700, fontSize: '.875rem', color: D.onSurface, marginBottom: 1 }}>{a.label}</p>
                <p style={{ fontSize: '.72rem', color: D.onSurfaceVar }}>{a.sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          MAIN GRID — invoices (wide) + sidebar
          ════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Recent Invoices ────────────────────── */}
        <div className="lg:col-span-8">
          <Card>
            {/* Card header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.375rem 1.75rem', borderBottom: '1px solid rgba(196,198,207,.12)' }}>
              <div>
                <Eyebrow>Recent Activity</Eyebrow>
                <h3 style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-.025em', color: D.onSurface }}>
                  Musak 6.3 Challans
                </h3>
              </div>
              <button
                onClick={() => navigate('/invoices')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: D.manrope, fontSize: '.8125rem', fontWeight: 700, color: D.primary, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                View All <Icon name="arrow_forward" size=".9rem" color={D.primary} />
              </button>
            </div>

            {recent.length > 0 ? (
              <>
                {/* Table head */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 0, padding: '.75rem 1.75rem', background: D.surface }}>
                  {['Invoice No', 'Party / Date', 'VAT Amount', 'Status'].map((h, i) => (
                    <p key={h} style={{ fontFamily: D.manrope, fontSize: '.63rem', fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', color: D.onSurfaceVar, textAlign: i >= 2 ? 'right' : 'left' }}>
                      {h}
                    </p>
                  ))}
                </div>
                {/* Rows — DESIGN.md: no dividers, 4px bg shift on hover */}
                {recent.map((inv, idx) => {
                  const cfg = statusCfg[inv.status] ?? statusCfg.draft;
                  return (
                    <div
                      key={inv.id}
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                      style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr auto auto',
                        alignItems: 'center', gap: 0,
                        padding: '.875rem 1.75rem', cursor: 'pointer',
                        background: idx % 2 === 1 ? D.surface : 'transparent',
                        transition: 'background .15s ease',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = D.surfaceLow; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = idx % 2 === 1 ? D.surface : 'transparent'; }}
                    >
                      <div>
                        <p style={{ fontFamily: D.manrope, fontWeight: 700, fontSize: '.875rem', color: D.onSurface, marginBottom: 1 }}>{inv.challanNo}</p>
                        <p style={{ fontSize: '.72rem', color: D.onSurfaceVar }}>{inv.invoiceType === 'sales' ? 'Sales' : 'Purchase'}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '.8125rem', color: D.onSurface }}>{(inv as any).customer?.name || 'Walk-in'}</p>
                        <p style={{ fontSize: '.72rem', color: D.onSurfaceVar }}>{dayjs(inv.challanDate).format('DD MMM YYYY')}</p>
                      </div>
                      <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: '.875rem', color: D.onSurface, textAlign: 'right', paddingRight: 20, whiteSpace: 'nowrap' }}>
                        ৳ {fmt(Number(inv.vatTotal))}
                      </p>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '.22rem .65rem', borderRadius: 100, background: cfg.bg, fontFamily: D.manrope, fontSize: '.6rem', fontWeight: 800, letterSpacing: '.05em', color: cfg.color }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, display: 'inline-block', flexShrink: 0 }} />
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              /* Empty state — DESIGN.md: "editorial opportunities" */
              <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <div style={{ width: 60, height: 60, background: D.surfaceLow, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Icon name="receipt_long" size="1.75rem" color={D.onSurfaceVar} />
                </div>
                <p style={{ fontFamily: D.manrope, fontWeight: 700, fontSize: '1rem', color: D.onSurface, marginBottom: 6, letterSpacing: '-.02em' }}>
                  No invoices yet
                </p>
                <p style={{ fontSize: '.8125rem', color: D.onSurfaceVar, marginBottom: 20, lineHeight: 1.6 }}>
                  Create your first Musak 6.3 challan to get started.
                </p>
                <button
                  onClick={() => navigate('/invoices/new')}
                  style={{ background: D.grad, color: '#fff', padding: '.65rem 1.5rem', borderRadius: '1.5rem', fontFamily: D.manrope, fontWeight: 700, fontSize: '.875rem', border: 'none', cursor: 'pointer' }}
                >
                  Create Invoice
                </button>
              </div>
            )}
          </Card>
        </div>

        {/* ── Right sidebar ──────────────────────── */}
        <div className="lg:col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Compliance Status */}
          <Card style={{ padding: '1.5rem' }}>
            <Eyebrow>Compliance Status</Eyebrow>
            <div>
              {([
                {
                  label: 'System Setup',
                  sub: 'Master data & roles',
                  done: true,
                },
                {
                  label: 'Invoices Recorded',
                  sub: `${s.salesInvoices.length} sales / ${s.purchaseInvoices.length} purchases`,
                  done: true,
                },
                {
                  label: 'VAT Computed',
                  sub: `৳ ${fmt(outputVat)} output · ৳ ${fmt(inputVat)} input`,
                  done: true,
                },
                {
                  label: 'Return Filing',
                  sub: `Musak 9.1 — ${dayjs().format('MMMM')}`,
                  done: false,
                },
              ]).map((item, i, arr) => (
                <div
                  key={item.label}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 12, padding: '.875rem 0',
                    borderBottom: i < arr.length - 1 ? '1px solid rgba(196,198,207,.12)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: item.done ? D.tertiary : '#f7be06' }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontFamily: D.manrope, fontWeight: 700, fontSize: '.8125rem', color: D.onSurface, marginBottom: 1 }}>
                        {item.label}
                      </p>
                      <p style={{ fontSize: '.72rem', color: D.onSurfaceVar, lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.sub}
                      </p>
                    </div>
                  </div>
                  {item.done ? (
                    <Icon name="check_circle" filled size="1.1rem" color={D.tertiary} />
                  ) : (
                    <span style={{ padding: '.18rem .6rem', borderRadius: 100, background: 'rgba(247,190,6,.1)', fontFamily: D.manrope, fontSize: '.6rem', fontWeight: 800, letterSpacing: '.05em', color: '#584200', whiteSpace: 'nowrap' }}>
                      PENDING
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Primary CTA — gradient per DESIGN.md, no shadow */}
            <button
              onClick={() => navigate('/returns')}
              style={{
                width: '100%', marginTop: 16,
                padding: '.75rem', borderRadius: '1.5rem',
                background: D.grad, color: '#fff',
                border: 'none', cursor: 'pointer',
                fontFamily: D.manrope, fontWeight: 700, fontSize: '.875rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'opacity .2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '.88'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
            >
              Generate Return
              <Icon name="arrow_forward" size=".9rem" color="#fff" />
            </button>
          </Card>

          {/* Financial Summary — surface_container_low per DESIGN.md layering */}
          <div style={{ background: D.surfaceLow, borderRadius: 20, padding: '1.5rem' }}>
            <Eyebrow>Financial Summary</Eyebrow>
            <div>
              {([
                { label: 'Total Sales',       value: `৳ ${fmt(vatData?.totalSalesValue ?? 0)}`,    accent: D.tertiary  },
                { label: 'Total Purchases',   value: `৳ ${fmt(vatData?.totalPurchaseValue ?? 0)}`, accent: D.primary   },
                { label: 'Output VAT',        value: `৳ ${fmt(outputVat)}`,                        accent: D.tertiary  },
                { label: 'Input VAT Credit',  value: `৳ ${fmt(inputVat)}`,                         accent: D.primary   },
                { label: 'Fiscal Year',       value: fiscalYear(),                                  accent: D.onSurface },
              ]).map(({ label, value, accent }, i) => (
                <div
                  key={label}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '.625rem .75rem', borderRadius: 10, marginBottom: 2,
                    // 4px bg shift per DESIGN.md "Cards & Data Lists"
                    background: i % 2 === 0 ? 'rgba(255,255,255,.7)' : 'transparent',
                  }}
                >
                  <p style={{ fontSize: '.78rem', color: D.onSurfaceVar }}>{label}</p>
                  <p style={{ fontFamily: D.manrope, fontWeight: 700, fontSize: '.8125rem', color: accent }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
