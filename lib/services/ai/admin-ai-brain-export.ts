import prisma from '@/lib/prisma';
import { asObject } from '@/lib/shared/unknown';

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
  const organizationId = String(params.organizationId || '').trim();
  if (!organizationId) throw new Error('organizationId is required');

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, slug: true },
  });

  if (!org?.id) throw new Error('Organization not found');

  const settingsRow = await prisma.organization_settings.findUnique({
    where: { organization_id: organizationId },
    select: { ai_dna: true },
  });

  const featureRows = await prisma.ai_feature_settings.findMany({
    where: {
      OR: [{ organization_id: null }, { organization_id: organizationId }],
    },
    orderBy: { feature_key: 'asc' },
  });

  const nowIso = new Date().toISOString();
  const safeSlug =
    String(org.slug || '').trim() ||
    String(org.name || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u0590-\u05FF]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) ||
    org.id;

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
