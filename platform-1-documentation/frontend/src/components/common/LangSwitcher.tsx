import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../../i18n';

interface LangSwitcherProps {
  className?: string;
}

export const LangSwitcher: React.FC<LangSwitcherProps> = ({ className = '' }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`lang-switcher-pill ${className}`} title="تبديل اللغة / Switch Language">
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', color: 'var(--text-dim)' }}>
        <Globe size={13} />
      </div>
      <button
        type="button"
        className={`lang-switcher-btn ${language === 'ar' ? 'active' : ''}`}
        onClick={() => setLanguage('ar')}
      >
        العربية
      </button>
      <button
        type="button"
        className={`lang-switcher-btn ${language === 'en' ? 'active' : ''}`}
        onClick={() => setLanguage('en')}
      >
        English
      </button>
    </div>
  );
};
