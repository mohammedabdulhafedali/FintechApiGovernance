import React, { useState, useRef } from 'react';
import { Endpoint, HttpMethod, Sector, IntegrationDirection, ClientChannel, SystemModule } from '../../types/schema';
import { INITIAL_SYSTEMS } from '../../data/mockData';
import { 
  CloudUpload, 
  Building2, 
  Coins, 
  IdCard, 
  Banknote, 
  Route, 
  Code2, 
  RotateCcw, 
  Info,
  Download,
  FileCode,
  FileText,
  Layers,
  Sparkles,
  UploadCloud,
  PenTool,
  CheckCircle2,
  Check,
  AlertTriangle,
  Terminal,
  X,
  Smartphone,
  Server,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  Wand2,
  Globe,
  ShieldCheck
} from 'lucide-react';
import { useLanguage } from '../../i18n';

interface DocumentationHubProps {
  sectors: Record<string, Sector>;
  systems?: Record<string, SystemModule>;
  onAddEndpoint: (sectorKey: string, endpoint: Endpoint | Endpoint[], isBulk?: boolean, systemKey?: string) => void;
  onSuccess: (title: string, message: string, codeSnippet?: string) => void;
}

interface ParsedImportResult {
  format: string;
  endpoints: Endpoint[];
  suggestedSector?: string;
  sourceName?: string;
}

export const DocumentationHub: React.FC<DocumentationHubProps> = ({
  sectors,
  systems,
  onAddEndpoint,
  onSuccess
}) => {
  const { t, getLocalized, language, isRtl } = useLanguage();
  const isEn = language === 'en';

  const systemCatalog = systems && Object.keys(systems).length > 0 ? systems : INITIAL_SYSTEMS;

  // Mode Selection: 'manual' builder vs 'import' template hub
  const [activeMode, setActiveMode] = useState<'manual' | 'import'>('manual');

  // Manual Form States: System first, then Integration (Entity)
  const [systemKey, setSystemKey] = useState<string>(() => Object.keys(systemCatalog)[0] || 'collection');
  const [selectedSector, setSelectedSector] = useState<string>(() => {
    const firstSys = Object.values(systemCatalog)[0];
    if (firstSys?.integrations) {
      return Object.keys(firstSys.integrations)[0] || 'banking';
    }
    return 'banking';
  });
  const [direction, setDirection] = useState<IntegrationDirection>('INBOUND');
  const [selectedChannels, setSelectedChannels] = useState<ClientChannel[]>(['CORE_SERVER', 'MOBILE']);
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

  // Copy & Format Interactive State
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleFormatJson = (setter: React.Dispatch<React.SetStateAction<string>>, currentVal: string) => {
    try {
      const parsed = JSON.parse(currentVal);
      setter(JSON.stringify(parsed, null, 2));
    } catch {
      // Keep untouched if invalid JSON
    }
  };

  // Import State
  const [importInputType, setImportInputType] = useState<'upload' | 'paste'>('upload');
  const [pastedContent, setPastedContent] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedImportResult | null>(null);
  const [importTargetSector, setImportTargetSector] = useState('banking');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Apply Quick Presets
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

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newEndpoint: Endpoint = {
      id: `ep_user_${Date.now()}`,
      method: method,
      path: endpointPath,
      shortName: shortName || endpointPath.split('/').filter(Boolean).pop() || 'endpoint',
      desc: description || serviceTitle || 'مسار موثق ومضاف حديثاً',
      descEn: isEn ? description : (shortName ? `${shortName} API service` : 'Newly documented endpoint'),
      isDraft: true,
      systemKey: systemKey,
      direction: direction,
      channels: selectedChannels,
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
          rule: 'صلاحية المفتاح 24 ساعة لمنع تكرار القيد',
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

    onAddEndpoint(selectedSector, newEndpoint, false, systemKey);
  };

  // =========================================================================
  // TEMPLATE GENERATORS & DOWNLOAD HANDLERS
  // =========================================================================
  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSingleJsonTemplate = () => {
    const template = {
      $schema: "https://api.gov.fintech/schemas/v1/ultimate-pay-spec.json",
      version: "v2026.2",
      sector: "banking",
      service: {
        title: "خدمة التحويل المالي اللحظي (Instant Credit Transfer)",
        code: "INSTANT_TRANSFER",
        baseUrl: "https://api.gov.fintech/v1/payments"
      },
      endpoint: {
        method: "POST",
        path: "/v1/payments/transfers/instant",
        shortName: "instant-transfer",
        description: "تنفيذ وتأكيد الحوالات المالية الفورية بين المصارف وفق القواعد الرقابية للبنك المركزي.",
        headers: [
          {
            name: "Authorization",
            type: "string (Bearer)",
            req: true,
            rule: "OAuth 2.0 Token FAPI 1.0 Advanced",
            tag: "Security"
          },
          {
            name: "X-Idempotency-Key",
            type: "string (UUIDv4)",
            req: true,
            rule: "مفتاح فريد لمنع ازدواجية الخصم",
            tag: "Idempotency"
          }
        ],
        businessRules: [
          {
            id: "BR_IPS_001",
            name: "التحقق من كفاية الرصيد وعدم تجاوز سقف الحوالة اللحظية (20,000 ريال)",
            err: "LIMIT_EXCEEDED_422"
          }
        ],
        requestPayload: {
          debtorIban: "SA440000001234567890",
          creditorIban: "SA550000009876543210",
          amount: 1500.00,
          currency: "SAR",
          remittancePurpose: "FAMILY_AID"
        },
        responses: {
          "200": {
            status: "SUCCESS",
            transactionId: "TXN-2026-998811",
            clearingCode: "IPS_SETTLED_00",
            timestamp: "2026-10-12T12:00:00Z"
          },
          "422": {
            error: "UNPROCESSABLE_ENTITY",
            code: "LIMIT_EXCEEDED_422",
            message: "Amount exceeds maximum permitted single transaction limit."
          }
        }
      }
    };
    downloadFile(JSON.stringify(template, null, 2), 'ultimate-endpoint-template.json', 'application/json');
  };

  const downloadBulkJsonTemplate = () => {
    const template = {
      $schema: "https://api.gov.fintech/schemas/v1/ultimate-pay-bulk.json",
      version: "v2026.2",
      sector: "banking",
      endpoints: [
        {
          method: "POST",
          path: "/v1/payments/transfers/instant",
          shortName: "instant-transfer",
          description: "تنفيذ وتأكيد الحوالات المالية الفورية بين المصارف المعتمدة.",
          headers: [
            { name: "Authorization", type: "string (Bearer)", req: true, rule: "OAuth 2.0 FAPI 1.0", tag: "Security" }
          ],
          businessRules: [
            { id: "BR_TRANSFER_01", name: "التحقق من رصيد الحساب وسقف الحوالة", err: "LIMIT_EXCEEDED_422" }
          ],
          requestPayload: { debtorIban: "SA44...", creditorIban: "SA55...", amount: 500, currency: "SAR" },
          responses: {
            "200": { status: "SUCCESS", txnId: "TXN-001" },
            "422": { error: "LIMIT_EXCEEDED" }
          }
        },
        {
          method: "GET",
          path: "/v1/accounts/statements/latest",
          shortName: "account-statement",
          description: "استرجاع كشف الحساب المصرفي اللحظي للعميل.",
          headers: [
            { name: "Authorization", type: "string (Bearer)", req: true, rule: "OAuth 2.0 FAPI 1.0", tag: "Security" }
          ],
          businessRules: [
            { id: "BR_STMT_01", name: "صلاحية تفويض العميل المفتوحة للخدمة", err: "CONSENT_EXPIRED_422" }
          ],
          responses: {
            "200": { status: "SUCCESS", transactions: [] },
            "422": { error: "CONSENT_EXPIRED" }
          }
        }
      ]
    };
    downloadFile(JSON.stringify(template, null, 2), 'ultimate-bulk-sector-template.json', 'application/json');
  };

  const downloadOpenApiYamlTemplate = () => {
    const yaml = `openapi: 3.1.0
info:
  title: Ultimate Pay National Banking API
  version: 2026.2.0
  description: Official OpenAPI 3.1 Specification for National Financial Services.
servers:
  - url: https://api.gov.fintech/v1
paths:
  /payments/transfers/instant:
    post:
      summary: Instant Clearing Credit Transfer
      operationId: instantTransfer
      description: Execute instant bank-to-bank credit transfer complying with SARIE IPS.
      parameters:
        - name: Authorization
          in: header
          required: true
          schema:
            type: string
          description: Bearer OAuth 2.0 FAPI 1.0 Token
        - name: X-Idempotency-Key
          in: header
          required: true
          schema:
            type: string
          description: UUIDv4 idempotency key
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                debtorIban: { type: string }
                creditorIban: { type: string }
                amount: { type: number }
                currency: { type: string, default: "SAR" }
      responses:
        '200':
          description: Transfer executed successfully
          content:
            application/json:
              example:
                status: "SUCCESS"
                transactionId: "TXN-2026-99"
        '422':
          description: Business Rule Violation
          content:
            application/json:
              example:
                error: "LIMIT_EXCEEDED_422"
`;
    downloadFile(yaml, 'openapi-3.1-template.yaml', 'text/yaml');
  };

  const downloadPostmanJsonTemplate = () => {
    const postman = {
      info: {
        _postman_id: "c8e27f12-0011-44aa-99bb-1234567890ab",
        name: "Ultimate Pay Banking Suite (Postman Collection)",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      item: [
        {
          name: "Instant Credit Transfer",
          request: {
            method: "POST",
            header: [
              { key: "Authorization", value: "Bearer {{token}}", type: "text" },
              { key: "Content-Type", value: "application/json", type: "text" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ debtorIban: "SA440000001234567890", amount: 2000, currency: "SAR" }, null, 2)
            },
            url: {
              raw: "https://api.gov.fintech/v1/payments/transfers/instant",
              protocol: "https",
              host: ["api", "gov", "fintech"],
              path: ["v1", "payments", "transfers", "instant"]
            },
            description: "Execute instant interbank payment transfer."
          },
          response: [
            {
              name: "200 OK Response",
              code: 200,
              body: JSON.stringify({ status: "SUCCESS", transactionId: "TXN-001" }, null, 2)
            }
          ]
        }
      ]
    };
    downloadFile(JSON.stringify(postman, null, 2), 'postman-collection-template.json', 'application/json');
  };

  // =========================================================================
  // UNIVERSAL PARSER & DETECTION ENGINE
  // =========================================================================
  const parseUniversalContent = (content: string, fileName = '') => {
    const trimmed = content.trim();
    if (!trimmed) return null;

    // 1. Try parsing JSON
    let json: any = null;
    try {
      json = JSON.parse(trimmed);
    } catch {
      // not JSON
    }

    if (json) {
      // A. Postman Collection v2.x
      if (json.info && Array.isArray(json.item)) {
        const endpoints: Endpoint[] = [];
        json.item.forEach((item: any, idx: number) => {
          if (item.request) {
            const rawUrl = typeof item.request.url === 'string'
              ? item.request.url
              : (item.request.url?.raw || '/' + (item.request.url?.path || []).join('/'));
            const pathMatch = rawUrl.match(/(https?:\/\/[^\/]+)?(\/.*)?$/);
            const path = pathMatch?.[2] || rawUrl || `/v1/postman/item-${idx + 1}`;

            endpoints.push({
              id: `ep_postman_${Date.now()}_${idx}`,
              method: (item.request.method || 'POST').toUpperCase() as HttpMethod,
              path: path.startsWith('/') ? path : '/' + path,
              shortName: item.name ? item.name.toLowerCase().replace(/\s+/g, '-') : `endpoint-${idx + 1}`,
              desc: item.request.description || item.name || 'Postman Collection imported endpoint',
              descEn: item.name || 'Postman Collection imported endpoint',
              isDraft: true,
              params: Array.isArray(item.request.header) ? item.request.header.map((h: any) => ({
                name: h.key,
                type: 'string',
                req: true,
                rule: h.description || 'Mandatory Request Header',
                tag: 'Header'
              })) : [
                { name: 'Authorization', type: 'string (Bearer)', req: true, rule: 'OAuth 2.0 FAPI 1.0', tag: 'Security' }
              ],
              rules: [
                { id: `BR_POSTMAN_${idx + 1}`, name: 'مطابقة ضوابط الاستدعاء المنقولة من Postman', err: 'VALIDATION_FAILED_422' }
              ],
              payload: item.request.body?.raw || '{\n  "status": "SAMPLE"\n}',
              res200: item.response?.[0]?.body || '{\n  "status": "SUCCESS"\n}',
              res422: '{\n  "error": "UNPROCESSABLE_ENTITY"\n}',
              curl: `curl -X ${item.request.method || 'POST'} "https://api.gov.fintech${path}"`
            });
          }
        });

        if (endpoints.length > 0) {
          return { format: 'Postman Collection v2.1', endpoints, sourceName: fileName || 'Postman Collection' };
        }
      }

      // B. Ultimate Pay Bulk Package
      if (Array.isArray(json.endpoints)) {
        const endpoints: Endpoint[] = json.endpoints.map((ep: any, idx: number) => ({
          id: `ep_bulk_${Date.now()}_${idx}`,
          method: (ep.method || 'POST').toUpperCase() as HttpMethod,
          path: ep.path || `/v1/service/endpoint-${idx + 1}`,
          shortName: ep.shortName || `service-${idx + 1}`,
          desc: ep.desc || ep.description || 'مواصفة مستوردة من حزمة القطاع',
          descEn: ep.descEn || ep.shortName || 'Imported bulk package endpoint',
          isDraft: true,
          params: ep.headers || ep.params || [
            { name: 'Authorization', type: 'string (Bearer)', req: true, rule: 'OAuth 2.0 FAPI 1.0', tag: 'Security' }
          ],
          rules: ep.businessRules || ep.rules || [
            { id: `BR_BULK_${idx + 1}`, name: 'مطابقة القواعد الرقابية المعتمدة', err: 'RULE_VIOLATION_422' }
          ],
          payload: typeof ep.requestPayload === 'object' ? JSON.stringify(ep.requestPayload, null, 2) : (ep.payload || '{}'),
          res200: typeof ep.responses?.['200'] === 'object' ? JSON.stringify(ep.responses['200'], null, 2) : (ep.res200 || '{\n  "status": "SUCCESS"\n}'),
          res422: typeof ep.responses?.['422'] === 'object' ? JSON.stringify(ep.responses['422'], null, 2) : (ep.res422 || '{\n  "error": "RULE_VIOLATION"\n}'),
          curl: `curl -X ${ep.method || 'POST'} "https://api.gov.fintech${ep.path || ''}"`
        }));
        return { format: 'Ultimate Pay Bulk Package JSON', endpoints, suggestedSector: json.sector, sourceName: fileName || 'Bulk Package' };
      }

      // C. Ultimate Pay Single Endpoint
      if (json.endpoint) {
        const ep = json.endpoint;
        const endpoint: Endpoint = {
          id: `ep_single_${Date.now()}`,
          method: (ep.method || 'POST').toUpperCase() as HttpMethod,
          path: ep.path || '/v1/service/endpoint',
          shortName: ep.shortName || 'endpoint',
          desc: ep.desc || ep.description || (json.service?.title) || 'مواصفة مسار مستوردة من القالب',
          descEn: ep.descEn || ep.shortName || 'Imported single endpoint specification',
          isDraft: true,
          params: ep.headers || ep.params || [
            { name: 'Authorization', type: 'string (Bearer)', req: true, rule: 'OAuth 2.0 FAPI 1.0', tag: 'Security' }
          ],
          rules: ep.businessRules || ep.rules || [
            { id: 'BR_IMPORT_001', name: 'مطابقة القواعد الرقابية', err: 'VALIDATION_FAILED_422' }
          ],
          payload: typeof ep.requestPayload === 'object' ? JSON.stringify(ep.requestPayload, null, 2) : (ep.payload || '{}'),
          res200: typeof ep.responses?.['200'] === 'object' ? JSON.stringify(ep.responses['200'], null, 2) : (ep.res200 || '{\n  "status": "SUCCESS"\n}'),
          res422: typeof ep.responses?.['422'] === 'object' ? JSON.stringify(ep.responses['422'], null, 2) : (ep.res422 || '{\n  "error": "VALIDATION_ERROR"\n}'),
          curl: `curl -X ${ep.method || 'POST'} "https://api.gov.fintech${ep.path || ''}"`
        };
        return { format: 'Ultimate Pay Spec JSON', endpoints: [endpoint], suggestedSector: json.sector, sourceName: fileName || 'Single Endpoint' };
      }

      // D. OpenAPI / Swagger JSON
      if (json.openapi || json.swagger || json.paths) {
        const endpoints: Endpoint[] = [];
        let idx = 0;
        const pathsObj = json.paths || {};
        for (const [pathKey, methodsObj] of Object.entries(pathsObj)) {
          if (typeof methodsObj === 'object' && methodsObj !== null) {
            for (const [methodKey, opObj] of Object.entries(methodsObj as any)) {
              if (['get', 'post', 'put', 'delete', 'patch'].includes(methodKey.toLowerCase())) {
                const op = opObj as any;
                endpoints.push({
                  id: `ep_openapi_${Date.now()}_${idx++}`,
                  method: methodKey.toUpperCase() as HttpMethod,
                  path: pathKey,
                  shortName: op.operationId || op.summary?.toLowerCase().replace(/\s+/g, '-') || pathKey.split('/').filter(Boolean).pop() || `ep-${idx}`,
                  desc: op.description || op.summary || `OpenAPI specification for ${pathKey}`,
                  descEn: op.summary || op.description || `OpenAPI specification for ${pathKey}`,
                  isDraft: true,
                  params: [
                    { name: 'Authorization', type: 'string (Bearer)', req: true, rule: 'OAuth 2.0 FAPI 1.0', tag: 'Security', tagClass: 'badge-iso' }
                  ],
                  rules: [
                    { id: `BR_OPENAPI_${idx}`, name: 'مطابقة معايير OpenAPI الوطنية', err: 'VALIDATION_FAILED_422' }
                  ],
                  payload: op.requestBody ? '{\n  "sample": "data"\n}' : undefined,
                  res200: '{\n  "status": "SUCCESS"\n}',
                  res422: '{\n  "error": "SCHEMA_VIOLATION"\n}',
                  curl: `curl -X ${methodKey.toUpperCase()} "https://api.gov.fintech${pathKey}"`
                });
              }
            }
          }
        }
        if (endpoints.length > 0) {
          return { format: `OpenAPI ${json.openapi || '3.x'} JSON`, endpoints, sourceName: fileName || 'OpenAPI Spec' };
        }
      }
    }

    // 2. cURL Command Extraction
    if (trimmed.toLowerCase().includes('curl')) {
      const methodMatch = trimmed.match(/-X\s+([A-Z]+)/i);
      const method = (methodMatch ? methodMatch[1].toUpperCase() : (trimmed.includes('-d') ? 'POST' : 'GET')) as HttpMethod;
      const urlMatch = trimmed.match(/["']?(https?:\/\/[^\s"']+|(?<=\s)\/[^\s"']+)/);
      const fullUrl = urlMatch ? urlMatch[0].replace(/["']/g, '') : '/v1/api/endpoint';
      let path = fullUrl;
      try {
        if (fullUrl.startsWith('http')) {
          const u = new URL(fullUrl);
          path = u.pathname;
        }
      } catch {}

      const dataMatch = trimmed.match(/(-d|--data|--data-raw)\s+['"]({.*?})['"]/s);
      const payload = dataMatch ? dataMatch[2] : (method !== 'GET' ? '{\n  "status": "sample"\n}' : undefined);

      const endpoint: Endpoint = {
        id: `ep_curl_${Date.now()}`,
        method: method,
        path: path.startsWith('/') ? path : '/' + path,
        shortName: path.split('/').filter(Boolean).pop() || 'curl-endpoint',
        desc: 'مسار مستورد ومترجم آلياً من أمر cURL',
        descEn: 'Endpoint auto-extracted from raw cURL command',
        isDraft: true,
        params: [
          { name: 'Authorization', type: 'string (Bearer)', req: true, rule: 'Extracted from cURL Authorization Header', tag: 'Security', tagClass: 'badge-iso' }
        ],
        rules: [{ id: 'BR_CURL_001', name: 'التحقق من صحة بروتوكول cURL', err: 'INVALID_REQUEST_422' }],
        payload: payload,
        res200: '{\n  "status": "SUCCESS"\n}',
        res422: '{\n  "error": "UNPROCESSABLE_ENTITY"\n}',
        curl: trimmed
      };
      return { format: 'cURL Command Extraction', endpoints: [endpoint], sourceName: 'cURL Command' };
    }

    // 3. OpenAPI YAML extraction
    if (trimmed.includes('openapi:') || trimmed.includes('paths:')) {
      const pathMatches = [...trimmed.matchAll(/(^\s*|\n)(\/[a-zA-Z0-9_\-\/\{\}]+):/g)];
      if (pathMatches.length > 0) {
        const endpoints: Endpoint[] = pathMatches.map((m, idx) => ({
          id: `ep_yaml_${Date.now()}_${idx}`,
          method: 'POST' as HttpMethod,
          path: m[2],
          shortName: m[2].split('/').filter(Boolean).pop() || `ep-${idx + 1}`,
          desc: `مسار OpenAPI YAML مستورد: ${m[2]}`,
          descEn: `Imported OpenAPI YAML route: ${m[2]}`,
          isDraft: true,
          params: [{ name: 'Authorization', type: 'string (Bearer)', req: true, rule: 'OAuth 2.0 FAPI 1.0', tag: 'Security', tagClass: 'badge-iso' }],
          rules: [{ id: `BR_YAML_${idx + 1}`, name: 'مطابقة مواصفة YAML', err: 'VALIDATION_FAILED_422' }],
          payload: '{\n  "sample": true\n}',
          res200: '{\n  "status": "SUCCESS"\n}',
          res422: '{\n  "error": "INVALID_YAML_SPEC"\n}',
          curl: `curl -X POST "https://api.gov.fintech${m[2]}"`
        }));
        return { format: 'OpenAPI 3.1 YAML', endpoints, sourceName: fileName || 'OpenAPI YAML' };
      }
    }

    return null;
  };

  // Handle File Input or Drag Drop
  const processUploadedFile = (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      setIsProcessing(false);
      const text = e.target?.result as string;
      const res = parseUniversalContent(text, file.name);
      if (res) {
        setParsedResult(res);
        if (res.suggestedSector && sectors[res.suggestedSector]) {
          setImportTargetSector(res.suggestedSector);
        }
      } else {
        alert(isEn ? 'Could not parse file. Please verify it is valid JSON, YAML, or cURL.' : 'تعذر قراءة الملف. يرجى التأكد من أنه ملف JSON أو YAML أو أمر cURL صالح.');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handlePasteAnalyze = () => {
    if (!pastedContent.trim()) return;
    const res = parseUniversalContent(pastedContent, 'Pasted Code');
    if (res) {
      setParsedResult(res);
      if (res.suggestedSector && sectors[res.suggestedSector]) {
        setImportTargetSector(res.suggestedSector);
      }
    } else {
      alert(isEn ? 'Could not recognize content format.' : 'لم يتم التعرف على صيغة النص المدخل. يرجى التأكد من هيكل الـ JSON أو YAML أو الـ cURL.');
    }
  };

  const handleConfirmImport = () => {
    if (!parsedResult || parsedResult.endpoints.length === 0) return;
    onAddEndpoint(importTargetSector, parsedResult.endpoints, true);
    setParsedResult(null);
    setPastedContent('');
  };

  // Helper to check if an endpoint already exists in selected target sector
  const isExistingEndpoint = (ep: Endpoint) => {
    const sec = sectors[importTargetSector];
    if (!sec) return false;
    for (const srv of Object.values(sec.services)) {
      if (srv.endpoints.some(e => e.path.toLowerCase() === ep.path.toLowerCase() && e.method === ep.method)) {
        return true;
      }
    }
    return false;
  };

  return (
    <div className="add-api-layout">
      {/* 1. Header Banner with Sovereign Mode Switcher */}
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
            {activeMode === 'manual' ? <Route size={22} /> : <UploadCloud size={22} />}
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', margin: 0, lineHeight: 1.3 }}>
              {activeMode === 'manual' ? t('docHub.pageTitle') : t('docHub.modeImport')}
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
              {activeMode === 'manual' ? t('docHub.pageSubtitle') : t('docHub.importSectionSub')}
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs (Manual Form vs Universal Import) */}
        <div className="doc-mode-selector">
          <button
            type="button"
            className={`doc-mode-btn ${activeMode === 'manual' ? 'active' : ''}`}
            onClick={() => setActiveMode('manual')}
          >
            <PenTool size={14} />
            <span>{t('docHub.modeManual')}</span>
          </button>
          <button
            type="button"
            className={`doc-mode-btn ${activeMode === 'import' ? 'active' : ''}`}
            onClick={() => setActiveMode('import')}
          >
            <UploadCloud size={14} />
            <span>{t('docHub.modeImport')}</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          MODE 1: STRUCTURED MANUAL BUILDER (2-COLUMN GRID)
          ===================================================================== */}
      {activeMode === 'manual' && (
        <>
          {/* Quick Presets Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1.25rem',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <Sparkles size={15} color="var(--amber)" />
              <span style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 700 }}>
                {t('docHub.quickPresets')}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
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

          {/* Main 2-Column Split Form */}
          <form onSubmit={handleManualSubmit} className="add-api-form-grid">
            {/* Column 1: Specification & Route Configuration */}
            <div className="add-api-card">
              {/* SECTION 1: Service Identity & Governance */}
              <div className="add-api-card-title">
                <Building2 size={18} color="var(--blue)" />
                <span>1. {isEn ? 'Core System & Service Definition' : 'البيانات الأساسية وتصنيف الخدمة'}</span>
                <span className="mono badge-pill badge-blue" style={{ marginInlineStart: 'auto', fontSize: '0.70rem' }}>
                  {systemCatalog[systemKey]?.code || 'SYS'}
                </span>
              </div>

              {/* Row 1: Core System & Target Integration Entity */}
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">
                    <span>{isRtl ? 'النظام البرمجي المركزي المسؤول:' : 'Core Responsible System:'}</span>
                  </label>
                  <select
                    value={systemKey}
                    onChange={(e) => {
                      const newSysKey = e.target.value;
                      setSystemKey(newSysKey);
                      const sysObj = systemCatalog[newSysKey];
                      if (sysObj?.integrations) {
                        const firstInt = Object.keys(sysObj.integrations)[0];
                        if (firstInt) setSelectedSector(firstInt);
                      }
                    }}
                    className="form-control"
                  >
                    {Object.entries(systemCatalog).map(([k, sys]) => (
                      <option key={k} value={k}>
                        {getLocalized({ ar: sys.name, en: sys.nameEn }, sys.name)} ({sys.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>{isRtl ? 'جهة التكامل والربط المستهدفة:' : 'Target Integrated Entity:'}</span>
                  </label>
                  <select
                    value={selectedSector}
                    onChange={(e) => setSelectedSector(e.target.value)}
                    className="form-control"
                  >
                    {systemCatalog[systemKey]?.integrations ? (
                      Object.entries(systemCatalog[systemKey].integrations).map(([k, intItem]: [string, any]) => (
                        <option key={k} value={k}>
                          {getLocalized({ ar: intItem.name, en: intItem.nameEn }, intItem.name)}
                        </option>
                      ))
                    ) : (
                      Object.entries(sectors).map(([key, s]) => (
                        <option key={key} value={key}>
                          {getLocalized({ ar: s.name, en: s.nameEn }, s.name)} ({s.code})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Multi-Dimensional Governance Matrix (SOLID Architecture) */}
              <div className="governance-matrix-box">
                <div className="governance-matrix-header">
                  <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={14} />
                    <span>{isEn ? 'Governance Multi-Dimensional Matrix (SOLID)' : 'مصفوفة الحوكمة وتصنيف الأنظمة والقنوات (SOLID)'}</span>
                  </div>
                  <span className="mono badge-pill badge-cyan" style={{ fontSize: '0.66rem' }}>
                    {direction} • {selectedChannels.length} {isEn ? 'Channels' : 'قنوات'}
                  </span>
                </div>

                {/* Integration Direction Switcher */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>
                    {isEn ? 'Integration Direction & Topology:' : 'اتجاه التكامل والربط المعماري:'}
                  </label>
                  <div className="governance-direction-toggle">
                    <button
                      type="button"
                      onClick={() => setDirection('INBOUND')}
                      className={`governance-direction-btn ${direction === 'INBOUND' ? 'active-inbound' : ''}`}
                    >
                      <ArrowDownLeft size={13} />
                      <span>{isEn ? 'Inbound (They consume us)' : 'وارد (تربط معنا)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection('OUTBOUND')}
                      className={`governance-direction-btn ${direction === 'OUTBOUND' ? 'active-outbound' : ''}`}
                    >
                      <ArrowUpRight size={13} />
                      <span>{isEn ? 'Outbound (We consume them)' : 'صادر (نربط معها)'}</span>
                    </button>
                  </div>
                </div>

                {/* Targeted Client Channels (ISP Segregation) */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>
                    {isEn ? 'Target Client Channels (ISP Segregation):' : 'قنوات الاستهلاك المستهدفة (ISP Segregation):'}
                  </label>
                  <div className="governance-channels-row">
                    {[
                      { key: 'MOBILE' as ClientChannel, label: isEn ? 'Mobile App (SDK)' : 'تطبيقات الموبايل 📱' },
                      { key: 'CORE_SERVER' as ClientChannel, label: isEn ? 'Banking Core Server' : 'الخوادم البنكية المركزية 🖥️' },
                      { key: 'WEB' as ClientChannel, label: isEn ? 'Web Portal' : 'بوابة الويب 🌐' }
                    ].map(ch => {
                      const isChecked = selectedChannels.includes(ch.key);
                      return (
                        <button
                          key={ch.key}
                          type="button"
                          onClick={() => {
                            setSelectedChannels(prev => 
                              prev.includes(ch.key) 
                                ? (prev.length > 1 ? prev.filter(c => c !== ch.key) : prev)
                                : [...prev, ch.key]
                            );
                          }}
                          className={`governance-channel-chip ${isChecked ? 'active' : ''}`}
                        >
                          {isChecked ? <Check size={11} /> : null}
                          <span>{ch.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Service Titles & Identifiers */}
              <div className="form-grid-2">
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
              </div>

              {/* Base URL with Copy Button & Live Preview */}
              <div className="form-group">
                <label className="form-label">
                  <span>{t('docHub.baseUrlLabel')}</span>
                  <span className="mono" style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    {baseUrl}{endpointPath}
                  </span>
                </label>
                <div className="composite-url-field">
                  <div className="composite-url-prefix">
                    <Globe size={13} style={{ marginInlineEnd: '4px' }} />
                    <span>URL</span>
                  </div>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className="composite-url-input"
                    dir="ltr"
                    placeholder="https://api.gov.fintech/v1"
                  />
                  <button
                    type="button"
                    className={`composite-url-copy ${copiedId === 'baseUrl' ? 'copied' : ''}`}
                    onClick={() => handleCopy(`${baseUrl}${endpointPath}`, 'baseUrl')}
                    title="نسخ الرابط الكامل"
                  >
                    {copiedId === 'baseUrl' ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedId === 'baseUrl' ? (isEn ? 'Copied' : 'تم النسخ') : (isEn ? 'Copy' : 'نسخ')}</span>
                  </button>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '0.2rem 0' }} />

              {/* SECTION 2: Route Path & HTTP Operation */}
              <div className="add-api-card-title">
                <Route size={18} color="var(--emerald)" />
                <span>2. {isEn ? 'Route Path & HTTP Operation' : 'مواصفة المسار وعملية الـ HTTP'}</span>
              </div>

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
                  rows={2}
                  style={{ minHeight: '65px', resize: 'vertical' }}
                />
              </div>
            </div>

            {/* Column 2: Sticky Live Wire Sandbox (Payloads & Responses) */}
            <div className="add-api-card sticky-sandbox">
              <div className="add-api-card-title">
                <Code2 size={18} color="var(--primary)" />
                <span>{isEn ? 'Live Wire Sandbox (Payload & Responses)' : 'نماذج البيانات والاستجابة (Wire Sandbox)'}</span>
                <span className="mono badge-pill badge-blue" style={{ marginInlineStart: 'auto', fontSize: '0.68rem' }}>
                  application/json
                </span>
              </div>

              {/* Request Body Editor with Tools */}
              <div className="form-group">
                <div className="sandbox-editor-wrapper">
                  <div className="sandbox-editor-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#f1f5f9' }}>
                        {isEn ? 'Request Payload Model' : 'نموذج بيانات الطلب (Payload)'}
                      </span>
                      <span className="mono badge-pill badge-blue" style={{ fontSize: '0.64rem' }}>
                        {method === 'GET' ? 'N/A' : 'Schema JSON'}
                      </span>
                    </div>
                    {method !== 'GET' && (
                      <div className="sandbox-editor-tools">
                        <button
                          type="button"
                          className="sandbox-tool-btn"
                          onClick={() => handleFormatJson(setReqBody, reqBody)}
                          title="تنسيق الكود تلقائياً"
                        >
                          <Wand2 size={11} />
                          <span>تنسيق</span>
                        </button>
                        <button
                          type="button"
                          className={`sandbox-tool-btn ${copiedId === 'reqBody' ? 'copied' : ''}`}
                          onClick={() => handleCopy(reqBody, 'reqBody')}
                          title="نسخ المحتوى"
                        >
                          {copiedId === 'reqBody' ? <Check size={11} /> : <Copy size={11} />}
                          <span>{copiedId === 'reqBody' ? 'تم النسخ' : 'نسخ'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <textarea
                    value={reqBody}
                    onChange={(e) => setReqBody(e.target.value)}
                    className="add-api-code-editor"
                    style={{ minHeight: '100px' }}
                    disabled={method === 'GET'}
                  />
                </div>
              </div>

              {/* 200 OK Response Editor with Tools */}
              <div className="form-group">
                <div className="sandbox-editor-wrapper">
                  <div className="sandbox-editor-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--emerald)' }}>
                        {isEn ? 'Success Response Model' : 'الاستجابة الناجحة المعتمدة'}
                      </span>
                      <span className="badge-pill badge-emerald" style={{ fontSize: '0.64rem', padding: '0.12rem 0.45rem' }}>
                        200 OK
                      </span>
                    </div>
                    <div className="sandbox-editor-tools">
                      <button
                        type="button"
                        className="sandbox-tool-btn"
                        onClick={() => handleFormatJson(setRes200, res200)}
                        title="تنسيق الكود تلقائياً"
                      >
                        <Wand2 size={11} />
                        <span>تنسيق</span>
                      </button>
                      <button
                        type="button"
                        className={`sandbox-tool-btn ${copiedId === 'res200' ? 'copied' : ''}`}
                        onClick={() => handleCopy(res200, 'res200')}
                        title="نسخ المحتوى"
                      >
                        {copiedId === 'res200' ? <Check size={11} /> : <Copy size={11} />}
                        <span>{copiedId === 'res200' ? 'تم النسخ' : 'نسخ'}</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={res200}
                    onChange={(e) => setRes200(e.target.value)}
                    className="add-api-code-editor"
                    style={{ minHeight: '105px' }}
                  />
                </div>
              </div>

              {/* 422 Unprocessable Response Editor with Tools */}
              <div className="form-group">
                <div className="sandbox-editor-wrapper">
                  <div className="sandbox-editor-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--rose)' }}>
                        {isEn ? 'Validation Error Model' : 'استجابة الرفض ومطابقة الأخطاء'}
                      </span>
                      <span className="badge-pill badge-rose" style={{ fontSize: '0.64rem', padding: '0.12rem 0.45rem' }}>
                        422 Rejected
                      </span>
                    </div>
                    <div className="sandbox-editor-tools">
                      <button
                        type="button"
                        className="sandbox-tool-btn"
                        onClick={() => handleFormatJson(setRes422, res422)}
                        title="تنسيق الكود تلقائياً"
                      >
                        <Wand2 size={11} />
                        <span>تنسيق</span>
                      </button>
                      <button
                        type="button"
                        className={`sandbox-tool-btn ${copiedId === 'res422' ? 'copied' : ''}`}
                        onClick={() => handleCopy(res422, 'res422')}
                        title="نسخ المحتوى"
                      >
                        {copiedId === 'res422' ? <Check size={11} /> : <Copy size={11} />}
                        <span>{copiedId === 'res422' ? 'تم النسخ' : 'نسخ'}</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={res422}
                    onChange={(e) => setRes422(e.target.value)}
                    className="add-api-code-editor"
                    style={{ minHeight: '85px' }}
                  />
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="add-api-action-bar">
                <div className="add-api-action-status">
                  <span className="status-pulse-dot" />
                  <span>{isEn ? 'Schema Validated' : 'المواصفة جاهزة للاعتماد'}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <button type="button" className="btn btn-ghost" onClick={handleReset} style={{ fontSize: '0.80rem' }}>
                    <RotateCcw size={14} />
                    <span>{t('docHub.resetButton')}</span>
                  </button>

                  <button type="submit" className="btn btn-emerald" style={{ padding: '0.6rem 1.45rem', fontSize: '0.86rem', fontWeight: 700 }}>
                    <CloudUpload size={17} />
                    <span>{t('docHub.submitButton')}</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </>
      )}

      {/* =====================================================================
          MODE 2: UNIVERSAL IMPORT & TEMPLATES ENGINE (NO LIMITS, ANY FORMAT)
          ===================================================================== */}
      {activeMode === 'import' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* SECTION 1: DOWNLOAD BLANK TEMPLATES */}
          <div className="add-api-card">
            <div className="add-api-card-title">
              <Download size={18} color="var(--blue)" />
              <span>{t('docHub.templatesSectionTitle')}</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '-0.3rem 0 0.5rem' }}>
              {t('docHub.templatesSectionSub')}
            </p>

            <div className="template-cards-grid">
              {/* Template 1: Single JSON */}
              <div className="template-card">
                <div className="template-card-top">
                  <div className="template-icon-box" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                    <FileCode size={18} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: '#ffffff', display: 'block' }}>
                      {t('docHub.tplSingleJson')}
                    </strong>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.4, display: 'block', marginTop: '0.2rem' }}>
                      {t('docHub.tplSingleJsonDesc')}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={downloadSingleJsonTemplate}
                  style={{ width: '100%', fontSize: '0.75rem', padding: '0.35rem', borderColor: 'rgba(56, 189, 248, 0.3)', color: '#38bdf8' }}
                >
                  <Download size={13} />
                  <span>{t('docHub.btnDownloadTpl')} (.json)</span>
                </button>
              </div>

              {/* Template 2: Bulk Sector JSON */}
              <div className="template-card">
                <div className="template-card-top">
                  <div className="template-icon-box" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
                    <Layers size={18} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: '#ffffff', display: 'block' }}>
                      {t('docHub.tplBulkJson')}
                    </strong>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.4, display: 'block', marginTop: '0.2rem' }}>
                      {t('docHub.tplBulkJsonDesc')}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={downloadBulkJsonTemplate}
                  style={{ width: '100%', fontSize: '0.75rem', padding: '0.35rem', borderColor: 'rgba(168, 85, 247, 0.3)', color: '#a855f7' }}
                >
                  <Download size={13} />
                  <span>{t('docHub.btnDownloadTpl')} (Bulk .json)</span>
                </button>
              </div>

              {/* Template 3: OpenAPI 3.1 YAML */}
              <div className="template-card">
                <div className="template-card-top">
                  <div className="template-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                    <FileText size={18} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: '#ffffff', display: 'block' }}>
                      {t('docHub.tplOpenApiYaml')}
                    </strong>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.4, display: 'block', marginTop: '0.2rem' }}>
                      {t('docHub.tplOpenApiYamlDesc')}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={downloadOpenApiYamlTemplate}
                  style={{ width: '100%', fontSize: '0.75rem', padding: '0.35rem', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#10b981' }}
                >
                  <Download size={13} />
                  <span>{t('docHub.btnDownloadTpl')} (.yaml)</span>
                </button>
              </div>

              {/* Template 4: Postman Collection */}
              <div className="template-card">
                <div className="template-card-top">
                  <div className="template-icon-box" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                    <Terminal size={18} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: '#ffffff', display: 'block' }}>
                      {t('docHub.tplPostmanJson')}
                    </strong>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.4, display: 'block', marginTop: '0.2rem' }}>
                      {t('docHub.tplPostmanJsonDesc')}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={downloadPostmanJsonTemplate}
                  style={{ width: '100%', fontSize: '0.75rem', padding: '0.35rem', borderColor: 'rgba(245, 158, 11, 0.3)', color: '#f59e0b' }}
                >
                  <Download size={13} />
                  <span>{t('docHub.btnDownloadTpl')} (Postman .json)</span>
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 2: UNIVERSAL SPEC IMPORTER */}
          <div className="add-api-card">
            <div className="add-api-card-title">
              <UploadCloud size={18} color="var(--emerald)" />
              <span>{t('docHub.importSectionTitle')}</span>
              <div style={{ marginInlineStart: 'auto', display: 'flex', gap: '0.35rem' }}>
                <button
                  type="button"
                  className={`btn ${importInputType === 'upload' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setImportInputType('upload')}
                  style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem' }}
                >
                  {t('docHub.tabUploadFile')}
                </button>
                <button
                  type="button"
                  className={`btn ${importInputType === 'paste' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setImportInputType('paste')}
                  style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem' }}
                >
                  {t('docHub.tabPasteCode')}
                </button>
              </div>
            </div>

            {/* TAB A: Drag & Drop File */}
            {importInputType === 'upload' && (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".json,.yaml,.yml,.txt"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processUploadedFile(e.target.files[0]);
                    }
                  }}
                />
                <div
                  className={`universal-dropzone ${isDragging ? 'drag-active' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CloudUpload size={28} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '1rem', color: '#ffffff', display: 'block' }}>
                      {t('docHub.dropzoneTitle')}
                    </strong>
                    <span style={{ fontSize: '0.76rem', color: '#94a3b8', display: 'block', marginTop: '0.25rem' }}>
                      {t('docHub.dropzoneSub')}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ marginTop: '0.5rem', fontSize: '0.78rem', padding: '0.4rem 1.1rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    <span>{t('docHub.browseFileBtn')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB B: Paste Direct Code or cURL */}
            {importInputType === 'paste' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <textarea
                  value={pastedContent}
                  onChange={(e) => setPastedContent(e.target.value)}
                  placeholder={t('docHub.pastePlaceholder')}
                  className="add-api-code-editor"
                  style={{ minHeight: '170px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setPastedContent('')}
                    style={{ fontSize: '0.78rem' }}
                  >
                    <span>{t('common.cancel')}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handlePasteAnalyze}
                    disabled={!pastedContent.trim()}
                    style={{ fontSize: '0.80rem', padding: '0.45rem 1.25rem' }}
                  >
                    <Sparkles size={14} />
                    <span>{t('docHub.analyzeBtn')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: DETECTED SPECIFICATION PREVIEW & SMART BULK MAPPING */}
          {parsedResult && (
            <div className="detected-preview-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <CheckCircle2 size={20} color="var(--emerald)" />
                  <div>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                      {t('docHub.detectedTitle')}
                    </h3>
                    <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                      {parsedResult.sourceName || 'Imported Spec'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <span className="badge-pill badge-blue" style={{ fontSize: '0.75rem' }}>
                    {parsedResult.format}
                  </span>
                  <span className="badge-pill badge-emerald" style={{ fontSize: '0.75rem' }}>
                    {parsedResult.endpoints.length} {isEn ? 'Endpoints' : 'مسارات'}
                  </span>
                </div>
              </div>

              {/* Target Sector Selection */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                background: '#101c2e',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)'
              }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', flexShrink: 0 }}>
                  {t('docHub.detectedSectorLabel')}
                </label>
                <select
                  value={importTargetSector}
                  onChange={(e) => setImportTargetSector(e.target.value)}
                  className="form-control"
                  style={{ maxWidth: '350px' }}
                >
                  {Object.entries(sectors).map(([key, s]) => (
                    <option key={key} value={key}>
                      {getLocalized({ ar: s.name, en: s.nameEn }, s.name)} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Endpoints List */}
              <div className="detected-endpoints-list">
                {parsedResult.endpoints.map((ep, idx) => {
                  const isExisting = isExistingEndpoint(ep);
                  return (
                    <div key={idx} className="detected-endpoint-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span className={`method-badge method-${ep.method.toLowerCase()}`} style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                          {ep.method}
                        </span>
                        <span className="mono" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>
                          {ep.path}
                        </span>
                        <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                          ({ep.shortName})
                        </span>
                      </div>

                      <div>
                        {isExisting ? (
                          <span className="badge-pill badge-blue" style={{ fontSize: '0.68rem' }}>
                            {t('docHub.statusUpdate')}
                          </span>
                        ) : (
                          <span className="badge-pill badge-emerald" style={{ fontSize: '0.68rem' }}>
                            {t('docHub.statusNew')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Actions Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.35rem' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setParsedResult(null)}
                  style={{ fontSize: '0.80rem' }}
                >
                  <X size={14} />
                  <span>{t('docHub.btnClearImport')}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-emerald"
                  onClick={handleConfirmImport}
                  style={{ fontSize: '0.84rem', padding: '0.5rem 1.4rem' }}
                >
                  <Check size={16} />
                  <span>{t('docHub.btnConfirmImport', { count: parsedResult.endpoints.length })}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
