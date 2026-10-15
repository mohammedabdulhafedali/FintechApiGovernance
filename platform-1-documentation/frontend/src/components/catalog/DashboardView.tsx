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
  Edit2
} from 'lucide-react';
import { SystemModule, Sector, SystemIntegration } from '../../types/schema';
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

  // Inline delete confirmation for system cards
  const [systemKeyPendingDelete, setSystemKeyPendingDelete] = useState<string | null>(null);

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

  // Save Sector in Sectors Hub
  const handleSaveSector = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secNameAr.trim()) return;

    const key = editingSectorKey || (secNameEn.trim() || secNameAr.trim())
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/^_+|_+$/g, '') || `sec_${Date.now()}`;

    const code = secCode.trim().toUpperCase() || `SEC_${key.toUpperCase()}`;

    if (onSaveSector) {
      onSaveSector({
        key,
        name: secNameAr.trim(),
        nameEn: secNameEn.trim() || secNameAr.trim(),
        code
      });
    }

    setEditingSectorKey(null);
    setSecNameAr('');
    setSecNameEn('');
    setSecCode('SEC_');
  };

  const handleEditSector = (sec: Sector) => {
    setEditingSectorKey(sec.key || '');
    setSecNameAr(sec.name || '');
    setSecNameEn(sec.nameEn || '');
    setSecCode(sec.code || `SEC_${(sec.key || '').toUpperCase()}`);
  };

  // Filtered systems accessible by sovereign scope
  const systemEntries = Object.entries(systems).filter(([sysKey]) => {
    return canAccess('catalog:view', { systemId: sysKey });
  });

  const availableSectorList = Object.values(sectors);

  // ==========================================
  // VIEW MODE 1: FULL SCREEN SYSTEM EDITOR
  // ==========================================
  if (screenMode === 'system-editor') {
    return (
      <div className="dashboard-container" style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
        {/* Navigation Breadcrumb & Back Action */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <button
                type="button"
                onClick={() => setScreenMode('overview')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim, #94a3b8)',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: 0
                }}
              >
                {isRtl ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
                <span>{isRtl ? 'العودة للوحة الأنظمة' : 'Back to Systems'}</span>
              </button>
              <span style={{ color: 'var(--border, #334155)' }}>/</span>
              <span style={{ fontSize: '0.82rem', color: '#38bdf8', fontWeight: 600 }}>
                {editingSystemKey ? (isRtl ? 'تعديل بيانات النظام' : 'Edit System') : (isRtl ? 'إضافة نظام جديد' : 'New System')}
              </span>
            </div>
            <h1 style={{ fontSize: '1.4rem', color: '#ffffff', fontWeight: 800, margin: 0 }}>
              {editingSystemKey
                ? (isRtl ? `تعديل نظام [${formNameAr || editingSystemKey}]` : `Edit System [${formNameEn || formNameAr || editingSystemKey}]`)
                : (isRtl ? 'تسجيل نظام مالي مركزي جديد' : 'Register New Core System')}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setScreenMode('overview')}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-dim, #94a3b8)',
              padding: '0.45rem 1rem',
              borderRadius: '4px',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            {isRtl ? 'إلغاء' : 'Cancel'}
          </button>
        </div>

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
        {/* Navigation Breadcrumb */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div>
            <button
              type="button"
              onClick={() => setScreenMode('overview')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim, #94a3b8)',
                cursor: 'pointer',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0 0 0.35rem 0'
              }}
            >
              {isRtl ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
              <span>{isRtl ? 'العودة للوحة الأنظمة' : 'Back to Systems'}</span>
            </button>
            <h1 style={{ fontSize: '1.4rem', color: '#ffffff', fontWeight: 800, margin: 0 }}>
              {isRtl ? 'دليل وإدارة القطاعات والجهات الشريكة' : 'Sectors & Integrated Entities Directory'}
            </h1>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim, #94a3b8)', display: 'block', marginTop: '0.2rem' }}>
              {isRtl
                ? 'إدارة الكيانات المستقلة (البنوك، المتاجر، الجمارك، سداد...) وإضافتها مسبقاً لربطها بالأنظمة المركزية.'
                : 'Manage independent entities (Banks, Merchants, Customs, SADAD...) prior to linking with systems.'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setScreenMode('overview')}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-dim, #94a3b8)',
              padding: '0.45rem 1rem',
              borderRadius: '4px',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            {isRtl ? 'إغلاق والعودة' : 'Close'}
          </button>
        </div>

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
                : (isRtl ? '+ إضافة قطاع أو جهة شريكة مسبقاً' : '+ Add New Sector/Entity')}
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
                    border: 'none',
                    color: '#ffffff',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer'
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
                      background: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'var(--text-dim, #94a3b8)',
                      padding: '0.5rem 0.85rem',
                      borderRadius: '4px',
                      fontSize: '0.82rem',
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
                        padding: '0.75rem 1rem',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <strong style={{ fontSize: '0.88rem', color: '#ffffff' }}>
                            {localizedName}
                          </strong>
                          <span style={{
                            fontSize: '0.62rem',
                            fontFamily: 'var(--font-mono)',
                            color: '#38bdf8',
                            background: 'rgba(56, 189, 248, 0.1)',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '3px'
                          }}>
                            {sec.code}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim, #94a3b8)', display: 'block', marginTop: '0.15rem' }}>
                          {isRtl ? `مرتبط بـ (${linkedSystemsCount}) نظام مركزي` : `Linked to (${linkedSystemsCount}) core systems`}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => handleEditSector(sec)}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'var(--text-dim, #94a3b8)',
                            padding: '0.25rem 0.55rem',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            cursor: 'pointer'
                          }}
                        >
                          {isRtl ? 'تعديل' : 'Edit'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onDeleteSector) {
                              onDeleteSector(secKey);
                            }
                          }}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(248, 113, 113, 0.25)',
                            color: '#f87171',
                            padding: '0.25rem 0.55rem',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            cursor: 'pointer'
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
      </div>
    );
  }

  // ==========================================
  // VIEW MODE 3: DEFAULT OVERVIEW (NO ICONS ON SYSTEMS)
  // ==========================================
  return (
    <div className="dashboard-container">
      {/* Sovereign Top Navigation Strip */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', color: '#ffffff', fontWeight: 800, margin: '0 0 0.25rem 0' }}>
            {isRtl ? 'حوكمة ودليل الأنظمة المركزية' : 'Core Systems Command & Governance'}
          </h1>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim, #94a3b8)' }}>
            {isRtl
              ? 'حوكمة الربط البيني والتكاملات المصرفية بين الأنظمة والقطاعات الشريكة'
              : 'Inter-system routing and governance across certified partner sectors'}
          </span>
        </div>

        {/* Global Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* Manage Sectors Button */}
          <button
            type="button"
            onClick={() => setScreenMode('sectors-hub')}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              padding: '0.45rem 0.95rem',
              borderRadius: '4px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <Building2 size={14} style={{ color: '#38bdf8' }} />
            <span>{isRtl ? 'إدارة القطاعات والجهات' : 'Manage Sectors'}</span>
          </button>

          {/* Add Core System Button (Opens Full Screen Form) */}
          <Can perform="catalog:system:create">
            <button
              type="button"
              onClick={handleOpenCreateSystem}
              style={{
                background: '#0284c7',
                border: 'none',
                color: '#ffffff',
                padding: '0.45rem 1.15rem',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Plus size={14} />
              <span>{isRtl ? 'إضافة نظام جديد' : 'Add New System'}</span>
            </button>
          </Can>
        </div>
      </div>

      {/* Stats Summary Strip */}
      <div className="dashboard-stats-strip" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div className="stat-card" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem'
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', fontWeight: 600 }}>
            {isRtl ? 'إجمالي الأنظمة المركزية' : 'Total Core Systems'}
          </span>
          <strong style={{ fontSize: '1.4rem', color: 'var(--text-main, #ffffff)', fontWeight: 800 }}>
            {systemEntries.length}
          </strong>
        </div>

        <div className="stat-card" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem'
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', fontWeight: 600 }}>
            {isRtl ? 'القطاعات والجهات المعرّفة' : 'Configured Sectors'}
          </span>
          <strong style={{ fontSize: '1.4rem', color: 'var(--text-main, #ffffff)', fontWeight: 800 }}>
            {availableSectorList.length}
          </strong>
        </div>

        <div className="stat-card" style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem'
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', fontWeight: 600 }}>
            {isRtl ? 'إجمالي مسارات الـ API' : 'Total API Endpoints'}
          </span>
          <strong style={{ fontSize: '1.4rem', color: 'var(--text-main, #ffffff)', fontWeight: 800 }}>
            {systemEntries.reduce((acc, [, s]) => {
              const totalInSys = Object.values(s.integrations || {}).reduce(
                (sAcc, intItem) => sAcc + (intItem.endpoints ? intItem.endpoints.length : 0), 0
              );
              return acc + totalInSys;
            }, 0)}
          </strong>
        </div>
      </div>

      {/* Systems Grid (NO ICONS ON SYSTEMS - PURE TYPOGRAPHY & CLEAN BADGES) */}
      <div className="sectors-grid">
        {systemEntries.map(([sysKey, sys]) => {
          const localizedName = getLocalized({ ar: sys.name, en: sys.nameEn }, sys.name);
          const rawIntegrations = sys.integrations ? Object.entries(sys.integrations) : [];
          
          const integrationsList = rawIntegrations.filter(([intKey, intItem]) => {
            return canAccess('catalog:view', {
              entityId: intItem.entityId || intKey,
              systemId: sysKey
            });
          });

          const totalSysEndpoints = integrationsList.reduce(
            (sum, [, intItem]) => sum + (intItem.endpoints ? intItem.endpoints.length : 0),
            0
          );
          const firstIntKey = integrationsList[0]?.[0] || 'banking';
          const isPendingDelete = systemKeyPendingDelete === sysKey;

          return (
            <div key={sysKey} className="sector-card" style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Card Top: NO ICON BOX! Pure Typography + Code + Actions */}
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

                {/* Clean Top Action Buttons (Edit & Delete) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Can perform="catalog:system:create">
                    <button
                      type="button"
                      onClick={() => handleOpenEditSystem(sysKey, sys)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--text-dim, #94a3b8)',
                        padding: '0.22rem 0.6rem',
                        borderRadius: '4px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#38bdf8';
                        e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-dim, #94a3b8)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      }}
                      title={isRtl ? 'تعديل بيانات النظام' : 'Edit System'}
                    >
                      {isRtl ? 'تعديل' : 'Edit'}
                    </button>
                  </Can>

                  <Can perform="catalog:system:delete">
                    <button
                      type="button"
                      onClick={() => setSystemKeyPendingDelete(isPendingDelete ? null : sysKey)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: isPendingDelete ? '1px solid #f87171' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: isPendingDelete ? '#f87171' : 'var(--text-dim, #94a3b8)',
                        padding: '0.22rem 0.6rem',
                        borderRadius: '4px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title={isRtl ? 'حذف النظام' : 'Delete System'}
                    >
                      {isRtl ? 'حذف' : 'Delete'}
                    </button>
                  </Can>
                </div>
              </div>

              {/* Inline Delete Confirmation Banner (Zero Popup Modal) */}
              {isPendingDelete && (
                <div style={{
                  margin: '0.75rem 0',
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: '6px'
                }}>
                  <span style={{ fontSize: '0.76rem', color: '#ffffff', display: 'block', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                    {isRtl
                      ? `تأكيد حذف نظام [${localizedName}]؟${totalSysEndpoints > 0 ? ` (يحتوي على ${totalSysEndpoints} مسار API نشط)` : ''}`
                      : `Confirm deletion of [${localizedName}]?`}
                  </span>
                  <div style={{ display: 'flex', gap: '0.45rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (onDeleteSystem) {
                          onDeleteSystem(sysKey);
                        }
                        setSystemKeyPendingDelete(null);
                      }}
                      style={{
                        background: '#dc2626',
                        border: 'none',
                        color: '#ffffff',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '3px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {isRtl ? 'نعم، حذف' : 'Yes, Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSystemKeyPendingDelete(null)}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: 'var(--text-dim, #94a3b8)',
                        padding: '0.25rem 0.55rem',
                        borderRadius: '3px',
                        fontSize: '0.72rem',
                        cursor: 'pointer'
                      }}
                    >
                      {isRtl ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                </div>
              )}

              {/* Integrations Section: Dynamic Badges */}
              {integrationsList.length > 0 && (
                <div style={{
                  margin: '0.85rem 0',
                  padding: '0.65rem 0.75rem',
                  background: 'rgba(0, 0, 0, 0.18)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {integrationsList.map(([intKey, integration]) => {
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
                </div>
              )}

              {/* Card Footer: Explore System Documentation */}
              <div className="sector-card-footer" style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                <button
                  className="btn-sector-explore"
                  onClick={() => onSelectSystemIntegration(sysKey, firstIntKey)}
                  title={isRtl ? 'استعراض توثيق النظام' : 'Explore System Documentation'}
                >
                  <span>{isRtl ? 'استعراض توثيق النظام' : 'Explore System Docs'}</span>
                  {isRtl ? <ArrowLeft size={13} /> : <ArrowRight size={13} />}
                </button>
              </div>
            </div>
          );
        })}

        {/* Inline Add System Card (Full screen trigger) */}
        <Can perform="catalog:system:create">
          <div className="sector-add-card" onClick={handleOpenCreateSystem} style={{ cursor: 'pointer' }}>
            <div className="sector-add-icon-circle">
              <Plus size={18} />
            </div>
            <strong className="sector-add-title">
              {isRtl ? '+ إضافة نظام مركزي جديد' : '+ Add New Core System'}
            </strong>
            <span className="sector-add-sub">
              {isRtl ? 'تسجيل وتوثيق نظام مالي جديد مع ربط تكاملاته وقطاعاته' : 'Register a new financial system with integrated sectors'}
            </span>
          </div>
        </Can>
      </div>
    </div>
  );
};
