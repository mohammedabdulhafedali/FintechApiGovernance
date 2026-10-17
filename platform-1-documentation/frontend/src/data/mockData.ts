import { Sector, ChangeRequest, RBACRole, SealedSnapshot, SystemModule } from '../types/schema';

// ── Sovereign Domain Architecture: Zero Mock Test Records ──
// All Systems, Sectors, Integrations, and Documents originate strictly from genuine user creation and SQLite persistence.

export const INITIAL_SYSTEMS: Record<string, SystemModule> = {};

export const INITIAL_SECTORS: Record<string, Sector> = {};

export const INITIAL_CHANGE_REQUESTS: ChangeRequest[] = [];

export const INITIAL_SNAPSHOTS: SealedSnapshot[] = [];

export const INITIAL_ROLES: RBACRole[] = [
  {
    id: 'role_admin',
    name: 'مسؤول المنظومة السيادية (Enterprise Admin)',
    badge: 'badge-rose',
    description: 'صلاحيات كاملة وغير مقيدة على كافة الأصول والسياسات والأدوار والختم المشفر.',
    permissions: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      execute: true,
      approve: true,
      export: true
    }
  },
  {
    id: 'role_architect',
    name: 'مهندس المواصفات المعمارية (API Architect)',
    badge: 'badge-blue',
    description: 'تصميم المواصفات، ضبط المخططات، فتح طلبات التغيير، ومراجعة كسر التوافق.',
    permissions: {
      view: true,
      create: true,
      edit: true,
      delete: false,
      execute: true,
      approve: false,
      export: true
    }
  },
  {
    id: 'role_cso',
    name: 'رئيس أمن المعلومات (Chief Security Officer)',
    badge: 'badge-purple',
    description: 'التدقيق الأمني النهائي، وإطلاق الختم الرقمي السيادي بمفتاح الـ KMS.',
    permissions: {
      view: true,
      create: false,
      edit: false,
      delete: false,
      execute: true,
      approve: true,
      export: true
    }
  },
  {
    id: 'role_cco',
    name: 'مسؤول الامتثال المالي (Compliance Officer)',
    badge: 'badge-amber',
    description: 'مراجعة معايير ISO 20022 و PCI-DSS واعتماد مسارات الامتثال.',
    permissions: {
      view: true,
      create: false,
      edit: false,
      delete: false,
      execute: false,
      approve: true,
      export: true
    }
  },
  {
    id: 'role_tester',
    name: 'مهندس التكامل والاختبارات (API Integrator & Tester)',
    badge: 'badge-emerald',
    description: 'استعراض الوثائق، تشغيل خادم المحاكاة، واستخراج كود الـ SDKs.',
    permissions: {
      view: true,
      create: false,
      edit: false,
      delete: false,
      execute: true,
      approve: false,
      export: true
    }
  }
];
