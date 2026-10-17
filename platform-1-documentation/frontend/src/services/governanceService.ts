import { 
  ApprovalInboxItem, 
  ApprovalRequest, 
  WorkflowPolicy 
} from '../types/governance';
import { authService } from './authService';

const GOVERNANCE_BASE_URL = 'http://localhost:4000/api/v1/governance';

export class GovernanceService {
  private static instance: GovernanceService;

  private constructor() {}

  public static getInstance(): GovernanceService {
    if (!GovernanceService.instance) {
      GovernanceService.instance = new GovernanceService();
    }
    return GovernanceService.instance;
  }

  public async getInbox(): Promise<{ count: number; pendingForMeCount: number; data: ApprovalInboxItem[] }> {
    const response = await fetch(`${GOVERNANCE_BASE_URL}/inbox`, {
      headers: authService.getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error('فشل استرجاع صندوق الوارد للمراجعات');
    }
    const result = await response.json();
    return {
      count: result.count || 0,
      pendingForMeCount: result.pendingForMeCount || 0,
      data: result.data || []
    };
  }

  public async getMyRequests(): Promise<ApprovalRequest[]> {
    const response = await fetch(`${GOVERNANCE_BASE_URL}/my-requests`, {
      headers: authService.getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error('فشل استرجاع قائمة طلباتي');
    }
    const result = await response.json();
    return result.data || [];
  }

  public async submitRequest(params: {
    resourceKey: string;
    actionType?: 'CREATE' | 'UPDATE' | 'DELETE' | 'CUSTOM';
    actionDescriptionAr: string;
    actionDescriptionEn?: string;
    targetResourceId?: string;
    payload: any;
    diffSummary?: any[];
  }): Promise<ApprovalRequest> {
    const response = await fetch(`${GOVERNANCE_BASE_URL}/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders()
      },
      body: JSON.stringify(params)
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'فشل إرسال طلب الاعتماد');
    }
    return result.data;
  }

  public async getPolicies(): Promise<WorkflowPolicy[]> {
    const response = await fetch(`${GOVERNANCE_BASE_URL}/policies`, {
      headers: authService.getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error('فشل استرجاع سياسات ومسارات الحوكمة');
    }
    const result = await response.json();
    return result.data || [];
  }

  public async updatePolicy(resourceKey: string, payload: Partial<WorkflowPolicy>): Promise<WorkflowPolicy> {
    const response = await fetch(`${GOVERNANCE_BASE_URL}/policies/${encodeURIComponent(resourceKey)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'فشل تحديث سياسة الاعتماد');
    }
    return result.data;
  }

  public async approveStage(id: string, notes?: string): Promise<ApprovalRequest> {
    const response = await fetch(`${GOVERNANCE_BASE_URL}/requests/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders()
      },
      body: JSON.stringify({ notes })
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'فشل اعتماد الطلب');
    }
    return result.data;
  }

  public async rejectRequest(id: string, reason: string): Promise<ApprovalRequest> {
    const response = await fetch(`${GOVERNANCE_BASE_URL}/requests/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders()
      },
      body: JSON.stringify({ reason })
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'فشل رفض الطلب');
    }
    return result.data;
  }
}

export const governanceService = GovernanceService.getInstance();
