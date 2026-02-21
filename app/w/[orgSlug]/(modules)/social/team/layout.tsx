import React from 'react';

import { requireWorkspaceAccessByOrgSlugUi } from '@/lib/server/workspace';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';
import { computeWorkspaceCapabilities } from '@/lib/server/workspaceCapabilities';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function SocialTeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  // Run workspace access and feature flags in parallel
  const [workspace, systemFlags] = await Promise.all([
    requireWorkspaceAccessByOrgSlugUi(orgSlug),
    getSystemFeatureFlags(),
  ]);
  const caps = computeWorkspaceCapabilities({
    entitlements: workspace?.entitlements,
    fullOfficeRequiresFinance: Boolean(systemFlags.fullOfficeRequiresFinance),
    seatsAllowedOverride: workspace?.seatsAllowed ?? null,
  });

  if (!caps.isTeamManagementEnabled) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" dir="rtl">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-10 text-center max-w-lg">
          <h1 className="text-2xl font-black text-slate-900 mb-3">אין גישה לצוות</h1>
          <p className="text-slate-600 font-bold">מודול צוות אינו פעיל בסביבת העבודה הזו.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
