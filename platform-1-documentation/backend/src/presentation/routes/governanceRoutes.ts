import { Router } from 'express';
import { GovernanceWorkflowController } from '../controllers/GovernanceWorkflowController.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';

export function createGovernanceRouter(
  controller: GovernanceWorkflowController,
  authMiddleware?: (req: AuthenticatedRequest, res: any, next: any) => void
): Router {
  const router = Router();

  if (authMiddleware) {
    router.use(authMiddleware);
  }

  // 1. Pending Approvals Inbox
  router.get('/inbox', controller.getInbox);

  // 2. My Submitted Requests
  router.get('/my-requests', controller.getMyRequests);

  // 3. Approval Decision Actions
  router.post('/requests/:id/approve', controller.approveStage);
  router.post('/requests/:id/reject', controller.rejectRequest);

  // 4. Dynamic Policies Management
  router.get('/policies', controller.getPolicies);
  router.put('/policies/:resourceKey', controller.updatePolicy);

  return router;
}
