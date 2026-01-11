import 'server-only';
import { createClient } from '@/lib/supabase';

export type NexusOnboardingTemplateKey = 'retainer_fixed' | 'deliverables_package';

export type NexusOnboardingTemplatePayload = {
  key: NexusOnboardingTemplateKey;
  selectedAt?: string;
};

export function getNexusOnboardingSettingsKey(workspaceId: string): string {
  return `nexus_onboarding_template:${workspaceId}`;
}

function isMissingRelationError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase();
  const code = String((error as any)?.code || '').toLowerCase();
  return code === '42p01' || message.includes('does not exist') || message.includes('relation') || message.includes('table');
}

export async function getNexusOnboardingTemplate(workspaceId: string): Promise<NexusOnboardingTemplatePayload | null> {
  const supabase = createClient();

  const { data: row, error } = await supabase
    .from('nexus_onboarding_settings')
    .select('template_key, selected_at')
    .eq('organization_id', workspaceId)
    .maybeSingle();

  if (error && !isMissingRelationError(error)) {
    throw new Error(error.message);
  }

  if (!error && row?.template_key) {
    return {
      key: row.template_key as any,
      selectedAt: row.selected_at ? String(row.selected_at) : undefined,
    };
  }

  // Fallback: legacy storage
  const legacyKey = getNexusOnboardingSettingsKey(workspaceId);
  const legacy = await supabase
    .from('social_system_settings')
    .select('value')
    .eq('key', legacyKey)
    .maybeSingle();

  if (legacy.error) {
    throw new Error(legacy.error.message);
  }

  const value = legacy.data?.value as any;
  if (!value?.key) return null;
  return {
    key: value.key,
    selectedAt: value.selectedAt,
  };
}

export async function setNexusOnboardingTemplate(params: {
  workspaceId: string;
  templateKey: NexusOnboardingTemplateKey;
  selectedAt?: string;
}): Promise<void> {
  const supabase = createClient();

  const selectedAt = params.selectedAt || new Date().toISOString();

  const { error } = await supabase
    .from('nexus_onboarding_settings')
    .upsert(
      {
        organization_id: params.workspaceId,
        template_key: params.templateKey,
        selected_at: selectedAt,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: 'organization_id' }
    );

  if (error && !isMissingRelationError(error)) {
    throw new Error(error.message);
  }

  if (!error) {
    return;
  }

  // Fallback: legacy storage
  const legacyKey = getNexusOnboardingSettingsKey(params.workspaceId);
  const legacy = await supabase
    .from('social_system_settings')
    .upsert(
      {
        key: legacyKey,
        value: {
          key: params.templateKey,
          selectedAt,
        },
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: 'key' }
    );

  if (legacy.error) {
    throw new Error(legacy.error.message);
  }
}
