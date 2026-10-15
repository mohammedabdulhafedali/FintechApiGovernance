import { Router } from 'express';
import { IamController } from '../controllers/IamController.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { GovernanceWorkflowService } from '../../application/governance/GovernanceWorkflowService.js';

export function createIamRouter(
  iamController: IamController,
  authMiddleware: (req: AuthenticatedRequest, res: any, next: any) => void,
  requirePermission: (permissionKey: string) => (req: AuthenticatedRequest, res: any, next: any) => Promise<void>,
  governanceService?: GovernanceWorkflowService
): Router {
  const router = Router();

  // --- Resources Catalog (Dynamic Matrix Screen Discovery) ---
  router.get('/resources', iamController.getResources);

  // Protect sensitive IAM mutation routes
  router.use(authMiddleware);

  const intercept = (resourceKey: string, actionType: 'CREATE' | 'UPDATE' | 'DELETE', descGen: (req: any) => { ar: string; en: string }) => {
    return async (req: AuthenticatedRequest, res: any, next: any) => {
      if (!governanceService) return next();

      try {
        const desc = descGen(req);
        const p = req.user;
        const targetId = (req.params.id || req.body?.id) ? String(req.params.id || req.body?.id) : undefined;
        const result = await governanceService.interceptIfRequired({
          resourceKey,
          actionType,
          actionDescriptionAr: desc.ar,
          actionDescriptionEn: desc.en,
          targetResourceId: targetId,
          payload: req.body,
          user: {
            id: p?.userId || 'anon',
            username: p?.username || 'anon',
            displayName: p?.fullName,
            groupName: p?.groupName,
            permissions: p?.effectivePermissions,
            isSuperAdmin: p?.username === 'admin'
          }
        });

        if (result.shouldIntercept) {
          return res.status(202).json({
            success: true,
            isStaged: true,
            message: 'تم إرسال الإجراء لمسار الحوكمة والاعتماد بنجاح',
            request: result.request
          });
        }
      } catch (err: any) {
        console.error('[IAM Governance Intercept Error]', err);
      }
      next();
    };
  };

  // --- Users ---
  router.get('/users', requirePermission('iam:manage'), iamController.getUsers);
  router.post('/users', requirePermission('iam:manage'), iamController.createUser);
  router.put('/users/:id/overrides', requirePermission('iam:manage'), iamController.updateUserOverrides);
  router.put('/users/:id/scope', requirePermission('iam:manage'), iamController.updateUserScope);
  router.put('/users/:id/group', requirePermission('iam:manage'), iamController.updateUserGroup);
  router.put('/users/:id/status', requirePermission('iam:manage'), iamController.toggleUserStatus);
  router.delete('/users/:id', requirePermission('iam:manage'), iamController.deleteUser);


  // --- Groups ---
  router.get('/groups', requirePermission('iam:manage'), iamController.getGroups);
  router.post('/groups', requirePermission('iam:manage'), iamController.createGroup);
  router.put('/groups/:id', requirePermission('iam:manage'), iamController.updateGroup);
  
  router.put(
    '/groups/:id/permissions',
    requirePermission('iam:manage'),
    iamController.updateGroupPermissions
  );

  router.delete(
    '/groups/:id',
    requirePermission('iam:manage'),
    iamController.deleteGroup
  );

  // --- Audit Logs ---
  router.get('/audit-logs', requirePermission('iam:audit:view'), iamController.getAuditLogs);

  return router;
}
