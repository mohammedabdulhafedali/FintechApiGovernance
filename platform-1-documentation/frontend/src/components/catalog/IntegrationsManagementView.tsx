import React, { useState, useMemo } from 'react';
import {
  Link2,
  Plus,
  Search,
  Trash2,
  ExternalLink,
  Layers,
  Building2,
  FileCheck2,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  X,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { SystemModule, Sector, SystemIntegration, IntegrationDirection } from '../../types/schema';
import { docGovernanceEngine } from '../../services/docGovernanceEngine';
import { useLanguage } from '../../i18n';

export interface IntegrationsManagementViewProps {
  systems: Record<string, SystemModule>;
  sectors: Record<string, Sector>;
  onAddIntegration: (systemKey: string, integration: SystemIntegration) => void;
  onDeleteIntegration: (systemKey: string, entityId: string) => void;
  onSelectSystemIntegration?: (systemKey: string, integrationKey: string) => void;
  onNavigateToEditor?: (systemKey: string, integrationKey: string) => void;
}

type DirectionFilterType = 'ALL' | 'CONSUMER' | 'PROVIDER' | 'DOCUMENTED';

interface IntegrationFlatItem {
  systemKey: string;
  systemName: string;
  systemCode: string;
  entityId: string;
  entityName: string;
  entityCode: string;
  role: 'CONSUMER' | 'PROVIDER';
  direction: IntegrationDirection;
  endpointsCount: number;
  linkedDocTitle?: string;
  linkedDocVersion?: string;
  hasDocument: boolean;
}

export const IntegrationsManagementView: React.FC<IntegrationsManagementViewProps> = ({
  systems,
  sectors,
  onAddIntegration,
  onDeleteIntegration,
  onSelectSystemIntegration,
  onNavigateToEditor
}) => {
  const { isRtl, getLocalized } = useLanguage();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState<DirectionFilterType>('ALL');
  const [systemFilter, setSystemFilter] = useState<string>('ALL');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [pendingUnlinkItem, setPendingUnlinkItem] = useState<IntegrationFlatItem | null>(null);

  // Form States for New Integration (Strictly Document-Driven)
  const [selectedSysKey, setSelectedSysKey] = useState<string>('');
  const [selectedEntityKey, setSelectedEntityKey] = useState<string>('');
  const [selectedDirection, setSelectedDirection] = useState<'INBOUND' | 'OUTBOUND'>('INBOUND');
  const [selectedRole, setSelectedRole] = useState<'CONSUMER' | 'PROVIDER'>('CONSUMER');
  const [selectedDocKey, setSelectedDocKey] = useState<string>('');
  const [formValidationError, setFormValidationError] = useState<string | null>(null);

  // Inline Feedback Banner
  const [alertFeedback, setAlertFeedback] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);

  // Flatten all integrations across all systems
  const flatIntegrations = useMemo<IntegrationFlatItem[]>(() => {
    const list: IntegrationFlatItem[] = [];

    Object.entries(systems).forEach(([sysKey, sys]) => {
      const integrations = sys.integrations || {};
      Object.entries(integrations).forEach(([intKey, intObj]) => {
        const sec = sectors[intKey];
        const entityName = sec ? getLocalized({ ar: sec.name, en: sec.nameEn }, sec.name) : (intObj.name || intKey);
        const entityCode = sec?.code || intObj.code || `SEC_${intKey.toUpperCase()}`;
        const hasDoc = !!(intObj.docTitle || intObj.docVersion || (intObj.endpoints && intObj.endpoints.length > 0));
        const role: 'CONSUMER' | 'PROVIDER' = intObj.role || (intObj.direction === 'OUTBOUND' ? 'PROVIDER' : 'CONSUMER');

        list.push({
          systemKey: sysKey,
          systemName: getLocalized({ ar: sys.name, en: sys.nameEn }, sys.name),
          systemCode: sys.code || `SYS_${sysKey.toUpperCase()}`,
          entityId: intKey,
          entityName,
          entityCode,
          role,
          direction: intObj.direction || (role === 'PROVIDER' ? 'OUTBOUND' : 'INBOUND'),
          endpointsCount: intObj.endpoints ? intObj.endpoints.length : 0,
          linkedDocTitle: intObj.docTitle,
          linkedDocVersion: intObj.docVersion,
          hasDocument: hasDoc
        });
      });
    });

    return list;
  }, [systems, sectors, getLocalized]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const total = flatIntegrations.length;
    let consumerCount = 0;
    let providerCount = 0;
    let documented = 0;

    flatIntegrations.forEach(item => {
      if (item.role === 'PROVIDER') providerCount++;
      else consumerCount++;

      if (item.hasDocument) documented++;
    });

    return { total, consumerCount, providerCount, documented };
  }, [flatIntegrations]);

  // Filtered List
  const filteredIntegrations = useMemo(() => {
    return flatIntegrations.filter(item => {
      // System Filter
      if (systemFilter !== 'ALL' && item.systemKey !== systemFilter) return false;

      // Role / Status Filter
      if (directionFilter === 'CONSUMER' && item.role !== 'CONSUMER') return false;
      if (directionFilter === 'PROVIDER' && item.role !== 'PROVIDER') return false;
      if (directionFilter === 'DOCUMENTED' && !item.hasDocument) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchSys = item.systemName.toLowerCase().includes(q) || item.systemCode.toLowerCase().includes(q);
        const matchEnt = item.entityName.toLowerCase().includes(q) || item.entityCode.toLowerCase().includes(q);
        const matchDoc = (item.linkedDocTitle || '').toLowerCase().includes(q);
        return matchSys || matchEnt || matchDoc;
      }

      return true;
    });
  }, [flatIntegrations, systemFilter, directionFilter, searchQuery]);

  // Available Documents from Governance Engine for linking
  const availableDocContainers = useMemo(() => {
    return docGovernanceEngine.getContainersMatrix(systems);
  }, [systems]);

  // Certified & Approved Documents only (Gate condition: must have currentApprovedVersion!)
  const approvedDocsForLinking = useMemo(() => {
    return availableDocContainers.filter(c => !!c.currentApprovedVersion);
  }, [availableDocContainers]);

  // Handle Document Selection in Modal (Auto-fill and lock System, Entity, and Role)
  const handleDocSelectionChange = (docKey: string) => {
    setSelectedDocKey(docKey);
    setFormValidationError(null);
    if (!docKey) {
      setSelectedSysKey('');
      setSelectedEntityKey('');
      setSelectedRole('CONSUMER');
      setSelectedDirection('INBOUND');
      return;
    }
    const doc = approvedDocsForLinking.find(c => c.documentKey === docKey);
    if (doc) {
      setSelectedSysKey(doc.systemKey);
      setSelectedEntityKey(doc.integrationKey);
      const role = doc.role || 'CONSUMER';
      setSelectedRole(role);
      setSelectedDirection(role === 'PROVIDER' ? 'OUTBOUND' : 'INBOUND');
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const unlinkedApproved = approvedDocsForLinking.find(c => !c.isLinked);
    if (unlinkedApproved) {
      setSelectedDocKey(unlinkedApproved.documentKey);
      setSelectedSysKey(unlinkedApproved.systemKey);
      setSelectedEntityKey(unlinkedApproved.integrationKey);
      const role = unlinkedApproved.role || 'CONSUMER';
      setSelectedRole(role);
      setSelectedDirection(role === 'PROVIDER' ? 'OUTBOUND' : 'INBOUND');
    } else {
      setSelectedDocKey('');
      setSelectedSysKey('');
      setSelectedEntityKey('');
      setSelectedRole('CONSUMER');
      setSelectedDirection('INBOUND');
    }
    setFormValidationError(null);
    setIsCreateModalOpen(true);
  };

  // Submit New Integration Form (Strictly requires Approved Document)
  const handleConfirmAddIntegration = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDocKey) {
      setFormValidationError(
        isRtl 
          ? 'شرط حوكمة إلزامي: لا يمكن تأسيس الربط إلا باختيار وثيقة معتمدة وموجودة بالفعل!' 
          : 'Strict governance rule: An approved document is required.'
      );
      return;
    }

    const selectedContainer = approvedDocsForLinking.find(c => c.documentKey === selectedDocKey);
    if (!selectedContainer || !selectedContainer.currentApprovedVersion) {
      setFormValidationError(isRtl ? 'الوثيقة المختارة غير معتمدة أو غير موجودة.' : 'Selected document is not approved.');
      return;
    }

    const sysKey = selectedContainer.systemKey;
    const entityKey = selectedContainer.integrationKey;
    const currentSys = systems[sysKey];

    if (!currentSys) {
      setFormValidationError(isRtl ? 'النظام التابع للوثيقة غير مسجل بالمنظومة.' : 'Target system not found.');
      return;
    }

    // Strict 1-to-1 rule: Same system and same entity can only have ONE integration link!
    if (currentSys.integrations && currentSys.integrations[entityKey]) {
      setFormValidationError(
        isRtl
          ? `عفواً، تم تأسيس ربط مسبقاً بين [${currentSys.name}] و [${selectedContainer.integrationName}]! لا يمكن إنشاء أكثر من ربط واحد لنفس النظام والجهة.`
          : 'Selected entity is already integrated with this system!'
      );
      return;
    }

    const secObj = sectors[entityKey];
    const entityName = secObj ? secObj.name : selectedContainer.integrationName;
    const entityNameEn = secObj?.nameEn || selectedContainer.integrationName;
    const entityCode = secObj?.code || selectedContainer.integrationCode || `SEC_${entityKey.toUpperCase()}`;

    let associatedEndpoints: any[] = [];
    const linkedDocVersion = selectedContainer.currentApprovedVersion.versionNumber;
    const linkedDocTitle = `${selectedContainer.systemName} ⟷ ${selectedContainer.integrationName}`;

    if (selectedContainer.currentApprovedVersion.payloadSnapshot) {
      try {
        const parsed = typeof selectedContainer.currentApprovedVersion.payloadSnapshot === 'string'
          ? JSON.parse(selectedContainer.currentApprovedVersion.payloadSnapshot)
          : selectedContainer.currentApprovedVersion.payloadSnapshot;
        if (Array.isArray(parsed)) associatedEndpoints = parsed;
      } catch {}
    }

    const docRole: 'CONSUMER' | 'PROVIDER' = selectedContainer.role || (selectedDirection === 'OUTBOUND' ? 'PROVIDER' : 'CONSUMER');

    const newIntegration: SystemIntegration = {
      entityId: entityKey,
      name: entityName,
      nameEn: entityNameEn,
      code: entityCode,
      role: docRole,
      direction: docRole === 'PROVIDER' ? 'OUTBOUND' : 'INBOUND',
      endpoints: associatedEndpoints,
      docVersion: linkedDocVersion,
      docTitle: linkedDocTitle
    };

    onAddIntegration(sysKey, newIntegration);

    setAlertFeedback({
      type: 'success',
      text: isRtl
        ? `تم تأسيس الربط بنجاح بين [${currentSys.name}] و [${entityName}] موثقاً بالوثيقة المعتمدة (${linkedDocVersion}) كـ (${docRole === 'PROVIDER' ? 'مزود' : 'مستهلك'}).`
        : `Integration between [${currentSys.name}] and [${entityName}] created successfully.`
    });

    setIsCreateModalOpen(false);
  };

  // Confirm Unlink
  const handleConfirmUnlink = () => {
    if (!pendingUnlinkItem) return;

    onDeleteIntegration(pendingUnlinkItem.systemKey, pendingUnlinkItem.entityId);

    setAlertFeedback({
      type: 'info',
      text: isRtl
        ? `تم فك ارتباط [${pendingUnlinkItem.entityName}] من النظام [${pendingUnlinkItem.systemName}] بنجاح.`
        : `Unlinked [${pendingUnlinkItem.entityName}] from [${pendingUnlinkItem.systemName}].`
    });

    setPendingUnlinkItem(null);
  };

  return (
    <div
      className="integrations-management-console"
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
            <span style={{ color: 'var(--text-dim, #94a3b8)' }}>{isRtl ? 'إجمالي مسارات الربط:' : 'Total Links:'}</span>
            <span style={{ fontWeight: 800, color: '#ffffff' }}>{stats.total}</span>
          </div>

          <div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.1)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ color: '#38bdf8' }}>● {isRtl ? 'مستهلك (Consumer):' : 'Consumer:'}</span>
            <span style={{ fontWeight: 800, color: '#38bdf8' }}>{stats.consumerCount}</span>
          </div>

          <div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.1)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ color: '#c084fc' }}>● {isRtl ? 'مزود (Provider):' : 'Provider:'}</span>
            <span style={{ fontWeight: 800, color: '#c084fc' }}>{stats.providerCount}</span>
          </div>

          <div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.1)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ color: '#34d399' }}>● {isRtl ? 'موثقة بـ API:' : 'Documented:'}</span>
            <span style={{ fontWeight: 800, color: '#10b981' }}>{stats.documented}</span>
          </div>
        </div>

        {/* Right: Quick Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {[
            { id: 'ALL' as DirectionFilterType, label: isRtl ? 'الكل' : 'All' },
            { id: 'CONSUMER' as DirectionFilterType, label: isRtl ? 'مستهلك' : 'Consumer' },
            { id: 'PROVIDER' as DirectionFilterType, label: isRtl ? 'مزود' : 'Provider' },
            { id: 'DOCUMENTED' as DirectionFilterType, label: isRtl ? 'موثقة بـ API' : 'Documented' }
          ].map(p => {
            const isActive = directionFilter === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setDirectionFilter(p.id)}
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

      {/* ── 2. Compact Search & Filter Toolbar Strip ── */}
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
        {/* Left Side: Search + Dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
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
              placeholder={isRtl ? 'بحث بالنظام، الجهة، أو الوثيقة...' : 'Search system, entity, doc...'}
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

          {/* System Filter Dropdown */}
          <select
            value={systemFilter}
            onChange={e => setSystemFilter(e.target.value)}
            style={{
              padding: '0.38rem 0.65rem',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: '#0f172a',
              color: '#ffffff',
              fontSize: '0.76rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">{isRtl ? 'كافة الأنظمة المركزية' : 'All Systems'}</option>
            {Object.entries(systems).map(([sKey, sMod]) => (
              <option key={sKey} value={sKey}>
                {sMod.name}
              </option>
            ))}
          </select>
        </div>

        {/* Right Side: + Add Integration */}
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
          <span>{isRtl ? 'تأسيس ربط وتكامل جديد' : 'New Integration'}</span>
        </button>
      </div>

      {/* ── 3. High-Density Central Integrations Matrix Table (100% Width) ── */}
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
              <th style={{ padding: '0.65rem 0.85rem' }}>{isRtl ? 'جهة التكامل الشريكة' : 'Partner Entity'}</th>
              <th style={{ padding: '0.65rem 0.85rem' }}>{isRtl ? 'مسار واتجاه الربط' : 'Link Direction'}</th>
              <th style={{ padding: '0.65rem 0.85rem' }}>{isRtl ? 'وثيقة الـ API المعتمدة' : 'Certified API Document'}</th>
              <th style={{ padding: '0.65rem 0.85rem' }}>{isRtl ? 'الـ Endpoints' : 'Endpoints'}</th>
              <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>{isRtl ? 'الإجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredIntegrations.length === 0 ? (
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
                  {isRtl ? 'لا توجد مسارات ربط وتكامل تطابق معايير البحث والفلترة.' : 'No integrations match filter criteria.'}
                </td>
              </tr>
            ) : (
              filteredIntegrations.map((item, idx) => {
                const isOutbound = item.direction === 'OUTBOUND';

                return (
                  <tr
                    key={`${item.systemKey}-${item.entityId}-${idx}`}
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
                    {/* Core System */}
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Layers size={14} style={{ color: '#818cf8', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.82rem' }}>
                            {item.systemName}
                          </div>
                          <span
                            style={{
                              fontSize: '0.66rem',
                              fontFamily: 'monospace',
                              color: 'var(--text-dim, #94a3b8)'
                            }}
                          >
                            {item.systemCode}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Partner Entity */}
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Building2 size={14} style={{ color: '#38bdf8', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.82rem' }}>
                            {item.entityName}
                          </div>
                          <span
                            style={{
                              fontSize: '0.66rem',
                              fontFamily: 'monospace',
                              color: 'var(--text-dim, #94a3b8)'
                            }}
                          >
                            {item.entityCode}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Direction */}
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background: isOutbound ? 'rgba(192, 132, 252, 0.12)' : 'rgba(56, 189, 248, 0.12)',
                          color: isOutbound ? '#c084fc' : '#38bdf8',
                          border: `1px solid ${isOutbound ? 'rgba(192, 132, 252, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`
                        }}
                      >
                        {isOutbound ? <ArrowUpRight size={11} /> : <ArrowDownLeft size={11} />}
                        <span>
                          {isOutbound
                            ? (isRtl ? 'صادر من النظام (Outbound)' : 'Outbound')
                            : (isRtl ? 'وارد للنظام (Inbound)' : 'Inbound')}
                        </span>
                      </span>
                    </td>

                    {/* Certified API Document */}
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      {item.linkedDocVersion ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <FileCheck2 size={13} style={{ color: '#34d399' }} />
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              background: 'rgba(16, 185, 129, 0.1)',
                              color: '#34d399',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '3px'
                            }}
                          >
                            {item.linkedDocVersion}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim, #64748b)' }}>
                          {isRtl ? 'مسودة محلية (غير معتمدة)' : 'Draft / Unversioned'}
                        </span>
                      )}
                    </td>

                    {/* Endpoints Count */}
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.12rem 0.45rem',
                          borderRadius: '999px',
                          background: item.endpointsCount > 0 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                          color: item.endpointsCount > 0 ? '#ffffff' : 'var(--text-dim, #64748b)'
                        }}
                      >
                        {item.endpointsCount} {isRtl ? 'واجهات' : 'endpoints'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        {/* Inspect / View Doc */}
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectSystemIntegration) {
                              onSelectSystemIntegration(item.systemKey, item.entityId);
                            }
                          }}
                          title={isRtl ? 'استعراض وثيقة التكامل' : 'View Integration Document'}
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
                          <ExternalLink size={12} />
                          <span>{isRtl ? 'معاينة' : 'Inspect'}</span>
                        </button>

                        {/* Unlink Button */}
                        <button
                          type="button"
                          onClick={() => setPendingUnlinkItem(item)}
                          title={isRtl ? 'فك ارتباط الجهة من النظام' : 'Unlink Entity'}
                          style={{
                            padding: '0.28rem 0.5rem',
                            borderRadius: '4px',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            background: 'rgba(239, 68, 68, 0.08)',
                            color: '#f87171',
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

      {/* ── Modal: Create New Integration ── */}
      {isCreateModalOpen && (
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
          onClick={() => setIsCreateModalOpen(false)}
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
                <Link2 size={16} style={{ color: '#38bdf8' }} />
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                  {isRtl ? 'تأسيس ربط وتكامل معماري جديد' : 'New Architectural Integration'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConfirmAddIntegration} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {formValidationError && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid #ef4444',
                    color: '#fca5a5',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '4px',
                    fontSize: '0.78rem'
                  }}
                >
                  {formValidationError}
                </div>
              )}

              {/* Field 1: Choose Approved Document (Mandatory Driver) */}
              <div>
                <label style={{ fontSize: '0.74rem', color: '#cbd5e1', display: 'block', marginBottom: '0.35rem', fontWeight: 700 }}>
                  {isRtl ? '1. اختر الوثيقة المعتمدة (شرط إلزامي للربط)' : '1. Select Approved API Document (Mandatory)'} <span style={{ color: '#f87171' }}>*</span>
                </label>
                
                {approvedDocsForLinking.length === 0 ? (
                  <div style={{
                    padding: '0.75rem',
                    borderRadius: '6px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    color: '#fbbf24',
                    fontSize: '0.75rem',
                    lineHeight: '1.5'
                  }}>
                    ⚠️ {isRtl 
                      ? 'لا توجد وثائق معتمدة جاهزة للربط حالياً! قواعد الحوكمة تفرض إنشاء الوثيقة أولاً في (مركز إدارة الوثائق) ورفع الواجهات واعتمادها رسمياً قبل الربط.' 
                      : 'No approved documents available! You must create and approve an API document first.'}
                  </div>
                ) : (
                  <select
                    required
                    value={selectedDocKey}
                    onChange={e => handleDocSelectionChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.7rem',
                      fontSize: '0.8rem',
                      background: '#0f172a',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '4px',
                      color: '#ffffff',
                      outline: 'none',
                      cursor: 'pointer',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">{isRtl ? '-- اختر وثيقة معتمدة لتأسيس الربط بموجبها --' : '-- Select an Approved Document --'}</option>
                    {approvedDocsForLinking.map(c => (
                      <option key={c.documentKey} value={c.documentKey}>
                        {c.systemName} ⟷ {c.integrationName} | {c.role === 'PROVIDER' ? (isRtl ? 'مزود' : 'Provider') : (isRtl ? 'مستهلك' : 'Consumer')} | ({c.currentApprovedVersion?.versionNumber}) {c.isLinked ? (isRtl ? '[مرتبطة مسبقاً]' : '[Linked]') : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Readonly & Locked Specifications of the Selected Document */}
              {selectedDocKey && (() => {
                const doc = approvedDocsForLinking.find(c => c.documentKey === selectedDocKey);
                if (!doc) return null;
                const isAlreadyIntegrated = !!(systems[doc.systemKey]?.integrations?.[doc.integrationKey]);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* Duplicate Warning */}
                    {isAlreadyIntegrated && (
                      <div style={{
                        padding: '0.65rem 0.8rem',
                        borderRadius: '6px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid #ef4444',
                        color: '#fca5a5',
                        fontSize: '0.76rem',
                        lineHeight: '1.4'
                      }}>
                        ⛔ {isRtl
                          ? `عفواً، يوجد ربط قائم مسبقاً بين [${doc.systemName}] و [${doc.integrationName}]! تمنع قواعد الحوكمة تكرار الربط لنفس النظام والجهة.`
                          : 'A link already exists for this system and entity! Only 1 link is permitted.'}
                      </div>
                    )}

                    {/* Auto-filled details card */}
                    <div style={{
                      padding: '0.85rem',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.65rem',
                      fontSize: '0.76rem'
                    }}>
                      <div>
                        <span style={{ color: 'var(--text-dim, #94a3b8)', display: 'block', fontSize: '0.68rem' }}>{isRtl ? 'النظام المركزي:' : 'System:'}</span>
                        <strong style={{ color: '#ffffff' }}>{doc.systemName}</strong> <code style={{ fontSize: '0.66rem', color: '#94a3b8' }}>({doc.systemCode})</code>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-dim, #94a3b8)', display: 'block', fontSize: '0.68rem' }}>{isRtl ? 'الجهة الشريكة:' : 'Partner Entity:'}</span>
                        <strong style={{ color: '#ffffff' }}>{doc.integrationName}</strong> <code style={{ fontSize: '0.66rem', color: '#94a3b8' }}>({doc.integrationCode})</code>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-dim, #94a3b8)', display: 'block', fontSize: '0.68rem' }}>{isRtl ? 'الدور المعماري المعتمد:' : 'Architectural Role:'}</span>
                        <span style={{
                          padding: '0.12rem 0.45rem',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: doc.role === 'PROVIDER' ? 'rgba(192, 132, 252, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                          color: doc.role === 'PROVIDER' ? '#c084fc' : '#38bdf8'
                        }}>
                          {doc.role === 'PROVIDER' ? (isRtl ? 'مزود (Provider)' : 'Provider') : (isRtl ? 'مستهلك (Consumer)' : 'Consumer')}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-dim, #94a3b8)', display: 'block', fontSize: '0.68rem' }}>{isRtl ? 'الإصدار المعتمد النافذ:' : 'Approved Version:'}</span>
                        <span style={{ color: '#34d399', fontWeight: 800 }}>{doc.currentApprovedVersion?.versionNumber}</span>
                        <span style={{ color: 'var(--text-dim, #94a3b8)', fontSize: '0.68rem', marginRight: '0.4rem', marginLeft: '0.4rem' }}>
                          ({doc.currentApprovedVersion?.endpointsCount || 0} {isRtl ? 'واجهات' : 'endpoints'})
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
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
                  disabled={
                    !selectedDocKey ||
                    (selectedDocKey && !!(systems[selectedSysKey]?.integrations?.[selectedEntityKey]))
                  }
                  style={{
                    padding: '0.4rem 1.15rem',
                    borderRadius: '4px',
                    border: 'none',
                    background: (
                      !selectedDocKey ||
                      (selectedDocKey && !!(systems[selectedSysKey]?.integrations?.[selectedEntityKey]))
                    ) ? 'rgba(255, 255, 255, 0.1)' : 'var(--primary, #6366f1)',
                    color: (
                      !selectedDocKey ||
                      (selectedDocKey && !!(systems[selectedSysKey]?.integrations?.[selectedEntityKey]))
                    ) ? '#64748b' : '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: (
                      !selectedDocKey ||
                      (selectedDocKey && !!(systems[selectedSysKey]?.integrations?.[selectedEntityKey]))
                    ) ? 'not-allowed' : 'pointer',
                    boxShadow: (
                      !selectedDocKey ||
                      (selectedDocKey && !!(systems[selectedSysKey]?.integrations?.[selectedEntityKey]))
                    ) ? 'none' : '0 2px 10px var(--primary-glow, rgba(99, 102, 241, 0.35))'
                  }}
                >
                  {isRtl ? 'تأكيد وتأسيس الربط بالوثيقة' : 'Confirm Integration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Governance Unlink Confirmation Modal ── */}
      {pendingUnlinkItem && (
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
          onClick={() => setPendingUnlinkItem(null)}
        >
          <div
            style={{
              background: 'var(--surface, #1e293b)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
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
                    background: 'rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ef4444',
                    flexShrink: 0
                  }}
                >
                  <AlertTriangle size={20} />
                </div>

                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                    {isRtl ? 'تأكيد فك ارتباط وتكامل الجهة' : 'Confirm Entity Unlink'}
                  </h4>

                  <div style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                    {isRtl ? (
                      <>
                        هل أنت متأكد من فك ارتباط الجهة [<strong>{pendingUnlinkItem.entityName}</strong>] من النظام [<strong>{pendingUnlinkItem.systemName}</strong>]؟
                        {pendingUnlinkItem.endpointsCount > 0 && (
                          <div style={{ marginTop: '0.5rem', color: '#fca5a5' }}>
                            ⚠️ سيتم فصل ({pendingUnlinkItem.endpointsCount}) واجهات برمجية مرتبطة بهذا التكامل.
                          </div>
                        )}
                      </>
                    ) : (
                      `Are you sure you want to unlink [${pendingUnlinkItem.entityName}] from [${pendingUnlinkItem.systemName}]?`
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setPendingUnlinkItem(null)}
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
                  type="button"
                  onClick={handleConfirmUnlink}
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
                  {isRtl ? 'تأكيد فك الارتباط' : 'Confirm Unlink'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
