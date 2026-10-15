import { UserPublicProfile, UserGroup, AuditLog, UserOverrides, PermissionDefinition, ScreenResourceDefinition, UserType, ResourceScope } from '../types/auth';
import { authService } from './authService';

const IAM_BASE_URL = 'http://localhost:4000/api/v1/iam';
const AUTH_BASE_URL = 'http://localhost:4000/api/v1/auth';

export class IamService {
  private static instance: IamService;

  private constructor() {}

  public static getInstance(): IamService {
    if (!IamService.instance) {
      IamService.instance = new IamService();
    }
    return IamService.instance;
  }

  // --- Permissions Catalog ---
  public async getPermissionsCatalog(): Promise<PermissionDefinition[]> {
    try {
      const response = await fetch(`${AUTH_BASE_URL}/permissions`, {
        headers: authService.getAuthHeaders()
      });
      const data = await response.json();
      return data.permissions || [];
    } catch {
      return [];
    }
  }

  // --- Users ---
  public async getUsers(): Promise<UserPublicProfile[]> {
    const response = await fetch(`${IAM_BASE_URL}/users`, {
      headers: authService.getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error('فشل تحميل قائمة المستخدمين');
    }
    const data = await response.json();
    return data.users || [];
  }

  public async createUser(input: {
    username: string;
    email: string;
    fullName: string;
    password?: string;
    groupId: string;
    userType?: UserType;
    organizationId?: string;
    organizationName?: string;
    accessScope?: ResourceScope;
  }): Promise<UserPublicProfile> {
    const response = await fetch(`${IAM_BASE_URL}/users`, {
      method: 'POST',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify(input)
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'فشل إنشاء المستخدم');
    }
    return data.user;
  }

  public async updateUserScope(
    userId: string,
    scopeData: {
      userType?: UserType;
      organizationId?: string;
      organizationName?: string;
      accessScope?: ResourceScope;
    }
  ): Promise<UserPublicProfile> {
    const response = await fetch(`${IAM_BASE_URL}/users/${userId}/scope`, {
      method: 'PUT',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify(scopeData)
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'فشل تحديث نطاق الصلاحيات للمستخدم');
    }
    return data.user;
  }

  public async updateUserOverrides(userId: string, overrides: UserOverrides): Promise<UserPublicProfile> {
    const response = await fetch(`${IAM_BASE_URL}/users/${userId}/overrides`, {
      method: 'PUT',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify({ overrides })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'فشل تحديث استثناءات المستخدم');
    }
    return data.user;
  }

  public async updateUserGroup(userId: string, groupId: string): Promise<UserPublicProfile> {
    const response = await fetch(`${IAM_BASE_URL}/users/${userId}/group`, {
      method: 'PUT',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify({ groupId })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'فشل نقل المستخدم');
    }
    return data.user;
  }

  public async toggleUserStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED'): Promise<void> {
    const response = await fetch(`${IAM_BASE_URL}/users/${userId}/status`, {
      method: 'PUT',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify({ status })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'فشل تغيير حالة المستخدم');
    }
  }

  public async deleteUser(userId: string): Promise<void> {
    const response = await fetch(`${IAM_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: authService.getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'فشل حذف المستخدم');
    }
  }


  // --- Screen Resources Catalog (Dynamic Matrix from Live Systems Only) ---
  public async getScreenResources(): Promise<ScreenResourceDefinition[]> {
    try {
      const response = await fetch(`${IAM_BASE_URL}/resources`, {
        headers: authService.getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        if (data.resources && Array.isArray(data.resources)) {
          return data.resources;
        }
      }
    } catch (err) {
      console.warn('تعذر جلب موارد وشاشات الأنظمة الحية من السيرفر:', err);
    }

    // إرجاع مصفوفة فارغة تماماً عند تعذر الاتصال لمنع عرض أي شاشات أو صلاحيات وهمية لا تنتمي للمنظومة
    return [];
  }

  // --- Groups ---
  public async getGroups(): Promise<UserGroup[]> {
    const response = await fetch(`${IAM_BASE_URL}/groups`, {
      headers: authService.getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error('فشل تحميل مجموعات المستخدمين');
    }
    const data = await response.json();
    return data.groups || [];
  }

  public async createGroup(input: {
    key: string;
    name: string;
    description?: string;
    status?: 'ACTIVE' | 'INACTIVE';
    permissions: string[];
  }): Promise<UserGroup> {
    const response = await fetch(`${IAM_BASE_URL}/groups`, {
      method: 'POST',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify(input)
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'فشل إنشاء المجموعة');
    }
    return data.group;
  }

  public async updateGroup(
    groupId: string,
    data: {
      name?: string;
      description?: string;
      status?: 'ACTIVE' | 'INACTIVE';
      permissions?: string[];
    }
  ): Promise<UserGroup> {
    const response = await fetch(`${IAM_BASE_URL}/groups/${groupId}`, {
      method: 'PUT',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify(data)
    });
    const resData = await response.json();
    if (!response.ok || !resData.success) {
      throw new Error(resData.message || 'فشل تحديث بيانات الدور/المجموعة');
    }
    return resData.group || {
      id: groupId,
      key: 'STAGED',
      name: resData.message || 'طلب قيد الاعتماد',
      permissions: data.permissions || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  public async updateGroupPermissions(groupId: string, permissions: string[]): Promise<UserGroup> {
    return this.updateGroup(groupId, { permissions });
  }

  public async deleteGroup(groupId: string): Promise<void> {
    const response = await fetch(`${IAM_BASE_URL}/groups/${groupId}`, {
      method: 'DELETE',
      headers: authService.getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'فشل حذف المجموعة');
    }
    if (data.isStaged) {
      throw new Error(data.message || 'تم إرسال الإجراء لمسار الحوكمة للاعتماد.');
    }
  }

  // --- Audit Logs ---
  public async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    const response = await fetch(`${IAM_BASE_URL}/audit-logs?limit=${limit}`, {
      headers: authService.getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error('فشل تحميل سجلات التدقيق');
    }
    const data = await response.json();
    return data.logs || [];
  }
}

export const iamService = IamService.getInstance();
