export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type LifecycleStatus = 
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'TESTING'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'DEPRECATED'
  | 'RETIRED';

export interface EndpointParam {
  name: string;
  type: string;
  req: boolean;
  rule: string;
  tag: string;
  tagClass?: string;
}

export interface BusinessRule {
  id: string;
  name: string;
  err: string;
}

export interface Endpoint {
  id?: string;
  method: HttpMethod;
  path: string;
  shortName: string;
  desc: string;
  descEn?: string;
  params: EndpointParam[];
  rules: BusinessRule[];
  payload?: string;
  res200?: string;
  res422?: string;
  curl?: string;
  isDraft?: boolean;
  statusBadge?: string;
  releaseId?: string;
  responseFields?: Array<{ name: string; type: string; req: string; desc: string }>;
  direction?: IntegrationDirection;
  channels?: ClientChannel[];
  systemKey?: string;
  targetEntities?: string[];
}

export type IntegrationDirection = 'INBOUND' | 'OUTBOUND' | 'BIDIRECTIONAL';
export type ClientChannel = 'MOBILE' | 'WEB' | 'CORE_SERVER' | 'POS';

export type CatalogPerspective = 'systems' | 'sectors';
export type FilterDirection = 'ALL' | 'INBOUND' | 'OUTBOUND';
export type FilterChannel = 'ALL' | 'MOBILE' | 'CORE_SERVER' | 'WEB';

export interface SystemModule {
  key: string;
  name: string;
  nameEn?: string;
  code: string;
  icon: string;
  description?: string;
  descriptionEn?: string;
  associatedSectorKeys?: string[];
}

export interface ServiceDefinition {
  title: string;
  titleEn?: string;
  code: string;
  baseUrl: string;
  versions: string[];
  endpoints: Endpoint[];
}

export interface Sector {
  key: string;
  name: string;
  nameEn?: string;
  code: string;
  icon: string;
  services: Record<string, ServiceDefinition>;
}

export interface ChangeRequest {
  id: string;
  crNumber: string;
  title: string;
  description?: string;
  author: string;
  authorRole: string;
  sectorKey: string;
  endpointPath: string;
  proposedChange: string;
  changeType: 'BREAKING' | 'NON_BREAKING' | 'PATCH';
  recommendedBump: 'MAJOR' | 'MINOR' | 'PATCH';
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SEALED';
  approvals: {
    role: string;
    approver: string;
    approvedAt?: string;
    signed: boolean;
  }[];
  createdAt: string;
}

export interface RBACPermission {
  action: 'view' | 'create' | 'edit' | 'delete' | 'execute' | 'approve' | 'export';
  granted: boolean;
}

export interface RBACRole {
  id: string;
  name: string;
  badge: string;
  description: string;
  desc?: string;
  level?: string;
  permissions: Record<string, boolean>;
}

export interface SealedSnapshot {
  releaseId: string;
  apiCode: string;
  semver: string;
  canonicalSha256: string;
  sealedAt: string;
  signerKmsKey: string;
  endpointsCount: number;
  complianceLevel: string;
}
