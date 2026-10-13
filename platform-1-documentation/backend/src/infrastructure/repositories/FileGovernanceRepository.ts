import fs from 'fs/promises';
import path from 'path';
import { IGovernanceRepository } from '../../domain/governance/IGovernanceRepository.js';
import { WorkflowPolicy, ApprovalRequest } from '../../domain/governance/GovernanceWorkflowTypes.js';
import { resolveDataPath } from '../data/dataPathResolver.js';

export class FileGovernanceRepository implements IGovernanceRepository {
  private readonly policiesFilePath: string;
  private readonly requestsFilePath: string;

  constructor() {
    this.policiesFilePath = resolveDataPath('governance_policies.json');
    this.requestsFilePath = resolveDataPath('governance_requests.json');
  }

  private async readPolicies(): Promise<WorkflowPolicy[]> {
    try {
      const raw = await fs.readFile(this.policiesFilePath, 'utf-8');
      return JSON.parse(raw);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        const seeded = this.getInitialSeededPolicies();
        await this.writePolicies(seeded);
        return seeded;
      }
      throw err;
    }
  }

  private async writePolicies(data: WorkflowPolicy[]): Promise<void> {
    await fs.mkdir(path.dirname(this.policiesFilePath), { recursive: true });
    await fs.writeFile(this.policiesFilePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  private async readRequests(): Promise<ApprovalRequest[]> {
    try {
      const raw = await fs.readFile(this.requestsFilePath, 'utf-8');
      return JSON.parse(raw);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        const seeded = this.getInitialSeededRequests();
        await this.writeRequests(seeded);
        return seeded;
      }
      throw err;
    }
  }

  private async writeRequests(data: ApprovalRequest[]): Promise<void> {
    await fs.mkdir(path.dirname(this.requestsFilePath), { recursive: true });
    await fs.writeFile(this.requestsFilePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async getPolicies(): Promise<WorkflowPolicy[]> {
    return this.readPolicies();
  }

  async getPolicy(resourceKey: string): Promise<WorkflowPolicy | null> {
    const list = await this.readPolicies();
    return list.find(p => p.resourceKey === resourceKey) || null;
  }

  async savePolicy(policy: WorkflowPolicy): Promise<WorkflowPolicy> {
    const list = await this.readPolicies();
    const index = list.findIndex(p => p.resourceKey === policy.resourceKey);
    if (index >= 0) {
      list[index] = policy;
    } else {
      list.push(policy);
    }
    await this.writePolicies(list);
    return policy;
  }

  async getRequests(): Promise<ApprovalRequest[]> {
    const list = await this.readRequests();
    // Sort descending by submittedAt
    return list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }

  async getRequestById(id: string): Promise<ApprovalRequest | null> {
    const list = await this.readRequests();
    return list.find(r => r.id === id) || null;
  }

  async saveRequest(request: ApprovalRequest): Promise<ApprovalRequest> {
    const list = await this.readRequests();
    const index = list.findIndex(r => r.id === request.id);
    if (index >= 0) {
      list[index] = request;
    } else {
      list.unshift(request);
    }
    await this.writeRequests(list);
    return request;
  }

  async getPendingRequests(): Promise<ApprovalRequest[]> {
    const list = await this.readRequests();
    return list.filter(r => r.status === 'PENDING');
  }

  async getRequestsByMaker(makerId: string): Promise<ApprovalRequest[]> {
    const list = await this.readRequests();
    return list.filter(r => r.makerId === makerId);
  }

  private getInitialSeededPolicies(): WorkflowPolicy[] {
    return [
      {
        resourceKey: 'catalog:endpoints',
        resourceNameAr: 'نقاط النهاية والـ APIs',
        resourceNameEn: 'Endpoints & API Catalog',
        mode: 'MAKER_CHECKER',
        isProtectedCore: false,
        stages: [
          {
            stageOrder: 1,
            stageKey: 'tech_review',
            stageNameAr: 'مراجعة معمارية وتدقيق المواصفة',
            stageNameEn: 'Technical Architecture Review',
            requiredPermission: 'governance:approve',
            minApprovers: 1
          }
        ],
        updatedAt: new Date().toISOString(),
        updatedBy: 'system'
      },
      {
        resourceKey: 'catalog:sectors',
        resourceNameAr: 'القطاعات والأنظمة المصرفية',
        resourceNameEn: 'Banking Sectors & Systems',
        mode: 'MULTI_STAGE_PIPELINE',
        isProtectedCore: true,
        stages: [
          {
            stageOrder: 1,
            stageKey: 'architect_signoff',
            stageNameAr: 'اعتماد معماري الـ API',
            stageNameEn: 'API Architect Sign-off',
            requiredPermission: 'governance:approve',
            minApprovers: 1
          },
          {
            stageOrder: 2,
            stageKey: 'security_signoff',
            stageNameAr: 'اعتماد ضابط أمن المعلومات (CISO)',
            stageNameEn: 'Chief Information Security Officer Sign-off',
            requiredPermission: 'governance:approve:security',
            minApprovers: 1
          }
        ],
        updatedAt: new Date().toISOString(),
        updatedBy: 'system'
      },
      {
        resourceKey: 'iam:groups',
        resourceNameAr: 'أدوار ومجموعات الصلاحيات',
        resourceNameEn: 'IAM Groups & Roles',
        mode: 'MULTI_STAGE_PIPELINE',
        isProtectedCore: true,
        stages: [
          {
            stageOrder: 1,
            stageKey: 'security_audit',
            stageNameAr: 'تدقيق أمني ومطابقة الصلاحيات',
            stageNameEn: 'Security Audit & Permissions Check',
            requiredPermission: 'governance:approve:security',
            minApprovers: 1
          },
          {
            stageOrder: 2,
            stageKey: 'executive_approval',
            stageNameAr: 'الاعتماد السيادي لمدير النظام',
            stageNameEn: 'Executive IAM Authorization',
            requiredPermission: 'iam:manage',
            minApprovers: 1
          }
        ],
        updatedAt: new Date().toISOString(),
        updatedBy: 'system'
      },
      {
        resourceKey: 'iam:users',
        resourceNameAr: 'حسابات المستخدمين والمشرفين',
        resourceNameEn: 'IAM Users & Credentials',
        mode: 'MAKER_CHECKER',
        isProtectedCore: true,
        stages: [
          {
            stageOrder: 1,
            stageKey: 'user_governance_approval',
            stageNameAr: 'اعتماد إدارة الهوية والمطابقة',
            stageNameEn: 'IAM Identity Compliance Approval',
            requiredPermission: 'iam:manage',
            minApprovers: 1
          }
        ],
        updatedAt: new Date().toISOString(),
        updatedBy: 'system'
      }
    ];
  }

  private getInitialSeededRequests(): ApprovalRequest[] {
    const now = new Date();
    return [
      {
        id: 'REQ-2026-0001',
        resourceKey: 'catalog:endpoints',
        resourceNameAr: 'نقاط النهاية والـ APIs',
        resourceNameEn: 'Endpoints & API Catalog',
        actionType: 'CREATE',
        actionDescriptionAr: 'إضافة API جديد لمعالجة المقاصة الفورية بين البنوك',
        actionDescriptionEn: 'Add new Instant Interbank Clearing Endpoint',
        payload: {
          path: '/api/v1/clearing/instant-settlement',
          method: 'POST',
          nameAr: 'تسوية المقاصة الفورية المصرفية',
          nameEn: 'Instant Interbank Settlement',
          sectorKey: 'payments',
          isFinancial: true,
          requiresAuth: true
        },
        diffSummary: [
          {
            field: 'path',
            labelAr: 'مسار الـ API',
            oldValue: null,
            newValue: '/api/v1/clearing/instant-settlement',
            type: 'ADDED'
          },
          {
            field: 'nameAr',
            labelAr: 'الاسم بالعربية',
            oldValue: null,
            newValue: 'تسوية المقاصة الفورية المصرفية',
            type: 'ADDED'
          },
          {
            field: 'isFinancial',
            labelAr: 'عملية مالية حساسة',
            oldValue: null,
            newValue: true,
            type: 'ADDED'
          }
        ],
        makerId: 'user-developer-01',
        makerName: 'م. أحمد العولقي (مطوّر نظم)',
        makerGroup: 'مطور واجهات برمجية',
        submittedAt: new Date(now.getTime() - 1000 * 60 * 45).toISOString(),
        status: 'PENDING',
        currentStageOrder: 1,
        totalStages: 1,
        stages: [
          {
            stageOrder: 1,
            stageKey: 'tech_review',
            stageNameAr: 'مراجعة معمارية وتدقيق المواصفة',
            stageNameEn: 'Technical Architecture Review',
            requiredPermission: 'governance:approve',
            minApprovers: 1
          }
        ],
        approvalTrail: []
      },
      {
        id: 'REQ-2026-0002',
        resourceKey: 'catalog:sectors',
        resourceNameAr: 'القطاعات والأنظمة المصرفية',
        resourceNameEn: 'Banking Sectors & Systems',
        actionType: 'UPDATE',
        actionDescriptionAr: 'تحديث معايير التشفير والاعتماد لقطاع المدفوعات النقدية',
        actionDescriptionEn: 'Update encryption standards for Cash Payments Sector',
        targetResourceId: 'payments',
        snapshotBefore: {
          code: 'PAYMENTS',
          nameAr: 'قطاع المدفوعات والتحويلات',
          nameEn: 'Payments & Transfers Sector',
          requiresHardwareSecurityModule: false,
          minSignatureBits: 2048
        },
        payload: {
          code: 'PAYMENTS',
          nameAr: 'قطاع المدفوعات والتحويلات السيادية',
          nameEn: 'Sovereign Payments & Transfers Sector',
          requiresHardwareSecurityModule: true,
          minSignatureBits: 4096
        },
        diffSummary: [
          {
            field: 'nameAr',
            labelAr: 'الاسم بالعربية',
            oldValue: 'قطاع المدفوعات والتحويلات',
            newValue: 'قطاع المدفوعات والتحويلات السيادية',
            type: 'MODIFIED'
          },
          {
            field: 'requiresHardwareSecurityModule',
            labelAr: 'إلزامية وحدة التشفير الصلبة (HSM)',
            oldValue: false,
            newValue: true,
            type: 'MODIFIED'
          },
          {
            field: 'minSignatureBits',
            labelAr: 'الحد الأدنى لقوة مفتاح التوقيع',
            oldValue: 2048,
            newValue: 4096,
            type: 'MODIFIED'
          }
        ],
        makerId: 'user-security-analyst',
        makerName: 'سارة المهدي (محلل أمن سيبراني)',
        makerGroup: 'أمن المعلومات',
        submittedAt: new Date(now.getTime() - 1000 * 60 * 120).toISOString(),
        status: 'PENDING',
        currentStageOrder: 2,
        totalStages: 2,
        stages: [
          {
            stageOrder: 1,
            stageKey: 'architect_signoff',
            stageNameAr: 'اعتماد معماري الـ API',
            stageNameEn: 'API Architect Sign-off',
            requiredPermission: 'governance:approve',
            minApprovers: 1
          },
          {
            stageOrder: 2,
            stageKey: 'security_signoff',
            stageNameAr: 'اعتماد ضابط أمن المعلومات (CISO)',
            stageNameEn: 'Chief Information Security Officer Sign-off',
            requiredPermission: 'governance:approve:security',
            minApprovers: 1
          }
        ],
        approvalTrail: [
          {
            stageOrder: 1,
            stageNameAr: 'اعتماد معماري الـ API',
            approverId: 'architect-01',
            approverName: 'د. طارق المعماري',
            approverGroup: 'مهندسو المعمارية المصرفية',
            decision: 'APPROVED',
            notes: 'تم التحقق من تطابق الترقية مع متطلبات البنك المركزي ISO-20022.',
            decidedAt: new Date(now.getTime() - 1000 * 60 * 60).toISOString(),
            digitalSignature: 'RSA-PSS-SHA256:3a9f8b...certified'
          }
        ]
      }
    ];
  }
}
