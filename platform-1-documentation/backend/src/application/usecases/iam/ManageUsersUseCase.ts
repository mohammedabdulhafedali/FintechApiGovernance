import crypto from 'crypto';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { IUserGroupRepository } from '../../../domain/repositories/IUserGroupRepository.js';
import { IPasswordHasher } from '../../../domain/services/IPasswordHasher.js';
import { IPermissionEvaluator } from '../../../domain/services/IPermissionEvaluator.js';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository.js';
import { User, UserPublicProfile, UserOverrides, UserType, ResourceScope } from '../../../domain/entities/User.js';
import { UserGroup } from '../../../domain/entities/UserGroup.js';

export interface CreateUserInput {
  username: string;
  email: string;
  fullName: string;
  password?: string;
  groupId: string;
  userType?: UserType;
  organizationId?: string;
  organizationName?: string;
  accessScope?: ResourceScope;
  overrides?: UserOverrides;
}

export class ManageUsersUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly userGroupRepository: IUserGroupRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly permissionEvaluator: IPermissionEvaluator,
    private readonly auditLogRepository: IAuditLogRepository
  ) {}

  async getAllUsers(): Promise<UserPublicProfile[]> {
    const users: User[] = await this.userRepository.findAll();
    const groups: UserGroup[] = await this.userGroupRepository.findAll();
    const groupMap = new Map<string, UserGroup>(groups.map((g: UserGroup) => [g.id, g]));

    return users.map((u: User) => {
      const group = groupMap.get(u.groupId);
      const effectivePermissions = group
        ? this.permissionEvaluator.calculateEffectivePermissions(u, group)
        : [];

      return {
        id: u.id,
        username: u.username,
        email: u.email,
        fullName: u.fullName,
        groupId: u.groupId,
        groupName: group?.name || 'غير محدد',
        status: u.status,
        userType: u.userType || group?.groupType || 'INTERNAL',
        organizationId: u.organizationId,
        organizationName: u.organizationName,
        accessScope: u.accessScope || group?.defaultScope || {
          allowedEntityIds: u.userType === 'EXTERNAL' ? (u.organizationId ? [u.organizationId] : []) : ['*'],
          allowedSystemIds: ['*']
        },
        overrides: u.overrides || { grantedPermissions: [], revokedPermissions: [] },
        effectivePermissions,
        createdAt: u.createdAt
      };
    });
  }

  async createUser(input: CreateUserInput, actorUsername: string): Promise<UserPublicProfile> {
    const existing = await this.userRepository.findByUsernameOrEmail(input.username);
    if (existing) {
      throw new Error(`اسم المستخدم [${input.username}] مستخدم بالفعل.`);
    }

    const group = await this.userGroupRepository.findById(input.groupId);
    if (!group) {
      throw new Error(`المجموعة المحددة غير موجودة.`);
    }

    const salt = this.passwordHasher.generateSalt();
    const defaultPassword = input.password || 'Welcome@2026';
    const hash = this.passwordHasher.hash(defaultPassword, salt);

    const userType: UserType = input.userType || group.groupType || 'INTERNAL';
    const accessScope: ResourceScope = input.accessScope || group.defaultScope || {
      allowedEntityIds: userType === 'EXTERNAL' ? (input.organizationId ? [input.organizationId] : []) : ['*'],
      allowedSystemIds: ['*']
    };

    const newUser: User = {
      id: `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      username: input.username.trim(),
      email: input.email.trim(),
      fullName: input.fullName.trim(),
      passwordHash: hash,
      passwordSalt: salt,
      groupId: input.groupId,
      status: 'ACTIVE',
      userType,
      organizationId: input.organizationId,
      organizationName: input.organizationName,
      accessScope,
      overrides: input.overrides || {
        grantedPermissions: [],
        revokedPermissions: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.userRepository.save(newUser);

    await this.auditLogRepository.record({
      userId: actorUsername,
      username: actorUsername,
      action: 'iam:user:create',
      resource: `user:${newUser.username}`,
      status: 'SUCCESS',
      details: `تم إنشاء المستخدم [${newUser.fullName}] نوع [${userType}] وربطه بمجموعة [${group.name}]`
    });

    const effectivePermissions = this.permissionEvaluator.calculateEffectivePermissions(
      newUser,
      group
    );

    return {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      fullName: newUser.fullName,
      groupId: group.id,
      groupName: group.name,
      status: newUser.status,
      userType: newUser.userType,
      organizationId: newUser.organizationId,
      organizationName: newUser.organizationName,
      accessScope: newUser.accessScope,
      overrides: newUser.overrides,
      effectivePermissions,
      createdAt: newUser.createdAt
    };
  }

  async updateUserOverrides(
    userId: string,
    overrides: UserOverrides,
    actorUsername: string
  ): Promise<UserPublicProfile> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error(`المستخدم غير موجود.`);
    }

    if (user.username.toLowerCase() === 'admin' || user.id === 'usr_admin_01' || user.groupId === 'grp_super_admin') {
      throw new Error('صلاحيات المسؤول السيادي للنظام مجمدة بالكامل على الشامل (* ولا تقبل الاستثناءات أو الحجب).');
    }

    user.overrides = {
      grantedPermissions: Array.from(new Set(overrides.grantedPermissions || [])),
      revokedPermissions: Array.from(new Set(overrides.revokedPermissions || []))
    };
    user.updatedAt = new Date().toISOString();

    await this.userRepository.update(user);

    const group = await this.userGroupRepository.findById(user.groupId);
    const effectivePermissions = group
      ? this.permissionEvaluator.calculateEffectivePermissions(user, group)
      : [];

    await this.auditLogRepository.record({
      userId: actorUsername,
      username: actorUsername,
      action: 'iam:user:update_overrides',
      resource: `user:${user.username}`,
      status: 'SUCCESS',
      details: `تحديث الاستثناءات الفردية للمستخدم [${user.username}]: منح (${overrides.grantedPermissions.length}) وحجب (${overrides.revokedPermissions.length})`
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      groupId: user.groupId,
      groupName: group?.name || 'غير محدد',
      status: user.status,
      userType: user.userType,
      organizationId: user.organizationId,
      organizationName: user.organizationName,
      accessScope: user.accessScope,
      overrides: user.overrides,
      effectivePermissions,
      createdAt: user.createdAt
    };
  }

  async updateUserScope(
    userId: string,
    scopeData: {
      userType?: UserType;
      organizationId?: string;
      organizationName?: string;
      accessScope?: ResourceScope;
    },
    actorUsername: string
  ): Promise<UserPublicProfile> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error(`المستخدم غير موجود.`);
    }

    if (scopeData.userType) user.userType = scopeData.userType;
    if (scopeData.organizationId !== undefined) user.organizationId = scopeData.organizationId;
    if (scopeData.organizationName !== undefined) user.organizationName = scopeData.organizationName;
    if (scopeData.accessScope) user.accessScope = scopeData.accessScope;
    user.updatedAt = new Date().toISOString();

    await this.userRepository.update(user);

    const group = await this.userGroupRepository.findById(user.groupId);
    const effectivePermissions = group
      ? this.permissionEvaluator.calculateEffectivePermissions(user, group)
      : [];

    await this.auditLogRepository.record({
      userId: actorUsername,
      username: actorUsername,
      action: 'iam:user:update_scope',
      resource: `user:${user.username}`,
      status: 'SUCCESS',
      details: `تحديث نطاق الوصول للمستخدم [${user.username}]: نوع (${user.userType})، نطاق الكيانات (${user.accessScope?.allowedEntityIds.join(', ') || 'none'})`
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      groupId: user.groupId,
      groupName: group?.name || 'غير محدد',
      status: user.status,
      userType: user.userType,
      organizationId: user.organizationId,
      organizationName: user.organizationName,
      accessScope: user.accessScope,
      overrides: user.overrides,
      effectivePermissions,
      createdAt: user.createdAt
    };
  }

  async updateUserGroup(
    userId: string,
    newGroupId: string,
    actorUsername: string
  ): Promise<UserPublicProfile> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error(`المستخدم غير موجود.`);
    }

    if ((user.username.toLowerCase() === 'admin' || user.id === 'usr_admin_01') && newGroupId !== 'grp_super_admin') {
      throw new Error('لا يمكن تغيير دور المسؤول الرئيسي السيادي للنظام عن دور مدير النظام.');
    }

    const newGroup = await this.userGroupRepository.findById(newGroupId);
    if (!newGroup) {
      throw new Error(`المجموعة الجديدة غير موجودة.`);
    }

    user.groupId = newGroupId;
    user.updatedAt = new Date().toISOString();
    await this.userRepository.update(user);

    await this.auditLogRepository.record({
      userId: actorUsername,
      username: actorUsername,
      action: 'iam:user:change_group',
      resource: `user:${user.username}`,
      status: 'SUCCESS',
      details: `نقل المستخدم [${user.username}] إلى مجموعة [${newGroup.name}]`
    });

    const effectivePermissions = this.permissionEvaluator.calculateEffectivePermissions(
      user,
      newGroup
    );

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      groupId: newGroup.id,
      groupName: newGroup.name,
      status: user.status,
      overrides: user.overrides,
      effectivePermissions,
      createdAt: user.createdAt
    };
  }

  async toggleUserStatus(
    userId: string,
    status: 'ACTIVE' | 'SUSPENDED',
    actorUsername: string
  ): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error(`المستخدم غير موجود.`);

    if ((user.username.toLowerCase() === 'admin' || user.id === 'usr_admin_01' || user.groupId === 'grp_super_admin') && status === 'SUSPENDED') {
      throw new Error('لا يمكن تجميد أو إيقاف حساب المسؤول الرئيسي السيادي للنظام.');
    }

    if (user.username.toLowerCase() === actorUsername.toLowerCase() && status === 'SUSPENDED') {
      throw new Error('لا يمكنك تجميد حسابك الشخصي النشط حالياً.');
    }

    user.status = status;
    user.updatedAt = new Date().toISOString();
    await this.userRepository.update(user);

    await this.auditLogRepository.record({
      userId: actorUsername,
      username: actorUsername,
      action: 'iam:user:status_change',
      resource: `user:${user.username}`,
      status: 'SUCCESS',
      details: `تعديل حالة حساب [${user.username}] إلى [${status}]`
    });

    return true;
  }

  async deleteUser(userId: string, actorUsername: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('المستخدم المراد حذفه غير موجود في المنظومة.');
    }

    if (user.username === 'admin' || user.id === 'usr_admin') {
      throw new Error('لا يمكن حذف حساب المسؤول الرئيسي السيادي للنظام.');
    }

    if (user.username.toLowerCase() === actorUsername.toLowerCase()) {
      throw new Error('لا يمكنك حذف حسابك الشخصي النشط حالياً.');
    }

    const deleted = await this.userRepository.delete(user.id);
    if (!deleted) {
      throw new Error('تعذر حذف المستخدم من قاعدة البيانات.');
    }

    await this.auditLogRepository.record({
      userId: actorUsername,
      username: actorUsername,
      action: 'iam:user:delete',
      resource: `user:${user.username}`,
      status: 'SUCCESS',
      details: `حذف حساب المستخدم [${user.fullName}] (@${user.username})`
    });

    return true;
  }
}

