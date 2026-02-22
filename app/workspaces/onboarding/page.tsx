import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/server/authHelper';
import prisma from '@/lib/prisma';
import { withPrismaTenantIsolationOverride } from '@/lib/prisma-tenant-guard';
import { provisionCurrentUserWorkspaceAction } from '@/app/actions/users';
import { getCustomerAccountForCurrentOrganization } from '@/app/actions/customer-accounts';
import { BILLING_PACKAGES } from '@/lib/billing/pricing';
import WorkspaceOnboardingClient from '@/app/workspaces/onboarding/WorkspaceOnboardingClient';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

async function getCurrentOrganizationKey(): Promise<{ organizationId: string; organizationKey: string; subscriptionPlan: string | null }> {
  const clerkUserId = await getCurrentUserId();
  if (!clerkUserId) {
    redirect('/login?redirect=/workspaces/onboarding');
  }

  const profile = await prisma.profile.findFirst(
    withPrismaTenantIsolationOverride(
      {
        where: { clerkUserId },
        select: { organizationId: true },
      },
      {
        reason: 'onboarding_lookup_org_by_clerk_user_id',
        source: 'app/workspaces/onboarding/page.tsx',
      }
    )
  );

  let organizationId: string | null = profile?.organizationId ?? null;

  if (!organizationId) {
    const res = await provisionCurrentUserWorkspaceAction();
    if (!res.success) {
      throw new Error(res.error || 'Failed to provision workspace');
    }

    const profileAfter = await prisma.profile.findFirst(
      withPrismaTenantIsolationOverride(
        {
          where: { clerkUserId },
          select: { organizationId: true },
        },
        {
          reason: 'onboarding_lookup_org_after_provision',
          source: 'app/workspaces/onboarding/page.tsx',
        }
      )
    );

    organizationId = profileAfter?.organizationId ?? null;
  }

  if (!organizationId) {
    redirect('/workspaces/new');
  }

  const org = await prisma.organization.findUnique({
    where: { id: String(organizationId) },
    select: { id: true, slug: true, subscription_plan: true },
  });

  const organizationKey = String(org?.slug || org?.id || organizationId);
  return { organizationId: String(organizationId), organizationKey, subscriptionPlan: org?.subscription_plan ?? null };
}

export default async function WorkspaceOnboardingPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}) {
  const { organizationKey, subscriptionPlan } = await getCurrentOrganizationKey();
  const accountRes = await getCustomerAccountForCurrentOrganization({ orgSlug: organizationKey });

  // If the org already has a subscription plan, it's fully provisioned.
  // Never allow re-onboarding — redirect to workspace immediately.
  // This prevents authenticated users (e.g. super admin) from accidentally
  // modifying their existing org via marketing CTAs.
  if (subscriptionPlan) {
    redirect(`/w/${encodeURIComponent(organizationKey)}`);
  }

  const existing = accountRes.success ? accountRes.data : null;
  const hasCompany = Boolean(existing?.companyName && String(existing.companyName).trim());
  const hasPhone = Boolean(existing?.phone && String(existing.phone).trim());

  const resolvedSearchParams = searchParams ? await Promise.resolve(searchParams) : undefined;
  const planRaw = resolvedSearchParams?.plan;
  const planFromUrl = String(Array.isArray(planRaw) ? planRaw[0] : planRaw || '').trim();
  const planKey = (planFromUrl && Object.prototype.hasOwnProperty.call(BILLING_PACKAGES, planFromUrl))
    ? planFromUrl
    : null;

  const hasPlan = Boolean(planKey);

  if (hasCompany && hasPhone && hasPlan) {
    redirect(`/w/${encodeURIComponent(organizationKey)}`);
  }

  const seatsRaw = resolvedSearchParams?.seats;
  const seatsStr = String(Array.isArray(seatsRaw) ? seatsRaw[0] : seatsRaw || '').trim();
  const seats = seatsStr && Number.isFinite(Number(seatsStr)) && Number(seatsStr) > 0 ? Math.floor(Number(seatsStr)) : null;

  const moduleRaw = resolvedSearchParams?.module;
  const moduleKey = String(Array.isArray(moduleRaw) ? moduleRaw[0] : moduleRaw || '').trim() || null;

  return (
    <WorkspaceOnboardingClient
      organizationKey={organizationKey}
      initialCompanyName={existing?.companyName || ''}
      initialPhone={existing?.phone || ''}
      initialEmail={existing?.email || ''}
      planKey={planKey}
      seats={seats}
      soloModuleKey={moduleKey}
    />
  );
}
