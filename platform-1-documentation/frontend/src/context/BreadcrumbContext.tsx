import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface BreadcrumbItem {
  id?: string;
  label: string;
  onClick?: () => void;
  href?: string;
  isCurrent?: boolean;
  icon?: React.ReactNode;
}

interface BreadcrumbContextType {
  breadcrumbs: BreadcrumbItem[];
  setBreadcrumbs: (items: BreadcrumbItem[]) => void;
  resetBreadcrumbs: () => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export const BreadcrumbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [breadcrumbs, setBreadcrumbsState] = useState<BreadcrumbItem[]>([]);

  const setBreadcrumbs = useCallback((items: BreadcrumbItem[]) => {
    setBreadcrumbsState(items);
  }, []);

  const resetBreadcrumbs = useCallback(() => {
    setBreadcrumbsState([]);
  }, []);

  return (
    <BreadcrumbContext.Provider value={{ breadcrumbs, setBreadcrumbs, resetBreadcrumbs }}>
      {children}
    </BreadcrumbContext.Provider>
  );
};

export const useBreadcrumbs = (): BreadcrumbContextType => {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error('useBreadcrumbs must be used within a BreadcrumbProvider');
  }
  return context;
};

/**
 * Hook to set breadcrumbs declaratively on component mount/update and reset on unmount
 */
export const useSetBreadcrumbs = (items: BreadcrumbItem[], deps: any[] = []) => {
  const { setBreadcrumbs, resetBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    if (items && items.length > 0) {
      setBreadcrumbs(items);
    } else {
      resetBreadcrumbs();
    }

    return () => {
      resetBreadcrumbs();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
