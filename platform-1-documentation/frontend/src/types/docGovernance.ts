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

export interface DocVersionRecord {
  id: string;
  documentKey: string;
  systemKey: string;
  integrationKey: string;
  versionNumber: string;
  bumpType?: VersionBumpType;
  allowedScope?: ChangeScopeType;
  changeSummary: string;
  status: DocVersionStatus;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
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
  bumpType: VersionBumpType;
  allowedScope?: ChangeScopeType;
  changeSummary: string;
}

