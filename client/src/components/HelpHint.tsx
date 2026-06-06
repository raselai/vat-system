import { useState } from 'react';
import { D, Icon } from '../styles/design';
import { useLang } from '../contexts/LanguageContext';

/**
 * A dismissible "What is this page?" callout for the jargon-heavy screens
 * (Returns, VDS, TDS, Registers). Dismissal is remembered per `id` in localStorage
 * so it does not nag returning users.
 */
export default function HelpHint({
  id,
  title,
  children,
}: {
  id: string;
  title?: string;
  children: React.ReactNode;
}) {
  const { t } = useLang();
  const storageKey = `helpHint.dismissed.${id}`;
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(storageKey) === '1');

  if (dismissed) return null;

  const close = () => {
    localStorage.setItem(storageKey, '1');
    setDismissed(true);
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        background: D.navy10,
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 20,
        alignItems: 'flex-start',
      }}
    >
      <div style={{ width: 30, height: 30, borderRadius: 9, background: D.surfaceBright, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name="lightbulb" filled size={18} style={{ color: D.primary }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: D.manrope, fontWeight: 700, fontSize: 13, color: D.onSurface, margin: '0 0 4px' }}>
          {title ?? t('help.whatIsThis')}
        </p>
        <div style={{ fontFamily: D.inter, fontSize: 13, color: D.onSurfaceVar, lineHeight: 1.6 }}>
          {children}
        </div>
      </div>
      <button
        type="button"
        onClick={close}
        title={t('help.gotIt')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.onSurfaceVar, padding: 2, display: 'flex', flexShrink: 0 }}
      >
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}
