import 'server-only';

import { Prisma } from '@prisma/client';

import prisma from '@/lib/prisma';

type ProfileRow = Prisma.ProfileGetPayload<Prisma.ProfileDefaultArgs>;

export async function findProfileRowByOrgAndClerkUserId(params: {
  organizationId: string;
  clerkUserId: string;
}): Promise<ProfileRow | null> {
  return prisma.profile.findFirst({
    where: {
      organizationId: params.organizationId,
      clerkUserId: params.clerkUserId,
    },
  });
}
