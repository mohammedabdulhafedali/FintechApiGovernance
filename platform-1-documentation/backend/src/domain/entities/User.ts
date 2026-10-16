export type UserType = 'INTERNAL' | 'EXTERNAL';

export interface ResourceScope {
  allowedEntityIds: string[];
  allowedSystemIds: string[];
}

export interface UserOverrides {
  grantedPermissions: string[];
  revokedPermissions: string[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  passwordHash: string;
  passwordSalt: string;
  groupId: string;
  groupIds?: string[];
  status: 'ACTIVE' | 'SUSPENDED';
  userType?: UserType;
  organizationId?: string;
  organizationName?: string;
  accessScope?: ResourceScope;
  overrides: UserOverrides;
  createdAt: string;
  updatedAt: string;
}

export interface UserPublicProfile {
  id: string;
  username: string;
  email: string;
  fullName: string;
  groupId: string;
  groupIds?: string[];
  groupName?: string;
  groupNames?: string[];
  status: 'ACTIVE' | 'SUSPENDED';
  userType?: UserType;
  organizationId?: string;
  organizationName?: string;
  accessScope?: ResourceScope;
  overrides: UserOverrides;
  effectivePermissions: string[];
  createdAt: string;
}

