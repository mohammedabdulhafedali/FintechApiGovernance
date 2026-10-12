import React, { useState } from 'react';
import { Endpoint, HttpMethod, Sector } from '../../types/schema';
import { 
  CloudUpload, 
  Building2, 
  Coins, 
  IdCard, 
  Banknote, 
  Route, 
  Code2, 
  RotateCcw, 
  FileSignature, 
  Info 
} from 'lucide-react';
import { useLanguage } from '../../i18n';

interface DocumentationHubProps {
  sectors: Record<string, Sector>;
  onAddEndpoint: (sectorKey: string, endpoint: Endpoint) => void;
  onSuccess: (title: string, message: string, codeSnippet?: string) => void;
}

export const DocumentationHub: React.FC<DocumentationHubProps> = ({
  sectors,
  onAddEndpoint,
  onSuccess
}) => {
  const { t, getLocalized, language } = useLanguage();
  const isEn = language === 'en';

  const [selectedSector, setSelectedSector] = useState('banking');
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceCode, setServiceCode] = useState('BAL_INQ');
  const [baseUrl, setBaseUrl] = useState('https://api.gov.fintech/v1/accounts');
  
  const [method, setMethod] = useState<HttpMethod>('POST');
  const [endpointPath, setEndpointPath] = useState('/v1/accounts/balance/inquire');
  const [shortName, setShortName] = useState('balance-inquire');
  const [bankingRule, setBankingRule] = useState(isEn ? 'Client Consent Verification (OAuth 2.0)' : 'التحقق من تفويض العميل (OAuth)');
  const [description, setDescription] = useState(
    isEn 
      ? 'Execute instant ledger and available balance inquiry for current accounts according to open banking standards.'
      : 'تنفيذ الاستعلام الفوري عن أرصدة الحسابات الجارية والمقيدة وفق معايير المصرفية المفتوحة...'
  );

  const [reqBody, setReqBody] = useState(JSON.stringify({
    accountNumber: "SA440000001234567890",
    idempotencyKey: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
  }, null, 2));

  const [res200, setRes200] = useState(JSON.stringify({
    status: "SUCCESS",
    currency: "SAR",
    availableBalance: 45000.00,
    ledgerBalance: 45000.00
  }, null, 2));

  const [res422, setRes422] = useState(JSON.stringify({
    error: "UNPROCESSABLE_ENTITY",
    code: "INVALID_ACCOUNT_422",
    message: "Account number is inactive or not found in central registry."
  }, null, 2));

  const applyPreset = (preset: 'fx' | 'kyc' | 'wps') => {
    if (preset === 'fx') {
      setSelectedSector('merchants');
      setServiceTitle(isEn ? 'Foreign Exchange Rates & Instant Remittance' : 'خدمة أسعار صرف العملات والتحويل اللحظي');
      setServiceCode('FX_RATES');
      setBaseUrl('https://api.gov.fintech/v1/forex');
      setMethod('GET');
      setEndpointPath('/v1/forex/rates/live');
      setShortName('forex-live-rates');
      setBankingRule(isEn ? 'Central Bank Daily Benchmark FX Verification' : 'التحقق من اعتماد البنك المركزي لأسعار التأشير اليومية');
      setDescription(isEn ? 'Retrieve instant exchange rates for regional and international currencies against SAR.' : 'استرجاع أسعار الصرف اللحظية للعملات الخليجية والدولية مقابل الريال مع هوامش التحويل المعتمدة.');
      setReqBody('// No Request Body for GET');
      setRes200(JSON.stringify({
        baseCurrency: "SAR",
        quoteCurrency: "USD",
        rate: 0.2666,
        timestamp: new Date().toISOString()
      }, null, 2));
    } else if (preset === 'kyc') {
      setSelectedSector('aml');
      setServiceTitle(isEn ? 'National ID Verification & Sanctions Screening' : 'خدمة الفحص والتحقق من الهوية الوطنية ومكافحة غسل الأموال');
      setServiceCode('KYC_VERIFY');
      setBaseUrl('https://api.gov.fintech/v1/compliance');
      setMethod('POST');
      setEndpointPath('/v1/compliance/kyc/verify');
      setShortName('kyc-verify');
      setBankingRule(isEn ? 'Sanctions Screening & PEP National Registry Matching' : 'فحص قوائم الحظر الوطنية والدولية ولائحة العقوبات');
      setDescription(isEn ? 'Real-time digital identity verification and global sanctions checks prior to customer onboarding.' : 'المطابقة الرقمية اللحظية لبيانات الهوية والسجل التجاري وفحص قوائم الحظر العالمية قبل فتح الحساب.');
      setReqBody(JSON.stringify({
        nationalId: "1098765432",
        birthDate: "1990-05-15",
        fullName: "Mohammed Ali Al-Maqtari"
      }, null, 2));
      setRes200(JSON.stringify({
        kycStatus: "VERIFIED",
        riskLevel: "LOW",
        sanctionsMatch: false
      }, null, 2));
    } else if (preset === 'wps') {
      setSelectedSector('banking');
      setServiceTitle(isEn ? 'Wage Protection System (WPS Unified Payroll)' : 'نظام حماية الأجور والرواتب المصرفية الموحدة');
      setServiceCode('WPS_PAYROLL');
      setBaseUrl('https://api.gov.fintech/v1/payroll');
      setMethod('POST');
      setEndpointPath('/v1/payroll/batches/submit');
      setShortName('wps-submit-batch');
      setBankingRule(isEn ? 'Funds Sufficiency & HRSD Ministry Establishment Check' : 'التحقق من كفاية الرصيد ومطابقة رقم المنشأة في وزارة الموارد البشرية');
      setDescription(isEn ? 'Deposit and distribute monthly salary files while validating regulatory wage protection compliance.' : 'إيداع وتوزيع ملفات مسيرات الرواتب الشهرية والتحقق الرقابي من التزام المؤسسات بضوابط حماية الأجور.');
      setReqBody(JSON.stringify({
        employerId: "7001234567",
        totalAmount: 125000.50,
        currency: "SAR",
        employeesCount: 14
      }, null, 2));
      setRes200(JSON.stringify({
        batchId: "WPS-2026-9921",
        status: "ACCEPTED_FOR_SETTLEMENT"
      }, null, 2));
    }
  };

  const handleReset = () => {
    setServiceTitle('');
    setServiceCode('BAL_INQ');
    setEndpointPath('/v1/accounts/balance/inquire');
    setShortName('balance-inquire');
    setBankingRule('');
    setDescription('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newEndpoint: Endpoint = {
      id: `ep_user_${Date.now()}`,
      method: method,
      path: endpointPath,
      shortName: shortName || endpointPath.split('/').filter(Boolean).pop() || 'endpoint',
      desc: description || serviceTitle || 'مسار موثق ومضاف حديثاً',
      descEn: isEn ? description : (shortName ? `${shortName} API service` : 'Newly documented endpoint'),
      isDraft: true,
      params: [
        {
          name: 'Authorization',
          type: 'string (Bearer)',
          req: true,
          rule: 'OAuth 2.0 Token FAPI 1.0',
          tag: 'Security',
          tagClass: 'badge-purple'
        },
        {
          name: 'X-Idempotency-Key',
          type: 'string (UUIDv4)',
          req: method === 'POST' || method === 'PUT',
          rule: 'صلاحية المفتاح 24 ساعة',
          tag: 'Idempotency',
          tagClass: 'badge-amber'
        }
      ],
      rules: [
        {
          id: `BR_${serviceCode || 'RULE'}_001`,
          name: bankingRule || 'مطابقة الضوابط الرقابية المعتمدة',
          err: 'VALIDATION_FAILED_422'
        }
      ],
      payload: method !== 'GET' ? reqBody : undefined,
      res200: res200,
      res422: res422,
      curl: `curl -X ${method} "${baseUrl}${endpointPath}" \\\n  -H "Authorization: Bearer <TOKEN>" \\\n  -H "Content-Type: application/json"`
    };

    onAddEndpoint(selectedSector, newEndpoint);
    onSuccess(
      t('docHub.successTitle'),
      t('docHub.successMsg'),
      newEndpoint.path
    );
  };

  return (
    <div className="add-api-layout">
      {/* 1. Header Banner */}
      <div className="add-api-hero-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(99, 102, 241, 0.16)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
            boxShadow: '0 0 12px rgba(99, 102, 241, 0.25)'
          }}>
            <Route size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', margin: 0, lineHeight: 1.3 }}>
              {t('docHub.pageTitle')}
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
              {t('docHub.pageSubtitle')}
            </p>
          </div>
        </div>

        {/* Quick Presets Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 700 }}>
            {t('docHub.quickPresets')}
          </span>
          <button type="button" className="preset-chip active-fx" onClick={() => applyPreset('fx')}>
            <Coins size={14} color="#38bdf8" />
            <span>{t('docHub.presetForex')}</span>
          </button>
          <button type="button" className="preset-chip active-kyc" onClick={() => applyPreset('kyc')}>
            <IdCard size={14} color="#f59e0b" />
            <span>{t('docHub.presetKyc')}</span>
          </button>
          <button type="button" className="preset-chip active-wps" onClick={() => applyPreset('wps')}>
            <Banknote size={14} color="#10b981" />
            <span>{t('docHub.presetWps')}</span>
          </button>
        </div>
      </div>

      {/* 2. Main Split Form (2 Columns: Spec Definition & Live Wire Sandbox) */}
      <form onSubmit={handleSubmit} className="add-api-form-grid">
        {/* Column 1: Specification & Route Configuration */}
        <div className="add-api-card">
          {/* Section 1: Service Definition */}
          <div className="add-api-card-title">
            <Building2 size={18} color="var(--blue)" />
            <span>1. {isEn ? 'Sector & Service Definition' : 'البيانات الأساسية وتصنيف الخدمة'}</span>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">{t('docHub.sectorSelectLabel')}</label>
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="form-control"
              >
                {Object.entries(sectors).map(([key, s]) => (
                  <option key={key} value={key}>
                    {getLocalized({ ar: s.name, en: s.nameEn }, s.name)} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t('docHub.serviceTitleLabel')}</label>
              <input
                type="text"
                value={serviceTitle}
                onChange={(e) => setServiceTitle(e.target.value)}
                placeholder={isEn ? 'e.g. Real-Time Balance Inquiry' : 'مثال: استعلام رصيد الحساب اللحظي'}
                className="form-control"
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">{t('docHub.serviceCodeLabel')}</label>
              <input
                type="text"
                value={serviceCode}
                onChange={(e) => setServiceCode(e.target.value)}
                placeholder="BAL_INQ"
                className="form-control mono"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('docHub.baseUrlLabel')}</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="form-control mono"
                dir="ltr"
              />
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '0.4rem 0' }} />

          {/* Section 2: Endpoint Path & Operation */}
          <div className="add-api-card-title">
            <Route size={18} color="var(--emerald)" />
            <span>2. {isEn ? 'Route Path & HTTP Operation' : 'مواصفة المسار وعملية الـ HTTP'}</span>
          </div>

          {/* Combined Postman-style Route Bar */}
          <div className="form-group">
            <label className="form-label">
              <span>{t('docHub.endpointPathLabel')}</span>
              <span className="mono" style={{ fontSize: '0.70rem', color: '#94a3b8' }}>
                {method} • HTTP/1.1 REST
              </span>
            </label>
            <div className="endpoint-route-bar">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as HttpMethod)}
                className={`endpoint-method-select method-${method.toLowerCase()}`}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
              <input
                type="text"
                value={endpointPath}
                onChange={(e) => setEndpointPath(e.target.value)}
                placeholder="/v1/accounts/balance/inquire"
                className="endpoint-path-input mono"
                required
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">{t('docHub.shortNameLabel')}</label>
              <input
                type="text"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="balance-inquire"
                className="form-control mono"
                dir="ltr"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('docHub.businessRuleLabel')}</label>
              <input
                type="text"
                value={bankingRule}
                onChange={(e) => setBankingRule(e.target.value)}
                placeholder={isEn ? 'OAuth 2.0 Client Consent' : 'التحقق من تفويض العميل'}
                className="form-control"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('docHub.descLabel')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-control"
              style={{ minHeight: '75px', resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Column 2: Live Wire Sandbox (Payloads & Responses) */}
        <div className="add-api-card">
          <div className="add-api-card-title">
            <Code2 size={18} color="var(--primary)" />
            <span>{isEn ? 'Payload & Response Models' : 'نماذج البيانات والاستجابة (Wire Sandbox)'}</span>
            <span className="mono badge-pill badge-blue" style={{ marginInlineStart: 'auto', fontSize: '0.68rem' }}>
              application/json
            </span>
          </div>

          {/* Request Payload */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ margin: 0 }}>{t('docHub.reqBodyLabel')}</label>
              <span className="mono" style={{ fontSize: '0.70rem', color: '#94a3b8' }}>
                {method === 'GET' ? 'N/A (Query String)' : 'Schema: Validated JSON'}
              </span>
            </div>
            <textarea
              value={reqBody}
              onChange={(e) => setReqBody(e.target.value)}
              className="add-api-code-editor"
              style={{ minHeight: '110px' }}
            />
          </div>

          {/* 200 OK Response */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ margin: 0, color: 'var(--emerald)' }}>
                {t('docHub.res200Label')}
              </label>
              <span className="badge-pill badge-emerald" style={{ fontSize: '0.68rem', padding: '0.12rem 0.5rem' }}>
                200 OK
              </span>
            </div>
            <textarea
              value={res200}
              onChange={(e) => setRes200(e.target.value)}
              className="add-api-code-editor"
              style={{ minHeight: '110px' }}
            />
          </div>

          {/* 422 Unprocessable Error */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ margin: 0, color: 'var(--rose)' }}>
                {t('docHub.res422Label')}
              </label>
              <span className="badge-pill badge-rose" style={{ fontSize: '0.68rem', padding: '0.12rem 0.5rem' }}>
                422 Unprocessable
              </span>
            </div>
            <textarea
              value={res422}
              onChange={(e) => setRes422(e.target.value)}
              className="add-api-code-editor"
              style={{ minHeight: '85px' }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '0.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-subtle)'
          }}>
            <button type="button" className="btn btn-ghost" onClick={handleReset} style={{ fontSize: '0.80rem' }}>
              <RotateCcw size={14} />
              <span>{t('docHub.resetButton')}</span>
            </button>

            <button type="submit" className="btn btn-emerald" style={{ padding: '0.55rem 1.35rem', fontSize: '0.84rem' }}>
              <CloudUpload size={16} />
              <span>{t('docHub.submitButton')}</span>
            </button>
          </div>
        </div>
      </form>

      {/* 3. Bottom Sovereign Compliance & Export Integration Card */}
      <div className="add-api-card" style={{ padding: '1.1rem 1.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(168, 85, 247, 0.15)',
              color: 'var(--purple)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileSignature size={18} />
            </div>
            <div>
              <strong style={{ fontSize: '0.88rem', display: 'block', color: '#ffffff' }}>
                3. {isEn ? 'Automatic National Deliverable Integration' : 'التكامل الرقابي الشامل مع مخرجات التصدير السيادية'}
              </strong>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                {isEn 
                  ? 'This endpoint is automatically registered into all official deliverables: 4-Page PDF, Word (.docx), Markdown, OpenAPI 3.1, Postman & ISO 20022.'
                  : 'بمجرد الاعتماد، يتم ربط المسار فورياً وتضمينه في كافة صيغ التصدير المعتمدة (وثيقة الـ PDF الرسمية، Word، Markdown، OpenAPI 3.1، Postman، ورسائل ISO 20022).'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <span className="badge-pill badge-blue" style={{ fontSize: '0.70rem' }}>OpenAPI 3.1</span>
            <span className="badge-pill badge-emerald" style={{ fontSize: '0.70rem' }}>PDF (4-Pages)</span>
            <span className="badge-pill badge-purple" style={{ fontSize: '0.70rem' }}>Word (.docx)</span>
            <span className="badge-pill badge-amber" style={{ fontSize: '0.70rem' }}>ISO 20022 XML</span>
          </div>
        </div>
      </div>
    </div>
  );
};
