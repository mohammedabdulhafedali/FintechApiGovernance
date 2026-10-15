import crypto from 'crypto';
import { IUserGroupRepository } from '../../../domain/repositories/IUserGroupRepository.js';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { UserGroup } from '../../../domain/entities/UserGroup.js';

export interface CreateGroupInput {
  key: string;
  name: string;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  permissions: string[];
}

export interface UpdateGroupInput {
  name?: string;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  permissions?: string[];
}

export class ManageGroupsUseCase {
  constructor(
    private readonly userGroupRepository: IUserGroupRepository,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly userRepository?: IUserRepository
  ) {}

  /**
   * تطبيق قاعدة الاعتمادية المتسلسلة (Cascading Dependency Rule):
   * إذا مُنحت صلاحية إنشاء، تعديل، أو حذف لشاشة معينة، يتم تلقائياً منح صلاحية القراءة المقابلة.
   */
  private normalizeCascadedPermissions(permissions: string[]): string[] {
    const set = new Set(permissions);
    for (const perm of permissions) {
      if (perm.includes(':create') || perm.includes(':update') || perm.includes(':delete')) {
        const [screen] = perm.split(':');
        if (screen) {
          set.add(`${screen}:read`);
        }
      }
    }
    return Array.from(set);
  }

  async getAllGroups(): Promise<UserGroup[]> {
    return this.userGroupRepository.findAll();
  }

  async createGroup(input: CreateGroupInput, actorUsername: string): Promise<UserGroup> {
    const existing = await this.userGroupRepository.findByKey(input.key);
    if (existing) {
      throw new Error(`مفتاح المجموعة [${input.key}] موجود مسبقاً.`);
    }

    const normalizedPermissions = this.normalizeCascadedPermissions(input.permissions || []);

    const newGroup: UserGroup = {
      id: `grp_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      key: input.key.trim().toUpperCase(),
      name: input.name.trim(),
      description: input.description?.trim(),
      status: input.status || 'ACTIVE',
      permissions: normalizedPermissions,
      isSystemDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.userGroupRepository.save(newGroup);

    await this.auditLogRepository.record({
      userId: actorUsername,
      username: actorUsername,
      action: 'iam:group:create',
      resource: `group:${newGroup.key}`,
      status: 'SUCCESS',
      details: `إنشاء مجموعة/دور جديد [${newGroup.name}] بحالة (${newGroup.status}) وبصلاحيات (${newGroup.permissions.length})`
    });

    return newGroup;
  }

  async updateGroup(
    groupId: string,
    data: UpdateGroupInput,
    actorUsername: string
  ): Promise<UserGroup> {
    const group = await this.userGroupRepository.findById(groupId);
    if (!group) throw new Error('المجموعة/الدور غير موجود.');

    const isSuperAdminGroup = group.id === 'grp_super_admin' || group.key === 'ADMIN_GROUP' || (group.permissions || []).includes('*');

    if (isSuperAdminGroup) {
      if (data.status === 'INACTIVE') {
        throw new Error('لا يمكن تعطيل دور مدير النظام السيادي للحفاظ على استقرار المنظومة.');
      }
      if (data.permissions !== undefined && (!data.permissions.includes('*') || data.permissions.length === 0)) {
        throw new Error('صلاحيات دور مدير النظام السيادي مجمدة ومحمية بالكامل (* ولا يمكن تجزئتها أو حجبها).');
      }
    }

    if (data.name !== undefined) group.name = data.name.trim();
    if (data.description !== undefined) group.description = data.description.trim();
    if (data.status !== undefined && !isSuperAdminGroup) group.status = data.status;
    if (data.permissions !== undefined) {
      if (isSuperAdminGroup) {
        group.permissions = ['*'];
      } else {
        group.permissions = this.normalizeCascadedPermissions(data.permissions);
      }
    }
    group.updatedAt = new Date().toISOString();

    await this.userGroupRepository.update(group);

    await this.auditLogRepository.record({
      userId: actorUsername,
      username: actorUsername,
      action: 'iam:group:update',
      resource: `group:${group.key}`,
      status: 'SUCCESS',
      details: `تحديث الدور/المجموعة [${group.name}] - الحالة: (${group.status}) - الصلاحيات: (${group.permissions.length})`
    });

    return group;
  }

  async updateGroupPermissions(
    groupId: string,
    permissions: string[],
    actorUsername: string
  ): Promise<UserGroup> {
    return this.updateGroup(groupId, { permissions }, actorUsername);
  }

  async deleteGroup(groupId: string, actorUsername: string): Promise<boolean> {
    const group = await this.userGroupRepository.findById(groupId);
    if (!group) {
      throw new Error('المجموعة/الدور المراد حذفه غير موجود في المنظومة.');
    }

    if (group.isSystemDefault || group.key === 'ADMIN_GROUP') {
      throw new Error('لا يمكن حذف المجموعات الافتراضية السيادية للنظام.');
    }

    if (this.userRepository) {
      const allUsers = await this.userRepository.findAll();
      const linkedUsers = allUsers.filter(u => u.groupId === group.id || u.groupId === group.key);
      if (linkedUsers.length > 0) {
        throw new Error(`لا يمكن حذف الدور [${group.name}] لوجود (${linkedUsers.length}) مستخدمين مسندين إليه حالياً. يرجى نقل المستخدمين لدور آخر أولاً.`);
      }
    }

    const deleted = await this.userGroupRepository.delete(group.id);
    if (!deleted) {
      throw new Error('تعذر حذف الدور من قاعدة البيانات.');
    }

    await this.auditLogRepository.record({
      userId: actorUsername,
      username: actorUsername,
      action: 'iam:group:delete',
      resource: `group:${group.key}`,
      status: 'SUCCESS',
      details: `حذف الدور/المجموعة [${group.name}] (Key: ${group.key})`
    });

    return true;
  }
}
