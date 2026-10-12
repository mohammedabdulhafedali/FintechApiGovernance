import React, { useState } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar, AppViewMode } from './components/layout/Sidebar';
import { DashboardView } from './components/catalog/DashboardView';
import { DocumentationHub } from './components/catalog/DocumentationHub';
import { EndpointsRibbon } from './components/catalog/EndpointsRibbon';
import { SpecViewer } from './components/catalog/SpecViewer';
import { ChangeRequestsView } from './components/governance/ChangeRequestsView';
import { SemanticDiffView } from './components/catalog/SemanticDiffView';
import { RBACView } from './components/rbac/RBACView';
import { MockServerView } from './components/mock/MockServerView';
import { ExportStudioView } from './components/export/ExportStudioView';
import { FloatingAlertCard, FloatingAlertState } from './components/common/FloatingAlertCard';
import { DeleteSectorModal } from './components/common/DeleteSectorModal';
import { AddSectorModal } from './components/common/AddSectorModal';

import { 
  INITIAL_SECTORS, 
  INITIAL_CHANGE_REQUESTS, 
  INITIAL_ROLES, 
  INITIAL_SNAPSHOTS 
} from './data/mockData';
import { Endpoint, Sector, ChangeRequest, RBACRole } from './types/schema';
import { useLanguage } from './i18n';

export const App: React.FC = () => {
  const { direction, isRtl, t } = useLanguage();
  // Navigation State: 'dashboard' is the default landing view
  const [activeView, setActiveView] = useState<AppViewMode>('dashboard');
  const [activeSectorKey, setActiveSectorKey] = useState<string>('banking');
  const [activeEndpointIndex, setActiveEndpointIndex] = useState<number>(0);
  const [currentVersion, setCurrentVersion] = useState<string>('v2026.2');

  // Business Data
  const [sectors, setSectors] = useState<Record<string, Sector>>(INITIAL_SECTORS);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>(INITIAL_CHANGE_REQUESTS);
  const [roles, setRoles] = useState<RBACRole[]>(INITIAL_ROLES);
  const [snapshots] = useState(INITIAL_SNAPSHOTS);

  // Sector Management State (حذف وإضافة الجهات)
  const [sectorKeyToDelete, setSectorKeyToDelete] = useState<string | null>(null);
  const [isAddSectorModalOpen, setIsAddSectorModalOpen] = useState<boolean>(false);

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

    setSectors(prev => {
      const updated = { ...prev };
      delete updated[sectorKey];
      return updated;
    });

    setSectorKeyToDelete(null);

    // If the currently viewed sector was deleted, switch to another sector or dashboard
    const remainingKeys = Object.keys(sectors).filter(k => k !== sectorKey);
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

  const handleApproveCr = (crId: string, roleName: string) => {
    setChangeRequests(prev => prev.map(cr => {
      if (cr.id === crId) {
        return {
          ...cr,
          approvals: cr.approvals.map(app => {
            if (app.role === roleName) {
              return {
                ...app,
                signed: true,
                approvedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
              };
            }
            return app;
          })
        };
      }
      return cr;
    }));

    showFloatingAlert(
      t('governance.signatureSuccessTitle'),
      t('governance.signatureSuccessMsg'),
      'success',
      `Signer Role: ${roleName}`,
      t('governance.closeAndContinue')
    );
  };

  const handleUpdateRolePermissions = (roleId: string, action: string, granted: boolean) => {
    setRoles(prev => prev.map(r => {
      if (r.id === roleId) {
        return {
          ...r,
          permissions: {
            ...r.permissions,
            [action]: granted
          }
        };
      }
      return r;
    }));
  };

  const pendingCrCount = changeRequests.filter(cr => cr.approvals.some(a => !a.signed)).length;

  const totalSectorsCount = Object.keys(sectors).length;
  const totalEndpointsCount = Object.values(sectors).reduce((acc, sec) => {
    if (!sec.services) return acc;
    return acc + Object.values(sec.services).reduce((sAcc, srv) => sAcc + (srv.endpoints ? srv.endpoints.length : 0), 0);
  }, 0);

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'row', minHeight: '100vh', direction, width: '100vw', overflowX: 'hidden' }}>
      {/* 1. Sidebar */}
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        sectors={sectors}
        activeSectorKey={activeSectorKey}
        onSelectSector={handleSelectSector}
        pendingCrCount={pendingCrCount}
      />

      {/* 2. Main Area with Topbar and Views */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh' }}>
        <Header
          activeView={activeView}
          activeSector={activeSector}
          currentVersion={currentVersion}
          onVersionChange={setCurrentVersion}
          onOpenAddApi={() => setActiveView('add-api')}
          onOpenAddSector={() => setIsAddSectorModalOpen(true)}
          onBackToDashboard={() => setActiveView('dashboard')}
          totalSectorsCount={totalSectorsCount}
          totalEndpointsCount={totalEndpointsCount}
          onNotify={(title, msg, type, snippet) => showFloatingAlert(title, msg, type, snippet)}
        />

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {/* VIEW 1: CLEAN SOVEREIGN DASHBOARD (CARDS ONLY) */}
          {activeView === 'dashboard' && (
            <DashboardView
              sectors={sectors}
              onSelectSector={handleSelectSector}
              onOpenAddSector={() => setIsAddSectorModalOpen(true)}
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
                    onOpenDiffModal={() => setActiveView('versions-diff')}
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

          {/* VIEW 4: DEDICATED CHANGE REQUESTS & MULTI-SIG VAULT */}
          {activeView === 'change-requests' && (
            <ChangeRequestsView
              changeRequests={changeRequests}
              onApproveCr={handleApproveCr}
            />
          )}

          {/* VIEW 5: DEDICATED SEMANTIC DIFF & SEMVER ENGINE */}
          {activeView === 'versions-diff' && (
            <SemanticDiffView />
          )}

          {/* VIEW 6: DEDICATED EMBEDDED MOCK SERVER */}
          {activeView === 'security-tools' && (
            <MockServerView
              activeEndpoint={activeEndpoint}
              onNotify={(title, msg, type) => showFloatingAlert(title, msg, type)}
            />
          )}

          {/* VIEW 7: DEDICATED DYNAMIC RBAC STUDIO */}
          {activeView === 'rbac' && (
            <RBACView
              roles={roles}
              onUpdateRolePermissions={handleUpdateRolePermissions}
              onNotify={(title, msg, type) => showFloatingAlert(title, msg, type)}
            />
          )}

          {/* VIEW 8: DEDICATED EXPORT STUDIO & CRYPTOGRAPHIC SEALER */}
          {activeView === 'export-studio' && (
            <ExportStudioView
              snapshots={snapshots}
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

      {/* 5. Add Sector Modal (نافذة إضافة واعتماد جهة جديدة) */}
      <AddSectorModal
        isOpen={isAddSectorModalOpen}
        onClose={() => setIsAddSectorModalOpen(false)}
        onAddSector={handleAddSector}
      />
    </div>
  );
};
