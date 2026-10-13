import { WorkflowPolicy, ApprovalRequest } from './GovernanceWorkflowTypes.js';

export interface IGovernanceRepository {
  // Policies Management
  getPolicies(): Promise<WorkflowPolicy[]>;
  getPolicy(resourceKey: string): Promise<WorkflowPolicy | null>;
  savePolicy(policy: WorkflowPolicy): Promise<WorkflowPolicy>;

  // Approval Requests Management
  getRequests(): Promise<ApprovalRequest[]>;
  getRequestById(id: string): Promise<ApprovalRequest | null>;
  saveRequest(request: ApprovalRequest): Promise<ApprovalRequest>;
  getPendingRequests(): Promise<ApprovalRequest[]>;
  getRequestsByMaker(makerId: string): Promise<ApprovalRequest[]>;
}
