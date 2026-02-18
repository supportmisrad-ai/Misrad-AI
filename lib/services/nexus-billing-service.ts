import 'server-only';
import { getNexusOnboardingTemplate } from '@/lib/services/nexus-onboarding-service';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { withTenantIsolationContext } from '@/lib/prisma-tenant-guard';

import { asObject, getErrorMessage } from '@/lib/shared/unknown';
import { ALLOW_SCHEMA_FALLBACKS, isSchemaMismatchError, reportSchemaFallback } from '@/lib/server/schema-fallbacks';

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

type NexusBillingItemRow = Prisma.NexusBillingItemGetPayload<{
  select: { item_key: true; title: true; cadence: true; amount: true; currency: true; updated_at: true };
}>;

function decimalToNumber(value: unknown): number {
  const obj = asObject(value);
  const toNumber = obj?.toNumber;
  if (typeof toNumber === 'function') {
    return Number((toNumber as () => unknown)());
  }
  return Number(value);
}

function isTemplateKey(value: unknown): value is NexusBillingItemsPayload['templateKey'] {
  return value === 'retainer_fixed' || value === 'deliverables_package';
}

function coerceBillingItemsPayload(value: unknown): NexusBillingItemsPayload | null {
  const obj = asObject(value);
  if (!obj) return null;

  const templateKey = isTemplateKey(obj.templateKey) ? obj.templateKey : null;
  if (!templateKey) return null;

  const itemsRaw = (obj as Record<string, unknown>).items;
  if (!Array.isArray(itemsRaw)) return null;

  const items: NexusBillingItem[] = itemsRaw
    .map((it): NexusBillingItem | null => {
      const itObj = asObject(it);
      if (!itObj) return null;
      const key = String(itObj.key || '').trim();
      const title = String(itObj.title || '').trim();
      const cadenceRaw = String(itObj.cadence || '').trim();
      const cadence: NexusBillingCadence = cadenceRaw === 'monthly' ? 'monthly' : 'ad_hoc';
      const amount = itObj.amount == null ? null : Number(itObj.amount);
      const currency = String(itObj.currency || 'ILS');
      if (!key || !title) return null;
      return { key, title, cadence, amount: Number.isFinite(amount as number) ? amount : null, currency };
    })
    .filter((x): x is NexusBillingItem => Boolean(x));

  const updatedAt = obj.updatedAt == null ? undefined : String(obj.updatedAt);
  return { templateKey, items, updatedAt };
}

function isMissingRelationError(error: unknown): boolean {
  const obj = asObject(error);
  const message = String(obj?.message || '').toLowerCase();
  const code = String(obj?.code || '').toLowerCase();
  return code === '42p01' || message.includes('does not exist') || message.includes('relation') || message.includes('table');
}

function isMissingPrismaRelationError(error: unknown): boolean {
  const obj = asObject(error);
  const code = String(obj?.code || '');
  const message = String(obj?.message || '').toLowerCase();
  return code === 'P2021' || message.includes('does not exist') || message.includes('relation') || message.includes('table');
}

export function getNexusBillingItemsSettingsKey(workspaceId: string): string {
  return `nexus_billing_items:${workspaceId}`;
}

export function buildNexusBillingItemsForTemplate(templateKey: 'retainer_fixed' | 'deliverables_package'): NexusBillingItem[] {
  if (templateKey === 'deliverables_package') {
    return [
      {
        key: 'deliverables_monthly_package',
        title: 'חבילת תוצרים חודשית',
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
  try {
    const take = 200;
    const rows: NexusBillingItemRow[] = await prisma.nexusBillingItem.findMany({
      where: { organization_id: workspaceId },
      orderBy: { created_at: 'asc' },
      select: { item_key: true, title: true, cadence: true, amount: true, currency: true, updated_at: true },
      take,
    });

    if (Array.isArray(rows) && rows.length > 0) {
      const onboarding = await getNexusOnboardingTemplate(workspaceId).catch((error: unknown) => {
        if (isSchemaMismatchError(error) && !ALLOW_SCHEMA_FALLBACKS) {
          throw new Error(`[SchemaMismatch] nexus onboarding template lookup failed (${getErrorMessage(error) || 'missing relation'})`);
        }

        if (isSchemaMismatchError(error) && ALLOW_SCHEMA_FALLBACKS) {
          reportSchemaFallback({
            source: 'lib/services/nexus-billing-service.getNexusBillingItems',
            reason: 'nexus onboarding template lookup schema mismatch (fallback to default templateKey)',
            error,
            extras: { organizationId: String(workspaceId) },
          });
        }
        return null;
      });
      const templateKey = (onboarding?.key === 'retainer_fixed' || onboarding?.key === 'deliverables_package')
        ? onboarding.key
        : 'retainer_fixed';

      const items: NexusBillingItem[] = rows.map((r) => ({
        key: String(r.item_key),
        title: String(r.title),
        cadence: String(r.cadence) === 'monthly' ? 'monthly' : 'ad_hoc',
        amount: r.amount == null ? null : decimalToNumber(r.amount),
        currency: String(r.currency || 'ILS'),
      }));

      const updatedAt = rows.reduce<string | undefined>((acc, r) => {
        const ts = r.updated_at ? new Date(r.updated_at).toISOString() : undefined;
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
  } catch (tableError: unknown) {
    if (!isMissingPrismaRelationError(tableError) && !isMissingRelationError(tableError)) {
      throw new Error(getErrorMessage(tableError) || String(tableError));
    }
    if (!ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(`[SchemaMismatch] nexus_billing_items missing table (${getErrorMessage(tableError) || 'missing relation'})`);
    }

    reportSchemaFallback({
      source: 'lib/services/nexus-billing-service.getNexusBillingItems',
      reason: 'nexus_billing_items missing table/column (fallback to legacy storage)',
      error: tableError,
      extras: { organizationId: String(workspaceId) },
    });
  }

  // Fallback: legacy storage
  const key = getNexusBillingItemsSettingsKey(workspaceId);
  let legacy: { value: unknown } | null = null;
  try {
    legacy = await withTenantIsolationContext(
      {
        source: 'lib/services/nexus-billing-service.getNexusBillingItems',
        reason: 'legacy_core_system_settings_read',
        organizationId: String(workspaceId),
      },
      async () =>
        await prisma.coreSystemSettings.findUnique({
          where: { key },
          select: { value: true },
        })
    );
  } catch (error: unknown) {
    if ((isMissingPrismaRelationError(error) || isMissingRelationError(error)) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(`[SchemaMismatch] social_system_settings missing table (${getErrorMessage(error) || 'missing relation'})`);
    }
    throw error;
  }

  if (!legacy?.value) return null;
  return coerceBillingItemsPayload(legacy.value);
}

export async function setNexusBillingItems(params: {
  workspaceId: string;
  templateKey: 'retainer_fixed' | 'deliverables_package';
  items: NexusBillingItem[];
}): Promise<void> {
  const now = new Date().toISOString();
  const rows = params.items.map((i) => ({
    organization_id: params.workspaceId,
    item_key: i.key,
    title: i.title,
    cadence: i.cadence,
    amount: i.amount,
    currency: i.currency || 'ILS',
    updated_at: new Date(now),
  }));

  try {
    await prisma.$transaction(
      rows.map((r) =>
        prisma.nexusBillingItem.upsert({
          where: {
            organization_id_item_key: {
              organization_id: r.organization_id,
              item_key: r.item_key,
            },
          },
          update: {
            organization_id: r.organization_id,
            title: r.title,
            cadence: r.cadence,
            amount: r.amount,
            currency: r.currency,
            updated_at: r.updated_at,
          },
          create: {
            ...r,
            created_at: new Date(),
          },
        })
      )
    );
    return;
  } catch (upsertError: unknown) {
    if (!isMissingPrismaRelationError(upsertError) && !isMissingRelationError(upsertError)) {
      throw new Error(getErrorMessage(upsertError) || String(upsertError));
    }
    if (!ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(`[SchemaMismatch] nexus_billing_items missing table (${getErrorMessage(upsertError) || 'missing relation'})`);
    }

    reportSchemaFallback({
      source: 'lib/services/nexus-billing-service.setNexusBillingItems',
      reason: 'nexus_billing_items missing table/column (fallback to legacy storage)',
      error: upsertError,
      extras: { organizationId: String(params.workspaceId), templateKey: String(params.templateKey) },
    });
  }

  // Fallback: legacy storage
  const key = getNexusBillingItemsSettingsKey(params.workspaceId);
  await withTenantIsolationContext(
    {
      source: 'lib/services/nexus-billing-service.setNexusBillingItems',
      reason: 'legacy_core_system_settings_upsert',
      organizationId: String(params.workspaceId),
    },
    async () =>
      await prisma.coreSystemSettings.upsert({
        where: { key },
        update: {
          value: {
            templateKey: params.templateKey,
            items: params.items,
            updatedAt: now,
          } as Prisma.InputJsonValue,
          updated_at: new Date(now),
        },
        create: {
          key,
          value: {
            templateKey: params.templateKey,
            items: params.items,
            updatedAt: now,
          } as Prisma.InputJsonValue,
          updated_at: new Date(now),
          created_at: new Date(now),
        },
      })
  );
}
