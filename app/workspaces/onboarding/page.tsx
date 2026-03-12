import { redirect } from 'next/navigation';
import { getCurrentUserId } from '@/lib/server/authHelper';
import prisma from '@/lib/prisma';
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

  const profile = await prisma.profile.findFirst({
    where: { clerkUserId },
    select: { organizationId: true },
  });

  let organizationId: string | null = profile?.organizationId ?? null;

  if (!organizationId) {
    let res: { success: boolean; organizationKey?: string; error?: string } = { success: false };
    let provisionAttempts = 0;
    const MAX_PROVISION_ATTEMPTS = 2;
    
    while (provisionAttempts < MAX_PROVISION_ATTEMPTS) {
      try {
        res = await provisionCurrentUserWorkspaceAction();
        if (res.success) break;
      } catch {
        res = { success: false, error: 'Provision threw unexpectedly' };
      }
      
      provisionAttempts++;
      if (provisionAttempts < MAX_PROVISION_ATTEMPTS) {
        // Fast exponential backoff: 50ms, 200ms (not 750ms fixed)
        const backoffMs = provisionAttempts === 1 ? 50 : 200;
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }

    if (!res.success) {
      // Provision returned failure — redirect to /workspaces/new for retry
      console.error('[Onboarding] provisionCurrentUserWorkspaceAction failed after', provisionAttempts, 'attempts:', res.error);
      redirect('/workspaces/new');
    }

    // Use organizationKey from provision result to avoid re-querying profile
    if (res.organizationKey) {
      // organizationKey could be a slug or ID — resolve to organization
      // IMPORTANT: only query by `id` if value looks like a UUID, otherwise Prisma throws
      // "Inconsistent column data: Error creating UUID" on the @db.Uuid field.
      const keyVal = String(res.organizationKey).trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(keyVal);
      
      // Parallel fetch: organization + customer account
      const [orgByKey, accountRes] = await Promise.all([
        prisma.organization.findFirst({
          where: isUuid
            ? { OR: [{ slug: keyVal }, { id: keyVal }] }
            : { slug: keyVal },
          select: { id: true, slug: true, subscription_plan: true, created_at: true },
        }),
        getCustomerAccountForCurrentOrganization({ orgSlug: keyVal })
          .catch(() => ({ success: false as const, data: null, error: 'lookup failed' })),
      ]);

      if (orgByKey?.id) {
        const orgKey = String(orgByKey.slug || orgByKey.id);
        const customerAccount = accountRes.success ? (accountRes.data ?? null) : null;
        return {
          organizationId: orgByKey.id,
          organizationKey: orgKey,
          subscriptionPlan: orgByKey.subscription_plan ?? null,
          orgCreatedAt: orgByKey.created_at ?? null,
          customerAccount,
        };
      }
    }

    // Fallback: re-query profile if organizationKey wasn't returned
    const profileAfter = await prisma.profile.findFirst({
      where: { clerkUserId },
      select: { organizationId: true },
    });

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
    getCustomerAccountForCurrentOrganization({ orgSlug: String(organizationId) })
      .catch(() => ({ success: false as const, data: null, error: 'lookup failed' })),
  ]);

  const organizationKey = String(org?.slug || org?.id || organizationId);

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

  if (subscriptionPlan && hasCompany && hasPhone) {
    // Onboarding complete — redirect to workspace
    redirect(`/w/${encodeURIComponent(organizationKey)}`);
  }

  // Otherwise: show onboarding form (missing plan, company name, or phone)

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
