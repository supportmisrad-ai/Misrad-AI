import React from 'react';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { getMyBillingData } from '@/app/actions/my-billing';
import BillingPortalClient from './BillingPortalClient';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export async function generateMetadata({ params }: { params: Promise<{ orgSlug: string }> | { orgSlug: string } }) {
  const { orgSlug } = await params;
  return {
    title: `חיוב ותשלומים | ${orgSlug}`,
    description: 'צפייה בחשבוניות, היסטוריית תשלומים ופרטי מנוי',
  };
}

export default async function BillingPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  await requireWorkspaceAccessByOrgSlug(orgSlug);

  const billingResult = await getMyBillingData(orgSlug);
  const billingData = billingResult.success && billingResult.data ? billingResult.data : null;

  return <BillingPortalClient billingData={billingData} orgSlug={orgSlug} />;
}
