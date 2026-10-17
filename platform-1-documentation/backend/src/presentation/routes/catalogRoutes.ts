import { Router } from 'express';
import { CatalogController } from '../controllers/CatalogController.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { GovernanceWorkflowService } from '../../application/governance/GovernanceWorkflowService.js';

export function createCatalogRouter(
  controller: CatalogController,
  authMiddleware?: (req: AuthenticatedRequest, res: any, next: any) => void,
  requirePermission?: (permissionKey: string) => (req: AuthenticatedRequest, res: any, next: any) => Promise<void>,
  governanceService?: GovernanceWorkflowService
): Router {
  const router = Router();

  // Optional Auth for catalog reading to support scoped multi-tenant filtering
  const optionalAuth = (req: any, res: any, next: any) => {
    if (authMiddleware && req.headers.authorization?.startsWith('Bearer ')) {
      return authMiddleware(req, res, next);
    }
    next();
  };

  // Scoped Catalog & Systems reading
  router.get('/catalog', optionalAuth, controller.getCatalog);
  router.get('/sectors', optionalAuth, controller.getCatalog);
  router.get('/sectors/:sectorKey/endpoints', optionalAuth, controller.getSectorEndpoints);
  router.get('/systems', optionalAuth, controller.getSystems);

  // Helper middleware for dynamic governance interception
  const intercept = (resourceKey: string, actionType: 'CREATE' | 'UPDATE' | 'DELETE', descGen: (req: any) => { ar: string; en: string }) => {
    return async (req: AuthenticatedRequest, res: any, next: any) => {
      if (!governanceService) return next();

      try {
        const desc = descGen(req);
        const p = req.user;
        const result = await governanceService.interceptIfRequired({
          resourceKey,
          actionType,
          actionDescriptionAr: desc.ar,
          actionDescriptionEn: desc.en,
          targetResourceId: (req.params.sectorKey || req.params.systemKey || req.body?.id || req.body?.code) ? String(req.params.sectorKey || req.params.systemKey || req.body?.id || req.body?.code) : undefined,
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
            message: 'تم إرسال الإجراء بنجاح لمسار الحوكمة والاعتماد (قيد المراجعة)',
            request: result.request
          });
        }
      } catch (err: any) {
        console.error('[Governance Intercept Error]', err);
      }
      next();
    };
  };

  // Protected Mutation Actions (Strict RBAC & Governance Interception)
  if (authMiddleware && requirePermission) {
    router.post(
      '/endpoints',
      authMiddleware,
      requirePermission('catalog:endpoint:create'),
      intercept('catalog:endpoints', 'CREATE', (r) => ({
        ar: `إضافة نقطة نهاية جديدة: ${r.body.nameAr || r.body.path}`,
        en: `Add endpoint: ${r.body.nameEn || r.body.path}`
      })),
      controller.createEndpoint
    );

    router.post(
      '/sectors',
      authMiddleware,
      requirePermission('catalog:system:create'),
      controller.createSector
    );

    router.put(
      '/sectors/:sectorKey',
      authMiddleware,
      requirePermission('catalog:system:create'),
      controller.updateSector
    );

    router.delete(
      '/sectors/:sectorKey',
      authMiddleware,
      requirePermission('catalog:system:delete'),
      controller.deleteSector
    );

    router.post(
      '/systems',
      authMiddleware,
      requirePermission('catalog:system:create'),
      controller.createSystem
    );

    router.put(
      '/systems/:systemKey',
      authMiddleware,
      requirePermission('catalog:system:create'),
      controller.updateSystem
    );

    router.delete(
      '/systems/:systemKey',
      authMiddleware,
      requirePermission('catalog:system:delete'),
      controller.deleteSystem
    );

    router.post(
      '/systems/:systemKey/integrations',
      authMiddleware,
      requirePermission('catalog:system:create'),
      controller.saveIntegration
    );

    router.delete(
      '/systems/:systemKey/integrations/:entityId',
      authMiddleware,
      requirePermission('catalog:system:delete'),
      controller.deleteIntegration
    );
  } else {
    router.post('/endpoints', controller.createEndpoint);
    router.post('/sectors', controller.createSector);
    router.put('/sectors/:sectorKey', controller.updateSector);
    router.delete('/sectors/:sectorKey', controller.deleteSector);
    router.post('/systems', controller.createSystem);
    router.put('/systems/:systemKey', controller.updateSystem);
    router.delete('/systems/:systemKey', controller.deleteSystem);
    router.post('/systems/:systemKey/integrations', controller.saveIntegration);
    router.delete('/systems/:systemKey/integrations/:entityId', controller.deleteIntegration);
  }

  return router;
}
