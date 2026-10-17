import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar, AppViewMode } from './components/layout/Sidebar';
import { catalogService } from './services/catalogService';
import { DashboardView } from './components/catalog/DashboardView';
import { SystemsManagementView } from './components/catalog/SystemsManagementView';
import { EntitiesManagementView } from './components/catalog/EntitiesManagementView';
import { IntegrationsManagementView } from './components/catalog/IntegrationsManagementView';
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
import { DocumentMatrixView } from './components/admin/DocumentMatrixView';
import { WorkflowPoliciesView } from './components/admin/WorkflowPoliciesView';
import { DynamicWorkbench } from './components/dynamic-docs/DynamicWorkbench';
import { AuthProvider, useAuth } from './components/auth/AuthContext';
import { BreadcrumbProvider } from './context/BreadcrumbContext';
import { LoginView } from './components/auth/LoginView';
import { Can } from './components/auth/Can';
import { ErrorBoundary } from './components/common/ErrorBoundary';

import { 
  INITIAL_SYSTEMS,
  INITIAL_SECTORS 
} from './data/mockData';
import { Endpoint, Sector, SystemModule, SystemIntegration } from './types/schema';
import { useLanguage } from './i18n';

const AppContent: React.FC = () => {
  const { direction, isRtl, t, getLocalized } = useLanguage();
  const { isAuthenticated, loading, hasPermission, canAccess } = useAuth();

  // Navigation State: 'dashboard' is the default landing view
  const [activeView, setActiveView] = useState<AppViewMode>('dashboard');
  const [activeSystemKey, setActiveSystemKey] = useState<string>('collection');
  const [activeIntegrationKey, setActiveIntegrationKey] = useState<string>('banking');
  const [activeEndpointIndex, setActiveEndpointIndex] = useState<number>(0);
  const [currentVersion, setCurrentVersion] = useState<string>('v2026.2');

  // Auto-route to the first permitted view if current view is restricted
  useEffect(() => {
    if (!isAuthenticated || loading) return;
    if (activeView === 'dashboard' && !hasPermission('dashboard:read')) {
      if (hasPermission('catalog:systems:read') || hasPermission('catalog:system:create')) {
        setActiveView('systems');
      } else if (hasPermission('catalog:sectors:read')) {
        setActiveView('sectors');
      } else if (hasPermission('catalog:integrations:read')) {
        setActiveView('integrations');
      } else if (hasPermission('catalog:documents:read')) {
        setActiveView('documents-matrix');
      } else if (hasPermission('catalog:read') || hasPermission('documentation:systems:read')) {
        setActiveView('sector-spec');
      } else if (hasPermission('catalog:endpoint:create')) {
        setActiveView('workbench');
      } else if (hasPermission('iam:manage') || hasPermission('iam:users:read')) {
        setActiveView('iam');
      } else if (hasPermission('governance:inbox:approve') || hasPermission('governance:inbox:read') || hasPermission('governance:workflows:read')) {
        setActiveView('governance');
      }
    }
  }, [isAuthenticated, loading, activeView, hasPermission]);
  
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

  // Primary Business Entity: Systems (الأنظمة المركزية وتكاملاتها مع حفظ محلي وسحابي دائم)
  const [systems, setSystems] = useState<Record<string, SystemModule>>(() => {
    try {
      const cached = localStorage.getItem('gov_fintech_systems_cache');
      if (cached !== null) {
        return JSON.parse(cached);
      }
    } catch {}
    return INITIAL_SYSTEMS;
  });

  // Load and synchronize systems from SQLite database on mount
  useEffect(() => {
    catalogService.fetchSystems().then(loadedSystems => {
      if (loadedSystems !== undefined) {
        setSystems(loadedSystems);
      }
    }).catch(err => {
      console.warn('[Catalog] Failed to load systems from backend:', err);
    });
  }, []);

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

  // Dynamic Master Sectors State (القطاعات والجهات الشريكة ككيان سيادي مستقل)
  const [masterSectors, setMasterSectors] = useState<Record<string, Sector>>(() => {
    try {
      const cached = localStorage.getItem('gov_fintech_sectors_cache');
      if (cached !== null) return JSON.parse(cached);
    } catch {}
    return INITIAL_SECTORS;
  });

  // Synchronize master sectors from SQLite backend on mount
  useEffect(() => {
    catalogService.fetchCatalog().then(loaded => {
      if (loaded && Object.keys(loaded).length > 0) {
        setMasterSectors(prev => {
          const merged = { ...prev, ...loaded };
          try {
            localStorage.setItem('gov_fintech_sectors_cache', JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
    }).catch(() => {});
  }, []);

  const handleSaveSector = async (sectorData: { key: string; name: string; nameEn?: string; code: string }) => {
    const isEdit = !!masterSectors[sectorData.key];
    const newOrUpdatedSector: Sector = {
      ...(masterSectors[sectorData.key] || {}),
      key: sectorData.key,
      name: sectorData.name,
      nameEn: sectorData.nameEn || sectorData.name,
      code: sectorData.code,
      services: masterSectors[sectorData.key]?.services || {
        core: {
          title: sectorData.name,
          titleEn: sectorData.nameEn || sectorData.name,
          code: sectorData.code,
          baseUrl: 'https://api.gov.fintech',
          versions: ['v2026.2'],
          endpoints: []
        }
      }
    };

    // 1. Immediately update React state and local cache for instant zero-delay UI rendering
    setMasterSectors(prev => {
      const updated = { ...prev, [sectorData.key]: newOrUpdatedSector };
      try {
        localStorage.setItem('gov_fintech_sectors_cache', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 2. Persist to SQLite Database via catalogService
    try {
      const savedResult = await catalogService.saveSector(newOrUpdatedSector);
      if (savedResult) {
        setMasterSectors(prev => {
          const updated = { ...prev, [sectorData.key]: savedResult };
          try {
            localStorage.setItem('gov_fintech_sectors_cache', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }

      showFloatingAlert(
        isRtl ? 'تم حفظ القطاع/الجهة بنجاح' : 'Sector Saved Successfully',
        isRtl ? `تم تسجيل [${sectorData.name}] وحفظه في قاعدة البيانات المركزية.` : `Sector [${sectorData.nameEn || sectorData.name}] saved successfully.`,
        'success'
      );
    } catch {
      showFloatingAlert(
        isRtl ? 'تم الحفظ محلياً' : 'Saved Locally',
        isRtl ? `تم حفظ بيانات [${sectorData.name}] بنجاح.` : `Sector [${sectorData.name}] saved successfully.`,
        'success'
      );
    }
  };

  const handleDeleteSector = async (sectorKey: string) => {
    const secName = masterSectors[sectorKey]?.name || sectorKey;

    // Strict Governance Pre-condition check (Domain Invariant & Referential Integrity)
    const linkedCount = Object.values(systems).filter(sys => {
      const keys = sys.associatedSectorKeys || Object.keys(sys.integrations || {});
      return keys.includes(sectorKey);
    }).length;

    if (linkedCount > 0) {
      showFloatingAlert(
        isRtl ? 'حظر الحوكمة والنزاهة المرجعية' : 'Governance Constraint Block',
        isRtl 
          ? `لا يمكن حذف الجهة [${secName}] لأنها مرتبطة بـ (${linkedCount}) أنظمة نشطة في المنظومة. يجب فك ارتباط التكاملات أولاً.` 
          : `Cannot delete entity [${secName}] because it is linked to (${linkedCount}) active systems.`,
        'error'
      );
      return;
    }

    setMasterSectors(prev => {
      const updated = { ...prev };
      delete updated[sectorKey];
      try {
        localStorage.setItem('gov_fintech_sectors_cache', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await catalogService.deleteSector(sectorKey);
      showFloatingAlert(
        isRtl ? 'تم حذف القطاع/الجهة' : 'Sector Deleted',
        isRtl ? `تمت إزالة [${secName}] من دليل القطاعات والجهات المعتمدة بنجاح.` : `Sector [${secName}] removed.`,
        'info'
      );
    } catch (err: any) {
      showFloatingAlert(
        isRtl ? 'خطأ في الحذف' : 'Deletion Error',
        err.message || (isRtl ? 'تعذر حذف القطاع' : 'Failed to delete sector'),
        'error'
      );
    }
  };

  // Dynamically derive combined sectors for backward-compatibility & Export Studio
  const sectors: Record<string, Sector> = useMemo(() => {
    const result: Record<string, Sector> = { ...masterSectors };
    Object.values(systems).forEach(sys => {
      Object.values(sys.integrations || {}).forEach(intItem => {
        if (!result[intItem.entityId]) {
          result[intItem.entityId] = {
            key: intItem.entityId,
            name: intItem.name,
            nameEn: intItem.nameEn,
            code: intItem.code || `SECTOR_${intItem.entityId.toUpperCase()}`,
            icon: 'Building2',
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
        if (intItem.endpoints && result[intItem.entityId]?.services?.core) {
          result[intItem.entityId].services.core.endpoints = [
            ...(result[intItem.entityId].services.core.endpoints || []),
            ...intItem.endpoints
          ];
        }
      });
    });
    return result;
  }, [masterSectors, systems]);

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
    setSystems(prev => {
      const updated = {
        ...prev,
        [newSystem.key]: newSystem
      };
      catalogService.saveSystem(newSystem);
      return updated;
    });

    const firstIntKey = Object.keys(newSystem.integrations || {})[0] || 'banking';
    setActiveSystemKey(newSystem.key);
    setActiveIntegrationKey(firstIntKey);
    setActiveEndpointIndex(0);
    setActiveView('sector-spec');

    const displayName = newSystem.nameEn && !isRtl ? newSystem.nameEn : newSystem.name;
    showFloatingAlert(
      isRtl ? 'تم إضافة وحفظ النظام بنجاح' : 'System Created & Saved Successfully',
      isRtl ? `تم تسجيل [${displayName}] وحفظه في قاعدة البيانات المركزية.` : `System [${displayName}] saved permanently to database.`,
      'success'
    );
  };

  // Update System Handler
  const handleUpdateSystem = async (systemKey: string, updatedData: Partial<SystemModule>) => {
    setSystems(prev => {
      const existing = prev[systemKey];
      if (!existing) return prev;
      const updatedSys = {
        ...existing,
        ...updatedData,
        key: systemKey
      };
      return {
        ...prev,
        [systemKey]: updatedSys
      };
    });

    try {
      await catalogService.updateSystem(systemKey, updatedData);
      const displayName = updatedData.name || systemKey;
      showFloatingAlert(
        isRtl ? 'تم تحديث بيانات النظام بنجاح' : 'System Updated Successfully',
        isRtl ? `تم حفظ التعديلات على نظام [${displayName}] في الخادم وقاعدة البيانات.` : `System [${displayName}] updated successfully.`,
        'success'
      );
    } catch {
      showFloatingAlert(
        isRtl ? 'حفظ محلي' : 'Local Save',
        isRtl ? 'تم تطبيق التحديثات محلياً بنجاح.' : 'Updates saved locally.',
        'info'
      );
    }
  };

  // Delete Integration (Unlink Entity from System) Handler
  const handleDeleteIntegration = async (systemKey: string, entityId: string) => {
    const sysName = systems[systemKey]?.name || systemKey;
    const entityName = systems[systemKey]?.integrations?.[entityId]?.name || entityId;

    setSystems(prev => {
      const existing = prev[systemKey];
      if (!existing) return prev;

      const updatedIntegrations = { ...(existing.integrations || {}) };
      delete updatedIntegrations[entityId];

      const currentAssociated = existing.associatedSectorKeys || Object.keys(existing.integrations || {});
      const updatedAssociated = currentAssociated.filter(k => k !== entityId);

      const updatedSys = {
        ...existing,
        integrations: updatedIntegrations,
        associatedSectorKeys: updatedAssociated
      };

      try {
        localStorage.setItem('gov_fintech_systems_cache', JSON.stringify({
          ...prev,
          [systemKey]: updatedSys
        }));
      } catch {}

      return {
        ...prev,
        [systemKey]: updatedSys
      };
    });

    // If active view is currently viewing this unlinked integration, safely fall back
    if (activeSystemKey === systemKey && activeIntegrationKey === entityId) {
      setActiveIntegrationKey('');
      setActiveView('dashboard');
    }

    try {
      await catalogService.deleteIntegration(systemKey, entityId);
      showFloatingAlert(
        isRtl ? 'تم فك الارتباط بنجاح' : 'Entity Unlinked Successfully',
        isRtl
          ? `تم فك ارتباط [${entityName}] عن نظام [${sysName}] وتحديث الكتالوج.`
          : `[${entityName}] was unlinked from [${sysName}] successfully.`,
        'success'
      );
    } catch {
      showFloatingAlert(
        isRtl ? 'تم فك الارتباط محلياً' : 'Unlinked Locally',
        isRtl ? 'تم تطبيق التحديث محلياً بنجاح.' : 'Updates applied locally.',
        'info'
      );
    }
  };

  // Add Integration Handler (Linking entity with system)
  const handleAddIntegration = async (systemKey: string, integration: SystemIntegration) => {
    const currentSys = systems[systemKey];
    if (!currentSys) return;

    const updatedIntegrations = {
      ...(currentSys.integrations || {}),
      [integration.entityId]: integration
    };
    const currentAssociated = currentSys.associatedSectorKeys || Object.keys(currentSys.integrations || {});
    const updatedAssociated = Array.from(new Set([...currentAssociated, integration.entityId]));

    const updatedSys: SystemModule = {
      ...currentSys,
      integrations: updatedIntegrations,
      associatedSectorKeys: updatedAssociated
    };

    setSystems(prev => {
      const updated = {
        ...prev,
        [systemKey]: updatedSys
      };
      try {
        localStorage.setItem('gov_fintech_systems_cache', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await catalogService.updateSystem(systemKey, {
        integrations: updatedIntegrations,
        associatedSectorKeys: updatedAssociated
      });
      showFloatingAlert(
        isRtl ? 'تم تأسيس الربط والتكامل بنجاح' : 'Integration Established',
        isRtl ? `تم ربط [${integration.name}] بالنظام [${currentSys.name}] بنجاح.` : `Linked [${integration.name}] with [${currentSys.name}].`,
        'success'
      );
    } catch {
      showFloatingAlert(
        isRtl ? 'حفظ الربط محلياً' : 'Saved Locally',
        isRtl ? `تم حفظ ربط [${integration.name}] محلياً.` : `Saved integration locally.`,
        'info'
      );
    }
  };

  // Add Endpoint Handler
  const handleAddEndpointFromHub = (
    sectorKey: string, 
    endpointsInput: Endpoint | Endpoint[], 
    isBulk = false,
    providedSystemKey?: string,
    rawDocSource?: string,
    suppressAlert = false
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

        if (rawDocSource) {
          targetInt.rawDocSource = rawDocSource;
        }

        // Clean out any legacy single-block pseudo-endpoints (e.g. document title slugs)
        const isPseudoSlug = (p: string) => {
          const lp = (p || '').toLowerCase();
          return lp.includes('documentation-v20') || 
                 lp.includes('api-documentation') || 
                 lp.endsWith('-documentation') || 
                 lp.startsWith('/ultimate-pay');
        };

        const existingEndpoints = (targetInt.endpoints || []).filter(e => !isPseudoSlug(e.path));

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
        catalogService.saveSystem(sys);
      }
      return updated;
    });

    setActiveSystemKey(targetSysKey);
    setActiveIntegrationKey(targetIntKey);
    setActiveEndpointIndex(0);
    setActiveView('sector-spec');

    if (!suppressAlert) {
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
    }
  };

  // Delete Handler
  const handleOpenDeleteIntegration = (sectorKey: string) => {
    setSectorKeyToDelete(sectorKey);
  };

  const handleConfirmDeleteIntegration = (sectorKey: string) => {
    catalogService.deleteIntegration(activeSystemKey, sectorKey);
    setSystems(prev => {
      const updated = { ...prev };
      if (updated[activeSystemKey]) {
        const nextIntegrations = { ...(updated[activeSystemKey].integrations || {}) };
        delete nextIntegrations[sectorKey];
        const nextAssociated = (updated[activeSystemKey].associatedSectorKeys || []).filter(k => k !== sectorKey);
        updated[activeSystemKey] = {
          ...updated[activeSystemKey],
          integrations: nextIntegrations,
          associatedSectorKeys: nextAssociated
        };
      }
      try {
        localStorage.setItem('gov_fintech_systems_cache', JSON.stringify(updated));
      } catch {}
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
      isRtl ? `تم حذف التكامل [${sectorKey}] وتحديث السجلات الدائمة بنجاح.` : `Integration [${sectorKey}] was removed.`,
      'info'
    );
  };

  // Bridge UAST Document to Catalog Endpoints (Supports both single endpoint & full multi-endpoint specifications)
  const uastDocToEndpoints = (uastDoc: UastDocument, defaultSysKey: string, defaultEntityId?: string): Endpoint[] => {
    const resolvedSysKey = uastDoc.systemKey || defaultSysKey;
    const resolvedEntityId = uastDoc.entityId || defaultEntityId;
    const baseUrl = uastDoc.baseUrl || uastDoc.channel?.environments?.production || 'https://tahseeltest.ultimate-pay.net/webserve';
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    const standardRules = (uastDoc.errorCodes || []).map((err, i) => ({
      id: `BR_${uastDoc.serviceCode}_${String(i + 1).padStart(3, '0')}`,
      name: err.message,
      err: err.code
    }));

    const defaultParams: Endpoint['params'] = (uastDoc.headers || []).map(h => ({
      name: h.semantics.name,
      type: h.semantics.dataType,
      req: h.constraints.required,
      rule: h.semantics.description,
      tag: h.governance.securityLevel === 'CONFIDENTIAL_MASKED' ? 'Security' : 'General',
      tagClass: h.governance.securityLevel === 'CONFIDENTIAL_MASKED' ? 'badge-purple' : 'badge-blue'
    }));

    const flattenParams = (node: IUastNode) => {
      if (node.structure.path && node.structure.path !== '$') {
        defaultParams.push({
          name: node.semantics.name,
          type: node.semantics.dataType,
          req: node.constraints.required,
          rule: node.semantics.description,
          tag: node.governance.securityLevel === 'CONFIDENTIAL_MASKED' ? 'PII' : 'Payload',
          tagClass: node.governance.securityLevel === 'CONFIDENTIAL_MASKED' ? 'badge-amber' : undefined
        });
      }
      for (const c of (node.children || [])) {
        flattenParams(c);
      }
    };
    if (uastDoc.requestTree) {
      flattenParams(uastDoc.requestTree);
    }

    // CASE 1: Multi-endpoint document (allEndpoints present and non-empty)
    if (uastDoc.allEndpoints && uastDoc.allEndpoints.length > 0) {
      return uastDoc.allEndpoints.map((ep, idx) => {
        const pathSegments = (ep.path || '').split('/').filter(Boolean);
        const lastSegment = pathSegments[pathSegments.length - 1] || ep.summary || `endpoint-${idx + 1}`;
        const cleanPath = ep.path.startsWith('/') ? ep.path : `/${ep.path}`;

        const params: Endpoint['params'] = ep.requestFields && ep.requestFields.length > 0
          ? ep.requestFields.map(f => ({
              name: f.name,
              type: f.type,
              req: f.required,
              rule: f.example ? `القيمة: ${f.example}` : (f.description || `حقل ${f.name}`),
              tag: f.length ? f.length.substring(0, 20) : (f.example ? f.example.substring(0, 20) : 'Payload'),
              tagClass: /iban|pan|pin|token|auth|sign|nonce/i.test(f.name) ? 'badge-amber' : 'badge-green'
            }))
          : [...defaultParams];

        const responseFields = ep.responseFields && ep.responseFields.length > 0
          ? ep.responseFields.map(f => ({
              name: f.name,
              type: f.type,
              req: 'Guaranteed',
              desc: f.description || `Response field: ${f.name}`
            }))
          : undefined;

        return {
          id: `ep_${uastDoc.serviceCode.toLowerCase()}_${idx}_${Date.now()}`,
          method: ep.method || 'POST',
          path: ep.path,
          shortName: lastSegment,
          desc: ep.summary || ep.description || ep.path,
          descEn: ep.description || ep.summary || ep.path,
          isDraft: uastDoc.status !== 'PUBLISHED',
          statusBadge: `v${uastDoc.semver || '1.0.0'}`,
          releaseId: uastDoc.publishedVersionId,
          systemKey: resolvedSysKey,
          targetEntities: resolvedEntityId ? [resolvedEntityId] : undefined,
          params,
          rules: standardRules,
          payload: ep.requestExample || uastDoc.rawSource || '',
          res200: ep.responseExample || JSON.stringify({ status: "SUCCESS", code: "SETTLED_200", version: uastDoc.semver }, null, 2),
          res422: JSON.stringify({ error: "VALIDATION_FAILED", code: "ERR_422", message: "Invalid payload constraints" }, null, 2),
          responseFields,
          curl: `curl -X ${ep.method || 'POST'} "${cleanBase}${cleanPath}" \\\n  -H "Authorization: Bearer <TOKEN>" \\\n  -H "Content-Type: application/json"`,
          docSource: uastDoc.rawSource
        };
      });
    }

    // CASE 2: Single-endpoint document fallback
    const singleEndpointPath = uastDoc.channel?.endpointPath || '/api/v1/service';
    const singleMethod = uastDoc.channel?.method || 'POST';
    return [{
      id: `ep_uast_${Date.now()}`,
      method: singleMethod,
      path: singleEndpointPath,
      shortName: uastDoc.serviceCode.toLowerCase().replace(/_/g, '-'),
      desc: uastDoc.serviceName,
      descEn: uastDoc.serviceNameEn || uastDoc.serviceName,
      isDraft: uastDoc.status !== 'PUBLISHED',
      statusBadge: `v${uastDoc.semver || '1.0.0'}`,
      releaseId: uastDoc.publishedVersionId,
      systemKey: resolvedSysKey,
      targetEntities: resolvedEntityId ? [resolvedEntityId] : undefined,
      params: defaultParams,
      rules: standardRules,
      payload: uastDoc.rawSource || '',
      res200: JSON.stringify({ status: "SUCCESS", code: "SETTLED_200", version: uastDoc.semver }, null, 2),
      res422: JSON.stringify({ error: "VALIDATION_FAILED", code: "ERR_422", message: "Invalid payload constraints" }, null, 2),
      curl: `curl -X ${singleMethod} "${cleanBase}${singleEndpointPath.startsWith('/') ? '' : '/'}${singleEndpointPath}" \\\n  -H "Authorization: Bearer <TOKEN>" \\\n  -H "Content-Type: application/json"`,
      docSource: uastDoc.rawSource
    }];
  };

  const uastDocToEndpoint = (uastDoc: UastDocument, defaultSysKey: string, defaultEntityId?: string): Endpoint => {
    return uastDocToEndpoints(uastDoc, defaultSysKey, defaultEntityId)[0];
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
          activeEndpoint={activeView === 'sector-spec' ? activeEndpoint : null}
          activeIntegration={activeView === 'sector-spec' ? currentIntegration : null}
          activeSystem={activeView === 'sector-spec' ? currentSystem : null}
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
          {/* VIEW 1: SOVEREIGN SYSTEMS MANAGEMENT CONSOLE (SOLID) */}
          {activeView === 'systems' && (
            (hasPermission('catalog:systems:read') || hasPermission('catalog:system:create') || hasPermission('catalog:read') || hasPermission('*')) ? (
              <SystemsManagementView
                systems={systems}
                sectors={masterSectors}
                onAddSystem={handleAddSystem}
                onUpdateSystem={handleUpdateSystem}
                onDeleteSystem={(sysKey) => {
                  const sysName = systems[sysKey]?.name || sysKey;
                  catalogService.deleteSystem(sysKey);
                  setSystems(prev => {
                    const updated = { ...prev };
                    delete updated[sysKey];
                    try {
                      localStorage.setItem('gov_fintech_systems_cache', JSON.stringify(updated));
                    } catch {}
                    return updated;
                  });
                  showFloatingAlert(
                    isRtl ? 'تم حذف النظام بنجاح' : 'System Removed',
                    isRtl ? `تمت إزالة نظام [${sysName}] من المنظومة.` : `System [${sysName}] removed successfully.`,
                    'info'
                  );
                }}
                onNavigateToIntegrations={(_sysKey) => {
                  setActiveView('integrations');
                }}
                onSelectSystemIntegration={handleSelectSystemIntegration}
              />
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.5rem' }}>
                  {isRtl ? 'الوصول إلى إدارة الأنظمة مقيد' : 'Systems Management Restricted'}
                </h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                  {isRtl ? 'لا تمتلك الصلاحية الكافية لإدارة الأنظمة المركزية.' : 'You do not have permission to manage systems.'}
                </p>
              </div>
            )
          )}

          {/* VIEW 2: SOVEREIGN ENTITIES & SECTORS MANAGEMENT CONSOLE (SOLID) */}
          {activeView === 'sectors' && (
            (hasPermission('catalog:sectors:read') || hasPermission('catalog:system:create') || hasPermission('catalog:read') || hasPermission('*')) ? (
              <EntitiesManagementView
                sectors={masterSectors}
                systems={systems}
                onSaveSector={handleSaveSector}
                onDeleteSector={handleDeleteSector}
                onNavigateToIntegrations={(_entityKey) => {
                  setActiveView('integrations');
                }}
              />
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.5rem' }}>
                  {isRtl ? 'الوصول إلى إدارة الجهات مقيد' : 'Entities Management Restricted'}
                </h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                  {isRtl ? 'لا تمتلك الصلاحية الكافية لإدارة الجهات والقطاعات.' : 'You do not have permission to manage entities.'}
                </p>
              </div>
            )
          )}

          {/* VIEW 3: SOVEREIGN ARCHITECTURAL INTEGRATIONS & LINKING CONSOLE (SOLID) */}
          {activeView === 'integrations' && (
            (hasPermission('catalog:integrations:read') || hasPermission('catalog:system:create') || hasPermission('catalog:read') || hasPermission('*')) ? (
              <IntegrationsManagementView
                systems={systems}
                sectors={masterSectors}
                onAddIntegration={handleAddIntegration}
                onDeleteIntegration={handleDeleteIntegration}
                onSelectSystemIntegration={handleSelectSystemIntegration}
                onNavigateToEditor={(sysKey, intKey) => {
                  setActiveSystemKey(sysKey);
                  setActiveIntegrationKey(intKey);
                  setActiveView('dynamic-docs');
                }}
              />
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.5rem' }}>
                  {isRtl ? 'الوصول إلى إدارة الربط مقيد' : 'Integrations Management Restricted'}
                </h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                  {isRtl ? 'لا تمتلك الصلاحية الكافية لإدارة الربط والتكامل.' : 'You do not have permission to manage integrations.'}
                </p>
              </div>
            )
          )}

          {/* VIEW 4: SYSTEMS OVERVIEW DASHBOARD */}
          {activeView === 'dashboard' && (
            (hasPermission('dashboard:read') || hasPermission('*')) ? (
              <DashboardView
                systems={systems}
                sectors={masterSectors}
                initialMode="overview"
                isReadOnlyOverview={true}
                onNavigateView={(view) => setActiveView(view as AppViewMode)}
                onSelectSystemIntegration={handleSelectSystemIntegration}
                onAddSystem={handleAddSystem}
                onUpdateSystem={handleUpdateSystem}
                onDeleteSystem={(sysKey) => {
                  const sysName = systems[sysKey]?.name || sysKey;
                  catalogService.deleteSystem(sysKey);
                  setSystems(prev => {
                    const updated = { ...prev };
                    delete updated[sysKey];
                    try {
                      localStorage.setItem('gov_fintech_systems_cache', JSON.stringify(updated));
                    } catch {}
                    return updated;
                  });
                  showFloatingAlert(
                    isRtl ? 'تم حذف النظام بنجاح' : 'System Removed',
                    isRtl ? `تمت إزالة نظام [${sysName}] من المنظومة.` : `System [${sysName}] removed successfully.`,
                    'info'
                  );
                }}
                onSaveSector={handleSaveSector}
                onDeleteSector={handleDeleteSector}
                onDeleteIntegration={handleDeleteIntegration}
              />
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 2rem',
                textAlign: 'center'
              }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.5rem' }}>
                  {isRtl ? 'الوصول إلى لوحة التحكم مقيد' : 'Dashboard Access Restricted'}
                </h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                  {isRtl ? 'حسابك الحالي لا يمتلك صلاحية استعراض لوحة الداشبورد (dashboard:read).' : 'Your account does not possess permission to view the dashboard.'}
                </p>
              </div>
            )
          )}

          {/* VIEW 2: UNIVERSAL SOVEREIGN 3-PANE WORKBENCH & DRAFT ENGINE */}
          {(activeView === 'workbench' || activeView === 'add-api') && (
            (hasPermission('catalog:endpoint:create') || hasPermission('catalog:system:create') || hasPermission('catalog:create') || hasPermission('*')) ? (
              <UniversalWorkbench
                systems={systems}
                masterSectors={masterSectors}
                activeSystemKey={activeSystemKey}
                activeIntegrationKey={activeIntegrationKey}
                onAddSystem={handleAddSystem}
                onCreateSector={handleSaveSector}
                onAddIntegration={async (sysKey, newInt) => {
                  const saveRes = await catalogService.saveIntegration(sysKey, newInt);
                  if (!saveRes.success) {
                    showFloatingAlert(
                      isRtl ? 'حظر الحوكمة والنزاهة المعمارية' : 'Governance Constraint Block',
                      saveRes.error || (isRtl ? 'تعذر إتمام التكامل لمخالفته القواعد السيادية.' : 'Integration violated governance rules.'),
                      'error'
                    );
                    return;
                  }
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
                    isRtl ? 'تم إضافة وتثبيت التكامل بنجاح' : 'Entity Integrated Successfully',
                    isRtl ? `تم ربط الجهة [${newInt.name}] بالنظام [${systems[sysKey]?.name || sysKey}] بعد التحقق من مطابقة وثيقة الـ API المعتمدة.` : `Entity [${newInt.nameEn || newInt.name}] integrated successfully.`,
                    'success'
                  );
                }}
                onPublishSuccess={(publishedDoc, targetSysKey, targetIntKey) => {
                  const finalSysKey = targetSysKey || publishedDoc.systemKey || activeSystemKey;
                  const finalIntKey = targetIntKey || publishedDoc.entityId || activeIntegrationKey;
                  const endpointsList = uastDocToEndpoints(publishedDoc, finalSysKey, finalIntKey);
                  handleAddEndpointFromHub(finalIntKey, endpointsList, endpointsList.length > 1, finalSysKey, publishedDoc.rawSource, true);
                  const sysName = systems[finalSysKey]?.name || finalSysKey;
                  const intName = systems[finalSysKey]?.integrations?.[finalIntKey]?.name || finalIntKey;
                  showFloatingAlert(
                    isRtl ? 'تم اعتماد ونشر الـ API بنجاح' : 'API Published Successfully',
                    isRtl 
                      ? `تم اعتماد وتجميد ${endpointsList.length} نقطة نهاية (Endpoints) للإصدار v${publishedDoc.semver} في الكتالوج المعتمد تحت [${sysName}] ← [${intName}].` 
                      : `${endpointsList.length} Endpoints published to catalog under [${sysName}] ← [${intName}].`,
                    'success',
                    endpointsList[0]?.path
                  );
                }}
                onBackToCatalog={() => setActiveView('dashboard')}
              />
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 2rem',
                textAlign: 'center'
              }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.5rem' }}>
                  {isRtl ? 'إضافة وتوثيق الأنظمة مقيد' : 'Workbench Access Restricted'}
                </h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  {isRtl ? 'حسابك لا يمتلك صلاحية إنشاء وتوثيق الواجهات البرمجية (catalog:endpoint:create مطلوب).' : 'You do not have permission to access the workbench.'}
                </p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setActiveView('dashboard')}
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 700 }}
                >
                  {isRtl ? 'العودة إلى لوحة الداشبورد' : 'Back to Dashboard'}
                </button>
              </div>
            )
          )}

          {/* VIEW 3: SECTOR / INTEGRATION SPEC VIEWER */}
          {activeView === 'sector-spec' && (
            (hasPermission('documentation:systems:read') || hasPermission('catalog:read') || hasPermission('*') || canAccess('catalog:read', { systemId: activeSystemKey, entityId: activeIntegrationKey })) ? (
              <>
                {currentEndpoints.length > 0 ? (
                  <ApiDocumentationView
                    endpoints={currentEndpoints}
                    activeEndpointIndex={activeEndpointIndex}
                    onSelectEndpoint={setActiveEndpointIndex}
                    systemName={localizedSysName}
                    integrationName={localizedIntName}
                    onAddNewEndpoint={() => setActiveView('add-api')}
                    rawSource={currentIntegration?.rawDocSource || currentEndpoints[activeEndpointIndex]?.docSource || currentEndpoints[activeEndpointIndex]?.payload}
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
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 2rem',
                textAlign: 'center'
              }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.5rem' }}>
                  {isRtl ? 'الاطلاع على التوثيق البرمجي مقيد' : 'API Documentation Restricted'}
                </h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  {isRtl ? 'حسابك لا يمتلك صلاحية استعراض وتوثيق الأنظمة والواجهات البرمجية.' : 'Your account does not possess permission to view API documentation.'}
                </p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setActiveView('dashboard')}
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 700 }}
                >
                  {isRtl ? 'العودة إلى لوحة الداشبورد' : 'Back to Dashboard'}
                </button>
              </div>
            )
          )}

          {/* VIEW 4: DEDICATED IAM GOVERNANCE CONSOLE */}
          {activeView === 'iam' && (
            hasPermission('iam:manage') ? (
              <IamManagementView
                systems={systems}
                onNotify={(title, msg, type) => showFloatingAlert(title, msg, type)}
              />
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 2rem',
                textAlign: 'center'
              }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.5rem' }}>
                  {isRtl ? 'الوصول إلى إدارة الهويات مقيد' : 'IAM Governance Restricted'}
                </h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                  {isRtl ? 'لا تمتلك الصلاحية الكافية لإدارة المستخدمين والأدوار (iam:manage).' : 'You do not have permission to manage IAM users and roles.'}
                </p>
              </div>
            )
          )}

          {/* VIEW: SOVEREIGN API DOCUMENTS & WORKSPACES MATRIX */}
          {activeView === 'documents-matrix' && (
            (hasPermission('catalog:documents:read') || hasPermission('catalog:read') || hasPermission('catalog:endpoint:create') || hasPermission('*')) ? (
              <div className="iam-console sovereign-dynamic-theme" style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100%', flex: 1, overflowY: 'auto' }} dir={direction}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.75rem', background: 'var(--surface, #0f172a)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text, #ffffff)', margin: 0, letterSpacing: '-0.01em' }}>
                      {isRtl ? 'إدارة وتأسيس وثائق الـ API' : 'API Documents & Workspaces Matrix'}
                    </h2>
                    <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.25)', fontWeight: 600 }}>
                      {isRtl ? 'تكاملات الأنظمة والجهات' : 'Live Integrated Systems'}
                    </span>
                  </div>
                </div>
                <div style={{ flex: 1, padding: '1rem 1.75rem' }}>
                  <DocumentMatrixView
                    systems={systems}
                    sectors={masterSectors}
                    onNavigateToDoc={(sysKey, intKey) => handleSelectSystemIntegration(sysKey, intKey)}
                    onNavigateToEditor={(sysKey, intKey) => {
                      setActiveSystemKey(sysKey);
                      setActiveIntegrationKey(intKey);
                      setActiveView('dynamic-docs');
                    }}
                    onNotify={(title, msg, type) => showFloatingAlert(title, msg, type)}
                    onOpenInboxItem={(_reqId) => {
                      setActiveView('governance');
                    }}
                  />
                </div>
              </div>
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 2rem',
                textAlign: 'center'
              }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.5rem' }}>
                  {isRtl ? 'الوصول إلى إدارة الوثائق مقيد' : 'Documents Matrix Restricted'}
                </h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                  {isRtl ? 'لا تمتلك الصلاحية الكافية لاستعراض وتأسيس وثائق الأنظمة.' : 'You do not have permission to access the documents matrix.'}
                </p>
              </div>
            )
          )}

          {/* VIEW 5: DEDICATED SOVEREIGN GOVERNANCE & APPROVALS PIPELINES (تبويب مستقل كامل) */}
          {activeView === 'governance' && (
            (hasPermission('governance:workflows:read') || hasPermission('governance:inbox:approve') || hasPermission('governance:inbox:read') || hasPermission('governance:*') || hasPermission('*')) ? (
              <GovernanceManagementView
                systems={systems}
                onNavigateToDoc={(sysKey, intKey) => handleSelectSystemIntegration(sysKey, intKey)}
                onNavigateToEditor={(sysKey, intKey) => {
                  setActiveSystemKey(sysKey);
                  setActiveIntegrationKey(intKey);
                  setActiveView('dynamic-docs');
                }}
                onNotify={(title, msg, type) => showFloatingAlert(title, msg, type)}
              />
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 2rem',
                textAlign: 'center'
              }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.5rem' }}>
                  {isRtl ? 'الوصول إلى مركز الحوكمة مقيد' : 'Governance Hub Restricted'}
                </h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                  {isRtl ? 'لا تمتلك صلاحية مراجعة واعتماد طلبات الحوكمة.' : 'You do not have permission to access governance inbox.'}
                </p>
              </div>
            )
          )}

          {/* VIEW 5.5: SOVEREIGN WORKFLOW POLICIES STUDIO (تبويب مستقل بالكامل) */}
          {activeView === 'workflow-policies' && (
            (hasPermission('governance:policies:read') || hasPermission('iam:manage') || hasPermission('governance:*') || hasPermission('*')) ? (
              <WorkflowPoliciesView
                onNotify={(title, msg, type) => showFloatingAlert(title, msg, type)}
              />
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 2rem',
                textAlign: 'center'
              }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.5rem' }}>
                  {isRtl ? 'الوصول إلى مسارات الاعتماد مقيد' : 'Workflow Policies Restricted'}
                </h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                  {isRtl ? 'لا تمتلك صلاحية تخصيص سياسات ومسارات الحوكمة (iam:manage).' : 'You do not have permission to configure workflow policies.'}
                </p>
              </div>
            )
          )}

          {/* VIEW 6: SOVEREIGN DYNAMIC MULTI-MODE DOCUMENTATION (COMPLETELY INDEPENDENT) */}
          {activeView === 'dynamic-docs' && (
            (hasPermission('documentation:dynamic:read') || hasPermission('catalog:spec:export') || hasPermission('documentation:systems:read') || hasPermission('catalog:read') || hasPermission('catalog:endpoint:create') || hasPermission('*')) ? (
              <DynamicWorkbench
                systems={systems}
                masterSectors={masterSectors}
                activeSystemKey={activeSystemKey}
                activeIntegrationKey={activeIntegrationKey}
                onAddSystem={handleAddSystem}
                onCreateSector={handleSaveSector}
                onAddIntegration={async (sysKey, newInt) => {
                  const saveRes = await catalogService.saveIntegration(sysKey, newInt);
                  if (!saveRes.success) {
                    showFloatingAlert(
                      isRtl ? 'حظر الحوكمة والنزاهة المعمارية' : 'Governance Constraint Block',
                      saveRes.error || (isRtl ? 'تعذر إتمام التكامل لمخالفته القواعد السيادية.' : 'Integration violated governance rules.'),
                      'error'
                    );
                    return;
                  }
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
                    isRtl ? 'تم إضافة وتثبيت التكامل بنجاح' : 'Entity Integrated Successfully',
                    isRtl ? `تم ربط الجهة [${newInt.name}] بالنظام [${systems[sysKey]?.name || sysKey}] بعد التحقق من مطابقة وثيقة الـ API المعتمدة.` : `Entity [${newInt.nameEn || newInt.name}] integrated successfully.`,
                    'success'
                  );
                }}
                onPublishSuccess={(publishedDoc, targetSysKey, targetIntKey) => {
                  const finalSysKey = targetSysKey || publishedDoc.systemKey || activeSystemKey;
                  const finalIntKey = targetIntKey || publishedDoc.entityId || activeIntegrationKey;
                  const endpointsList = uastDocToEndpoints(publishedDoc, finalSysKey, finalIntKey);
                  handleAddEndpointFromHub(finalIntKey, endpointsList, endpointsList.length > 1, finalSysKey, publishedDoc.rawSource, true);
                  const sysName = systems[finalSysKey]?.name || finalSysKey;
                  const intName = systems[finalSysKey]?.integrations?.[finalIntKey]?.name || finalIntKey;
                  showFloatingAlert(
                    isRtl ? 'تم اعتماد ونشر الـ API بنجاح' : 'API Published Successfully',
                    isRtl 
                      ? `تم اعتماد وتجميد ${endpointsList.length} نقطة نهاية (Endpoints) للإصدار v${publishedDoc.semver} في الكتالوج المعتمد تحت [${sysName}] ← [${intName}].` 
                      : `${endpointsList.length} Endpoints published to catalog under [${sysName}] ← [${intName}].`,
                    'success',
                    endpointsList[0]?.path
                  );
                }}
                onBackToCatalog={() => setActiveView('dashboard')}
              />
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 2rem',
                textAlign: 'center'
              }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.5rem' }}>
                  {isRtl ? 'الوصول إلى التوثيق الديناميكي مقيد' : 'Dynamic Docs Access Restricted'}
                </h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  {isRtl ? 'حسابك لا يمتلك صلاحية استعراض وتخصيص قوالب التوثيق.' : 'You do not have permission to access dynamic docs studio.'}
                </p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setActiveView('dashboard')}
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 700 }}
                >
                  {isRtl ? 'العودة إلى لوحة الداشبورد' : 'Back to Dashboard'}
                </button>
              </div>
            )
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
        <BreadcrumbProvider>
          <AppContent />
        </BreadcrumbProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};
