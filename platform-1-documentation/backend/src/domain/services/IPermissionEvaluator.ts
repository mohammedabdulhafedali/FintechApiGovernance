import { User, ResourceScope } from '../entities/User.js';
import { UserGroup } from '../entities/UserGroup.js';

export interface ScopedAccessContext {
  entityId?: string;
  systemId?: string;
}

export interface IPermissionEvaluator {
  calculateEffectivePermissions(user: User, group: UserGroup | UserGroup[]): string[];
  hasPermission(effectivePermissions: string[], requiredPermission: string): boolean;
  canAccessResource(
    actor: {
      userType?: 'INTERNAL' | 'EXTERNAL';
      accessScope?: ResourceScope;
      effectivePermissions: string[];
    },
    requiredPermission: string,
    context?: ScopedAccessContext
  ): boolean;
}

