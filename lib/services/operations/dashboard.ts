import 'server-only';

import { prisma } from '@/lib/services/operations/db';
import { getUnknownErrorMessage, logOperationsError, toNumberSafe } from '@/lib/services/operations/shared';
import { resolveOperationsClientNamesByCanonicalId } from '@/lib/services/operations/projects';
import type { OperationsDashboardData } from '@/lib/services/operations/types';

type OperationsDashboardProjectRow = {
  id: string;
  title: string;
  status: string;
  canonicalClientId: string | null;
  updatedAt: Date;
};

export async function getOperationsDashboardDataForOrganizationId(params: {
  organizationId: string;
}): Promise<{ success: boolean; data?: OperationsDashboardData; error?: string }> {
  try {
    const recentProjects: OperationsDashboardProjectRow[] = await prisma.operationsProject.findMany({
      where: { organizationId: params.organizationId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        canonicalClientId: true,
        updatedAt: true,
      },
    });

    const canonicalClientIds = Array.from(
      new Set(recentProjects.map((p) => p.canonicalClientId).filter(Boolean))
    ) as string[];

    const clientNameById = await resolveOperationsClientNamesByCanonicalId(canonicalClientIds);

    const inventoryRows = await prisma.operationsInventory.findMany({
      where: { organizationId: params.organizationId },
      select: { onHand: true, minLevel: true },
    });

    let ok = 0;
    let low = 0;
    let critical = 0;

    for (const row of inventoryRows) {
      const onHand = toNumberSafe(row.onHand);
      const minLevel = toNumberSafe(row.minLevel);

      if (onHand <= 0) {
        critical += 1;
        continue;
      }

      if (minLevel > 0 && onHand < minLevel) {
        low += 1;
        continue;
      }

      ok += 1;
    }

    const data: OperationsDashboardData = {
      recentProjects: recentProjects.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        clientName: p.canonicalClientId ? clientNameById.get(p.canonicalClientId) ?? null : null,
        updatedAt: p.updatedAt.toISOString(),
      })),
      inventorySummary: {
        ok,
        low,
        critical,
        total: inventoryRows.length,
      },
    };

    return { success: true, data };
  } catch (e: unknown) {
    logOperationsError('[operations] getOperationsDashboardData failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה בטעינת נתוני הדשבורד',
    };
  }
}
