import React, { useState, useEffect } from 'react';
import { Endpoint } from '../../types/schema';
import { Copy, Check, ShieldCheck, AlertTriangle, FileDown, ArrowDownLeft, ArrowUpRight, Smartphone, Server, BookOpen, X, Table, Code, Braces } from 'lucide-react';
import { useLanguage } from '../../i18n';

interface SpecViewerProps {
  endpoint: Endpoint;
  onOpenErrorDictionary?: () => void;
  highlightedField?: string | null;
  hideGlobalHeaders?: boolean;
}

export const SpecViewer: React.FC<SpecViewerProps> = ({ 
  endpoint,
  onOpenErrorDictionary,
  highlightedField,
  hideGlobalHeaders = false
}) => {
  const [activeTab, setActiveTab] = useState<'doc' | 'example'>('doc');
  const [currentExampleFormat, setCurrentExampleFormat] = useState<'json' | 'xml' | 'yaml'>('json');
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedReq, setCopiedReq] = useState(false);
  const [copiedRes, setCopiedRes] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [fieldsOnly, setFieldsOnly] = useState(false);

  // Auto-scroll to modified field in Screen 2
  useEffect(() => {
    if (!highlightedField) return;
    const el = document.getElementById(`col2-field-${highlightedField}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [highlightedField]);

  const { t, language, isRtl, getLocalized } = useLanguage();
  const isEn = language === 'en';

  const handleOpenErrors = () => {
    if (onOpenErrorDictionary) {
      onOpenErrorDictionary();
    } else {
      setShowErrorModal(true);
    }
  };

  const handleDownloadSpec = () => {
    const specData = {
      $schema: 'https://api.gov.fintech/schemas/v1/ultimate-pay-spec.json',
      version: 'v2026.2',
      exportedAt: new Date().toISOString(),
      endpoint: {
        method: endpoint.method,
        path: endpoint.path,
        shortName: endpoint.shortName,
        desc: endpoint.desc,
        descEn: endpoint.descEn,
        headers: endpoint.params || [],
        businessRules: endpoint.rules || [],
        payload: endpoint.payload,
        res200: endpoint.res200,
        res422: endpoint.res422
      }
    };

    const blob = new Blob([JSON.stringify(specData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${endpoint.shortName || 'endpoint'}-spec.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = (text: string, type: 'path' | 'curl' | 'req' | 'res') => {
    navigator.clipboard.writeText(text);
    if (type === 'path') {
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    } else if (type === 'curl') {
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    } else if (type === 'req') {
      setCopiedReq(true);
      setTimeout(() => setCopiedReq(false), 2000);
    } else if (type === 'res') {
      setCopiedRes(true);
      setTimeout(() => setCopiedRes(false), 2000);
    }
  };

  // Real headers from the imported file (params with security/header characteristics)
  // If endpoint has specific params that look like headers (X- prefix, Authorization, etc.) use those
  const standardHeaders = (() => {
    // Check if params contain real header-like entries
    const headerParams = endpoint.params.filter(p =>
      /^X-|authorization|content-type|accept/i.test(p.name)
    );
    if (headerParams.length > 0) {
      return headerParams.map(p => ({
        name: p.name,
        type: p.type || 'string',
        req: p.req ? (isEn ? 'Required' : 'إلزامي') : (isEn ? 'Optional' : 'اختياري'),
        desc: p.rule || (isEn ? `Header: ${p.name}` : `ترويسة: ${p.name}`)
      }));
    }
    // Fallback: generic security headers
    return isEn ? [
      { name: 'X-Client-ID', type: 'string', req: 'Required', desc: 'Unique identifier assigned to the financial institution' },
      { name: 'X-Timestamp', type: 'string (Unix)', req: 'Required', desc: 'Unix timestamp (seconds) when request was sent' },
      { name: 'X-Nonce', type: 'string (UUIDv4)', req: 'Required', desc: 'UUID v4 generated per request for replay protection' },
      { name: 'X-Signature', type: 'string (Base64 RSA)', req: 'Required', desc: 'Base64-encoded RSA-256 digital signature of the canonical request string' },
      { name: 'Content-Type', type: 'string', req: 'Required', desc: 'Payload content type: application/json' }
    ] : [
      { name: 'X-Client-ID', type: 'string', req: 'إلزامي', desc: 'المعرف الفريد المخصص للمؤسسة المالية' },
      { name: 'X-Timestamp', type: 'string (Unix)', req: 'إلزامي', desc: 'الطابع الزمني Unix عند إرسال الطلب' },
      { name: 'X-Nonce', type: 'string (UUIDv4)', req: 'إلزامي', desc: 'UUID v4 مُولَّد لكل طلب للحماية من إعادة التشغيل' },
      { name: 'X-Signature', type: 'string (Base64 RSA)', req: 'إلزامي', desc: 'التوقيع الرقمي RSA-256 المُشفر بـ Base64 للسلسلة الكنونية للطلب' },
      { name: 'Content-Type', type: 'string', req: 'إلزامي', desc: 'نوع محتوى البيانات: application/json' }
    ];
  })();

  // Real response fields from imported file, minimal fallback
  const responseFields = endpoint.responseFields || (isEn ? [
    { name: 'status', type: 'string', req: 'Guaranteed', desc: 'Operation result: success or error' },
    { name: 'msg', type: 'string', req: 'Guaranteed', desc: 'Human-readable message describing the result' }
  ] : [
    { name: 'status', type: 'string', req: 'مؤكد', desc: 'نتيجة العملية: success أو error' },
    { name: 'msg', type: 'string', req: 'مؤكد', desc: 'رسالة وصفية لنتيجة العملية' }
  ]);


  const parseJsonSafe = (str?: string) => {
    if (!str || typeof str !== 'string') return null;
    const trimmed = str.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  };

  const jsonToXml = (obj: any, rootName = 'TransferRequest'): string => {
    const toXml = (o: any, indent = '  '): string => {
      if (!o || typeof o !== 'object') return `${indent}${String(o)}`;
      return Object.entries(o).map(([k, v]) => {
        if (v === null || v === undefined) return `${indent}<${k}/>`;
        if (typeof v === 'object' && !Array.isArray(v)) {
          return `${indent}<${k}>\n${toXml(v, indent + '  ')}\n${indent}</${k}>`;
        }
        return `${indent}<${k}>${String(v)}</${k}>`;
      }).join('\n');
    };
    return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName}>\n${toXml(obj)}\n</${rootName}>`;
  };

  const jsonToYaml = (obj: any, indent = ''): string => {
    if (!obj || typeof obj !== 'object') return `${indent}${String(obj)}`;
    return Object.entries(obj).map(([k, v]) => {
      if (v === null || v === undefined) return `${indent}${k}: ~`;
      if (typeof v === 'object' && !Array.isArray(v)) {
        return `${indent}${k}:\n${jsonToYaml(v, indent + '  ')}`;
      }
      const valStr = typeof v === 'string' ? `"${v}"` : String(v);
      return `${indent}${k}: ${valStr}`;
    }).join('\n');
  };

  const getRealisticRequestObj = () => {
    const isGet = endpoint.method.toUpperCase() === 'GET';
    const p = parseJsonSafe(endpoint.payload);
    if (p && typeof p === 'object') {
      return p;
    }
    if (isGet) return null;

    // If no parsed JSON payload, construct object directly from endpoint.params (the actual file fields)
    if (endpoint.params && endpoint.params.length > 0) {
      const obj: Record<string, any> = {};
      for (const param of endpoint.params) {
        // Check if value is in rule
        const valMatch = param.rule?.match(/القيمة:\s*(.+)$/);
        if (valMatch) {
          const rawV = valMatch[1].trim();
          obj[param.name] = isNaN(Number(rawV)) ? rawV : Number(rawV);
        } else if (param.type?.toUpperCase() === 'NUMBER' || param.type?.toUpperCase() === 'INT') {
          obj[param.name] = 100;
        } else if (param.type?.toUpperCase() === 'DECIMAL' || param.type?.toUpperCase() === 'DOUBLE') {
          obj[param.name] = 550.00;
        } else if (param.type?.toUpperCase() === 'BOOLEAN') {
          obj[param.name] = true;
        } else {
          obj[param.name] = `${param.name}_sample`;
        }
      }
      return obj;
    }

    return null;
  };

  const getRealisticResponseObj = () => {
    const r = parseJsonSafe(endpoint.res200);
    if (r && typeof r === 'object') {
      return r;
    }

    // If endpoint has real responseFields from file, construct response from them
    if (endpoint.responseFields && endpoint.responseFields.length > 0) {
      const dataObj: Record<string, any> = {};
      for (const rf of endpoint.responseFields) {
        const t = (rf.type || 'string').toLowerCase();
        if (t.includes('int') || t.includes('num')) dataObj[rf.name] = 125;
        else if (t.includes('dec') || t.includes('double') || t.includes('float')) dataObj[rf.name] = 5.50;
        else if (t.includes('bool')) dataObj[rf.name] = true;
        else dataObj[rf.name] = `${rf.name}_sample`;
      }
      return {
        status: 'success',
        msg: 'operation completed successfully',
        data: dataObj
      };
    }

    return {
      status: 'success',
      msg: 'operation completed successfully'
    };
  };

  const getCleanPayload = () => {
    const isGet = endpoint.method.toUpperCase() === 'GET';
    const reqObj = getRealisticRequestObj();
    if (isGet || !reqObj) {
      return isEn 
        ? '// No request body (GET query parameters only)' 
        : '// لا توجد حقول في جسم الطلب (معاملات استعلام GET فقط)';
    }

    const rootReqName = (endpoint.shortName ? endpoint.shortName.charAt(0).toUpperCase() + endpoint.shortName.slice(1) : 'Transfer') + 'Request';

    if (currentExampleFormat === 'xml') {
      return jsonToXml(reqObj, rootReqName);
    } else if (currentExampleFormat === 'yaml') {
      return jsonToYaml(reqObj);
    } else {
      return JSON.stringify(reqObj, null, 2);
    }
  };

  const getCleanResponse = () => {
    const resObj = getRealisticResponseObj();
    const rootResName = (endpoint.shortName ? endpoint.shortName.charAt(0).toUpperCase() + endpoint.shortName.slice(1) : 'Transfer') + 'Response';

    if (currentExampleFormat === 'xml') {
      return jsonToXml(resObj, rootResName);
    } else if (currentExampleFormat === 'yaml') {
      return jsonToYaml(resObj);
    } else {
      return JSON.stringify(resObj, null, 2);
    }
  };

  const getFormattedPayload = () => {
    const isGet = endpoint.method.toUpperCase() === 'GET';
    const reqObj = getRealisticRequestObj();
    const jwtSample = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhdXRoLmdvdi5maW50ZWNoIiwic3ViIjoiQkFOS19TQUJfMDAxOTIiLCJhdWQiOiJpcHMtZ292ZXJuYW5jZSIsImV4cCI6MTgwMTgyNDAwMCwiaWF0IjoxODAxODI0MDAwLCJzY29wZSI6WyJ0cmFuc2ZlcnM6d3JpdGUiLCJpcHM6ZXhlY3V0ZSJdfQ.MEQCID9a0xM208j1ZkdPwIgd892Kls4810a9c84e1b7f2b6eAiB7d02e88a0f91c8";
    const rsaSigSample = "MEQCID9a0xM208j1ZkdPwIgd892Kls4810a9c84e1b7f2b6eAiB7d02e88a0f91c8901b0f1a92d8e7";

    if (isGet) {
      return `GET ${endpoint.path}${endpoint.path.includes('{') ? '' : '/TXN-88492019-SA'} HTTP/1.1\n` +
        `Host: api.gov.fintech\n` +
        `Authorization: Bearer ${jwtSample}\n` +
        `X-Correlation-ID: b5a78c1e-9204-4f11-9a99-52e8964d4ef1\n` +
        `Accept: ${currentExampleFormat === 'xml' ? 'application/xml' : currentExampleFormat === 'yaml' ? 'application/yaml' : 'application/json'}\n` +
        `User-Agent: FintechCore-Client/2.4.0 (Linux x86_64; OpenJDK 21)`;
    }

    const rootReqName = (endpoint.shortName ? endpoint.shortName.charAt(0).toUpperCase() + endpoint.shortName.slice(1) : 'Transfer') + 'Request';
    let bodyStr = '';
    let contentType = 'application/json; charset=utf-8';
    let acceptType = 'application/json';

    if (currentExampleFormat === 'xml') {
      contentType = 'application/xml; charset=utf-8';
      acceptType = 'application/xml';
      bodyStr = jsonToXml(reqObj, rootReqName);
    } else if (currentExampleFormat === 'yaml') {
      contentType = 'application/yaml; charset=utf-8';
      acceptType = 'application/yaml';
      bodyStr = jsonToYaml(reqObj);
    } else {
      bodyStr = JSON.stringify(reqObj, null, 2);
    }

    const byteLen = new TextEncoder().encode(bodyStr).length;

    // Dynamically build headers from the actual imported headers
    const headerLines = standardHeaders.map(h => {
      let val = 'sample_value';
      if (/jwt|bearer/i.test(h.type) || /auth/i.test(h.name)) val = `Bearer ${jwtSample}`;
      else if (/timestamp/i.test(h.name)) val = '1786981200';
      else if (/nonce/i.test(h.name)) val = 'c9bf9e57-1685-4c89-bafb-ff5af830be8a';
      else if (/signature|sign/i.test(h.name)) val = rsaSigSample;
      else if (/client/i.test(h.name)) val = 'client_corp_17';
      else if (/content-type/i.test(h.name)) val = contentType;
      else if (/accept/i.test(h.name)) val = acceptType;
      else if (/idempotency/i.test(h.name)) val = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
      else if (/correlation/i.test(h.name)) val = 'b5a78c1e-9204-4f11-9a99-52e8964d4ef1';
      return `${h.name}: ${val}`;
    });

    if (!headerLines.some(l => l.toLowerCase().startsWith('content-type:'))) {
      headerLines.push(`Content-Type: ${contentType}`);
    }
    if (!headerLines.some(l => l.toLowerCase().startsWith('accept:'))) {
      headerLines.push(`Accept: ${acceptType}`);
    }

    return `${endpoint.method} ${endpoint.path} HTTP/1.1\n` +
      `Host: api.gov.fintech\n` +
      headerLines.join('\n') + '\n' +
      `Content-Length: ${byteLen}\n\n` +
      bodyStr;
  };

  const getFormattedResponse = () => {
    const resObj = getRealisticResponseObj();
    const rootResName = (endpoint.shortName ? endpoint.shortName.charAt(0).toUpperCase() + endpoint.shortName.slice(1) : 'Transfer') + 'Response';

    let bodyStr = '';
    let contentType = 'application/json; charset=utf-8';

    if (currentExampleFormat === 'xml') {
      contentType = 'application/xml; charset=utf-8';
      bodyStr = jsonToXml(resObj, rootResName);
    } else if (currentExampleFormat === 'yaml') {
      contentType = 'application/yaml; charset=utf-8';
      bodyStr = jsonToYaml(resObj);
    } else {
      bodyStr = JSON.stringify(resObj, null, 2);
    }

    const byteLen = new TextEncoder().encode(bodyStr).length;

    return `HTTP/1.1 200 OK\n` +
      `Date: Mon, 05 Oct 2026 11:15:00 GMT\n` +
      `Server: Envoy-Gateway/1.30.1\n` +
      `Content-Type: ${contentType}\n` +
      `Content-Length: ${byteLen}\n` +
      `Connection: keep-alive\n` +
      `X-Correlation-ID: b5a78c1e-9204-4f11-9a99-52e8964d4ef1\n` +
      `X-Idempotency-Status: RESOLVED_FRESH\n` +
      `X-RateLimit-Limit: 10000\n` +
      `X-RateLimit-Remaining: 9984\n` +
      `X-RateLimit-Reset: 1801824060\n` +
      `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload\n\n` +
      bodyStr;
  };

  return (
    <div className="spec-workbench-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      {/* Ultra-Slim Consolidated Single-Row Header Bar (Image 3) */}
      <div className="spec-slim-toolbar">
        <div className="spec-slim-meta">
          <div className="spec-slim-path-wrap">
            <span className={`method-badge method-${endpoint.method.toLowerCase()}`} dir="ltr">
              {endpoint.method}
            </span>
            <span className="mono spec-slim-path" dir="ltr" title={endpoint.path}>
              {endpoint.path}
            </span>

            <div className="spec-path-actions">
              {/* Quick Copy Path Button */}
              <button 
                className="btn btn-ghost btn-slim-action" 
                onClick={() => handleCopy(endpoint.path, 'path')} 
                title={t('spec.copyEndpoint')}
                style={{ padding: '0.25rem 0.45rem', borderRadius: '6px', color: copiedPath ? 'var(--emerald)' : 'var(--text-dim)' }}
              >
                {copiedPath ? <Check size={13} style={{ color: 'var(--emerald)' }} /> : <Copy size={13} />}
              </button>

              {/* Download Spec Button */}
              <button 
                className="btn btn-ghost btn-slim-action" 
                onClick={handleDownloadSpec} 
                title={t('docHub.exportEndpointJson')}
                style={{ padding: '0.25rem 0.45rem', borderRadius: '6px', color: 'var(--blue)' }}
              >
                <FileDown size={13} />
              </button>
            </div>
          </div>
        </div>

        <div className="spec-slim-controls">
          {activeTab === 'example' && (
            <div className="spec-format-switcher">
              <button 
                className={`format-mini-btn ${fieldsOnly ? 'active' : ''}`}
                onClick={() => setFieldsOnly(!fieldsOnly)}
                title={isEn ? 'Toggle Fields Only / Full Wire' : 'تبديل: حقول البيانات فقط / الاستدعاء السلكي الكامل'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: fieldsOnly ? '#38bdf8' : undefined,
                  borderColor: fieldsOnly ? 'rgba(56, 189, 248, 0.5)' : undefined,
                  background: fieldsOnly ? 'rgba(14, 165, 233, 0.15)' : undefined
                }}
              >
                <Braces size={12} />
                <span>{fieldsOnly ? (isEn ? 'Full Wire' : 'الاستدعاء الكامل') : (isEn ? 'Fields Only' : 'حقول فقط')}</span>
              </button>
              <button 
                className={`format-mini-btn ${currentExampleFormat === 'json' ? 'active' : ''}`}
                onClick={() => setCurrentExampleFormat('json')}
              >
                JSON
              </button>
              <button 
                className={`format-mini-btn ${currentExampleFormat === 'xml' ? 'active' : ''}`}
                onClick={() => setCurrentExampleFormat('xml')}
              >
                XML
              </button>
              <button 
                className={`format-mini-btn ${currentExampleFormat === 'yaml' ? 'active' : ''}`}
                onClick={() => setCurrentExampleFormat('yaml')}
              >
                YAML
              </button>
            </div>
          )}

          {/* Compact Segmented Control (Tabs) */}
          <div className="spec-slim-segmented" role="tablist" aria-label="Specification View Switcher">
            <button 
              role="tab"
              aria-selected={activeTab === 'doc'}
              className={`spec-slim-seg-btn ${activeTab === 'doc' ? 'active' : ''}`}
              onClick={() => setActiveTab('doc')}
            >
              <Table size={13.5} className="spec-tab-icon" />
              <span>{isEn ? 'Specification Tables' : 'جداول المواصفة'}</span>
              {activeTab === 'doc' && <span className="spec-tab-indicator" />}
            </button>
            <button 
              role="tab"
              aria-selected={activeTab === 'example'}
              className={`spec-slim-seg-btn ${activeTab === 'example' ? 'active' : ''}`}
              onClick={() => setActiveTab('example')}
            >
              <Code size={13.5} className="spec-tab-icon" />
              <span>{isEn ? 'Full Wire Examples' : 'أمثلة الاستدعاء الكاملة'}</span>
              {activeTab === 'example' && <span className="spec-tab-indicator" />}
            </button>
          </div>
        </div>
      </div>

      {/* PANE 1: SPECIFICATION TABLES (HEADERS -> REQUEST -> RESPONSE -> ERRORS) */}
      {activeTab === 'doc' && (
        <div className="spec-tables-stack">
          {/* 1. Request Body Table Block (Prioritized at top for instant live visibility) */}
          <div className="spec-table-block">
            <div className="spec-table-block-header">
              <div className="spec-table-block-title">
                <span>{isEn ? 'Request Body Schema' : 'حقول جسم الطلب الحية (Request Body Schema)'}</span>
              </div>
              <span className="mono" style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                {isEn ? 'Live Synced' : 'تحديث مباشر'}
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="spec-data-table">
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>{t('spec.paramName')}</th>
                    <th style={{ width: '20%' }}>{t('spec.paramType')}</th>
                    <th style={{ width: '15%' }}>{t('spec.paramReq')}</th>
                    <th style={{ width: '40%' }}>{t('spec.paramRule')}</th>
                  </tr>
                </thead>
                <tbody>
                  {endpoint.params && endpoint.params.length > 0 ? (
                    endpoint.params.map((param, i) => (
                      <tr 
                        key={param.name || i}
                        id={`col2-field-${param.name}`}
                        className={highlightedField === param.name ? 'row-live-highlight' : ''}
                      >
                        <td><code className="mono spec-code-key" dir="ltr">{param.name}</code></td>
                        <td><span className="mono" dir="ltr" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{param.type}</span></td>
                        <td>
                          <span className={`badge-pill ${param.req ? 'badge-req' : 'badge-opt'}`} style={{ marginInlineEnd: '0.35rem' }}>
                            {param.req ? t('spec.reqTrue') : t('spec.reqFalse')}
                          </span>
                          <span className={`badge-pill ${param.tagClass || 'badge-iso'}`}>
                            {param.tag}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          {getLocalized(param.rule)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '1.25rem' }}>
                        {isEn ? 'No request body required for this endpoint.' : 'لا يتطلب هذا المسار بيانات في جسم الطلب (No Request Body)'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Headers Table Block (Omitted if hideGlobalHeaders is true to prevent duplication) */}
          {!hideGlobalHeaders && (
            <div className="spec-table-block">
              <div className="spec-table-block-header">
                <div className="spec-table-block-title">
                  <span>{isEn ? 'Mandatory Request & Security Headers' : 'ترويسات الطلب والأمان الإلزامية (Request Headers)'}</span>
                </div>
                <span className="badge-pill badge-iso">Mandatory Security</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="spec-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '25%' }}>{t('spec.headerName')}</th>
                      <th style={{ width: '20%' }}>{t('spec.headerType')}</th>
                      <th style={{ width: '15%' }}>{t('spec.headerReq')}</th>
                      <th style={{ width: '40%' }}>{t('spec.headerDesc')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standardHeaders.map((h, i) => (
                      <tr key={i}>
                        <td><code className="mono spec-code-key">{h.name}</code></td>
                        <td><span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{h.type}</span></td>
                        <td>
                          <span className={`badge-pill ${h.req.includes('Strict') || h.req.includes('قطعي') ? 'badge-req' : 'badge-fin'}`}>
                            {h.req}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{h.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. Response Body Table Block */}
          <div className="spec-table-block">
            <div className="spec-table-block-header">
              <div className="spec-table-block-title">
                <span>{isEn ? 'Response Body Schema — HTTP 200 OK' : 'حقول استجابة النجاح (Response Body Schema — HTTP 200 OK)'}</span>
              </div>
              <span className="badge-pill badge-fin">Status: 200 OK</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="spec-data-table">
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>{isEn ? 'Attribute' : 'حقل الاستجابة (Attribute)'}</th>
                    <th style={{ width: '20%' }}>{t('spec.paramType')}</th>
                    <th style={{ width: '15%' }}>{t('spec.paramReq')}</th>
                    <th style={{ width: '40%' }}>{isEn ? 'Banking System Semantic' : 'المعنى والدلالة في النظام المصرفي'}</th>
                  </tr>
                </thead>
                <tbody>
                  {responseFields.map((f, i) => (
                    <tr key={i}>
                      <td><code className="mono" style={{ color: 'var(--emerald)', fontWeight: 700 }}>{f.name}</code></td>
                      <td><span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{f.type}</span></td>
                      <td><span className="badge-pill badge-fin">{f.req}</span></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{f.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Error Summary Banner */}
          <div className="error-summary-banner">
            <div className="error-summary-info">
              <div>
                <strong style={{ fontSize: '0.88rem', color: 'var(--text)', display: 'block' }}>
                  {isEn ? 'Key Error Cases for this Route:' : 'أبرز حالات الأخطاء لهذا المسار:'}
                </strong>
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem' }}>
                  {endpoint.rules && endpoint.rules.map((rule, i) => (
                    <span 
                      key={i} 
                      className="badge-pill badge-req" 
                      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      title={isEn ? 'Click to open Error Dictionary' : 'اضغط لفتح القاموس الشامل'}
                      onClick={handleOpenErrors}
                    >
                      <AlertTriangle size={12} /> {rule.err}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button className="btn-open-error-dict" onClick={handleOpenErrors}>
              <span>{isEn ? 'Comprehensive Error Dictionary (HTTP & 10xxx) →' : 'القاموس الشامل لرموز وأكواد الأخطاء (HTTP & Custom 10xxx) ←'}</span>
            </button>
          </div>
        </div>
      )}

      {/* PANE 2: FULL WORKING EXAMPLE & CODE PLAYGROUND */}
      {activeTab === 'example' && (
        <div className="full-example-grid">
          {/* Column 1: Request Example */}
          <div className="example-box-card">
            <div className="example-box-floating-bar">
              <button 
                className={`btn-example-floating ${fieldsOnly ? 'active' : ''}`}
                onClick={() => setFieldsOnly(!fieldsOnly)}
                title={fieldsOnly 
                  ? (isEn ? 'Switch to Full Wire Request' : 'التبديل إلى الاستدعاء السلكي الكامل')
                  : (isEn ? 'Show Request Fields Only' : 'عرض حقول الطلب فقط')
                }
              >
                <Braces size={13} />
                <span>{fieldsOnly ? (isEn ? 'Full Wire' : 'الطلب الكامل') : (isEn ? 'Fields Only' : 'حقول فقط')}</span>
              </button>
              <button 
                className="btn-example-floating" 
                onClick={() => handleCopy(fieldsOnly ? getCleanPayload() : getFormattedPayload(), 'req')}
                title={isEn ? `Copy (${currentExampleFormat.toUpperCase()})` : `نسخ (${currentExampleFormat.toUpperCase()})`}
              >
                {copiedReq ? <Check size={13} style={{ color: 'var(--emerald)' }} /> : <Copy size={13} />}
                <span>{copiedReq ? (isEn ? 'Copied' : 'تم النسخ') : (isEn ? 'Copy' : 'نسخ')}</span>
              </button>
            </div>
            <div className="example-code-pane">
              {fieldsOnly ? getCleanPayload() : getFormattedPayload()}
            </div>
          </div>

          {/* Column 2: Response Example */}
          <div className="example-box-card">
            <div className="example-box-floating-bar">
              <button 
                className={`btn-example-floating ${fieldsOnly ? 'active' : ''}`}
                onClick={() => setFieldsOnly(!fieldsOnly)}
                title={fieldsOnly 
                  ? (isEn ? 'Switch to Full Wire Response' : 'التبديل إلى الاستجابة السلكية الكاملة')
                  : (isEn ? 'Show Response Fields Only' : 'عرض حقول الاستجابة فقط')
                }
              >
                <Braces size={13} />
                <span>{fieldsOnly ? (isEn ? 'Full Wire' : 'الاستجابة الكاملة') : (isEn ? 'Fields Only' : 'حقول فقط')}</span>
              </button>
              <button 
                className="btn-example-floating" 
                onClick={() => handleCopy(fieldsOnly ? getCleanResponse() : getFormattedResponse(), 'res')}
                title={isEn ? `Copy (${currentExampleFormat.toUpperCase()})` : `نسخ (${currentExampleFormat.toUpperCase()})`}
              >
                {copiedRes ? <Check size={13} style={{ color: 'var(--emerald)' }} /> : <Copy size={13} />}
                <span>{copiedRes ? (isEn ? 'Copied' : 'تم النسخ') : (isEn ? 'Copy' : 'نسخ')}</span>
              </button>
            </div>
            <div className="example-code-pane" style={{ color: '#a7f3d0' }}>
              {fieldsOnly ? getCleanResponse() : getFormattedResponse()}
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Error Dictionary Modal */}
      {showErrorModal && (
        <div className="modal-overlay" onClick={() => setShowErrorModal(false)}>
          <div className="modal-card" style={{ maxWidth: '640px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={18} style={{ color: 'var(--rose)' }} />
                <span>{isEn ? 'Sovereign Financial Error Dictionary' : 'القاموس الشامل لرموز وأكواد الأخطاء المصرفية'}</span>
              </div>
              <button className="btn btn-ghost" style={{ padding: '0.2rem' }} onClick={() => setShowErrorModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>
                {isEn 
                  ? 'Standardized HTTP status codes and regulatory ISO 20022 error mappings for Saudi Sovereign Open Banking & Fintech Switch.'
                  : 'الأكواد المعيارية المعتمدة لبروتوكولات الخدمات المصرفية المفتوحة والبنك المركزي (SAMA / ISO 20022).'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { code: '400', name: 'ERR_MALFORMED_PAYLOAD', descAr: 'صيغة الطلب غير متوافقة مع مخطط JSON/XML المعتمد.', descEn: 'Malformed syntax or schema parsing failure in wire body.' },
                  { code: '401', name: 'ERR_INVALID_BEARER', descAr: 'رمز الدخول منتهي الصلاحية أو غير موثق عبر مزود الهوية المركزي.', descEn: 'Expired or signature-invalid OAuth 2.0 Bearer token.' },
                  { code: '403', name: 'ERR_INSUFFICIENT_SCOPE', descAr: 'الجهة المالية لا تملك تصريح الصلاحية للوصول لهذا المسار.', descEn: 'Missing required FAPI authorization scope for endpoint.' },
                  { code: '409', name: 'ERR_IDEMPOTENCY_CONFLICT', descAr: 'تم إرسال نفس مفتاح عدم التكرار مع محتوى طلب مختلف.', descEn: 'X-Idempotency-Key collision with mismatched payload hash.' },
                  { code: '422', name: 'ERR_BUSINESS_RULE_VIOLATION', descAr: 'فشل في تطبيق قواعد العمل (الرصيد غير كاف، خطأ في رقم الآيبان).', descEn: 'Business domain validation failed (e.g. invalid IBAN checksum).' },
                  { code: '500', name: 'ERR_CENTRAL_SWITCH_TIMEOUT', descAr: 'انقطاع مؤقت في الاتصال مع مقسم المقاصة المركزية.', descEn: 'Central clearing switch gateway timed out processing ledger.' }
                ].map((item, idx) => (
                  <div key={idx} style={{ padding: '0.65rem 0.85rem', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                      <span className="badge-pill badge-req" style={{ fontWeight: 800 }}>HTTP {item.code}</span>
                      <code className="mono" style={{ fontSize: '0.78rem', color: 'var(--cyan)' }}>{item.name}</code>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {isEn ? item.descEn : item.descAr}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowErrorModal(false)}>
                {isEn ? 'Close' : 'إغلاق'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
