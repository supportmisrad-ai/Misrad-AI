import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth';
import { setNexusOnboardingTemplate } from '@/lib/services/nexus-onboarding-service';
import { setNexusBillingItems, buildNexusBillingItemsForTemplate, type NexusBillingItem } from '@/lib/services/nexus-billing-service';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

import { asObject, getErrorMessage as getUnknownErrorMessage } from '@/lib/shared/unknown';
type UnknownRecord = Record<string, unknown>;

const IS_PROD = process.env.NODE_ENV === 'production';

function isTemplateKey(value: unknown): value is 'retainer_fixed' | 'deliverables_package' {
  return value === 'retainer_fixed' || value === 'deliverables_package';
}

function coerceBillingItems(value: unknown): NexusBillingItem[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const items: NexusBillingItem[] = value
    .map((it): NexusBillingItem | null => {
      const obj = asObject(it);
      if (!obj) return null;
      const key = String(obj.key || '').trim();
      const title = String(obj.title || '').trim();
      const cadenceRaw = String(obj.cadence || '').trim();
      const cadence: NexusBillingItem['cadence'] = cadenceRaw === 'monthly' ? 'monthly' : 'ad_hoc';
      const amount = obj.amount == null ? null : Number(obj.amount);
      const currency = String(obj.currency || 'ILS');
      if (!key || !title) return null;
      return { key, title, cadence, amount: Number.isFinite(amount as number) ? amount : null, currency };
    })
    .filter((x): x is NexusBillingItem => Boolean(x));

  return items.length ? items : null;
}

function legacyKeyOnboarding(workspaceId: string) {
  return `nexus_onboarding_template:${workspaceId}`;
}

function legacyKeyBilling(workspaceId: string) {
  return `nexus_billing_items:${workspaceId}`;
}

async function POSTHandler(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requireSuperAdmin();

    const { workspace } = await getWorkspaceOrThrow(request);

    const onboardingLegacy = await prisma.coreSystemSettings.findUnique({
      where: { key: legacyKeyOnboarding(workspace.id) },
      select: { value: true },
    }).catch((e: unknown) => {
      const safeMsg = 'Failed';
      const msg = getUnknownErrorMessage(e) || safeMsg;
      return NextResponse.json({ error: IS_PROD ? safeMsg : msg }, { status: 500 });
    });

    if (onboardingLegacy instanceof NextResponse) {
      return onboardingLegacy;
    }

    const onboardingValue = onboardingLegacy?.value ?? null;
    const onboardingObj = asObject(onboardingValue);
    const onboardingTemplateKeyRaw = onboardingObj?.key;
    const onboardingSelectedAtRaw = onboardingObj?.selectedAt;

    const onboardingTemplateKey = String(onboardingTemplateKeyRaw || '').trim();
    const onboardingSelectedAt = String(onboardingSelectedAtRaw || '').trim();

    if (isTemplateKey(onboardingTemplateKey)) {
      await setNexusOnboardingTemplate({
        workspaceId: workspace.id,
        templateKey: onboardingTemplateKey,
        selectedAt: onboardingSelectedAt || undefined,
      });
    }

    const billingLegacy = await prisma.coreSystemSettings.findUnique({
      where: { key: legacyKeyBilling(workspace.id) },
      select: { value: true },
    }).catch((e: unknown) => {
      const safeMsg = 'Failed';
      const msg = getUnknownErrorMessage(e) || safeMsg;
      return NextResponse.json({ error: IS_PROD ? safeMsg : msg }, { status: 500 });
    });

    if (billingLegacy instanceof NextResponse) {
      return billingLegacy;
    }

    const billingValue = billingLegacy?.value ?? null;
    const billingObj = asObject(billingValue);
    const legacyBillingTemplateKey = String(billingObj?.templateKey || '').trim();
    const legacyItemsRaw = billingObj?.items;
    const coercedItems = coerceBillingItems(legacyItemsRaw);

    if (isTemplateKey(legacyBillingTemplateKey)) {
      if (coercedItems && coercedItems.length > 0) {
        await setNexusBillingItems({
          workspaceId: workspace.id,
          templateKey: legacyBillingTemplateKey,
          items: coercedItems,
        });
      } else {
        // If billing key exists but items missing, rebuild defaults from template
        await setNexusBillingItems({
          workspaceId: workspace.id,
          templateKey: legacyBillingTemplateKey,
          items: buildNexusBillingItemsForTemplate(legacyBillingTemplateKey),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      migrated: {
        onboardingTemplate: onboardingTemplateKey || null,
        billingTemplate: legacyBillingTemplateKey || null,
        billingItemsCount: coercedItems ? coercedItems.length : null,
      },
    });
  } catch (error: unknown) {
    if (error instanceof APIError) {
      const safeMsg =
        error.status === 400
          ? 'Bad request'
          : error.status === 401
            ? 'Unauthorized'
            : error.status === 404
              ? 'Not found'
              : error.status === 500
                ? 'Internal server error'
                : 'Forbidden';
      const msg = getUnknownErrorMessage(error) || safeMsg;
      return NextResponse.json({ error: IS_PROD ? safeMsg : msg }, { status: error.status });
    }

    const msg = getUnknownErrorMessage(error) || 'Internal server error';
    const status = msg.toLowerCase().includes('unauthorized') ? 401 : msg.toLowerCase().includes('forbidden') ? 403 : 500;
    const safeMsg = status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Internal server error';
    return NextResponse.json({ error: IS_PROD ? safeMsg : msg }, { status });
  }
}

export const POST = shabbatGuard(POSTHandler);
