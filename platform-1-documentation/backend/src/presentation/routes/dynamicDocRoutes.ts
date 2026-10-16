import { Router } from 'express';
import { DynamicDocController } from '../controllers/DynamicDocController.js';

export function createDynamicDocRouter(
  controller: DynamicDocController,
  authMiddleware: any,
  requirePermission?: (permissionKey: string) => (req: any, res: any, next: any) => Promise<void>
): Router {
  const router = Router();

  // Public read or authenticated read
  router.get('/', controller.getAll);
  router.get('/:id', controller.getById);

  // Authenticated and authorized modifications
  if (requirePermission) {
    router.post('/', authMiddleware, requirePermission('catalog:spec:export'), controller.create);
    router.put('/:id', authMiddleware, requirePermission('catalog:spec:export'), controller.update);
    router.post('/:id/publish', authMiddleware, requirePermission('catalog:spec:export'), controller.publish);
    router.delete('/:id', authMiddleware, requirePermission('catalog:spec:export'), controller.delete);
  } else {
    router.post('/', authMiddleware, controller.create);
    router.put('/:id', authMiddleware, controller.update);
    router.post('/:id/publish', authMiddleware, controller.publish);
    router.delete('/:id', authMiddleware, controller.delete);
  }

  return router;
}
