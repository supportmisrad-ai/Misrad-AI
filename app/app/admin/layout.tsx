import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { DataProvider } from '@/context/DataContext';
import AdminShell from './AdminShell';
import { getSystemMetadata } from '@/lib/metadata';
import { hasAuditLogAccess } from '@/lib/auth';
import AdminBiometricGate from '@/components/admin/AdminBiometricGate';
import AdminPushSetup from '@/components/admin/AdminPushSetup';
import AdminNativeUpdatePrompt from '@/components/admin/AdminNativeUpdatePrompt';
import { UnifiedLoadingShell } from '@/components/shared/UnifiedLoadingShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = getSystemMetadata('admin');

// Async component for auth check + data — wrapped in Suspense so the layout
// returns instantly with a skeleton instead of blocking on Clerk + DB calls.
async function AdminAccessGate({ children }: { children: React.ReactNode }) {
  const clerk = await currentUser();

  if (!clerk?.id) {
    redirect('/login?redirect=/app/admin');
  }

  const isSuperAdmin = clerk.publicMetadata?.isSuperAdmin === true || (clerk.publicMetadata?.role as string) === 'super_admin';
  const canAccessAdmin = isSuperAdmin ? true : await hasAuditLogAccess();

  if (!canAccessAdmin) {
    redirect('/me');
  }

  const initialCurrentUser = {
    id: '',
    name: clerk.fullName || clerk.username || clerk.primaryEmailAddress?.emailAddress || '',
    email: clerk.primaryEmailAddress?.emailAddress || '',
    role: (clerk.publicMetadata?.role as string) || 'עובד',
    avatar: clerk.imageUrl || '',
    online: false,
    capacity: 0,
    isSuperAdmin,
    isTenantAdmin: false,
    tenantId: null,
    notificationPreferences: {
      emailNewTask: true,
      browserPush: true,
      morningBrief: true,
      soundEffects: false,
      marketing: true,
      pushBehavior: 'vibrate_sound' as const,
      pushCategories: {
        alerts: true,
        tasks: true,
        events: true,
        system: true,
        marketing: false,
      },
    },
  };

  return (
    <DataProvider initialCurrentUser={initialCurrentUser}>
      <AdminBiometricGate>
        <AdminPushSetup />
        <AdminNativeUpdatePrompt />
        <AdminShell>{children}</AdminShell>
      </AdminBiometricGate>
    </DataProvider>
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<UnifiedLoadingShell moduleKey="default" stage="shell" />}>
      <AdminAccessGate>{children}</AdminAccessGate>
    </Suspense>
  );
}
