import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';

export function createAuthRouter(
  authController: AuthController,
  authMiddleware: (req: AuthenticatedRequest, res: any, next: any) => void
): Router {
  const router = Router();

  // POST /api/v1/auth/login
  router.post('/login', authController.login);

  // GET /api/v1/auth/me (Protected)
  router.get('/me', authMiddleware, authController.me);

  // GET /api/v1/auth/permissions
  router.get('/permissions', authController.getPermissions);

  return router;
}
