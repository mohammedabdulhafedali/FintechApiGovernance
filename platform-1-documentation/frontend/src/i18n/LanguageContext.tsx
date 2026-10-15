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

  // Auto-translation dictionary for common API terminology when string is passed
  const AUTO_TRANSLATE_EN_TO_AR: Record<string, string> = {
    'Financial Institutions (FI) API Documentation': 'توثيق واجهات برمجة التطبيقات للمؤسسات المالية (FI)',
    'Ultimate Pay Platform': 'منصة ألتيميت باي (Ultimate Pay Platform)',
    'Overview': 'نظرة عامة والنبذة المعمارية',
    'Base URL': 'الرابط الأساسي للبوابة (Base URL)',
    'Authentication': 'المصادقة والتشفير الرقمي',
    'Digital Signature Standard': 'معيار التوقيع الرقمي السيادي',
    'Canonical String Format': 'صيغة السلسلة الكنونية (Canonical String Format)',
    'Signature Verification Steps': 'خطوات التحقق من التوقيع الرقمي',
    'Timestamp & Replay Protection': 'الطابع الزمني والحماية من إعادة التشغيل',
    'Mandatory Standard Headers': 'رؤوس الطلبات المعيارية الإلزامية',
    'Request Parameters & Schema': 'معاملات ومخطط بيانات الطلب',
    'Banking Business Validation Rules': 'قواعد العمل والرقابة المصرفية',
    'Request Payload Sample': 'عينة جسم الطلب (Request Payload)',
    'Successful Response (200 OK)': 'الاستجابة الناجحة (200 OK)',
    'Business Validation Failure (422 Unprocessable)': 'استجابة الرفض الرقابي (422 Unprocessable)',
    'Executable cURL Command': 'أمر cURL التنفيذي',
    'Execute instant bank transfer matching clearing ceiling and national rules.': 'تنفيذ أمر تحويل بنكي فوري مطابق لسقف العمليات وضوابط المقاصة الوطنية.',
    'Instant query for transfer processing and final settlement status.': 'الاستعلام الفوري عن حالة المعالجة والتسوية النهائية للحوالة.',
    'Core collection and instant payment processing platform across banks and merchants': 'نظام التحصيل والدفع اللحظي ومعالجة العمليات المالية والمصرفية بين البنوك والتجار',
    'The Ultimate Pay Financial Institutions (FI) API enables financial institutions to seamlessly integrate payment, inquiry, biller discovery, and transaction management services. All API requests are authenticated using RSA-SHA256 digital signatures to ensure end-to-end message integrity and non-repudiation.': 'تُمكّن واجهات برمجة تطبيقات المؤسسات المالية (FI) في منصة ألتيميت باي المؤسسات المالية من الربط السلس مع خدمات الدفع والاستعلام واكتشاف المفوترين وإدارة العمليات. يتم توثيق كافة طلبات الـ API وتأمينها باستخدام التواقيع الرقمية RSA-SHA256 لضمان سلامة الرسائل ومنع الإنكار.',
    'Active': 'نشط ومعتمد',
    'Draft': 'مسودة سنوية',
    'Archived': 'مؤرشف',
    'Required': 'إلزامي',
    'Optional': 'اختياري',
  };

  const AUTO_TRANSLATE_AR_TO_EN: Record<string, string> = {
    'تُمكّن واجهات برمجة تطبيقات المؤسسات المالية (FI) في منصة ألتيميت باي المؤسسات المالية من الربط السلس مع خدمات الدفع والاستعلام واكتشاف المفوترين وإدارة العمليات. يتم توثيق كافة طلبات الـ API وتأمينها باستخدام التواقيع الرقمية RSA-SHA256 لضمان سلامة الرسائل ومنع الإنكار.': 'The Ultimate Pay Financial Institutions (FI) API enables financial institutions to seamlessly integrate payment, inquiry, biller discovery, and transaction management services. All API requests are authenticated using RSA-SHA256 digital signatures to ensure end-to-end message integrity and non-repudiation.',
    'توثيق واجهات برمجة التطبيقات للمؤسسات المالية (FI)': 'Financial Institutions (FI) API Documentation',
    'منصة ألتيميت باي': 'Ultimate Pay Platform',
    'نظرة عامة والنبذة المعمارية': 'Overview & Architectural Foundation',
    'الرابط الأساسي للبوابة': 'Gateway Base URL',
    'المصادقة والتشفير الرقمي': 'Authentication & Cryptographic Standards',
    'معيار التوقيع الرقمي السيادي': 'Digital Signature Standard',
    'صيغة السلسلة الكنونية (Canonical String Format)': 'Canonical String Format',
    'خطوات التحقق من التوقيع الرقمي': 'Signature Verification Steps',
    'الطابع الزمني والحماية من إعادة التشغيل': 'Timestamp & Replay Protection',
    'رؤوس الطلبات المعيارية الإلزامية': 'Standard Mandatory Headers',
    'معاملات ومخطط بيانات الطلب': 'Request Parameters & Schema',
    'قواعد العمل والرقابة المصرفية': 'Banking Business Validation Rules',
    'عينة جسم الطلب (Request Payload)': 'Request Payload Sample',
    'الاستجابة الناجحة (200 OK)': 'Successful Response (200 OK)',
    'استجابة الرفض الرقابي (422 Unprocessable)': 'Business Validation Failure (422 Unprocessable)',
    'أمر cURL التنفيذي': 'Executable cURL Command',
    'تنفيذ أمر تحويل بنكي فوري مطابق لسقف العمليات وضوابط المقاصة الوطنية.': 'Execute instant bank transfer matching clearing ceiling and national rules.',
    'الاستعلام الفوري عن حالة المعالجة والتسوية النهائية للحوالة.': 'Instant query for transfer processing and final settlement status.',
    'نظام التحصيل والدفع اللحظي ومعالجة العمليات المالية والمصرفية بين البنوك والتجار': 'Core collection and instant payment processing platform across banks and merchants',
    'البنوك والمصارف المركزية وغرف المقاصة': 'Banks & Clearing Houses',
    'نشط': 'Active',
    'مجمد': 'Suspended',
    'إلزامي': 'Required',
    'اختياري': 'Optional',
  };

  // Localized object helper with deep key extraction & fallback auto-translation
  const getLocalized = (
    item: { [key: string]: any } | string | undefined,
    defaultVal: string = ''
  ): string => {
    if (!item) return defaultVal;

    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (language === 'ar' && AUTO_TRANSLATE_EN_TO_AR[trimmed]) {
        return AUTO_TRANSLATE_EN_TO_AR[trimmed];
      }
      if (language === 'en' && AUTO_TRANSLATE_AR_TO_EN[trimmed]) {
        return AUTO_TRANSLATE_AR_TO_EN[trimmed];
      }
      return item;
    }

    if (language === 'en') {
      const enVal = item.en || item.nameEn || item.descEn || item.descriptionEn || item.ruleEn || item.messageEn || item.solutionEn;
      if (enVal) return enVal;
      // If only arabic exists, check dictionary
      const arFallback = item.ar || item.name || item.desc || item.description || item.rule || item.message || item.solution;
      if (typeof arFallback === 'string' && AUTO_TRANSLATE_AR_TO_EN[arFallback.trim()]) {
        return AUTO_TRANSLATE_AR_TO_EN[arFallback.trim()];
      }
      return arFallback || defaultVal;
    }

    if (language === 'ar') {
      const arVal = item.ar || item.name || item.desc || item.description || item.rule || item.message || item.solution;
      if (arVal) return arVal;
      // If only english exists, check dictionary
      const enFallback = item.en || item.nameEn || item.descEn || item.descriptionEn || item.ruleEn || item.messageEn || item.solutionEn;
      if (typeof enFallback === 'string' && AUTO_TRANSLATE_EN_TO_AR[enFallback.trim()]) {
        return AUTO_TRANSLATE_EN_TO_AR[enFallback.trim()];
      }
      return enFallback || defaultVal;
    }

    return defaultVal;
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
    [language, direction, isRtl, t, getLocalized]
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
