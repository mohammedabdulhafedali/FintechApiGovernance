# وثيقة المواصفات الفنية للربط والتكامل (API Integration Specification)
## خدمة التحويل المالي الفوري اللحظي (Instant Interbank Transfer Service)
**رمز الخدمة:** `IPS-PAY-01` | **الإصدار:** `v1.4.0` | **التصنيف:** `سري ومقيد - مخصص للبنوك والشركات المالية المعتمدة`

---

### 1. بيانات الوثيقة والتحكم بالإصدار (Document Control)

| المعرف | القيمة |
|:---|:---|
| **النظام المصدّر** | المقسم المالي المركزي ومنظومة الدفع اللحظي (National Instant Switch) |
| **الجهة المستهدفة** | البنوك والمصارف التجارية وشركات التقنية المالية المرخصة (Fintech Entities) |
| **بيئة الاختبار (Sandbox)** | `https://sandbox.gateway.fintech.gov/v1/payments/transfers` |
| **بيئة الاعتماد (UAT/Staging)** | `https://uat.gateway.fintech.gov/v1/payments/transfers` |
| **بيئة الإنتاج الحي (Live)** | `https://api.gateway.fintech.gov/v1/payments/transfers` |
| **بروتوكول النقل** | `HTTPS (TLS 1.3 Strict)` مع تشفير ثنائي الاتجاه `mTLS` |
| **ترميز البيانات ولغتها** | `UTF-8` / `application/json` |

---

### 2. متطلبات الأمان والتفويض (Security & Handshake)

1. **الشهادة الرقمية (Mutual TLS):**
   - يجب على الشريك استخدام شهادة رقمية معتمدة من سلطة الشهادات المصرفية (Banking CA) لتأسيس قناة الاتصال المشفرة.
2. **رمز الوصول (OAuth 2.0 Bearer Token):**
   - الحصول على الرمز عبر استدعاء نقطة النهاية `/oauth/v2/token` بنمط `client_credentials` مع توفير النطاق (Scope) التالي: `payments:instant:write`.
3. **التوقيع الرقمي للطلب (Digital Payload Signature):**
   - كل طلب تحويل يجب أن يتم توقيعه رقمياً باستخدام خوارزمية `RSA-PSS (SHA-256)` بمفتاح البنك الخاص، وتمرير التوقيع بصيغة `Base64` في الترويسة `X-Signature`.
4. **مفتاح عدم التكرار (Idempotency Key):**
   - إلزامي قطعي لمنع تكرار قيد المبالغ المالية عند حدوث انقطاع في الشبكة أو إعادة الإرسال. صلاحية المفتاح **24 ساعة**.

---

### 3. مواصفة نقطة النهاية (Endpoint Specification)

- **الطريقة والمسار:** `POST /v1/payments/transfers`
- **الغرض التشغيلي:** تنفيذ أمر قيد وخصم تحويل بنكي لحظي لحساب مستفيد مع تسوية نهائية فورية في حسابات البنك المركزي خلال مدة لا تتجاوز **3 ثوانٍ**.
- **سقف العملية الفردية:** `50,000.00 ر.س` (خمسون ألف ريال سعودي).
- **الحد الأقصى لمعدل الطلبات (Rate Limit):** `150 طلب/ثانية` مع سقف اندفاع مؤقت `300 طلب/ثانية`.

---

### 4. ترويسات الطلب الإلزامية (Mandatory Request Headers)

| الترويسة (Header) | النوع | الإلزامية | مثال حي للقيمة | الشرح والوظيفة |
|:---|:---|:---:|:---|:---|
| `Authorization` | `string` | إلزامي | `Bearer eyJhbGciOiJSUzI1NiIsInR5c...` | رمز الوصول الصادر عبر مزود الهوية المصرفي. |
| `Content-Type` | `string` | إلزامي | `application/json; charset=utf-8` | صيغة ترميز جسم الطلب. |
| `X-Idempotency-Key` | `UUID v4` | إلزامي | `8f2c3d5e-6b1a-4c9f-8e2d-1a3b5c7d9e0f` | معرف فريد لكل عملية دفع لمنع الازدواجية. |
| `X-Signature` | `Base64` | إلزامي | `dBjftJeZ4CVP-83...Q9vL` | التوقيع الرقمي لحمولة الطلب `Payload`. |
| `X-Correlation-ID` | `UUID v4` | إلزامي | `c1234567-89ab-cdef-0123-456789abcdef` | معرف التتبع الشامل لمطابقة السجلات بين الطرفين. |
| `X-Bank-Code` | `string` | إلزامي | `BKSA001` | الرمز المصرفي المعتمد للبنك المنشئ للطلب. |

---

### 5. حمولة جسم الطلب (Request Body Schema)

#### جدول الحقول:
| الحقل (Attribute) | نوع البيانات | الإلزامية | القواعد والقيود (Constraints) | الشرح والمدلول المصرفي |
|:---|:---|:---:|:---|:---|
| `debtorAccount` | `string` | إلزامي | معيار `SA-IBAN` (24 خانة تبدأ بـ SA) | رقم الحساب البنكي الدولي للمرسل (المحول منه). |
| `creditorAccount` | `string` | إلزامي | معيار `SA-IBAN` (24 خانة تبدأ بـ SA) | رقم الحساب البنكي الدولي للمستفيد (المحول إليه). |
| `creditorName` | `string` | إلزامي | من 3 إلى 140 حرف عربي/إنجليزي | اسم المستفيد الثلاثي المعتمد لدى البنك المستلم. |
| `amount` | `decimal` | إلزامي | رقم عشري بخانتين: `0.01` إلى `50000.00` | مبلغ التحويل الإجمالي الصافي. |
| `currency` | `string` | إلزامي | `SAR` فقط | العملة المعتمدة للمقاصة اللحظية (ريال سعودي). |
| `paymentCategory` | `string (Enum)` | إلزامي | `P2P` \| `B2B` \| `SALARY` \| `BILL_PAYMENT` | تصنيف الغرض من الحوالة لمكافحة غسل الأموال. |
| `remittanceInfo` | `string` | اختياري | بحد أقصى 100 حرف، خالي من المحارف الخاصة | البيان النصي أو ملاحظة العميل المرفقة بالحوالة. |

#### مثال الطلب الفعلي المعتمد (Live Request Payload Example):
```json
{
  "debtorAccount": "SA0380000000608010167519",
  "creditorAccount": "SA4420000001234567890123",
  "creditorName": "سعود فهد عبدالرحمن الشمري",
  "amount": 2750.50,
  "currency": "SAR",
  "paymentCategory": "P2P",
  "remittanceInfo": "سداد دفعة الإيجار الشهري للشقة رقم 4"
}
```

---

### 6. مصفوفة الاستجابات (Response Specifications)

#### أ. الاستجابة الناجحة `HTTP 200 OK` (تمت التسوية بنجاح)
تُرجع عند إتمام قيد العملية وقبولها لحظياً من مقسم المقاصة الوطني والبنك المستلم:

```json
{
  "status": "SETTLED",
  "clearingReference": "IPS-20261013-88492019",
  "transactionId": "TXN-9948201-SA",
  "settledAmount": 2750.50,
  "currency": "SAR",
  "feeAmount": 0.58,
  "debtorAccountMasked": "SA0380000000****7519",
  "creditorAccountMasked": "SA4420000001****0123",
  "settlementTimestamp": "2026-10-13T15:04:22.812Z",
  "endToEndIdentification": "E2E-BKSA001-20261013-000491"
}
```

#### ب. استجابة تكرار الطلب `HTTP 409 Conflict` (مفتاح عدم التكرار مستخدم مسبقاً)
تُرجع في حال قام الشريك بإرسال طلب يحمل نفس الـ `X-Idempotency-Key` لعملية تم تسجيلها من قبل:

```json
{
  "error": "DUPLICATE_TRANSACTION",
  "code": "IDEMPOTENCY_COLLISION_409",
  "message": "This idempotency key was already consumed by an existing transaction.",
  "originalTransactionId": "TXN-9948201-SA",
  "originalStatus": "SETTLED",
  "firstReceivedAt": "2026-10-13T15:04:22.812Z"
}
```

#### ج. استجابة رفض القواعد المصرفية `HTTP 422 Unprocessable Entity` (تجاوز السقف / خطأ حسابي)
تُرجع عند فشل أحد الشروط التنظيمية أو المصرفية:

```json
{
  "error": "BUSINESS_RULE_VIOLATION",
  "code": "CEILING_LIMIT_EXCEEDED_422",
  "message": "Transaction amount exceeds the permitted national single transfer limit of 50,000.00 SAR.",
  "ruleId": "BR-IPS-RULE-001",
  "rejectionCategory": "LIMIT_VIOLATION",
  "timestamp": "2026-10-13T15:04:25.004Z"
}
```

---

### 7. القاموس التشغيلي لأكواد الأخطاء (Error Dictionary)

| كود الخطأ (Error Code) | كود الـ HTTP | المعنى المصرفي والسبب | الإجراء المطلوب من الشريك المصرفي (Action Required) |
|:---|:---:|:---|:---|
| `AUTH_INVALID_TOKEN` | `401` | رمز التفويض منتهي الصلاحية أو غير معتمد. | إعادة تجديد الرمز عبر `/oauth/v2/token`. |
| `INVALID_SIGNATURE` | `403` | التوقيع الرقمي في `X-Signature` غير مطابق. | التحقق من مفتاح الـ RSA الخاص وتنسيق الـ Payload. |
| `ACCOUNT_FROZEN` | `422` | حساب المحول منه أو المستفيد مجمد نظامياً. | إخطار العميل بمراجعة فرع البنك لتحديث البيانات. |
| `INSUFFICIENT_FUNDS` | `422` | الرصيد المتاح في حساب المحول غير كافٍ. | التحقق من رصيد العميل قبل رفع أمر التحويل. |
| `INVALID_IBAN_CHECKSUM` | `422` | رمز الآيبان غير صحيح رياضياً وفق ISO 13616. | التحقق من صحة صياغة الآيبان قبل الإرسال. |
| `BENEFICIARY_BANK_OFFLINE`| `503` | البنك المستلم غير متصل مؤقتاً بشبكة المقاصة. | تفعيل سياسة إعادة المحاولة التلقائية بعد 30 ثانية. |
| `SWITCH_TIMEOUT` | `504` | مهلة الاستجابة اللحظية (3 ثوانٍ) انتهت. | الاستعلام عن حالة الحوالة عبر `GET /transfers/{id}` قبل إعادة الخصم. |

---

### 8. كود الاستدعاء المباشر عبر cURL (Live Integration Snippet)

```bash
curl -X POST "https://sandbox.gateway.fintech.gov/v1/payments/transfers" \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: 8f2c3d5e-6b1a-4c9f-8e2d-1a3b5c7d9e0f" \
  -H "X-Signature: dBjftJeZ4CVP-83wQ...Q9vL=" \
  -H "X-Correlation-ID: c1234567-89ab-cdef-0123-456789abcdef" \
  -H "X-Bank-Code: BKSA001" \
  -d '{
    "debtorAccount": "SA0380000000608010167519",
    "creditorAccount": "SA4420000001234567890123",
    "creditorName": "سعود فهد عبدالرحمن الشمري",
    "amount": 2750.50,
    "currency": "SAR",
    "paymentCategory": "P2P",
    "remittanceInfo": "سداد دفعة الإيجار الشهري للشقة رقم 4"
  }'
```
