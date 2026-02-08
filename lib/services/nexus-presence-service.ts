import 'server-only';

import prisma from '@/lib/prisma';

export async function setNexusUserOnlineWithLastSeenAt(params: {
  organizationId: string;
  userId: string;
  now: Date;
}): Promise<{ id: string }> {
  const args: Parameters<typeof prisma.nexusUser.update>[0] = {
    where: {
      id: params.userId,
      organizationId: params.organizationId,
    },
    data: {
      online: true,
      lastSeenAt: params.now,
    },
    select: { id: true },
  };
  return prisma.nexusUser.update(args);
}

export async function setNexusUserOnlineByEmailWithLastSeenAt(params: {
  organizationId: string;
  email: string;
  now: Date;
}): Promise<{ count: number }> {
  return prisma.nexusUser.updateMany({
    where: {
      organizationId: params.organizationId,
      email: params.email,
    },
    data: {
      online: true,
      lastSeenAt: params.now,
    },
  });
}

export async function setNexusUserOnlineOnlineOnly(params: {
  organizationId: string;
  userId: string;
}): Promise<{ count: number }> {
  return prisma.nexusUser.updateMany({
    where: {
      id: params.userId,
      organizationId: params.organizationId,
    },
    data: {
      online: true,
    },
  });
}

export async function setNexusUserOnlineOnlineOnlyByEmail(params: {
  organizationId: string;
  email: string;
}): Promise<{ count: number }> {
  return prisma.nexusUser.updateMany({
    where: {
      organizationId: params.organizationId,
      email: params.email,
    },
    data: {
      online: true,
    },
  });
}
