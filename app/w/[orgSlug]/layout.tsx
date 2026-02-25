import React from 'react';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import WorkspaceCanonicalRedirect from './WorkspaceCanonicalRedirect';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}


export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;
  const decodedOrgSlug = safeDecodeURIComponent(orgSlug);
  const workspace = await requireWorkspaceAccessByOrgSlug(decodedOrgSlug);

  const suspendedBanner = workspace.subscriptionStatus === 'suspended' || workspace.subscriptionStatus === 'past_due';

  return (
    <div
      data-workspace-id={workspace.id}
      data-workspace-slug={decodedOrgSlug}
      className="min-h-screen bg-[#F8FAFC]"
    >
      <WorkspaceCanonicalRedirect currentOrgSlug={decodedOrgSlug} canonicalSlug={workspace.slug ?? null} />
      {suspendedBanner && (
        <div className="bg-red-600 text-white text-center py-2.5 px-4 text-sm font-bold sticky top-0 z-[9999] shadow-md" dir="rtl">
          ⚠️ החשבון שלך מושעה — תכונות AI אינן זמינות. נא ליצור קשר עם התמיכה להסדרת החוב.
        </div>
      )}
      {children}
    </div>
  );
}
