import React, { useState, useMemo } from 'react';
import { 
  GitBranch, 
  CheckCircle2, 
  Clock, 
  Plus, 
  History, 
  Send, 
  Trash2, 
  Search, 
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Edit3,
  ExternalLink,
  Lock,
  Layers,
  FileCheck2,
  FileText
} from 'lucide-react';
import { SystemModule } from '../../types/schema';
import { 
  SystemEntityDocContainer, 
  DocVersionRecord, 
  VersionBumpType 
} from '../../types/docGovernance';
import { docGovernanceEngine } from '../../services/docGovernanceEngine';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../../i18n';

interface DocumentMatrixViewProps {
  systems: Record<string, SystemModule>;
  onNavigateToDoc?: (systemKey: string, integrationKey: string) => void;
  onNavigateToEditor?: (systemKey: string, integrationKey: string) => void;
  onNotify?: (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
  onOpenInboxItem?: (requestId: string) => void;
}

export type ChangeScopeType = 
  | 'FULL' 
  | 'ENDPOINTS' 
  | 'FIELDS_TABLE' 
  | 'SECURITY_AUTH' 
  | 'OVERVIEW';

export const DocumentMatrixView: React.FC<DocumentMatrixViewProps> = ({
  systems,
  onNavigateToDoc,
  onNavigateToEditor,
  onNotify
}) => {
  const { user, hasPermission } = useAuth();
  const { isRtl } = useLanguage();

  // Navigation mode within matrix: table page vs dedicated full sub-pages
  const [pageMode, setPageMode] = useState<'matrix' | 'bump-page' | 'history-page' | 'init-page'>('matrix');
  const [activeTargetContainer, setActiveTargetContainer] = useState<SystemEntityDocContainer | null>(null);

  // Form states for bump-page
  const [selectedBumpType, setSelectedBumpType] = useState<VersionBumpType>('MINOR');
  const [selectedScope, setSelectedScope] = useState<ChangeScopeType>('FULL');
  const [bumpNotes, setBumpNotes] = useState<string>('');

  // Form state for init-page
  const [initNotes, setInitNotes] = useState<string>('');

  // Refresh trigger for engine data
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const containers = useMemo(() => {
    return docGovernanceEngine.getContainersMatrix(systems);
  }, [systems, refreshTrigger]);

  const refreshData = () => setRefreshTrigger(prev => prev + 1);

  // Filters
  const [selectedSystemFilter, setSelectedSystemFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Permissions
  const canCreate = hasPermission('catalog:endpoint:create') || hasPermission('*') || user?.username === 'admin';
  const canApprove = hasPermission('governance:inbox:approve') || hasPermission('*') || user?.username === 'admin';

  // Filtered list
  const filteredContainers = useMemo(() => {
    return containers.filter(c => {
      if (selectedSystemFilter !== 'ALL' && c.systemKey !== selectedSystemFilter) return false;
      if (selectedStatusFilter === 'APPROVED' && (!c.currentApprovedVersion || c.activeDraftVersion || c.pendingReviewVersion)) return false;
      if (selectedStatusFilter === 'DRAFT' && !c.activeDraftVersion) return false;
      if (selectedStatusFilter === 'UNDER_REVIEW' && !c.pendingReviewVersion) return false;
      if (selectedStatusFilter === 'EMPTY' && (c.currentApprovedVersion || c.activeDraftVersion || c.pendingReviewVersion)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.systemName.toLowerCase().includes(q) || 
          c.systemCode.toLowerCase().includes(q) ||
          c.integrationName.toLowerCase().includes(q) || 
          c.integrationCode.toLowerCase().includes(q) ||
          c.documentKey.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [containers, selectedSystemFilter, selectedStatusFilter, searchQuery]);

  // Aggregate Stats
  const stats = useMemo(() => {
    let total = containers.length;
    let approved = 0;
    let drafts = 0;
    let underReview = 0;
    let empty = 0;

    containers.forEach(c => {
      if (c.pendingReviewVersion) underReview++;
      else if (c.activeDraftVersion) drafts++;
      else if (c.currentApprovedVersion) approved++;
      else empty++;
    });

    return { total, approved, drafts, underReview, empty };
  }, [containers]);

  // Actions
  const handleOpenBumpPage = (c: SystemEntityDocContainer) => {
    setActiveTargetContainer(c);
    setSelectedBumpType('MINOR');
    setSelectedScope('FULL');
    setBumpNotes('');
    setPageMode('bump-page');
  };

  const handleOpenHistoryPage = (c: SystemEntityDocContainer) => {
    setActiveTargetContainer(c);
    setPageMode('history-page');
  };

  const handleOpenInitPage = (c: SystemEntityDocContainer) => {
    setActiveTargetContainer(c);
    setInitNotes('');
    setPageMode('init-page');
  };

  const handleConfirmBump = () => {
    if (!activeTargetContainer) return;

    const res = docGovernanceEngine.openNewDraftVersion({
      systemKey: activeTargetContainer.systemKey,
      integrationKey: activeTargetContainer.integrationKey,
      bumpType: selectedBumpType,
      allowedScope: selectedScope,
      changeSummary: bumpNotes.trim() ? `${bumpNotes.trim()} [نطاق التعديل المصرح: ${selectedScope}]` : `تحديث دوري [نطاق التعديل المصرح: ${selectedScope}]`,
      authorId: user?.id || 'usr_maker',
      authorName: user?.displayName || user?.username || 'محرر الوثائق'
    });

    if (!res.success) {
      if (onNotify) onNotify('تعذر فتح المسودة', res.error || 'فشل التعديل', 'warning');
      return;
    }

    if (onNotify) {
      onNotify(
        'تم فتح مسودة التعديل بنجاح',
        `تم استنساخ الوثيقة وفتح المسودة ${res.draft?.versionNumber} بنطاق التعديل المحدد.`,
        'success'
      );
    }

    const sysKey = activeTargetContainer.systemKey;
    const intKey = activeTargetContainer.integrationKey;
    setPageMode('matrix');
    setActiveTargetContainer(null);
    refreshData();

    if (onNavigateToEditor) {
      onNavigateToEditor(sysKey, intKey);
    }
  };

  const handleConfirmInit = () => {
    if (!activeTargetContainer) return;

    const res = docGovernanceEngine.createInitialDocument({
      systemKey: activeTargetContainer.systemKey,
      integrationKey: activeTargetContainer.integrationKey,
      systemName: activeTargetContainer.systemName,
      systemCode: activeTargetContainer.systemCode,
      integrationName: activeTargetContainer.integrationName,
      integrationCode: activeTargetContainer.integrationCode,
      authorId: user?.id || 'usr_maker',
      authorName: user?.displayName || user?.username || 'محرر الوثائق',
      summary: initNotes
    });

    if (!res.success) {
      if (onNotify) onNotify('تعذر التأسيس', res.error || 'فشل التأسيس', 'warning');
      return;
    }

    if (onNotify) {
      onNotify('تم تأسيس الوثيقة بنجاح', `تم إنشاء الإصدار v1.0.0 للجهة [${activeTargetContainer.integrationName}].`, 'success');
    }

    const sysKey = activeTargetContainer.systemKey;
    const intKey = activeTargetContainer.integrationKey;
    setPageMode('matrix');
    setActiveTargetContainer(null);
    refreshData();

    if (onNavigateToEditor) {
      onNavigateToEditor(sysKey, intKey);
    }
  };

  const handleSubmitForReview = (c: SystemEntityDocContainer) => {
    const res = docGovernanceEngine.submitDraftForReview(c.systemKey, c.integrationKey);
    if (!res.success) {
      if (onNotify) onNotify('تعذر الرفع', res.error || 'فشل الرفع للمراجعة', 'warning');
      return;
    }

    if (onNotify) {
      onNotify(
        'تم الرفع للاعتماد',
        `تم إرسال المسودة ${res.version?.versionNumber} لصندوق المشرفين للاعتماد.`,
        'success'
      );
    }
    refreshData();
  };

  const handleDirectApprove = (c: SystemEntityDocContainer) => {
    const res = docGovernanceEngine.approveVersion({
      systemKey: c.systemKey,
      integrationKey: c.integrationKey,
      approverName: user?.displayName || user?.username || 'المشرف المعتمد'
    });

    if (!res.success) {
      if (onNotify) onNotify('فشل الاعتماد', res.error || 'تعذر الاعتماد', 'error');
      return;
    }

    if (onNotify) {
      onNotify('تم اعتماد الإصدار', `أصبح الإصدار ${res.approvedVersion?.versionNumber} هو المعتمد رسمياً لـ [${c.integrationName}].`, 'success');
    }
    refreshData();
  };

  const handleDiscardDraft = (c: SystemEntityDocContainer) => {
    if (!window.confirm('هل أنت متأكد من إلغاء وحذف هذه المسودة؟ لن تتأثر الوثيقة المعتمدة الحالية.')) return;

    const res = docGovernanceEngine.discardDraft(c.systemKey, c.integrationKey);
    if (!res.success) {
      if (onNotify) onNotify('تعذر الإلغاء', res.error || 'فشل الإلغاء', 'error');
      return;
    }

    if (onNotify) onNotify('تم إلغاء المسودة', 'تم حذف مسودة العمل واستعادة حالة الاستقرار.', 'info');
    refreshData();
  };

  // ═════════════════════════════════════════════════════════════════════
  // SUB-PAGE 1: DEDICATED FULL-PAGE FOR OPENING A NEW VERSION / CR
  // ═════════════════════════════════════════════════════════════════════
  if (pageMode === 'bump-page' && activeTargetContainer) {
    const currentVer = activeTargetContainer.currentApprovedVersion?.versionNumber || 'v1.0.0';
    const nextVer = docGovernanceEngine.calculateNextVersion(currentVer, selectedBumpType);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Top Header & Back Button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1.25rem',
          background: 'var(--surface, #0f172a)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <button
            onClick={() => setPageMode('matrix')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {isRtl ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
            {isRtl ? 'العودة لمصفوفة الوثائق' : 'Back to Matrix'}
          </button>

          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff' }}>
            {isRtl ? 'طلب فتح إصدار تعديلي جديد' : 'New Version Request'}
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)', fontFamily: 'monospace' }}>
            {activeTargetContainer.documentKey}
          </div>
        </div>

        {/* Content Body */}
        <div style={{
          background: 'var(--surface, #0f172a)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          maxWidth: '800px',
          margin: '0 auto',
          width: '100%'
        }}>
          {/* Target Integration Header */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim, #64748b)' }}>
                {isRtl ? 'النظام والجهة المستهدفة:' : 'Target Entity:'}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', marginTop: '0.2rem' }}>
                {activeTargetContainer.systemName} ⬅ {activeTargetContainer.integrationName}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.66rem', color: 'var(--text-dim, #64748b)' }}>{isRtl ? 'المعتمد حالياً' : 'Current'}</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>{currentVer}</div>
              </div>
              <div style={{ color: 'var(--text-dim, #64748b)' }}>➔</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.66rem', color: 'var(--text-dim, #64748b)' }}>{isRtl ? 'الإصدار المرشح' : 'Next'}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#38bdf8' }}>{nextVer}</div>
              </div>
            </div>
          </div>

          {/* Section 1: Semantic Bump Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
              {isRtl ? '1. نوع الترقية المعمارية (Semantic Versioning):' : '1. SemVer Bump Type:'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
              {[
                { type: 'PATCH' as VersionBumpType, title: 'تصحيح طفيف (Patch)', desc: 'تصحيح إملائي أو توضيحات' },
                { type: 'MINOR' as VersionBumpType, title: 'تعديل تكميلي (Minor)', desc: 'إضافة مسارات أو حقول متوافقة' },
                { type: 'MAJOR' as VersionBumpType, title: 'تعديل جوهري (Major)', desc: 'كسر للتوافق وتغيير جذري' }
              ].map(item => (
                <div
                  key={item.type}
                  onClick={() => setSelectedBumpType(item.type)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: selectedBumpType === item.type ? '1px solid #0284c7' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: selectedBumpType === item.type ? 'rgba(2, 132, 199, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.12s'
                  }}
                >
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: selectedBumpType === item.type ? '#38bdf8' : '#ffffff' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim, #64748b)', marginTop: '0.25rem' }}>
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Authorized Change Scope (تحديد نطاق التعديل بواسطة المشرف) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <Lock size={14} style={{ color: '#f59e0b' }} />
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>
                {isRtl ? '2. تحديد نطاق التعديل المصرح به (Scoped Section Authorization):' : '2. Authorized Change Scope:'}
              </label>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim, #94a3b8)', marginBottom: '0.5rem' }}>
              {isRtl ? 'يحمي هذا القيد باقي أجزاء الوثيقة من التعديل العشوائي؛ يرى المدخل الوثيقة كاملة لكن يُسمح له بتعديل القسم المحدد فقط.' : 'Locks unauthorized sections to read-only during this change cycle.'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
              {[
                { id: 'FULL' as ChangeScopeType, label: 'تعديل شامل (كامل الوثيقة)' },
                { id: 'ENDPOINTS' as ChangeScopeType, label: 'فقط نقاط النهاية (Endpoints)' },
                { id: 'FIELDS_TABLE' as ChangeScopeType, label: 'فقط جدول الحقول والمعاملات' },
                { id: 'SECURITY_AUTH' as ChangeScopeType, label: 'فقط سياسات الأمان والتشفير' },
                { id: 'OVERVIEW' as ChangeScopeType, label: 'فقط المقدمة والترويسة' }
              ].map(scope => (
                <button
                  key={scope.id}
                  type="button"
                  onClick={() => setSelectedScope(scope.id)}
                  style={{
                    padding: '0.65rem 0.5rem',
                    borderRadius: '6px',
                    border: selectedScope === scope.id ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: selectedScope === scope.id ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    color: selectedScope === scope.id ? '#34d399' : 'var(--text-dim, #cbd5e1)',
                    fontSize: '0.72rem',
                    fontWeight: selectedScope === scope.id ? 800 : 500,
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  {scope.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Change Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.4rem' }}>
              {isRtl ? '3. مبررات وسبب التعديل (Change Log):' : '3. Reason for Change:'}
            </label>
            <textarea
              rows={3}
              placeholder={isRtl ? 'اكتب تفاصيل التعديل المطلوب لتوثيقه في السجل الرقابي...' : 'Enter change description for audit log...'}
              value={bumpNotes}
              onChange={e => setBumpNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.03)',
                color: '#ffffff',
                fontSize: '0.8rem',
                outline: 'none',
                resize: 'none'
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '1rem' }}>
            <button
              onClick={() => setPageMode('matrix')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--text-dim, #94a3b8)',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              onClick={handleConfirmBump}
              style={{
                padding: '0.5rem 1.35rem',
                borderRadius: '6px',
                background: '#0284c7',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {isRtl ? 'بدء المسودة والانتقال للمحرر' : 'Open Draft & Edit'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // SUB-PAGE 2: DEDICATED FULL-PAGE FOR IMMUTABLE VERSION HISTORY
  // ═════════════════════════════════════════════════════════════════════
  if (pageMode === 'history-page' && activeTargetContainer) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Top Header & Back Button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1.25rem',
          background: 'var(--surface, #0f172a)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <button
            onClick={() => setPageMode('matrix')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {isRtl ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
            {isRtl ? 'العودة لمصفوفة الوثائق' : 'Back to Matrix'}
          </button>

          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff' }}>
            {isRtl ? 'سجل وتاريخ الإصدارات الرسمي' : 'Version History & Audit Log'}
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)', fontFamily: 'monospace' }}>
            {activeTargetContainer.systemName} ⬅ {activeTargetContainer.integrationName}
          </div>
        </div>

        {/* History Table / Records */}
        <div style={{
          background: 'var(--surface, #0f172a)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left' }}>
            <thead>
              <tr style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '0.74rem',
                color: 'var(--text-dim, #94a3b8)',
                fontWeight: 700
              }}>
                <th style={{ padding: '0.75rem 1rem' }}>{isRtl ? 'رقم الإصدار' : 'Version'}</th>
                <th style={{ padding: '0.75rem 1rem' }}>{isRtl ? 'الحالة الرقابية' : 'Status'}</th>
                <th style={{ padding: '0.75rem 1rem' }}>{isRtl ? 'بيان التعديل وملاحظات الإطلاق' : 'Release Notes'}</th>
                <th style={{ padding: '0.75rem 1rem' }}>{isRtl ? 'المحرر وتاريخ التحرير' : 'Author'}</th>
                <th style={{ padding: '0.75rem 1rem' }}>{isRtl ? 'المعتمد وتاريخ الاعتماد' : 'Approved By'}</th>
              </tr>
            </thead>
            <tbody>
              {activeTargetContainer.allVersions.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-dim, #64748b)' }}>
                    {isRtl ? 'لا توجد إصدارات سابقة مسجلة.' : 'No version history recorded.'}
                  </td>
                </tr>
              ) : (
                activeTargetContainer.allVersions.map((v, idx) => {
                  const isCurrentActive = v.status === 'APPROVED' && v.versionNumber === activeTargetContainer.currentApprovedVersion?.versionNumber;

                  return (
                    <tr key={v.id || idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: isCurrentActive ? '#34d399' : '#ffffff' }}>
                          {v.versionNumber}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: isCurrentActive 
                            ? 'rgba(16, 185, 129, 0.15)' 
                            : v.status === 'SUPERSEDED' 
                            ? 'rgba(255, 255, 255, 0.05)'
                            : v.status === 'UNDER_REVIEW' 
                            ? 'rgba(245, 158, 11, 0.15)'
                            : 'rgba(59, 130, 246, 0.15)',
                          color: isCurrentActive ? '#34d399' : v.status === 'SUPERSEDED' ? '#94a3b8' : v.status === 'UNDER_REVIEW' ? '#fbbf24' : '#60a5fa'
                        }}>
                          {isCurrentActive ? (isRtl ? 'معتمد حالياً' : 'Live Active') : v.status}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontSize: '0.78rem', color: '#e2e8f0' }}>
                          {v.changeSummary || (isRtl ? 'تحديث دوري لمواصفات التكامل.' : 'Standard update')}
                        </div>
                        {v.rejectionReason && (
                          <div style={{ fontSize: '0.7rem', color: '#f87171', marginTop: '0.2rem' }}>
                            {isRtl ? `سبب الرفض: ${v.rejectionReason}` : `Rejection Reason: ${v.rejectionReason}`}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontSize: '0.76rem', color: '#ffffff' }}>{v.authorName}</div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-dim, #64748b)' }}>{new Date(v.createdAt).toLocaleDateString()}</div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        {v.approvedBy ? (
                          <>
                            <div style={{ fontSize: '0.76rem', color: '#34d399' }}>✓ {v.approvedBy}</div>
                            <div style={{ fontSize: '0.66rem', color: 'var(--text-dim, #64748b)' }}>{new Date(v.approvedAt || v.createdAt).toLocaleDateString()}</div>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim, #64748b)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // SUB-PAGE 3: DEDICATED FULL-PAGE FOR INITIAL DOCUMENT INITIALIZATION
  // ═════════════════════════════════════════════════════════════════════
  if (pageMode === 'init-page' && activeTargetContainer) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1.25rem',
          background: 'var(--surface, #0f172a)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <button
            onClick={() => setPageMode('matrix')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {isRtl ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
            {isRtl ? 'العودة لمصفوفة الوثائق' : 'Back to Matrix'}
          </button>

          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff' }}>
            {isRtl ? 'تأسيس الوثيقة الأولى (v1.0.0)' : 'Initialize First Document'}
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)', fontFamily: 'monospace' }}>
            {activeTargetContainer.documentKey}
          </div>
        </div>

        <div style={{
          background: 'var(--surface, #0f172a)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          maxWidth: '700px',
          margin: '0 auto',
          width: '100%'
        }}>
          <div style={{
            background: 'rgba(2, 132, 199, 0.08)',
            border: '1px solid rgba(2, 132, 199, 0.25)',
            borderRadius: '6px',
            padding: '1rem',
            fontSize: '0.8rem',
            color: '#38bdf8',
            lineHeight: '1.5'
          }}>
            {isRtl 
              ? `سيتم تأسيس ملف التوثيق الرسمي السيادي للجهة [${activeTargetContainer.integrationName}] بنظام [${activeTargetContainer.systemName}]. سيبدأ الإصدار الأولي كمسودة عمل برقم v1.0.0.`
              : `Initializing document container for ${activeTargetContainer.integrationName}.`
            }
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.4rem' }}>
              {isRtl ? 'نطاق وأهداف التكامل الأولي:' : 'Initial Scope Description:'}
            </label>
            <textarea
              rows={3}
              placeholder={isRtl ? 'نبذة عن نطاق التكامل والخدمات التي سيتم توفيرها...' : 'Brief summary of initial integration scope...'}
              value={initNotes}
              onChange={e => setInitNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.03)',
                color: '#ffffff',
                fontSize: '0.8rem',
                outline: 'none',
                resize: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
            <button
              onClick={() => setPageMode('matrix')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--text-dim, #94a3b8)',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              onClick={handleConfirmInit}
              style={{
                padding: '0.5rem 1.35rem',
                borderRadius: '6px',
                background: 'var(--primary, #6366f1)',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 10px var(--primary-glow, rgba(99, 102, 241, 0.35))'
              }}
            >
              {isRtl ? 'تأكيد التأسيس والبدء' : 'Confirm & Initialize'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // MAIN MATRIX VIEW (COMPACT METRICS + TABLE)
  // ═════════════════════════════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      
      {/* 1. Ultra-Compact Single-Row Horizontal Stats Bar (مؤشرات سريعة ومختصرة للغاية بدون هدر للمساحة) */}
      <div style={{
        background: 'var(--surface, #243d5c)',
        borderRadius: '6px',
        border: '1px solid var(--border-strong, rgba(255, 255, 255, 0.12))',
        boxShadow: 'var(--shadow-card, 0 4px 16px rgba(0, 0, 0, 0.25))',
        padding: '0.45rem 0.85rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        {/* Left: Compact Stats Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', fontSize: '0.74rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ color: 'var(--text-dim, #94a3b8)' }}>{isRtl ? 'إجمالي الربط:' : 'Total:'}</span>
            <span style={{ fontWeight: 800, color: '#ffffff' }}>{stats.total}</span>
          </div>

          <div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.1)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ color: '#34d399' }}>● {isRtl ? 'معتمدة ونافذة:' : 'Active:'}</span>
            <span style={{ fontWeight: 800, color: '#10b981' }}>{stats.approved}</span>
          </div>

          <div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.1)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ color: '#60a5fa' }}>● {isRtl ? 'مسودات قيد الإدخال:' : 'Drafts:'}</span>
            <span style={{ fontWeight: 800, color: '#3b82f6' }}>{stats.drafts}</span>
          </div>

          <div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.1)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ color: '#fbbf24' }}>⏳ {isRtl ? 'بانتظار الاعتماد:' : 'In Review:'}</span>
            <span style={{ fontWeight: 800, color: '#f59e0b' }}>{stats.underReview}</span>
          </div>

          <div style={{ width: '1px', height: '14px', background: 'rgba(255, 255, 255, 0.1)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ color: 'var(--text-dim, #64748b)' }}>○ {isRtl ? 'غير موثقة:' : 'Uninitialized:'}</span>
            <span style={{ fontWeight: 700, color: 'var(--text-dim, #94a3b8)' }}>{stats.empty}</span>
          </div>
        </div>

        {/* Right: Quick Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {[
            { id: 'ALL', label: isRtl ? 'الكل' : 'All' },
            { id: 'APPROVED', label: isRtl ? 'المعتمدة' : 'Approved' },
            { id: 'DRAFT', label: isRtl ? 'المسودات' : 'Drafts' },
            { id: 'UNDER_REVIEW', label: isRtl ? 'قيد المراجعة' : 'In Review' },
            { id: 'EMPTY', label: isRtl ? 'غير موثقة' : 'Empty' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedStatusFilter(p.id)}
              style={{
                padding: '0.2rem 0.55rem',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.7rem',
                fontWeight: selectedStatusFilter === p.id ? 700 : 500,
                background: selectedStatusFilter === p.id ? 'var(--primary, #6366f1)' : 'transparent',
                color: selectedStatusFilter === p.id ? '#ffffff' : 'var(--text-dim, #94a3b8)',
                boxShadow: selectedStatusFilter === p.id ? '0 2px 8px var(--primary-glow, rgba(99, 102, 241, 0.35))' : 'none',
                transition: 'all 0.15s'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Search & System Filter Bar */}
      <div style={{
        background: 'var(--surface, #243d5c)',
        borderRadius: '6px',
        border: '1px solid var(--border-strong, rgba(255, 255, 255, 0.12))',
        boxShadow: 'var(--shadow-card, 0 4px 16px rgba(0, 0, 0, 0.25))',
        padding: '0.5rem 0.85rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem'
      }}>
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={13} style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim, #64748b)' }} />
          <input
            type="text"
            placeholder={isRtl ? 'بحث باسم النظام، الجهة، أو كود الوثيقة...' : 'Search system, entity, or doc code...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.35rem 0.75rem',
              [isRtl ? 'paddingRight' : 'paddingLeft']: '1.8rem',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.02)',
              color: '#ffffff',
              fontSize: '0.78rem',
              outline: 'none'
            }}
          />
        </div>

        <select
          value={selectedSystemFilter}
          onChange={e => setSelectedSystemFilter(e.target.value)}
          style={{
            padding: '0.35rem 0.65rem',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.04)',
            color: '#ffffff',
            fontSize: '0.76rem',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="ALL" style={{ background: '#0f172a' }}>{isRtl ? 'كل الأنظمة' : 'All Systems'}</option>
          {Object.values(systems).map(s => (
            <option key={s.key} value={s.key} style={{ background: '#0f172a' }}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* 3. The Cleaned Matrix Table */}
      <div style={{
        background: 'var(--surface, #243d5c)',
        borderRadius: '6px',
        border: '1px solid var(--border-strong, rgba(255, 255, 255, 0.12))',
        boxShadow: 'var(--shadow-card, 0 4px 16px rgba(0, 0, 0, 0.25))',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left' }}>
          <thead>
            <tr style={{
              background: 'rgba(0, 0, 0, 0.22)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.10)',
              fontSize: '0.72rem',
              color: 'var(--text-dim, #94a3b8)',
              fontWeight: 700
            }}>
              <th style={{ padding: '0.65rem 0.85rem' }}>{isRtl ? 'النظام المركزي' : 'System'}</th>
              <th style={{ padding: '0.65rem 0.85rem' }}>{isRtl ? 'جهة التكامل والربط' : 'Integration Entity'}</th>
              <th style={{ padding: '0.65rem 0.85rem' }}>{isRtl ? 'كود الوثيقة' : 'Doc Code'}</th>
              <th style={{ padding: '0.65rem 0.85rem' }}>{isRtl ? 'الإصدار المعتمد' : 'Live Version'}</th>
              <th style={{ padding: '0.65rem 0.85rem' }}>{isRtl ? 'حالة دورة العمل' : 'Workflow State'}</th>
              <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>{isRtl ? 'الإجراءات الرقابية' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredContainers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-dim, #64748b)', fontSize: '0.82rem' }}>
                  {isRtl ? 'لا توجد نتائج تطابق معايير الفلترة.' : 'No records match filter.'}
                </td>
              </tr>
            ) : (
              filteredContainers.map(c => {
                const hasLive = !!c.currentApprovedVersion;
                const hasDraft = !!c.activeDraftVersion;
                const hasReview = !!c.pendingReviewVersion;

                return (
                  <tr 
                    key={c.documentKey}
                    style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
                  >
                    {/* System */}
                    <td style={{ padding: '0.75rem 0.85rem' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text, #ffffff)', fontSize: '0.84rem' }}>
                        {c.systemName}
                      </div>
                      <span style={{ fontSize: '0.66rem', color: 'var(--text-dim, #64748b)', fontFamily: 'monospace' }}>
                        {c.systemCode}
                      </span>
                    </td>

                    {/* Entity */}
                    <td style={{ padding: '0.75rem 0.85rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text, #f1f5f9)', fontSize: '0.82rem' }}>
                        {c.integrationName}
                      </div>
                      <span style={{ fontSize: '0.66rem', color: 'var(--text-dim, #64748b)', fontFamily: 'monospace' }}>
                        {c.integrationCode}
                      </span>
                    </td>

                    {/* Document Key */}
                    <td style={{ padding: '0.75rem 0.85rem' }}>
                      <span style={{
                        padding: '0.12rem 0.45rem',
                        borderRadius: '3px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        fontFamily: 'monospace',
                        fontSize: '0.68rem',
                        color: '#94a3b8'
                      }}>
                        {c.documentKey}
                      </span>
                    </td>

                    {/* Live Version (خالي من الحشو تماماً) */}
                    <td style={{ padding: '0.75rem 0.85rem' }}>
                      {hasLive ? (
                        <span style={{
                          padding: '0.15rem 0.55rem',
                          borderRadius: '4px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34d399',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          fontWeight: 800,
                          fontSize: '0.74rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          <CheckCircle2 size={11} /> {c.currentApprovedVersion?.versionNumber}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim, #64748b)' }}>
                          ○ {isRtl ? 'غير موثقة بعد' : 'Uninitialized'}
                        </span>
                      )}
                    </td>

                    {/* Workflow State */}
                    <td style={{ padding: '0.75rem 0.85rem' }}>
                      {hasReview ? (
                        <span style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: '#fbbf24',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          <Clock size={11} />
                          {isRtl ? `قيد المراجعة (${c.pendingReviewVersion?.versionNumber})` : `In Review (${c.pendingReviewVersion?.versionNumber})`}
                        </span>
                      ) : hasDraft ? (
                        <span style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          background: c.activeDraftVersion?.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          color: c.activeDraftVersion?.status === 'REJECTED' ? '#f87171' : '#60a5fa',
                          border: c.activeDraftVersion?.status === 'REJECTED' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          <Edit3 size={11} />
                          {c.activeDraftVersion?.status === 'REJECTED' 
                            ? (isRtl ? `مرفوضة (${c.activeDraftVersion?.versionNumber})` : `Rejected`)
                            : (isRtl ? `مسودة جارية (${c.activeDraftVersion?.versionNumber})` : `Draft (${c.activeDraftVersion?.versionNumber})`)
                          }
                        </span>
                      ) : hasLive ? (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim, #64748b)' }}>
                          ● {isRtl ? 'مستقرة' : 'Stable'}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: '#f87171' }}>
                          ⚠️ {isRtl ? 'بحاجة لتأسيس' : 'Needs Init'}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.75rem 0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                        
                        {/* Initialize */}
                        {!hasLive && !hasDraft && !hasReview && canCreate && (
                          <button
                            onClick={() => handleOpenInitPage(c)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.3rem 0.65rem',
                              borderRadius: '4px',
                              background: 'var(--primary, #6366f1)',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px var(--primary-glow, rgba(99, 102, 241, 0.35))'
                            }}
                          >
                            <Plus size={11} /> {isRtl ? 'تأسيس الوثيقة (v1.0.0)' : 'Init v1.0.0'}
                          </button>
                        )}

                        {/* Approved -> Open New Version (Page-based) */}
                        {hasLive && !hasDraft && !hasReview && (
                          <>
                            {canCreate && (
                              <button
                                onClick={() => handleOpenBumpPage(c)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  padding: '0.3rem 0.65rem',
                                  borderRadius: '4px',
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  color: '#ffffff',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                <GitBranch size={11} /> {isRtl ? 'طلب تعديل / إصدار جديد' : 'New Version'}
                              </button>
                            )}

                            {onNavigateToDoc && (
                              <button
                                onClick={() => onNavigateToDoc(c.systemKey, c.integrationKey)}
                                style={{
                                  padding: '0.3rem 0.5rem',
                                  borderRadius: '4px',
                                  background: 'transparent',
                                  color: 'var(--text-dim, #94a3b8)',
                                  border: '1px solid rgba(255, 255, 255, 0.08)',
                                  fontSize: '0.7rem',
                                  cursor: 'pointer'
                                }}
                                title={isRtl ? 'عرض الوثيقة' : 'View'}
                              >
                                <ExternalLink size={11} />
                              </button>
                            )}
                          </>
                        )}

                        {/* Draft in progress */}
                        {hasDraft && (
                          <>
                            {onNavigateToEditor && (
                              <button
                                onClick={() => onNavigateToEditor(c.systemKey, c.integrationKey)}
                                style={{
                                  padding: '0.28rem 0.55rem',
                                  borderRadius: '4px',
                                  background: '#0284c7',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                {isRtl ? 'إكمال التحرير' : 'Edit'}
                              </button>
                            )}

                            <button
                              onClick={() => handleSubmitForReview(c)}
                              style={{
                                padding: '0.28rem 0.55rem',
                                borderRadius: '4px',
                                background: 'rgba(245, 158, 11, 0.15)',
                                color: '#fbbf24',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              <Send size={10} style={{ display: 'inline', [isRtl ? 'marginLeft' : 'marginRight']: '0.2rem' }} />
                              {isRtl ? 'رفع' : 'Submit'}
                            </button>

                            <button
                              onClick={() => handleDiscardDraft(c)}
                              style={{
                                padding: '0.28rem 0.45rem',
                                borderRadius: '4px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#f87171',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                fontSize: '0.7rem',
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={10} />
                            </button>
                          </>
                        )}

                        {/* Under Review */}
                        {hasReview && (
                          <>
                            {canApprove && (
                              <button
                                onClick={() => handleDirectApprove(c)}
                                style={{
                                  padding: '0.28rem 0.6rem',
                                  borderRadius: '4px',
                                  background: '#10b981',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                <ShieldCheck size={11} style={{ display: 'inline', [isRtl ? 'marginLeft' : 'marginRight']: '0.2rem' }} />
                                {isRtl ? 'اعتماد' : 'Approve'}
                              </button>
                            )}

                            {onNavigateToDoc && (
                              <button
                                onClick={() => onNavigateToDoc(c.systemKey, c.integrationKey)}
                                style={{
                                  padding: '0.28rem 0.45rem',
                                  borderRadius: '4px',
                                  background: 'transparent',
                                  color: 'var(--text-dim, #94a3b8)',
                                  border: '1px solid rgba(255, 255, 255, 0.08)',
                                  fontSize: '0.7rem',
                                  cursor: 'pointer'
                                }}
                              >
                                <ExternalLink size={11} />
                              </button>
                            )}
                          </>
                        )}

                        {/* Version History Page Trigger */}
                        <button
                          onClick={() => handleOpenHistoryPage(c)}
                          style={{
                            padding: '0.3rem 0.5rem',
                            borderRadius: '4px',
                            background: 'transparent',
                            color: 'var(--text-dim, #94a3b8)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            fontSize: '0.7rem',
                            cursor: 'pointer'
                          }}
                          title={isRtl ? 'سجل وتاريخ الإصدارات' : 'History'}
                        >
                          <History size={11} />
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

    </div>
  );
};
