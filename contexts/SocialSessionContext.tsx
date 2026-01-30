'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import type { UserRole } from '@/types/social';

export type SocialSessionContextValue = {
  isAuthenticated: boolean;
  user: any;
  isLoaded: boolean;
  userRole: UserRole;
  isCheckingRole: boolean;
};

const SocialSessionContext = createContext<SocialSessionContextValue | undefined>(undefined);

export function SocialSessionProvider({ children }: { children: React.ReactNode }) {
  const app = useApp();

  const value = useMemo<SocialSessionContextValue>(
    () => ({
      isAuthenticated: app.isAuthenticated,
      user: app.user,
      isLoaded: app.isLoaded,
      userRole: app.userRole,
      isCheckingRole: app.isCheckingRole,
    }),
    [app.isAuthenticated, app.isCheckingRole, app.isLoaded, app.user, app.userRole]
  );

  return <SocialSessionContext.Provider value={value}>{children}</SocialSessionContext.Provider>;
}

export function useSocialSession() {
  const ctx = useContext(SocialSessionContext);
  if (!ctx) throw new Error('useSocialSession must be used within SocialSessionProvider');
  return ctx;
}
