// Central Data Dictionary
    const DATA = {
      banking: {
        name: 'البنوك',
        code: 'SECTOR_FIN_BANKING',
        services: {
          ips: {
            title: 'التحويل اللحظي',
            code: 'IPS',
            baseUrl: 'https://api.gov.fintech/v1/ips',
            versions: ['v1.0.0', 'v1.1.0-draft'],
            endpoints: [
              {
                method: 'POST',
                path: '/v1/transfers',
                shortName: 'transfers',
                desc: 'تنفيذ أمر تحويل بنكي فوري مطابق لسقف العمليات وضوابط المقاصة الوطنية.',
                params: [
                  { name: 'sourceAccount', type: 'string (IBAN)', req: true, rule: 'صيغة الآيبان الوطني SA-IBAN', tag: 'PII', tagClass: 'badge-pii' },
                  { name: 'destinationAccount', type: 'string (IBAN)', req: true, rule: 'التحقق من صحة المستفيد عبر الدليل الموحد', tag: 'PII', tagClass: 'badge-pii' },
                  { name: 'amount', type: 'decimal', req: true, rule: 'الحد الأقصى للعملية الفردية: 50,000 ر.س', tag: 'Financial', tagClass: 'badge-fin' },
                  { name: 'currency', type: 'string (ISO-4217)', req: true, rule: 'SAR فقط', tag: 'ISO 20022', tagClass: 'badge-iso' },
                  { name: 'idempotencyKey', type: 'string (UUID v4)', req: true, rule: 'صلاحية المفتاح 24 ساعة لمنع تكرار القيد المالي', tag: 'Idempotent', tagClass: 'badge-req' }
                ],
                rules: [
                  { id: 'BR_IPS_001', name: 'الحد الأقصى للتحويل 50,000 ريال', err: 'LIMIT_EXCEEDED_422' },
                  { id: 'BR_IPS_002', name: 'منع التكرار بمفتاح IdempotencyKey', err: 'DUPLICATE_TXN_409' }
                ],
                payload: `{\n  "sourceAccount": "SA0380000000608010167519",\n  "destinationAccount": "SA4420000001234567890123",\n  "amount": 1500.00,\n  "currency": "SAR",\n  "idempotencyKey": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"\n}`,
                res200: `{\n  "status": "SUCCESS",\n  "transactionId": "TXN-88492019",\n  "clearingCode": "SA-IPS-CLR-01"\n}`,
                res422: `{\n  "error": "UNPROCESSABLE_ENTITY",\n  "code": "LIMIT_EXCEEDED_422",\n  "message": "Transfer amount exceeds maximum threshold of 50,000 SAR."\n}`,
                curl: `curl -X POST "https://api.gov.fintech/v1/ips/transfers" \\\n  -H "Authorization: Bearer <TOKEN>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"amount": 1500.00, "currency": "SAR"}'`
              },
              {
                method: 'GET',
                path: '/v1/transfers/{id}',
                shortName: 'status',
                desc: 'الاستعلام الفوري عن حالة المعالجة والتسوية النهائية للحوالة.',
                params: [
                  { name: 'id', type: 'string (Path)', req: true, rule: 'معرف الحوالة الرقمي المقيد', tag: 'Audit Key', tagClass: 'badge-iso' }
                ],
                rules: [
                  { id: 'BR_IPS_003', name: 'متاح الاستعلام حتى 90 يوماً من التنفيذ', err: 'TXN_NOT_FOUND_404' }
                ],
                payload: `// GET Request has no body`,
                res200: `{\n  "transactionId": "TXN-88492019",\n  "status": "SETTLED",\n  "settledAt": "2026-10-05T02:00:00Z"\n}`,
                res422: `{\n  "error": "NOT_FOUND",\n  "code": "TXN_NOT_FOUND_404",\n  "message": "Transaction identifier does not exist."\n}`,
                curl: `curl -X GET "https://api.gov.fintech/v1/ips/transfers/TXN-88492019" \\\n  -H "Authorization: Bearer <TOKEN>"`
              },
              {
                method: 'POST',
                path: '/v1/transfers/{id}/recall',
                shortName: 'recall',
                desc: 'طلب استرجاع رسمي للحوالة الخاطئة وفق اللائحة المنظمة.',
                params: [
                  { name: 'reasonCode', type: 'string', req: true, rule: 'رموز السبب: DUPL, TECH, FRUD', tag: 'Regulatory', tagClass: 'badge-req' }
                ],
                rules: [
                  { id: 'BR_IPS_004', name: 'تقديم الطلب خلال أقل من ساعتين', err: 'RECALL_EXPIRED_422' }
                ],
                payload: `{\n  "reasonCode": "DUPL",\n  "narrative": "Duplicate payment triggered inadvertently"\n}`,
                res200: `{\n  "recallId": "RCL-9921",\n  "status": "PENDING_COUNTERPARTY"\n}`,
                res422: `{\n  "error": "RECALL_WINDOW_EXPIRED",\n  "code": "RECALL_EXPIRED_422",\n  "message": "Recall request submitted after permitted 2-hour window."\n}`,
                curl: `curl -X POST "https://api.gov.fintech/v1/ips/transfers/TXN-88492019/recall" \\\n  -H "Authorization: Bearer <TOKEN>" \\\n  -d '{"reasonCode": "DUPL"}'`
              }
            ]
          },
          balance: {
            title: 'استعلام الحسابات',
            code: 'ACCOUNTS',
            baseUrl: 'https://api.gov.fintech/v1/accounts',
            versions: ['v1.2.0', 'v1.0.0'],
            endpoints: [
              {
                method: 'GET',
                path: '/v1/accounts/{iban}/balance',
                shortName: 'balance',
                desc: 'استعلام الرصيد الدفتري والمتاح بموجب تفويض صريح.',
                params: [
                  { name: 'iban', type: 'string (Path)', req: true, rule: 'صيغة الآيبان الوطني SA-IBAN', tag: 'PII', tagClass: 'badge-pii' }
                ],
                rules: [
                  { id: 'BR_BAL_001', name: 'التحقق من تفويض المصرفية المفتوحة', err: 'CONSENT_EXPIRED_401' }
                ],
                payload: `// GET Request has no body`,
                res200: `{\n  "iban": "SA0380000000608010167519",\n  "availableBalance": 45200.50,\n  "currency": "SAR"\n}`,
                res422: `{\n  "error": "UNAUTHORIZED",\n  "code": "CONSENT_EXPIRED_401",\n  "message": "User consent expired or revoked."\n}`,
                curl: `curl -X GET "https://api.gov.fintech/v1/accounts/SA0380000000608010167519/balance" \\\n  -H "Authorization: Bearer <TOKEN>"`
              }
            ]
          },
          rtgs: {
            title: 'تسويات RTGS',
            code: 'RTGS',
            baseUrl: 'https://api.gov.fintech/v1/rtgs',
            versions: ['v1.0.0-draft'],
            endpoints: [
              {
                method: 'POST',
                path: '/v1/rtgs/settle',
                shortName: 'settle',
                desc: 'إرسال أمر تسوية مالية كبرى للمقاصة المركزية.',
                params: [
                  { name: 'batchId', type: 'string', req: true, rule: 'معرف الدفعة المعتمد', tag: 'Batch', tagClass: 'badge-iso' },
                  { name: 'totalAmount', type: 'decimal', req: true, rule: 'الحد الأدنى 50,000 ر.س', tag: 'Financial', tagClass: 'badge-fin' }
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
        name: 'التجار',
        code: 'SECTOR_MERCHANTS_PAY',
        services: {
          checkout: {
            title: 'الدفع السريع',
            code: 'CHECKOUT',
            baseUrl: 'https://api.gov.fintech/v1/checkout',
            versions: ['v2.0.0', 'v2.1.0-draft', 'v1.9.0'],
            endpoints: [
              {
                method: 'POST',
                path: '/v1/checkout/session',
                shortName: 'checkout',
                desc: 'توليد جلسة دفع إلكترونية مشفرة مع التحقق من الهوية.',
                params: [
                  { name: 'orderRef', type: 'string', req: true, rule: 'رقم الفاتورة الفريد لدى التاجر', tag: 'Order', tagClass: 'badge-iso' },
                  { name: 'amount', type: 'decimal', req: true, rule: 'مبلغ موجب أكبر من الصفر', tag: 'Financial', tagClass: 'badge-fin' },
                  { name: 'currency', type: 'string', req: true, rule: 'SAR أو العملات المقبولة', tag: 'ISO-4217', tagClass: 'badge-iso' }
                ],
                rules: [
                  { id: 'BR_CHK_001', name: 'انتهاء صلاحية الجلسة بعد 15 دقيقة', err: 'SESSION_EXPIRED_410' }
                ],
                payload: `{\n  "orderRef": "ORD-2026-991",\n  "amount": 420.50,\n  "currency": "SAR"\n}`,
                res200: `{\n  "sessionId": "sess_881920",\n  "checkoutUrl": "https://pay.gov.fintech/checkout/sess_881920"\n}`,
                res422: `{\n  "error": "INVALID_AMOUNT",\n  "code": "INVALID_AMOUNT_422",\n  "message": "Amount must be greater than zero."\n}`,
                curl: `curl -X POST "https://api.gov.fintech/v1/checkout/session" \\\n  -d '{"orderRef":"ORD-991","amount":420.50,"currency":"SAR"}'`
              },
              {
                method: 'GET',
                path: '/v1/checkout/{id}/verify',
                shortName: 'verify',
                desc: 'التحقق اللحظي من حالة سحب المبلغ وتوقيع العملية.',
                params: [
                  { name: 'id', type: 'string (Path)', req: true, rule: 'معرف الجلسة الصادر', tag: 'Key', tagClass: 'badge-iso' }
                ],
                rules: [
                  { id: 'BR_CHK_002', name: 'التحقق من توقيع HMAC المعتمد', err: 'INVALID_SIGNATURE_401' }
                ],
                payload: `// GET Request has no body`,
                res200: `{\n  "sessionId": "sess_881920",\n  "status": "PAID",\n  "amountPaid": 420.50\n}`,
                res422: `{\n  "error": "UNAUTHORIZED",\n  "code": "INVALID_SIGNATURE_401",\n  "message": "Signature verification failed."\n}`,
                curl: `curl -X GET "https://api.gov.fintech/v1/checkout/sess_881920/verify"`
              }
            ]
          },
          refund: {
            title: 'الاسترجاع المالي',
            code: 'REFUND',
            baseUrl: 'https://api.gov.fintech/v1/refunds',
            versions: ['v1.0.1'],
            endpoints: [
              {
                method: 'POST',
                path: '/v1/refunds',
                shortName: 'refund',
                desc: 'إصدار أمر رد مالي جزئي أو كلي لحساب العميل.',
                params: [
                  { name: 'chargeId', type: 'string', req: true, rule: 'معرف العملية الأصلية المقبولة', tag: 'Audit', tagClass: 'badge-iso' },
                  { name: 'amount', type: 'decimal', req: true, rule: 'لا يتجاوز رصيد العملية المتبقي', tag: 'Financial', tagClass: 'badge-fin' }
                ],
                rules: [
                  { id: 'BR_REF_001', name: 'الاسترجاع متاح خلال 180 يوماً', err: 'REFUND_TIME_LIMIT_422' }
                ],
                payload: `{\n  "chargeId": "ch_9921",\n  "amount": 100.00\n}`,
                res200: `{\n  "refundId": "rf_10928",\n  "status": "PROCESSED"\n}`,
                res422: `{\n  "error": "REFUND_EXCEEDED",\n  "code": "REFUND_TIME_LIMIT_422",\n  "message": "Refund window has lapsed."\n}`,
                curl: `curl -X POST "https://api.gov.fintech/v1/refunds" \\\n  -d '{"chargeId":"ch_9921","amount":100.00}'`
              }
            ]
          }
        }
      },
      aml: {
        name: 'مكافحة غسل الأموال',
        code: 'SECTOR_AML_COMPLIANCE',
        services: {
          aml: {
            title: 'فحص الحظر AML',
            code: 'AML',
            baseUrl: 'https://api.gov.fintech/v1/aml',
            versions: ['v1.0.0'],
            endpoints: [
              {
                method: 'POST',
                path: '/v1/aml/screening',
                shortName: 'screening',
                desc: 'الفحص اللحظي الفوري لأطراف الحوالة ضد القوائم المعتمدة.',
                params: [
                  { name: 'fullName', type: 'string', req: true, rule: 'الاسم الرباعي كاملاً', tag: 'Watchlist', tagClass: 'badge-req' },
                  { name: 'nationalId', type: 'string', req: false, rule: 'الهوية الوطنية أو رقم الإقامة', tag: 'PII', tagClass: 'badge-pii' }
                ],
                rules: [
                  { id: 'BR_AML_001', name: 'حظر فوري عند التطابق التام 100%', err: 'SANCTION_MATCH_403' }
                ],
                payload: `{\n  "fullName": "Mohammed Al-Salem",\n  "nationalId": "1088291021"\n}`,
                res200: `{\n  "matchStatus": "CLEARED",\n  "riskScore": 0.02\n}`,
                res422: `{\n  "error": "SANCTION_MATCH",\n  "code": "SANCTION_MATCH_403",\n  "message": "Subject matches official regulatory sanctions list."\n}`,
                curl: `curl -X POST "https://api.gov.fintech/v1/aml/screening" \\\n  -d '{"fullName":"Mohammed Al-Salem"}'`
              }
            ]
          }
        }
      }
    };

    // RBAC Data
    const RBAC_DATA = {
      admin: [
        { cat: 'الكتالوج والجهات', p: ['استعراض القطاعات', 'إضافة قطاع جديد', 'تعديل بيانات الجهة'] },
        { cat: 'المعايير والمسارات', p: ['إنشاء مسودة معيار', 'تعديل حقول الطلب', 'تحديد قواعد العمل'] },
        { cat: 'الأمان والتشفير', p: ['إجراء مقارنة الفروقات', 'الختم الرقمي RSA-4096', 'تصدير الوثائق الرسمية'] }
      ],
      architect: [
        { cat: 'الكتالوج والجهات', p: ['استعراض القطاعات'] },
        { cat: 'المعايير والمسارات', p: ['إنشاء مسودة معيار', 'تعديل حقول الطلب', 'تحديد قواعد العمل'] },
        { cat: 'الأمان والتشفير', p: ['إجراء مقارنة الفروقات', 'تصدير الوثائق الرسمية'] }
      ],
      auditor: [
        { cat: 'الكتالوج والجهات', p: ['استعراض القطاعات'] },
        { cat: 'المعايير والمسارات', p: ['استعراض المسارات والحقول'] },
        { cat: 'الأمان والتشفير', p: ['إجراء مقارنة الفروقات', 'تصدير الوثائق الرسمية'] }
      ],
      partner: [
        { cat: 'الكتالوج والجهات', p: ['استعراض القطاعات المسموحة'] },
        { cat: 'المعايير والمسارات', p: ['استعراض المسارات المعتمدة فقط'] },
        { cat: 'الأمان والتشفير', p: ['تصدير الوثائق المعتمدة'] }
      ]
    };