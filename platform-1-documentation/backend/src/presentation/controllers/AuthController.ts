import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { AuthenticateUserUseCase } from '../../application/usecases/iam/AuthenticateUserUseCase.js';
import { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import { IUserGroupRepository } from '../../domain/repositories/IUserGroupRepository.js';
import { IPermissionEvaluator } from '../../domain/services/IPermissionEvaluator.js';
import { DynamicSystemPermissionService } from '../../application/services/DynamicSystemPermissionService.js';
import { SYSTEM_PERMISSIONS } from '../../domain/entities/Permissions.js';

export class AuthController {
  constructor(
    private readonly authenticateUserUseCase: AuthenticateUserUseCase,
    private readonly userRepository: IUserRepository,
    private readonly userGroupRepository: IUserGroupRepository,
    private readonly permissionEvaluator: IPermissionEvaluator,
    private readonly dynamicPermissionService?: DynamicSystemPermissionService
  ) {}

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, password } = req.body;
      const clientIp = req.ip || req.socket.remoteAddress;

      const result = await this.authenticateUserUseCase.execute(username, password, clientIp);
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (err: any) {
      // The exact Arabic security message is returned by the use case
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: err.message || 'اسم المستخدم أو كلمة المرور غير صحيحة'
      });
    }
  };

  me = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized', message: 'غير مسجل الدخول' });
        return;
      }

      const user = await this.userRepository.findById(req.user.userId);
      if (!user || user.status !== 'ACTIVE') {
        res.status(401).json({ error: 'Unauthorized', message: 'المستخدم غير متاح أو موقوف' });
        return;
      }

      const targetGroupIds = user.groupIds && user.groupIds.length > 0
        ? user.groupIds
        : (user.groupId ? [user.groupId] : []);

      const allGroups = await this.userGroupRepository.findAll();
      const groupMap = new Map(allGroups.map(g => [g.id, g]));
      const userGroups = targetGroupIds
        .map(id => groupMap.get(id))
        .filter(Boolean) as any[];

      const effectivePermissions = this.permissionEvaluator.calculateEffectivePermissions(
        user,
        userGroups
      );

      const groupNames = userGroups.map(g => g.name);

      res.status(200).json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          groupId: user.groupId,
          groupIds: targetGroupIds,
          groupName: groupNames.join(' + ') || 'غير محدد',
          groupNames: groupNames,
          status: user.status,
          userType: user.userType,
          organizationId: user.organizationId,
          organizationName: user.organizationName,
          accessScope: user.accessScope,
          overrides: user.overrides,
          effectivePermissions,
          createdAt: user.createdAt
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: 'InternalError', message: err.message });
    }
  };

  getPermissions = async (_req: Request, res: Response): Promise<void> => {
    try {
      if (this.dynamicPermissionService) {
        const perms = await this.dynamicPermissionService.getSystemPermissions();
        res.status(200).json({
          success: true,
          permissions: perms
        });
        return;
      }

      res.status(200).json({
        success: true,
        permissions: SYSTEM_PERMISSIONS
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  };
}
