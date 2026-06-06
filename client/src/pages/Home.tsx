import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { D, Icon } from '../styles/design';
import { useLang } from '../contexts/LanguageContext';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../hooks/useAuth';
import { getVatSummary } from '../services/reports.service';
import type { VatSummary } from '../types';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

function daysUntilDeadline() {
  const now = dayjs();
  const deadline = now.date() > 15 ? now.add(1, 'month').date(15) : now.date(15);
  return deadline.diff(now, 'day');
}

/**
 * Simple-Mode Home — the default landing for business owners.
 * Goal-oriented task cards (plain language + Bangla) that route into the existing
 * screens, plus a "this month in plain words" summary. The detailed accountant
 * view still lives at /dashboard ("Overview").
 */
export default function Home() {
  const { t } = useLang();
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vat, setVat] = useState<VatSummary | null>(null);

  useEffect(() => {
    if (!activeCompany) return;
    getVatSummary(dayjs().format('YYYY-MM')).then(setVat).catch(() => setVat(null));
  }, [activeCompany]);

  const tasks = [
    { icon: 'point_of_sale',   key: 'recordSale',     path: '/invoices/new?type=sales',    tone: D.tertiary },
    { icon: 'shopping_cart',   key: 'recordPurchase', path: '/invoices/new?type=purchase', tone: D.primary  },
    { icon: 'request_quote',   key: 'customersOwe',   path: '/accounts/ar',                tone: D.tertiary },
    { icon: 'money_off',       key: 'iOwe',           path: '/accounts/ap',                tone: D.primary  },
    { icon: 'calculate',       key: 'taxThisMonth',   path: '/reports',                    tone: D.primary  },
    { icon: 'assignment_turned_in', key: 'fileReturn', path: '/returns',                   tone: D.tertiary },
  ] as const;

  const deadline = daysUntilDeadline();
  const deadlineLabel =
    deadline < 0 ? t('home.overdue') : deadline === 0 ? t('home.dueToday') : `${deadline} ${t('home.daysLeft')}`;

  const summary = [
    { label: t('home.collected'), sub: t('home.collectedSub'), value: vat?.outputVat ?? 0,                accent: D.tertiary },
    { label: t('home.paid'),      sub: t('home.paidSub'),      value: vat?.inputVat ?? 0,                 accent: D.primary  },
    { label: t('home.owe'),       sub: t('home.oweSub'),       value: Math.max(0, vat?.netPayable ?? 0),  accent: D.onSurface, strong: true },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', fontFamily: D.inter }}>
      {/* Greeting */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: D.primary, margin: '0 0 8px' }}>
          {t('home.eyebrow')}{user?.fullName ? `, ${user.fullName}` : ''}
        </p>
        <h1 style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 'clamp(1.8rem, 4vw, 2.75rem)', letterSpacing: '-0.03em', color: D.onSurface, margin: '0 0 6px', lineHeight: 1.1 }}>
          {t('home.greeting')}
        </h1>
        <p style={{ fontSize: 14, color: D.onSurfaceVar, margin: 0 }}>{t('home.sub')}</p>
      </div>

      {/* Task cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 36 }}>
        {tasks.map(task => (
          <button
            key={task.key}
            onClick={() => navigate(task.path)}
            style={{
              display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left',
              background: D.surfaceBright, border: 'none', cursor: 'pointer',
              borderRadius: 18, padding: '20px 22px', boxShadow: D.ambient, transition: 'all .18s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 22px 44px rgba(25,28,30,.10)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = D.ambient; }}
          >
            <div style={{ width: 52, height: 52, borderRadius: 14, background: D.surfaceLow, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name={task.icon} filled size={26} style={{ color: task.tone }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontFamily: D.manrope, fontWeight: 700, fontSize: 15, color: D.onSurface, margin: '0 0 3px', lineHeight: 1.25 }}>
                {t(`task.${task.key}` as const)}
              </p>
              <p style={{ fontFamily: D.inter, fontSize: 12.5, color: D.onSurfaceVar, margin: 0, lineHeight: 1.4 }}>
                {t(`task.${task.key}Sub` as const)}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* This month, in plain words */}
      {activeCompany && (
        <div style={{ background: D.surfaceBright, borderRadius: 20, padding: '24px 26px', boxShadow: D.ambient }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            <div>
              <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: D.onSurfaceVar, margin: '0 0 4px' }}>
                {t('home.thisMonth')}
              </p>
              <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 18, color: D.onSurface, margin: 0 }}>
                {dayjs().format('MMMM YYYY')}
              </p>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: deadline <= 5 ? D.redBg : D.surfaceLow, borderRadius: 12, padding: '8px 14px' }}>
              <Icon name="event" filled size={18} style={{ color: deadline <= 5 ? D.red : D.primary }} />
              <span style={{ fontFamily: D.manrope, fontWeight: 700, fontSize: 13, color: deadline <= 5 ? D.red : D.onSurface }}>
                {t('home.deadline')}: {deadlineLabel}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {summary.map(row => (
              <div key={row.label} style={{ background: row.strong ? D.grad : D.surfaceLow, borderRadius: 14, padding: '18px 20px' }}>
                <p style={{ fontFamily: D.inter, fontSize: 12.5, color: row.strong ? 'rgba(255,255,255,0.75)' : D.onSurfaceVar, margin: '0 0 8px', lineHeight: 1.4 }}>
                  {row.label}
                </p>
                <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 24, letterSpacing: '-0.02em', color: row.strong ? '#fff' : row.accent, margin: '0 0 2px' }}>
                  ৳ {fmt(row.value)}
                </p>
                <p style={{ fontFamily: D.inter, fontSize: 11, color: row.strong ? 'rgba(255,255,255,0.55)' : D.onSurfaceVar, margin: 0 }}>
                  {row.sub}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
