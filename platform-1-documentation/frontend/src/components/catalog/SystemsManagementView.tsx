import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  Link2,
  CheckCircle2,
  X,
  AlertTriangle,
  ShieldAlert,
  ExternalLink
} from 'lucide-react';
import { SystemModule, Sector } from '../../types/schema';
import { useLanguage } from '../../i18n';

export interface SystemsManagementViewProps {
  systems: Record<string, SystemModule>;
  sectors?: Record<string, Sector>;
  onAddSystem: (newSystem: SystemModule) => void;
  onUpdateSystem?: (systemKey: string, updatedData: Partial<SystemModule>) => void;
  onDeleteSystem?: (systemKey: string) => void;
  onNavigateToIntegrations?: (systemKey?: string) => void;
  onSelectSystemIntegration?: (systemKey: string, integrationKey: string) => void;
}

type SystemFilterType = 'ALL' | 'ACTIVE' | 'INTEGRATED' | 'STANDALONE';

export const SystemsManagementView: React.FC<SystemsManagementViewProps> = ({
  systems,
  sectors = {},
  onAddSystem,
  onUpdateSystem,
  onDeleteSystem,
  onNavigateToIntegrations,
  onSelectSystemIntegration
}) => {
  const { isRtl, getLocalized } = useLanguage();

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<SystemFilterType>('ALL');

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSystemKey, setEditingSystemKey] = useState<string | null>(null);

  // Form Fields
  const [formNameAr, setFormNameAr] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formCode, setFormCode] = useState('SYS_');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'BETA' | 'MAINTENANCE'>('ACTIVE');

  // Governance Delete Modal State
  const [pendingDeleteSys, setPendingDeleteSys] = useState<{
    key: string;
    name: string;
    code: string;
    linkedCount: number;
    linkedEntities: string[];
  } | null>(null);

  // Inline Feedback Banner
  const [alertFeedback, setAlertFeedback] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);

  // Compute Aggregated Statistics
  const systemEntries = useMemo(() => Object.entries(systems), [systems]);

  const stats = useMemo(() => {
    let total = systemEntries.length;
    let active = 0;
    let totalIntegrations = 0;
    let standalone = 0;

    systemEntries.forEach(([, sys]) => {
      if (sys.status !== 'MAINTENANCE') active++;
      const intCount = sys.integrations ? Object.keys(sys.integrations).length : 0;
      totalIntegrations += intCount;
      if (intCount === 0) standalone++;
    });

    return { total, active, totalIntegrations, standalone };
  }, [systemEntries]);

  // Filtered Systems List
  const filteredSystems = useMemo(() => {
    return systemEntries.filter(([sysKey, sys]) => {
      const intCount = sys.integrations ? Object.keys(sys.integrations).length : 0;

      // Status / Category Filter
      if (filterType === 'ACTIVE' && sys.status === 'MAINTENANCE') return false;
      if (filterType === 'INTEGRATED' && intCount === 0) return false;
      if (filterType === 'STANDALONE' && intCount > 0) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (sys.name || '').toLowerCase().includes(q);
        const matchNameEn = (sys.nameEn || '').toLowerCase().includes(q);
        const matchCode = (sys.code || sysKey).toLowerCase().includes(q);
        const matchDesc = (sys.description || '').toLowerCase().includes(q);
        return matchName || matchNameEn || matchCode || matchDesc;
      }

      return true;
    });
  }, [systemEntries, filterType, searchQuery]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingSystemKey(null);
    setFormNameAr('');
    setFormNameEn('');
    setFormCode('SYS_');
    setFormDescription('');
    setFormStatus('ACTIVE');
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (sysKey: string, sys: SystemModule) => {
    setEditingSystemKey(sysKey);
    setFormNameAr(sys.name || '');
    setFormNameEn(sys.nameEn || '');
    setFormCode(sys.code || `SYS_${sysKey.toUpperCase()}`);
    setFormDescription(sys.description || '');
    setFormStatus(sys.status || 'ACTIVE');
    setIsFormModalOpen(true);
  };

  // Submit System Form (Add or Edit)
  const handleSaveSystem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNameAr.trim()) return;

    if (editingSystemKey) {
      // Update
      const existing = systems[editingSystemKey];
      const updatedData: Partial<SystemModule> = {
        name: formNameAr.trim(),
        nameEn: formNameEn.trim() || formNameAr.trim(),
        code: formCode.trim().toUpperCase() || `SYS_${editingSystemKey.toUpperCase()}`,
        description: formDescription.trim(),
        status: formStatus,
        associatedSectorKeys: existing?.associatedSectorKeys || [],
        integrations: existing?.integrations || {}
      };

      if (onUpdateSystem) {
        onUpdateSystem(editingSystemKey, updatedData);
      }

      setAlertFeedback({
        type: 'success',
        text: isRtl
          ? `تم تحديث بيانات نظام [${formNameAr.trim()}] بنجاح.`
          : `System [${formNameAr.trim()}] updated successfully.`
      });
    } else {
      // Create new
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
        description: formDescription.trim(),
        descriptionEn: formNameEn.trim() || formNameAr.trim(),
        status: formStatus,
        associatedSectorKeys: [],
        integrations: {}
      };

      onAddSystem(newSystem);
      setAlertFeedback({
        type: 'success',
        text: isRtl
          ? `تم تسجيل وحفظ نظام [${formNameAr.trim()}] بنجاح.`
          : `System [${formNameAr.trim()}] registered successfully.`
      });
    }

    setIsFormModalOpen(false);
  };

  // Open Delete Check Modal
  const handleOpenDelete = (sysKey: string, sys: SystemModule) => {
    const integrations = sys.integrations ? Object.values(sys.integrations) : [];
    const linkedCount = integrations.length;
    const linkedEntities = integrations.map(intItem => intItem.name || intItem.entityId);

    setPendingDeleteSys({
      key: sysKey,
      name: sys.name,
      code: sys.code || sysKey,
      linkedCount,
      linkedEntities
    });
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!pendingDeleteSys) return;

    if (pendingDeleteSys.linkedCount > 0) {
      setPendingDeleteSys(null);
      return;
    }

    const deleteKey = pendingDeleteSys.key;
    const deleteName = pendingDeleteSys.name;

    if (onDeleteSystem) {
      onDeleteSystem(deleteKey);
    }

    setPendingDeleteSys(null);
    setAlertFeedback({
      type: 'info',
      text: isRtl
        ? `تم حذف نظام [${deleteName}] من المنظومة بنجاح.`
        : `System [${deleteName}] deleted successfully.`
    });
  };

  return (
    <div
      className="systems-management-console"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        width: '100%',
        padding: '0.85rem 1.25rem',
        boxSizing: 'border-box'
      }}
    >
      {/* Inline Alert Feedback if available */}
      {alertFeedback && (
        <div
          style={{
            background: alertFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(14, 165, 233, 0.12)',
            border: `1px solid ${alertFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(14, 165, 233, 0.3)'}`,
            color: alertFeedback.type === 'success' ? '#34d399' : '#38bdf8',
            padding: '0.5rem 0.85rem',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.8rem',
            fontWeight: 600
          }}
        >
          <span>{alertFeedback.text}</span>
          <button
            type="button"
            onClick={() => setAlertFeedback(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 700
            }}
          >
            {isRtl ? 'إغلاق' : 'Dismiss'}
          </button>
        </div>
      )}

      {/* ── 1. Ultra-Compact KPI & Quick Status Pills Strip ── */}
      <div
        style={{
          background: 'var(--surface, #1e293b)',
          borderRadius: '6px',
          border: '1px solid var(--border-strong, rgba(255, 255, 255, 0.1))',
          boxShadow: 'var(--shadow-card, 0 4px 16px rgba(0, 0, 0, 0.25))',
          padding: '0.45rem 0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.65rem'
        }}
      >
        {/* Left: Compact Stats Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', fontSize: '0.74rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ color: 'var(--text-dim, #94a3b8)' }}>{isRtl ? 'إجمالي الأنظمة:' : 'Total Systems:'}</span>
            <span style={{ fontWeight: 800, color: '#ffffff' }}>{stats.total}</span>
          </div>

          <div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.1)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ color: '#34d399' }}>● {isRtl ? 'أنظمة نشطة:' : 'Active:'}</span>
            <span style={{ fontWeight: 800, color: '#10b981' }}>{stats.active}</span>
          </div>

          <div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.1)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ color: '#38bdf8' }}>🔗 {isRtl ? 'مسارات التكامل والربط:' : 'Integrations:'}</span>
            <span style={{ fontWeight: 800, color: '#38bdf8' }}>{stats.totalIntegrations}</span>
          </div>

          <div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.1)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ color: 'var(--text-dim, #64748b)' }}>○ {isRtl ? 'أنظمة مجردة:' : 'Standalone:'}</span>
            <span style={{ fontWeight: 700, color: 'var(--text-dim, #94a3b8)' }}>{stats.standalone}</span>
          </div>
        </div>

        {/* Right: Quick Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {[
            { id: 'ALL' as SystemFilterType, label: isRtl ? 'الكل' : 'All' },
            { id: 'ACTIVE' as SystemFilterType, label: isRtl ? 'النشطة' : 'Active' },
            { id: 'INTEGRATED' as SystemFilterType, label: isRtl ? 'المتكاملة' : 'Integrated' },
            { id: 'STANDALONE' as SystemFilterType, label: isRtl ? 'المجردة' : 'Standalone' }
          ].map(p => {
            const isActive = filterType === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setFilterType(p.id)}
                style={{
                  padding: '0.22rem 0.6rem',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? 'var(--primary, #6366f1)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-dim, #94a3b8)',
                  boxShadow: isActive ? '0 2px 8px rgba(99, 102, 241, 0.35)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. Compact Search & Action Toolbar Strip ── */}
      <div
        style={{
          background: 'var(--surface, #1e293b)',
          borderRadius: '6px',
          border: '1px solid var(--border-strong, rgba(255, 255, 255, 0.1))',
          boxShadow: 'var(--shadow-card, 0 4px 16px rgba(0, 0, 0, 0.25))',
          padding: '0.5rem 0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap'
        }}
      >
        {/* Search Input */}
        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
          <Search
            size={13}
            style={{
              position: 'absolute',
              [isRtl ? 'right' : 'left']: '9px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-dim, #64748b)'
            }}
          />
          <input
            type="text"
            placeholder={isRtl ? 'بحث باسم النظام أو الكود التعريفي...' : 'Search system name or code...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.38rem 0.75rem',
              [isRtl ? 'paddingRight' : 'paddingLeft']: '1.85rem',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.03)',
              color: '#ffffff',
              fontSize: '0.78rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Action Button: + Add System */}
        <button
          type="button"
          onClick={handleOpenCreateModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.38rem 0.85rem',
            borderRadius: '4px',
            border: 'none',
            background: 'var(--primary, #6366f1)',
            color: '#ffffff',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
            transition: 'background 0.15s ease'
          }}
        >
          <Plus size={14} />
          <span>{isRtl ? 'إضافة نظام جديد' : 'New System'}</span>
        </button>
      </div>

      {/* ── 3. High-Density Central Systems Matrix Table (100% Width) ── */}
      <div
        style={{
          background: 'var(--surface, #1e293b)',
          borderRadius: '6px',
          border: '1px solid var(--border-strong, rgba(255, 255, 255, 0.1))',
          boxShadow: 'var(--shadow-card, 0 4px 16px rgba(0, 0, 0, 0.25))',
          overflow: 'hidden'
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left' }}>
          <thead>
            <tr
              style={{
                background: 'rgba(0, 0, 0, 0.25)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '0.72rem',
                color: 'var(--text-dim, #94a3b8)',
                fontWeight: 700
              }}
            >
              <th style={{ padding: '0.65rem 0.85rem' }}>{isRtl ? 'النظام المركزي' : 'Core System'}</th>
              <th style={{ padding: '0.65rem 0.85rem' }}>{isRtl ? 'الكود التعريفي' : 'System Code'}</th>
              <th style={{ padding: '0.65rem 0.85rem' }}>{isRtl ? 'الحالة' : 'Status'}</th>
              <th style={{ padding: '0.65rem 0.85rem' }}>{isRtl ? 'الجهات المتكاملة' : 'Integrated Entities'}</th>
              <th style={{ padding: '0.65rem 0.85rem' }}>{isRtl ? 'الوصف' : 'Description'}</th>
              <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>{isRtl ? 'الإجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredSystems.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: '3rem 1rem',
                    textAlign: 'center',
                    color: 'var(--text-dim, #64748b)',
                    fontSize: '0.82rem'
                  }}
                >
                  {isRtl ? 'لا توجد أنظمة تطابق معايير البحث والفلترة.' : 'No systems match criteria.'}
                </td>
              </tr>
            ) : (
              filteredSystems.map(([sysKey, sys]) => {
                const localizedName = getLocalized({ ar: sys.name, en: sys.nameEn }, sys.name);
                const rawIntegrations = sys.integrations ? Object.values(sys.integrations) : [];
                const intCount = rawIntegrations.length;
                const isUnderMaintenance = sys.status === 'MAINTENANCE';

                return (
                  <tr
                    key={sysKey}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.025)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {/* System Name + Icon */}
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '5px',
                            background: 'rgba(99, 102, 241, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#818cf8',
                            flexShrink: 0
                          }}
                        >
                          <Layers size={15} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.82rem' }}>
                            {localizedName}
                          </div>
                          {sys.nameEn && sys.nameEn !== sys.name && (
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim, #94a3b8)' }}>
                              {sys.nameEn}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* System Code */}
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontFamily: 'monospace',
                          background: 'rgba(56, 189, 248, 0.1)',
                          color: '#38bdf8',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          border: '1px solid rgba(56, 189, 248, 0.25)',
                          fontWeight: 700
                        }}
                      >
                        {sys.code || `SYS_${sysKey.toUpperCase()}`}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '999px',
                          fontWeight: 700,
                          background: isUnderMaintenance ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: isUnderMaintenance ? '#f87171' : '#34d399',
                          border: `1px solid ${isUnderMaintenance ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                        }}
                      >
                        {isUnderMaintenance
                          ? (isRtl ? 'صيانة' : 'Maintenance')
                          : (isRtl ? 'نشط ومفعل' : 'Active')}
                      </span>
                    </td>

                    {/* Integrated Entities Tags */}
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      {intCount === 0 ? (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim, #64748b)' }}>
                          {isRtl ? 'نظام مجرد (بدون ربط)' : 'Standalone'}
                        </span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: '#cbd5e1',
                              padding: '0.1rem 0.45rem',
                              borderRadius: '4px'
                            }}
                          >
                            {intCount} {isRtl ? 'جهات' : 'entities'}
                          </span>
                          {rawIntegrations.slice(0, 3).map((item, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '0.66rem',
                                background: 'rgba(99, 102, 241, 0.1)',
                                color: '#a5b4fc',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '3px',
                                border: '1px solid rgba(99, 102, 241, 0.2)'
                              }}
                            >
                              {item.name || item.entityId}
                            </span>
                          ))}
                          {rawIntegrations.length > 3 && (
                            <span style={{ fontSize: '0.64rem', color: 'var(--text-dim, #94a3b8)' }}>
                              +{rawIntegrations.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Description */}
                    <td style={{ padding: '0.65rem 0.85rem', maxWidth: '240px' }}>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-dim, #94a3b8)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={sys.description || ''}
                      >
                        {sys.description || (isRtl ? 'لا يوجد وصف مدخل.' : 'No description.')}
                      </div>
                    </td>

                    {/* Action Buttons */}
                    <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        {/* Manage Integrations Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (onNavigateToIntegrations) onNavigateToIntegrations(sysKey);
                          }}
                          title={isRtl ? 'إدارة الربط والتكامل' : 'Manage Integrations'}
                          style={{
                            padding: '0.28rem 0.5rem',
                            borderRadius: '4px',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            background: 'rgba(56, 189, 248, 0.08)',
                            color: '#38bdf8',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.68rem',
                            fontWeight: 600
                          }}
                        >
                          <Link2 size={12} />
                          <span>{isRtl ? 'الربط' : 'Link'}</span>
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(sysKey, sys)}
                          title={isRtl ? 'تعديل بيانات النظام' : 'Edit System'}
                          style={{
                            padding: '0.28rem 0.5rem',
                            borderRadius: '4px',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            background: 'rgba(255, 255, 255, 0.04)',
                            color: '#cbd5e1',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Edit2 size={12} />
                        </button>

                        {/* Delete Button (Protected by Governance) */}
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(sysKey, sys)}
                          title={intCount > 0 ? (isRtl ? 'محمي بالحوكمة (مرتبط بجهات)' : 'Protected (Linked)') : (isRtl ? 'حذف النظام' : 'Delete')}
                          style={{
                            padding: '0.28rem 0.5rem',
                            borderRadius: '4px',
                            border: `1px solid ${intCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.3)'}`,
                            background: intCount > 0 ? 'rgba(239, 68, 68, 0.04)' : 'rgba(239, 68, 68, 0.1)',
                            color: intCount > 0 ? '#94a3b8' : '#f87171',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal: Add / Edit System ── */}
      {isFormModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={() => setIsFormModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--surface, #1e293b)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1.25rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(0, 0, 0, 0.2)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={16} style={{ color: '#818cf8' }} />
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                  {editingSystemKey
                    ? (isRtl ? 'تعديل بيانات النظام المركزي' : 'Edit Core System')
                    : (isRtl ? 'تسجيل نظام مركزي جديد' : 'New Core System')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveSystem} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ fontSize: '0.74rem', color: '#cbd5e1', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  {isRtl ? 'اسم النظام بالعربية' : 'System Name (Arabic)'} <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={isRtl ? 'مثال: نظام التحصيل والدفع اللحظي' : 'e.g. Instant Payment System'}
                  value={formNameAr}
                  onChange={e => setFormNameAr(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.7rem',
                    fontSize: '0.8rem',
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '4px',
                    color: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: '#cbd5e1', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  {isRtl ? 'اسم النظام بالإنجليزية' : 'System Name (English)'}
                </label>
                <input
                  type="text"
                  placeholder={isRtl ? 'مثال: Instant Payment System' : 'e.g. Instant Payment System'}
                  value={formNameEn}
                  onChange={e => setFormNameEn(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.7rem',
                    fontSize: '0.8rem',
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '4px',
                    color: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#cbd5e1', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    {isRtl ? 'الكود التعريفي' : 'System Code'} <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={e => setFormCode(e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.7rem',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace',
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '4px',
                      color: '#38bdf8',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', color: '#cbd5e1', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    {isRtl ? 'الحالة التشغيلية' : 'Status'}
                  </label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.7rem',
                      fontSize: '0.8rem',
                      background: '#0f172a',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '4px',
                      color: '#ffffff',
                      outline: 'none',
                      cursor: 'pointer',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="ACTIVE">{isRtl ? 'نشط ومفعل' : 'Active'}</option>
                    <option value="BETA">{isRtl ? 'تجريبي (Beta)' : 'Beta'}</option>
                    <option value="MAINTENANCE">{isRtl ? 'تحت الصيانة' : 'Maintenance'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: '#cbd5e1', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  {isRtl ? 'الوصف والغرض' : 'Description'}
                </label>
                <textarea
                  rows={3}
                  placeholder={isRtl ? 'اكتب نبذة موجزة عن اختصاص ووظيفة النظام...' : 'Brief description...'}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.7rem',
                    fontSize: '0.8rem',
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '4px',
                    color: '#ffffff',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Form Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '4px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'transparent',
                    color: '#94a3b8',
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.4rem 1rem',
                    borderRadius: '4px',
                    border: 'none',
                    background: 'var(--primary, #6366f1)',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {editingSystemKey ? (isRtl ? 'حفظ التعديلات' : 'Save Changes') : (isRtl ? 'تسجيل النظام' : 'Create System')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Governance Delete Modal ── */}
      {pendingDeleteSys && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={() => setPendingDeleteSys(null)}
        >
          <div
            style={{
              background: 'var(--surface, #1e293b)',
              border: `1px solid ${pendingDeleteSys.linkedCount > 0 ? '#ef4444' : 'rgba(255, 255, 255, 0.15)'}`,
              borderRadius: '8px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: pendingDeleteSys.linkedCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: pendingDeleteSys.linkedCount > 0 ? '#ef4444' : '#f59e0b',
                    flexShrink: 0
                  }}
                >
                  {pendingDeleteSys.linkedCount > 0 ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
                </div>

                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                    {pendingDeleteSys.linkedCount > 0
                      ? (isRtl ? 'حظر حوكمة: لا يمكن حذف هذا النظام' : 'Governance Block: Cannot Delete System')
                      : (isRtl ? 'تأكيد حذف النظام المركزي' : 'Confirm System Deletion')}
                  </h4>

                  {pendingDeleteSys.linkedCount > 0 ? (
                    <div style={{ fontSize: '0.78rem', color: '#fca5a5', lineHeight: '1.5' }}>
                      {isRtl
                        ? `النظام [${pendingDeleteSys.name}] يحتوي حالياً على (${pendingDeleteSys.linkedCount}) مسارات ربط نشطة مع جهات شريكة. بموجب قواعد حوكمة المنظومة، يمنع منعاً باتاً حذف أي نظام حتى يتم فك ارتباط كافة الجهات التابعة له أولاً.`
                        : `System [${pendingDeleteSys.name}] has (${pendingDeleteSys.linkedCount}) active entity integrations. System cannot be removed until all integrations are unlinked.`}
                      {pendingDeleteSys.linkedEntities.length > 0 && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                          {pendingDeleteSys.linkedEntities.map((ent, idx) => (
                            <span
                              key={idx}
                              style={{
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#fecaca',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '3px',
                                fontSize: '0.7rem'
                              }}
                            >
                              {ent}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                      {isRtl
                        ? `هل أنت متأكد من رغبتك في حذف نظام [${pendingDeleteSys.name}] (${pendingDeleteSys.code}) نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.`
                        : `Are you sure you want to permanently delete system [${pendingDeleteSys.name}] (${pendingDeleteSys.code})?`}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setPendingDeleteSys(null)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '4px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'transparent',
                    color: '#94a3b8',
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  {pendingDeleteSys.linkedCount > 0 ? (isRtl ? 'حسناً، فهمت' : 'Understood') : (isRtl ? 'إلغاء' : 'Cancel')}
                </button>

                {pendingDeleteSys.linkedCount === 0 && (
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    style={{
                      padding: '0.4rem 1rem',
                      borderRadius: '4px',
                      border: 'none',
                      background: '#ef4444',
                      color: '#ffffff',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {isRtl ? 'تأكيد الحذف النهائي' : 'Confirm Delete'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
