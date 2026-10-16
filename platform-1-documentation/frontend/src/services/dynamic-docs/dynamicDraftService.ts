import { UastDocument, DraftStatus } from '../uast/types';
import { PublishedVersionRecord } from '../uast/draftService';
import { astDiffEngine } from '../uast/diffEngine';

const DYNAMIC_STORAGE_KEYS = {
  DRAFTS_MAP: 'gov_dynamic_workbench_drafts_map',
  LATEST_ACTIVE_DRAFT: 'gov_dynamic_workbench_latest_draft',
  PUBLISHED_VERSIONS: 'gov_dynamic_workbench_published'
};

export class DynamicDraftService {
  private static instance: DynamicDraftService;

  private constructor() {}

  public static getInstance(): DynamicDraftService {
    if (!DynamicDraftService.instance) {
      DynamicDraftService.instance = new DynamicDraftService();
    }
    return DynamicDraftService.instance;
  }

  // 1. FAST LOCAL AUTOSAVE
  public saveLocalImmediate(doc: UastDocument): void {
    try {
      localStorage.setItem(DYNAMIC_STORAGE_KEYS.LATEST_ACTIVE_DRAFT, JSON.stringify(doc));
      localStorage.setItem(`dynamic_local_${doc.documentId}`, JSON.stringify(doc));
    } catch (e) {
      console.warn('Local autosave failed for dynamic workbench:', e);
    }
  }

  public getLatestLocalDraft(): UastDocument | null {
    try {
      const raw = localStorage.getItem(DYNAMIC_STORAGE_KEYS.LATEST_ACTIVE_DRAFT);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  // 2. SERVER / STORAGE PERSISTENCE
  public async saveDraft(doc: UastDocument): Promise<UastDocument> {
    const updatedDoc: UastDocument = {
      ...doc,
      updatedAt: new Date().toISOString()
    };

    const drafts = this.getAllDraftsMap();
    drafts[updatedDoc.documentId] = updatedDoc;
    this.saveAllDraftsMap(drafts);
    this.saveLocalImmediate(updatedDoc);

    return updatedDoc;
  }

  public getDraft(documentId: string): UastDocument | null {
    const drafts = this.getAllDraftsMap();
    return drafts[documentId] || null;
  }

  public listDrafts(statusFilter?: DraftStatus): UastDocument[] {
    const drafts = Object.values(this.getAllDraftsMap());
    if (!statusFilter) return drafts;
    return drafts.filter(d => d.status === statusFilter);
  }

  public deleteDraft(documentId: string): void {
    const drafts = this.getAllDraftsMap();
    delete drafts[documentId];
    this.saveAllDraftsMap(drafts);
    try {
      localStorage.removeItem(`dynamic_local_${documentId}`);
    } catch {}
  }

  // 3. MAKER-CHECKER WORKFLOW ACTIONS
  public async submitForReview(documentId: string, supervisorId = 'checker_supervisor_01'): Promise<UastDocument> {
    const doc = this.getDraft(documentId);
    if (!doc) throw new Error('Draft document not found');

    doc.status = 'PENDING_REVIEW';
    doc.assignedChecker = supervisorId;
    doc.updatedAt = new Date().toISOString();

    return this.saveDraft(doc);
  }

  public async requestChanges(documentId: string, feedbackNote: string): Promise<UastDocument> {
    const doc = this.getDraft(documentId);
    if (!doc) throw new Error('Draft document not found');

    doc.status = 'CHANGES_REQUESTED';
    doc.updatedAt = new Date().toISOString();
    doc.requestTree.governance.comment = feedbackNote;

    return this.saveDraft(doc);
  }

  public async approveAndPublish(documentId: string, approverName = 'المشرف الرقابي المعتمد'): Promise<PublishedVersionRecord> {
    const doc = this.getDraft(documentId);
    if (!doc) throw new Error('Draft document not found');

    const publishedRecord: PublishedVersionRecord = {
      versionId: `ver_${Date.now()}`,
      documentId: doc.documentId,
      serviceCode: doc.serviceCode,
      semver: doc.semver,
      publishedAt: new Date().toISOString(),
      publishedBy: approverName,
      astSnapshot: JSON.parse(JSON.stringify(doc))
    };

    const allVersions = this.getAllPublishedVersions();
    allVersions.unshift(publishedRecord);
    this.saveAllPublishedVersions(allVersions);

    doc.status = 'PUBLISHED';
    doc.publishedVersionId = publishedRecord.versionId;
    await this.saveDraft(doc);

    return publishedRecord;
  }

  // 4. PARALLEL BRANCHING & VERSIONING
  public createDraftFromVersion(serviceCode: string, targetNewSemver?: string): UastDocument {
    const history = this.getVersionHistory(serviceCode);
    if (history.length === 0) {
      throw new Error(`No published history found for service: ${serviceCode}`);
    }

    const latestPub = history[0];
    const newDocId = `doc_${Date.now()}`;
    const nextSemver = targetNewSemver || astDiffEngine.computeNextVersion(latestPub.semver, 'MINOR');

    const branchedDraft: UastDocument = {
      ...JSON.parse(JSON.stringify(latestPub.astSnapshot)),
      documentId: newDocId,
      semver: nextSemver,
      status: 'PRIVATE_DRAFT',
      updatedAt: new Date().toISOString(),
      publishedVersionId: latestPub.versionId
    };

    this.saveDraft(branchedDraft);
    return branchedDraft;
  }

  public getVersionHistory(serviceCode: string): PublishedVersionRecord[] {
    const all = this.getAllPublishedVersions();
    return all.filter(v => v.serviceCode.toLowerCase() === serviceCode.toLowerCase());
  }

  // Private storage helpers
  private getAllDraftsMap(): Record<string, UastDocument> {
    try {
      const raw = localStorage.getItem(DYNAMIC_STORAGE_KEYS.DRAFTS_MAP);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private saveAllDraftsMap(map: Record<string, UastDocument>): void {
    try {
      localStorage.setItem(DYNAMIC_STORAGE_KEYS.DRAFTS_MAP, JSON.stringify(map));
    } catch (e) {
      console.warn('Failed to save dynamic drafts map:', e);
    }
  }

  private getAllPublishedVersions(): PublishedVersionRecord[] {
    try {
      const raw = localStorage.getItem(DYNAMIC_STORAGE_KEYS.PUBLISHED_VERSIONS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveAllPublishedVersions(list: PublishedVersionRecord[]): void {
    try {
      localStorage.setItem(DYNAMIC_STORAGE_KEYS.PUBLISHED_VERSIONS, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to save dynamic published versions:', e);
    }
  }
}

export const dynamicDraftService = DynamicDraftService.getInstance();
