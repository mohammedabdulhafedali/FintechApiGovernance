export type ScreenActionType = 'read' | 'create' | 'update' | 'delete';

export type UserType = 'INTERNAL' | 'EXTERNAL';

export interface ResourceScope {
  allowedEntityIds: string[];
  allowedSystemIds: string[];
}

export interface ScreenResourceDefinition {
  key: string;
  name: string;
  nameAr: string;
  systemKey?: string;
  systemName?: string;
  systemNameEn?: string;
  category: 'BANKING_OPERATIONS' | 'INTEGRATION_APIS' | 'GOVERNANCE_SYSTEM' | string;
  description: string;
  supportedActions: ScreenActionType[];
}

export interface UserOverrides {
  grantedPermissions: string[];
  revokedPermissions: string[];
}

export interface UserPublicProfile {
  id: string;
  username: string;
  email: string;
  fullName: string;
  groupId: string;
  groupName?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  userType?: UserType;
  organizationId?: string;
  organizationName?: string;
  accessScope?: ResourceScope;
  overrides: UserOverrides;
  effectivePermissions: string[];
  createdAt: string;
}

export interface UserGroup {
  id: string;
  key: string;
  name: string;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  groupType?: UserType;
  defaultScope?: ResourceScope;
  permissions: string[];
  isSystemDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  resource: string;
  status: 'SUCCESS' | 'DENIED' | 'FAILED';
  details?: string;
  timestamp: string;
  ip?: string;
}

export interface PermissionDefinition {
  key: string;
  name: string;
  description: string;
  category: 'CATALOG' | 'IAM' | 'SPEC' | 'FINTECH_OPERATIONS';
  screenKey?: string;
  action?: ScreenActionType;
}
