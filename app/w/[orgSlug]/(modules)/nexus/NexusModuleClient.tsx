'use client';

import { NexusWorkspaceApp } from '@/components/nexus/NexusWorkspaceApp';
import { ReactQueryProvider } from '@/contexts/ReactQueryProvider';
import type { OrganizationProfile, User } from '@/types';

export default function NexusModuleClient({
  initialCurrentUser,
  initialOrganization,
  initialOwnerDashboard,
}: {
  initialCurrentUser?: User;
  initialOrganization?: Partial<OrganizationProfile>;
  initialOwnerDashboard?: unknown;
}) {
  return (
    <ReactQueryProvider>
      <NexusWorkspaceApp
        initialCurrentUser={initialCurrentUser}
        initialOrganization={initialOrganization}
        initialOwnerDashboard={initialOwnerDashboard}
      />
    </ReactQueryProvider>
  );
}
