'use client';

import { NexusWorkspaceApp } from '@/components/nexus/NexusWorkspaceApp';

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
    <NexusWorkspaceApp
      initialCurrentUser={initialCurrentUser}
      initialOrganization={initialOrganization}
      initialOwnerDashboard={initialOwnerDashboard}
    />
  );
}
