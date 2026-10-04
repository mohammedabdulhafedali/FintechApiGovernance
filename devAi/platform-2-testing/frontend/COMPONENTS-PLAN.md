# 🧱 Components Plan — تخطيط المكونات (Template)

> **إرشادات:** استخدم هذا القالب لرسم شجرة المكونات وتحديد المكونات القابلة لإعادة الاستخدام.

---

## 1. شجرة المكونات (Component Tree)

```text
<App>
├── <Layout>
│   ├── <Header />
│   └── <Sidebar />
│
└── <MainPage>
    ├── <ComponentOne />
    └── <ComponentTwo>
        └── <NestedComponent />
```

## 2. المكونات المشتركة (Shared Components)

| اسم المكون (Component) | الوظيفة (Purpose) | المدخلات (Props) |
|:-----------------------|:------------------|:-----------------|
| `<Button />`           | زر قياسي للنظام   | variant, onClick |
| `<Card />`             | بطاقة لعرض البيانات| title, children  |

## 3. إدارة الحالة (State Management)
- **Global State:** [ما هي البيانات التي يجب أن تكون متوفرة في كل التطبيق؟]
- **Local State:** [ما هي البيانات المرتبطة بمكونات محددة فقط؟]
