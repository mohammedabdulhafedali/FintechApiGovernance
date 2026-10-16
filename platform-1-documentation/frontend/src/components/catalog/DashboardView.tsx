import React, { useState } from 'react';
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
  ShieldCheck
} from 'lucide-react';
import { SystemModule, Sector, SystemIntegration } from '../../types/schema';
import { DocumentGovernanceEngine } from '../../services/docGovernanceEngine';
import { useLanguage } from '../../i18n';
import { Can } from '../auth/Can';
import { useAuth } from '../auth/AuthContext';

interface DashboardViewProps {
  systems: Record<string, SystemModule>;
  sectors?: Record<string, Sector>;
  onSelectSystemIntegration: (systemKey: string, integrationKey: string) => void;
  onAddSystem: (newSystem: SystemModule) => void;
  onUpdateSystem?: (systemKey: string, updatedData: Partial<SystemModule>) => void;
  onDeleteSystem?: (systemKey: string) => void;
  onSaveSector?: (sector: { key: string; name: string; nameEn?: string; code: string }) => void;
  onDeleteSector?: (sectorKey: string) => void;
  // Backward compatibility
  onSelectSector?: (sectorKey: string) => void;
  onAddSector?: (newSector: Sector) => void;
  onOpenDeleteSector?: (sectorKey: string) => void;
}

type DashboardScreenMode = 'overview' | 'system-editor' | 'sectors-hub';

export const DashboardView: React.FC<DashboardViewProps> = ({
  systems,
  sectors = {},
  onSelectSystemIntegration,
  onAddSystem,
  onUpdateSystem,
  onDeleteSystem,
  onSaveSector,
  onDeleteSector
}) => {
  const { t, getLocalized, isRtl } = useLanguage();
  const { canAccess } = useAuth();

  // Screen Mode: 'overview' (Cards Grid) | 'system-editor' (Full Page Editor) | 'sectors-hub' (Full Page Sectors)
  const [screenMode, setScreenMode] = useState<DashboardScreenMode>('overview');

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

  // Inline delete confirmation for system cards
  const [systemKeyPendingDelete, setSystemKeyPendingDelete] = useState<string | null>(null);

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

  // Save System (Full Screen Form)
  const handleSaveSystem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNameAr.trim()) return;

    if (editingSystemKey) {
      // 1. Update Existing System
      const currentSys = systems[editingSystemKey];
      const updatedIntegrations: Record<string, SystemIntegration> = { ...(currentSys?.integrations || {}) };

      // Ensure all selected sectors exist as integrations under the system
      formSelectedSectors.forEach(secKey => {
        if (!updatedIntegrations[secKey]) {
          const sec = sectors[secKey];
          updatedIntegrations[secKey] = {
            entityId: secKey,
            name: sec?.name || secKey,
            nameEn: sec?.nameEn || secKey,
            code: sec?.code || `INT_${secKey.toUpperCase()}`,
            direction: 'BIDIRECTIONAL',
            endpoints: []
          };
        }
      });

      const updatedData: Partial<SystemModule> = {
        name: formNameAr.trim(),
        nameEn: formNameEn.trim() || formNameAr.trim(),
        code: formCode.trim().toUpperCase() || `SYS_${editingSystemKey.toUpperCase()}`,
        description: formDescription.trim(),
        associatedSectorKeys: formSelectedSectors,
        integrations: updatedIntegrations
      };

      if (onUpdateSystem) {
        onUpdateSystem(editingSystemKey, updatedData);
      }
    } else {
      // 2. Create New System
      const generatedKey = (formNameEn.trim() || formNameAr.trim())
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/^_+|_+$/g, '') || `sys_${Date.now()}`;

      const builtIntegrations: Record<string, SystemIntegration> = {};
      formSelectedSectors.forEach(secKey => {
        const sec = sectors[secKey];
        builtIntegrations[secKey] = {
          entityId: secKey,
          name: sec?.name || secKey,
          nameEn: sec?.nameEn || secKey,
          code: sec?.code || `INT_${secKey.toUpperCase()}`,
          direction: 'BIDIRECTIONAL',
          endpoints: []
        };
      });

      const newSystem: SystemModule = {
        key: generatedKey,
        name: formNameAr.trim(),
        nameEn: formNameEn.trim() || formNameAr.trim(),
        code: formCode.trim().toUpperCase() || `SYS_${generatedKey.toUpperCase()}`,
        icon: 'Layers',
        description: formDescription.trim() || (isRtl ? 'نظام مالي معتمد' : 'Certified financial system'),
        descriptionEn: formNameEn.trim() || formNameAr.trim(),
        status: 'ACTIVE',
        associatedSectorKeys: formSelectedSectors,
        integrations: builtIntegrations
      };

      onAddSystem(newSystem);
    }

    setScreenMode('overview');
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

    const key = editingSectorKey || (secNameEn.trim() || secNameAr.trim())
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/^_+|_+$/g, '') || `sec_${Date.now()}`;

    const code = secCode.trim().toUpperCase() || `SEC_${key.toUpperCase()}`;

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
          } catch {}
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

  // Filtered systems accessible by sovereign scope
  const systemEntries = Object.entries(systems).filter(([sysKey]) => {
    return canAccess('dashboard:read', { systemId: sysKey }) ||
           canAccess('catalog:read', { systemId: sysKey }) ||
           canAccess('catalog:view', { systemId: sysKey });
  });

  const availableSectorList = Object.values(sectors);

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

          {/* Section 2: Dynamic Associated Sectors & Entities (100% Dynamic from Pre-added Sectors) */}
          <div style={{
            background: 'var(--bg-card, #0f172a)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: 700, margin: 0 }}>
                  {isRtl ? '2. القطاعات والجهات الشريكة المرتبطة بالنظام' : '2. Associated Sectors & Integrated Entities'}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)', display: 'block', marginTop: '0.2rem' }}>
                  {isRtl ? 'حدد القطاعات والجهات التي يتكامل معها هذا النظام (مستمدة ديناميكياً من دليل القطاعات المعرفة مسبقاً):' : 'Select which pre-configured sectors/entities this system integrates with:'}
                </span>
              </div>

              {/* Direct Link to Sectors Management */}
              <button
                type="button"
                onClick={() => setScreenMode('sectors-hub')}
                style={{
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: '#38bdf8',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '4px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Plus size={13} />
                <span>{isRtl ? 'إدارة وإضافة قطاعات وجهات جديدة مسبقاً' : 'Manage & Add Sectors'}</span>
              </button>
            </div>

            {availableSectorList.length === 0 ? (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                background: 'rgba(0, 0, 0, 0.15)',
                borderRadius: '6px',
                border: '1px dashed rgba(255, 255, 255, 0.1)'
              }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-dim, #94a3b8)', margin: '0 0 0.75rem 0' }}>
                  {isRtl ? 'لم يتم إضافة أي قطاعات أو جهات بعد في المنظومة.' : 'No sectors or entities configured yet.'}
                </p>
                <button
                  type="button"
                  onClick={() => setScreenMode('sectors-hub')}
                  style={{
                    background: '#0284c7',
                    border: 'none',
                    color: '#ffffff',
                    padding: '0.45rem 1rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {isRtl ? '+ اضغط هنا لإضافة القطاع الأول مسبقاً' : '+ Add Your First Sector'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                {availableSectorList.map(sec => {
                  const secKey = sec.key || sec.code.toLowerCase();
                  const isSelected = formSelectedSectors.includes(secKey);
                  const localizedSecName = getLocalized({ ar: sec.name, en: sec.nameEn }, sec.name);

                  return (
                    <button
                      key={secKey}
                      type="button"
                      onClick={() => toggleSectorSelection(secKey)}
                      style={{
                        padding: '0.45rem 0.9rem',
                        fontSize: '0.8rem',
                        borderRadius: '4px',
                        border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                        background: isSelected ? 'rgba(56, 189, 248, 0.16)' : 'rgba(255, 255, 255, 0.03)',
                        color: isSelected ? '#ffffff' : 'var(--text-dim, #94a3b8)',
                        cursor: 'pointer',
                        fontWeight: isSelected ? 700 : 500,
                        transition: 'all 0.15s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      {isSelected && <Check size={12} style={{ color: '#38bdf8' }} />}
                      <span>{localizedSecName}</span>
                      <span style={{
                        fontSize: '0.65rem',
                        fontFamily: 'var(--font-mono)',
                        opacity: 0.65,
                        marginInlineStart: '0.2rem'
                      }}>
                        {sec.code}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
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
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f87171', margin: '0 0 0.75rem 0' }}>
                {isRtl ? 'تأكيد حذف القطاع' : 'Confirm Sector Deletion'}
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.6', margin: '0 0 1rem 0' }}>
                {isRtl
                  ? `هل أنت متأكد من رغبتك في حذف قطاع [${sectorPendingDelete.name}] نهائياً من المنظومة؟`
                  : `Are you sure you want to permanently delete sector [${sectorPendingDelete.name}]?`}
              </p>
              {sectorPendingDelete.linkedCount > 0 && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: '5px',
                  padding: '0.65rem 0.85rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.8rem',
                  color: '#fca5a5',
                  lineHeight: '1.5'
                }}>
                  {isRtl
                    ? `تنبيه: هذا القطاع مرتبط حالياً بـ (${sectorPendingDelete.linkedCount}) نظام مركزي. الحذف قد يؤثر على عرض تكاملات تلك الأنظمة.`
                    : `Warning: This sector is currently linked to (${sectorPendingDelete.linkedCount}) core systems.`}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: sectorPendingDelete.linkedCount > 0 ? 0 : '1.25rem' }}>
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
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
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
              </div>
            </div>
          </div>
        )}
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
  // VIEW MODE 3: DEFAULT OVERVIEW (NO ICONS ON SYSTEMS)
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

          {/* Add Core System Button (Opens Full Screen Form) */}
          <Can perform="catalog:system:create">
            <button
              type="button"
              onClick={handleOpenCreateSystem}
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
              <Plus size={13} />
              <span>{isRtl ? 'إضافة نظام جديد' : 'Add New System'}</span>
            </button>
          </Can>
        </div>
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

                {/* Quick Link Entity Action Button */}
                <Can perform="catalog:system:create">
                  <button
                    type="button"
                    onClick={() => handleOpenLinkEntityModal(sysKey)}
                    title={isRtl ? `ربط جهة بنظام ${localizedName}` : `Link Entity to ${localizedName}`}
                    style={{
                      background: 'rgba(56, 189, 248, 0.08)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      color: '#38bdf8',
                      padding: '0.18rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Link2 size={11} />
                    <span>{isRtl ? 'ربط جهة' : 'Link Entity'}</span>
                  </button>
                </Can>
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

      {/* ========================================================================= */}
      {/* GOVERNANCE MODAL: LINK ENTITY TO SYSTEM WITH CONTRACT MATCHING RULES     */}
      {/* ========================================================================= */}
      {linkingSystemKey && (
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
              {/* Field 1: Entity Selector (Filtered to unlinked or available) */}
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
                  
                  // Filter rules:
                  // 1. Must belong to selected entity
                  // 2. Must be APPROVED
                  // 3. Must not be already linked to this system
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
      )}
    </div>
  );
};
