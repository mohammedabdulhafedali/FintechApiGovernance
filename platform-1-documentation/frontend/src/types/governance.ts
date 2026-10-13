export type WorkflowPolicyMode = 'DIRECT' | 'MAKER_CHECKER' | 'MULTI_STAGE_PIPELINE';

export interface WorkflowStageDefinition {
  stageOrder: number;
  stageKey: string;
  stageNameAr: string;
  stageNameEn: string;
  requiredPermission: string;
  requiredGroupKey?: string;
  minApprovers: number;
}

export interface WorkflowPolicy {
  resourceKey: string;
  resourceNameAr: string;
  resourceNameEn: string;
  mode: WorkflowPolicyMode;
  isProtectedCore: boolean;
  stages: WorkflowStageDefinition[];
  updatedAt: string;
  updatedBy: string;
}

export type ApprovalRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface ApprovalDecisionRecord {
  stageOrder: number;
  stageNameAr: string;
  approverId: string;
  approverName: string;
  approverGroup: string;
  decision: 'APPROVED' | 'REJECTED';
  notes?: string;
  decidedAt: string;
  digitalSignature?: string;
}

export interface FieldDelta {
  field: string;
  labelAr: string;
  oldValue: any;
  newValue: any;
  type: 'ADDED' | 'MODIFIED' | 'REMOVED';
}

export interface ApprovalRequest {
  id: string;
  resourceKey: string;
  resourceNameAr: string;
  resourceNameEn: string;
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'CUSTOM';
  actionDescriptionAr: string;
  actionDescriptionEn: string;
  targetResourceId?: string;
  payload: any;
  snapshotBefore?: any;
  diffSummary: FieldDelta[];
  resourceVersion?: string;
  makerId: string;
  makerName: string;
  makerGroup: string;
  submittedAt: string;
  status: ApprovalRequestStatus;
  currentStageOrder: number;
  totalStages: number;
  stages: WorkflowStageDefinition[];
  approvalTrail: ApprovalDecisionRecord[];
  rejectionReason?: string;
  completedAt?: string;
  executedSuccessfully?: boolean;
  executionError?: string;
}

export interface ApprovalInboxItem extends ApprovalRequest {
  canApproveCurrentStage: boolean;
  activeStage?: WorkflowStageDefinition;
}
