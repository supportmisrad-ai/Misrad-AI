import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/server/authHelper';
import prisma from '@/lib/prisma';
import { withPrismaTenantIsolationOverride } from '@/lib/prisma-tenant-guard';
import { provisionCurrentUserWorkspaceAction } from '@/app/actions/users';
import { getCustomerAccountForCurrentOrganization } from '@/app/actions/customer-accounts';
import { BILLING_PACKAGES } from '@/lib/billing/pricing';
import WorkspaceOnboardingClient from '@/app/workspaces/onboarding/WorkspaceOnboardingClient';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

async function getCurrentOrganizationKey(): Promise<{
  organizationId: string;
  organizationKey: string;
  subscriptionPlan: string | null;
  orgCreatedAt: Date | null;
  customerAccount: { companyName: string | null; phone: string | null; email: string | null } | null;
}> {
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

    // Use organizationKey from provision result to avoid re-querying profile
    if (res.organizationKey) {
      // organizationKey could be a slug or ID — resolve to organization
      const orgByKey = await prisma.organization.findFirst({
        where: { OR: [{ slug: res.organizationKey }, { id: res.organizationKey }] },
        select: { id: true, slug: true, subscription_plan: true, created_at: true },
      });

      if (orgByKey?.id) {
        const orgKey = String(orgByKey.slug || orgByKey.id);
        // Fetch customer account in parallel with returning (non-blocking)
        const accountRes = await getCustomerAccountForCurrentOrganization({ orgSlug: orgKey });
        return {
          organizationId: orgByKey.id,
          organizationKey: orgKey,
          subscriptionPlan: orgByKey.subscription_plan ?? null,
          orgCreatedAt: orgByKey.created_at ?? null,
          customerAccount: accountRes.success ? (accountRes.data ?? null) : null,
        };
      }
    }

    // Fallback: re-query profile if organizationKey wasn't returned
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

  // Fetch org details and customer account in parallel
  const [org, accountRes] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: String(organizationId) },
      select: { id: true, slug: true, subscription_plan: true, created_at: true },
    }),
    getCustomerAccountForCurrentOrganization({ orgSlug: String(organizationId) }),
  ]);

  const organizationKey = String(org?.slug || org?.id || organizationId);

  // Re-fetch account with correct key if slug differs from ID
  const customerAccount = accountRes.success ? (accountRes.data ?? null) : null;

  return {
    organizationId: String(organizationId),
    organizationKey,
    subscriptionPlan: org?.subscription_plan ?? null,
    orgCreatedAt: org?.created_at ?? null,
    customerAccount,
  };
}

export default async function WorkspaceOnboardingPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}) {
  const { organizationKey, subscriptionPlan, orgCreatedAt, customerAccount } = await getCurrentOrganizationKey();

  const existing = customerAccount;
  const hasCompany = Boolean(existing?.companyName && String(existing.companyName).trim());
  const hasPhone = Boolean(existing?.phone && String(existing.phone).trim());

  if (subscriptionPlan) {
    // Case 1: Customer account exists with full details → onboarding complete
    if (hasCompany && hasPhone) {
      redirect(`/w/${encodeURIComponent(organizationKey)}`);
    }

    // Case 2: No customer_accounts record at all → could be legacy user OR freshly provisioned
    // Legacy users (org older than 10 min) should skip onboarding
    // New users (provisioned with plan from cookie) should complete onboarding
    const LEGACY_THRESHOLD_MS = 10 * 60 * 1000;
    if (!existing && orgCreatedAt) {
      const orgAge = Date.now() - new Date(orgCreatedAt).getTime();
      if (orgAge > LEGACY_THRESHOLD_MS) {
        redirect(`/w/${encodeURIComponent(organizationKey)}`);
      }
    }

    // Case 3: Customer account exists but details missing, OR new org → show form
  }

  const resolvedSearchParams = searchParams ? await Promise.resolve(searchParams) : undefined;
  const planRaw = resolvedSearchParams?.plan;
  const planFromUrl = String(Array.isArray(planRaw) ? planRaw[0] : planRaw || '').trim();
  const planKey = (planFromUrl && Object.prototype.hasOwnProperty.call(BILLING_PACKAGES, planFromUrl))
    ? planFromUrl
    : null;

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
