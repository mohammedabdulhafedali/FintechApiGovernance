import { IPermissionEvaluator } from '../../domain/services/IPermissionEvaluator.js';
import { User } from '../../domain/entities/User.js';
import { UserGroup } from '../../domain/entities/UserGroup.js';

export class PermissionEvaluator implements IPermissionEvaluator {
  private static readonly ALIASES_MAP: Record<string, string[]> = {
    'iam:manage': [
      'iam:users:read',
      'iam:users:create',
      'iam:users:update',
      'iam:users:delete',
      'iam:users:*',
      'iam:*'
    ],
    'iam:audit:view': [
      'iam:audit:read',
      'iam:audit:*',
      'audit:trail:read',
      'audit:trail:*',
      'audit:*',
      'iam:manage',
      'iam:*'
    ],
    'catalog:endpoint:create': [
      'catalog:create:create',
      'catalog:create:read',
      'catalog:create',
      'catalog:create:*',
      'catalog:*'
    ],
    'catalog:system:create': [
      'catalog:create:create',
      'catalog:create',
      'catalog:create:*',
      'catalog:*'
    ],
    'catalog:system:delete': [
      'catalog:delete',
      'catalog:delete:delete',
      'catalog:*'
    ],
    'catalog:read': [
      'catalog:view',
      'documentation:systems:read',
      'documentation:systems:*',
      'catalog:spec:export',
      'catalog:*'
    ],
    'catalog:view': [
      'catalog:read',
      'documentation:systems:read',
      'documentation:systems:*',
      'catalog:spec:export',
      'catalog:*'
    ],
    'catalog:spec:export': [
      'catalog:spec:*',
      'catalog:read',
      'catalog:view',
      'documentation:systems:read',
      'catalog:*'
    ],
    'documentation:systems:read': [
      'catalog:read',
      'catalog:view',
      'catalog:spec:export',
      'catalog:*'
    ],
    'governance:inbox:approve': [
      'governance:workflows:update',
      'governance:workflows:create',
      'governance:workflows:*',
      'governance:inbox:update',
      'governance:inbox:*',
      'governance:*'
    ],
    'governance:inbox:read': [
      'governance:workflows:read',
      'governance:workflows:*',
      'governance:inbox:read',
      'governance:inbox:*',
      'governance:*'
    ],
    'dashboard:read': [
      'dashboard:*'
    ],
    'settings:general:read': [
      'settings:general:*',
      'settings:*'
    ]
  };

  calculateEffectivePermissions(user: User, group: UserGroup | UserGroup[]): string[] {
    const groups = Array.isArray(group) ? group : [group];

    // Sovereign admin permissions are frozen and permanently locked to wildcard (*)
    const isSuperAdmin =
      user.username.toLowerCase() === 'admin' ||
      user.id === 'usr_admin_01' ||
      groups.some(
        g =>
          g.id === 'grp_super_admin' ||
          g.key === 'ADMIN_GROUP' ||
          (g.permissions || []).includes('*')
      );

    if (isSuperAdmin) {
      return ['*'];
    }

    // Merge permissions from all groups (Union / Additive Claims)
    const effective = new Set<string>();
    for (const g of groups) {
      for (const p of g.permissions || []) {
        effective.add(p);
      }
    }

    // Add User-specific Granted Permissions
    for (const p of user.overrides?.grantedPermissions || []) {
      effective.add(p);
    }

    // Strict Precedence: Explicit Deny / Revoked Overrides strictly removed along with their aliases
    const revoked = new Set(user.overrides?.revokedPermissions || []);
    for (const r of revoked) {
      effective.delete(r);
      const directAliases = PermissionEvaluator.ALIASES_MAP[r] || [];
      for (const a of directAliases) {
        effective.delete(a);
      }
      for (const [k, v] of Object.entries(PermissionEvaluator.ALIASES_MAP)) {
        if (v.includes(r)) {
          effective.delete(k);
        }
      }
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
        if (requiredPermission.startsWith(prefix + ':') || requiredPermission === prefix) {
          return true;
        }
      }
    }

    const directAliases = PermissionEvaluator.ALIASES_MAP[requiredPermission];
    if (directAliases && directAliases.some(alias => effectivePermissions.includes(alias))) {
      return true;
    }

    // Reverse check: if user has a permission like 'catalog:create' and required is 'catalog:create:create'
    for (const [key, aliases] of Object.entries(PermissionEvaluator.ALIASES_MAP)) {
      if (effectivePermissions.includes(key) && (aliases.includes(requiredPermission) || key === requiredPermission)) {
        return true;
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
    // 1. Base permission check or granular system permission check
    let hasBase = this.hasPermission(actor.effectivePermissions, requiredPermission);
    if (!hasBase && context?.systemId) {
      const sysWildcard = `sys:${context.systemId}:*`;
      if (this.hasPermission(actor.effectivePermissions, sysWildcard) || this.hasPermission(actor.effectivePermissions, 'sys:*')) {
        hasBase = true;
      } else if (context.entityId) {
        const intPrefix = `sys:${context.systemId}:int:${context.entityId}:`;
        if (actor.effectivePermissions.some(p => p.startsWith(intPrefix) || p === `sys:${context.systemId}:int:${context.entityId}`)) {
          hasBase = true;
        }
      }
    }

    if (!hasBase) {
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

