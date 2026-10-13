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
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../../i18n';

interface GovernanceManagementViewProps {
  onNotify?: (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
  onRefreshCount?: () => void;
}

export const GovernanceManagementView: React.FC<GovernanceManagementViewProps> = ({
  onNotify,
  onRefreshCount
}) => {
  const { user } = useAuth();
  const { isRtl } = useLanguage();

  const [activeTab, setActiveTab] = useState<'inbox' | 'my-requests' | 'policies'>('inbox');
  const [inboxItems, setInboxItems] = useState<ApprovalInboxItem[]>([]);
  const [myRequests, setMyRequests] = useState<ApprovalRequest[]>([]);
  const [policies, setPolicies] = useState<WorkflowPolicy[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalInboxItem | null>(null);

  // Approval / Rejection form state
  const [approvalNotes, setApprovalNotes] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [showApproveConfirm, setShowApproveConfirm] = useState<boolean>(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState<boolean>(false);
  const [actionInProgress, setActionInProgress] = useState<boolean>(false);

  // Policy Builder Editing State
  const [editingPolicy, setEditingPolicy] = useState<WorkflowPolicy | null>(null);
  const [savingPolicy, setSavingPolicy] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'inbox') {
        const res = await governanceService.getInbox();
        setInboxItems(res.data);
        if (res.data.length > 0 && (!selectedRequest || !res.data.some(d => d.id === selectedRequest.id))) {
          setSelectedRequest(res.data[0]);
        }
      } else if (activeTab === 'my-requests') {
        const res = await governanceService.getMyRequests();
        setMyRequests(res);
      } else if (activeTab === 'policies') {
        const res = await governanceService.getPolicies();
        setPolicies(res);
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
      const updated = await governanceService.approveStage(selectedRequest.id, approvalNotes);
      if (onNotify) {
        onNotify(
          'تم الاعتماد بنجاح',
          updated.status === 'APPROVED' 
            ? 'تم اكتمال مسار الاعتماد بالكامل وتطبيق التغييرات ذريةً في النظام!' 
            : 'تم توثيق اعتمادك الرقمي لهذه المرحلة بنجاح.',
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
      await governanceService.rejectRequest(selectedRequest.id, rejectionReason);
      if (onNotify) {
        onNotify('تم الرفض', 'تم رفض الطلب بنجاح وتوثيقه في السجل الرقابي.', 'info');
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

  const handleSavePolicy = async () => {
    if (!editingPolicy) return;
    setSavingPolicy(true);
    try {
      await governanceService.updatePolicy(editingPolicy.resourceKey, editingPolicy);
      if (onNotify) {
        onNotify('نجاح الحفظ', 'تم تحديث سياسة ومسار الاعتماد ديناميكياً على مستوى النظام.', 'success');
      }
      setEditingPolicy(null);
      await loadData();
    } catch (err: any) {
      if (onNotify) onNotify('فشل الحفظ', err.message, 'error');
    } finally {
      setSavingPolicy(false);
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
    <div className="iam-console" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - 70px)' }} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* 1. Header Banner - Clean & Formal Banking Style */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.75rem', background: 'var(--surface, #0f172a)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text, #ffffff)', margin: 0, letterSpacing: '-0.01em' }}>
            {isRtl ? 'مركز الاعتمادات والرقابة' : 'Approvals & Governance Hub'}
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
                background: activeTab === 'inbox' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: activeTab === 'inbox' ? '#ffffff' : 'var(--text-dim, #94a3b8)',
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
                background: activeTab === 'my-requests' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: activeTab === 'my-requests' ? '#ffffff' : 'var(--text-dim, #94a3b8)',
                transition: 'all 0.15s'
              }}
            >
              {isRtl ? 'طلباتي' : 'My Requests'}
            </button>

            <button
              onClick={() => setActiveTab('policies')}
              style={{
                padding: '0.4rem 0.9rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: activeTab === 'policies' ? 700 : 500,
                background: activeTab === 'policies' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: activeTab === 'policies' ? '#ffffff' : 'var(--text-dim, #94a3b8)',
                transition: 'all 0.15s'
              }}
            >
              {isRtl ? 'مسارات الاعتماد' : 'Workflow Policies'}
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

      {/* 2. Main Content Body */}
      <div style={{ flex: 1, padding: '1.25rem 1.75rem', overflowY: 'auto' }}>
        
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
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
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
                              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: isCompleted ? '#34d399' : isCurrent ? '#ffffff' : 'var(--text-dim, #94a3b8)' }}>
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
                                <span style={{ color: '#ffffff' }}>{record.approverName} ({record.approverGroup})</span>
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
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>{req.actionDescriptionAr}</span>
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

        {/* --- TAB 3: WORKFLOW POLICIES (ADMIN) --- */}
        {activeTab === 'policies' && (
          <div style={{ background: 'var(--surface, #0f172a)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text, #ffffff)' }}>
                  {isRtl ? 'مسارات وسياسات الاعتماد' : 'Workflow & Approval Policies'}
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.74rem', color: 'var(--text-dim, #94a3b8)' }}>
                  {isRtl ? 'تخصيص قواعد الرقابة ومسارات الاعتماد لكل شاشة وعملية' : 'Configure governance and approval pipelines for each module'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {policies.map((pol) => (
                <div key={pol.resourceKey} style={{ padding: '0.85rem 1rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#ffffff' }}>{pol.resourceNameAr}</span>
                        <code style={{ fontSize: '0.7rem', color: '#38bdf8', background: 'rgba(0, 0, 0, 0.25)', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>{pol.resourceKey}</code>
                        {pol.isProtectedCore && (
                          <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '3px', background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.25)', fontWeight: 600 }}>
                            {isRtl ? 'سيادي محمي' : 'Core Protected'}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-dim, #94a3b8)', marginTop: '0.25rem' }}>
                        {isRtl ? 'النمط الحالي:' : 'Mode:'} <strong style={{ color: '#e2e8f0' }}>{pol.mode === 'DIRECT' ? (isRtl ? 'مباشر (بدون مراجع)' : 'Direct') : pol.mode === 'MAKER_CHECKER' ? (isRtl ? 'مدخل ومراجع (مرحلة واحدة)' : 'Maker-Checker (1 Stage)') : (isRtl ? `مسار متعدد المراحل (${pol.stages.length} مراحل)` : `Multi-stage (${pol.stages.length})`)}</strong>
                      </div>
                    </div>

                    <button
                      onClick={() => setEditingPolicy(JSON.parse(JSON.stringify(pol)))}
                      style={{
                        padding: '0.35rem 0.85rem',
                        borderRadius: '5px',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        background: 'rgba(255, 255, 255, 0.04)',
                        color: '#cbd5e1',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {isRtl ? 'تخصيص المسار' : 'Edit Pipeline'}
                    </button>
                  </div>

                  {/* Stages Preview */}
                  {pol.mode !== 'DIRECT' && pol.stages && pol.stages.length > 0 && (
                    <div style={{ marginTop: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem', overflowX: 'auto', paddingTop: '0.35rem' }}>
                      {pol.stages.map((st, sIdx) => (
                        <React.Fragment key={st.stageOrder}>
                          <div style={{ padding: '0.25rem 0.55rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.72rem', color: '#cbd5e1' }}>
                            <span style={{ color: '#38bdf8', fontWeight: 700 }}>{st.stageOrder}.</span> {st.stageNameAr}
                          </div>
                          {sIdx < pol.stages.length - 1 && <ArrowLeft size={12} style={{ color: '#64748b' }} />}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --- APPROVE CONFIRMATION MODAL --- */}
      {showApproveConfirm && selectedRequest && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '440px', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
            <h4 style={{ margin: '0 0 0.35rem', fontSize: '0.92rem', color: '#ffffff', fontWeight: 700 }}>
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
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '5px',
                  color: '#ffffff',
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
          <div style={{ width: '440px', background: '#0f172a', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
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
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '5px',
                  color: '#ffffff',
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

      {/* --- EDIT POLICY MODAL --- */}
      {editingPolicy && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '580px', maxHeight: '85vh', overflowY: 'auto', background: '#0f172a', border: '1px solid rgba(139, 92, 246, 0.35)', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sliders size={18} style={{ color: '#a855f7' }} />
                <h4 style={{ margin: 0, fontSize: '1rem', color: '#ffffff', fontWeight: 800 }}>
                  تخصيص مسار الاعتماد: {editingPolicy.resourceNameAr}
                </h4>
              </div>
              <button onClick={() => setEditingPolicy(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <span style={{ fontSize: '1.2rem', color: '#cbd5e1' }}>✕</span>
              </button>
            </div>

            {/* Mode Selector */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.5rem' }}>
                نمط الحوكمة والاعتماد:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                <button
                  type="button"
                  disabled={editingPolicy.isProtectedCore}
                  onClick={() => setEditingPolicy({ ...editingPolicy, mode: 'DIRECT' })}
                  style={{
                    padding: '0.65rem 0.5rem',
                    borderRadius: '8px',
                    border: editingPolicy.mode === 'DIRECT' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: editingPolicy.mode === 'DIRECT' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(30, 41, 59, 0.4)',
                    color: editingPolicy.isProtectedCore ? '#64748b' : editingPolicy.mode === 'DIRECT' ? '#34d399' : '#cbd5e1',
                    cursor: editingPolicy.isProtectedCore ? 'not-allowed' : 'pointer',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}
                >
                  تنفيذ فوري مباشر
                  {editingPolicy.isProtectedCore && <div style={{ fontSize: '0.6rem', color: '#f59e0b', marginTop: '0.2rem' }}>(محظور للموارد السيادية)</div>}
                </button>

                <button
                  type="button"
                  onClick={() => setEditingPolicy({ 
                    ...editingPolicy, 
                    mode: 'MAKER_CHECKER',
                    stages: editingPolicy.stages.length > 0 ? [editingPolicy.stages[0]] : [{
                      stageOrder: 1,
                      stageKey: 'standard_review',
                      stageNameAr: 'المراجعة والاعتماد القياسي',
                      stageNameEn: 'Standard Review',
                      requiredPermission: 'governance:approve',
                      minApprovers: 1
                    }]
                  })}
                  style={{
                    padding: '0.65rem 0.5rem',
                    borderRadius: '8px',
                    border: editingPolicy.mode === 'MAKER_CHECKER' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: editingPolicy.mode === 'MAKER_CHECKER' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.4)',
                    color: editingPolicy.mode === 'MAKER_CHECKER' ? '#38bdf8' : '#cbd5e1',
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}
                >
                  مدخل ومراجع (خطوة واحدة)
                </button>

                <button
                  type="button"
                  onClick={() => setEditingPolicy({ ...editingPolicy, mode: 'MULTI_STAGE_PIPELINE' })}
                  style={{
                    padding: '0.65rem 0.5rem',
                    borderRadius: '8px',
                    border: editingPolicy.mode === 'MULTI_STAGE_PIPELINE' ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: editingPolicy.mode === 'MULTI_STAGE_PIPELINE' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(30, 41, 59, 0.4)',
                    color: editingPolicy.mode === 'MULTI_STAGE_PIPELINE' ? '#c084fc' : '#cbd5e1',
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}
                >
                  مسار متعدد المراحل (مخصص)
                </button>
              </div>
            </div>

            {/* Stages Builder if not DIRECT */}
            {editingPolicy.mode !== 'DIRECT' && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1' }}>
                    مراحل المسار التتابعية:
                  </label>
                  {editingPolicy.mode === 'MULTI_STAGE_PIPELINE' && (
                    <button
                      type="button"
                      onClick={() => {
                        const newOrder = editingPolicy.stages.length + 1;
                        setEditingPolicy({
                          ...editingPolicy,
                          stages: [
                            ...editingPolicy.stages,
                            {
                              stageOrder: newOrder,
                              stageKey: `stage_${newOrder}`,
                              stageNameAr: `مرحلة الاعتماد ${newOrder}`,
                              stageNameEn: `Approval Stage ${newOrder}`,
                              requiredPermission: 'governance:approve',
                              minApprovers: 1
                            }
                          ]
                        });
                      }}
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        background: 'rgba(168, 85, 247, 0.2)',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        color: '#c084fc',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <Plus size={12} /> إضافة مرحلة
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {editingPolicy.stages.map((st, idx) => (
                    <div key={idx} style={{ padding: '0.65rem', borderRadius: '8px', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8b5cf6', width: '20px' }}>{idx + 1}.</span>
                      <input
                        type="text"
                        value={st.stageNameAr}
                        onChange={(e) => {
                          const updated = [...editingPolicy.stages];
                          updated[idx].stageNameAr = e.target.value;
                          setEditingPolicy({ ...editingPolicy, stages: updated });
                        }}
                        placeholder="اسم المرحلة بالعربية"
                        style={{
                          flex: 1,
                          background: 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#ffffff',
                          padding: '0.4rem 0.6rem',
                          fontSize: '0.75rem'
                        }}
                      />
                      <select
                        value={st.requiredPermission}
                        onChange={(e) => {
                          const updated = [...editingPolicy.stages];
                          updated[idx].requiredPermission = e.target.value;
                          setEditingPolicy({ ...editingPolicy, stages: updated });
                        }}
                        style={{
                          background: 'rgba(15, 23, 42, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#38bdf8',
                          padding: '0.4rem',
                          fontSize: '0.72rem'
                        }}
                      >
                        <option value="governance:approve">مراجعة معمارية عامة</option>
                        <option value="governance:approve:security">ضابط أمن المعلومات (Security)</option>
                        <option value="iam:manage">مدير الهوية والنظام (IAM Admin)</option>
                      </select>

                      {editingPolicy.mode === 'MULTI_STAGE_PIPELINE' && editingPolicy.stages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const filtered = editingPolicy.stages.filter((_, i) => i !== idx).map((s, newIdx) => ({
                              ...s,
                              stageOrder: newIdx + 1
                            }));
                            setEditingPolicy({ ...editingPolicy, stages: filtered });
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '0.3rem'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setEditingPolicy(null)}
                disabled={savingPolicy}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSavePolicy}
                disabled={savingPolicy}
                style={{ padding: '0.5rem 1.35rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem' }}
              >
                {savingPolicy ? 'جارِ الحفظ...' : 'حفظ السياسة وتطبيق المسار'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
