import { ISectorRepository } from '../../domain/interfaces/ISectorRepository.js';
import { ScreenActionType } from '../../domain/entities/ResourceCatalog.js';

export interface DynamicPermissionDefinition {
  key: string;
  name: string;
  description: string;
  category: 'CATALOG' | 'IAM' | 'SPEC' | 'FINTECH_OPERATIONS';
  systemKey?: string;
  systemName?: string;
  screenKey?: string;
  action?: ScreenActionType;
}

export interface DynamicScreenResource {
  key: string;
  name: string;
  nameAr: string;
  systemKey: string;
  systemName: string;
  systemNameEn?: string;
  category: 'BANKING_OPERATIONS' | 'INTEGRATION_APIS' | 'GOVERNANCE_SYSTEM';
  description: string;
  supportedActions: ScreenActionType[];
}

const ACTION_NAME_MAP: Record<ScreenActionType, string> = {
  read: 'قراءة واستعراض',
  create: 'إنشاء وتنفيذ',
  update: 'تعديل وتحديث',
  delete: 'حذف وإلغاء'
};

export class DynamicSystemPermissionService {
  constructor(private readonly sectorRepository: ISectorRepository) {}

  /**
   * توليد ديناميكي تلقائي 100% لكافة الصلاحيات مشتقة مباشرة من الأنظمة المسجلة في الكتالوج
   */
  async getSystemPermissions(): Promise<DynamicPermissionDefinition[]> {
    const sectors = await this.sectorRepository.getAllSectors();
    const permissions: DynamicPermissionDefinition[] = [];

    // 1. توليد الصلاحيات التلقائية لكل نظام وخدماته وتكاملاته الحية
    for (const [sectorKey, sector] of Object.entries(sectors)) {
      const sysName = sector.name || sectorKey;

      // صلاحية وصول عامة للنظام
      permissions.push({
        key: `system:${sectorKey}:access`,
        name: `استعراض والوصول لنظام ${sysName}`,
        description: `صلاحية استعراض وتصفح وثائق وعمليات نظام [${sysName}]`,
        category: 'CATALOG',
        systemKey: sectorKey,
        systemName: sysName
      });

      // توليد صلاحيات العمليات التفصيلية لكل خدمة / تكامل مسجل في النظام
      if (sector.services && typeof sector.services === 'object') {
        for (const [srvKey, srv] of Object.entries(sector.services)) {
          const srvTitle = srv.title || srv.name || srvKey;
          const actions: ScreenActionType[] = ['read', 'create', 'update', 'delete'];

          for (const action of actions) {
            permissions.push({
              key: `${sectorKey}:${srvKey}:${action}`,
              name: `${ACTION_NAME_MAP[action]} - ${srvTitle} (${sysName})`,
              description: `صلاحية ${ACTION_NAME_MAP[action]} في [${srvTitle}] ضمن نظام [${sysName}]`,
              category: 'FINTECH_OPERATIONS',
              systemKey: sectorKey,
              systemName: sysName,
              screenKey: `${sectorKey}:${srvKey}`,
              action
            });
          }
        }
      }
    }

    // 2. الصلاحيات السيادية المركزية لإدارة المنظومة والحوكمة
    const sovereignPermissions: DynamicPermissionDefinition[] = [
      {
        key: 'iam:manage',
        name: 'إدارة المستخدمين والأدوار والصلاحيات',
        description: 'صلاحية كاملة لإدارة الهويات، المجموعات، ومصفوفة الصلاحيات السيادية',
        category: 'IAM',
        systemKey: 'GOVERNANCE_SYSTEM',
        systemName: 'إدارة وحوكمة المنظومة'
      },
      {
        key: 'iam:audit:view',
        name: 'استعراض سجل التدقيق الأمني السيادي',
        description: 'صلاحية الوصول لسجل العمليات والأحداث الأمنية غير القابل للتعديل',
        category: 'IAM',
        systemKey: 'GOVERNANCE_SYSTEM',
        systemName: 'إدارة وحوكمة المنظومة'
      },
      {
        key: 'governance:policy:manage',
        name: 'إدارة سياسات الحوكمة ومسارات الاعتماد',
        description: 'صلاحية ضبط وتعديل شروط اعتماد التغييرات وصانع القرار Maker-Checker',
        category: 'IAM',
        systemKey: 'GOVERNANCE_SYSTEM',
        systemName: 'إدارة وحوكمة المنظومة'
      },
      {
        key: 'governance:inbox:approve',
        name: 'اعتماد ورفض طلبات الحوكمة والتغييرات',
        description: 'صلاحية المراجعة والتوقيع السيادي على طلبات التعديل المعلقة',
        category: 'IAM',
        systemKey: 'GOVERNANCE_SYSTEM',
        systemName: 'إدارة وحوكمة المنظومة'
      },
      {
        key: 'catalog:system:create',
        name: 'إنشاء وتأسيس أنظمة جديدة في المنظومة',
        description: 'صلاحية تأسيس نظام مصرفي أو قطاع مالي جديد وتوثيق خدماته',
        category: 'CATALOG',
        systemKey: 'GOVERNANCE_SYSTEM',
        systemName: 'إدارة وحوكمة المنظومة'
      },
      {
        key: 'catalog:system:delete',
        name: 'حذف الأنظمة من المنظومة',
        description: 'صلاحية حذف نظام مالي أو قطاع بالكامل',
        category: 'CATALOG',
        systemKey: 'GOVERNANCE_SYSTEM',
        systemName: 'إدارة وحوكمة المنظومة'
      },
      {
        key: 'catalog:endpoint:create',
        name: 'إضافة وتوثيق واجهات برمجية API',
        description: 'صلاحية إضافة نقاط وصول ومسارات برمجية جديدة وتوثيقها',
        category: 'CATALOG',
        systemKey: 'GOVERNANCE_SYSTEM',
        systemName: 'إدارة وحوكمة المنظومة'
      },
      {
        key: 'catalog:endpoint:delete',
        name: 'حذف واجهات برمجية API',
        description: 'صلاحية حذف نقاط وصول ومسارات الـ API',
        category: 'CATALOG',
        systemKey: 'GOVERNANCE_SYSTEM',
        systemName: 'إدارة وحوكمة المنظومة'
      },
      {
        key: 'catalog:spec:export',
        name: 'تصدير المواصفات التقنية (OpenAPI / WSDL)',
        description: 'صلاحية تصدير وثائق المواصفات التقنية بصيغة JSON / YAML',
        category: 'SPEC',
        systemKey: 'GOVERNANCE_SYSTEM',
        systemName: 'إدارة وحوكمة المنظومة'
      }
    ];

    return [...permissions, ...sovereignPermissions];
  }

  /**
   * توليد ديناميكي تلقائي 100% لكافة الموارد والشاشات مشتقة مباشرة من الأنظمة المسجلة في الكتالوج
   */
  async getSystemScreenResources(): Promise<DynamicScreenResource[]> {
    const sectors = await this.sectorRepository.getAllSectors();
    const resources: DynamicScreenResource[] = [];

    // 1. توليد الشاشات والموارد التابعة لكل نظام مسجل
    for (const [sectorKey, sector] of Object.entries(sectors)) {
      const sysName = sector.name || sectorKey;
      const sysNameEn = sector.nameEn || sysName;

      if (sector.services && typeof sector.services === 'object') {
        for (const [srvKey, srv] of Object.entries(sector.services)) {
          const srvTitle = srv.title || srv.name || srvKey;

          resources.push({
            key: `${sectorKey}:${srvKey}`,
            name: `${sysNameEn} - ${srvTitle}`,
            nameAr: `${srvTitle} - ${sysName}`,
            systemKey: sectorKey,
            systemName: sysName,
            systemNameEn: sysNameEn,
            category: 'BANKING_OPERATIONS',
            description: `إدارة وتكاملات ${srvTitle} في نظام [${sysName}]`,
            supportedActions: ['read', 'create', 'update', 'delete']
          });
        }
      }
    }

    // 2. الشاشات السيادية المركزية لإدارة المنظومة
    const sovereignResources: DynamicScreenResource[] = [
      {
        key: 'iam:users',
        name: 'User & IAM Governance',
        nameAr: 'إدارة المستخدمين والصلاحيات',
        systemKey: 'GOVERNANCE_SYSTEM',
        systemName: 'إدارة وحوكمة المنظومة',
        systemNameEn: 'Governance & Sovereign Management',
        category: 'GOVERNANCE_SYSTEM',
        description: 'إدارة هويات المستخدمين، المجموعات، والاستثناءات الفردية',
        supportedActions: ['read', 'create', 'update', 'delete']
      },
      {
        key: 'governance:workflows',
        name: 'Governance & Approval Workflows',
        nameAr: 'حوكمة مسارات الاعتماد وصانع القرار',
        systemKey: 'GOVERNANCE_SYSTEM',
        systemName: 'إدارة وحوكمة المنظومة',
        systemNameEn: 'Governance & Sovereign Management',
        category: 'GOVERNANCE_SYSTEM',
        description: 'حوكمة الإجراءات الحساسة وسياسات التدقيق المزدوج Maker-Checker',
        supportedActions: ['read', 'create', 'update']
      },
      {
        key: 'catalog:apis',
        name: 'API Governance & Catalog',
        nameAr: 'دليل وحوكمة واجهات الـ APIs المصرفية',
        systemKey: 'GOVERNANCE_SYSTEM',
        systemName: 'إدارة وحوكمة المنظومة',
        systemNameEn: 'Governance & Sovereign Management',
        category: 'GOVERNANCE_SYSTEM',
        description: 'دليل وتوثيق نقاط وصول ومواصفات الـ APIs المصرفية',
        supportedActions: ['read', 'create', 'update', 'delete']
      },
      {
        key: 'audit:trail',
        name: 'Sovereign Audit Trail',
        nameAr: 'سجل التدقيق الأمني والرقابي السيادي',
        systemKey: 'GOVERNANCE_SYSTEM',
        systemName: 'إدارة وحوكمة المنظومة',
        systemNameEn: 'Governance & Sovereign Management',
        category: 'GOVERNANCE_SYSTEM',
        description: 'سجل العمليات والتحركات الأمنية غير القابل للتعديل',
        supportedActions: ['read']
      },
      {
        key: 'settings:general',
        name: 'System Settings',
        nameAr: 'إعدادات المنظومة العامة',
        systemKey: 'GOVERNANCE_SYSTEM',
        systemName: 'إدارة وحوكمة المنظومة',
        systemNameEn: 'Governance & Sovereign Management',
        category: 'GOVERNANCE_SYSTEM',
        description: 'إعدادات المنظومة العامة والمتغيرات التشغيلية',
        supportedActions: ['read', 'update']
      }
    ];

    return [...resources, ...sovereignResources];
  }
}
