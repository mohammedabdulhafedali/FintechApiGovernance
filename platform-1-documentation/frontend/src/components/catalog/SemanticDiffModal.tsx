import React from 'react';
import { X, GitCompare, AlertOctagon, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../../i18n';

interface SemanticDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SemanticDiffModal: React.FC<SemanticDiffModalProps> = ({ isOpen, onClose }) => {
  const { t, language, isRtl } = useLanguage();
  const isEn = language === 'en';

  if (!isOpen) return null;

  const diffItems = [
    {
      type: 'BREAKING',
      severity: 'CRITICAL BREAKING',
      field: 'purposeCode',
      action: isEn ? 'Added new mandatory field (required: true)' : 'إضافة حقل إلزامي جديد (required: true)',
      path: '/v1/transfers',
      bump: 'MAJOR BUMP (v1.0.0 → v2.0.0)',
      desc: isEn 
        ? 'Mandating purposeCode according to ISO 20022 breaks legacy requests omitting this field.'
        : 'إلزام جميع البنوك بإرسال غرض التحويل وفق تصنيف ISO 20022 يؤدي إلى رفض كافة الطلبات القديمة التي لا تحتوي الحقل.'
    },
    {
      type: 'NON_BREAKING',
      severity: 'NON-BREAKING',
      field: 'narrative',
      action: isEn ? 'Added new optional field (required: false)' : 'إضافة حقل اختياري جديد (required: false)',
      path: '/v1/transfers/{id}/recall',
      bump: 'MINOR BUMP (v2.0.0 → v2.1.0)',
      desc: isEn 
        ? 'Allows optional narrative notes on recall requests without breaking participant banks.'
        : 'إتاحة إضافة ملاحظات إضافية عند طلب الاسترجاع دون التأثير على البنوك التي لا تدعم الحقل بعد.'
    },
    {
      type: 'PATCH',
      severity: 'DOCS / PATCH',
      field: 'clearingCode description',
      action: isEn ? 'Clarified clearing and netting matching rules' : 'توضيح قواعد المطابقة والتسوية',
      path: '/v1/transfers',
      bump: 'PATCH BUMP (v2.1.0 → v2.1.1)',
      desc: isEn 
        ? 'Updated regulatory descriptions for national clearing codes improving spec clarity.'
        : 'تحديث النصوص التفسيرية لرمز المقاصة الوطنية لتعزيز دقة التوثيق دون أي تعديل في صيغة البيانات.'
    }
  ];

  const alignStyle = { textAlign: isRtl ? 'right' : 'left' } as const;
  const borderKey = isRtl ? 'borderRight' : 'borderLeft';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px', ...alignStyle }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(13, 25, 48, 0.7)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <GitCompare size={20} color="var(--blue)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              {t('diff.pageTitle')}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                {isEn ? 'Current Architecture Baseline Comparison:' : 'المقارنة المعمارية الحالية:'}
              </span>
              <span className="mono badge-pill badge-emerald">v2026.2 (Current Baseline)</span>
              <span style={{ color: 'var(--text-dim)' }}>{isRtl ? '←' : '→'}</span>
              <span className="mono badge-pill badge-amber">v2027.0-draft (Proposed Release)</span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span className="badge-pill badge-rose">1 Breaking Change</span>
              <span className="badge-pill badge-emerald">1 Non-Breaking</span>
              <span className="badge-pill badge-blue">1 Patch</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {diffItems.map((item, idx) => {
              const isBreaking = item.type === 'BREAKING';
              const isPatch = item.type === 'PATCH';
              const accentColor = isBreaking ? 'var(--rose)' : isPatch ? 'var(--blue)' : 'var(--emerald)';

              return (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    [borderKey]: `4px solid ${accentColor}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {isBreaking ? (
                        <AlertOctagon size={18} color="var(--rose)" />
                      ) : isPatch ? (
                        <ShieldAlert size={18} color="var(--blue)" />
                      ) : (
                        <CheckCircle2 size={18} color="var(--emerald)" />
                      )}
                      <strong style={{ fontSize: '0.9rem', color: isBreaking ? 'var(--rose)' : 'var(--text)' }}>
                        {item.severity}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="mono" style={{ fontSize: '0.8rem', color: '#38bdf8' }}>{item.path}</span>
                      <span className="badge-pill badge-purple" style={{ fontSize: '0.7rem' }}>{item.bump}</span>
                    </div>
                  </div>

                  <div style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.75rem',
                    fontSize: '0.78rem'
                  }}>
                    <div style={{ color: 'var(--text-dim)', marginBottom: '0.2rem' }}>
                      {t('diff.fieldLabel')} <code className="mono" style={{ color: 'var(--emerald)' }}>{item.field}</code>
                    </div>
                    <div style={{ color: 'var(--text)', fontWeight: 700, marginBottom: '0.2rem' }}>
                      {item.action}
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      {item.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.75rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'rgba(11, 20, 38, 0.7)'
        }}>
          <button className="btn btn-glass" onClick={onClose} style={{ fontSize: '0.85rem' }}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
