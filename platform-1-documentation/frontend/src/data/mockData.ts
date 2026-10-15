import { Sector, ChangeRequest, RBACRole, SealedSnapshot, SystemModule } from '../types/schema';

export const INITIAL_SYSTEMS: Record<string, SystemModule> = {
  collection: {
    key: 'collection',
    name: 'تحصيل',
    nameEn: 'Tahseel',
    code: 'SYS_TAHSEEL',
    icon: 'Layers',
    description: 'نظام التحصيل والدفع اللحظي ومعالجة العمليات المالية والمصرفية',
    descriptionEn: 'Core collection and instant payment processing platform across banks and merchants',
    status: 'ACTIVE',
    associatedSectorKeys: ['banking', 'merchants', 'erp', 'aml'],
    integrations: {
      banking: {
        entityId: 'banking',
        name: 'البنوك والمصارف المركزية',
        nameEn: 'Banks & Clearing Houses',
        code: 'INT_BANKING',
        icon: 'Building2',
        direction: 'INBOUND',
        endpoints: [
          {
            id: 'ep_ips_01',
            method: 'POST',
            path: '/v1/transfers',
            shortName: 'transfers',
            desc: 'تنفيذ أمر تحويل بنكي فوري مطابق لسقف العمليات وضوابط المقاصة الوطنية.',
            descEn: 'Execute instant bank transfer matching clearing ceiling and national rules.',
            systemKey: 'collection',
            direction: 'INBOUND',
            channels: ['CORE_SERVER', 'MOBILE'],
            params: [
              { name: 'sourceAccount', type: 'string (IBAN)', req: true, rule: 'صيغة الآيبان الوطني SA-IBAN', ruleEn: 'National SA-IBAN standard format', tag: 'PII', tagClass: 'badge-purple' },
              { name: 'destinationAccount', type: 'string (IBAN)', req: true, rule: 'التحقق من صحة المستفيد عبر الدليل الموحد', ruleEn: 'Beneficiary validation via unified directory', tag: 'PII', tagClass: 'badge-purple' },
              { name: 'amount', type: 'decimal', req: true, rule: 'الحد الأقصى للعملية الفردية: 50,000 ر.س', ruleEn: 'Single transaction ceiling: 50,000 SAR', tag: 'Financial', tagClass: 'badge-emerald' },
              { name: 'currency', type: 'string (ISO-4217)', req: true, rule: 'SAR فقط', ruleEn: 'SAR currency only', tag: 'ISO 20022', tagClass: 'badge-blue' },
              { name: 'idempotencyKey', type: 'string (UUID v4)', req: true, rule: 'صلاحية المفتاح 24 ساعة لمنع تكرار القيد المالي', ruleEn: '24-hour key validity to prevent duplicate booking', tag: 'Idempotent', tagClass: 'badge-amber' }
            ],
            rules: [
              { id: 'BR_IPS_001', name: 'الحد الأقصى للتحويل 50,000 ريال', nameEn: 'Transfer ceiling 50,000 SAR', err: 'LIMIT_EXCEEDED_422' },
              { id: 'BR_IPS_002', name: 'منع التكرار بمفتاح IdempotencyKey', nameEn: 'De-duplication via IdempotencyKey', err: 'DUPLICATE_TXN_409' }
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
            descEn: 'Instant query for transfer processing and final settlement status.',
            systemKey: 'collection',
            direction: 'INBOUND',
            channels: ['CORE_SERVER', 'MOBILE', 'WEB'],
            params: [
              { name: 'id', type: 'string (Path)', req: true, rule: 'معرف الحوالة الرقمي المقيد', ruleEn: 'Registered transaction reference ID', tag: 'Audit Key', tagClass: 'badge-blue' }
            ],
            rules: [
              { id: 'BR_IPS_003', name: 'متاح الاستعلام حتى 90 يوماً من التنفيذ', nameEn: 'Query available up to 90 days after execution', err: 'TXN_NOT_FOUND_404' }
            ],
            payload: `// GET Request has no body`,
            res200: `{\n  "transactionId": "TXN-88492019",\n  "status": "SETTLED",\n  "settledAt": "2026-10-11T12:00:00Z"\n}`,
            res422: `{\n  "error": "NOT_FOUND",\n  "code": "TXN_NOT_FOUND_404",\n  "message": "Transaction identifier does not exist."\n}`,
            curl: `curl -X GET "https://api.gov.fintech/v1/ips/transfers/TXN-88492019" \\\n  -H "Authorization: Bearer <TOKEN>"`
          },
          {
            id: 'ep_acc_01',
            method: 'GET',
            path: '/v1/accounts/{iban}/balance',
            shortName: 'balance',
            desc: 'استعلام الرصيد الدفتري والمتاح بموجب تفويض صريح من العميل.',
            descEn: 'Query available and ledger balance under explicit open banking consent.',
            systemKey: 'collection',
            direction: 'INBOUND',
            channels: ['MOBILE', 'CORE_SERVER'],
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
      },
      merchants: {
        entityId: 'merchants',
        name: 'التجار ونقاط البيع',
        nameEn: 'Merchants & POS Gateways',
        code: 'INT_MERCHANTS',
        icon: 'Store',
        direction: 'INBOUND',
        endpoints: [
          {
            id: 'ep_pg_01',
            method: 'POST',
            path: '/v1/checkout/session',
            shortName: 'checkout',
            desc: 'إنشاء جلسة دفع آمنة للتجارة الإلكترونية مع دعم Apple Pay و Mada.',
            descEn: 'Create secure e-commerce checkout session supporting Apple Pay and Mada.',
            systemKey: 'collection',
            direction: 'INBOUND',
            channels: ['MOBILE', 'WEB'],
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
          },
          {
            id: 'ep_pos_01',
            method: 'POST',
            path: '/v1/pos/instant-collect',
            shortName: 'pos-collect',
            desc: 'تنفيذ عملية تحصيل سريعة عبر أجهزة نقاط البيع POS ورمز الاستجابة السريع QR.',
            descEn: 'Execute instant retail collection via POS terminal or QR standard.',
            systemKey: 'collection',
            direction: 'INBOUND',
            channels: ['POS'],
            params: [
              { name: 'terminalId', type: 'string', req: true, rule: 'رقم جهاز نقطة البيع المسجل', tag: 'POS Terminal', tagClass: 'badge-blue' },
              { name: 'amount', type: 'decimal', req: true, rule: 'المبلغ المستحق بالريال السعودي', tag: 'Financial', tagClass: 'badge-emerald' }
            ],
            rules: [
              { id: 'BR_POS_001', name: 'التحقق من اتصال الجهاز المشفر', err: 'TERMINAL_AUTH_FAIL_401' }
            ],
            payload: `{\n  "terminalId": "POS-9812-SA",\n  "amount": 120.50\n}`,
            res200: `{\n  "authCode": "AUTH-48192",\n  "status": "APPROVED",\n  "timestamp": "2026-10-13T10:15:00Z"\n}`,
            res422: `{\n  "error": "UNAUTHORIZED_TERMINAL",\n  "code": "TERMINAL_AUTH_FAIL_401",\n  "message": "Terminal certificate revoked."\n}`,
            curl: `curl -X POST "https://api.gov.fintech/v1/pos/instant-collect" \\\n  -d '{"terminalId":"POS-9812-SA","amount":120.50}'`
          }
        ]
      },
      erp: {
        entityId: 'erp',
        name: 'أنظمة ERP والمحاسبة',
        nameEn: 'ERP & Accounting Systems',
        code: 'INT_ERP',
        icon: 'Scale',
        direction: 'BIDIRECTIONAL',
        endpoints: [
          {
            id: 'ep_erp_01',
            method: 'POST',
            path: '/v1/erp/reconciliation',
            shortName: 'erp-recon',
            desc: 'مطابقة القيود المحاسبية الآلية والدفعات اللحظية مع برامج SAP و Oracle.',
            descEn: 'Automated journal entry synchronization and reconciliation with SAP/Oracle.',
            systemKey: 'collection',
            direction: 'BIDIRECTIONAL',
            channels: ['CORE_SERVER'],
            params: [
              { name: 'ledgerCode', type: 'string', req: true, rule: 'رمز دليل الحسابات العام', tag: 'Accounting', tagClass: 'badge-blue' },
              { name: 'periodDate', type: 'string (YYYY-MM)', req: true, rule: 'الفترة المحاسبية النشطة', tag: 'Period', tagClass: 'badge-amber' }
            ],
            rules: [
              { id: 'BR_ERP_001', name: 'إغلاق الفترة الدفترية السابقة', err: 'PERIOD_LOCKED_422' }
            ],
            payload: `{\n  "ledgerCode": "GL-1020-SAR",\n  "periodDate": "2026-10"\n}`,
            res200: `{\n  "status": "RECONCILED",\n  "balancedRecords": 450,\n  "discrepancies": 0\n}`,
            res422: `{\n  "error": "LOCKED",\n  "code": "PERIOD_LOCKED_422",\n  "message": "Financial period is sealed."\n}`,
            curl: `curl -X POST "https://api.gov.fintech/v1/erp/reconciliation" \\\n  -d '{"ledgerCode":"GL-1020-SAR","periodDate":"2026-10"}'`
          }
        ]
      },
      aml: {
        entityId: 'aml',
        name: 'مكافحة غسل الأموال (AML)',
        nameEn: 'AML & Regulatory Screening Authority',
        code: 'INT_TAHSEEL_AML',
        icon: 'ShieldAlert',
        direction: 'OUTBOUND',
        endpoints: [
          {
            id: 'ep_aml_01',
            method: 'POST',
            path: '/v1/screening/instant-check',
            shortName: 'instant-check',
            desc: 'فحص فوري للأسماء والحسابات ضد القوائم الرقابية المحدثة وقوائم العقوبات الدولية قبل إتمام التحصيل.',
            descEn: 'Instant pre-collection screening of names and accounts against regulatory sanctions and PEP lists.',
            systemKey: 'collection',
            direction: 'OUTBOUND',
            channels: ['CORE_SERVER'],
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
          },
          {
            id: 'ep_aml_02',
            method: 'POST',
            path: '/v1/screening/pep-verify',
            shortName: 'pep-verify',
            desc: 'التحقق من الشخصيات ذات النفوذ السياسي (PEP) وأقاربهم لعمليات التحصيل عالية القيمة.',
            descEn: 'Politically Exposed Persons verification and high-risk relation check for collection transactions.',
            systemKey: 'collection',
            direction: 'OUTBOUND',
            channels: ['CORE_SERVER'],
            params: [
              { name: 'nationalId', type: 'string', req: true, rule: 'رقم الهوية الوطنية أو جواز السفر', tag: 'Identity', tagClass: 'badge-purple' }
            ],
            rules: [
              { id: 'BR_PEP_001', name: 'مستوى التدقيق المعزز في حال الإيجابية', err: 'ENHANCED_DUE_DILIGENCE_REQUIRED_200' }
            ],
            payload: `{\n  "nationalId": "1098271625"\n}`,
            res200: `{\n  "isPep": false,\n  "riskLevel": "LOW"\n}`,
            res422: `{\n  "error": "SERVICE_UNAVAILABLE",\n  "code": "AML_DB_TIMEOUT_503",\n  "message": "Central compliance registry timeout."\n}`,
            curl: `curl -X POST "https://api.gov.fintech/v1/aml/screening/pep-verify" \\\n  -d '{"nationalId":"1098271625"}'`
          }
        ]
      }
    }
  },
  tantara: {
    key: 'tantara',
    name: 'تنترة',
    nameEn: 'Tantara',
    code: 'SYS_TANTARA',
    icon: 'Receipt',
    description: 'نظام تنترة لإصدار الفواتير وتسويتها وربط قنوات الدفع والسداد المركزي',
    descriptionEn: 'Tantara central billing, invoicing orchestration, and multi-channel settlement platform',
    status: 'ACTIVE',
    associatedSectorKeys: ['merchants', 'banking', 'erp', 'aml'],
    integrations: {
      merchants: {
        entityId: 'merchants',
        name: 'التجار والمفوترين',
        nameEn: 'Merchants & Billers',
        code: 'INT_BILL_MERCH',
        icon: 'Store',
        direction: 'INBOUND',
        endpoints: [
          {
            id: 'ep_bill_01',
            method: 'POST',
            path: '/v1/bills/generate',
            shortName: 'generate-bill',
            desc: 'إصدار فاتورة إلكترونية معتمدة تحتوي على رمز الاستجابة السريع وضريبة القيمة المضافة.',
            descEn: 'Generate certified electronic invoice with QR code and VAT tax breakdown.',
            systemKey: 'tantara',
            direction: 'INBOUND',
            channels: ['CORE_SERVER', 'WEB'],
            params: [
              { name: 'billNumber', type: 'string', req: true, rule: 'رقم الفاتورة الفريد لدى المفوتر', tag: 'Invoice ID', tagClass: 'badge-blue' },
              { name: 'subTotal', type: 'decimal', req: true, rule: 'المبلغ قبل الضريبة', tag: 'Financial', tagClass: 'badge-emerald' },
              { name: 'vatAmount', type: 'decimal', req: true, rule: 'نسبة 15% ضريبة القيمة المضافة', tag: 'Tax', tagClass: 'badge-amber' }
            ],
            rules: [
              { id: 'BR_BIL_001', name: 'تطابق الحساب الضريبي مع الهيئة', err: 'TAX_MISMATCH_422' }
            ],
            payload: `{\n  "billNumber": "INV-2026-9901",\n  "subTotal": 1000.00,\n  "vatAmount": 150.00\n}`,
            res200: `{\n  "billId": "BIL-881928",\n  "zatcaUuid": "1192-3841-uuid",\n  "status": "ISSUED"\n}`,
            res422: `{\n  "error": "CALCULATION_ERROR",\n  "code": "TAX_MISMATCH_422",\n  "message": "VAT calculation does not match standard 15% rate."\n}`,
            curl: `curl -X POST "https://api.gov.fintech/v1/bills/generate" \\\n  -d '{"billNumber":"INV-2026-9901","subTotal":1000.00,"vatAmount":150.00}'`
          },
          {
            id: 'ep_bill_02',
            method: 'GET',
            path: '/v1/bills/{billNumber}/inquiry',
            shortName: 'bill-inquiry',
            desc: 'استعلام عن تفاصيل الفاتورة وقيمتها والمبلغ المتبقي للسداد.',
            descEn: 'Query invoice details, remaining balance, and due date.',
            systemKey: 'tantara',
            direction: 'INBOUND',
            channels: ['CORE_SERVER', 'MOBILE', 'WEB'],
            params: [
              { name: 'billNumber', type: 'string (Path)', req: true, rule: 'رقم الفاتورة', tag: 'Audit', tagClass: 'badge-blue' }
            ],
            rules: [
              { id: 'BR_BIL_002', name: 'الفاتورة لم يسبق سدادها بالكامل', err: 'ALREADY_PAID_200' }
            ],
            payload: `// GET Request has no body`,
            res200: `{\n  "billNumber": "INV-2026-9901",\n  "status": "UNPAID",\n  "dueAmount": 1150.00,\n  "dueDate": "2026-11-01"\n}`,
            res422: `{\n  "error": "NOT_FOUND",\n  "code": "BILL_NOT_FOUND_404",\n  "message": "Bill does not exist."\n}`,
            curl: `curl -X GET "https://api.gov.fintech/v1/bills/INV-2026-9901/inquiry"`
          }
        ]
      },
      banking: {
        entityId: 'banking',
        name: 'البنوك وأنظمة السداد (سداد / RTGS)',
        nameEn: 'Banks & Sadad Hub',
        code: 'INT_BILL_BANK',
        icon: 'Building2',
        direction: 'BIDIRECTIONAL',
        endpoints: [
          {
            id: 'ep_rtgs_01',
            method: 'POST',
            path: '/v1/rtgs/settle',
            shortName: 'settle',
            desc: 'إرسال أمر تسوية مالية كبرى للمقاصة المركزية بين المصارف.',
            descEn: 'Transmit high-value bulk settlement directive to central RTGS system.',
            systemKey: 'tantara',
            direction: 'OUTBOUND',
            channels: ['CORE_SERVER'],
            params: [
              { name: 'batchId', type: 'string', req: true, rule: 'معرف الدفعة المعتمد', tag: 'Batch', tagClass: 'badge-blue' },
              { name: 'totalAmount', type: 'decimal', req: true, rule: 'الحد الأدنى 50,000 ر.س', tag: 'Financial', tagClass: 'badge-emerald' }
            ],
            rules: [
              { id: 'BR_RTGS_001', name: 'العمل خلال نافذة المقاصة المركزية', err: 'WINDOW_CLOSED_422' }
            ],
            payload: `{\n  "batchId": "BATCH-9901",\n  "totalAmount": 250000.00\n}`,
            res200: `{\n  "status": "SUCCESS",\n  "code": 20000,\n  "message": "تم قبول وتنفيذ أمر العملية بنجاح عبر شبكة المقاصة الوطنية اللحظية",\n  "transactionId": "TXN-88492019-SA",\n  "clearingCode": "CLR-IPS-20261005-00192",\n  "endToEndIdentification": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",\n  "instructedAmount": {\n    "amount": 1500.00,\n    "currency": "SAR"\n  },\n  "settlementDetails": {\n    "settlementMethod": "IPS_INSTANT",\n    "clearingSystem": "SARIE_IPS_CORE",\n    "settledAt": "2026-10-05T11:15:00.342Z",\n    "executionTimeMs": 68\n  },\n  "audit": {\n    "sourceBankCode": "NCB",\n    "destinationBankCode": "SABB",\n    "signedAuditHash": "sha256:8f2a1b9e0d4c5e6f3b18a209..."\n  }\n}`,
            res422: `{\n  "error": "WINDOW_CLOSED",\n  "code": "WINDOW_CLOSED_422",\n  "message": "Settlement window is currently closed."\n}`,
            curl: `curl -X POST "https://api.gov.fintech/v1/rtgs/settle" \\\n  -d '{"batchId":"BATCH-9901","totalAmount":250000.00}'`
          }
        ]
      },
      erp: {
        entityId: 'erp',
        name: 'أنظمة ERP المؤسسية',
        nameEn: 'Corporate ERP Hub',
        code: 'INT_BILL_ERP',
        icon: 'Scale',
        direction: 'BIDIRECTIONAL',
        endpoints: [
          {
            id: 'ep_erp_bill_01',
            method: 'POST',
            path: '/v1/erp/invoices/sync',
            shortName: 'invoices-sync',
            desc: 'مزامنة الفواتير والمقبوضات الدورية مع دفتر الأستاذ العام في نظام الشركة.',
            descEn: 'Sync recurring invoices and receivable journals with company ledger.',
            systemKey: 'tantara',
            direction: 'BIDIRECTIONAL',
            channels: ['CORE_SERVER'],
            params: [
              { name: 'companyCode', type: 'string', req: true, rule: 'رمز الكيان في نظام ERP', tag: 'Corporate', tagClass: 'badge-blue' }
            ],
            rules: [
              { id: 'BR_BIL_ERP_001', name: 'صلاحية مزامنة الفواتير النشطة', err: 'ERP_ACCESS_DENIED_403' }
            ],
            payload: `{\n  "companyCode": "CORP-SA-881"\n}`,
            res200: `{\n  "syncedInvoices": 182,\n  "status": "SUCCESS"\n}`,
            res422: `{\n  "error": "ACCESS_DENIED",\n  "code": "ERP_ACCESS_DENIED_403",\n  "message": "ERP access denied."\n}`,
            curl: `curl -X POST "https://api.gov.fintech/v1/erp/invoices/sync" \\\n  -d '{"companyCode":"CORP-SA-881"}'`
          }
        ]
      },
      aml: {
        entityId: 'aml',
        name: 'مكافحة غسل الأموال (AML)',
        nameEn: 'AML & Suspicious Reporting Authority',
        code: 'INT_TANTARA_AML',
        icon: 'ShieldAlert',
        direction: 'OUTBOUND',
        endpoints: [
          {
            id: 'ep_reg_01',
            method: 'POST',
            path: '/v1/aml/str-report',
            shortName: 'str-report',
            desc: 'رفع تقرير العمليات المشبوهة (STR) تلقائياً لوحدة التحريات المالية الرقابية عند رصد نشاط غير معتاد في الفواتير.',
            descEn: 'Automated Suspicious Transaction Report submission to Financial Intelligence Unit.',
            systemKey: 'tantara',
            direction: 'OUTBOUND',
            channels: ['CORE_SERVER'],
            params: [
              { name: 'caseId', type: 'string', req: true, rule: 'معرف القضية الرقابي المشفر', tag: 'Audit STR', tagClass: 'badge-rose' },
              { name: 'suspicionCategory', type: 'string', req: true, rule: 'تصنيف الاشتباه: RAPID_MOVEMENT, STRUCTURING', tag: 'Category', tagClass: 'badge-amber' }
            ],
            rules: [
              { id: 'BR_STR_001', name: 'إلزامية التشفير بمفتاح سيادي', err: 'ENCRYPTION_FAILED_500' }
            ],
            payload: `{\n  "caseId": "STR-2026-9901",\n  "suspicionCategory": "STRUCTURING"\n}`,
            res200: `{\n  "acknowledgementToken": "FIU-REC-99481",\n  "reportedAt": "2026-10-13T11:00:00Z"\n}`,
            res422: `{\n  "error": "SUBMISSION_FAILED",\n  "code": "ENCRYPTION_FAILED_500",\n  "message": "Sovereign vault encryption failed."\n}`,
            curl: `curl -X POST "https://api.gov.fintech/v1/aml/str-report" \\\n  -d '{"caseId":"STR-2026-9901"}'`
          }
        ]
      }
    }
  },
  aggregator: {
    key: 'aggregator',
    name: 'المجمع',
    nameEn: 'Al-Mujamma',
    code: 'SYS_AGGREGATOR',
    icon: 'Globe',
    description: 'نظام المجمع المالي الموحد لربط بوابات الدفع والمحافظ وبث الإشعارات والـ Webhooks',
    descriptionEn: 'Unified payment aggregation gateway, multi-channel routing, and webhook event streaming',
    status: 'ACTIVE',
    associatedSectorKeys: ['merchants', 'banking', 'aml'],
    integrations: {
      merchants: {
        entityId: 'merchants',
        name: 'أنظمة المتاجر والتطبيقات المجمعة',
        nameEn: 'Merchant Apps & Aggregated Webhooks',
        code: 'INT_NTF_MERCH',
        icon: 'Store',
        direction: 'OUTBOUND',
        endpoints: [
          {
            id: 'ep_wh_01',
            method: 'POST',
            path: '/v1/webhooks/push-notification',
            shortName: 'payment-webhook',
            desc: 'بث إشعار فوري لتطبيق التاجر والموبايل بنجاح العملية المالية.',
            descEn: 'Push real-time financial webhook notification to merchant mobile app/server.',
            systemKey: 'aggregator',
            direction: 'OUTBOUND',
            channels: ['MOBILE', 'CORE_SERVER'],
            params: [
              { name: 'event', type: 'string', req: true, rule: 'نوع الحدث: PAYMENT_CAPTURED', tag: 'Webhook', tagClass: 'badge-purple' },
              { name: 'signature', type: 'string (HMAC-SHA256)', req: true, rule: 'توقيع مشفر للتحقق من المصدر', tag: 'Security', tagClass: 'badge-rose' }
            ],
            rules: [
              { id: 'BR_WH_001', name: 'إعادة المحاولة حتى 5 مرات في حال تعثر استلام التاجر', err: 'RETRY_SCHEDULED_202' }
            ],
            payload: `{\n  "event": "PAYMENT_CAPTURED",\n  "amount": 299.00,\n  "currency": "SAR",\n  "timestamp": "2026-10-13T02:00:00Z"\n}`,
            res200: `{\n  "acknowledged": true\n}`,
            res422: `{\n  "error": "WEBHOOK_FAILED",\n  "code": "RETRY_SCHEDULED_202",\n  "message": "Endpoint unresponsive, retry in 30s."\n}`,
            curl: `curl -X POST "https://api.gov.fintech/v1/webhooks/push-notification" \\\n  -H "X-Webhook-Signature: <HMAC>" \\\n  -d '{"event":"PAYMENT_CAPTURED"}'`
          },
          {
            id: 'ep_wh_02',
            method: 'POST',
            path: '/v1/webhooks/refund-event',
            shortName: 'refund-webhook',
            desc: 'إشعار التاجر بمعالجة استرجاع المبالغ لحساب العميل.',
            descEn: 'Notify merchant of customer refund settlement.',
            systemKey: 'aggregator',
            direction: 'OUTBOUND',
            channels: ['CORE_SERVER'],
            params: [
              { name: 'refundId', type: 'string', req: true, rule: 'معرف طلب الاسترجاع', tag: 'Refund', tagClass: 'badge-blue' }
            ],
            rules: [
              { id: 'BR_WH_002', name: 'تأكيد وصول الإشعار عبر 200 OK', err: 'ACK_TIMEOUT_408' }
            ],
            payload: `{\n  "event": "REFUND_COMPLETED",\n  "refundId": "REF-9921",\n  "amount": 120.00\n}`,
            res200: `{\n  "status": "DELIVERED"\n}`,
            res422: `{\n  "error": "TIMEOUT",\n  "code": "ACK_TIMEOUT_408",\n  "message": "Merchant server timed out."\n}`,
            curl: `curl -X POST "https://api.gov.fintech/v1/webhooks/refund-event" \\\n  -d '{"refundId":"REF-9921"}'`
          }
        ]
      },
      banking: {
        entityId: 'banking',
        name: 'المصارف المركزية وغرف المقاصة',
        nameEn: 'Clearing Houses & Banks',
        code: 'INT_NTF_BANK',
        icon: 'Building2',
        direction: 'OUTBOUND',
        endpoints: [
          {
            id: 'ep_ntf_bank_01',
            method: 'POST',
            path: '/v1/notifications/bank-settlement',
            shortName: 'settlement-alert',
            desc: 'إرسال إشعار للمصرف بإغلاق دفعة المقاصة وتأكيد الرصيد الصافي.',
            descEn: 'Send batch clearing closure alert and final net balance confirmation.',
            systemKey: 'aggregator',
            direction: 'OUTBOUND',
            channels: ['CORE_SERVER'],
            params: [
              { name: 'clearingCycleId', type: 'string', req: true, rule: 'رقم دورة المقاصة اليومية', tag: 'Clearing', tagClass: 'badge-emerald' }
            ],
            rules: [
              { id: 'BR_NTF_001', name: 'توقيع الإشعار بمفتاح أمني وطني', err: 'SIGNATURE_INVALID_401' }
            ],
            payload: `{\n  "clearingCycleId": "CLR-2026-10-13-C1",\n  "status": "FINAL_SETTLED"\n}`,
            res200: `{\n  "acknowledgedByBank": true\n}`,
            res422: `{\n  "error": "INVALID_SIGNATURE",\n  "code": "SIGNATURE_INVALID_401",\n  "message": "Cryptographic signature validation failed."\n}`,
            curl: `curl -X POST "https://api.gov.fintech/v1/notifications/bank-settlement"`
          }
        ]
      },
      aml: {
        entityId: 'aml',
        name: 'مكافحة غسل الأموال (AML)',
        nameEn: 'Aggregated AML Screening Engine',
        code: 'INT_AGG_AML',
        icon: 'ShieldAlert',
        direction: 'OUTBOUND',
        endpoints: [
          {
            id: 'ep_aml_01',
            method: 'POST',
            path: '/v1/screening/instant-check',
            shortName: 'screening',
            desc: 'فحص فوري للأسماء والحسابات المجمعة ضد القوائم الرقابية المحدثة وقوائم العقوبات الدولية.',
            descEn: 'Instant screening of aggregated names and accounts against regulatory sanctions and PEP lists.',
            systemKey: 'aggregator',
            direction: 'OUTBOUND',
            channels: ['CORE_SERVER'],
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
  }
};

export const INITIAL_SECTORS: Record<string, Sector> = {
  banking: {
    key: 'banking',
    name: 'البنوك',
    nameEn: 'Banks',
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
            systemKey: 'collection',
            direction: 'INBOUND',
            channels: ['CORE_SERVER', 'MOBILE'],
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
            systemKey: 'collection',
            direction: 'INBOUND',
            channels: ['CORE_SERVER', 'MOBILE', 'WEB'],
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
            systemKey: 'collection',
            direction: 'OUTBOUND',
            channels: ['CORE_SERVER'],
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
            systemKey: 'collection',
            direction: 'INBOUND',
            channels: ['MOBILE', 'CORE_SERVER'],
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
      },
      rtgs: {
        title: 'نظام التسوية الإجمالية الفورية (RTGS)',
        code: 'RTGS',
        baseUrl: 'https://api.gov.fintech/v1/rtgs',
        versions: ['v2026.2'],
        endpoints: [
          {
            id: 'ep_rtgs_01',
            method: 'POST',
            path: '/v1/rtgs/settle',
            shortName: 'settle',
            desc: 'إرسال أمر تسوية مالية كبرى للمقاصة المركزية بين المصارف.',
            systemKey: 'tantara',
            direction: 'OUTBOUND',
            channels: ['CORE_SERVER'],
            params: [
              { name: 'batchId', type: 'string', req: true, rule: 'معرف الدفعة المعتمد', tag: 'Batch', tagClass: 'badge-blue' },
              { name: 'totalAmount', type: 'decimal', req: true, rule: 'الحد الأدنى 50,000 ر.س', tag: 'Financial', tagClass: 'badge-emerald' }
            ],
            rules: [
              { id: 'BR_RTGS_001', name: 'العمل خلال نافذة المقاصة المركزية', err: 'WINDOW_CLOSED_422' }
            ],
            payload: `{\n  "batchId": "BATCH-9901",\n  "totalAmount": 250000.00\n}`,
            res200: `{\n  "settlementRef": "RTGS-99482",\n  "status": "ACCEPTED"\n}`,
            res422: `{\n  "error": "WINDOW_CLOSED",\n  "code": "WINDOW_CLOSED_422",\n  "message": "Settlement window is currently closed."\n}`,
            curl: `curl -X POST "https://api.gov.fintech/v1/rtgs/settle" \\\n  -d '{"batchId":"BATCH-9901","totalAmount":250000.00}'`
          }
        ]
      }
    }
  },
  merchants: {
    key: 'merchants',
    name: 'التجار',
    nameEn: 'Merchants',
    code: 'SECTOR_FIN_MERCHANTS',
    icon: 'fa-store',
    services: {
      pg: {
        title: 'بوابة الدفع الموحدة (PG)',
        titleEn: 'Unified Payment Gateway (PG)',
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
            descEn: 'Create secure e-commerce checkout session supporting Apple Pay and Mada.',
            systemKey: 'collection',
            direction: 'INBOUND',
            channels: ['MOBILE', 'WEB'],
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
          },
          {
            id: 'ep_pg_02',
            method: 'POST',
            path: '/v1/webhooks/push-notification',
            shortName: 'payment-webhook',
            desc: 'بث إشعار فوري لتطبيق التاجر والموبايل بنجاح العملية المالية.',
            descEn: 'Push real-time financial webhook notification to merchant mobile app/server.',
            systemKey: 'aggregator',
            direction: 'OUTBOUND',
            channels: ['MOBILE', 'CORE_SERVER'],
            params: [
              { name: 'event', type: 'string', req: true, rule: 'نوع الحدث: PAYMENT_CAPTURED', tag: 'Webhook', tagClass: 'badge-purple' },
              { name: 'signature', type: 'string (HMAC-SHA256)', req: true, rule: 'توقيع مشفر للتحقق من المصدر', tag: 'Security', tagClass: 'badge-rose' }
            ],
            rules: [
              { id: 'BR_WH_001', name: 'إعادة المحاولة حتى 5 مرات في حال تعثر استلام التاجر', err: 'RETRY_SCHEDULED_202' }
            ],
            payload: `{\n  "event": "PAYMENT_CAPTURED",\n  "amount": 299.00,\n  "currency": "SAR",\n  "timestamp": "2026-10-13T02:00:00Z"\n}`,
            res200: `{\n  "acknowledged": true\n}`,
            curl: `curl -X POST "https://api.gov.fintech/v1/webhooks/push-notification" \\\n  -H "X-Webhook-Signature: <HMAC>" \\\n  -d '{"event":"PAYMENT_CAPTURED"}'`
          }
        ]
      }
    }
  },
  aml: {
    key: 'aml',
    name: 'مكافحة غسل الأموال',
    nameEn: 'Anti-Money Laundering',
    code: 'SECTOR_FIN_AML',
    icon: 'fa-shield-halved',
    services: {
      screening: {
        title: 'محرك الفحص والمطابقة الرقابية',
        titleEn: 'Regulatory Screening & Matching Engine',
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
            descEn: 'Instant screening of names and accounts against regulatory sanctions and PEP lists.',
            systemKey: 'collection',
            direction: 'OUTBOUND',
            channels: ['CORE_SERVER'],
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
          },
          {
            id: 'ep_aml_02',
            method: 'POST',
            path: '/v1/screening/pep-verify',
            shortName: 'pep-verify',
            desc: 'التحقق من الشخصيات ذات النفوذ السياسي (PEP) وأقاربهم من الدرجة الأولى.',
            descEn: 'Politically Exposed Persons verification and high-risk relation check.',
            systemKey: 'collection',
            direction: 'OUTBOUND',
            channels: ['CORE_SERVER'],
            params: [
              { name: 'nationalId', type: 'string', req: true, rule: 'رقم الهوية الوطنية أو جواز السفر', tag: 'Identity', tagClass: 'badge-purple' }
            ],
            rules: [
              { id: 'BR_PEP_001', name: 'مستوى التدقيق المعزز في حال الإيجابية', err: 'ENHANCED_DUE_DILIGENCE_REQUIRED_200' }
            ],
            payload: `{\n  "nationalId": "1098271625"\n}`,
            res200: `{\n  "isPep": false,\n  "riskLevel": "LOW"\n}`,
            res422: `{\n  "error": "SERVICE_UNAVAILABLE",\n  "code": "AML_DB_TIMEOUT_503",\n  "message": "Central compliance registry timeout."\n}`,
            curl: `curl -X POST "https://api.gov.fintech/v1/aml/screening/pep-verify" \\\n  -d '{"nationalId":"1098271625"}'`
          },
          {
            id: 'ep_reg_01',
            method: 'POST',
            path: '/v1/aml/str-report',
            shortName: 'str-report',
            desc: 'رفع تقرير العمليات المشبوهة (STR) تلقائياً لوحدة التحريات المالية الرقابية.',
            descEn: 'Automated Suspicious Transaction Report submission to Financial Intelligence Unit.',
            systemKey: 'tantara',
            direction: 'OUTBOUND',
            channels: ['CORE_SERVER'],
            params: [
              { name: 'caseId', type: 'string', req: true, rule: 'معرف القضية الرقابي المشفر', tag: 'Audit STR', tagClass: 'badge-rose' },
              { name: 'suspicionCategory', type: 'string', req: true, rule: 'تصنيف الاشتباه: RAPID_MOVEMENT, STRUCTURING', tag: 'Category', tagClass: 'badge-amber' }
            ],
            rules: [
              { id: 'BR_STR_001', name: 'إلزامية التشفير بمفتاح سيادي', err: 'ENCRYPTION_FAILED_500' }
            ],
            payload: `{\n  "caseId": "STR-2026-9901",\n  "suspicionCategory": "STRUCTURING"\n}`,
            res200: `{\n  "acknowledgementToken": "FIU-REC-99481",\n  "reportedAt": "2026-10-13T11:00:00Z"\n}`,
            res422: `{\n  "error": "SUBMISSION_FAILED",\n  "code": "ENCRYPTION_FAILED_500",\n  "message": "Sovereign vault encryption failed."\n}`,
            curl: `curl -X POST "https://api.gov.fintech/v1/aml/str-report" \\\n  -d '{"caseId":"STR-2026-9901"}'`
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
