# 🗄️ Platform 1 Database Schema — تصميم قاعدة بيانات منصة التوثيق والحوكمة

> **المعيار الهندسي:** متوافق مع بنود الوثيقة المؤسسية الـ 107 والإضافات الست المعتمدة لحوكمة الـ APIs المالية (FinTech & Banking Standards).  
> **محرك قاعدة البيانات الموصى به:** PostgreSQL 16+ مع دعم `JSONB` للبيانات المرنة وفهارس `BTREE` و `GIN`.

---

## 1. الكتالوج والإصدارات (APIs & Versioning)

### الجدول: `apis`
يخزن المعرفات الرسمية للخدمات والأنظمة المالية.

| الحقل (Field) | النوع (Type) | القيود (Constraints) | الوصف |
|:--------------|:-------------|:---------------------|:------|
| `id` | UUID | PRIMARY KEY, gen_random_uuid() | المعرف الفريد للـ API |
| `code` | VARCHAR(64) | UNIQUE, NOT NULL | كود التعريف (مثل `INSTANT_PAYMENTS`) |
| `name` | VARCHAR(255) | NOT NULL | الاسم الرسمي (مثل National Instant Payment Switch) |
| `description` | TEXT | NULL | الوصف الوظيفي والمعماري للنظام |
| `category` | VARCHAR(64) | NOT NULL | التصنيف (FINTECH, CORE_BANKING, AML, SETTLEMENT) |
| `owner_department` | VARCHAR(128) | NOT NULL | الإدارة المالكة للمواصفة |
| `status` | VARCHAR(32) | NOT NULL, DEFAULT 'ACTIVE' | الحالة (ACTIVE, DEPRECATED, RETIRED) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | تاريخ آخر تعديل |

---

### الجدول: `api_versions`
يمثل كل إصدار معتمد أو مسودة للإصدارات المصرفية.

| الحقل (Field) | النوع (Type) | القيود (Constraints) | الوصف |
|:--------------|:-------------|:---------------------|:------|
| `id` | UUID | PRIMARY KEY | المعرف الفريد للإصدار |
| `api_id` | UUID | FK -> apis(id) ON DELETE RESTRICT | مرجع الـ API الأب |
| `semver` | VARCHAR(32) | NOT NULL | الإصدار الدلالي (مثل `1.0.0`, `1.1.0`) |
| `lifecycle_status` | VARCHAR(32) | NOT NULL | (DRAFT, IN_REVIEW, TESTING, APPROVED, PUBLISHED, DEPRECATED, RETIRED) |
| `release_id` | VARCHAR(128) | UNIQUE, NULLABLE | كود الـ Release الرسمي عند النشر (مثل `REL-IPS-2026-5871`) |
| `is_immutable` | BOOLEAN | NOT NULL, DEFAULT FALSE | تجميد الإصدار للأبد بمجرد النشر (يمنع أي تعديل) |
| `release_notes` | TEXT | NULL | ملاحظات الإصدار |
| `migration_guide_md`| TEXT | NULL | دليل الهجرة للنسخة الجديدة |
| `published_at` | TIMESTAMPTZ | NULL | تاريخ وساعة النشر الرسمي |
| `deprecated_at` | TIMESTAMPTZ | NULL | تاريخ إعلان التقادم وانتهاء الأولوية |
| `sunset_at` | TIMESTAMPTZ | NULL | تاريخ إيقاف الخدمة نهائياً (End-of-Life) |
| `created_by` | UUID | NOT NULL | هوية المنشئ |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | تاريخ الإنشاء |

---

## 2. العقود والمسارات والـ Schemas (Strict API Contracts)

### الجدول: `endpoints`
المسارات المعتمدة ضمن كل إصدار.

| الحقل (Field) | النوع (Type) | القيود (Constraints) | الوصف |
|:--------------|:-------------|:---------------------|:------|
| `id` | UUID | PRIMARY KEY | المعرف الفريد للمسار |
| `version_id` | UUID | FK -> api_versions(id) ON DELETE CASCADE | معرف الإصدار المرتبط |
| `http_method` | VARCHAR(10) | NOT NULL | (GET, POST, PUT, DELETE, PATCH) |
| `path` | VARCHAR(512) | NOT NULL | مسار الـ Endpoint (مثل `/v1/transfers`) |
| `summary` | VARCHAR(255) | NOT NULL | ملخص وظيفي قصير |
| `description` | TEXT | NULL | شرح تفصيلي لآلية عمل المسار |
| `auth_strategy` | VARCHAR(64) | NOT NULL | استراتيجية المصادقة (OAUTH2, MTLS, HMAC_SHA256, API_KEY) |
| `is_idempotent` | BOOLEAN | NOT NULL, DEFAULT FALSE | هل يدعم حماية منع التكرار (Idempotency)؟ |
| `is_deprecated` | BOOLEAN | NOT NULL, DEFAULT FALSE | هل المسار متقادم في هذا الإصدار؟ |

---

### الجدول: `schemas`
المخططات البيانية القابلة لإعادة الاستخدام (Reusable Schemas).

| الحقل (Field) | النوع (Type) | القيود (Constraints) | الوصف |
|:--------------|:-------------|:---------------------|:------|
| `id` | UUID | PRIMARY KEY | المعرف الفريد للـ Schema |
| `version_id` | UUID | FK -> api_versions(id) | الإصدار التابع له |
| `name` | VARCHAR(128) | NOT NULL | اسم المخطط (مثل `TransferRequest`, `AccountReference`) |
| `schema_type` | VARCHAR(32) | NOT NULL, DEFAULT 'OBJECT' | نوع المخطط (OBJECT, ARRAY, PRIMITIVE) |
| `is_reusable` | BOOLEAN | NOT NULL, DEFAULT TRUE | قابلية الاستخدام في أكثر من Endpoint |
| `description` | TEXT | NULL | وصف المخطط وغرضه |

---

### الجدول: `fields`
تعريف دقيق وصارم لكل حقل داخل الـ Schema مع تصنيف الامتثال المصرفي.

| الحقل (Field) | النوع (Type) | القيود (Constraints) | الوصف |
|:--------------|:-------------|:---------------------|:------|
| `id` | UUID | PRIMARY KEY | معرف الحقل |
| `schema_id` | UUID | FK -> schemas(id) ON DELETE CASCADE | الـ Schema التابع لها |
| `name` | VARCHAR(128) | NOT NULL | اسم الحقل (مثل `sourceAccount`, `amount`) |
| `data_type` | VARCHAR(32) | NOT NULL | (STRING, NUMBER, INTEGER, BOOLEAN, OBJECT, ARRAY) |
| `is_required` | BOOLEAN | NOT NULL, DEFAULT FALSE | هل الحقل إلزامي؟ (إضافته = Breaking Change) |
| `is_nullable` | BOOLEAN | NOT NULL, DEFAULT FALSE | هل يقبل القيمة الفارغة؟ |
| `format` | VARCHAR(64) | NULL | الصيغة (iban, uuid, date-time, email, regex) |
| `default_value` | VARCHAR(255) | NULL | القيمة الافتراضية إن وجدت |
| `enum_values` | JSONB | NULL | مصفوفة القيم المقبولة الحصرية |
| `validation_rules` | JSONB | NULL | شروط التحقق (min, max, pattern, length) |
| `compliance_tag` | VARCHAR(32) | NOT NULL, DEFAULT 'GENERAL' | (PII_MASKED, PCI_DSS, FINANCIAL_AUDIT, GENERAL) |
| `example_value` | TEXT | NULL | مثال واقعي لقيمة الحقل في التوثيق والمحاكاة |
| `description` | TEXT | NULL | شرح المعنى المصرفي للحقل |

---

## 3. قواعد العمل وكتالوج الأخطاء (Rules & Errors)

### الجدول: `business_rules`
توثيق قواعد العمل المصرفية التي تتجاوز مجرد شكل الـ JSON.

| الحقل (Field) | النوع (Type) | القيود (Constraints) | الوصف |
|:--------------|:-------------|:---------------------|:------|
| `id` | UUID | PRIMARY KEY | معرف القاعدة |
| `version_id` | UUID | FK -> api_versions(id) | الإصدار التابع له |
| `endpoint_id` | UUID | FK -> endpoints(id) NULLABLE | المسار المرتبط به (إن وجد) |
| `rule_code` | VARCHAR(64) | UNIQUE, NOT NULL | كود القاعدة (مثل `BR_FIN_001`, `BR_AML_002`) |
| `title` | VARCHAR(255) | NOT NULL | عنوان القاعدة |
| `logic_expression`| TEXT | NOT NULL | التعبير المنطقي (مثل `request.amount <= 50000`) |
| `severity` | VARCHAR(32) | NOT NULL | درجة الإلزامية (BLOCKING, WARNING, INFORMATIONAL) |
| `description` | TEXT | NOT NULL | الشرح المصرفي والأساس التنظيمي للقاعدة |

---

### الجدول: `error_catalog`
الكتالوج الموحد للأخطاء وأفعال المعالجة المطلوبة من المستهلك.

| الحقل (Field) | النوع (Type) | القيود (Constraints) | الوصف |
|:--------------|:-------------|:---------------------|:------|
| `id` | UUID | PRIMARY KEY | معرف الخطأ |
| `version_id` | UUID | FK -> api_versions(id) | الإصدار التابع له |
| `error_code` | VARCHAR(64) | NOT NULL | رمز الخطأ المالي (مثل `ERR_4001`, `ERR_4091`) |
| `http_status` | INTEGER | NOT NULL | كود الاستجابة (400, 401, 403, 404, 409, 422, 500) |
| `category` | VARCHAR(64) | NOT NULL | تصنيف الخطأ (VALIDATION, BALANCE, AML, IDEMPOTENCY) |
| `message` | VARCHAR(255) | NOT NULL | نص رسالة الخطأ الرسمية |
| `consumer_action` | TEXT | NOT NULL | ما الذي يجب على البنك/المستهلك فعله لعلاج الخطأ؟ |
| `is_retryable` | BOOLEAN | NOT NULL, DEFAULT FALSE | هل يمكن إعادة محاولة الإرسال فوراً؟ |

---

## 4. شجرة التبعيات والنسب (Lineage & Dependencies)

### الجدول: `schema_lineages`
يربط استخدام الـ Schemas والحقول بالمسارات المشتركة لتوفير استعلامات التبعية الفورية.

| الحقل (Field) | النوع (Type) | القيود (Constraints) | الوصف |
|:--------------|:-------------|:---------------------|:------|
| `id` | UUID | PRIMARY KEY | معرف الرابط |
| `schema_id` | UUID | FK -> schemas(id) ON DELETE CASCADE | الـ Schema المستهدفة |
| `endpoint_id` | UUID | FK -> endpoints(id) ON DELETE CASCADE | المسار المستهلك |
| `usage_location` | VARCHAR(32) | NOT NULL | (REQUEST_BODY, RESPONSE_BODY, QUERY_PARAM, HEADER) |

---

## 5. حوكمة التغيير والاعتماد المتعدد (Change Management & Multi-Sig)

### الجدول: `change_requests`
إدارة طلبات التغيير والفروقات الدلالية.

| الحقل (Field) | النوع (Type) | القيود (Constraints) | الوصف |
|:--------------|:-------------|:---------------------|:------|
| `id` | UUID | PRIMARY KEY | معرف طلب التغيير |
| `cr_number` | VARCHAR(64) | UNIQUE, NOT NULL | رقم الطلب (مثل `CR-2026-0050`) |
| `api_id` | UUID | FK -> apis(id) | الـ API المعني |
| `base_version_id`| UUID | FK -> api_versions(id) | الإصدار الأساسي الحالي |
| `target_semver` | VARCHAR(32) | NOT NULL | الإصدار المقترح الجديد (v1.1.0 أو v2.0.0) |
| `title` | VARCHAR(255) | NOT NULL | عنوان طلب التغيير |
| `reason` | TEXT | NOT NULL | المبرر التجاري والتقني للتعديل |
| `is_breaking` | BOOLEAN | NOT NULL, DEFAULT FALSE | هل التغيير كاسر للتوافق؟ |
| `auto_semver_bump`| VARCHAR(16) | NOT NULL | اقتراح المحرك الدلالي (MAJOR, MINOR, PATCH) |
| `status` | VARCHAR(32) | NOT NULL | (DRAFT, SUBMITTED, IN_REVIEW, APPROVED, REJECTED) |
| `created_by` | UUID | NOT NULL | مقدم الطلب |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | تاريخ التقديم |

---

### الجدول: `approval_signatures`
سجل التوقيع التوافقي المتعدد (Multi-Sig 4-Eyes Principle) قبل الختم.

| الحقل (Field) | النوع (Type) | القيود (Constraints) | الوصف |
|:--------------|:-------------|:---------------------|:------|
| `id` | UUID | PRIMARY KEY | معرف التوقيع |
| `change_request_id` | UUID | FK -> change_requests(id) | طلب التغيير المرتبط |
| `signer_role` | VARCHAR(32) | NOT NULL | الدور (LEAD_ARCHITECT, COMPLIANCE_OFFICER, CSO) |
| `user_id` | UUID | NOT NULL | هوية المسؤول الذي قام بالتوقيع |
| `status` | VARCHAR(32) | NOT NULL | (PENDING, APPROVED, REJECTED) |
| `comments` | TEXT | NULL | الملاحظات والتحفظات إن وجدت |
| `signed_at` | TIMESTAMPTZ | NULL | وقت التوقيع الفعلي |
| `signature_payload` | TEXT | NULL | بصمة التوقيع الرقمي للمسؤول |

---

## 6. الختم المشفر واللقطات الرسمية (Snapshots & Sealing)

### الجدول: `release_snapshots`
مخزن الحقيقة المطلقة؛ اللقطات المجمدة غير القابلة للتلاعب.

| الحقل (Field) | النوع (Type) | القيود (Constraints) | الوصف |
|:--------------|:-------------|:---------------------|:------|
| `id` | UUID | PRIMARY KEY | معرف اللقطة |
| `version_id` | UUID | UNIQUE, FK -> api_versions(id) | الإصدار المنشور المرتبط |
| `release_id` | VARCHAR(128) | UNIQUE, NOT NULL | كود الإصدار (مثل `REL-IPS-2026-5871`) |
| `canonical_spec` | JSONB | NOT NULL | محتوى المواصفة الكامل والموحد بتنسيق Canonical JSON |
| `content_hash_sha256` | VARCHAR(64) | NOT NULL | الهاش التشفيري للمواصفة |
| `signature_rsa_pss` | TEXT | NOT NULL | التوقيع الرقمي بمفتاح الخزينة السيادية (4096-bit) |
| `kms_key_arn` | VARCHAR(255) | NOT NULL | مرجع مفتاح التشفير في الـ HSM / KMS |
| `sealed_by` | UUID | NOT NULL | هوية الـ CSO الذي اعتمد الختم |
| `sealed_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | وقت الختم والتجميد النهائي |

---

## 7. الفهارس وتحسين الأداء (Indexes & Constraints)
```sql
-- سرعة استرجاع المسارات لكل إصدار
CREATE INDEX idx_endpoints_version_id ON endpoints(version_id);

-- سرعة البحث الدلالي في كتالوج الأخطاء
CREATE INDEX idx_error_catalog_code ON error_catalog(version_id, error_code);

-- سرعة استعلام شجرة التبعيات والنسب
CREATE INDEX idx_lineage_schema ON schema_lineages(schema_id);
CREATE INDEX idx_lineage_endpoint ON schema_lineages(endpoint_id);

-- البحث في اللقطات المختومة بالـ Release ID
CREATE UNIQUE INDEX idx_snapshots_release_id ON release_snapshots(release_id);
```
