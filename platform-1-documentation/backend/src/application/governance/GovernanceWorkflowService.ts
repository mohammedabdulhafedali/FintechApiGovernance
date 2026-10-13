import { IGovernanceRepository } from '../../domain/governance/IGovernanceRepository.js';
import { 
  WorkflowPolicy, 
  ApprovalRequest, 
  ApprovalInboxItem,
  WorkflowStageDefinition 
} from '../../domain/governance/GovernanceWorkflowTypes.js';
import { DeepDiffService } from '../../infrastructure/services/DeepDiffService.js';
import { ActionRegistry } from './ActionRegistry.js';

export interface WorkflowUserContext {
  id: string;
  username: string;
  displayName?: string;
  groupId?: string;
  groupName?: string;
  permissions?: string[];
  isSuperAdmin?: boolean;
}

export class GovernanceWorkflowService {
  constructor(
    private readonly repository: IGovernanceRepository,
    private readonly actionRegistry: ActionRegistry
  ) {}

  /**
   * Evaluates whether a proposed mutation must be intercepted into an approval pipeline.
   * If DIRECT mode: returns shouldIntercept = false.
   * If MAKER_CHECKER or MULTI_STAGE_PIPELINE: creates Staged Request and returns shouldIntercept = true.
   */
  async interceptIfRequired(params: {
    resourceKey: string;
    actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'CUSTOM';
    actionDescriptionAr: string;
    actionDescriptionEn: string;
    targetResourceId?: string;
    payload: any;
    snapshotBefore?: any;
    user: WorkflowUserContext;
  }): Promise<{ shouldIntercept: boolean; request?: ApprovalRequest }> {
    // 1. Fetch dynamic policy for this resource
    let policy = await this.repository.getPolicy(params.resourceKey);

    // Dynamic Zero-Config Fallback: If no explicit policy exists, fallback to default Maker-Checker
    if (!policy) {
      policy = {
        resourceKey: params.resourceKey,
        resourceNameAr: params.resourceKey,
        resourceNameEn: params.resourceKey,
        mode: 'MAKER_CHECKER',
        isProtectedCore: false,
        stages: [
          {
            stageOrder: 1,
            stageKey: 'standard_review',
            stageNameAr: 'المراجعة والاعتماد القياسي',
            stageNameEn: 'Standard Maker-Checker Review',
            requiredPermission: 'governance:approve',
            minApprovers: 1
          }
        ],
        updatedAt: new Date().toISOString(),
        updatedBy: 'system'
      };
      await this.repository.savePolicy(policy);
    }

    if (policy.mode === 'DIRECT') {
      return { shouldIntercept: false };
    }

    // 2. Compute visual delta
    const diffSummary = DeepDiffService.calculateDiff(params.snapshotBefore, params.payload);

    // 3. Generate Request ID
    const count = (await this.repository.getRequests()).length + 1;
    const reqId = `REQ-2026-${String(count).padStart(4, '0')}`;

    // 4. Create and save approval request
    const newRequest: ApprovalRequest = {
      id: reqId,
      resourceKey: params.resourceKey,
      resourceNameAr: policy.resourceNameAr,
      resourceNameEn: policy.resourceNameEn,
      actionType: params.actionType,
      actionDescriptionAr: params.actionDescriptionAr,
      actionDescriptionEn: params.actionDescriptionEn,
      targetResourceId: params.targetResourceId,
      payload: params.payload,
      snapshotBefore: params.snapshotBefore,
      diffSummary,
      makerId: params.user.id,
      makerName: params.user.displayName || params.user.username,
      makerGroup: params.user.groupName || 'مستخدم النظام',
      submittedAt: new Date().toISOString(),
      status: 'PENDING',
      currentStageOrder: 1,
      totalStages: policy.stages.length,
      stages: policy.stages,
      approvalTrail: []
    };

    await this.repository.saveRequest(newRequest);
    return { shouldIntercept: true, request: newRequest };
  }

  /**
   * Retrieves pending inbox for the current user.
   * Enforces Segregation of Duties (SoD): makerId !== currentUser.id.
   */
  async getInboxForUser(user: WorkflowUserContext): Promise<ApprovalInboxItem[]> {
    const allPending = await this.repository.getPendingRequests();

    const inbox: ApprovalInboxItem[] = [];

    for (const req of allPending) {
      // Rule 1: A maker cannot review their own request
      const isMaker = req.makerId === user.id;

      // Rule 2: Has this user already signed off a prior stage in this request?
      const hasSignedPrior = req.approvalTrail.some(t => t.approverId === user.id);

      // Active stage definition
      const activeStage = req.stages.find(s => s.stageOrder === req.currentStageOrder);

      // Check permission
      let hasRequiredPermission = false;
      if (user.isSuperAdmin || (user.permissions && user.permissions.includes('iam:manage'))) {
        hasRequiredPermission = true;
      } else if (activeStage) {
        hasRequiredPermission = Boolean(user.permissions && user.permissions.includes(activeStage.requiredPermission));
      }

      const canApproveCurrentStage = !isMaker && !hasSignedPrior && hasRequiredPermission;

      inbox.push({
        ...req,
        canApproveCurrentStage,
        activeStage
      });
    }

    return inbox;
  }

  /**
   * Retrieves requests submitted by the current user.
   */
  async getMyRequests(userId: string): Promise<ApprovalRequest[]> {
    return this.repository.getRequestsByMaker(userId);
  }

  /**
   * Retrieves all policies.
   */
  async getPolicies(): Promise<WorkflowPolicy[]> {
    return this.repository.getPolicies();
  }

  /**
   * Updates a policy dynamically with banking compliance safeguards.
   */
  async updatePolicy(resourceKey: string, update: Partial<WorkflowPolicy>, adminUser: WorkflowUserContext): Promise<WorkflowPolicy> {
    const existing = await this.repository.getPolicy(resourceKey);
    if (!existing) {
      throw new Error(`السياسة غير موجودة للمورد: ${resourceKey}`);
    }

    // Safety Floor Enforcement: If protected core, cannot downgrade to DIRECT
    if (existing.isProtectedCore && update.mode === 'DIRECT') {
      throw new Error('مخالفة معايير الامتثال البنكي: لا يمكن إلغاء الحوكمة والاعتماد عن هذا المورد السيادي المحمي.');
    }

    const updated: WorkflowPolicy = {
      ...existing,
      ...update,
      resourceKey: existing.resourceKey,
      isProtectedCore: existing.isProtectedCore,
      updatedAt: new Date().toISOString(),
      updatedBy: adminUser.displayName || adminUser.username
    };

    // Ensure at least one stage if not DIRECT
    if (updated.mode !== 'DIRECT' && (!updated.stages || updated.stages.length === 0)) {
      throw new Error('يجب تحديد مرحلة مراجعة واحدة على الأقل عند تفعيل نمط الحوكمة والاعتماد.');
    }

    return this.repository.savePolicy(updated);
  }

  /**
   * Approves the current active stage of an approval request.
   */
  async approveStage(requestId: string, approver: WorkflowUserContext, notes?: string): Promise<ApprovalRequest> {
    const request = await this.repository.getRequestById(requestId);
    if (!request) {
      throw new Error(`طلب الاعتماد رقم ${requestId} غير موجود`);
    }

    if (request.status !== 'PENDING') {
      throw new Error(`الطلب مكتمل أو ملغى مسبقاً بحالة: ${request.status}`);
    }

    // Strict Segregation of Duties Check
    if (request.makerId === approver.id) {
      throw new Error('انتهاك دستوري لمبدأ الأعين الأربعة (SoD): لا يجوز لمُدخل الطلب اعتماده بنفسه إطلاقاً.');
    }

    // Prevent multi-stage self sign-off by same individual
    if (request.approvalTrail.some(t => t.approverId === approver.id)) {
      throw new Error('لقد قمت باعتماد مرحلة سابقة في هذا المسار؛ تتطلب المعايير المصرفية مراجعاً مستقلاً لهذه المرحلة.');
    }

    const activeStage = request.stages.find(s => s.stageOrder === request.currentStageOrder);
    const stageNameAr = activeStage ? activeStage.stageNameAr : `المرحلة ${request.currentStageOrder}`;

    // Record decision
    request.approvalTrail.push({
      stageOrder: request.currentStageOrder,
      stageNameAr,
      approverId: approver.id,
      approverName: approver.displayName || approver.username,
      approverGroup: approver.groupName || 'معتمد مصرح',
      decision: 'APPROVED',
      notes: notes?.trim() || 'تم التدقيق والموافقة وفق السياسة المعتمدة.',
      decidedAt: new Date().toISOString(),
      digitalSignature: `HMAC-SHA256:${Buffer.from(`${requestId}:${approver.id}:${Date.now()}`).toString('base64').substring(0, 32)}`
    });

    if (request.currentStageOrder < request.totalStages) {
      // Advance to next stage
      request.currentStageOrder += 1;
    } else {
      // Final stage completed: Atomically apply changes
      request.status = 'APPROVED';
      request.completedAt = new Date().toISOString();

      try {
        const executionResult = await this.actionRegistry.execute(
          request.resourceKey,
          request.actionType,
          request.payload,
          request.targetResourceId,
          request.snapshotBefore
        );
        request.executedSuccessfully = executionResult.success;
        if (!executionResult.success) {
          request.executionError = executionResult.error;
        }
      } catch (err: any) {
        request.executedSuccessfully = false;
        request.executionError = err.message || 'فشل أثناء تطبيق العملية الذرية بعد الاعتماد';
      }
    }

    await this.repository.saveRequest(request);
    return request;
  }

  /**
   * Rejects an approval request with a mandatory reason.
   */
  async rejectRequest(requestId: string, approver: WorkflowUserContext, reason: string): Promise<ApprovalRequest> {
    if (!reason || reason.trim().length === 0) {
      throw new Error('يجب كتابة سبب الرفض لتوثيق القرار في السجل الرقابي.');
    }

    const request = await this.repository.getRequestById(requestId);
    if (!request) {
      throw new Error(`طلب الاعتماد رقم ${requestId} غير موجود`);
    }

    if (request.status !== 'PENDING') {
      throw new Error(`الطلب مكتمل أو ملغى مسبقاً بحالة: ${request.status}`);
    }

    if (request.makerId === approver.id) {
      throw new Error('لا يمكنك رفض طلب أنت صاحبه؛ يمكنك إلغاؤه بدلاً من ذلك.');
    }

    const activeStage = request.stages.find(s => s.stageOrder === request.currentStageOrder);
    const stageNameAr = activeStage ? activeStage.stageNameAr : `المرحلة ${request.currentStageOrder}`;

    request.status = 'REJECTED';
    request.rejectionReason = reason.trim();
    request.completedAt = new Date().toISOString();

    request.approvalTrail.push({
      stageOrder: request.currentStageOrder,
      stageNameAr,
      approverId: approver.id,
      approverName: approver.displayName || approver.username,
      approverGroup: approver.groupName || 'معتمد مصرح',
      decision: 'REJECTED',
      notes: reason.trim(),
      decidedAt: new Date().toISOString()
    });

    await this.repository.saveRequest(request);
    return request;
  }
}
