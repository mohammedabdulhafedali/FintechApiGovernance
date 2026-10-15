import React, { useState } from 'react';
import { Copy, Check, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../../i18n';

interface HeaderItem {
  name: string;
  desc: string;
  descEn?: string;
  example: string;
  type: string;
  required: boolean;
}

interface HeadersTabProps {
  customHeaders?: HeaderItem[];
}

export const HeadersTab: React.FC<HeadersTabProps> = ({ customHeaders }) => {
  const { isRtl, language } = useLanguage();
  const isEn = language === 'en';
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedHeader, setCopiedHeader] = useState<string | null>(null);

  const defaultHeaders: HeaderItem[] = [
    {
      name: 'X-Client-ID',
      desc: 'المعرف الفريد المخصص للمستخدم أو المؤسسة المالية',
      descEn: 'Unique identifier assigned to the user / institution',
      example: 'client_corp_17',
      type: 'string',
      required: true
    },
    {
      name: 'X-Timestamp',
      desc: 'الطابع الزمني Unix (بالثواني) لحظة إرسال الطلب لمنع انتهاء الصلاحية',
      descEn: 'Unix timestamp (seconds) when request was sent',
      example: '1786981200',
      type: 'string (Unix)',
      required: true
    },
    {
      name: 'X-Nonce',
      desc: 'معرف فريد عشوائي UUID v4 يتم توليده لكل طلب للحماية من إعادة التشغيل',
      descEn: 'UUID v4 generated per request for replay protection',
      example: 'c9bf9e57-1685-4c89-bafb-ff5af830be8a',
      type: 'string (UUIDv4)',
      required: true
    },
    {
      name: 'X-Signature',
      desc: 'التوقيع الرقمي RSA-256 المشفر بـ Base64 للسلسلة الكنونية للطلب',
      descEn: 'Base64-encoded RSA-256 signature of canonical string',
      example: 'dGhpcyBpcyBhIHNpZ25hdHVyZQ...',
      type: 'string (Base64 RSA)',
      required: true
    },
    {
      name: 'Content-Type',
      desc: 'نوع محتوى البيانات المرسلة في جسم الطلب',
      descEn: 'Payload content type',
      example: 'application/json',
      type: 'string',
      required: true
    }
  ];

  const headers = customHeaders && customHeaders.length > 0 ? customHeaders : defaultHeaders;

  const curlHeadersBlock = headers
    .map(h => `-H "${h.name}: ${h.example}"`)
    .join(' \\\n  ');

  const handleCopyHeader = (val: string, name: string) => {
    navigator.clipboard.writeText(val);
    setCopiedHeader(name);
    setTimeout(() => setCopiedHeader(null), 1800);
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlHeadersBlock);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="doc-tab-pane headers-tab-container" style={{ padding: '1.75rem', maxWidth: '1080px', margin: '0 auto', direction: isRtl ? 'rtl' : 'ltr' }}>
      {/* ── Section Header ── */}
      <div style={{
        padding: '1.4rem',
        borderRadius: '10px',
        background: 'var(--bg-card, #2b4870)',
        border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
        marginBottom: '1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        textAlign: isRtl ? 'right' : 'left'
      }}>
        <div>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: 'var(--text, #ffffff)',
            margin: '0 0 0.35rem 0'
          }}>
            {isEn ? '1.4 Standard Mandatory Request Headers' : '1.4 رؤوس الطلبات المعيارية الإلزامية'}
          </h2>
          <p style={{
            fontSize: '0.9rem',
            color: 'var(--text-muted, #cbd5e1)',
            margin: 0
          }}>
            {isEn 
              ? 'Every request sent to the Ultimate Pay platform must include the following headers:' 
              : 'يجب تضمين جميع الرؤوس التالية في كل استدعاء API موجه للمنظومة لضمان التوثيق والأمان:'}
          </p>
        </div>

        <button
          onClick={handleCopyCurl}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.85rem',
            borderRadius: '6px',
            border: '1px solid var(--border, rgba(255, 255, 255, 0.18))',
            background: 'rgba(255, 255, 255, 0.05)',
            color: copiedCurl ? 'var(--emerald, #10b981)' : 'var(--text, #ffffff)',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
          title={isEn ? 'Copy cURL Header Flags' : 'نسخ معاملات cURL للترويسات'}
        >
          {copiedCurl ? <Check size={14} /> : <Copy size={14} />}
          <span>{copiedCurl ? (isRtl ? 'تم نسخ الترويسات' : 'Copied Headers') : (isRtl ? 'نسخ ترويسات cURL' : 'Copy cURL Headers')}</span>
        </button>
      </div>

      {/* ── Official Headers Table ── */}
      <div style={{
        borderRadius: '10px',
        background: 'var(--bg-card, #2b4870)',
        border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
        overflow: 'hidden',
        marginBottom: '1.75rem'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: isRtl ? 'right' : 'left',
            fontSize: '0.88rem'
          }}>
            <thead>
              <tr style={{
                background: 'var(--bg-main, #1a2d45)',
                borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
                color: 'var(--text-dim, #94a3b8)',
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                <th style={{ padding: '0.85rem 1rem', width: '22%' }}>{isEn ? 'Header Name' : 'اسم الرأس المعياري'}</th>
                <th style={{ padding: '0.85rem 1rem', width: '38%' }}>{isEn ? 'Description & Security Purpose' : 'الوصف والغرض الأمني'}</th>
                <th style={{ padding: '0.85rem 1rem', width: '25%' }}>{isEn ? 'Example' : 'مثال القيمة'}</th>
                <th style={{ padding: '0.85rem 1rem', width: '15%', textAlign: 'center' }}>{isEn ? 'Requirement' : 'الإلزامية'}</th>
              </tr>
            </thead>
            <tbody>
              {headers.map((h, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: idx === headers.length - 1 ? 'none' : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.06))',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Header Name */}
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <code style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      color: '#38bdf8',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      background: 'rgba(56, 189, 248, 0.08)',
                      padding: '0.2rem 0.45rem',
                      borderRadius: '4px',
                      direction: 'ltr'
                    }}>
                      {h.name}
                    </code>
                  </td>

                  {/* Description */}
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted, #cbd5e1)', lineHeight: '1.5' }}>
                    {isEn && h.descEn ? h.descEn : h.desc}
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-dim, #94a3b8)', marginTop: '2px', fontFamily: 'var(--font-mono, monospace)', direction: 'ltr' }}>
                      Type: {h.type}
                    </div>
                  </td>

                  {/* Example with quick copy */}
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--bg-main, #1a2d45)',
                      padding: '0.35rem 0.6rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.06))',
                      gap: '0.5rem',
                      direction: 'ltr'
                    }}>
                      <code style={{
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: '0.78rem',
                        color: '#a7f3d0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '210px',
                        direction: 'ltr'
                      }}>
                        {h.example}
                      </code>
                      <button
                        onClick={() => handleCopyHeader(h.example, h.name)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: copiedHeader === h.name ? 'var(--emerald, #10b981)' : 'var(--text-dim, #94a3b8)',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title={isEn ? 'Copy Example' : 'نسخ المثال'}
                      >
                        {copiedHeader === h.name ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  </td>

                  {/* Requirement */}
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: h.required ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                      color: h.required ? '#f87171' : 'var(--text-dim, #94a3b8)',
                      border: `1px solid ${h.required ? 'rgba(239, 68, 68, 0.3)' : 'var(--border, rgba(255, 255, 255, 0.1))'}`
                    }}>
                      {h.required ? (isRtl ? 'إلزامي' : 'Required') : (isRtl ? 'اختياري' : 'Optional')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Verification Warning Note ── */}
      <div style={{
        padding: '1.1rem 1.35rem',
        borderRadius: '10px',
        background: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        textAlign: isRtl ? 'right' : 'left'
      }}>
        <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.88rem', color: '#fde68a', lineHeight: '1.6' }}>
          <strong style={{ color: '#fbbf24', display: 'block', marginBottom: '0.25rem' }}>
            {isEn ? 'Verification Note:' : 'ملاحظة التحقق الأمني:'}
          </strong>
          {isEn
            ? 'The exact raw request body sent in the payload must be used to generate the SHA-256 hash. Any mismatch (e.g., key reordering, spacing differences) will cause signature verification failure on the server.'
            : 'يجب استخدام جسم الطلب الخام (Raw Request Body) الدقيق تماماً عند توليد تجزئة SHA-256. أي اختلاف في المسافات أو ترتيب المفاتيح سيؤدي إلى فشل مطابقة التوقيع الرقمي لدى السيرفر.'}
        </div>
      </div>
    </div>
  );
};
