export type DocVersionStatus = 
  | 'DRAFT' 
  | 'UNDER_REVIEW' 
  | 'APPROVED' 
  | 'SUPERSEDED' 
  | 'REJECTED';

export type VersionBumpType = 'PATCH' | 'MINOR' | 'MAJOR';

export type ChangeScopeType = 
  | 'FULL' 
  | 'ENDPOINTS' 
  | 'FIELDS_TABLE' 
  | 'SECURITY_AUTH' 
  | 'OVERVIEW';

export type IntegrationRole = 'CONSUMER' | 'PROVIDER';

export interface DocClaimInfo {
  userId: string;
  userName: string;
  userEmail?: string;
  lockedAt: string;
}

export interface DocVersionRecord {
  id: string;
  documentKey: string;
  systemKey: string;
  integrationKey: string;
  entityId?: string;
  role?: IntegrationRole;
  versionNumber: string;
  bumpType?: VersionBumpType;
  allowedScope?: ChangeScopeType;
  changeSummary: string;
  status: DocVersionStatus;
  authorId: string;
  authorName: string;
  claimedBy?: DocClaimInfo;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  supervisorNotes?: string;
  endpointsCount: number;
  payloadSnapshot?: any;
}

export interface SystemEntityDocContainer {
  documentKey: string;
  systemKey: string;
  systemName: string;
  systemCode: string;
  integrationKey: string;
  integrationName: string;
  integrationCode: string;
  entityId?: string;
  role?: IntegrationRole;
  isLinked?: boolean;
  hasDocument: boolean;
  currentApprovedVersion?: DocVersionRecord;
  activeDraftVersion?: DocVersionRecord;
  pendingReviewVersion?: DocVersionRecord;
  allVersions: DocVersionRecord[];
  createdAt?: string;
  updatedAt?: string;
}

export interface VersionCreationParams {
  systemKey: string;
  integrationKey: string;
  entityId?: string;
  bumpType: VersionBumpType;
  allowedScope?: ChangeScopeType;
  changeSummary: string;
  supervisorNotes?: string;
}

