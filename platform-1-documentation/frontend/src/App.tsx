import React, { useState } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { EndpointsRibbon } from './components/catalog/EndpointsRibbon';
import { SpecViewer } from './components/catalog/SpecViewer';
import { SemanticDiffModal } from './components/catalog/SemanticDiffModal';
import { ChangeRequestsModal } from './components/governance/ChangeRequestsModal';
import { ExportStudioModal } from './components/export/ExportStudioModal';
import { RBACModal } from './components/rbac/RBACModal';
import { MockServerModal } from './components/mock/MockServerModal';
import { AddApiModal } from './components/catalog/AddApiModal';

import { 
  INITIAL_SECTORS, 
  INITIAL_CHANGE_REQUESTS, 
  INITIAL_ROLES, 
  INITIAL_SNAPSHOTS 
} from './data/mockData';
import { Endpoint, Sector, ChangeRequest, RBACRole } from './types/schema';

export const App: React.FC = () => {
  // State
  const [sectors, setSectors] = useState<Record<string, Sector>>(INITIAL_SECTORS);
  const [activeSectorKey, setActiveSectorKey] = useState<string>('banking');
  const [activeEndpointIndex, setActiveEndpointIndex] = useState<number>(0);
  const [currentVersion, setCurrentVersion] = useState<string>('v2026.2');
  
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>(INITIAL_CHANGE_REQUESTS);
  const [roles, setRoles] = useState<RBACRole[]>(INITIAL_ROLES);
  const [snapshots, setSnapshots] = useState(INITIAL_SNAPSHOTS);

  // Modals state
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const [isCrOpen, setIsCrOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isRbacOpen, setIsRbacOpen] = useState(false);
  const [isMockOpen, setIsMockOpen] = useState(false);
  const [isAddApiOpen, setIsAddApiOpen] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Derived current sector and its endpoints
  const activeSector = sectors[activeSectorKey] || sectors.banking;
  const currentEndpoints: Endpoint[] = [];
  if (activeSector && activeSector.services) {
    for (const service of Object.values(activeSector.services)) {
      if (service.endpoints) {
        currentEndpoints.push(...service.endpoints);
      }
    }
  }

  const activeEndpoint = currentEndpoints[activeEndpointIndex] || currentEndpoints[0];

  // Actions
  const handleSelectSector = (key: string) => {
    setActiveSectorKey(key);
    setActiveEndpointIndex(0);
  };

  const handleAddNewEndpoint = (newEp: Endpoint) => {
    setSectors(prev => {
      const updated = { ...prev };
      const sector = updated[activeSectorKey];
      if (sector) {
        const firstServiceKey = Object.keys(sector.services)[0] || 'default';
        if (sector.services[firstServiceKey]) {
          sector.services[firstServiceKey].endpoints.push(newEp);
        }
      }
      return updated;
    });

    setActiveEndpointIndex(currentEndpoints.length);
    showToast(`تمت إضافة المسار [${newEp.path}] كمسودة جديدة بنجاح`);
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

    showToast(`تم التوقيع الرقمي بنجاح بصفتك [${roleName}]`);
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

  return (
    <div className="app-container">
      {/* Ambient background glows */}
      <div className="ambient-glow glow-top-right"></div>
      <div className="ambient-glow glow-bottom-left"></div>

      {/* Global Header */}
      <Header
        currentVersion={currentVersion}
        onVersionChange={setCurrentVersion}
        pendingCrCount={pendingCrCount}
        onOpenCrModal={() => setIsCrOpen(true)}
        onOpenExportModal={() => setIsExportOpen(true)}
        onOpenRbacModal={() => setIsRbacOpen(true)}
        onOpenMockModal={() => setIsMockOpen(true)}
      />

      {/* Main Layout: Sidebar + Catalog View */}
      <div className="main-layout">
        <Sidebar
          sectors={sectors}
          activeSectorKey={activeSectorKey}
          onSelectSector={handleSelectSector}
          onAddNewApi={() => setIsAddApiOpen(true)}
        />

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {currentEndpoints.length > 0 ? (
            <>
              {/* Endpoints Ribbon */}
              <EndpointsRibbon
                endpoints={currentEndpoints}
                activeEndpointIndex={activeEndpointIndex}
                onSelectEndpoint={setActiveEndpointIndex}
                onOpenDiffModal={() => setIsDiffOpen(true)}
                onAddNewEndpoint={() => setIsAddApiOpen(true)}
              />

              {/* Specification Viewer */}
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
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.5rem' }}>
                لا توجد مسارات مسجلة لهذا القطاع بعد
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                يمكنك إضافة أول مسار API الآن لبدء توثيق الخدمات
              </p>
              <button className="btn btn-emerald" onClick={() => setIsAddApiOpen(true)}>
                + إضافة مسار جديد
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <SemanticDiffModal
        isOpen={isDiffOpen}
        onClose={() => setIsDiffOpen(false)}
      />

      <ChangeRequestsModal
        isOpen={isCrOpen}
        onClose={() => setIsCrOpen(false)}
        changeRequests={changeRequests}
        onApproveCr={handleApproveCr}
      />

      <ExportStudioModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        snapshots={snapshots}
      />

      <RBACModal
        isOpen={isRbacOpen}
        onClose={() => setIsRbacOpen(false)}
        roles={roles}
        onUpdateRolePermissions={handleUpdateRolePermissions}
      />

      {activeEndpoint && (
        <MockServerModal
          isOpen={isMockOpen}
          onClose={() => setIsMockOpen(false)}
          activeEndpoint={activeEndpoint}
        />
      )}

      <AddApiModal
        isOpen={isAddApiOpen}
        onClose={() => setIsAddApiOpen(false)}
        sectorName={activeSector.name}
        onAddEndpoint={handleAddNewEndpoint}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-glow)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
          padding: '0.65rem 1.5rem',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.84rem',
          fontWeight: 700,
          color: '#ffffff',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          animation: 'fadeIn 0.2s ease'
        }}>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
