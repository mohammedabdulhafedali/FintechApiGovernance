import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  GitBranch, 
  Copy, 
  Check, 
  Moon,
  Sun,
  Menu,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { useLanguage } from '../../i18n';
import { LangSwitcher } from '../common/LangSwitcher';
import { useAuth } from '../auth/AuthContext';
import { apiContextResolver, ApiContextState } from '../../services/apiContextResolver';

interface HeaderProps {
  currentVersion: string;
  onVersionChange: (version: string) => void;
  onNotify?: (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error', snippet?: string) => void;
  activeView?: any;
  activeSector?: any;
  activeEndpoint?: any;
  activeIntegration?: any;
  activeSystem?: any;
  apiContext?: ApiContextState;
  onOpenAddApi?: () => void;
  onOpenAddSector?: () => void;
  onBackToDashboard?: () => void;
  totalSectorsCount?: number;
  totalEndpointsCount?: number;
  onToggleMobileMenu?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentVersion,
  onVersionChange,
  onNotify,
  activeView,
  activeSector,
  activeEndpoint,
  activeIntegration,
  activeSystem,
  apiContext,
  onToggleMobileMenu,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
}) => {
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('gov_theme') as 'dark' | 'light') || 'dark';
  });
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [isReleaseOpen, setIsReleaseOpen] = useState(false);
  const releaseMenuRef = useRef<HTMLDivElement>(null);

  const { t, isRtl } = useLanguage();
  const { user, logout } = useAuth();

  const releaseVersions = [
    { value: 'v2026.2', shortLabel: 'v2026.2', badge: isRtl ? 'معتمد' : 'Official' },
    { value: 'v2026.1', shortLabel: 'v2026.1', badge: isRtl ? 'مؤرشف' : 'Archived' },
    { value: 'v2027.0-draft', shortLabel: 'v2027.0', badge: isRtl ? 'مسودة' : 'Draft' },
  ];

  const resolvedContext = useMemo(() => {
    if (apiContext) return apiContext;
    return apiContextResolver.resolve({
      activeView,
      activeEndpoint,
      activeIntegration,
      activeSystem,
      activeSector,
      currentVersion,
      isRtl
    });
  }, [apiContext, activeView, activeEndpoint, activeIntegration, activeSystem, activeSector, currentVersion, isRtl]);

  const activeRelease = (resolvedContext.availableVersions && resolvedContext.availableVersions.length > 0)
    ? (resolvedContext.availableVersions.find(r => r.value === currentVersion) || resolvedContext.availableVersions[0])
    : (releaseVersions.find(r => r.value === currentVersion) || releaseVersions[0]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gov_theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (releaseMenuRef.current && !releaseMenuRef.current.contains(e.target as Node)) {
        setIsReleaseOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleCopyBaseUrl = () => {
    const urlToCopy = resolvedContext.baseUrl || 'https://api.gov.fintech';
    navigator.clipboard.writeText(urlToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onNotify) {
      onNotify(
        t('header.copiedBaseUrlTitle'),
        t('header.copiedBaseUrlMsg'),
        'info',
        urlToCopy
      );
    }
  };

  return (
    <>
      <header className="topbar">
        {/* 1. Permanent Info Zone: Compact Release & Base URL */}
        <div className="topbar-left-zone">
          {/* Sidebar Navigation Toggle Button (Desktop & Mobile) */}
          {(onToggleSidebarCollapse || onToggleMobileMenu) && (
            <button
              type="button"
              className="btn-sidebar-toggle"
              onClick={onToggleSidebarCollapse || onToggleMobileMenu}
              aria-label="Toggle navigation menu"
              title={isSidebarCollapsed 
                ? (isRtl ? 'إظهار القائمة الجانبية' : 'Expand Sidebar') 
                : (isRtl ? 'طي القائمة الجانبية' : 'Collapse Sidebar')
              }
            >
              <Menu size={18} />
            </button>
          )}

          {/* Dynamic Release & Base URL: Strictly hidden by default; renders dynamically only when a path/file is open */}
          {resolvedContext.isOpen && (
            <>
              {/* Item 1: Global Platform Release Selector (Custom Dropdown matching LangSwitcher) */}
              <div className="release-dropdown-wrap" ref={releaseMenuRef}>
                <button
                  type="button"
                  className={`release-dropdown-trigger ${isReleaseOpen ? 'active' : ''}`}
                  onClick={() => setIsReleaseOpen(prev => !prev)}
                  aria-haspopup="true"
                  aria-expanded={isReleaseOpen}
                  title={isRtl ? 'إصدار المنظومة المعتمد' : 'Active Platform Release'}
                >
                  <GitBranch size={13} className="release-branch-icon" />
                  <span className="release-current-label">
                    {resolvedContext.shortVersion || activeRelease.shortLabel}
                  </span>
                  <ChevronDown size={11} className={`release-chevron ${isReleaseOpen ? 'rotated' : ''}`} />
                </button>

                {isReleaseOpen && (
                  <div className={`release-dropdown-menu ${isRtl ? 'rtl' : 'ltr'}`}>
                    {(resolvedContext.availableVersions.length > 0 ? resolvedContext.availableVersions : releaseVersions).map((item) => {
                      const isSelected = item.value === currentVersion;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          className={`release-menu-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            onVersionChange(item.value);
                            setIsReleaseOpen(false);
                          }}
                        >
                          <div className="release-item-text">
                            <span className="release-code">{item.shortLabel}</span>
                            <span className="release-badge">{item.badge}</span>
                          </div>
                          {isSelected && <Check size={13} className="check-icon" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Item 2: Dynamic Compact Base URL */}
              <div 
                className="topbar-base-url-wrap compact-clickable"
                onClick={handleCopyBaseUrl}
                title={copied ? (isRtl ? 'تم النسخ بنجاح!' : 'Copied!') : `${t('header.copyBaseUrl')}: ${resolvedContext.baseUrl}`}
              >
                <span className="base-url-copy-icon">
                  {copied ? <Check size={12} style={{ color: 'var(--emerald)' }} /> : <Copy size={12} />}
                </span>
                <code className="topbar-base-url" dir="ltr">{resolvedContext.displayUrl}</code>
              </div>
            </>
          )}
        </div>

        {/* 2. Actions Zone: Theme Toggle, LangSwitcher, User Menu (with Logout inside) */}
        <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>

          {/* Theme Toggle Button */}
          <button 
            className="btn btn-ghost btn-slim-action" 
            style={{ padding: '0.4rem 0.6rem', cursor: 'pointer' }} 
            title={theme === 'dark' ? (isRtl ? 'التبديل إلى الوضع الفاتح' : 'Switch to Light Mode') : (isRtl ? 'التبديل إلى الوضع الداكن' : 'Switch to Dark Mode')}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} style={{ color: '#f59e0b' }} />}
          </button>

          {/* Language Switcher Dropdown */}
          <LangSwitcher />

          {/* User Profile Badge & Dropdown Menu (Includes details, role & logout underneath) */}
          {user && (
            <div className="user-profile-menu-container" ref={userMenuRef}>
              <button
                type="button"
                className={`user-profile-trigger ${isUserMenuOpen ? 'active' : ''}`}
                onClick={() => setIsUserMenuOpen(prev => !prev)}
                aria-haspopup="true"
                aria-expanded={isUserMenuOpen}
                title={isRtl ? 'الملف الشخصي وخيارات الجلسة' : 'User Profile & Session Options'}
              >
                <div className="user-avatar-badge">
                  <UserIcon size={14} />
                </div>
                <div className="user-info-preview">
                  <span className="user-name-text">{user.username}</span>
                  <span className="user-role-text">{user.groupName || (isRtl ? 'مستعرض' : 'Viewer')}</span>
                </div>
                <ChevronDown size={12} className={`user-chevron ${isUserMenuOpen ? 'rotated' : ''}`} />
              </button>

              {isUserMenuOpen && (
                <div className={`user-dropdown-panel ${isRtl ? 'rtl' : 'ltr'}`}>
                  {/* Dropdown Header: Full details */}
                  <div className="user-dropdown-header">
                    <div className="user-avatar-large">
                      <UserIcon size={18} />
                    </div>
                    <div className="user-details-column">
                      <div className="user-full-name">{user.fullName || user.username}</div>
                      <div className="user-email-text">{user.email || `@${user.username}`}</div>
                      <div className="user-role-badge">
                        <ShieldCheck size={11} />
                        <span>{user.groupName || (isRtl ? 'مستعرض' : 'Viewer')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="user-dropdown-divider" />

                  {/* Dropdown Actions: Logout placed directly underneath role & username */}
                  <div className="user-dropdown-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="user-dropdown-logout-btn"
                      title={isRtl ? 'تسجيل الخروج' : 'Sign Out'}
                    >
                      <LogOut size={15} />
                      <span>{isRtl ? 'تسجيل الخروج' : 'Sign Out'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
    </>
  );
};
