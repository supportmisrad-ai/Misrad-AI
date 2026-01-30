'use server';

import { createClient } from '@/lib/supabase';
import { requireSuperAdmin } from '@/lib/auth';

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

type AiBrainExportSnapshot = {
  kind: 'ai_brain_export';
  generated_at: string;
  organization: {
    id: string;
    name: string;
    slug: string | null;
  };
  organization_settings: {
    ai_dna: Record<string, unknown>;
  };
  ai_feature_settings: unknown[];
};

function formatTimestampForFilename(iso: string): string {
  return iso
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .replace('Z', 'Z');
}

export async function buildAiBrainExport(params: {
  organizationId: string;
}): Promise<{
  snapshot: AiBrainExportSnapshot;
  filename: string;
}> {
  await requireSuperAdmin();

  const organizationId = String(params.organizationId || '').trim();
  if (!organizationId) throw new Error('organizationId is required');

  const supabase = createClient();

  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('id', organizationId)
    .maybeSingle();

  if (orgErr) throw new Error(orgErr.message);
  if (!org?.id) throw new Error('Organization not found');

  const { data: settingsRow, error: settingsErr } = await supabase
    .from('organization_settings')
    .select('ai_dna')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (settingsErr) throw new Error(settingsErr.message);

  const { data: featureRows, error: fsErr } = await supabase
    .from('ai_feature_settings')
    .select('*')
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
    .order('feature_key', { ascending: true });

  if (fsErr) throw new Error(fsErr.message);

  const nowIso = new Date().toISOString();
  const safeSlug = String(org.slug || '').trim() || String(org.name || '').trim().toLowerCase().replace(/[^a-z0-9\u0590-\u05FF]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || org.id;

  const settingsObj = asObject(settingsRow);
  const aiDnaObj = asObject(settingsObj?.ai_dna) ?? {};

  const snapshot = {
    kind: 'ai_brain_export',
    generated_at: nowIso,
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug ?? null,
    },
    organization_settings: {
      ai_dna: aiDnaObj,
    },
    ai_feature_settings: featureRows || [],
  } satisfies AiBrainExportSnapshot;

  const filename = `ai-brain-export_${safeSlug}_${formatTimestampForFilename(nowIso)}.json`;

  return { snapshot, filename };
}
