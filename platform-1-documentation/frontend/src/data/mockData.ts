import { Sector, ChangeRequest, RBACRole, SealedSnapshot } from '../types/schema';

export const INITIAL_SECTORS: Record<string, Sector> = {
  banking: {
    key: 'banking',
    name: 'البنوك والمصارف',
    code: 'SECTOR_FIN_BANKING',
    icon: 'fa-building-columns',
    services: {
      ips: {
        title: 'التحويل اللحظي (IPS)',
        code: 'IPS',
        baseUrl: 'https://api.gov.fintech/v1/ips',
        versions: ['v2026.2', 'v2026.1', 'v2025.4'],
        endpoints: [
          {
            id: 'ep_ips_01',
            method: 'POST',
            path: '/v1/transfers',
            shortName: 'transfers',
            desc: 'تنفيذ أمر تحويل بنكي فوري مطابق لسقف العمليات وضوابط المقاصة الوطنية.',
            params: [
              { name: 'sourceAccount', type: 'string (IBAN)', req: true, rule: 'صيغة الآيبان الوطني SA-IBAN', tag: 'PII', tagClass: 'badge-purple' },
              { name: 'destinationAccount', type: 'string (IBAN)', req: true, rule: 'التحقق من صحة المستفيد عبر الدليل الموحد', tag: 'PII', tagClass: 'badge-purple' },
              { name: 'amount', type: 'decimal', req: true, rule: 'الحد الأقصى للعملية الفردية: 50,000 ر.س', tag: 'Financial', tagClass: 'badge-emerald' },
              { name: 'currency', type: 'string (ISO-4217)', req: true, rule: 'SAR فقط', tag: 'ISO 20022', tagClass: 'badge-blue' },
              { name: 'idempotencyKey', type: 'string (UUID v4)', req: true, rule: 'صلاحية المفتاح 24 ساعة لمنع تكرار القيد المالي', tag: 'Idempotent', tagClass: 'badge-amber' }
            ],
            rules: [
              { id: 'BR_IPS_001', name: 'الحد الأقصى للتحويل 50,000 ريال', err: 'LIMIT_EXCEEDED_422' },
              { id: 'BR_IPS_002', name: 'منع التكرار بمفتاح IdempotencyKey', err: 'DUPLICATE_TXN_409' }
            ],
            payload: `{\n  "sourceAccount": "SA0380000000608010167519",\n  "destinationAccount": "SA4420000001234567890123",\n  "amount": 1500.00,\n  "currency": "SAR",\n  "idempotencyKey": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"\n}`,
            res200: `{\n  "status": "SUCCESS",\n  "transactionId": "TXN-88492019",\n  "clearingCode": "SA-IPS-CLR-01",\n  "settledAt": "2026-10-11T12:00:00Z"\n}`,
            res422: `{\n  "error": "UNPROCESSABLE_ENTITY",\n  "code": "LIMIT_EXCEEDED_422",\n  "message": "Transfer amount exceeds maximum threshold of 50,000 SAR."\n}`,
            curl: `curl -X POST "https://api.gov.fintech/v1/ips/transfers" \\\n  -H "Authorization: Bearer <TOKEN>" \\\n  -H "X-Idempotency-Key: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d" \\\n  -H "Content-Type: application/json" \\\n  -d '{"amount": 1500.00, "currency": "SAR"}'`
          },
          {
            id: 'ep_ips_02',
            method: 'GET',
            path: '/v1/transfers/{id}',
            shortName: 'status',
            desc: 'الاستعلام الفوري عن حالة المعالجة والتسوية النهائية للحوالة.',
            params: [
              { name: 'id', type: 'string (Path)', req: true, rule: 'معرف الحوالة الرقمي المقيد', tag: 'Audit Key', tagClass: 'badge-blue' }
            ],
            rules: [
              { id: 'BR_IPS_003', name: 'متاح الاستعلام حتى 90 يوماً من التنفيذ', err: 'TXN_NOT_FOUND_404' }
            ],
            payload: `// GET Request has no body`,
            res200: `{\n  "transactionId": "TXN-88492019",\n  "status": "SETTLED",\n  "settledAt": "2026-10-11T12:00:00Z"\n}`,
            res422: `{\n  "error": "NOT_FOUND",\n  "code": "TXN_NOT_FOUND_404",\n  "message": "Transaction identifier does not exist."\n}`,
            curl: `curl -X GET "https://api.gov.fintech/v1/ips/transfers/TXN-88492019" \\\n  -H "Authorization: Bearer <TOKEN>"`
          },
          {
            id: 'ep_ips_03',
            method: 'POST',
            path: '/v1/transfers/{id}/recall',
            shortName: 'recall',
            desc: 'طلب استرجاع رسمي للحوالة الخاطئة وفق اللائحة المنظمة لنظام المقاصة.',
            params: [
              { name: 'reasonCode', type: 'string', req: true, rule: 'رموز السبب: DUPL, TECH, FRUD', tag: 'Regulatory', tagClass: 'badge-amber' },
              { name: 'narrative', type: 'string', req: false, rule: 'شرح اختياري لسبب طلب الاسترجاع', tag: 'Audit', tagClass: 'badge-blue' }
            ],
            rules: [
              { id: 'BR_IPS_004', name: 'تقديم الطلب خلال أقل من ساعتين من وقت التنفيذ', err: 'RECALL_EXPIRED_422' }
            ],
            payload: `{\n  "reasonCode": "DUPL",\n  "narrative": "Duplicate payment triggered inadvertently"\n}`,
            res200: `{\n  "recallId": "RCL-9921",\n  "status": "PENDING_COUNTERPARTY"\n}`,
            res422: `{\n  "error": "RECALL_WINDOW_EXPIRED",\n  "code": "RECALL_EXPIRED_422",\n  "message": "Recall request submitted after permitted 2-hour window."\n}`,
            curl: `curl -X POST "https://api.gov.fintech/v1/ips/transfers/TXN-88492019/recall" \\\n  -H "Authorization: Bearer <TOKEN>" \\\n  -d '{"reasonCode": "DUPL"}'`
          }
        ]
      },
      accounts: {
        title: 'استعلام الحسابات المفتوحة (Open Banking)',
        code: 'ACCOUNTS',
        baseUrl: 'https://api.gov.fintech/v1/accounts',
        versions: ['v2026.2'],
        endpoints: [
          {
            id: 'ep_acc_01',
            method: 'GET',
            path: '/v1/accounts/{iban}/balance',
            shortName: 'balance',
            desc: 'استعلام الرصيد الدفتري والمتاح بموجب تفويض صريح من العميل.',
            params: [
              { name: 'iban', type: 'string (Path)', req: true, rule: 'صيغة الآيبان الوطني SA-IBAN', tag: 'PII', tagClass: 'badge-purple' }
            ],
            rules: [
              { id: 'BR_BAL_001', name: 'التحقق من تفويض المصرفية المفتوحة الفعال', err: 'CONSENT_EXPIRED_401' }
            ],
            payload: `// GET Request has no body`,
            res200: `{\n  "iban": "SA0380000000608010167519",\n  "availableBalance": 45200.50,\n  "currency": "SAR",\n  "asOf": "2026-10-11T12:05:00Z"\n}`,
            res422: `{\n  "error": "UNAUTHORIZED",\n  "code": "CONSENT_EXPIRED_401",\n  "message": "User consent expired or revoked."\n}`,
            curl: `curl -X GET "https://api.gov.fintech/v1/accounts/SA0380000000608010167519/balance" \\\n  -H "Authorization: Bearer <TOKEN>"`
          }
        ]
      }
    }
  },
  merchants: {
    key: 'merchants',
    name: 'التجار والمدفوعات الإلكترونية',
    code: 'SECTOR_FIN_MERCHANTS',
    icon: 'fa-store',
    services: {
      pg: {
        title: 'بوابة الدفع الموحدة (PG)',
        code: 'PG',
        baseUrl: 'https://api.gov.fintech/v1/pg',
        versions: ['v2026.2'],
        endpoints: [
          {
            id: 'ep_pg_01',
            method: 'POST',
            path: '/v1/checkout/session',
            shortName: 'checkout',
            desc: 'إنشاء جلسة دفع آمنة للتجارة الإلكترونية مع دعم Apple Pay و Mada.',
            params: [
              { name: 'merchantId', type: 'string (UUID)', req: true, rule: 'معرف التاجر المعتمد في السجل', tag: 'Merchant', tagClass: 'badge-blue' },
              { name: 'amount', type: 'decimal', req: true, rule: 'المبلغ الإجمالي بالهللات أو الريال', tag: 'Financial', tagClass: 'badge-emerald' },
              { name: 'orderRef', type: 'string', req: true, rule: 'معرف الطلب لدى نظام التاجر', tag: 'Audit', tagClass: 'badge-amber' }
            ],
            rules: [
              { id: 'BR_PG_001', name: 'التحقق من مطابقة نطاق التاجر المعتمد', err: 'DOMAIN_MISMATCH_403' }
            ],
            payload: `{\n  "merchantId": "mch_8819283",\n  "amount": 299.00,\n  "orderRef": "ORD-5541"\n}`,
            res200: `{\n  "sessionId": "sess_99281729",\n  "paymentUrl": "https://pay.gov.fintech/checkout/sess_99281729"\n}`,
            res422: `{\n  "error": "FORBIDDEN",\n  "code": "DOMAIN_MISMATCH_403",\n  "message": "Origin not whitelisted."\n}`,
            curl: `curl -X POST "https://api.gov.fintech/v1/pg/checkout/session" \\\n  -H "Authorization: Bearer <TOKEN>" \\\n  -d '{"amount": 299.00}'`
          }
        ]
      }
    }
  },
  aml: {
    key: 'aml',
    name: 'مكافحة غسل الأموال والامتثال (AML)',
    code: 'SECTOR_FIN_AML',
    icon: 'fa-shield-halved',
    services: {
      screening: {
        title: 'محرك الفحص والمطابقة الرقابية',
        code: 'AML_SCREEN',
        baseUrl: 'https://api.gov.fintech/v1/aml',
        versions: ['v2026.2'],
        endpoints: [
          {
            id: 'ep_aml_01',
            method: 'POST',
            path: '/v1/screening/instant-check',
            shortName: 'screening',
            desc: 'فحص فوري للأسماء والحسابات ضد القوائم الرقابية المحدثة وقوائم العقوبات الدولية.',
            params: [
              { name: 'entityName', type: 'string', req: true, rule: 'الاسم الكامل باللغة العربية أو الإنجليزية', tag: 'Compliance', tagClass: 'badge-rose' },
              { name: 'nationalId', type: 'string', req: false, rule: 'رقم الهوية الوطنية أو الإقامة أو السجل التجاري', tag: 'PII', tagClass: 'badge-purple' }
            ],
            rules: [
              { id: 'BR_AML_001', name: 'حظر فوري في حال تطابق قائمة العقوبات', err: 'SANCTIONS_MATCH_403' }
            ],
            payload: `{\n  "entityName": "شركة التجارة العالمية",\n  "nationalId": "1010882910"\n}`,
            res200: `{\n  "screenResult": "CLEAR",\n  "riskScore": 0.02,\n  "auditToken": "AUD-AML-9921"\n}`,
            res422: `{\n  "error": "SANCTIONS_BLOCKED",\n  "code": "SANCTIONS_MATCH_403",\n  "message": "Entity flagged on international sanctions list."\n}`,
            curl: `curl -X POST "https://api.gov.fintech/v1/aml/screening/instant-check" \\\n  -H "Authorization: Bearer <TOKEN>" \\\n  -d '{"entityName": "شركة التجارة العالمية"}'`
          }
        ]
      }
    }
  },
  settlement: {
    key: 'settlement',
    name: 'المقاصة والتسوية والتقارير الرقابية',
    code: 'SECTOR_FIN_SETTLEMENT',
    icon: 'fa-scale-balanced',
    services: {
      netting: {
        title: 'محرك المقاصة الصافية المتعددة',
        code: 'NETTING',
        baseUrl: 'https://api.gov.fintech/v1/settlement',
        versions: ['v2026.2'],
        endpoints: [
          {
            id: 'ep_set_01',
            method: 'GET',
            path: '/v1/settlement/cycles/daily-net',
            shortName: 'netting-cycle',
            desc: 'استخراج أرصدة المقاصة الصافية اليومية بين البنوك المشاركة في الشبكة.',
            params: [
              { name: 'cycleDate', type: 'date (YYYY-MM-DD)', req: true, rule: 'تاريخ دورة المقاصة المراد استعراضها', tag: 'Financial', tagClass: 'badge-emerald' }
            ],
            rules: [
              { id: 'BR_SET_001', name: 'إغلاق الدورة في تمام الساعة 16:00 بتوقيت الرياض', err: 'CYCLE_OPEN_422' }
            ],
            payload: `// GET Request has no body`,
            res200: `{\n  "cycleDate": "2026-10-11",\n  "status": "FINAL_SETTLED",\n  "totalVolume": 1450200,\n  "netPositionsCount": 24\n}`,
            res422: `{\n  "error": "CYCLE_STILL_OPEN",\n  "code": "CYCLE_OPEN_422",\n  "message": "Netting cycle is currently active and not finalized."\n}`,
            curl: `curl -X GET "https://api.gov.fintech/v1/settlement/cycles/daily-net?cycleDate=2026-10-11" \\\n  -H "Authorization: Bearer <TOKEN>"`
          }
        ]
      }
    }
  }
};

export const INITIAL_CHANGE_REQUESTS: ChangeRequest[] = [
  {
    id: 'cr_01',
    crNumber: 'CR-IPS-2026-081',
    title: 'إضافة حقل PurposeCode الإلزامي في تحويلات IPS',
    author: 'م. أحمد العتيبي',
    authorRole: 'Lead API Architect',
    sectorKey: 'banking',
    endpointPath: '/v1/transfers',
    proposedChange: 'إلزام إرسال حقل purposeCode وفق معيار ISO 20022 لتصنيف التحويلات المصرفية.',
    changeType: 'BREAKING',
    recommendedBump: 'MAJOR',
    status: 'PENDING_APPROVAL',
    approvals: [
      { role: 'Lead Architect', approver: 'م. أحمد العتيبي', approvedAt: '2026-10-10 14:30', signed: true },
      { role: 'Compliance Officer (CCO)', approver: 'د. خالد الدوسري', approvedAt: '2026-10-11 09:15', signed: true },
      { role: 'Chief Security Officer (CSO)', approver: 'م. فهد القرني', signed: false }
    ],
    createdAt: '2026-10-10'
  },
  {
    id: 'cr_02',
    crNumber: 'CR-AML-2026-019',
    title: 'توسيع قائمة معايير الفحص الرقابي لتشمل الشركات التابعة',
    author: 'أ. سارة المنصور',
    authorRole: 'Senior Compliance Engineer',
    sectorKey: 'aml',
    endpointPath: '/v1/screening/instant-check',
    proposedChange: 'إضافة حقل اختياري subsidiariesCheck لتفعيل الفحص الموسع للشركات.',
    changeType: 'NON_BREAKING',
    recommendedBump: 'MINOR',
    status: 'APPROVED',
    approvals: [
      { role: 'Lead Architect', approver: 'م. أحمد العتيبي', approvedAt: '2026-10-09 11:00', signed: true },
      { role: 'Compliance Officer (CCO)', approver: 'د. خالد الدوسري', approvedAt: '2026-10-09 15:20', signed: true },
      { role: 'Chief Security Officer (CSO)', approver: 'م. فهد القرني', approvedAt: '2026-10-10 10:00', signed: true }
    ],
    createdAt: '2026-10-09'
  }
];

export const INITIAL_ROLES: RBACRole[] = [
  {
    id: 'role_admin',
    name: 'مسؤول المنظومة السيادية (Enterprise Admin)',
    badge: 'badge-rose',
    description: 'صلاحيات كاملة وغير مقيدة على كافة الأصول والسياسات والأدوار والختم المشفر.',
    permissions: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      execute: true,
      approve: true,
      export: true
    }
  },
  {
    id: 'role_architect',
    name: 'مهندس المواصفات المعمارية (API Architect)',
    badge: 'badge-blue',
    description: 'تصميم المواصفات، ضبط المخططات، فتح طلبات التغيير، ومراجعة كسر التوافق.',
    permissions: {
      view: true,
      create: true,
      edit: true,
      delete: false,
      execute: true,
      approve: false,
      export: true
    }
  },
  {
    id: 'role_cso',
    name: 'رئيس أمن المعلومات (Chief Security Officer)',
    badge: 'badge-purple',
    description: 'التدقيق الأمني النهائي، وإطلاق الختم الرقمي السيادي بمفتاح الـ KMS.',
    permissions: {
      view: true,
      create: false,
      edit: false,
      delete: false,
      execute: true,
      approve: true,
      export: true
    }
  },
  {
    id: 'role_cco',
    name: 'مسؤول الامتثال المالي (Compliance Officer)',
    badge: 'badge-amber',
    description: 'مراجعة معايير ISO 20022 و PCI-DSS واعتماد مسارات الامتثال.',
    permissions: {
      view: true,
      create: false,
      edit: false,
      delete: false,
      execute: false,
      approve: true,
      export: true
    }
  },
  {
    id: 'role_tester',
    name: 'مهندس التكامل والاختبارات (API Integrator & Tester)',
    badge: 'badge-emerald',
    description: 'استعراض الوثائق، تشغيل خادم المحاكاة، واستخراج كود الـ SDKs.',
    permissions: {
      view: true,
      create: false,
      edit: false,
      delete: false,
      execute: true,
      approve: false,
      export: true
    }
  }
];

export const INITIAL_SNAPSHOTS: SealedSnapshot[] = [
  {
    releaseId: 'REL-IPS-2026-5871',
    apiCode: 'INSTANT_PAYMENTS',
    semver: 'v2026.2',
    canonicalSha256: '71027c802f60a92b951ec663c11e74a87265a7f9d854e7d483b8e5c12001e847',
    sealedAt: '2026-10-08 18:30 UTC',
    signerKmsKey: 'kms:sa-central-1:fintech-sovereign-vault-key-01',
    endpointsCount: 3,
    complianceLevel: 'ISO 20022 & PCI-DSS L1'
  },
  {
    releaseId: 'REL-AML-2026-1192',
    apiCode: 'AML_SCREENING',
    semver: 'v2026.2',
    canonicalSha256: '992a831b7e289f6601cb893d56123984d76201bcf55110e832187f4820bc0112',
    sealedAt: '2026-10-09 11:15 UTC',
    signerKmsKey: 'kms:sa-central-1:fintech-sovereign-vault-key-01',
    endpointsCount: 1,
    complianceLevel: 'FATF & Central Bank AML Standards'
  }
];
