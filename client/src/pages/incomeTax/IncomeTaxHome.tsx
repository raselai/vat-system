import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { D, Icon } from '../../styles/design';
import { useLang } from '../../contexts/LanguageContext';
import { useAuth } from '../../hooks/useAuth';
import { listComputations } from '../../services/incomeTax';
import type { IncomeTaxComputation } from '../../types';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

/** Days until the next individual "Tax Day" (30 November). */
function daysUntilTaxDay() {
  const now = dayjs();
  let taxDay = dayjs(new Date(now.year(), 10, 30)); // month is 0-indexed → 10 = Nov
  if (now.isAfter(taxDay, 'day')) taxDay = taxDay.add(1, 'year');
  return taxDay.diff(now, 'day');
}

/**
 * Income-Tax Home — the default landing for income-tax-only users (userType
 * 'income_tax' with no company). Mirrors the owner Home: greeting, a primary
 * "Calculate my tax" action, the year-by-year saved computations, and the
 * Tax Day reminder. Soft separation: an "I also run a company" card lets them
 * add a company and unlock the full VAT experience.
 */
export default function IncomeTaxHome() {
  const { t } = useLang();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<IncomeTaxComputation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listComputations()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const days = daysUntilTaxDay();

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', fontFamily: D.inter }}>
      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: D.tertiary, margin: '0 0 8px' }}>
          {t('ithome.eyebrow')}{user?.fullName ? `, ${user.fullName}` : ''}
        </p>
        <h1 style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', letterSpacing: '-0.03em', color: D.onSurface, margin: '0 0 6px', lineHeight: 1.1 }}>
          {t('ithome.greeting')}
        </h1>
        <p style={{ fontSize: 14, color: D.onSurfaceVar, margin: 0 }}>{t('ithome.sub')}</p>
      </div>

      {/* Primary actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 30 }}>
        {/* Calculate */}
        <button
          onClick={() => navigate('/income-tax')}
          style={{
            display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left',
            background: D.grad, border: 'none', cursor: 'pointer',
            borderRadius: 18, padding: '22px 24px', boxShadow: D.ambient,
          }}
        >
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="calculate" filled size={26} style={{ color: '#fff' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 16, color: '#fff', margin: '0 0 3px' }}>{t('ithome.calculate')}</p>
            <p style={{ fontFamily: D.inter, fontSize: 12.5, color: 'rgba(255,255,255,0.7)', margin: 0 }}>{t('ithome.calculateSub')}</p>
          </div>
        </button>

        {/* Tax Day reminder */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: D.surfaceBright, borderRadius: 18, padding: '22px 24px', boxShadow: D.ambient }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: D.surfaceLow, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="event" filled size={26} style={{ color: D.tertiary }} />
          </div>
          <div>
            <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 16, color: D.onSurface, margin: '0 0 3px' }}>
              {days} {t('home.daysLeft')}
            </p>
            <p style={{ fontFamily: D.inter, fontSize: 12.5, color: D.onSurfaceVar, margin: 0 }}>
              {t('ithome.deadlineLabel')} · {t('ithome.taxDay')}
            </p>
          </div>
        </div>
      </div>

      {/* Saved computations */}
      <div style={{ background: D.surfaceBright, borderRadius: 20, padding: '24px 26px', boxShadow: D.ambient, marginBottom: 24 }}>
        <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: D.onSurfaceVar, margin: '0 0 16px' }}>
          {t('ithome.saved')}
        </p>

        {loading ? null : rows.length === 0 ? (
          <p style={{ fontSize: 14, color: D.onSurfaceVar, margin: 0 }}>{t('ithome.empty')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map(row => {
              const refund = row.refundable > 0;
              return (
                <button
                  key={row.id}
                  onClick={() => navigate('/income-tax')}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    background: D.surfaceLow, border: 'none', cursor: 'pointer',
                    borderRadius: 14, padding: '16px 18px', textAlign: 'left',
                  }}
                >
                  <div>
                    <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 15, color: D.onSurface, margin: '0 0 2px' }}>
                      {row.assessmentYear}
                    </p>
                    <p style={{ fontFamily: D.inter, fontSize: 12.5, color: D.onSurfaceVar, margin: 0 }}>
                      {t('ithome.netPayable')}: ৳ {fmt(row.taxAfterMinimum)}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', color: refund ? D.tertiary : D.onSurface, margin: 0 }}>
                      ৳ {fmt(refund ? row.refundable : row.netPayable)}
                    </p>
                    <p style={{ fontFamily: D.inter, fontSize: 11, color: D.onSurfaceVar, margin: 0 }}>
                      {refund ? t('ithome.refundable') : t('ithome.netPayable')}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Add a company (soft upgrade to VAT) */}
      <button
        onClick={() => navigate('/welcome')}
        style={{
          display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left',
          background: 'transparent', border: `1px dashed ${D.onSurfaceVar}55`, cursor: 'pointer',
          borderRadius: 16, padding: '18px 20px',
        }}
      >
        <div style={{ width: 44, height: 44, borderRadius: 12, background: D.surfaceLow, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="add_business" size={24} style={{ color: D.primary }} />
        </div>
        <div>
          <p style={{ fontFamily: D.manrope, fontWeight: 700, fontSize: 14.5, color: D.onSurface, margin: '0 0 2px' }}>{t('ithome.addCompany')}</p>
          <p style={{ fontFamily: D.inter, fontSize: 12.5, color: D.onSurfaceVar, margin: 0 }}>{t('ithome.addCompanySub')}</p>
        </div>
      </button>
    </div>
  );
}
