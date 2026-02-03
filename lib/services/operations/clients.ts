import 'server-only';

import { prisma } from '@/lib/services/operations/db';
import { getUnknownErrorMessage } from '@/lib/services/operations/shared';
import type { OperationsClientOption } from '@/lib/services/operations/types';

export async function getOperationsClientOptionsForOrganizationId(params: {
  organizationId: string;
}): Promise<{ success: boolean; data?: OperationsClientOption[]; error?: string }> {
  try {
    const [nexusClients, misradClients, clientClients] = await Promise.all([
      prisma.nexusClient.findMany({
        where: { organizationId: params.organizationId },
        select: { id: true, companyName: true, name: true },
        orderBy: { companyName: 'asc' },
      }),
      prisma.misradClient.findMany({
        where: { organizationId: params.organizationId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.clientClient.findMany({
        where: { organizationId: params.organizationId },
        select: { id: true, fullName: true },
        orderBy: { fullName: 'asc' },
      }),
    ]);

    const options: OperationsClientOption[] = [];
    const seen = new Set<string>();

    for (const c of nexusClients) {
      const id = String(c.id);
      const label = String(c.companyName || c.name || '').trim();
      if (!id || !label || seen.has(id)) continue;
      seen.add(id);
      options.push({ id, label, source: 'nexus' });
    }

    for (const c of misradClients) {
      const id = String(c.id);
      const label = String(c.name || '').trim();
      if (!id || !label || seen.has(id)) continue;
      seen.add(id);
      options.push({ id, label, source: 'misrad' });
    }

    for (const c of clientClients) {
      const id = String(c.id);
      const label = String(c.fullName || '').trim();
      if (!id || !label || seen.has(id)) continue;
      seen.add(id);
      options.push({ id, label, source: 'client' });
    }

    options.sort((a, b) => a.label.localeCompare(b.label, 'he'));
    return { success: true, data: options };
  } catch (e: unknown) {
    console.error('[operations] getOperationsClientOptions failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה בטעינת רשימת הלקוחות',
    };
  }
}
