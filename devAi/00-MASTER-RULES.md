# MASTER RULES

## Dynamic AI Software Engineering Framework

**Document:** `00-MASTER-RULES.md`
**Purpose:** الدستور الهندسي للمشروع
**Scope:** جميع مراحل دورة حياة البرمجيات، وجميع المطورين، والـ AI Agents، والأدوات، والبيئات.
**Status:** Master Engineering Rules
**Version:** 1.0.0

---

# 0. PURPOSE

هذه الوثيقة هي المرجع الأعلى لقواعد تطوير المشروع.

يجب أن تهدف عملية التطوير إلى إنتاج Software يكون:

* صحيحًا Functional
* آمنًا Secure
* قابلًا للاختبار Testable
* قابلًا للصيانة Maintainable
* قابلًا للتوسع Scalable
* موثوقًا Reliable
* قابلًا للمراقبة Observable
* موثقًا Documented
* قابلًا للتتبع Traceable
* قابلًا للنشر والتراجع Deployable/Rollbackable
* قابلًا للفهم من البشر والـ AI
* قابلًا للتطوير مستقبلًا دون تدمير الأجزاء الموجودة

---

# 1. HIERARCHY OF RULES

عند وجود تعارض، تطبق الأولوية التالية:

1. القوانين واللوائح والمتطلبات التنظيمية.
2. متطلبات أمن المعلومات والخصوصية.
3. متطلبات المؤسسة والسياسات الداخلية.
4. متطلبات المشروع المعتمدة.
5. Architecture Decisions المعتمدة.
6. API/Data Contracts المعتمدة.
7. هذه الوثيقة.
8. Guidelines وBest Practices.
9. تفضيلات المطور الشخصية.

لا يجوز استخدام قاعدة تقنية لتجاوز متطلب قانوني أو أمني أو تجاري معتمد.

---

# 2. RULE CLASSIFICATION

كل قاعدة في هذا الملف تقع ضمن إحدى الفئات:

### MUST

إلزامية.

### MUST NOT

ممنوعة.

### SHOULD

ممارسة موصى بها، ويمكن تجاوزها بمبرر.

### SHOULD NOT

يفضل تجنبها إلا بسبب واضح.

### MAY

اختيارية.

### EXCEPTION

أي استثناء يجب توثيقه.

---

# 3. GOLDEN RULES

## GR-001 — No Assumptions

لا يجوز للـ AI أو المطور افتراض Requirement غير معروف.

إذا كان المطلوب غير واضح:

> توقف → اذكر نقطة الغموض → اسأل → انتظر الإجابة.

---

## GR-002 — Understand Before Implement

لا يبدأ التنفيذ قبل فهم:

* الهدف
* المشكلة
* المتطلبات
* القيود
* Architecture
* البيانات
* التأثيرات
* Acceptance Criteria

---

## GR-003 — Documentation Before Significant Code

أي تغيير معماري أو Feature كبيرة يجب تحليلها وتوثيقها قبل التنفيذ.

---

## GR-004 — Small Controlled Changes

لا تنفذ تغييرات ضخمة غير قابلة للمراجعة في خطوة واحدة.

---

## GR-005 — Never Invent

يُمنع اختراع:

* API
* Database fields
* endpoints
* business rules
* credentials
* configuration
* dependencies
* user requirements

---

## GR-006 — Preserve Existing Behavior

لا يجوز تغيير سلوك موجود دون معرفة تأثير التغيير.

---

## GR-007 — Explicit Change

كل تغيير يجب أن يكون:

* مقصودًا
* مفهومًا
* قابلًا للمراجعة
* قابلًا للتتبع

---

## GR-008 — Reversible Changes

كل تغيير مهم يجب أن يكون قابلًا للتراجع أو توجد له Recovery Strategy.

---

## GR-009 — Evidence Over Claims

لا تقل:

> Tested successfully

إلا إذا تم الاختبار فعليًا.

ولا تقل:

> Production ready

دون وجود أدلة مناسبة.

---

## GR-010 — Quality Over Speed

السرعة لا تبرر:

* تجاهل الأمن
* كسر الـ API
* حذف الاختبارات
* تجاهل التوثيق
* إدخال Technical Debt غير معروف

---

# 4. AI COLLABORATION RULES

## AI-001 — Read Project Context

في بداية جلسة العمل يجب قراءة:

```text
01-PROJECT-BRIEF.md
02-ROADMAP.md
03-DECISIONS-LOG.md
```

والمستندات ذات العلاقة قبل التنفيذ.

---

## AI-002 — Identify Unknowns

يجب على AI تحديد المعلومات الناقصة بدل تخمينها.

---

## AI-003 — Explain Plan Before Large Changes

قبل التغييرات الكبيرة يجب تقديم:

1. فهم المطلوب
2. الملفات المتأثرة
3. الخطة
4. المخاطر
5. الاختبارات
6. التغييرات المتوقعة

---

## AI-004 — Approval Gate

لا ينفذ AI تغييرًا معماريًا أو destructive operation قبل الموافقة المطلوبة.

---

## AI-005 — No Silent Architecture Changes

لا يجوز تغيير:

* Architecture
* Framework
* Database
* API contract
* Authentication
* Authorization
* Folder structure الرئيسية

بشكل صامت.

---

## AI-006 — No Silent Dependency Installation

لا تضف dependency جديدة دون:

* سبب
* البديل
* التأثير
* الترخيص
* المخاطر
* الموافقة عند الحاجة

---

## AI-007 — No Unrequested Refactoring

لا تستغل Feature صغيرة لإعادة كتابة المشروع كاملًا.

---

## AI-008 — No Destructive Commands Without Approval

مثل:

```text
DROP DATABASE
DELETE
rm -rf
reset --hard
force push
schema destruction
production data modification
```

يجب أن تتطلب موافقة صريحة عندما يكون لها تأثير خطير.

---

## AI-009 — Preserve User Terminology

إذا استخدم المطور مصطلحًا تقنيًا محددًا، يجب الحفاظ عليه.

إذا كان المصطلح غامضًا، اسأل ولا تستبدله بتخمين.

---

## AI-010 — AI Must Report Changes

بعد التنفيذ يجب أن يوضح:

* ماذا تغير؟
* لماذا؟
* الملفات؟
* الاختبارات؟
* النتائج؟
* المشاكل المتبقية؟
* المخاطر؟

---

## AI-011 — AI Must Distinguish Facts From Assumptions

يجب الفصل بين:

```text
Confirmed
Observed
Inferred
Assumed
Unknown
```

---

## AI-012 — AI Must Not Fake Evidence

لا يجوز إنشاء:

* Fake test results
* Fake logs
* Fake API responses
* Fake screenshots
* Fake approvals
* Fake deployment status

---

# 5. REQUIREMENTS ENGINEERING

## REQ-001

كل Feature يجب أن يكون لها هدف واضح.

## REQ-002

كل Requirement يجب أن تكون قابلة للفهم والاختبار.

## REQ-003

تجنب المتطلبات الغامضة مثل:

> fast
> easy
> secure
> scalable

إلا إذا تم تحويلها إلى معايير قابلة للقياس.

## REQ-004

كل Feature يجب أن تحتوي عند الحاجة على:

* Description
* Business Goal
* Actors
* Preconditions
* Main Flow
* Alternative Flows
* Error Flows
* Business Rules
* Acceptance Criteria
* Security Requirements
* Performance Requirements
* Data Requirements

## REQ-005

يجب التفريق بين:

```text
Functional Requirements
Non-Functional Requirements
Business Rules
Constraints
Assumptions
Dependencies
```

## REQ-006

كل Requirement مهمة يجب أن تكون Traceable إلى:

```text
Requirement
→ Design
→ Code
→ Test
→ Release
```

---

# 6. PROJECT PLANNING

## PLAN-001

كل Feature كبيرة يجب أن تكون مرتبطة بالـ Roadmap.

## PLAN-002

قسم العمل إلى وحدات صغيرة قابلة للمراجعة.

## PLAN-003

حدد Dependencies قبل التنفيذ.

## PLAN-004

حدد Risks.

## PLAN-005

حدد Acceptance Criteria قبل اعتبار العمل مكتملًا.

## PLAN-006

لا تبدأ Development لعمل غير مفهوم.

---

# 7. ARCHITECTURE

## ARCH-001

Architecture يجب أن تخدم متطلبات النظام، لا أن تكون مجرد استعراض تقني.

## ARCH-002

افصل المسؤوليات.

## ARCH-003

قلل Coupling.

## ARCH-004

زد Cohesion.

## ARCH-005

اعتمد Abstraction عند وجود سبب حقيقي.

## ARCH-006

لا تستخدم Abstraction لمجرد أن "Clean Architecture تتطلب ذلك".

## ARCH-007

كل قرار معماري مهم يجب أن يسجل في:

```text
03-DECISIONS-LOG.md
```

## ARCH-008

استخدم ADRs للقرارات الكبيرة.

## ARCH-009

كل Architecture يجب أن توضح:

* Components
* Responsibilities
* Dependencies
* Data Flow
* External Systems
* Security Boundaries
* Failure Modes

## ARCH-010

لا تسمح بتسرب تفاصيل Infrastructure إلى Domain دون سبب.

---

# 8. SOLID

يجب استخدام مبادئ SOLID كإرشادات هندسية:

### S — Single Responsibility

كل وحدة يجب أن يكون لها مسؤولية واضحة.

### O — Open/Closed

التصميم يجب أن يسمح بالتوسع دون تعديل غير ضروري في السلوك الموجود.

### L — Liskov Substitution

Implementations يجب أن تحترم العقود.

### I — Interface Segregation

لا تفرض Interfaces ضخمة على consumers.

### D — Dependency Inversion

اعتمد على abstractions عند الحاجة، وليس implementations بلا داعٍ.

---

# 9. GENERAL ENGINEERING PRINCIPLES

## PRINCIPLE-001 — KISS

Keep It Simple.

لا تجعل النظام أكثر تعقيدًا من الحاجة.

## PRINCIPLE-002 — DRY

لا تكرر نفس المعرفة أو المنطق بلا سبب.

## PRINCIPLE-003 — YAGNI

لا تبنِ Features مستقبلية لمجرد احتمال استخدامها.

## PRINCIPLE-004 — Separation of Concerns

افصل المسؤوليات.

## PRINCIPLE-005 — Least Privilege

كل component/user/service يحصل على أقل صلاحيات يحتاجها.

## PRINCIPLE-006 — Fail Fast

اكتشف الأخطاء مبكرًا عندما يكون ذلك آمنًا ومناسبًا.

## PRINCIPLE-007 — Explicit Over Implicit

السلوك المهم يجب أن يكون واضحًا.

## PRINCIPLE-008 — Convention Over Chaos

استخدم conventions موحدة.

---

# 10. PROJECT STRUCTURE

يجب أن تكون بنية المشروع:

* واضحة
* متوقعة
* قابلة للتوسع
* موحدة

لا تنشئ:

```text
misc/
stuff/
temp/
new/
new2/
final/
final2/
```

لأغراض دائمة.

---

# 11. NAMING

الأسماء يجب أن تكون:

* واضحة
* متسقة
* قابلة للبحث
* معبرة عن المعنى

تجنب:

```text
x
tmp
data2
thing
foo
bar
```

في الكود الإنتاجي.

---

# 12. TYPESCRIPT / STATIC TYPING

إذا كان المشروع TypeScript:

## TS-001

استخدم Strict Mode.

## TS-002

تجنب `any`.

## TS-003

لا تستخدم `any` لإخفاء مشكلة Type.

## TS-004

استخدم Types وInterfaces المناسبة.

## TS-005

تحقق من External Data عند الحدود.

## TS-006

لا تثق بأن TypeScript يحمي البيانات القادمة من API أو User.

---

# 13. CODE QUALITY

## CODE-001

الكود يجب أن يكون:

* readable
* maintainable
* testable
* predictable

## CODE-002

الدالة يجب ألا تقوم بعدة مسؤوليات غير مترابطة.

## CODE-003

تجنب Functions الضخمة.

## CODE-004

تجنب Nested Logic العميق.

## CODE-005

استخدم Early Returns عندما تحسن القراءة.

## CODE-006

تجنب Magic Numbers.

## CODE-007

تجنب Magic Strings.

## CODE-008

لا تكرر Business Rules.

## CODE-009

لا تستخدم comments لتعويض كود سيئ.

## CODE-010

التعليق يشرح "لماذا"، وليس فقط "ماذا".

---

# 14. DOCUMENTATION

يجب توثيق:

* Architecture
* Requirements
* Decisions
* APIs
* Configuration
* Deployment
* Operations
* Security
* Troubleshooting
* Important Business Rules

## DOC-001

التوثيق يجب أن يعيش قريبًا من الشيء الذي يصفه.

## DOC-002

لا تسمح بتوثيق قديم معروف.

## DOC-003

عند تغيير API يجب تحديث وثيقتها.

---

# 15. FRONTEND

## FE-001

Components يجب أن تكون قابلة لإعادة الاستخدام عندما يكون ذلك منطقيًا.

## FE-002

لا تجعل Component مسؤولًا عن:

* UI
* Business Logic
* API
* State
* Validation
* Formatting

كلها معًا دون سبب.

## FE-003

افصل:

```text
Presentation
State
Business Logic
API Access
Validation
```

## FE-004

كل UI State مهمة يجب التعامل معها:

```text
Loading
Success
Empty
Error
Retry
Unauthorized
Forbidden
```

## FE-005

لا تعرض Secrets في Frontend.

## FE-006

لا تثق في Frontend Validation كحماية أمنية.

---

# 16. UX / UI

يجب أن يكون النظام:

* واضحًا
* predictable
* consistent
* accessible
* responsive
* usable

يجب توحيد:

* Buttons
* Forms
* Errors
* Notifications
* Loading
* Tables
* Modals
* Navigation

---

# 17. ACCESSIBILITY

عند انطباقها:

* keyboard navigation
* semantic HTML
* labels
* focus management
* sufficient contrast
* screen-reader compatibility
* meaningful error messages

---

# 18. BACKEND

افصل قدر الإمكان بين:

```text
Transport
Controller
Application
Domain
Infrastructure
Persistence
```

ولا تجعل Controller يحتوي كل Business Logic.

---

# 19. API ENGINEERING

## API-001

كل API يجب أن يكون لها Contract واضح.

## API-002

Contract يجب أن يحدد عند الحاجة:

* Method
* Path
* Parameters
* Headers
* Authentication
* Request
* Response
* Status Codes
* Error Format
* Validation
* Business Rules
* Examples

## API-003

استخدم OpenAPI حيث يكون مناسبًا.

## API-004

لا تكسر API Consumers دون Versioning/Migration Strategy.

## API-005

حدد Compatibility Policy.

## API-006

لا تغير Field semantics بصمت.

## API-007

لا تغير Data Type دون تقييم Impact.

## API-008

الأخطاء يجب أن تكون consistent.

## API-009

لا ترسل Stack Traces أو Secrets للمستخدم.

---

# 20. API VERSIONING

يجب تحديد سياسة واضحة:

```text
Major
Minor
Patch
```

أو سياسة Versioning أخرى معتمدة.

يجب تحديد:

* متى تحدث Breaking Change؟
* متى تحدث Non-Breaking Change؟
* مدة دعم الإصدار؟
* Deprecation؟
* Migration؟
* Retirement؟

---

# 21. API COMPATIBILITY

قبل Breaking Change:

```text
Identify Consumers
→ Impact Analysis
→ Notify
→ Migration Guide
→ New Version
→ Testing
→ Release
→ Deprecation
→ Retirement
```

---

# 22. IDEMPOTENCY

العمليات الحساسة، خصوصًا المالية، يجب أن تدرس Idempotency.

يجب منع التكرار غير المقصود للعمليات مثل:

* Payment
* Transfer
* Refund
* Settlement
* Retry-sensitive operations

---

# 23. DATABASE

## DB-001

Database Schema جزء من Architecture.

## DB-002

لا تغير Schema مباشرة في Production دون Migration Strategy.

## DB-003

كل Migration يجب أن تكون قابلة للتتبع.

## DB-004

افهم:

* Primary Keys
* Foreign Keys
* Indexes
* Constraints
* Transactions
* Isolation
* Concurrency

## DB-005

لا تحذف Data Production بلا Authorization وBackup/Recovery Plan.

---

# 24. DATABASE MIGRATIONS

كل Migration يجب أن تحدد:

* Version
* Purpose
* Up
* Down/Rollback strategy
* Dependencies
* Data impact
* Estimated risk

---

# 25. DATA INTEGRITY

لا تسمح للنظام بإنتاج بيانات غير متسقة.

تحقق من:

* constraints
* transactions
* validation
* concurrency
* duplicate prevention
* referential integrity

---

# 26. SECURITY

الأمن ليس مرحلة في نهاية المشروع.

يجب دمجه في:

```text
Requirements
→ Architecture
→ Development
→ Testing
→ Deployment
→ Operations
```

وهذا يتوافق مع فلسفة Secure Software Development Framework لدى NIST.

---

# 27. SECURITY PRINCIPLES

يجب تطبيق:

* Least Privilege
* Defense in Depth
* Secure Defaults
* Fail Securely
* Input Validation
* Output Encoding
* Authentication
* Authorization
* Auditability
* Secrets Protection
* Encryption where appropriate

---

# 28. AUTHENTICATION

يجب التفريق بين:

```text
Authentication
Authorization
Session Management
Identity
Credential Management
```

لا تعتبر تسجيل الدخول Authorization.

---

# 29. AUTHORIZATION

يجب التحقق من الصلاحيات في Server Side.

لا تعتمد على:

```text
hidden button
frontend route guard
client-side condition
```

كحماية وحيدة.

---

# 30. SECRETS

ممنوع وضع:

* Passwords
* API Keys
* Private Keys
* Tokens
* Database credentials

داخل Git أو Source Code.

استخدم Secret Management مناسبًا.

---

# 31. CRYPTOGRAPHY

لا تخترع خوارزميات تشفير.

استخدم Libraries وAlgorithms موثوقة ومناسبة.

يجب توثيق:

* Algorithm
* Key Management
* Rotation
* Storage
* Purpose
* Threat Model

---

# 32. INPUT VALIDATION

كل External Input يجب اعتباره غير موثوق:

```text
HTTP
Headers
Query
Body
Files
Cookies
Webhooks
Messages
External APIs
```

---

# 33. OUTPUT SECURITY

لا تكشف:

* Passwords
* Tokens
* Private Keys
* Internal Stack Traces
* Sensitive Personal Data

دون حاجة مشروعة.

---

# 34. OWASP

يجب اعتبار OWASP مرجعًا أساسيًا لتقييم مخاطر Web/API Security.

عند المشاريع الحساسة، يجب استخدام Verification/Testing مناسب، وليس الاكتفاء بمراجعة الكود.

---

# 35. PRIVACY

يجب تحديد:

* ما البيانات التي نجمعها؟
* لماذا؟
* من يستطيع الوصول؟
* مدة الاحتفاظ؟
* أين تخزن؟
* متى تحذف؟
* هل يتم تسجيلها في Logs؟

---

# 36. PERSONAL / SENSITIVE DATA

لا تسجل Sensitive Data في Logs إلا عند الضرورة وبسياسة واضحة.

استخدم Masking/Redaction.

مثال:

```text
4111111111111111
```

لا يجب أن يظهر كاملًا في Log عادي.

---

# 37. LOGGING

Logs يجب أن تكون:

* useful
* searchable
* structured
* timestamped
* correlated

عند الحاجة استخدم:

```text
requestId
correlationId
traceId
userId
service
environment
severity
```

مع مراعاة الخصوصية.

---

# 38. ERROR HANDLING

لا تستخدم:

```text
catch(e) {}
```

بلا سبب.

يجب:

* تسجيل الخطأ عند الحاجة
* إرجاع Error مناسب
* الحفاظ على Security
* عدم إخفاء Root Cause داخليًا
* عدم كشف معلومات حساسة خارجيًا

---

# 39. ERROR TAXONOMY

فرق بين:

```text
Validation Error
Authentication Error
Authorization Error
Not Found
Conflict
Business Error
Dependency Error
Infrastructure Error
Unexpected Error
```

---

# 40. OBSERVABILITY

النظام Production يجب أن يكون قابلًا للملاحظة عبر:

```text
Logs
Metrics
Traces
Health Checks
Alerts
```

---

# 41. MONITORING

يجب مراقبة ما يهم Business وTechnical Operations.

مثل:

* Availability
* Error Rate
* Latency
* Throughput
* Resource Usage
* Dependency Health
* Queue Health
* Database Health

---

# 42. PERFORMANCE

لا تعمل Optimization عشوائيًا.

القاعدة:

```text
Measure
→ Identify Bottleneck
→ Optimize
→ Measure Again
```

---

# 43. SCALABILITY

يجب معرفة:

* Expected Load
* Peak Load
* Growth
* Bottlenecks
* Database Limits
* External Dependency Limits

لا تفترض أن Horizontal Scaling يحل كل شيء.

---

# 44. RELIABILITY

صمم النظام للتعامل مع:

* Network failure
* Timeout
* Retry
* Dependency failure
* Partial failure
* Duplicate request
* Service restart

---

# 45. RETRIES

لا تستخدم Retry بلا حدود.

يجب التفكير في:

* timeout
* retry count
* backoff
* jitter
* idempotency
* circuit breaking

---

# 46. TIMEOUTS

External calls يجب ألا تنتظر إلى الأبد.

كل dependency يجب أن يكون لها Timeout مناسب.

---

# 47. TESTING PRINCIPLES

الاختبار ليس فقط للتأكد أن الكود يعمل.

يجب أن يكتشف:

* defects
* regressions
* contract violations
* security problems
* performance issues
* integration problems

---

# 48. TESTING PYRAMID

استخدم طبقات مناسبة من:

```text
Unit Tests
Integration Tests
Contract Tests
End-to-End Tests
Acceptance Tests
```

لا تجعل E2E الحل الوحيد.

---

# 49. UNIT TESTS

اختبر:

* Business Logic
* Edge Cases
* Error Cases
* Important transformations

---

# 50. INTEGRATION TESTS

اختبر التكامل الحقيقي أو شبه الحقيقي مع:

* Database
* APIs
* Queues
* External services
* Authentication

عند الحاجة.

---

# 51. CONTRACT TESTING

عندما تعتمد أنظمة على APIs، اختبر أن Provider وConsumer متوافقان مع Contract.

---

# 52. API TESTING

لكل API مهم:

```text
Happy Path
Validation
Missing Fields
Invalid Types
Boundary Values
Authentication
Authorization
Duplicate Requests
Concurrency
Timeout
Dependency Failure
Unexpected Input
Error Responses
Response Schema
Headers
Status Codes
```

---

# 53. SECURITY TESTING

عند الحاجة:

* SAST
* DAST
* Dependency Scanning
* Secret Scanning
* Container Scanning
* API Security Testing
* Penetration Testing

---

# 54. REGRESSION

كل Bug مهم يجب أن يتحول عند الحاجة إلى Regression Test.

---

# 55. TEST DATA

لا تستخدم Production Data الحقيقي في Testing إلا إذا كان ذلك مصرحًا ومحمياً ومبررًا.

يفضل:

* synthetic data
* masked data
* isolated environments

---

# 56. MOCKING

استخدم Mocking عندما يكون مفيدًا.

لا تجعل كل شيء Mock بحيث تفشل الاختبارات في اكتشاف مشاكل Integration الحقيقية.

---

# 57. TEST ENVIRONMENTS

افصل البيئات بوضوح:

```text
Development
Testing
UAT
Staging
Production
```

حسب حاجة المشروع.

---

# 58. DEFINITION OF READY

Feature لا تبدأ Development إلا إذا كانت جاهزة بما يكفي.

عند الحاجة يجب أن يكون لديها:

* Requirement
* Scope
* Acceptance Criteria
* Dependencies
* Design
* Security Considerations
* Test Strategy

---

# 59. DEFINITION OF DONE

لا تعتبر Feature Done لمجرد أن الكود كتب.

عند انطباقها:

```text
Code
+ Review
+ Tests
+ Security
+ Documentation
+ Acceptance
+ Build
+ Deployment readiness
```

---

# 60. CODE REVIEW

كل تغيير مهم يجب أن يمر بمراجعة مناسبة.

Reviewer يتحقق من:

* Correctness
* Security
* Maintainability
* Tests
* Architecture
* Performance
* API compatibility
* Documentation

---

# 61. REVIEW PRINCIPLES

Code Review ليس:

> هل يعجبني الكود؟

بل:

> هل يحقق المتطلبات بطريقة آمنة وصحيحة وقابلة للصيانة؟

---

# 62. GIT

استخدم Version Control لكل Source Code وConfiguration المناسب.

لا تعمل مباشرة على Production Repository دون Process مناسب.

---

# 63. COMMITS

Commit يجب أن يكون:

* صغيرًا نسبيًا
* منطقيًا
* قابلًا للفهم
* مرتبطًا بالتغيير

تجنب:

```text
update
fix
changes
stuff
final
```

---

# 64. BRANCHING

استخدم Branch Strategy مناسبة للفريق.

لا توجد استراتيجية واحدة صحيحة لكل مشروع.

المهم:

* حماية branches المهمة
* Code Review
* CI
* Traceability
* Controlled merging

---

# 65. NO FORCE PUSH

لا تستخدم Force Push على Branch مشترك أو محمي دون سبب وإجراء معتمد.

---

# 66. CI

كل Pull/Merge Request مهم يجب أن يمر عبر Automated Checks المناسبة:

```text
Build
Lint
Type Check
Unit Tests
Integration Tests
Security Checks
```

---

# 67. CD

Deployment يجب أن يكون:

* repeatable
* traceable
* automated where appropriate
* auditable
* reversible

---

# 68. DEPLOYMENT

لا تجعل Production Deployment عملية تعتمد على:

> "أنا أعرف كيف أفعلها يدويًا."

يجب توثيقها وأتمتتها تدريجيًا.

---

# 69. ENVIRONMENT CONFIGURATION

Configuration يجب ألا تكون hard-coded.

افصل:

```text
Code
Configuration
Secrets
Environment
```

---

# 70. ENVIRONMENT PARITY

اجعل البيئات متشابهة قدر الإمكان مع اختلاف:

* credentials
* endpoints
* scale
* secrets
* environment-specific configuration

---

# 71. FEATURE FLAGS

استخدم Feature Flags عندما تكون مفيدة لفصل:

```text
Deployment
```

عن:

```text
Feature Release
```

لكن يجب أن يكون لها Lifecycle ولا تتحول إلى فوضى.

---

# 72. RELEASE MANAGEMENT

كل Release مهم يجب أن يكون له:

* Version
* Release ID
* Scope
* Changes
* Tests
* Approval
* Deployment record
* Rollback plan

---

# 73. SEMANTIC VERSIONING

عندما يناسب المشروع، استخدم سياسة واضحة مثل:

```text
MAJOR.MINOR.PATCH
```

والأهم هو تعريف معنى Breaking/Non-Breaking Changes بوضوح.

---

# 74. CHANGE MANAGEMENT

أي تغيير مهم:

```text
Request
→ Analysis
→ Impact
→ Approval
→ Implementation
→ Testing
→ Release
→ Verification
```

---

# 75. IMPACT ANALYSIS

قبل تغيير شيء مهم، ابحث عن:

* Consumers
* Dependencies
* APIs
* Database
* UI
* Tests
* Documentation
* Integrations
* Security
* Operations

---

# 76. TECHNICAL DEBT

Technical Debt يجب أن يكون:

* معروفًا
* موثقًا
* مبررًا
* قابلًا للقياس عند الحاجة

لا تسمح بأن يتحول إلى:

> "سنصلحه لاحقًا"

بدون خطة.

---

# 77. REFACTORING

Refactoring يجب أن يحافظ على Behavior إلا إذا كان التغيير نفسه مقصودًا.

لا تجمع:

```text
Feature
+
Massive Refactoring
+
Architecture Rewrite
```

في Change واحد بلا ضرورة.

---

# 78. DEPENDENCIES

قبل إضافة Dependency:

* هل نحتاجها؟
* هل توجد بدائل؟
* هل هي maintained؟
* ما License؟
* ما Security history؟
* ما حجمها؟
* ما تأثيرها؟

---

# 79. DEPENDENCY UPDATES

التحديثات يجب أن تكون controlled.

لا تحدث كل Dependencies دفعة واحدة في مشروع حساس دون سبب.

---

# 80. SOFTWARE SUPPLY CHAIN

راقب:

* dependencies
* package sources
* versions
* integrity
* vulnerabilities
* build artifacts
* container images

---

# 81. CONTAINERIZATION

إذا استخدمت Containers:

* استخدم Images موثوقة
* لا تضع Secrets داخل Image
* قلل privileges
* استخدم minimal images عندما يكون مناسبًا
* ثبت Versions المهمة
* افحص Images

---

# 82. INFRASTRUCTURE AS CODE

عند استخدام IaC:

* Infrastructure يجب أن تكون قابلة للتكرار
* Changes يجب أن تكون versioned
* Secrets لا تخزن داخل code
* Production changes يجب أن تكون traceable

---

# 83. CLOUD

لا تفترض أن Cloud = Security تلقائية.

حدد:

* Responsibility Model
* IAM
* Network
* Encryption
* Logging
* Backup
* Recovery
* Cost

---

# 84. BACKUP

Backup يجب أن يكون:

* automated where appropriate
* tested
* monitored
* protected
* recoverable

Backup غير المختبر ليس ضمانًا حقيقيًا للاسترجاع.

---

# 85. DISASTER RECOVERY

حدد عند الحاجة:

```text
RPO
RTO
Recovery Procedure
Dependencies
Failover
Restore Verification
```

---

# 86. INCIDENT MANAGEMENT

عند وقوع Incident:

```text
Detect
→ Triage
→ Contain
→ Recover
→ Verify
→ Communicate
→ Root Cause
→ Prevent Recurrence
```

---

# 87. POST-INCIDENT

لا تبحث فقط عن:

> من أخطأ؟

ابحث عن:

> لماذا سمح النظام بحدوث الخطأ؟

---

# 88. ROOT CAUSE ANALYSIS

استخدم طرقًا مناسبة مثل:

* 5 Whys
* Fault Tree
* Timeline Analysis
* Contributing Factors

---

# 89. AUDITABILITY

الأفعال الحساسة يجب أن تكون قابلة للتتبع عند الحاجة:

```text
Who
What
When
Where
Why
Result
```

مع احترام الخصوصية.

---

# 90. SEPARATION OF DUTIES

في الأنظمة الحساسة، لا تجعل الشخص نفسه قادرًا دائمًا على:

```text
Create
Approve
Deploy
Verify
```

كلها دون رقابة.

---

# 91. FINANCIAL / CRITICAL SYSTEMS

للأنظمة المالية أو الحساسة، يجب التفكير بشكل إضافي في:

* Idempotency
* Atomicity
* Reconciliation
* Audit Trail
* Transaction Integrity
* Duplicate Prevention
* Timeout Handling
* Retry Safety
* Authorization
* Non-repudiation where applicable
* Immutable Evidence

---

# 92. DATA MIGRATION

أي Migration كبيرة يجب أن تتضمن:

```text
Backup
→ Pre-check
→ Migration
→ Validation
→ Reconciliation
→ Monitoring
→ Rollback/Recovery
```

---

# 93. API INTEGRATIONS

لكل Integration مهم يجب توثيق:

* Partner
* Environment
* Endpoint
* Authentication
* Version
* Contract
* Timeout
* Retry
* Error Handling
* Contact/Owner
* Monitoring
* SLA/SLO where applicable

---

# 94. EXTERNAL DEPENDENCIES

لا تفترض أن External System يعمل دائمًا.

خطط لـ:

* timeout
* unavailable
* slow response
* malformed response
* changed contract
* rate limiting
* authentication failure

---

# 95. WEBHOOKS

Webhook systems يجب أن تراعي:

* signature verification
* replay protection
* idempotency
* retries
* ordering
* timeout
* duplicate delivery
* audit trail

---

# 96. QUEUES / ASYNC SYSTEMS

يجب التفكير في:

* delivery guarantees
* duplicate messages
* ordering
* dead-letter queues
* retries
* poison messages
* observability

---

# 97. PERFORMANCE TESTING

عند الحاجة:

```text
Load Testing
Stress Testing
Spike Testing
Soak Testing
Capacity Testing
```

---

# 98. RELIABILITY TESTING

عند الأنظمة الحساسة، اختبر:

* failure recovery
* dependency outage
* restart
* network failure
* database failure
* partial failure

---

# 99. DOCUMENTATION LIFECYCLE

التوثيق نفسه له Lifecycle:

```text
Draft
→ Review
→ Approved
→ Published
→ Deprecated
→ Retired
```

---

# 100. SOURCE OF TRUTH

يجب تحديد مصدر رسمي لكل معلومة.

لا تسمح بوجود:

```text
Word says A
Excel says B
Postman says C
Code says D
```

دون تحديد أيها authoritative.

---

# 101. SINGLE SOURCE OF TRUTH

لكل نوع من البيانات المهمة:

```text
Requirement
API Contract
Architecture
Configuration
Release
```

يجب تحديد Source of Truth.

---

# 102. IMMUTABILITY

الأشياء الرسمية المنشورة، مثل Release artifacts، لا تعدل في مكانها دون Trace.

الأفضل:

```text
Old Version
→ New Version
```

بدل تعديل التاريخ القديم وكأنه لم يحدث.

---

# 103. TRACEABILITY

كل تغيير مهم يجب أن يمكن تتبعه:

```text
Requirement
→ Change Request
→ Decision
→ Code
→ Test
→ Release
→ Deployment
```

---

# 104. QUALITY GATES

لا تنتقل مرحلة إلى التالية إذا لم تتحقق شروطها.

مثال:

```text
Planning Gate
Design Gate
Development Gate
Testing Gate
Security Gate
Release Gate
Production Gate
```

---

# 105. PRODUCTION READINESS

قبل Production، تحقق من:

* Functionality
* Security
* Performance
* Monitoring
* Logging
* Backup
* Recovery
* Documentation
* Rollback
* Ownership
* Support

---

# 106. ROLLBACK

كل Release حساس يجب أن يحدد:

```text
Can it rollback?
How?
How long?
What data complications exist?
What happens to consumers?
```

---

# 107. NO ROLLBACK ILLUSION

ليس كل Deployment يمكن Rollback له ببساطة.

Database migrations وexternal contracts قد تجعل rollback معقدًا.

يجب التخطيط لذلك قبل التغيير.

---

# 108. COMPATIBILITY

قبل أي تغيير يجب سؤال:

> What existing behavior could break?

---

# 109. DEPRECATION

أي شيء سيتم إيقافه يجب أن يمر عبر:

```text
Announce
→ Deprecate
→ Monitor Usage
→ Migration
→ Deadline
→ Retire
```

---

# 110. ACCESS CONTROL

استخدم Role-Based أو Attribute-Based access حسب حاجة النظام.

لا تمنح:

```text
Admin
```

لمجرد أن:

> "سيكون أسهل."

---

# 111. ADMIN FEATURES

كل Admin Action حساس يجب أن يكون:

* Authorized
* Audited
* Validated
* Protected

---

# 112. RATE LIMITING

الـ APIs الحساسة يجب دراسة:

* Rate Limits
* Abuse Prevention
* Quotas
* Burst Handling

---

# 113. RESOURCE LIMITS

لا تسمح للـ user أو request باستهلاك موارد غير محدودة.

مثل:

* File size
* Request size
* Query size
* Pagination
* Execution time

---

# 114. PAGINATION

لا ترجع آلاف أو ملايين records بلا حدود.

استخدم Pagination/Streaming عند الحاجة.

---

# 115. SEARCH

Search APIs يجب أن تراعي:

* limits
* pagination
* indexing
* authorization
* injection risks
* performance

---

# 116. CACHING

Cache يجب أن تكون لها:

* invalidation strategy
* TTL
* consistency expectations
* memory limits

ولا تخزن بيانات حساسة بلا دراسة.

---

# 117. CONCURRENCY

في الأنظمة المتزامنة يجب التفكير في:

* Race Conditions
* Locks
* Transactions
* Optimistic/Pessimistic concurrency
* Duplicate processing

---

# 118. TIME

لا تفترض:

```text
Server timezone = User timezone
```

حدد بوضوح:

* UTC strategy
* Display timezone
* Storage timezone
* Business timezone
* DST considerations

---

# 119. INTERNATIONALIZATION

إذا كان النظام متعدد اللغات:

* لا hard-code UI strings
* استخدم localization
* دعم RTL عند الحاجة
* Format dates/currency حسب locale

---

# 120. CURRENCY

في الأنظمة المالية لا تعتمد على floating-point بشكل أعمى للحسابات المالية.

استخدم Representation مناسبًا للـ monetary values.

---

# 121. VALIDATION

Validation يجب أن تحدث في الحدود المناسبة:

```text
Frontend
+
Backend
+
Domain
+
Database constraints
```

كل طبقة لها غرض مختلف.

---

# 122. BUSINESS RULES

Business Rules يجب ألا تختفي داخل:

* UI
* SQL
* random utility
* Controller

بل يجب أن تكون في مكان يمكن فهمها واختبارها.

---

# 123. CONFIGURATION

Configuration يجب أن تكون:

* واضحة
* versioned عندما يلزم
* environment-aware
* validated

---

# 124. FEATURE OWNERSHIP

كل Feature أو Module مهم يجب أن يكون له Owner واضح عند الحاجة.

---

# 125. CODE OWNERSHIP

المعرفة المهمة يجب ألا تكون محصورة في شخص واحد.

استخدم:

* Documentation
* Code Review
* Pairing
* Knowledge Sharing

---

# 126. BUS FACTOR

لا تجعل النظام يعتمد على معرفة شخص واحد.

---

# 127. ONBOARDING

يجب أن يستطيع مطور جديد فهم:

```text
What is this?
Why does it exist?
How does it work?
How do I run it?
How do I test it?
How do I deploy it?
```

---

# 128. ARCHITECTURE DOCUMENTATION

يجب أن يستطيع شخص جديد فهم Architecture دون سؤال صاحب النظام عن كل شيء.

---

# 129. DIAGRAMS

استخدم Diagrams عند فائدتها:

* Context
* Container
* Component
* Sequence
* Data Flow
* Deployment

لكن لا تنشئ Diagram لا يتم تحديثها.

---

# 130. DECISION RECORDS

كل قرار Architecture مهم يجب أن يحتوي:

```text
Context
Decision
Alternatives
Consequences
Date
Owner
Status
```

---

# 131. NO GOLD PLATING

لا تضف تعقيدًا أو Features غير مطلوبة لمجرد أنها تبدو "احترافية".

---

# 132. NO PREMATURE OPTIMIZATION

لا تحسن الأداء قبل وجود دليل على المشكلة، إلا في المتطلبات الواضحة أو المخاطر المعروفة.

---

# 133. NO PREMATURE ABSTRACTION

لا تبنِ Framework داخل Framework دون حاجة.

---

# 134. ERROR MESSAGES

Error messages يجب أن تكون:

* مفهومة
* قابلة للتصرف
* غير حساسة
* قابلة للتتبع

---

# 135. USER EXPERIENCE FOR ERRORS

المستخدم يجب أن يعرف:

* ماذا حدث؟
* ماذا يستطيع أن يفعل؟
* هل يمكنه Retry؟
* هل يحتاج Support؟

---

# 136. SECURITY INCIDENTS

لا تعرض للمستخدم تفاصيل قد تساعد attacker.

لكن يجب أن يكون هناك Internal Trace يسمح بالتحقيق.

---

# 137. OBSERVABILITY CORRELATION

Requests عبر عدة services يجب أن يمكن ربطها باستخدام Correlation/Trace IDs عند الحاجة.

---

# 138. ALERTING

لا تجعل Alerting ينتج:

```text
Alert fatigue
```

كل Alert يجب أن يكون له معنى وإجراء متوقع.

---

# 139. SLO / SLA

عند الحاجة حدد:

```text
SLI
SLO
SLA
```

ولا تخلط بينها.

---

# 140. TESTABILITY

Architecture يجب أن تجعل المكونات قابلة للاختبار.

إذا كان Component مستحيل الاختبار، فهذا قد يكون مؤشرًا على مشكلة تصميم.

---

# 141. TEST COVERAGE

Coverage رقم مفيد لكنه ليس ضمانًا للجودة.

لا تجعل:

> 100% coverage

تعني تلقائيًا:

> 100% correctness.

---

# 142. EDGE CASES

اختبر الحالات الحدية:

```text
0
1
maximum
minimum
empty
null
missing
duplicate
expired
invalid
unexpected
```

حسب Domain.

---

# 143. NEGATIVE TESTING

لا تختبر فقط ما يجب أن يحدث.

اختبر ما يجب ألا يحدث.

---

# 144. SECURITY NEGATIVE TESTING

اختبر:

* unauthorized access
* privilege escalation
* malformed input
* replay
* tampering
* invalid signatures
* expired credentials

عند انطباقها.

---

# 145. RELEASE EVIDENCE

Release حساس يجب أن يمتلك Evidence مناسبة:

```text
Tests
Approvals
Artifacts
Version
Deployment
Verification
```

---

# 146. ARTIFACTS

Build Artifacts يجب أن تكون قابلة للتتبع إلى Source Version.

---

# 147. BUILD REPRODUCIBILITY

حيث يكون ذلك عمليًا، يجب أن يكون Build قابلًا لإعادة الإنتاج أو على الأقل قابلًا لتحديد:

* source revision
* dependencies
* build environment
* artifact

---

# 148. ENVIRONMENT PARITY

لا تسمح بأن يكون:

```text
Development completely different from Production
```

ثم تتفاجأ بالأخطاء.

---

# 149. PRODUCTION DATA

Production Data ليست Sandbox.

أي استخدام لها يجب أن يكون مبررًا ومصرحًا ومؤمنًا.

---

# 150. PRODUCTION ACCESS

Production Access يجب أن يكون:

* Least Privilege
* Audited
* Controlled
* Time-limited where appropriate

---

# 151. MANUAL OPERATIONS

إذا كان Manual Operation ضروريًا:

* وثقه
* قلل مخاطره
* سجل من نفذه
* استخدم Checklist عند الحاجة

---

# 152. RUNBOOKS

الأنظمة المهمة يجب أن تمتلك Runbooks للحالات التشغيلية المعروفة.

---

# 153. TROUBLESHOOTING

يجب أن يحتوي المشروع عند الحاجة على:

```text
Symptoms
Possible Causes
Checks
Resolution
Escalation
```

---

# 154. SUPPORTABILITY

المطور لا يبني فقط:

> شيء يعمل

بل يبني:

> شيء يمكن تشغيله وفهمه وإصلاحه.

---

# 155. MAINTAINABILITY

أي Design يجب أن يراعي:

* Changeability
* Testability
* Readability
* Modularity
* Documentation

---

# 156. PORTABILITY

لا تربط النظام بمنصة واحدة بلا سبب.

لكن لا تضحي بالبساطة فقط من أجل Portability نظرية.

---

# 157. OPEN SOURCE

قبل استخدام Open Source مهم:

* License
* Maintenance
* Security
* Community
* Compatibility

---

# 158. LICENSE COMPLIANCE

يجب الالتزام بتراخيص Dependencies وThird-party assets.

---

# 159. THIRD-PARTY SERVICES

لكل خدمة خارجية مهمة:

* Owner
* Contract
* Authentication
* Limits
* Failure mode
* Cost
* Alternative/Recovery

---

# 160. COST AWARENESS

في Cloud/External APIs يجب مراقبة Cost عند الحاجة.

لا تجعل Architecture ممتازة تقنيًا لكنها غير قابلة للتحمل ماليًا.

---

# 161. CLEAN ARCHITECTURE

استخدم مبادئ Clean Architecture عندما تحقق فائدة فعلية:

* Separation
* Dependency direction
* Testability
* Domain isolation

لا تحولها إلى طبقات فارغة.

---

# 162. DOMAIN-DRIVEN DESIGN

استخدم DDD عندما يكون Domain معقدًا.

اهتم بـ:

* Bounded Contexts
* Entities
* Value Objects
* Aggregates
* Domain Services
* Domain Events

عند الحاجة.

---

# 163. MICROSERVICES

لا تستخدم Microservices لمجرد أنها "حديثة".

ابدأ بالـ simplest architecture التي تحقق المتطلبات.

---

# 164. DISTRIBUTED SYSTEMS

عند استخدام عدة Services افترض:

> Network calls can fail.

صمم لذلك.

---

# 165. EVENT-DRIVEN SYSTEMS

يجب تحديد:

* Event ownership
* Schema
* Versioning
* Delivery
* Ordering
* Retry
* Duplicate handling

---

# 166. MESSAGE SCHEMA

لا تغير Message Contract بشكل يكسر Consumers.

---

# 167. API / EVENT CONTRACT

أي Contract خارجي يجب معاملته كـ Public Interface.

---

# 168. CONTRACT FIRST

عندما يكون المشروع API-heavy، يجب تعريف Contract قبل Implementation عندما يكون ذلك مناسبًا.

---

# 169. DOCUMENTATION GENERATION

عند الإمكان، اجعل Documentation مشتقة من Source of Truth بدل نسخها يدويًا.

---

# 170. NO DUPLICATED TRUTH

لا تجعل:

```text
API Contract
```

مكررًا بشكل مستقل في خمسة أماكن دون آلية مزامنة.

---

# 171. SECURITY BY DESIGN

الأمن يجب أن يدخل في Design، لا بعد انتهاء Development.

---

# 172. THREAT MODELING

للمكونات الحساسة:

```text
Assets
Actors
Trust Boundaries
Threats
Mitigations
Residual Risk
```

---

# 173. RISK MANAGEMENT

لكل Risk مهم:

```text
Probability
Impact
Severity
Mitigation
Owner
Status
```

---

# 174. VULNERABILITY MANAGEMENT

الثغرات يجب أن تكون:

* Discovered
* Classified
* Prioritized
* Remediated
* Verified
* Tracked

---

# 175. SECURITY PATCHING

Critical vulnerabilities لا تؤجل بلا Risk Acceptance موثق.

---

# 176. SECRET ROTATION

Credentials وKeys الحساسة يجب أن تكون قابلة للدوران Rotation.

---

# 177. AUTH LOGGING

Authentication/Authorization events المهمة يجب مراقبتها دون تسجيل Secrets.

---

# 178. AUDIT LOG INTEGRITY

Audit Logs المهمة يجب حمايتها من التعديل أو الحذف غير المصرح.

---

# 179. DATA RETENTION

حدد مدة الاحتفاظ بالبيانات والـ Logs حسب الحاجة والمتطلبات.

---

# 180. DATA DELETION

الحذف يجب أن يكون مفهومًا:

```text
Logical Delete?
Physical Delete?
Retention?
Archive?
Legal Hold?
```

---

# 181. QUALITY MODEL

جودة النظام لا تعني فقط "يعمل".

يجب تقييم خصائص مثل:

* Functional suitability
* Performance
* Compatibility
* Usability
* Reliability
* Security
* Maintainability
* Portability

وهي من المجالات التي يغطيها نموذج جودة ISO/IEC 25010:2023.

---

# 182. QUALITY GATE — DEVELOPMENT

قبل مغادرة Development:

* Code compiles
* Types valid
* Lint passes
* Tests appropriate
* No known critical issue

---

# 183. QUALITY GATE — REVIEW

قبل Merge:

* Review completed
* Requirements satisfied
* Security considered
* Tests reviewed
* No unexplained changes

---

# 184. QUALITY GATE — TEST

قبل Release:

* Required tests pass
* Critical defects resolved
* Contract verified
* Security checks passed as required

---

# 185. QUALITY GATE — PRODUCTION

قبل Production:

* Approval
* Artifact identified
* Deployment plan
* Rollback/recovery plan
* Monitoring
* Documentation
* Ownership

---

# 186. CHANGE FREEZE

في الأنظمة الحرجة قد يتم منع Changes أثناء:

* Incident
* Critical business period
* Settlement
* Migration
* Release freeze

حسب سياسة المؤسسة.

---

# 187. RELEASE FREEZE EXCEPTION

Emergency Change يجب أن يكون:

* justified
* approved
* recorded
* tested as far as practical
* reviewed afterward

---

# 188. EMERGENCY CHANGES

Emergency لا يعني:

> لا توجد قواعد.

بل يعني:

> قواعد مختصرة مع توثيق ومراجعة لاحقة.

---

# 189. POST-RELEASE VERIFICATION

بعد Deployment:

```text
Health
Smoke Test
Critical Flows
Logs
Metrics
Errors
Dependencies
```

---

# 190. CANARY / GRADUAL RELEASE

عند الحاجة، استخدم:

* Canary
* Blue/Green
* Rolling
* Feature Flags

حسب Architecture.

---

# 191. ROLLBACK VERIFICATION

Rollback نفسه يجب أن يكون معروفًا ومختبرًا عند الحاجة.

---

# 192. BUSINESS CONTINUITY

الأنظمة المهمة يجب أن تعرف:

* Critical Functions
* Dependencies
* Recovery Priority
* Owners
* Recovery Procedures

---

# 193. KNOWLEDGE MANAGEMENT

المعرفة المهمة يجب ألا تبقى:

```text
في رأس شخص واحد
```

---

# 194. AI GENERATED CODE

كل AI-generated code يعامل كـ:

> Code written by a developer

ويجب أن يمر بنفس:

* Review
* Testing
* Security
* Quality

---

# 195. AI CODE VERIFICATION

لا تقبل كود AI لأنه:

> يبدو صحيحًا.

يجب التحقق منه.

---

# 196. AI HALLUCINATION CONTROL

AI يجب ألا يخترع:

* APIs
* Libraries
* Documentation
* Configuration
* Framework behavior
* Test results

---

# 197. AI CONTEXT MANAGEMENT

عند العمل مع AI يجب تزويده بالسياق الصحيح:

```text
Project Brief
Architecture
Requirements
Contracts
Decisions
Relevant Code
Constraints
```

---

# 198. AI CHANGE BOUNDARIES

حدد للـ AI:

```text
Allowed
Not Allowed
Read-only
Writable
Requires Approval
```

---

# 199. AI AGENTS

إذا استخدمت عدة Agents:

كل Agent يجب أن يعرف:

* Role
* Scope
* Inputs
* Outputs
* Permissions
* Files allowed to modify
* Dependencies

---

# 200. AI AGENT COORDINATION

لا تسمح لـ Agents متعددة بتعديل نفس الملفات بشكل متعارض دون Coordination.

---

# 201. AI OUTPUT REVIEW

أي مخرجات AI مهمة يجب مراجعتها قبل اعتمادها.

---

# 202. AI SECURITY

لا ترسل إلى AI:

* Production Secrets
* Private Keys
* Passwords
* Sensitive Customer Data

إلا ضمن سياسة تسمح بذلك.

---

# 203. AI DECISION LOG

إذا اتخذ AI قرارًا معماريًا مهمًا، القرار يجب أن يصبح قرارًا بشريًا موثقًا ومعتمدًا، وليس مجرد "قرار AI".

---

# 204. AI DOES NOT OWN THE SYSTEM

AI مساعد هندسي.

المسؤولية النهائية عن Architecture وSecurity وProduction تعتمد على الأشخاص المخولين.

---

# 205. NO BLIND COPY-PASTE

لا تنسخ كودًا أو Configuration من AI أو الإنترنت دون فهمه والتحقق منه.

---

# 206. NO BLIND FRAMEWORK ADOPTION

لا تستخدم Framework أو Pattern لأنه مشهور فقط.

السؤال:

> ما المشكلة التي يحلها؟

---

# 207. ARCHITECTURAL SIMPLICITY

أفضل Architecture ليست الأكثر تعقيدًا.

بل التي تحقق المتطلبات بأقل تعقيد مناسب.

---

# 208. CONTINUOUS IMPROVEMENT

بعد كل مرحلة:

```text
What worked?
What failed?
What should change?
```

---

# 209. METRICS

قِس ما يفيد القرار.

لا تحول المشروع إلى مجموعة Metrics بلا قيمة.

---

# 210. ENGINEERING METRICS

عند الحاجة راقب:

* Lead Time
* Deployment Frequency
* Change Failure Rate
* Recovery Time
* Defect Rate
* Test Health
* Security Findings

---

# 211. DOCUMENT VERSIONING

كل Document مهم يجب أن يكون له:

```text
Version
Status
Owner
Last Updated
```

---

# 212. DECISION STATUS

Architecture Decision يمكن أن تكون:

```text
Proposed
Accepted
Rejected
Superseded
Deprecated
```

---

# 213. SUPERSEDED DECISIONS

لا تحذف القرار القديم فقط لأنه لم يعد ساريًا.

احتفظ به مع توضيح أنه Superseded.

---

# 214. REQUIREMENT CHANGES

عندما تتغير Requirement:

```text
Update
→ Impact Analysis
→ Re-plan
→ Update Design
→ Update Tests
```

---

# 215. SCOPE CONTROL

لا تسمح لـ Scope Creep بالدخول بصمت.

أي Feature جديدة يجب أن تكون واضحة هل:

```text
In Scope
Out of Scope
Future
```

---

# 216. UNKNOWN WORK

إذا ظهر عمل غير متوقع:

```text
Stop
Assess
Document
Estimate Impact
Decide
```

ولا تخفيه داخل Feature أخرى.

---

# 217. TECHNICAL DISCOVERY

عندما يكون النظام القديم غير مفهوم، استخدم:

```text
Observe
Document
Trace
Test
Confirm
Then Change
```

---

# 218. LEGACY SYSTEMS

لا تعيد كتابة Legacy System بالكامل لمجرد أنه قديم.

افهم:

* Current behavior
* Dependencies
* Consumers
* Risks
* Migration options

---

# 219. BROWNFIELD

في المشاريع القائمة:

> Existing behavior is evidence.

لا تفترض أن الكود الحالي يمثل Documentation الصحيحة، ولا تفترض أيضًا أنه خاطئ.

تحقق.

---

# 220. GREENFIELD

في المشروع الجديد:

* ضع Standards مبكرًا
* Automation مبكرًا
* Security مبكرًا
* Testing مبكرًا
* Documentation مبكرًا

---

# 221. STOP CONDITIONS

يجب التوقف وطلب clarification عند:

* Requirement ambiguity
* Security uncertainty
* Data-loss risk
* Breaking change
* Architecture conflict
* Unknown business rule
* Production impact

---

# 222. NEVER HIDE FAILURE

الفشل يجب أن يكون واضحًا.

لا تجعل:

```text
error → ignored → success message
```

---

# 223. GRACEFUL DEGRADATION

عندما يكون مناسبًا، صمم النظام ليستمر جزئيًا بدل الانهيار الكامل.

---

# 224. DEFENSIVE PROGRAMMING

دافع عن النظام عند الحدود، لكن لا تحول الكود إلى مجموعة Guards عشوائية تخفي أخطاء التصميم.

---

# 225. VALIDATE ASSUMPTIONS

أي Assumption مؤثر يجب تحويله إلى:

```text
Confirmed
or
Documented Assumption
```

---

# 226. OWNERSHIP

كل Component حرج يجب أن يكون له:

```text
Technical Owner
Business Owner
Support Path
```

عند الحاجة.

---

# 227. LIFECYCLE

كل Component مهم له Lifecycle:

```text
Planned
→ Development
→ Testing
→ Production
→ Maintenance
→ Deprecated
→ Retired
```

---

# 228. RETIREMENT

إيقاف Feature/API/Service يجب أن يكون مخططًا.

لا تحذف شيئًا فقط لأنه "قديم".

---

# 229. END-OF-LIFE

قبل Retirement:

* Usage analysis
* Consumer notification
* Migration
* Final verification
* Archive
* Removal

---

# 230. FINAL PRINCIPLE

القاعدة العليا:

> **Build software that can be understood, verified, secured, operated, changed, and eventually retired without depending on undocumented human knowledge.**

---

# 231. STANDARD DEVELOPMENT FLOW

الـ Default workflow للمشروع:

```text
Requirement
    ↓
Clarification
    ↓
Analysis
    ↓
Acceptance Criteria
    ↓
Architecture / Design
    ↓
Decision Record if needed
    ↓
Implementation Plan
    ↓
Approval
    ↓
Development
    ↓
Static Checks
    ↓
Unit Tests
    ↓
Integration / Contract Tests
    ↓
Security Checks
    ↓
Code Review
    ↓
Documentation
    ↓
Release Candidate
    ↓
Acceptance
    ↓
Deployment
    ↓
Smoke Test
    ↓
Monitoring
    ↓
Verification
    ↓
Release Complete
```

---

# 232. STANDARD AI WORKFLOW

عند استخدام AI:

```text
READ
 ↓
UNDERSTAND
 ↓
IDENTIFY UNKNOWNS
 ↓
ASK
 ↓
ANALYZE
 ↓
PLAN
 ↓
APPROVAL
 ↓
IMPLEMENT
 ↓
VERIFY
 ↓
TEST
 ↓
REPORT
 ↓
DOCUMENT
```

---

# 233. AI MUST NOT SKIP

لا يجوز للـ AI الانتقال مباشرة من:

```text
Request
```

إلى:

```text
Code
```

في التغييرات المهمة دون المرور بالسياق والتحليل المناسب.

---

# 234. FINAL QUALITY PRINCIPLE

قبل اعتبار العمل مكتملًا، اسأل:

```text
Does it work?
Is it correct?
Is it secure?
Is it tested?
Is it documented?
Is it maintainable?
Is it observable?
Is it deployable?
Is it recoverable?
Is it traceable?
Can another developer understand it?
Can we change it safely?
Can we roll it back or recover from failure?
```

إذا كانت الإجابة "لا" في نقطة مهمة، فالعمل ليس بالضرورة Done.

---

# 235. EXCEPTION MANAGEMENT

لا توجد قاعدة بلا استثناءات في كل سياق.

لكن عند كسر Rule مهمة:

```text
Rule
→ Reason
→ Risk
→ Alternative Considered
→ Approval
→ Expiry/Review Date if applicable
```

يجب توثيق الاستثناء.

---

# 236. THE MASTER PRINCIPLE

> **Do not optimize for writing code. Optimize for producing a reliable software system.**

والهدف ليس:

```text
More Code
```

بل:

```text
Correct System
+
Secure System
+
Tested System
+
Documented System
+
Maintainable System
+
Operable System
+
Traceable System
```

---

# 237. PROJECT FILE GOVERNANCE

الملفات الأساسية المقترحة:

```text
devAi/
│
├── 00-MASTER-RULES.md
├── 01-PROJECT-BRIEF.md
├── 02-ROADMAP.md
├── 03-DECISIONS-LOG.md
│
├── requirements/
│   ├── requirements.md
│   ├── acceptance-criteria.md
│   └── business-rules.md
│
├── architecture/
│   ├── architecture.md
│   ├── diagrams/
│   └── ADR/
│
├── api/
│   ├── API-CONTRACTS.md
│   ├── openapi/
│   └── integration-guides/
│
├── database/
│   ├── schema.md
│   └── migrations/
│
├── testing/
│   ├── TEST-STRATEGY.md
│   ├── test-cases/
│   └── test-results/
│
├── security/
│   ├── SECURITY.md
│   ├── threat-model/
│   └── security-findings/
│
├── operations/
│   ├── RUNBOOKS.md
│   ├── monitoring.md
│   └── incident-management.md
│
└── templates/
```

---

# 238. BOOTSTRAP PROMPT

عند بدء مشروع جديد:

> مرحبًا.
> افتح مجلد `devAi`.
> اقرأ `00-MASTER-RULES.md` أولًا.
> ثم اقرأ `01-PROJECT-BRIEF.md` و`02-ROADMAP.md` و`03-DECISIONS-LOG.md` إن كانت موجودة.
> لا تبدأ بكتابة أي كود.
> افهم السياق أولًا، وحدد المعلومات الناقصة أو المتعارضة، ثم ناقشها معي خطوة بخطوة.
> لا تفترض أي Requirement أو Architecture أو Technology غير موثقة.
> لا تنفذ تغييرًا كبيرًا قبل موافقتي.
> عند وجود غموض، اسأل بدل التخمين.
> عند اتخاذ قرار معماري مهم، اقترح توثيقه في `03-DECISIONS-LOG.md`.
> عند التنفيذ، اعمل بخطوات صغيرة قابلة للمراجعة.
> بعد التنفيذ، تحقق فعليًا، وشغّل الاختبارات المناسبة، ثم أخبرني بالضبط بما تغير وما تم التحقق منه وما بقي دون تحقق.

---

# 239. FINAL AI CONTRACT

عند العمل على هذا المشروع، يجب على AI الالتزام بالآتي:

```text
I will not invent requirements.
I will not silently change architecture.
I will not silently change contracts.
I will not fabricate test results.
I will not claim verification without evidence.
I will not expose secrets.
I will not perform destructive operations without appropriate authorization.
I will not add unnecessary dependencies.
I will not perform unrelated refactoring.
I will explain significant changes.
I will identify uncertainty.
I will preserve traceability.
I will prioritize correctness, security, maintainability and reliability.
I will ask when requirements are unclear.
```

---

# 240. END OF MASTER RULES

هذه الوثيقة هي **الإطار الأعلى**.

الوثائق الأخرى يجب أن تفسر وتفصل هذه القواعد، وليس أن تناقضها دون قرار موثق.

**Master Rule:**

> Understand → Analyze → Decide → Document → Approve → Implement → Test → Verify → Release → Monitor → Improve.
