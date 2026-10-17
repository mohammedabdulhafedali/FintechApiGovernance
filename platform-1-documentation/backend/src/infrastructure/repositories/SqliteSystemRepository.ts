import { prisma } from '../database/prismaClient.js';

export interface SystemIntegrationDto {
  entityId: string;
  name: string;
  nameEn?: string;
  code?: string;
  icon?: string;
  direction?: 'INBOUND' | 'OUTBOUND' | 'BIDIRECTIONAL';
  endpoints: any[];
  rawDocSource?: string;
  docTitle?: string;
  docVersion?: string;
}

export interface SystemModuleDto {
  key: string;
  name: string;
  nameEn?: string;
  code: string;
  icon: string;
  description?: string;
  descriptionEn?: string;
  status?: 'ACTIVE' | 'BETA' | 'MAINTENANCE';
  associatedSectorKeys?: string[];
  integrations: Record<string, SystemIntegrationDto>;
}

export class SqliteSystemRepository {
  private hasInitialized = false;

  private async ensureDefaultSeed(): Promise<void> {
    if (this.hasInitialized) return;
    try {
      const defaultSystems: SystemModuleDto[] = [
        {
          key: 'collection',
          name: 'تحصيل',
          nameEn: 'Tahseel',
          code: 'SYS_TAHSEEL',
          icon: 'Layers',
          description: 'نظام التحصيل والدفع اللحظي ومعالجة العمليات المالية والمصرفية',
          descriptionEn: 'Core collection and instant payment processing platform across banks and merchants',
          status: 'ACTIVE',
          associatedSectorKeys: ['banking', 'merchants', 'erp', 'aml'],
          integrations: {
            banking: {
              entityId: 'banking',
              name: 'البنوك والمصارف المركزية',
              nameEn: 'Banks & Clearing Houses',
              code: 'INT_BANKING',
              icon: 'Building2',
              direction: 'INBOUND',
              endpoints: [
                { id: 'ep_ips_01', method: 'POST', path: '/v1/transfers', shortName: 'transfers', desc: 'تنفيذ أمر تحويل بنكي فوري مطابق لسقف العمليات وضوابط المقاصة الوطنية.' },
                { id: 'ep_ips_02', method: 'GET', path: '/v1/transfers/{id}', shortName: 'status', desc: 'الاستعلام الفوري عن حالة المعالجة والتسوية النهائية للحوالة.' },
                { id: 'ep_acc_01', method: 'GET', path: '/v1/accounts/{iban}/balance', shortName: 'balance', desc: 'استعلام الرصيد الدفتري والمتاح بموجب تفويض صريح من العميل.' }
              ]
            },
            merchants: {
              entityId: 'merchants',
              name: 'التجار ونقاط البيع',
              nameEn: 'Merchants & POS Gateways',
              code: 'INT_MERCHANTS',
              icon: 'Store',
              direction: 'INBOUND',
              endpoints: [
                { id: 'ep_pos_01', method: 'POST', path: '/v1/pos/payments', shortName: 'pos-payment', desc: 'معالجة عمليات الدفع عبر أجهزة نقاط البيع وتطبيقات التجار المعتمدة.' }
              ]
            },
            erp: {
              entityId: 'erp',
              name: 'أنظمة ERP والمحاسبة',
              nameEn: 'ERP & Accounting Systems',
              code: 'INT_ERP',
              icon: 'Scale',
              direction: 'BIDIRECTIONAL',
              endpoints: [
                { id: 'ep_erp_01', method: 'POST', path: '/v1/erp/reconciliation', shortName: 'reconciliation', desc: 'مطابقة قيود التحصيل اليومية مع دفاتر الأستاذ العام وأنظمة تخطيط الموارد.' }
              ]
            },
            aml: {
              entityId: 'aml',
              name: 'مكافحة غسل الأموال (AML)',
              nameEn: 'AML & Regulatory Screening Authority',
              code: 'INT_TAHSEEL_AML',
              icon: 'ShieldAlert',
              direction: 'OUTBOUND',
              endpoints: [
                { id: 'ep_aml_01', method: 'POST', path: '/v1/screening/instant-check', shortName: 'instant-check', desc: 'فحص فوري للأسماء والحسابات ضد القوائم الرقابية المحدثة وقوائم العقوبات.' },
                { id: 'ep_aml_02', method: 'POST', path: '/v1/screening/pep-verify', shortName: 'pep-verify', desc: 'التحقق من الشخصيات ذات النفوذ السياسي (PEP) لعمليات التحصيل عالية القيمة.' }
              ]
            }
          }
        },
        {
          key: 'tantara',
          name: 'تنترة',
          nameEn: 'Tantara',
          code: 'SYS_TANTARA',
          icon: 'Receipt',
          description: 'نظام تنترة لإصدار الفواتير وتسويتها وربط قنوات الدفع والسداد المركزي',
          descriptionEn: 'Tantara central billing, invoicing orchestration, and multi-channel settlement platform',
          status: 'ACTIVE',
          associatedSectorKeys: ['merchants', 'banking', 'erp', 'aml'],
          integrations: {
            merchants: {
              entityId: 'merchants',
              name: 'التجار والمفوترين',
              nameEn: 'Merchants & Billers',
              code: 'INT_BILL_MERCH',
              icon: 'Store',
              direction: 'INBOUND',
              endpoints: [
                { id: 'ep_bill_01', method: 'POST', path: '/v1/bills/generate', shortName: 'generate-bill', desc: 'إصدار فاتورة إلكترونية معتمدة تحتوي على رمز الاستجابة السريع وضريبة القيمة المضافة.' },
                { id: 'ep_bill_02', method: 'GET', path: '/v1/bills/{billNumber}/inquiry', shortName: 'bill-inquiry', desc: 'استعلام عن تفاصيل الفاتورة وقيمتها والمبلغ المتبقي للسداد.' }
              ]
            },
            banking: {
              entityId: 'banking',
              name: 'البنوك وأنظمة السداد (سداد / RTGS)',
              nameEn: 'Banks & Sadad Hub',
              code: 'INT_BILL_BANK',
              icon: 'Building2',
              direction: 'BIDIRECTIONAL',
              endpoints: [
                { id: 'ep_rtgs_01', method: 'POST', path: '/v1/rtgs/settle', shortName: 'settle', desc: 'إرسال أمر تسوية مالية كبرى للمقاصة المركزية بين المصارف.' }
              ]
            },
            erp: {
              entityId: 'erp',
              name: 'أنظمة ERP المؤسسية',
              nameEn: 'Corporate ERP Hub',
              code: 'INT_BILL_ERP',
              icon: 'Scale',
              direction: 'BIDIRECTIONAL',
              endpoints: [
                { id: 'ep_erp_bill_01', method: 'POST', path: '/v1/erp/invoices/sync', shortName: 'invoices-sync', desc: 'مزامنة الفواتير والمقبوضات الدورية مع دفتر الأستاذ العام في نظام الشركة.' }
              ]
            },
            aml: {
              entityId: 'aml',
              name: 'مكافحة غسل الأموال (AML)',
              nameEn: 'AML & Suspicious Reporting Authority',
              code: 'INT_TANTARA_AML',
              icon: 'ShieldAlert',
              direction: 'OUTBOUND',
              endpoints: [
                { id: 'ep_reg_01', method: 'POST', path: '/v1/aml/str-report', shortName: 'str-report', desc: 'رفع تقرير العمليات المشبوهة (STR) تلقائياً لوحدة التحريات المالية الرقابية.' }
              ]
            }
          }
        },
        {
          key: 'aggregator',
          name: 'المجمع',
          nameEn: 'Al-Mujamma',
          code: 'SYS_AGGREGATOR',
          icon: 'Globe',
          description: 'نظام المجمع المالي الموحد لربط بوابات الدفع والمحافظ وبث الإشعارات والـ Webhooks',
          descriptionEn: 'Unified payment aggregation gateway, multi-channel routing, and webhook event streaming',
          status: 'ACTIVE',
          associatedSectorKeys: ['merchants', 'banking', 'aml'],
          integrations: {
            merchants: {
              entityId: 'merchants',
              name: 'أنظمة المتاجر والتطبيقات المجمعة',
              nameEn: 'Merchant Apps & Aggregated Webhooks',
              code: 'INT_NTF_MERCH',
              icon: 'Store',
              direction: 'OUTBOUND',
              endpoints: [
                { id: 'ep_wh_01', method: 'POST', path: '/v1/webhooks/push-notification', shortName: 'payment-webhook', desc: 'بث إشعار فوري لتطبيق التاجر والموبايل بنجاح العملية المالية.' },
                { id: 'ep_wh_02', method: 'POST', path: '/v1/webhooks/refund-event', shortName: 'refund-webhook', desc: 'إشعار التاجر بمعالجة استرجاع المبالغ لحساب العميل.' }
              ]
            },
            banking: {
              entityId: 'banking',
              name: 'المصارف المركزية وغرف المقاصة',
              nameEn: 'Central Banks & Clearing Settlement',
              code: 'INT_AGG_BANK',
              icon: 'Building2',
              direction: 'BIDIRECTIONAL',
              endpoints: [
                { id: 'ep_agg_settle_01', method: 'POST', path: '/v1/aggregator/clearing/batch', shortName: 'clearing-batch', desc: 'تجميع ومعالجة دفعات التسوية والمقاصة بين منصات الدفع وغرف المقاصة.' }
              ]
            },
            aml: {
              entityId: 'aml',
              name: 'مكافحة غسل الأموال (AML)',
              nameEn: 'Aggregator AML Monitoring',
              code: 'INT_AGG_AML',
              icon: 'ShieldAlert',
              direction: 'OUTBOUND',
              endpoints: [
                { id: 'ep_agg_aml_01', method: 'POST', path: '/v1/aggregator/fraud/telemetry', shortName: 'fraud-telemetry', desc: 'بث قياسات الاحتيال وتحليل سلوك المعاملات اللحظية المجمعة عبر المنصات.' }
              ]
            }
          }
        }
      ];

      for (const sys of defaultSystems) {
        const existing = await prisma.system.findUnique({ where: { key: sys.key } });
        if (!existing) {
          await prisma.system.create({
            data: {
              key: sys.key,
              name: sys.name,
              nameEn: sys.nameEn || null,
              code: sys.code,
              icon: sys.icon,
              description: sys.description || null,
              descriptionEn: sys.descriptionEn || null,
              status: sys.status || 'ACTIVE',
              associatedSectorKeys: JSON.stringify(sys.associatedSectorKeys || []),
              integrations: JSON.stringify(sys.integrations || {})
            }
          });
        }
      }
      this.hasInitialized = true;
    } catch (err) {
      console.error('[SqliteSystemRepository] Seeding check failed:', err);
    }
  }

  async getAllSystems(): Promise<Record<string, SystemModuleDto>> {
    await this.ensureDefaultSeed();
    const records = await prisma.system.findMany();
    const result: Record<string, SystemModuleDto> = {};
    for (const r of records) {
      result[r.key] = {
        key: r.key,
        name: r.name,
        nameEn: r.nameEn || undefined,
        code: r.code,
        icon: r.icon,
        description: r.description || undefined,
        descriptionEn: r.descriptionEn || undefined,
        status: (r.status as any) || 'ACTIVE',
        associatedSectorKeys: r.associatedSectorKeys ? JSON.parse(r.associatedSectorKeys) : undefined,
        integrations: r.integrations ? JSON.parse(r.integrations) : {}
      };
    }
    return result;
  }

  async getSystemByKey(key: string): Promise<SystemModuleDto | null> {
    await this.ensureDefaultSeed();
    const record = await prisma.system.findUnique({ where: { key } });
    if (!record) return null;
    return {
      key: record.key,
      name: record.name,
      nameEn: record.nameEn || undefined,
      code: record.code,
      icon: record.icon,
      description: record.description || undefined,
      descriptionEn: record.descriptionEn || undefined,
      status: (record.status as any) || 'ACTIVE',
      associatedSectorKeys: record.associatedSectorKeys ? JSON.parse(record.associatedSectorKeys) : undefined,
      integrations: record.integrations ? JSON.parse(record.integrations) : {}
    };
  }

  async saveSystem(system: SystemModuleDto): Promise<SystemModuleDto> {
    await this.ensureDefaultSeed();
    const integrationsStr = JSON.stringify(system.integrations || {});
    const sectorKeysStr = system.associatedSectorKeys ? JSON.stringify(system.associatedSectorKeys) : null;

    const saved = await prisma.system.upsert({
      where: { key: system.key },
      create: {
        key: system.key,
        name: system.name,
        nameEn: system.nameEn || null,
        code: system.code || `SYS_${system.key.toUpperCase()}`,
        icon: system.icon || 'Layers',
        description: system.description || null,
        descriptionEn: system.descriptionEn || null,
        status: system.status || 'ACTIVE',
        associatedSectorKeys: sectorKeysStr,
        integrations: integrationsStr
      },
      update: {
        name: system.name,
        nameEn: system.nameEn || null,
        code: system.code || `SYS_${system.key.toUpperCase()}`,
        icon: system.icon || 'Layers',
        description: system.description || null,
        descriptionEn: system.descriptionEn || null,
        status: system.status || 'ACTIVE',
        associatedSectorKeys: sectorKeysStr,
        integrations: integrationsStr
      }
    });

    return {
      key: saved.key,
      name: saved.name,
      nameEn: saved.nameEn || undefined,
      code: saved.code,
      icon: saved.icon,
      description: saved.description || undefined,
      descriptionEn: saved.descriptionEn || undefined,
      status: (saved.status as any) || 'ACTIVE',
      associatedSectorKeys: saved.associatedSectorKeys ? JSON.parse(saved.associatedSectorKeys) : undefined,
      integrations: saved.integrations ? JSON.parse(saved.integrations) : {}
    };
  }

  async updateSystem(key: string, updates: Partial<SystemModuleDto>): Promise<SystemModuleDto> {
    const existing = await this.getSystemByKey(key);
    if (!existing) {
      throw new Error(`System "${key}" not found`);
    }

    const merged: SystemModuleDto = {
      ...existing,
      ...updates,
      key, // Key remains immutable
      integrations: updates.integrations !== undefined ? updates.integrations : existing.integrations
    };

    return this.saveSystem(merged);
  }

  async getSystemDependencies(key: string): Promise<{ endpointCount: number; integrationCount: number }> {
    const sys = await this.getSystemByKey(key);
    if (!sys) return { endpointCount: 0, integrationCount: 0 };
    const integrations = Object.values(sys.integrations || {});
    const endpointCount = integrations.reduce((acc, intItem) => acc + (intItem.endpoints?.length || 0), 0);
    return {
      endpointCount,
      integrationCount: integrations.length
    };
  }

  async deleteSystem(key: string): Promise<boolean> {
    try {
      await prisma.system.delete({ where: { key } });
      return true;
    } catch {
      return false;
    }
  }

  async addOrUpdateIntegration(systemKey: string, integration: SystemIntegrationDto): Promise<SystemModuleDto> {
    const system = await this.getSystemByKey(systemKey);
    if (!system) {
      throw new Error(`System "${systemKey}" not found`);
    }

    if (!system.integrations) {
      system.integrations = {};
    }

    system.integrations[integration.entityId] = {
      ...(system.integrations[integration.entityId] || {}),
      ...integration,
      endpoints: integration.endpoints || system.integrations[integration.entityId]?.endpoints || []
    };

    return this.saveSystem(system);
  }

  async deleteIntegration(systemKey: string, entityId: string): Promise<SystemModuleDto> {
    const system = await this.getSystemByKey(systemKey);
    if (!system) {
      throw new Error(`System "${systemKey}" not found`);
    }

    if (system.integrations && system.integrations[entityId]) {
      delete system.integrations[entityId];
    }

    if (system.associatedSectorKeys) {
      system.associatedSectorKeys = system.associatedSectorKeys.filter(k => k !== entityId);
    }

    return this.saveSystem(system);
  }
}
