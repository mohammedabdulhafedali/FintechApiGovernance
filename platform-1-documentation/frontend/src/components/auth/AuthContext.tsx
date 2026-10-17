import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserPublicProfile } from '../../types/auth';
import { authService } from '../../services/authService';

interface AuthContextType {
  user: UserPublicProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  canAccess: (permission: string, context?: { entityId?: string; systemId?: string }) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserPublicProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await authService.getMe();
      setUser(profile);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (identifier: string, password: string) => {
    const res = await authService.login(identifier, password);
    setUser(res.user);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user || !user.effectivePermissions) return false;
    const perms = user.effectivePermissions;

    // Super-Admin wildcard
    if (perms.includes('*')) return true;

    // Exact match
    if (perms.includes(permission)) return true;

    // Prefix wildcard (e.g. 'catalog:*')
    for (const p of perms) {
      if (p.endsWith(':*')) {
        const prefix = p.slice(0, -2);
        if (permission.startsWith(prefix + ':') || permission === prefix) return true;
      }
    }

    // Bidirectional Aliasing & Hierarchical Bridging
    const aliasesMap: Record<string, string[]> = {
      'catalog:systems:read': [
        'catalog:systems:read',
        'catalog:systems:*',
        'catalog:system:create',
        'catalog:read',
        'catalog:*'
      ],
      'catalog:sectors:read': [
        'catalog:sectors:read',
        'catalog:sectors:*',
        'catalog:system:create',
        'catalog:read',
        'catalog:*'
      ],
      'catalog:integrations:read': [
        'catalog:integrations:read',
        'catalog:integrations:*',
        'catalog:system:create',
        'catalog:read',
        'catalog:*'
      ],
      'catalog:documents:read': [
        'catalog:documents:read',
        'catalog:documents:*',
        'catalog:endpoint:create',
        'catalog:read',
        'catalog:*'
      ],
      'documentation:dynamic:read': [
        'documentation:dynamic:read',
        'documentation:dynamic:*',
        'catalog:spec:export',
        'documentation:systems:read',
        'catalog:read',
        'catalog:*'
      ],
      'governance:policies:read': [
        'governance:policies:read',
        'governance:policies:*',
        'iam:manage',
        'governance:*'
      ],
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
        'catalog:documents:create',
        'catalog:create:create',
        'catalog:create:read',
        'catalog:create',
        'catalog:create:*',
        'catalog:*'
      ],
      'catalog:system:create': [
        'catalog:systems:create',
        'catalog:sectors:create',
        'catalog:integrations:create',
        'catalog:create:create',
        'catalog:create',
        'catalog:create:*',
        'catalog:*'
      ],
      'catalog:system:delete': [
        'catalog:systems:delete',
        'catalog:sectors:delete',
        'catalog:integrations:delete',
        'catalog:delete',
        'catalog:delete:delete',
        'catalog:*'
      ],
      'catalog:read': [
        'catalog:systems:read',
        'catalog:sectors:read',
        'catalog:integrations:read',
        'catalog:documents:read',
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
        'documentation:dynamic:read',
        'catalog:*'
      ],
      'documentation:systems:read': [
        'catalog:read',
        'catalog:view',
        'catalog:spec:export',
        'documentation:dynamic:read',
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
        'dashboard:*',
        'dashboard:read',
        'dashboard:overview'
      ],
      'settings:general:read': [
        'settings:general:*',
        'settings:*'
      ]
    };

    const directAliases = aliasesMap[permission];
    if (directAliases && directAliases.some(alias => perms.includes(alias))) {
      return true;
    }

    // Reverse check
    for (const [key, aliases] of Object.entries(aliasesMap)) {
      if (perms.includes(key) && (aliases.includes(permission) || key === permission)) {
        return true;
      }
    }

    return false;
  }, [user]);

  const canAccess = useCallback(
    (permission: string, context?: { entityId?: string; systemId?: string; integrationId?: string }): boolean => {
      // 1. Super Admin wildcard always has full access
      if (hasPermission('*')) return true;

      const perms = user?.effectivePermissions || [];

      // 2. Direct permission check or known aliases
      let hasBase = hasPermission(permission);

      // 3. Dynamic system-specific and integration-specific checking
      if (context?.systemId) {
        const sysWildcard = `sys:${context.systemId}:*`;
        if (hasPermission(sysWildcard) || hasPermission('sys:*')) {
          hasBase = true;
        } else if (context.integrationId) {
          const intPrefix = `sys:${context.systemId}:int:${context.integrationId}`;
          if (perms.some(p => p.startsWith(intPrefix) || p === intPrefix)) {
            hasBase = true;
          }
        } else if (context.entityId) {
          const intPrefix = `sys:${context.systemId}:int:${context.entityId}`;
          if (perms.some(p => p.startsWith(intPrefix) || p === intPrefix)) {
            hasBase = true;
          }
        } else {
          // If checking system level without integration: allowed if user has ANY permission in this system
          if (perms.some(p => p.startsWith(`sys:${context.systemId}:`))) {
            hasBase = true;
          }
        }
      }

      if (!hasBase) return false;

      // 4. Scope checks (if configured)
      if (!user) return false;
      const scope = user.accessScope;
      if (!scope) return true;

      // Check system scope
      if (context?.systemId) {
        const allowedSystems = scope.allowedSystemIds || [];
        if (!allowedSystems.includes('*') && !allowedSystems.includes(context.systemId)) {
          return false;
        }
      }

      // Check entity scope (only when explicit entityId is provided)
      if (context?.entityId && !context?.integrationId) {
        const allowedEntities = scope.allowedEntityIds || [];
        if (!allowedEntities.includes('*') && !allowedEntities.includes(context.entityId)) {
          return false;
        }
      }

      return true;
    },
    [user, hasPermission]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        refreshUser,
        hasPermission,
        canAccess
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
