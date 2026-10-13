import React, { useState, useEffect } from 'react';
import { 
  Box,
  PieChart, 
  PlusCircle, 
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ChevronsDownUp,
  ChevronsUpDown,
  Pin
} from 'lucide-react';
import { SystemModule, Sector } from '../../types/schema';
import { useLanguage } from '../../i18n';
import { useAuth } from '../auth/AuthContext';
import { governanceService } from '../../services/governanceService';

export type AppViewMode = 
  | 'dashboard' 
  | 'sector-spec' 
  | 'add-api'
  | 'iam'
  | 'governance';

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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
  containerRef?: React.Ref<HTMLElement>;
  onAutoDismiss?: () => void;
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
  isCollapsed = false,
  onToggleCollapse,
  isPinned = false,
  onTogglePin,
  containerRef,
  onAutoDismiss,
}) => {
  const { t, getLocalized, isRtl } = useLanguage();
  const { hasPermission } = useAuth();

  const [isDocSectionOpen, setIsDocSectionOpen] = useState(false);
  const [pendingGovCount, setPendingGovCount] = useState<number>(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await governanceService.getInbox();
        setPendingGovCount(res.pendingForMeCount || res.count || 0);
      } catch {
        // ignore
      }
    };
    fetchCount();
    const timer = setInterval(fetchCount, 12000);
    return () => clearInterval(timer);
  }, []);

  // State to track which systems are expanded in the accordion
  // Default: Completely collapsed ({}) so no system is open by default
  const [expandedSystems, setExpandedSystems] = useState<Record<string, boolean>>({});

  // Ensure active system is expanded only when user explicitly navigates to a spec view
  useEffect(() => {
    if (activeSystemKey && activeView === 'sector-spec' && !expandedSystems[activeSystemKey]) {
      setExpandedSystems(prev => ({ ...prev, [activeSystemKey]: true }));
      setIsDocSectionOpen(true);
    }
  }, [activeSystemKey, activeView]);

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
    if (!isPinned && onAutoDismiss) {
      onAutoDismiss();
    }
    if (onCloseMobile) onCloseMobile();
  };

  const handleIntegrationClick = (sysKey: string, intKey: string) => {
    if (onSelectSystemIntegration) {
      onSelectSystemIntegration(sysKey, intKey);
    } else if (onSelectSector) {
      onSelectSector(intKey);
    }
    if (!isPinned && onAutoDismiss) {
      onAutoDismiss();
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

      <aside 
        ref={containerRef}
        className={`sidebar ${isCollapsed ? 'is-collapsed' : ''} ${isPinned ? 'is-pinned' : 'is-unpinned'} ${isOpenMobile ? 'mobile-open' : ''}`}
      >
        {/* 1. Sidebar Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Box size={18} />
          </div>
          <div className="brand-title">
            {t('common.appName') || 'إدارة توثيق API'}
          </div>

          {/* Quick Header Actions: Pin & Collapse */}
          <div className="sidebar-brand-actions">
            {/* Desktop Pin / Unpin Button */}
            {onTogglePin && (
              <button
                type="button"
                className={`sidebar-pin-btn ${isPinned ? 'is-active' : ''}`}
                onClick={onTogglePin}
                title={isPinned 
                  ? (isRtl ? 'إلغاء تثبيت القائمة الجانبية' : 'Unpin Sidebar') 
                  : (isRtl ? 'تثبيت القائمة الجانبية مفتوحة دائماً' : 'Pin Sidebar Open')
                }
                aria-label={isPinned ? 'Unpin Sidebar' : 'Pin Sidebar'}
                aria-pressed={isPinned}
              >
                <Pin size={14} className={isPinned ? 'pin-icon-active' : ''} />
              </button>
            )}

            {/* Desktop Collapse Button */}
            {onToggleCollapse && (
              <button
                type="button"
                className="sidebar-desktop-collapse-btn"
                onClick={onToggleCollapse}
                title={isRtl ? 'طي القائمة الجانبية' : 'Collapse Sidebar'}
                aria-label="Collapse Sidebar"
              >
                {isRtl ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
            )}

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

          {/* Tab 2: Add / Document API (Totally hidden if no permission) */}
          {hasPermission('catalog:endpoint:create') && (
            <button
              className={`nav-btn nav-btn-dashed ${activeView === 'add-api' ? 'active' : ''}`}
              onClick={() => handleNavClick('add-api')}
              title={t('sidebar.addApiDoc')}
            >
              <PlusCircle size={15} />
              <span style={{ flex: 1, ...alignStyle }}>{t('sidebar.addApiDoc')}</span>
            </button>
          )}

          {/* Tab 3: IAM Governance (Text-only, no icon, totally hidden if no permission) */}
          {hasPermission('iam:manage') && (
            <button
              className={`nav-btn ${activeView === 'iam' ? 'active' : ''}`}
              onClick={() => handleNavClick('iam')}
              title={isRtl ? 'إدارة المستخدمين والصلاحيات' : 'User & Permission Management'}
            >
              <span style={{ flex: 1, ...alignStyle, fontWeight: 700 }}>
                {isRtl ? 'إدارة المستخدمين والصلاحيات' : 'User & Permission Management'}
              </span>
            </button>
          )}

          {/* Tab 4: Sovereign Governance & Dual-Control (تبويب لحاله مثل أداة الصلاحيات) */}
          <button
            className={`nav-btn ${activeView === 'governance' ? 'active' : ''}`}
            onClick={() => handleNavClick('governance')}
            title={isRtl ? 'مركز الحوكمة والاعتمادات' : 'Governance & Approvals Hub'}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span style={{ flex: 1, ...alignStyle, fontWeight: 700 }}>
              {isRtl ? 'مركز الحوكمة والاعتمادات' : 'Governance & Approvals Hub'}
            </span>
            {pendingGovCount > 0 && (
              <span
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#000000',
                  borderRadius: '999px',
                  fontSize: '0.68rem',
                  padding: '0.1rem 0.45rem',
                  fontWeight: 900
                }}
              >
                {pendingGovCount}
              </span>
            )}
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
              <BookOpen size={14} className="sidebar-section-icon" />
              <span style={{ flex: 1, ...alignStyle }}>
                {isRtl ? 'التوثيق البرمجي للأنظمة' : 'API Documentation Hub'}
              </span>
              <span className="sidebar-section-chevron">
                {isDocSectionOpen
                  ? <ChevronDown size={14} />
                  : isRtl ? <ChevronLeft size={14} /> : <ChevronRight size={14} />
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

        </nav>
      </aside>
    </>
  );
};
