import { ISectorRepository } from '../../domain/interfaces/ISectorRepository.js';
import { SqliteSystemRepository } from '../../infrastructure/repositories/SqliteSystemRepository.js';
import { ScreenActionType } from '../../domain/entities/ResourceCatalog.js';

export interface DynamicPermissionDefinition {
  key: string;
  name: string;
  description: string;
  category: 'BASE_MODULES' | 'CENTRAL_SYSTEMS' | 'CATALOG' | 'IAM' | 'SPEC' | 'FINTECH_OPERATIONS';
  systemKey?: string;
  systemName?: string;
  systemCode?: string;
  sectorKey?: string;
  sectorName?: string;
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
  systemCode?: string;
  sectorKey?: string;
  sectorName?: string;
  category: 'BASE_MODULES' | 'CENTRAL_SYSTEMS' | 'BANKING_OPERATIONS' | 'INTEGRATION_APIS' | 'GOVERNANCE_SYSTEM' | string;
  description: string;
  supportedActions: ScreenActionType[];
  endpointsCount?: number;
  endpoints?: Array<{
    id: string;
    method: string;
    path: string;
    shortName: string;
    desc?: string;
  }>;
}

const ACTION_NAME_MAP: Record<ScreenActionType, string> = {
  read: 'قراءة واستعراض',
  create: 'إنشاء وتنفيذ',
  update: 'تعديل وتحديث',
  delete: 'حذف وإلغاء'
};

export class DynamicSystemPermissionService {
  constructor(
    private readonly sectorRepository: ISectorRepository,
    private readonly systemRepository?: SqliteSystemRepository
  ) {}

  /**
   * توليد ديناميكي تلقائي 100% لكافة الصلاحيات مشتقة مباشرة من الأنظمة والتكاملات والمسارات الحية
   */
  async getSystemPermissions(): Promise<DynamicPermissionDefinition[]> {
    const permissions: DynamicPermissionDefinition[] = [];

    // 1. صلاحيات النماذج الأساسية للمنظومة
    const baseModulePermissions: DynamicPermissionDefinition[] = [
      {
        key: 'dashboard:read',
        name: 'استعراض لوحة الداشبورد',
        description: 'صلاحية الدخول للداشبورد ومشاهدة مؤشرات الأداء والعمليات اللحظية',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'read'
      },
      // إدارة الأنظمة
      {
        key: 'catalog:systems:read',
        name: 'استعراض إدارة الأنظمة',
        description: 'صلاحية استعراض قائمة الأنظمة المالية والمركزية المسجلة',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'read'
      },
      {
        key: 'catalog:systems:create',
        name: 'تسجيل نظام مالي جديد',
        description: 'صلاحية إضافة وتسجيل نظام مالي أو مصرفي جديد في المنظومة',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'create'
      },
      {
        key: 'catalog:systems:update',
        name: 'تحديث بيانات الأنظمة',
        description: 'صلاحية تعديل وتحديث بيانات ومعرفات الأنظمة المالية',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'update'
      },
      {
        key: 'catalog:systems:delete',
        name: 'حذف الأنظمة المالية',
        description: 'صلاحية إزالة الأنظمة غير المرتبطة بتكاملات نشطة',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'delete'
      },
      // إدارة الجهات
      {
        key: 'catalog:sectors:read',
        name: 'استعراض إدارة الجهات',
        description: 'صلاحية استعراض دليل الجهات والقطاعات الشريكة',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'read'
      },
      {
        key: 'catalog:sectors:create',
        name: 'تسجيل جهة أو قطاع جديد',
        description: 'صلاحية إضافة جهة شريكة أو قطاع مصرفي سيادي في الدليل',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'create'
      },
      {
        key: 'catalog:sectors:update',
        name: 'تحديث بيانات الجهات والقطاعات',
        description: 'صلاحية تعديل بيانات ورموز الجهات والقطاعات',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'update'
      },
      {
        key: 'catalog:sectors:delete',
        name: 'حذف جهة أو قطاع شريك',
        description: 'صلاحية حذف الجهات المستقلة غير المرتبطة بأنظمة نشطة',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'delete'
      },
      // إدارة الربط والتكامل
      {
        key: 'catalog:integrations:read',
        name: 'استعراض إدارة الربط والتكامل',
        description: 'صلاحية استعراض مصفوفة الربط والتكاملات القائمة بين الأنظمة والجهات',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'read'
      },
      {
        key: 'catalog:integrations:create',
        name: 'إنشاء وتوثيق تكامل جديد',
        description: 'صلاحية إنشاء رابط تكاملي موثق بين نظام وجهة شريكة',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'create'
      },
      {
        key: 'catalog:integrations:update',
        name: 'تعديل بيانات التكامل والربط',
        description: 'صلاحية تحديث ومراجعة مسارات تدفق التكامل والوثائق المرتبطة',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'update'
      },
      {
        key: 'catalog:integrations:delete',
        name: 'فك وإلغاء ارتباط تكامل',
        description: 'صلاحية فك ارتباط تكاملي بين نظام وجهة وفق قواعد الحوكمة',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'delete'
      },
      // إدارة وثائق الـ API
      {
        key: 'catalog:documents:read',
        name: 'استعراض مصفوفة وثائق الـ API',
        description: 'صلاحية استعراض ومطالعة وثائق ومواصفات الـ APIs المعتمدة',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'read'
      },
      {
        key: 'catalog:documents:create',
        name: 'إنشاء وإصدار وثيقة API جديدة',
        description: 'صلاحية تدشين حاوية وثائقية أو إصدار نسخة جديدة لمواصفة API',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'create'
      },
      {
        key: 'catalog:documents:update',
        name: 'تحديث وترقية وثائق ومواصفات API',
        description: 'صلاحية تعديل الوثائق ورفع طلبات ترقية الإصدارات',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'update'
      },
      {
        key: 'catalog:documents:delete',
        name: 'حذف وثائق الـ API غير المعتمدة',
        description: 'صلاحية حذف أو أرشفة مسودات الوثائق',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'delete'
      },
      {
        key: 'catalog:create',
        name: 'إضافة وتوثيق نظام جديد',
        description: 'صلاحية فتح نموذج إضافة نظام أو توثيق برمجي وتكامل جديد',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'create'
      },
      {
        key: 'documentation:dynamic:read',
        name: 'استعراض استوديو التوثيق الديناميكي',
        description: 'صلاحية الدخول لاستوديو التوثيق الحي وتجربة وتصدير المواصفات',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'read'
      },
      {
        key: 'documentation:dynamic:create',
        name: 'إضافة نقاط نهاية ومواصفات في الاستوديو',
        description: 'صلاحية تصميم وإضافة نقاط ومسارات في التوثيق الديناميكي',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'create'
      },
      {
        key: 'documentation:dynamic:update',
        name: 'تعديل مسارات ومواصفات الاستوديو',
        description: 'صلاحية تعديل معاملات ومخططات الـ APIs في الاستوديو',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'update'
      },
      {
        key: 'documentation:systems:read',
        name: 'استعراض التوثيق البرمجي للأنظمة',
        description: 'الدخول واستعراض دليل التوثيق البرمجي الموحد للأنظمة',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'read'
      },
      {
        key: 'governance:workflows:read',
        name: 'استعراض مركز الاعتمادات والمرفوعات',
        description: 'صلاحية مطالعة طلبات الاعتماد ومسارات الحوكمة المعلقة',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'read'
      },
      {
        key: 'governance:inbox:approve',
        name: 'اعتماد ورفض طلبات الحوكمة والتغييرات',
        description: 'صلاحية المراجعة والتوقيع السيادي على طلبات التعديل المعلقة',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'update'
      },
      {
        key: 'governance:policies:read',
        name: 'استعراض سياسات ومسارات الاعتماد',
        description: 'صلاحية استعراض مصفوفة سياسات الحوكمة ومسارات Maker-Checker',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'read'
      },
      {
        key: 'governance:policies:update',
        name: 'تعديل وضبط سياسات الحوكمة',
        description: 'صلاحية تخصيص وتعديل متطلبات الاعتماد ومراحل الحوكمة للموارد',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'update'
      },
      {
        key: 'iam:manage',
        name: 'إدارة المستخدمين والأدوار والصلاحيات',
        description: 'صلاحية كاملة لإدارة الهويات، المجموعات، ومصفوفة الصلاحيات السيادية',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'update'
      },
      {
        key: 'iam:audit:view',
        name: 'استعراض سجل التدقيق الأمني السيادي',
        description: 'صلاحية الوصول لسجل العمليات والأحداث الأمنية غير القابل للتعديل',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'read'
      },
      {
        key: 'settings:general:read',
        name: 'استعراض إعدادات المنظومة',
        description: 'صلاحية قراءة إعدادات وتشغيل المنظومة العامة',
        category: 'BASE_MODULES',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        action: 'read'
      }
    ];

    permissions.push(...baseModulePermissions);

    // 2. توليد الصلاحيات المخصصة الهرمية من الأنظمة المركزية
    if (this.systemRepository) {
      const systems = await this.systemRepository.getAllSystems();
      for (const [sysKey, sys] of Object.entries(systems)) {
        // صلاحية شاملة للنظام بالكامل (Wildcard)
        permissions.push({
          key: `sys:${sysKey}:*`,
          name: `التحكم الشامل بنظام ${sys.name} (*)`,
          description: `صلاحية كاملة لجميع تكاملات ومسارات نظام [${sys.name}] (${sys.code})`,
          category: 'CENTRAL_SYSTEMS',
          systemKey: sysKey,
          systemName: sys.name,
          systemCode: sys.code
        });

        // صلاحيات العمليات المباشرة على مستوى النظام نفسه
        for (const action of ['read', 'create', 'update', 'delete'] as ScreenActionType[]) {
          permissions.push({
            key: `sys:${sysKey}:${action}`,
            name: `${ACTION_NAME_MAP[action]} - نظام ${sys.name}`,
            description: `صلاحية ${ACTION_NAME_MAP[action]} في نظام [${sys.name}] (${sys.code})`,
            category: 'CENTRAL_SYSTEMS',
            systemKey: sysKey,
            systemName: sys.name,
            systemCode: sys.code,
            screenKey: `sys:${sysKey}`,
            action
          });
        }

        if (sys.integrations && typeof sys.integrations === 'object') {
          for (const [intKey, int] of Object.entries(sys.integrations)) {
            const intTitle = int.name || intKey;
            for (const action of ['read', 'create', 'update', 'delete'] as ScreenActionType[]) {
              permissions.push({
                key: `sys:${sysKey}:int:${intKey}:${action}`,
                name: `${ACTION_NAME_MAP[action]} - ${intTitle} (${sys.name})`,
                description: `صلاحية ${ACTION_NAME_MAP[action]} في تكامل [${intTitle}] بنظام [${sys.name}]`,
                category: 'CENTRAL_SYSTEMS',
                systemKey: sysKey,
                systemName: sys.name,
                systemCode: sys.code,
                sectorKey: intKey,
                sectorName: intTitle,
                screenKey: `sys:${sysKey}:int:${intKey}`,
                action
              });
            }
          }
        }
      }
    }

    return permissions;
  }

  /**
   * توليد ديناميكي تلقائي 100% لكافة الموارد والشاشات مشتقة مباشرة من الأنظمة وتكاملاتها ومساراتها
   */
  async getSystemScreenResources(): Promise<DynamicScreenResource[]> {
    // 1. النماذج والشاشات الأساسية للمنظومة (المستوى الأول العام)
    const baseModules: DynamicScreenResource[] = [
      {
        key: 'dashboard',
        name: 'Dashboard Overview',
        nameAr: 'لوحة الداشبورد',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        systemNameEn: 'Core Platform Modules',
        systemCode: 'MOD_DASHBOARD',
        category: 'BASE_MODULES',
        description: 'استعراض الإحصائيات المركزية، النشاط اللحظي، ومؤشرات الأداء المصرفي',
        supportedActions: ['read']
      },
      {
        key: 'catalog:systems',
        name: 'Systems Management',
        nameAr: 'إدارة الأنظمة',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        systemNameEn: 'Core Platform Modules',
        systemCode: 'MOD_SYSTEMS',
        category: 'BASE_MODULES',
        description: 'إدارة، تسجيل، وتحديث وحذف الأنظمة المالية والمركزية المستقلة',
        supportedActions: ['read', 'create', 'update', 'delete']
      },
      {
        key: 'catalog:sectors',
        name: 'Entities Management',
        nameAr: 'إدارة الجهات',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        systemNameEn: 'Core Platform Modules',
        systemCode: 'MOD_ENTITIES',
        category: 'BASE_MODULES',
        description: 'إدارة، تسجيل، وتحديث وحذف الجهات والقطاعات الشريكة السيادية',
        supportedActions: ['read', 'create', 'update', 'delete']
      },
      {
        key: 'catalog:integrations',
        name: 'Integrations & Linking',
        nameAr: 'إدارة الربط والتكامل',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        systemNameEn: 'Core Platform Modules',
        systemCode: 'MOD_INTEGRATIONS',
        category: 'BASE_MODULES',
        description: 'إدارة وتوثيق التكاملات والربط الثنائي بين الأنظمة والجهات الشريكة',
        supportedActions: ['read', 'create', 'update', 'delete']
      },
      {
        key: 'catalog:documents',
        name: 'API Documents & Workspaces',
        nameAr: 'إدارة وثائق الـ API',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        systemNameEn: 'Core Platform Modules',
        systemCode: 'MOD_DOC_MATRIX',
        category: 'BASE_MODULES',
        description: 'مصفوفة وإدارة وثائق ومواصفات الـ APIs وإصدار النسخ المعتمدة',
        supportedActions: ['read', 'create', 'update', 'delete']
      },
      {
        key: 'catalog:create',
        name: 'Add Documentation / System',
        nameAr: 'إضافة توثيق جديد',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        systemNameEn: 'Core Platform Modules',
        systemCode: 'MOD_DOC_ADD',
        category: 'BASE_MODULES',
        description: 'صلاحية فتح نموذج إضافة نظام أو توثيق برمجي وتكامل جديد',
        supportedActions: ['read', 'create']
      },
      {
        key: 'documentation:dynamic',
        name: 'Dynamic Documentation Studio',
        nameAr: 'التوثيق الديناميكي',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        systemNameEn: 'Core Platform Modules',
        systemCode: 'MOD_DYNAMIC_DOCS',
        category: 'BASE_MODULES',
        description: 'استوديو التوثيق البرمجي الحي متعدد الأوضاع وتصدير المواصفات',
        supportedActions: ['read', 'create', 'update']
      },
      {
        key: 'documentation:systems',
        name: 'Systems Documentation Hub',
        nameAr: 'التوثيق البرمجي للأنظمة',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        systemNameEn: 'Core Platform Modules',
        systemCode: 'MOD_DOCS',
        category: 'BASE_MODULES',
        description: 'الدخول واستعراض الدليل الموحد وتوثيقات الـ APIs لجميع الأنظمة المركزية',
        supportedActions: ['read', 'create', 'update', 'delete']
      },
      {
        key: 'governance:workflows',
        name: 'Governance & Approval Workflows',
        nameAr: 'مركز الاعتمادات والمرفوعات',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        systemNameEn: 'Core Platform Modules',
        systemCode: 'MOD_GOVERNANCE',
        category: 'BASE_MODULES',
        description: 'حوكمة مسارات الاعتماد، تدقيق Maker-Checker، وإقرار التغييرات السيادية',
        supportedActions: ['read', 'create', 'update']
      },
      {
        key: 'governance:policies',
        name: 'Workflow Policies Studio',
        nameAr: 'سياسات ومسارات الاعتماد',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        systemNameEn: 'Core Platform Modules',
        systemCode: 'MOD_POLICIES',
        category: 'BASE_MODULES',
        description: 'إدارة وتخصيص سياسات الحوكمة ومسارات اعتماد Maker-Checker',
        supportedActions: ['read', 'update']
      },
      {
        key: 'iam:users',
        name: 'User & IAM Governance',
        nameAr: 'إدارة المستخدمين والصلاحيات',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        systemNameEn: 'Core Platform Modules',
        systemCode: 'MOD_IAM',
        category: 'BASE_MODULES',
        description: 'إدارة حسابات المستخدمين، المجموعات والأدوار، والاستثناءات الفردية',
        supportedActions: ['read', 'create', 'update', 'delete']
      },
      {
        key: 'audit:trail',
        name: 'Sovereign Audit Trail',
        nameAr: 'سجل التدقيق الأمني والرقابي',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        systemNameEn: 'Core Platform Modules',
        systemCode: 'MOD_AUDIT',
        category: 'BASE_MODULES',
        description: 'سجل التدقيق الأمني السيادي الشامل للعمليات والأحداث الرقابية غير القابل للتعديل',
        supportedActions: ['read']
      },
      {
        key: 'settings:general',
        name: 'System Settings',
        nameAr: 'إعدادات المنظومة العامة',
        systemKey: 'BASE_MODULES',
        systemName: 'نماذج المنظومة الأساسية',
        systemNameEn: 'Core Platform Modules',
        systemCode: 'MOD_SETTINGS',
        category: 'BASE_MODULES',
        description: 'إعدادات وتفضيلات المنظومة والمعايير التشغيلية المصرفية',
        supportedActions: ['read', 'update']
      }
    ];

    // 2. الصلاحيات المخصصة الهرمية للأنظمة المركزية (تحصيل، تنترة، المجمع)
    const centralSystemResources: DynamicScreenResource[] = [];
    if (this.systemRepository) {
      const systems = await this.systemRepository.getAllSystems();
      for (const [sysKey, sys] of Object.entries(systems)) {
        // إضافة شاشة ومورد النظام نفسه دائماً (Dynamic System-level Resource)
        centralSystemResources.push({
          key: `sys:${sysKey}`,
          name: sys.nameEn || sys.name,
          nameAr: `نظام ${sys.name}`,
          systemKey: sysKey,
          systemName: sys.name,
          systemNameEn: sys.nameEn || sysKey,
          systemCode: sys.code || `SYS_${sysKey.toUpperCase()}`,
          category: 'CENTRAL_SYSTEMS',
          description: sys.description || `إدارة وتشغيل وصلاحيات نظام [${sys.name}] (${sys.code})`,
          supportedActions: ['read', 'create', 'update', 'delete']
        });

        if (sys.integrations && typeof sys.integrations === 'object') {
          for (const [intKey, int] of Object.entries(sys.integrations)) {
            const intTitle = int.name || intKey;
            const endpoints = Array.isArray(int.endpoints) ? int.endpoints : [];

            centralSystemResources.push({
              key: `sys:${sysKey}:int:${intKey}`,
              name: `${sys.nameEn || sys.name} - ${int.nameEn || intTitle}`,
              nameAr: `${intTitle} - ${sys.name}`,
              systemKey: sysKey,
              systemName: sys.name,
              systemNameEn: sys.nameEn || sysKey,
              systemCode: sys.code || `SYS_${sysKey.toUpperCase()}`,
              sectorKey: intKey,
              sectorName: intTitle,
              category: 'CENTRAL_SYSTEMS',
              description: `تكامل [${intTitle}] ضمن نظام [${sys.name}] (${sys.code}) - يشمل ${endpoints.length} مسار API`,
              supportedActions: ['read', 'create', 'update', 'delete'],
              endpointsCount: endpoints.length,
              endpoints: endpoints.map((ep: any) => ({
                id: ep.id || ep.shortName,
                method: ep.method || 'POST',
                path: ep.path || '',
                shortName: ep.shortName || ep.path,
                desc: ep.desc || ep.descEn || ''
              }))
            });
          }
        }
      }
    }

    // fallback إذا لم يكن هناك أنظمة مسجلة بعد في SQLite
    if (centralSystemResources.length === 0) {
      const sectors = await this.sectorRepository.getAllSectors();
      for (const [sectorKey, sector] of Object.entries(sectors)) {
        const sysName = sector.name || sectorKey;
        const sysNameEn = sector.nameEn || sysName;

        if (sector.services && typeof sector.services === 'object') {
          for (const [srvKey, srv] of Object.entries(sector.services)) {
            const srvTitle = srv.title || srv.name || srvKey;
            const eps = Array.isArray(srv.endpoints) ? srv.endpoints : [];
            centralSystemResources.push({
              key: `${sectorKey}:${srvKey}`,
              name: `${sysNameEn} - ${srvTitle}`,
              nameAr: `${srvTitle} - ${sysName}`,
              systemKey: sectorKey,
              systemName: sysName,
              systemNameEn: sysNameEn,
              systemCode: sector.code,
              sectorKey: srvKey,
              sectorName: srvTitle,
              category: 'CENTRAL_SYSTEMS',
              description: `إدارة وتكاملات ${srvTitle} في نظام [${sysName}]`,
              supportedActions: ['read', 'create', 'update', 'delete'],
              endpointsCount: eps.length,
              endpoints: eps.map((e: any) => ({
                id: e.id,
                method: e.method,
                path: e.path,
                shortName: e.shortName,
                desc: e.desc
              }))
            });
          }
        }
      }
    }

    return [...baseModules, ...centralSystemResources];
  }
}

