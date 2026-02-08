import 'server-only';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

import { asObject, getErrorMessage } from '@/lib/shared/unknown';
const ALLOW_SCHEMA_FALLBACKS = String(process.env.MISRAD_ALLOW_SCHEMA_FALLBACKS || '').toLowerCase() === 'true';

export type NexusOnboardingTemplateKey = 'retainer_fixed' | 'deliverables_package';

export type NexusOnboardingTemplatePayload = {
  key: NexusOnboardingTemplateKey;
  selectedAt?: string;
};

export function getNexusOnboardingSettingsKey(workspaceId: string): string {
  return `nexus_onboarding_template:${workspaceId}`;
}

function isTemplateKey(value: unknown): value is NexusOnboardingTemplateKey {
  return value === 'retainer_fixed' || value === 'deliverables_package';
}

function coerceTemplatePayload(value: unknown): NexusOnboardingTemplatePayload | null {
  const obj = asObject(value);
  if (!obj) return null;
  if (!isTemplateKey(obj.key)) return null;
  const selectedAt = obj.selectedAt == null ? undefined : String(obj.selectedAt);
  return { key: obj.key, selectedAt };
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

export async function getNexusOnboardingTemplate(workspaceId: string): Promise<NexusOnboardingTemplatePayload | null> {
  try {
    const row = await prisma.nexus_onboarding_settings.findUnique({
      where: { organization_id: workspaceId },
      select: { template_key: true, selected_at: true },
    });

    if (row?.template_key) {
      const key = isTemplateKey(row.template_key) ? row.template_key : null;
      if (!key) return null;
      return {
        key,
        selectedAt: row.selected_at ? new Date(row.selected_at).toISOString() : undefined,
      };
    }
  } catch (error: unknown) {
    if (!isMissingPrismaRelationError(error) && !isMissingRelationError(error)) {
      throw new Error(getErrorMessage(error) || String(error));
    }
    if (!ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(`[SchemaMismatch] nexus_onboarding_settings missing table (${getErrorMessage(error) || 'missing relation'})`);
    }
  }

  // Fallback: legacy storage
  const legacyKey = getNexusOnboardingSettingsKey(workspaceId);
  let legacy: { value: unknown } | null = null;
  try {
    legacy = await prisma.social_system_settings.findUnique({
      where: { key: legacyKey },
      select: { value: true },
    });
  } catch (error: unknown) {
    if ((isMissingPrismaRelationError(error) || isMissingRelationError(error)) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(`[SchemaMismatch] social_system_settings missing table (${getErrorMessage(error) || 'missing relation'})`);
    }
    throw error;
  }

  return coerceTemplatePayload(legacy?.value);
}

export async function setNexusOnboardingTemplate(params: {
  workspaceId: string;
  templateKey: NexusOnboardingTemplateKey;
  selectedAt?: string;
}): Promise<void> {
  const selectedAt = params.selectedAt || new Date().toISOString();

  try {
    await prisma.nexus_onboarding_settings.upsert({
      where: { organization_id: params.workspaceId },
      update: {
        template_key: params.templateKey,
        selected_at: new Date(selectedAt),
        updated_at: new Date(),
      },
      create: {
        organization_id: params.workspaceId,
        template_key: params.templateKey,
        selected_at: new Date(selectedAt),
        updated_at: new Date(),
        created_at: new Date(),
      },
    });
    return;
  } catch (error: unknown) {
    if (!isMissingPrismaRelationError(error) && !isMissingRelationError(error)) {
      throw new Error(getErrorMessage(error) || String(error));
    }
    if (!ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(`[SchemaMismatch] nexus_onboarding_settings missing table (${getErrorMessage(error) || 'missing relation'})`);
    }
  }

  // Fallback: legacy storage
  const legacyKey = getNexusOnboardingSettingsKey(params.workspaceId);
  await prisma.social_system_settings.upsert({
    where: { key: legacyKey },
    update: {
      value: {
        key: params.templateKey,
        selectedAt,
      } as Prisma.InputJsonValue,
      updated_at: new Date(),
    },
    create: {
      key: legacyKey,
      value: {
        key: params.templateKey,
        selectedAt,
      } as Prisma.InputJsonValue,
      updated_at: new Date(),
      created_at: new Date(),
    },
  });
}
