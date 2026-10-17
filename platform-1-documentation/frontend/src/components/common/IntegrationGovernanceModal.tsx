import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Layers, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Lock, 
  Plus, 
  X, 
  FileText, 
  Info,
  ArrowRight,
  Store,
  Scale,
  ShieldAlert,
  Globe,
  Receipt
} from 'lucide-react';
import { Sector, SystemModule, SystemIntegration } from '../../types/schema';
import { docGovernanceEngine } from '../../services/docGovernanceEngine';
import { useLanguage } from '../../i18n';

interface IntegrationGovernanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  system: SystemModule | null;
  masterSectors: Record<string, Sector>;
  allSystems: Record<string, SystemModule>;
  onConfirmIntegration: (systemKey: string, integration: SystemIntegration) => Promise<void>;
  onCreateEntity: (entity: { key: string; name: string; nameEn?: string; code: string; icon?: string }) => Promise<void>;
  onCreateSystem: (system: SystemModule) => Promise<void>;
}

export const IntegrationGovernanceModal: React.FC<IntegrationGovernanceModalProps> = ({
  isOpen,
  onClose,
  system,
  masterSectors,
  allSystems,
  onConfirmIntegration,
  onCreateEntity,
  onCreateSystem
}) => {
  const { isRtl } = useLanguage();

  // Tab mode within modal: 'integrate' | 'new-entity' | 'new-system'
  const [modalTab, setModalTab] = useState<'integrate' | 'new-entity' | 'new-system'>('integrate');

  // Form states for Integration
  const [selectedEntityKey, setSelectedEntityKey] = useState<string>('');
  const [integrationDirection, setIntegrationDirection] = useState<'INBOUND' | 'OUTBOUND' | 'BIDIRECTIONAL'>('INBOUND');
  const [integrationError, setIntegrationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for New Entity (Sector)
  const [entityNameAr, setEntityNameAr] = useState('');
  const [entityNameEn, setEntityNameEn] = useState('');
  const [entityCode, setEntityCode] = useState('ENT_');
  const [entityIcon, setEntityIcon] = useState('Building2');
  const [entityError, setEntityError] = useState<string | null>(null);

  // Form states for New System
  const [sysNameAr, setSysNameAr] = useState('');
  const [sysNameEn, setSysNameEn] = useState('');
  const [sysCode, setSysCode] = useState('SYS_');
  const [sysIcon, setSysIcon] = useState('Layers');
  const [sysDesc, setSysDesc] = useState('');
  const [sysError, setSysError] = useState<string | null>(null);

  // Pre-filter entities & their approval statuses
  const entityOptions = useMemo(() => {
    return Object.entries(masterSectors).map(([key, sector]) => {
      const isAlreadyIntegrated = system?.integrations && Object.keys(system.integrations).includes(key);
      const approvedDoc = docGovernanceEngine.getApprovedDocForEntity(key);
      const hasApprovedDoc = !!approvedDoc;

      let eligibilityStatus: 'ELIGIBLE' | 'ALREADY_INTEGRATED' | 'NO_APPROVED_DOC' = 'ELIGIBLE';
      if (isAlreadyIntegrated) {
        eligibilityStatus = 'ALREADY_INTEGRATED';
      } else if (!hasApprovedDoc) {
        eligibilityStatus = 'NO_APPROVED_DOC';
      }

      return {
        key,
        sector,
        isAlreadyIntegrated,
        approvedDoc,
        hasApprovedDoc,
        eligibilityStatus
      };
    });
  }, [masterSectors, system]);

  // Selected entity metadata
  const selectedEntityMeta = useMemo(() => {
    return entityOptions.find(opt => opt.key === selectedEntityKey);
  }, [entityOptions, selectedEntityKey]);

  if (!isOpen) return null;

  // Handle Integration Submission
  const handlePerformIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntegrationError(null);

    if (!system) {
      setIntegrationError('النظام المستهدف غير محدد.');
      return;
    }

    if (!selectedEntityKey) {
      setIntegrationError('يرجى اختيار جهة للتكامل.');
      return;
    }

    const meta = selectedEntityMeta;
    if (!meta) {
      setIntegrationError('الجهة المختارة غير صالحة.');
      return;
    }

    // ── 1. SOLID INVARIANT: NO DUPLICATE INTEGRATION ──
    if (meta.isAlreadyIntegrated) {
      setIntegrationError(`النظام [${system.name}] متكامل بالفعل مع هذه الجهة. تمنع قواعد الحوكمة تكرار التكامل لنفس الجهة.`);
      return;
    }

    // ── 2. GOLDEN RULE: APPROVED API DOCUMENT PRE-CONDITION ──
    if (!meta.hasApprovedDoc) {
      setIntegrationError(`حظر حوكمة سيادي: لا يمكن ربط النظام بالجهة [${meta.sector.name}] لعدم وجود وثيقة API معتمدة (APPROVED). يجب اعتماد مواصفة الـ API الخاصة بالجهة أولاً.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const newInt: SystemIntegration = {
        entityId: selectedEntityKey,
        name: meta.sector.name,
        nameEn: meta.sector.nameEn || meta.sector.name,
        code: meta.sector.code,
        icon: meta.sector.icon || 'Building2',
        direction: integrationDirection,
        endpoints: [],
        docTitle: meta.approvedDoc?.changeSummary || 'وثيقة المواصفات المعتمدة',
        docVersion: meta.approvedDoc?.versionNumber || 'v2026.2'
      };

      await onConfirmIntegration(system.key, newInt);
      onClose();
    } catch (err: any) {
      setIntegrationError(err.message || 'فشل إتمام التكامل.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle New Entity Creation
  const handlePerformCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    setEntityError(null);

    if (!entityNameAr.trim()) {
      setEntityError('يرجى إدخال اسم الجهة باللغة العربية.');
      return;
    }

    const cleanCode = entityCode.trim().toUpperCase();
    if (!cleanCode || cleanCode === 'ENT_') {
      setEntityError('يرجى تحديد رمز سيادي فريد للجهة (Code).');
      return;
    }

    // Check duplicate code
    const duplicateCode = Object.values(masterSectors).find(
      s => s.code.trim().toUpperCase() === cleanCode
    );
    if (duplicateCode) {
      setEntityError(`خرق لقواعد الحوكمة: الرمز [${cleanCode}] مستخدم مسبقاً للجهة [${duplicateCode.name}].`);
      return;
    }

    // Check duplicate name
    const duplicateName = Object.values(masterSectors).find(
      s => s.name.trim().toLowerCase() === entityNameAr.trim().toLowerCase()
    );
    if (duplicateName) {
      setEntityError(`خرق لقواعد الحوكمة: اسم الجهة [${entityNameAr}] مسجل مسبقاً في الدليل.`);
      return;
    }

    const genKey = (entityNameEn.trim() || entityNameAr.trim())
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/^_+|_+$/g, '') || `ent_${Date.now()}`;

    if (masterSectors[genKey]) {
      setEntityError(`المعرف [${genKey}] مستخدم مسبقاً.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateEntity({
        key: genKey,
        name: entityNameAr.trim(),
        nameEn: entityNameEn.trim() || entityNameAr.trim(),
        code: cleanCode,
        icon: entityIcon
      });
      setModalTab('integrate');
      setSelectedEntityKey(genKey);
    } catch (err: any) {
      setEntityError(err.message || 'فشل تسجيل الجهة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle New System Creation
  const handlePerformCreateSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSysError(null);

    if (!sysNameAr.trim()) {
      setSysError('يرجى إدخال اسم النظام باللغة العربية.');
      return;
    }

    const cleanCode = sysCode.trim().toUpperCase();
    if (!cleanCode || cleanCode === 'SYS_') {
      setSysError('يرجى تحديد رمز سيادي فريد للنظام (Code).');
      return;
    }

    // Check duplicate code across systems
    const duplicateCode = Object.values(allSystems).find(
      s => s.code.trim().toUpperCase() === cleanCode
    );
    if (duplicateCode) {
      setSysError(`خرق لقواعد الحوكمة: الرمز [${cleanCode}] مستخدم بالفعل للنظام [${duplicateCode.name}].`);
      return;
    }

    const genKey = (sysNameEn.trim() || sysNameAr.trim())
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/^_+|_+$/g, '') || `sys_${Date.now()}`;

    if (allSystems[genKey]) {
      setSysError(`المعرف [${genKey}] مستخدم بالفعل.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const newSys: SystemModule = {
        key: genKey,
        name: sysNameAr.trim(),
        nameEn: sysNameEn.trim() || sysNameAr.trim(),
        code: cleanCode,
        icon: sysIcon,
        description: sysDesc.trim() || 'نظام مؤسسي مالي معتمد',
        status: 'ACTIVE',
        associatedSectorKeys: [],
        integrations: {} // Completely isolated and abstract on creation!
      };

      await onCreateSystem(newSys);
      onClose();
    } catch (err: any) {
      setSysError(err.message || 'فشل إنشاء النظام.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="floating-alert-overlay" onClick={onClose} style={{ zIndex: 12000 }}>
      <div 
        className="floating-alert-card" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '680px', 
          width: '94%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          borderRadius: '16px',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-card, #111827)',
          border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65)'
        }}
      >
        {/* Modal Top Header */}
        <div style={{
          padding: '1.2rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.2) 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981'
            }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main, #ffffff)', margin: 0 }}>
                {modalTab === 'integrate' && (isRtl ? `حوكمة تكامل النظام: [${system?.name || ''}]` : `System Integration Governance: [${system?.name || ''}]`)}
                {modalTab === 'new-entity' && (isRtl ? 'تسجيل جهة جديدة مجردة' : 'Register New Abstract Entity')}
                {modalTab === 'new-system' && (isRtl ? 'تأسيس نظام جديد مجرد' : 'Create New Abstract System')}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', margin: 0, marginTop: '2px' }}>
                {isRtl ? 'معمارية SOLID المؤسسية: تجريد الكيانات والتحقق الصارم من وثائق الـ API المعتمدة' : 'Enterprise SOLID: Entity Decoupling & Strict Approved Spec Contracts'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim, #64748b)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          padding: '0.5rem 1.5rem',
          gap: '8px',
          borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
          background: 'rgba(0,0,0,0.15)'
        }}>
          <button
            type="button"
            onClick={() => setModalTab('integrate')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: modalTab === 'integrate' ? '#10b981' : 'transparent',
              color: modalTab === 'integrate' ? '#ffffff' : 'var(--text-muted, #94a3b8)'
            }}
          >
            <Layers size={15} />
            <span>{isRtl ? 'ربط تكامل جديد' : 'Integrate with Entity'}</span>
          </button>

          <button
            type="button"
            onClick={() => setModalTab('new-entity')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: modalTab === 'new-entity' ? '#0ea5e9' : 'transparent',
              color: modalTab === 'new-entity' ? '#ffffff' : 'var(--text-muted, #94a3b8)'
            }}
          >
            <Building2 size={15} />
            <span>{isRtl ? '+ إنشاء جهة مجردة' : '+ Create Abstract Entity'}</span>
          </button>

          <button
            type="button"
            onClick={() => setModalTab('new-system')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: modalTab === 'new-system' ? '#8b5cf6' : 'transparent',
              color: modalTab === 'new-system' ? '#ffffff' : 'var(--text-muted, #94a3b8)'
            }}
          >
            <Plus size={15} />
            <span>{isRtl ? '+ إنشاء نظام مجرد' : '+ Create Abstract System'}</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>

          {/* ══════════════════════════════════════════════════════════════
              TAB 1: INTEGRATION FLOW (WITH APPROVED SPEC PRE-CONDITION)
              ══════════════════════════════════════════════════════════════ */}
          {modalTab === 'integrate' && (
            <form onSubmit={handlePerformIntegration} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              
              {/* Architecture Rule Banner */}
              <div style={{
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start'
              }}>
                <Info size={18} style={{ color: '#38bdf8', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted, #94a3b8)', lineHeight: 1.55 }}>
                  <strong style={{ color: '#38bdf8' }}>عقد التكامل السيادي (Integration Contract):</strong>
                  <br />
                  1. يجب أن تكون الجهة مسجلة في دليل الجهات المجردة.
                  <br />
                  2. <strong>الشرط الذهبي:</strong> يجب أن تمتلك الجهة <strong>وثيقة API معتمدة رسمياً (APPROVED)</strong>.
                  <br />
                  3. يمنع تكرار التكامل لنفس الجهة في نفس النظام.
                </div>
              </div>

              {/* Entity Selection with Live Eligibility */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main, #ffffff)', marginBottom: '8px' }}>
                  {isRtl ? 'اختر الجهة المستهدفة للتكامل:' : 'Select Target Entity for Integration:'}
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {entityOptions.map(opt => {
                    const isSelected = selectedEntityKey === opt.key;
                    const isBlocked = opt.eligibilityStatus !== 'ELIGIBLE';

                    return (
                      <div
                        key={opt.key}
                        onClick={() => {
                          if (!isBlocked) {
                            setSelectedEntityKey(opt.key);
                            setIntegrationError(null);
                          }
                        }}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '10px',
                          border: isSelected 
                            ? '2px solid #10b981' 
                            : '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                          backgroundColor: isSelected 
                            ? 'rgba(16, 185, 129, 0.08)' 
                            : isBlocked 
                              ? 'rgba(255,255,255,0.02)' 
                              : 'rgba(255,255,255,0.04)',
                          cursor: isBlocked ? 'not-allowed' : 'pointer',
                          opacity: isBlocked ? 0.65 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'rgba(56, 189, 248, 0.12)',
                            color: '#38bdf8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Building2 size={16} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ fontSize: '0.92rem', color: isBlocked ? 'var(--text-dim, #64748b)' : 'var(--text-main, #ffffff)' }}>
                                {opt.sector.name}
                              </strong>
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                                [{opt.sector.code}]
                              </span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
                              {opt.sector.nameEn || opt.sector.name}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {opt.eligibilityStatus === 'ELIGIBLE' && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#10b981',
                              border: '1px solid rgba(16, 185, 129, 0.3)'
                            }}>
                              <CheckCircle2 size={12} />
                              <span>وثيقة معتمدة ({opt.approvedDoc?.versionNumber})</span>
                            </span>
                          )}

                          {opt.eligibilityStatus === 'ALREADY_INTEGRATED' && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: 'rgba(245, 158, 11, 0.15)',
                              color: '#f59e0b',
                              border: '1px solid rgba(245, 158, 11, 0.3)'
                            }}>
                              <Lock size={12} />
                              <span>متكامل مسبقاً بالنظام</span>
                            </span>
                          )}

                          {opt.eligibilityStatus === 'NO_APPROVED_DOC' && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: 'rgba(244, 63, 94, 0.15)',
                              color: '#f43f5e',
                              border: '1px solid rgba(244, 63, 94, 0.3)'
                            }}>
                              <AlertTriangle size={12} />
                              <span>غير مؤهلة (لا توجد وثيقة معتمدة)</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Integration Direction */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main, #ffffff)', marginBottom: '8px' }}>
                  {isRtl ? 'اتجاه تدفق البيانات (Integration Direction):' : 'Data Flow Direction:'}
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[
                    { id: 'INBOUND', labelAr: 'وارد للنظام (INBOUND)', labelEn: 'Inbound' },
                    { id: 'OUTBOUND', labelAr: 'صادر من النظام (OUTBOUND)', labelEn: 'Outbound' },
                    { id: 'BIDIRECTIONAL', labelAr: 'ثنائي الاتجاه (BIDIRECTIONAL)', labelEn: 'Bidirectional' }
                  ].map(dir => (
                    <button
                      key={dir.id}
                      type="button"
                      onClick={() => setIntegrationDirection(dir.id as any)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        border: integrationDirection === dir.id ? '2px solid #10b981' : '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                        backgroundColor: integrationDirection === dir.id ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.03)',
                        color: integrationDirection === dir.id ? '#10b981' : 'var(--text-muted, #94a3b8)',
                        cursor: 'pointer'
                      }}
                    >
                      {dir.labelAr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Callout */}
              {integrationError && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(244, 63, 94, 0.12)',
                  border: '1px solid rgba(244, 63, 94, 0.35)',
                  color: '#f43f5e',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>{integrationError}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    background: 'transparent',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.15))',
                    color: 'var(--text-muted, #94a3b8)',
                    cursor: 'pointer'
                  }}
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !selectedEntityKey || selectedEntityMeta?.eligibilityStatus !== 'ELIGIBLE'}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    background: (!selectedEntityKey || selectedEntityMeta?.eligibilityStatus !== 'ELIGIBLE') ? 'rgba(255,255,255,0.08)' : '#10b981',
                    color: (!selectedEntityKey || selectedEntityMeta?.eligibilityStatus !== 'ELIGIBLE') ? 'rgba(255,255,255,0.3)' : '#ffffff',
                    border: 'none',
                    cursor: (!selectedEntityKey || selectedEntityMeta?.eligibilityStatus !== 'ELIGIBLE') ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>{isSubmitting ? 'جاري التحقق والربط...' : 'إتمام وتثبيت التكامل'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 2: REGISTER NEW ABSTRACT ENTITY (INDEPENDENT)
              ══════════════════════════════════════════════════════════════ */}
          {modalTab === 'new-entity' && (
            <form onSubmit={handlePerformCreateEntity} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                background: 'rgba(14, 165, 233, 0.08)',
                border: '1px solid rgba(14, 165, 233, 0.25)',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start'
              }}>
                <Info size={18} style={{ color: '#0ea5e9', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted, #94a3b8)', lineHeight: 1.55 }}>
                  <strong style={{ color: '#0ea5e9' }}>تجريد الكيان (SOLID Single Responsibility):</strong>
                  <br />
                  يتم تسجيل الجهة ككيان سيادي مجرد مستقل بذاته. لا تشترط وجود أي نظام مسبق، ويمكنها لاحقاً التكامل مع أي نظام بشرط اعتماد وثيقة API خاصة بها.
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main, #ffffff)', marginBottom: '6px' }}>
                  اسم الجهة (باللغة العربية) *
                </label>
                <input
                  type="text"
                  value={entityNameAr}
                  onChange={e => setEntityNameAr(e.target.value)}
                  placeholder="مثال: البنوك المركزية، مزودو بطاقات الدفع"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
                    color: '#ffffff',
                    fontSize: '0.88rem'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main, #ffffff)', marginBottom: '6px' }}>
                  اسم الجهة (باللغة الإنجليزية)
                </label>
                <input
                  type="text"
                  value={entityNameEn}
                  onChange={e => setEntityNameEn(e.target.value)}
                  placeholder="e.g. Central Banks, Payment Card Providers"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
                    color: '#ffffff',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main, #ffffff)', marginBottom: '6px' }}>
                  الرمز السيادي الفريد للجهة (Unique Code) *
                </label>
                <input
                  type="text"
                  value={entityCode}
                  onChange={e => setEntityCode(e.target.value.toUpperCase())}
                  placeholder="ENT_BANKING_HUB"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
                    color: '#38bdf8',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '0.88rem'
                  }}
                  required
                />
              </div>

              {entityError && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(244, 63, 94, 0.12)',
                  border: '1px solid rgba(244, 63, 94, 0.35)',
                  color: '#f43f5e',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>{entityError}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalTab('integrate')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    background: 'transparent',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.15))',
                    color: 'var(--text-muted, #94a3b8)',
                    cursor: 'pointer'
                  }}
                >
                  رجوع
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    background: '#0ea5e9',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Plus size={16} />
                  <span>{isSubmitting ? 'جاري التسجيل...' : 'تسجيل الجهة في الدليل'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 3: CREATE NEW ABSTRACT SYSTEM (INDEPENDENT)
              ══════════════════════════════════════════════════════════════ */}
          {modalTab === 'new-system' && (
            <form onSubmit={handlePerformCreateSystem} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                background: 'rgba(139, 92, 246, 0.08)',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start'
              }}>
                <Info size={18} style={{ color: '#a78bfa', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted, #94a3b8)', lineHeight: 1.55 }}>
                  <strong style={{ color: '#a78bfa' }}>استقلالية النظام (Decoupled System Architecture):</strong>
                  <br />
                  يُنشأ النظام مستقلاً بذاته دون فرض أي تكاملات مبدئية، ويمكنه لاحقاً الارتباط بأي جهة بعد توفر وثائق الـ API المعتمدة.
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main, #ffffff)', marginBottom: '6px' }}>
                  اسم النظام (باللغة العربية) *
                </label>
                <input
                  type="text"
                  value={sysNameAr}
                  onChange={e => setSysNameAr(e.target.value)}
                  placeholder="مثال: نظام التحصيل، منصة المدفوعات"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
                    color: '#ffffff',
                    fontSize: '0.88rem'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main, #ffffff)', marginBottom: '6px' }}>
                  اسم النظام (باللغة الإنجليزية)
                </label>
                <input
                  type="text"
                  value={sysNameEn}
                  onChange={e => setSysNameEn(e.target.value)}
                  placeholder="e.g. Collection Platform, Billing Hub"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
                    color: '#ffffff',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main, #ffffff)', marginBottom: '6px' }}>
                  الرمز السيادي الفريد للنظام (Unique System Code) *
                </label>
                <input
                  type="text"
                  value={sysCode}
                  onChange={e => setSysCode(e.target.value.toUpperCase())}
                  placeholder="SYS_COLLECTION_HUB"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
                    color: '#a78bfa',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '0.88rem'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main, #ffffff)', marginBottom: '6px' }}>
                  وصف النظام والغرض التشغيلي
                </label>
                <textarea
                  value={sysDesc}
                  onChange={e => setSysDesc(e.target.value)}
                  placeholder="وصف مختصر للمنصة أو النظام وطبيعة العمليات المالية المنفذة..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    resize: 'none'
                  }}
                />
              </div>

              {sysError && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(244, 63, 94, 0.12)',
                  border: '1px solid rgba(244, 63, 94, 0.35)',
                  color: '#f43f5e',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>{sysError}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalTab('integrate')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    background: 'transparent',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.15))',
                    color: 'var(--text-muted, #94a3b8)',
                    cursor: 'pointer'
                  }}
                >
                  رجوع
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    background: '#8b5cf6',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Plus size={16} />
                  <span>{isSubmitting ? 'جاري الإنشاء...' : 'تأسيس النظام المجرد'}</span>
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
