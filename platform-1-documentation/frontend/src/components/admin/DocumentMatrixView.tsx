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
  FileText,
  AlertCircle,
  AlertTriangle,
  X,
  Check,
  Building2,
  FilePlus2,
  UserCheck
} from 'lucide-react';
import { SystemModule, Sector } from '../../types/schema';
import { 
  SystemEntityDocContainer, 
  DocVersionRecord, 
  VersionBumpType 
} from '../../types/docGovernance';
import { docGovernanceEngine } from '../../services/docGovernanceEngine';
import { governanceService } from '../../services/governanceService';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../../i18n';

interface DocumentMatrixViewProps {
  systems: Record<string, SystemModule>;
  sectors?: Record<string, Sector>;
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
  sectors,
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

  // Standalone Document Creation Modal State
  const [isCreateDocModalOpen, setIsCreateDocModalOpen] = useState(false);
  const [newDocSysKey, setNewDocSysKey] = useState<string>('');
  const [newDocEntityKey, setNewDocEntityKey] = useState<string>('');
  const [newDocRole, setNewDocRole] = useState<'CONSUMER' | 'PROVIDER'>('CONSUMER');
  const [newDocSummary, setNewDocSummary] = useState<string>('');
  const [createDocError, setCreateDocError] = useState<string | null>(null);

  // Approval Inspection & Verification Modal (User requested)
  const [pendingApprovalContainer, setPendingApprovalContainer] = useState<SystemEntityDocContainer | null>(null);
  const [emptyDocWarningContainer, setEmptyDocWarningContainer] = useState<SystemEntityDocContainer | null>(null);
  const [activeVersionsContainer, setActiveVersionsContainer] = useState<SystemEntityDocContainer | null>(null);
  const [approvalNotes, setApprovalNotes] = useState<string>('');
  const [isRejectingInModal, setIsRejectingInModal] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

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

  // Filtered list (All containers are real documents)
  const filteredContainers = useMemo(() => {
    return containers.filter(c => {
      if (selectedSystemFilter !== 'ALL' && c.systemKey !== selectedSystemFilter) return false;
      if (selectedStatusFilter === 'APPROVED' && (!c.currentApprovedVersion || c.activeDraftVersion || c.pendingReviewVersion)) return false;
      if (selectedStatusFilter === 'DRAFT' && !c.activeDraftVersion) return false;
      if (selectedStatusFilter === 'UNDER_REVIEW' && !c.pendingReviewVersion) return false;

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

    containers.forEach(c => {
      if (c.pendingReviewVersion) underReview++;
      else if (c.activeDraftVersion) drafts++;
      else if (c.currentApprovedVersion) approved++;
    });

    return { total, approved, drafts, underReview };
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

  const handleSubmitForReview = async (c: SystemEntityDocContainer) => {
    const res = docGovernanceEngine.submitDraftForReview(c.systemKey, c.integrationKey);
    if (!res.success) {
      if (onNotify) onNotify('تعذر الرفع', res.error || 'فشل الرفع للمراجعة', 'warning');
      return;
    }

    // Persist and register officially in the Backend Governance Pipeline
    try {
      await governanceService.submitRequest({
        resourceKey: 'catalog:documents',
        actionType: 'CUSTOM',
        actionDescriptionAr: `طلب اعتماد مسودة وثيقة الـ API (${res.version?.versionNumber}) لنظام ${c.systemName} ⟷ ${c.integrationName}`,
        actionDescriptionEn: `API Documentation Approval (${res.version?.versionNumber}) for ${c.systemName} ⟷ ${c.integrationName}`,
        targetResourceId: c.documentKey,
        payload: {
          documentKey: c.documentKey,
          systemKey: c.systemKey,
          integrationKey: c.integrationKey,
          systemName: c.systemName,
          integrationName: c.integrationName,
          versionNumber: res.version?.versionNumber,
          changeSummary: res.version?.changeSummary || 'تحديث وتأسيس مواصفات الربط البرمجي.',
          endpointsCount: res.version?.endpointsCount || 0
        }
      });
    } catch (err: any) {
      console.warn('[Governance] Backend sync warning:', err);
    }

    if (onNotify) {
      onNotify(
        'تم الرفع للاعتماد بنجاح',
        `تم إرسال المسودة ${res.version?.versionNumber} لمركز الاعتمادات والمرفوعات بانتظار المراجعة والاعتماد.`,
        'success'
      );
    }
    refreshData();
  };

  // Open Approval Inspection Modal with strict content verification
  const handleOpenApprovalModal = (c: SystemEntityDocContainer) => {
    const targetVer = c.pendingReviewVersion || c.activeDraftVersion;
    if (!targetVer) {
      if (onNotify) onNotify('تنبيه', 'لا يوجد إصدار قيد الاعتماد لهذه الوثيقة.', 'warning');
      return;
    }

    // Strict content check: verify user actually uploaded or provided content
    let hasUploadedEndpoints = (targetVer.endpointsCount && targetVer.endpointsCount > 0);
    if (!hasUploadedEndpoints && targetVer.payloadSnapshot) {
      try {
        const parsed = typeof targetVer.payloadSnapshot === 'string' ? JSON.parse(targetVer.payloadSnapshot) : targetVer.payloadSnapshot;
        if (Array.isArray(parsed) && parsed.length > 0) hasUploadedEndpoints = true;
      } catch {}
    }

    if (!hasUploadedEndpoints) {
      setEmptyDocWarningContainer(c);
      if (onNotify) {
        onNotify(
          'لا يمكن الاعتماد (الوثيقة فارغة)',
          'لم يقم المستخدم برفع وتوثيق أي واجهات (APIs) في هذه الوثيقة حتى الآن! لا يمكن اعتماد وثيقة فارغة قبل رفع المحتوى والمواصفات.',
          'warning'
        );
      }
      return;
    }

    // Open Approval Inspection Modal with full transparency
    setPendingApprovalContainer(c);
    setApprovalNotes('');
    setIsRejectingInModal(false);
    setRejectionReasonInput('');
  };

  const handleConfirmApproveFromModal = () => {
    if (!pendingApprovalContainer) return;
    const c = pendingApprovalContainer;

    const res = docGovernanceEngine.approveVersion({
      systemKey: c.systemKey,
      integrationKey: c.integrationKey,
      approverId: user?.id,
      approverName: user?.displayName || user?.username || 'المشرف المعتمد',
      isSuperAdminOverride: user?.username === 'admin'
    });

    if (!res.success) {
      if (onNotify) onNotify('فشل الاعتماد', res.error || 'تعذر الاعتماد', 'error');
      return;
    }

    if (onNotify) {
      onNotify('تم الاعتماد بنجاح', `أصبح الإصدار ${res.approvedVersion?.versionNumber} معتمداً رسمياً لـ [${c.integrationName}]. الوثيقة الآن جاهزة للربط.`, 'success');
    }
    setPendingApprovalContainer(null);
    refreshData();
  };

  const handleConfirmRejectFromModal = () => {
    if (!pendingApprovalContainer) return;
    if (!rejectionReasonInput.trim()) {
      if (onNotify) onNotify('تنبيه', 'يرجى كتابة سبب الرفض لتوجيه المحرر.', 'warning');
      return;
    }
    const c = pendingApprovalContainer;
    const res = docGovernanceEngine.rejectVersion({
      systemKey: c.systemKey,
      integrationKey: c.integrationKey,
      rejectorName: user?.displayName || user?.username || 'المشرف المعتمد',
      reason: rejectionReasonInput.trim()
    });

    if (!res.success) {
      if (onNotify) onNotify('تعذر الرفض', res.error || 'فشل الرفض', 'error');
      return;
    }

    if (onNotify) {
      onNotify('تم رفض المسودة', `تمت إعادة الوثيقة للمحرر مع تدوين سبب الرفض: "${rejectionReasonInput.trim()}".`, 'info');
    }
    setPendingApprovalContainer(null);
    refreshData();
  };

  const handleConfirmCreateStandaloneDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocSysKey) {
      setCreateDocError(isRtl ? 'يرجى تحديد النظام.' : 'Select a system.');
      return;
    }
    if (!newDocEntityKey) {
      setCreateDocError(isRtl ? 'يرجى تحديد الجهة الشريكة.' : 'Select an entity.');
      return;
    }

    // Check duplicate: strictly single doc per system + entity
    const existing = containers.find(c => c.systemKey === newDocSysKey && c.integrationKey === newDocEntityKey);
    if (existing) {
      setCreateDocError(
        isRtl
          ? `عفواً، توجد وثيقة مسجلة مسبقاً لهذا النظام مع هذه الجهة (الإصدار: ${existing.currentApprovedVersion?.versionNumber || existing.activeDraftVersion?.versionNumber || 'قائمة'}). لا يمكن إنشاء أكثر من وثيقة واحدة لنفس النظام والجهة.`
          : 'A document already exists for this system and entity!'
      );
      return;
    }

    const sysObj = systems[newDocSysKey];
    const secObj = sectors ? sectors[newDocEntityKey] : undefined;
    const sysName = sysObj ? sysObj.name : newDocSysKey;
    const sysCode = sysObj?.code || newDocSysKey;
    const entName = secObj ? secObj.name : newDocEntityKey;
    const entCode = secObj?.code || `SEC_${newDocEntityKey.toUpperCase()}`;

    const res = docGovernanceEngine.createInitialDocument({
      systemKey: newDocSysKey,
      integrationKey: newDocEntityKey,
      systemName: sysName,
      systemCode: sysCode,
      integrationName: entName,
      integrationCode: entCode,
      role: newDocRole,
      authorId: user?.id || 'usr_maker',
      authorName: user?.displayName || user?.username || 'محرر الوثائق',
      summary: newDocSummary.trim() || 'التأسيس الأولي لوثيقة التكامل والربط الفني.'
    });

    if (!res.success) {
      setCreateDocError(res.error || 'تعذر تأسيس الوثيقة.');
      return;
    }

    if (onNotify) {
      onNotify(
        isRtl ? 'تم تأسيس الوثيقة المجردة بنجاح' : 'Document Created',
        isRtl
          ? `تم إنشاء مسودة الوثيقة الجديدة بين [${sysName}] و [${entName}] كـ (${newDocRole === 'PROVIDER' ? 'مزود' : 'مستهلك'}). يمكنك الآن الانتقال لتحريرها ورفع الواجهات.`
          : 'Document draft created.',
        'success'
      );
    }

    setIsCreateDocModalOpen(false);
    refreshData();

    if (onNavigateToEditor) {
      onNavigateToEditor(newDocSysKey, newDocEntityKey);
    }
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

        </div>

        {/* Right: Quick Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {[
            { id: 'ALL', label: isRtl ? 'الكل' : 'All' },
            { id: 'APPROVED', label: isRtl ? 'المعتمدة' : 'Approved' },
            { id: 'DRAFT', label: isRtl ? 'المسودات' : 'Drafts' },
            { id: 'UNDER_REVIEW', label: isRtl ? 'قيد المراجعة' : 'In Review' }
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

        {canCreate && (
          <button
            onClick={() => {
              const sysKeys = Object.keys(systems);
              const entityKeys = sectors ? Object.keys(sectors) : [];
              setNewDocSysKey(sysKeys[0] || '');
              setNewDocEntityKey(entityKeys[0] || '');
              setNewDocRole('CONSUMER');
              setNewDocSummary('');
              setCreateDocError(null);
              setIsCreateDocModalOpen(true);
            }}
            style={{
              [isRtl ? 'marginRight' : 'marginLeft']: 'auto',
              padding: '0.38rem 0.85rem',
              borderRadius: '4px',
              border: 'none',
              background: 'var(--primary, #6366f1)',
              color: '#ffffff',
              fontSize: '0.76rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px var(--primary-glow, rgba(99, 102, 241, 0.35))'
            }}
          >
            <Plus size={13} />
            <span>{isRtl ? '+ إنشاء وثيقة جديدة' : '+ Create Document'}</span>
          </button>
        )}
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
              <th style={{ padding: '0.65rem 0.85rem' }}>{isRtl ? 'الدور والربط' : 'Role & Link'}</th>
              <th style={{ padding: '0.65rem 0.85rem' }}>{isRtl ? 'كود الوثيقة' : 'Doc Code'}</th>
              <th style={{ padding: '0.65rem 0.85rem' }}>{isRtl ? 'الإصدار المعتمد' : 'Live Version'}</th>
              <th style={{ padding: '0.65rem 0.85rem' }}>{isRtl ? 'حالة دورة العمل' : 'Workflow State'}</th>
              <th style={{ padding: '0.65rem 0.85rem' }}>{isRtl ? 'المستخدم المتصل / المحرر' : 'Active User / Editor'}</th>
              <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>{isRtl ? 'الإجراءات الرقابية' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredContainers.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-dim, #64748b)', fontSize: '0.86rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ fontWeight: 700, color: '#e2e8f0' }}>
                      {containers.length === 0
                        ? (isRtl ? 'لا توجد وثائق API مسجلة بعد' : 'No API Documents Registered Yet')
                        : (isRtl ? 'لا توجد نتائج تطابق معايير الفلترة' : 'No records match filter criteria')}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-dim, #94a3b8)', maxWidth: '420px', lineHeight: '1.5' }}>
                      {containers.length === 0
                        ? (isRtl
                            ? 'يمكنك البدء بإنشاء أول وثيقة مجردة مستقلة بالضغط على زر [+ إنشاء وثيقة جديدة] أعلاه، وسيبدأ إصدارها الأولي كـ v1.0.0.'
                            : 'Click [+ Create Document] above to create your first standalone document at v1.0.0.')
                        : (isRtl ? 'جرب تغيير خيارات البحث أو الفلتر أعلاه.' : 'Try adjusting the search query or filter options above.')}
                    </div>
                  </div>
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

                    {/* Role & Link Status */}
                    <td style={{ padding: '0.75rem 0.85rem' }}>
                      <span style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: c.role === 'PROVIDER' ? 'rgba(192, 132, 252, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                        color: c.role === 'PROVIDER' ? '#c084fc' : '#38bdf8',
                        border: `1px solid ${c.role === 'PROVIDER' ? 'rgba(192, 132, 252, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`,
                        display: 'inline-block'
                      }}>
                        {c.role === 'PROVIDER' ? (isRtl ? 'مزود' : 'Provider') : (isRtl ? 'مستهلك' : 'Consumer')}
                      </span>
                      <div style={{ marginTop: '0.2rem' }}>
                        <span style={{
                          fontSize: '0.62rem',
                          padding: '0.08rem 0.35rem',
                          borderRadius: '3px',
                          background: c.isLinked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                          color: c.isLinked ? '#34d399' : '#94a3b8'
                        }}>
                          {c.isLinked ? (isRtl ? '● مرتبط بالتكامل' : 'Linked') : (isRtl ? '○ غير مرتبط' : 'Unlinked')}
                        </span>
                      </div>
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

                    {/* Live Version */}
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
                        <span style={{ fontSize: '0.7rem', color: '#60a5fa', fontWeight: 600 }}>
                          ● {isRtl ? 'قيد التأسيس v1.0.0' : 'In Initial Draft'}
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
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 600 }}>
                          ● {isRtl ? 'معتمدة ومستقرة' : 'Stable Live'}
                        </span>
                      )}
                    </td>

                    {/* Active User / Connected Session */}
                    <td style={{ padding: '0.75rem 0.85rem' }}>
                      {c.activeDraftVersion?.claimedBy ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
                            <strong style={{ color: '#ffffff', fontSize: '0.78rem' }}>{c.activeDraftVersion.claimedBy.userName}</strong>
                          </div>
                          <span style={{ fontSize: '0.64rem', color: '#34d399', fontWeight: 600 }}>
                            {isRtl ? '🟢 محرر متصل الآن' : 'Active Editor'}
                          </span>
                        </div>
                      ) : c.pendingReviewVersion ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                            <strong style={{ color: '#ffffff', fontSize: '0.78rem' }}>{c.pendingReviewVersion.authorName}</strong>
                          </div>
                          <span style={{ fontSize: '0.64rem', color: '#fbbf24', fontWeight: 600 }}>
                            {isRtl ? '⏳ تم الرفع للاعتماد' : 'Pending Review'}
                          </span>
                        </div>
                      ) : c.activeDraftVersion ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }} />
                            <strong style={{ color: '#ffffff', fontSize: '0.78rem' }}>{c.activeDraftVersion.authorName}</strong>
                          </div>
                          <span style={{ fontSize: '0.64rem', color: '#38bdf8' }}>
                            {isRtl ? '✏️ محرر المسودة' : 'Draft Maker'}
                          </span>
                        </div>
                      ) : c.currentApprovedVersion ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <strong style={{ color: '#e2e8f0', fontSize: '0.78rem' }}>
                              {c.currentApprovedVersion.approvedBy || c.currentApprovedVersion.authorName}
                            </strong>
                          </div>
                          <span style={{ fontSize: '0.64rem', color: '#94a3b8' }}>
                            {isRtl ? '✓ معتمد ونافذ' : 'Live Approved'}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.75rem 0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                        
                        {/* Versions Tab/Modal Button (Always accessible) */}
                        <button
                          onClick={() => setActiveVersionsContainer(c)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.28rem 0.55rem',
                            borderRadius: '4px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: '#e2e8f0',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                          title={isRtl ? 'عرض سجل إصدارات الوثيقة' : 'View Versions'}
                        >
                          <History size={11} /> {isRtl ? 'الإصدارات' : 'Versions'}
                        </button>

                        {/* Approved Document Actions -> Only Approved can bump new version */}
                        {hasLive && !hasDraft && !hasReview && (
                          <>
                            {canCreate && (
                              <button
                                onClick={() => handleOpenBumpPage(c)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  padding: '0.28rem 0.6rem',
                                  borderRadius: '4px',
                                  background: 'rgba(99, 102, 241, 0.15)',
                                  color: '#a5b4fc',
                                  border: '1px solid rgba(99, 102, 241, 0.3)',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                <GitBranch size={11} /> {isRtl ? 'طلب إصدار جديد' : 'New Version'}
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
                              (() => {
                                const targetVer = c.pendingReviewVersion || c.activeDraftVersion;
                                const isSelf = targetVer && (
                                  (user?.id && targetVer.authorId === user.id) ||
                                  (user?.displayName && targetVer.authorName === user.displayName) ||
                                  (user?.username && targetVer.authorName === user.username)
                                );
                                if (isSelf) {
                                  return (
                                    <span 
                                      style={{
                                        padding: '0.28rem 0.6rem',
                                        borderRadius: '4px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        color: '#94a3b8',
                                        fontSize: '0.68rem',
                                        fontWeight: 600,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.2rem',
                                        cursor: 'not-allowed'
                                      }}
                                      title={isRtl ? 'حظر حوكمة (SoD): لا يجوز لمحرر الوثيقة اعتمادها بنفسه حتى لو كان مديراً.' : 'SoD Block: Author cannot approve own version.'}
                                    >
                                      <Lock size={10} />
                                      {isRtl ? 'حظر SoD' : 'SoD Block'}
                                    </span>
                                  );
                                }
                                return (
                                  <button
                                    onClick={() => handleOpenApprovalModal(c)}
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
                                );
                              })()
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

      {/* ── MODAL 1: CREATE STANDALONE DOCUMENT (مجردة ومستقلة) ── */}
      {isCreateDocModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={() => setIsCreateDocModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--surface, #1e293b)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(0, 0, 0, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FilePlus2 size={18} style={{ color: 'var(--primary, #6366f1)' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                    {isRtl ? 'إنشاء وثيقة API جديدة (مجردة ومستقلة)' : 'Create Standalone API Document'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-dim, #94a3b8)' }}>
                    {isRtl ? 'تأسيس مواصفات مجردة للنظام والجهة تمهيداً لتوثيقها واعتمادها' : 'Standalone specification entity'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateDocModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmCreateStandaloneDoc} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {createDocError && (
                <div style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.4rem'
                }}>
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>{createDocError}</div>
                </div>
              )}

              {/* Duplicate check warning */}
              {containers.some(c => c.systemKey === newDocSysKey && c.integrationKey === newDocEntityKey) && (
                <div style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  color: '#fbbf24',
                  fontSize: '0.76rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.4rem'
                }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    {isRtl 
                      ? '⚠️ تنبيه حوكمة: توجد وثيقة مسجلة مسبقاً لهذا النظام مع هذه الجهة. لا يمكن إنشاء أكثر من وثيقة واحدة لنفس النظام والجهة.'
                      : 'A document already exists for this system and entity!'}
                  </div>
                </div>
              )}

              {/* System Select */}
              <div>
                <label style={{ fontSize: '0.74rem', color: '#cbd5e1', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  {isRtl ? '1. النظام التابع له' : '1. Target System'} <span style={{ color: '#f87171' }}>*</span>
                </label>
                <select
                  required
                  value={newDocSysKey}
                  onChange={e => {
                    setNewDocSysKey(e.target.value);
                    setCreateDocError(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.7rem',
                    fontSize: '0.8rem',
                    background: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '4px',
                    color: '#ffffff',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">{isRtl ? '-- اختر النظام --' : '-- Select System --'}</option>
                  {Object.entries(systems).map(([sKey, sMod]) => (
                    <option key={sKey} value={sKey}>
                      {sMod.name} ({sMod.code || sKey})
                    </option>
                  ))}
                </select>
              </div>

              {/* Entity Select */}
              <div>
                <label style={{ fontSize: '0.74rem', color: '#cbd5e1', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  {isRtl ? '2. الجهة الشريكة المستهدفة' : '2. Target Partner Entity'} <span style={{ color: '#f87171' }}>*</span>
                </label>
                <select
                  required
                  value={newDocEntityKey}
                  onChange={e => {
                    setNewDocEntityKey(e.target.value);
                    setCreateDocError(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.7rem',
                    fontSize: '0.8rem',
                    background: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '4px',
                    color: '#ffffff',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">{isRtl ? '-- اختر الجهة الشريكة --' : '-- Select Entity --'}</option>
                  {sectors && Object.entries(sectors).map(([secKey, sec]) => (
                    <option key={secKey} value={secKey}>
                      {sec.name} ({sec.code || secKey})
                    </option>
                  ))}
                </select>
              </div>

              {/* Role: Consumer vs Provider */}
              <div>
                <label style={{ fontSize: '0.74rem', color: '#cbd5e1', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  {isRtl ? '3. الدور المعماري للوثيقة' : '3. Architectural Role'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setNewDocRole('CONSUMER')}
                    style={{
                      padding: '0.55rem',
                      borderRadius: '4px',
                      border: `1px solid ${newDocRole === 'CONSUMER' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
                      background: newDocRole === 'CONSUMER' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(0, 0, 0, 0.2)',
                      color: newDocRole === 'CONSUMER' ? '#38bdf8' : '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.2rem'
                    }}
                  >
                    <span>{isRtl ? 'مستهلك (Consumer)' : 'Consumer'}</span>
                    <span style={{ fontSize: '0.64rem', fontWeight: 400, opacity: 0.85 }}>
                      {isRtl ? 'نظامنا يستهلك واجهات الجهة' : 'System consumes entity APIs'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewDocRole('PROVIDER')}
                    style={{
                      padding: '0.55rem',
                      borderRadius: '4px',
                      border: `1px solid ${newDocRole === 'PROVIDER' ? '#c084fc' : 'rgba(255, 255, 255, 0.1)'}`,
                      background: newDocRole === 'PROVIDER' ? 'rgba(192, 132, 252, 0.15)' : 'rgba(0, 0, 0, 0.2)',
                      color: newDocRole === 'PROVIDER' ? '#c084fc' : '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.2rem'
                    }}
                  >
                    <span>{isRtl ? 'مزود (Provider)' : 'Provider'}</span>
                    <span style={{ fontSize: '0.64rem', fontWeight: 400, opacity: 0.85 }}>
                      {isRtl ? 'نظامنا يقدم الواجهات للجهة' : 'System provides APIs to entity'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Initial Summary */}
              <div>
                <label style={{ fontSize: '0.74rem', color: '#cbd5e1', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  {isRtl ? '4. وصف وملخص الوثيقة التأسيسي' : '4. Initial Summary / Notes'}
                </label>
                <input
                  type="text"
                  value={newDocSummary}
                  onChange={e => setNewDocSummary(e.target.value)}
                  placeholder={isRtl ? 'مثال: وثيقة التكامل المالي والتحويلات اللحظية...' : 'e.g., Financial integration spec'}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.7rem',
                    fontSize: '0.8rem',
                    background: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '4px',
                    color: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateDocModalOpen(false)}
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
                  disabled={containers.some(c => c.systemKey === newDocSysKey && c.integrationKey === newDocEntityKey)}
                  style={{
                    padding: '0.4rem 1.1rem',
                    borderRadius: '4px',
                    border: 'none',
                    background: containers.some(c => c.systemKey === newDocSysKey && c.integrationKey === newDocEntityKey) ? '#475569' : 'var(--primary, #6366f1)',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: containers.some(c => c.systemKey === newDocSysKey && c.integrationKey === newDocEntityKey) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isRtl ? 'تأسيس الوثيقة (مسودة)' : 'Create Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: APPROVAL INSPECTION & VERIFICATION MODAL (طلب المستخدم الدقيق) ── */}
      {pendingApprovalContainer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={() => setPendingApprovalContainer(null)}
        >
          <div
            style={{
              background: 'var(--surface, #1e293b)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '580px',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.7)',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(16, 185, 129, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={20} style={{ color: '#34d399' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#ffffff' }}>
                    {isRtl ? 'فحص ومراجعة تفاصيل الاعتماد' : 'Approval Review & Verification'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>
                    {isRtl ? 'تدقيق هوية رافع الوثيقة ومحتوى الواجهات قبل إطلاق الاعتماد الرسمي' : 'Strict Verification before approval'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPendingApprovalContainer(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            {(() => {
              const targetVer = pendingApprovalContainer.pendingReviewVersion || pendingApprovalContainer.activeDraftVersion;
              if (!targetVer) return null;

              return (
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Card 1: Submitter / Author Information */}
                  <div style={{
                    padding: '0.85rem',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <UserCheck size={14} />
                      <span>{isRtl ? 'من قام برفع الوثيقة / المستخدم المتصل حالياً:' : 'Submitter & Active Session:'}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.76rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-dim, #94a3b8)', display: 'block', fontSize: '0.68rem' }}>{isRtl ? 'اسم المحرر / الرافع:' : 'Author Name:'}</span>
                        <strong style={{ color: '#ffffff' }}>{targetVer.authorName || 'غير محدد'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-dim, #94a3b8)', display: 'block', fontSize: '0.68rem' }}>{isRtl ? 'معرف المستخدم:' : 'Author ID:'}</span>
                        <code style={{ color: '#94a3b8', fontSize: '0.7rem' }}>{targetVer.authorId || '-'}</code>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-dim, #94a3b8)', display: 'block', fontSize: '0.68rem' }}>{isRtl ? 'تاريخ ووقت الرفع:' : 'Submitted At:'}</span>
                        <span style={{ color: '#e2e8f0', fontSize: '0.72rem' }}>
                          {new Date(targetVer.submittedAt || targetVer.createdAt).toLocaleString(isRtl ? 'ar-SA' : 'en-US')}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-dim, #94a3b8)', display: 'block', fontSize: '0.68rem' }}>{isRtl ? 'حالة القفل / الاتصال:' : 'Lock Status:'}</span>
                        <span style={{ color: targetVer.claimedBy ? '#f59e0b' : '#34d399', fontSize: '0.72rem', fontWeight: 600 }}>
                          {targetVer.claimedBy ? `محجوزة بواسطة (${targetVer.claimedBy.userName})` : (isRtl ? '✓ مرفوعة وجاهزة للاعتماد' : 'Ready')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: What is Being Approved */}
                  <div style={{
                    padding: '0.85rem',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#34d399', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <FileCheck2 size={14} />
                      <span>{isRtl ? 'ماذا يعتمد بالضبط (مواصفات الواجهات والمحتوى):' : 'Specifications being approved:'}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.76rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-dim, #94a3b8)', display: 'block', fontSize: '0.68rem' }}>{isRtl ? 'النظام ⬅ الجهة:' : 'System ⬅ Entity:'}</span>
                        <strong style={{ color: '#ffffff' }}>{pendingApprovalContainer.systemName} ⬅ {pendingApprovalContainer.integrationName}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-dim, #94a3b8)', display: 'block', fontSize: '0.68rem' }}>{isRtl ? 'الدور المعماري:' : 'Role:'}</span>
                        <span style={{
                          padding: '0.1rem 0.4rem',
                          borderRadius: '3px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          background: pendingApprovalContainer.role === 'PROVIDER' ? 'rgba(192, 132, 252, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                          color: pendingApprovalContainer.role === 'PROVIDER' ? '#c084fc' : '#38bdf8'
                        }}>
                          {pendingApprovalContainer.role === 'PROVIDER' ? (isRtl ? 'مزود (Provider)' : 'Provider') : (isRtl ? 'مستهلك (Consumer)' : 'Consumer')}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-dim, #94a3b8)', display: 'block', fontSize: '0.68rem' }}>{isRtl ? 'رقم الإصدار المراد اعتماده:' : 'Version:'}</span>
                        <span style={{ color: '#34d399', fontWeight: 800 }}>{targetVer.versionNumber}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-dim, #94a3b8)', display: 'block', fontSize: '0.68rem' }}>{isRtl ? 'عدد الواجهات المرفوعة:' : 'Endpoints Count:'}</span>
                        <span style={{ color: '#ffffff', fontWeight: 800 }}>{targetVer.endpointsCount} {isRtl ? 'واجهات برمجية' : 'endpoints'}</span>
                      </div>
                    </div>
                    <div style={{ marginTop: '0.6rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <span style={{ color: 'var(--text-dim, #94a3b8)', fontSize: '0.68rem', display: 'block' }}>{isRtl ? 'بيان التعديل / محتوى الرفع:' : 'Change Summary:'}</span>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.76rem', color: '#e2e8f0' }}>{targetVer.changeSummary}</p>
                    </div>

                    {/* Uploaded Endpoints Details List */}
                    <div style={{ marginTop: '0.65rem', paddingTop: '0.55rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>{isRtl ? 'قائمة الواجهات والعمليات البرمجية المعروضة للاعتماد:' : 'Endpoints to be approved:'}</span>
                        <span style={{ fontSize: '0.68rem', color: '#34d399', fontWeight: 600 }}>{targetVer.endpointsCount} {isRtl ? 'واجهة مفحوصة' : 'endpoints'}</span>
                      </div>

                      {(() => {
                        let parsedEndpoints: any[] = [];
                        if (targetVer.payloadSnapshot) {
                          try {
                            const p = typeof targetVer.payloadSnapshot === 'string' ? JSON.parse(targetVer.payloadSnapshot) : targetVer.payloadSnapshot;
                            if (Array.isArray(p)) parsedEndpoints = p;
                            else if (p && typeof p === 'object') {
                              if (Array.isArray(p.endpoints)) parsedEndpoints = p.endpoints;
                              else if (Array.isArray(p.allEndpoints)) parsedEndpoints = p.allEndpoints;
                            }
                          } catch {}
                        }

                        if (parsedEndpoints.length > 0) {
                          return (
                            <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingRight: '0.2rem' }}>
                              {parsedEndpoints.map((ep: any, idx: number) => {
                                const method = (ep.method || 'POST').toUpperCase();
                                const path = ep.path || ep.endpointPath || '/api/v1/...';
                                const summary = ep.summary || ep.shortName || ep.desc || ep.name || (isRtl ? `عملية برمجية #${idx + 1}` : `Endpoint #${idx + 1}`);
                                const methodColor = 
                                  method === 'GET' ? '#38bdf8' :
                                  method === 'POST' ? '#34d399' :
                                  method === 'PUT' ? '#fbbf24' :
                                  method === 'DELETE' ? '#f87171' : '#c084fc';
                                const methodBg = 
                                  method === 'GET' ? 'rgba(56, 189, 248, 0.15)' :
                                  method === 'POST' ? 'rgba(52, 211, 153, 0.15)' :
                                  method === 'PUT' ? 'rgba(251, 191, 36, 0.15)' :
                                  method === 'DELETE' ? 'rgba(248, 113, 113, 0.15)' : 'rgba(192, 132, 252, 0.15)';

                                return (
                                  <div key={idx} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.35rem 0.6rem',
                                    borderRadius: '4px',
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    fontSize: '0.72rem'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden' }}>
                                      <span style={{
                                        padding: '0.1rem 0.35rem',
                                        borderRadius: '3px',
                                        fontSize: '0.62rem',
                                        fontWeight: 800,
                                        background: methodBg,
                                        color: methodColor,
                                        fontFamily: 'monospace'
                                      }}>
                                        {method}
                                      </span>
                                      <span style={{ fontFamily: 'monospace', color: '#e2e8f0', direction: 'ltr', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                        {path}
                                      </span>
                                    </div>
                                    <span style={{ color: 'var(--text-dim, #94a3b8)', fontSize: '0.68rem', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>
                                      {summary}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }

                        return (
                          <div style={{ padding: '0.45rem 0.6rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px', fontSize: '0.72rem', color: '#94a3b8' }}>
                            {targetVer.endpointsCount} {isRtl ? 'واجهة مسجلة وموثقة داخل الوثيقة وجاهزة للاعتماد.' : 'endpoints registered and ready for approval.'}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Reject Mode Toggle */}
                  {isRejectingInModal ? (
                    <div>
                      <label style={{ fontSize: '0.74rem', color: '#f87171', display: 'block', marginBottom: '0.35rem', fontWeight: 700 }}>
                        {isRtl ? 'سبب الرفض (إلزامي لإعادة الوثيقة للمحرر):' : 'Rejection Reason (Required):'}
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={rejectionReasonInput}
                        onChange={e => setRejectionReasonInput(e.target.value)}
                        placeholder={isRtl ? 'اكتب ملاحظات الرفض ونقاط التعديل المطلوبة بدقة...' : 'Enter rejection reason...'}
                        style={{
                          width: '100%',
                          padding: '0.45rem 0.7rem',
                          fontSize: '0.8rem',
                          background: '#0f172a',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          borderRadius: '4px',
                          color: '#ffffff',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  ) : null}

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setPendingApprovalContainer(null)}
                      style={{
                        padding: '0.45rem 0.9rem',
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {!isRejectingInModal ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setIsRejectingInModal(true)}
                            style={{
                              padding: '0.45rem 0.9rem',
                              borderRadius: '4px',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: '#f87171',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {isRtl ? 'رفض المسودة' : 'Reject Draft'}
                          </button>
                          <button
                            type="button"
                            onClick={handleConfirmApproveFromModal}
                            style={{
                              padding: '0.45rem 1.25rem',
                              borderRadius: '4px',
                              border: 'none',
                              background: '#10b981',
                              color: '#ffffff',
                              fontSize: '0.8rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              boxShadow: '0 2px 10px rgba(16, 185, 129, 0.4)'
                            }}
                          >
                            <Check size={14} />
                            <span>{isRtl ? 'تأكيد واعتماد الوثيقة رسمياً' : 'Confirm & Approve'}</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setIsRejectingInModal(false)}
                            style={{
                              padding: '0.45rem 0.85rem',
                              borderRadius: '4px',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              background: 'transparent',
                              color: '#94a3b8',
                              fontSize: '0.78rem',
                              cursor: 'pointer'
                            }}
                          >
                            {isRtl ? 'تراجع عن الرفض' : 'Back'}
                          </button>
                          <button
                            type="button"
                            onClick={handleConfirmRejectFromModal}
                            style={{
                              padding: '0.45rem 1.1rem',
                              borderRadius: '4px',
                              border: 'none',
                              background: '#ef4444',
                              color: '#ffffff',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {isRtl ? 'تأكيد الرفض والإرجاع' : 'Confirm Rejection'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Modal 3: Empty Document Blocking Warning (When Approving Empty Doc) ── */}
      {emptyDocWarningContainer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
        >
          <div
            style={{
              background: '#0f172a',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
              width: '100%',
              maxWidth: '520px',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '0.85rem 1.25rem',
                borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
                background: 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171' }}>
                <ShieldAlert size={18} />
                <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>
                  {isRtl ? 'لا يمكن الاعتماد: الوثيقة فارغة تماماً!' : 'Cannot Approve: Document is Empty!'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEmptyDocWarningContainer(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                padding: '0.75rem',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#fca5a5',
                fontSize: '0.78rem',
                lineHeight: '1.5'
              }}>
                {isRtl 
                  ? 'لم يقم المستخدم برفع وتوثيق أي واجهات برمجية (Endpoints) في هذه الوثيقة حتى الآن! بحسب قواعد الحوكمة المؤسسية الصارمة، لا يجوز بأي حال اعتماد وثيقة خالية من العمليات والمواصفات.'
                  : 'No endpoints have been uploaded to this document yet! Empty documents cannot be approved.'
                }
              </div>

              {/* Document Overview */}
              <div style={{
                padding: '0.75rem',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                fontSize: '0.75rem'
              }}>
                <div>
                  <span style={{ color: 'var(--text-dim, #94a3b8)', display: 'block', fontSize: '0.68rem' }}>{isRtl ? 'النظام ⬅ الجهة:' : 'System ⬅ Entity:'}</span>
                  <strong style={{ color: '#ffffff' }}>{emptyDocWarningContainer.systemName} ⬅ {emptyDocWarningContainer.integrationName}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim, #94a3b8)', display: 'block', fontSize: '0.68rem' }}>{isRtl ? 'الدور المعماري:' : 'Role:'}</span>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                    {emptyDocWarningContainer.role === 'PROVIDER' ? (isRtl ? 'مزود (Provider)' : 'Provider') : (isRtl ? 'مستهلك (Consumer)' : 'Consumer')}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim, #94a3b8)', display: 'block', fontSize: '0.68rem' }}>{isRtl ? 'محرر الوثيقة:' : 'Author:'}</span>
                  <span style={{ color: '#ffffff' }}>
                    {emptyDocWarningContainer.activeDraftVersion?.authorName || emptyDocWarningContainer.pendingReviewVersion?.authorName || 'محرر الوثائق'}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim, #94a3b8)', display: 'block', fontSize: '0.68rem' }}>{isRtl ? 'عدد الواجهات المرفوعة:' : 'Uploaded Endpoints:'}</span>
                  <span style={{ color: '#f87171', fontWeight: 800 }}>0 {isRtl ? 'واجهات (فارغة)' : 'endpoints (empty)'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEmptyDocWarningContainer(null)}
                  style={{
                    padding: '0.45rem 0.9rem',
                    borderRadius: '4px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'transparent',
                    color: '#94a3b8',
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  {isRtl ? 'إغلاق' : 'Close'}
                </button>

                {onNavigateToEditor && (
                  <button
                    type="button"
                    onClick={() => {
                      const sysKey = emptyDocWarningContainer.systemKey;
                      const intKey = emptyDocWarningContainer.integrationKey;
                      setEmptyDocWarningContainer(null);
                      onNavigateToEditor(sysKey, intKey);
                    }}
                    style={{
                      padding: '0.45rem 1.15rem',
                      borderRadius: '4px',
                      border: 'none',
                      background: '#0284c7',
                      color: '#ffffff',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      boxShadow: '0 2px 10px rgba(2, 132, 199, 0.35)'
                    }}
                  >
                    <Edit3 size={13} />
                    <span>{isRtl ? 'الانتقال للمحرر لرفع الواجهات الآن' : 'Go to Editor & Add Endpoints'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal 4: Document Versions History Modal (سجل إصدارات الوثيقة ومن يعمل عليها) ── */}
      {activeVersionsContainer && (
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
        >
          <div
            style={{
              background: '#0f172a',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
              width: '100%',
              maxWidth: '860px',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '0.85rem 1.25rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(255, 255, 255, 0.02)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <History size={18} style={{ color: '#38bdf8' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                    {isRtl ? 'سجل إصدارات الوثيقة ومن يعمل عليها' : 'Document Versions & Active Collaborators'}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem', fontSize: '0.72rem', color: '#94a3b8' }}>
                    <span>{activeVersionsContainer.systemName} ⟷ {activeVersionsContainer.integrationName}</span>
                    <span>•</span>
                    <span style={{ color: activeVersionsContainer.role === 'PROVIDER' ? '#38bdf8' : '#a78bfa' }}>
                      {activeVersionsContainer.role === 'PROVIDER' ? (isRtl ? 'مزود' : 'Provider') : (isRtl ? 'مستهلك' : 'Consumer')}
                    </span>
                    <span>•</span>
                    <code style={{ fontSize: '0.68rem', color: '#64748b' }}>{activeVersionsContainer.docKey}</code>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveVersionsContainer(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.3rem' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Table */}
            <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '0.72rem', color: '#94a3b8' }}>
                    <th style={{ padding: '0.6rem 0.75rem' }}>{isRtl ? 'الإصدار' : 'Version'}</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>{isRtl ? 'الحالة' : 'Status'}</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>{isRtl ? 'من يعمل على هذا الإصدار / المحرر' : 'Active User / Author'}</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>{isRtl ? 'الواجهات' : 'Endpoints'}</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>{isRtl ? 'تاريخ التحديث / الاعتماد' : 'Date'}</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>{isRtl ? 'ملخص التغيير' : 'Changelog'}</th>
                    <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>{isRtl ? 'إجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  {activeVersionsContainer.allVersions.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.8rem' }}>
                        {isRtl ? 'لا توجد إصدارات مسجلة لهذه الوثيقة' : 'No recorded versions found'}
                      </td>
                    </tr>
                  ) : (
                    activeVersionsContainer.allVersions.map((v) => {
                      const isLockActive = activeLock && activeLock.systemKey === activeVersionsContainer.systemKey && activeLock.integrationKey === activeVersionsContainer.integrationKey;
                      const isApproved = v.status === 'APPROVED';
                      const isDraft = v.status === 'DRAFT';
                      const isReview = v.status === 'UNDER_REVIEW';

                      return (
                        <tr
                          key={v.versionId || v.versionNumber}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            background: isApproved ? 'rgba(16, 185, 129, 0.03)' : isDraft ? 'rgba(56, 189, 248, 0.03)' : 'transparent'
                          }}
                        >
                          {/* Version Badge */}
                          <td style={{ padding: '0.65rem 0.75rem' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              background: isApproved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                              color: isApproved ? '#34d399' : '#e2e8f0',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              fontFamily: 'monospace'
                            }}>
                              <GitBranch size={10} />
                              {v.versionNumber}
                            </span>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '0.65rem 0.75rem' }}>
                            {isApproved && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#34d399', fontSize: '0.72rem', fontWeight: 700 }}>
                                <CheckCircle2 size={12} /> {isRtl ? 'معتمد ونافذ' : 'Live Approved'}
                              </span>
                            )}
                            {isDraft && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#38bdf8', fontSize: '0.72rem', fontWeight: 700 }}>
                                <Edit3 size={12} /> {isRtl ? 'مسودة جارية' : 'Draft'}
                              </span>
                            )}
                            {isReview && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#fbbf24', fontSize: '0.72rem', fontWeight: 700 }}>
                                <Clock size={12} /> {isRtl ? 'قيد المراجعة' : 'In Review'}
                              </span>
                            )}
                            {v.status === 'SUPERSEDED' && (
                              <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                                {isRtl ? 'إصدار سابق' : 'Superseded'}
                              </span>
                            )}
                            {v.status === 'REJECTED' && (
                              <span style={{ color: '#f87171', fontSize: '0.72rem', fontWeight: 600 }}>
                                {isRtl ? 'مرفوض' : 'Rejected'}
                              </span>
                            )}
                          </td>

                          {/* Who works on this version */}
                          <td style={{ padding: '0.65rem 0.75rem' }}>
                            {isDraft && isLockActive ? (
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e', display: 'inline-block' }} />
                                  <strong style={{ color: '#ffffff', fontSize: '0.78rem' }}>{activeLock.claimedByName}</strong>
                                </div>
                                <span style={{ fontSize: '0.64rem', color: '#4ade80' }}>
                                  {isRtl ? '🟢 يعمل عليه الآن' : 'Editing Now'}
                                </span>
                              </div>
                            ) : (
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <strong style={{ color: '#e2e8f0', fontSize: '0.78rem' }}>
                                    {v.authorName || (isApproved ? (v.approvedBy || 'مدير النظام') : 'محرر')}
                                  </strong>
                                </div>
                                <span style={{ fontSize: '0.64rem', color: '#94a3b8' }}>
                                  {isApproved ? (isRtl ? `معتمد بواسطة: ${v.approvedBy || 'المشرف'}` : `Approved by ${v.approvedBy}`) : (isRtl ? 'المحرر المنشئ' : 'Author')}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Endpoints Count */}
                          <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.75rem', color: '#e2e8f0' }}>
                            <span style={{ fontWeight: 700 }}>{v.endpointsCount || 0}</span> {isRtl ? 'واجهة' : 'eps'}
                          </td>

                          {/* Date */}
                          <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.7rem', color: '#94a3b8' }}>
                            {v.createdAt ? new Date(v.createdAt).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US') : '—'}
                          </td>

                          {/* Changelog */}
                          <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.72rem', color: '#cbd5e1', maxWidth: '200px' }}>
                            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={v.changelogSummary}>
                              {v.changelogSummary || (isRtl ? 'إصدار أولي للوثيقة' : 'Initial version')}
                            </span>
                          </td>

                          {/* Action */}
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                            {isDraft && onNavigateToEditor ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const sys = activeVersionsContainer.systemKey;
                                  const itg = activeVersionsContainer.integrationKey;
                                  setActiveVersionsContainer(null);
                                  onNavigateToEditor(sys, itg);
                                }}
                                style={{
                                  padding: '0.25rem 0.55rem',
                                  borderRadius: '4px',
                                  background: '#0284c7',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                {isRtl ? 'تحرير المسودة' : 'Edit Draft'}
                              </button>
                            ) : onNavigateToDoc ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const sys = activeVersionsContainer.systemKey;
                                  const itg = activeVersionsContainer.integrationKey;
                                  setActiveVersionsContainer(null);
                                  onNavigateToDoc(sys, itg);
                                }}
                                style={{
                                  padding: '0.25rem 0.55rem',
                                  borderRadius: '4px',
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  color: '#e2e8f0',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  fontSize: '0.68rem',
                                  cursor: 'pointer'
                                }}
                              >
                                {isRtl ? 'عرض الوثيقة' : 'View'}
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '0.75rem 1.25rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(255, 255, 255, 0.02)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                {isRtl 
                  ? `إجمالي الإصدارات: ${activeVersionsContainer.allVersions.length}`
                  : `Total Versions: ${activeVersionsContainer.allVersions.length}`
                }
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {/* Bump button inside modal if approved and no draft */}
                {activeVersionsContainer.currentApprovedVersion && !activeVersionsContainer.activeDraftVersion && !activeVersionsContainer.pendingReviewVersion && canCreate && (
                  <button
                    type="button"
                    onClick={() => {
                      const container = activeVersionsContainer;
                      setActiveVersionsContainer(null);
                      handleOpenBumpPage(container);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '4px',
                      background: 'rgba(99, 102, 241, 0.2)',
                      color: '#a5b4fc',
                      border: '1px solid rgba(99, 102, 241, 0.35)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <GitBranch size={12} />
                    {isRtl ? 'طلب إصدار جديد للوثيقة' : 'New Version Request'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveVersionsContainer(null)}
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: '4px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'transparent',
                    color: '#e2e8f0',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  {isRtl ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
