'use client';

import { NexusWorkspaceApp } from '@/components/nexus/NexusWorkspaceApp';
import { ReactQueryProvider } from '@/contexts/ReactQueryProvider';
import type { OrganizationProfile, User, Task } from '@/types';

export default function NexusModuleClient({
  initialCurrentUser,
  initialOrganization,
  initialOwnerDashboard,
  initialOnboardingTemplateKey,
  initialBillingItems,
  initialTasks,
}: {
  initialCurrentUser?: User;
  initialOrganization?: Partial<OrganizationProfile>;
  initialOwnerDashboard?: unknown;
  initialOnboardingTemplateKey?: string | null;
  initialBillingItems?: unknown[] | null;
  initialTasks?: Task[];
}) {
  return (
    <ReactQueryProvider>
      <NexusWorkspaceApp
        initialCurrentUser={initialCurrentUser}
        initialOrganization={initialOrganization}
        initialOwnerDashboard={initialOwnerDashboard}
        initialOnboardingTemplateKey={initialOnboardingTemplateKey}
        initialBillingItems={initialBillingItems}
        initialTasks={initialTasks}
      />
    </ReactQueryProvider>
  );
}
