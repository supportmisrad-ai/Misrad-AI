import 'server-only';

import { Prisma } from '@prisma/client';

import prisma from '@/lib/prisma';

type TimeEntryRow = Prisma.NexusTimeEntryGetPayload<Prisma.NexusTimeEntryDefaultArgs>;

type OrderBy = Prisma.Enumerable<Prisma.NexusTimeEntryOrderByWithRelationInput>;

export async function findNexusTimeEntryRow(params: {
  organizationId: string;
  entryId: string;
}): Promise<TimeEntryRow | null> {
  return prisma.nexusTimeEntry.findFirst({
    where: {
      id: params.entryId,
      organizationId: params.organizationId,
    },
  });
}

export async function listNexusTimeEntryRows(params: {
  organizationId: string;
  where?: Omit<Prisma.NexusTimeEntryWhereInput, 'organizationId'>;
  orderBy?: OrderBy;
  skip?: number;
  take?: number;
}): Promise<TimeEntryRow[]> {
  return prisma.nexusTimeEntry.findMany({
    where: {
      organizationId: params.organizationId,
      ...(params.where ?? {}),
    },
    orderBy: params.orderBy,
    skip: params.skip,
    take: params.take,
  });
}

export async function createNexusTimeEntryRow(params: {
  organizationId: string;
  userId: string;
  startTime: Date;
  endTime: Date | null;
  date: Date;
  durationMinutes: number;
}): Promise<TimeEntryRow> {
  return prisma.nexusTimeEntry.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId,
      startTime: params.startTime,
      endTime: params.endTime,
      date: params.date,
      durationMinutes: params.durationMinutes,
    },
  });
}

export async function updateNexusTimeEntryRowById(params: {
  organizationId: string;
  entryId: string;
  data: Prisma.NexusTimeEntryUpdateManyMutationInput;
}): Promise<{ count: number }> {
  return prisma.nexusTimeEntry.updateMany({
    where: {
      id: params.entryId,
      organizationId: params.organizationId,
    },
    data: params.data,
  });
}

export async function deleteNexusTimeEntryRowById(params: {
  organizationId: string;
  entryId: string;
}): Promise<{ count: number }> {
  return prisma.nexusTimeEntry.deleteMany({
    where: {
      id: params.entryId,
      organizationId: params.organizationId,
    },
  });
}
