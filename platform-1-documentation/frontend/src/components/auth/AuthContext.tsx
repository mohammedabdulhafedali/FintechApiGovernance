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
        if (permission.startsWith(prefix + ':')) return true;
      }
    }

    return false;
  }, [user]);

  const canAccess = useCallback(
    (permission: string, context?: { entityId?: string; systemId?: string }): boolean => {
      // 1. Basic permission check
      if (!hasPermission(permission)) return false;

      if (!user) return false;
      const isExternal = user.userType === 'EXTERNAL';
      if (!isExternal && !user.accessScope) return true;

      const scope = user.accessScope;
      if (!scope) return !isExternal;

      // Check entity scope
      if (context?.entityId) {
        const allowed = scope.allowedEntityIds || [];
        if (!allowed.includes('*') && !allowed.includes(context.entityId)) {
          return false;
        }
      }

      // Check system scope
      if (context?.systemId) {
        const allowed = scope.allowedSystemIds || [];
        if (!allowed.includes('*') && !allowed.includes(context.systemId)) {
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
