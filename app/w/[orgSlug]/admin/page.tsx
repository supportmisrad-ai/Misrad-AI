import React from 'react';
import { currentUser } from '@clerk/nextjs/server';
import { DataProvider } from '@/context/DataContext';
import { AdminGuard } from '@/components/AdminGuard';
import { SaaSAdminView } from '@/views/SaaSAdminView';
import { getLiveKPIs } from '@/app/actions/admin-cockpit';

export const dynamic = 'force-dynamic';

export default async function WorkspaceAdminPage() {
  const clerk = await currentUser();

  const initialCurrentUser = clerk
    ? {
        id: clerk.id,
        name:
          clerk.firstName && clerk.lastName
            ? `${clerk.firstName} ${clerk.lastName}`.trim()
            : clerk.firstName || clerk.lastName || 'User',
        email: clerk.emailAddresses?.[0]?.emailAddress || '',
        role: (clerk.publicMetadata?.role as string) || 'עובד',
        avatar: clerk.imageUrl || '',
        online: false,
        capacity: 0,
        isSuperAdmin: Boolean(clerk.publicMetadata?.isSuperAdmin),
        isTenantAdmin: false,
        tenantId: null,
        billingInfo: undefined,
        notificationPreferences: {
          emailNewTask: true,
          browserPush: true,
          morningBrief: true,
          soundEffects: false,
          marketing: true,
        },
      }
    : undefined;

  const live = await getLiveKPIs();
  const initialAdminKPIs = live.success ? live.data : null;

  return (
    <DataProvider initialCurrentUser={initialCurrentUser} initialAdminKPIs={initialAdminKPIs}>
      <AdminGuard>
        <SaaSAdminView />
      </AdminGuard>
    </DataProvider>
  );
}
