import React, { useState } from 'react';
import { 
  GitBranch, 
  Copy, 
  Check, 
  Plus, 
  Moon, 
  LayoutDashboard, 
  Building2, 
  ArrowRight,
  GitPullRequest,
  ShieldCheck,
  Users,
  FileDown,
  PlusCircle
} from 'lucide-react';
import { AppViewMode } from './Sidebar';
import { Sector } from '../../types/schema';
import { useLanguage } from '../../i18n';
import { LangSwitcher } from '../common/LangSwitcher';

interface HeaderProps {
  activeView: AppViewMode;
  activeSector?: Sector;
  currentVersion: string;
  onVersionChange: (version: string) => void;
  onOpenAddApi: () => void;
  onOpenAddSector?: () => void;
  onBackToDashboard?: () => void;
  totalSectorsCount?: number;
  totalEndpointsCount?: number;
  onNotify?: (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error', snippet?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  activeSector,
  currentVersion,
  onVersionChange,
  onOpenAddApi,
  onOpenAddSector,
  onBackToDashboard,
  totalSectorsCount = 4,
  totalEndpointsCount = 8,
  onNotify
}) => {
  const [copied, setCopied] = useState(false);
  const { t, getLocalized, isRtl } = useLanguage();

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

  // Render contextual view metadata based on activeView
  const renderContextInfo = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: 'var(--blue)',
              fontWeight: 800,
              fontSize: '0.92rem'
            }}>
              <LayoutDashboard size={18} />
              <span>{t('header.catalogOverview')}</span>
            </div>
            <span className="badge-pill badge-blue" style={{ fontSize: '0.70rem', padding: '0.15rem 0.55rem' }}>
              {t('header.catalogStats', { sectors: totalSectorsCount, endpoints: totalEndpointsCount })}
            </span>
          </div>
        );

      case 'sector-spec': {
        const sectorName = activeSector 
          ? getLocalized({ ar: activeSector.name, en: activeSector.nameEn }, activeSector.name)
          : '';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.90rem'
            }}>
              <Building2 size={17} style={{ color: 'var(--blue)' }} />
              <span>{t('header.sectorTitle', { name: sectorName })}</span>
            </div>
            {activeSector?.code && (
              <span className="badge-pill badge-emerald" style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}>
                {activeSector.code}
              </span>
            )}
          </div>
        );
      }

      case 'add-api':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.86rem' }}>
            <span style={{ color: 'var(--text-dim)' }}>{t('sidebar.dashboard')}</span>
            <span style={{ color: 'var(--text-dim)' }}>/</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--emerald)', fontWeight: 800 }}>
              <PlusCircle size={15} />
              <span>{t('header.addNewApi')}</span>
            </div>
          </div>
        );

      case 'change-requests':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--amber)' }}>
            <GitPullRequest size={18} />
            <span style={{ fontWeight: 800, fontSize: '0.90rem' }}>{t('header.changeRequestsTitle')}</span>
          </div>
        );

      case 'versions-diff':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--cyan)' }}>
            <GitBranch size={18} />
            <span style={{ fontWeight: 800, fontSize: '0.90rem' }}>{t('header.semanticDiffTitle')}</span>
          </div>
        );

      case 'security-tools':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--purple)' }}>
            <ShieldCheck size={18} />
            <span style={{ fontWeight: 800, fontSize: '0.90rem' }}>{t('header.securityToolsTitle')}</span>
          </div>
        );

      case 'rbac':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--blue)' }}>
            <Users size={18} />
            <span style={{ fontWeight: 800, fontSize: '0.90rem' }}>{t('header.rbacTitle')}</span>
          </div>
        );

      case 'export-studio':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--emerald)' }}>
            <FileDown size={18} />
            <span style={{ fontWeight: 800, fontSize: '0.90rem' }}>{t('header.exportStudioTitle')}</span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <header className="topbar">
      {/* 1. Context & Info Zone */}
      <div className="topbar-left-zone">
        {/* Context View Label */}
        {renderContextInfo()}

        {/* Global Platform Release Selector */}
        <div className="global-release-wrap">
          <GitBranch size={13} style={{ color: 'var(--emerald)' }} />
          <span>{t('header.releaseLabel')}</span>
          <select
            value={currentVersion}
            onChange={(e) => onVersionChange(e.target.value)}
            className="global-release-select"
          >
            <option value="v2026.2">v2026.2 ({t('common.officialVersion')})</option>
            <option value="v2026.1">v2026.1 ({t('common.archivedVersion')})</option>
            <option value="v2027.0-draft">v2027.0 ({t('common.draftVersion')})</option>
          </select>
        </div>

        {/* Base URL is ONLY shown when user is inside Sector Spec view */}
        {activeView === 'sector-spec' && (
          <div className="topbar-base-url-wrap">
            <span>{t('header.baseUrlLabel')}</span>
            <code className="topbar-base-url">https://api.gov.fintech</code>
            <button
              onClick={handleCopyBaseUrl}
              className="btn btn-ghost btn-slim-action"
              style={{ padding: '0.15rem 0.35rem' }}
              title={t('header.copyBaseUrl')}
            >
              {copied ? <Check size={13} style={{ color: 'var(--emerald)' }} /> : <Copy size={13} />}
            </button>
          </div>
        )}
      </div>

      {/* 2. Actions & Tools Zone */}
      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        {/* Language Switcher */}
        <LangSwitcher />

        {/* If in Dashboard: Show Add Sector & Add API */}
        {activeView === 'dashboard' ? (
          <>
            {onOpenAddSector && (
              <button
                className="btn btn-emerald"
                onClick={onOpenAddSector}
                style={{ padding: '0.42rem 0.85rem', fontSize: '0.80rem' }}
              >
                <Plus size={15} />
                <span>{t('header.addNewSector')}</span>
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={onOpenAddApi}
              style={{ padding: '0.42rem 0.85rem', fontSize: '0.80rem' }}
            >
              <Plus size={15} />
              <span>{t('header.addNewApi')}</span>
            </button>
          </>
        ) : activeView === 'sector-spec' ? (
          <>
            <button
              className="btn btn-primary"
              onClick={onOpenAddApi}
              style={{ padding: '0.42rem 0.85rem', fontSize: '0.80rem' }}
            >
              <Plus size={15} />
              <span>{t('header.addApiToSector')}</span>
            </button>
            {onBackToDashboard && (
              <button
                className="btn btn-ghost"
                onClick={onBackToDashboard}
                style={{ padding: '0.42rem 0.75rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
                title={t('common.backToDashboard')}
              >
                <ArrowRight size={14} style={{ transform: isRtl ? 'none' : 'rotate(180deg)' }} />
                <span>{t('common.backToDashboard')}</span>
              </button>
            )}
          </>
        ) : (
          /* Other views: Provide Quick Back to Dashboard */
          onBackToDashboard && (
            <button
              className="btn btn-ghost"
              onClick={onBackToDashboard}
              style={{ padding: '0.42rem 0.75rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <ArrowRight size={14} style={{ transform: isRtl ? 'none' : 'rotate(180deg)' }} />
              <span>{t('common.backToDashboard')}</span>
            </button>
          )
        )}

        {/* Theme Toggle Button */}
        <button className="btn btn-ghost" style={{ padding: '0.4rem 0.6rem' }} title={t('header.themeToggle')}>
          <Moon size={15} />
        </button>
      </div>
    </header>
  );
};
