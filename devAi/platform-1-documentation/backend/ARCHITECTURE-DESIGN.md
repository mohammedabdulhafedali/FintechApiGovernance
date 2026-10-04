# 🏛️ Platform 1 Architecture Design — التصميم المعماري لمنصة التوثيق والحوكمة

> **النطاق:** المعمارية الهندسية الشاملة لـ Platform 1 (Documentation & Sovereign Lifecycle)، تشمل محركات الفحص الدلالي، التوقيع الرقمي السيادي، وخادم المحاكاة الفوري.

---

## 1. المخطط العام للمنظومة (High-Level Architecture)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PLATFORM 1: CORE ARCHITECTURE                        │
└────────────────────────────────────────────────────────────────────────┘
          │                                            │
          ▼                                            ▼
┌──────────────────┐                         ┌──────────────────┐
│ API Catalog &    │                         │ Governance &     │
│ Spec Editor      │                         │ Change Requests  │
│ (Strict Schema)  │                         │ (SemVer Engine)  │
└─────────┬────────┘                         └─────────┬────────┘
          │                                            │
          │                                            ▼
          │                                  ┌──────────────────┐
          │                                  │ Semantic Diff &  │
          │                                  │ Breaking Detector│
          │                                  └─────────┬────────┘
          │                                            │
          ▼                                            ▼
┌──────────────────┐                         ┌──────────────────┐
│ Instant Mock &   │                         │ Multi-Sig Vault  │
│ SDK Generator    │                         │ (4-Eyes + KMS)   │
└──────────────────┘                         └─────────┬────────┘
                                                       │
                                                       ▼
                                             ┌──────────────────┐
                                             │ Canonical JCS    │
                                             │ SHA256 + RSA-PSS │
                                             └─────────┬────────┘
                                                       │
                                                       ▼
                                             ┌──────────────────┐
                                             │ Immutable Sealed │
                                             │ Release Snapshot │
                                             └─────────┬────────┘
                                                       │
                           [Official Release Contract] │ (No Parallel Copy)
                                                       ▼
                                            To Platform 2 & Banks
```

---

## 2. خوارزميات محرك الفحص الدلالي (Semantic Breaking-Change Algorithm)

يعمل المحرك على فحص كائنين `v_old` و `v_new` وفق القواعد الصارمة التالية لتحديد نوع الترقية (SemVer) ومنع التجاوزات:

| التغيير المكتشف (Change Type) | التصنيف الحتمي | ترقية الإصدار المطلوبة |
|:-----------------------------|:---------------|:------------------------|
| إضافة حقل إلزامي جديد (`required: true`) في Request Body | **CRITICAL BREAKING** | **MAJOR BUMP** (v1 → v2) |
| حذف حقل موجود مسبقاً من الـ Request أو Response | **CRITICAL BREAKING** | **MAJOR BUMP** |
| تغيير نوع بيانات حقل (`type: string` → `number`) | **CRITICAL BREAKING** | **MAJOR BUMP** |
| تضييق نطاق التحقق (تقليل الـ `max` أو تشديد الـ `pattern`) | **CRITICAL BREAKING** | **MAJOR BUMP** |
| حذف قيمة من قائمة اختيارات مقبولة (`enum values`) | **CRITICAL BREAKING** | **MAJOR BUMP** |
| إضافة كود خطأ جديد يتطلب معالجة مصرفية إجبارية | **BREAKING** | **MAJOR BUMP** |
| إضافة مسار جديد بالكامل (New Endpoint) | **NON-BREAKING** | **MINOR BUMP** (v1.0 → v1.1) |
| إضافة حقل اختياري جديد (`required: false`) | **NON-BREAKING** | **MINOR BUMP** |
| تحسين الوصف النصي أو الأمثلة (Documentation fix) | **PATCH** | **PATCH BUMP** (v1.0.0 → v1.0.1) |

---

## 3. خوارزمية التوحيد والتوقيع الرقمي (Canonical Sealing Pipeline)

لضمان عدم تغير بصمة الـ Hash بسبب الفراغات أو ترتيب المفاتيح، يتم الالتزام الصارم بالخطوات التالية:

### الخطوة 1: التوحيد المعياري (RFC 8785 JSON Canonicalization Scheme - JCS)
* فرز جميع مفاتيح الكائنات (Keys) أبجدياً بصورة تعاودية (Recursive Sorting).
* إزالة المسافات البيضاء والأسطر الفارغة غير الضرورية.
* ترميز المحتوى بـ UTF-8 الصافي.

### الخطوة 2: تجزئة المحتوى (SHA-256 Hashing)
```text
Content_Hash = SHA256( Canonical_Spec_JSON )
```

### الخطوة 3: التوقيع الرقمي بمفاتيح الخزينة السيادية (RSA-PSS 4096-bit)
* الخوارزمية: `RSA-PSS` (Probabilistic Signature Scheme).
* دالة الهاش: `SHA-256`.
* طول الملح (Salt Length): `32 bytes` (معيار البنوك المركزية).
* المفتاح الخاص (Private Key): معزول في خادم Hardware Security Module (HSM / KMS) ولا يظهر في الكود أو قاعدة البيانات مطلقاً.

---

## 4. محرك خادم المحاكاة الفوري (Instant Mock Engine)

* بمجرد تسجيل المسارات، يقوم الـ Mock Server بمطابقة الطلب الوارد مع الـ `endpoints` والـ `fields`.
* إذا أرسل المستهلك طلباً متطابقاً، يولد الخادم استجابة `200/201` باستخدام الـ `example_value` وقوالب الـ Schema المعتمدة.
* إذا خالف الطلب شروط الـ Schema (مثل تجاوز الحد الأقصى للمبلغ)، يرجع الخادم كود الخطأ المحدد في `error_catalog` فوراً.

---

## 5. محرك توليد الأكواد المرجعية (Multi-Language SDK Engine)

يدعم توليد قوالب استدعاء جاهزة ومطابقة لمعايير الأمان المعتمدة:
1. **Java Spring Boot:** استخدام `WebClient` مع تضمين ترويسات المصادقة والتوقيع الرقمي `X-Signature-SHA256` و `X-Idempotency-Key`.
2. **C# .NET 8:** استخدام `HttpClient` مع `JsonSerializerOptions` و `DelegatingHandler` المصرفي.
3. **Python:** استخدام مكتبة `httpx` مع خوارزميات التوقيع والتجزئة التلقائية.
4. **cURL:** أوامر طرفية كاملة للاختبار السريع.

---

## 6. جسر التكامل مع المنصة الثانية (Platform 1 <-> Platform 2 Bridge)

تتصل المنصتان عبر واجهات داخلية مؤمنة (mTLS):

1. **استعلام تحليل الأثر (Impact Analysis Query):**
   * عند فتح Change Request، تستدعي المنصة 1 المنصة 2:
   ```http
   GET /internal/api/v1/consumers-impact?apiCode=INSTANT_PAYMENTS&baseVersion=1.0.0
   ```
   * ترد المنصة 2 بقائمة المؤسسات والبيئات المتأثرة ومستوى الخطورة.

2. **تسليم الـ Snapshot المختوم (Release Notification):**
   * عند إتمام الختم والتوقيع، ترسل المنصة 1 حدثاً (Webhook / Event):
   ```json
   {
     "event": "RELEASE_SEALED",
     "releaseId": "REL-INSTANT_PAYMENTS-2026-5871",
     "apiCode": "INSTANT_PAYMENTS",
     "version": "1.0.0",
     "sha256": "71027c802f60...",
     "canonicalSpecUrl": "/api/v1/releases/REL-INSTANT_PAYMENTS-2026-5871/spec"
   }
   ```
   * تقوم المنصة 2 بتحديث مسار الهجرة وإنشاء حزم الاختبارات المتوافقة فوراً.
