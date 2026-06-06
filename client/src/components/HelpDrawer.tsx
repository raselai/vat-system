import { useMemo, useState } from 'react';
import { Drawer, Input } from 'antd';
import { D, Icon } from '../styles/design';
import { useLang } from '../contexts/LanguageContext';
import { GLOSSARY, MODULES } from '../content/help';

/**
 * Slide-over help panel opened from the "?" button in the app header.
 * Surfaces the plain-language glossary + per-screen help (from content/help.ts),
 * in the active language, with a simple search filter.
 */
export default function HelpDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang } = useLang();
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();

  const glossary = useMemo(
    () => GLOSSARY.filter(g => !q || g.term.toLowerCase().includes(q) || g.meaning[lang].toLowerCase().includes(q)),
    [q, lang],
  );
  const modules = useMemo(
    () => MODULES.filter(m => !q || m.title[lang].toLowerCase().includes(q) || m.what[lang].toLowerCase().includes(q)),
    [q, lang],
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={460}
      title={
        <div>
          <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 16, color: D.onSurface, margin: 0 }}>{t('help.title')}</p>
          <p style={{ fontFamily: D.inter, fontSize: 12, color: D.onSurfaceVar, margin: '2px 0 0' }}>{t('help.subtitle')}</p>
        </div>
      }
      styles={{ body: { background: D.surface, padding: 20 } }}
    >
      <Input
        allowClear
        size="large"
        placeholder={t('help.search')}
        prefix={<Icon name="search" size={18} style={{ color: D.onSurfaceVar }} />}
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{ marginBottom: 24, borderRadius: 12 }}
      />

      {/* Glossary */}
      {glossary.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: D.onSurfaceVar, margin: '0 0 12px' }}>
            {t('help.glossary')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {glossary.map(g => (
              <div key={g.term} style={{ background: D.surfaceBright, borderRadius: 12, padding: '12px 14px', boxShadow: D.ambient }}>
                <p style={{ fontFamily: D.manrope, fontWeight: 700, fontSize: 13, color: D.primary, margin: '0 0 4px' }}>{g.term}</p>
                <p style={{ fontFamily: D.inter, fontSize: 12.5, color: D.onSurfaceVar, margin: 0, lineHeight: 1.6 }}>{g.meaning[lang]}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Modules */}
      {modules.length > 0 && (
        <section>
          <p style={{ fontFamily: D.manrope, fontWeight: 800, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: D.onSurfaceVar, margin: '0 0 12px' }}>
            {t('help.modules')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {modules.map(m => (
              <div key={m.id} style={{ background: D.surfaceBright, borderRadius: 12, padding: '14px 16px', boxShadow: D.ambient }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: D.surfaceLow, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name={m.icon} size={18} style={{ color: D.primary }} />
                  </div>
                  <p style={{ fontFamily: D.manrope, fontWeight: 700, fontSize: 13.5, color: D.onSurface, margin: 0 }}>{m.title[lang]}</p>
                </div>
                <p style={{ fontFamily: D.inter, fontSize: 12.5, color: D.onSurfaceVar, margin: '0 0 6px', lineHeight: 1.6 }}>{m.what[lang]}</p>
                <p style={{ fontFamily: D.inter, fontSize: 12.5, color: D.onSurface, margin: 0, lineHeight: 1.6 }}>
                  <strong style={{ fontFamily: D.manrope }}>→ </strong>{m.how[lang]}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {glossary.length === 0 && modules.length === 0 && (
        <p style={{ fontFamily: D.inter, fontSize: 13, color: D.onSurfaceVar, textAlign: 'center', marginTop: 40 }}>—</p>
      )}
    </Drawer>
  );
}
