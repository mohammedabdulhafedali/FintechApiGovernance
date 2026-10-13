import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware.js';
import { IPermissionEvaluator } from '../../domain/services/IPermissionEvaluator.js';
import { IAuditLogRepository } from '../../domain/repositories/IAuditLogRepository.js';

export function createRequirePermissionMiddleware(
  permissionEvaluator: IPermissionEvaluator,
  auditLogRepository: IAuditLogRepository
) {
  return (
    requiredPermission: string,
    resourceExtractor?: (req: AuthenticatedRequest) => { entityId?: string; systemId?: string }
  ) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      const user = req.user;
      if (!user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'يجب تسجيل الدخول أولاً للتحقق من الصلاحيات.'
        });
        return;
      }

      // Dynamic scope context extraction (e.g. from params, query, or body)
      const context = resourceExtractor
        ? resourceExtractor(req)
        : {
            entityId: (req.params.entityId || req.query.entityId || req.body?.entityId) as string | undefined,
            systemId: (req.params.systemId || req.params.systemKey || req.params.sectorKey || req.query.systemId || req.body?.systemKey) as string | undefined
          };

      const hasPerm = permissionEvaluator.canAccessResource(
        {
          userType: user.userType,
          accessScope: user.accessScope,
          effectivePermissions: user.effectivePermissions
        },
        requiredPermission,
        context
      );

      if (!hasPerm) {
        await auditLogRepository.record({
          userId: user.userId,
          username: user.username,
          action: `access_denied:${requiredPermission}`,
          resource: req.originalUrl,
          status: 'DENIED',
          details: `تم رفض الوصول: المستخدم يفتقر لصلاحية [${requiredPermission}] أو لا يملك إذناً بالنطاق المحدد (${JSON.stringify(context)})`,
          ip: req.ip
        });

        res.status(403).json({
          error: 'Forbidden',
          message: 'عفواً، لا تملك الصلاحية اللازمة أو النطاق المصرح به لتنفيذ هذا الإجراء.',
          requiredPermission,
          context
        });
        return;
      }

      next();
    };
  };
}
