import { HttpMethod } from '../../types/schema';
export type { HttpMethod };

export type NodeKind = 'OBJECT' | 'FIELD' | 'ARRAY' | 'HEADER' | 'PARAM' | 'CONSTRAINT' | 'CHANNEL';

export type DataType = 
  | 'STRING' 
  | 'NUMBER' 
  | 'BOOLEAN' 
  | 'OBJECT' 
  | 'ARRAY' 
  | 'DECIMAL' 
  | 'UUID' 
  | 'DATE' 
  | 'ENUM';

export type SecurityLevel = 
  | 'PUBLIC' 
  | 'INTERNAL' 
  | 'CONFIDENTIAL_MASKED' 
  | 'RESTRICTED';

export type ReviewStatus = 
  | 'DRAFT' 
  | 'VERIFIED_BY_MAKER' 
  | 'CHANGES_REQUESTED' 
  | 'APPROVED';

export interface StructuralFacet {
  kind: NodeKind;
  path: string;
  order: number;
  isCollapsible?: boolean;
  isExpanded?: boolean;
}

export interface SemanticFacet {
  name: string;
  dataType: DataType;
  businessCategory?: string;
  description: string;
  descriptionEn?: string;
  synonyms?: string[];
}

export interface ConstraintFacet {
  required: boolean;
  minLength?: number;
  maxLength?: number;
  regexPattern?: string;
  allowedValues?: string[] | null;
  minValue?: number;
  maxValue?: number;
}

export interface GovernanceFacet {
  securityLevel: SecurityLevel;
  exampleValue?: string | number | boolean;
  reviewStatus: ReviewStatus;
  addedInVersion?: string;
  comment?: string;
}

export interface IUastNode {
  nodeId: string;
  structure: StructuralFacet;
  semantics: SemanticFacet;
  constraints: ConstraintFacet;
  governance: GovernanceFacet;
  children: IUastNode[];
}

export interface UastChannel {
  protocol: 'REST' | 'SOAP' | 'WEBHOOK' | 'ISO8583' | 'CUSTOM';
  method: HttpMethod;
  endpointPath: string;
  environments: Record<string, string>;
}

export interface ErrorCodeItem {
  code: string;
  message: string;
  action: string;
}

export type DocumentLifecycle = 'ACTIVE' | 'DEPRECATED' | 'RETIRED';

export type DraftStatus = 'PRIVATE_DRAFT' | 'PENDING_REVIEW' | 'CHANGES_REQUESTED' | 'PUBLISHED';

export interface AllEndpointEntry {
  method: HttpMethod;
  path: string;
  summary: string;
  description?: string;
  requestFields?: Array<{ name: string; type: string; required: boolean; description?: string; example?: string; length?: string }>;
  responseFields?: Array<{ name: string; type: string; description?: string; example?: string }>;
  responseExample?: string;
  requestExample?: string;
}

export interface ImportedHeader {
  name: string;
  description: string;
  example?: string;
  required: boolean;
}

export interface UastDocument {
  documentId: string;
  serviceCode: string;
  serviceName: string;
  serviceNameEn?: string;
  semver: string;
  lifecycleStage: DocumentLifecycle;
  sunsetDate?: string;
  channel: UastChannel;
  headers: IUastNode[];
  requestTree: IUastNode;
  response200Tree?: IUastNode;
  response422Tree?: IUastNode;
  errorCodes?: ErrorCodeItem[];
  rawSource?: string;
  rawFormat?: string;
  updatedAt: string;
  status: DraftStatus;
  assignedChecker?: string;
  makerId?: string;
  publishedVersionId?: string;
  systemKey?: string;
  entityId?: string;
  // Extended: full fidelity fields preserved from original file
  allEndpoints?: AllEndpointEntry[];
  importedHeaders?: ImportedHeader[];
  baseUrl?: string;
  overviewText?: string;
}

export interface VersionDiffItem {
  nodeId: string;
  path: string;
  changeType: 'ADDED' | 'DELETED' | 'MODIFIED';
  isBreaking: boolean;
  oldValue?: string;
  newValue?: string;
  description: string;
}

export interface VersionDiffReport {
  baseVersion: string;
  targetVersion: string;
  diffs: VersionDiffItem[];
  hasBreakingChanges: boolean;
  recommendedBump: 'MAJOR' | 'MINOR' | 'PATCH';
  summary: string;
}
