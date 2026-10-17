import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Inbox, 
  Send, 
  Sliders, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowLeft, 
  FileCheck2,
  Lock,
  Plus,
  Trash2,
  Sparkles,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { 
  ApprovalInboxItem, 
  ApprovalRequest, 
  WorkflowPolicy 
} from '../../types/governance';
import { governanceService } from '../../services/governanceService';
import { docGovernanceEngine } from '../../services/docGovernanceEngine';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../../i18n';
import { SystemModule } from '../../types/schema';

interface GovernanceManagementViewProps {
  systems?: Record<string, SystemModule>;
  onNavigateToDoc?: (systemKey: string, integrationKey: string) => void;
  onNavigateToEditor?: (systemKey: string, integrationKey: string) => void;
  onNotify?: (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
  onRefreshCount?: () => void;
}

export const GovernanceManagementView: React.FC<GovernanceManagementViewProps> = ({
  systems = {},
  onNavigateToDoc,
  onNavigateToEditor,
  onNotify,
  onRefreshCount
}) => {
  const { user } = useAuth();
  const { isRtl } = useLanguage();

  const [activeTab, setActiveTab] = useState<'inbox' | 'my-requests'>('inbox');
  const [inboxItems, setInboxItems] = useState<ApprovalInboxItem[]>([]);
  const [myRequests, setMyRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalInboxItem | null>(null);

  // Approval / Rejection form state
  const [approvalNotes, setApprovalNotes] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [showApproveConfirm, setShowApproveConfirm] = useState<boolean>(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState<boolean>(false);
  const [actionInProgress, setActionInProgress] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'inbox') {
        let items: ApprovalInboxItem[] = [];
        try {
          const res = await governanceService.getInbox();
          items = res.data || [];
        } catch (e) {
          console.warn('[Governance] Backend getInbox error:', e);
        }

        // Bridge: Also scan docGovernanceEngine for any documents currently UNDER_REVIEW
        const docContainers = docGovernanceEngine.getContainersMatrix(systems);
        docContainers.forEach(c => {
          if (c.pendingReviewVersion) {
            const docReqId = `REQ-DOC-${c.documentKey}`;
            const exists = items.some(i => i.targetResourceId === c.documentKey || i.id === docReqId);
            if (!exists) {
              const pendingDoc = c.pendingReviewVersion;
              items.unshift({
                id: docReqId,
                resourceKey: 'catalog:documents',
                resourceNameAr: 'وثائق ومواصفات الـ API',
                resourceNameEn: 'API Documentation & Specifications',
                actionType: 'CUSTOM',
                actionDescriptionAr: `طلب اعتماد مسودة وثيقة الـ API (${pendingDoc.versionNumber}) لنظام ${c.systemName} ⟷ ${c.integrationName}`,
                actionDescriptionEn: `Approval request for API Doc (${pendingDoc.versionNumber}) for ${c.systemName} ⟷ ${c.integrationName}`,
                targetResourceId: c.documentKey,
                payload: {
                  documentKey: c.documentKey,
                  systemKey: c.systemKey,
                  integrationKey: c.integrationKey,
                  systemName: c.systemName,
                  integrationName: c.integrationName,
                  versionNumber: pendingDoc.versionNumber,
                  changeSummary: pendingDoc.changeSummary || 'تحديث وتأسيس مواصفات الربط البرمجي.',
                  endpointsCount: pendingDoc.endpointsCount || 0
                },
                diffSummary: [],
                makerId: pendingDoc.authorId || 'maker_user',
                makerName: pendingDoc.authorName || 'مهندس التوثيق',
                makerGroup: 'فريق المعمارية والتكامل',
                submittedAt: pendingDoc.submittedAt || pendingDoc.createdAt,
                status: 'PENDING',
                currentStageOrder: 1,
                totalStages: 1,
                stages: [{
                  stageOrder: 1,
                  stageKey: 'architect_approval',
                  stageNameAr: 'اعتماد معماري الـ API والمواصفات',
                  stageNameEn: 'API Architect Specification Approval',
                  requiredPermission: 'governance:approve',
                  minApprovers: 1
                }],
                approvalTrail: [],
                canApproveCurrentStage: true,
                activeStage: {
                  stageOrder: 1,
                  stageKey: 'architect_approval',
                  stageNameAr: 'اعتماد معماري الـ API والمواصفات',
                  stageNameEn: 'API Architect Specification Approval',
                  requiredPermission: 'governance:approve',
                  minApprovers: 1
                }
              });
            }
          }
        });

        setInboxItems(items);
        if (items.length > 0 && (!selectedRequest || !items.some(d => d.id === selectedRequest.id))) {
          setSelectedRequest(items[0]);
        }
      } else if (activeTab === 'my-requests') {
        let items: ApprovalRequest[] = [];
        try {
          const res = await governanceService.getMyRequests();
          items = res || [];
        } catch (e) {
          console.warn('[Governance] Backend getMyRequests error:', e);
        }

        // Bridge: Also scan docGovernanceEngine for any documents submitted
        const docContainers = docGovernanceEngine.getContainersMatrix(systems);
        docContainers.forEach(c => {
          if (c.pendingReviewVersion) {
            const docReqId = `REQ-DOC-${c.documentKey}`;
            const exists = items.some(i => i.targetResourceId === c.documentKey || i.id === docReqId);
            if (!exists) {
              const pendingDoc = c.pendingReviewVersion;
              items.unshift({
                id: docReqId,
                resourceKey: 'catalog:documents',
                resourceNameAr: 'وثائق ومواصفات الـ API',
                resourceNameEn: 'API Documentation & Specifications',
                actionType: 'CUSTOM',
                actionDescriptionAr: `طلب اعتماد مسودة وثيقة الـ API (${pendingDoc.versionNumber}) لنظام ${c.systemName} ⟷ ${c.integrationName}`,
                actionDescriptionEn: `Approval request for API Doc (${pendingDoc.versionNumber}) for ${c.systemName} ⟷ ${c.integrationName}`,
                targetResourceId: c.documentKey,
                payload: {
                  documentKey: c.documentKey,
                  systemKey: c.systemKey,
                  integrationKey: c.integrationKey,
                  systemName: c.systemName,
                  integrationName: c.integrationName,
                  versionNumber: pendingDoc.versionNumber,
                  changeSummary: pendingDoc.changeSummary || 'تحديث وتأسيس مواصفات الربط البرمجي.',
                  endpointsCount: pendingDoc.endpointsCount || 0
                },
                diffSummary: [],
                makerId: pendingDoc.authorId || user?.id || 'maker_user',
                makerName: pendingDoc.authorName || user?.displayName || 'مهندس التوثيق',
                makerGroup: 'فريق المعمارية والتكامل',
                submittedAt: pendingDoc.submittedAt || pendingDoc.createdAt,
                status: 'PENDING',
                currentStageOrder: 1,
                totalStages: 1,
                stages: [{
                  stageOrder: 1,
                  stageKey: 'architect_approval',
                  stageNameAr: 'اعتماد معماري الـ API والمواصفات',
                  stageNameEn: 'API Architect Specification Approval',
                  requiredPermission: 'governance:approve',
                  minApprovers: 1
                }],
                approvalTrail: []
              });
            }
          }
        });

        setMyRequests(items);
      }
      if (onRefreshCount) onRefreshCount();
    } catch (err: any) {
      if (onNotify) {
        onNotify('خطأ في تحميل البيانات', err.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setActionInProgress(true);
    try {
      const isDoc =
        selectedRequest.resourceKey === 'catalog:documents' ||
        selectedRequest.targetResourceId?.startsWith('DOC_') ||
        selectedRequest.id.startsWith('REQ-DOC-') ||
        !!selectedRequest.payload?.documentKey;

      if (isDoc) {
        const sysKey = selectedRequest.payload?.systemKey;
        const intKey = selectedRequest.payload?.integrationKey;
        if (sysKey && intKey) {
          docGovernanceEngine.approveVersion({
            systemKey: sysKey,
            integrationKey: intKey,
            approverId: user?.id,
            approverName: user?.displayName || user?.username || 'المشرف المعتمد',
            isSuperAdminOverride: true
          });
        }
      }

      if (!selectedRequest.id.startsWith('REQ-DOC-')) {
        await governanceService.approveStage(selectedRequest.id, approvalNotes);
      }

      if (onNotify) {
        onNotify(
          'تم الاعتماد بنجاح',
          isDoc
            ? 'تم اعتماد مسودة وثيقة الـ API بنجاح وأصبحت الآن الوثيقة النافذة الرسمية (APPROVED)!'
            : 'تم توثيق اعتمادك الرقمي لهذه المرحلة بنجاح وتطبيق التعديل.',
          'success'
        );
      }
      setShowApproveConfirm(false);
      setApprovalNotes('');
      await loadData();
    } catch (err: any) {
      if (onNotify) onNotify('فشل الاعتماد', err.message, 'error');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!rejectionReason.trim()) {
      if (onNotify) onNotify('تنبيه', 'يجب كتابة سبب الرفض لتبرير القرار رقابياً.', 'warning');
      return;
    }
    setActionInProgress(true);
    try {
      const isDoc =
        selectedRequest.resourceKey === 'catalog:documents' ||
        selectedRequest.targetResourceId?.startsWith('DOC_') ||
        selectedRequest.id.startsWith('REQ-DOC-') ||
        !!selectedRequest.payload?.documentKey;

      if (isDoc) {
        const sysKey = selectedRequest.payload?.systemKey;
        const intKey = selectedRequest.payload?.integrationKey;
        if (sysKey && intKey) {
          docGovernanceEngine.rejectVersion({
            systemKey: sysKey,
            integrationKey: intKey,
            rejectorName: user?.displayName || user?.username || 'المشرف المعتمد',
            reason: rejectionReason
          });
        }
      }

      if (!selectedRequest.id.startsWith('REQ-DOC-')) {
        await governanceService.rejectRequest(selectedRequest.id, rejectionReason);
      }

      if (onNotify) {
        onNotify('تم الرفض', 'تم رفض الطلب بنجاح وتوثيق سبب الرفض في السجل الرقابي.', 'info');
      }
      setShowRejectConfirm(false);
      setRejectionReason('');
      await loadData();
    } catch (err: any) {
      if (onNotify) onNotify('فشل الرفض', err.message, 'error');
    } finally {
      setActionInProgress(false);
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'CREATE': return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
      case 'UPDATE': return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' };
      case 'DELETE': return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' };
      default: return { bg: 'rgba(147, 51, 234, 0.15)', text: '#c084fc', border: 'rgba(147, 51, 234, 0.3)' };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span style={{ padding: '0.2rem 0.55rem', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle2 size={12} /> معتمد ونافذ</span>;
      case 'REJECTED':
        return <span style={{ padding: '0.2rem 0.55rem', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><XCircle size={12} /> مرفوض</span>;
      default:
        return <span style={{ padding: '0.2rem 0.55rem', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={12} /> قيد المراجعة</span>;
    }
  };

  const pendingCount = inboxItems.filter(i => i.canApproveCurrentStage).length;

  return (
    <div className="iam-console sovereign-dynamic-theme" style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100%', flex: 1, overflowY: 'auto' }} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* 1. Header Banner - Clean & Formal Banking Style */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.75rem', background: 'var(--surface, #0f172a)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text, #ffffff)', margin: 0, letterSpacing: '-0.01em' }}>
            {isRtl ? 'مركز الاعتمادات والمرفوعات' : 'Approvals & Submissions Hub'}
          </h2>
          <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-dim, #94a3b8)', border: '1px solid rgba(255, 255, 255, 0.08)', fontWeight: 600 }}>
            Maker-Checker
          </span>
        </div>

        {/* Tab Selector - Minimal & Functional */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '0.2rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              onClick={() => setActiveTab('inbox')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.9rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: activeTab === 'inbox' ? 700 : 500,
                background: activeTab === 'inbox' ? 'var(--primary, #6366f1)' : 'transparent',
                color: activeTab === 'inbox' ? '#ffffff' : 'var(--text-dim, #94a3b8)',
                boxShadow: activeTab === 'inbox' ? '0 2px 8px var(--primary-glow, rgba(99, 102, 241, 0.35))' : 'none',
                transition: 'all 0.15s'
              }}
            >
              <span>{isRtl ? 'الوارد' : 'Inbox'}</span>
              {pendingCount > 0 && (
                <span style={{ background: '#f59e0b', color: '#000000', borderRadius: '999px', fontSize: '0.65rem', padding: '0.05rem 0.4rem', fontWeight: 800 }}>
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('my-requests')}
              style={{
                padding: '0.4rem 0.9rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: activeTab === 'my-requests' ? 700 : 500,
                background: activeTab === 'my-requests' ? 'var(--primary, #6366f1)' : 'transparent',
                color: activeTab === 'my-requests' ? '#ffffff' : 'var(--text-dim, #94a3b8)',
                boxShadow: activeTab === 'my-requests' ? '0 2px 8px var(--primary-glow, rgba(99, 102, 241, 0.35))' : 'none',
                transition: 'all 0.15s'
              }}
            >
              {isRtl ? 'طلباتي' : 'My Requests'}
            </button>
          </div>

          {/* Refresh Action */}
          <button
            onClick={loadData}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '7px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'var(--text-dim, #94a3b8)',
              cursor: 'pointer'
            }}
            title={isRtl ? 'تحديث البيانات' : 'Refresh'}
            aria-label="Refresh"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 2. Main Content Body - Clean Natural Flow */}
      <div style={{ flex: 1, padding: '1rem 1.75rem' }}>
        
        {/* --- TAB 1: INBOX SPLIT-VIEW --- */}
        {activeTab === 'inbox' && (
          <div style={{ display: 'flex', gap: '1.25rem', minHeight: '620px' }}>
            {/* Right Pane: Requests List */}
            <div 
              style={{
                width: '360px',
                background: 'var(--surface, #0f172a)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text, #ffffff)' }}>
                  {isRtl ? 'المهام المعلقة' : 'Pending Approvals'}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim, #94a3b8)' }}>{inboxItems.length}</span>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {inboxItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-dim, #64748b)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>
                      {isRtl ? 'لا توجد مهام معلقة' : 'No Pending Approvals'}
                    </div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {isRtl ? 'صندوق الوارد نظيف ومطابق للمعايير.' : 'Inbox is all clear.'}
                    </div>
                  </div>
                ) : (
                  inboxItems.map((item) => {
                    const badge = getActionBadgeColor(item.actionType);
                    const isSelected = selectedRequest?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedRequest(item)}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '6px',
                          border: isSelected ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.05)',
                          background: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                          cursor: 'pointer',
                          transition: 'background 0.15s, border-color 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim, #94a3b8)', fontFamily: 'monospace' }}>
                            #{item.id}
                          </span>
                          <span style={{ fontSize: '0.66rem', padding: '0.1rem 0.4rem', borderRadius: '3px', background: badge.bg, color: badge.text, border: `1px solid ${badge.border}`, fontWeight: 700 }}>
                            {item.actionType === 'CREATE' ? (isRtl ? 'إضافة' : 'Create') : item.actionType === 'UPDATE' ? (isRtl ? 'تعديل' : 'Update') : (isRtl ? 'حذف' : 'Delete')}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.35rem', lineHeight: 1.35 }}>
                          {item.actionDescriptionAr}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-dim, #94a3b8)' }}>
                          <span>{item.makerName}</span>
                          <span style={{ fontWeight: 600, color: item.canApproveCurrentStage ? '#38bdf8' : 'var(--text-dim, #94a3b8)' }}>
                            {isRtl ? `مرحلة ${item.currentStageOrder} من ${item.totalStages}` : `Stage ${item.currentStageOrder}/${item.totalStages}`}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Left Pane: Detailed Inspection & Approval Actions */}
            <div 
              style={{
                flex: 1,
                background: 'var(--surface, #0f172a)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              {selectedRequest ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* Inspection Header - Clean, Direct, Crisp */}
                  <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255, 255, 255, 0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)', fontFamily: 'monospace' }}>
                            #{selectedRequest.id}
                          </span>
                          <span style={{ fontSize: '0.72rem', padding: '0.1rem 0.45rem', borderRadius: '3px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', fontWeight: 600 }}>
                            {selectedRequest.resourceNameAr}
                          </span>
                          {getStatusBadge(selectedRequest.status)}
                        </div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main, #ffffff)', margin: 0 }}>
                          {selectedRequest.actionDescriptionAr}
                        </h3>
                      </div>

                      <div style={{ textAlign: isRtl ? 'left' : 'right', fontSize: '0.74rem', color: 'var(--text-dim, #94a3b8)', lineHeight: 1.5 }}>
                        <div>{isRtl ? 'المُدخل:' : 'Maker:'} <strong style={{ color: '#e2e8f0' }}>{selectedRequest.makerName}</strong> ({selectedRequest.makerGroup})</div>
                        <div>{new Date(selectedRequest.submittedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</div>
                      </div>
                    </div>

                    {/* Clean Stepper for Stages */}
                    <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', overflowX: 'auto' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim, #94a3b8)', fontWeight: 600, marginInlineEnd: '0.25rem' }}>
                        {isRtl ? 'المسار:' : 'Pipeline:'}
                      </span>
                      {selectedRequest.stages.map((stage, idx) => {
                        const isCompleted = idx + 1 < selectedRequest.currentStageOrder || selectedRequest.status === 'APPROVED';
                        const isCurrent = idx + 1 === selectedRequest.currentStageOrder && selectedRequest.status === 'PENDING';
                        const priorDecision = selectedRequest.approvalTrail.find(t => t.stageOrder === stage.stageOrder);

                        return (
                          <React.Fragment key={stage.stageOrder}>
                            <div 
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.3rem 0.65rem',
                                borderRadius: '4px',
                                background: isCompleted ? 'rgba(16, 185, 129, 0.1)' : isCurrent ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                                border: isCompleted ? '1px solid rgba(16, 185, 129, 0.3)' : isCurrent ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.06)'
                              }}
                            >
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isCompleted ? '#34d399' : isCurrent ? '#38bdf8' : '#64748b' }}>
                                {stage.stageOrder}.
                              </span>
                              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: isCompleted ? '#34d399' : isCurrent ? 'var(--text-main, #ffffff)' : 'var(--text-dim, #94a3b8)' }}>
                                {stage.stageNameAr}
                              </span>
                              {priorDecision && (
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-dim, #94a3b8)' }}>
                                  ({priorDecision.approverName})
                                </span>
                              )}
                            </div>
                            {idx < selectedRequest.stages.length - 1 && (
                              <ArrowLeft size={13} style={{ color: '#64748b' }} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  {/* High-Density Visual Diff Viewer */}
                  <div style={{ flex: 1, padding: '1rem 1.5rem', overflowY: 'auto' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dim, #94a3b8)', marginBottom: '0.65rem' }}>
                      {isRtl ? 'التعديلات المقترحة (الفروقات):' : 'Proposed Modifications (Diff):'}
                    </div>

                    {selectedRequest.diffSummary && selectedRequest.diffSummary.length > 0 ? (
                      <div style={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '6px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left' }}>
                          <thead>
                            <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                              <th style={{ padding: '0.55rem 0.85rem', fontSize: '0.74rem', color: 'var(--text-dim, #94a3b8)', fontWeight: 600 }}>{isRtl ? 'الحقل' : 'Field'}</th>
                              <th style={{ padding: '0.55rem 0.85rem', fontSize: '0.74rem', color: '#f87171', fontWeight: 600 }}>{isRtl ? 'القيمة السابقة' : 'Previous Value'}</th>
                              <th style={{ padding: '0.55rem 0.85rem', fontSize: '0.74rem', color: '#34d399', fontWeight: 600 }}>{isRtl ? 'القيمة المقترحة' : 'Proposed Value'}</th>
                              <th style={{ padding: '0.55rem 0.85rem', fontSize: '0.74rem', color: 'var(--text-dim, #94a3b8)', fontWeight: 600, width: '80px' }}>{isRtl ? 'النوع' : 'Action'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedRequest.diffSummary.map((delta, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)' }}>
                                <td style={{ padding: '0.55rem 0.85rem', fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0' }}>
                                  {delta.labelAr}
                                  <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'monospace', display: 'block' }}>{delta.field}</span>
                                </td>
                                <td style={{ padding: '0.55rem 0.85rem', fontSize: '0.78rem', color: '#fca5a5' }}>
                                  {delta.oldValue !== null && delta.oldValue !== undefined ? (
                                    <span style={{ textDecoration: 'line-through', background: 'rgba(239, 68, 68, 0.1)', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>
                                      {String(delta.oldValue)}
                                    </span>
                                  ) : (
                                    <span style={{ color: '#64748b', fontSize: '0.72rem' }}>—</span>
                                  )}
                                </td>
                                <td style={{ padding: '0.55rem 0.85rem', fontSize: '0.78rem', color: '#86efac' }}>
                                  {delta.newValue !== null && delta.newValue !== undefined ? (
                                    <span style={{ background: 'rgba(16, 185, 129, 0.12)', padding: '0.1rem 0.35rem', borderRadius: '3px', fontWeight: 600 }}>
                                      {String(delta.newValue)}
                                    </span>
                                  ) : (
                                    <span style={{ color: '#ef4444', fontSize: '0.72rem' }}>{isRtl ? 'محذوف' : 'Deleted'}</span>
                                  )}
                                </td>
                                <td style={{ padding: '0.55rem 0.85rem' }}>
                                  <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', borderRadius: '3px', fontWeight: 700, background: delta.type === 'ADDED' ? 'rgba(16, 185, 129, 0.15)' : delta.type === 'MODIFIED' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: delta.type === 'ADDED' ? '#34d399' : delta.type === 'MODIFIED' ? '#60a5fa' : '#f87171' }}>
                                    {delta.type === 'ADDED' ? (isRtl ? 'إضافة' : 'Add') : delta.type === 'MODIFIED' ? (isRtl ? 'تعديل' : 'Modify') : (isRtl ? 'حذف' : 'Delete')}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', color: 'var(--text-dim, #94a3b8)', fontSize: '0.75rem' }}>
                        <span>{isRtl ? 'الحمولة البرمجية (Payload):' : 'Raw Payload:'}</span>
                        <pre style={{ margin: '0.35rem 0 0', padding: '0.5rem', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '4px', fontSize: '0.72rem', color: '#38bdf8', overflowX: 'auto' }}>
                          {JSON.stringify(selectedRequest.payload, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Minimal Trail of Decisions */}
                    {selectedRequest.approvalTrail.length > 0 && (
                      <div style={{ marginTop: '1.25rem' }}>
                        <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-dim, #94a3b8)', marginBottom: '0.45rem' }}>
                          {isRtl ? 'القرارات المسجلة في هذا الطلب:' : 'Recorded Decisions:'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {selectedRequest.approvalTrail.map((record, rIdx) => (
                            <div key={rIdx} style={{ padding: '0.5rem 0.75rem', borderRadius: '5px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem' }}>
                              <div>
                                <span style={{ fontWeight: 700, color: '#34d399' }}>{record.stageNameAr}: </span>
                                <span style={{ color: 'var(--text-main, #ffffff)' }}>{record.approverName} ({record.approverGroup})</span>
                                {record.notes && <span style={{ color: 'var(--text-dim, #94a3b8)', marginInlineStart: '0.5rem' }}>— {record.notes}</span>}
                              </div>
                              <span style={{ color: '#64748b', fontSize: '0.68rem' }}>{new Date(record.decidedAt).toLocaleString('ar-EG')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Decision Action Bar - Direct, Formal, Sober */}
                  <div style={{ padding: '0.85rem 1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      {selectedRequest.makerId === user?.id ? (
                        <div style={{ color: '#f59e0b', fontSize: '0.74rem', fontWeight: 700 }}>
                          {isRtl ? 'قاعدة الفصل (SoD): أنت مُدخل هذا الطلب، ولا يحق لك اعتماده.' : 'Segregation of Duties: You submitted this request and cannot approve it.'}
                        </div>
                      ) : !selectedRequest.canApproveCurrentStage ? (
                        <div style={{ color: 'var(--text-dim, #94a3b8)', fontSize: '0.74rem' }}>
                          {isRtl ? 'هذه المرحلة بانتظار مراجع مالي مستقل.' : 'Pending independent reviewer.'}
                        </div>
                      ) : (
                        <div style={{ color: '#34d399', fontSize: '0.75rem', fontWeight: 700 }}>
                          {isRtl ? `مخول لاعتماد المرحلة ${selectedRequest.currentStageOrder}` : `Authorized for Stage ${selectedRequest.currentStageOrder}`}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.65rem' }}>
                      <button
                        onClick={() => setShowRejectConfirm(true)}
                        disabled={!selectedRequest.canApproveCurrentStage || actionInProgress}
                        style={{
                          padding: '0.45rem 1.15rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#f87171',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: selectedRequest.canApproveCurrentStage ? 'pointer' : 'not-allowed',
                          opacity: selectedRequest.canApproveCurrentStage ? 1 : 0.5
                        }}
                      >
                        {isRtl ? 'رفض الطلب' : 'Reject'}
                      </button>

                      <button
                        onClick={() => setShowApproveConfirm(true)}
                        disabled={!selectedRequest.canApproveCurrentStage || actionInProgress}
                        style={{
                          padding: '0.45rem 1.35rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: selectedRequest.canApproveCurrentStage ? '#10b981' : '#334155',
                          color: '#ffffff',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: selectedRequest.canApproveCurrentStage ? 'pointer' : 'not-allowed',
                          opacity: selectedRequest.canApproveCurrentStage ? 1 : 0.5
                        }}
                      >
                        {isRtl ? 'اعتماد الطلب' : 'Approve'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim, #64748b)', fontSize: '0.8rem' }}>
                  {isRtl ? 'اختر طلباً لمعاينة التفاصيل والقرار' : 'Select a request to review'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 2: MY SUBMITTED REQUESTS TRACKER --- */}
        {activeTab === 'my-requests' && (
          <div style={{ background: 'var(--surface, #0f172a)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text, #ffffff)' }}>
                  {isRtl ? 'سجل طلباتي' : 'My Submitted Requests'}
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.74rem', color: 'var(--text-dim, #94a3b8)' }}>
                  {isRtl ? 'متابعة قرارات ومسارات الاعتماد للعمليات التي قمت بإدخالها' : 'Track approval pipelines for operations you submitted'}
                </p>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)', fontWeight: 600 }}>
                {myRequests.length} {isRtl ? 'طلبات' : 'requests'}
              </span>
            </div>

            {myRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-dim, #64748b)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>
                  {isRtl ? 'لا توجد طلبات مسجلة' : 'No requests submitted'}
                </div>
                <div style={{ fontSize: '0.74rem', marginTop: '0.25rem' }}>
                  {isRtl ? 'عند إدخال أي تعديل خاضع للرقابة سيظهر هنا لمتابعة مسار اعتماده.' : 'Operations requiring approval will appear here.'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {myRequests.map((req) => (
                  <div key={req.id} style={{ padding: '0.75rem 1rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim, #94a3b8)', fontFamily: 'monospace' }}>#{req.id}</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main, #ffffff)' }}>{req.actionDescriptionAr}</span>
                      </div>
                      {getStatusBadge(req.status)}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.72rem', color: 'var(--text-dim, #94a3b8)' }}>
                      <span>{isRtl ? 'المورد:' : 'Resource:'} <strong style={{ color: '#e2e8f0' }}>{req.resourceNameAr}</strong></span>
                      <span>{new Date(req.submittedAt).toLocaleString('ar-EG')}</span>
                      <span>{isRtl ? `المرحلة: ${req.currentStageOrder} من ${req.totalStages}` : `Stage: ${req.currentStageOrder} of ${req.totalStages}`}</span>
                    </div>

                    {req.status === 'REJECTED' && req.rejectionReason && (
                      <div style={{ padding: '0.45rem 0.65rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '4px', color: '#fca5a5', fontSize: '0.74rem', marginTop: '0.5rem' }}>
                        {isRtl ? 'سبب الرفض:' : 'Rejection Reason:'} <strong>{req.rejectionReason}</strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>


      {/* --- APPROVE CONFIRMATION MODAL --- */}
      {showApproveConfirm && selectedRequest && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '440px', background: 'var(--bg-card, #0f172a)', border: '1px solid var(--border, rgba(255, 255, 255, 0.12))', borderRadius: '8px', padding: '1.25rem', boxShadow: 'var(--shadow-card, 0 10px 25px rgba(0,0,0,0.5))' }}>
            <h4 style={{ margin: '0 0 0.35rem', fontSize: '0.92rem', color: 'var(--text-main, #ffffff)', fontWeight: 700 }}>
              {isRtl ? 'تأكيد اعتماد الطلب' : 'Confirm Approval'}
            </h4>
            <p style={{ margin: '0 0 0.85rem', fontSize: '0.74rem', color: 'var(--text-dim, #94a3b8)' }}>
              {isRtl ? 'سيتم توثيق اعتمادك في سجل التدقيق المصرفي الرسمي.' : 'Your approval will be officially recorded in audit logs.'}
            </p>

            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.3rem' }}>
                {isRtl ? 'ملاحظات التدقيق (اختياري):' : 'Notes (optional):'}
              </label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder={isRtl ? 'أدخل أي ملاحظات رقابية...' : 'Enter any notes...'}
                rows={2}
                style={{
                  width: '100%',
                  background: 'var(--bg-input, rgba(255, 255, 255, 0.04))',
                  border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                  borderRadius: '5px',
                  color: 'var(--text-main, #ffffff)',
                  padding: '0.5rem',
                  fontSize: '0.76rem',
                  resize: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={() => setShowApproveConfirm(false)}
                disabled={actionInProgress}
                style={{ padding: '0.4rem 0.85rem', borderRadius: '5px', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.76rem' }}
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleApprove}
                disabled={actionInProgress}
                style={{ padding: '0.4rem 1.1rem', borderRadius: '5px', border: 'none', background: '#10b981', color: '#ffffff', fontWeight: 700, cursor: 'pointer', fontSize: '0.76rem' }}
              >
                {actionInProgress ? (isRtl ? 'جارِ الاعتماد...' : 'Approving...') : (isRtl ? 'تأكيد الاعتماد' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- REJECT CONFIRMATION MODAL --- */}
      {showRejectConfirm && selectedRequest && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '440px', background: 'var(--bg-card, #0f172a)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '1.25rem', boxShadow: 'var(--shadow-card, 0 10px 25px rgba(0,0,0,0.5))' }}>
            <h4 style={{ margin: '0 0 0.35rem', fontSize: '0.92rem', color: '#f87171', fontWeight: 700 }}>
              {isRtl ? 'تأكيد رفض الطلب' : 'Confirm Rejection'}
            </h4>
            <p style={{ margin: '0 0 0.85rem', fontSize: '0.74rem', color: 'var(--text-dim, #94a3b8)' }}>
              {isRtl ? 'سيتم رفض الطلب وإشعار المُدخل بالسبب الموثق.' : 'The request will be rejected and the maker notified.'}
            </p>

            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#fca5a5', marginBottom: '0.3rem' }}>
                {isRtl ? 'سبب الرفض (إلزامي): *' : 'Reason for rejection (required): *'}
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={isRtl ? 'اكتب سبب الرفض الرقابي...' : 'Enter rejection reason...'}
                rows={2}
                style={{
                  width: '100%',
                  background: 'var(--bg-input, rgba(255, 255, 255, 0.04))',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '5px',
                  color: 'var(--text-main, #ffffff)',
                  padding: '0.5rem',
                  fontSize: '0.76rem',
                  resize: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={() => setShowRejectConfirm(false)}
                disabled={actionInProgress}
                style={{ padding: '0.4rem 0.85rem', borderRadius: '5px', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.76rem' }}
              >
                {isRtl ? 'تراجع' : 'Cancel'}
              </button>
              <button
                onClick={handleReject}
                disabled={actionInProgress}
                style={{ padding: '0.4rem 1.1rem', borderRadius: '5px', border: 'none', background: '#ef4444', color: '#ffffff', fontWeight: 700, cursor: 'pointer', fontSize: '0.76rem' }}
              >
                {actionInProgress ? (isRtl ? 'جارِ المعالجة...' : 'Processing...') : (isRtl ? 'رفض الطلب' : 'Reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

