import { User, UserType, ResourceScope } from '../entities/User.js';
import { UserGroup } from '../entities/UserGroup.js';

export interface TokenPayload {
  sub?: string;
  iss?: string;
  aud?: string;
  userId: string;
  username: string;
  email: string;
  fullName: string;
  groupId: string;
  groupName: string;
  userType?: UserType;
  organizationId?: string;
  organizationName?: string;
  accessScope?: ResourceScope;
  effectivePermissions: string[];
  iat?: number;
  exp?: number;
}

export interface ITokenService {
  issueToken(user: User, group: UserGroup, effectivePermissions: string[]): string;
  verifyToken(token: string): TokenPayload | null;
}

