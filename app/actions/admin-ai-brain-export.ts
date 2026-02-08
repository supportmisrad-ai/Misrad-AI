'use server';

import { requireSuperAdmin } from '@/lib/auth';
import { buildAiBrainExport as buildAiBrainExportService } from '@/lib/services/ai/admin-ai-brain-export';

export async function buildAiBrainExport(params: {
  organizationId: string;
}) {
  await requireSuperAdmin();
  return await buildAiBrainExportService(params);
}
