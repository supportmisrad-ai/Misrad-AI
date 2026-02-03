import 'server-only';

import { prisma } from '@/lib/services/operations/db';
import { getUnknownErrorMessage, normalizeAddress } from '@/lib/services/operations/shared';
import type { OperationsProjectOption, OperationsProjectsData } from '@/lib/services/operations/types';

export async function resolveOperationsClientNamesByCanonicalId(
  canonicalClientIds: string[]
): Promise<Map<string, string>> {
  const [nexusClients, misradClients, clientClients] = await Promise.all([
    canonicalClientIds.length
      ? prisma.nexusClient.findMany({
          where: { id: { in: canonicalClientIds } },
          select: { id: true, companyName: true, name: true },
        })
      : Promise.resolve([]),
    canonicalClientIds.length
      ? prisma.misradClient.findMany({
          where: { id: { in: canonicalClientIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    canonicalClientIds.length
      ? prisma.clientClient.findMany({
          where: { id: { in: canonicalClientIds } },
          select: { id: true, fullName: true },
        })
      : Promise.resolve([]),
  ]);

  const clientNameById = new Map<string, string>();

  for (const c of nexusClients) {
    const id = String(c.id);
    const label = String(c.companyName || c.name || '').trim();
    if (id && label) clientNameById.set(id, label);
  }

  for (const c of misradClients) {
    const id = String(c.id);
    const label = String(c.name || '').trim();
    if (id && label && !clientNameById.has(id)) clientNameById.set(id, label);
  }

  for (const c of clientClients) {
    const id = String(c.id);
    const label = String(c.fullName || '').trim();
    if (id && label && !clientNameById.has(id)) clientNameById.set(id, label);
  }

  return clientNameById;
}

export async function getOperationsProjectsDataForOrganizationId(params: {
  organizationId: string;
}): Promise<{ success: boolean; data?: OperationsProjectsData; error?: string }> {
  try {
    const projects = await prisma.operationsProject.findMany({
      where: { organizationId: params.organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        canonicalClientId: true,
        createdAt: true,
      },
    });

    const canonicalClientIds = Array.from(
      new Set(projects.map((p) => p.canonicalClientId).filter(Boolean))
    ) as string[];

    const clientNameById = await resolveOperationsClientNamesByCanonicalId(canonicalClientIds);

    const data: OperationsProjectsData = {
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        clientName: p.canonicalClientId ? clientNameById.get(p.canonicalClientId) ?? null : null,
        createdAt: p.createdAt.toISOString(),
      })),
    };

    return { success: true, data };
  } catch (e: unknown) {
    console.error('[operations] getOperationsProjectsData failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה בטעינת הפרויקטים',
    };
  }
}

export async function getOperationsProjectOptionsForOrganizationId(params: {
  organizationId: string;
}): Promise<{ success: boolean; data?: OperationsProjectOption[]; error?: string }> {
  try {
    const rows = await prisma.operationsProject.findMany({
      where: { organizationId: params.organizationId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true },
    });

    return {
      success: true,
      data: rows.map((p) => ({ id: p.id, title: p.title })),
    };
  } catch (e: unknown) {
    console.error('[operations] getOperationsProjectOptions failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה בטעינת רשימת הפרויקטים',
    };
  }
}

export async function createOperationsProjectForOrganizationId(params: {
  organizationId: string;
  title: string;
  canonicalClientId: string;
  installationAddress?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const title = String(params.title || '').trim();
    const canonicalClientId = String(params.canonicalClientId || '').trim();
    const installationAddress = String(params.installationAddress || '').trim();

    if (!title) {
      return { success: false, error: 'חובה להזין שם פרויקט' };
    }

    if (!canonicalClientId) {
      return { success: false, error: 'חובה לבחור לקוח' };
    }

    const created = await prisma.operationsProject.create({
      data: {
        organizationId: params.organizationId,
        canonicalClientId,
        title,
        status: 'ACTIVE',
        installationAddress: installationAddress ? installationAddress : null,
        addressNormalized: installationAddress ? normalizeAddress(installationAddress) : null,
      },
      select: { id: true },
    });

    return { success: true, id: created.id };
  } catch (e: unknown) {
    console.error('[operations] createOperationsProject failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה ביצירת פרויקט',
    };
  }
}
