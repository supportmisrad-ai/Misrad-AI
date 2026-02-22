import 'server-only';

import { prisma } from '@/lib/services/operations/db';
import { getUnknownErrorMessage, logOperationsError, normalizeAddress } from '@/lib/services/operations/shared';
import type { OperationsProjectOption, OperationsProjectsData, OperationsProjectDetail } from '@/lib/services/operations/types';

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
    logOperationsError('[operations] getOperationsProjectsData failed', e);
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
    logOperationsError('[operations] getOperationsProjectOptions failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה בטעינת רשימת הפרויקטים',
    };
  }
}

export async function getOperationsProjectByIdForOrganizationId(params: {
  organizationId: string;
  id: string;
}): Promise<{ success: boolean; data?: OperationsProjectDetail; error?: string }> {
  try {
    const id = String(params.id || '').trim();
    if (!id) return { success: false, error: 'חסר מזהה פרויקט' };

    const project = await prisma.operationsProject.findFirst({
      where: { id, organizationId: params.organizationId },
      select: {
        id: true,
        title: true,
        status: true,
        canonicalClientId: true,
        installationAddress: true,
        source: true,
        sourceRefId: true,
        createdAt: true,
        updatedAt: true,
        workOrders: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!project) return { success: false, error: 'פרויקט לא נמצא' };

    const clientNameById = project.canonicalClientId
      ? await resolveOperationsClientNamesByCanonicalId([project.canonicalClientId])
      : new Map<string, string>();

    const data: OperationsProjectDetail = {
      id: project.id,
      title: project.title,
      status: project.status,
      canonicalClientId: project.canonicalClientId,
      clientName: project.canonicalClientId ? clientNameById.get(project.canonicalClientId) ?? null : null,
      installationAddress: project.installationAddress,
      source: project.source,
      sourceRefId: project.sourceRefId,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      workOrders: project.workOrders.map((wo) => ({
        id: wo.id,
        title: wo.title,
        status: wo.status,
        priority: String(wo.priority ?? 'NORMAL'),
        createdAt: wo.createdAt.toISOString(),
      })),
    };

    return { success: true, data };
  } catch (e: unknown) {
    logOperationsError('[operations] getOperationsProjectById failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בטעינת הפרויקט' };
  }
}

export async function updateOperationsProjectForOrganizationId(params: {
  organizationId: string;
  id: string;
  title?: string;
  status?: string;
  canonicalClientId?: string | null;
  installationAddress?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const id = String(params.id || '').trim();
    if (!id) return { success: false, error: 'חסר מזהה פרויקט' };

    const existing = await prisma.operationsProject.findFirst({
      where: { id, organizationId: params.organizationId },
      select: { id: true },
    });
    if (!existing) return { success: false, error: 'פרויקט לא נמצא' };

    const data: Record<string, unknown> = {};
    if (params.title !== undefined) {
      const title = String(params.title).trim();
      if (!title) return { success: false, error: 'חובה להזין שם פרויקט' };
      data.title = title;
    }
    if (params.status !== undefined) {
      data.status = params.status;
    }
    if (params.canonicalClientId !== undefined) {
      data.canonicalClientId = params.canonicalClientId || null;
    }
    if (params.installationAddress !== undefined) {
      const addr = params.installationAddress ? String(params.installationAddress).trim() : null;
      data.installationAddress = addr;
      data.addressNormalized = addr ? normalizeAddress(addr) : null;
    }

    if (Object.keys(data).length === 0) {
      return { success: true };
    }

    await prisma.operationsProject.update({
      where: { id },
      data,
    });

    return { success: true };
  } catch (e: unknown) {
    logOperationsError('[operations] updateOperationsProject failed', e);
    return { success: false, error: getUnknownErrorMessage(e) || 'שגיאה בעדכון הפרויקט' };
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
    logOperationsError('[operations] createOperationsProject failed', e);
    return {
      success: false,
      error: getUnknownErrorMessage(e) || 'שגיאה ביצירת פרויקט',
    };
  }
}
