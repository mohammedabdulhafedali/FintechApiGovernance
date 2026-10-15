import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  X, 
  Inbox, 
  Send, 
  Sliders, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowLeft, 
  ArrowRight,
  Eye,
  FileCheck2,
  Lock,
  Plus,
  Trash2,
  Layers,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { 
  ApprovalInboxItem, 
  ApprovalRequest, 
  WorkflowPolicy, 
  FieldDelta, 
  WorkflowPolicyMode,
  WorkflowStageDefinition 
} from '../../types/governance';
import { governanceService } from '../../services/governanceService';
import { useAuth } from '../auth/AuthContext';

interface GovernanceHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotification?: (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
  onRefreshCount?: () => void;
}

export const GovernanceHubModal: React.FC<GovernanceHubModalProps> = ({
  isOpen,
  onClose,
  onNotification,
  onRefreshCount
}) => {
  const { user } = useAuth();
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

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'inbox') {
        const res = await governanceService.getInbox();
        setInboxItems(res.data);
        if (res.data.length > 0 && !selectedRequest) {
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
      if (onNotification) {
        onNotification('خطأ في تحميل البيانات', err.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setActionInProgress(true);
    try {
      const updated = await governanceService.approveStage(selectedRequest.id, approvalNotes);
      if (onNotification) {
        onNotification(
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
      setSelectedRequest(null);
    } catch (err: any) {
      if (onNotification) onNotification('فشل الاعتماد', err.message, 'error');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!rejectionReason.trim()) {
      if (onNotification) onNotification('تنبيه', 'يجب كتابة سبب الرفض لتبرير القرار رقابياً.', 'warning');
      return;
    }
    setActionInProgress(true);
    try {
      await governanceService.rejectRequest(selectedRequest.id, rejectionReason);
      if (onNotification) {
        onNotification('تم الرفض', 'تم رفض الطلب بنجاح وتوثيقه في السجل الرقابي.', 'info');
      }
      setShowRejectConfirm(false);
      setRejectionReason('');
      await loadData();
      setSelectedRequest(null);
    } catch (err: any) {
      if (onNotification) onNotification('فشل الرفض', err.message, 'error');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleSavePolicy = async () => {
    if (!editingPolicy) return;
    setSavingPolicy(true);
    try {
      await governanceService.updatePolicy(editingPolicy.resourceKey, editingPolicy);
      if (onNotification) {
        onNotification('نجاح الحفظ', 'تم تحديث سياسة ومسار الاعتماد ديناميكياً على مستوى النظام.', 'success');
      }
      setEditingPolicy(null);
      await loadData();
    } catch (err: any) {
      if (onNotification) onNotification('فشل الحفظ', err.message, 'error');
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

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: 'rgba(4, 9, 20, 0.88)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeIn 0.25s ease-out'
      }}
      dir="rtl"
    >
      {/* 1. Modal Top Banner */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1.75rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(15, 23, 42, 0.75)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div 
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #059669, #0284c7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(16, 185, 129, 0.35)',
              color: '#ffffff'
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main, #ffffff)', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              مركز الحوكمة ومسارات الاعتماد السيادية
              <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                Four-Eyes Control v2026
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              منظومة الرقابة المزدوجة ومسارات الاعتماد المتعددة المصرفية (Maker-Checker & Multi-Stage Pipelines)
            </div>
          </div>
        </div>

        {/* Center Tab Switcher */}
        <div style={{ display: 'flex', background: 'rgba(30, 41, 59, 0.7)', borderRadius: '10px', padding: '0.25rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <button
            onClick={() => setActiveTab('inbox')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: activeTab === 'inbox' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
              color: activeTab === 'inbox' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.2s'
            }}
          >
            <Inbox size={15} />
            صندوق الوارد للمراجعات
            {inboxItems.filter(i => i.canApproveCurrentStage).length > 0 && (
              <span style={{ background: '#f59e0b', color: '#000000', borderRadius: '999px', fontSize: '0.68rem', padding: '0.05rem 0.4rem', fontWeight: 800 }}>
                {inboxItems.filter(i => i.canApproveCurrentStage).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('my-requests')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: activeTab === 'my-requests' ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'transparent',
              color: activeTab === 'my-requests' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.2s'
            }}
          >
            <Send size={15} />
            متابعة طلباتي
          </button>

          <button
            onClick={() => setActiveTab('policies')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: activeTab === 'policies' ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)' : 'transparent',
              color: activeTab === 'policies' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.2s'
            }}
          >
            <Sliders size={15} />
            إدارة مسارات وسياسات الاعتماد
          </button>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '8px',
            color: '#cbd5e1',
            padding: '0.45rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          title="إغلاق المركز (Esc)"
        >
          <X size={18} />
        </button>
      </div>

      {/* 2. Main Content Body */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', padding: '1rem', gap: '1rem' }}>
        
        {/* --- TAB 1: INBOX SPLIT-VIEW --- */}
        {activeTab === 'inbox' && (
          <div style={{ display: 'flex', flex: 1, gap: '1rem', height: '100%' }}>
            {/* Right Pane: Requests List */}
            <div 
              style={{
                width: '380px',
                background: 'rgba(15, 23, 42, 0.65)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main, #ffffff)' }}>المهام المعلقة للاعتماد</span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{inboxItems.length} طلبات</span>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {inboxItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                    <CheckCircle2 size={36} style={{ color: '#10b981', margin: '0 auto 0.75rem' }} />
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e2e8f0' }}>صندوق الوارد نظيف ومطابق</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>لا توجد مهام معلقة تنتظر اعتمادك في هذه اللحظة.</div>
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
                          padding: '0.85rem',
                          borderRadius: '10px',
                          border: isSelected ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.06)',
                          background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(30, 41, 59, 0.45)',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8' }}>#{item.id}</span>
                          <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: badge.bg, color: badge.text, border: `1px solid ${badge.border}`, fontWeight: 700 }}>
                            {item.actionType === 'CREATE' ? 'إنشاء' : item.actionType === 'UPDATE' ? 'تعديل' : 'حذف'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.35rem', lineHeight: 1.3 }}>
                          {item.actionDescriptionAr}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#94a3b8' }}>
                          <span>بواسطة: {item.makerName}</span>
                          <span style={{ color: '#38bdf8', fontWeight: 700 }}>مرحلة {item.currentStageOrder}/{item.totalStages}</span>
                        </div>
                        {item.canApproveCurrentStage && (
                          <div style={{ marginTop: '0.45rem', fontSize: '0.68rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700 }}>
                            <Sparkles size={11} /> ينتظر قرارك الآن
                          </div>
                        )}
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
                background: 'rgba(15, 23, 42, 0.65)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              {selectedRequest ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
                  {/* Inspection Header */}
                  <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(30, 41, 59, 0.4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 800 }}>#{selectedRequest.id}</span>
                          <span style={{ fontSize: '0.78rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 700 }}>
                            {selectedRequest.resourceNameAr}
                          </span>
                          {getStatusBadge(selectedRequest.status)}
                        </div>
                        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main, #ffffff)', margin: 0 }}>
                          {selectedRequest.actionDescriptionAr}
                        </h2>
                      </div>

                      <div style={{ textAlign: 'left', fontSize: '0.75rem', color: '#94a3b8' }}>
                        <div>المُدخل: <strong style={{ color: '#e2e8f0' }}>{selectedRequest.makerName}</strong></div>
                        <div>الجهة: <strong style={{ color: '#94a3b8' }}>{selectedRequest.makerGroup}</strong></div>
                        <div>التاريخ: {new Date(selectedRequest.submittedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</div>
                      </div>
                    </div>

                    {/* Visual Stepper for Stages */}
                    <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.75rem' }}>
                        مسار الاعتماد المؤسسي المتسلسل ({selectedRequest.stages.length} مراحل):
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflowX: 'auto' }}>
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
                                  gap: '0.5rem',
                                  padding: '0.45rem 0.85rem',
                                  borderRadius: '8px',
                                  background: isCompleted ? 'rgba(16, 185, 129, 0.15)' : isCurrent ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                                  border: isCompleted ? '1px solid rgba(16, 185, 129, 0.4)' : isCurrent ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.06)'
                                }}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 size={16} style={{ color: '#34d399' }} />
                                ) : isCurrent ? (
                                  <Clock size={16} style={{ color: '#38bdf8' }} />
                                ) : (
                                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '1px solid #64748b', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                    {stage.stageOrder}
                                  </div>
                                )}
                                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: isCompleted ? '#34d399' : isCurrent ? '#ffffff' : '#94a3b8' }}>
                                  {stage.stageNameAr}
                                  {priorDecision && (
                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 400 }}>
                                      بواسطة: {priorDecision.approverName}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {idx < selectedRequest.stages.length - 1 && (
                                <ArrowLeft size={14} style={{ color: '#64748b' }} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Side-by-Side Visual Diff Viewer */}
                  <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main, #ffffff)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <FileCheck2 size={16} style={{ color: '#10b981' }} />
                      فحص الفروقات والتعديلات المقترحة (Visual Delta Diff):
                    </div>

                    {selectedRequest.diffSummary && selectedRequest.diffSummary.length > 0 ? (
                      <div style={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                          <thead>
                            <tr style={{ background: 'rgba(30, 41, 59, 0.8)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                              <th style={{ padding: '0.65rem 0.85rem', fontSize: '0.74rem', color: '#94a3b8' }}>الحقل / الخاصية</th>
                              <th style={{ padding: '0.65rem 0.85rem', fontSize: '0.74rem', color: '#f87171' }}>الحالة السابقة (قبل التعديل)</th>
                              <th style={{ padding: '0.65rem 0.85rem', fontSize: '0.74rem', color: '#34d399' }}>الحالة المقترحة (الجديدة)</th>
                              <th style={{ padding: '0.65rem 0.85rem', fontSize: '0.74rem', color: '#94a3b8' }}>نوع الإجراء</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedRequest.diffSummary.map((delta, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', background: i % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)' }}>
                                <td style={{ padding: '0.65rem 0.85rem', fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0' }}>
                                  {delta.labelAr}
                                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'monospace' }}>{delta.field}</div>
                                </td>
                                <td style={{ padding: '0.65rem 0.85rem', fontSize: '0.78rem', color: '#fca5a5' }}>
                                  {delta.oldValue !== null && delta.oldValue !== undefined ? (
                                    <span style={{ textDecoration: 'line-through', background: 'rgba(239, 68, 68, 0.1)', padding: '0.15rem 0.35rem', borderRadius: '4px' }}>
                                      {String(delta.oldValue)}
                                    </span>
                                  ) : (
                                    <span style={{ color: '#64748b', fontStyle: 'italic' }}>لا يوجد (حقل جديد)</span>
                                  )}
                                </td>
                                <td style={{ padding: '0.65rem 0.85rem', fontSize: '0.78rem', color: '#86efac' }}>
                                  {delta.newValue !== null && delta.newValue !== undefined ? (
                                    <span style={{ background: 'rgba(16, 185, 129, 0.12)', padding: '0.15rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>
                                      {String(delta.newValue)}
                                    </span>
                                  ) : (
                                    <span style={{ color: '#ef4444', fontStyle: 'italic' }}>تم الحذف</span>
                                  )}
                                </td>
                                <td style={{ padding: '0.65rem 0.85rem' }}>
                                  <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700, background: delta.type === 'ADDED' ? 'rgba(16, 185, 129, 0.2)' : delta.type === 'MODIFIED' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: delta.type === 'ADDED' ? '#34d399' : delta.type === 'MODIFIED' ? '#60a5fa' : '#f87171' }}>
                                    {delta.type === 'ADDED' ? 'إضافة' : delta.type === 'MODIFIED' ? 'تعديل' : 'حذف'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ padding: '1rem', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '8px', color: '#94a3b8', fontSize: '0.8rem' }}>
                        الحمولة البيانية الكاملة (Raw Payload):
                        <pre style={{ margin: '0.5rem 0 0', padding: '0.75rem', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '6px', fontSize: '0.74rem', color: '#38bdf8', overflowX: 'auto' }}>
                          {JSON.stringify(selectedRequest.payload, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Audit Trail of Previous Approvers */}
                    {selectedRequest.approvalTrail.length > 0 && (
                      <div style={{ marginTop: '1.25rem' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main, #ffffff)', marginBottom: '0.5rem' }}>
                          سجل التوقيعات والقرارات السابقة في هذا الطلب:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          {selectedRequest.approvalTrail.map((record, rIdx) => (
                            <div key={rIdx} style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#34d399' }}>{record.stageNameAr}: </span>
                                <span style={{ fontSize: '0.76rem', color: 'var(--text-main, #ffffff)' }}>{record.approverName} ({record.approverGroup})</span>
                                {record.notes && <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.15rem' }}>ملاحظات: {record.notes}</div>}
                              </div>
                              <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{new Date(record.decidedAt).toLocaleString('ar-EG')}</div>
                                {record.digitalSignature && (
                                  <div style={{ fontSize: '0.62rem', color: '#38bdf8', fontFamily: 'monospace' }}>{record.digitalSignature}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Decision Action Bar */}
                  <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(30, 41, 59, 0.7)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      {selectedRequest.makerId === user?.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 700 }}>
                          <AlertTriangle size={15} />
                          قاعدة الفصل الصارم (Segregation of Duties): أنت مُدخل هذا الطلب، ولا يحق لك اعتماده بنفسك.
                        </div>
                      ) : !selectedRequest.canApproveCurrentStage ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                          <Lock size={14} />
                          هذه المرحلة تنتظر صلاحية أو مراجعاً مستقلاً آخر.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399', fontSize: '0.75rem', fontWeight: 700 }}>
                          <ShieldCheck size={16} />
                          أنت مخول لاعتماد المرحلة {selectedRequest.currentStageOrder} من {selectedRequest.totalStages}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        onClick={() => setShowRejectConfirm(true)}
                        disabled={!selectedRequest.canApproveCurrentStage || actionInProgress}
                        style={{
                          padding: '0.55rem 1.15rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: selectedRequest.canApproveCurrentStage ? 'pointer' : 'not-allowed',
                          opacity: selectedRequest.canApproveCurrentStage ? 1 : 0.5,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}
                      >
                        <XCircle size={15} />
                        رفض الطلب
                      </button>

                      <button
                        onClick={() => setShowApproveConfirm(true)}
                        disabled={!selectedRequest.canApproveCurrentStage || actionInProgress}
                        style={{
                          padding: '0.55rem 1.35rem',
                          borderRadius: '8px',
                          border: 'none',
                          background: selectedRequest.canApproveCurrentStage ? 'linear-gradient(135deg, #10b981, #059669)' : '#334155',
                          color: '#ffffff',
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          cursor: selectedRequest.canApproveCurrentStage ? 'pointer' : 'not-allowed',
                          opacity: selectedRequest.canApproveCurrentStage ? 1 : 0.5,
                          boxShadow: selectedRequest.canApproveCurrentStage ? '0 0 15px rgba(16, 185, 129, 0.4)' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.45rem'
                        }}
                      >
                        <CheckCircle2 size={16} />
                        اعتماد وتمرير المرحلة
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                  اختر طلباً من القائمة الجانبية لمعاينة الفروقات واتخاذ القرار
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 2: MY SUBMITTED REQUESTS TRACKER --- */}
        {activeTab === 'my-requests' && (
          <div style={{ flex: 1, background: 'rgba(15, 23, 42, 0.65)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '1.25rem', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main, #ffffff)' }}>سجل العمليات التي قمت بإدخالها</h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>تتبع حالة ومسارات الاعتماد لطلباتك المقترحة في النظام</p>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700 }}>{myRequests.length} طلبات مسجلة</span>
            </div>

            {myRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
                <Send size={40} style={{ color: '#0284c7', margin: '0 auto 0.75rem' }} />
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e2e8f0' }}>لم تقم بإرسال أي طلبات تغيير حتى الآن</div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>عند إدخالك لأي عملية تخضع للحوكمة، ستظهر هنا لمتابعة مسار اعتمادها.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {myRequests.map((req) => (
                  <div key={req.id} style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(30, 41, 59, 0.45)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8' }}>#{req.id}</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main, #ffffff)' }}>{req.actionDescriptionAr}</span>
                      </div>
                      {getStatusBadge(req.status)}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.74rem', color: '#94a3b8', margin: '0.5rem 0' }}>
                      <span>المورد: <strong style={{ color: '#38bdf8' }}>{req.resourceNameAr}</strong></span>
                      <span>وقت الإرسال: {new Date(req.submittedAt).toLocaleString('ar-EG')}</span>
                      <span>المرحلة الحالية: <strong>{req.currentStageOrder} من {req.totalStages}</strong></span>
                    </div>

                    {req.status === 'REJECTED' && req.rejectionReason && (
                      <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '6px', color: '#fca5a5', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                        سبب الرفض الموثق: <strong>{req.rejectionReason}</strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- TAB 3: DYNAMIC WORKFLOW POLICY BUILDER (ADMIN) --- */}
        {activeTab === 'policies' && (
          <div style={{ flex: 1, background: 'rgba(15, 23, 42, 0.65)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '1.25rem', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main, #ffffff)' }}>مصفوفة مسارات وسياسات الاعتماد المؤسسية (Dynamic Policy Engine)</h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                  تحكم ديناميكي كامل في مسار كل شاشة وعملية: مباشر، افتراضي (مدخل ومراجع)، أو مسار متعدد المراحل
                </p>
              </div>
              <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '999px', background: 'rgba(139, 92, 246, 0.2)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.3)', fontWeight: 700 }}>
                100% Dynamic Architecture
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {policies.map((pol) => (
                <div key={pol.resourceKey} style={{ padding: '1.1rem', borderRadius: '10px', background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main, #ffffff)' }}>{pol.resourceNameAr}</span>
                        <code style={{ fontSize: '0.7rem', color: '#38bdf8', background: 'rgba(0, 0, 0, 0.3)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{pol.resourceKey}</code>
                        {pol.isProtectedCore && (
                          <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: 700 }}>
                            مورد سيادي محمي
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                        النمط المطبق حالياً: <strong style={{ color: '#e2e8f0' }}>{pol.mode === 'DIRECT' ? 'تنفيذ فوري مباشر (بدون مراجع)' : pol.mode === 'MAKER_CHECKER' ? 'مدخل ومراجع (خطوة واحدة)' : `مسار متعدد المراحل (${pol.stages.length} مراحل)`}</strong>
                      </div>
                    </div>

                    <button
                      onClick={() => setEditingPolicy(JSON.parse(JSON.stringify(pol)))}
                      style={{
                        padding: '0.45rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(139, 92, 246, 0.4)',
                        background: 'rgba(139, 92, 246, 0.15)',
                        color: '#c084fc',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <Sliders size={14} />
                      تعديل وتخصيص المسار
                    </button>
                  </div>

                  {/* Stages Preview */}
                  {pol.mode !== 'DIRECT' && pol.stages && pol.stages.length > 0 && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.45rem', overflowX: 'auto', padding: '0.45rem 0' }}>
                      {pol.stages.map((st, sIdx) => (
                        <React.Fragment key={st.stageOrder}>
                          <div style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.72rem', color: '#e2e8f0' }}>
                            <span style={{ color: '#8b5cf6', fontWeight: 800 }}>{st.stageOrder}.</span> {st.stageNameAr}
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '480px', background: 'var(--bg-card, #0f172a)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '14px', padding: '1.5rem', boxShadow: 'var(--shadow-dropdown, 0 20px 40px rgba(0,0,0,0.6))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main, #ffffff)', fontWeight: 800 }}>تأكيد اعتماد المرحلة</h4>
                <p style={{ margin: 0, fontSize: '0.74rem', color: '#94a3b8' }}>سيتم تسجيل توقيعك وبصمتك الرقمية في سجل التدقيق المصرفي</p>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                ملاحظات الاعتماد والتدقيق (اختياري):
              </label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="أدخل أي ملاحظات رقابية أو توصيات معمارية..."
                rows={3}
                style={{
                  width: '100%',
                  background: 'var(--bg-input, rgba(30, 41, 59, 0.8))',
                  border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                  borderRadius: '8px',
                  color: 'var(--text-main, #ffffff)',
                  padding: '0.65rem',
                  fontSize: '0.8rem',
                  resize: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                onClick={() => setShowApproveConfirm(false)}
                disabled={actionInProgress}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                إلغاء
              </button>
              <button
                onClick={handleApprove}
                disabled={actionInProgress}
                style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem' }}
              >
                {actionInProgress ? 'جارِ التوثيق والاعتماد...' : 'تأكيد التوقيع والاعتماد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- REJECT CONFIRMATION MODAL --- */}
      {showRejectConfirm && selectedRequest && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '480px', background: 'var(--bg-card, #0f172a)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '14px', padding: '1.5rem', boxShadow: 'var(--shadow-dropdown, 0 20px 40px rgba(0,0,0,0.6))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                <XCircle size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main, #ffffff)', fontWeight: 800 }}>تأكيد رفض الطلب</h4>
                <p style={{ margin: 0, fontSize: '0.74rem', color: '#94a3b8' }}>إلغاء العملية وإشعار المُدخل بسبب الرفض الموثق</p>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#fca5a5', marginBottom: '0.35rem' }}>
                سبب الرفض الرقابي (إلزامي): *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="اكتب سبب الرفض بالتفصيل (مثل: عدم توافق الأمان، مسار غير مطابق لمعايير ISO)..."
                rows={3}
                style={{
                  width: '100%',
                  background: 'var(--bg-input, rgba(30, 41, 59, 0.8))',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: 'var(--text-main, #ffffff)',
                  padding: '0.65rem',
                  fontSize: '0.8rem',
                  resize: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                onClick={() => setShowRejectConfirm(false)}
                disabled={actionInProgress}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                تراجع
              </button>
              <button
                onClick={handleReject}
                disabled={actionInProgress}
                style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem' }}
              >
                {actionInProgress ? 'جارِ معالجة الرفض...' : 'رفض الطلب نهائياً'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT POLICY MODAL --- */}
      {editingPolicy && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '580px', maxHeight: '85vh', overflowY: 'auto', background: 'var(--bg-card, #0f172a)', border: '1px solid rgba(139, 92, 246, 0.35)', borderRadius: '14px', padding: '1.5rem', boxShadow: 'var(--shadow-dropdown, 0 20px 40px rgba(0,0,0,0.6))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.08))', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sliders size={18} style={{ color: '#a855f7' }} />
                <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main, #ffffff)', fontWeight: 800 }}>
                  تخصيص مسار الاعتماد: {editingPolicy.resourceNameAr}
                </h4>
              </div>
              <button onClick={() => setEditingPolicy(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
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
                          background: 'var(--bg-input, rgba(15, 23, 42, 0.6))',
                          border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                          borderRadius: '6px',
                          color: 'var(--text-main, #ffffff)',
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
