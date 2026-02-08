import 'server-only';

import { Prisma } from '@prisma/client';

import prisma from '@/lib/prisma';

type NexusUserRow = Prisma.NexusUserGetPayload<Prisma.NexusUserDefaultArgs>;

type OrderBy = Prisma.Enumerable<Prisma.NexusUserOrderByWithRelationInput>;

type Select = Prisma.NexusUserSelect;

export async function findNexusUserRowById(params: {
  organizationId: string;
  userId: string;
  department?: string;
  select?: undefined;
}): Promise<NexusUserRow | null>;
export async function findNexusUserRowById<TSelect extends Select>(params: {
  organizationId: string;
  userId: string;
  department?: string;
  select: TSelect;
}): Promise<Prisma.NexusUserGetPayload<{ select: TSelect }> | null>;
export async function findNexusUserRowById(params: {
  organizationId: string;
  userId: string;
  department?: string;
  select?: Select;
}): Promise<unknown> {
  const where = {
    id: params.userId,
    organizationId: params.organizationId,
    ...(params.department ? { department: params.department } : {}),
  };
  if (params.select) {
    return prisma.nexusUser.findFirst({ where, select: params.select });
  }
  return prisma.nexusUser.findFirst({ where });
}

export async function listNexusUserRows(params: {
  organizationId: string;
  where?: Omit<Prisma.NexusUserWhereInput, 'organizationId'>;
  orderBy?: OrderBy;
  skip?: number;
  take?: number;
  select?: undefined;
}): Promise<NexusUserRow[]>;
export async function listNexusUserRows<TSelect extends Select>(params: {
  organizationId: string;
  where?: Omit<Prisma.NexusUserWhereInput, 'organizationId'>;
  orderBy?: OrderBy;
  skip?: number;
  take?: number;
  select: TSelect;
}): Promise<Array<Prisma.NexusUserGetPayload<{ select: TSelect }>>>;
export async function listNexusUserRows(params: {
  organizationId: string;
  where?: Omit<Prisma.NexusUserWhereInput, 'organizationId'>;
  orderBy?: OrderBy;
  skip?: number;
  take?: number;
  select?: Select;
}): Promise<unknown> {
  const where = {
    organizationId: params.organizationId,
    ...(params.where ?? {}),
  };
  if (params.select) {
    return prisma.nexusUser.findMany({
      where,
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
      select: params.select,
    });
  }
  return prisma.nexusUser.findMany({
    where,
    orderBy: params.orderBy,
    skip: params.skip,
    take: params.take,
  });
}

export async function findNexusUserRowByEmail(params: {
  organizationId: string;
  email: string;
  select?: undefined;
}): Promise<NexusUserRow | null>;
export async function findNexusUserRowByEmail<TSelect extends Select>(params: {
  organizationId: string;
  email: string;
  select: TSelect;
}): Promise<Prisma.NexusUserGetPayload<{ select: TSelect }> | null>;
export async function findNexusUserRowByEmail(params: {
  organizationId: string;
  email: string;
  select?: Select;
}): Promise<unknown> {
  const where = {
    organizationId: params.organizationId,
    email: params.email,
  };
  if (params.select) {
    return prisma.nexusUser.findFirst({ where, select: params.select });
  }
  return prisma.nexusUser.findFirst({ where });
}

export async function createNexusUserRow(params: {
  data: Prisma.NexusUserCreateInput;
}): Promise<NexusUserRow> {
  return prisma.nexusUser.create({
    data: params.data,
  });
}

export async function updateNexusUserRowsById(params: {
  organizationId: string;
  userId: string;
  data: Prisma.NexusUserUpdateManyMutationInput;
}): Promise<{ count: number }> {
  return prisma.nexusUser.updateMany({
    where: {
      id: params.userId,
      organizationId: params.organizationId,
    },
    data: params.data,
  });
}

export async function deleteNexusUserRowsById(params: {
  organizationId: string;
  userId: string;
}): Promise<{ count: number }> {
  return prisma.nexusUser.deleteMany({
    where: {
      id: params.userId,
      organizationId: params.organizationId,
    },
  });
}
