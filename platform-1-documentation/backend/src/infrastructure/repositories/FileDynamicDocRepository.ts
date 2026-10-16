import fs from 'fs/promises';
import path from 'path';
import { IDynamicDocRepository } from '../../domain/repositories/IDynamicDocRepository.js';
import { DynamicDocument } from '../../domain/entities/DynamicDocument.js';
import { resolveDataPath } from '../data/dataPathResolver.js';

export class FileDynamicDocRepository implements IDynamicDocRepository {
  private readonly filePath: string;

  constructor() {
    this.filePath = resolveDataPath('dynamic_docs.json');
  }

  private async readData(): Promise<DynamicDocument[]> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        const seeded = this.getInitialSeededDocuments();
        await this.writeData(seeded);
        return seeded;
      }
      throw err;
    }
  }

  private async writeData(docs: DynamicDocument[]): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(docs, null, 2), 'utf-8');
  }

  async findAll(): Promise<DynamicDocument[]> {
    return this.readData();
  }

  async findById(id: string): Promise<DynamicDocument | null> {
    const list = await this.readData();
    return list.find(d => d.id === id) || null;
  }

  async save(doc: DynamicDocument): Promise<DynamicDocument> {
    const list = await this.readData();
    const idx = list.findIndex(d => d.id === doc.id);
    if (idx >= 0) {
      list[idx] = { ...doc, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({ ...doc, updatedAt: new Date().toISOString() });
    }
    await this.writeData(list);
    return doc;
  }

  async delete(id: string): Promise<boolean> {
    const list = await this.readData();
    const next = list.filter(d => d.id !== id);
    if (next.length === list.length) return false;
    await this.writeData(next);
    return true;
  }

  private getInitialSeededDocuments(): DynamicDocument[] {
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
        ],
        history: [
          {
            version: "1.0.0",
            status: "PUBLISHED",
            changedAt: "2026-10-16T15:00:00.000Z",
            changedBy: "مدير المنظومة",
            comment: "الاعتماد والنشر الأولي لمعيار التحويلات اللحظية."
          }
        ]
      }
    ];
  }
}
