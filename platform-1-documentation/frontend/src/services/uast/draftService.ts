import { UastDocument, DraftStatus, VersionDiffReport } from './types';
import { astDiffEngine } from './diffEngine';

export interface PublishedVersionRecord {
  versionId: string;
  documentId: string;
  serviceCode: string;
  semver: string;
  publishedAt: string;
  publishedBy: string;
  astSnapshot: UastDocument;
  diffSummary?: string;
}

const STORAGE_KEYS = {
  DRAFTS_MAP: 'gov_uast_drafts_map',
  LATEST_ACTIVE_DRAFT: 'gov_uast_latest_active_draft',
  PUBLISHED_VERSIONS: 'gov_uast_published_versions'
};

export class UastDraftService {
  private static instance: UastDraftService;

  private constructor() {}

  public static getInstance(): UastDraftService {
    if (!UastDraftService.instance) {
      UastDraftService.instance = new UastDraftService();
    }
    return UastDraftService.instance;
  }

  // 1. FAST LOCAL AUTOSAVE (Immediate 50ms)
  public saveLocalImmediate(doc: UastDocument): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LATEST_ACTIVE_DRAFT, JSON.stringify(doc));
      localStorage.setItem(`uast_local_${doc.documentId}`, JSON.stringify(doc));
    } catch (e) {
      console.warn('Local autosave failed:', e);
    }
  }

  public getLatestLocalDraft(): UastDocument | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LATEST_ACTIVE_DRAFT);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  // 2. SERVER / STORAGE PERSISTENCE (Debounced 3s or Manual)
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
      localStorage.removeItem(`uast_local_${documentId}`);
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
    // Attach feedback to root node
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

    // Save into published history
    const allVersions = this.getAllPublishedVersions();
    allVersions.unshift(publishedRecord);
    this.saveAllPublishedVersions(allVersions);

    // Update Draft status
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
      const raw = localStorage.getItem(STORAGE_KEYS.DRAFTS_MAP);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private saveAllDraftsMap(map: Record<string, UastDocument>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DRAFTS_MAP, JSON.stringify(map));
    } catch (e) {
      console.warn('Failed to save drafts map:', e);
    }
  }

  private getAllPublishedVersions(): PublishedVersionRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PUBLISHED_VERSIONS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveAllPublishedVersions(list: PublishedVersionRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PUBLISHED_VERSIONS, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to save published versions:', e);
    }
  }
}

export const uastDraftService = UastDraftService.getInstance();
