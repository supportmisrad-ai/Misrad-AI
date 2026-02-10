'use client';

import { NexusWorkspaceApp } from '@/components/nexus/NexusWorkspaceApp';
import { ReactQueryProvider } from '@/contexts/ReactQueryProvider';
import type { OrganizationProfile, User } from '@/types';

export default function NexusModuleClient({
  initialCurrentUser,
  initialOrganization,
  initialOwnerDashboard,
  initialOnboardingTemplateKey,
  initialBillingItems,
}: {
  initialCurrentUser?: User;
  initialOrganization?: Partial<OrganizationProfile>;
  initialOwnerDashboard?: unknown;
  initialOnboardingTemplateKey?: string | null;
  initialBillingItems?: unknown[] | null;
}) {
  return (
    <ReactQueryProvider>
      <NexusWorkspaceApp
        initialCurrentUser={initialCurrentUser}
        initialOrganization={initialOrganization}
        initialOwnerDashboard={initialOwnerDashboard}
        initialOnboardingTemplateKey={initialOnboardingTemplateKey}
        initialBillingItems={initialBillingItems}
      />
    </ReactQueryProvider>
  );
}
