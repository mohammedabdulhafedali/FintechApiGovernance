import React, { useState } from 'react';
import { Endpoint } from '../../types/schema';
import { 
  FileText, Code2, Copy, Check, ShieldCheck, 
  AlertTriangle, KeyRound, CheckCircle2, Terminal
} from 'lucide-react';

interface SpecViewerProps {
  endpoint: Endpoint;
}

export const SpecViewer: React.FC<SpecViewerProps> = ({ endpoint }) => {
  const [activeTab, setActiveTab] = useState<'tables' | 'examples'>('tables');
  const [selectedSdk, setSelectedSdk] = useState<'curl' | 'java' | 'csharp' | 'python'>('curl');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const standardHeaders = [
    { name: 'Authorization', type: 'string (Bearer Token)', req: 'إلزامي قطعي', desc: 'رمز تفويض OAuth 2.0 / FAPI 1.0 Advanced صادر من خادم الهوية المعتمد' },
    { name: 'X-Idempotency-Key', type: 'string (UUIDv4)', req: 'إلزامي قطعي', desc: 'مفتاح عدم التكرار الصادر من نظام البنك لمنع ازدواجية الخصم والقيد' },
    { name: 'X-Signature', type: 'string (RSA-PSS 4096)', req: 'إلزامي للعمليات المالية', desc: 'التوقيع الرقمي لمحتوى الطلب باستخدام مفتاح البنك الخاص' },
    { name: 'X-Correlation-ID', type: 'string (UUID)', req: 'إلزامي للتدقيق', desc: 'معرف التتبع الشامل لمطابقة مسار العملية عبر الشبكة' }
  ];

  const getSdkCode = () => {
    switch (selectedSdk) {
      case 'java':
        return `// Spring Boot 3.x - WebClient with RSA-PSS & Idempotency\nWebClient client = WebClient.builder()\n    .baseUrl("https://api.gov.fintech")\n    .defaultHeader("Authorization", "Bearer " + token)\n    .defaultHeader("X-Idempotency-Key", UUID.randomUUID().toString())\n    .build();\n\nTransferResponse response = client.post()\n    .uri("${endpoint.path}")\n    .bodyValue(payload)\n    .retrieve()\n    .bodyToMono(TransferResponse.class)\n    .block();`;
      case 'csharp':
        return `// .NET 8 - HttpClient with Sovereign Signature\nvar request = new HttpRequestMessage(HttpMethod.${endpoint.method}, "${endpoint.path}");\nrequest.Headers.Add("Authorization", $"Bearer {token}");\nrequest.Headers.Add("X-Idempotency-Key", Guid.NewGuid().ToString());\nrequest.Content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");\n\nvar response = await httpClient.SendAsync(request);\nvar result = await response.Content.ReadFromJsonAsync<TransferResponse>();`;
      case 'python':
        return `# Python 3.11+ - HTTPX with HMAC/RSA Signing\nimport httpx, uuid\n\nheaders = {\n    "Authorization": f"Bearer {token}",\n    "X-Idempotency-Key": str(uuid.uuid4()),\n    "Content-Type": "application/json"\n}\nresponse = httpx.${endpoint.method.toLowerCase()}("https://api.gov.fintech${endpoint.path}", json=payload, headers=headers)\nprint(response.json())`;
      default:
        return endpoint.curl || `curl -X ${endpoint.method} "https://api.gov.fintech${endpoint.path}" \\\n  -H "Authorization: Bearer <TOKEN>" \\\n  -H "Content-Type: application/json"`;
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* Endpoint Header Banner */}
      <div style={{
        padding: '1.25rem 1.75rem',
        background: 'linear-gradient(180deg, rgba(13, 25, 48, 0.6) 0%, transparent 100%)',
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <span className={`method-badge method-${endpoint.method.toLowerCase()}`} style={{ fontSize: '0.85rem', padding: '0.3rem 0.75rem' }}>
              {endpoint.method}
            </span>
            <span className="mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)' }}>
              {endpoint.path}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge-pill badge-emerald">
              <ShieldCheck size={14} /> مواصفة سيادية معتمدة (v2026.2)
            </span>
          </div>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {endpoint.desc}
        </p>

        {/* View Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            onClick={() => setActiveTab('tables')}
            className={`btn ${activeTab === 'tables' ? 'btn-primary' : 'btn-glass'}`}
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
          >
            <FileText size={15} />
            <span>1. جداول المواصفات وقواعد العمل</span>
          </button>
          <button
            onClick={() => setActiveTab('examples')}
            className={`btn ${activeTab === 'examples' ? 'btn-primary' : 'btn-glass'}`}
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
          >
            <Code2 size={15} />
            <span>2. عينات الاستدعاء وأكواد الـ SDKs</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Tables */}
      {activeTab === 'tables' && (
        <div style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Headers Table */}
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <KeyRound size={18} color="var(--blue)" />
              <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text)' }}>
                ترويسات الأمان والتدقيق الإلزامية (Security & Audit Headers)
              </h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'right', color: 'var(--text-dim)' }}>
                    <th style={{ padding: '0.6rem 0.75rem' }}>اسم الترويسة</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>النوع</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>الإلزامية</th>
                    <th style={{ padding: '0.6rem 0.75rem' }}>الوصف والضوابط المصرفية</th>
                  </tr>
                </thead>
                <tbody>
                  {standardHeaders.map((h, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.65rem 0.75rem' }}><code className="mono" style={{ color: 'var(--blue)' }}>{h.name}</code></td>
                      <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-latin)' }}>{h.type}</td>
                      <td style={{ padding: '0.65rem 0.75rem' }}><span className="badge-pill badge-rose">{h.req}</span></td>
                      <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-muted)' }}>{h.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Request Fields Table */}
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <FileText size={18} color="var(--emerald)" />
              <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text)' }}>
                مخطط حقول الطلب (Strict Request Payload Schema)
              </h3>
            </div>
            {endpoint.params.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>هذا المسار لا يتطلب محتوى طلب (No Request Body).</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'right', color: 'var(--text-dim)' }}>
                      <th style={{ padding: '0.6rem 0.75rem' }}>الحقل البرمجي</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>النوع</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>الحالة والتصنيف</th>
                      <th style={{ padding: '0.6rem 0.75rem' }}>قاعدة العمل وشروط التحقق (Validation)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpoint.params.map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.65rem 0.75rem' }}><code className="mono" style={{ color: 'var(--emerald)' }}>{p.name}</code></td>
                        <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-latin)' }}>{p.type}</td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>
                          <span className={`badge-pill ${p.req ? 'badge-rose' : 'badge-blue'}`} style={{ marginInlineEnd: '0.35rem' }}>
                            {p.req ? 'إلزامي' : 'اختياري'}
                          </span>
                          <span className={`badge-pill ${p.tagClass}`}>{p.tag}</span>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-muted)' }}>{p.rule}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Business Rules & Errors */}
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <AlertTriangle size={18} color="var(--amber)" />
              <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text)' }}>
                قواعد الأعمال وكتالوج رموز الأخطاء (Business Rules & Error Matrix)
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0.85rem' }}>
              {endpoint.rules.map((rule, i) => (
                <div key={i} style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span className="mono" style={{ color: 'var(--blue)', fontWeight: 700, fontSize: '0.78rem' }}>{rule.id}</span>
                    <span className="badge-pill badge-rose mono" style={{ fontSize: '0.68rem' }}>{rule.err}</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text)' }}>{rule.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Examples & SDKs */}
      {activeTab === 'examples' && (
        <div style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Multi-language SDK Selector */}
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Terminal size={18} color="var(--cyan)" />
                <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text)' }}>
                  كود الربط المعتمد للجهات الشريكة (Production SDKs)
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {(['curl', 'java', 'csharp', 'python'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setSelectedSdk(lang)}
                    className={`btn ${selectedSdk === lang ? 'btn-primary' : 'btn-glass'}`}
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', textTransform: 'uppercase' }}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <pre style={{
                background: '#040812',
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                color: '#38bdf8',
                overflowX: 'auto',
                direction: 'ltr',
                textAlign: 'left',
                lineHeight: 1.5
              }}>
                {getSdkCode()}
              </pre>
              <button
                onClick={() => handleCopy(getSdkCode(), 'sdk')}
                style={{
                  position: 'absolute',
                  top: '0.6rem',
                  right: '0.6rem',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.35rem 0.5rem',
                  cursor: 'pointer'
                }}
              >
                {copiedKey === 'sdk' ? <Check size={14} color="var(--emerald)" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* JSON Payload & Responses */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            {/* Payload */}
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--emerald)' }}>
                  نموذج الـ Request Payload
                </span>
                <button
                  onClick={() => handleCopy(endpoint.payload || '', 'payload')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                >
                  {copiedKey === 'payload' ? <Check size={14} color="var(--emerald)" /> : <Copy size={14} />}
                </button>
              </div>
              <pre style={{
                background: '#040812',
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: '#86efac',
                overflowX: 'auto',
                direction: 'ltr',
                textAlign: 'left'
              }}>
                {endpoint.payload || '// No Request Body'}
              </pre>
            </div>

            {/* Success 200 */}
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--blue)' }}>
                  الاستجابة الناجحة 200 OK
                </span>
                <button
                  onClick={() => handleCopy(endpoint.res200 || '', 'res200')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                >
                  {copiedKey === 'res200' ? <Check size={14} color="var(--emerald)" /> : <Copy size={14} />}
                </button>
              </div>
              <pre style={{
                background: '#040812',
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: '#93c5fd',
                overflowX: 'auto',
                direction: 'ltr',
                textAlign: 'left'
              }}>
                {endpoint.res200 || '// 200 OK'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
