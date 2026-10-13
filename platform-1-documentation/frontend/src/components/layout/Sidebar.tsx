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
  FileDown,
  Globe,
  X
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
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  sectors,
  activeSectorKey,
  onSelectSector,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { t, getLocalized, isRtl } = useLanguage();

  const handleNavClick = (view: AppViewMode) => {
    onSelectView(view);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleSectorClick = (key: string) => {
    onSelectSector(key);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const getSidebarSectorIcon = (key: string, iconName?: string) => {
    const iconToUse = iconName || key;
    switch (iconToUse) {
      case 'banking':
      case 'Building2': return <Building2 size={16} style={{ color: '#38bdf8' }} />;
      case 'merchants':
      case 'Store': return <Store size={16} style={{ color: '#34d399' }} />;
      case 'aml':
      case 'ShieldAlert': return <ShieldAlert size={16} style={{ color: '#f59e0b' }} />;
      case 'settlement':
      case 'Scale': return <Scale size={16} style={{ color: '#a855f7' }} />;
      case 'coins':
      case 'Coins': return <Coins size={16} style={{ color: '#facc15' }} />;
      case 'wallet':
      case 'Wallet': return <Wallet size={16} style={{ color: '#ec4899' }} />;
      case 'globe':
      case 'Globe': return <Globe size={16} style={{ color: '#06b6d4' }} />;
      default: return <Building2 size={16} style={{ color: '#38bdf8' }} />;
    }
  };

  const sectorEntries = Object.entries(sectors);
  const alignStyle = { textAlign: isRtl ? 'right' : 'left' } as const;

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      {isOpenMobile && (
        <div 
          className="sidebar-backdrop" 
          onClick={onCloseMobile}
          aria-hidden="true" 
        />
      )}

      <aside className={`sidebar ${isOpenMobile ? 'mobile-open' : ''}`}>
        {/* 1. Sidebar Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Box size={18} />
          </div>
          <div className="brand-title">
            {t('common.appName') || 'إدارة توثيق API'}
          </div>

          {/* Close button on mobile */}
          {onCloseMobile && (
            <button
              className="sidebar-mobile-close-btn"
              onClick={onCloseMobile}
              title={isRtl ? 'إغلاق القائمة' : 'Close Menu'}
              aria-label="Close Navigation Menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <nav className="sidebar-menu">
          {/* Tab 1: Dashboard */}
          <button
            className={`nav-btn ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavClick('dashboard')}
            title={t('sidebar.dashboard')}
          >
            <PieChart size={17} />
            <span style={{ flex: 1, ...alignStyle }}>{t('sidebar.dashboard')}</span>
          </button>

          {/* Tab 2: Add / Document API */}
          <button
            className={`nav-btn nav-btn-dashed ${activeView === 'add-api' ? 'active' : ''}`}
            onClick={() => handleNavClick('add-api')}
            title={t('sidebar.addApiDoc')}
          >
            <PlusCircle size={17} />
            <span style={{ flex: 1, ...alignStyle }}>{t('sidebar.addApiDoc')}</span>
          </button>

          {/* Soft Divider */}
          <hr className="nav-divider" />

          {/* SECTION 2: Dynamic Entities Only */}
          <div id="sidebar-entities-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {sectorEntries.map(([key, sector]) => {
              const isSectorActive = activeView === 'sector-spec' && activeSectorKey === key;
              const localizedName = getLocalized({ ar: sector.name, en: sector.nameEn }, sector.name);

              return (
                <button
                  key={key}
                  className={`nav-btn ${isSectorActive ? 'active' : ''}`}
                  onClick={() => handleSectorClick(key)}
                  title={localizedName}
                >
                  {getSidebarSectorIcon(key, sector.icon)}
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
            onClick={() => handleNavClick('export-studio')}
            title={t('sidebar.exportStudio')}
          >
            <FileDown size={16} style={{ color: activeView === 'export-studio' ? '#ffffff' : 'var(--blue)' }} />
            <span style={{ flex: 1, ...alignStyle }}>{t('sidebar.exportStudio')}</span>
          </button>
        </nav>
      </aside>
    </>
  );
};
