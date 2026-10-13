import React, { useState, useEffect } from 'react';
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
  INITIAL_SECTORS, 
  INITIAL_SNAPSHOTS 
} from './data/mockData';
import { Endpoint, Sector } from './types/schema';
import { useLanguage } from './i18n';

export const App: React.FC = () => {
  const { direction, isRtl, t } = useLanguage();
  // Navigation State: 'dashboard' is the default landing view
  const [activeView, setActiveView] = useState<AppViewMode>('dashboard');
  const [activeSectorKey, setActiveSectorKey] = useState<string>('banking');
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

  // Business Data
  const [sectors, setSectors] = useState<Record<string, Sector>>(INITIAL_SECTORS);
  const [snapshots] = useState(INITIAL_SNAPSHOTS);

  // Synchronize with Sovereign Backend via Clean Service Layer
  useEffect(() => {
    catalogService.fetchCatalog().then(remoteCatalog => {
      if (remoteCatalog && Object.keys(remoteCatalog).length > 0) {
        setSectors(remoteCatalog);
      }
    });
  }, []);

  // Sector Management State
  const [sectorKeyToDelete, setSectorKeyToDelete] = useState<string | null>(null);

  // Global Unified Floating Alert Card (كارد طافية موحدة لكافة رسائل المنظومة)
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

  // Active sector and endpoints for sector-spec view
  const activeSector = sectors[activeSectorKey] || Object.values(sectors)[0];
  const currentEndpoints: Endpoint[] = [];
  if (activeSector && activeSector.services) {
    for (const service of Object.values(activeSector.services)) {
      if (service.endpoints) {
        currentEndpoints.push(...service.endpoints);
      }
    }
  }

  const activeEndpoint = currentEndpoints[activeEndpointIndex] || currentEndpoints[0];

  // Sector Management Handlers (إدارة وحذف الجهات)
  const handleOpenDeleteSector = (sectorKey: string) => {
    if (Object.keys(sectors).length <= 1) {
      showFloatingAlert(
        t('modals.cannotDeleteLastSectorTitle'),
        t('modals.cannotDeleteLastSectorMsg'),
        'warning'
      );
      return;
    }
    setSectorKeyToDelete(sectorKey);
  };

  const handleConfirmDeleteSector = (sectorKey: string) => {
    const targetSector = sectors[sectorKey];
    const targetName = targetSector 
      ? (targetSector.nameEn && !isRtl ? targetSector.nameEn : targetSector.name) 
      : sectorKey;

    const remainingKeys = Object.keys(sectors).filter(k => k !== sectorKey);

    setSectors(prev => {
      const updated = { ...prev };
      delete updated[sectorKey];
      return updated;
    });

    // Notify backend
    catalogService.deleteSector(sectorKey);

    setSectorKeyToDelete(null);

    // If the currently viewed sector was deleted, switch to another sector or dashboard
    if (activeSectorKey === sectorKey) {
      if (remainingKeys.length > 0) {
        setActiveSectorKey(remainingKeys[0]);
        setActiveEndpointIndex(0);
      } else {
        setActiveView('dashboard');
      }
    }

    showFloatingAlert(
      t('modals.sectorDeletedSuccess'),
      t('modals.sectorDeletedSuccessMsg', { name: targetName }),
      'info'
    );
  };

  const handleAddSector = (newSector: Sector) => {
    setSectors(prev => ({
      ...prev,
      [newSector.key]: newSector
    }));

    // Persist to backend
    catalogService.createSector({
      key: newSector.key,
      name: newSector.name,
      nameEn: newSector.nameEn,
      code: newSector.code
    });

    const displayName = newSector.nameEn && !isRtl ? newSector.nameEn : newSector.name;

    showFloatingAlert(
      t('modals.sectorAddedSuccess'),
      t('modals.sectorAddedSuccessMsg', { name: displayName, code: newSector.code }),
      'success'
    );
  };

  // Handlers
  const handleSelectSector = (key: string) => {
    setActiveSectorKey(key);
    setActiveEndpointIndex(0);
    setActiveView('sector-spec');
    setIsMobileMenuOpen(false);
  };

  const handleSelectEndpoint = (key: string, index: number) => {
    setActiveSectorKey(key);
    setActiveEndpointIndex(index);
    setActiveView('sector-spec');
    setIsMobileMenuOpen(false);
  };

  const handleAddEndpointFromHub = (sectorKey: string, endpointsInput: Endpoint | Endpoint[], isBulk = false) => {
    const epList = Array.isArray(endpointsInput) ? endpointsInput : [endpointsInput];
    let addedCount = 0;
    let updatedCount = 0;

    setSectors(prev => {
      const updated = { ...prev };
      const sector = updated[sectorKey] || Object.values(updated)[0];
      if (sector) {
        const firstServiceKey = Object.keys(sector.services)[0] || 'default';
        if (sector.services[firstServiceKey]) {
          const serviceEndpoints = [...sector.services[firstServiceKey].endpoints];

          epList.forEach(newEp => {
            const existingIndex = serviceEndpoints.findIndex(
              e => e.path.toLowerCase() === newEp.path.toLowerCase() && e.method === newEp.method
            );
            if (existingIndex >= 0) {
              // Update existing endpoint (Smart Upsert)
              serviceEndpoints[existingIndex] = {
                ...serviceEndpoints[existingIndex],
                ...newEp,
                id: serviceEndpoints[existingIndex].id // keep id
              };
              updatedCount++;
            } else {
              // Add new endpoint
              serviceEndpoints.push(newEp);
              addedCount++;
            }
          });

          sector.services[firstServiceKey].endpoints = serviceEndpoints;
        }
      }
      return updated;
    });

    setActiveSectorKey(sectorKey);
    setActiveEndpointIndex(0);
    setActiveView('sector-spec');

    // Persist endpoints to backend
    epList.forEach(ep => {
      catalogService.createEndpoint({
        sectorKey,
        path: ep.path,
        method: ep.method,
        summary: ep.desc || (ep as any).summary,
        description: ep.desc || (ep as any).description,
        parameters: ep.params || (ep as any).parameters,
        requestPayload: ep.payload || (ep as any).requestPayload,
        responsePayload: ep.res200 || (ep as any).responsePayload
      });
    });

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

  const totalSectorsCount = Object.keys(sectors).length;
  const totalEndpointsCount = Object.values(sectors).reduce((acc, sec) => {
    if (!sec.services) return acc;
    return acc + Object.values(sec.services).reduce((sAcc, srv) => sAcc + (srv.endpoints ? srv.endpoints.length : 0), 0);
  }, 0);

  return (
    <div className="app-container" style={{ direction }}>
      {/* 1. Sidebar (Responsive Desktop & Mobile Drawer) */}
      <Sidebar
        activeView={activeView}
        onSelectView={(v) => {
          setActiveView(v);
          setIsMobileMenuOpen(false);
        }}
        sectors={sectors}
        activeSectorKey={activeSectorKey}
        onSelectSector={handleSelectSector}
        activeEndpointIndex={activeEndpointIndex}
        onSelectEndpoint={handleSelectEndpoint}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* 2. Main Area with Topbar and Views */}
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
          totalSectorsCount={totalSectorsCount}
          totalEndpointsCount={totalEndpointsCount}
          onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
          onNotify={(title, msg, type, snippet) => showFloatingAlert(title, msg, type, snippet)}
        />

        <main className="app-content-main">
          {/* VIEW 1: CLEAN SOVEREIGN DASHBOARD */}
          {activeView === 'dashboard' && (
            <DashboardView
              sectors={sectors}
              onSelectSector={handleSelectSector}
              onAddSector={handleAddSector}
              onOpenDeleteSector={handleOpenDeleteSector}
            />
          )}

          {/* VIEW 2: DOCUMENTATION HUB & SPEC MAKER (SPLIT FORM) */}
          {activeView === 'add-api' && (
            <DocumentationHub
              sectors={sectors}
              onAddEndpoint={handleAddEndpointFromHub}
              onSuccess={(title, msg, snippet) => showFloatingAlert(title, msg, 'success', snippet)}
            />
          )}

          {/* VIEW 3: SECTOR ENDPOINTS & SPEC VIEWER */}
          {activeView === 'sector-spec' && (
            <>
              {currentEndpoints.length > 0 ? (
                <>
                  <EndpointsRibbon
                    endpoints={currentEndpoints}
                    activeEndpointIndex={activeEndpointIndex}
                    onSelectEndpoint={setActiveEndpointIndex}
                    onAddNewEndpoint={() => setActiveView('add-api')}
                    onDeleteSector={() => handleOpenDeleteSector(activeSectorKey)}
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
                      onClick={() => handleOpenDeleteSector(activeSectorKey)}
                    >
                      {t('spec.deleteSectorBtn')}
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

      {/* 3. Global Floating Alert Card (كارد طافية مركزية بدون أي تداخل مع محتوى الصفحة) */}
      <FloatingAlertCard
        alert={floatingAlert}
        onClose={closeFloatingAlert}
      />

      {/* 4. Delete Sector Confirmation Modal (نافذة تأكيد الحذف المصرفي الحرج) */}
      <DeleteSectorModal
        isOpen={!!sectorKeyToDelete}
        sectorKey={sectorKeyToDelete}
        sector={sectorKeyToDelete ? sectors[sectorKeyToDelete] : null}
        onClose={() => setSectorKeyToDelete(null)}
        onConfirmDelete={handleConfirmDeleteSector}
      />
    </div>
  );
};
