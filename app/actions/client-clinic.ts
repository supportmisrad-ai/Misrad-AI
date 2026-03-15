'use server';



import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/server/logger';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import prisma from '@/lib/prisma';
import { asObject, getErrorMessage } from '@/lib/server/workspace-access/utils';
import { Prisma } from '@prisma/client';
import { createClinicSessionForOrganizationId } from '@/lib/services/client-clinic/create-clinic-session';
import { ALLOW_SCHEMA_FALLBACKS, isSchemaMismatchError, reportSchemaFallback } from '@/lib/server/schema-fallbacks';

export type ClinicClient = {
  id: string;
  organizationId: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  metadata?: unknown;
  createdAt?: string;
  updatedAt?: string;
};

export type ClinicTask = {
  id: string;
  organizationId: string;
  clientId: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: string | null;
  dueAt?: string | null;
  assignedTo?: string | null;
  createdBy?: string | null;
  metadata?: unknown;
  createdAt?: string;
  updatedAt?: string;
};

export type ClinicSession = {
  id: string;
  organizationId: string;
  clientId: string;
  startAt: string;
  endAt?: string | null;
  status: string;
  sessionType?: string | null;
  location?: string | null;
  summary?: string | null;
  createdBy?: string | null;
  metadata?: unknown;
  createdAt?: string;
  updatedAt?: string;
};

export type ClinicPortalContent = {
  id: string;
  organizationId: string;
  clientId: string;
  kind: string;
  title: string;
  body?: string | null;
  data?: unknown;
  isPublished?: boolean | null;
  publishedAt?: string | null;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ClinicFeedback = {
  id: string;
  organizationId: string;
  clientId: string;
  rating: number;
  comment?: string | null;
  metadata?: unknown;
  createdAt?: string;
  updatedAt?: string;
};

function iso(d: unknown): string | undefined {
  if (!d) return undefined;
  if (d instanceof Date) return d.toISOString();
  return String(d);
}

function toJsonInput(value: unknown): Prisma.InputJsonValue {
  if (value == null) return {};
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map((v) => toJsonInput(v));
  }

  const obj = asObject(value);
  if (!obj) return {};

  const out: Record<string, Prisma.InputJsonValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = toJsonInput(v);
  }
  return out;
}

function toNullableJsonUpdateValue(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (value === null) return Prisma.JsonNull;
  return toJsonInput(value);
}

async function assertClientInWorkspace(params: { organizationId: string; clientId: string }): Promise<void> {
  const row = await prisma.clientClient.findFirst({
    where: {
      id: String(params.clientId),
      organizationId: String(params.organizationId),
    },
    select: { id: true },
  });

  if (!row?.id) {
    throw new Error('Forbidden');
  }
}

export async function getClinicClients(orgId: string): Promise<ClinicClient[]> {
  if (!orgId) throw new Error('orgId is required');
  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

  try {
    console.debug('[getClinicClients] fetching clients', {
      orgId,
      workspaceId: workspace.id,
    });

    const data = await prisma.clientClient.findMany({
      where: { organizationId: workspace.id },
      select: {
        id: true,
        organizationId: true,
        fullName: true,
        phone: true,
        email: true,
        notes: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const clients = (data || []).map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      fullName: r.fullName,
      phone: r.phone ?? null,
      email: r.email ?? null,
      notes: r.notes ?? null,
      metadata: r.metadata ?? undefined,
      createdAt: iso(r.createdAt),
      updatedAt: iso(r.updatedAt),
    }));

    console.debug('[getClinicClients] clients fetched', {
      count: clients.length,
      clientIds: clients.slice(0, 5).map((c) => c.id),
      clientNames: clients.slice(0, 5).map((c) => c.fullName),
    });

    return clients;
  } catch (e: unknown) {
    if (isSchemaMismatchError(e) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(`[SchemaMismatch] clientClient.findMany failed (${getErrorMessage(e) || 'missing relation'})`);
    }

    if (isSchemaMismatchError(e) && ALLOW_SCHEMA_FALLBACKS) {
      reportSchemaFallback({
        source: 'actions/client-clinic.getClinicClients',
        reason: 'clientClient.findMany failed (fallback to empty array)',
        error: e,
        extras: { orgId },
      });
    }
    const eObj = asObject(e);
    const stack = e instanceof Error ? e.stack : typeof eObj?.stack === 'string' ? eObj.stack : null;
    logger.error('getClinicClients', 'unexpected error', {
      message: getErrorMessage(e),
      stack,
    });
    return [];
  }
}

export async function getClinicClient(orgId: string, clientId: string): Promise<ClinicClient | null> {
  if (!orgId) throw new Error('orgId is required');
  if (!clientId) throw new Error('clientId is required');
  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

  try {
    const data = await prisma.clientClient.findFirst({
      where: { organizationId: workspace.id, id: clientId },
      select: {
        id: true,
        organizationId: true,
        fullName: true,
        phone: true,
        email: true,
        notes: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!data?.id) return null;

    return {
      id: data.id,
      organizationId: data.organizationId,
      fullName: data.fullName,
      phone: data.phone ?? null,
      email: data.email ?? null,
      notes: data.notes ?? null,
      metadata: data.metadata ?? undefined,
      createdAt: iso(data.createdAt),
      updatedAt: iso(data.updatedAt),
    };
  } catch (e: unknown) {
    if (isSchemaMismatchError(e) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(`[SchemaMismatch] clientClient.findFirst failed (${getErrorMessage(e) || 'missing relation'})`);
    }

    if (isSchemaMismatchError(e) && ALLOW_SCHEMA_FALLBACKS) {
      reportSchemaFallback({
        source: 'actions/client-clinic.getClinicClient',
        reason: 'clientClient.findFirst failed (fallback to null)',
        error: e,
        extras: { orgId, clientId },
      });
    }
    return null;
  }
}

export async function createClinicClient(params: {
  orgId: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  metadata?: unknown;
}): Promise<{ id: string }> {
  const { orgId, fullName, phone, email, notes, metadata } = params;
  if (!orgId) throw new Error('orgId is required');
  if (!fullName) throw new Error('fullName is required');

  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

  const created = await prisma.clientClient.create({
    data: {
      organizationId: workspace.id,
      fullName,
      phone: phone ?? null,
      email: email ?? null,
      notes: notes ?? null,
      metadata: toJsonInput(metadata),
    },
    select: { id: true },
  });

  if (!created?.id) throw new Error('Failed to create client');
  revalidatePath('/', 'layout');
  return { id: created.id };
}

export async function updateClinicClient(params: {
  orgId: string;
  clientId: string;
  updates: Partial<Pick<ClinicClient, 'fullName' | 'phone' | 'email' | 'notes' | 'metadata'>>;
}): Promise<{ ok: true }> {
  const { orgId, clientId, updates } = params;
  if (!orgId) throw new Error('orgId is required');
  if (!clientId) throw new Error('clientId is required');

  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

  type ClientClientUpdateManyData = NonNullable<Parameters<typeof prisma.clientClient.updateMany>[0]>['data'];
  const patch: ClientClientUpdateManyData = {};
  if (updates.fullName !== undefined) patch.fullName = updates.fullName;
  if (updates.phone !== undefined) patch.phone = updates.phone;
  if (updates.email !== undefined) patch.email = updates.email;
  if (updates.notes !== undefined) patch.notes = updates.notes;
  if (updates.metadata !== undefined) patch.metadata = toNullableJsonUpdateValue(updates.metadata);

  await prisma.clientClient.update({
    where: { id: clientId },
    data: patch,
  });

  revalidatePath('/', 'layout');

  return { ok: true };
}

export async function listClinicTasks(params: {
  orgId: string;
  clientId?: string;
  status?: string;
}): Promise<ClinicTask[]> {
  const { orgId, clientId, status } = params;
  if (!orgId) throw new Error('orgId is required');

  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

  try {
    const data = await prisma.clientTask.findMany({
      where: {
        organizationId: workspace.id,
        ...(clientId ? { clientId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
    });

    return (data || []).map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      clientId: r.clientId,
      title: r.title,
      description: r.description ?? null,
      status: r.status,
      priority: r.priority ?? null,
      dueAt: iso(r.dueAt) ?? null,
      assignedTo: r.assignedTo ?? null,
      createdBy: r.createdBy ?? null,
      metadata: r.metadata ?? undefined,
      createdAt: iso(r.createdAt),
      updatedAt: iso(r.updatedAt),
    }));
  } catch (e: unknown) {
    if (isSchemaMismatchError(e) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(`[SchemaMismatch] clientTask.findMany failed (${getErrorMessage(e) || 'missing relation'})`);
    }

    if (isSchemaMismatchError(e) && ALLOW_SCHEMA_FALLBACKS) {
      reportSchemaFallback({
        source: 'actions/client-clinic.listClinicTasks',
        reason: 'clientTask.findMany failed (fallback to empty array)',
        error: e,
        extras: { orgId, clientId: clientId ?? null, status: status ?? null },
      });
    }
    return [];
  }
}

export async function createClinicTask(params: {
  orgId: string;
  clientId: string;
  title: string;
  description?: string | null;
  status?: string;
  priority?: string | null;
  dueAt?: string | null;
  assignedTo?: string | null;
  createdBy?: string | null;
  metadata?: unknown;
}): Promise<{ id: string }> {
  const { orgId, clientId, title, description, status, priority, dueAt, assignedTo, createdBy, metadata } = params;
  if (!orgId) throw new Error('orgId is required');
  if (!clientId) throw new Error('clientId is required');
  if (!title) throw new Error('title is required');

  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

  await assertClientInWorkspace({ organizationId: workspace.id, clientId });

  const created = await prisma.clientTask.create({
    data: {
      organizationId: workspace.id,
      clientId,
      title,
      description: description ?? null,
      status: status ?? 'todo',
      priority: priority ?? 'medium',
      dueAt: dueAt ? new Date(dueAt) : null,
      assignedTo: assignedTo ?? null,
      createdBy: createdBy ?? null,
      metadata: toJsonInput(metadata),
    },
    select: { id: true },
  });

  if (!created?.id) throw new Error('Failed to create task');
  revalidatePath('/', 'layout');
  return { id: created.id };
}

export async function updateClinicTask(params: {
  orgId: string;
  taskId: string;
  updates: Partial<Pick<ClinicTask, 'title' | 'description' | 'status' | 'priority' | 'dueAt' | 'assignedTo' | 'metadata'>>;
}): Promise<{ ok: true }> {
  const { orgId, taskId, updates } = params;
  if (!orgId) throw new Error('orgId is required');
  if (!taskId) throw new Error('taskId is required');

  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);
  type ClientTaskUpdateManyData = NonNullable<Parameters<typeof prisma.clientTask.updateMany>[0]>['data'];
  const patch: ClientTaskUpdateManyData = {};
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.priority !== undefined) patch.priority = updates.priority;
  if (updates.dueAt !== undefined) patch.dueAt = updates.dueAt ? new Date(updates.dueAt) : null;
  if (updates.assignedTo !== undefined) patch.assignedTo = updates.assignedTo;
  if (updates.metadata !== undefined) patch.metadata = toNullableJsonUpdateValue(updates.metadata);

  await prisma.clientTask.update({
    where: { id: taskId },
    data: patch,
  });

  revalidatePath('/', 'layout');

  return { ok: true };
}

export async function listClinicSessions(params: {
  orgId: string;
  clientId?: string;
}): Promise<ClinicSession[]> {
  const { orgId, clientId } = params;
  if (!orgId) throw new Error('orgId is required');

  try {
    const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

    const data = await prisma.clientSession.findMany({
      where: {
        organizationId: workspace.id,
        ...(clientId ? { clientId } : {}),
      },
      orderBy: { startAt: 'desc' },
    });

    return (data || []).map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      clientId: r.clientId,
      startAt: iso(r.startAt) ?? '',
      endAt: iso(r.endAt) ?? null,
      status: r.status,
      sessionType: r.sessionType ?? null,
      location: r.location ?? null,
      summary: r.summary ?? null,
      createdBy: r.createdBy ?? null,
      metadata: r.metadata ?? undefined,
      createdAt: iso(r.createdAt),
      updatedAt: iso(r.updatedAt),
    }));
  } catch (e: unknown) {
    if (isSchemaMismatchError(e) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(`[SchemaMismatch] clientSession.findMany failed (${getErrorMessage(e) || 'missing relation'})`);
    }

    if (isSchemaMismatchError(e) && ALLOW_SCHEMA_FALLBACKS) {
      reportSchemaFallback({
        source: 'actions/client-clinic.listClinicSessions',
        reason: 'clientSession.findMany failed (fallback to empty array)',
        error: e,
        extras: { orgId, clientId: clientId ?? null },
      });
    }
    return [];
  }
}

export async function createClinicSession(params: {
  orgId: string;
  clientId: string;
  startAt: string;
  endAt?: string | null;
  status?: string;
  sessionType?: string | null;
  location?: string | null;
  summary?: string | null;
  createdBy?: string | null;
  metadata?: unknown;
}): Promise<{ id: string }> {
  const { orgId, clientId, startAt, endAt, status, sessionType, location, summary, createdBy, metadata } = params;
  if (!orgId) throw new Error('orgId is required');
  if (!clientId) throw new Error('clientId is required');
  if (!startAt) throw new Error('startAt is required');

  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

  await assertClientInWorkspace({ organizationId: workspace.id, clientId });

  return await createClinicSessionForOrganizationId({
    organizationId: workspace.id,
    clientId,
    startAt,
    endAt,
    status,
    sessionType,
    location,
    summary,
    createdBy,
    metadata,
  });
}

export async function listClinicPortalContent(params: {
  orgId: string;
  clientId?: string;
  kind?: string;
  onlyPublished?: boolean;
}): Promise<ClinicPortalContent[]> {
  const { orgId, clientId, kind, onlyPublished } = params;
  if (!orgId) throw new Error('orgId is required');

  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

  try {
    const data = await prisma.clientPortalContent.findMany({
      where: {
        organizationId: workspace.id,
        ...(clientId ? { clientId } : {}),
        ...(kind ? { kind } : {}),
        ...(onlyPublished ? { isPublished: true } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return (data || []).map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      clientId: r.clientId,
      kind: r.kind,
      title: r.title,
      body: r.body ?? null,
      data: r.data ?? undefined,
      isPublished: r.isPublished ?? null,
      publishedAt: iso(r.publishedAt) ?? null,
      createdBy: r.createdBy ?? null,
      createdAt: iso(r.createdAt),
      updatedAt: iso(r.updatedAt),
    }));
  } catch (e: unknown) {
    if (isSchemaMismatchError(e) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(`[SchemaMismatch] clientPortalContent.findMany failed (${getErrorMessage(e) || 'missing relation'})`);
    }
    if (isSchemaMismatchError(e) && ALLOW_SCHEMA_FALLBACKS) {
      reportSchemaFallback({
        source: 'actions/client-clinic.listClinicPortalContent',
        reason: 'clientPortalContent.findMany failed (fallback to empty array)',
        error: e,
        extras: {
          orgId: String(orgId || ''),
          clientId: clientId ? String(clientId) : null,
          kind: kind ? String(kind) : null,
          onlyPublished: typeof onlyPublished === 'boolean' ? onlyPublished : null,
        },
      });
    }
    return [];
  }
}

export async function createClinicPortalContent(params: {
  orgId: string;
  clientId: string;
  kind: string;
  title: string;
  body?: string | null;
  data?: unknown;
  isPublished?: boolean;
  publishedAt?: string | null;
  createdBy?: string | null;
}): Promise<{ id: string }> {
  const { orgId, clientId, kind, title, body, data, isPublished, publishedAt, createdBy } = params;
  if (!orgId) throw new Error('orgId is required');
  if (!clientId) throw new Error('clientId is required');
  if (!kind) throw new Error('kind is required');
  if (!title) throw new Error('title is required');

  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

  await assertClientInWorkspace({ organizationId: workspace.id, clientId });

  const created = await prisma.clientPortalContent.create({
    data: {
      organizationId: workspace.id,
      clientId,
      kind,
      title,
      body: body ?? null,
      data: toJsonInput(data),
      isPublished: isPublished ?? false,
      publishedAt: publishedAt ? new Date(publishedAt) : null,
      createdBy: createdBy ?? null,
    },
    select: { id: true },
  });

  if (!created?.id) throw new Error('Failed to create portal content');
  revalidatePath('/', 'layout');
  return { id: created.id };
}

export async function listClinicFeedbacks(params: {
  orgId: string;
  clientId?: string;
}): Promise<ClinicFeedback[]> {
  const { orgId, clientId } = params;
  if (!orgId) throw new Error('orgId is required');

  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

  try {
    const data = await prisma.clientFeedback.findMany({
      where: {
        organizationId: workspace.id,
        ...(clientId ? { clientId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return (data || []).map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      clientId: r.clientId,
      rating: r.rating,
      comment: r.comment ?? null,
      metadata: r.metadata ?? undefined,
      createdAt: iso(r.createdAt),
      updatedAt: iso(r.updatedAt),
    }));
  } catch (e: unknown) {
    if (isSchemaMismatchError(e) && !ALLOW_SCHEMA_FALLBACKS) {
      throw new Error(`[SchemaMismatch] clientFeedback.findMany failed (${getErrorMessage(e) || 'missing relation'})`);
    }
    if (isSchemaMismatchError(e) && ALLOW_SCHEMA_FALLBACKS) {
      reportSchemaFallback({
        source: 'actions/client-clinic.listClinicFeedbacks',
        reason: 'clientFeedback.findMany failed (fallback to empty array)',
        error: e,
        extras: {
          orgId: String(orgId || ''),
          clientId: clientId ? String(clientId) : null,
        },
      });
      return [];
    }
    logger.error('listClinicFeedbacks', 'unexpected error', {
      message: getErrorMessage(e),
    });
    return [];
  }
}

export async function createClinicFeedback(params: {
  orgId: string;
  clientId: string;
  rating: number;
  comment?: string | null;
  metadata?: unknown;
}): Promise<{ id: string }> {
  const { orgId, clientId, rating, comment, metadata } = params;
  if (!orgId) throw new Error('orgId is required');
  if (!clientId) throw new Error('clientId is required');
  if (!rating || rating < 1 || rating > 10) throw new Error('rating must be between 1 and 10');

  const workspace = await requireWorkspaceAccessByOrgSlug(orgId);

  await assertClientInWorkspace({ organizationId: workspace.id, clientId });

  const created = await prisma.clientFeedback.create({
    data: {
      organizationId: workspace.id,
      clientId,
      rating,
      comment: comment ?? null,
      metadata: toJsonInput(metadata),
    },
    select: { id: true },
  });

  if (!created?.id) throw new Error('Failed to create feedback');
  revalidatePath('/', 'layout');
  return { id: created.id };
}
