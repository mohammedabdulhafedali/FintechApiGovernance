import React from 'react';
import { X, GitCompare, AlertOctagon, CheckCircle2, ShieldAlert } from 'lucide-react';

interface SemanticDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SemanticDiffModal: React.FC<SemanticDiffModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const diffItems = [
    {
      type: 'BREAKING',
      severity: 'CRITICAL BREAKING',
      field: 'purposeCode',
      action: 'إضافة حقل إلزامي جديد (required: true)',
      path: '/v1/transfers',
      bump: 'MAJOR BUMP (v1.0.0 → v2.0.0)',
      desc: 'إلزام جميع البنوك بإرسال غرض التحويل وفق تصنيف ISO 20022 يؤدي إلى رفض كافة الطلبات القديمة التي لا تحتوي الحقل.'
    },
    {
      type: 'NON_BREAKING',
      severity: 'NON-BREAKING',
      field: 'narrative',
      action: 'إضافة حقل اختياري جديد (required: false)',
      path: '/v1/transfers/{id}/recall',
      bump: 'MINOR BUMP (v2.0.0 → v2.1.0)',
      desc: 'إتاحة إضافة ملاحظات إضافية عند طلب الاسترجاع دون التأثير على البنوك التي لا تدعم الحقل بعد.'
    },
    {
      type: 'PATCH',
      severity: 'DOCS / PATCH',
      field: 'clearingCode description',
      action: 'توضيح قواعد المطابقة والتسوية',
      path: '/v1/transfers',
      bump: 'PATCH BUMP (v2.1.0 → v2.1.1)',
      desc: 'تحديث النصوص التفسيرية لرمز المقاصة الوطنية لتعزيز دقة التوثيق دون أي تعديل في صيغة البيانات.'
    }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px' }}>
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
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>
              كاشف الفروقات الدلالي وقواعد كسر التوافق (Semantic Diff Engine)
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem'
          }}>
            <ShieldAlert size={24} color="var(--rose)" />
            <div>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fca5a5' }}>
                تم رصد تغييرات حتمية تكسر التوافق (Breaking Changes Detected)
              </h4>
              <p style={{ fontSize: '0.78rem', color: '#fecaca', marginTop: '0.2rem' }}>
                المقارنة بين النسخة المعتمدة v2026.2 والمسودة المقترحة v2027.0 تفرض ترقية رئيسية (Major Version Bump) لحماية تكاملات البنوك.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {diffItems.map((item, idx) => (
              <div key={idx} className="glass-card" style={{ padding: '1.15rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {item.type === 'BREAKING' ? (
                      <AlertOctagon size={16} color="var(--rose)" />
                    ) : (
                      <CheckCircle2 size={16} color="var(--emerald)" />
                    )}
                    <span className="mono" style={{ fontWeight: 800, color: 'var(--text)', fontSize: '0.88rem' }}>
                      {item.path} ➔ {item.field}
                    </span>
                  </div>
                  <span className={`badge-pill ${item.type === 'BREAKING' ? 'badge-rose' : item.type === 'NON_BREAKING' ? 'badge-blue' : 'badge-emerald'}`}>
                    {item.severity}
                  </span>
                </div>

                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
                  {item.desc}
                </p>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-input)',
                  padding: '0.4rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem'
                }}>
                  <span style={{ color: 'var(--text-dim)' }}>الإجراء التحليلي: {item.action}</span>
                  <span className="mono" style={{ color: 'var(--amber)', fontWeight: 700 }}>{item.bump}</span>
                </div>
              </div>
            ))}
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
          <button className="btn btn-primary" onClick={onClose} style={{ fontSize: '0.82rem' }}>
            إغلاق نافذة المقارنة
          </button>
        </div>
      </div>
    </div>
  );
};
