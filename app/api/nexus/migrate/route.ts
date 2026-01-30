import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase';
import { requireSuperAdmin } from '@/lib/auth';
import { setNexusOnboardingTemplate } from '@/lib/services/nexus-onboarding-service';
import { setNexusBillingItems, buildNexusBillingItemsForTemplate } from '@/lib/services/nexus-billing-service';
import { APIError, getWorkspaceOrThrow } from '@/lib/server/api-workspace';

import { shabbatGuard } from '@/lib/api-shabbat-guard';

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

    const supabase = createClient();

    const { data: onboardingLegacy, error: onboardingLegacyError } = await supabase
      .from('social_system_settings')
      .select('value')
      .eq('key', legacyKeyOnboarding(workspace.id))
      .maybeSingle();

    if (onboardingLegacyError) {
      return NextResponse.json({ error: onboardingLegacyError.message }, { status: 500 });
    }

    const onboardingTemplateKey = String((onboardingLegacy?.value as any)?.key || '').trim();
    const onboardingSelectedAt = String((onboardingLegacy?.value as any)?.selectedAt || '').trim();

    if (onboardingTemplateKey === 'retainer_fixed' || onboardingTemplateKey === 'deliverables_package') {
      await setNexusOnboardingTemplate({
        workspaceId: workspace.id,
        templateKey: onboardingTemplateKey,
        selectedAt: onboardingSelectedAt || undefined,
      });
    }

    const { data: billingLegacy, error: billingLegacyError } = await supabase
      .from('social_system_settings')
      .select('value')
      .eq('key', legacyKeyBilling(workspace.id))
      .maybeSingle();

    if (billingLegacyError) {
      return NextResponse.json({ error: billingLegacyError.message }, { status: 500 });
    }

    const legacyBillingTemplateKey = String((billingLegacy?.value as any)?.templateKey || '').trim();
    const items = (billingLegacy?.value as any)?.items;

    if (legacyBillingTemplateKey === 'retainer_fixed' || legacyBillingTemplateKey === 'deliverables_package') {
      if (Array.isArray(items) && items.length > 0) {
        await setNexusBillingItems({
          workspaceId: workspace.id,
          templateKey: legacyBillingTemplateKey,
          items: items,
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
        billingItemsCount: Array.isArray(items) ? items.length : null,
      },
    });
  } catch (error: any) {
    const msg = error?.message || 'Internal server error';
    const status = msg.toLowerCase().includes('forbidden') ? 403 : 500;
    if (error instanceof APIError) {
      return NextResponse.json({ error: msg }, { status: error.status });
    }
    return NextResponse.json({ error: msg }, { status });
  }
}

export const POST = shabbatGuard(POSTHandler);
