import 'server-only';
import { createClient } from '@/lib/supabase';
import { getNexusOnboardingTemplate } from '@/lib/services/nexus-onboarding-service';

export type NexusBillingCadence = 'monthly' | 'ad_hoc';

export type NexusBillingItem = {
  key: string;
  title: string;
  cadence: NexusBillingCadence;
  amount: number | null;
  currency: string;
};

export type NexusBillingItemsPayload = {
  templateKey: 'retainer_fixed' | 'deliverables_package';
  items: NexusBillingItem[];
  updatedAt?: string;
};

function isMissingRelationError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase();
  const code = String((error as any)?.code || '').toLowerCase();
  return code === '42p01' || message.includes('does not exist') || message.includes('relation') || message.includes('table');
}

export function getNexusBillingItemsSettingsKey(workspaceId: string): string {
  return `nexus_billing_items:${workspaceId}`;
}

export function buildNexusBillingItemsForTemplate(templateKey: 'retainer_fixed' | 'deliverables_package'): NexusBillingItem[] {
  if (templateKey === 'deliverables_package') {
    return [
      {
        key: 'deliverables_monthly_package',
        title: 'חבילת דליברבלס חודשית',
        cadence: 'monthly',
        amount: null,
        currency: 'ILS',
      },
      {
        key: 'deliverables_addons',
        title: 'תוספות/חריגים (לפי שימוש)',
        cadence: 'ad_hoc',
        amount: null,
        currency: 'ILS',
      },
    ];
  }

  return [
    {
      key: 'retainer_monthly',
      title: 'ריטיינר חודשי קבוע',
      cadence: 'monthly',
      amount: null,
      currency: 'ILS',
    },
    {
      key: 'retainer_extra_hours',
      title: 'שעות/עבודות נוספות מעבר לריטיינר',
      cadence: 'ad_hoc',
      amount: null,
      currency: 'ILS',
    },
  ];
}

export async function getNexusBillingItems(workspaceId: string): Promise<NexusBillingItemsPayload | null> {
  const supabase = createClient();

  const { data: rows, error: tableError } = await supabase
    .from('nexus_billing_items')
    .select('item_key,title,cadence,amount,currency,updated_at')
    .eq('organization_id', workspaceId)
    .order('created_at', { ascending: true });

  if (tableError && !isMissingRelationError(tableError)) {
    throw new Error(tableError.message);
  }

  if (!tableError && Array.isArray(rows) && rows.length > 0) {
    const onboarding = await getNexusOnboardingTemplate(workspaceId).catch(() => null);
    const templateKey = (onboarding?.key === 'retainer_fixed' || onboarding?.key === 'deliverables_package')
      ? onboarding.key
      : 'retainer_fixed';

    const items: NexusBillingItem[] = rows.map((r: any) => ({
      key: String(r.item_key),
      title: String(r.title),
      cadence: String(r.cadence) === 'monthly' ? 'monthly' : 'ad_hoc',
      amount: r.amount == null ? null : Number(r.amount),
      currency: String(r.currency || 'ILS'),
    }));

    const updatedAt = rows.reduce<string | undefined>((acc, r: any) => {
      const ts = r?.updated_at ? String(r.updated_at) : undefined;
      if (!ts) return acc;
      if (!acc) return ts;
      return acc > ts ? acc : ts;
    }, undefined);

    return {
      templateKey,
      items,
      updatedAt,
    };
  }

  // Fallback: legacy storage
  const key = getNexusBillingItemsSettingsKey(workspaceId);
  const { data, error } = await supabase
    .from('social_system_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.value) return null;
  return data.value as any;
}

export async function setNexusBillingItems(params: {
  workspaceId: string;
  templateKey: 'retainer_fixed' | 'deliverables_package';
  items: NexusBillingItem[];
}): Promise<void> {
  const supabase = createClient();

  const now = new Date().toISOString();
  const rows = params.items.map((i) => ({
    organization_id: params.workspaceId,
    item_key: i.key,
    title: i.title,
    cadence: i.cadence,
    amount: i.amount,
    currency: i.currency || 'ILS',
    updated_at: now,
  }));

  const { error: upsertError } = await supabase
    .from('nexus_billing_items')
    .upsert(rows as any, { onConflict: 'organization_id,item_key' });

  if (upsertError && !isMissingRelationError(upsertError)) {
    throw new Error(upsertError.message);
  }

  if (!upsertError) {
    return;
  }

  // Fallback: legacy storage
  const key = getNexusBillingItemsSettingsKey(params.workspaceId);
  const { error } = await supabase
    .from('social_system_settings')
    .upsert(
      {
        key,
        value: {
          templateKey: params.templateKey,
          items: params.items,
          updatedAt: now,
        },
        updated_at: now,
      } as any,
      { onConflict: 'key' }
    );

  if (error) {
    throw new Error(error.message);
  }
}
