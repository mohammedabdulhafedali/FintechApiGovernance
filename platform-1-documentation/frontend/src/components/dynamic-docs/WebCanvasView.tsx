import React, { useState } from 'react';
import { DynamicDocument, DocumentSection } from '../../types/dynamicDocs';
import { ChevronDown, ChevronRight, Copy, Check, Terminal, ExternalLink, ShieldCheck } from 'lucide-react';

interface WebCanvasViewProps {
  document: DynamicDocument;
  onSelectSection?: (sectionId: string) => void;
  selectedSectionId?: string;
  isReadOnly?: boolean;
}

export const WebCanvasView: React.FC<WebCanvasViewProps> = ({
  document,
  onSelectSection,
  selectedSectionId,
  isReadOnly = false
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleCollapse = (id: string) => {
    setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const tokens = document.sharedTokens;

  return (
    <div
      className="dynamic-web-canvas"
      style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '1.5rem',
        fontFamily: tokens.fontFamily,
        color: '#f8fafc',
        lineHeight: 1.6
      }}
    >
      {/* 1. Header Banner */}
      <div
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          paddingBottom: '1.25rem',
          marginBottom: '2rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span
            style={{
              background: 'rgba(2, 132, 199, 0.15)',
              color: '#38bdf8',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 800,
              border: '1px solid rgba(56, 189, 248, 0.25)'
            }}
          >
            v{document.version}
          </span>
          <span
            style={{
              background: document.status === 'PUBLISHED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: document.status === 'PUBLISHED' ? '#10b981' : '#f59e0b',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 800,
              border: `1px solid ${document.status === 'PUBLISHED' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
            }}
          >
            {document.status === 'PUBLISHED' ? 'منشور ومعتمد' : 'مسودة قيد التطوير'}
          </span>
          <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
            المالك: {document.author.name}
          </span>
        </div>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
          {document.title}
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.92rem', margin: 0 }}>
          عرض وثائقي تفاعلي عالي الأداء مع تكامل البيانات المشتركة عبر أوضاع العرض المتعددة.
        </p>
      </div>

      {/* 2. Sections Rendering */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {document.sections.map((sec, idx) => {
          const isSelected = selectedSectionId === sec.id;
          const isCollapsed = collapsedSections[sec.id];

          return (
            <div
              key={sec.id}
              onClick={() => onSelectSection && onSelectSection(sec.id)}
              style={{
                background: '#243d5c',
                borderRadius: `${tokens.borderRadius}px`,
                border: isSelected ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.10)',
                padding: '1.25rem',
                cursor: isReadOnly ? 'default' : 'pointer',
                transition: 'all 0.18s ease',
                position: 'relative',
                boxShadow: isSelected ? '0 0 0 4px rgba(56, 189, 248, 0.15)' : '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              {/* Section Header Controls */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: isCollapsed ? 0 : '1rem',
                  borderBottom: isCollapsed ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                  paddingBottom: isCollapsed ? 0 : '0.65rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCollapse(sec.id);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#e2e8f0' }}>
                    {idx + 1}. {sec.title || 'قسم بدون عنوان'}
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      background: 'rgba(255, 255, 255, 0.06)',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                      color: '#94a3b8'
                    }}
                  >
                    {sec.type}
                  </span>
                </div>
                {!isReadOnly && isSelected && (
                  <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 800 }}>
                    محدد للتعديل في لوحة الخصائص ←
                  </span>
                )}
              </div>

              {/* Section Content based on type */}
              {!isCollapsed && (
                <div style={{ fontSize: `${tokens.baseFontSize}px` }}>
                  {sec.type === 'header' && (
                    <div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.35rem' }}>
                        {sec.data.title || document.title}
                      </h2>
                      {sec.data.subtitle && (
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#38bdf8', marginBottom: '0.5rem' }}>
                          {sec.data.subtitle}
                        </h4>
                      )}
                      {sec.data.description && (
                        <p style={{ color: '#cbd5e1', margin: 0, lineHeight: 1.6 }}>
                          {sec.data.description}
                        </p>
                      )}
                    </div>
                  )}

                  {sec.type === 'callout' && (
                    <div
                      style={{
                        padding: '1rem',
                        borderRadius: '6px',
                        background: sec.data.calloutType === 'warning' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(56, 189, 248, 0.12)',
                        borderRight: `4px solid ${sec.data.calloutType === 'warning' ? '#f59e0b' : '#38bdf8'}`,
                        color: '#f8fafc',
                        lineHeight: 1.6
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <ShieldCheck size={16} color={sec.data.calloutType === 'warning' ? '#f59e0b' : '#38bdf8'} />
                        <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                          {sec.data.calloutType === 'warning' ? 'تنبيه أمني ومعياري' : 'ملاحظة إرشادية'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.88rem', color: '#e2e8f0' }}>
                        {sec.data.content || 'لا يوجد نص'}
                      </div>
                    </div>
                  )}

                  {sec.type === 'endpoint' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {/* Method + Path Badge */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          background: '#1c3250',
                          padding: '0.65rem 1rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.08)'
                        }}
                      >
                        <span
                          style={{
                            background:
                              sec.data.method === 'GET'
                                ? '#0284c7'
                                : sec.data.method === 'POST'
                                ? '#10b981'
                                : sec.data.method === 'DELETE'
                                ? '#f43f5e'
                                : '#f59e0b',
                            color: '#ffffff',
                            fontWeight: 900,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.78rem'
                          }}
                        >
                          {sec.data.method || 'GET'}
                        </span>
                        <span
                          style={{
                            fontFamily: 'Consolas, monospace',
                            fontSize: '0.92rem',
                            fontWeight: 700,
                            color: '#f8fafc',
                            direction: 'ltr',
                            flex: 1
                          }}
                        >
                          {sec.data.path || '/api/v1/endpoint'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(sec.data.path || '', `path-${sec.id}`);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.75rem'
                          }}
                        >
                          {copiedId === `path-${sec.id}` ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                          <span>{copiedId === `path-${sec.id}` ? 'تم النسخ' : 'نسخ المسار'}</span>
                        </button>
                      </div>

                      {sec.data.description && (
                        <p style={{ color: '#cbd5e1', margin: 0, fontSize: '0.9rem' }}>
                          {sec.data.description}
                        </p>
                      )}

                      {/* Headers / Parameters */}
                      {sec.data.headers && sec.data.headers.length > 0 && (
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
                            ترويسات الطلب (Headers):
                          </div>
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>
                                  <th style={{ padding: '0.4rem' }}>اسم الترويسة</th>
                                  <th style={{ padding: '0.4rem' }}>النوع</th>
                                  <th style={{ padding: '0.4rem' }}>إلزامي</th>
                                  <th style={{ padding: '0.4rem' }}>الوصف</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sec.data.headers.map((h, i) => (
                                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '0.4rem', fontFamily: 'monospace', color: '#38bdf8' }}>{h.name}</td>
                                    <td style={{ padding: '0.4rem', color: '#94a3b8' }}>{h.type}</td>
                                    <td style={{ padding: '0.4rem' }}>{h.required ? 'نعم' : 'اختياري'}</td>
                                    <td style={{ padding: '0.4rem', color: '#cbd5e1' }}>{h.description}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Request & Response Preview */}
                      {(sec.data.requestBody || sec.data.responseBody) && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                          {sec.data.requestBody && (
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                                مثال الطلب (Request Payload):
                              </div>
                              <pre
                                style={{
                                  background: '#162238',
                                  padding: '0.75rem',
                                  borderRadius: '6px',
                                  fontSize: '0.78rem',
                                  color: '#38bdf8',
                                  direction: 'ltr',
                                  textAlign: 'left',
                                  overflowX: 'auto',
                                  border: '1px solid rgba(255,255,255,0.06)',
                                  margin: 0
                                }}
                              >
                                {sec.data.requestBody}
                              </pre>
                            </div>
                          )}
                          {sec.data.responseBody && (
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                                مثال الاستجابة (Response Payload 200 OK):
                              </div>
                              <pre
                                style={{
                                  background: '#162238',
                                  padding: '0.75rem',
                                  borderRadius: '6px',
                                  fontSize: '0.78rem',
                                  color: '#10b981',
                                  direction: 'ltr',
                                  textAlign: 'left',
                                  overflowX: 'auto',
                                  border: '1px solid rgba(255,255,255,0.06)',
                                  margin: 0
                                }}
                              >
                                {sec.data.responseBody}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {sec.type === 'fields-table' && sec.data.parameters && (
                    <div style={{ overflowX: 'auto' }}>
                      {sec.data.description && (
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.65rem' }}>
                          {sec.data.description}
                        </p>
                      )}
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', textAlign: 'right', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: '0.5rem', color: '#94a3b8' }}>اسم الحقل (Field)</th>
                            <th style={{ padding: '0.5rem', color: '#94a3b8' }}>النوع المصرفي</th>
                            <th style={{ padding: '0.5rem', color: '#94a3b8' }}>الإلزامية</th>
                            <th style={{ padding: '0.5rem', color: '#94a3b8' }}>الوصف والضوابط</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sec.data.parameters.map((p, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '0.5rem', fontFamily: 'monospace', color: '#38bdf8', fontWeight: 700 }}>{p.name}</td>
                              <td style={{ padding: '0.5rem', color: '#f59e0b' }}>{p.type}</td>
                              <td style={{ padding: '0.5rem' }}>
                                <span style={{ color: p.required ? '#f43f5e' : '#94a3b8', fontWeight: 800 }}>
                                  {p.required ? 'إلزامي' : 'اختياري'}
                                </span>
                              </td>
                              <td style={{ padding: '0.5rem', color: '#cbd5e1' }}>{p.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {sec.type === 'custom-text' && (
                    <div style={{ whiteSpace: 'pre-line', color: '#cbd5e1', lineHeight: 1.7 }}>
                      {sec.data.content || 'لا يوجد محتوى نصي مخصص'}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
