export type ScreenActionType = 'read' | 'create' | 'update' | 'delete';

export interface ScreenResource {
  key: string;
  name: string;
  nameAr: string;
  systemKey?: string;
  systemName?: string;
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

/**
 * كتالوج الموارد والشاشات المصرفية السيادية - Dynamic Resource & Capability Catalog
 * يجسد مبادئ SOLID (Interface Segregation & Open/Closed):
 * كل شاشة تحدد فقط العمليات المدعومة لها دون فرض عمليات غير منطقية.
 */
export const SCREEN_RESOURCES_CATALOG: ScreenResource[] = [
  {
    key: 'dashboard',
    name: 'Dashboard Overview',
    nameAr: 'لوحة الداشبورد',
    category: 'BASE_MODULES',
    description: 'استعراض الإحصائيات المركزية، النشاط اللحظي، ومؤشرات الأداء المصرفي',
    supportedActions: ['read']
  },
  {
    key: 'catalog:systems',
    name: 'Systems Management',
    nameAr: 'إدارة الأنظمة',
    category: 'BASE_MODULES',
    description: 'إدارة، تسجيل، وتحديث وحذف الأنظمة المالية والمركزية المستقلة',
    supportedActions: ['read', 'create', 'update', 'delete']
  },
  {
    key: 'catalog:sectors',
    name: 'Entities Management',
    nameAr: 'إدارة الجهات',
    category: 'BASE_MODULES',
    description: 'إدارة، تسجيل، وتحديث وحذف الجهات والقطاعات الشريكة السيادية',
    supportedActions: ['read', 'create', 'update', 'delete']
  },
  {
    key: 'catalog:integrations',
    name: 'Integrations & Linking',
    nameAr: 'إدارة الربط والتكامل',
    category: 'BASE_MODULES',
    description: 'إدارة وتوثيق التكاملات والربط الثنائي بين الأنظمة والجهات الشريكة',
    supportedActions: ['read', 'create', 'update', 'delete']
  },
  {
    key: 'catalog:documents',
    name: 'API Documents & Workspaces',
    nameAr: 'إدارة وثائق الـ API',
    category: 'BASE_MODULES',
    description: 'مصفوفة وإدارة وثائق ومواصفات الـ APIs وإصدار النسخ المعتمدة',
    supportedActions: ['read', 'create', 'update', 'delete']
  },
  {
    key: 'catalog:create',
    name: 'Add Documentation / System',
    nameAr: 'إضافة توثيق جديد',
    category: 'BASE_MODULES',
    description: 'صلاحية فتح نموذج إضافة نظام أو توثيق برمجي وتكامل جديد',
    supportedActions: ['read', 'create']
  },
  {
    key: 'documentation:dynamic',
    name: 'Dynamic Documentation Studio',
    nameAr: 'التوثيق الديناميكي',
    category: 'BASE_MODULES',
    description: 'استوديو التوثيق البرمجي الحي متعدد الأوضاع وتصدير المواصفات',
    supportedActions: ['read', 'create', 'update']
  },
  {
    key: 'documentation:systems',
    name: 'Systems Documentation Hub',
    nameAr: 'التوثيق البرمجي للأنظمة',
    category: 'BASE_MODULES',
    description: 'الدخول واستعراض الدليل الموحد وتوثيقات الـ APIs لجميع الأنظمة المركزية',
    supportedActions: ['read', 'create', 'update', 'delete']
  },
  {
    key: 'governance:workflows',
    name: 'Governance & Approval Workflows',
    nameAr: 'مركز الاعتمادات والمرفوعات',
    category: 'BASE_MODULES',
    description: 'حوكمة مسارات الاعتماد، تدقيق Maker-Checker، وإقرار التغييرات السيادية',
    supportedActions: ['read', 'create', 'update']
  },
  {
    key: 'governance:policies',
    name: 'Workflow Policies Studio',
    nameAr: 'سياسات ومسارات الاعتماد',
    category: 'BASE_MODULES',
    description: 'إدارة وتخصيص سياسات الحوكمة ومسارات اعتماد Maker-Checker',
    supportedActions: ['read', 'update']
  },
  {
    key: 'iam:users',
    name: 'User & IAM Governance',
    nameAr: 'إدارة المستخدمين والصلاحيات',
    category: 'BASE_MODULES',
    description: 'إدارة حسابات المستخدمين، المجموعات والأدوار، والاستثناءات الفردية',
    supportedActions: ['read', 'create', 'update', 'delete']
  },
  {
    key: 'audit:trail',
    name: 'Sovereign Audit Trail',
    nameAr: 'سجل التدقيق الأمني والرقابي',
    category: 'BASE_MODULES',
    description: 'سجل التدقيق الأمني السيادي الشامل للعمليات والأحداث الرقابية غير القابل للتعديل',
    supportedActions: ['read']
  },
  {
    key: 'settings:general',
    name: 'System Settings',
    nameAr: 'إعدادات المنظومة العامة',
    category: 'BASE_MODULES',
    description: 'إعدادات وتفضيلات المنظومة والمعايير التشغيلية المصرفية',
    supportedActions: ['read', 'update']
  }
];
