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

  // Scoped Catalog reading
  router.get('/catalog', optionalAuth, controller.getCatalog);
  router.get('/sectors/:sectorKey/endpoints', optionalAuth, controller.getSectorEndpoints);

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
          targetResourceId: (req.params.sectorKey || req.body?.id || req.body?.code) ? String(req.params.sectorKey || req.body?.id || req.body?.code) : undefined,
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

  // Protected Actions
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
      intercept('catalog:sectors', 'CREATE', (r) => ({
        ar: `إضافة قطاع مصرفي جديد: ${r.body.nameAr || r.body.code}`,
        en: `Add banking sector: ${r.body.nameEn || r.body.code}`
      })),
      controller.createSector
    );

    router.delete(
      '/sectors/:sectorKey',
      authMiddleware,
      requirePermission('catalog:system:delete'),
      intercept('catalog:sectors', 'DELETE', (r) => ({
        ar: `حذف القطاع المصرفي: ${r.params.sectorKey}`,
        en: `Delete banking sector: ${r.params.sectorKey}`
      })),
      controller.deleteSector
    );
  } else {
    router.post('/endpoints', controller.createEndpoint);
    router.post('/sectors', controller.createSector);
    router.delete('/sectors/:sectorKey', controller.deleteSector);
  }

  return router;
}
