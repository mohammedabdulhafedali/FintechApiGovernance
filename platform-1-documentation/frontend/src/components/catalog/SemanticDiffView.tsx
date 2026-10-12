import React from 'react';
import { GitCompare, AlertOctagon, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../../i18n';

export const SemanticDiffView: React.FC = () => {
  const { t, language, isRtl } = useLanguage();
  const isEn = language === 'en';

  const diffItems = [
    {
      type: 'BREAKING',
      severity: 'CRITICAL BREAKING',
      field: 'purposeCode',
      action: isEn ? 'Added new mandatory field (required: true)' : 'إضافة حقل إلزامي جديد (required: true)',
      path: '/v1/transfers',
      bump: 'MAJOR BUMP (v1.0.0 → v2.0.0)',
      desc: isEn 
        ? 'Mandating all participant banks to send purposeCode according to ISO 20022 breaks legacy requests omitting this field.'
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
        ? 'Permits optional narrative notes on recall requests without breaking banks that do not yet support the parameter.'
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
        ? 'Updated regulatory descriptions for national clearing codes improving spec clarity without schema payload changes.'
        : 'تحديث النصوص التفسيرية لرمز المقاصة الوطنية لتعزيز دقة التوثيق دون أي تعديل في صيغة البيانات.'
    }
  ];

  const borderKey = isRtl ? 'borderRight' : 'borderLeft';

  return (
    <div className="dedicated-view-layout">
      {/* Header */}
      <div className="dedicated-view-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            background: 'rgba(56, 189, 248, 0.15)',
            color: 'var(--blue)',
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <GitCompare size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              {t('diff.pageTitle')}
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              {t('diff.pageSubtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Baseline Diff Summary Banner */}
      <div className="dedicated-view-body">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.84rem', color: 'var(--text-dim)' }}>
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
      </div>

      {/* Diff Items Stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {diffItems.map((item, idx) => {
          const isBreaking = item.type === 'BREAKING';
          const isPatch = item.type === 'PATCH';
          const accentColor = isBreaking ? 'var(--rose)' : isPatch ? 'var(--blue)' : 'var(--emerald)';

          return (
            <div
              key={idx}
              className="dedicated-view-body"
              style={{
                [borderKey]: `4px solid ${accentColor}`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  {isBreaking ? (
                    <AlertOctagon size={20} color="var(--rose)" />
                  ) : isPatch ? (
                    <ShieldAlert size={20} color="var(--blue)" />
                  ) : (
                    <CheckCircle2 size={20} color="var(--emerald)" />
                  )}
                  <strong style={{ fontSize: '1rem', color: isBreaking ? 'var(--rose)' : 'var(--text)' }}>
                    {item.severity}
                  </strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="mono" style={{ fontSize: '0.8rem', color: '#38bdf8' }}>{item.path}</span>
                  <span className="badge-pill badge-purple" style={{ fontSize: '0.72rem' }}>{item.bump}</span>
                </div>
              </div>

              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.85rem 1.15rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)', fontWeight: 700 }}>
                    {t('diff.fieldLabel')}
                  </span>
                  <code className="mono" style={{ color: 'var(--emerald)', fontSize: '0.82rem', fontWeight: 700 }}>{item.field}</code>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text)', fontWeight: 700, marginBottom: '0.25rem' }}>
                  {item.action}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {item.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
