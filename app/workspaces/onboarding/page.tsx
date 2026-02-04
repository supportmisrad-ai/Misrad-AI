import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/server/authHelper';
import prisma from '@/lib/prisma';
import { provisionCurrentUserWorkspaceAction } from '@/app/actions/users';
import { getCustomerAccountForCurrentOrganization } from '@/app/actions/customer-accounts';
import WorkspaceOnboardingClient from '@/app/workspaces/onboarding/WorkspaceOnboardingClient';

export const dynamic = 'force-dynamic';

async function getCurrentOrganizationKey(): Promise<{ organizationId: string; organizationKey: string }> {
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) {
    redirect('/sign-in');
  }

  const profile = await prisma.profile.findFirst({
    where: { clerkUserId },
    select: { organizationId: true },
  });

  let organizationId: string | null = profile?.organizationId ?? null;

  if (!organizationId) {
    const res = await provisionCurrentUserWorkspaceAction();
    if (!res.success) {
      throw new Error(res.error || 'Failed to provision workspace');
    }

    const profileAfter = await prisma.profile.findFirst({
      where: { clerkUserId },
      select: { organizationId: true },
    });

    organizationId = profileAfter?.organizationId ?? null;
  }

  if (!organizationId) {
    redirect('/workspaces/new');
  }

  const org = await prisma.social_organizations.findUnique({
    where: { id: String(organizationId) },
    select: { id: true, slug: true },
  });

  const organizationKey = String(org?.slug || org?.id || organizationId);
  return { organizationId: String(organizationId), organizationKey };
}

export default async function WorkspaceOnboardingPage() {
  const { organizationKey } = await getCurrentOrganizationKey();
  const accountRes = await getCustomerAccountForCurrentOrganization({ orgSlug: organizationKey });

  const existing = accountRes.success ? accountRes.data : null;
  const hasCompany = Boolean(existing?.companyName && String(existing.companyName).trim());
  const hasPhone = Boolean(existing?.phone && String(existing.phone).trim());

  if (hasCompany && hasPhone) {
    redirect(`/w/${encodeURIComponent(organizationKey)}`);
  }

  return (
    <WorkspaceOnboardingClient
      organizationKey={organizationKey}
      initialCompanyName={existing?.companyName || ''}
      initialPhone={existing?.phone || ''}
      initialEmail={existing?.email || ''}
    />
  );
}
