# دليل ومواصفات الهوية البصرية الشاملة (Visual Identity & Design System)

> **المرجع الهندسي والتصميمي المعتمد للهوية البصرية لمشروع Verbatim AI Studio**  
> صُمم هذا الدليل ليكون حزمة متكاملة (Design System & Starter Kit) تتيح نسخ وتطبيق الهوية البصرية كاملة بدقة في أي موقع أو تطبيق ويب آخر.

---

## 🎨 1. الفلسفة التصميمية والروح العامة (Design Philosophy)

تعتمد الهوية البصرية على مزيج متقدم من:
1. **الزجاج العصري (Modern Glassmorphism):** أسطح شبه شفافة مع تمويه خلفي عميق (`backdrop-filter: blur(20px)` - `blur(24px)`) وحواف كريستالية ناصعة (`rgba(255, 255, 255, 0.28)`).
2. **الكانفاس الكحلي النيلي فائق الوضوح (Maximum Clarity Navy Dark Base):** استخدام خلفية كحلية عميقة مشبعة تدعم التباين العالي بنسبة 100% بدلاً من الرماديات الميتة.
3. **الإضاءة المحيطية العميقة (Ambient Atmospheric Glows):** هالات ضوئية ناعمة في أطراف الشاشة تمنح إحساساً بالحيوية والعمق ثلاثي الأبعاد.
4. **دعم العربية والاتجاه الأيمن كأولوية (Arabic & RTL-First):** خطوط متناسقة وأوزان هرمية واضحة تراعي خصوصية الأحرف العربية وجماليتها.
5. **فيزياء الحركة والانتقالات النابضة (Spring Physics Micro-animations):** تفاعلات ارتدادية سريعة وناعمة عند التحويم والنقر.

---

## 🔤 2. منظومة الخطوط والتايبوغرافي (Typography System)

### الخطوط المعتمدة:
- **الخط الأساسي للنصوص العربية والواجهة (Primary Font):**  
  **`Cairo`** من Google Fonts بأوزان هرمية متكاملة (`300`, `400`, `600`, `700`, `800`, `900`).
- **خط الأرقام والشارات والشاشات البرمجية (Secondary / English / Numbers):**  
  **`Outfit`** من Google Fonts بأوزان (`400`, `600`, `700`) لتوفير وضوح هندسي للأرقام والرموز اللاتينية.
- **خط الأكواد والحقول الدقيقة (Monospace):**  
  `'Outfit', monospace` أو `Consolas, monospace`.
- **مكتبة الأيقونات المعتمدة:**  
  **`Font Awesome 6.5.1 Pro / Free`**.

### كود الاستدعاء في صفحة الويب (`<head>`):

```html
<!-- Google Fonts: Cairo (Arabic) & Outfit (Latin/Numbers) -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800;900&family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">

<!-- FontAwesome Icons 6.5.1 -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
```

### التدرج الهرمي للحجوم (Font Scale Hierarchy):

| الاستخدام | الفئة / العنصر | الحجم (rem/px) | الوزن (Weight) | الخط (Font Family) |
| :--- | :--- | :--- | :--- | :--- |
| **العناوين الرئيسية (H1 / Hero)** | `.brand-title` / `h1` | `1.3rem - 1.5rem` | 800 - 900 | `'Cairo'` |
| **عناوين البطاقات (H2)** | `h2` / `.card-title` | `1.15rem - 1.25rem` | 700 - 800 | `'Cairo'` |
| **العناوين الفرعية (H3 / H4)** | `h3, h4` | `0.95rem - 1.05rem` | 700 | `'Cairo'` |
| **النصوص الأساسية (Body Text)** | `body, p` | `0.90rem - 0.95rem` | 600 - 700 | `'Cairo'` |
| **النصوص الخافتة والشروحات** | `.text-muted, small` | `0.80rem - 0.85rem` | 600 | `'Cairo'` |
| **الشارات والوسوم (Badges)** | `.badge, .nav-pill` | `0.65rem - 0.75rem` | 800 | `'Outfit', sans-serif` |
| **أرقام الوقت والمؤقتات (Timecodes)**| `.timecode, .counter` | `0.85rem - 0.95rem` | 700 | `'Outfit', monospace` |

---

## 🎨 3. لوحة الألوان ودرجات التباين الكاملة (Color Palette)

### أ. ألوان الكانفاس والطبقات (Dark Mode - Maximum Clarity)

| المتغير (CSS Variable) | القيمة اللونية (Hex / RGBA) | الوصف والاستخدام |
| :--- | :--- | :--- |
| `--bg-main` | `#1a2d45` | لون أرضية الموقع بالكامل (Visible Navy Canvas) |
| `--bg-secondary` | `#243d5c` | لوحات المستوى الأول (الهيدر، الشريط الجانبي، الفوتر) |
| `--bg-card` | `#2b4870` | خلفيات البطاقات المرفوعة الأساسية (Elevated Cards) |
| `--bg-card-hover` | `#345882` | لون البطاقات عند مرور الماوس (Interactive Hover) |
| `--bg-input` | `#1c3250` | خلفيات حقول الإدخال، القوائم، والمربعات المدمجة |
| `select option` | `#253550` | لون خلفية خيارات القوائم المنسدلة للوضوح العالي |

### ب. ألوان الكانفاس للوضع الفاتح (Light Mode - Linear Warm Canvas)

| المتغير (CSS Variable) | القيمة اللونية (Hex) | الوصف والاستخدام |
| :--- | :--- | :--- |
| `--bg-main` | `#f8fafc` | رمادي ثلجي فائق النعومة والراحة للعين |
| `--bg-secondary` | `#ffffff` | أبيض ناصع للأشرطة العلوية والجانبية |
| `--bg-card` | `#ffffff` | أبيض ناصع مع ظلال ناعمة للبطاقات |
| `--bg-card-hover` | `#f1f5f9` | تظليل ناعم عند مرور المؤشر |
| `--bg-input` | `#ffffff` | خلفية الحقول بيضاء بحدود رقيقة |

### ج. ألوان الهوية الأساسية (Brand & Primary System)

| المتغير | القيمة | الاستخدام |
| :--- | :--- | :--- |
| `--primary` | `#6366f1` | النيلي الحيوي (Indigo Vibrant) - اللون القيادي للمنظومة |
| `--primary-hover` | `#4f46e5` | نيلي أعمق عند التفاعل والضغط |
| `--primary-glow` | `rgba(99, 102, 241, 0.40)` | هالة التوهج حول العناصر الأساسية |
| **تدرج الشعار والبراند** | `linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #06b6d4 100%)` | التدرج الملوكي المعتمد في الشعار والإبرازات |
| **تدرج الأزرار النشطة** | `linear-gradient(135deg, #4338ca 0%, #6366f1 100%)` | التدرج المستخدم للأزرار الأساسية والعناصر المختارة |

### د. ألوان التمييز والحالات الوظيفية (Accent & Functional Colors)

| المتغير | الداكن (Dark) | الفاتح (Light) | الاستخدام الوظيفي |
| :--- | :--- | :--- | :--- |
| `--accent-cyan` | `#38bdf8` | `#0284c7` | التمييز التفاعلي، الموجات الصوتية، الروابط والشارات |
| `--accent-emerald` | `#10b981` | `#059669` | حالة النجاح، البث المباشر، الجلسات النشطة، الاتصال السليم |
| `--accent-amber` | `#f59e0b` | `#d97706` | التنبيهات، المعالجة الجارية، التحذيرات |
| `--accent-rose` | `#f43f5e` | `#e11d48` | الأخطاء، الإلغاء، أزرار الحذف، التوقف الفوري |
| `--accent-purple` | `#a855f7` | `#7c3aed` | محركات الذكاء الاصطناعي والميزات الاستثنائية |

### هـ. ألوان النصوص والتباين (Typography Contrast)

| المتغير | الداكن (Dark) | الفاتح (Light) | الاستخدام |
| :--- | :--- | :--- | :--- |
| `--text-main` | `#ffffff` (أبيض ناصع 100%) | `#09090b` (أسود عميق) | العناوين والنصوص الرئيسية ذات الأولوية القصوى |
| `--text-muted` | `#e2e8f0` (أبيض رمادي ساطع) | `#52525b` (رمادي معتدل) | النصوص الثانوية والشروحات التوضيحية |
| `--text-dim` | `#b8c8d8` (رمادي أزرق خافت) | `#71717a` (رمادي خافت) | النصوص المساعدة، التواريخ، والـ Placeholders |

---

## 🔮 4. منظومة الزجاج والحدود (Glassmorphism & Borders)

| المتغير / الخاصية | القيمة | التطبيق |
| :--- | :--- | :--- |
| `--border-glass` | `rgba(255, 255, 255, 0.28)` | الحدود الكريستالية الأساسية لكافة البطاقات والألواح |
| `--border-subtle` | `rgba(255, 255, 255, 0.18)` | القواطع الداخلية والفواصل الخفيفة |
| `--border-accent` | `rgba(99, 102, 241, 0.85)` | حدود التفاعل والتحديد عند التركيز |
| `--border-glow` | `rgba(99, 102, 241, 0.60)` | إضاءة الحدود النشطة |
| **تأثير الزجاج الخلفي** | `backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);` | تطبيق على الأشرطة الجانبية والعلوية والبطاقات |

---

## 📐 5. نظام الانحناءات والاستدارة (Border Radii)

```css
--radius-xs: 6px;      /* الأزرار المصغرة والشارات الدقيقة */
--radius-sm: 8px;      /* أزرار الإجراءات وأيقونات التبديل */
--radius-md: 12px;     /* حقول الإدخال، عناصر القوائم، والأزرار القياسية */
--radius-lg: 18px;     /* البطاقات الرئيسية والحاويات */
--radius-xl: 24px;     /* النوافذ المنبثقة (Modals) والحاويات العائمة */
--radius-pill: 9999px; /* الشارات الكبسولية وأزرار التصفية */
```

---

## 🌑 6. منظومة الظلال والعمق (Elevation & Depth)

```css
/* ظلال خفيفة للعناصر التفاعلية الصغيرة */
--shadow-subtle: 0 2px 8px rgba(0, 0, 0, 0.30);

/* ظلال متوسطة مع إضاءة حافة علوية بيضاء عاكسة (Specular Highlight) */
--shadow-soft: 0 10px 30px -5px rgba(0, 0, 0, 0.50), 
               inset 0 1px 0 rgba(255, 255, 255, 0.22);

/* ظلال البطاقات ثلاثية الأبعاد العميقة */
--shadow-card: 0 16px 44px -8px rgba(0, 0, 0, 0.60), 
               inset 0 1px 0 rgba(255, 255, 255, 0.26), 
               0 0 0 1px rgba(255, 255, 255, 0.12);

/* توهج النيون الأساسي */
--shadow-glow: 0 0 25px rgba(99, 102, 241, 0.40);

/* توهج حالة النشاط والاتصال الأخضر */
--shadow-glow-emerald: 0 0 20px rgba(16, 185, 129, 0.35);
```

---

## 🌌 7. فقاعات الإضاءة المحيطية (Ambient Lighting Blobs)

لخلق جو غامر وفخم بالخلفية، يتم وضع فقاعتين ضوئيتين كبيرتين ثابتتين بتمويه قوي خلف كافة العناصر:

```css
.ambient-glow {
    position: fixed;
    width: 540px;
    height: 540px;
    border-radius: 50%;
    filter: blur(150px);
    pointer-events: none;
    z-index: 0;
    opacity: 0.20;
}

/* توهج أعلى اليمين (نيلي ملوكي) */
.glow-top {
    top: -160px;
    right: -100px;
    background: radial-gradient(circle, #6366f1, transparent);
}

/* توهج أسفل اليسار (سماوي كهربائي) */
.glow-bottom {
    bottom: -160px;
    left: -100px;
    background: radial-gradient(circle, #38bdf8, transparent);
}

/* في الوضع الفاتح تخفف الشفافية لمنع التشويش */
[data-theme="light"] .ambient-glow {
    opacity: 0.06;
}
```

---

## ⚡ 8. فيزياء الحركة والانتقالات (Motion & Micro-animations)

```css
/* انتقالات فورية للتحويم البسيط وتغير الألوان */
--transition-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1);

/* انتقالات ناعمة للبطاقات والألواح والظلال */
--transition-smooth: 0.28s cubic-bezier(0.16, 1, 0.3, 1);

/* حركة ارتدادية نابضة (Spring Physics) لفتح القوائم والأزرار المميزة */
--transition-spring: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
```

---

## 📋 9. كود الـ CSS الكامل والجاهز للنسخ والتطبيق المباشر (`verbatim-identity.css`)

يمكنك نسخ هذا الكود كاملاً واستخدامه كملف CSS موحد في أي موقع جديد:

```css
/* ==========================================================================
   Verbatim AI Studio - Master Visual Identity & Design System
   Modern Glassmorphism | RTL Arabic First | Deep Navy Canvas
   ========================================================================== */

:root {
    /* --- الكانفاس والطبقات (Dark Base) --- */
    --bg-main: #1a2d45;
    --bg-secondary: #243d5c;
    --bg-card: #2b4870;
    --bg-card-hover: #345882;
    --bg-input: #1c3250;

    /* --- الحدود والزجاج الكريستالي --- */
    --border-glass: rgba(255, 255, 255, 0.28);
    --border-subtle: rgba(255, 255, 255, 0.18);
    --border-accent: rgba(99, 102, 241, 0.85);
    --border-glow: rgba(99, 102, 241, 0.60);

    /* --- ألوان الهوية الأساسية --- */
    --primary: #6366f1;
    --primary-hover: #4f46e5;
    --primary-glow: rgba(99, 102, 241, 0.40);

    /* --- ألوان التمييز والحالات --- */
    --accent-cyan: #38bdf8;
    --accent-emerald: #10b981;
    --accent-amber: #f59e0b;
    --accent-rose: #f43f5e;
    --accent-purple: #a855f7;

    /* --- ألوان النصوص والتباين --- */
    --text-main: #ffffff;
    --text-muted: #e2e8f0;
    --text-dim: #b8c8d8;

    /* --- الاستدارة والانحناءات --- */
    --radius-xs: 6px;
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 18px;
    --radius-xl: 24px;
    --radius-pill: 9999px;

    /* --- الظلال والعمق ثلاثي الأبعاد --- */
    --shadow-subtle: 0 2px 8px rgba(0, 0, 0, 0.30);
    --shadow-soft: 0 10px 30px -5px rgba(0, 0, 0, 0.50), inset 0 1px 0 rgba(255, 255, 255, 0.22);
    --shadow-card: 0 16px 44px -8px rgba(0, 0, 0, 0.60), inset 0 1px 0 rgba(255, 255, 255, 0.26), 0 0 0 1px rgba(255, 255, 255, 0.12);
    --shadow-glow: 0 0 25px rgba(99, 102, 241, 0.40);
    --shadow-glow-emerald: 0 0 20px rgba(16, 185, 129, 0.35);

    /* --- فيزياء الحركة --- */
    --transition-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    --transition-smooth: 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    --transition-spring: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* --- دعم الوضع الفاتح (Light Mode Support) --- */
[data-theme="light"] {
    --bg-main: #f8fafc;
    --bg-secondary: #ffffff;
    --bg-card: #ffffff;
    --bg-card-hover: #f1f5f9;
    --bg-input: #ffffff;

    --border-glass: rgba(0, 0, 0, 0.08);
    --border-subtle: rgba(0, 0, 0, 0.05);
    --border-accent: rgba(94, 106, 210, 0.45);

    --primary: #5e6ad2;
    --primary-hover: #4f5bbf;
    --primary-glow: rgba(94, 106, 210, 0.12);

    --accent-cyan: #0284c7;
    --accent-emerald: #059669;
    --accent-amber: #d97706;
    --accent-rose: #e11d48;

    --text-main: #09090b;
    --text-muted: #52525b;
    --text-dim: #71717a;

    --shadow-soft: 0 4px 20px -2px rgba(0, 0, 0, 0.06);
    --shadow-glow: 0 0 16px rgba(94, 106, 210, 0.12);
}

/* --- الإعدادات العامة للخطوط والهيكل --- */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
}

body {
    background-color: var(--bg-main);
    color: var(--text-main);
    line-height: 1.5;
    direction: rtl;
    min-height: 100vh;
    position: relative;
    overflow-x: hidden;
}

/* --- شريط التمرير الأنيق (Custom Scrollbar) --- */
::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}
::-webkit-scrollbar-track {
    background: transparent;
}
::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.18);
    border-radius: var(--radius-pill);
}
::-webkit-scrollbar-thumb:hover {
    background: var(--primary);
}

/* --- فقاعات الإضاءة المحيطية --- */
.ambient-glow {
    position: fixed;
    width: 540px;
    height: 540px;
    border-radius: 50%;
    filter: blur(150px);
    pointer-events: none;
    z-index: 0;
    opacity: 0.20;
}
.glow-top {
    top: -160px;
    right: -100px;
    background: radial-gradient(circle, var(--primary), transparent);
}
.glow-bottom {
    bottom: -160px;
    left: -100px;
    background: radial-gradient(circle, var(--accent-cyan), transparent);
}

/* --- بطاقات الزجاج العصرية (Glass Cards) --- */
.glass-card {
    background: var(--bg-card);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-lg);
    padding: 24px;
    box-shadow: var(--shadow-soft);
    transition: var(--transition-smooth);
    position: relative;
    z-index: 1;
}
.glass-card:hover {
    border-color: var(--border-accent);
    transform: translateY(-2px);
    box-shadow: var(--shadow-card);
}

/* --- الأزرار التفاعلية (Buttons System) --- */
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 0.95rem;
    font-weight: 700;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: var(--transition-smooth);
    text-decoration: none;
    border: none;
    user-select: none;
}

.btn-primary {
    background: linear-gradient(135deg, var(--primary) 0%, #4338ca 100%);
    color: #ffffff;
    padding: 12px 28px;
    box-shadow: var(--shadow-glow);
    border: 1px solid rgba(255, 255, 255, 0.20);
}
.btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 0 35px rgba(99, 102, 241, 0.65);
    border-color: #a5b4fc;
}
.btn-primary:disabled {
    opacity: 0.50;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
}

.btn-secondary {
    background: var(--bg-secondary);
    color: var(--text-main);
    border: 1.5px solid var(--border-glass);
    padding: 12px 24px;
    box-shadow: var(--shadow-subtle);
}
.btn-secondary:hover {
    background: var(--bg-card-hover);
    border-color: var(--border-accent);
    transform: translateY(-2px);
}

.btn-outline {
    background: transparent;
    color: var(--text-main);
    border: 1.5px solid var(--border-glass);
    padding: 8px 16px;
    border-radius: var(--radius-sm);
}
.btn-outline:hover {
    border-color: var(--primary);
    background: rgba(99, 102, 241, 0.12);
    color: #ffffff;
}

/* --- حقول الإدخال والقوائم (Form Inputs & Selects) --- */
.form-input, .form-select {
    width: 100%;
    padding: 12px 16px;
    background: var(--bg-input);
    border: 1.5px solid var(--border-glass);
    border-radius: var(--radius-md);
    color: var(--text-main);
    font-size: 0.95rem;
    outline: none;
    transition: var(--transition-fast);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.25);
}
.form-input:focus, .form-select:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.35);
}

select option {
    background-color: #253550 !important;
    color: #ffffff !important;
}
[data-theme="light"] select option {
    background-color: #ffffff !important;
    color: #1a2d44 !important;
}

/* --- الشارات والوسوم (Badges & Pills) --- */
.badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: var(--radius-pill);
    font-size: 0.72rem;
    font-weight: 800;
    font-family: 'Outfit', sans-serif;
    letter-spacing: 0.3px;
    text-transform: uppercase;
}
.badge-cyan {
    background: rgba(56, 189, 248, 0.18);
    color: var(--accent-cyan);
    border: 1px solid rgba(56, 189, 248, 0.35);
}
.badge-emerald {
    background: rgba(16, 185, 129, 0.18);
    color: var(--accent-emerald);
    border: 1px solid rgba(16, 185, 129, 0.35);
}
.badge-amber {
    background: rgba(245, 158, 11, 0.18);
    color: var(--accent-amber);
    border: 1px solid rgba(245, 158, 11, 0.35);
}
.badge-rose {
    background: rgba(244, 63, 94, 0.18);
    color: var(--accent-rose);
    border: 1px solid rgba(244, 63, 94, 0.35);
}

/* --- مؤشر الحالة النشطة النابض (Live Pulsing Status Dot) --- */
.status-dot-active {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent-emerald);
    box-shadow: 0 0 8px var(--accent-emerald);
    display: inline-block;
    animation: statusPulse 2s infinite ease-in-out;
}
@keyframes statusPulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.3); opacity: 0.7; }
}
```

---

## 🚀 10. نموذج HTML تطبيقي مصغر للاختبار المباشر (Quick Starter Template)

يمكنك حفظ الكود أدناه في ملف `index.html` وتضمين ملف الـ CSS لتشاهد النتيجة المباشرة للهوية فوراً:

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تطبيق الهوية البصرية | Verbatim Design System</title>
    
    <!-- الخطوط المعتمدة -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    
    <!-- ملف الـ CSS -->
    <link rel="stylesheet" href="verbatim-identity.css">
</head>
<body>
    <!-- التوهجات المحيطية بالخلفية -->
    <div class="ambient-glow glow-top"></div>
    <div class="ambient-glow glow-bottom"></div>

    <main style="max-width: 900px; margin: 40px auto; padding: 20px; position: relative; z-index: 1;">
        <!-- بطاقة زجاجية نموذجية -->
        <div class="glass-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                <h1 style="font-size: 1.4rem; font-weight: 800; display: flex; align-items: center; gap: 10px;">
                    <i class="fa-solid fa-wand-magic-sparkles" style="color: var(--primary);"></i>
                    تطبيق الهوية البصرية الفاخرة
                </h1>
                <span class="badge badge-emerald">
                    <span class="status-dot-active"></span> متصل ونشط
                </span>
            </div>

            <p style="color: var(--text-muted); margin-bottom: 20px;">
                هذا النموذج يوضح تطبيق الزجاج العصري (Glassmorphism)، تباين الكانفاس الكحلي النيلي، وتناغم الخطوط العربية (Cairo) والأرقام اللاتينية (Outfit).
            </p>

            <!-- حقل إدخال -->
            <div style="margin-bottom: 20px;">
                <input type="text" class="form-input" placeholder="اكتب نصاً هنا لتجربة حقول الإدخال والتركيز...">
            </div>

            <!-- أزرار الإجراءات -->
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <button class="btn btn-primary">
                    <i class="fa-solid fa-play"></i> بدء العملية
                </button>
                <button class="btn btn-secondary">
                    <i class="fa-solid fa-gear"></i> الإعدادات
                </button>
                <span class="badge badge-cyan">ميزة جديدة</span>
            </div>
        </div>
    </main>
</body>
</html>
```

---

## 💡 نصائح معمارية عند تطبيق الهوية في موقعك الآخر

1. **الاعتماد على متغيرات CSS (`CSS Variables`):**  
   لا تقم بتضمين ألوان ثابتة كـ Hardcoded Hex داخل عناصرك، بل استخدم دائماً `var(--bg-main)`، `var(--primary)`، و`var(--border-glass)` لضمان دعم التبديل التلقائي السلس بين الداكن والفاتح.
2. **الشفافية والتمويه (Glass Backdrops):**  
   تأكد دائماً من وجود خاصية `-webkit-backdrop-filter: blur(...)` بجانب `backdrop-filter` لضمان عمل تأثير الزجاج الضبابي على متصفحات Safari وiOS.
3. **وضوح خيارات الـ Dropdown:**  
   المتصفحات تطبق ألوان نظام التشغيل الافتراضية لعناصر `select option`. احرص دائماً على الإبقاء على كود تخصيص لون خلفية الـ `option` كما هو موضح بالدليل لمنع ظهور نصوص بيضاء على خلفية بيضاء.
