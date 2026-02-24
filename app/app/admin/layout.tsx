import React from 'react';
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

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export const metadata: Metadata = getSystemMetadata('admin');

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clerk = await currentUser();

  if (!clerk?.id) {
    redirect('/login?redirect=/app/admin');
  }

  const isSuperAdmin = clerk.publicMetadata?.isSuperAdmin === true;
  const canAccessAdmin = isSuperAdmin ? true : await hasAuditLogAccess();

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
      {canAccessAdmin ? (
        <AdminBiometricGate>
          <AdminPushSetup />
          <AdminNativeUpdatePrompt />
          <AdminShell>{children}</AdminShell>
        </AdminBiometricGate>
      ) : (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="text-xl font-black text-slate-900">גישה נדחתה</div>
            <div className="mt-3 text-sm font-bold text-slate-600">רק סופר אדמין יכול לגשת לאזור הזה.</div>
          </div>
        </div>
      )}
    </DataProvider>
  );
}
