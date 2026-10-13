import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar, AppViewMode } from './components/layout/Sidebar';
import { catalogService } from './services/catalogService';
import { DashboardView } from './components/catalog/DashboardView';
import { DocumentationHub } from './components/catalog/DocumentationHub';
import { EndpointsRibbon } from './components/catalog/EndpointsRibbon';
import { SpecViewer } from './components/catalog/SpecViewer';
import { ExportStudioView } from './components/export/ExportStudioView';
import { FloatingAlertCard, FloatingAlertState } from './components/common/FloatingAlertCard';
import { DeleteSectorModal } from './components/common/DeleteSectorModal';

import { 
  INITIAL_SYSTEMS,
  INITIAL_SECTORS, 
  INITIAL_SNAPSHOTS 
} from './data/mockData';
import { Endpoint, Sector, SystemModule } from './types/schema';
import { useLanguage } from './i18n';

export const App: React.FC = () => {
  const { direction, isRtl, t, getLocalized } = useLanguage();

  // Navigation State: 'dashboard' is the default landing view
  const [activeView, setActiveView] = useState<AppViewMode>('dashboard');
  const [activeSystemKey, setActiveSystemKey] = useState<string>('collection');
  const [activeIntegrationKey, setActiveIntegrationKey] = useState<string>('banking');
  const [activeEndpointIndex, setActiveEndpointIndex] = useState<number>(0);
  const [currentVersion, setCurrentVersion] = useState<string>('v2026.2');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

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
  const [snapshots] = useState(INITIAL_SNAPSHOTS);

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
    // If user clicked legacy sector, find first system containing this sector
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

    // Switch to remaining integration or dashboard
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
      />

      {/* 2. Main Layout Area */}
      <div className="app-main-layout">
        <Header
          activeView={activeView}
          activeSector={activeSector}
          currentVersion={currentVersion}
          onVersionChange={setCurrentVersion}
          onOpenAddApi={() => {
            setActiveView('add-api');
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
          onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
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

          {/* VIEW 2: DOCUMENTATION HUB & SPEC MAKER */}
          {activeView === 'add-api' && (
            <DocumentationHub
              sectors={sectors}
              systems={systems}
              onAddEndpoint={handleAddEndpointFromHub}
              onSuccess={(title, msg, snippet) => showFloatingAlert(title, msg, 'success', snippet)}
            />
          )}

          {/* VIEW 3: SECTOR / INTEGRATION SPEC VIEWER */}
          {activeView === 'sector-spec' && (
            <>
              {currentEndpoints.length > 0 ? (
                <>
                  <EndpointsRibbon
                    endpoints={currentEndpoints}
                    activeEndpointIndex={activeEndpointIndex}
                    onSelectEndpoint={setActiveEndpointIndex}
                    systemName={localizedSysName}
                    integrationName={localizedIntName}
                    onAddNewEndpoint={() => setActiveView('add-api')}
                  />
                  {activeEndpoint && <SpecViewer endpoint={activeEndpoint} />}
                </>
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
                    <button className="btn btn-emerald" onClick={() => setActiveView('add-api')}>
                      {t('spec.addNewEndpointBtn')}
                    </button>
                    <button
                      className="btn btn-rose"
                      onClick={() => handleOpenDeleteIntegration(activeIntegrationKey)}
                    >
                      {isRtl ? 'حذف هذا التكامل' : 'Delete Integration'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* VIEW 4: DEDICATED EXPORT STUDIO */}
          {activeView === 'export-studio' && (
            <ExportStudioView
              snapshots={snapshots}
              sectorsData={sectors}
              onNotify={(title, msg, type, snippet) => showFloatingAlert(title, msg, type, snippet)}
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
