import { Router } from 'express';
import { GovernanceWorkflowController } from '../controllers/GovernanceWorkflowController.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';

export function createGovernanceRouter(
  controller: GovernanceWorkflowController,
  authMiddleware?: (req: AuthenticatedRequest, res: any, next: any) => void,
  requirePermission?: (permissionKey: string) => (req: AuthenticatedRequest, res: any, next: any) => Promise<void>
): Router {
  const router = Router();

  if (authMiddleware) {
    router.use(authMiddleware);
  }

  // 1. Pending Approvals Inbox
  router.get('/inbox', controller.getInbox);

  // 2. My Submitted Requests
  router.get('/my-requests', controller.getMyRequests);

  // 2.5 Submit Staged Request (e.g. Document Reviews)
  router.post('/requests', controller.createRequest);

  // 3. Approval Decision Actions (Guarded by governance:inbox:approve)
  if (requirePermission) {
    router.post('/requests/:id/approve', requirePermission('governance:inbox:approve'), controller.approveStage);
    router.post('/requests/:id/reject', requirePermission('governance:inbox:approve'), controller.rejectRequest);
    router.get('/policies', controller.getPolicies);
    router.put('/policies/:resourceKey', requirePermission('iam:manage'), controller.updatePolicy);
  } else {
    router.post('/requests/:id/approve', controller.approveStage);
    router.post('/requests/:id/reject', controller.rejectRequest);
    router.get('/policies', controller.getPolicies);
    router.put('/policies/:resourceKey', controller.updatePolicy);
  }

  return router;
}
