import { IPermissionEvaluator } from '../../domain/services/IPermissionEvaluator.js';
import { User } from '../../domain/entities/User.js';
import { UserGroup } from '../../domain/entities/UserGroup.js';

export class PermissionEvaluator implements IPermissionEvaluator {
  calculateEffectivePermissions(user: User, group: UserGroup): string[] {
    // Sovereign admin permissions are frozen and permanently locked to wildcard (*)
    if (
      user.username.toLowerCase() === 'admin' ||
      user.id === 'usr_admin_01' ||
      group.id === 'grp_super_admin' ||
      group.key === 'ADMIN_GROUP' ||
      (group.permissions || []).includes('*')
    ) {
      return ['*'];
    }

    const groupPerms = new Set(group.permissions || []);
    const granted = new Set(user.overrides?.grantedPermissions || []);
    const revoked = new Set(user.overrides?.revokedPermissions || []);

    // 1. Combine Group Permissions with User-specific Granted Permissions
    const effective = new Set<string>();
    for (const p of groupPerms) {
      effective.add(p);
    }
    for (const p of granted) {
      effective.add(p);
    }

    // 2. Strict Precedence: Explicit Deny / Revoked Overrides strictly removed
    for (const r of revoked) {
      effective.delete(r);
    }

    return Array.from(effective);
  }

  hasPermission(effectivePermissions: string[], requiredPermission: string): boolean {
    if (!effectivePermissions || effectivePermissions.length === 0) {
      return false;
    }

    // Global Super-Admin Wildcard
    if (effectivePermissions.includes('*')) {
      return true;
    }

    // Exact Match
    if (effectivePermissions.includes(requiredPermission)) {
      return true;
    }

    // Wildcard prefix matching (e.g. 'catalog:*' matches 'catalog:system:create')
    for (const p of effectivePermissions) {
      if (p.endsWith(':*')) {
        const prefix = p.slice(0, -2);
        if (requiredPermission.startsWith(prefix + ':')) {
          return true;
        }
      }
    }

    return false;
  }

  canAccessResource(
    actor: {
      userType?: 'INTERNAL' | 'EXTERNAL';
      accessScope?: { allowedEntityIds: string[]; allowedSystemIds: string[] };
      effectivePermissions: string[];
    },
    requiredPermission: string,
    context?: { entityId?: string; systemId?: string }
  ): boolean {
    // 1. Base permission check
    if (!this.hasPermission(actor.effectivePermissions, requiredPermission)) {
      return false;
    }

    // 2. Internal users default to full resource scope unless explicitly restricted
    const isExternal = actor.userType === 'EXTERNAL';
    if (!isExternal && !actor.accessScope) {
      return true;
    }

    // 3. Evaluate scope restrictions
    const scope = actor.accessScope;
    if (!scope) {
      // If an external user has no scope configured at all, deny access by default for safety
      return !isExternal;
    }

    // Entity Scope Check
    if (context?.entityId) {
      const allowedEntities = scope.allowedEntityIds || [];
      const hasEntityAccess =
        allowedEntities.includes('*') || allowedEntities.includes(context.entityId);
      if (!hasEntityAccess) {
        return false;
      }
    }

    // System Scope Check
    if (context?.systemId) {
      const allowedSystems = scope.allowedSystemIds || [];
      const hasSystemAccess =
        allowedSystems.includes('*') || allowedSystems.includes(context.systemId);
      if (!hasSystemAccess) {
        return false;
      }
    }

    return true;
  }
}

