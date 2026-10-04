# 📡 Platform 1 API Contracts — عقود الواجهات البرمجية الخاصة بالمنصة الأولى

> **المعيار:** RESTful APIs موثقة بتنسيق JSON مع معايير أمان موحدة وترويسات تدقيق إلزامية.

---

## 1. مسارات الكتالوج والمواصفات (Catalog & Specification Endpoints)

### `GET /api/v1/apis`
* **الوصف:** استرجاع قائمة جميع الـ APIs المعرفة في المؤسسة وحالاتها.
* **الاستجابة الناجحة (200 OK):**
```json
{
  "total": 2,
  "data": [
    {
      "code": "INSTANT_PAYMENTS",
      "name": "National Instant Payment Switch (IPS)",
      "category": "FINTECH",
      "status": "ACTIVE",
      "latestPublishedVersion": "1.0.0",
      "activeDraftVersion": null
    }
  ]
}
```

---

### `GET /api/v1/apis/{code}/versions/{semver}`
* **الوصف:** استرجاع المواصفة الكاملة لإصدار معين (Endpoints, Schemas, Business Rules, Error Catalog, Compliance Tags).
* **الاستجابة الناجحة (200 OK):**
```json
{
  "apiCode": "INSTANT_PAYMENTS",
  "semver": "1.0.0",
  "lifecycleStatus": "PUBLISHED",
  "releaseId": "REL-INSTANT_PAYMENTS-2026-5871",
  "endpoints": [
    {
      "id": "ep_9881",
      "method": "POST",
      "path": "/v1/transfers",
      "summary": "Execute Instant Transfer",
      "authStrategy": "HMAC_SHA256",
      "requestSchema": "TransferRequest",
      "rules": ["BR_FIN_001", "BR_AML_002"]
    }
  ]
}
```

---

### `GET /api/v1/apis/{code}/versions/{semver}/lineage`
* **الوصف:** استعلام شجرة التبعيات والنسب لمعرفة أثر الحقول والمخططات المشتركة.
* **الاستجابة الناجحة (200 OK):**
```json
{
  "schema": "AccountReference_v1",
  "impactLevel": "HIGH",
  "associatedEndpoints": ["/v1/transfers", "/v1/refunds", "/v2/settlements"],
  "associatedRules": ["BR_IBAN_MOD97", "BR_AML_SANCTION"],
  "platform2ConsumersImpacted": 28
}
```

---

## 2. إدارة التغييرات والفحص الدلالي (Change Management & Semantic Diff)

### `GET /api/v1/change-requests/{crNumber}/semantic-diff`
* **الوصف:** تشغيل محرك الفحص الدلالي التلقائي وكشف الـ Breaking Changes وتحديد ترقية الـ SemVer الحتمية.
* **الاستجابة الناجحة (200 OK):**
```json
{
  "crNumber": "CR-2026-0050",
  "baseVersion": "1.0.0",
  "proposedVersion": "1.1.0-draft",
  "isBreaking": true,
  "enforcedSemverBump": "MAJOR",
  "breakingViolations": [
    {
      "type": "NEW_REQUIRED_FIELD",
      "location": "TransferRequest.purposeCode",
      "message": "Adding a required field breaks existing bank consumers."
    },
    {
      "type": "VALIDATION_STRICTENED",
      "location": "TransferRequest.amount",
      "message": "Allowed maximum constraint modified."
    }
  ],
  "platform2Impact": {
    "queriedAt": "2026-10-04T12:00:00Z",
    "totalActiveConsumers": 20,
    "criticallyAffectedConsumers": 3
  }
}
```

---

## 3. حوكمة الاعتماد والختم الرقمي (Multi-Sig & Sealing Endpoints)

### `POST /api/v1/change-requests/{crNumber}/sign`
* **الوصف:** تسجيل توقيع رسمي لأحد أطراف الاعتماد (Architect, Compliance, CSO) وفق مبدأ الـ 4-Eyes.
* **الطلب:**
```json
{
  "role": "LEAD_ARCHITECT",
  "comments": "Contract schemas and backwards compatibility reviewed."
}
```
* **الاستجابة الناجحة (200 OK):**
```json
{
  "crNumber": "CR-2026-0050",
  "role": "LEAD_ARCHITECT",
  "status": "APPROVED",
  "signedAt": "2026-10-04T12:30:00Z",
  "remainingSignatures": ["COMPLIANCE_OFFICER", "CSO"]
}
```

---

### `POST /api/v1/change-requests/{crNumber}/seal`
* **الوصف:** الختم السيادي النهائي بعد اكتمال التواقيع الثلاثة؛ يولد الـ Canonical JCS ويوقع بواسطة مفتاح الـ KMS HSM المشفر (RSA-PSS-4096).
* **الاستجابة الناجحة (201 Created):**
```json
{
  "releaseId": "REL-INSTANT_PAYMENTS-2026-5871",
  "semver": "2.0.0",
  "contentHashSha256": "71027c802f60c8f98fc49570a2ad629cbc616092398439499dad90d17cb4c00b",
  "signatureAlgorithm": "RSA-PSS-4096",
  "sealedAt": "2026-10-04T12:45:00Z",
  "downloadUrl": "/api/v1/releases/REL-INSTANT_PAYMENTS-2026-5871/spec",
  "isImmutable": true
}
```

---

## 4. التحقق والتوثيق الرسمي (Verification & Official Exports)

### `GET /api/v1/releases/{releaseId}/verify`
* **الوصف:** فحص سلامة النسخة والتحقق التشفيري من التوقيع الرقمي وصحة محتوى الـ Snapshot.
* **الاستجابة الناجحة (200 OK):**
```json
{
  "releaseId": "REL-INSTANT_PAYMENTS-2026-5871",
  "integrityStatus": "VALID",
  "signatureStatus": "VALID",
  "issuer": "National Central FinTech Authority KMS",
  "algorithm": "RSA-PSS-4096-SHA256",
  "isTampered": false
}
```

---

## 5. خادم المحاكاة الفوري (Instant Mock Sandbox)

### `ALL /mock/{apiCode}/{version}/{path...}`
* **الوصف:** استقبال طلبات الـ HTTP الموجهة للمحاكي وإرجاع استجابات معيارية مستخلصة مباشرة من العقد الرسمي.
