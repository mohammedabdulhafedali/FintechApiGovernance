import { IDynamicDocRepository } from '../../../domain/repositories/IDynamicDocRepository.js';
import { DynamicDocument, DocLifecycleStatus } from '../../../domain/entities/DynamicDocument.js';

export class DynamicDocUseCases {
  constructor(private readonly repository: IDynamicDocRepository) {}

  async getAll(): Promise<DynamicDocument[]> {
    return this.repository.findAll();
  }

  async getById(id: string): Promise<DynamicDocument | null> {
    return this.repository.findById(id);
  }

  async create(data: Partial<DynamicDocument>, user: { id: string; name: string; email: string }): Promise<DynamicDocument> {
    const id = data.id || `doc-${Date.now()}`;
    const newDoc: DynamicDocument = {
      id,
      title: data.title || 'وثيقة API جديدة',
      slug: data.slug || `doc-${Date.now()}`,
      systemKey: data.systemKey || 'general',
      integrationKey: data.integrationKey || 'default',
      version: data.version || '1.0.0',
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: {
        id: user.id || 'usr_unknown',
        name: user.name || 'مستخدم المنظومة',
        email: user.email || 'user@gov.fintech'
      },
      sharedTokens: data.sharedTokens || {
        primaryColor: '#0284c7',
        accentColor: '#10b981',
        fontFamily: "'Cairo', 'Inter', sans-serif",
        baseFontSize: 14,
        borderRadius: 8
      },
      renderModes: data.renderModes || {
        web: {
          policy: 'CUSTOMIZABLE',
          layoutType: 'STRUCTURED_FLOW',
          showSidebarNav: true,
          collapsibleSections: true,
          enableInteractiveTesting: true
        },
        print_a4: {
          policy: 'RESTRICTED',
          layoutType: 'PAGINATED_PAGE',
          pageSize: 'A4',
          orientation: 'portrait',
          marginsMm: { top: 20, bottom: 20, left: 15, right: 15 },
          headerText: `${data.title || 'وثيقة مواصفات الـ API'} - الإصدار ${data.version || '1.0.0'}`,
          footerText: 'وثيقة رسمية معتمدة - منصة حوكمة الـ APIs',
          showPageNumbers: true,
          repeatTableHeaders: true,
          showOfficialWatermark: true
        }
      },
      sections: data.sections && data.sections.length > 0 ? data.sections : [
        {
          id: `sec-${Date.now()}-1`,
          type: 'header',
          title: 'المقدمة والترويسة',
          data: {
            title: data.title || 'وثيقة API جديدة',
            subtitle: 'المواصفات الفنية والمتطلبات المعمارية للتكامل',
            description: 'وصف تفصيلي للخدمة ونطاق استخدامها والقواعد المعيارية المنظمة لها.'
          }
        },
        {
          id: `sec-${Date.now()}-2`,
          type: 'endpoint',
          title: 'نقطة نهاية افتراضية',
          data: {
            method: 'GET',
            path: '/api/v1/resource',
            description: 'استعلام عن المورد المالي',
            headers: [
              { name: 'Authorization', type: 'string', required: true, description: 'Bearer Token' }
            ],
            parameters: [
              { name: 'id', type: 'string', required: true, description: 'معرف السجل' }
            ],
            responseBody: JSON.stringify({ status: 'SUCCESS', data: { id: 'RES-100', name: 'Sample' } }, null, 2)
          }
        }
      ],
      history: [
        {
          version: data.version || '1.0.0',
          status: 'DRAFT',
          changedAt: new Date().toISOString(),
          changedBy: user.name || 'مستخدم المنظومة',
          comment: 'إنشاء مسودة الوثيقة الجديدة.'
        }
      ]
    };

    return this.repository.save(newDoc);
  }

  async update(id: string, data: Partial<DynamicDocument>, user: { name: string }): Promise<DynamicDocument> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error(`Document with ID ${id} not found`);
    }

    // Merge cleanly
    const updated: DynamicDocument = {
      ...existing,
      ...data,
      id: existing.id, // Immutable ID
      author: existing.author, // Preserve original author
      updatedAt: new Date().toISOString(),
      history: [
        ...(existing.history || []),
        {
          version: data.version || existing.version,
          status: (data.status as DocLifecycleStatus) || existing.status,
          changedAt: new Date().toISOString(),
          changedBy: user.name || 'محرر المنظومة',
          comment: 'تحديث محتويات أو إعدادات أوضاع العرض.'
        }
      ]
    };

    return this.repository.save(updated);
  }

  async publish(id: string, user: { name: string }, comment?: string): Promise<DynamicDocument> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error(`Document with ID ${id} not found`);
    }

    const nextDoc: DynamicDocument = {
      ...existing,
      status: 'PUBLISHED',
      updatedAt: new Date().toISOString(),
      history: [
        ...(existing.history || []),
        {
          version: existing.version,
          status: 'PUBLISHED',
          changedAt: new Date().toISOString(),
          changedBy: user.name || 'معتمد المنظومة',
          comment: comment || 'اعتماد الوثيقة ونشرها كإصدار رسمي ثابت.'
        }
      ]
    };

    return this.repository.save(nextDoc);
  }

  async delete(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}
