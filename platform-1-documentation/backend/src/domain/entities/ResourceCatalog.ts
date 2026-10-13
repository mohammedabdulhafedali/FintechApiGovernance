export type ScreenActionType = 'read' | 'create' | 'update' | 'delete';

export interface ScreenResource {
  key: string;
  name: string;
  nameAr: string;
  category: 'BANKING_OPERATIONS' | 'INTEGRATION_APIS' | 'GOVERNANCE_SYSTEM';
  description: string;
  supportedActions: ScreenActionType[];
}

/**
 * كتالوج الموارد والشاشات المصرفية السيادية - Dynamic Resource & Capability Catalog
 * يجسد مبادئ SOLID (Interface Segregation & Open/Closed):
 * كل شاشة تحدد فقط العمليات المدعومة لها دون فرض عمليات غير منطقية.
 */
export const SCREEN_RESOURCES_CATALOG: ScreenResource[] = [
  {
    key: 'ApiCatalog',
    name: 'ApiCatalog',
    nameAr: 'دليل وحوكمة واجهات الـ APIs المصرفية',
    category: 'INTEGRATION_APIS',
    description: 'شاشة فهرس وتوثيق مواصفات ونقاط وصول الـ APIs',
    supportedActions: ['read', 'create', 'update', 'delete']
  },
  {
    key: 'IamGovernance',
    name: 'IamGovernance',
    nameAr: 'حوكمة الهويات والمستخدمين والأدوار',
    category: 'GOVERNANCE_SYSTEM',
    description: 'شاشة حوكمة المستخدمين والمجموعات ومصفوفة الصلاحيات',
    supportedActions: ['read', 'create', 'update', 'delete']
  },
  {
    key: 'AuditTrail',
    name: 'AuditTrail',
    nameAr: 'سجل التدقيق الأمني والرقابي السيادي',
    category: 'GOVERNANCE_SYSTEM',
    description: 'شاشة الاطلاع على سجل التحركات والتدقيق الأمني غير القابل للتعديل',
    supportedActions: ['read']
  },
  {
    key: 'Settings',
    name: 'Settings',
    nameAr: 'إعدادات النظام العامة (Settings)',
    category: 'GOVERNANCE_SYSTEM',
    description: 'شاشة ضبط المحددات والمتغيرات التشغيلية للمنظومة',
    supportedActions: ['read', 'update']
  }
];
