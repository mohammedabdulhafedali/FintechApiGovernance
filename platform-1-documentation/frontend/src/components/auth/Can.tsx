import React from 'react';
import { useAuth } from './AuthContext';

interface CanProps {
  perform: string;
  entityId?: string;
  systemId?: string;
  children: React.ReactNode;
}

/**
 * Can Component: Enforces Total Visual Hiding with Resource Scoping.
 * If the current authenticated user lacks the required permission or scope,
 * the children are completely excluded from rendering (returns null).
 */
export const Can: React.FC<CanProps> = ({ perform, entityId, systemId, children }) => {
  const { canAccess } = useAuth();

  if (!canAccess(perform, { entityId, systemId })) {
    return null;
  }

  return <>{children}</>;
};

