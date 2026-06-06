import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { strings, type Lang, type StringKey } from '../i18n/strings';

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  /** Translate a key into the active language. */
  t: (key: StringKey) => string;
}

const STORAGE_KEY = 'appLang';
const DEFAULT_LANG: Lang = 'en'; // change to 'bn' to default Bangla-first

export const LanguageContext = createContext<LanguageContextType | null>(null);

function readInitialLang(): Lang {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'en' || saved === 'bn' ? saved : DEFAULT_LANG;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readInitialLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggleLang = useCallback(() => {
    setLangState(prev => {
      const next: Lang = prev === 'en' ? 'bn' : 'en';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const t = useCallback((key: StringKey) => strings[lang][key] ?? strings.en[key] ?? key, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within a LanguageProvider');
  return ctx;
}
