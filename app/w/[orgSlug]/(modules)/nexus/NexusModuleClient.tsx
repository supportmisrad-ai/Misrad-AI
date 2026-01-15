'use client';

import { NexusWorkspaceApp } from '@/components/nexus/NexusWorkspaceApp';
import { useShabbat } from '@/hooks/useShabbat';
import { ShabbatScreen } from '@/components/ShabbatScreen';

export default function NexusModuleClient({
  initialCurrentUser,
  initialOrganization,
  initialOwnerDashboard,
}: {
  initialCurrentUser?: any;
  initialOrganization?: any;
  initialOwnerDashboard?: any;
}) {
  const { isShabbat, isLoading } = useShabbat();

  if (!isLoading && isShabbat) {
    return <ShabbatScreen />;
  }

  return (
    <NexusWorkspaceApp
      initialCurrentUser={initialCurrentUser}
      initialOrganization={initialOrganization}
      initialOwnerDashboard={initialOwnerDashboard}
    />
  );
}
