import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  Copy, 
  Check, 
  Moon,
  Sun,
  Menu
} from 'lucide-react';
import { useLanguage } from '../../i18n';
import { LangSwitcher } from '../common/LangSwitcher';

interface HeaderProps {
  currentVersion: string;
  onVersionChange: (version: string) => void;
  onNotify?: (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error', snippet?: string) => void;
  activeView?: any;
  activeSector?: any;
  onOpenAddApi?: () => void;
  onOpenAddSector?: () => void;
  onBackToDashboard?: () => void;
  totalSectorsCount?: number;
  totalEndpointsCount?: number;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentVersion,
  onVersionChange,
  onNotify,
  onToggleMobileMenu
}) => {
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('gov_theme') as 'dark' | 'light') || 'dark';
  });
  const { t, isRtl } = useLanguage();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gov_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleCopyBaseUrl = () => {
    navigator.clipboard.writeText('https://api.gov.fintech');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onNotify) {
      onNotify(
        t('header.copiedBaseUrlTitle'),
        t('header.copiedBaseUrlMsg'),
        'info',
        'https://api.gov.fintech'
      );
    }
  };

  return (
    <header className="topbar">
      {/* 1. Permanent Info Zone: Release & Base URL */}
      <div className="topbar-left-zone">
        {/* Mobile Hamburger Menu Button */}
        {onToggleMobileMenu && (
          <button
            type="button"
            className="btn-mobile-menu-toggle"
            onClick={onToggleMobileMenu}
            aria-label="Toggle navigation menu"
            title={isRtl ? 'فتح القائمة الرئيسية' : 'Open Navigation Menu'}
          >
            <Menu size={18} />
          </button>
        )}

        {/* Item 1: Global Platform Release Selector */}
        <div className="global-release-wrap">
          <GitBranch size={13} style={{ color: 'var(--emerald)' }} />
          <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontWeight: 700 }}>
            {isRtl ? 'الإصدار العام:' : 'Release:'}
          </span>
          <select
            value={currentVersion}
            onChange={(e) => onVersionChange(e.target.value)}
            className="global-release-select"
          >
            <option value="v2026.2">v2026.2 ({isRtl ? 'رسمي معتمد' : 'Official Certified'})</option>
            <option value="v2026.1">v2026.1 ({isRtl ? 'مؤرشف' : 'Archived'})</option>
            <option value="v2027.0-draft">v2027.0 ({isRtl ? 'مسودة سنوية' : 'Annual Draft'})</option>
          </select>
        </div>

        {/* Item 2: Permanent Base URL */}
        <div className="topbar-base-url-wrap">
          <button
            onClick={handleCopyBaseUrl}
            className="btn btn-ghost"
            style={{ 
              padding: '0.2rem 0.45rem', 
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              background: 'rgba(255, 255, 255, 0.06)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}
            title={t('header.copyBaseUrl')}
          >
            {copied ? <Check size={12} style={{ color: 'var(--emerald)' }} /> : <Copy size={12} />}
          </button>
          <code className="topbar-base-url" dir="ltr">https://api.gov.fintech</code>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontWeight: 700 }}>
            {isRtl ? 'الرابط الأساسي:' : 'Base URL:'}
          </span>
        </div>
      </div>

      {/* 2. Actions Zone: LangSwitcher & Theme Toggle ONLY */}
      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        {/* Item 3: Language Switcher */}
        <LangSwitcher />

        {/* Item 4: Theme Toggle Button */}
        <button 
          className="btn btn-ghost btn-slim-action" 
          style={{ padding: '0.4rem 0.6rem', cursor: 'pointer' }} 
          title={theme === 'dark' ? (isRtl ? 'التبديل إلى الوضع الفاتح' : 'Switch to Light Mode') : (isRtl ? 'التبديل إلى الوضع الداكن' : 'Switch to Dark Mode')}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} style={{ color: '#f59e0b' }} />}
        </button>
      </div>
    </header>
  );
};
