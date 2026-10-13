import React, { useState, useEffect } from 'react';
import { 
  Box,
  PieChart, 
  PlusCircle, 
  FileDown,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ChevronsDownUp,
  ChevronsUpDown
} from 'lucide-react';
import { SystemModule, Sector } from '../../types/schema';
import { useLanguage } from '../../i18n';

export type AppViewMode = 
  | 'dashboard' 
  | 'sector-spec' 
  | 'add-api' 
  | 'export-studio';

interface SidebarProps {
  activeView: AppViewMode;
  onSelectView: (view: AppViewMode) => void;
  systems?: Record<string, SystemModule>;
  activeSystemKey?: string;
  activeIntegrationKey?: string;
  onSelectSystemIntegration?: (systemKey: string, integrationKey: string) => void;
  sectors?: Record<string, Sector>;
  activeSectorKey?: string;
  onSelectSector?: (key: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  systems = {},
  activeSystemKey = '',
  activeIntegrationKey = '',
  onSelectSystemIntegration,
  sectors = {},
  activeSectorKey = '',
  onSelectSector,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { t, getLocalized, isRtl } = useLanguage();

  // Top-level docs section collapsed/expanded
  const [isDocSectionOpen, setIsDocSectionOpen] = useState(true);

  // State to track which systems are expanded in the accordion
  // Default: Only the active system (or the first system) is expanded so they aren't all wide open
  const [expandedSystems, setExpandedSystems] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (activeSystemKey) {
      initial[activeSystemKey] = true;
    } else {
      const firstKey = Object.keys(systems)[0];
      if (firstKey) initial[firstKey] = true;
    }
    return initial;
  });

  // Ensure active system is expanded if selection changes
  useEffect(() => {
    if (activeSystemKey && !expandedSystems[activeSystemKey]) {
      setExpandedSystems(prev => ({ ...prev, [activeSystemKey]: true }));
    }
  }, [activeSystemKey]);

  // Check if all systems are currently collapsed
  const systemKeyList = Object.keys(systems);
  const isAllCollapsed = systemKeyList.length > 0 && systemKeyList.every(k => !expandedSystems[k]);

  // Toggle all systems expand / collapse (icon-only button)
  const handleToggleAllSystems = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAllCollapsed) {
      const next: Record<string, boolean> = {};
      if (activeSystemKey) {
        next[activeSystemKey] = true;
      } else {
        systemKeyList.forEach(k => { next[k] = true; });
      }
      setExpandedSystems(next);
    } else {
      // Collapse all
      setExpandedSystems({});
    }
  };

  const toggleSystemExpand = (sysKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSystems(prev => ({
      ...prev,
      [sysKey]: !prev[sysKey]
    }));
  };

  const handleNavClick = (view: AppViewMode) => {
    onSelectView(view);
    if (onCloseMobile) onCloseMobile();
  };

  const handleIntegrationClick = (sysKey: string, intKey: string) => {
    if (onSelectSystemIntegration) {
      onSelectSystemIntegration(sysKey, intKey);
    } else if (onSelectSector) {
      onSelectSector(intKey);
    }
    if (onCloseMobile) onCloseMobile();
  };

  const alignStyle = { textAlign: isRtl ? 'right' : 'left' } as const;
  const systemEntries = Object.entries(systems);

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
            <PieChart size={15} />
            <span style={{ flex: 1, ...alignStyle }}>{t('sidebar.dashboard')}</span>
          </button>

          {/* Tab 2: Add / Document API */}
          <button
            className={`nav-btn nav-btn-dashed ${activeView === 'add-api' ? 'active' : ''}`}
            onClick={() => handleNavClick('add-api')}
            title={t('sidebar.addApiDoc')}
          >
            <PlusCircle size={15} />
            <span style={{ flex: 1, ...alignStyle }}>{t('sidebar.addApiDoc')}</span>
          </button>

          {/* Soft Divider */}
          <hr className="nav-divider" />

          {/* ── COLLAPSIBLE DOCS SECTION HEADER WITH ICON ACTION ── */}
          <div className="sidebar-section-row">
            <button
              className="sidebar-section-toggle"
              onClick={() => setIsDocSectionOpen(prev => !prev)}
              aria-expanded={isDocSectionOpen}
            >
              <BookOpen size={13} className="sidebar-section-icon" />
              <span style={{ flex: 1, ...alignStyle }}>
                {isRtl ? 'التوثيق البرمجي للأنظمة' : 'API Documentation Hub'}
              </span>
              <span className="sidebar-section-chevron">
                {isDocSectionOpen
                  ? <ChevronDown size={13} />
                  : isRtl ? <ChevronLeft size={13} /> : <ChevronRight size={13} />
                }
              </span>
            </button>

            {/* Quick icon-only action to fold/unfold systems — keeps maximum space */}
            {isDocSectionOpen && (
              <button
                type="button"
                className="sidebar-icon-action-btn"
                onClick={handleToggleAllSystems}
                title={isAllCollapsed 
                  ? (isRtl ? 'فتح المسارات' : 'Expand All') 
                  : (isRtl ? 'ضم المسارات' : 'Collapse All')
                }
                aria-label="Toggle all systems"
              >
                {isAllCollapsed ? <ChevronsUpDown size={13} /> : <ChevronsDownUp size={13} />}
              </button>
            )}
          </div>

          {/* ── SYSTEMS TREE (shown only when docs section is open) ── */}
          {isDocSectionOpen && (
            <div id="sidebar-systems-tree" className="sidebar-systems-tree">
              {systemEntries.map(([sysKey, sys]) => {
                const isExpanded = !!expandedSystems[sysKey];
                const isSystemSelected = activeSystemKey === sysKey && activeView === 'sector-spec';
                const localizedSysName = getLocalized({ ar: sys.name, en: sys.nameEn }, sys.name);
                const integrationsList = sys.integrations ? Object.entries(sys.integrations) : [];

                return (
                  <div 
                    key={sysKey} 
                    className={`sidebar-system-group ${isSystemSelected ? 'system-group-active' : ''} ${isExpanded ? 'is-expanded' : ''}`}
                  >
                    {/* Level 1: System Node Header */}
                    <div
                      className={`system-node-btn ${isSystemSelected ? 'system-active' : ''}`}
                      onClick={(e) => toggleSystemExpand(sysKey, e)}
                      title={localizedSysName}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') toggleSystemExpand(sysKey, e as any); }}
                    >
                      <span className="system-node-label" style={{ ...alignStyle }}>
                        {localizedSysName}
                      </span>

                      {/* Expand / Collapse Chevron */}
                      <span className="system-node-chevron">
                        {isExpanded
                          ? <ChevronDown size={12} />
                          : isRtl ? <ChevronLeft size={12} /> : <ChevronRight size={12} />
                        }
                      </span>
                    </div>

                    {/* Level 2: Nested Integrations */}
                    {isExpanded && integrationsList.length > 0 && (
                      <div className="sidebar-integrations-sublist">
                        {integrationsList.map(([intKey, integration]) => {
                          const isIntegrationActive =
                            activeView === 'sector-spec' &&
                            activeSystemKey === sysKey &&
                            activeIntegrationKey === intKey;

                          const localizedIntName = getLocalized(
                            { ar: integration.name, en: integration.nameEn },
                            integration.name
                          );

                          return (
                            <button
                              key={intKey}
                              className={`sub-nav-btn ${isIntegrationActive ? 'active' : ''}`}
                              onClick={() => handleIntegrationClick(sysKey, intKey)}
                              title={localizedIntName}
                            >
                              <span style={{ flex: 1, ...alignStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {localizedIntName}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Soft Divider */}
          <hr className="nav-divider" />

          {/* Export Studio */}
          <button
            className={`nav-btn ${activeView === 'export-studio' ? 'active' : ''}`}
            onClick={() => handleNavClick('export-studio')}
            title={t('sidebar.exportStudio')}
          >
            <FileDown size={15} style={{ color: activeView === 'export-studio' ? '#ffffff' : 'var(--blue)' }} />
            <span style={{ flex: 1, ...alignStyle }}>{t('sidebar.exportStudio')}</span>
          </button>
        </nav>
      </aside>
    </>
  );
};
