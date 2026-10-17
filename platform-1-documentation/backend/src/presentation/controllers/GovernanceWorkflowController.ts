import { Response } from 'express';
import { GovernanceWorkflowService, WorkflowUserContext } from '../../application/governance/GovernanceWorkflowService.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';

export class GovernanceWorkflowController {
  constructor(private readonly service: GovernanceWorkflowService) {}

  private extractUser(req: AuthenticatedRequest): WorkflowUserContext {
    const p = req.user;
    return {
      id: p?.userId || 'anonymous-user',
      username: p?.username || 'anonymous',
      displayName: p?.fullName || p?.username,
      groupId: p?.groupId,
      groupName: p?.groupName,
      permissions: p?.effectivePermissions || [],
      isSuperAdmin: p?.username === 'admin'
    };
  }

  getInbox = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = this.extractUser(req);
      const items = await this.service.getInboxForUser(user);
      const pendingCount = items.filter(i => i.canApproveCurrentStage).length;

      res.status(200).json({
        success: true,
        count: items.length,
        pendingForMeCount: pendingCount,
        data: items
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  getMyRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = this.extractUser(req);
      const items = await this.service.getMyRequests(user.id);
      res.status(200).json({
        success: true,
        count: items.length,
        data: items
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  createRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = this.extractUser(req);
      const {
        resourceKey = 'catalog:documents',
        actionType = 'CUSTOM',
        actionDescriptionAr,
        actionDescriptionEn,
        targetResourceId,
        payload,
        diffSummary
      } = req.body;

      const newRequest = await this.service.submitRequest({
        resourceKey,
        actionType,
        actionDescriptionAr: actionDescriptionAr || `رفع طلب اعتماد: ${targetResourceId || resourceKey}`,
        actionDescriptionEn: actionDescriptionEn || `Submit approval request: ${targetResourceId || resourceKey}`,
        targetResourceId,
        payload,
        diffSummary,
        user
      });

      res.status(201).json({
        success: true,
        message: 'تم إرسال طلب الاعتماد بنجاح وتسجيله في مسار الحوكمة',
        data: newRequest
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  };

  getPolicies = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const policies = await this.service.getPolicies();
      res.status(200).json({
        success: true,
        count: policies.length,
        data: policies
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  updatePolicy = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = this.extractUser(req);
      const resourceKey = String(req.params.resourceKey);
      const updated = await this.service.updatePolicy(resourceKey, req.body, user);
      res.status(200).json({
        success: true,
        message: 'تم تحديث سياسة ومسار الاعتماد بنجاح',
        data: updated
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  };

  approveStage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = this.extractUser(req);
      const id = String(req.params.id);
      const { notes } = req.body;
      const result = await this.service.approveStage(id, user, notes);
      res.status(200).json({
        success: true,
        message: result.status === 'APPROVED' ? 'تم اكتمال مسار الاعتماد وتطبيق التغييرات بنجاح!' : 'تم اعتماد هذه المرحلة والانتقال للمرحلة التالية في المسار.',
        data: result
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  };

  rejectRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = this.extractUser(req);
      const id = String(req.params.id);
      const { reason } = req.body;
      const result = await this.service.rejectRequest(id, user, reason);
      res.status(200).json({
        success: true,
        message: 'تم رفض طلب التعديل وتوثيق السبب في السجل الرقابي.',
        data: result
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  };
}
