import React from 'react';
import { DynamicDocument } from '../../types/dynamicDocs';
import { Shield, FileText, CheckCircle } from 'lucide-react';

interface PrintA4CanvasViewProps {
  document: DynamicDocument;
  onSelectSection?: (sectionId: string) => void;
  selectedSectionId?: string;
}

export const PrintA4CanvasView: React.FC<PrintA4CanvasViewProps> = ({
  document,
  onSelectSection,
  selectedSectionId
}) => {
  const printConfig = document.renderModes.print_a4;
  const tokens = document.sharedTokens;
  const margins = printConfig.marginsMm;

  return (
    <div
      className="a4-print-viewport-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '2rem 1rem',
        background: '#0d1522',
        minHeight: '100%',
        gap: '2.5rem'
      }}
    >
      {/* Simulation Info Banner */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '8px',
          padding: '0.65rem 1.25rem',
          color: '#94a3b8',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          maxWidth: '820px',
          width: '100%'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8', fontWeight: 800 }}>
          <FileText size={15} />
          <span>معاينة حتمية للطباعة (A4 Canvas 210 × 297mm)</span>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          الهوامش: {margins.top}mm علوي | {margins.bottom}mm سفلي | {margins.right}mm أيمن | {margins.left}mm أيسر
        </div>
        <div style={{ color: '#10b981', fontWeight: 700 }}>
          {printConfig.pageSize} {printConfig.orientation === 'portrait' ? 'عمودي' : 'أفقي'}
        </div>
      </div>

      {/* Realistic A4 Physical Sheet Simulation */}
      <div
        id="a4-printable-sheet"
        className="a4-physical-sheet"
        style={{
          width: '794px', // 210mm at 96 DPI
          minHeight: '1123px', // 297mm at 96 DPI
          background: '#ffffff',
          color: '#0f172a',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 0, 0, 0.2)',
          borderRadius: '2px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          padding: `${margins.top * 3.78}px ${margins.left * 3.78}px ${margins.bottom * 3.78}px ${margins.right * 3.78}px`,
          fontFamily: tokens.fontFamily,
          overflow: 'hidden'
        }}
      >
        {/* Subtle Watermark (Optional) */}
        {printConfig.showOfficialWatermark && (
          <div
            style={{
              position: 'absolute',
              top: '40%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-35deg)',
              fontSize: '4.5rem',
              fontWeight: 900,
              color: 'rgba(15, 23, 42, 0.035)',
              userSelect: 'none',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              letterSpacing: '0.5rem',
              zIndex: 0
            }}
          >
            وثيقة مصرفية معتمدة
          </div>
        )}

        {/* 1. Official Running Header */}
        <div
          style={{
            borderBottom: '2px solid #0f172a',
            paddingBottom: '0.75rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            zIndex: 1
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: '#0f172a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Shield size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#0f172a' }}>
                {printConfig.headerText || 'المواصفة المصرفية المعتمدة'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                المرجع: {document.slug} | الإصدار: v{document.version}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <span
              style={{
                border: '1px solid #0f172a',
                padding: '0.15rem 0.5rem',
                fontSize: '0.68rem',
                fontWeight: 800,
                color: '#0f172a',
                textTransform: 'uppercase'
              }}
            >
              {document.status === 'PUBLISHED' ? 'رسمي معتمد' : 'مسودة غير نهائية'}
            </span>
          </div>
        </div>

        {/* 2. Document Title Box */}
        <div
          style={{
            marginBottom: '1.75rem',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRight: '4px solid #0f172a',
            padding: '1rem',
            position: 'relative',
            zIndex: 1
          }}
        >
          <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.4rem 0' }}>
            {document.title}
          </h1>
          <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', gap: '1.5rem' }}>
            <span>تاريخ الإصدار: {new Date(document.updatedAt).toLocaleDateString('ar-SA')}</span>
            <span>الجهة المعدة: {document.author.name}</span>
            <span>حالة الوثيقة: {document.status}</span>
          </div>
        </div>

        {/* 3. Sections Body for Physical Print Layout */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.75rem', position: 'relative', zIndex: 1 }}>
          {document.sections.map((sec, idx) => {
            const isSelected = selectedSectionId === sec.id;

            return (
              <div
                key={sec.id}
                onClick={() => onSelectSection && onSelectSection(sec.id)}
                style={{
                  border: isSelected ? '2px dashed #0284c7' : '1px solid transparent',
                  padding: isSelected ? '0.5rem' : '0',
                  borderRadius: '4px',
                  background: isSelected ? 'rgba(2, 132, 199, 0.04)' : 'transparent',
                  cursor: 'pointer',
                  pageBreakInside: 'avoid'
                }}
              >
                {/* Section Title */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    borderBottom: '1px solid #cbd5e1',
                    paddingBottom: '0.35rem',
                    marginBottom: '0.65rem'
                  }}
                >
                  <span
                    style={{
                      background: '#0f172a',
                      color: '#ffffff',
                      borderRadius: '3px',
                      padding: '0.1rem 0.4rem',
                      fontSize: '0.72rem',
                      fontWeight: 800
                    }}
                  >
                    {idx + 1}
                  </span>
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {sec.title || 'قسم'}
                  </h3>
                </div>

                {/* Section Specific Rendering */}
                {sec.type === 'header' && (
                  <div>
                    {sec.data.subtitle && (
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                        {sec.data.subtitle}
                      </h4>
                    )}
                    {sec.data.description && (
                      <p style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                        {sec.data.description}
                      </p>
                    )}
                  </div>
                )}

                {sec.type === 'callout' && (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRight: '4px solid #0f172a',
                      padding: '0.75rem',
                      fontSize: '0.82rem',
                      color: '#1e293b',
                      lineHeight: 1.5
                    }}
                  >
                    <strong>إشعار رقابي: </strong>
                    {sec.data.content}
                  </div>
                )}

                {sec.type === 'endpoint' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        background: '#f1f5f9',
                        padding: '0.45rem 0.75rem',
                        border: '1px solid #cbd5e1'
                      }}
                    >
                      <span
                        style={{
                          background: '#0f172a',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.72rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '2px'
                        }}
                      >
                        {sec.data.method}
                      </span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.84rem', direction: 'ltr' }}>
                        {sec.data.path}
                      </span>
                    </div>

                    {sec.data.description && (
                      <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                        {sec.data.description}
                      </div>
                    )}

                    {sec.data.headers && sec.data.headers.length > 0 && (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', marginTop: '0.25rem' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #94a3b8', textAlign: 'right' }}>
                            <th style={{ padding: '0.35rem' }}>الترويسة (Header)</th>
                            <th style={{ padding: '0.35rem' }}>النوع</th>
                            <th style={{ padding: '0.35rem' }}>الإلزامية</th>
                            <th style={{ padding: '0.35rem' }}>الوصف</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sec.data.headers.map((h, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '0.35rem', fontFamily: 'monospace', fontWeight: 700 }}>{h.name}</td>
                              <td style={{ padding: '0.35rem', color: '#475569' }}>{h.type}</td>
                              <td style={{ padding: '0.35rem' }}>{h.required ? 'إلزامي' : 'اختياري'}</td>
                              <td style={{ padding: '0.35rem', color: '#334155' }}>{h.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {/* Small print sample */}
                    {sec.data.requestBody && (
                      <div style={{ marginTop: '0.4rem' }}>
                        <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569', marginBottom: '0.2rem' }}>
                          هيكل الـ Payload النموذجي:
                        </div>
                        <pre
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            padding: '0.5rem',
                            fontSize: '0.72rem',
                            margin: 0,
                            direction: 'ltr',
                            textAlign: 'left'
                          }}
                        >
                          {sec.data.requestBody}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {sec.type === 'fields-table' && sec.data.parameters && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', marginTop: '0.35rem' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1.5px solid #0f172a', textAlign: 'right' }}>
                        <th style={{ padding: '0.4rem' }}>اسم الحقل</th>
                        <th style={{ padding: '0.4rem' }}>نوع البيانات</th>
                        <th style={{ padding: '0.4rem' }}>الإلزامية</th>
                        <th style={{ padding: '0.4rem' }}>القواعد والوصف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sec.data.parameters.map((p, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.4rem', fontFamily: 'monospace', fontWeight: 700 }}>{p.name}</td>
                          <td style={{ padding: '0.4rem', color: '#334155' }}>{p.type}</td>
                          <td style={{ padding: '0.4rem', fontWeight: 700 }}>{p.required ? 'إلزامي' : 'اختياري'}</td>
                          <td style={{ padding: '0.4rem', color: '#475569' }}>{p.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {sec.type === 'custom-text' && (
                  <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                    {sec.data.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 4. Official Running Footer */}
        <div
          style={{
            marginTop: '2rem',
            borderTop: '1px solid #94a3b8',
            paddingTop: '0.65rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.72rem',
            color: '#64748b',
            position: 'relative',
            zIndex: 1
          }}
        >
          <div>
            {printConfig.footerText || 'سري للغاية - للاستخدام الداخلي والمصارف المعتمدة فقط'}
          </div>
          <div style={{ fontWeight: 800, color: '#0f172a' }}>
            {printConfig.showPageNumbers ? 'صفحة 1 من 1' : ''}
          </div>
        </div>
      </div>
    </div>
  );
};
