import React, { useState } from 'react';
import { Plus, Trash2, Shield, AlertTriangle, FileCode, Server, Check, Copy, Lock } from 'lucide-react';
import { useLanguage } from '../../i18n';
import { InlineEditable } from './InlineEditable';
import { UastDocument } from '../../services/uast/types';
import { ChangeScopeType } from '../../types/docGovernance';

export type DynamicDocTabType = 'intro' | 'headers' | 'endpoints' | 'errors' | 'notes';

export interface DynamicApiDocumentationViewProps {
  activeDoc: UastDocument;
  selectedEndpointIndex: number;
  allowedScope?: ChangeScopeType;
  onSelectEndpoint: (index: number) => void;
  // Mutator actions from DynamicWorkbench
  onUpdateServiceName: (name: string) => void;
  onUpdateServiceCode: (code: string) => void;
  onUpdateOverview: (overview: string) => void;
  onUpdateBaseUrl: (baseUrl: string) => void;
  onUpdateEndpointMethod: (epIdx: number, method: string) => void;
  onUpdateEndpointPath: (epIdx: number, path: string) => void;
  onUpdateEndpointSummary: (epIdx: number, summary: string) => void;
  onUpdateField: (epIdx: number, fIdx: number, patch: Partial<{ name: string; type: any; required: boolean; description: string; example: string }>) => void;
  onAddField: (epIdx: number) => void;
  onDeleteField: (epIdx: number, fIdx: number) => void;
  onUpdateResponseField: (epIdx: number, rfIdx: number, patch: Partial<{ name: string; type: any; description: string }>) => void;
  onAddResponseField: (epIdx: number) => void;
  onDeleteResponseField: (epIdx: number, rfIdx: number) => void;
  onAddEndpoint: () => void;
  onDeleteEndpoint: (epIdx: number) => void;
  onUpdateHeader: (hIdx: number, patch: Partial<{ name: string; description: string; example: string }>) => void;
  onAddHeader: () => void;
  onDeleteHeader: (hIdx: number) => void;
  onUpdateErrorCode: (eIdx: number, patch: Partial<{ code: string; message: string; httpStatus: number }>) => void;
  onAddErrorCode: () => void;
  onDeleteErrorCode: (eIdx: number) => void;
  extraControls?: React.ReactNode;
}

export const DynamicApiDocumentationView: React.FC<DynamicApiDocumentationViewProps> = ({
  activeDoc,
  selectedEndpointIndex,
  allowedScope = 'FULL',
  onSelectEndpoint,
  onUpdateServiceName,
  onUpdateServiceCode,
  onUpdateOverview,
  onUpdateBaseUrl,
  onUpdateEndpointMethod,
  onUpdateEndpointPath,
  onUpdateEndpointSummary,
  onUpdateField,
  onAddField,
  onDeleteField,
  onUpdateResponseField,
  onAddResponseField,
  onDeleteResponseField,
  onAddEndpoint,
  onDeleteEndpoint,
  onUpdateHeader,
  onAddHeader,
  onDeleteHeader,
  onUpdateErrorCode,
  onAddErrorCode,
  onDeleteErrorCode,
  extraControls
}) => {
  const { isRtl } = useLanguage();
  const [activeTab, setActiveTab] = useState<DynamicDocTabType>('endpoints');
  const [copiedPath, setCopiedPath] = useState(false);

  const endpoints = activeDoc.allEndpoints || [];
  const activeEndpoint = endpoints[selectedEndpointIndex] || endpoints[0];

  // Scoped authorization logic
  const isIntroAllowed = !allowedScope || allowedScope === 'FULL' || allowedScope === 'OVERVIEW';
  const isHeadersAllowed = !allowedScope || allowedScope === 'FULL' || allowedScope === 'SECURITY_AUTH';
  const isEndpointsAllowed = !allowedScope || allowedScope === 'FULL' || allowedScope === 'ENDPOINTS';
  const isFieldsAllowed = !allowedScope || allowedScope === 'FULL' || allowedScope === 'FIELDS_TABLE' || allowedScope === 'ENDPOINTS';
  const isErrorsAllowed = !allowedScope || allowedScope === 'FULL';

  const getScopeLabel = (scope?: ChangeScopeType) => {
    switch (scope) {
      case 'ENDPOINTS': return isRtl ? 'نقاط النهاية فقط (Endpoints)' : 'Endpoints Only';
      case 'FIELDS_TABLE': return isRtl ? 'جدول الحقول والمعاملات فقط' : 'Fields & Parameters Only';
      case 'SECURITY_AUTH': return isRtl ? 'ترويسات الأمان والمصادقة فقط' : 'Security & Headers Only';
      case 'OVERVIEW': return isRtl ? 'المقدمة والترويسة فقط' : 'Overview & Description Only';
      default: return isRtl ? 'تعديل شامل (كامل الوثيقة)' : 'Full Document';
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const tabs = [
    { id: 'intro' as DynamicDocTabType, labelAr: 'المقدمة', labelEn: 'Introduction', isLocked: !isIntroAllowed },
    { id: 'headers' as DynamicDocTabType, labelAr: 'الترويسة', labelEn: 'Headers', badge: (activeDoc.importedHeaders || []).length || undefined, isLocked: !isHeadersAllowed },
    { id: 'endpoints' as DynamicDocTabType, labelAr: 'الطلب والاستجابة', labelEn: 'Request & Response', badge: endpoints.length || undefined, isLocked: !isEndpointsAllowed && !isFieldsAllowed },
    { id: 'errors' as DynamicDocTabType, labelAr: 'الأخطاء', labelEn: 'Errors', badge: (activeDoc.errorCodes || []).length || undefined, isLocked: !isErrorsAllowed },
    { id: 'notes' as DynamicDocTabType, labelAr: 'ملاحظات', labelEn: 'Notes', isLocked: !isIntroAllowed }
  ];


  return (
    <div className="api-documentation-master-view dynamic-portal-workspace" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      background: 'var(--bg-main, #1a2d45)',
      color: 'var(--text, #ffffff)'
    }}>
      {/* ── Official Enterprise Header & Tab Navigation Bar ── */}
      <div style={{
        background: 'var(--bg-card, #2b4870)',
        borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
        padding: '0 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        userSelect: 'none',
        minHeight: '44px'
      }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', overflowX: 'auto' }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.75rem 1.15rem',
                  border: 'none',
                  background: 'none',
                  borderBottom: isActive ? '2px solid var(--primary, #6366f1)' : '2px solid transparent',
                  color: isActive ? 'var(--primary, #818cf8)' : 'var(--text-dim, #94a3b8)',
                  fontWeight: isActive ? 700 : 600,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>{isRtl ? tab.labelAr : tab.labelEn}</span>
                {tab.isLocked && (
                  <span title={isRtl ? 'هذا القسم محمي للقراءة فقط' : 'Read-only section'} style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <Lock size={11} style={{ color: '#f59e0b' }} />
                  </span>
                )}
                {tab.badge !== undefined && (
                  <span style={{
                    fontSize: '0.68rem',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '10px',
                    background: isActive ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                    color: isActive ? '#c7d2fe' : '#94a3b8',
                    fontWeight: 700
                  }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Header Status / Extras */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            fontSize: '0.72rem',
            padding: '0.2rem 0.55rem',
            borderRadius: '4px',
            background: 'rgba(14, 165, 233, 0.15)',
            color: '#38bdf8',
            border: '1px solid rgba(14, 165, 233, 0.3)',
            fontWeight: 700
          }}>
            مساحة عمل تفاعلية مباشرة
          </span>
          {extraControls}
        </div>
      </div>

      {/* ── Active Tab Content Area ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
        {/* Supervisor Scope Banner */}
        {allowedScope && allowedScope !== 'FULL' && (
          <div style={{
            maxWidth: '1000px',
            margin: '0 auto 1.25rem',
            padding: '0.6rem 1rem',
            borderRadius: '6px',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            color: '#fbbf24',
            fontSize: '0.78rem'
          }}>
            <Lock size={15} style={{ flexShrink: 0 }} />
            <div>
              <strong>{isRtl ? 'نظام الحوكمة الرقابي: ' : 'Governance Guard: '}</strong>
              {isRtl
                ? `هذه المسودة مصرح بتعديل [${getScopeLabel(allowedScope)}] فقط بأمر المشرف. الأقسام الأخرى معروضة للقراءة فقط ومحمية من التغيير.`
                : `Supervisor scoped changes to [${getScopeLabel(allowedScope)}]. Other sections are read-only.`}
            </div>
          </div>
        )}

        {/* TAB 1: INTRODUCTION (المقدمة) */}
        {activeTab === 'intro' && (
          <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{
              background: 'var(--bg-card, #2b4870)',
              borderRadius: '8px',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
              padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                  <InlineEditable
                    value={activeDoc.serviceName || 'خدمة غير معنونة'}
                    onChange={onUpdateServiceName}
                    placeholder="اسم الخدمة..."
                    disabled={!isIntroAllowed}
                  />
                </h2>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>كود الخدمة:</span>
                  <span style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    background: 'rgba(255,255,255,0.06)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <InlineEditable
                      value={activeDoc.serviceCode || 'SERV_001'}
                      onChange={onUpdateServiceCode}
                      dir="ltr"
                      disabled={!isIntroAllowed}
                    />
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>
                  الوصف العام للخدمة (Overview):
                </label>
                <div style={{
                  background: 'rgba(0,0,0,0.18)',
                  borderRadius: '6px',
                  padding: '0.75rem 1rem',
                  border: '1px solid rgba(255,255,255,0.08)',
                  lineHeight: '1.7',
                  fontSize: '0.9rem',
                  color: '#e2e8f0'
                }}>
                  <InlineEditable
                    value={activeDoc.overviewText || 'أدخل الوصف التفصيلي ومعمارية الخدمة هنا...'}
                    onChange={onUpdateOverview}
                    multiline={true}
                    placeholder="أدخل الوصف العام للخدمة..."
                    disabled={!isIntroAllowed}
                  />
                </div>

              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>
                  عنوان الخادم الأساسي (Base URL):
                </label>
                <div style={{
                  background: 'rgba(0,0,0,0.25)',
                  borderRadius: '6px',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid rgba(255,255,255,0.08)',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  color: '#38bdf8'
                }}>
                  <InlineEditable
                    value={activeDoc.baseUrl || 'https://api.gateway.bank.ye/v1'}
                    onChange={onUpdateBaseUrl}
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* Service Characteristics Badges */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-card, #2b4870)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border, rgba(255, 255, 255, 0.1))' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>إصدار المواصفة</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#10b981' }}>{activeDoc.semver || '1.0.0'}</span>
              </div>
              <div style={{ background: 'var(--bg-card, #2b4870)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border, rgba(255, 255, 255, 0.1))' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>بروتوكول الاتصال</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0ea5e9' }}>{activeDoc.channel?.protocol || 'HTTPS / REST'}</span>
              </div>
              <div style={{ background: 'var(--bg-card, #2b4870)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border, rgba(255, 255, 255, 0.1))' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>عدد نقاط النهاية (Endpoints)</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f59e0b' }}>{endpoints.length} مسار معرّف</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: HEADERS (الترويسة) */}
        {activeTab === 'headers' && (
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                ترويسات الأمان والطلب القياسية (Security & Global Headers)
              </h3>
              <button
                type="button"
                onClick={onAddHeader}
                style={{
                  background: '#10b981',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '5px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <Plus size={14} />
                <span>+ إضافة ترويسة</span>
              </button>
            </div>

            <div style={{
              background: 'var(--bg-card, #2b4870)',
              borderRadius: '8px',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>
                    <th style={{ padding: '0.75rem 1rem', width: '30%' }}>المفتاح (Header Key)</th>
                    <th style={{ padding: '0.75rem 1rem', width: '40%' }}>الوصف والمعنى المؤسسي</th>
                    <th style={{ padding: '0.75rem 1rem', width: '22%' }}>القيمة النموذجية</th>
                    <th style={{ padding: '0.75rem 1rem', width: '8%', textAlign: 'center' }}>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeDoc.importedHeaders || []).map((h, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>
                        <InlineEditable
                          value={h.name}
                          onChange={(val) => onUpdateHeader(idx, { name: val })}
                          dir="ltr"
                        />
                      </td>
                      <td style={{ padding: '0.65rem 1rem', color: '#cbd5e1' }}>
                        <InlineEditable
                          value={h.description || ''}
                          onChange={(val) => onUpdateHeader(idx, { description: val })}
                          placeholder="وصف الترويسة..."
                        />
                      </td>
                      <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', color: '#34d399' }}>
                        <InlineEditable
                          value={h.example || ''}
                          onChange={(val) => onUpdateHeader(idx, { example: val })}
                          dir="ltr"
                          placeholder="قيمة تجريبية..."
                        />
                      </td>
                      <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => onDeleteHeader(idx)}
                          style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '0.2rem' }}
                          title="حذف الترويسة"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!activeDoc.importedHeaders || activeDoc.importedHeaders.length === 0) && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                        لا توجد ترويسات محددة. انقر على "+ إضافة ترويسة" لإضافة ترويسة جديدة.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ENDPOINTS / REQUEST & RESPONSE (الطلب والاستجابة) */}
        {activeTab === 'endpoints' && (
          <div style={{ maxWidth: '1180px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Endpoints Ribbon */}
            <div style={{
              background: 'var(--bg-card, #2b4870)',
              borderRadius: '8px',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
              padding: '0.5rem 0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                {endpoints.map((ep, idx) => {
                  const isSelected = selectedEndpointIndex === idx;
                  const methodColor = ep.method === 'GET' ? '#38bdf8' : ep.method === 'POST' ? '#34d399' : ep.method === 'DELETE' ? '#f43f5e' : '#fbbf24';
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSelectEndpoint(idx)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '6px',
                        background: isSelected ? 'rgba(14, 165, 233, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: isSelected ? '1px solid #0ea5e9' : '1px solid rgba(255, 255, 255, 0.08)',
                        color: isSelected ? '#ffffff' : '#cbd5e1',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        fontWeight: isSelected ? 700 : 500
                      }}
                    >
                      <span style={{ color: methodColor, fontWeight: 800, fontSize: '0.72rem' }}>{ep.method}</span>
                      <span dir="ltr" style={{ fontFamily: 'monospace' }}>{ep.path}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={onAddEndpoint}
                style={{
                  background: '#10b981',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '5px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
                title="إضافة نقطة نهاية جديدة للمواصفة"
              >
                <Plus size={14} />
                <span>+ إضافة مسار جديد</span>
              </button>
            </div>

            {/* Active Endpoint Wire Inspector & Living Editor */}
            {activeEndpoint && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Method & Path Toolbar */}
                <div style={{
                  background: 'var(--bg-card, #2b4870)',
                  borderRadius: '8px',
                  border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                    <select
                      value={activeEndpoint.method}
                      onChange={(e) => onUpdateEndpointMethod(selectedEndpointIndex, e.target.value)}
                      style={{
                        padding: '0.35rem 0.65rem',
                        borderRadius: '5px',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        border: '1px solid rgba(255,255,255,0.2)',
                        cursor: 'pointer',
                        background: activeEndpoint.method === 'GET' ? '#0369a1' : activeEndpoint.method === 'POST' ? '#15803d' : activeEndpoint.method === 'DELETE' ? '#be123c' : '#b45309',
                        color: '#ffffff'
                      }}
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                      <option value="PATCH">PATCH</option>
                    </select>

                    <div style={{
                      flex: 1,
                      background: 'rgba(0,0,0,0.25)',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '5px',
                      fontFamily: 'monospace',
                      fontSize: '0.9rem',
                      color: '#38bdf8',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <InlineEditable
                        value={activeEndpoint.path}
                        onChange={(val) => onUpdateEndpointPath(selectedEndpointIndex, val)}
                        dir="ltr"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(activeEndpoint.path)}
                      style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#cbd5e1', padding: '0.45rem', borderRadius: '5px', cursor: 'pointer' }}
                      title="نسخ المسار"
                    >
                      {copiedPath ? <Check size={15} color="#34d399" /> : <Copy size={15} />}
                    </button>
                  </div>

                  {endpoints.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteEndpoint(selectedEndpointIndex)}
                      style={{
                        background: 'rgba(244, 63, 94, 0.15)',
                        border: '1px solid rgba(244, 63, 94, 0.3)',
                        color: '#fb7185',
                        padding: '0.35rem 0.65rem',
                        borderRadius: '5px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <Trash2 size={13} />
                      <span>حذف هذا المسار</span>
                    </button>
                  )}
                </div>

                {/* Endpoint Summary */}
                <div style={{
                  background: 'var(--bg-card, #2b4870)',
                  borderRadius: '8px',
                  border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                  padding: '0.75rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap', fontWeight: 600 }}>وصف المسار:</span>
                  <div style={{ flex: 1, fontSize: '0.88rem', color: '#f1f5f9' }}>
                    <InlineEditable
                      value={activeEndpoint.summary || ''}
                      onChange={(val) => onUpdateEndpointSummary(selectedEndpointIndex, val)}
                      placeholder="أدخل وصف نقطة النهاية..."
                    />
                  </div>
                </div>

                {/* REQUEST PARAMETERS TABLE */}
                <div style={{
                  background: 'var(--bg-card, #2b4870)',
                  borderRadius: '8px',
                  border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '0.75rem 1.25rem',
                    background: 'rgba(0,0,0,0.15)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>
                      مواصفات حقول الطلب (Request Parameters)
                    </span>
                    <button
                      type="button"
                      onClick={() => onAddField(selectedEndpointIndex)}
                      style={{
                        background: '#10b981',
                        border: 'none',
                        color: '#ffffff',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <Plus size={13} />
                      <span>+ إضافة حقل للطلب</span>
                    </button>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>
                        <th style={{ padding: '0.65rem 1rem', width: '25%' }}>اسم الحقل (Field)</th>
                        <th style={{ padding: '0.65rem 1rem', width: '15%' }}>النوع</th>
                        <th style={{ padding: '0.65rem 1rem', width: '15%' }}>الإلزامية</th>
                        <th style={{ padding: '0.65rem 1rem', width: '37%' }}>الوصف / القيمة</th>
                        <th style={{ padding: '0.65rem 1rem', width: '8%', textAlign: 'center' }}>إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(activeEndpoint.requestFields || []).map((rf, rIdx) => (
                        <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.6rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>
                            <InlineEditable
                              value={rf.name}
                              onChange={(val) => onUpdateField(selectedEndpointIndex, rIdx, { name: val })}
                              dir="ltr"
                            />
                          </td>
                          <td style={{ padding: '0.6rem 1rem' }}>
                            <select
                              value={rf.type}
                              onChange={(e) => onUpdateField(selectedEndpointIndex, rIdx, { type: e.target.value })}
                              style={{
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                color: '#e2e8f0',
                                borderRadius: '4px',
                                padding: '0.15rem 0.35rem',
                                fontSize: '0.75rem',
                                fontWeight: 700
                              }}
                            >
                              <option value="STRING">STRING</option>
                              <option value="NUMBER">NUMBER</option>
                              <option value="BOOLEAN">BOOLEAN</option>
                              <option value="OBJECT">OBJECT</option>
                              <option value="ARRAY">ARRAY</option>
                            </select>
                          </td>
                          <td style={{ padding: '0.6rem 1rem' }}>
                            <span
                              onClick={() => onUpdateField(selectedEndpointIndex, rIdx, { required: !rf.required })}
                              style={{
                                display: 'inline-block',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                background: rf.required ? 'rgba(239, 68, 68, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                                color: rf.required ? '#fca5a5' : '#cbd5e1',
                                border: rf.required ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(100, 116, 139, 0.3)'
                              }}
                              title="انقر للتبديل"
                            >
                              {rf.required ? 'إلزامي ✓' : 'اختياري'}
                            </span>
                          </td>
                          <td style={{ padding: '0.6rem 1rem', color: '#cbd5e1' }}>
                            <InlineEditable
                              value={rf.description || rf.example || ''}
                              onChange={(val) => onUpdateField(selectedEndpointIndex, rIdx, { description: val, example: val })}
                              placeholder="الوصف أو القيمة النموذجية..."
                            />
                          </td>
                          <td style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => onDeleteField(selectedEndpointIndex, rIdx)}
                              style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '0.2rem' }}
                              title="حذف الحقل"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(!activeEndpoint.requestFields || activeEndpoint.requestFields.length === 0) && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
                            لا توجد حقول معرفة للطلب. انقر على "+ إضافة حقل للطلب" للإضافة.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* RESPONSE PARAMETERS TABLE */}
                <div style={{
                  background: 'var(--bg-card, #2b4870)',
                  borderRadius: '8px',
                  border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '0.75rem 1.25rem',
                    background: 'rgba(0,0,0,0.15)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>
                      مواصفات حقول الاستجابة (Response Parameters - 200 OK)
                    </span>
                    <button
                      type="button"
                      onClick={() => onAddResponseField(selectedEndpointIndex)}
                      style={{
                        background: '#0ea5e9',
                        border: 'none',
                        color: '#ffffff',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <Plus size={13} />
                      <span>+ إضافة حقل للاستجابة</span>
                    </button>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>
                        <th style={{ padding: '0.65rem 1rem', width: '30%' }}>اسم حقل الاستجابة</th>
                        <th style={{ padding: '0.65rem 1rem', width: '18%' }}>النوع</th>
                        <th style={{ padding: '0.65rem 1rem', width: '44%' }}>الوصف</th>
                        <th style={{ padding: '0.65rem 1rem', width: '8%', textAlign: 'center' }}>إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(activeEndpoint.responseFields || []).map((rf, rfIdx) => (
                        <tr key={rfIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.6rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#34d399' }}>
                            <InlineEditable
                              value={rf.name}
                              onChange={(val) => onUpdateResponseField(selectedEndpointIndex, rfIdx, { name: val })}
                              dir="ltr"
                            />
                          </td>
                          <td style={{ padding: '0.6rem 1rem' }}>
                            <select
                              value={rf.type}
                              onChange={(e) => onUpdateResponseField(selectedEndpointIndex, rfIdx, { type: e.target.value })}
                              style={{
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                color: '#e2e8f0',
                                borderRadius: '4px',
                                padding: '0.15rem 0.35rem',
                                fontSize: '0.75rem',
                                fontWeight: 700
                              }}
                            >
                              <option value="STRING">STRING</option>
                              <option value="NUMBER">NUMBER</option>
                              <option value="BOOLEAN">BOOLEAN</option>
                              <option value="OBJECT">OBJECT</option>
                              <option value="ARRAY">ARRAY</option>
                            </select>
                          </td>
                          <td style={{ padding: '0.6rem 1rem', color: '#cbd5e1' }}>
                            <InlineEditable
                              value={rf.description || ''}
                              onChange={(val) => onUpdateResponseField(selectedEndpointIndex, rfIdx, { description: val })}
                              placeholder="وصف حقل الاستجابة..."
                            />
                          </td>
                          <td style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => onDeleteResponseField(selectedEndpointIndex, rfIdx)}
                              style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '0.2rem' }}
                              title="حذف الحقل"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(!activeEndpoint.responseFields || activeEndpoint.responseFields.length === 0) && (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
                            لا توجد حقول محددة للاستجابة. انقر على "+ إضافة حقل للاستجابة" للإضافة.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ERRORS (الأخطاء) */}
        {activeTab === 'errors' && (
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                قاموس الأخطاء ورموز الاستجابة (Error Dictionary)
              </h3>
              <button
                type="button"
                onClick={onAddErrorCode}
                style={{
                  background: '#10b981',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '5px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <Plus size={14} />
                <span>+ إضافة رمز خطأ</span>
              </button>
            </div>

            <div style={{
              background: 'var(--bg-card, #2b4870)',
              borderRadius: '8px',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>
                    <th style={{ padding: '0.75rem 1rem', width: '25%' }}>رمز الخطأ الداخلي (Code)</th>
                    <th style={{ padding: '0.75rem 1rem', width: '45%' }}>رسالة الخطأ والتفسير</th>
                    <th style={{ padding: '0.75rem 1rem', width: '22%' }}>رمز HTTP</th>
                    <th style={{ padding: '0.75rem 1rem', width: '8%', textAlign: 'center' }}>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeDoc.errorCodes || []).map((err, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#f87171' }}>
                        <InlineEditable
                          value={err.code}
                          onChange={(val) => onUpdateErrorCode(idx, { code: val })}
                          dir="ltr"
                        />
                      </td>
                      <td style={{ padding: '0.65rem 1rem', color: '#cbd5e1' }}>
                        <InlineEditable
                          value={err.message}
                          onChange={(val) => onUpdateErrorCode(idx, { message: val })}
                          placeholder="رسالة الخطأ..."
                        />
                      </td>
                      <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', color: '#fbbf24' }}>
                        <InlineEditable
                          value={String(err.httpStatus || 400)}
                          onChange={(val) => onUpdateErrorCode(idx, { httpStatus: parseInt(val, 10) || 400 })}
                          dir="ltr"
                        />
                      </td>
                      <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => onDeleteErrorCode(idx)}
                          style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '0.2rem' }}
                          title="حذف رمز الخطأ"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!activeDoc.errorCodes || activeDoc.errorCodes.length === 0) && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                        لا توجد أخطاء مسجلة. انقر على "+ إضافة رمز خطأ" للإضافة.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: NOTES (ملاحظات) */}
        {activeTab === 'notes' && (
          <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{
              background: 'var(--bg-card, #2b4870)',
              borderRadius: '8px',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
              padding: '1.25rem'
            }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 1rem 0', color: '#ffffff' }}>
                الملاحظات الفنية وقواعد العمل (Business Rules & Notes)
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.7', margin: 0 }}>
                يمكنك كتابة المتطلبات الأمنية الإلزامية مثل (التوقيع الرقمي RSA-SHA256، سياسة شهادات SSL Pinning، ونوافذ التوافر العالي 99.99%) هنا ليتم توثيقها رسمياً.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
