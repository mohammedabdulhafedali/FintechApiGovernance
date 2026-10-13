# وثيقة الخطة المعمارية الشاملة: معيار وقالب توثيق الـ APIs الموحد
## Universal API Documentation Standard & Governance Schema (v2.0)

---

## 1. الرؤية الهندسية والهدف الأساسي
تأسيس معيار موحد، ثابت، وشامل (Canonical Specification) لتوثيق وحوكمة كافة واجهات البرمجة التطبيقية (APIs) داخل المنصة؛ بحيث:
1. **قالب موحد وديناميكي 100%:** لا تتغير بنية القالب أو شاشات المنصة إطلاقاً، وتتغير البيانات والقيم فقط لكل API.
2. **توافق كامل مع المعايير الدولية:** مطابقة مواصفة **OpenAPI 3.1.0 (OAS)** ومواصفة **JSON Schema Draft 2020-12**، ومعايير المصرفية المفتوحة (Open Banking / FAPI 1.0 Advanced / ISO 20022).
3. **التخلص التام من القيم الثابتة (Zero Hardcoding):** إلغاء أي جداول أو ترويسات أو أكواد استجابة مكتوبة يدوياً داخل كود الواجهة الأمامية أو الخلفية، والاعتماد المطلق على المحركات المقادة بالمخطط (Schema-Driven UI).

---

## 2. الهيكل المعياري المتسلسل للتوثيق (The Canonical 10 Sections)

يتبع توثيق أي API في المنظومة الترتيب المعياري الصارم التالي:

```text
[1] بطاقة التعريف والميتاداتا (Identity & Metadata)
 └── [2] متطلبات الأمان والهوية والامتثال (Security & Compliance)
      └── [3] محددات الأداء ومستوى الخدمة (Rate Limits & SLAs)
           └── [4] قواعد عدم التكرار والاعتمادية (Idempotency Policies)
                └── [5] مصفوفة ترويسات الطلب (Request Headers Matrix)
                     └── [6] معاملات المسار والاستعلام (Path & Query Parameters)
                          └── [7] جسم الطلب ومخطط البيانات (Request Body Schema & Examples)
                               └── [8] قواعد التحقق المصرفي (Business Validation Rules)
                                    └── [9] مصفوفة الاستجابات الشاملة (Multi-Status Responses Matrix)
                                         └── [10] قاموس أكواد الأخطاء ونماذج الاستدعاء (Error Codes & SDKs)
```

---

### تفصيل الأقسام العشرة ومحتوياتها:

### القسم 1: بطاقة التعريف والميتاداتا (Identity & Metadata)
- **طريقة البروتوكول (HTTP Method):** `GET` | `POST` | `PUT` | `DELETE` | `PATCH`.
- **المسار الرقمي (Path):** المسار بصيغة معيارية مثل `/v1/transfers/{id}`.
- **معرف العملية والاسم المختصر (Operation ID & Short Name):** معرف فريد لا يتكرر لربط أدوات المطورين والـ SDKs.
- **العنوان والوصف الوظيفي (Bilingual Titles & Descriptions):** نص تفصيلي باللغتين العربية والإنجليزية يوضح الغرض المصرفي للعملية.
- **التبعية والتكامل:** المنظومة التابع لها (`systemKey`)، جهة التكامل (`sectorKey`)، واتجاه التكامل (`INBOUND` / `OUTBOUND` / `BIDIRECTIONAL`).
- **قنوات العميل المستهدفة:** (`CORE_SERVER`, `MOBILE`, `WEB`, `POS`).
- **حالة دورة الحياة (Lifecycle Status):** `DRAFT` | `IN_REVIEW` | `TESTING` | `APPROVED` | `PUBLISHED` | `DEPRECATED` | `RETIRED`.
- **روابط البيئات المختلفة (Environment Endpoints):**
  - بيئة المحاكاة والاختبار: `Sandbox Base URL`.
  - بيئة الاعتماد والتكامل: `UAT / Staging Base URL`.
  - بيئة الإنتاج الحي: `Production Base URL`.

### القسم 2: متطلبات الأمان، الهوية، والامتثال (Security & Compliance)
- **نوع المصادقة (Auth Scheme):** (OAuth2 mTLS / Bearer Token / API Key / HMAC Signature).
- **نطاقات الصلاحية الدقيقة (Required Scopes):** مثل `payments:write`, `accounts:read`.
- **تصنيف سرية البيانات (Data Classification):** تحديد وسوم الحماية (`FINANCIAL_CRITICAL`, `PII`, `ISO_20022`, `PCI_DSS`).

### القسم 3: محددات الأداء ومستوى الخدمة (Rate Limits & SLAs)
- **سقف الطلبات القياسي (Rate Limit):** عدد الطلبات في الثانية (Requests Per Second - RPS).
- **سقف الاندفاع المؤقت (Burst Ceiling):** أقصى سعة للمزامنة اللحظية لتفادي إغراق الخوادم.
- **الحصة الدورية (Tier Quota):** الحصة المخصصة يومياً أو شهرياً.
- **زمن الاستجابة المستهدف (Response SLA):** الحد الأقصى لزمن المعالجة (مثال: `< 250ms`).

### القسم 4: قواعد عدم التكرار والاعتمادية (Idempotency & Replay Protection)
- **إلزامية مفتاح عدم التكرار:** هل يتطلب المسار `X-Idempotency-Key` (إلزامي للعمليات المالية التي تعدل الأرصدة).
- **صلاحية المفتاح (TTL):** مدة صلاحية المفتاح في الذاكرة (مثال: 24 ساعة).
- **سلوك الطلب المكرر:** إرجاع نتيجة العملية الأصلية المخزنة بحالة `HTTP 200` دون تكرار القيد المحاسبي.

### القسم 5: مصفوفة ترويسات الطلب الديناميكية (Request Headers Matrix)
جدول ديناميكي يحتوي على:
- اسم الترويسة (`Header Name`).
- نوع البيانات (`string`, `UUIDv4`, `Base64`).
- الإلزامية (`Mandatory`, `Conditional`, `Optional`).
- الوصف المصرفي ودلالة الاستخدام.
- مثال واقعي للترويسة.

### القسم 6: معاملات المسار والاستعلام (Path & Query Parameters)
جدول ديناميكي يحدد:
- اسم المعامل (`Param Name`).
- موقع المعامل (`in: path` أو `in: query`).
- نوع البيانات والقيود (`UUID`, `Integer`, `Regex Pattern`).
- الوصف والغرض التصفوي.

### القسم 7: جسم الطلب ومخطط البيانات (Request Body Schema & Examples)
- **نوع المحتوى:** `application/json` أو `application/xml` أو `multipart/form-data`.
- **جدول الحقول المخطط (Fields Schema Table):**
  - اسم الحقل (مع دعم التداخل `nested.field`).
  - نوع الحقل (`string`, `decimal`, `integer`, `boolean`, `array`).
  - الإلزامية (`Required` / `Optional`).
  - وسوم الخصوصية (`PII`, `Financial`).
  - قواعد التحقق المصرفية (Regex, Range, Length, Enum).
  - الوصف الدلالي للحقل.
- **أمثلة الحمولات الحية (Interactive Wire Examples):**
  - تبديل تلقائي لعرض المثال بصيغ: `JSON` و `XML` و `YAML`.

### القسم 8: شروط وقواعد العمل المصرفي (Business Validation Rules)
- مصفوفة القواعد المنطقية التي تطبقها المنظومة قبل تنفيذ العملية (مثل: الحد الأقصى للحوالة 50,000 ريال، التحقق من سريان حساب المحول منه، كفاية الرصيد الحقيقي).
- ربط كل شرط برمز الخطأ الناتج عنه عند الفشل.

### القسم 9: مصفوفة الاستجابات الشاملة (Multi-Status Responses Matrix)
تحرر كامل من حصر الاستجابات في 200 و 422؛ دعم ديناميكي لأي كود HTTP:
- `200 OK` / `201 Created` / `202 Accepted` / `204 No Content`
- `400 Bad Request` / `401 Unauthorized` / `403 Forbidden` / `404 Not Found`
- `409 Conflict` / `422 Unprocessable Entity` / `429 Too Many Requests`
- `500 Internal Server Error` / `503 Service Unavailable` / `504 Gateway Timeout`

**لكل كود استجابة في المصفوفة:**
- كود الحالة والاسم الرسمي.
- وصف الحالة المصرفية وظروف وقوعها.
- جدول تفصيلي بحقول الرد (Field, Type, Requirement, Semantic Meaning).
- مثال حمولة الرد الكاملة (`JSON Payload Example`).

### القسم 10: قاموس أكواد الأخطاء ونماذج الاستدعاء (Error Dictionary & SDKs)
- جدول رموز الأخطاء الداخلية المتخصصة (مثل `ERR_LIMIT_EXCEEDED`, `ERR_INSUFFICIENT_FUNDS`).
- أمثلة كود مولدة تلقائياً لتكامل الأنظمة (cURL, TypeScript/Fetch, Python/Requests, Java WebClient, C# HttpClient).

---

## 3. النموذج المعياري الكامل لملف التوثيق (Canonical JSON Spec Reference)

```json
{
  "$schema": "https://api.gov.fintech/schemas/v2026/canonical-endpoint-spec.json",
  "specVersion": "2.0.0",
  "metadata": {
    "operationId": "initiateInstantTransfer",
    "method": "POST",
    "path": "/v1/transfers",
    "shortName": "instant-transfer",
    "title": {
      "ar": "تنفيذ أمر تحويل بنكي فوري لحظي",
      "en": "Initiate Instant Bank Settlement Transfer"
    },
    "description": {
      "ar": "تنفيذ أمر تحويل مالي لحظي معتمد بين المصارف عبر شبكة المقاصة الفورية الوطنية مع التحقق الصارم من سقف العمليات ومطابقة حسابات الآيبان.",
      "en": "Executes real-time interbank gross settlement transfer via national instant switch with strict ceiling enforcement and IBAN validation."
    },
    "systemKey": "collection",
    "sectorKey": "banking",
    "direction": "INBOUND",
    "channels": ["CORE_SERVER", "MOBILE"],
    "lifecycleStatus": "PUBLISHED",
    "version": "1.2.0",
    "servers": [
      { "env": "Sandbox", "url": "https://sandbox.api.gov.fintech/v1" },
      { "env": "UAT / Staging", "url": "https://uat.api.gov.fintech/v1" },
      { "env": "Production (Live)", "url": "https://api.gov.fintech/v1" }
    ]
  },
  "security": {
    "authType": "OAuth2_mTLS",
    "requiredScopes": ["payments:write", "clearing:instant"],
    "dataClassification": ["FINANCIAL_CRITICAL", "PII", "ISO_20022"]
  },
  "governancePolicies": {
    "rateLimit": {
      "requestsPerSecond": 100,
      "burstCeiling": 250,
      "monthlyQuota": 2000000
    },
    "sla": {
      "targetLatencyMs": 250,
      "availabilityUptime": "99.99%"
    },
    "idempotency": {
      "required": true,
      "headerKey": "X-Idempotency-Key",
      "ttlSeconds": 86400,
      "duplicateBehavior": "RETURN_CACHED_RESULT_HTTP_200"
    }
  },
  "request": {
    "headers": [
      {
        "name": "Authorization",
        "type": "string (Bearer Token)",
        "required": true,
        "description": "رمز تفويض مالي صادر عبر مزود الهوية المركزي متوافق مع FAPI 1.0 Advanced",
        "example": "Bearer eyJhbGciOiJSUzI1NiIsInR5c..."
      },
      {
        "name": "X-Idempotency-Key",
        "type": "string (UUIDv4)",
        "required": true,
        "description": "مفتاح عدم التكرار الصادر من نظام البنك لمنع ازدواجية الخصم والقيد المالي",
        "example": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
      },
      {
        "name": "X-Signature",
        "type": "string (Base64 RSA-PSS)",
        "required": true,
        "description": "التوقيع الرقمي لمحتوى الطلب باستخدام المفتاح الخاص للبنك RSA 4096",
        "example": "MCwCFQDU7z0a7Z3Y8Q5M+8v9..."
      },
      {
        "name": "X-Correlation-ID",
        "type": "string (UUID)",
        "required": true,
        "description": "معرف التتبع الشامل لمطابقة مسار العملية بين البنك المرسل وشبكة المقاصة",
        "example": "c3f2e1a0-4b5c-6d7e-8f9a-0b1c2d3e4f5a"
      }
    ],
    "parameters": [],
    "body": {
      "contentType": "application/json",
      "fields": [
        {
          "name": "debtorAccount",
          "type": "string (IBAN)",
          "required": true,
          "validationRule": "معيار الآيبان الوطني SA-IBAN (24 حرف ورقم)",
          "tag": "PII",
          "description": "رقم الحساب البنكي للمحول منه (المصدر)"
        },
        {
          "name": "creditorAccount",
          "type": "string (IBAN)",
          "required": true,
          "validationRule": "التحقق من صحة المستفيد عبر الدليل الوطني",
          "tag": "PII",
          "description": "رقم الحساب البنكي للمستفيد (الوجهة)"
        },
        {
          "name": "amount",
          "type": "decimal",
          "required": true,
          "validationRule": "الحد الأقصى للعملية الفردية: 50,000.00 ر.س",
          "tag": "Financial",
          "description": "مبلغ الحوالة المحول"
        },
        {
          "name": "currency",
          "type": "string (ISO-4217)",
          "required": true,
          "validationRule": "SAR فقط للمقاصة اللحظية المحلية",
          "tag": "ISO 20022",
          "description": "عملة الحوالة المقيدة"
        },
        {
          "name": "narrative",
          "type": "string",
          "required": false,
          "validationRule": "نص خالي من الرموز الخاصة، بحد أقصى 140 حرف",
          "tag": "Optional",
          "description": "الغرض من التحويل والبيان المصرفي"
        }
      ],
      "examples": {
        "json": "{\n  \"debtorAccount\": \"SA0380000000608010167519\",\n  \"creditorAccount\": \"SA4420000001234567890123\",\n  \"amount\": 1500.00,\n  \"currency\": \"SAR\",\n  \"narrative\": \"Monthly family invoice transfer\"\n}"
      }
    }
  },
  "businessRules": [
    {
      "id": "BR_IPS_001",
      "name": "سقف الحوالة اللحظية 50,000 ريال",
      "triggerError": "LIMIT_EXCEEDED_422"
    },
    {
      "id": "BR_IPS_002",
      "name": "منع تكرار العملية بنفس مفتاح عدم التكرار",
      "triggerError": "DUPLICATE_TXN_409"
    },
    {
      "id": "BR_IPS_003",
      "name": "كفاية الرصيد الحقيقي القابل للسحب",
      "triggerError": "INSUFFICIENT_FUNDS_422"
    }
  ],
  "responses": [
    {
      "statusCode": 200,
      "statusText": "200 OK — Settled Successfully",
      "description": "تمت معالجة الحوالة بنجاح والتسوية النهائية في حسابات البنك المركزي",
      "fields": [
        { "name": "transactionId", "type": "string (UUID)", "requirement": "Guaranteed", "semantic": "المعرف الوطني الموحد للحوالة" },
        { "name": "status", "type": "string (Enum)", "requirement": "Guaranteed", "semantic": "حالة التنفيذ: SUCCESS" },
        { "name": "clearingCode", "type": "string", "requirement": "Guaranteed", "semantic": "رمز جلسة التسوية المركزية الصادر من البنك المركزي" },
        { "name": "settledAt", "type": "string (ISO-8601)", "requirement": "Guaranteed", "semantic": "التوقيت الزمني الدقيق بالمللي ثانية لتوثيق القيد" }
      ],
      "payloadExample": "{\n  \"status\": \"SUCCESS\",\n  \"transactionId\": \"TXN-88492019\",\n  \"clearingCode\": \"SA-IPS-CLR-01\",\n  \"settledAt\": \"2026-10-13T14:22:10.152Z\"\n}"
    },
    {
      "statusCode": 409,
      "statusText": "409 Conflict — Duplicate Request",
      "description": "محاولة إعادة إرسال طلب تم تنفيذه مسبقاً بنفس الـ Idempotency Key",
      "fields": [
        { "name": "errorCode", "type": "string", "requirement": "Guaranteed", "semantic": "DUPLICATE_TRANSACTION" },
        { "name": "originalTransactionId", "type": "string", "requirement": "Guaranteed", "semantic": "معرف العملية الأصلية التي تم قيدها بالفعل" },
        { "name": "message", "type": "string", "requirement": "Guaranteed", "semantic": "شرح سبب تعارض المفتاح" }
      ],
      "payloadExample": "{\n  \"errorCode\": \"DUPLICATE_TRANSACTION\",\n  \"originalTransactionId\": \"TXN-88492019\",\n  \"message\": \"Idempotency key duplicate detected. Original transfer already executed.\"\n}"
    },
    {
      "statusCode": 422,
      "statusText": "422 Unprocessable Entity — Business Rule Violation",
      "description": "فشل أحد الشروط المصرفية (مثل تجاوز سقف الـ 50,000 ريال أو عدم كفاية الرصيد)",
      "fields": [
        { "name": "errorCode", "type": "string", "requirement": "Guaranteed", "semantic": "رمز الخطأ المصرفي المحدد" },
        { "name": "ruleId", "type": "string", "requirement": "Guaranteed", "semantic": "معرف قاعدة العمل التي تسببت في الرفض" },
        { "name": "message", "type": "string", "requirement": "Guaranteed", "semantic": "نص توضيحي لسبب الرفض المصرفي" }
      ],
      "payloadExample": "{\n  \"errorCode\": \"LIMIT_EXCEEDED_422\",\n  \"ruleId\": \"BR_IPS_001\",\n  \"message\": \"Transfer amount exceeds national instant ceiling of 50,000 SAR.\"\n}"
    }
  ],
  "errorDictionary": [
    { "code": "AUTH_INVALID_TOKEN", "httpStatus": 401, "description": "رمز التفويض مفقود أو منتهي الصلاحية" },
    { "code": "FORBIDDEN_SCOPE", "httpStatus": 403, "description": "الرمز لا يحتوي على صلاحية payments:write" },
    { "code": "DUPLICATE_TXN_409", "httpStatus": 409, "description": "ازدواجية في مفتاح عدم التكرار" },
    { "code": "LIMIT_EXCEEDED_422", "httpStatus": 422, "description": "المبلغ يتجاوز السقف المحدد" },
    { "code": "INSUFFICIENT_FUNDS_422", "httpStatus": 422, "description": "الرصيد المتاح غير كافٍ لتنفيذ الحوالة" },
    { "code": "SWITCH_TIMEOUT_504", "httpStatus": 504, "description": "تجاوز مهلة الاستجابة اللحظية (5 ثوانٍ) في مقسم البنك المركزي" }
  ]
}
```

---

## 4. خطة التعديل التنفيذية خطوة بخطوة (Step-by-Step Code Execution Plan)

| الخطوة | الملف المتأثر | نوع التعديل | ملخص ما سيتم تنفيذه |
|:---|:---|:---|:---|
| **1** | `platform-1-documentation/backend/src/domain/entities/Endpoint.ts` | تعديل الكيان الخلفي | دعم تعدد الاستجابات (`responses: EndpointResponse[]`)، وإضافة كائنات `RateLimit`، `EnvironmentUrls`، و `IdempotencyPolicy`. |
| **2** | `platform-1-documentation/frontend/src/types/schema.ts` | تحديث المخطط الأمامي | التخلص من حقول `res200` و `res422` المقيدة، وإضافة واجهات ديناميكية متوافقة مع معيار OpenAPI 3.1. |
| **3** | `platform-1-documentation/frontend/src/components/catalog/SpecViewer.tsx` | إعادة هندسة الواجهة | حذف الترويسات والاستجابات الثابتة في الكود، وبناء عارض تفاعلي ديناميكي 100% يرسم أي ترويسات وأي أكواد استجابة وأمثلتها تلقائياً مع محول حي للـ XML و YAML. |
| **4** | `platform-1-documentation/frontend/src/components/catalog/DocumentationHub.tsx` | تحديث منشئ التوثيق | تمكين المطور من إدخال أي كود استجابة (201, 400, إلخ) وترويسات خاصة بكل API بدلاً من التقييد بحقلين ثابتين. |
| **5** | `platform-1-documentation/frontend/src/data/mockData.ts` | ترقية البيانات التجريبية | تحديث بيانات الـ Endpoints الحالية لتطابق الهيكل الجديد دون أي تعارض أو كسر للشاشات. |

---

## 5. حالة الاعتماد والأمر بالتنفيذ
- تم حفظ هذه الوثيقة كمرجع كامل للمشروع في: `docs/API_DOCUMENTATION_STANDARD_PLAN.md`.
- بإمكانكم نسخها، مراجعتها، وإجراء أي تعديل ترغبون به.
- فور اعتمادكم النهائي وإصدار أمركم بكلمة **"نفذ"**، سيتم البدء الفوري في التطبيق البرمجي خطوة بخطوة.
