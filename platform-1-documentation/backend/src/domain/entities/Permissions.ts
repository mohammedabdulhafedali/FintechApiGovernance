import { SCREEN_RESOURCES_CATALOG, ScreenActionType } from './ResourceCatalog.js';

export interface PermissionDefinition {
  key: string;
  name: string;
  description: string;
  category: 'CATALOG' | 'IAM' | 'SPEC' | 'FINTECH_OPERATIONS';
  screenKey?: string;
  action?: ScreenActionType;
}

const ACTION_NAME_MAP: Record<ScreenActionType, string> = {
  read: 'قراءة واستعراض',
  create: 'إنشاء وإضافة',
  update: 'تعديل وتحديث',
  delete: 'حذف وإلغاء'
};

/**
 * توليد ديناميكي كامل للصلاحيات من كتالوج الشاشات وفق مبدأ Single Source of Truth
 */
const DYNAMIC_SCREEN_PERMISSIONS: PermissionDefinition[] = SCREEN_RESOURCES_CATALOG.flatMap(screen => 
  screen.supportedActions.map(action => ({
    key: `${screen.key}:${action}`,
    name: `${ACTION_NAME_MAP[action]} - ${screen.nameAr}`,
    description: `صلاحية ${ACTION_NAME_MAP[action]} في شاشة [${screen.name}]`,
    category: 'FINTECH_OPERATIONS' as const,
    screenKey: screen.key,
    action: action
  }))
);

export const SYSTEM_PERMISSIONS: PermissionDefinition[] = [
  ...DYNAMIC_SCREEN_PERMISSIONS,
  {
    key: 'catalog:system:create',
    name: 'إنشاء وتعديل الأنظمة والقطاعات',
    description: 'صلاحية إضافة أنظمة جديدة أو تعديل قطاعات التوثيق الحالية',
    category: 'CATALOG'
  },
  {
    key: 'catalog:system:delete',
    name: 'حذف الأنظمة والقطاعات',
    description: 'صلاحية حذف نظام أو قطاع كامل من المنظومة',
    category: 'CATALOG'
  },
  {
    key: 'catalog:endpoint:create',
    name: 'إضافة وتوثيق واجهات برمجية API',
    description: 'صلاحية إضافة نقاط وصول ومسارات برمجية جديدة وتوثيقها',
    category: 'CATALOG'
  },
  {
    key: 'catalog:endpoint:delete',
    name: 'حذف واجهات وتكاملات برمجية API',
    description: 'صلاحية حذف نقاط الوصول ومسارات الـ API',
    category: 'CATALOG'
  },
  {
    key: 'catalog:spec:export',
    name: 'تصدير ومشاركة المواصفات',
    description: 'صلاحية تصدير المواصفات واللقطات كملفات OpenAPI أو JSON',
    category: 'SPEC'
  },
  {
    key: 'iam:manage',
    name: 'إدارة المستخدمين والمجموعات والصلاحيات',
    description: 'صلاحية إدارة وحوكمة هويات المستخدمين وتخصيص الصلاحيات الفردية',
    category: 'IAM'
  },
  {
    key: 'iam:audit:view',
    name: 'استعراض سجل التدقيق الأمني',
    description: 'صلاحية الاطلاع على سجلات العمليات والحركات المنفذة',
    category: 'IAM'
  }
];
