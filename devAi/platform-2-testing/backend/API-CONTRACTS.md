# ⚙️ API Contracts — عقود الواجهات البرمجية (Template)

> **إرشادات:** يُكتب هذا الملف بناءً على تحليل الفرونت إند (Frontend-First). حدد هنا الـ Endpoints والبيانات الدقيقة التي تحتاجها الشاشات.

---

## 1. مجموعة الـ Endpoints لـ [اسم الميزة/Feature]

### Endpoint 1: [اسم الوظيفة، مثال: Get All Users]
- **Method:** `GET` | `POST` | `PUT` | `DELETE`
- **Path:** `/api/v1/resource`
- **Auth Required:** Yes / No

**Request Body (إذا لزم):**
```json
{
  "key": "value"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    // شكل البيانات
  ]
}
```

**Error Response (مثال 400 Bad Request):**
```json
{
  "success": false,
  "error": "وصف الخطأ"
}
```

---

*(يُكرر هذا الهيكل لكل Endpoint)*
