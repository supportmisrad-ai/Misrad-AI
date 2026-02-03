'use client';

import { NexusWorkspaceApp } from '@/components/nexus/NexusWorkspaceApp';
import { ReactQueryProvider } from '@/contexts/ReactQueryProvider';

export default function NexusModuleClient({
  initialCurrentUser,
  initialOrganization,
  initialOwnerDashboard,
}: {
  initialCurrentUser?: any;
  initialOrganization?: any;
  initialOwnerDashboard?: any;
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
