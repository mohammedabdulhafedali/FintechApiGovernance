import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Plus, 
  Trash2, 
  RefreshCw,
  Lock,
  Workflow,
  ArrowRight,
  ArrowLeft,
  ArrowDown,
  UserCheck,
  CheckCircle2,
  Shield,
  Key,
  Clock,
  AlertTriangle,
  Zap,
  ChevronDown
} from 'lucide-react';
import { WorkflowPolicy, WorkflowStageDefinition } from '../../types/governance';
import { governanceService } from '../../services/governanceService';
import { useLanguage } from '../../i18n';

interface WorkflowPoliciesViewProps {
  onNotify?: (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
}

export const WorkflowPoliciesView: React.FC<WorkflowPoliciesViewProps> = ({ onNotify }) => {
  const { isRtl } = useLanguage();

  const [policies, setPolicies] = useState<WorkflowPolicy[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  
  // Dedicated View Mode: 'list' (Overview table) vs 'studio' (Visual Flow Designer)
  const [viewMode, setViewMode] = useState<'list' | 'studio'>('list');
  const [activePolicy, setActivePolicy] = useState<WorkflowPolicy | null>(null);
  const [savingPolicy, setSavingPolicy] = useState<boolean>(false);

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const res = await governanceService.getPolicies();
      setPolicies(res);
    } catch (err: any) {
      if (onNotify) onNotify('خطأ', err.message || 'فشل تحميل سياسات الاعتماد', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const handleOpenStudio = (policy: WorkflowPolicy) => {
    // Deep clone to prevent direct state mutation
    setActivePolicy(JSON.parse(JSON.stringify(policy)));
    setViewMode('studio');
  };

  const handleSavePolicy = async () => {
    if (!activePolicy) return;
    setSavingPolicy(true);
    try {
      await governanceService.updatePolicy(activePolicy.resourceKey, activePolicy);
      if (onNotify) {
        onNotify('نجاح التحديث', `تم تحديث مسار واعتماد [${isRtl ? activePolicy.resourceNameAr : activePolicy.resourceNameEn}] وتطبيقه على النظام.`, 'success');
      }
      setViewMode('list');
      setActivePolicy(null);
      await loadPolicies();
    } catch (err: any) {
      if (onNotify) onNotify('فشل الحفظ', err.message, 'error');
    } finally {
      setSavingPolicy(false);
    }
  };

  // Stage Helpers
  const addStage = () => {
    if (!activePolicy) return;
    const newOrder = activePolicy.stages.length + 1;
    const newStage: WorkflowStageDefinition = {
      stageOrder: newOrder,
      stageKey: `stage_${newOrder}_${Date.now()}`,
      stageNameAr: `مرحلة الاعتماد ${newOrder}`,
      stageNameEn: `Approval Stage ${newOrder}`,
      requiredPermission: 'governance:approve',
      minApprovers: 1
    };
    setActivePolicy({
      ...activePolicy,
      stages: [...activePolicy.stages, newStage]
    });
  };

  const removeStage = (index: number) => {
    if (!activePolicy || activePolicy.stages.length <= 1) return;
    const updated = activePolicy.stages
      .filter((_, i) => i !== index)
      .map((s, idx) => ({ ...s, stageOrder: idx + 1 }));
    setActivePolicy({ ...activePolicy, stages: updated });
  };

  const updateStage = (index: number, updates: Partial<WorkflowStageDefinition>) => {
    if (!activePolicy) return;
    const updated = [...activePolicy.stages];
    updated[index] = { ...updated[index], ...updates };
    setActivePolicy({ ...activePolicy, stages: updated });
  };

  // ═════════════════════════════════════════════════════════════════════
  // MODE 1: VISUAL PIPELINE STUDIO (المحرر المرئي للمسار - خالي من المودالات)
  // ═════════════════════════════════════════════════════════════════════
  if (viewMode === 'studio' && activePolicy) {
    const isDirect = activePolicy.mode === 'DIRECT';
    const isMakerChecker = activePolicy.mode === 'MAKER_CHECKER';
    const isMultiStage = activePolicy.mode === 'MULTI_STAGE_PIPELINE';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Studio Navigation & Control Bar */}
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
            onClick={() => {
              setViewMode('list');
              setActivePolicy(null);
            }}
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
            {isRtl ? 'العودة لقائمة السياسات' : 'Back to Policies'}
          </button>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
              {isRtl ? `ستوديو مسار الاعتماد: ${activePolicy.resourceNameAr}` : `Approval Studio: ${activePolicy.resourceNameEn}`}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim, #94a3b8)', fontFamily: 'monospace' }}>
              {activePolicy.resourceKey}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => {
                setViewMode('list');
                setActivePolicy(null);
              }}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--text-dim, #94a3b8)',
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              onClick={handleSavePolicy}
              disabled={savingPolicy}
              style={{
                padding: '0.45rem 1.25rem',
                borderRadius: '6px',
                background: 'var(--primary, #6366f1)',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 10px var(--primary-glow, rgba(99, 102, 241, 0.35))'
              }}
            >
              {savingPolicy ? (isRtl ? 'جارِ التطبيق...' : 'Saving...') : (isRtl ? 'حفظ وتطبيق المسار' : 'Save & Enforce')}
            </button>
          </div>
        </div>

        {/* Mode Selector Pill Strip */}
        <div style={{
          background: 'var(--surface, #0f172a)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '0.85rem 1.25rem'
        }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text, #ffffff)', marginBottom: '0.65rem' }}>
            {isRtl ? 'اختر نمط الحوكمة والاعتماد للمورد:' : 'Select Governance Enforcement Mode:'}
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
            {/* Mode 1: DIRECT */}
            <div
              onClick={() => {
                if (activePolicy.isProtectedCore) return;
                setActivePolicy({ ...activePolicy, mode: 'DIRECT' });
              }}
              style={{
                padding: '0.85rem',
                borderRadius: '8px',
                border: isDirect ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                background: isDirect ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                cursor: activePolicy.isProtectedCore ? 'not-allowed' : 'pointer',
                opacity: activePolicy.isProtectedCore ? 0.45 : 1,
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                <Zap size={14} style={{ color: isDirect ? '#34d399' : '#94a3b8' }} />
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: isDirect ? '#34d399' : '#ffffff' }}>
                  {isRtl ? 'تنفيذ فوري مباشر' : 'Direct Execution'}
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim, #64748b)', lineHeight: '1.4' }}>
                {isRtl ? 'تطبيق التعديلات فور حفظها دون الحاجة لأي موافقة مسبقة.' : 'Changes execute immediately without approval gates.'}
              </div>
              {activePolicy.isProtectedCore && (
                <div style={{ fontSize: '0.66rem', color: '#f87171', marginTop: '0.35rem', fontWeight: 700 }}>
                  ✕ {isRtl ? 'محظور للموارد السيادية الحساسة' : 'Prohibited for core resource'}
                </div>
              )}
            </div>

            {/* Mode 2: MAKER_CHECKER */}
            <div
              onClick={() => {
                setActivePolicy({
                  ...activePolicy,
                  mode: 'MAKER_CHECKER',
                  stages: activePolicy.stages.length > 0 ? [activePolicy.stages[0]] : [{
                    stageOrder: 1,
                    stageKey: 'standard_review',
                    stageNameAr: 'المراجعة والاعتماد القياسي',
                    stageNameEn: 'Standard Review',
                    requiredPermission: 'governance:approve',
                    minApprovers: 1
                  }]
                });
              }}
              style={{
                padding: '0.85rem',
                borderRadius: '8px',
                border: isMakerChecker ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.08)',
                background: isMakerChecker ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                <UserCheck size={14} style={{ color: isMakerChecker ? '#818cf8' : '#94a3b8' }} />
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: isMakerChecker ? '#818cf8' : '#ffffff' }}>
                  {isRtl ? 'مدخل ومراجع (خطوة واحدة)' : 'Maker-Checker'}
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim, #64748b)', lineHeight: '1.4' }}>
                {isRtl ? 'التدقيق الثنائي الكلاسيكي: موظف يقدم التعديل، ومراجع معتمد يصادق عليه.' : 'Dual-control: Maker creates, Checker approves.'}
              </div>
            </div>

            {/* Mode 3: MULTI_STAGE_PIPELINE */}
            <div
              onClick={() => {
                setActivePolicy({ ...activePolicy, mode: 'MULTI_STAGE_PIPELINE' });
              }}
              style={{
                padding: '0.85rem',
                borderRadius: '8px',
                border: isMultiStage ? '1px solid #c084fc' : '1px solid rgba(255, 255, 255, 0.08)',
                background: isMultiStage ? 'rgba(168, 85, 247, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                <Workflow size={14} style={{ color: isMultiStage ? '#c084fc' : '#94a3b8' }} />
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: isMultiStage ? '#c084fc' : '#ffffff' }}>
                  {isRtl ? 'مسار تتابعي متعدد المراحل' : 'Multi-Stage Pipeline'}
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim, #64748b)', lineHeight: '1.4' }}>
                {isRtl ? 'سلسلة موافقات متتالية (مثلاً: مهندس معماري ➔ ضابط أمن معلومات ➔ مراجع مالي).' : 'Sequential multi-gate pipeline across departments.'}
              </div>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* INTERACTIVE VISUAL PIPELINE FLOW CANVAS (مخطط التدفق التفاعلي) */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <div style={{
          background: 'var(--surface, #0f172a)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div style={{ width: '100%', maxWidth: '680px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            {/* 1. NODE START: MAKER / INITIATOR */}
            <div style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '0.85rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '999px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                  <UserCheck size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#ffffff' }}>
                    {isRtl ? 'نقطة الانطلاق: المُدخل (Maker / Initiator)' : 'Start: Maker / Initiator'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim, #94a3b8)' }}>
                    {isRtl ? 'الموظف المسؤول عن إعداد المسودة وتقديم طلب التعديل.' : 'Prepares draft and submits change proposal.'}
                  </div>
                </div>
              </div>

              <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: 700 }}>
                {isRtl ? 'مبدأ SoD صارم' : 'Strict SoD'}
              </span>
            </div>

            {/* FLOW CONNECTOR */}
            {!isDirect && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.4rem 0' }}>
                <div style={{ width: '2px', height: '18px', background: 'rgba(255, 255, 255, 0.15)' }} />
                <ArrowDown size={14} style={{ color: 'var(--text-dim, #64748b)' }} />
              </div>
            )}

            {/* 2. INTERMEDIATE APPROVAL STAGES */}
            {!isDirect && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
                {activePolicy.stages.map((st, idx) => (
                  <React.Fragment key={st.stageKey || idx}>
                    <div style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '8px',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.25)'
                    }}>
                      {/* Stage Card Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '999px',
                            background: '#8b5cf6',
                            color: '#ffffff',
                            fontSize: '0.72rem',
                            fontWeight: 900,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {st.stageOrder}
                          </span>
                          <input
                            type="text"
                            value={st.stageNameAr}
                            onChange={e => updateStage(idx, { stageNameAr: e.target.value })}
                            placeholder={isRtl ? 'اسم المرحلة' : 'Stage Name'}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              borderBottom: '1px dashed rgba(255, 255, 255, 0.2)',
                              color: '#ffffff',
                              fontSize: '0.88rem',
                              fontWeight: 800,
                              outline: 'none',
                              padding: '0.1rem 0.25rem'
                            }}
                          />
                        </div>

                        {/* Delete Stage (Only in Multi-Stage mode with > 1 stages) */}
                        {isMultiStage && activePolicy.stages.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeStage(idx)}
                            style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0.2rem' }}
                            title={isRtl ? 'حذف هذه المرحلة' : 'Delete Stage'}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      {/* Stage Settings Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', paddingTop: '0.25rem' }}>
                        {/* Setting 1: Required Permission / Role */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-dim, #94a3b8)', marginBottom: '0.3rem' }}>
                            {isRtl ? 'الدور الرقابي المصرح له:' : 'Authorized Approver Role:'}
                          </label>
                          <select
                            value={st.requiredPermission}
                            onChange={e => updateStage(idx, { requiredPermission: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '0.4rem 0.65rem',
                              borderRadius: '6px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#38bdf8',
                              fontSize: '0.74rem',
                              outline: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="governance:approve" style={{ background: '#0f172a' }}>{isRtl ? 'مهندس معماري وتكامل (Architect)' : 'Architectural Review'}</option>
                            <option value="governance:approve:security" style={{ background: '#0f172a' }}>{isRtl ? 'ضابط أمن المعلومات والامتثال (CISO / Security)' : 'Information Security'}</option>
                            <option value="iam:manage" style={{ background: '#0f172a' }}>{isRtl ? 'مدير الهويات والصلاحيات (IAM Admin)' : 'IAM Administrator'}</option>
                            <option value="governance:approve:finance" style={{ background: '#0f172a' }}>{isRtl ? 'المراجع المالي والرقابة الداخلية' : 'Financial Controller'}</option>
                          </select>
                        </div>

                        {/* Setting 2: Min Approvers (نصاب التوقيع) */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-dim, #94a3b8)', marginBottom: '0.3rem' }}>
                            {isRtl ? 'نصاب التوقيع المطلوب (Quorum):' : 'Quorum Sign-offs:'}
                          </label>
                          <select
                            value={st.minApprovers || 1}
                            onChange={e => updateStage(idx, { minApprovers: parseInt(e.target.value, 10) || 1 })}
                            style={{
                              width: '100%',
                              padding: '0.4rem 0.65rem',
                              borderRadius: '6px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#ffffff',
                              fontSize: '0.74rem',
                              outline: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            <option value={1} style={{ background: '#0f172a' }}>{isRtl ? 'موافقة معتمد واحد يكفي (1 Sign-off)' : 'Single Approval'}</option>
                            <option value={2} style={{ background: '#0f172a' }}>{isRtl ? 'موافقة معتمدين اثنين (2 Dual Sign-offs)' : 'Dual Approval (2)'}</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Arrow down to next stage */}
                    {idx < activePolicy.stages.length - 1 && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '2px', height: '14px', background: 'rgba(255, 255, 255, 0.15)' }} />
                        <ArrowDown size={14} style={{ color: 'var(--text-dim, #64748b)' }} />
                      </div>
                    )}
                  </React.Fragment>
                ))}

                {/* Add Stage Button (Multi-Stage only) */}
                {isMultiStage && (
                  <button
                    type="button"
                    onClick={addStage}
                    style={{
                      marginTop: '0.5rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.4rem 0.95rem',
                      borderRadius: '6px',
                      background: 'rgba(168, 85, 247, 0.15)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      color: '#c084fc',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={13} /> {isRtl ? 'إضافة مرحلة اعتماد تتابعية' : 'Add Pipeline Stage'}
                  </button>
                )}
              </div>
            )}

            {/* FLOW CONNECTOR TO END */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.4rem 0' }}>
              <div style={{ width: '2px', height: '18px', background: 'rgba(255, 255, 255, 0.15)' }} />
              <ArrowDown size={14} style={{ color: 'var(--text-dim, #64748b)' }} />
            </div>

            {/* 3. NODE END: ATOMIC COMMIT & AUDIT SEAL */}
            <div style={{
              width: '100%',
              background: 'rgba(16, 185, 129, 0.08)',
              borderRadius: '8px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '0.85rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '999px', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#34d399' }}>
                    {isRtl ? 'المحطة الختامية: الإنفاذ الذري والختم المشفر' : 'Final: Atomic Commit & Audit Seal'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim, #94a3b8)' }}>
                    {isRtl ? 'يتم تطبيق التغييرات فوراً في قاعدة البيانات وتوليد إيصال التدقيق البنكي.' : 'Changes committed atomically to production with audit log.'}
                  </div>
                </div>
              </div>

              <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 700 }}>
                {isRtl ? 'تطبيق آلي نافذ' : 'Automated'}
              </span>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // MODE 2: THE MASTER POLICIES LIST (نظرة عامة على سياسات الموارد)
  // ═════════════════════════════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* 1. Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.85rem 1.25rem',
        background: 'var(--surface, #0f172a)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Workflow size={18} style={{ color: '#38bdf8' }} />
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text, #ffffff)', margin: 0 }}>
              {isRtl ? 'سياسات ومسارات الاعتماد المؤسسية' : 'Workflow Policies Studio'}
            </h2>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim, #94a3b8)', marginTop: '0.15rem' }}>
              {isRtl ? 'إدارة حوكمة التدقيق الثنائي (Maker-Checker) ومسارات الاعتماد متعددة المراحل لكل مورد.' : 'Configure dual-control policies and multi-stage approval pipelines per resource.'}
            </div>
          </div>
        </div>

        <button
          onClick={loadPolicies}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: 'var(--text-dim, #94a3b8)',
            cursor: 'pointer'
          }}
          title={isRtl ? 'تحديث السياسات' : 'Refresh'}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* 2. Policies Matrix Grid */}
      <div style={{
        background: 'var(--surface, #243d5c)',
        borderRadius: '8px',
        border: '1px solid var(--border-strong, rgba(255, 255, 255, 0.15))',
        boxShadow: 'var(--shadow-card, 0 4px 16px rgba(0, 0, 0, 0.25))',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left' }}>
            <thead>
              <tr style={{
                background: 'rgba(0, 0, 0, 0.22)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.10)',
                fontSize: '0.74rem',
                color: 'var(--text-dim, #94a3b8)',
                fontWeight: 700
              }}>
                <th style={{ padding: '0.75rem 1rem' }}>{isRtl ? 'المورد المؤسسي المحمي' : 'Protected Resource'}</th>
                <th style={{ padding: '0.75rem 1rem' }}>{isRtl ? 'نمط الحوكمة والاعتماد' : 'Governance Mode'}</th>
                <th style={{ padding: '0.75rem 1rem' }}>{isRtl ? 'عدد مراحل المسار' : 'Pipeline Stages'}</th>
                <th style={{ padding: '0.75rem 1rem' }}>{isRtl ? 'تفاصيل المراحل التتابعية' : 'Stage Flow'}</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{isRtl ? 'الإجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {policies.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-dim, #64748b)', fontSize: '0.85rem' }}>
                    {loading ? (isRtl ? 'جارِ تحميل السياسات...' : 'Loading...') : (isRtl ? 'لا توجد سياسات مسجلة حالياً.' : 'No policies found.')}
                  </td>
                </tr>
              ) : (
                policies.map(p => {
                  const modeBadge = p.mode === 'DIRECT' 
                    ? { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)', label: isRtl ? 'تنفيذ فوري مباشر' : 'Direct' }
                    : p.mode === 'MAKER_CHECKER'
                    ? { bg: 'rgba(99, 102, 241, 0.15)', text: '#a5b4fc', border: 'rgba(99, 102, 241, 0.35)', label: isRtl ? 'مدخل ومراجع (خطوة واحدة)' : 'Maker-Checker' }
                    : { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.35)', label: isRtl ? 'مسار متعدد المراحل' : 'Multi-Stage' };

                  return (
                    <tr 
                      key={p.resourceKey}
                      style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
                    >
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text, #ffffff)', fontSize: '0.85rem' }}>
                          {isRtl ? p.resourceNameAr : p.resourceNameEn}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-dim, #64748b)', fontFamily: 'monospace' }}>
                            {p.resourceKey}
                          </span>
                          {p.isProtectedCore && (
                            <span style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem', borderRadius: '3px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.25)', fontWeight: 700 }}>
                              {isRtl ? 'سيادي محمي' : 'Core'}
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                          background: modeBadge.bg,
                          color: modeBadge.text,
                          border: `1px solid ${modeBadge.border}`,
                          fontSize: '0.74rem',
                          fontWeight: 700
                        }}>
                          {modeBadge.label}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f1f5f9' }}>
                          {p.mode === 'DIRECT' ? '0' : p.stages?.length || 1}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        {p.mode === 'DIRECT' ? (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim, #64748b)' }}>
                            {isRtl ? 'بدون مراحل موافقة مسبقة' : 'No approval gates required'}
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                            {(p.stages || []).map((s, sIdx) => (
                              <span 
                                key={sIdx}
                                style={{
                                  fontSize: '0.68rem',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  background: 'rgba(255, 255, 255, 0.04)',
                                  border: '1px solid rgba(255, 255, 255, 0.08)',
                                  color: 'var(--text-dim, #94a3b8)'
                                }}
                              >
                                {s.stageOrder}. {isRtl ? s.stageNameAr : s.stageNameEn}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <button
                          onClick={() => handleOpenStudio(p)}
                          style={{
                            padding: '0.35rem 0.85rem',
                            borderRadius: '5px',
                            background: 'var(--primary, #6366f1)',
                            border: 'none',
                            color: '#ffffff',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            boxShadow: '0 2px 8px var(--primary-glow, rgba(99, 102, 241, 0.3))'
                          }}
                        >
                          <Sliders size={12} />
                          {isRtl ? 'تصميم المسار المرئي' : 'Design Pipeline'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
