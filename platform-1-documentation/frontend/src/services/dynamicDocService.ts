import { DynamicDocument } from '../types/dynamicDocs';
import { authService } from './authService';

const DYNAMIC_DOCS_BASE_URL = 'http://localhost:4000/api/v1/dynamic-docs';

export class DynamicDocService {
  private static instance: DynamicDocService;

  private constructor() {}

  public static getInstance(): DynamicDocService {
    if (!DynamicDocService.instance) {
      DynamicDocService.instance = new DynamicDocService();
    }
    return DynamicDocService.instance;
  }

  public async getAll(): Promise<DynamicDocument[]> {
    try {
      const res = await fetch(`${DYNAMIC_DOCS_BASE_URL}`, {
        headers: authService.getAuthHeaders()
      });
      if (!res.ok) throw new Error('فشل جلب قائمة الوثائق الديناميكية');
      const data = await res.json();
      return data.data || [];
    } catch (err) {
      console.warn('Fallback to local default dynamic documents:', err);
      return this.getLocalFallback();
    }
  }

  public async getById(id: string): Promise<DynamicDocument | null> {
    try {
      const res = await fetch(`${DYNAMIC_DOCS_BASE_URL}/${id}`, {
        headers: authService.getAuthHeaders()
      });
      if (!res.ok) throw new Error(`فشل جلب الوثيقة: ${id}`);
      const data = await res.json();
      return data.data || null;
    } catch (err) {
      const fallbacks = this.getLocalFallback();
      return fallbacks.find(d => d.id === id) || null;
    }
  }

  public async create(payload: Partial<DynamicDocument>): Promise<DynamicDocument> {
    const res = await fetch(`${DYNAMIC_DOCS_BASE_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'فشل إنشاء الوثيقة');
    }
    const data = await res.json();
    return data.data;
  }

  public async update(id: string, payload: Partial<DynamicDocument>): Promise<DynamicDocument> {
    const res = await fetch(`${DYNAMIC_DOCS_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'فشل تحديث الوثيقة');
    }
    const data = await res.json();
    return data.data;
  }

  public async publish(id: string, comment?: string): Promise<DynamicDocument> {
    const res = await fetch(`${DYNAMIC_DOCS_BASE_URL}/${id}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders()
      },
      body: JSON.stringify({ comment })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'فشل نشر الوثيقة');
    }
    const data = await res.json();
    return data.data;
  }

  public async delete(id: string): Promise<boolean> {
    const res = await fetch(`${DYNAMIC_DOCS_BASE_URL}/${id}`, {
      method: 'DELETE',
      headers: authService.getAuthHeaders()
    });
    return res.ok;
  }

  private getLocalFallback(): DynamicDocument[] {
    return [
      {
        id: "doc-fintech-transfers-v1",
        title: "المواصفة الموحدة لخدمات التحويلات المصرفية الفورية (Instant Transfers)",
        slug: "instant-transfers-spec",
        systemKey: "core-banking",
        integrationKey: "transfers-service",
        version: "1.0.0",
        status: "PUBLISHED",
        createdAt: "2026-02-01T10:00:00.000Z",
        updatedAt: "2026-10-16T15:00:00.000Z",
        author: {
          id: "usr_admin_01",
          name: "مدير المنظومة",
          email: "admin@gov.fintech"
        },
        sharedTokens: {
          primaryColor: "#0284c7",
          accentColor: "#10b981",
          fontFamily: "'Cairo', 'Inter', sans-serif",
          baseFontSize: 14,
          borderRadius: 8
        },
        renderModes: {
          web: {
            policy: "CUSTOMIZABLE",
            layoutType: "STRUCTURED_FLOW",
            showSidebarNav: true,
            collapsibleSections: true,
            enableInteractiveTesting: true
          },
          print_a4: {
            policy: "RESTRICTED",
            layoutType: "PAGINATED_PAGE",
            pageSize: "A4",
            orientation: "portrait",
            marginsMm: { top: 20, bottom: 20, left: 15, right: 15 },
            headerText: "البنك المركزي - معيار التحويلات المالية v1.0",
            footerText: "سري للغاية - للاستخدام الداخلي والمصارف المعتمدة فقط",
            showPageNumbers: true,
            repeatTableHeaders: true,
            showOfficialWatermark: true
          }
        },
        sections: [
          {
            id: "sec-head",
            type: "header",
            title: "ترويسة الوثيقة",
            data: {
              title: "معيار واجهات التحويلات المالية اللحظية (IPS Engine)",
              subtitle: "الدليل المرجعي الموحد للمصارف الشريكة ومقدمي خدمات الدفع (PSPs)",
              description: "توضح هذه الوثيقة المعمارية معايير التكامل الفني والأمني لتنفيذ واستعلام التحويلات اللحظية وفق ضوابط الحوكمة الصارمة."
            }
          },
          {
            id: "sec-callout-security",
            type: "callout",
            title: "تنبيه أمني إلزامي",
            data: {
              calloutType: "warning",
              content: "يجب تشفير جميع حمولات التحويل باستخدام مفاتيح mTLS 1.3 مع توقيع الـ Payload بخوارزمية SHA-256 RSA قبل إرسال الطلب."
            }
          },
          {
            id: "sec-ep-transfer",
            type: "endpoint",
            title: "نقطة نهاية: تنفيذ تحويل فوري",
            data: {
              method: "POST",
              path: "/api/v1/transfers/instant",
              description: "إرسال أمر تحويل مالي لحظي بين حسابين مصرفيين محليين.",
              headers: [
                { name: "Authorization", type: "string", required: true, description: "Bearer JWT Token للمؤسسة الطالبة" },
                { name: "X-Idempotency-Key", type: "string", required: true, description: "معرف تفرد الطلب لمنع تكرار التحويل", example: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d" },
                { name: "X-Signature", type: "string", required: true, description: "التوقيع الرقمي للـ Payload" }
              ],
              parameters: [
                { name: "validateOnly", type: "boolean", required: false, description: "إجراء تدقيق وصحة أرصدة دون تنفيذ الخصم الفعلي" }
              ],
              requestBody: JSON.stringify({
                sourceAccount: "SA4420000001234567890123",
                destinationIban: "SA5530000009876543210987",
                beneficiaryName: "شركة الابتكار المالي المحدودة",
                amount: 1500.50,
                currency: "SAR",
                purposeCode: "SUPPLIER_PAYMENT"
              }, null, 2),
              responseBody: JSON.stringify({
                transactionId: "TX-99827361",
                status: "SETTLED",
                settledAt: "2026-10-16T14:30:00Z",
                referenceNumber: "REF-20261016-0012",
                fees: 0.00
              }, null, 2)
            }
          },
          {
            id: "sec-table-fields",
            type: "fields-table",
            title: "قاموس الحقول والبيانات",
            data: {
              description: "مواصفات وتوصيف حقول الطلب والاستجابة مع قواعد التدقيق.",
              parameters: [
                { name: "sourceAccount", type: "IBAN String (24 chars)", required: true, description: "رقم الآيبان للحساب المحول منه" },
                { name: "destinationIban", type: "IBAN String (24 chars)", required: true, description: "رقم الآيبان للحساب المستفيد" },
                { name: "amount", type: "Decimal(18,2)", required: true, description: "المبلغ الإجمالي بالعملة المحلية (حد أقصى 50,000 ريال)" },
                { name: "purposeCode", type: "Enum String", required: true, description: "رمز الغرض من التحويل وفق معيار ISO 20022" }
              ]
            }
          }
        ]
      }
    ];
  }
}

export const dynamicDocService = DynamicDocService.getInstance();
