import React, { useState } from 'react';
import { 
  DynamicDocument, 
  DocumentSection, 
  RenderModeKey, 
  EditabilityPolicy, 
  ChangeImpactAnalysis 
} from '../../types/dynamicDocs';
import { WebCanvasView } from './WebCanvasView';
import { PrintA4CanvasView } from './PrintA4CanvasView';
import { ImpactAwarenessHint } from './ImpactAwarenessHint';
import { 
  ArrowRight, 
  Save, 
  Send, 
  Printer, 
  Globe, 
  FileText, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Sliders, 
  Palette,
  Eye,
  Check
} from 'lucide-react';

interface DocumentStudioProps {
  initialDocument: DynamicDocument;
  onBack: () => void;
  onSave: (doc: DynamicDocument) => Promise<void>;
  onPublish: (docId: string) => Promise<void>;
}

export const DocumentStudio: React.FC<DocumentStudioProps> = ({
  initialDocument,
  onBack,
  onSave,
  onPublish
}) => {
  const [doc, setDoc] = useState<DynamicDocument>(initialDocument);
  const [activeMode, setActiveMode] = useState<RenderModeKey>('web');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    initialDocument.sections[0]?.id || null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Active section helper
  const selectedSection = doc.sections.find(s => s.id === selectedSectionId) || null;

  // Active mode config
  const currentModeConfig = doc.renderModes[activeMode] || {};
  const currentPolicy: EditabilityPolicy = currentModeConfig.policy || 'CUSTOMIZABLE';
  const isModeLocked = currentPolicy === 'LOCKED';

  // Real-time Impact Analysis computation
  const getContextualImpact = (): ChangeImpactAnalysis | null => {
    if (selectedSection) {
      return {
        scope: 'SHARED_CONTENT',
        title: 'تعديل في المحتوى المشترك (Single Source of Truth)',
        description: `أنت تعدل محتوى قسم [${selectedSection.title || selectedSection.type}]. هذا التغيير سينعكس حتمياً على كل من وضع الويب التفاعلي ونسخة الطباعة A4.`,
        affectedModes: ['web', 'print_a4'],
        severity: 'medium',
        requiresReview: false
      };
    }

    if (activeMode === 'print_a4') {
      return {
        scope: 'MODE_LOCAL',
        title: 'إعدادات خاصة بوضع الطباعة A4',
        description: 'التعديلات على الهوامش، فواصل الصفحات، الترويسة والتذييل محصورة بوضع الطباعة A4 ولن تغير هيكل الويب.',
        affectedModes: ['print_a4'],
        severity: 'low',
        requiresReview: false
      };
    }

    return {
      scope: 'SHARED_TOKEN',
      title: 'الهوية البصرية المشتركة',
      description: 'الخصائص المحددة تمثل إعدادات الهوية العامة وتؤثر على نمط العرض في جميع القنوات.',
      affectedModes: ['web', 'print_a4'],
      severity: 'low',
      requiresReview: false
    };
  };

  // Section manipulation
  const handleUpdateSectionData = (key: string, value: any) => {
    if (!selectedSectionId || isModeLocked) return;

    setDoc(prev => ({
      ...prev,
      sections: prev.sections.map(sec => {
        if (sec.id !== selectedSectionId) return sec;
        return {
          ...sec,
          data: {
            ...sec.data,
            [key]: value
          }
        };
      })
    }));
  };

  const handleUpdateSectionTitle = (title: string) => {
    if (!selectedSectionId || isModeLocked) return;
    setDoc(prev => ({
      ...prev,
      sections: prev.sections.map(sec => (sec.id === selectedSectionId ? { ...sec, title } : sec))
    }));
  };

  const handleAddSection = (type: DocumentSection['type']) => {
    if (isModeLocked) return;
    const newId = `sec-${Date.now()}`;
    const newSec: DocumentSection = {
      id: newId,
      type,
      title:
        type === 'endpoint'
          ? 'نقطة نهاية API جديدة'
          : type === 'fields-table'
          ? 'جدول مواصفات الحقول'
          : type === 'callout'
          ? 'تنبيه أمني ومعياري'
          : 'قسم نصي جديد',
      data:
        type === 'endpoint'
          ? {
              method: 'GET',
              path: '/api/v1/new-service',
              description: 'وصف نقطة النهاية المستحدثة'
            }
          : type === 'callout'
          ? {
              calloutType: 'info',
              content: 'ملاحظة تشغيلية تتعلق بالامتثال المالي'
            }
          : {
              content: 'أدخل تفاصيل التوثيق هنا...'
            }
    };

    setDoc(prev => ({
      ...prev,
      sections: [...prev.sections, newSec]
    }));
    setSelectedSectionId(newId);
  };

  const handleDeleteSection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isModeLocked) return;
    setDoc(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== id)
    }));
    if (selectedSectionId === id) {
      setSelectedSectionId(null);
    }
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    if (isModeLocked) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= doc.sections.length) return;

    setDoc(prev => {
      const items = [...prev.sections];
      const temp = items[index];
      items[index] = items[targetIdx];
      items[targetIdx] = temp;
      return { ...prev, sections: items };
    });
  };

  // Policy toggles
  const handlePolicyChange = (policy: EditabilityPolicy) => {
    setDoc(prev => ({
      ...prev,
      renderModes: {
        ...prev.renderModes,
        [activeMode]: {
          ...prev.renderModes[activeMode],
          policy
        }
      }
    }));
  };

  // Print Mode Margins
  const handleMarginChange = (side: 'top' | 'bottom' | 'left' | 'right', val: number) => {
    setDoc(prev => ({
      ...prev,
      renderModes: {
        ...prev.renderModes,
        print_a4: {
          ...prev.renderModes.print_a4,
          marginsMm: {
            ...prev.renderModes.print_a4.marginsMm,
            [side]: val
          }
        }
      }
    }));
  };

  // Save handler
  const handleSaveDraft = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);
    try {
      await onSave(doc);
      setSaveSuccessMsg('تم حفظ المسودة بنجاح');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Publish handler
  const handlePublishDoc = async () => {
    if (!window.confirm('هل أنت متأكد من اعتماد ونشر هذه الوثيقة؟ سيتم تسجيل إصدار رسمي ثابت.')) {
      return;
    }
    setIsPublishing(true);
    try {
      await onPublish(doc.id);
      setDoc(prev => ({ ...prev, status: 'PUBLISHED' }));
      setSaveSuccessMsg('تم اعتماد ونشر الوثيقة رسمياً');
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } finally {
      setIsPublishing(false);
    }
  };

  // Direct Browser Print
  const handlePrint = () => {
    setActiveMode('print_a4');
    setTimeout(() => {
      window.print();
    }, 250);
  };

  return (
    <div
      className="document-studio-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        background: '#162238',
        color: '#f8fafc',
        overflow: 'hidden'
      }}
    >
      {/* ── 1. STUDIO MASTER CONTROL BAR ── */}
      <header
        style={{
          background: '#243d5c',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          padding: '0.65rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexShrink: 0
        }}
      >
        {/* Left: Back & Doc Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '6px',
              padding: '0.4rem 0.75rem',
              color: '#f8fafc',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.82rem',
              fontWeight: 700
            }}
          >
            <ArrowRight size={15} />
            <span>مكتبة الوثائق</span>
          </button>

          <div style={{ borderRight: '1px solid rgba(255,255,255,0.12)', height: '24px' }} />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="text"
                value={doc.title}
                onChange={(e) => setDoc(prev => ({ ...prev, title: e.target.value }))}
                disabled={isModeLocked}
                style={{
                  background: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: '4px',
                  color: '#f8fafc',
                  fontSize: '1rem',
                  fontWeight: 800,
                  padding: '0.1rem 0.35rem',
                  width: '380px'
                }}
                onFocus={(e) => (e.target.style.border = '1px solid #38bdf8')}
                onBlur={(e) => (e.target.style.border = '1px solid transparent')}
              />
              <span
                style={{
                  background: doc.status === 'PUBLISHED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: doc.status === 'PUBLISHED' ? '#10b981' : '#f59e0b',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px',
                  fontSize: '0.7rem',
                  fontWeight: 800
                }}
              >
                {doc.status}
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', paddingRight: '0.4rem' }}>
              إصدار: v{doc.version} | آخر تحديث: {new Date(doc.updatedAt).toLocaleTimeString('ar-SA')}
            </div>
          </div>
        </div>

        {/* Center: Mode Switcher (Web vs A4) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#1c3250',
            padding: '0.2rem',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.10)'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveMode('web')}
            style={{
              background: activeMode === 'web' ? '#0284c7' : 'transparent',
              color: activeMode === 'web' ? '#ffffff' : '#94a3b8',
              border: 'none',
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease'
            }}
          >
            <Globe size={14} />
            <span>عرض الويب (Web Mode)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('print_a4')}
            style={{
              background: activeMode === 'print_a4' ? '#0284c7' : 'transparent',
              color: activeMode === 'print_a4' ? '#ffffff' : '#94a3b8',
              border: 'none',
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease'
            }}
          >
            <FileText size={14} />
            <span>عرض الطباعة A4 (Print Mode)</span>
          </button>
        </div>

        {/* Right: Policy Controller + Save & Publish Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* Policy Selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '0.25rem 0.55rem',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.10)'
            }}
            title="سياسة تعديل الوضع الحالي"
          >
            {isModeLocked ? <Lock size={13} color="#f43f5e" /> : <Unlock size={13} color="#10b981" />}
            <span style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>السياسة:</span>
            <select
              value={currentPolicy}
              onChange={(e) => handlePolicyChange(e.target.value as EditabilityPolicy)}
              style={{
                background: '#1c3250',
                border: 'none',
                color: '#f8fafc',
                fontSize: '0.74rem',
                borderRadius: '4px',
                padding: '0.2rem',
                cursor: 'pointer'
              }}
            >
              <option value="CUSTOMIZABLE">قابل للتخصيص الكامل</option>
              <option value="RESTRICTED">مقيد التعديل (محمي)</option>
              <option value="LOCKED">ثابت مركزي (مغلق)</option>
            </select>
          </div>

          {/* Print/PDF */}
          <button
            type="button"
            onClick={handlePrint}
            title="تصدير وطباعة نسخة A4 رسمية"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f8fafc',
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Printer size={15} />
            <span>طباعة PDF</span>
          </button>

          {/* Save Draft */}
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSaving}
            style={{
              background: '#2b4870',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#f8fafc',
              padding: '0.45rem 0.95rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: isSaving ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Save size={15} />
            <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ المسودة'}</span>
          </button>

          {/* Publish Button */}
          {doc.status !== 'PUBLISHED' && (
            <button
              type="button"
              onClick={handlePublishDoc}
              disabled={isPublishing}
              style={{
                background: '#10b981',
                border: 'none',
                color: '#ffffff',
                padding: '0.45rem 1rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 900,
                cursor: isPublishing ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
              }}
            >
              <Send size={15} />
              <span>{isPublishing ? 'جارٍ النشر...' : 'اعتماد ونشر'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Save Success Alert Notification */}
      {saveSuccessMsg && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.2)',
            borderBottom: '1px solid rgba(16, 185, 129, 0.4)',
            padding: '0.4rem 1.5rem',
            color: '#10b981',
            fontSize: '0.8rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            justifyContent: 'center'
          }}
        >
          <Check size={16} />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* ── 2. MAIN 3-PANE WORKSPACE ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* PANE A (Right in RTL): Sections Outline & Component Toolbox */}
        <aside
          style={{
            width: '280px',
            background: '#1e3352',
            borderLeft: '1px solid rgba(255, 255, 255, 0.10)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0
          }}
        >
          {/* Section Tree Header */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#cbd5e1' }}>
              أقسام وبنية الوثيقة ({doc.sections.length})
            </span>
          </div>

          {/* Quick Add Buttons Drawer */}
          {!isModeLocked && (
            <div
              style={{
                padding: '0.75rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.4rem'
              }}
            >
              <button
                type="button"
                onClick={() => handleAddSection('endpoint')}
                style={{
                  background: '#2b4870',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f8fafc',
                  padding: '0.35rem 0.45rem',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  justifyContent: 'center'
                }}
              >
                <Plus size={13} color="#38bdf8" />
                <span>+ نقطة API</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddSection('fields-table')}
                style={{
                  background: '#2b4870',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f8fafc',
                  padding: '0.35rem 0.45rem',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  justifyContent: 'center'
                }}
              >
                <Plus size={13} color="#10b981" />
                <span>+ جدول حقول</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddSection('callout')}
                style={{
                  background: '#2b4870',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f8fafc',
                  padding: '0.35rem 0.45rem',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  justifyContent: 'center'
                }}
              >
                <Plus size={13} color="#f59e0b" />
                <span>+ تنبيه أمني</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddSection('custom-text')}
                style={{
                  background: '#2b4870',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f8fafc',
                  padding: '0.35rem 0.45rem',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  justifyContent: 'center'
                }}
              >
                <Plus size={13} color="#cbd5e1" />
                <span>+ نص حر</span>
              </button>
            </div>
          )}

          {/* Sections Tree List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {doc.sections.map((sec, idx) => {
              const isSelected = selectedSectionId === sec.id;
              return (
                <div
                  key={sec.id}
                  onClick={() => setSelectedSectionId(sec.id)}
                  style={{
                    padding: '0.65rem 0.75rem',
                    borderRadius: '6px',
                    background: isSelected ? '#2b4870' : 'transparent',
                    border: isSelected ? '1px solid #38bdf8' : '1px solid transparent',
                    color: isSelected ? '#ffffff' : '#cbd5e1',
                    marginBottom: '0.3rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                      {idx + 1}. {sec.title || sec.type}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{sec.type}</div>
                  </div>

                  {/* Actions on hover/select */}
                  {isSelected && !isModeLocked && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <button
                        type="button"
                        onClick={(e) => handleMoveSection(idx, 'up', e)}
                        disabled={idx === 0}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.1rem' }}
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleMoveSection(idx, 'down', e)}
                        disabled={idx === doc.sections.length - 1}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.1rem' }}
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSection(sec.id, e)}
                        style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '0.1rem' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* PANE B: Central Canvas Viewport */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            background: activeMode === 'print_a4' ? '#0d1522' : '#1a2d45',
            padding: '1.5rem',
            position: 'relative'
          }}
        >
          {activeMode === 'web' ? (
            <WebCanvasView
              document={doc}
              onSelectSection={setSelectedSectionId}
              selectedSectionId={selectedSectionId || undefined}
              isReadOnly={isModeLocked}
            />
          ) : (
            <PrintA4CanvasView
              document={doc}
              onSelectSection={setSelectedSectionId}
              selectedSectionId={selectedSectionId || undefined}
            />
          )}
        </main>

        {/* PANE C (Left in RTL): Properties Inspector & Impact Awareness */}
        <aside
          style={{
            width: '320px',
            background: '#1e3352',
            borderRight: '1px solid rgba(255, 255, 255, 0.10)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflowY: 'auto',
            padding: '1rem'
          }}
        >
          {/* Header of Inspector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: '0.75rem',
              marginBottom: '1rem'
            }}
          >
            <Sliders size={16} color="#38bdf8" />
            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#f8fafc' }}>
              لوحة الخصائص وكشف الأثر
            </span>
          </div>

          {/* Contextual Impact Alert */}
          <ImpactAwarenessHint impact={getContextualImpact()} />

          {/* If a section is selected: edit its properties */}
          {selectedSection ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.3rem' }}>
                  عنوان القسم:
                </label>
                <input
                  type="text"
                  value={selectedSection.title || ''}
                  onChange={(e) => handleUpdateSectionTitle(e.target.value)}
                  disabled={isModeLocked}
                  style={{
                    width: '100%',
                    background: '#1c3250',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '5px',
                    padding: '0.45rem',
                    color: '#ffffff',
                    fontSize: '0.82rem'
                  }}
                />
              </div>

              {selectedSection.type === 'endpoint' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.3rem' }}>
                      طريقة الطلب (HTTP Method):
                    </label>
                    <select
                      value={selectedSection.data.method || 'GET'}
                      onChange={(e) => handleUpdateSectionData('method', e.target.value)}
                      disabled={isModeLocked}
                      style={{
                        width: '100%',
                        background: '#1c3250',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '5px',
                        padding: '0.45rem',
                        color: '#ffffff',
                        fontSize: '0.82rem'
                      }}
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.3rem' }}>
                      مسار الـ API (Path):
                    </label>
                    <input
                      type="text"
                      value={selectedSection.data.path || ''}
                      onChange={(e) => handleUpdateSectionData('path', e.target.value)}
                      disabled={isModeLocked}
                      style={{
                        width: '100%',
                        background: '#1c3250',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '5px',
                        padding: '0.45rem',
                        color: '#ffffff',
                        fontSize: '0.82rem',
                        fontFamily: 'monospace',
                        direction: 'ltr'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.3rem' }}>
                      وصف العملية:
                    </label>
                    <textarea
                      rows={3}
                      value={selectedSection.data.description || ''}
                      onChange={(e) => handleUpdateSectionData('description', e.target.value)}
                      disabled={isModeLocked}
                      style={{
                        width: '100%',
                        background: '#1c3250',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '5px',
                        padding: '0.45rem',
                        color: '#ffffff',
                        fontSize: '0.82rem',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </>
              )}

              {(selectedSection.type === 'callout' || selectedSection.type === 'custom-text') && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.3rem' }}>
                    المحتوى والنص:
                  </label>
                  <textarea
                    rows={5}
                    value={selectedSection.data.content || ''}
                    onChange={(e) => handleUpdateSectionData('content', e.target.value)}
                    disabled={isModeLocked}
                    style={{
                      width: '100%',
                      background: '#1c3250',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '5px',
                      padding: '0.45rem',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      resize: 'vertical'
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            /* Mode-level / Global settings when no section is selected */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                حدد قسماً من الشجرة أو الكانفاس لتعديله، أو عدل إعدادات الوضع العام أدناه:
              </div>

              {activeMode === 'print_a4' && (
                <div style={{ background: '#1c3250', padding: '0.85rem', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#38bdf8', marginBottom: '0.65rem' }}>
                    إعدادات صفحة A4 للطباعة:
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>هامش علوي (mm):</label>
                      <input
                        type="number"
                        value={doc.renderModes.print_a4.marginsMm.top}
                        onChange={(e) => handleMarginChange('top', Number(e.target.value))}
                        style={{ width: '100%', background: '#162238', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.3rem', borderRadius: '4px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>هامش سفلي (mm):</label>
                      <input
                        type="number"
                        value={doc.renderModes.print_a4.marginsMm.bottom}
                        onChange={(e) => handleMarginChange('bottom', Number(e.target.value))}
                        style={{ width: '100%', background: '#162238', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.3rem', borderRadius: '4px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>نص الترويسة المطبوعة:</label>
                    <input
                      type="text"
                      value={doc.renderModes.print_a4.headerText}
                      onChange={(e) =>
                        setDoc(prev => ({
                          ...prev,
                          renderModes: {
                            ...prev.renderModes,
                            print_a4: { ...prev.renderModes.print_a4, headerText: e.target.value }
                          }
                        }))
                      }
                      style={{ width: '100%', background: '#162238', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.3rem', borderRadius: '4px', marginBottom: '0.5rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                    <input
                      type="checkbox"
                      id="watermark-chk"
                      checked={doc.renderModes.print_a4.showOfficialWatermark}
                      onChange={(e) =>
                        setDoc(prev => ({
                          ...prev,
                          renderModes: {
                            ...prev.renderModes,
                            print_a4: { ...prev.renderModes.print_a4, showOfficialWatermark: e.target.checked }
                          }
                        }))
                      }
                    />
                    <label htmlFor="watermark-chk" style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                      إظهار علامة مائية رسمية
                    </label>
                  </div>
                </div>
              )}

              {/* Shared Design Tokens */}
              <div style={{ background: '#1c3250', padding: '0.85rem', borderRadius: '6px' }}>
                <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#10b981', marginBottom: '0.65rem' }}>
                  الهوية البصرية المشتركة:
                </div>
                <div style={{ marginBottom: '0.65rem' }}>
                  <label style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>اللون الأساسي:</label>
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                    <input
                      type="color"
                      value={doc.sharedTokens.primaryColor}
                      onChange={(e) =>
                        setDoc(prev => ({
                          ...prev,
                          sharedTokens: { ...prev.sharedTokens, primaryColor: e.target.value }
                        }))
                      }
                      style={{ background: 'transparent', border: 'none', width: '32px', height: '32px', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={doc.sharedTokens.primaryColor}
                      readOnly
                      style={{ flex: 1, background: '#162238', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.3rem', borderRadius: '4px', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
