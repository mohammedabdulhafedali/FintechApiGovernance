import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../i18n';

interface LangSwitcherProps {
  className?: string;
}

export const LangSwitcher: React.FC<LangSwitcherProps> = ({ className = '' }) => {
  const { language, setLanguage, isRtl } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (lang: 'ar' | 'en') => {
    setLanguage(lang);
    setIsOpen(false);
  };

  return (
    <div className={`lang-dropdown-wrap ${className}`} ref={containerRef}>
      <button
        type="button"
        className={`lang-dropdown-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(prev => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title={isRtl ? 'تبديل لغة المنظومة' : 'Switch Language'}
      >
        <Globe size={14} className="lang-globe-icon" />
        <span className="lang-current-label">
          {language === 'ar' ? 'العربية' : 'English'}
        </span>
        <ChevronDown size={11} className={`lang-chevron ${isOpen ? 'rotated' : ''}`} />
      </button>

      {isOpen && (
        <div className={`lang-dropdown-menu ${isRtl ? 'rtl' : 'ltr'}`}>
          <button
            type="button"
            className={`lang-menu-item ${language === 'ar' ? 'selected' : ''}`}
            onClick={() => handleSelect('ar')}
          >
            <span>العربية</span>
            {language === 'ar' && <Check size={13} className="check-icon" />}
          </button>
          <button
            type="button"
            className={`lang-menu-item ${language === 'en' ? 'selected' : ''}`}
            onClick={() => handleSelect('en')}
          >
            <span>English</span>
            {language === 'en' && <Check size={13} className="check-icon" />}
          </button>
        </div>
      )}
    </div>
  );
};
