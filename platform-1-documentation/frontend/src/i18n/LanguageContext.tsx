import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { ar } from './translations/ar';
import { en } from './translations/en';

export type Language = 'ar' | 'en';
export type Direction = 'rtl' | 'ltr';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  direction: Direction;
  isRtl: boolean;
  t: (key: string, params?: Record<string, string | number>, defaultVal?: string) => string;
  getLocalized: (item: { ar?: string; en?: string; [key: string]: any } | string | undefined, defaultVal?: string) => string;
}

const STORAGE_KEY = 'ultimate_pay_language';

const translations: Record<Language, any> = {
  ar,
  en,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Read saved language or default to Arabic ('ar')
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'ar' || saved === 'en') {
        return saved;
      }
    } catch {
      // Ignore localStorage errors
    }
    return 'ar';
  });

  const direction: Direction = language === 'ar' ? 'rtl' : 'ltr';
  const isRtl = direction === 'rtl';

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  // Sync document root direction and language attribute
  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', direction);
    document.body.setAttribute('dir', direction);
    
    if (language === 'en') {
      document.documentElement.classList.add('lang-en');
      document.documentElement.classList.remove('lang-ar');
    } else {
      document.documentElement.classList.add('lang-ar');
      document.documentElement.classList.remove('lang-en');
    }
  }, [language, direction]);

  // Nested translation lookup with parameter interpolation: t('header.catalogStats', { sectors: 4, endpoints: 8 })
  const t = useMemo(() => {
    return (path: string, params?: Record<string, string | number>, defaultVal?: string): string => {
      const keys = path.split('.');
      let current: any = translations[language];

      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k];
        } else {
          current = undefined;
          break;
        }
      }

      // Fallback to English if not found in current language
      if (current === undefined && language !== 'en') {
        let fallback: any = translations.en;
        for (const k of keys) {
          if (fallback && typeof fallback === 'object' && k in fallback) {
            fallback = fallback[k];
          } else {
            fallback = undefined;
            break;
          }
        }
        current = fallback;
      }

      let text = typeof current === 'string' ? current : defaultVal || path;

      // Replace interpolated variables: {varName}
      if (params && typeof text === 'string') {
        for (const [pKey, pVal] of Object.entries(params)) {
          text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
        }
      }

      return text;
    };
  }, [language]);

  // Localized object helper
  const getLocalized = (
    item: { ar?: string; en?: string; [key: string]: any } | string | undefined,
    defaultVal: string = ''
  ): string => {
    if (!item) return defaultVal;
    if (typeof item === 'string') return item;
    if (language === 'en' && item.en) return item.en;
    if (language === 'ar' && item.ar) return item.ar;
    return item.ar || item.en || defaultVal;
  };

  const contextValue = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      direction,
      isRtl,
      t,
      getLocalized,
    }),
    [language, direction, isRtl, t]
  );

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
