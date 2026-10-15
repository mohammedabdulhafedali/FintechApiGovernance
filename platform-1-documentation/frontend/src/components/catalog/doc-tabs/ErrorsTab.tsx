import React, { useState } from 'react';
import { Endpoint } from '../../../types/schema';
import { useLanguage } from '../../../i18n';
import { Copy, Check, Search, Filter } from 'lucide-react';

interface ErrorsTabProps {
  endpoints?: Endpoint[];
}

interface HttpErrorCode {
  code: number;
  status: string;
  category: string;
  desc: string;
  descEn: string;
  solution: string;
  solutionEn: string;
}

interface BusinessErrorCode {
  code: string;
  ruleName: string;
  message: string;
  scope: string;
  solution: string;
}

export const ErrorsTab: React.FC<ErrorsTabProps> = ({ endpoints = [] }) => {
  const { isRtl, language } = useLanguage();
  const isEn = language === 'en';
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // 1. Standard Global HTTP Errors
  const globalHttpErrors: HttpErrorCode[] = [
    {
      code: 400,
      status: 'Bad Request',
      category: 'Client Error',
      desc: 'بنية الطلب غير صالحة، أو صياغة JSON غير صحيحة، أو وجود حقول مفقودة مطلوبة.',
      descEn: 'Malformed JSON payload, invalid syntax, or missing mandatory attributes.',
      solution: 'مراجعة هيكل البيانات في الـ Payload والتأكد من مطابقة جميع الحقول للمواصفة.',
      solutionEn: 'Verify the JSON payload structure against the endpoint schema.'
    },
    {
      code: 401,
      status: 'Unauthorized',
      category: 'Security',
      desc: 'فشل التحقق من هوية المرسل، أو التوقيع الرقمي RSA-SHA256 غير صالح، أو الطابع الزمني منتهي.',
      descEn: 'Authentication failed: invalid RSA-256 signature, expired timestamp, or unregistered client.',
      solution: 'التأكد من دقة معادلة السلسلة الكنونية (Canonical String) واستخدام المفتاح السري المعتمد.',
      solutionEn: 'Check the canonical string generation formula and ensure the private key matches.'
    },
    {
      code: 403,
      status: 'Forbidden',
      category: 'Security',
      desc: 'الجهة أو المستخدم مصرح له بالدخول، ولكنه لا يملك الصلاحية الكافية لتنفيذ هذا الإجراء.',
      descEn: 'Authenticated user lacks sufficient permission/role to execute this operation.',
      solution: 'مراجعة الصلاحيات المسندة للدور في مصفوفة الصلاحيات (RBAC).',
      solutionEn: 'Review the assigned permissions in the Platform IAM role matrix.'
    },
    {
      code: 404,
      status: 'Not Found',
      category: 'Client Error',
      desc: 'المسار أو المورد أو الحساب المستعلم عنه غير موجود في قاعدة بيانات النظام.',
      descEn: 'The requested resource or endpoint path does not exist.',
      solution: 'التأكد من صحة مسار الـ URI ومعرفات المسار (Path Parameters).',
      solutionEn: 'Check the URL path and path parameter identifiers.'
    },
    {
      code: 409,
      status: 'Conflict',
      category: 'Idempotency',
      desc: 'تعارض في العملية بسبب تكرار مفتاح الطلب (Idempotency Key) أو معالجة سابقة قيد التنفيذ.',
      descEn: 'Duplicate transaction detected or duplicate idempotency key used.',
      solution: 'توليد مفتاح Idempotency جديد لكل عملية تحويل منفصلة.',
      solutionEn: 'Generate a new unique UUID v4 idempotency key for each independent transfer.'
    },
    {
      code: 422,
      status: 'Unprocessable Entity',
      category: 'Business Validation',
      desc: 'البيانات صحيحة برمجياً لكنها تنتهك قواعد العمل المصرفية (مثل تجاوز سقف العمليات).',
      descEn: 'Payload is syntactically valid but violates business logic rules.',
      solution: 'التحقق من رسالة الخطأ المرفقة ومراجعة قواعد العمل الخاصة بالمسار.',
      solutionEn: 'Inspect the business error code in response body and apply the rule condition.'
    },
    {
      code: 429,
      status: 'Too Many Requests',
      category: 'Rate Limiting',
      desc: 'تم تجاوز الحد الأقصى المسموح به من الطلبات في النافذة الزمنية المحددة.',
      descEn: 'Rate limit threshold exceeded for this client ID.',
      solution: 'تطبيق آلية الانتظار المتصاعد (Exponential Backoff) وإعادة المحاولة بعد ثوان.',
      solutionEn: 'Implement exponential backoff retry strategy.'
    },
    {
      code: 500,
      status: 'Internal Server Error',
      category: 'Server Error',
      desc: 'خطأ داخلي غير متوقع في خوادم المعالجة المركزية.',
      descEn: 'Unexpected server-side error during transaction processing.',
      solution: 'الاحتفاظ بمعرف التتبع (X-Correlation-ID) والتواصل مع الدعم الفني للمنظومة.',
      solutionEn: 'Capture the X-Correlation-ID header and report to technical support.'
    }
  ];

  // 2. Custom Business Error Codes dynamically aggregated from endpoints
  const extractedBusinessErrors: BusinessErrorCode[] = [];

  endpoints.forEach((ep) => {
    if (ep.rules && Array.isArray(ep.rules)) {
      ep.rules.forEach((r) => {
        extractedBusinessErrors.push({
          code: r.err || 'RULE_VALIDATION_ERROR',
          ruleName: r.name || 'قاعدة تحقق مالي',
          message: `فشل التحقق من شرط العمل: ${r.name}`,
          scope: `${ep.method} ${ep.path}`,
          solution: 'مراجعة معطيات الطلب والالتزام بحدود وسياسات العملية.'
        });
      });
    }
  });

  // Default standard platform custom business codes if document has none
  const defaultBusinessCodes: BusinessErrorCode[] = [
    {
      code: 'ERR_10401_SIGNATURE_MISMATCH',
      ruleName: 'مطابقة التوقيع الرقمي الصارم',
      message: 'عدم تطابق التوقيع الرقمي RSA-SHA256 مع السلسلة الكنونية للطلب',
      scope: 'Global / All Endpoints',
      solution: 'التأكد من استخدام نفس الـ raw body بدقة دون إعادة ترتيب الحقول أو تغيير المسافات.'
    },
    {
      code: 'ERR_10402_INSUFFICIENT_FUNDS',
      ruleName: 'الرصيد المتاح للتحويل',
      message: 'الرصيد القابل للسحب في حساب المصدر أقل من مبلغ الحوالة والرسوم',
      scope: 'POST /v1/transfers',
      solution: 'التأكد من تغذية الحساب أو تقليل مبلغ العملية.'
    },
    {
      code: 'ERR_10403_LIMIT_EXCEEDED',
      ruleName: 'سقف التحويل الفردي',
      message: 'قيمة العملية تجاوزت السقف المالي المحدد بـ 50,000 ريال',
      scope: 'POST /v1/transfers',
      solution: 'تجزئة العملية أو التقدم بطلب لرفع السقف التشغيلي.'
    },
    {
      code: 'ERR_10404_ACCOUNT_FROZEN',
      ruleName: 'حالة الحساب البنكي',
      message: 'الحساب المصدر أو المستفيد مجمد أو موقوف لأسباب رقابية',
      scope: 'All Financial Routes',
      solution: 'التواصل مع إدارة العمليات لفك تجميد الحساب.'
    },
    {
      code: 'ERR_10405_DUPLICATE_IDEMPOTENCY',
      ruleName: 'منع ازدواج القيد المالي',
      message: 'تم استقبال نفس مفتاح Idempotency-Key في عملية سابقة مسجلة',
      scope: 'POST /v1/transfers',
      solution: 'إعادة استخدام نفس المفتاح للاستعلام عن الحالة فقط، أو استخدام مفتاح جديد لعملية جديدة.'
    }
  ];

  const businessErrors = extractedBusinessErrors.length > 0 ? extractedBusinessErrors : defaultBusinessCodes;

  // Search filtering
  const filteredHttp = globalHttpErrors.filter(e => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.code.toString().includes(q) ||
      e.status.toLowerCase().includes(q) ||
      e.desc.toLowerCase().includes(q) ||
      e.descEn.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q)
    );
  });

  const filteredBusiness = businessErrors.filter(b => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.code.toLowerCase().includes(q) ||
      b.ruleName.toLowerCase().includes(q) ||
      b.message.toLowerCase().includes(q) ||
      b.scope.toLowerCase().includes(q)
    );
  });

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  return (
    <div className="doc-tab-pane errors-tab-container" style={{ padding: '1.75rem', maxWidth: '1080px', margin: '0 auto', direction: isRtl ? 'rtl' : 'ltr' }}>
      {/* ── Search & Filter Bar ── */}
      <div style={{
        padding: '1.25rem 1.4rem',
        borderRadius: '10px',
        background: 'var(--bg-card, #2b4870)',
        border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
        marginBottom: '1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: 'var(--text, #ffffff)',
            margin: '0 0 0.35rem 0'
          }}>
            {isRtl ? 'قاموس ورموز الأخطاء (Error Dictionary & Rules)' : 'Error Dictionary & Rules'}
          </h2>
          <div style={{ fontSize: '0.88rem', color: 'var(--text-dim, #94a3b8)' }}>
            {isRtl 
              ? 'مرجع رسمي موحد لحالات أخطاء البروتوكول وأخطاء وقواعد الأعمال المخصصة'
              : 'Unified reference for global protocol errors and developer-defined business validation codes'}
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'var(--bg-main, #1a2d45)',
          padding: '0.45rem 0.85rem',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
          width: '320px',
          maxWidth: '100%'
        }}>
          <Search size={14} color="var(--text-dim, #94a3b8)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRtl ? 'بحث في رموز الأخطاء...' : 'Search error codes...'}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text, #ffffff)',
              fontSize: '0.85rem',
              outline: 'none',
              width: '100%'
            }}
          />
        </div>
      </div>

      {/* ── Section A: Global HTTP Error Codes ── */}
      <div style={{ marginBottom: '2.25rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.85rem'
        }}>
          <h3 style={{
            fontSize: '1.05rem',
            fontWeight: 700,
            color: 'var(--text, #ffffff)',
            margin: 0
          }}>
            {isRtl ? '1. أكواد وأخطاء بروتوكول HTTP العامة' : '1. Global HTTP Status Codes'}
          </h3>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '0.2rem 0.6rem',
            borderRadius: '999px',
            background: 'rgba(255, 255, 255, 0.06)',
            color: 'var(--text-dim, #94a3b8)'
          }}>
            {filteredHttp.length} {isRtl ? 'أكواد قياسية' : 'Standard Codes'}
          </span>
        </div>

        <div style={{
          borderRadius: '10px',
          background: 'var(--bg-card, #2b4870)',
          border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
          overflow: 'hidden'
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
                  fontSize: '0.78rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  <th style={{ padding: '0.85rem 1rem', width: '22%' }}>{isEn ? 'HTTP Status' : 'رمز وحالة الـ HTTP'}</th>
                  <th style={{ padding: '0.85rem 1rem', width: '15%' }}>{isEn ? 'Category' : 'التصنيف'}</th>
                  <th style={{ padding: '0.85rem 1rem', width: '38%' }}>{isEn ? 'Description' : 'سبب الخطأ والتفسير'}</th>
                  <th style={{ padding: '0.85rem 1rem', width: '25%' }}>{isEn ? 'Recommended Action' : 'الإجراء البرمجي الموصى به'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredHttp.map((item) => {
                  const is4xx = item.code >= 400 && item.code < 500;
                  const color = is4xx ? '#f59e0b' : '#ef4444';
                  const bg = is4xx ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)';
                  const border = is4xx ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)';

                  return (
                    <tr
                      key={item.code}
                      style={{
                        borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.06))',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            color,
                            background: bg,
                            border: `1px solid ${border}`,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            direction: 'ltr'
                          }}>
                            {item.code}
                          </span>
                          <span style={{ fontWeight: 700, color: 'var(--text, #ffffff)', direction: 'ltr' }}>
                            {item.status}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          fontSize: '0.74rem',
                          color: 'var(--text-dim, #94a3b8)',
                          background: 'rgba(255, 255, 255, 0.04)',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px'
                        }}>
                          {item.category}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted, #cbd5e1)', lineHeight: '1.5' }}>
                        {isEn ? item.descEn : item.desc}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: '#93c5fd', fontSize: '0.84rem', lineHeight: '1.4' }}>
                        {isEn ? item.solutionEn : item.solution}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Section B: Custom Business Errors & Developer Rules ── */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.85rem'
        }}>
          <div>
            <h3 style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: 'var(--text, #ffffff)',
              margin: '0 0 0.2rem 0'
            }}>
              {isRtl ? '2. أكواد وقواعد أعمال النظام المخصصة (Developer / Business Rules)' : '2. Custom Business Error Codes & Rules'}
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim, #94a3b8)' }}>
              {isRtl ? 'أكواد وقواعد محددة تم ضبطها من المطور والمنظومة' : 'Specific rules configured for banking and business workflows'}
            </span>
          </div>

          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '0.2rem 0.6rem',
            borderRadius: '999px',
            background: 'rgba(56, 189, 248, 0.1)',
            color: '#38bdf8',
            border: '1px solid rgba(56, 189, 248, 0.25)'
          }}>
            {filteredBusiness.length} {isRtl ? 'قواعد مخصصة' : 'Custom Rules'}
          </span>
        </div>

        <div style={{
          borderRadius: '10px',
          background: 'var(--bg-card, #2b4870)',
          border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
          overflow: 'hidden'
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
                  fontSize: '0.78rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  <th style={{ padding: '0.85rem 1rem', width: '28%' }}>{isEn ? 'Error Code' : 'كود الخطأ المالي'}</th>
                  <th style={{ padding: '0.85rem 1rem', width: '22%' }}>{isEn ? 'Rule Name' : 'اسم القاعدة الرقابية'}</th>
                  <th style={{ padding: '0.85rem 1rem', width: '28%' }}>{isEn ? 'Message & Cause' : 'الرسالة وسبب الرفض'}</th>
                  <th style={{ padding: '0.85rem 1rem', width: '22%' }}>{isEn ? 'Applicable Scope' : 'نطاق التطبيق'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredBusiness.map((b, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: idx === filteredBusiness.length - 1 ? 'none' : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.06))',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Error Code with copy */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <code style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: '#f87171',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px'
                        }}>
                          {b.code}
                        </code>
                        <button
                          onClick={() => handleCopy(b.code)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: copiedCode === b.code ? 'var(--emerald, #10b981)' : 'var(--text-dim, #94a3b8)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Copy Error Code"
                        >
                          {copiedCode === b.code ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>

                    {/* Rule Name */}
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text, #ffffff)' }}>
                      {b.ruleName}
                    </td>

                    {/* Message & Cause */}
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted, #cbd5e1)', lineHeight: '1.45', fontSize: '0.85rem' }}>
                      {b.message}
                    </td>

                    {/* Scope */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <code style={{
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: '0.78rem',
                        color: '#38bdf8',
                        background: 'rgba(56, 189, 248, 0.06)',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        direction: 'ltr',
                        display: 'inline-block'
                      }}>
                        {b.scope}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
