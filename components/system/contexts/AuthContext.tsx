'use client';

/**
 * System AuthContext - Uses real authentication from Clerk + API
 * 
 * This replaces the mock authentication with real authentication
 * that integrates with Clerk and the database.
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import { UserProfile, UserRole } from '../types';
import { useAuth as useNexusAuth } from '@/hooks/useAuth';
import { isTenantAdminRole } from '@/lib/constants/roles';

type User = { id?: string; name?: string; email?: string; role?: string; avatar?: string } | undefined;

interface AuthContextType {
  user: UserProfile | null;
  login: (role: UserRole) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  canAccess: (permission: string) => boolean;
  isLoading: boolean;
  isSuperAdmin: boolean;
  isTenantAdmin: boolean;
  organizationId: string | null;
  tenantId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode; initialCurrentUser?: unknown }> = ({
  children,
  initialCurrentUser,
}) => {
  const addToast = (() => {}) as (msg: string, type?: string) => void;
  const nexusAuth = useNexusAuth(addToast, initialCurrentUser as unknown as Parameters<typeof useNexusAuth>[1]);

  let isClerkLoaded = false;
  try {
    const clerk = useUser();
    isClerkLoaded = clerk.isLoaded;
  } catch {
    isClerkLoaded = true;
  }

  const cu = (nexusAuth?.currentUser ?? {}) as unknown as Record<string, unknown>;
  const systemUserId =
    cu.profileId && String(cu.profileId).trim()
      ? String(cu.profileId)
      : nexusAuth?.currentUser?.id;

  const user: UserProfile | null = nexusAuth?.currentUser?.id
    ? {
        id: String(systemUserId || nexusAuth.currentUser.id),
        name: nexusAuth.currentUser.name,
        role: (nexusAuth.currentUser.role as unknown as UserRole) || ('עובד' as UserRole),
        avatar: nexusAuth.currentUser.avatar || '',
        email: nexusAuth.currentUser.email || '',
      }
    : null;

  const isLoading = !isClerkLoaded || nexusAuth.isLoadingCurrentUser;
  const isSuperAdmin = Boolean(nexusAuth.currentUser?.isSuperAdmin);
  const isTenantAdmin = Boolean(nexusAuth.currentUser?.isTenantAdmin);
  const organizationId =
    (nexusAuth.currentUser?.organizationId as string | null) ??
    (nexusAuth.currentUser?.tenantId as string | null) ??
    null;
  const tenantId = organizationId;

  const login = (role: UserRole) => {
    // In real auth, login is handled by Clerk
    // This is kept for backwards compatibility but should not be used
    console.warn('[System Auth] login() called - This should be handled by Clerk');
  };

  const logout = () => {
    // In real auth, logout is handled by Clerk
    // This is kept for backwards compatibility
    nexusAuth.logout();
  };

  const switchRole = (role: UserRole) => {
    // In real auth, role switching is not supported
    // This is kept for backwards compatibility but should not be used
    console.warn('[System Auth] switchRole() called - Role switching is not supported with real auth');
    if (user) {
      const updatedUser = { ...user, role };
      (updatedUser as Record<string, unknown>).role = role;
    }
  };

  const canAccess = (permission: string) => {
    if (!user) return false;
    // Super admins have all permissions
    if (isSuperAdmin) return true;
    // Tenant admins have most permissions (except system management)
    if (isTenantAdmin && permission !== 'manage_system') return true;
    // Check role-based permissions using proper role hierarchy
    if (isTenantAdminRole(user.role as unknown as string)) return true;
    // Add more permission logic here as needed
    return false;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      switchRole, 
      canAccess, 
      isLoading,
      isSuperAdmin,
      isTenantAdmin,
      organizationId,
      tenantId
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

