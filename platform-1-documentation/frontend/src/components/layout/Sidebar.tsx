import React from 'react';
import { 
  Box,
  PieChart, 
  PlusCircle, 
  Building2, 
  Store, 
  ShieldAlert, 
  Scale, 
  Coins, 
  Wallet, 
  FileDown
} from 'lucide-react';
import { Sector } from '../../types/schema';
import { useLanguage } from '../../i18n';

export type AppViewMode = 
  | 'dashboard' 
  | 'sector-spec' 
  | 'add-api' 
  | 'export-studio';

interface SidebarProps {
  activeView: AppViewMode;
  onSelectView: (view: AppViewMode) => void;
  sectors: Record<string, Sector>;
  activeSectorKey: string;
  onSelectSector: (key: string) => void;
  activeEndpointIndex?: number;
  onSelectEndpoint?: (sectorKey: string, endpointIndex: number) => void;
  pendingCrCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  sectors,
  activeSectorKey,
  onSelectSector,
}) => {
  const { t, getLocalized, isRtl } = useLanguage();

  const getSidebarSectorIcon = (key: string) => {
    switch (key) {
      case 'banking': return <Building2 size={16} style={{ color: '#38bdf8' }} />;
      case 'merchants': return <Store size={16} style={{ color: '#34d399' }} />;
      case 'aml': return <ShieldAlert size={16} style={{ color: '#f59e0b' }} />;
      case 'settlement': return <Scale size={16} style={{ color: '#a855f7' }} />;
      case 'coins': return <Coins size={16} style={{ color: '#facc15' }} />;
      case 'wallet': return <Wallet size={16} style={{ color: '#ec4899' }} />;
      default: return <Building2 size={16} style={{ color: '#38bdf8' }} />;
    }
  };

  const sectorEntries = Object.entries(sectors);
  const alignStyle = { textAlign: isRtl ? 'right' : 'left' } as const;

  return (
    <aside className="sidebar" style={{ width: '260px', minWidth: '260px' }}>
      {/* 1. Sidebar Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-icon">
          <Box size={18} />
        </div>
        <div className="brand-title">
          {t('common.appName') || 'إدارة توثيق API'}
        </div>
      </div>

      <nav className="sidebar-menu">
        {/* Tab 1: Dashboard */}
        <button
          className={`nav-btn ${activeView === 'dashboard' ? 'active' : ''}`}
          onClick={() => onSelectView('dashboard')}
          title={t('sidebar.dashboard')}
        >
          <PieChart size={17} />
          <span style={{ flex: 1, ...alignStyle }}>{t('sidebar.dashboard')}</span>
        </button>

        {/* Tab 2: Add / Document API */}
        <button
          className={`nav-btn nav-btn-dashed ${activeView === 'add-api' ? 'active' : ''}`}
          onClick={() => onSelectView('add-api')}
          title={t('sidebar.addApiDoc')}
        >
          <PlusCircle size={17} />
          <span style={{ flex: 1, ...alignStyle }}>{t('sidebar.addApiDoc')}</span>
        </button>

        {/* Soft Divider */}
        <hr className="nav-divider" />

        {/* SECTION 2: Dynamic Entities Only (Matching Prototype Exactly) */}
        <div id="sidebar-entities-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {sectorEntries.map(([key, sector]) => {
            const isSectorActive = activeView === 'sector-spec' && activeSectorKey === key;
            const localizedName = getLocalized({ ar: sector.name, en: sector.nameEn }, sector.name);

            return (
              <button
                key={key}
                className={`nav-btn ${isSectorActive ? 'active' : ''}`}
                onClick={() => onSelectSector(key)}
                title={localizedName}
              >
                {getSidebarSectorIcon(key)}
                <span style={{ flex: 1, ...alignStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {localizedName}
                </span>
              </button>
            );
          })}
        </div>

        {/* Soft Divider */}
        <hr className="nav-divider" />

        {/* Dedicated Export Studio */}
        <button
          className={`nav-btn ${activeView === 'export-studio' ? 'active' : ''}`}
          onClick={() => onSelectView('export-studio')}
          title={t('sidebar.exportStudio')}
        >
          <FileDown size={16} style={{ color: activeView === 'export-studio' ? '#ffffff' : 'var(--blue)' }} />
          <span style={{ flex: 1, ...alignStyle }}>{t('sidebar.exportStudio')}</span>
        </button>
      </nav>
    </aside>
  );
};
