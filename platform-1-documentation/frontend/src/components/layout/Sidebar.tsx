import React from 'react';
import { 
  Shield,
  LayoutDashboard, 
  PlusCircle, 
  Building2, 
  Store, 
  ShieldAlert, 
  Scale, 
  Coins, 
  Wallet, 
  GitPullRequest, 
  GitBranch, 
  ShieldCheck, 
  Users, 
  FileDown 
} from 'lucide-react';
import { Sector } from '../../types/schema';
import { useLanguage } from '../../i18n';

export type AppViewMode = 
  | 'dashboard' 
  | 'sector-spec' 
  | 'add-api' 
  | 'change-requests' 
  | 'versions-diff' 
  | 'security-tools' 
  | 'rbac' 
  | 'export-studio';

interface SidebarProps {
  activeView: AppViewMode;
  onSelectView: (view: AppViewMode) => void;
  sectors: Record<string, Sector>;
  activeSectorKey: string;
  onSelectSector: (key: string) => void;
  pendingCrCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  sectors,
  activeSectorKey,
  onSelectSector,
  pendingCrCount
}) => {
  const { t, getLocalized, isRtl } = useLanguage();

  const getSidebarSectorIcon = (key: string) => {
    switch (key) {
      case 'banking': return <Building2 size={17} style={{ color: '#38bdf8' }} />;
      case 'merchants': return <Store size={17} style={{ color: '#34d399' }} />;
      case 'aml': return <ShieldAlert size={17} style={{ color: '#f59e0b' }} />;
      case 'settlement': return <Scale size={17} style={{ color: '#a855f7' }} />;
      case 'coins': return <Coins size={17} style={{ color: '#facc15' }} />;
      case 'wallet': return <Wallet size={17} style={{ color: '#ec4899' }} />;
      default: return <Building2 size={17} style={{ color: '#38bdf8' }} />;
    }
  };

  const sectorEntries = Object.entries(sectors);
  const alignStyle = { textAlign: isRtl ? 'right' : 'left' } as const;

  return (
    <aside className="sidebar">
      {/* Sidebar Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-icon">
          <Shield size={19} />
        </div>
        <div>
          <div className="brand-title">{t('common.appName')}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600 }}>
            {t('common.appSubtitle')}
          </div>
        </div>
      </div>

      <nav className="sidebar-menu">
        {/* SECTION 1: General Navigation */}
        <div className="sidebar-section-title">{t('sidebar.mainNav')}</div>

        {/* Dashboard */}
        <button
          className={`nav-btn ${activeView === 'dashboard' ? 'active' : ''}`}
          onClick={() => onSelectView('dashboard')}
          title={t('sidebar.dashboard')}
        >
          <LayoutDashboard size={18} style={{ color: activeView === 'dashboard' ? '#ffffff' : 'var(--blue)' }} />
          <span style={{ flex: 1, ...alignStyle }}>{t('sidebar.dashboard')}</span>
          <span className="badge-pill" style={{
            fontSize: '0.65rem',
            padding: '0.1rem 0.4rem',
            background: activeView === 'dashboard' ? 'rgba(255,255,255,0.2)' : 'rgba(56, 189, 248, 0.15)',
            color: activeView === 'dashboard' ? '#ffffff' : 'var(--blue)'
          }}>
            {t('sidebar.homeBadge')}
          </span>
        </button>

        {/* Add / Document API */}
        <button
          className={`nav-btn nav-btn-dashed ${activeView === 'add-api' ? 'active' : ''}`}
          onClick={() => onSelectView('add-api')}
          title={t('sidebar.addApiDoc')}
        >
          <PlusCircle size={18} />
          <span style={{ flex: 1, ...alignStyle }}>{t('sidebar.addApiDoc')}</span>
        </button>

        <hr className="nav-divider" />

        {/* SECTION 2: Dynamic Financial Sectors */}
        <div className="sidebar-section-title">
          <span>{t('sidebar.sectorsTitle', { count: sectorEntries.length })}</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{t('sidebar.liveCatalog')}</span>
        </div>

        {sectorEntries.map(([key, sector]) => {
          const isActive = activeView === 'sector-spec' && activeSectorKey === key;
          const totalEp = sector.services
            ? Object.values(sector.services).reduce((acc, s) => acc + (s.endpoints ? s.endpoints.length : 0), 0)
            : 0;
          const localizedName = getLocalized({ ar: sector.name, en: sector.nameEn }, sector.name);

          return (
            <button
              key={key}
              className={`nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => {
                onSelectSector(key);
                onSelectView('sector-spec');
              }}
              title={localizedName}
            >
              {getSidebarSectorIcon(key)}
              <span style={{ flex: 1, ...alignStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {localizedName}
              </span>
              <span className="badge-pill" style={{
                fontSize: '0.64rem',
                padding: '0.1rem 0.4rem',
                background: isActive ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.06)',
                color: isActive ? '#ffffff' : 'var(--text-dim)'
              }}>
                {totalEp} {totalEp === 1 ? 'API' : 'APIs'}
              </span>
            </button>
          );
        })}

        <hr className="nav-divider" />

        {/* SECTION 3: Dedicated Governance Tools */}
        <div className="sidebar-section-title">{t('sidebar.governanceTitle')}</div>

        <button
          className={`nav-btn ${activeView === 'change-requests' ? 'active' : ''}`}
          onClick={() => onSelectView('change-requests')}
          title={t('sidebar.changeRequests')}
        >
          <GitPullRequest size={18} style={{ color: activeView === 'change-requests' ? '#ffffff' : 'var(--amber)' }} />
          <span style={{ flex: 1, ...alignStyle }}>{t('sidebar.changeRequests')}</span>
          {pendingCrCount > 0 && (
            <span className="badge-pill badge-amber" style={{ padding: '0.1rem 0.45rem', fontSize: '0.68rem', fontWeight: 800 }}>
              {pendingCrCount}
            </span>
          )}
        </button>

        <button
          className={`nav-btn ${activeView === 'versions-diff' ? 'active' : ''}`}
          onClick={() => onSelectView('versions-diff')}
          title={t('sidebar.diffEngine')}
        >
          <GitBranch size={18} style={{ color: activeView === 'versions-diff' ? '#ffffff' : 'var(--cyan)' }} />
          <span style={{ flex: 1, ...alignStyle }}>{t('sidebar.diffEngine')}</span>
        </button>

        <button
          className={`nav-btn ${activeView === 'security-tools' ? 'active' : ''}`}
          onClick={() => onSelectView('security-tools')}
          title={t('sidebar.mockServer')}
        >
          <ShieldCheck size={18} style={{ color: activeView === 'security-tools' ? '#ffffff' : 'var(--purple)' }} />
          <span style={{ flex: 1, ...alignStyle }}>{t('sidebar.mockServer')}</span>
        </button>

        <button
          className={`nav-btn ${activeView === 'rbac' ? 'active' : ''}`}
          onClick={() => onSelectView('rbac')}
          title={t('sidebar.rbacMatrix')}
        >
          <Users size={18} style={{ color: activeView === 'rbac' ? '#ffffff' : 'var(--blue)' }} />
          <span style={{ flex: 1, ...alignStyle }}>{t('sidebar.rbacMatrix')}</span>
        </button>

        <button
          className={`nav-btn ${activeView === 'export-studio' ? 'active' : ''}`}
          onClick={() => onSelectView('export-studio')}
          title={t('sidebar.exportStudio')}
        >
          <FileDown size={18} style={{ color: activeView === 'export-studio' ? '#ffffff' : 'var(--emerald)' }} />
          <span style={{ flex: 1, ...alignStyle }}>{t('sidebar.exportStudio')}</span>
        </button>
      </nav>

      {/* Sidebar Footer: System Status */}
      <div style={{
        padding: '0.75rem 1rem',
        borderTop: '1px solid var(--border)',
        background: 'rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'var(--emerald)',
            boxShadow: '0 0 8px var(--emerald)',
            display: 'inline-block'
          }}></span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>
            {t('sidebar.systemStatus')}
          </span>
        </div>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>v2026.2</span>
      </div>
    </aside>
  );
};
