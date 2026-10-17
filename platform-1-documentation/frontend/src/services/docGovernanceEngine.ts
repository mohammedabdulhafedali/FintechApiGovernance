import { 
  SystemEntityDocContainer, 
  DocVersionRecord, 
  VersionBumpType,
  ChangeScopeType 
} from '../types/docGovernance';
import { SystemModule } from '../types/schema';

const STORAGE_KEY = 'gov_fintech_doc_containers_v2';

export class DocumentGovernanceEngine {
  private static instance: DocumentGovernanceEngine;

  private constructor() {}

  public static getInstance(): DocumentGovernanceEngine {
    if (!DocumentGovernanceEngine.instance) {
      DocumentGovernanceEngine.instance = new DocumentGovernanceEngine();
    }
    return DocumentGovernanceEngine.instance;
  }

  public getDocumentKey(systemKey: string, integrationKey: string): string {
    const cleanSys = systemKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const cleanInt = integrationKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    return `DOC_${cleanSys}_${cleanInt}`;
  }

  public calculateNextVersion(currentVersion: string, bumpType: VersionBumpType): string {
    const clean = currentVersion.replace(/^v/i, '').trim();
    const parts = clean.split('.').map(p => parseInt(p, 10) || 0);

    let [major = 1, minor = 0, patch = 0] = parts;

    // Banking year format support (e.g. 2026.2)
    if (major > 2000) {
      if (bumpType === 'MAJOR') {
        return `v${major + 1}.0`;
      } else if (bumpType === 'MINOR') {
        return `v${major}.${(parts[1] || 1) + 1}`;
      } else {
        return `v${major}.${parts[1] || 1}.${(parts[2] || 0) + 1}`;
      }
    }

    // Standard Semantic Versioning (SemVer: MAJOR.MINOR.PATCH)
    switch (bumpType) {
      case 'MAJOR':
        return `v${major + 1}.0.0`;
      case 'MINOR':
        return `v${major}.${minor + 1}.0`;
      case 'PATCH':
        return `v${major}.${minor}.${patch + 1}`;
    }
  }

  private loadStore(): Record<string, SystemEntityDocContainer> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {}
    return {};
  }

  private saveStore(store: Record<string, SystemEntityDocContainer>): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (e) {
      console.error('Failed to save doc containers store:', e);
    }
  }

  /**
   * Synchronizes and builds complete containers matrix for all systems and integrations.
   * Merges persisted version records with the dynamic systems structure.
   */
  public getContainersMatrix(systems: Record<string, SystemModule>): SystemEntityDocContainer[] {
    const store = this.loadStore();
    const result: SystemEntityDocContainer[] = [];

    Object.entries(systems).forEach(([sysKey, sys]) => {
      const integrations = sys.integrations || {};

      Object.entries(integrations).forEach(([intKey, intItem]) => {
        const docKey = this.getDocumentKey(sysKey, intKey);
        let container = store[docKey];

        // Seed initial container if not present
        if (!container) {
          const endpointsCount = intItem.endpoints?.length || 0;
          const initialVersionNumber = intItem.docVersion || 'v2026.2';

          const hasInitialEndpoints = endpointsCount > 0;
          const initialApprovedVersion: DocVersionRecord | undefined = hasInitialEndpoints ? {
            id: `ver-${docKey}-initial`,
            documentKey: docKey,
            systemKey: sysKey,
            integrationKey: intKey,
            versionNumber: initialVersionNumber,
            changeSummary: 'الإصدار المعتمد والنافذ حالياً في المنظومة.',
            status: 'APPROVED',
            authorId: 'usr_admin',
            authorName: 'فريق الحوكمة المعمارية',
            createdAt: '2026-09-15T10:00:00.000Z',
            updatedAt: '2026-09-30T14:30:00.000Z',
            approvedBy: 'مدير الرقابة والامتثال',
            approvedAt: '2026-09-30T14:30:00.000Z',
            endpointsCount
          } : undefined;

          container = {
            documentKey: docKey,
            systemKey: sysKey,
            systemName: sys.name,
            systemCode: sys.code || sysKey,
            integrationKey: intKey,
            integrationName: intItem.name,
            integrationCode: intItem.code || intKey,
            hasDocument: hasInitialEndpoints,
            currentApprovedVersion: initialApprovedVersion,
            allVersions: initialApprovedVersion ? [initialApprovedVersion] : [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          store[docKey] = container;
        } else {
          // Update system & integration metadata in case name/code changed
          container.systemName = sys.name;
          container.systemCode = sys.code || sysKey;
          container.integrationName = intItem.name;
          container.integrationCode = intItem.code || intKey;
        }

        result.push(container);
      });
    });

    this.saveStore(store);
    return result;
  }

  /**
   * Retrieves a single entity document container by systemKey and integrationKey.
   */
  public getContainer(systemKey: string, integrationKey: string): SystemEntityDocContainer | undefined {
    if (!systemKey || !integrationKey) return undefined;
    const store = this.loadStore();
    const docKey = this.getDocumentKey(systemKey, integrationKey);
    return store[docKey];
  }

  /**
   * SOLID Constraint: Creates the initial document for an entity.
   * Throws Error if a document or draft already exists to guarantee uniqueness.
   */
  public createInitialDocument(params: {
    systemKey: string;
    integrationKey: string;
    systemName: string;
    systemCode: string;
    integrationName: string;
    integrationCode: string;
    authorId: string;
    authorName: string;
    summary?: string;
  }): { success: boolean; container: SystemEntityDocContainer; error?: string } {
    const store = this.loadStore();
    const docKey = this.getDocumentKey(params.systemKey, params.integrationKey);
    const existing = store[docKey];

    if (existing && (existing.currentApprovedVersion || existing.activeDraftVersion || existing.pendingReviewVersion)) {
      const activeVer = existing.currentApprovedVersion?.versionNumber || existing.activeDraftVersion?.versionNumber || 'موجود';
      return {
        success: false,
        container: existing,
        error: `عفواً، يوجد ملف توثيق مسجل مسبقاً لهذا النظام والجهة (الإصدار: ${activeVer}). لا يمكن إنشاء ملف جديد ثانٍ.`
      };
    }

    const initialDraft: DocVersionRecord = {
      id: `ver-${docKey}-v1.0.0`,
      documentKey: docKey,
      systemKey: params.systemKey,
      integrationKey: params.integrationKey,
      versionNumber: 'v1.0.0',
      bumpType: 'MAJOR',
      changeSummary: params.summary || 'التأسيس الأولي لوثيقة التكامل والربط الفني.',
      status: 'DRAFT',
      authorId: params.authorId,
      authorName: params.authorName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      endpointsCount: 0
    };

    const container: SystemEntityDocContainer = {
      documentKey: docKey,
      systemKey: params.systemKey,
      systemName: params.systemName,
      systemCode: params.systemCode,
      integrationKey: params.integrationKey,
      integrationName: params.integrationName,
      integrationCode: params.integrationCode,
      hasDocument: true,
      activeDraftVersion: initialDraft,
      allVersions: [initialDraft],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    store[docKey] = container;
    this.saveStore(store);

    return { success: true, container };
  }

  /**
   * Opens a new working draft version based on the current approved version.
   * Prevents concurrent unapproved drafts.
   */
  public openNewDraftVersion(params: {
    systemKey: string;
    integrationKey: string;
    bumpType: VersionBumpType;
    allowedScope?: ChangeScopeType;
    changeSummary: string;
    authorId: string;
    authorName: string;
  }): { success: boolean; draft?: DocVersionRecord; error?: string } {
    const store = this.loadStore();
    const docKey = this.getDocumentKey(params.systemKey, params.integrationKey);
    const container = store[docKey];

    if (!container) {
      return { success: false, error: 'لم يتم العثور على سجل الوثيقة للجهة المحددة.' };
    }

    if (container.activeDraftVersion) {
      return {
        success: false,
        error: `توجد مسودة تعديل مفتوحة حالياً (${container.activeDraftVersion.versionNumber}) يعمل عليها (${container.activeDraftVersion.authorName}). يرجى إكمالها أو إلغاؤها أولاً.`
      };
    }

    if (container.pendingReviewVersion) {
      return {
        success: false,
        error: `يوجد إصدار (${container.pendingReviewVersion.versionNumber}) قيد المراجعة والاعتماد حالياً لدى المشرف. لا يمكن فتح تعديل جديد حتى اكتمال الاعتماد.`
      };
    }

    const currentVer = container.currentApprovedVersion?.versionNumber || 'v1.0.0';
    const nextVer = this.calculateNextVersion(currentVer, params.bumpType);

    const newDraft: DocVersionRecord = {
      id: `ver-${docKey}-${nextVer}-${Date.now()}`,
      documentKey: docKey,
      systemKey: params.systemKey,
      integrationKey: params.integrationKey,
      entityId: container.entityId || params.integrationKey,
      versionNumber: nextVer,
      bumpType: params.bumpType,
      allowedScope: params.allowedScope || 'FULL',
      changeSummary: params.changeSummary.trim() || 'تحديث وتطوير مواصفات الربط البرمجي.',
      status: 'DRAFT',
      authorId: params.authorId,
      authorName: params.authorName,
      claimedBy: {
        userId: params.authorId,
        userName: params.authorName,
        lockedAt: new Date().toISOString()
      },
      supervisorNotes: (params as any).supervisorNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      endpointsCount: container.currentApprovedVersion?.endpointsCount || 0,
      payloadSnapshot: container.currentApprovedVersion?.payloadSnapshot
    };

    container.activeDraftVersion = newDraft;
    container.allVersions.unshift(newDraft);
    container.updatedAt = new Date().toISOString();

    store[docKey] = container;
    this.saveStore(store);

    return { success: true, draft: newDraft };
  }

  /**
   * Exclusive Lock: Claim a draft by a specific user.
   * Prevents other users from editing the same document version simultaneously.
   */
  public claimDraft(
    systemKey: string,
    integrationKey: string,
    user: { id: string; name: string; email?: string }
  ): { success: boolean; error?: string } {
    const store = this.loadStore();
    const docKey = this.getDocumentKey(systemKey, integrationKey);
    const container = store[docKey];

    if (!container || !container.activeDraftVersion) {
      return { success: false, error: 'لا توجد مسودة نشطة متاحة للحجز.' };
    }

    const draft = container.activeDraftVersion;
    if (draft.claimedBy && draft.claimedBy.userId !== user.id) {
      return {
        success: false,
        error: `الوثيقة محجوزة ومقفلة حصرياً للتحرير بواسطة (${draft.claimedBy.userName}). لا يمكنك التعديل عليها حتى يقوم بتحريرها.`
      };
    }

    draft.claimedBy = {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      lockedAt: new Date().toISOString()
    };
    draft.updatedAt = new Date().toISOString();
    container.updatedAt = new Date().toISOString();

    store[docKey] = container;
    this.saveStore(store);

    return { success: true };
  }

  /**
   * Exclusive Lock: Release the lock on a draft.
   */
  public releaseDraftLock(
    systemKey: string,
    integrationKey: string,
    user: { id: string; name: string; isSupervisor?: boolean }
  ): { success: boolean; error?: string } {
    const store = this.loadStore();
    const docKey = this.getDocumentKey(systemKey, integrationKey);
    const container = store[docKey];

    if (!container || !container.activeDraftVersion) {
      return { success: true };
    }

    const draft = container.activeDraftVersion;
    if (draft.claimedBy && draft.claimedBy.userId !== user.id && !user.isSupervisor) {
      return {
        success: false,
        error: 'لا تملك صلاحية فك قفل الوثيقة المحجوزة لمستخدم آخر.'
      };
    }

    draft.claimedBy = undefined;
    draft.updatedAt = new Date().toISOString();
    container.updatedAt = new Date().toISOString();

    store[docKey] = container;
    this.saveStore(store);

    return { success: true };
  }

  /**
   * Check if a draft is locked by another user.
   */
  public isDraftLockedForUser(
    systemKey: string,
    integrationKey: string,
    currentUserId?: string
  ): { isLocked: boolean; lockedBy?: string } {
    const store = this.loadStore();
    const docKey = this.getDocumentKey(systemKey, integrationKey);
    const container = store[docKey];

    if (!container || !container.activeDraftVersion || !container.activeDraftVersion.claimedBy) {
      return { isLocked: false };
    }

    const claim = container.activeDraftVersion.claimedBy;
    if (currentUserId && claim.userId === currentUserId) {
      return { isLocked: false };
    }

    return { isLocked: true, lockedBy: claim.userName };
  }

  /**
   * Submits active draft to supervisor for review and approval.
   * Releases editing lock and freezes content.
   */
  public submitDraftForReview(systemKey: string, integrationKey: string): { success: boolean; version?: DocVersionRecord; error?: string } {
    const store = this.loadStore();
    const docKey = this.getDocumentKey(systemKey, integrationKey);
    const container = store[docKey];

    if (!container || !container.activeDraftVersion) {
      return { success: false, error: 'لا توجد مسودة نشطة لرفعها للمراجعة.' };
    }

    const draft = container.activeDraftVersion;
    draft.status = 'UNDER_REVIEW';
    draft.submittedAt = new Date().toISOString();
    draft.updatedAt = new Date().toISOString();
    draft.claimedBy = undefined; // Free lock upon submission

    container.pendingReviewVersion = draft;
    container.activeDraftVersion = undefined;
    container.updatedAt = new Date().toISOString();

    store[docKey] = container;
    this.saveStore(store);

    return { success: true, version: draft };
  }

  /**
   * Supervisor Approves the version with Strict Separation of Duties (SoD):
   * 1. Maker-Checker Rule: Author cannot approve their own document.
   * 2. Sets status to APPROVED and supersedes previous version.
   * 3. Guarantees single approved baseline for system and entity.
   */
  public approveVersion(params: {
    systemKey: string;
    integrationKey: string;
    approverId?: string;
    approverName: string;
  }): { success: boolean; approvedVersion?: DocVersionRecord; error?: string } {
    const store = this.loadStore();
    const docKey = this.getDocumentKey(params.systemKey, params.integrationKey);
    const container = store[docKey];

    if (!container) {
      return { success: false, error: 'لم يتم العثور على الوثيقة.' };
    }

    const targetVer = container.pendingReviewVersion || container.activeDraftVersion;
    if (!targetVer) {
      return { success: false, error: 'لا يوجد إصدار قيد الاعتماد لهذه الوثيقة.' };
    }

    // ── STRICT SEPARATION OF DUTIES (SoD) & ZERO-TRUST INVARIANT ──
    const isSelfApproval = 
      (params.approverId && targetVer.authorId === params.approverId) ||
      (targetVer.authorName && targetVer.authorName.trim().toLowerCase() === params.approverName.trim().toLowerCase());

    if (isSelfApproval) {
      return {
        success: false,
        error: `خرق لمبدأ الفصل الصارم بين الواجبات (Separation of Duties - SoD): لا يجوز لمحرر الوثيقة (${targetVer.authorName}) اعتمادها بنفسه حتى وإن كان مديراً للنظام. يجب أن تتم المراجعة والاعتماد بواسطة معتمد/مشرف مستقل.`
      };
    }

    // Archive current approved version (Immutability & Single Active Baseline)
    if (container.currentApprovedVersion) {
      container.currentApprovedVersion.status = 'SUPERSEDED';
    }

    // Activate target version
    targetVer.status = 'APPROVED';
    targetVer.approvedBy = params.approverName;
    targetVer.approvedAt = new Date().toISOString();
    targetVer.updatedAt = new Date().toISOString();
    targetVer.claimedBy = undefined;

    container.currentApprovedVersion = targetVer;
    container.pendingReviewVersion = undefined;
    container.activeDraftVersion = undefined;
    container.hasDocument = true;
    container.updatedAt = new Date().toISOString();

    store[docKey] = container;
    this.saveStore(store);

    return { success: true, approvedVersion: targetVer };
  }

  /**
   * Supervisor Rejects the version with a reason:
   * Sets status to REJECTED, moves back to activeDraftVersion for correction.
   */
  public rejectVersion(params: {
    systemKey: string;
    integrationKey: string;
    rejectorName: string;
    reason: string;
  }): { success: boolean; rejectedVersion?: DocVersionRecord; error?: string } {
    const store = this.loadStore();
    const docKey = this.getDocumentKey(params.systemKey, params.integrationKey);
    const container = store[docKey];

    if (!container || !container.pendingReviewVersion) {
      return { success: false, error: 'لا يوجد إصدار قيد المراجعة لرفضه.' };
    }

    const v = container.pendingReviewVersion;
    v.status = 'REJECTED';
    v.rejectedBy = params.rejectorName;
    v.rejectedAt = new Date().toISOString();
    v.rejectionReason = params.reason;
    v.updatedAt = new Date().toISOString();

    // Revert to draft so the author can amend it
    container.activeDraftVersion = v;
    container.pendingReviewVersion = undefined;
    container.updatedAt = new Date().toISOString();

    store[docKey] = container;
    this.saveStore(store);

    return { success: true, rejectedVersion: v };
  }

  /**
   * Integration Pre-Condition Guard:
   * Checks whether an entity has a certified APPROVED API Document in the repository.
   * Without an approved document, integration is strictly forbidden.
   */
  public hasApprovedDocForEntity(entityId: string): boolean {
    if (!entityId) return false;
    const store = this.loadStore();
    const cleanEntityId = entityId.trim().toLowerCase();

    // Search across all containers matching this entityId
    for (const container of Object.values(store)) {
      const matchEntity = 
        (container.entityId && container.entityId.trim().toLowerCase() === cleanEntityId) ||
        (container.integrationKey && container.integrationKey.trim().toLowerCase() === cleanEntityId);

      if (matchEntity && container.currentApprovedVersion && container.currentApprovedVersion.status === 'APPROVED') {
        return true;
      }
    }
    return false;
  }

  /**
   * Retrieves the active approved document for an entity if it exists.
   */
  public getApprovedDocForEntity(entityId: string): DocVersionRecord | undefined {
    if (!entityId) return undefined;
    const store = this.loadStore();
    const cleanEntityId = entityId.trim().toLowerCase();

    for (const container of Object.values(store)) {
      const matchEntity = 
        (container.entityId && container.entityId.trim().toLowerCase() === cleanEntityId) ||
        (container.integrationKey && container.integrationKey.trim().toLowerCase() === cleanEntityId);

      if (matchEntity && container.currentApprovedVersion && container.currentApprovedVersion.status === 'APPROVED') {
        return container.currentApprovedVersion;
      }
    }
    return undefined;
  }

  /**
   * Discards the active draft without touching the live approved version.
   */
  public discardDraft(systemKey: string, integrationKey: string): { success: boolean; error?: string } {
    const store = this.loadStore();
    const docKey = this.getDocumentKey(systemKey, integrationKey);
    const container = store[docKey];

    if (!container || !container.activeDraftVersion) {
      return { success: false, error: 'لا توجد مسودة لإلغائها.' };
    }

    const draftId = container.activeDraftVersion.id;
    container.allVersions = container.allVersions.filter(v => v.id !== draftId);
    container.activeDraftVersion = undefined;
    container.updatedAt = new Date().toISOString();

    store[docKey] = container;
    this.saveStore(store);

    return { success: true };
  }
}

export const docGovernanceEngine = DocumentGovernanceEngine.getInstance();
