# 🌐 FintechApiGovernance — المنظومة الشاملة لحوكمة وفحص الـ APIs المالية

> **Enterprise FinTech API Governance, Canonical Specification Sealing, and Compliance Testing Platform.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Architecture: Clean/Hexagonal](https://img.shields.io/badge/Architecture-Clean%2FHexagonal-success.svg)](#)
[![Security: RSA--PSS--4096](https://img.shields.io/badge/Security-RSA--PSS--4096-green.svg)](#)
[![Standards: ISO20022%20%7C%20OpenAPI](https://img.shields.io/badge/Standards-ISO20022%20%7C%20OpenAPI-orange.svg)](#)

---

## 📌 نظرة عامة (Overview)

منظومة هندسية متكاملة مصممة لإدارة، ختم، وفحص مواصفات واجهات برمجة التطبيقات المالية (FinTech APIs)، مثل **نظام التحويلات اللحظية الموحد (National Instant Payment Switch - IPS)**، وتوفير مرجع موحد وموثوق (Single Source of Truth) للبنوك والجهات المالية الشريكة.

تتكون المنظومة من ركيزتين أساسيتين:
1. **المنصة الأولى (`platform-1-documentation`):** إدارة كتالوج الـ APIs، فحص التغييرات بمحرك الفروقات (Diff Engine)، والختم الرقمي الأمني المشفر للمواصفات (Release Sealer) وإنتاج الـ Snapshots.
2. **المنصة الثانية (`platform-2-testing`):** محرك اختبارات آلي ومحاكاة مصرفية يستند حصراً إلى المواصفات المختومة لفحص امتثال البنوك والشراكات بنسبة 100%.

---

## 🏛️ الهيكل المعماري للمستودع (Repository Structure)

```text
FintechApiGovernance/
│
├── AGENTS.md                          # التوجيه الذاتي للذكاء الاصطناعي وفرز رسائل التطوير
├── devAi/                             # إطار العمل التخطيطي المعياري (AI-Dev Framework)
│   ├── 00-MASTER-RULES.md             # الدستور الهندسي الشامل للمشروع (240 قاعدة)
│   ├── 01-PROJECT-BRIEF.md            # تعريف أهداف وتقنيات المشروع
│   ├── 02-ROADMAP.md                  # خارطة طريق التنفيذ
│   ├── 03-DECISIONS-LOG.md            # سجل القرارات المعمارية (ADR)
│   ├── _templates/                    # قوالب الوحدات الديناميكية
│   └── platform-1-documentation/      # مساحة تحليل وتخطيط المنصة الأولى
│       ├── BRIEF.md
│       └── frontend/
│           ├── SCREENS-ANALYSIS.md    # التحليل الوظيفي للشاشات
│           └── ui-prototype.html      # النموذج التفاعلي الحي للواجهات
│
├── platform-1-documentation/          # كود وتنفيذ المنصة الأولى (التوثيق والحوكمة)
│   ├── admin-governance/              # وحدات حوكمة الإصدارات وتوقيع CSO
│   ├── snapshots/                     # وثائق الـ Snapshots المختومة رقمياً
│   ├── frontend/                      # واجهة مستخدم المنصة الأولى
│   └── backend/                       # خادم ومحرك المنصة الأولى
│
├── platform-2-testing/                # كود وتنفيذ المنصة الثانية (محرك الاختبارات)
│   ├── admin-governance/              # قواعد وسياسات الامتثال والفحص
│   ├── frontend/                      # لوحة مراقبة الاختبارات والنتائج
│   └── backend/                       # محرك تشغيل الاختبارات والمحاكاة
│
└── shared/                            # العقود وخوارزميات التشفير المشتركة
```

---

## 🔒 معايير الأمان والتشفير الرقمي (Cryptographic Governance)

تعتمد المنظومة بروتوكول ختم المواصفات غير القابل للتلاعب:
* **التجزئة (Hashing):** حساب `SHA-256 Checksum` الكامل لمحتوى المواصفة.
* **التوقيع الرقمي:** اعتماد خوارزمية `RSA-PSS-4096` لتوقيع المسؤول الأمني (CSO).
* **الوثيقة الثابتة (Immutable Snapshot):** توليد ملف مواصفة رسمي غير قابل للتعديل المباشر، يمثل المرجع القطعي لجميع أطراف المنظومة.

---

## 🚀 تجربة النموذج التفاعلي الحي (Live UI Prototype)

تم بناء نموذج تفاعلي حي يعرض شاشات المنصة الأولى الأربع بدون حاجة لتثبيت أي مكتبات. يمكنك معاينته مباشرة عبر فتح:
👉 [`devAi/platform-1-documentation/frontend/ui-prototype.html`](devAi/platform-1-documentation/frontend/ui-prototype.html)

---

## 📜 الترخيص (License)
هذا المشروع مرخص تحت رخصة **MIT**.
