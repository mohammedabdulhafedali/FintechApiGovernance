import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  ShieldAlert,
  Layers
} from 'lucide-react';
import { Sector, SystemModule } from '../../types/schema';
import { useLanguage } from '../../i18n';

export interface EntitiesManagementViewProps {
  sectors: Record<string, Sector>;
  systems: Record<string, SystemModule>;
  onSaveSector: (sector: { key: string; name: string; nameEn?: string; code: string }) => void;
  onDeleteSector: (sectorKey: string) => void;
  onNavigateToIntegrations?: (entityKey?: string) => void;
}

type EntityFilterType = 'ALL' | 'LINKED' | 'STANDALONE';

export const EntitiesManagementView: React.FC<EntitiesManagementViewProps> = ({
  sectors,
  systems,
  onSaveSector,
  onDeleteSector,
  onNavigateToIntegrations
}) => {
  const { isRtl, getLocalized } = useLanguage();

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<EntityFilterType>('ALL');

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSectorKey, setEditingSectorKey] = useState<string | null>(null);

  // Form Fields
  const [formNameAr, setFormNameAr] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formCode, setFormCode] = useState('SEC_');

  // Governance Delete Modal State
  const [pendingDeleteSector, setPendingDeleteSector] = useState<{
    key: string;
    name: string;
    code: string;
    linkedSystems: string[];
  } | null>(null);

  // Inline Feedback Banner
  const [alertFeedback, setAlertFeedback] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);

  // Compute linking relationship between Entities and Systems
  // Map: entityKey -> array of system names
  const entitySystemLinks = useMemo(() => {
    const map: Record<string, string[]> = {};
    Object.keys(sectors).forEach(secKey => {
      map[secKey] = [];
    });

    Object.values(systems).forEach(sys => {
      const integrations = sys.integrations || {};
      Object.keys(integrations).forEach(entKey => {
        if (!map[entKey]) map[entKey] = [];
        if (!map[entKey].includes(sys.name)) {
          map[entKey].push(sys.name);
        }
      });

      (sys.associatedSectorKeys || []).forEach(secKey => {
        if (!map[secKey]) map[secKey] = [];
        if (!map[secKey].includes(sys.name)) {
          map[secKey].push(sys.name);
        }
      });
    });

    return map;
  }, [sectors, systems]);

  const sectorEntries = useMemo(() => Object.entries(sectors), [sectors]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const total = sectorEntries.length;
    let linked = 0;
    let standalone = 0;

    sectorEntries.forEach(([key]) => {
      const links = entitySystemLinks[key] || [];
      if (links.length > 0) linked++;
      else standalone++;
    });

    return { total, linked, standalone };
  }, [sectorEntries, entitySystemLinks]);

  // Filtered List
  const filteredSectors = useMemo(() => {
    return sectorEntries.filter(([secKey, sec]) => {
      const links = entitySystemLinks[secKey] || [];
      const isLinked = links.length > 0;

      if (filterType === 'LINKED' && !isLinked) return false;
      if (filterType === 'STANDALONE' && isLinked) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (sec.name || '').toLowerCase().includes(q);
        const matchNameEn = (sec.nameEn || '').toLowerCase().includes(q);
        const matchCode = (sec.code || secKey).toLowerCase().includes(q);
        return matchName || matchNameEn || matchCode;
      }

      return true;
    });
  }, [sectorEntries, entitySystemLinks, filterType, searchQuery]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingSectorKey(null);
    setFormNameAr('');
    setFormNameEn('');
    setFormCode('');
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (secKey: string, sec: Sector) => {
    setEditingSectorKey(secKey);
    setFormNameAr(sec.name || '');
    setFormNameEn(sec.nameEn || '');
    setFormCode(sec.code || `SEC_${secKey.toUpperCase()}`);
    setIsFormModalOpen(true);
  };

  // Save Sector
  const handleSaveSector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNameAr.trim()) return;

    const rawEnKey = (formNameEn.trim() || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/^_+|_+$/g, '');

    const key = editingSectorKey || rawEnKey || `sec_${Date.now()}`;

    const trimmedCode = formCode.trim().toUpperCase();
    const code = (!trimmedCode || trimmedCode === 'SEC_')
      ? `SEC_${(rawEnKey || String(Date.now()).slice(-4)).toUpperCase()}`
      : trimmedCode;

    try {
      await onSaveSector({
        key,
        name: formNameAr.trim(),
        nameEn: formNameEn.trim() || formNameAr.trim(),
        code
      });

      setAlertFeedback({
        type: 'success',
        text: isRtl
          ? (editingSectorKey ? `تم تحديث بيانات الجهة [${formNameAr.trim()}] بنجاح.` : `تم تسجيل وحفظ الجهة [${formNameAr.trim()}] بنجاح.`)
          : (editingSectorKey ? `Entity [${formNameAr.trim()}] updated successfully.` : `Entity [${formNameAr.trim()}] registered successfully.`)
      });

      setIsFormModalOpen(false);
    } catch (err: any) {
      setAlertFeedback({
        type: 'error',
        text: err.message || (isRtl ? 'حدث خطأ أثناء حفظ بيانات الجهة' : 'Failed to save entity')
      });
    }
  };

  // Open Delete Check Modal
  const handleOpenDelete = (secKey: string, sec: Sector) => {
    const linkedSystems = entitySystemLinks[secKey] || [];
    setPendingDeleteSector({
      key: secKey,
      name: sec.name,
      code: sec.code || secKey,
      linkedSystems
    });
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!pendingDeleteSector) return;

    if (pendingDeleteSector.linkedSystems.length > 0) {
      setPendingDeleteSector(null);
      return;
    }

    const deleteKey = pendingDeleteSector.key;
    const deleteName = pendingDeleteSector.name;

    onDeleteSector(deleteKey);
    setPendingDeleteSector(null);
    setAlertFeedback({
      type: 'info',
      text: isRtl
        ? `تمت إزالة [${deleteName}] من دليل الجهات والقطاعات بنجاح.`
        : `Entity [${deleteName}] removed successfully.`
    });
  };

  return (
    <div
      className="entities-management-console"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        width: '100%',
        padding: '0.85rem 1.25rem',
        boxSizing: 'border-box'
      }}
    >
      {/* Inline Feedback Banner */}
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

      {/* ── 1. Ultra-Compact KPI & Quick Filter Pills Strip ── */}
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
        {/* Left: Stats Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', fontSize: '0.74rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ color: 'var(--text-dim, #94a3b8)' }}>{isRtl ? 'إجمالي الجهات والقطاعات:' : 'Total Entities:'}</span>
            <span style={{ fontWeight: 800, color: '#ffffff' }}>{stats.total}</span>
          </div>

          <div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.1)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ color: '#34d399' }}>● {isRtl ? 'جهات متكاملة بأنظمة:' : 'Integrated:'}</span>
            <span style={{ fontWeight: 800, color: '#10b981' }}>{stats.linked}</span>
          </div>

          <div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.1)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ color: 'var(--text-dim, #64748b)' }}>○ {isRtl ? 'جهات غير مرتبطة:' : 'Standalone:'}</span>
            <span style={{ fontWeight: 700, color: 'var(--text-dim, #94a3b8)' }}>{stats.standalone}</span>
          </div>
        </div>

        {/* Right: Quick Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {[
            { id: 'ALL' as EntityFilterType, label: isRtl ? 'الكل' : 'All' },
            { id: 'LINKED' as EntityFilterType, label: isRtl ? 'المرتبطة' : 'Linked' },
            { id: 'STANDALONE' as EntityFilterType, label: isRtl ? 'غير مرتبطة' : 'Standalone' }
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
            placeholder={isRtl ? 'بحث باسم الجهة أو الكود السيادي...' : 'Search entity name or code...'}
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

        {/* Action Button: + Add Entity */}
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
          <span>{isRtl ? 'تسجيل جهة جديدة' : 'New Entity'}</span>
        </button>
      </div>

      {/* ── 3. High-Density Central Entities Table (100% Width) ── */}
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
              <th style={{ padding: '0.65rem 0.85rem' }}>{isRtl ? 'الجهة / القطاع الشريك' : 'Partner Entity / Sector'}</th>
              <th style={{ padding: '0.65rem 0.85rem' }}>{isRtl ? 'الكود السيادي' : 'Entity Code'}</th>
              <th style={{ padding: '0.65rem 0.85rem' }}>{isRtl ? 'الأنظمة المتكاملة معها' : 'Integrated Systems'}</th>
              <th style={{ padding: '0.65rem 0.85rem' }}>{isRtl ? 'إجمالي الارتباطات' : 'Links Count'}</th>
              <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>{isRtl ? 'الإجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredSectors.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: '3rem 1rem',
                    textAlign: 'center',
                    color: 'var(--text-dim, #64748b)',
                    fontSize: '0.82rem'
                  }}
                >
                  {isRtl ? 'لا توجد جهات أو قطاعات تطابق معايير البحث والفلترة.' : 'No entities match criteria.'}
                </td>
              </tr>
            ) : (
              filteredSectors.map(([secKey, sec]) => {
                const localizedName = getLocalized({ ar: sec.name, en: sec.nameEn }, sec.name);
                const linkedSystems = entitySystemLinks[secKey] || [];
                const isLinked = linkedSystems.length > 0;

                return (
                  <tr
                    key={secKey}
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
                    {/* Entity Name + Icon */}
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '5px',
                            background: 'rgba(56, 189, 248, 0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#38bdf8',
                            flexShrink: 0
                          }}
                        >
                          <Building2 size={15} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.82rem' }}>
                            {localizedName}
                          </div>
                          {sec.nameEn && sec.nameEn !== sec.name && (
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim, #94a3b8)' }}>
                              {sec.nameEn}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Sovereign Code */}
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontFamily: 'monospace',
                          background: 'rgba(99, 102, 241, 0.1)',
                          color: '#a5b4fc',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          border: '1px solid rgba(99, 102, 241, 0.25)',
                          fontWeight: 700
                        }}
                      >
                        {sec.code || `SEC_${secKey.toUpperCase()}`}
                      </span>
                    </td>

                    {/* Integrated Systems Badges */}
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      {!isLinked ? (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim, #64748b)' }}>
                          {isRtl ? 'جهة مستقلة (غير مرتبطة بنظام بعد)' : 'Standalone (Unlinked)'}
                        </span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                          {linkedSystems.map((sysName, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '0.68rem',
                                background: 'rgba(16, 185, 129, 0.1)',
                                color: '#34d399',
                                padding: '0.12rem 0.45rem',
                                borderRadius: '3px',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <Layers size={10} />
                              <span>{sysName}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Link Count */}
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          background: isLinked ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                          color: isLinked ? '#38bdf8' : 'var(--text-dim, #94a3b8)'
                        }}
                      >
                        {linkedSystems.length} {isRtl ? 'أنظمة' : 'systems'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(secKey, sec)}
                          title={isRtl ? 'تعديل بيانات الجهة' : 'Edit Entity'}
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

                        {/* Delete Button (Governance Protected) */}
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(secKey, sec)}
                          title={isLinked ? (isRtl ? 'محمي بالحوكمة (مرتبط بأنظمة)' : 'Protected (Linked)') : (isRtl ? 'حذف الجهة' : 'Delete')}
                          style={{
                            padding: '0.28rem 0.5rem',
                            borderRadius: '4px',
                            border: `1px solid ${isLinked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.3)'}`,
                            background: isLinked ? 'rgba(239, 68, 68, 0.04)' : 'rgba(239, 68, 68, 0.1)',
                            color: isLinked ? '#94a3b8' : '#f87171',
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

      {/* ── Modal: Add / Edit Entity ── */}
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
              maxWidth: '480px',
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
                <Building2 size={16} style={{ color: '#38bdf8' }} />
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                  {editingSectorKey
                    ? (isRtl ? 'تعديل بيانات الجهة أو القطاع' : 'Edit Entity / Sector')
                    : (isRtl ? 'تسجيل جهة أو قطاع جديد' : 'New Entity / Sector')}
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
            <form onSubmit={handleSaveSector} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ fontSize: '0.74rem', color: '#cbd5e1', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  {isRtl ? 'اسم القطاع أو الجهة بالعربية' : 'Entity Name (Arabic)'} <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={isRtl ? 'مثال: البنوك والمصارف المركزية، مصلحة الجمارك' : 'e.g. Central Banks, Customs'}
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
                  {isRtl ? 'اسم القطاع أو الجهة بالإنجليزية' : 'Entity Name (English)'}
                </label>
                <input
                  type="text"
                  placeholder={isRtl ? 'مثال: Central Banks, Customs Authority' : 'e.g. Central Banks, Customs'}
                  value={formNameEn}
                  onChange={e => {
                    const val = e.target.value;
                    setFormNameEn(val);
                    if (!editingSectorKey && (!formCode || formCode.startsWith('SEC_'))) {
                      const cleanSlug = val.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/^_+|_+$/g, '');
                      setFormCode(cleanSlug ? `SEC_${cleanSlug}` : '');
                    }
                  }}
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
                  {isRtl ? 'الكود التعريفي السيادي' : 'Entity Sovereign Code'} <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="SEC_CUSTOMS"
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
                    color: '#a5b4fc',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Action Buttons */}
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
                  {editingSectorKey ? (isRtl ? 'حفظ التعديلات' : 'Save Changes') : (isRtl ? 'تسجيل الجهة' : 'Create Entity')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Governance Delete Modal ── */}
      {pendingDeleteSector && (
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
          onClick={() => setPendingDeleteSector(null)}
        >
          <div
            style={{
              background: 'var(--surface, #1e293b)',
              border: `1px solid ${pendingDeleteSector.linkedSystems.length > 0 ? '#ef4444' : 'rgba(255, 255, 255, 0.15)'}`,
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
                    background: pendingDeleteSector.linkedSystems.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: pendingDeleteSector.linkedSystems.length > 0 ? '#ef4444' : '#f59e0b',
                    flexShrink: 0
                  }}
                >
                  {pendingDeleteSector.linkedSystems.length > 0 ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
                </div>

                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                    {pendingDeleteSector.linkedSystems.length > 0
                      ? (isRtl ? 'حظر حوكمة: لا يمكن حذف هذه الجهة' : 'Governance Block: Cannot Delete Entity')
                      : (isRtl ? 'تأكيد حذف الجهة' : 'Confirm Entity Deletion')}
                  </h4>

                  {pendingDeleteSector.linkedSystems.length > 0 ? (
                    <div style={{ fontSize: '0.78rem', color: '#fca5a5', lineHeight: '1.5' }}>
                      {isRtl
                        ? `الجهة [${pendingDeleteSector.name}] مرتبطة حالياً بـ (${pendingDeleteSector.linkedSystems.length}) أنظمة مركزية. يمنع النظام حذف أي جهة لها تكاملات مع أنظمة مفعلة تفادياً لتعطيل الوثائق والخدمات المربوطة.`
                        : `Entity [${pendingDeleteSector.name}] is currently integrated with (${pendingDeleteSector.linkedSystems.length}) systems. It cannot be deleted.`}
                      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {pendingDeleteSector.linkedSystems.map((sName, idx) => (
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
                            {sName}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                      {isRtl
                        ? `هل أنت متأكد من رغبتك في حذف الجهة [${pendingDeleteSector.name}] (${pendingDeleteSector.code}) نهائياً من الدليل؟`
                        : `Are you sure you want to permanently delete entity [${pendingDeleteSector.name}] (${pendingDeleteSector.code})?`}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setPendingDeleteSector(null)}
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
                  {pendingDeleteSector.linkedSystems.length > 0 ? (isRtl ? 'حسناً، فهمت' : 'Understood') : (isRtl ? 'إلغاء' : 'Cancel')}
                </button>

                {pendingDeleteSector.linkedSystems.length === 0 && (
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
                    {isRtl ? 'تأكيد الحذف' : 'Confirm Delete'}
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
