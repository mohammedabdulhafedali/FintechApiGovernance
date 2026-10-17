import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Check,
  X,
  Building2,
  FolderPlus,
  Edit2,
  ChevronDown,
  Link2,
  ShieldCheck,
  Layers
} from 'lucide-react';
import { SystemModule, Sector, SystemIntegration } from '../../types/schema';
import { DocumentGovernanceEngine } from '../../services/docGovernanceEngine';
import { useLanguage } from '../../i18n';
import { Can } from '../auth/Can';
import { useAuth } from '../auth/AuthContext';

export type DashboardScreenMode = 'overview' | 'system-editor' | 'sectors-hub' | 'systems-hub' | 'integrations-hub';

interface DashboardViewProps {
  systems: Record<string, SystemModule>;
  sectors?: Record<string, Sector>;
  initialMode?: DashboardScreenMode;
  isReadOnlyOverview?: boolean;
  onNavigateView?: (view: string) => void;
  onSelectSystemIntegration: (systemKey: string, integrationKey: string) => void;
  onAddSystem: (newSystem: SystemModule) => void;
  onUpdateSystem?: (systemKey: string, updatedData: Partial<SystemModule>) => void;
  onDeleteSystem?: (systemKey: string) => void;
  onDeleteIntegration?: (systemKey: string, entityId: string) => void;
  onSaveSector?: (sector: { key: string; name: string; nameEn?: string; code: string }) => void;
  onDeleteSector?: (sectorKey: string) => void;
  // Backward compatibility
  onSelectSector?: (sectorKey: string) => void;
  onAddSector?: (newSector: Sector) => void;
  onOpenDeleteSector?: (sectorKey: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  systems,
  sectors = {},
  initialMode,
  isReadOnlyOverview = false,
  onNavigateView,
  onSelectSystemIntegration,
  onAddSystem,
  onUpdateSystem,
  onDeleteSystem,
  onDeleteIntegration,
  onSaveSector,
  onDeleteSector
}) => {
  const { t, getLocalized, isRtl } = useLanguage();
  const { canAccess } = useAuth();

  // Screen Mode: 'overview' (Cards Grid) | 'system-editor' (Full Page Editor) | 'sectors-hub' (Full Page Sectors) | 'systems-hub' | 'integrations-hub'
  const [screenMode, setScreenMode] = useState<DashboardScreenMode>(initialMode || 'overview');

  useEffect(() => {
    if (initialMode) {
      setScreenMode(initialMode);
    }
  }, [initialMode]);

  // System Editor Full-Screen State
  const [editingSystemKey, setEditingSystemKey] = useState<string | null>(null);
  const [formNameAr, setFormNameAr] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formCode, setFormCode] = useState('SYS_');
  const [formDescription, setFormDescription] = useState('');
  const [formSelectedSectors, setFormSelectedSectors] = useState<string[]>([]);

  // Sectors Hub State (Independent Entity Management)
  const [editingSectorKey, setEditingSectorKey] = useState<string | null>(null);
  const [secNameAr, setSecNameAr] = useState('');
  const [secNameEn, setSecNameEn] = useState('');
  const [secCode, setSecCode] = useState('SEC_');

  // Confirmation states for sectors management
  const [sectorPendingSave, setSectorPendingSave] = useState<{
    key: string;
    name: string;
    nameEn: string;
    code: string;
    isEdit: boolean;
  } | null>(null);

  const [sectorPendingDelete, setSectorPendingDelete] = useState<{
    key: string;
    name: string;
    code: string;
    linkedCount: number;
  } | null>(null);

  const [sectorAlertMessage, setSectorAlertMessage] = useState<{
    type: 'success' | 'info';
    text: string;
  } | null>(null);

  // System Alert and Delete Confirmation
  const [systemAlertMessage, setSystemAlertMessage] = useState<{
    type: 'success' | 'info';
    text: string;
  } | null>(null);
  // System Pending Delete Modal State (Strict Governance)
  const [systemPendingDelete, setSystemPendingDelete] = useState<{
    key: string;
    name: string;
    code: string;
    linkedCount: number;
  } | null>(null);

  const handleOpenDeleteSystemModal = (sysKey: string, sys: SystemModule) => {
    const rawIntegrations = sys.integrations ? Object.keys(sys.integrations) : [];
    const associatedKeys = sys.associatedSectorKeys || [];
    const totalLinkedCount = Math.max(rawIntegrations.length, associatedKeys.length);

    setSystemPendingDelete({
      key: sysKey,
      name: sys.name,
      code: sys.code || sysKey,
      linkedCount: totalLinkedCount
    });
  };

  const handleConfirmDeleteSystem = () => {
    if (!systemPendingDelete) return;

    if (systemPendingDelete.linkedCount > 0) {
      // Governance Block: impossible to delete linked system
      setSystemPendingDelete(null);
      return;
    }

    const deleteKey = systemPendingDelete.key;
    const deletedName = systemPendingDelete.name;

    if (onDeleteSystem) {
      onDeleteSystem(deleteKey);
    }

    if (editingSystemKey === deleteKey) {
      setEditingSystemKey(null);
      setFormNameAr('');
      setFormNameEn('');
      setFormCode('SYS_');
      setFormDescription('');
    }

    setSystemPendingDelete(null);
    setSystemAlertMessage({
      type: 'success',
      text: isRtl ? `تم حذف نظام [${deletedName}] بنجاح من المنظومة.` : `System [${deletedName}] deleted successfully.`
    });
  };

  // Collapsed sections tracking (open by default)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };


  // Link Entity to System Modal State
  const [linkingSystemKey, setLinkingSystemKey] = useState<string | null>(null);
  const [selectedEntityForLink, setSelectedEntityForLink] = useState<string>('');
  const [selectedDirectionForLink, setSelectedDirectionForLink] = useState<'INBOUND' | 'OUTBOUND' | 'BIDIRECTIONAL'>('INBOUND');
  const [selectedDocKeyForLink, setSelectedDocKeyForLink] = useState<string>('');
  const [linkValidationError, setLinkValidationError] = useState<string | null>(null);

  // Unlink Entity from System Confirmation Modal State
  const [integrationPendingUnlink, setIntegrationPendingUnlink] = useState<{
    systemKey: string;
    entityId: string;
    entityName: string;
    systemName: string;
    endpointCount: number;
  } | null>(null);

  // Integrations Hub State
  const [hubSelectedSysKey, setHubSelectedSysKey] = useState<string>('');
  const [hubSelectedEntityKey, setHubSelectedEntityKey] = useState<string>('');
  const [hubDirection, setHubDirection] = useState<'INBOUND' | 'OUTBOUND'>('INBOUND');
  const [hubSelectedDocKey, setHubSelectedDocKey] = useState<string>('');
  const [hubValidationError, setHubValidationError] = useState<string | null>(null);
  const [hubSearchTerm, setHubSearchTerm] = useState<string>('');
  const [hubFilterSys, setHubFilterSys] = useState<string>('all');

  const handleHubConfirmLinkEntity = () => {
    if (!hubSelectedSysKey) {
      setHubValidationError(isRtl ? 'يرجى اختيار النظام المستهدف أولاً.' : 'Please select a system first.');
      return;
    }
    if (!hubSelectedEntityKey) {
      setHubValidationError(isRtl ? 'يرجى اختيار الجهة الشريكة.' : 'Please select an entity.');
      return;
    }

    const currentSys = systems[hubSelectedSysKey];
    if (!currentSys) return;

    const existingIntegrations = currentSys.integrations || {};

    if (existingIntegrations[hubSelectedEntityKey]) {
      setHubValidationError(
        isRtl
          ? `الجهة المختارة مرتبطة بالفعل بهذا النظام!`
          : 'Selected entity is already integrated with this system!'
      );
      return;
    }

    const secObj = sectors[hubSelectedEntityKey];
    const entityName = secObj ? secObj.name : hubSelectedEntityKey;
    const entityNameEn = secObj?.nameEn || entityName;
    const entityCode = secObj?.code || `SEC_${hubSelectedEntityKey.toUpperCase()}`;

    let associatedEndpoints: any[] = [];
    let linkedDocVersion: string | undefined;

    if (hubSelectedDocKey) {
      const govEngine = DocumentGovernanceEngine.getInstance();
      const allContainers = govEngine.getContainersMatrix(systems);
      const selectedContainer = allContainers.find(c => c.documentKey === hubSelectedDocKey);

      if (selectedContainer && selectedContainer.currentApprovedVersion) {
        if (selectedContainer.integrationKey !== hubSelectedEntityKey) {
          setHubValidationError(
            isRtl
              ? 'قاعدة الحوكمة: عدم تطابق الجهة! الوثيقة المختارة لا تخص هذه الجهة.'
              : 'Governance Rule: Document entity mismatch.'
          );
          return;
        }

        linkedDocVersion = selectedContainer.currentApprovedVersion.versionNumber;
        if (selectedContainer.currentApprovedVersion.payloadSnapshot) {
          try {
            const parsed = JSON.parse(selectedContainer.currentApprovedVersion.payloadSnapshot);
            if (Array.isArray(parsed)) associatedEndpoints = parsed;
          } catch { }
        }
      }
    }

    const newIntegration: SystemIntegration = {
      entityId: hubSelectedEntityKey,
      name: entityName,
      nameEn: entityNameEn,
      code: entityCode,
      direction: hubDirection,
      endpoints: associatedEndpoints,
      docVersion: linkedDocVersion
    };

    const updatedIntegrations = {
      ...existingIntegrations,
      [hubSelectedEntityKey]: newIntegration
    };

    const currentAssociated = currentSys.associatedSectorKeys || Object.keys(existingIntegrations);
    const updatedAssociated = Array.from(new Set([...currentAssociated, hubSelectedEntityKey]));

    if (onUpdateSystem) {
      onUpdateSystem(hubSelectedSysKey, {
        integrations: updatedIntegrations,
        associatedSectorKeys: updatedAssociated
      });
    }

    setHubSelectedEntityKey('');
    setHubSelectedDocKey('');
    setHubValidationError(null);
    setSystemAlertMessage({
      type: 'success',
      text: isRtl
        ? `تم ربط وتكامل جهة [${entityName}] بنجاح مع نظام [${currentSys.name}].`
        : `Successfully linked entity [${entityName}] to system [${currentSys.name}].`
    });
  };

  // Switch to System Editor (Create mode)
  const handleOpenCreateSystem = () => {
    setEditingSystemKey(null);
    setFormNameAr('');
    setFormNameEn('');
    setFormCode('SYS_');
    setFormDescription('');
    setFormSelectedSectors([]);
    setScreenMode('system-editor');
  };

  // Switch to System Editor (Edit mode)
  const handleOpenEditSystem = (sysKey: string, sys: SystemModule) => {
    setEditingSystemKey(sysKey);
    setFormNameAr(sys.name || '');
    setFormNameEn(sys.nameEn || '');
    setFormCode(sys.code || `SYS_${sysKey.toUpperCase()}`);
    setFormDescription(sys.description || '');

    // Existing integration keys or associated sectors
    const currentKeys = sys.associatedSectorKeys || Object.keys(sys.integrations || {});
    setFormSelectedSectors(currentKeys);
    setScreenMode('system-editor');
  };

  // Save System (Full Screen Form & Systems Hub)
  const handleSaveSystem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNameAr.trim()) return;

    if (editingSystemKey) {
      // 1. Update Existing System (Preserve its existing integrations!)
      const currentSys = systems[editingSystemKey];

      const updatedData: Partial<SystemModule> = {
        name: formNameAr.trim(),
        nameEn: formNameEn.trim() || formNameAr.trim(),
        code: formCode.trim().toUpperCase() || `SYS_${editingSystemKey.toUpperCase()}`,
        description: formDescription.trim(),
        associatedSectorKeys: currentSys?.associatedSectorKeys || [],
        integrations: currentSys?.integrations || {}
      };

      if (onUpdateSystem) {
        onUpdateSystem(editingSystemKey, updatedData);
      }

      setSystemAlertMessage({
        type: 'success',
        text: isRtl ? `تم حفظ تعديلات نظام [${formNameAr.trim()}] بنجاح.` : `System [${formNameAr.trim()}] updated successfully.`
      });
      setEditingSystemKey(null);
      setFormNameAr('');
      setFormNameEn('');
      setFormCode('SYS_');
      setFormDescription('');
    } else {
      // 2. Create New System (Completely decoupled and abstract: empty integrations)
      const generatedKey = (formNameEn.trim() || formNameAr.trim())
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/^_+|_+$/g, '') || `sys_${Date.now()}`;

      const newSystem: SystemModule = {
        key: generatedKey,
        name: formNameAr.trim(),
        nameEn: formNameEn.trim() || formNameAr.trim(),
        code: formCode.trim().toUpperCase() || `SYS_${generatedKey.toUpperCase()}`,
        icon: 'Layers',
        description: formDescription.trim() || (isRtl ? 'نظام مالي معتمد' : 'Certified financial system'),
        descriptionEn: formNameEn.trim() || formNameAr.trim(),
        status: 'ACTIVE',
        associatedSectorKeys: [],
        integrations: {}
      };

      onAddSystem(newSystem);

      setSystemAlertMessage({
        type: 'success',
        text: isRtl ? `تم تسجيل نظام [${formNameAr.trim()}] بنجاح.` : `System [${formNameAr.trim()}] registered successfully.`
      });
      setFormNameAr('');
      setFormNameEn('');
      setFormCode('SYS_');
      setFormDescription('');
    }

    if (screenMode !== 'systems-hub') {
      setScreenMode('overview');
    }
  };

  // Toggle Sector Selection in System Form
  const toggleSectorSelection = (secKey: string) => {
    setFormSelectedSectors(prev =>
      prev.includes(secKey) ? prev.filter(k => k !== secKey) : [...prev, secKey]
    );
  };

  // Initiate Save Sector (Prompts Confirmation Modal)
  const handleSaveSector = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secNameAr.trim()) return;

    const rawEn = (secNameEn.trim() || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/^_+|_+$/g, '');

    const key = editingSectorKey || rawEn || `sec_${Date.now()}`;

    const trimmedCode = secCode.trim().toUpperCase();
    const code = (!trimmedCode || trimmedCode === 'SEC_')
      ? `SEC_${(rawEn || String(Date.now()).slice(-4)).toUpperCase()}`
      : trimmedCode;

    setSectorPendingSave({
      key,
      name: secNameAr.trim(),
      nameEn: secNameEn.trim() || secNameAr.trim(),
      code,
      isEdit: !!editingSectorKey
    });
  };

  // Confirm and Execute Sector Save
  const handleConfirmSaveSector = () => {
    if (!sectorPendingSave) return;

    if (onSaveSector) {
      onSaveSector({
        key: sectorPendingSave.key,
        name: sectorPendingSave.name,
        nameEn: sectorPendingSave.nameEn,
        code: sectorPendingSave.code
      });
    }

    const savedName = sectorPendingSave.name;
    const wasEdit = sectorPendingSave.isEdit;

    setSectorPendingSave(null);
    setEditingSectorKey(null);
    setSecNameAr('');
    setSecNameEn('');
    setSecCode('SEC_');

    setSectorAlertMessage({
      type: 'success',
      text: isRtl
        ? (wasEdit ? `تم حفظ تعديلات القطاع [${savedName}] بنجاح.` : `تم تسجيل وحفظ القطاع [${savedName}] بنجاح.`)
        : (wasEdit ? `Sector [${savedName}] updated successfully.` : `Sector [${savedName}] registered successfully.`)
    });
  };

  // Confirm and Execute Sector Deletion
  const handleConfirmDeleteSector = () => {
    if (!sectorPendingDelete) return;

    if (sectorPendingDelete.linkedCount > 0) {
      setSectorAlertMessage({
        type: 'error',
        text: isRtl
          ? `حظر حوكمة: لا يمكن حذف [${sectorPendingDelete.name}] لوجود ارتباط نشط مع (${sectorPendingDelete.linkedCount}) أنظمة مركزية.`
          : `Governance block: Cannot delete [${sectorPendingDelete.name}] because it is linked to (${sectorPendingDelete.linkedCount}) systems.`
      });
      setSectorPendingDelete(null);
      return;
    }

    const deletedName = sectorPendingDelete.name;
    const deleteKey = sectorPendingDelete.key;

    if (onDeleteSector) {
      onDeleteSector(deleteKey);
    }

    setSectorPendingDelete(null);
    if (editingSectorKey === deleteKey) {
      setEditingSectorKey(null);
      setSecNameAr('');
      setSecNameEn('');
      setSecCode('SEC_');
    }

    setSectorAlertMessage({
      type: 'success',
      text: isRtl
        ? `تم حذف القطاع [${deletedName}] بنجاح من المنظومة.`
        : `Sector [${deletedName}] deleted successfully.`
    });
  };

  const handleEditSector = (sec: Sector) => {
    setEditingSectorKey(sec.key || '');
    setSecNameAr(sec.name || '');
    setSecNameEn(sec.nameEn || '');
    setSecCode(sec.code || `SEC_${(sec.key || '').toUpperCase()}`);
    setSectorAlertMessage(null);
  };

  // Open Link Entity Modal
  const handleOpenLinkEntityModal = (sysKey: string) => {
    setLinkingSystemKey(sysKey);
    setSelectedEntityForLink('');
    setSelectedDirectionForLink('INBOUND');
    setSelectedDocKeyForLink('');
    setLinkValidationError(null);
  };

  // Confirm Link Entity to System with Strict Governance Rules
  const handleConfirmLinkEntity = () => {
    if (!linkingSystemKey) return;
    if (!selectedEntityForLink) {
      setLinkValidationError(isRtl ? 'يرجى اختيار الجهة المراد ربطها بالنظام.' : 'Please select an entity to link.');
      return;
    }

    const currentSys = systems[linkingSystemKey];
    if (!currentSys) return;

    // Rule 1: Check if already linked to this system
    const existingIntegrations = currentSys.integrations || {};
    if (existingIntegrations[selectedEntityForLink]) {
      setLinkValidationError(
        isRtl
          ? 'قاعدة الحوكمة: هذه الجهة مرتبطة مسبقاً بهذا النظام. لا يمكن تكرار نفس الربط لنفس النظام.'
          : 'Governance Rule: This entity is already integrated with this system.'
      );
      return;
    }

    const entitySector = sectors[selectedEntityForLink];
    const entityName = entitySector?.name || selectedEntityForLink;
    const entityNameEn = entitySector?.nameEn || entityName;
    const entityCode = entitySector?.code || `INT_${selectedEntityForLink.toUpperCase()}`;

    // Get documents matching this entity from DocumentGovernanceEngine
    const govEngine = DocumentGovernanceEngine.getInstance();
    const allContainers = govEngine.getContainersMatrix(systems);

    // Find matching document for this entity if selected
    let associatedEndpoints: any[] = [];
    let linkedDocVersion: string | undefined = undefined;

    if (selectedDocKeyForLink) {
      const selectedContainer = allContainers.find(c => c.documentKey === selectedDocKeyForLink);
      if (selectedContainer) {
        // Rule 2: Document must be APPROVED
        if (!selectedContainer.currentApprovedVersion || selectedContainer.currentApprovedVersion.status !== 'APPROVED') {
          setLinkValidationError(
            isRtl
              ? 'قاعدة الحوكمة: لا يمكن ربط وثيقة غير معتمدة رسمياً. الوثائق المعتمدة فقط هي القابلة للربط.'
              : 'Governance Rule: Only officially approved documents can be linked.'
          );
          return;
        }

        // Rule 3: Target entity of document must match selected entity
        if (selectedContainer.integrationKey !== selectedEntityForLink) {
          setLinkValidationError(
            isRtl
              ? 'قاعدة الحوكمة: عدم تطابق الجهة! الوثيقة المختارة لا تخص هذه الجهة.'
              : 'Governance Rule: Document entity mismatch.'
          );
          return;
        }

        linkedDocVersion = selectedContainer.currentApprovedVersion.versionNumber;
        // If system currently has endpoints for this integration in initial catalog
        if (selectedContainer.currentApprovedVersion.payloadSnapshot) {
          try {
            const parsed = JSON.parse(selectedContainer.currentApprovedVersion.payloadSnapshot);
            if (Array.isArray(parsed)) associatedEndpoints = parsed;
          } catch { }
        }
      }
    }

    // Build new integration object
    const newIntegration: SystemIntegration = {
      entityId: selectedEntityForLink,
      name: entityName,
      nameEn: entityNameEn,
      code: entityCode,
      direction: selectedDirectionForLink,
      endpoints: associatedEndpoints,
      docVersion: linkedDocVersion
    };

    const updatedIntegrations = {
      ...existingIntegrations,
      [selectedEntityForLink]: newIntegration
    };

    const currentAssociated = currentSys.associatedSectorKeys || Object.keys(existingIntegrations);
    const updatedAssociated = Array.from(new Set([...currentAssociated, selectedEntityForLink]));

    if (onUpdateSystem) {
      onUpdateSystem(linkingSystemKey, {
        integrations: updatedIntegrations,
        associatedSectorKeys: updatedAssociated
      });
    }

    setLinkingSystemKey(null);
    setSelectedEntityForLink('');
    setSelectedDocKeyForLink('');
    setLinkValidationError(null);
  };

  // Confirm and Execute Unlink Entity from System with Full Governance
  const handleConfirmUnlinkIntegration = () => {
    if (!integrationPendingUnlink) return;
    const { systemKey, entityId, entityName, systemName } = integrationPendingUnlink;

    if (onDeleteIntegration) {
      onDeleteIntegration(systemKey, entityId);
    } else if (onUpdateSystem) {
      const currentSys = systems[systemKey];
      if (currentSys) {
        const updatedIntegrations = { ...(currentSys.integrations || {}) };
        delete updatedIntegrations[entityId];
        const currentAssociated = currentSys.associatedSectorKeys || Object.keys(currentSys.integrations || {});
        const updatedAssociated = currentAssociated.filter(k => k !== entityId);
        onUpdateSystem(systemKey, {
          integrations: updatedIntegrations,
          associatedSectorKeys: updatedAssociated
        });
      }
    }

    setSystemAlertMessage({
      type: 'success',
      text: isRtl
        ? `تم فك ارتباط [${entityName}] عن نظام [${systemName}] بنجاح.`
        : `[${entityName}] was unlinked from [${systemName}] successfully.`
    });

    setIntegrationPendingUnlink(null);
  };

  // Filtered systems accessible by sovereign scope
  const systemEntries = Object.entries(systems).filter(([sysKey]) => {
    return canAccess('dashboard:read', { systemId: sysKey }) ||
      canAccess('catalog:read', { systemId: sysKey }) ||
      canAccess('catalog:view', { systemId: sysKey });
  });

  const availableSectorList = Object.values(sectors);

  // All active integrations list across systems
  const allActiveIntegrations = useMemo(() => {
    const list: Array<{
      sysKey: string;
      sysName: string;
      sysCode: string;
      intKey: string;
      integration: SystemIntegration;
    }> = [];

    systemEntries.forEach(([sKey, sMod]) => {
      if (sMod.integrations) {
        Object.entries(sMod.integrations).forEach(([iKey, iVal]) => {
          list.push({
            sysKey: sKey,
            sysName: sMod.name,
            sysCode: sMod.code || sKey,
            intKey: iKey,
            integration: iVal
          });
        });
      }
    });

    return list;
  }, [systemEntries]);

  // Filtered active integrations for integrations hub
  const filteredActiveIntegrations = allActiveIntegrations.filter(item => {
    if (hubFilterSys !== 'all' && item.sysKey !== hubFilterSys) return false;
    if (hubSearchTerm.trim()) {
      const q = hubSearchTerm.toLowerCase();
      const matchSys = item.sysName.toLowerCase().includes(q) || item.sysCode.toLowerCase().includes(q);
      const matchInt = item.integration.name.toLowerCase().includes(q) || (item.integration.code && item.integration.code.toLowerCase().includes(q));
      if (!matchSys && !matchInt) return false;
    }
    return true;
  });

  // Helper to render the Link Entity Governance Modal
  const renderLinkEntityModal = () => {
    if (!linkingSystemKey) return null;
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}
        onClick={() => {
          setLinkingSystemKey(null);
          setLinkValidationError(null);
        }}
      >
        <div
          style={{
            background: '#0f172a',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderTop: '4px solid #0284c7',
            borderRadius: '8px',
            padding: '1.5rem',
            maxWidth: '540px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link2 size={18} style={{ color: '#38bdf8' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                {isRtl
                  ? `ربط وتكامل جهة مع [${systems[linkingSystemKey]?.name || linkingSystemKey}]`
                  : `Link Entity to [${systems[linkingSystemKey]?.name || linkingSystemKey}]`}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setLinkingSystemKey(null)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.2rem' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Validation Alert */}
          {linkValidationError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              padding: '0.65rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              lineHeight: '1.5',
              marginBottom: '1rem'
            }}>
              {linkValidationError}
            </div>
          )}

          {/* Link Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Field 1: Entity Selector */}
            <div>
              <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                {isRtl ? '1. اختر الجهة الشريكة (من دليل الجهات المسجلة)' : '1. Select Entity (From Registry)'} <span style={{ color: '#f87171' }}>*</span>
              </label>
              <select
                value={selectedEntityForLink}
                onChange={(e) => {
                  setSelectedEntityForLink(e.target.value);
                  setSelectedDocKeyForLink('');
                  setLinkValidationError(null);
                }}
                className="input"
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.82rem',
                  background: '#1e293b',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '5px'
                }}
              >
                <option value="">{isRtl ? '-- حدد الجهة من السجل --' : '-- Select Entity --'}</option>
                {availableSectorList.map(sec => {
                  const secKey = sec.key || sec.code.toLowerCase();
                  const isAlreadyLinked = !!systems[linkingSystemKey]?.integrations?.[secKey];
                  const localizedSecName = getLocalized({ ar: sec.name, en: sec.nameEn }, sec.name);

                  return (
                    <option key={secKey} value={secKey} disabled={isAlreadyLinked}>
                      {localizedSecName} ({sec.code}) {isAlreadyLinked ? (isRtl ? ' - [مرتبطة بالفعل]' : ' - [Already Linked]') : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Field 2: Role / Integration Direction */}
            <div>
              <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                {isRtl ? '2. طبيعة التكامل وعلاقة الجهة بهذا النظام' : '2. Integration Role'} <span style={{ color: '#f87171' }}>*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                {[
                  { val: 'INBOUND', labelAr: 'جهة مستهلكة (Consumer)', labelEn: 'Consumer (Inbound)' },
                  { val: 'OUTBOUND', labelAr: 'جهة مزوّدة (Provider)', labelEn: 'Provider (Outbound)' },
                  { val: 'BIDIRECTIONAL', labelAr: 'مزدوج (Bi-directional)', labelEn: 'Bi-directional' }
                ].map(dir => (
                  <button
                    key={dir.val}
                    type="button"
                    onClick={() => setSelectedDirectionForLink(dir.val as any)}
                    style={{
                      padding: '0.45rem 0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: selectedDirectionForLink === dir.val ? 700 : 500,
                      background: selectedDirectionForLink === dir.val ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      border: selectedDirectionForLink === dir.val ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: selectedDirectionForLink === dir.val ? '#ffffff' : '#94a3b8',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    {isRtl ? dir.labelAr : dir.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Field 3: Link Document with Strict Governance */}
            <div>
              <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                {isRtl ? '3. وثيقة الـ API المعتمدة (عقد التكامل)' : '3. Approved API Document Contract'}
              </label>

              {(() => {
                if (!selectedEntityForLink) {
                  return (
                    <div style={{ padding: '0.65rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px', fontSize: '0.75rem', color: '#64748b' }}>
                      {isRtl ? 'حدد الجهة أولاً لعرض وثائقها المعتمدة الصالحة للربط.' : 'Select entity first to load approved documents.'}
                    </div>
                  );
                }

                const govEngine = DocumentGovernanceEngine.getInstance();
                const allContainers = govEngine.getContainersMatrix(systems);

                const matchingApprovedDocs = allContainers.filter(c => {
                  const matchesEntity = c.integrationKey === selectedEntityForLink;
                  const isApproved = c.currentApprovedVersion && c.currentApprovedVersion.status === 'APPROVED';
                  const notAlreadyInThisSys = c.systemKey !== linkingSystemKey;
                  return matchesEntity && isApproved && notAlreadyInThisSys;
                });

                if (matchingApprovedDocs.length === 0) {
                  return (
                    <div style={{
                      padding: '0.75rem',
                      background: 'rgba(56, 189, 248, 0.05)',
                      border: '1px dashed rgba(56, 189, 248, 0.25)',
                      borderRadius: '6px',
                      fontSize: '0.76rem',
                      color: '#94a3b8',
                      lineHeight: '1.5'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#38bdf8', marginBottom: '0.2rem', fontWeight: 700 }}>
                        <ShieldCheck size={14} />
                        <span>{isRtl ? 'حوكمة العقود والتوثيق' : 'Contract Governance'}</span>
                      </div>
                      {isRtl
                        ? 'لا توجد وثائق خارجية معتمدة لهذه الجهة حالياً. يمكنك إتمام الربط وسيتم إنشاء حاوية توثيق مخصصة ومعتمدة لهذا المسار تلقائياً.'
                        : 'No external approved documents found for this entity. A dedicated approved contract container will be initialized.'}
                    </div>
                  );
                }

                return (
                  <select
                    value={selectedDocKeyForLink}
                    onChange={(e) => {
                      setSelectedDocKeyForLink(e.target.value);
                      setLinkValidationError(null);
                    }}
                    className="input"
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      fontSize: '0.82rem',
                      background: '#1e293b',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '5px'
                    }}
                  >
                    <option value="">{isRtl ? '-- اختيار وثيقة معتمدة متطابقة --' : '-- Select Approved Document --'}</option>
                    {matchingApprovedDocs.map(doc => (
                      <option key={doc.documentKey} value={doc.documentKey}>
                        {doc.systemName} - {doc.integrationName} ({doc.currentApprovedVersion?.versionNumber}) [معتمدة]
                      </option>
                    ))}
                  </select>
                );
              })()}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  setLinkingSystemKey(null);
                  setLinkValidationError(null);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#cbd5e1',
                  padding: '0.45rem 1.15rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmLinkEntity}
                disabled={!selectedEntityForLink}
                style={{
                  background: selectedEntityForLink ? '#0284c7' : 'rgba(255, 255, 255, 0.1)',
                  border: selectedEntityForLink ? '1px solid #38bdf8' : 'none',
                  color: selectedEntityForLink ? '#ffffff' : '#64748b',
                  padding: '0.45rem 1.4rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: selectedEntityForLink ? 'pointer' : 'not-allowed',
                  boxShadow: selectedEntityForLink ? '0 2px 6px rgba(2, 132, 199, 0.35)' : 'none'
                }}
              >
                {isRtl ? 'تأكيد وحفظ الربط' : 'Confirm & Save Link'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Helper to render the Unlink Entity Governance Confirmation Modal
  const renderUnlinkEntityModal = () => {
    if (!integrationPendingUnlink) return null;
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}
        onClick={() => setIntegrationPendingUnlink(null)}
      >
        <div
          style={{
            background: '#0f172a',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderTop: '4px solid #ef4444',
            borderRadius: '8px',
            padding: '1.5rem',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} style={{ color: '#f87171' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                {isRtl ? 'حوكمة فك ارتباط جهة عن النظام' : 'Unlink Entity Governance'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIntegrationPendingUnlink(null)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.2rem' }}
            >
              <X size={18} />
            </button>
          </div>

          <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.6', margin: '0 0 1rem 0' }}>
            {isRtl ? (
              <>
                هل أنت متأكد من رغبتك في إلغاء ربط جهة <strong style={{ color: '#38bdf8' }}>[{integrationPendingUnlink.entityName}]</strong> عن نظام <strong style={{ color: '#ffffff' }}>[{integrationPendingUnlink.systemName}]</strong>؟
              </>
            ) : (
              <>
                Are you sure you want to unlink <strong style={{ color: '#38bdf8' }}>[{integrationPendingUnlink.entityName}]</strong> from <strong style={{ color: '#ffffff' }}>[{integrationPendingUnlink.systemName}]</strong>?
              </>
            )}
          </p>

          {integrationPendingUnlink.endpointCount > 0 && (
            <div style={{
              padding: '0.75rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '6px',
              fontSize: '0.8rem',
              color: '#fca5a5',
              lineHeight: '1.5',
              marginBottom: '1.25rem'
            }}>
              {isRtl
                ? `تنبيه أثر: يحتوي هذا التكامل على (${integrationPendingUnlink.endpointCount}) مسار API نشط. فك الارتباط سيقوم بفصل هذه المسارات عن كتالوج النظام مع الحفاظ على سجل الحوكمة والتدقيق للوثائق المعتمدة.`
                : `Impact notice: This integration has (${integrationPendingUnlink.endpointCount}) active endpoints. Unlinking will detach them from this system catalog while preserving governance audit records.`}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.25rem' }}>
            <button
              type="button"
              onClick={() => setIntegrationPendingUnlink(null)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#cbd5e1',
                padding: '0.45rem 1.15rem',
                borderRadius: '4px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleConfirmUnlinkIntegration}
              style={{
                background: '#dc2626',
                border: '1px solid #ef4444',
                color: '#ffffff',
                padding: '0.45rem 1.4rem',
                borderRadius: '4px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.35)'
              }}
            >
              {isRtl ? 'تأكيد فك الارتباط' : 'Confirm Unlink'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // VIEW MODE 1: FULL SCREEN SYSTEM EDITOR
  // ==========================================
  if (screenMode === 'system-editor') {
    return (
      <div className="dashboard-container" style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>


        {/* Full-Page Form */}
        <form onSubmit={handleSaveSystem} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Section 1: Core System Identifiers */}
          <div style={{
            background: 'var(--bg-card, #0f172a)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: 700, margin: '0 0 1rem 0' }}>
              {isRtl ? '1. المعلومات الأساسية والتعريفية للنظام' : '1. Core System Information'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                  {isRtl ? 'اسم النظام بالعربية' : 'System Name (Arabic)'} <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.85rem' }}
                  placeholder={isRtl ? 'مثال: نظام التحصيل والدفع اللحظي' : 'e.g. Collection & Instant Payment'}
                  value={formNameAr}
                  onChange={(e) => setFormNameAr(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                  {isRtl ? 'اسم النظام بالإنجليزية' : 'System Name (English)'}
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.85rem', direction: 'ltr' }}
                  placeholder="e.g. Tahseel Payment Platform"
                  value={formNameEn}
                  onChange={(e) => setFormNameEn(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                  {isRtl ? 'كود النظام المرجعي (System Code)' : 'System Reference Code'} <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input mono"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.85rem', direction: 'ltr' }}
                  placeholder="SYS_TAHSEEL"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                  {isRtl ? 'الوصف التشغيلي للنظام' : 'Operational Description'}
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.85rem' }}
                  placeholder={isRtl ? 'وصف موجز للمهام والمسؤوليات...' : 'Brief summary of responsibilities...'}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>
            </div>
          </div>



          {/* Form Actions Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.85rem',
            paddingTop: '0.5rem'
          }}>
            <button
              type="button"
              onClick={() => setScreenMode('overview')}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: 'var(--text-dim, #94a3b8)',
                padding: '0.55rem 1.4rem',
                borderRadius: '4px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {isRtl ? 'إلغاء والعودة' : 'Cancel & Return'}
            </button>
            <button
              type="submit"
              style={{
                background: '#0284c7',
                border: 'none',
                color: '#ffffff',
                padding: '0.55rem 1.75rem',
                borderRadius: '4px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {isRtl ? 'حفظ بيانات النظام' : 'Save System'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ==========================================
  // VIEW MODE 2: FULL SCREEN SECTORS & ENTITIES HUB
  // ==========================================
  if (screenMode === 'sectors-hub') {
    return (
      <div className="dashboard-container" style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>


        {/* Confirmation & Feedback Alert */}
        {sectorAlertMessage && (
          <div style={{
            background: 'rgba(14, 165, 233, 0.15)',
            border: '1px solid #0284c7',
            color: '#38bdf8',
            padding: '0.75rem 1.25rem',
            borderRadius: '6px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem',
            fontWeight: 700
          }}>
            <span>{sectorAlertMessage.text}</span>
            <button
              type="button"
              onClick={() => setSectorAlertMessage(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.82rem'
              }}
            >
              {isRtl ? 'إغلاق' : 'Close'}
            </button>
          </div>
        )}

        {/* Sectors Hub Grid: Form on side, List on other side */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Form to Add/Edit a Sector */}
          <div style={{
            background: 'var(--bg-card, #0f172a)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '1.5rem',
            alignSelf: 'start'
          }}>
            <h3 style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 700, margin: '0 0 1rem 0' }}>
              {editingSectorKey
                ? (isRtl ? 'تعديل بيانات القطاع / الجهة' : 'Edit Sector Details')
                : (isRtl ? '+ إضافة قطاع أو جهة شريكة' : '+ Add New Sector/Entity')}
            </h3>

            <form onSubmit={handleSaveSector} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.76rem', color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  {isRtl ? 'اسم القطاع / الجهة بالعربية' : 'Sector/Entity Name (Arabic)'} <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%', padding: '0.5rem 0.7rem', fontSize: '0.82rem' }}
                  placeholder={isRtl ? 'مثال: البنوك والمصارف المركزية، مصلحة الجمارك' : 'e.g. Central Banks, Customs'}
                  value={secNameAr}
                  onChange={(e) => setSecNameAr(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  {isRtl ? 'اسم القطاع بالإنجليزية' : 'Sector/Entity Name (English)'}
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%', padding: '0.5rem 0.7rem', fontSize: '0.82rem', direction: 'ltr' }}
                  placeholder="e.g. Central Banks, Customs Authority"
                  value={secNameEn}
                  onChange={(e) => setSecNameEn(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  {isRtl ? 'رمز القطاع المرجعي (Sector Code)' : 'Sector Reference Code'} <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input mono"
                  style={{ width: '100%', padding: '0.5rem 0.7rem', fontSize: '0.82rem', direction: 'ltr' }}
                  placeholder="SEC_CUSTOMS"
                  value={secCode}
                  onChange={(e) => setSecCode(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    background: '#0284c7',
                    border: '1px solid #38bdf8',
                    color: '#ffffff',
                    padding: '0.55rem 1rem',
                    borderRadius: '5px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25)'
                  }}
                >
                  {editingSectorKey
                    ? (isRtl ? 'حفظ التعديل' : 'Update Sector')
                    : (isRtl ? 'تسجيل القطاع' : 'Save Sector')}
                </button>
                {editingSectorKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSectorKey(null);
                      setSecNameAr('');
                      setSecNameEn('');
                      setSecCode('SEC_');
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                      color: '#ffffff',
                      padding: '0.55rem 1rem',
                      borderRadius: '5px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* List of Registered Sectors / Entities */}
          <div style={{
            background: 'var(--bg-card, #0f172a)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 700, margin: '0 0 1rem 0' }}>
              {isRtl ? `القطاعات والجهات المسجلة (${availableSectorList.length})` : `Registered Sectors (${availableSectorList.length})`}
            </h3>

            {availableSectorList.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-dim, #94a3b8)' }}>
                {isRtl ? 'لم يتم إضافة أي قطاع بعد.' : 'No sectors registered.'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {availableSectorList.map(sec => {
                  const secKey = sec.key || sec.code.toLowerCase();
                  const localizedName = getLocalized({ ar: sec.name, en: sec.nameEn }, sec.name);

                  // Count how many systems link to this sector
                  const linkedSystemsCount = Object.values(systems).filter(sys => {
                    const keys = sys.associatedSectorKeys || Object.keys(sys.integrations || {});
                    return keys.includes(secKey);
                  }).length;

                  return (
                    <div
                      key={secKey}
                      style={{
                        padding: '0.85rem 1rem',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <strong style={{ fontSize: '0.92rem', color: '#ffffff', fontWeight: 700 }}>
                            {localizedName}
                          </strong>
                          <span style={{
                            fontSize: '0.65rem',
                            fontFamily: 'var(--font-mono)',
                            color: '#38bdf8',
                            background: 'rgba(56, 189, 248, 0.12)',
                            padding: '0.12rem 0.45rem',
                            borderRadius: '4px',
                            fontWeight: 700
                          }}>
                            {sec.code}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)', display: 'block', marginTop: '0.2rem' }}>
                          {isRtl ? `مرتبط بـ (${linkedSystemsCount}) نظام مركزي` : `Linked to (${linkedSystemsCount}) core systems`}
                        </span>
                      </div>

                      {/* Prominent High-Contrast Buttons - NO ICONS */}
                      <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleEditSector(sec)}
                          style={{
                            background: '#0284c7',
                            border: '1px solid #38bdf8',
                            color: '#ffffff',
                            padding: '0.35rem 0.9rem',
                            borderRadius: '5px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            minWidth: '55px',
                            textAlign: 'center',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25)'
                          }}
                        >
                          {isRtl ? 'تعديل' : 'Edit'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSectorPendingDelete({
                              key: secKey,
                              name: localizedName,
                              code: sec.code,
                              linkedCount: linkedSystemsCount
                            });
                          }}
                          style={{
                            background: '#dc2626',
                            border: '1px solid #f87171',
                            color: '#ffffff',
                            padding: '0.35rem 0.9rem',
                            borderRadius: '5px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            minWidth: '55px',
                            textAlign: 'center',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25)'
                          }}
                        >
                          {isRtl ? 'حذف' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Modal for Sector Save - NO ICONS */}
        {sectorPendingSave && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1rem'
            }}
            onClick={() => setSectorPendingSave(null)}
          >
            <div
              style={{
                background: '#0f172a',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderTop: '4px solid #0284c7',
                borderRadius: '8px',
                padding: '1.5rem',
                maxWidth: '460px',
                width: '100%',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.75rem 0' }}>
                {sectorPendingSave.isEdit
                  ? (isRtl ? 'تأكيد حفظ تعديلات القطاع' : 'Confirm Sector Update')
                  : (isRtl ? 'تأكيد تسجيل القطاع' : 'Confirm Sector Registration')}
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.6', margin: '0 0 1.25rem 0' }}>
                {isRtl
                  ? `هل أنت متأكد من رغبتك في حفظ بيانات القطاع [${sectorPendingSave.name}] بالرمز (${sectorPendingSave.code})؟`
                  : `Are you sure you want to save sector [${sectorPendingSave.name}] with code (${sectorPendingSave.code})?`}
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setSectorPendingSave(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    color: '#e2e8f0',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '5px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSaveSector}
                  style={{
                    background: '#0284c7',
                    border: '1px solid #38bdf8',
                    color: '#ffffff',
                    padding: '0.5rem 1.5rem',
                    borderRadius: '5px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25)'
                  }}
                >
                  {isRtl ? 'تأكيد الحفظ' : 'Confirm Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal for Sector Deletion - NO ICONS */}
        {sectorPendingDelete && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1rem'
            }}
            onClick={() => setSectorPendingDelete(null)}
          >
            <div
              style={{
                background: '#0f172a',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderTop: '4px solid #dc2626',
                borderRadius: '8px',
                padding: '1.5rem',
                maxWidth: '460px',
                width: '100%',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: sectorPendingDelete.linkedCount > 0 ? '#f59e0b' : '#f87171', margin: '0 0 0.75rem 0' }}>
                {sectorPendingDelete.linkedCount > 0
                  ? (isRtl ? 'حظر الحوكمة والنزاهة المرجعية' : 'Governance Referential Block')
                  : (isRtl ? 'تأكيد حذف القطاع / الجهة' : 'Confirm Sector Deletion')}
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.6', margin: '0 0 1rem 0' }}>
                {sectorPendingDelete.linkedCount > 0
                  ? (isRtl
                    ? `لا يمكن إتمام عملية الحذف لجهة [${sectorPendingDelete.name}] لأنها مرتبطة حالياً بـ (${sectorPendingDelete.linkedCount}) أنظمة نشطة في المنظومة.`
                    : `Cannot delete entity [${sectorPendingDelete.name}] because it is currently linked to (${sectorPendingDelete.linkedCount}) active systems.`)
                  : (isRtl
                    ? `هل أنت متأكد من رغبتك في حذف قطاع [${sectorPendingDelete.name}] نهائياً من المنظومة؟`
                    : `Are you sure you want to permanently delete sector [${sectorPendingDelete.name}]?`)}
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setSectorPendingDelete(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    color: '#e2e8f0',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '5px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {sectorPendingDelete.linkedCount > 0 ? (isRtl ? 'حسناً، فهمت' : 'Understood') : (isRtl ? 'إلغاء' : 'Cancel')}
                </button>
                {sectorPendingDelete.linkedCount === 0 && (
                  <button
                    type="button"
                    onClick={handleConfirmDeleteSector}
                    style={{
                      background: '#dc2626',
                      border: '1px solid #f87171',
                      color: '#ffffff',
                      padding: '0.5rem 1.5rem',
                      borderRadius: '5px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25)'
                    }}
                  >
                    {isRtl ? 'تأكيد الحذف' : 'Confirm Delete'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW MODE 3: FULL SCREEN SYSTEMS HUB (Decoupled Systems Management)
  // ==========================================
  if (screenMode === 'systems-hub') {
    return (
      <div className="dashboard-container" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Confirmation & Feedback Alert */}
        {systemAlertMessage && (
          <div style={{
            background: 'rgba(14, 165, 233, 0.15)',
            border: '1px solid #0284c7',
            color: '#38bdf8',
            padding: '0.75rem 1.25rem',
            borderRadius: '6px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem',
            fontWeight: 700
          }}>
            <span>{systemAlertMessage.text}</span>
            <button
              type="button"
              onClick={() => setSystemAlertMessage(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.82rem'
              }}
            >
              {isRtl ? 'إغلاق' : 'Close'}
            </button>
          </div>
        )}

        {/* Two-Column Grid: Form on side, Systems List on other side */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {/* Form to Add/Edit System */}
          <div style={{
            background: 'var(--bg-card, #0f172a)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '1.5rem',
            alignSelf: 'start'
          }}>
            <h3 style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 700, margin: '0 0 1rem 0' }}>
              {editingSystemKey
                ? (isRtl ? 'تعديل بيانات النظام' : 'Edit System Details')
                : (isRtl ? '+ إضافة نظام جديد' : '+ Add New System')}
            </h3>

            <form onSubmit={handleSaveSystem} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.76rem', color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  {isRtl ? 'اسم النظام بالعربية' : 'System Name (Arabic)'} <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%', padding: '0.5rem 0.7rem', fontSize: '0.82rem' }}
                  placeholder={isRtl ? 'مثال: نظام التحصيل والدفع اللحظي' : 'e.g. Instant Payment System'}
                  value={formNameAr}
                  onChange={(e) => setFormNameAr(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  {isRtl ? 'اسم النظام بالإنجليزية' : 'System Name (English)'}
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%', padding: '0.5rem 0.7rem', fontSize: '0.82rem', direction: 'ltr' }}
                  placeholder="e.g. Instant Payment Platform"
                  value={formNameEn}
                  onChange={(e) => setFormNameEn(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  {isRtl ? 'كود النظام المرجعي (System Code)' : 'System Reference Code'} <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input mono"
                  style={{ width: '100%', padding: '0.5rem 0.7rem', fontSize: '0.82rem', direction: 'ltr' }}
                  placeholder="SYS_PAYMENT"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', color: 'var(--text-dim, #94a3b8)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  {isRtl ? 'الوصف التشغيلي للنظام' : 'Operational Description'}
                </label>
                <textarea
                  className="input"
                  style={{ width: '100%', padding: '0.5rem 0.7rem', fontSize: '0.82rem', minHeight: '75px', resize: 'vertical' }}
                  placeholder={isRtl ? 'وصف موجز للمهام والمسؤوليات...' : 'Brief summary of duties...'}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    background: '#0284c7',
                    border: '1px solid #38bdf8',
                    color: '#ffffff',
                    padding: '0.55rem 1rem',
                    borderRadius: '5px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25)'
                  }}
                >
                  {editingSystemKey
                    ? (isRtl ? 'حفظ التعديل' : 'Update System')
                    : (isRtl ? 'تسجيل النظام' : 'Save System')}
                </button>
                {editingSystemKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSystemKey(null);
                      setFormNameAr('');
                      setFormNameEn('');
                      setFormCode('SYS_');
                      setFormDescription('');
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                      color: '#ffffff',
                      padding: '0.55rem 1rem',
                      borderRadius: '5px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* List of Registered Systems (Exact Same Cards as Dashboard + Edit & Delete) */}
          <div style={{
            background: 'var(--bg-card, #0f172a)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 700, margin: '0 0 1rem 0' }}>
              {isRtl ? `الأنظمة المسجلة (${systemEntries.length})` : `Registered Systems (${systemEntries.length})`}
            </h3>

            {systemEntries.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-dim, #94a3b8)' }}>
                {isRtl ? 'لم يتم إضافة أي نظام بعد.' : 'No systems registered.'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {systemEntries.map(([sysKey, sys]) => {
                  const localizedName = getLocalized({ ar: sys.name, en: sys.nameEn }, sys.name);
                  const rawIntegrations = sys.integrations ? Object.entries(sys.integrations) : [];
                  const consumerIntegrations = rawIntegrations.filter(([intKey, intItem]) => {
                    if (intItem.direction === 'INBOUND') return true;
                    if (intItem.direction === 'OUTBOUND') return false;
                    return intKey === 'merchants' || intKey === 'erp';
                  });
                  const providerIntegrations = rawIntegrations.filter(([intKey, intItem]) => {
                    if (intItem.direction === 'OUTBOUND') return true;
                    if (intItem.direction === 'INBOUND') return false;
                    return intKey !== 'merchants' && intKey !== 'erp';
                  });
                  const isConsumersOpen = !collapsedSections[`hub-${sysKey}-consumers`];
                  const isProvidersOpen = !collapsedSections[`hub-${sysKey}-providers`];

                  return (
                    <div
                      key={sysKey}
                      className="sector-card"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start',
                        minHeight: 'auto',
                        margin: 0,
                        background: editingSystemKey === sysKey ? 'rgba(56, 189, 248, 0.08)' : undefined,
                        borderColor: editingSystemKey === sysKey ? '#38bdf8' : undefined
                      }}
                    >
                      {/* Card Top: Typography + Code + Edit & Delete Buttons */}
                      <div className="sector-card-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '1rem', color: 'var(--text-main, #ffffff)', fontWeight: 800 }}>
                            {localizedName}
                          </strong>
                          <span style={{
                            fontSize: '0.62rem',
                            fontFamily: 'var(--font-mono)',
                            background: 'rgba(56, 189, 248, 0.12)',
                            color: '#38bdf8',
                            padding: '0.12rem 0.45rem',
                            borderRadius: '4px',
                            fontWeight: 700
                          }}>
                            {sys.code}
                          </span>
                        </div>

                        {/* Action Buttons on this card: Edit, Delete */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSystemKey(sysKey);
                              setFormNameAr(sys.name || '');
                              setFormNameEn(sys.nameEn || '');
                              setFormCode(sys.code || `SYS_${sysKey.toUpperCase()}`);
                              setFormDescription(sys.description || '');
                            }}
                            style={{
                              background: 'rgba(56, 189, 248, 0.1)',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              color: '#38bdf8',
                              padding: '0.22rem 0.65rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {isRtl ? 'تعديل' : 'Edit'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteSystemModal(sysKey, sys)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#f87171',
                              padding: '0.22rem 0.65rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {isRtl ? 'حذف' : 'Delete'}
                          </button>
                        </div>
                      </div>

                      {/* Integrations Section: EXACTLY matching Dashboard */}
                      {rawIntegrations.length > 0 ? (
                        <div style={{
                          marginTop: '0.65rem',
                          padding: '0.55rem 0.75rem',
                          background: 'rgba(0, 0, 0, 0.18)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.55rem'
                        }}>
                          {/* Consumers */}
                          {consumerIntegrations.length > 0 && (
                            <div>
                              <button
                                type="button"
                                onClick={() => toggleSection(`hub-${sysKey}-consumers`)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  width: '100%',
                                  background: 'transparent',
                                  border: 'none',
                                  padding: '0.1rem 0',
                                  cursor: 'pointer',
                                  color: '#cbd5e1',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  fontFamily: 'inherit'
                                }}
                              >
                                <span style={{ color: '#cbd5e1' }}>
                                  {isRtl ? 'جهات مستهلكة' : 'Consumers'}
                                </span>
                                <ChevronDown
                                  size={13}
                                  style={{
                                    transition: 'transform 0.2s ease',
                                    transform: isConsumersOpen ? 'rotate(0deg)' : (isRtl ? 'rotate(90deg)' : 'rotate(-90deg)'),
                                    color: 'var(--text-dim, #94a3b8)'
                                  }}
                                />
                              </button>

                              {isConsumersOpen && (
                                <div style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '0.35rem',
                                  marginTop: '0.35rem',
                                  paddingInlineStart: '0.75rem'
                                }}>
                                  {consumerIntegrations.map(([intKey, integration]) => {
                                    const intName = getLocalized({ ar: integration.name, en: integration.nameEn }, integration.name);
                                    const epCount = integration.endpoints?.length || 0;
                                    return (
                                      <div
                                        key={intKey}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          background: 'rgba(255, 255, 255, 0.05)',
                                          border: '1px solid rgba(255, 255, 255, 0.12)',
                                          borderRadius: '4px',
                                          overflow: 'hidden'
                                        }}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => onSelectSystemIntegration(sysKey, intKey)}
                                          style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#e2e8f0',
                                            padding: '0.2rem 0.55rem',
                                            fontSize: '0.74rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.35rem'
                                          }}
                                          title={isRtl ? `استعراض تكامل ${intName}` : `Explore ${intName} integration`}
                                        >
                                          <span>{intName}</span>
                                          {epCount > 0 && (
                                            <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>({epCount})</span>
                                          )}
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Providers */}
                          {providerIntegrations.length > 0 && (
                            <div style={{
                              borderTop: consumerIntegrations.length > 0 ? '1px solid rgba(255, 255, 255, 0.04)' : 'none',
                              paddingTop: consumerIntegrations.length > 0 ? '0.45rem' : '0'
                            }}>
                              <button
                                type="button"
                                onClick={() => toggleSection(`hub-${sysKey}-providers`)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  width: '100%',
                                  background: 'transparent',
                                  border: 'none',
                                  padding: '0.1rem 0',
                                  cursor: 'pointer',
                                  color: '#cbd5e1',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  fontFamily: 'inherit'
                                }}
                              >
                                <span style={{ color: '#cbd5e1' }}>
                                  {isRtl ? 'جهات مزوّدة' : 'Providers'}
                                </span>
                                <ChevronDown
                                  size={13}
                                  style={{
                                    transition: 'transform 0.2s ease',
                                    transform: isProvidersOpen ? 'rotate(0deg)' : (isRtl ? 'rotate(90deg)' : 'rotate(-90deg)'),
                                    color: 'var(--text-dim, #94a3b8)'
                                  }}
                                />
                              </button>

                              {isProvidersOpen && (
                                <div style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '0.35rem',
                                  marginTop: '0.35rem',
                                  paddingInlineStart: '0.75rem'
                                }}>
                                  {providerIntegrations.map(([intKey, integration]) => {
                                    const intName = getLocalized({ ar: integration.name, en: integration.nameEn }, integration.name);
                                    const epCount = integration.endpoints?.length || 0;
                                    return (
                                      <div
                                        key={intKey}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          background: 'rgba(255, 255, 255, 0.05)',
                                          border: '1px solid rgba(255, 255, 255, 0.12)',
                                          borderRadius: '4px',
                                          overflow: 'hidden'
                                        }}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => onSelectSystemIntegration(sysKey, intKey)}
                                          style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#e2e8f0',
                                            padding: '0.2rem 0.55rem',
                                            fontSize: '0.74rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.35rem'
                                          }}
                                          title={isRtl ? `استعراض تكامل ${intName}` : `Explore ${intName} integration`}
                                        >
                                          <span>{intName}</span>
                                          {epCount > 0 && (
                                            <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>({epCount})</span>
                                          )}
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)', fontStyle: 'italic' }}>
                          {isRtl ? '(نظام مجرد - لا توجد جهات مرتبطة بعد)' : '(Abstract System - No integrated entities yet)'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Strict Governance Modal for System Deletion */}
        {systemPendingDelete && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1rem'
            }}
            onClick={() => setSystemPendingDelete(null)}
          >
            <div
              style={{
                background: '#0f172a',
                border: systemPendingDelete.linkedCount > 0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(248, 113, 113, 0.3)',
                borderRadius: '8px',
                padding: '1.75rem',
                maxWidth: '460px',
                width: '100%',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: systemPendingDelete.linkedCount > 0 ? '#f59e0b' : '#f87171', margin: '0 0 0.75rem 0' }}>
                {systemPendingDelete.linkedCount > 0
                  ? (isRtl ? 'حظر الحوكمة والنزاهة المرجعية' : 'Governance Referential Block')
                  : (isRtl ? 'تأكيد حذف النظام' : 'Confirm System Deletion')}
              </h3>

              <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.6', margin: '0 0 1rem 0' }}>
                {systemPendingDelete.linkedCount > 0
                  ? (isRtl
                    ? `لا يمكن إتمام عملية الحذف لنظام [${systemPendingDelete.name}] لأنه مرتبط حالياً بـ (${systemPendingDelete.linkedCount}) جهات/تكاملات نشطة في المنظومة.`
                    : `Cannot delete system [${systemPendingDelete.name}] because it is currently integrated with (${systemPendingDelete.linkedCount}) active entities.`)
                  : (isRtl
                    ? `هل أنت متأكد من رغبتك في حذف نظام [${systemPendingDelete.name}] نهائياً من المنظومة؟`
                    : `Are you sure you want to permanently delete system [${systemPendingDelete.name}]?`)}
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setSystemPendingDelete(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    color: '#e2e8f0',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '5px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {systemPendingDelete.linkedCount > 0 ? (isRtl ? 'حسناً، فهمت' : 'Understood') : (isRtl ? 'إلغاء' : 'Cancel')}
                </button>

                {systemPendingDelete.linkedCount === 0 && (
                  <button
                    type="button"
                    onClick={handleConfirmDeleteSystem}
                    style={{
                      background: '#dc2626',
                      border: '1px solid #f87171',
                      color: '#ffffff',
                      padding: '0.5rem 1.5rem',
                      borderRadius: '5px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25)'
                    }}
                  >
                    {isRtl ? 'تأكيد الحذف' : 'Confirm Delete'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Governance Modals for Systems Management */}
        {renderLinkEntityModal()}
        {renderUnlinkEntityModal()}
      </div>
    );
  }

  // Computed statistics for the compact header strip
  const consumerEntityKeys = new Set<string>();
  const providerEntityKeys = new Set<string>();

  systemEntries.forEach(([, s]) => {
    Object.entries(s.integrations || {}).forEach(([intKey, intItem]) => {
      const isConsumer = intItem.direction === 'INBOUND' || (intItem.direction !== 'OUTBOUND' && (intKey === 'merchants' || intKey === 'erp'));
      const isProvider = intItem.direction === 'OUTBOUND' || (intItem.direction !== 'INBOUND' && intKey !== 'merchants' && intKey !== 'erp');

      const entityId = intItem.entityId || intKey;
      if (isConsumer) consumerEntityKeys.add(entityId);
      if (isProvider) providerEntityKeys.add(entityId);
    });
  });

  const consumerEntitiesCount = consumerEntityKeys.size;
  const providerEntitiesCount = providerEntityKeys.size;
  const totalEndpointsCount = systemEntries.reduce((acc, [, s]) => {
    const totalInSys = Object.values(s.integrations || {}).reduce(
      (sAcc, intItem) => sAcc + (intItem.endpoints ? intItem.endpoints.length : 0), 0
    );
    return acc + totalInSys;
  }, 0);

  // ==========================================
  // VIEW MODE 4: FULL SCREEN INTEGRATIONS & LINKING HUB
  // ==========================================
  if (screenMode === 'integrations-hub') {
    return (
      <div className="dashboard-container" style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
        {/* Confirmation & Feedback Alert */}
        {systemAlertMessage && (
          <div style={{
            background: 'rgba(14, 165, 233, 0.15)',
            border: '1px solid #0284c7',
            color: '#38bdf8',
            padding: '0.75rem 1.25rem',
            borderRadius: '6px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem',
            fontWeight: 700
          }}>
            <span>{systemAlertMessage.text}</span>
            <button
              type="button"
              onClick={() => setSystemAlertMessage(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.82rem'
              }}
            >
              {isRtl ? 'إغلاق' : 'Close'}
            </button>
          </div>
        )}

        {/* Two-Column Grid: Form on Side, Active Integrations Matrix on other */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          {/* Column 1: New Integration Form */}
          <div style={{
            background: 'var(--bg-card, #0f172a)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 700, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link2 size={16} style={{ color: '#38bdf8' }} />
              <span>{isRtl ? '+ إنشاء ربط وتكامل جديد' : '+ Create New Integration'}</span>
            </h3>

            {hubValidationError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                padding: '0.65rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                lineHeight: '1.5',
                marginBottom: '1rem'
              }}>
                {hubValidationError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {/* Field 1: Target System */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  {isRtl ? '1. اختر النظام المستهدف للربط' : '1. Target System'} <span style={{ color: '#f87171' }}>*</span>
                </label>
                <select
                  value={hubSelectedSysKey}
                  onChange={(e) => {
                    setHubSelectedSysKey(e.target.value);
                    setHubValidationError(null);
                  }}
                  className="input"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.82rem', background: '#1e293b', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '5px' }}
                >
                  <option value="">{isRtl ? '-- حدد النظام المستهدف --' : '-- Select System --'}</option>
                  {systemEntries.map(([sKey, sMod]) => (
                    <option key={sKey} value={sKey}>
                      {sMod.name} ({sMod.code || sKey})
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 2: Target Entity */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  {isRtl ? '2. اختر الجهة الشريكة' : '2. Partner Entity'} <span style={{ color: '#f87171' }}>*</span>
                </label>
                <select
                  value={hubSelectedEntityKey}
                  onChange={(e) => {
                    setHubSelectedEntityKey(e.target.value);
                    setHubValidationError(null);
                  }}
                  className="input"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.82rem', background: '#1e293b', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '5px' }}
                >
                  <option value="">{isRtl ? '-- اختيار الجهة من السجل المعتمد --' : '-- Select Registered Entity --'}</option>
                  {availableSectorList.map(sec => {
                    const secName = getLocalized({ ar: sec.name, en: sec.nameEn }, sec.name);
                    const isAlreadyLinked = hubSelectedSysKey ? !!systems[hubSelectedSysKey]?.integrations?.[sec.key] : false;
                    return (
                      <option key={sec.key} value={sec.key} disabled={isAlreadyLinked}>
                        {secName} ({sec.code || sec.key}) {isAlreadyLinked ? (isRtl ? '[مرتبطة مسبقاً]' : '[Already Linked]') : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Field 3: Direction */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  {isRtl ? '3. اتجاه وطبيعة التكامل' : '3. Integration Direction'} <span style={{ color: '#f87171' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setHubDirection('INBOUND')}
                    style={{
                      padding: '0.55rem 0.75rem',
                      borderRadius: '5px',
                      border: hubDirection === 'INBOUND' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: hubDirection === 'INBOUND' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: hubDirection === 'INBOUND' ? '#38bdf8' : '#94a3b8',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    {isRtl ? 'جهة مستهلكة (Consumer)' : 'Consumer (Inbound)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHubDirection('OUTBOUND')}
                    style={{
                      padding: '0.55rem 0.75rem',
                      borderRadius: '5px',
                      border: hubDirection === 'OUTBOUND' ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: hubDirection === 'OUTBOUND' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: hubDirection === 'OUTBOUND' ? '#c084fc' : '#94a3b8',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    {isRtl ? 'جهة مزوّدة (Provider)' : 'Provider (Outbound)'}
                  </button>
                </div>
              </div>

              {/* Field 4: Approved Document / Contract */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  {isRtl ? '4. توثيق العقد والاتفاقية المعتمدة' : '4. Contract & Approved Document'}
                </label>
                {(() => {
                  if (!hubSelectedEntityKey) {
                    return (
                      <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, fontStyle: 'italic' }}>
                        {isRtl ? 'اختر الجهة أولاً لعرض وثائقها المعتمدة المتوفرة.' : 'Select an entity first to view matching approved documents.'}
                      </p>
                    );
                  }

                  const govEngine = DocumentGovernanceEngine.getInstance();
                  const allContainers = govEngine.getContainersMatrix(systems);
                  const matchingApprovedDocs = allContainers.filter(c => {
                    const matchesEntity = c.integrationKey === hubSelectedEntityKey;
                    const isApproved = c.currentApprovedVersion && c.currentApprovedVersion.status === 'APPROVED';
                    const notAlreadyInThisSys = hubSelectedSysKey ? c.systemKey !== hubSelectedSysKey : true;
                    return matchesEntity && isApproved && notAlreadyInThisSys;
                  });

                  if (matchingApprovedDocs.length === 0) {
                    return (
                      <div style={{
                        padding: '0.65rem',
                        background: 'rgba(56, 189, 248, 0.05)',
                        border: '1px dashed rgba(56, 189, 248, 0.25)',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        color: '#94a3b8',
                        lineHeight: '1.5'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#38bdf8', marginBottom: '0.2rem', fontWeight: 700 }}>
                          <ShieldCheck size={13} />
                          <span>{isRtl ? 'حوكمة العقود والتوثيق' : 'Contract Governance'}</span>
                        </div>
                        {isRtl
                          ? 'لا توجد وثائق خارجية معتمدة لهذه الجهة حالياً. يمكنك إتمام الربط وسيتم إنشاء حاوية توثيق مخصصة ومعتمدة تلقائياً.'
                          : 'No external approved documents found for this entity. A dedicated approved contract container will be initialized.'}
                      </div>
                    );
                  }

                  return (
                    <select
                      value={hubSelectedDocKey}
                      onChange={(e) => {
                        setHubSelectedDocKey(e.target.value);
                        setHubValidationError(null);
                      }}
                      className="input"
                      style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.82rem', background: '#1e293b', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '5px' }}
                    >
                      <option value="">{isRtl ? '-- اختيار وثيقة معتمدة متطابقة --' : '-- Select Approved Document --'}</option>
                      {matchingApprovedDocs.map(doc => (
                        <option key={doc.documentKey} value={doc.documentKey}>
                          {doc.systemName} - {doc.integrationName} ({doc.currentApprovedVersion?.versionNumber}) [معتمدة]
                        </option>
                      ))}
                    </select>
                  );
                })()}
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleHubConfirmLinkEntity}
                disabled={!hubSelectedSysKey || !hubSelectedEntityKey}
                style={{
                  background: (hubSelectedSysKey && hubSelectedEntityKey) ? 'var(--primary, #6366f1)' : 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: (hubSelectedSysKey && hubSelectedEntityKey) ? '#ffffff' : '#64748b',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '5px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: (hubSelectedSysKey && hubSelectedEntityKey) ? 'pointer' : 'not-allowed',
                  marginTop: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  boxShadow: (hubSelectedSysKey && hubSelectedEntityKey) ? '0 2px 10px rgba(99, 102, 241, 0.35)' : 'none'
                }}
              >
                <Check size={16} />
                <span>{isRtl ? 'تأكيد وإتمام الربط المعماري' : 'Confirm & Complete Binding'}</span>
              </button>
            </div>
          </div>

          {/* Column 2: Active Integrations Matrix */}
          <div style={{
            background: 'var(--bg-card, #0f172a)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1rem', color: '#ffffff', fontWeight: 700, margin: 0 }}>
                {isRtl
                  ? `مصفوفة التكاملات النشطة (${filteredActiveIntegrations.length})`
                  : `Active Integrations Matrix (${filteredActiveIntegrations.length})`}
              </h3>

              {/* Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <select
                  value={hubFilterSys}
                  onChange={(e) => setHubFilterSys(e.target.value)}
                  style={{
                    background: '#1e293b',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '4px',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem'
                  }}
                >
                  <option value="all">{isRtl ? 'كافة الأنظمة' : 'All Systems'}</option>
                  {systemEntries.map(([sKey, sMod]) => (
                    <option key={sKey} value={sKey}>{sMod.name}</option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder={isRtl ? 'بحث في الارتباطات...' : 'Search links...'}
                  value={hubSearchTerm}
                  onChange={(e) => setHubSearchTerm(e.target.value)}
                  style={{
                    background: '#1e293b',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '4px',
                    padding: '0.25rem 0.55rem',
                    fontSize: '0.75rem',
                    width: '130px'
                  }}
                />
              </div>
            </div>

            {filteredActiveIntegrations.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                {isRtl ? 'لا توجد ارتباطات تطابق الفلتر المحدد.' : 'No active integrations match your filter.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {filteredActiveIntegrations.map(({ sysKey, sysName, sysCode, intKey, integration }) => {
                  const intName = getLocalized({ ar: integration.name, en: integration.nameEn }, integration.name);
                  const isConsumer = integration.direction === 'INBOUND' || intKey === 'merchants' || intKey === 'erp';
                  const epCount = integration.endpoints?.length || 0;

                  return (
                    <div
                      key={`${sysKey}-${intKey}`}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '6px',
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        {/* System Tag */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffffff' }}>
                            {sysName}
                          </span>
                          <span style={{
                            fontSize: '0.62rem',
                            fontFamily: 'var(--font-mono)',
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: '#94a3b8',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '3px'
                          }}>
                            {sysCode}
                          </span>
                        </div>

                        <span style={{ color: '#475569' }}>⟷</span>

                        {/* Entity Tag */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>
                            {intName}
                          </span>
                          <span style={{
                            fontSize: '0.62rem',
                            fontFamily: 'var(--font-mono)',
                            background: isConsumer ? 'rgba(56, 189, 248, 0.12)' : 'rgba(168, 85, 247, 0.12)',
                            color: isConsumer ? '#38bdf8' : '#c084fc',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '3px',
                            fontWeight: 700
                          }}>
                            {isConsumer ? (isRtl ? 'مستهلكة' : 'Consumer') : (isRtl ? 'مزوّدة' : 'Provider')}
                          </span>
                        </div>

                        {/* Endpoints Badge */}
                        <span style={{
                          fontSize: '0.68rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: '#cbd5e1',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '3px'
                        }}>
                          {epCount} {isRtl ? 'مسار' : 'APIs'}
                        </span>

                        {integration.docVersion && (
                          <span style={{
                            fontSize: '0.62rem',
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: '#34d399',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '3px',
                            fontWeight: 700
                          }}>
                            {integration.docVersion}
                          </span>
                        )}
                      </div>

                      {/* Actions: View Spec + Unlink Button */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <button
                          type="button"
                          onClick={() => onSelectSystemIntegration(sysKey, intKey)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: '#cbd5e1',
                            padding: '0.25rem 0.55rem',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {isRtl ? 'عرض التوثيق' : 'View Spec'}
                        </button>

                        <Can perform="catalog:system:delete">
                          <button
                            type="button"
                            onClick={() => {
                              setIntegrationPendingUnlink({
                                systemKey: sysKey,
                                entityId: intKey,
                                entityName: intName,
                                systemName: sysName,
                                endpointCount: epCount
                              });
                            }}
                            title={isRtl ? `إلغاء ربط جهة ${intName}` : `Unlink ${intName}`}
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              color: '#f87171',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            <Trash2 size={12} />
                            <span>{isRtl ? 'إلغاء الربط' : 'Unlink'}</span>
                          </button>
                        </Can>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Global Modals for Governance */}
        {renderUnlinkEntityModal()}
      </div>
    );
  }

  // ==========================================
  // VIEW MODE 5: DEFAULT OVERVIEW (NO ICONS ON SYSTEMS)
  // ==========================================
  return (
    <div className="dashboard-container">
      {/* Unified Sovereign Bar: Stats Strip + Action Buttons in ONE Single Line */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.45rem',
        marginBottom: '0.65rem'
      }}>
        {/* Compact Stats Pills */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          flexWrap: 'wrap'
        }}>
          {/* Total Systems */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            padding: '0.25rem 0.55rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            height: '30px'
          }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              {isRtl ? 'الأنظمة:' : 'Systems:'}
            </span>
            <strong style={{ fontSize: '0.88rem', color: 'var(--text-main, #ffffff)', fontWeight: 800 }}>
              {systemEntries.length}
            </strong>
          </div>

          {/* Configured Sectors */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            padding: '0.25rem 0.55rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            height: '30px'
          }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              {isRtl ? 'القطاعات:' : 'Sectors:'}
            </span>
            <strong style={{ fontSize: '0.88rem', color: 'var(--text-main, #ffffff)', fontWeight: 800 }}>
              {availableSectorList.length}
            </strong>
          </div>

          {/* Consumer Entities */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            padding: '0.25rem 0.55rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            height: '30px'
          }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              {isRtl ? 'جهات مستهلكة:' : 'Consumers:'}
            </span>
            <strong style={{ fontSize: '0.88rem', color: '#38bdf8', fontWeight: 800 }}>
              {consumerEntitiesCount}
            </strong>
          </div>

          {/* Provider Entities */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            padding: '0.25rem 0.55rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            height: '30px'
          }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              {isRtl ? 'جهات مزوّدة:' : 'Providers:'}
            </span>
            <strong style={{ fontSize: '0.88rem', color: '#a855f7', fontWeight: 800 }}>
              {providerEntitiesCount}
            </strong>
          </div>

          {/* Total Endpoints */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            padding: '0.25rem 0.55rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            height: '30px'
          }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              {isRtl ? 'مسارات الـ API:' : 'APIs:'}
            </span>
            <strong style={{ fontSize: '0.88rem', color: 'var(--text-main, #ffffff)', fontWeight: 800 }}>
              {totalEndpointsCount}
            </strong>
          </div>
        </div>

        {/* Global Action Bar */}
        {!isReadOnlyOverview && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            {/* Manage Sectors Button */}
            <Can perform="catalog:system:create">
              <button
                type="button"
                onClick={() => setScreenMode('sectors-hub')}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  height: '30px'
                }}
              >
                <Building2 size={13} style={{ color: '#38bdf8' }} />
                <span>{isRtl ? 'إدارة القطاعات والجهات' : 'Manage Sectors'}</span>
              </button>
            </Can>

            {/* Manage Core Systems Hub */}
            <Can perform="catalog:system:create">
              <button
                type="button"
                onClick={() => {
                  setEditingSystemKey(null);
                  setFormNameAr('');
                  setFormNameEn('');
                  setFormCode('SYS_');
                  setFormDescription('');
                  setScreenMode('systems-hub');
                }}
                style={{
                  background: 'var(--primary, #6366f1)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  height: '30px',
                  boxShadow: '0 2px 8px var(--primary-glow, rgba(99, 102, 241, 0.35))'
                }}
              >
                <span>{isRtl ? 'إدارة الأنظمة' : 'Manage Systems'}</span>
              </button>
            </Can>
          </div>
        )}
      </div>

      {/* Systems Grid (NO ICONS ON SYSTEMS - PURE TYPOGRAPHY & CLEAN BADGES) */}
      <div className="sectors-grid">
        {systemEntries.map(([sysKey, sys]) => {
          const localizedName = getLocalized({ ar: sys.name, en: sys.nameEn }, sys.name);
          const rawIntegrations = sys.integrations ? Object.entries(sys.integrations) : [];

          const integrationsList = rawIntegrations.filter(([intKey, intItem]) => {
            return canAccess('dashboard:read', {
              entityId: intItem.entityId || intKey,
              systemId: sysKey
            }) || canAccess('catalog:read', {
              entityId: intItem.entityId || intKey,
              systemId: sysKey
            }) || canAccess('catalog:view', {
              entityId: intItem.entityId || intKey,
              systemId: sysKey
            });
          });

          const consumerIntegrations = integrationsList.filter(([intKey, intItem]) => {
            if (intItem.direction === 'INBOUND') return true;
            if (intItem.direction === 'OUTBOUND') return false;
            return intKey === 'merchants' || intKey === 'erp';
          });

          const providerIntegrations = integrationsList.filter(([intKey, intItem]) => {
            if (intItem.direction === 'OUTBOUND') return true;
            if (intItem.direction === 'INBOUND') return false;
            return intKey !== 'merchants' && intKey !== 'erp';
          });

          const isConsumersOpen = !collapsedSections[`${sysKey}-consumers`];
          const isProvidersOpen = !collapsedSections[`${sysKey}-providers`];

          return (
            <div key={sysKey} className="sector-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', minHeight: 'auto' }}>
              {/* Card Top: NO ICON BOX! Pure Typography + Code */}
              <div className="sector-card-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '1.05rem', color: 'var(--text-main, #ffffff)', fontWeight: 800 }}>
                    {localizedName}
                  </strong>
                  <span style={{
                    fontSize: '0.62rem',
                    fontFamily: 'var(--font-mono)',
                    background: 'rgba(56, 189, 248, 0.12)',
                    color: '#38bdf8',
                    padding: '0.12rem 0.45rem',
                    borderRadius: '4px',
                    fontWeight: 700
                  }}>
                    {sys.code}
                  </span>
                </div>
              </div>

              {/* Integrations Section: Compact Collapsible Consumers & Providers */}
              {integrationsList.length > 0 && (
                <div style={{
                  marginTop: '0.65rem',
                  padding: '0.55rem 0.75rem',
                  background: 'rgba(0, 0, 0, 0.18)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.55rem'
                }}>
                  {/* 1. Consumers Collapsible */}
                  {consumerIntegrations.length > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() => toggleSection(`${sysKey}-consumers`)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          background: 'transparent',
                          border: 'none',
                          padding: '0.1rem 0',
                          cursor: 'pointer',
                          color: '#cbd5e1',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          fontFamily: 'inherit'
                        }}
                      >
                        <span style={{ color: '#cbd5e1' }}>
                          {isRtl ? 'جهات مستهلكة' : 'Consumers'}
                        </span>
                        <ChevronDown
                          size={13}
                          style={{
                            transition: 'transform 0.2s ease',
                            transform: isConsumersOpen ? 'rotate(0deg)' : (isRtl ? 'rotate(90deg)' : 'rotate(-90deg)'),
                            color: 'var(--text-dim, #94a3b8)'
                          }}
                        />
                      </button>

                      {isConsumersOpen && (
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '0.35rem',
                          marginTop: '0.35rem',
                          paddingInlineStart: '0.75rem'
                        }}>
                          {consumerIntegrations.map(([intKey, integration]) => {
                            const intName = getLocalized({ ar: integration.name, en: integration.nameEn }, integration.name);

                            return (
                              <button
                                key={intKey}
                                type="button"
                                onClick={() => onSelectSystemIntegration(sysKey, intKey)}
                                className="dashboard-int-badge"
                                title={isRtl ? `استعراض تكامل ${intName}` : `Explore ${intName} integration`}
                              >
                                <span>{intName}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. Providers Collapsible */}
                  {providerIntegrations.length > 0 && (
                    <div style={{
                      borderTop: consumerIntegrations.length > 0 ? '1px solid rgba(255, 255, 255, 0.04)' : 'none',
                      paddingTop: consumerIntegrations.length > 0 ? '0.45rem' : '0'
                    }}>
                      <button
                        type="button"
                        onClick={() => toggleSection(`${sysKey}-providers`)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          background: 'transparent',
                          border: 'none',
                          padding: '0.1rem 0',
                          cursor: 'pointer',
                          color: '#cbd5e1',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          fontFamily: 'inherit'
                        }}
                      >
                        <span style={{ color: '#cbd5e1' }}>
                          {isRtl ? 'جهات مزوّدة' : 'Providers'}
                        </span>
                        <ChevronDown
                          size={13}
                          style={{
                            transition: 'transform 0.2s ease',
                            transform: isProvidersOpen ? 'rotate(0deg)' : (isRtl ? 'rotate(90deg)' : 'rotate(-90deg)'),
                            color: 'var(--text-dim, #94a3b8)'
                          }}
                        />
                      </button>

                      {isProvidersOpen && (
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '0.35rem',
                          marginTop: '0.35rem',
                          paddingInlineStart: '0.75rem'
                        }}>
                          {providerIntegrations.map(([intKey, integration]) => {
                            const intName = getLocalized({ ar: integration.name, en: integration.nameEn }, integration.name);

                            return (
                              <button
                                key={intKey}
                                type="button"
                                onClick={() => onSelectSystemIntegration(sysKey, intKey)}
                                className="dashboard-int-badge"
                                title={isRtl ? `استعراض تكامل ${intName}` : `Explore ${intName} integration`}
                              >
                                <span>{intName}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

