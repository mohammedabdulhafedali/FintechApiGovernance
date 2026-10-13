import React, { useState } from 'react';
import { 
  GitBranch, 
  Copy, 
  Check, 
  Moon
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
}

export const Header: React.FC<HeaderProps> = ({
  currentVersion,
  onVersionChange,
  onNotify
}) => {
  const [copied, setCopied] = useState(false);
  const { t, isRtl } = useLanguage();

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
          <span style={{ fontSize: '0.73rem', color: 'var(--text-dim)', fontWeight: 700 }}>Base URL:</span>
          <code className="topbar-base-url">https://api.gov.fintech</code>
          <button
            onClick={handleCopyBaseUrl}
            className="btn btn-ghost btn-slim-action"
            style={{ padding: '0.15rem 0.35rem', cursor: 'pointer' }}
            title={t('header.copyBaseUrl')}
          >
            {copied ? <Check size={13} style={{ color: 'var(--emerald)' }} /> : <Copy size={13} />}
          </button>
        </div>
      </div>

      {/* 2. Actions Zone: LangSwitcher & Theme Toggle ONLY */}
      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        {/* Item 3: Language Switcher */}
        <LangSwitcher />

        {/* Item 4: Theme Toggle Button */}
        <button className="btn btn-ghost" style={{ padding: '0.4rem 0.6rem' }} title={t('header.themeToggle')}>
          <Moon size={15} />
        </button>
      </div>
    </header>
  );
};
