import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { IUserGroupRepository } from '../../../domain/repositories/IUserGroupRepository.js';
import { IPasswordHasher } from '../../../domain/services/IPasswordHasher.js';
import { ITokenService } from '../../../domain/services/ITokenService.js';
import { IPermissionEvaluator } from '../../../domain/services/IPermissionEvaluator.js';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository.js';
import { UserPublicProfile } from '../../../domain/entities/User.js';
import { UserGroup } from '../../../domain/entities/UserGroup.js';

export interface LoginResult {
  token: string;
  user: UserPublicProfile;
}

export class AuthenticateUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly userGroupRepository: IUserGroupRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
    private readonly permissionEvaluator: IPermissionEvaluator,
    private readonly auditLogRepository: IAuditLogRepository
  ) {}

  async execute(identifier: string, password: string, clientIp?: string): Promise<LoginResult> {
    const genericErrorMessage = 'اسم المستخدم أو كلمة المرور غير صحيحة';

    if (!identifier || !password) {
      throw new Error(genericErrorMessage);
    }

    const user = await this.userRepository.findByUsernameOrEmail(identifier);
    if (!user) {
      await this.auditLogRepository.record({
        userId: 'anonymous',
        username: identifier,
        action: 'auth:login',
        resource: 'iam:session',
        status: 'FAILED',
        details: 'فشل تسجيل الدخول: المستخدم غير موجود',
        ip: clientIp
      });
      throw new Error(genericErrorMessage);
    }

    if (user.status !== 'ACTIVE') {
      await this.auditLogRepository.record({
        userId: user.id,
        username: user.username,
        action: 'auth:login',
        resource: 'iam:session',
        status: 'DENIED',
        details: 'محاولة تسجيل دخول لحساب موقوف أو مجمد',
        ip: clientIp
      });
      throw new Error('الحساب موقوف أو غير نشط. يرجى مراجعة مدير النظام.');
    }

    const isValidPassword = this.passwordHasher.verify(
      password,
      user.passwordSalt,
      user.passwordHash
    );

    if (!isValidPassword) {
      await this.auditLogRepository.record({
        userId: user.id,
        username: user.username,
        action: 'auth:login',
        resource: 'iam:session',
        status: 'FAILED',
        details: 'فشل تسجيل الدخول: كلمة المرور غير صحيحة',
        ip: clientIp
      });
      throw new Error(genericErrorMessage);
    }

    // Resolve User Groups
    const targetGroupIds = user.groupIds && user.groupIds.length > 0
      ? user.groupIds
      : (user.groupId ? [user.groupId] : []);

    const allGroups = await this.userGroupRepository.findAll();
    const groupMap = new Map<string, UserGroup>(allGroups.map(g => [g.id, g]));
    let userGroups = targetGroupIds
      .map(id => groupMap.get(id))
      .filter((g): g is UserGroup => Boolean(g));

    if (userGroups.length === 0) {
      // Fallback to default viewers group if assigned group was somehow missing
      const viewers = await this.userGroupRepository.findByKey('VIEWERS_GROUP');
      if (viewers) {
        userGroups = [viewers];
      } else {
        throw new Error('مجموعة المستخدم غير معرّفة في النظام.');
      }
    }

    const primaryGroup = userGroups[0];

    // Calculate effective permissions combining all Groups and Individual Overrides (Union)
    const effectivePermissions = this.permissionEvaluator.calculateEffectivePermissions(
      user,
      userGroups
    );

    // Issue cryptographic token
    const token = this.tokenService.issueToken(user, primaryGroup, effectivePermissions);

    const groupNamesList = userGroups.map(g => g.name).join(' + ');

    // Record success audit log
    await this.auditLogRepository.record({
      userId: user.id,
      username: user.username,
      action: 'auth:login',
      resource: 'iam:session',
      status: 'SUCCESS',
      details: `تم تسجيل الدخول بنجاح - المجموعات: ${groupNamesList}`,
      ip: clientIp
    });

    const userProfile: UserPublicProfile = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      groupId: primaryGroup.id,
      groupIds: targetGroupIds,
      groupName: groupNamesList,
      groupNames: userGroups.map(g => g.name),
      status: user.status,
      userType: user.userType || primaryGroup.groupType || 'INTERNAL',
      organizationId: user.organizationId,
      organizationName: user.organizationName,
      accessScope: user.accessScope || primaryGroup.defaultScope || {
        allowedEntityIds: user.userType === 'EXTERNAL' ? (user.organizationId ? [user.organizationId] : []) : ['*'],
        allowedSystemIds: ['*']
      },
      overrides: user.overrides,
      effectivePermissions,
      createdAt: user.createdAt
    };

    return {
      token,
      user: userProfile
    };
  }
}
