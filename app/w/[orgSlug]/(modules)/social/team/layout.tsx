import React from 'react';
import { redirect } from 'next/navigation';

import { requireWorkspaceAccessByOrgSlugUi } from '@/lib/server/workspace';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';
import { computeWorkspaceCapabilities } from '@/lib/server/workspaceCapabilities';

export const dynamic = 'force-dynamic';

export default async function SocialTeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const workspace = await requireWorkspaceAccessByOrgSlugUi(orgSlug);
  const systemFlags = await getSystemFeatureFlags();
  const caps = computeWorkspaceCapabilities({
    entitlements: workspace?.entitlements,
    fullOfficeRequiresFinance: Boolean(systemFlags.fullOfficeRequiresFinance),
  });

  if (!caps.isTeamManagementEnabled) {
    redirect(`/w/${orgSlug}/social`);
  }

  return <>{children}</>;
}
