import 'server-only';

import { Prisma } from '@prisma/client';

import prisma from '@/lib/prisma';

type NexusTaskRow = Prisma.NexusTaskGetPayload<Prisma.NexusTaskDefaultArgs>;

type OrderBy = Prisma.Enumerable<Prisma.NexusTaskOrderByWithRelationInput>;

export async function findNexusTaskRow(params: {
  organizationId: string;
  taskId: string;
}): Promise<NexusTaskRow | null> {
  return prisma.nexusTask.findFirst({
    where: {
      id: params.taskId,
      organizationId: params.organizationId,
    },
  });
}

export async function listNexusTaskRows(params: {
  organizationId: string;
  where?: Omit<Prisma.NexusTaskWhereInput, 'organizationId'>;
  orderBy?: OrderBy;
  skip?: number;
  take?: number;
}): Promise<NexusTaskRow[]> {
  return prisma.nexusTask.findMany({
    where: {
      organizationId: params.organizationId,
      ...(params.where ?? {}),
    },
    orderBy: params.orderBy,
    skip: params.skip,
    take: params.take,
  });
}

export async function createNexusTaskRow(params: {
  data: Prisma.NexusTaskCreateArgs['data'];
}): Promise<NexusTaskRow> {
  return prisma.nexusTask.create({
    data: params.data,
  });
}

export async function updateNexusTaskRowsById(params: {
  organizationId: string;
  taskId: string;
  data: Prisma.NexusTaskUpdateManyMutationInput;
}): Promise<{ count: number }> {
  return prisma.nexusTask.updateMany({
    where: {
      id: params.taskId,
      organizationId: params.organizationId,
    },
    data: params.data,
  });
}

export async function deleteNexusTaskRowsById(params: {
  organizationId: string;
  taskId: string;
}): Promise<{ count: number }> {
  return prisma.nexusTask.deleteMany({
    where: {
      id: params.taskId,
      organizationId: params.organizationId,
    },
  });
}

/**
 * Find a task by its public share token (no org scoping needed — token is unique).
 * Returns null if not found or if the task is private.
 */
export async function findNexusTaskByShareToken(
  shareToken: string,
): Promise<(NexusTaskRow & { organization: { name: string; logo: string | null } }) | null> {
  return prisma.nexusTask.findUnique({
    where: { shareToken },
    include: { organization: { select: { name: true, logo: true } } },
  }) as Promise<(NexusTaskRow & { organization: { name: string; logo: string | null } }) | null>;
}

/**
 * Find a task by its internal ID without org scoping (for backward-compatible guest links).
 * Returns null if not found or if the task is private.
 */
export async function findNexusTaskByIdPublic(
  taskId: string,
): Promise<(NexusTaskRow & { organization: { name: string; logo: string | null } }) | null> {
  return prisma.nexusTask.findFirst({
    where: { id: taskId, isPrivate: false },
    include: { organization: { select: { name: true, logo: true } } },
  }) as Promise<(NexusTaskRow & { organization: { name: string; logo: string | null } }) | null>;
}

/**
 * Set the share token on a task. Used when generating a share link.
 */
export async function setNexusTaskShareToken(params: {
  organizationId: string;
  taskId: string;
  shareToken: string;
}): Promise<{ count: number }> {
  return prisma.nexusTask.updateMany({
    where: {
      id: params.taskId,
      organizationId: params.organizationId,
    },
    data: { shareToken: params.shareToken },
  });
}
