import { useNavigate, Link } from 'react-router-dom';
import { D, Icon } from '../styles/design';
import { useLang } from '../contexts/LanguageContext';
import type { UserType } from '../types';

/**
 * Onboarding fork shown when a visitor clicks "Get Started" on the landing page.
 * Lets them declare whether they're a Company (VAT) user or an Income Tax payer,
 * then carries that choice into registration via `?type=`. Soft separation: the
 * choice only steers onboarding + default home; nothing is permanently locked.
 */
export default function GetStarted() {
  const navigate = useNavigate();
  const { t } = useLang();

  const choose = (type: UserType) => navigate(`/register?type=${type}`);

  const cards: { type: UserType; icon: string; title: string; desc: string; tag: string; tone: string }[] = [
    {
      type: 'company',
      icon: 'account_balance',
      title: t('getStarted.company.title'),
      desc: t('getStarted.company.desc'),
      tag: t('getStarted.company.tag'),
      tone: D.primary,
    },
    {
      type: 'income_tax',
      icon: 'account_balance_wallet',
      title: t('getStarted.incomeTax.title'),
      desc: t('getStarted.incomeTax.desc'),
      tag: t('getStarted.incomeTax.tag'),
      tone: D.tertiary,
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '32px 20px',
        background: D.surfaceLow, fontFamily: D.inter,
      }}
    >
      <div style={{ maxWidth: 760, width: '100%' }}>
        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: D.primary, margin: '0 0 8px' }}>
            {t('getStarted.eyebrow')}
          </p>
          <h1 style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', letterSpacing: '-0.03em', color: D.onSurface, margin: '0 0 8px', lineHeight: 1.15 }}>
            {t('getStarted.title')}
          </h1>
          <p style={{ fontSize: 14.5, color: D.onSurfaceVar, margin: 0 }}>{t('getStarted.sub')}</p>
        </div>

        {/* Choice cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
          {cards.map(card => (
            <button
              key={card.type}
              onClick={() => choose(card.type)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14, textAlign: 'left',
                background: D.surfaceBright, border: 'none', cursor: 'pointer',
                borderRadius: 20, padding: '28px 26px', boxShadow: D.ambient, transition: 'all .18s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 22px 44px rgba(25,28,30,.10)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = D.ambient; }}
            >
              <div style={{ width: 56, height: 56, borderRadius: 16, background: D.surfaceLow, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={card.icon} filled size={30} style={{ color: card.tone }} />
              </div>
              <div>
                <span style={{ display: 'inline-block', fontFamily: D.manrope, fontWeight: 800, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: card.tone, background: D.surfaceLow, borderRadius: 8, padding: '3px 8px', marginBottom: 10 }}>
                  {card.tag}
                </span>
                <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 19, color: D.onSurface, margin: '0 0 6px', lineHeight: 1.2 }}>
                  {card.title}
                </p>
                <p style={{ fontFamily: D.inter, fontSize: 13.5, color: D.onSurfaceVar, margin: 0, lineHeight: 1.45 }}>
                  {card.desc}
                </p>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: D.manrope, fontWeight: 700, fontSize: 13.5, color: card.tone, marginTop: 'auto' }}>
                {t('getStarted.eyebrow')}
                <Icon name="arrow_forward" size={18} style={{ color: card.tone }} />
              </span>
            </button>
          ))}
        </div>

        {/* Sign in */}
        <p style={{ textAlign: 'center', marginTop: 28, fontSize: 14, color: D.onSurfaceVar }}>
          {t('getStarted.haveAccount')}{' '}
          <Link to="/login" style={{ color: D.primary, fontWeight: 700 }}>{t('getStarted.signIn')}</Link>
        </p>
      </div>
    </div>
  );
}
