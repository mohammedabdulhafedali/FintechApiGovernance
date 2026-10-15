import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar, AppViewMode } from './components/layout/Sidebar';
import { catalogService } from './services/catalogService';
import { DashboardView } from './components/catalog/DashboardView';
import { DocumentationHub } from './components/catalog/DocumentationHub';
import { UniversalWorkbench } from './components/catalog/UniversalWorkbench';
import { UastDocument, IUastNode } from './services/uast/types';
import { EndpointsRibbon } from './components/catalog/EndpointsRibbon';
import { SpecViewer } from './components/catalog/SpecViewer';
import { ApiDocumentationView } from './components/catalog/ApiDocumentationView';
import { FloatingAlertCard, FloatingAlertState } from './components/common/FloatingAlertCard';
import { DeleteSectorModal } from './components/common/DeleteSectorModal';
import { IamManagementView } from './components/admin/IamManagementView';
import { GovernanceManagementView } from './components/admin/GovernanceManagementView';
import { AuthProvider, useAuth } from './components/auth/AuthContext';
import { LoginView } from './components/auth/LoginView';
import { Can } from './components/auth/Can';
import { ErrorBoundary } from './components/common/ErrorBoundary';

import { 
  INITIAL_SYSTEMS,
  INITIAL_SECTORS 
} from './data/mockData';
import { Endpoint, Sector, SystemModule } from './types/schema';
import { useLanguage } from './i18n';

const AppContent: React.FC = () => {
  const { direction, isRtl, t, getLocalized } = useLanguage();
  const { isAuthenticated, loading } = useAuth();

  // Navigation State: 'dashboard' is the default landing view
  const [activeView, setActiveView] = useState<AppViewMode>('dashboard');
  const [activeSystemKey, setActiveSystemKey] = useState<string>('collection');
  const [activeIntegrationKey, setActiveIntegrationKey] = useState<string>('banking');
  const [activeEndpointIndex, setActiveEndpointIndex] = useState<number>(0);
  const [currentVersion, setCurrentVersion] = useState<string>('v2026.2');
  
  // Persistent Pin State: Reads from localStorage
  const [isSidebarPinned, setIsSidebarPinned] = useState<boolean>(() => {
    try {
      return localStorage.getItem('gov_sidebar_pinned') === 'true';
    } catch {
      return false;
    }
  });

  // Sidebar collapsed state:
  // If previously pinned, open by default; otherwise completely collapsed by default
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const isPinned = localStorage.getItem('gov_sidebar_pinned') === 'true';
      return !isPinned;
    } catch {
      return true;
    }
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const handleTogglePin = () => {
    setIsSidebarPinned(prev => {
      const next = !prev;
      try {
        localStorage.setItem('gov_sidebar_pinned', String(next));
      } catch {}
      if (next) {
        setIsSidebarCollapsed(false); // Open immediately when pinned
      }
      return next;
    });
  };

  const handleToggleSidebar = () => {
    if (window.innerWidth <= 1023) {
      setIsMobileMenuOpen(prev => !prev);
    } else {
      setIsSidebarCollapsed(prev => {
        const next = !prev;
        // If user manually collapses sidebar while pinned, unpin it to respect action
        if (next && isSidebarPinned) {
          setIsSidebarPinned(false);
          try {
            localStorage.setItem('gov_sidebar_pinned', 'false');
          } catch {}
        }
        return next;
      });
    }
  };

  const sidebarContainerRef = useRef<HTMLElement>(null);

  // Auto-dismiss handler when clicking a navigation link or option (if NOT pinned)
  const handleAutoDismiss = () => {
    if (!isSidebarPinned) {
      setIsSidebarCollapsed(true);
    }
  };

  // Auto-dismiss sidebar on outside click on desktop (if NOT pinned)
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      // Only dismiss when open, unpinned, and on desktop (>= 1024px)
      if (!isSidebarCollapsed && !isSidebarPinned && window.innerWidth >= 1024) {
        const target = e.target as HTMLElement | null;
        if (
          sidebarContainerRef.current && 
          !sidebarContainerRef.current.contains(target as Node) &&
          !target?.closest('.btn-sidebar-toggle')
        ) {
          setIsSidebarCollapsed(true);
        }
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isSidebarCollapsed, isSidebarPinned]);

  // Close mobile drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  // Primary Business Entity: Systems (الأنظمة المركزية وتكاملاتها)
  const [systems, setSystems] = useState<Record<string, SystemModule>>(INITIAL_SYSTEMS);

  // Sector Management State (حذف وإدارة التكاملات)
  const [sectorKeyToDelete, setSectorKeyToDelete] = useState<string | null>(null);

  // Global Unified Floating Alert Card
  const [floatingAlert, setFloatingAlert] = useState<FloatingAlertState | null>(null);

  const showFloatingAlert = (
    title: string, 
    message: string, 
    type: 'success' | 'info' | 'warning' | 'error' = 'success',
    codeSnippet?: string,
    confirmText?: string
  ) => {
    setFloatingAlert({
      isOpen: true,
      title,
      message,
      type,
      codeSnippet,
      confirmText
    });
  };

  const closeFloatingAlert = () => {
    setFloatingAlert(null);
  };

  // Dynamically derive sectors from systems for backward-compatibility & Export Studio
  const sectors: Record<string, Sector> = useMemo(() => {
    const result: Record<string, Sector> = {};
    Object.values(systems).forEach(sys => {
      Object.values(sys.integrations || {}).forEach(intItem => {
        if (!result[intItem.entityId]) {
          result[intItem.entityId] = {
            key: intItem.entityId,
            name: intItem.name,
            nameEn: intItem.nameEn,
            code: intItem.code || `SECTOR_${intItem.entityId.toUpperCase()}`,
            icon: intItem.icon || 'Building2',
            services: {
              core: {
                title: intItem.name,
                titleEn: intItem.nameEn,
                code: intItem.code || 'CORE',
                baseUrl: 'https://api.gov.fintech',
                versions: ['v2026.2'],
                endpoints: []
              }
            }
          };
        }
        if (intItem.endpoints) {
          result[intItem.entityId].services.core.endpoints.push(...intItem.endpoints);
        }
      });
    });
    return result;
  }, [systems]);

  // Active System and Integration Resolution
  const currentSystem = systems[activeSystemKey] || Object.values(systems)[0];
  const currentIntegration = currentSystem?.integrations?.[activeIntegrationKey] || 
    (currentSystem?.integrations ? Object.values(currentSystem.integrations)[0] : undefined);
  const currentEndpoints: Endpoint[] = currentIntegration?.endpoints || [];
  const activeEndpoint = currentEndpoints[activeEndpointIndex] || currentEndpoints[0];

  // Active sector for Header compatibility
  const activeSector = sectors[activeIntegrationKey] || Object.values(sectors)[0];

  // Navigation Handlers
  const handleSelectSystemIntegration = (sysKey: string, intKey: string) => {
    setActiveSystemKey(sysKey);
    setActiveIntegrationKey(intKey);
    setActiveEndpointIndex(0);
    setActiveView('sector-spec');
    setIsMobileMenuOpen(false);
  };

  const handleSelectSectorLegacy = (key: string) => {
    let foundSysKey = activeSystemKey;
    for (const [sKey, sObj] of Object.entries(systems)) {
      if (sObj.integrations && sObj.integrations[key]) {
        foundSysKey = sKey;
        break;
      }
    }
    handleSelectSystemIntegration(foundSysKey, key);
  };

  // Add System Handler
  const handleAddSystem = (newSystem: SystemModule) => {
    setSystems(prev => ({
      ...prev,
      [newSystem.key]: newSystem
    }));

    const firstIntKey = Object.keys(newSystem.integrations || {})[0] || 'banking';
    setActiveSystemKey(newSystem.key);
    setActiveIntegrationKey(firstIntKey);
    setActiveEndpointIndex(0);
    setActiveView('sector-spec');

    const displayName = newSystem.nameEn && !isRtl ? newSystem.nameEn : newSystem.name;
    showFloatingAlert(
      isRtl ? 'تم إضافة النظام بنجاح' : 'System Created Successfully',
      isRtl ? `تم تسجيل [${displayName}] وإدراج تكاملاته في القائمة الجانبية والداشبورد.` : `System [${displayName}] created with dynamic integrations.`,
      'success'
    );
  };

  // Add Endpoint Handler
  const handleAddEndpointFromHub = (
    sectorKey: string, 
    endpointsInput: Endpoint | Endpoint[], 
    isBulk = false,
    providedSystemKey?: string
  ) => {
    const epList = Array.isArray(endpointsInput) ? endpointsInput : [endpointsInput];
    const targetSysKey = providedSystemKey || epList[0]?.systemKey || activeSystemKey;
    const targetIntKey = sectorKey || activeIntegrationKey;

    setSystems(prev => {
      const updated = { ...prev };
      let sys = updated[targetSysKey];
      if (!sys) {
        sys = Object.values(updated)[0];
      }
      if (sys && sys.integrations) {
        let targetInt = sys.integrations[targetIntKey];
        if (!targetInt) {
          targetInt = {
            entityId: targetIntKey,
            name: targetIntKey,
            code: `INT_${targetIntKey.toUpperCase()}`,
            icon: 'Building2',
            endpoints: []
          };
          sys.integrations[targetIntKey] = targetInt;
        }

        const existingEndpoints = [...targetInt.endpoints];
        epList.forEach(newEp => {
          const existingIdx = existingEndpoints.findIndex(
            e => e.path.toLowerCase() === newEp.path.toLowerCase() && e.method === newEp.method
          );
          if (existingIdx >= 0) {
            existingEndpoints[existingIdx] = { ...existingEndpoints[existingIdx], ...newEp };
          } else {
            existingEndpoints.push(newEp);
          }
        });
        targetInt.endpoints = existingEndpoints;
      }
      return updated;
    });

    setActiveSystemKey(targetSysKey);
    setActiveIntegrationKey(targetIntKey);
    setActiveEndpointIndex(0);
    setActiveView('sector-spec');

    if (isBulk) {
      showFloatingAlert(
        t('docHub.importSuccessTitle'),
        t('docHub.importSuccessMsg', { count: epList.length }),
        'success',
        epList[0]?.path,
        t('docHub.exploreInCatalog')
      );
    } else {
      showFloatingAlert(
        t('docHub.successTitle'),
        t('docHub.successMsg'),
        'success',
        epList[0]?.path,
        t('docHub.exploreInCatalog')
      );
    }
  };

  // Delete Handler
  const handleOpenDeleteIntegration = (sectorKey: string) => {
    setSectorKeyToDelete(sectorKey);
  };

  const handleConfirmDeleteIntegration = (sectorKey: string) => {
    setSystems(prev => {
      const updated = { ...prev };
      if (updated[activeSystemKey]?.integrations) {
        delete updated[activeSystemKey].integrations[sectorKey];
      }
      return updated;
    });

    setSectorKeyToDelete(null);

    const remainingIntegrations = Object.keys(systems[activeSystemKey]?.integrations || {}).filter(k => k !== sectorKey);
    if (remainingIntegrations.length > 0) {
      setActiveIntegrationKey(remainingIntegrations[0]);
      setActiveEndpointIndex(0);
    } else {
      setActiveView('dashboard');
    }

    showFloatingAlert(
      isRtl ? 'تم حذف التكامل' : 'Integration Removed',
      isRtl ? `تم حذف التكامل [${sectorKey}] من النظام بنجاح.` : `Integration [${sectorKey}] was removed.`,
      'info'
    );
  };

  // Bridge UAST Document to Catalog Endpoint
  const uastDocToEndpoint = (uastDoc: UastDocument, defaultSysKey: string, defaultEntityId?: string): Endpoint => {
    const params: Endpoint['params'] = (uastDoc.headers || []).map(h => ({
      name: h.semantics.name,
      type: h.semantics.dataType,
      req: h.constraints.required,
      rule: h.semantics.description,
      tag: h.governance.securityLevel === 'CONFIDENTIAL_MASKED' ? 'Security' : 'General',
      tagClass: h.governance.securityLevel === 'CONFIDENTIAL_MASKED' ? 'badge-purple' : 'badge-blue'
    }));

    const flattenParams = (node: IUastNode) => {
      if (node.structure.path && node.structure.path !== '$') {
        params.push({
          name: node.semantics.name,
          type: node.semantics.dataType,
          req: node.constraints.required,
          rule: node.semantics.description,
          tag: node.governance.securityLevel === 'CONFIDENTIAL_MASKED' ? 'PII' : 'Payload',
          tagClass: node.governance.securityLevel === 'CONFIDENTIAL_MASKED' ? 'badge-amber' : undefined
        });
      }
      for (const c of node.children) {
        flattenParams(c);
      }
    };
    flattenParams(uastDoc.requestTree);

    const resolvedSysKey = uastDoc.systemKey || defaultSysKey;
    const resolvedEntityId = uastDoc.entityId || defaultEntityId;

    return {
      id: `ep_uast_${Date.now()}`,
      method: uastDoc.channel.method,
      path: uastDoc.channel.endpointPath,
      shortName: uastDoc.serviceCode.toLowerCase().replace(/_/g, '-'),
      desc: uastDoc.serviceName,
      descEn: uastDoc.serviceNameEn || uastDoc.serviceName,
      isDraft: uastDoc.status !== 'PUBLISHED',
      statusBadge: `v${uastDoc.semver}`,
      releaseId: uastDoc.publishedVersionId,
      systemKey: resolvedSysKey,
      targetEntities: resolvedEntityId ? [resolvedEntityId] : undefined,
      params,
      rules: (uastDoc.errorCodes || []).map((err, i) => ({
        id: `BR_${uastDoc.serviceCode}_00${i + 1}`,
        name: err.message,
        err: err.code
      })),
      payload: uastDoc.rawSource,
      res200: JSON.stringify({ status: "SUCCESS", code: "SETTLED_200", version: uastDoc.semver }, null, 2),
      res422: JSON.stringify({ error: "VALIDATION_FAILED", code: "ERR_422", message: "Invalid payload constraints" }, null, 2),
      curl: `curl -X ${uastDoc.channel.method} "${uastDoc.channel.environments.production || uastDoc.channel.endpointPath}" \\\n  -H "Authorization: Bearer <TOKEN>" \\\n  -H "Content-Type: application/json"`
    };
  };

  // If checking authentication
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main, #0b0f17)', color: 'var(--text-dim, #9ca3af)', fontSize: '0.92rem' }}>
        {isRtl ? 'جاري التحقق من هوية المستخدم والسيادة...' : 'Verifying Identity & Sovereign Access...'}
      </div>
    );
  }

  // If not logged in: display clean production login view
  if (!isAuthenticated) {
    return <LoginView />;
  }

  const totalSystemsCount = Object.keys(systems).length;
  const totalEndpointsCount = Object.values(systems).reduce((acc, sys) => {
    return acc + Object.values(sys.integrations || {}).reduce(
      (iAcc, intItem) => iAcc + (intItem.endpoints ? intItem.endpoints.length : 0), 
      0
    );
  }, 0);

  const localizedSysName = currentSystem ? getLocalized({ ar: currentSystem.name, en: currentSystem.nameEn }, currentSystem.name) : '';
  const localizedIntName = currentIntegration ? getLocalized({ ar: currentIntegration.name, en: currentIntegration.nameEn }, currentIntegration.name) : '';

  return (
    <div className="app-container" style={{ direction }}>
      {/* 1. Sidebar with Nested Dynamic Accordion Tree */}
      <Sidebar
        activeView={activeView}
        onSelectView={(v) => {
          setActiveView(v);
          setIsMobileMenuOpen(false);
        }}
        systems={systems}
        activeSystemKey={activeSystemKey}
        activeIntegrationKey={activeIntegrationKey}
        onSelectSystemIntegration={handleSelectSystemIntegration}
        sectors={sectors}
        activeSectorKey={activeIntegrationKey}
        onSelectSector={handleSelectSectorLegacy}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        isPinned={isSidebarPinned}
        onTogglePin={handleTogglePin}
        containerRef={sidebarContainerRef}
        onAutoDismiss={handleAutoDismiss}
      />

      {/* 2. Main Layout Area */}
      <div className="app-main-layout">
        <Header
          activeView={activeView}
          activeSector={activeSector}
          currentVersion={currentVersion}
          onVersionChange={setCurrentVersion}
          onOpenAddApi={() => {
            setActiveView('workbench');
            setIsMobileMenuOpen(false);
          }}
          onOpenAddSector={() => {
            setActiveView('dashboard');
            setIsMobileMenuOpen(false);
          }}
          onBackToDashboard={() => {
            setActiveView('dashboard');
            setIsMobileMenuOpen(false);
          }}
          totalSectorsCount={totalSystemsCount}
          totalEndpointsCount={totalEndpointsCount}
          onToggleMobileMenu={handleToggleSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={handleToggleSidebar}
          onNotify={(title, msg, type, snippet) => showFloatingAlert(title, msg, type, snippet)}
        />

        <main className="app-content-main">
          {/* VIEW 1: SYSTEMS COMMAND DASHBOARD */}
          {activeView === 'dashboard' && (
            <DashboardView
              systems={systems}
              onSelectSystemIntegration={handleSelectSystemIntegration}
              onAddSystem={handleAddSystem}
              onDeleteSystem={(sysKey) => {
                setSystems(prev => {
                  const updated = { ...prev };
                  delete updated[sysKey];
                  return updated;
                });
              }}
            />
          )}

          {/* VIEW 2: UNIVERSAL SOVEREIGN 3-PANE WORKBENCH & DRAFT ENGINE */}
          {(activeView === 'workbench' || activeView === 'add-api') && (
            <UniversalWorkbench
              systems={systems}
              activeSystemKey={activeSystemKey}
              activeIntegrationKey={activeIntegrationKey}
              onAddSystem={handleAddSystem}
              onAddIntegration={(sysKey, newInt) => {
                setSystems(prev => {
                  const updated = { ...prev };
                  if (updated[sysKey]) {
                    const existingIntegrations = updated[sysKey].integrations || {};
                    updated[sysKey] = {
                      ...updated[sysKey],
                      integrations: {
                        ...existingIntegrations,
                        [newInt.entityId]: newInt
                      }
                    };
                  }
                  return updated;
                });
                showFloatingAlert(
                  isRtl ? 'تم إضافة الجهة بنجاح' : 'Entity Created Successfully',
                  isRtl ? `تم تسجيل الجهة [${newInt.name}] تحت النظام [${systems[sysKey]?.name || sysKey}].` : `Entity [${newInt.nameEn || newInt.name}] added under system.`,
                  'success'
                );
              }}
              onPublishSuccess={(publishedDoc, targetSysKey, targetIntKey) => {
                const finalSysKey = targetSysKey || publishedDoc.systemKey || activeSystemKey;
                const finalIntKey = targetIntKey || publishedDoc.entityId || activeIntegrationKey;
                const newEp = uastDocToEndpoint(publishedDoc, finalSysKey, finalIntKey);
                handleAddEndpointFromHub(finalIntKey, newEp, false, finalSysKey);
                const sysName = systems[finalSysKey]?.name || finalSysKey;
                const intName = systems[finalSysKey]?.integrations?.[finalIntKey]?.name || finalIntKey;
                showFloatingAlert(
                  isRtl ? 'تم اعتماد ونشر الـ API بنجاح' : 'API Published Successfully',
                  isRtl ? `تم تسجيل وتجميد الإصدار v${publishedDoc.semver} في الكتالوج المعتمد تحت [${sysName}] ← [${intName}].` : `Version v${publishedDoc.semver} published to catalog under [${sysName}] ← [${intName}].`,
                  'success',
                  publishedDoc.channel.endpointPath
                );
              }}
              onBackToCatalog={() => setActiveView('dashboard')}
            />
          )}

          {/* VIEW 3: SECTOR / INTEGRATION SPEC VIEWER */}
          {activeView === 'sector-spec' && (
            <>
              {currentEndpoints.length > 0 ? (
                <ApiDocumentationView
                  endpoints={currentEndpoints}
                  activeEndpointIndex={activeEndpointIndex}
                  onSelectEndpoint={setActiveEndpointIndex}
                  systemName={localizedSysName}
                  integrationName={localizedIntName}
                  onAddNewEndpoint={() => setActiveView('add-api')}
                />
              ) : (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '3rem'
                }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.5rem' }}>
                    {t('spec.noEndpoints')}
                  </h3>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                    {t('spec.noEndpointsSub')}
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Can perform="catalog:endpoint:create">
                      <button className="btn btn-emerald" onClick={() => setActiveView('add-api')}>
                        {t('spec.addNewEndpointBtn')}
                      </button>
                    </Can>
                    <Can perform="catalog:system:delete">
                      <button
                        className="btn btn-rose"
                        onClick={() => handleOpenDeleteIntegration(activeIntegrationKey)}
                      >
                        {isRtl ? 'حذف هذا التكامل' : 'Delete Integration'}
                      </button>
                    </Can>
                  </div>
                </div>
              )}
            </>
          )}

          {/* VIEW 4: DEDICATED IAM GOVERNANCE CONSOLE */}
          {activeView === 'iam' && (
            <IamManagementView
              onNotify={(title, msg, type) => showFloatingAlert(title, msg, type)}
            />
          )}

          {/* VIEW 5: DEDICATED SOVEREIGN GOVERNANCE & APPROVALS PIPELINES (تبويب مستقل كامل) */}
          {activeView === 'governance' && (
            <GovernanceManagementView
              onNotify={(title, msg, type) => showFloatingAlert(title, msg, type)}
            />
          )}
        </main>
      </div>

      {/* 3. Global Floating Alert Card */}
      <FloatingAlertCard
        alert={floatingAlert}
        onClose={closeFloatingAlert}
      />

      {/* 4. Delete Integration Confirmation Modal */}
      <DeleteSectorModal
        isOpen={!!sectorKeyToDelete}
        sectorKey={sectorKeyToDelete}
        sector={sectorKeyToDelete ? sectors[sectorKeyToDelete] : null}
        onClose={() => setSectorKeyToDelete(null)}
        onConfirmDelete={handleConfirmDeleteIntegration}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary
      fallbackTitle="تعذر استكمال العرض: خطأ تقني في معالجة الواجهة"
      fallbackMessage="واجه التطبيق تعارضاً في معالجة أحد العناصر البرمجية. يرجى مراجعة تفاصيل الخطأ التقني الموضح أو إعادة المحاولة."
    >
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
};
